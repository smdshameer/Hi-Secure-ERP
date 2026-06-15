import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  IconSettings, IconBuilding, IconFileInvoice, IconCurrencyRupee,
  IconMail, IconBrandWhatsapp, IconBrandTelegram, IconLink,
  IconUsers, IconPalette, IconDatabase, IconBell, IconActivity,
  IconDeviceFloppy, IconSend, IconCheck, IconX, IconRefresh,
  IconDownload, IconUpload, IconServer, IconCpu, IconChevronRight,
  IconEye, IconEyeOff, IconAlertTriangle, IconInfoCircle, IconHistory,
  IconChevronDown, IconPlus
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────
type TabKey =
  | 'company' | 'invoice' | 'tax'
  | 'email' | 'whatsapp' | 'telegram'
  | 'integrations' | 'users' | 'appearance'
  | 'backup' | 'notifications' | 'system'
  | 'audit' | 'ai';

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
      { key: 'ai',           label: 'Hi-Secure AI',      icon: IconCpu },
      { key: 'system',       label: 'System Health',     icon: IconActivity },
      { key: 'audit',        label: 'Audit Trail',       icon: IconHistory },
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

function SSearchableSelect({ value, onChange, options, placeholder = 'Search or enter model ID...' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const matched = options.find(o => o.value === value);
    if (matched) {
      setInputValue(matched.label);
    } else {
      setInputValue(value || '');
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const isDisplayingSelectedLabel = selectedOption && inputValue === selectedOption.label;

  const filteredOptions = useMemo(() => {
    if (isDisplayingSelectedLabel || !inputValue) {
      return options.filter(o => o.value !== 'custom');
    }
    const term = inputValue.toLowerCase();
    return options.filter(o => 
      o.value !== 'custom' && (
        o.label.toLowerCase().includes(term) || 
        o.value.toLowerCase().includes(term)
      )
    );
  }, [inputValue, options, isDisplayingSelectedLabel]);

  const hasExactMatch = options.some(o => 
    o.value !== 'custom' && (
      o.value.toLowerCase() === inputValue.toLowerCase() || 
      o.label.toLowerCase() === inputValue.toLowerCase()
    )
  );

  const showCustomOption = inputValue && !hasExactMatch;

  const handleSelectOption = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setIsOpen(true);
    setHighlightedIndex(0);
    const match = options.find(o => 
      o.value !== 'custom' && (
        o.label.toLowerCase() === text.toLowerCase() || 
        o.value.toLowerCase() === text.toLowerCase()
      )
    );
    if (match) {
      onChange(match.value);
    } else {
      onChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => {
        const max = filteredOptions.length + (showCustomOption ? 1 : 0) - 1;
        return prev < max ? prev + 1 : 0;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => {
        const max = filteredOptions.length + (showCustomOption ? 1 : 0) - 1;
        return prev > 0 ? prev - 1 : max;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex].value);
        } else if (showCustomOption && highlightedIndex === filteredOptions.length) {
          handleSelectOption(inputValue);
        } else {
          handleSelectOption(inputValue);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="settings-input"
          style={{ paddingRight: '30px' }}
        />
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: '10px',
            cursor: 'pointer',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <IconChevronDown size={16} />
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 100,
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {filteredOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectOption(opt.value);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: isSelected ? '#ffffff' : '#0f172a',
                  background: isSelected 
                    ? '#1a3480' 
                    : isHighlighted 
                      ? '#f1f5f9' 
                      : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <IconCheck size={14} style={{ color: '#ffffff' }} />}
              </div>
            );
          })}

          {showCustomOption && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectOption(inputValue);
              }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: highlightedIndex === filteredOptions.length ? '#1a3480' : '#64748b',
                background: highlightedIndex === filteredOptions.length ? '#f1f5f9' : 'transparent',
                borderTop: '1px solid #e2e8f0',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IconPlus size={14} />
              <span>Use custom model: <strong>{inputValue}</strong></span>
            </div>
          )}

          {filteredOptions.length === 0 && !showCustomOption && (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: '13px',
              color: '#94a3b8'
            }}>
              No matching models found.
            </div>
          )}
        </div>
      )}
    </div>
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
  const [aiTestResult, setAiTestResult] = useState<TestResult>(idleResult);

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

  const [backupConfig, setBackupConfig] = useState({
    backup_enabled: false,
    backup_type: 'json',
    retention_days: 14,
    backup_time: '01:00',
  });

  const [gdriveConfig, setGdriveConfig] = useState({
    gdrive_enabled: false,
    client_email: '',
    private_key: '',
    folder_id: '',
  });

  const [aiConfig, setAiConfig] = useState({
    ai_enabled: false,
    nvidia_api_key: '',
    model_id: 'stepfun-ai/step-3.7-flash',
    telegram_ai_enabled: false,
  });

  const [nvidiaModels, setNvidiaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

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

  // Audit log states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('');
  const [auditFilterEntityId, setAuditFilterEntityId] = useState('');
  const [auditLimit, setAuditLimit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<any>(null);

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
        if (d?.backup) setBackupConfig(p => ({ ...p, ...d.backup }));
        if (d?.gdrive) setGdriveConfig(p => ({ ...p, ...d.gdrive }));
        if (d?.ai) setAiConfig(p => ({ ...p, ...d.ai }));
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

  // ── Fetch NVIDIA models when AI tab is selected and key is set ──
  useEffect(() => {
    if (tab === 'ai' && aiConfig.nvidia_api_key) {
      setLoadingModels(true);
      api.post('/settings/nvidia-models', { apiKey: aiConfig.nvidia_api_key })
        .then(res => {
          if (res.data && res.data.success && Array.isArray(res.data.models)) {
            setNvidiaModels(res.data.models);
          }
        })
        .catch(err => {
          console.error('Failed to fetch NVIDIA models:', err);
        })
        .finally(() => {
          setLoadingModels(false);
        });
    }
  }, [tab, aiConfig.nvidia_api_key]);

  // ── Fetch audit logs ──
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params: any = { limit: auditLimit };
      if (auditFilterAction) params.action = auditFilterAction;
      if (auditFilterType) params.entity_type = auditFilterType;
      if (auditFilterEntityId) params.entity_id = parseInt(auditFilterEntityId);
      
      const res = await api.get('/settings/audit-logs', { params });
      setAuditLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setAuditLoading(false);
    }
  }, [auditLimit, auditFilterAction, auditFilterType, auditFilterEntityId]);

  useEffect(() => {
    if (tab === 'audit') {
      fetchAuditLogs();
    }
  }, [tab, fetchAuditLogs]);

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
        backup: backupConfig, gdrive: gdriveConfig,
        ai: aiConfig,
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

  // ── Test Hi-Secure AI ──
  const handleTestAi = async () => {
    setAiTestResult({ status: 'loading', message: '' });
    try {
      await api.put('/settings', { ai: aiConfig });
      const res = await api.post('/settings/test-ai', {
        apiKey: aiConfig.nvidia_api_key,
        modelId: aiConfig.model_id
      })
        .then(r => ({ ok: true, msg: r.data.message }))
        .catch(e => ({ ok: false, msg: e.response?.data?.error || 'Failed to connect' }));
      setAiTestResult({ status: res.ok ? 'success' : 'error', message: res.msg });
    } catch (e: any) {
      setAiTestResult({
        status: 'error',
        message: e.response?.data?.error || e.message || 'Failed to save settings'
      });
    }
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

              {/* ── Google Drive Storage Integration ── */}
              <SectionCard title="Google Drive Storage Integration (100% Free)" accent="#16a34a">
                <div style={{ padding: '14px 18px' }}>
                  <div className="settings-info-box" style={{ marginBottom: 16 }}>
                    <IconInfoCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Google Cloud Project Guide (Free Tier):</strong>
                      <ol style={{ margin: '4px 0 0 0', paddingLeft: 16, lineHeight: 1.8, fontSize: 12 }}>
                        <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#1a3480', textDecoration: 'underline' }}>Google Cloud Console</a>.</li>
                        <li>Create a project, enable the <strong>Google Drive API</strong>.</li>
                        <li>Go to <strong>IAM & Admin &rarr; Service Accounts</strong>, create an account, and generate a <strong>JSON Key</strong>.</li>
                        <li>Open the JSON file and copy the <code>client_email</code> and <code>private_key</code> below.</li>
                        <li>Create a folder in Google Drive and <strong>share it</strong> with the service account email as "Editor".</li>
                      </ol>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <SToggle
                      value={gdriveConfig.gdrive_enabled}
                      onChange={v => setGdriveConfig(p => ({ ...p, gdrive_enabled: v }))}
                      label="Enable Google Drive Cloud Storage"
                    />
                    <span className="settings-toggle-label">Google Drive {gdriveConfig.gdrive_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="settings-grid-2">
                    <FieldRow label="Service Account Email" hint="client_email from JSON key file">
                      <SInput
                        value={gdriveConfig.client_email}
                        onChange={v => setGdriveConfig(p => ({ ...p, client_email: v }))}
                        placeholder="backup-agent@project.iam.gserviceaccount.com"
                      />
                    </FieldRow>
                    <FieldRow label="Google Drive Folder ID" hint="The ID at the end of the folder share link">
                      <SInput
                        value={gdriveConfig.folder_id}
                        onChange={v => setGdriveConfig(p => ({ ...p, folder_id: v }))}
                        placeholder="18zxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </FieldRow>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <FieldRow label="Private Key" hint="private_key from JSON key (include BEGIN/END tags)">
                      <STextarea
                        value={gdriveConfig.private_key}
                        onChange={v => setGdriveConfig(p => ({ ...p, private_key: v }))}
                        rows={4}
                        placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC..."
                      />
                    </FieldRow>
                  </div>
                </div>
              </SectionCard>

              {/* ── Automated Backup Configuration ── */}
              <SectionCard title="Automated Daily Backup Schedule" accent="#ea580c">
                <div style={{ padding: '14px 18px' }}>
                  <div className="settings-info-box" style={{ marginBottom: 16 }}>
                    <IconInfoCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Configuration Guide:</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, lineHeight: 1.8, fontSize: 12 }}>
                        <li><strong>Daily Backup Time</strong>: The hour of day (24h format) when the backup scheduler checks and executes.</li>
                        <li><strong>Backup Type</strong>: <code>SQL Dump</code> (native pg_dump file, recommended for local servers) or <code>JSON Fallback</code> (stateless platform deployments).</li>
                        <li><strong>Retention Policy</strong>: Outdated files will be purged automatically from local disk.</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <SToggle
                      value={backupConfig.backup_enabled}
                      onChange={v => setBackupConfig(p => ({ ...p, backup_enabled: v }))}
                      label="Enable Auto-Scheduled Backups"
                    />
                    <span className="settings-toggle-label">Auto Backup {backupConfig.backup_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="settings-grid-3">
                    <FieldRow label="Backup Type" hint="File format type">
                      <SSelect
                        value={backupConfig.backup_type}
                        onChange={v => setBackupConfig(p => ({ ...p, backup_type: v }))}
                        options={[
                          { value: 'json', label: 'JSON Data (Stateless fallback)' },
                          { value: 'sql', label: 'SQL Schema & Data (pg_dump)' }
                        ]}
                      />
                    </FieldRow>
                    <FieldRow label="Daily Execution Time" hint="Hour of execution (24h format)">
                      <SInput
                        value={backupConfig.backup_time}
                        onChange={v => setBackupConfig(p => ({ ...p, backup_time: v }))}
                        placeholder="02:00"
                      />
                    </FieldRow>
                    <FieldRow label="Retention Threshold" hint="Days to keep before auto-purging">
                      <SInput
                        type="number"
                        value={backupConfig.retention_days}
                        onChange={v => setBackupConfig(p => ({ ...p, retention_days: Number(v) || 14 }))}
                        placeholder="14"
                      />
                    </FieldRow>
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

          {/* ──── HI-SECURE AI ──── */}
          {tab === 'ai' && (
            <div className="settings-panel">
              <SectionCard title="Hi-Secure AI Assistant Settings" accent="#1a3480">
                <div style={{ padding: '14px 18px' }}>
                  <div className="settings-info-box" style={{ marginBottom: 16 }}>
                    <IconInfoCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Hi-Secure AI Assistant:</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12, lineHeight: 1.6 }}>
                        Hi-Secure AI is an intelligent assistant capable of managing your ERP. It can retrieve real-time inventory stock levels, locate invoices and customer records, check server health, and run database backups.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <SToggle
                      value={aiConfig.ai_enabled}
                      onChange={v => setAiConfig(p => ({ ...p, ai_enabled: v }))}
                      label="Enable Hi-Secure AI Assistant"
                    />
                    <span className="settings-toggle-label">Hi-Secure AI {aiConfig.ai_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="settings-grid-2">
                    <FieldRow label="NVIDIA NIM API Key" hint="NVIDIA API Key for LLM Inference">
                      <SPassword
                        value={aiConfig.nvidia_api_key}
                        onChange={v => setAiConfig(p => ({ ...p, nvidia_api_key: v }))}
                        placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </FieldRow>
                    <FieldRow label="Hi-Secure AI Model" hint="Select from free NIM models or use a custom ID">
                      <SSelect
                        value={(() => {
                          const options = [
                            'stepfun-ai/step-3.7-flash',
                            'meta/llama-3.1-70b-instruct',
                            'nvidia/llama-3.1-nemotron-51b-instruct',
                            'meta/llama-3.1-8b-instruct',
                            'meta/llama-3.1-405b-instruct',
                            'mistralai/mistral-large-2-instruct'
                          ];
                          if (options.includes(aiConfig.model_id)) return aiConfig.model_id;
                          return aiConfig.model_id ? 'custom' : 'stepfun-ai/step-3.7-flash';
                        })()}
                        onChange={v => {
                          if (v === 'custom') {
                            setAiConfig(p => ({ ...p, model_id: '' }));
                          } else {
                            setAiConfig(p => ({ ...p, model_id: v }));
                          }
                        }}
                        options={[
                          { value: 'stepfun-ai/step-3.7-flash', label: 'Step-3.7-Flash (Primary Default)' },
                          { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct (Free)' },
                          { value: 'nvidia/llama-3.1-nemotron-51b-instruct', label: 'Llama 3.1 Nemotron 51B Instruct (Free)' },
                          { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct (Free)' },
                          { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B Instruct (Free)' },
                          { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2 Instruct (Free)' },
                          { value: 'custom', label: 'Custom Model ID...' }
                        ]}
                      />
                    </FieldRow>
                  </div>

                  {!(
                    [
                      'stepfun-ai/step-3.7-flash',
                      'meta/llama-3.1-70b-instruct',
                      'nvidia/llama-3.1-nemotron-51b-instruct',
                      'meta/llama-3.1-8b-instruct',
                      'meta/llama-3.1-405b-instruct',
                      'mistralai/mistral-large-2-instruct'
                    ].includes(aiConfig.model_id)
                  ) && (
                    <div style={{ marginTop: 12 }}>
                      <FieldRow label="Custom Model ID" hint={loadingModels ? "Loading models list..." : "Type to filter and select custom hosted model identifier"}>
                        <SSearchableSelect
                          value={aiConfig.model_id}
                          onChange={v => setAiConfig(p => ({ ...p, model_id: v }))}
                          options={
                            nvidiaModels.length > 0
                              ? nvidiaModels.map(m => ({ value: m, label: m }))
                              : [
                                  { value: 'stepfun-ai/step-3.7-flash', label: 'Step-3.7-Flash' },
                                  { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct' },
                                  { value: 'nvidia/llama-3.1-nemotron-51b-instruct', label: 'Llama 3.1 Nemotron 51B Instruct' },
                                  { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct' },
                                  { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B Instruct' },
                                  { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2 Instruct' }
                                ]
                          }
                          placeholder="e.g. nvidia/llama-3.1-nemotron-70b-instruct"
                        />
                      </FieldRow>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                    <SToggle
                      value={aiConfig.telegram_ai_enabled}
                      onChange={v => setAiConfig(p => ({ ...p, telegram_ai_enabled: v }))}
                      label="Enable AI Bot Control via Telegram"
                    />
                    <span className="settings-toggle-label">Telegram AI Control {aiConfig.telegram_ai_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                      Verify your connection credentials with the NVIDIA NIM API servers.
                    </span>
                    <TestButton
                      label="Test NIM Connection"
                      onClick={handleTestAi}
                      result={aiTestResult}
                      icon={IconCpu}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="NVIDIA NIM & Telegram Setup Guide" accent="#ea580c">
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                    <strong>Step-by-step Setup Instructions:</strong>
                    <ol style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: 12 }}>
                      <li>Go to the <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#1a3480', textDecoration: 'underline' }}>NVIDIA Build Console</a>.</li>
                      <li>Sign up for a free developer account (includes 1,000 free inference credits).</li>
                      <li>Generate an API Key (it starts with <code>nvapi-</code>) and paste it into the <strong>NVIDIA NIM API Key</strong> field above.</li>
                      <li>Set the model to <code>stepfun-ai/step-3.7-flash</code> (or any other NIM-supported model you want to use).</li>
                      <li>To control the assistant via Telegram, toggle <strong>Telegram AI Control</strong> on. Make sure your Telegram bot token is configured in the <strong>Telegram</strong> settings tab. Only messages sent from the authorized Chat ID will be accepted.</li>
                    </ol>
                  </div>
                </div>
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

          {/* ──── AUDIT ──── */}
          {tab === 'audit' && (
            <div className="settings-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>System Audit Trail</h3>
                <button onClick={fetchAuditLogs} className="settings-refresh-btn" disabled={auditLoading}>
                  <IconRefresh size={14} className={auditLoading ? 'settings-spin' : ''} />
                  Refresh Logs
                </button>
              </div>

              {/* Filter controls */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12
              }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Action</label>
                  <select
                    value={auditFilterAction}
                    onChange={e => setAuditFilterAction(e.target.value)}
                    className="settings-input"
                    style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }}
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="RECEIVE">RECEIVE</option>
                    <option value="APPROVE">APPROVE</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Entity Type</label>
                  <select
                    value={auditFilterType}
                    onChange={e => setAuditFilterType(e.target.value)}
                    className="settings-input"
                    style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }}
                  >
                    <option value="">All Types</option>
                    <option value="Parts">Parts</option>
                    <option value="SalesInvoice">SalesInvoice</option>
                    <option value="PurchaseOrder">PurchaseOrder</option>
                    <option value="Repair">Repair</option>
                    <option value="PartStock">PartStock</option>
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Entity ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 12"
                    value={auditFilterEntityId}
                    onChange={e => setAuditFilterEntityId(e.target.value)}
                    className="settings-input"
                    style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Show Limit</label>
                  <select
                    value={auditLimit}
                    onChange={e => setAuditLimit(Number(e.target.value))}
                    className="settings-input"
                    style={{ padding: '6px 10px', height: 'auto', fontSize: 12 }}
                  >
                    <option value="50">50 rows</option>
                    <option value="100">100 rows</option>
                    <option value="200">200 rows</option>
                    <option value="500">500 rows</option>
                  </select>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                {auditLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <div className="settings-loading-spinner" style={{ margin: '0 auto 12px' }} />
                    <span>Loading audit logs...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <span>No audit logs found matching criteria.</span>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                          <th style={{ padding: '12px 16px' }}>Timestamp</th>
                          <th style={{ padding: '12px 16px' }}>User</th>
                          <th style={{ padding: '12px 16px' }}>Action</th>
                          <th style={{ padding: '12px 16px' }}>Entity</th>
                          <th style={{ padding: '12px 16px' }}>IP Address</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: '#334155' }}>
                        {auditLogs.map((log) => {
                          let badgeColor = '#64748b'; // default gray
                          if (log.action.includes('CREATE') || log.action === 'RECEIVE') badgeColor = '#16a34a'; // green
                          else if (log.action.includes('UPDATE') || log.action === 'TRANSFER') badgeColor = '#2563eb'; // blue
                          else if (log.action.includes('DELETE') || log.action === 'REJECT') badgeColor = '#dc2626'; // red
                          else if (log.action === 'APPROVE') badgeColor = '#0d9488'; // teal

                          return (
                            <tr key={log.log_id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50/50">
                              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                {new Date(log.created_at).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                {log.username || 'System'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  background: badgeColor + '15',
                                  color: badgeColor,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700
                                }}>
                                  {log.action}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontWeight: 600, color: '#1a3480' }}>{log.entity_type}</span>
                                {log.entity_id && <span style={{ color: '#64748b' }}> #{log.entity_id}</span>}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                                {log.ip_address || '-'}
                              </td>
                              <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                                <button
                                  onClick={() => setSelectedLog(log)}
                                  className="settings-test-btn"
                                  style={{
                                    background: '#1a3480',
                                    padding: '4px 10px',
                                    fontSize: 11.5,
                                    borderRadius: 6,
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <IconEye size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                  View Diff
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Save button (hidden on system, users & audit) ── */}
          {tab !== 'system' && tab !== 'users' && tab !== 'audit' && (
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

      {/* Audit Log Details Drawer/Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '650px',
            background: '#fff',
            height: '100%',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  Audit Log Details
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Log #{selectedLog.log_id} — {new Date(selectedLog.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex'
                }}
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Overview Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600 }}>USER</span>
                  <strong style={{ color: '#0f172a' }}>{selectedLog.username || 'System'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600 }}>ACTION</span>
                  <strong style={{ color: '#0f172a' }}>{selectedLog.action}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600 }}>ENTITY TARGET</span>
                  <strong style={{ color: '#1a3480' }}>
                    {selectedLog.entity_type} {selectedLog.entity_id ? `#${selectedLog.entity_id}` : ''}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600 }}>IP ADDRESS</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedLog.ip_address || '-'}</strong>
                </div>
              </div>

              {/* State Changes / Diffs */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                  Field-Level Diffs
                </h4>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px' }}>Field</th>
                          <th style={{ padding: '10px 12px', background: '#fef2f2', color: '#991b1b' }}>Original Value</th>
                          <th style={{ padding: '10px 12px', background: '#f0fdf4', color: '#166534' }}>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedLog.details).map(([field, change]: [string, any]) => {
                          const formatVal = (val: any) => {
                            if (val === null || val === undefined) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>null</span>;
                            if (typeof val === 'object') return JSON.stringify(val);
                            return String(val);
                          };
                          return (
                            <tr key={field} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'monospace', color: '#1e293b' }}>
                                {field}
                              </td>
                              <td style={{ padding: '10px 12px', background: '#fff8f8', color: '#b91c1c', verticalAlign: 'top', wordBreak: 'break-all' }}>
                                {formatVal(change.from)}
                              </td>
                              <td style={{ padding: '10px 12px', background: '#f8fff9', color: '#15803d', verticalAlign: 'top', wordBreak: 'break-all' }}>
                                {formatVal(change.to)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : selectedLog.action === 'CREATE' && selectedLog.new_value ? (
                  <div style={{
                    background: '#f8fff9',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    borderRadius: 8,
                    padding: '12px 14px',
                    fontSize: '12px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Record Created</p>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11.5, background: 'rgba(255,255,255,0.6)', padding: 10, borderRadius: 6 }}>
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  </div>
                ) : selectedLog.action === 'DELETE' && selectedLog.old_value ? (
                  <div style={{
                    background: '#fff5f5',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    borderRadius: 8,
                    padding: '12px 14px',
                    fontSize: '12px'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Record Deleted</p>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11.5, background: 'rgba(255,255,255,0.6)', padding: 10, borderRadius: 6 }}>
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: 12.5,
                    color: '#64748b'
                  }}>
                    No field-level changes recorded for this action.
                  </div>
                )}
              </div>

              {/* Raw JSON Accordion */}
              <details style={{ marginTop: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <summary style={{ padding: '10px 12px', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: '#475569' }}>
                  View Raw Log JSON
                </summary>
                <pre style={{
                  margin: 0,
                  padding: 12,
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  overflowX: 'auto',
                  maxHeight: 200
                }}>
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
