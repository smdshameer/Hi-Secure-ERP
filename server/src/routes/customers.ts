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
    // ── Step 1: Spawn Selenium Python script in background to handle the full flow ──
    const scriptPath = path.join(__dirname, 'get_gst_captcha.py');
    const env = { ...process.env, GST_SCRATCH_DIR: SCRATCH_DIR };
    const child = spawn('python', ['-u', scriptPath, gstin, uniqueSessionId], { env });
    activeProcesses.set(uniqueSessionId, child);

    child.stderr.on('data', (chunk: any) => {
      console.error(`[GST Python STDERR ${uniqueSessionId}]:`, chunk.toString().trim());
    });

    let pythonStdout = '';
    let responded = false;

    // Timeout if Python script takes too long to fetch the captcha (e.g. 25 seconds)
    const timeoutId = setTimeout(() => {
      if (!responded) {
        responded = true;
        try { child.kill(); } catch {}
        activeProcesses.delete(uniqueSessionId);
        res.status(504).json({ success: false, error: 'Timeout waiting for captcha from GST portal. Please try again.' });
      }
    }, 25000);

    // Listen on stdout to capture the scraped Captcha image
    child.stdout.on('data', (chunk: any) => {
      const s = chunk.toString();
      pythonStdout += s;

      if (!responded && pythonStdout.includes('__CAPTCHA_START__') && pythonStdout.includes('__CAPTCHA_END__')) {
        responded = true;
        clearTimeout(timeoutId);

        const startIdx = pythonStdout.indexOf('__CAPTCHA_START__') + '__CAPTCHA_START__'.length;
        const endIdx = pythonStdout.indexOf('__CAPTCHA_END__');
        const captchaB64 = pythonStdout.substring(startIdx, endIdx).trim();

        if (captchaB64 && captchaB64.startsWith('data:image')) {
          console.log(`[GST Captcha] Successfully extracted Selenium captcha for session ${uniqueSessionId}`);
          return res.json({ success: true, image: captchaB64, sessionId: uniqueSessionId });
        } else {
          try { child.kill(); } catch {}
          activeProcesses.delete(uniqueSessionId);
          return res.status(503).json({ success: false, error: 'Failed to extract captcha image from GST portal.' });
        }
      }
    });

    child.on('close', (code) => {
      if (!responded) {
        responded = true;
        clearTimeout(timeoutId);
        activeProcesses.delete(uniqueSessionId);
        console.warn(`[GST Captcha] Python script exited prematurely with code ${code} for session ${uniqueSessionId}`);
        res.status(503).json({ success: false, error: 'GST verification script exited prematurely.' });
      }
    });

    // Kill the process after 90 seconds if still alive (user took too long to input solved captcha)
    setTimeout(() => {
      if (activeProcesses.has(uniqueSessionId)) {
        try { activeProcesses.get(uniqueSessionId)?.kill(); } catch {}
        activeProcesses.delete(uniqueSessionId);
      }
    }, 90000);

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
      // Write captcha code to the IPC file so the Python script picks it up
      const ipcFile = path.join(SCRATCH_DIR, `captcha_${session_id}.txt`);
      
      try {
        fs.writeFileSync(ipcFile, String(captcha).trim());
      } catch (err) {
        console.error('Failed to write CAPTCHA IPC file:', err);
      }

      // Check if we have the local child process reference
      const child = activeProcesses.get(String(session_id));

      // Wait for result file result_${session_id}.txt to appear in SCRATCH_DIR
      const resultFile = path.join(SCRATCH_DIR, `result_${session_id}.txt`);
      let results: any = null;
      const startTime = Date.now();
      const timeoutMs = 25000; // 25 seconds timeout

      while (Date.now() - startTime < timeoutMs) {
        if (fs.existsSync(resultFile)) {
          try {
            const fileContent = fs.readFileSync(resultFile, 'utf8');
            results = JSON.parse(fileContent);
            fs.unlinkSync(resultFile);
          } catch (err) {
            console.error('Error reading result IPC file:', err);
          }
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Clean up the local process reference if we had it
      if (child) {
        activeProcesses.delete(String(session_id));
      }

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