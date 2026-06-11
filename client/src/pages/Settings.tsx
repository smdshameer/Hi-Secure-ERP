import { useState, useEffect, useCallback } from 'react';
import {
  IconSettings, IconBuilding, IconFileInvoice, IconCurrencyRupee,
  IconMail, IconBrandWhatsapp, IconBrandTelegram, IconLink,
  IconUsers, IconPalette, IconDatabase, IconBell, IconActivity,
  IconDeviceFloppy, IconSend, IconCheck, IconX, IconRefresh,
  IconDownload, IconUpload, IconServer, IconCpu, IconChevronRight,
  IconEye, IconEyeOff, IconAlertTriangle, IconInfoCircle,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────
type TabKey =
  | 'company' | 'invoice' | 'tax'
  | 'email' | 'whatsapp' | 'telegram'
  | 'integrations' | 'users' | 'appearance'
  | 'backup' | 'notifications' | 'system';

interface TestResult { status: 'idle' | 'loading' | 'success' | 'error'; message: string; }
const idleResult: TestResult = { status: 'idle', message: '' };

// ─── Tab definitions ──────────────────────────────────────────────
const TABS = [
  {
    group: 'Business',
    items: [
      { key: 'company',      label: 'Company Info',      icon: IconBuilding },
      { key: 'invoice',      label: 'Invoice Settings',  icon: IconFileInvoice },
      { key: 'tax',          label: 'GST / Tax',         icon: IconCurrencyRupee },
    ],
  },
  {
    group: 'Communications',
    items: [
      { key: 'email',        label: 'Email (SMTP)',      icon: IconMail },
      { key: 'whatsapp',     label: 'WhatsApp',          icon: IconBrandWhatsapp },
      { key: 'telegram',     label: 'Telegram',          icon: IconBrandTelegram },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'integrations', label: 'Integrations',      icon: IconLink },
      { key: 'users',        label: 'Users & Access',    icon: IconUsers },
      { key: 'appearance',   label: 'Appearance',        icon: IconPalette },
      { key: 'backup',       label: 'Backup & Data',     icon: IconDatabase },
      { key: 'notifications',label: 'Notifications',     icon: IconBell },
      { key: 'system',       label: 'System Health',     icon: IconActivity },
    ],
  },
] as const;

// ─── Reusable sub-components ──────────────────────────────────────
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="settings-field-row">
      <div className="settings-field-label">
        <span>{label}</span>
        {hint && <span className="settings-field-hint">{hint}</span>}
      </div>
      <div className="settings-field-control">{children}</div>
    </div>
  );
}

function SInput({ value, onChange, type = 'text', placeholder = '', disabled = false }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="settings-input"
    />
  );
}

function STextarea({ value, onChange, rows = 3, placeholder = '' }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="settings-textarea"
    />
  );
}

function SSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="settings-input">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`settings-toggle ${value ? 'settings-toggle-on' : 'settings-toggle-off'}`}
      title={label}
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}

function SPassword({ value, onChange, placeholder = '' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="settings-input"
        style={{ paddingRight: 38 }}
      />
      <button
        onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
      >
        {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </div>
  );
}

function TestButton({ label, onClick, result, icon: Icon = IconSend }: {
  label: string; onClick: () => void; result: TestResult; icon?: any;
}) {
  const colors = {
    idle: '#1a3480',
    loading: '#64748b',
    success: '#16a34a',
    error: '#dc2626',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        onClick={onClick}
        disabled={result.status === 'loading'}
        className="settings-test-btn"
        style={{ background: colors[result.status] }}
      >
        {result.status === 'loading'
          ? <span className="settings-spinner" />
          : result.status === 'success'
            ? <IconCheck size={14} />
            : result.status === 'error'
              ? <IconX size={14} />
              : <Icon size={14} />}
        {result.status === 'loading' ? 'Testing...' : label}
      </button>
      {result.message && (
        <span style={{
          fontSize: 12,
          color: result.status === 'success' ? '#16a34a' : '#dc2626',
          fontWeight: 500,
        }}>
          {result.status === 'success' ? '✓ ' : '✗ '}{result.message}
        </span>
      )}
    </div>
  );
}

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="settings-section-card">
      <div className="settings-section-title" style={{ borderLeftColor: accent || '#1a3480' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState<TabKey>('company');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Setting states ──
  const [company, setCompany] = useState({
    name: 'Hi Secure Solutions', gstin: '', phone: '', email: '',
    address: 'Nagapattinam, Tamil Nadu', website: '',
    state: 'Tamil Nadu', state_code: '33', pin_code: '',
    bank_name: '', bank_account: '', ifsc_code: '', bank_branch: '',
    logo_url: '',
  });

  const [invoice, setInvoice] = useState({
    prefix: 'INV', next_number: 1000, due_days: 15,
    footer_note: 'Thank you for your business!',
    default_tax_type: 'cgst_sgst',
    quote_prefix: 'QT', po_prefix: 'PO', challan_prefix: 'DC',
    show_bank_details: true, show_signature: false,
  });

  const [tax, setTax] = useState({
    default_gst_rate: 18, registration_state: '33',
  });

  const [email, setEmail] = useState({
    host: '', port: '587', user: '', pass: '',
    from_name: 'HiSecure ERP', from_email: '', secure: false,
    enabled: false,
  });

  const [emailTestTo, setEmailTestTo] = useState('');
  const [emailTestResult, setEmailTestResult] = useState<TestResult>(idleResult);

  const [whatsapp, setWhatsapp] = useState({
    phone_number_id: '', access_token: '', business_account_id: '',
    enabled: false,
  });
  const [waTestTo, setWaTestTo] = useState('');
  const [waTestResult, setWaTestResult] = useState<TestResult>(idleResult);

  const [telegram, setTelegram] = useState({
    bot_token: '', chat_id: '', enabled: false,
  });
  const [tgTestResult, setTgTestResult] = useState<TestResult>(idleResult);

  const [integrations, setIntegrations] = useState({
    exchange_rate_api_key: '',
    razorpay_key_id: '', razorpay_key_secret: '',
    gst_api_key: '',
  });

  const [appearance, setAppearance] = useState({
    primary_color: '#1a3480',
    font_size: 'medium',
    dark_mode: false,
    sidebar_compact: false,
  });

  const [print, setPrint] = useState({
    default_theme: 'legacy',
    default_size: 'a4',
    upi_payment_id: '',
  });

  const [notifications, setNotifications] = useState({
    low_stock_email: false, low_stock_whatsapp: false, low_stock_telegram: false,
    overdue_invoice_email: false, overdue_invoice_telegram: false,
    repair_complete_whatsapp: false, repair_complete_telegram: false,
    daily_summary_telegram: false,
  });

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [backupLoading, setBackupLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    summary: string;
    log: string[];
    warnings: string[];
    total_imported: number;
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // ── Load all settings on mount ──
  useEffect(() => {
    setLoading(true);
    api.get('/settings')
      .then(res => {
        const d = res.data;
        if (d?.company) {
          setCompany(p => ({
            ...p,
            ...d.company,
            logo_url: d.company.logo_url || d.company.logo_path || '',
          }));
        }
        if (d?.invoice) setInvoice(p => ({ ...p, ...d.invoice }));
        if (d?.tax) setTax(p => ({ ...p, ...d.tax }));
        if (d?.email) setEmail(p => ({ ...p, ...d.email }));
        if (d?.whatsapp) setWhatsapp(p => ({ ...p, ...d.whatsapp }));
        if (d?.telegram) setTelegram(p => ({ ...p, ...d.telegram }));
        if (d?.integrations) setIntegrations(p => ({ ...p, ...d.integrations }));
        if (d?.appearance) setAppearance(p => ({ ...p, ...d.appearance }));
        if (d?.print) setPrint(p => ({ ...p, ...d.print }));
        if (d?.notifications) setNotifications(p => ({ ...p, ...d.notifications }));
      })
      .catch(() => setError('Failed to load settings from server.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch system health when on that tab ──
  useEffect(() => {
    if (tab === 'system') {
      setHealthLoading(true);
      api.get('/settings/meta/system-health')
        .then(r => setSystemHealth(r.data))
        .catch(() => setSystemHealth(null))
        .finally(() => setHealthLoading(false));
    }
  }, [tab]);

  // ── Save ──
  const handleSave = async () => {
    setError(''); setSaveLoading(true);
    try {
      const companyPayload = {
        ...company,
        logo_path: company.logo_url || '',
        logo_url: company.logo_url || '',
      };
      await api.put('/settings', {
        company: companyPayload, invoice, tax, email, whatsapp, telegram,
        integrations, appearance, print, notifications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Test email ──
  const handleTestEmail = async () => {
    if (!emailTestTo) return;
    setEmailTestResult({ status: 'loading', message: '' });
    // Save email config first
    await api.put('/settings', { email });
    const res = await api.post('/settings/test-email', { to: emailTestTo })
      .then(r => ({ ok: true, msg: r.data.message }))
      .catch(e => ({ ok: false, msg: e.response?.data?.error || 'Failed' }));
    setEmailTestResult({ status: res.ok ? 'success' : 'error', message: res.msg });
  };

  // ── Test WhatsApp ──
  const handleTestWhatsApp = async () => {
    if (!waTestTo) return;
    setWaTestResult({ status: 'loading', message: '' });
    await api.put('/settings', { whatsapp });
    const res = await api.post('/settings/test-whatsapp', { to: waTestTo })
      .then(r => ({ ok: true, msg: r.data.message }))
      .catch(e => ({ ok: false, msg: e.response?.data?.error || 'Failed' }));
    setWaTestResult({ status: res.ok ? 'success' : 'error', message: res.msg });
  };

  // ── Test Telegram ──
  const handleTestTelegram = async () => {
    setTgTestResult({ status: 'loading', message: '' });
    await api.put('/settings', { telegram });
    const res = await api.post('/settings/test-telegram', {})
      .then(r => ({ ok: true, msg: r.data.message }))
      .catch(e => ({ ok: false, msg: e.response?.data?.error || 'Failed' }));
    setTgTestResult({ status: res.ok ? 'success' : 'error', message: res.msg });
  };

  // ── Backup ── use direct GET download (most reliable approach)
  const handleBackup = async () => {
    setBackupLoading(true);
    setError('');
    try {
      // First verify the endpoint is reachable
      const check = await api.get('/settings/backup', { responseType: 'blob', timeout: 120000 });
      // Create download from the response
      const blob = new Blob([check.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisecure-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      // Extract real error from blob if response was JSON error
      let msg = 'Backup failed. Please restart the server and try again.';
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          msg = `Backup failed: ${json.error || text}`;
        } catch {}
      } else if (e.response?.data?.error) {
        msg = `Backup failed: ${e.response.data.error}`;
      } else if (e.message) {
        msg = `Backup failed: ${e.message}`;
      }
      setError(msg);
    }
    setBackupLoading(false);
  };

  const handleCsvExport = async () => {
    setCsvLoading(true);
    setError('');
    try {
      const res = await api.get('/settings/export-invoices-csv', { responseType: 'blob', timeout: 60000 });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(`CSV export failed: ${e.message || 'Unknown error'}`);
    }
    setCsvLoading(false);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    setImportError('');
    try {
      const text = await importFile.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError('Invalid file — could not parse JSON. Please upload a valid HiSecure ERP backup file.');
        setImportLoading(false);
        return;
      }
      const res = await api.post('/settings/import', parsed);
      setImportResult(res.data);
    } catch (e: any) {
      setImportError(e.response?.data?.error || 'Import failed. Please check the backup file.');
    } finally {
      setImportLoading(false);
    }
  };

  const refreshHealth = () => {
    setHealthLoading(true);
    api.get('/settings/meta/system-health')
      .then(r => setSystemHealth(r.data))
      .catch(() => setSystemHealth(null))
      .finally(() => setHealthLoading(false));
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="settings-loading-spinner" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <PageBanner
        icon={<IconSettings size={28} />}
        title="Control Centre"
        subtitle="Manage every aspect of your ERP system from one place"
        backLabel="Back"
        backPath="/"
      />

      {error && (
        <div className="settings-error-bar">
          <IconAlertTriangle size={15} /> {error}
          <button onClick={() => setError('')} className="settings-error-close"><IconX size={13} /></button>
        </div>
      )}

      <div className="settings-layout">
        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          {TABS.map(group => (
            <div key={group.group} className="settings-sidebar-group">
              <div className="settings-sidebar-group-label">{group.group}</div>
              {group.items.map(t => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key as TabKey)}
                    className={`settings-sidebar-item ${active ? 'settings-sidebar-item-active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                    {active && <IconChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Content ── */}
        <main className="settings-content">
          {/* ──── COMPANY ──── */}
          {tab === 'company' && (
            <div className="settings-panel">
              <SectionCard title="Business Identity" accent="#1a3480">
                <div className="settings-grid-2">
                  <FieldRow label="Company Name">
                    <SInput value={company.name} onChange={v => setCompany(p => ({ ...p, name: v }))} placeholder="Hi Secure Solutions" />
                  </FieldRow>
                  <FieldRow label="GSTIN">
                    <SInput value={company.gstin} onChange={v => setCompany(p => ({ ...p, gstin: v }))} placeholder="33AAACH7409R1ZZ" />
                  </FieldRow>
                  <FieldRow label="Phone">
                    <SInput value={company.phone} onChange={v => setCompany(p => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
                  </FieldRow>
                  <FieldRow label="Email">
                    <SInput type="email" value={company.email} onChange={v => setCompany(p => ({ ...p, email: v }))} placeholder="info@hisecure.in" />
                  </FieldRow>
                  <FieldRow label="Website">
                    <SInput value={company.website} onChange={v => setCompany(p => ({ ...p, website: v }))} placeholder="www.hisecure.in" />
                  </FieldRow>
                  <FieldRow label="Company Logo" hint="Upload your business logo (PNG, JPG)">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {company.logo_url ? (
                        <div style={{ position: 'relative', width: 64, height: 64, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={company.logo_url} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div style={{ width: 64, height: 64, border: '2px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 500, background: '#f8fafc' }}>
                          No Logo
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <label className="settings-test-btn" style={{ background: '#1a3480', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px', color: '#fff', borderRadius: 4, fontWeight: 500 }}>
                            <IconUpload size={14} />
                            Choose File
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg"
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // Convert to base64
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    setCompany(p => ({ ...p, logo_url: reader.result as string }));
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                          {company.logo_url && (
                            <button
                              onClick={() => setCompany(p => ({ ...p, logo_url: '' }))}
                              className="settings-test-btn"
                              style={{ background: '#dc2626', fontSize: 12, padding: '6px 12px', color: '#fff', borderRadius: 4, fontWeight: 500 }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Max size 1MB. PNG or JPG.</span>
                      </div>
                    </div>
                  </FieldRow>
                  <FieldRow label="Address" >
                    <STextarea value={company.address} onChange={v => setCompany(p => ({ ...p, address: v }))} rows={2} />
                  </FieldRow>
                  <FieldRow label="State">
                    <SInput value={company.state} onChange={v => setCompany(p => ({ ...p, state: v }))} />
                  </FieldRow>
                  <FieldRow label="State Code">
                    <SInput value={company.state_code} onChange={v => setCompany(p => ({ ...p, state_code: v }))} />
                  </FieldRow>
                  <FieldRow label="PIN Code">
                    <SInput value={company.pin_code} onChange={v => setCompany(p => ({ ...p, pin_code: v }))} placeholder="611001" />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Bank Details" accent="#0891b2">
                <div className="settings-grid-2">
                  <FieldRow label="Bank Name">
                    <SInput value={company.bank_name} onChange={v => setCompany(p => ({ ...p, bank_name: v }))} placeholder="State Bank of India" />
                  </FieldRow>
                  <FieldRow label="Account Number">
                    <SInput value={company.bank_account} onChange={v => setCompany(p => ({ ...p, bank_account: v }))} placeholder="1234567890" />
                  </FieldRow>
                  <FieldRow label="IFSC Code">
                    <SInput value={company.ifsc_code} onChange={v => setCompany(p => ({ ...p, ifsc_code: v }))} placeholder="SBIN0001234" />
                  </FieldRow>
                  <FieldRow label="Branch">
                    <SInput value={company.bank_branch} onChange={v => setCompany(p => ({ ...p, bank_branch: v }))} placeholder="Nagapattinam Main" />
                  </FieldRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ──── INVOICE ──── */}
          {tab === 'invoice' && (
            <div className="settings-panel">
              <SectionCard title="Numbering" accent="#7c3aed">
                <div className="settings-grid-2">
                  <FieldRow label="Invoice Prefix">
                    <SInput value={invoice.prefix} onChange={v => setInvoice(p => ({ ...p, prefix: v }))} placeholder="INV" />
                  </FieldRow>
                  <FieldRow label="Invoice Start No">
                    <SInput type="number" value={invoice.next_number} onChange={v => setInvoice(p => ({ ...p, next_number: parseInt(v) || 0 }))} />
                  </FieldRow>
                  <FieldRow label="Quotation Prefix">
                    <SInput value={invoice.quote_prefix} onChange={v => setInvoice(p => ({ ...p, quote_prefix: v }))} placeholder="QT" />
                  </FieldRow>
                  <FieldRow label="PO Prefix">
                    <SInput value={invoice.po_prefix} onChange={v => setInvoice(p => ({ ...p, po_prefix: v }))} placeholder="PO" />
                  </FieldRow>
                  <FieldRow label="Challan Prefix">
                    <SInput value={invoice.challan_prefix} onChange={v => setInvoice(p => ({ ...p, challan_prefix: v }))} placeholder="DC" />
                  </FieldRow>
                  <FieldRow label="Payment Terms (Days)">
                    <SInput type="number" value={invoice.due_days} onChange={v => setInvoice(p => ({ ...p, due_days: parseInt(v) || 0 }))} />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Invoice Appearance" accent="#0891b2">
                <div className="settings-grid-2">
                  <FieldRow label="Default Tax Type">
                    <SSelect value={invoice.default_tax_type} onChange={v => setInvoice(p => ({ ...p, default_tax_type: v }))}
                      options={[
                        { value: 'cgst_sgst', label: 'CGST + SGST (Intra-State)' },
                        { value: 'igst', label: 'IGST (Inter-State)' },
                      ]}
                    />
                  </FieldRow>
                  <FieldRow label="Default Print Theme">
                    <SSelect value={print.default_theme} onChange={v => setPrint(p => ({ ...p, default_theme: v }))}
                      options={[
                        { value: 'legacy', label: 'Legacy Box Layout' },
                        { value: 'tally', label: 'Tally (Monospace)' },
                        { value: 'classic', label: 'Classic (Serif B&W)' },
                        { value: 'modern-blue', label: 'Modern Blue' },
                        { value: 'minimal', label: 'Minimalist' },
                        { value: 'saffron', label: 'Saffron (Tricolor)' },
                      ]}
                    />
                  </FieldRow>
                  <FieldRow label="Default Paper Size">
                    <SSelect value={print.default_size} onChange={v => setPrint(p => ({ ...p, default_size: v }))}
                      options={[
                        { value: 'a4', label: 'A4' },
                        { value: 'a5', label: 'A5' },
                        { value: 'letter', label: 'Letter' },
                        { value: 'legal', label: 'Legal' },
                        { value: 'thermal-80mm', label: 'Thermal (80mm)' },
                        { value: 'thermal-58mm', label: 'Thermal (58mm)' },
                      ]}
                    />
                  </FieldRow>
                  <FieldRow label="UPI ID (for Payment QR Code)" hint="e.g. name@bank">
                    <SInput value={print.upi_payment_id || ''} onChange={v => setPrint(p => ({ ...p, upi_payment_id: v }))} placeholder="gunalan@okaxis" />
                  </FieldRow>
                  <FieldRow label="Show Bank Details on Invoice">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SToggle value={invoice.show_bank_details} onChange={v => setInvoice(p => ({ ...p, show_bank_details: v }))} label="Show bank details" />
                      <span className="settings-toggle-label">{invoice.show_bank_details ? 'Yes' : 'No'}</span>
                    </div>
                  </FieldRow>
                  <FieldRow label="Show Signature Block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SToggle value={invoice.show_signature} onChange={v => setInvoice(p => ({ ...p, show_signature: v }))} label="Show signature" />
                      <span className="settings-toggle-label">{invoice.show_signature ? 'Yes' : 'No'}</span>
                    </div>
                  </FieldRow>
                </div>
                <div style={{ marginTop: 16 }}>
                  <FieldRow label="Invoice Footer Note" hint="Appears at the bottom of every invoice">
                    <STextarea value={invoice.footer_note} onChange={v => setInvoice(p => ({ ...p, footer_note: v }))} rows={3} placeholder="Thank you for your business!" />
                  </FieldRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ──── TAX ──── */}
          {tab === 'tax' && (
            <div className="settings-panel">
              <SectionCard title="GST Configuration" accent="#16a34a">
                <div className="settings-grid-2">
                  <FieldRow label="Default GST Rate (%)" hint="Most products">
                    <SInput type="number" value={tax.default_gst_rate} onChange={v => setTax(p => ({ ...p, default_gst_rate: parseFloat(v) || 0 }))} />
                  </FieldRow>
                  <FieldRow label="CGST Rate (%)" hint="Auto-calculated">
                    <SInput value={String(tax.default_gst_rate / 2)} onChange={() => {}} disabled />
                  </FieldRow>
                  <FieldRow label="SGST Rate (%)" hint="Auto-calculated">
                    <SInput value={String(tax.default_gst_rate / 2)} onChange={() => {}} disabled />
                  </FieldRow>
                  <FieldRow label="IGST Rate (%)" hint="Auto-calculated">
                    <SInput value={String(tax.default_gst_rate)} onChange={() => {}} disabled />
                  </FieldRow>
                  <FieldRow label="GST Registration State">
                    <SSelect value={tax.registration_state} onChange={v => setTax(p => ({ ...p, registration_state: v }))}
                      options={[
                        { value: '33', label: 'Tamil Nadu (33)' },
                        { value: '27', label: 'Maharashtra (27)' },
                        { value: '07', label: 'Delhi (07)' },
                        { value: '29', label: 'Karnataka (29)' },
                        { value: '36', label: 'Telangana (36)' },
                        { value: '32', label: 'Kerala (32)' },
                        { value: '02', label: 'Himachal Pradesh (02)' },
                        { value: '06', label: 'Haryana (06)' },
                        { value: '09', label: 'Uttar Pradesh (09)' },
                        { value: '24', label: 'Gujarat (24)' },
                        { value: '19', label: 'West Bengal (19)' },
                      ]}
                    />
                  </FieldRow>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ──── EMAIL ──── */}
          {tab === 'email' && (
            <div className="settings-panel">
              <SectionCard title="SMTP Configuration" accent="#ea580c">
                <div className="settings-info-box" style={{ marginBottom: 16 }}>
                  <IconInfoCircle size={15} />
                  <span>
                    <strong>Gmail Quick Setup:</strong> Go to Google Account → Security → 2-Step Verification → App Passwords. Generate a password for "Mail". Use <code>smtp.gmail.com</code> port <code>587</code>.
                  </span>
                  <button
                    className="settings-quick-btn"
                    onClick={() => setEmail(p => ({ ...p, host: 'smtp.gmail.com', port: '587', secure: false }))}
                  >
                    Auto-fill Gmail
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <SToggle value={email.enabled} onChange={v => setEmail(p => ({ ...p, enabled: v }))} label="Enable email" />
                  <span className="settings-toggle-label">Email {email.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>

                <div className="settings-grid-2">
                  <FieldRow label="SMTP Host">
                    <SInput value={email.host} onChange={v => setEmail(p => ({ ...p, host: v }))} placeholder="smtp.gmail.com" />
                  </FieldRow>
                  <FieldRow label="Port">
                    <SInput value={email.port} onChange={v => setEmail(p => ({ ...p, port: v }))} placeholder="587" />
                  </FieldRow>
                  <FieldRow label="Username / Email">
                    <SInput type="email" value={email.user} onChange={v => setEmail(p => ({ ...p, user: v }))} placeholder="you@gmail.com" />
                  </FieldRow>
                  <FieldRow label="Password / App Password">
                    <SPassword value={email.pass} onChange={v => setEmail(p => ({ ...p, pass: v }))} placeholder="••••••••••••" />
                  </FieldRow>
                  <FieldRow label="From Name">
                    <SInput value={email.from_name} onChange={v => setEmail(p => ({ ...p, from_name: v }))} placeholder="HiSecure ERP" />
                  </FieldRow>
                  <FieldRow label="From Email">
                    <SInput type="email" value={email.from_email} onChange={v => setEmail(p => ({ ...p, from_email: v }))} placeholder="noreply@hisecure.in" />
                  </FieldRow>
                  <FieldRow label="Use TLS / STARTTLS">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SToggle value={email.secure} onChange={v => setEmail(p => ({ ...p, secure: v }))} label="Secure" />
                      <span className="settings-toggle-label">{email.secure ? 'SSL (port 465)' : 'STARTTLS (port 587)'}</span>
                    </div>
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Test Email" accent="#ea580c">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <SInput value={emailTestTo} onChange={setEmailTestTo} placeholder="test@example.com" type="email" />
                </div>
                <TestButton
                  label="Send Test Email"
                  onClick={handleTestEmail}
                  result={emailTestResult}
                  icon={IconMail}
                />
              </SectionCard>
            </div>
          )}

          {/* ──── WHATSAPP ──── */}
          {tab === 'whatsapp' && (
            <div className="settings-panel">
              <SectionCard title="Meta Cloud API — WhatsApp Business" accent="#25d366">
                <div className="settings-info-box" style={{ marginBottom: 16 }}>
                  <IconInfoCircle size={15} />
                  <span>
                    <strong>Setup:</strong> Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a3480' }}>developers.facebook.com</a> → Create App → WhatsApp → Get Phone Number ID & Access Token. <strong>Free: 1,000 conversations/month.</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <SToggle value={whatsapp.enabled} onChange={v => setWhatsapp(p => ({ ...p, enabled: v }))} label="Enable WhatsApp" />
                  <span className="settings-toggle-label">WhatsApp {whatsapp.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>

                <div className="settings-grid-2">
                  <FieldRow label="Phone Number ID" hint="From Meta Developer Console">
                    <SInput value={whatsapp.phone_number_id} onChange={v => setWhatsapp(p => ({ ...p, phone_number_id: v }))} placeholder="1234567890" />
                  </FieldRow>
                  <FieldRow label="Business Account ID">
                    <SInput value={whatsapp.business_account_id} onChange={v => setWhatsapp(p => ({ ...p, business_account_id: v }))} placeholder="0987654321" />
                  </FieldRow>
                  <FieldRow label="Access Token" hint="Permanent token from Meta">
                    <SPassword value={whatsapp.access_token} onChange={v => setWhatsapp(p => ({ ...p, access_token: v }))} placeholder="EAAxxxxxxx..." />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Test WhatsApp" accent="#25d366">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <SInput value={waTestTo} onChange={setWaTestTo} placeholder="919876543210 (with country code)" />
                </div>
                <TestButton
                  label="Send Test WhatsApp"
                  onClick={handleTestWhatsApp}
                  result={waTestResult}
                  icon={IconBrandWhatsapp}
                />
              </SectionCard>
            </div>
          )}

          {/* ──── TELEGRAM ──── */}
          {tab === 'telegram' && (
            <div className="settings-panel">
              <SectionCard title="Telegram Bot API" accent="#229ed9">
                <div className="settings-info-box" style={{ marginBottom: 16 }}>
                  <IconInfoCircle size={15} />
                  <div>
                    <strong>Free Setup (60 seconds):</strong>
                    <ol style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
                      <li>Open Telegram → search <strong>@BotFather</strong></li>
                      <li>Send <code>/newbot</code> → follow instructions → get your <strong>Bot Token</strong></li>
                      <li>Add your bot to a group/channel → send a message → get the <strong>Chat ID</strong> from <code>api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</code></li>
                    </ol>
                    <strong>100% Free — Unlimited messages, no verification required.</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <SToggle value={telegram.enabled} onChange={v => setTelegram(p => ({ ...p, enabled: v }))} label="Enable Telegram" />
                  <span className="settings-toggle-label">Telegram {telegram.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>

                <div className="settings-grid-2">
                  <FieldRow label="Bot Token" hint="From @BotFather">
                    <SPassword value={telegram.bot_token} onChange={v => setTelegram(p => ({ ...p, bot_token: v }))} placeholder="1234567890:AAHxxxxxxxx" />
                  </FieldRow>
                  <FieldRow label="Chat ID" hint="Group / channel / personal chat">
                    <SInput value={telegram.chat_id} onChange={v => setTelegram(p => ({ ...p, chat_id: v }))} placeholder="-1001234567890" />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="Test Telegram" accent="#229ed9">
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  Sends a test message to the configured Chat ID to verify the bot connection.
                </p>
                <TestButton
                  label="Send Test Message"
                  onClick={handleTestTelegram}
                  result={tgTestResult}
                  icon={IconBrandTelegram}
                />
              </SectionCard>
            </div>
          )}

          {/* ──── INTEGRATIONS ──── */}
          {tab === 'integrations' && (
            <div className="settings-panel">
              <SectionCard title="Exchange Rate API" accent="#7c3aed">
                <div className="settings-info-box" style={{ marginBottom: 12 }}>
                  <IconInfoCircle size={15} />
                  <span>Free at <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a3480' }}>exchangerate-api.com</a> — 1,500 requests/month free. Used for multi-currency invoicing.</span>
                </div>
                <FieldRow label="API Key">
                  <SPassword value={integrations.exchange_rate_api_key} onChange={v => setIntegrations(p => ({ ...p, exchange_rate_api_key: v }))} placeholder="your-api-key-here" />
                </FieldRow>
              </SectionCard>

              <SectionCard title="Payment Gateway (Razorpay)" accent="#3b82f6">
                <div className="settings-info-box" style={{ marginBottom: 12 }}>
                  <IconInfoCircle size={15} />
                  <span>Razorpay has a free plan for receiving online payments. Sign up at <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a3480' }}>razorpay.com</a>.</span>
                </div>
                <div className="settings-grid-2">
                  <FieldRow label="Key ID">
                    <SInput value={integrations.razorpay_key_id} onChange={v => setIntegrations(p => ({ ...p, razorpay_key_id: v }))} placeholder="rzp_live_xxxxxxxxxx" />
                  </FieldRow>
                  <FieldRow label="Key Secret">
                    <SPassword value={integrations.razorpay_key_secret} onChange={v => setIntegrations(p => ({ ...p, razorpay_key_secret: v }))} placeholder="••••••••••••" />
                  </FieldRow>
                </div>
              </SectionCard>

              <SectionCard title="GST Portal API" accent="#16a34a">
                <div className="settings-info-box" style={{ marginBottom: 12 }}>
                  <IconInfoCircle size={15} />
                  <span>Used for GSTIN auto-lookup. Free API from GST portal or third-party providers.</span>
                </div>
                <FieldRow label="GST API Key">
                  <SPassword value={integrations.gst_api_key} onChange={v => setIntegrations(p => ({ ...p, gst_api_key: v }))} placeholder="your-gst-api-key" />
                </FieldRow>
              </SectionCard>
            </div>
          )}

          {/* ──── USERS ──── */}
          {tab === 'users' && (
            <div className="settings-panel">
              <SectionCard title="User Management" accent="#1a3480">
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.7 }}>
                  Manage system users, roles, and access permissions from the dedicated User Management page.
                </p>
                <div className="settings-users-grid">
                  {[
                    { role: 'Admin', desc: 'Full access to all modules, settings, and user management', color: '#dc2626' },
                    { role: 'Manager', desc: 'Access to all business modules. Cannot change settings or manage users.', color: '#ea580c' },
                    { role: 'Sales', desc: 'Invoices, quotations, customers, and CRM only', color: '#16a34a' },
                    { role: 'Technician', desc: 'Repairs module only — view and update assigned jobs', color: '#7c3aed' },
                    { role: 'Accountant', desc: 'View all financials, generate reports. Read-only for other modules.', color: '#0891b2' },
                  ].map(r => (
                    <div key={r.role} className="settings-role-card">
                      <div className="settings-role-badge" style={{ background: r.color }}>{r.role}</div>
                      <div className="settings-role-desc">{r.desc}</div>
                    </div>
                  ))}
                </div>
                <a href="/users" className="settings-link-btn" style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconUsers size={15} /> Open User Management
                </a>
              </SectionCard>
            </div>
          )}

          {/* ──── APPEARANCE ──── */}
          {tab === 'appearance' && (
            <div className="settings-panel">
              <SectionCard title="Theme & Colors" accent="#7c3aed">
                <div className="settings-grid-2">
                  <FieldRow label="Brand Primary Color" hint="Used for buttons, headers, and accents">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={appearance.primary_color}
                        onChange={e => setAppearance(p => ({ ...p, primary_color: e.target.value }))}
                        className="settings-color-picker"
                      />
                      <SInput value={appearance.primary_color} onChange={v => setAppearance(p => ({ ...p, primary_color: v }))} placeholder="#1a3480" />
                    </div>
                  </FieldRow>
                  <FieldRow label="Interface Font Size">
                    <SSelect value={appearance.font_size} onChange={v => setAppearance(p => ({ ...p, font_size: v }))}
                      options={[
                        { value: 'small', label: 'Small (12px base)' },
                        { value: 'medium', label: 'Medium (13px base — default)' },
                        { value: 'large', label: 'Large (15px base)' },
                      ]}
                    />
                  </FieldRow>
                  <FieldRow label="Dark Mode" hint="Coming soon — toggle UI theme">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SToggle value={appearance.dark_mode} onChange={v => setAppearance(p => ({ ...p, dark_mode: v }))} label="Dark mode" />
                      <span className="settings-toggle-label">{appearance.dark_mode ? 'Dark' : 'Light'}</span>
                    </div>
                  </FieldRow>
                  <FieldRow label="Compact Sidebar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <SToggle value={appearance.sidebar_compact} onChange={v => setAppearance(p => ({ ...p, sidebar_compact: v }))} label="Compact sidebar" />
                      <span className="settings-toggle-label">{appearance.sidebar_compact ? 'Icons only' : 'Icons + Labels'}</span>
                    </div>
                  </FieldRow>
                </div>

                <div className="settings-color-preview" style={{ marginTop: 20 }}>
                  <div className="settings-color-preview-bar" style={{ background: appearance.primary_color }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>Brand color preview</span>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ──── BACKUP ──── */}
          {tab === 'backup' && (
            <div className="settings-panel">
              {/* ── Export Section ── */}
              <SectionCard title="Export & Backup" accent="#0891b2">
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.7, padding: '0 18px' }}>
                  Download a complete backup of your ERP data. Keep this file safe — you can restore everything from it later.
                </p>
                <div className="settings-backup-grid">
                  <div className="settings-backup-card">
                    <div className="settings-backup-icon" style={{ background: '#eff6ff' }}>
                      <IconDatabase size={22} color="#3b82f6" />
                    </div>
                    <div>
                      <div className="settings-backup-title">Full Data Export (JSON)</div>
                      <div className="settings-backup-desc">Customers, invoices, repairs, parts, quotations, purchase orders — everything</div>
                    </div>
                    <button onClick={handleBackup} disabled={backupLoading} className="settings-backup-btn">
                      {backupLoading ? <span className="settings-spinner" style={{ width: 14, height: 14 }} /> : <IconDownload size={14} />}
                      {backupLoading ? 'Exporting...' : 'Download JSON'}
                    </button>
                  </div>

                  <div className="settings-backup-card">
                    <div className="settings-backup-icon" style={{ background: '#f0fdf4' }}>
                      <IconFileInvoice size={22} color="#16a34a" />
                    </div>
                    <div>
                      <div className="settings-backup-title">Invoices CSV Export</div>
                      <div className="settings-backup-desc">All sales invoices in spreadsheet format — open in Excel or Google Sheets</div>
                    </div>
                    <button onClick={handleCsvExport} disabled={csvLoading} className="settings-backup-btn">
                      {csvLoading ? <span className="settings-spinner" style={{ width: 14, height: 14 }} /> : <IconDownload size={14} />}
                      {csvLoading ? 'Exporting...' : 'Download CSV'}
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* ── Import Section ── */}
              <SectionCard title="Restore from Backup" accent="#7c3aed">
                <div style={{ padding: '14px 18px' }}>
                  <div className="settings-info-box" style={{ marginBottom: 16 }}>
                    <IconInfoCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>How it works:</strong> Upload your <code>.json</code> backup file exported from this ERP system.
                      Records that already exist (same invoice number, customer phone, part number, etc.) will be <strong>skipped safely</strong>.
                      Only new records will be imported — no duplicates, no data loss.
                    </div>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    className={`settings-import-dropzone ${dragOver ? 'settings-import-dropzone-hover' : ''} ${importFile ? 'settings-import-dropzone-ready' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(false);
                      setImportResult(null);
                      setImportError('');
                      const file = e.dataTransfer.files[0];
                      if (file?.name.endsWith('.json')) setImportFile(file);
                      else setImportError('Please drop a .json backup file.');
                    }}
                    onClick={() => document.getElementById('backup-file-input')?.click()}
                  >
                    <input
                      id="backup-file-input"
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={e => {
                        setImportResult(null);
                        setImportError('');
                        const file = e.target.files?.[0];
                        if (file) setImportFile(file);
                      }}
                    />
                    {importFile ? (
                      <>
                        <div className="settings-import-file-icon">📄</div>
                        <div className="settings-import-file-name">{importFile.name}</div>
                        <div className="settings-import-file-size">{(importFile.size / 1024).toFixed(1)} KB — ready to import</div>
                        <button
                          onClick={e => { e.stopPropagation(); setImportFile(null); setImportResult(null); setImportError(''); }}
                          className="settings-import-clear-btn"
                        >
                          <IconX size={12} /> Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <IconUpload size={28} color={dragOver ? '#7c3aed' : '#94a3b8'} />
                        <div className="settings-import-drop-label">Drop your backup file here</div>
                        <div className="settings-import-drop-hint">or click to browse — accepts <code>.json</code> files only</div>
                      </>
                    )}
                  </div>

                  {importError && (
                    <div className="settings-error-bar" style={{ marginTop: 12 }}>
                      <IconAlertTriangle size={15} /> {importError}
                    </div>
                  )}

                  {importFile && !importResult && (
                    <button
                      onClick={handleImport}
                      disabled={importLoading}
                      className="settings-import-start-btn"
                    >
                      {importLoading
                        ? <><span className="settings-spinner" /> Importing — please wait...</>
                        : <><IconUpload size={15} /> Start Import</>}
                    </button>
                  )}

                  {/* Result panel */}
                  {importResult && (
                    <div className="settings-import-result">
                      <div className={`settings-import-result-header ${importResult.success ? 'settings-import-result-ok' : 'settings-import-result-err'}`}>
                        {importResult.success
                          ? <><IconCheck size={16} /> Import Successful — {importResult.total_imported} records restored</>
                          : <><IconX size={16} /> Import Failed</>}
                      </div>
                      <p style={{ margin: '10px 0 6px', fontSize: 12.5, color: '#475569' }}>{importResult.summary}</p>

                      {/* Log */}
                      {importResult.log.length > 0 && (
                        <div className="settings-import-log">
                          <div className="settings-import-log-title">📋 Import Log</div>
                          {importResult.log.map((line, i) => (
                            <div key={i} className="settings-import-log-line settings-import-log-ok">{line}</div>
                          ))}
                        </div>
                      )}

                      {/* Warnings */}
                      {importResult.warnings.length > 0 && (
                        <div className="settings-import-log" style={{ marginTop: 8 }}>
                          <div className="settings-import-log-title">⚠️ Skipped ({importResult.warnings.length})</div>
                          <div className="settings-import-log-scrollable">
                            {importResult.warnings.map((w, i) => (
                              <div key={i} className="settings-import-log-line settings-import-log-warn">{w}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => { setImportResult(null); setImportFile(null); }}
                        className="settings-backup-btn"
                        style={{ marginTop: 12 }}
                      >
                        <IconRefresh size={14} /> Import Another File
                      </button>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ──── NOTIFICATIONS ──── */}
          {tab === 'notifications' && (
            <div className="settings-panel">
              <SectionCard title="Notification Channels" accent="#ea580c">
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.7 }}>
                  Choose which alerts to receive via which channels. Make sure the respective channels are configured first.
                </p>

                {[
                  {
                    category: '📦 Low Stock Alerts',
                    desc: 'Triggered when a part drops below its reorder level',
                    checks: [
                      { key: 'low_stock_email', label: 'Email' },
                      { key: 'low_stock_whatsapp', label: 'WhatsApp' },
                      { key: 'low_stock_telegram', label: 'Telegram' },
                    ],
                  },
                  {
                    category: '📄 Overdue Invoice Reminders',
                    desc: 'Daily digest of unpaid invoices past their due date',
                    checks: [
                      { key: 'overdue_invoice_email', label: 'Email' },
                      { key: 'overdue_invoice_telegram', label: 'Telegram' },
                    ],
                  },
                  {
                    category: '🔧 Repair Completion',
                    desc: 'Notify customer when repair is marked as ready for pickup',
                    checks: [
                      { key: 'repair_complete_whatsapp', label: 'WhatsApp' },
                      { key: 'repair_complete_telegram', label: 'Telegram' },
                    ],
                  },
                  {
                    category: '📊 Daily Summary',
                    desc: 'Morning digest with today\'s sales, repairs, and pending tasks',
                    checks: [
                      { key: 'daily_summary_telegram', label: 'Telegram' },
                    ],
                  },
                ].map(section => (
                  <div key={section.category} className="settings-notif-section">
                    <div className="settings-notif-category">{section.category}</div>
                    <div className="settings-notif-desc">{section.desc}</div>
                    <div className="settings-notif-checks">
                      {section.checks.map(c => (
                        <label key={c.key} className="settings-notif-check">
                          <SToggle
                            value={(notifications as any)[c.key]}
                            onChange={v => setNotifications(p => ({ ...p, [c.key]: v }))}
                            label={c.label}
                          />
                          <span className="settings-notif-check-label">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </SectionCard>
            </div>
          )}

          {/* ──── SYSTEM HEALTH ──── */}
          {tab === 'system' && (
            <div className="settings-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Live System Status</h3>
                <button onClick={refreshHealth} className="settings-refresh-btn" disabled={healthLoading}>
                  <IconRefresh size={14} className={healthLoading ? 'settings-spin' : ''} />
                  Refresh
                </button>
              </div>

              {healthLoading && !systemHealth ? (
                <div className="settings-health-loading"><div className="settings-loading-spinner" /></div>
              ) : systemHealth ? (
                <div className="settings-health-grid">
                  <div className="settings-health-card">
                    <div className="settings-health-card-header" style={{ color: '#16a34a' }}>
                      <IconActivity size={18} /> Server
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Uptime</span>
                      <span className="settings-health-value">{formatUptime(systemHealth.server.uptime_seconds)}</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Node.js</span>
                      <span className="settings-health-value">{systemHealth.server.node_version}</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Memory (RSS)</span>
                      <span className="settings-health-value">{systemHealth.server.memory_used_mb} MB</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Heap Used</span>
                      <span className="settings-health-value">{systemHealth.server.memory_heap_mb} / {systemHealth.server.memory_heap_total_mb} MB</span>
                    </div>
                  </div>

                  <div className="settings-health-card">
                    <div className="settings-health-card-header" style={{ color: '#3b82f6' }}>
                      <IconCpu size={18} /> System
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">CPU Cores</span>
                      <span className="settings-health-value">{systemHealth.system.cpu_cores}</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Total RAM</span>
                      <span className="settings-health-value">{systemHealth.system.total_memory_gb} GB</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Free RAM</span>
                      <span className="settings-health-value">{systemHealth.system.free_memory_gb} GB</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">OS</span>
                      <span className="settings-health-value">{systemHealth.system.os_type}</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Host</span>
                      <span className="settings-health-value">{systemHealth.system.hostname}</span>
                    </div>
                  </div>

                  <div className="settings-health-card">
                    <div className="settings-health-card-header" style={{ color: systemHealth.database.status === 'connected' ? '#16a34a' : '#dc2626' }}>
                      <IconServer size={18} /> Database
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Status</span>
                      <span className="settings-health-value" style={{ color: systemHealth.database.status === 'connected' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                        {systemHealth.database.status === 'connected' ? '● Connected' : '● Error'}
                      </span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Provider</span>
                      <span className="settings-health-value">{systemHealth.database.provider}</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Latency</span>
                      <span className="settings-health-value">{systemHealth.database.latency_ms} ms</span>
                    </div>
                    <div className="settings-health-stat">
                      <span className="settings-health-label">Last Check</span>
                      <span className="settings-health-value" style={{ fontSize: 11 }}>{new Date(systemHealth.timestamp).toLocaleTimeString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="settings-error-bar">Could not reach server health endpoint.</div>
              )}
            </div>
          )}

          {/* ── Save button (hidden on system & users) ── */}
          {tab !== 'system' && tab !== 'users' && (
            <div className="settings-save-bar">
              <button onClick={handleSave} disabled={saveLoading} className="settings-save-btn">
                {saveLoading
                  ? <><span className="settings-spinner" /> Saving...</>
                  : <><IconDeviceFloppy size={16} /> Save Settings</>}
              </button>
              {saved && (
                <span className="settings-saved-msg">
                  <IconCheck size={14} /> Saved successfully
                </span>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
