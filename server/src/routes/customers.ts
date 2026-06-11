import { Router } from 'express';
import { prisma } from '../index';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const customersRouter = Router();

// Store active python processes keyed by GSTIN
const activeProcesses = new Map<string, any>();

customersRouter.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];
    if (type) where.customer_type = String(type);
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { repairs: true } } },
    });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Fetch a real-time CAPTCHA image from the official GST portal via headless Chrome
customersRouter.get('/captcha', async (req, res) => {
  try {
    const gstin = String(req.query.gstin || '').toUpperCase().trim();
    if (gstin.length !== 15) {
      return res.status(400).json({ success: false, error: 'Valid 15-digit gstin query parameter required' });
    }

    const activeGstin = String(gstin).toUpperCase().trim();
    const uniqueSessionId = `${activeGstin}_${Date.now()}`;
    
    // Do NOT kill existing processes to allow them to cleanly quit the headless browser.
    // They will naturally timeout and close safely.

    const scriptPath = path.join(__dirname, 'get_gst_captcha.py');
    const child = spawn('python', ['-u', scriptPath, activeGstin, uniqueSessionId]);

    activeProcesses.set(uniqueSessionId, child);

    let stdoutData = '';
    let captchaImg = '';
    let responseSent = false;

    child.stdout.on('data', (chunk: any) => {
      const chunkStr = chunk.toString();
      console.log(`[PYTHON STDOUT chunk size: ${chunkStr.length}]`);
      stdoutData += chunkStr;
      
      if (!responseSent && stdoutData.includes('__CAPTCHA_START__') && stdoutData.includes('__CAPTCHA_END__')) {
        const startIdx = stdoutData.indexOf('__CAPTCHA_START__') + '__CAPTCHA_START__'.length;
        const endIdx = stdoutData.indexOf('__CAPTCHA_END__');
        captchaImg = stdoutData.substring(startIdx, endIdx).trim();
        responseSent = true;
        return res.json({ success: true, image: captchaImg, sessionId: uniqueSessionId });
      }
    });

    child.stderr.on('data', (chunk: any) => {
      console.error(`[PYTHON STDERR]:`, chunk.toString());
    });

    child.on('error', (_err: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ error: 'Failed to start CAPTCHA scraper' });
      }
    });

    child.on('exit', (_code) => {
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ error: 'CAPTCHA scraper exited unexpectedly' });
      }
    });

    // Safeguard: kill process after 70 seconds if still alive
    setTimeout(() => {
      if (activeProcesses.has(uniqueSessionId)) {
        try { activeProcesses.get(uniqueSessionId)?.kill(); } catch (err) {}
        activeProcesses.delete(uniqueSessionId);
      }
    }, 70000);

  } catch (err: any) {
    console.error('Failed to get GST captcha:', err);
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
        // Write to IPC file for the python script to pick up
        const scratchDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7a31d73d-28ad-417f-b2e7-8f4672dfc889\\scratch';
        const ipcFile = path.join(scratchDir, `captcha_${session_id}.txt`);
        
        try {
          fs.writeFileSync(ipcFile, String(captcha).trim());
        } catch (err) {
          console.error('Failed to write CAPTCHA file:', err);
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
          
          // Save or update in database
          const existing = await prisma.customer.findFirst({
            where: { gstin: { equals: gstin, mode: 'insensitive' } }
          });

          if (existing) {
            await prisma.customer.update({
              where: { customer_id: existing.customer_id },
              data: { name: d.name, address: d.address, city: d.city, state: d.state, pincode: d.pincode, contact_person: d.legal_name || null }
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
    const existing = await prisma.customer.findFirst({
      where: { gstin: { equals: gstin, mode: 'insensitive' } }
    });

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
    const customer = await prisma.customer.findUnique({
      where: { customer_id: Number(req.params.id) },
      include: { 
        repairs: { orderBy: { received_date: 'desc' } },
        salesInvoices: { orderBy: { invoice_date: 'desc' } },
        quotations: { orderBy: { quote_date: 'desc' } },
        deliveryChallans: { orderBy: { challan_date: 'desc' } }
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

customersRouter.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, contact_person } = req.body;
    const customer = await prisma.customer.create({
      data: {
        customer_code: `CUS-${Date.now()}`,
        name,
        phone,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        gstin: gstin || null,
        customer_type: customer_type || 'retail',
        credit_limit: credit_limit ? Number(credit_limit) : 0,
        contact_person: contact_person || null,
      },
      select: { customer_id: true, customer_code: true },
    });
    res.status(201).json(customer);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002' && err.meta?.target?.includes('phone')) {
      return res.status(400).json({ error: 'A customer with this phone number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

customersRouter.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, is_active, contact_person } = req.body;
    await prisma.customer.update({
      where: { customer_id: Number(req.params.id) },
      data: { name, phone, email: email || null, address: address || null, city: city || null, state: state || null, pincode: pincode || null, gstin: gstin || null, customer_type: customer_type || 'retail', credit_limit: credit_limit ? Number(credit_limit) : 0, is_active, contact_person: contact_person || null },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

customersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { customer_id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});