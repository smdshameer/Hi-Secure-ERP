const { pool } = require('../config/database');

const defaults = {
  company: {
    name: 'Hi Secure Solutions',
    gstin: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    bank: { name: '', branch: '', account_number: '', ifsc_code: '', swift_code: '' },
    logo_path: '',
    pan: ''
  },
  features: {
    enabled_modules: [
  'repairs', 'sales', 'purchases', 'inventory', 'customers', 'suppliers',
  'locations', 'technicians', 'users', 'settings', 'reports', 'pos',
  'quotations', 'delivery_challans', 'packing_slip', 'banking', 'crm',
  'payroll', 'accounting', 'audit', 'multi_store', 'multi_company', 'expense_tracking'
],
    repair_ticket_prefix: 'RCP',
    invoice_prefix: 'INV',
    quotation_prefix: 'QT',
    purchase_order_prefix: 'PO',
    delivery_challan_prefix: 'DC',
    auto_generate_numbers: true,
    require_approval_for_invoices: false,
    require_approval_for_purchases: false,
    enable_credit_limit_check: true,
    enable_low_stock_alerts: true,
    enable_warranty_tracking: true,
    enable_delivery_challan: true,
    enable_pos: true,
    enable_eway_bill: false,
    enable_e_invoicing: false,
    enable_gstr1: true,
    enable_gstr3b: true,
    default_payment_terms: 'Payment expected within 15 days.',
    default_delivery_days: 7,
    quotation_validity_days: 30,
    warranty_months: 3
  },
  print: {
    default_size: 'a4',
    default_theme: 'hisecure',
    available_sizes: ['a4', 'a5', 'letter', 'legal', 'thermal-80mm', 'thermal-58mm', 'half-a4', 'barcode-80x150'],
    available_themes: ['hisecure', 'tally', 'classic', 'modern-blue', 'minimal', 'saffron'],
    show_print_options: true,
    auto_open_print_dialog: false
  },
  tax: {
    gst_enabled: true,
    gst_rates: [0, 5, 12, 18, 28],
    default_gst_rate: 18,
    igst_enabled: true,
    cess_enabled: false,
    default_cess_rate: 0,
    show_hsn_in_print: true,
    show_gstin_in_print: true
  },
  invoice: {
    prefix: 'INV',
    next_number: 1,
    due_days: 15,
    terms_conditions: 'Thank you for your business. Payment expected within 15 days.',
    show_terms_on_print: true,
    show_authorized_signature: false,
    default_place_of_supply: '',
    footer_note: ''
  },
  quotation: {
    prefix: 'QUO',
    next_number: 1,
    validity_days: 30,
    terms_conditions: 'This quotation is valid for 30 days from the date of issue.',
    show_terms_on_print: true,
    show_validity_date: true
  },
  purchase_order: {
    show_delivery_instructions: true,
    show_terms: true
  },
  pos: {
    receipt_footer: 'Thank you for your purchase!',
    auto_confirm: false,
    cash_payment_label: 'Cash',
    card_payment_label: 'Card',
    upi_payment_label: 'UPI',
    show_receipt_logo: true,
    show_customer_details: true
  },
  numbering: {
    invoice_next: 1,
    quotation_next: 1,
    po_next: 1,
    dc_next: 1,
    repair_next: 1,
    voucher_next: 1
  },
  notifications: {
    enable_email: false,
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    enable_sms: false,
    sms_provider: '',
    sms_api_key: '',
    enable_whatsapp: false,
    whatsapp_api_key: '',
    low_stock_alert_email: '',
    new_invoice_notify: true,
    payment_received_notify: true
  },
  backup: {
    auto_backup: false,
    backup_frequency: 'daily',
    backup_retention_days: 30,
    backup_path: './backups/'
  },
  accounting: {
    financial_year_start: '04-01',
    accounting_method: 'accrual',
    round_off_decimals: 2,
    enable_day_book: true,
    enable_cash_book: true,
    enable_bank_book: true,
    enable_ledgers: true,
    enable_trial_balance: true,
    enable_pnl: true,
    enable_balance_sheet: true
  }
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key]) && Array.isArray(target[key])) {
      result[key] = source[key].length >= target[key].length ? source[key] : target[key];
    } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

async function getSettings() {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const finalSettings = JSON.parse(JSON.stringify(defaults));
    result.rows.forEach(row => {
      if (row.key && finalSettings[row.key]) {
        finalSettings[row.key] = deepMerge(finalSettings[row.key], row.value);
      } else if (row.key) {
        finalSettings[row.key] = row.value;
      }
    });
    return finalSettings;
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('⚠️ settings table missing — using defaults');
      return JSON.parse(JSON.stringify(defaults));
    }
    console.error('getSettings error:', err);
    return JSON.parse(JSON.stringify(defaults));
  }
}

async function updateSetting(key, valueObj) {
  const result = await pool.query(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key)
     DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP
     RETURNING value`,
    [key, valueObj]
  );
  return result.rows[0].value;
}

async function getFeatureFlags() {
  const settings = await getSettings();
  return settings.features || {};
}

async function isFeatureEnabled(featureName) {
  try {
    const features = await getFeatureFlags();
    return features.enabled_modules?.includes(featureName) ?? true;
  } catch (err) {
    console.error('isFeatureEnabled error:', err);
    return true;
  }
}

function validateGSTIN(gstin) {
  if (!gstin || gstin.trim() === '') return null;
  const gstinClean = gstin.trim();
  const regex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  if (!regex.test(gstinClean)) {
    return 'Invalid GSTIN format. GSTIN must be 15 characters: 2-digit state code (01-37), 5-letter PAN, 4-digit serial, 1 letter entity code, 1 alphanumeric check digit, "Z", and 1 check character.';
  }
  return null;
}

module.exports = {
  getSettings,
  updateSetting,
  getFeatureFlags,
  isFeatureEnabled,
  validateGSTIN
};
