const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Mock data contract from Step 4
const mockData = {
  company: {
    name: "HI SECURE SOLUTIONS",
    gstin: "33CMAPM9758H1ZQ",
    address: "102, Salt Road",
    city: "Nagapattinam",
    state: "Tamil Nadu",
    state_code: "33",
    pincode: "611001",
    phone: "9042489993",
    email: "info@hisecuresolutions.com",
    website: "www.hisecuresolutions.com",
    logo_url: "logo_path",
    bank_name: "ICICI Bank",
    bank_branch: "Nagapattinam Branch",
    account_number: "1234567890",
    ifsc_code: "ICIC0001234",
    terms: "Items sold once will not be refunded...",
    qr_code_url: "qr_code_path"
  },
  invoice: {
    number: "GST/22/07/021",
    date: "23-07-2022",
    due_date: "07-08-2022",
    place_of_supply: "33-Tamil Nadu",
    reverse_charge: "No",
    type: 'intra', // 'intra' or 'inter'
    copy_type: "Original for Recipient",
    ac_balance: 0.00,
    total_qty: 77
  },
  customer: {
    name: "Arokya Mary Mobile Shop",
    gstin: "33CUSTOMER_GSTIN",
    billing_address: "7/633, Kadai Theru, Keezhaiyur, Nagapattinam",
    shipping_address: "7/633, Kadai Theru, Keezhaiyur, Nagapattinam",
    contact: "9585982260"
  },
  items: [
    {
      sr: 1,
      description: "Hikvision 2MP 4CH 1SATA...",
      model: "IDS-7204HQHI-M1/FA",
      warranty: "2 Year Warranty",
      hsn_sac: "8525",
      qty: 1,
      unit: "NOS",
      rate: 4050.00,
      taxable_value: 4050.00,
      cgst_rate: 9,
      cgst_amount: 364.50,
      sgst_rate: 9,
      sgst_amount: 364.50,
      igst_rate: 0,
      igst_amount: 0,
      total: 4779.00
    }
  ],
  summary: {
    taxable_total: 16835.00,
    cgst_total: 1515.15,
    sgst_total: 1515.15,
    igst_total: 0,
    round_off: -0.30,
    grand_total: 19865.00,
    amount_paid: 19865.00,
    balance: 0.00,
    amount_in_words: "Rupees Nineteen Thousand Eight Hundred Sixty Five Only",
    tax_in_words: "Rupees Three Thousand Thirty Only"
  }
};

const formatCurrency = (val) => {
  const n = parseFloat(val || 0);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const themes = ['classic', 'modern-blue', 'minimal', 'saffron', 'tally'];

console.log('--- STARTING VERIFICATION OF ALL 5 THEMES ---');

let successCount = 0;
for (const theme of themes) {
  const themePath = path.join(__dirname, '..', 'views', 'partials', 'print', 'theme-' + theme + '.ejs');
  console.log(`Checking theme "${theme}" at path: ${themePath}`);
  
  if (!fs.existsSync(themePath)) {
    console.error(`ERROR: File does not exist: ${themePath}`);
    continue;
  }
  
  try {
    // Render for 'intra' tax type
    const renderedIntra = ejs.render(fs.readFileSync(themePath, 'utf8'), {
      ...mockData,
      theme,
      fmt: formatCurrency
    });
    
    // Render for 'inter' tax type
    const mockDataInter = JSON.parse(JSON.stringify(mockData));
    mockDataInter.invoice.type = 'inter';
    mockDataInter.items[0].cgst_rate = 0;
    mockDataInter.items[0].cgst_amount = 0;
    mockDataInter.items[0].sgst_rate = 0;
    mockDataInter.items[0].sgst_amount = 0;
    mockDataInter.items[0].igst_rate = 18;
    mockDataInter.items[0].igst_amount = 729.00;
    mockDataInter.summary.cgst_total = 0;
    mockDataInter.summary.sgst_total = 0;
    mockDataInter.summary.igst_total = 3030.30;
    
    const renderedInter = ejs.render(fs.readFileSync(themePath, 'utf8'), {
      ...mockDataInter,
      theme,
      fmt: formatCurrency
    });
    
    console.log(`✅ theme-${theme}.ejs: Successfully rendered (Intra & Inter-State models).`);
    successCount++;
  } catch (err) {
    console.error(`❌ theme-${theme}.ejs: FAILED rendering:`, err.message);
  }
}

// Now test print-layout.ejs
const layoutPath = path.join(__dirname, '..', 'views', 'partials', 'print', 'print-layout.ejs');
console.log(`Checking print-layout at path: ${layoutPath}`);
if (fs.existsSync(layoutPath)) {
  try {
    ejs.render(fs.readFileSync(layoutPath, 'utf8'), {
      ...mockData,
      theme: 'classic',
      body: '<div>Test content</div>',
      fmt: formatCurrency,
      settings: { print: { available_sizes: ["a4","a5","letter","legal","thermal-80mm","thermal-58mm","half-a4","barcode-80x150"], available_themes: ["tally","classic","modern-blue","minimal","saffron"] } },
      printTheme: 'classic',
      printSize: 'a4'
    });
    console.log(`✅ print-layout.ejs: Successfully rendered.`);
    successCount++;
  } catch (err) {
    console.error(`❌ print-layout.ejs: FAILED rendering:`, err.message);
  }
} else {
  console.error(`ERROR: File does not exist: ${layoutPath}`);
}

console.log(`Verification completed: ${successCount} of 6 templates compiled successfully.`);
if (successCount === 6) {
  process.exit(0);
} else {
  process.exit(1);
}
