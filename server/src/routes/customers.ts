import { Router } from 'express';
import { CustomerService } from '../services/CustomerService';
import { requirePermission } from '../middleware/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const customersRouter = Router();
const customerService = new CustomerService();

// Store active python processes keyed by GSTIN
const activeProcesses = new Map<string, any>();

customersRouter.get('/', async (req, res) => {
  try {
    const customers = await customerService.getCustomers(req.query);
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ─── Scratch directory for IPC files between Node and Python ───────────────
const SCRATCH_DIR = path.join(process.cwd(), '_gst_scratch');
try { if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true }); } catch {}

// ─── Fetch a real-time CAPTCHA image directly from the official GST portal ──
// The GST portal exposes /services/captcha as a plain image endpoint that
// returns a fresh PNG captcha on every request. We proxy it through the
// backend so the client does not hit CORS issues.
customersRouter.get('/captcha', async (req, res) => {
  try {
    const gstin = String(req.query.gstin || '').toUpperCase().trim();
    if (gstin.length !== 15) {
      return res.status(400).json({ success: false, error: 'Valid 15-digit GSTIN required' });
    }

    const uniqueSessionId = `${gstin}_${Date.now()}`;

    // ── Step 1: Fetch captcha image directly from GST portal (no Selenium) ──
    const rnd = Math.random();
    const captchaUrl = `https://services.gst.gov.in/services/captcha?rnd=${rnd}`;
    let captchaB64 = '';

    try {
      const gstRes = await (fetch as any)(captchaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://services.gst.gov.in/services/searchtp',
          'Accept': 'image/png,image/*',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (gstRes.ok && gstRes.headers.get('content-type')?.includes('image')) {
        const buf = Buffer.from(await gstRes.arrayBuffer());
        captchaB64 = `data:image/png;base64,${buf.toString('base64')}`;
        console.log(`[GST Captcha] Fetched real captcha image (${buf.length} bytes) for session ${uniqueSessionId}`);
      } else {
        console.warn(`[GST Captcha] Unexpected response from portal: ${gstRes.status} ${gstRes.headers.get('content-type')}`);
      }
    } catch (fetchErr: any) {
      console.error('[GST Captcha] Direct fetch failed:', fetchErr.message);
    }

    if (!captchaB64) {
      return res.status(503).json({ success: false, error: 'GST portal is temporarily unreachable. Please try again in a few seconds.' });
    }

    // ── Step 2: Spawn Selenium Python script in background to handle the full flow ──
    // The script waits for the captcha code to be written to an IPC file by the
    // /gstin/:gstin endpoint, then submits the form and scrapes the result.
    const scriptPath = path.join(__dirname, 'get_gst_captcha.py');
    const env = { ...process.env, GST_SCRATCH_DIR: SCRATCH_DIR };
    const child = spawn('python', ['-u', scriptPath, gstin, uniqueSessionId], { env });
    activeProcesses.set(uniqueSessionId, child);

    child.stderr.on('data', (chunk: any) => {
      console.error(`[GST Python STDERR ${uniqueSessionId}]:`, chunk.toString().trim());
    });

    // Collect stdout for the verification step
    let pythonStdout = '';
    child.stdout.on('data', (chunk: any) => {
      const s = chunk.toString();
      pythonStdout += s;
    });

    // Kill the process after 90 seconds if still alive (user took too long)
    setTimeout(() => {
      if (activeProcesses.has(uniqueSessionId)) {
        try { activeProcesses.get(uniqueSessionId)?.kill(); } catch {}
        activeProcesses.delete(uniqueSessionId);
      }
    }, 90000);

    // Return the real captcha image immediately — the Python process keeps running
    return res.json({ success: true, image: captchaB64, sessionId: uniqueSessionId });

  } catch (err: any) {
    console.error('[GST Captcha] Unexpected error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate captcha' });
  }
});


customersRouter.get('/gstin/:gstin', async (req, res) => {
  try {
    const gstin = String(req.params.gstin).toUpperCase().trim();
    if (gstin.length !== 15) {
      return res.status(400).json({ error: 'Invalid GSTIN length. Must be 15 characters.' });
    }

    // Check if we have active process for captcha solving
    const { captcha, session_id } = req.query;

    if (captcha && session_id) {
      const child = activeProcesses.get(String(session_id));

      if (child) {
        // Write captcha code to the IPC file so the Python script picks it up
        const ipcFile = path.join(SCRATCH_DIR, `captcha_${session_id}.txt`);
        
        try {
          fs.writeFileSync(ipcFile, String(captcha).trim());
        } catch (err) {
          console.error('Failed to write CAPTCHA IPC file:', err);
        }

        let stdoutData = '';
        child.stdout.on('data', (chunk: any) => {
          stdoutData += chunk.toString();
        });

        // Wait for child process to finish and scrape details
        const results = await new Promise<any>((resolve) => {
          child.on('close', () => {
            // Find JSON lines in stdout
            const lines = stdoutData.split('\n');
            let parsedResult = null;
            for (const line of lines) {
              if (line.trim().startsWith('{')) {
                try {
                  parsedResult = JSON.parse(line.trim());
                } catch {}
              }
            }
            if (parsedResult) resolve(parsedResult);
            else resolve({ success: false, error: 'Failed to parse scraper output' });
          });
        });

        activeProcesses.delete(String(session_id));

        if (results && results.success) {
          const d = results.data;
          
          // Save or update in database using CustomerService
          const existing = await customerService.getCustomerByGstin(gstin);

          if (existing) {
            await customerService.updateCustomer(existing.customer_id, {
              name: d.name,
              address: d.address,
              city: d.city,
              state: d.state,
              pincode: d.pincode,
              contact_person: d.legal_name || null
            });
          }

          return res.json({
            success: true,
            source: 'gst_portal_live',
            data: d
          });
        } else {
          return res.json({
            success: false,
            errorMsg: results?.error || 'CAPTCHA verification failed, please try again.'
          });
        }
      } else {
        // Session expired or invalid
        return res.json({
          success: false,
          errorMsg: 'Verification session expired. Please close this modal and try fetching a new CAPTCHA.'
        });
      }
    }

    // Fallback: check database
    const existing = await customerService.getCustomerByGstin(gstin);

    if (existing) {
      return res.json({
        success: true,
        source: 'database',
        data: {
          name: existing.name,
          contact_person: existing.contact_person || '',
          phone: existing.phone,
          email: existing.email || '',
          address: existing.address || '',
          city: existing.city || '',
          state: existing.state || '',
          pincode: existing.pincode || '',
          gstin: existing.gstin
        }
      });
    }

    // Fallback: derive state from GSTIN state code only
    const stateCode = gstin.substring(0, 2);
    const stateName = getStateName(stateCode);
    return res.json({
      success: true,
      source: 'partial',
      data: {
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: stateName,
        pincode: '',
        gstin
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to look up GSTIN details' });
  }
});

function getStateName(code: string): string {
  const STATE_MAP: { [key: string]: string } = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)',
  };
  return STATE_MAP[code] || '';
}

customersRouter.get('/:id', async (req, res) => {
  try {
    const customer = await customerService.getCustomerDetailById(Number(req.params.id));
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

customersRouter.post('/', requirePermission('invoice:create'), async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint failed on the fields: (`phone`)'))) {
      return res.status(400).json({ error: 'A customer with this phone number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

customersRouter.put('/:id', requirePermission('invoice:create'), async (req, res) => {
  try {
    await customerService.updateCustomer(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

customersRouter.delete('/:id', requirePermission('invoice:create'), async (req: any, res) => {
  try {
    await customerService.deleteCustomer(Number(req.params.id), req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});