import { useState, useEffect } from 'react';
import api from '../services/api';
import PageBanner from '../components/PageBanner';
import {
  IconShieldCheck, IconAlertTriangle, IconServer, IconDatabase,
  IconCpu, IconDeviceSdCard, IconCloudUpload, IconRefresh,
  IconFilter, IconActivity, IconLock, IconUserOff, IconListDetails,
  IconBrandTelegram
} from '@tabler/icons-react';

// ─── Types ─────────────────────────────────────────────────
interface AuditSummary {
  failed_logins: number;
  permission_denied: number;
  token_blacklist: number;
  inventory_adjustments: number;
  manual_journals: number;
  gst_overrides: number;
  rollback_executions: number;
  supplier_governance: number;
  system_warnings: number;
  system_critical: number;
  total_events: number;
}

interface MonitoringData {
  timestamp: string;
  uptime_seconds: number;
  cpu: { usage_percent: number; cores: number; status: string };
  memory: { usage_percent: number; total_gb: number; free_gb: number; process_rss_mb: number; heap_used_mb: number; status: string };
  database: { status: string; latency_ms: number };
  redis: { status: string };
  queue: { active: number; failed: number; status: string };
  telegram: { status: string; lastSuccessfulPoll: string | null; lastError: string | null };
  storage: { used_mb: number; uploads_count: number; backups_count: number };
  backup: { latest: string | null; age_hours: number | null; status: string };
  alerts: Array<{ level: string; message: string }>;
}

interface AuditEvent {
  event_id: number;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
  user?: { username: string; full_name: string };
}

interface DRCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: any;
  error?: string;
  latency_ms?: number;
}

interface DRReport {
  timestamp: string;
  status: string;
  checks: DRCheck[];
  summary: { total_checks: number; passed: number; failed: number; warnings: number; verdict: string };
}

// ─── Component ─────────────────────────────────────────────
export default function AuditDashboard() {
  const [tab, setTab] = useState<'audit' | 'monitoring' | 'dr'>('monitoring');
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [drReport, setDrReport] = useState<DRReport | null>(null);
  const [drLoading, setDrLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', module: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, monRes, evtRes] = await Promise.all([
        api.get('/audit/summary').catch(() => ({ data: null })),
        api.get('/audit/monitoring').catch(() => ({ data: null })),
        api.get('/audit/events', { params: { limit: 30, ...filters } }).catch(() => ({ data: { events: [] } })),
      ]);
      if (sumRes.data) setSummary(sumRes.data);
      if (monRes.data) setMonitoring(monRes.data);
      if (evtRes.data?.events) setEvents(evtRes.data.events);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (tab === 'audit') {
      api.get('/audit/events', { params: { limit: 50, ...filters } })
        .then((r: any) => setEvents(r.data?.events || []))
        .catch(() => {});
    }
  }, [filters, tab]);

  const runDR = async () => {
    setDrLoading(true);
    try {
      const r = await api.post('/audit/verify-disaster-recovery');
      setDrReport(r.data);
    } catch { setDrReport(null); }
    setDrLoading(false);
  };

  const statusColor = (s: string) =>
    s === 'healthy' || s === 'PASS' ? 'text-emerald-400' :
    s === 'warning' || s === 'WARN' || s === 'degraded' ? 'text-amber-400' :
    s === 'critical' || s === 'FAIL' || s === 'unhealthy' ? 'text-red-400' :
    'text-gray-400';

  const statusBg = (s: string) =>
    s === 'healthy' || s === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/30' :
    s === 'warning' || s === 'WARN' || s === 'degraded' ? 'bg-amber-500/10 border-amber-500/30' :
    s === 'critical' || s === 'FAIL' || s === 'unhealthy' ? 'bg-red-500/10 border-red-500/30' :
    'bg-gray-500/10 border-gray-500/30';

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <PageBanner
          icon={<IconShieldCheck size={28} />}
          title="Production Control Center"
          subtitle="System Monitoring • Audit Trail • Disaster Recovery"
          backLabel="Dashboard"
          backPath="/"
          action={
            <button onClick={loadData} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors">
              <IconRefresh size={15} /> Refresh
            </button>
          }
        />

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-6 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {[
            { key: 'monitoring', label: 'System Monitoring', icon: IconServer },
            { key: 'audit', label: 'Audit Trail', icon: IconShieldCheck },
            { key: 'dr', label: 'Disaster Recovery', icon: IconDatabase },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key as any); if (t.key === 'dr' && !drReport) runDR(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === t.key ? 'bg-[#1a3480] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══ MONITORING TAB ═══ */}
        {tab === 'monitoring' && monitoring && (
          <div className="space-y-6">
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CPU Usage', value: `${monitoring.cpu.usage_percent}%`, status: monitoring.cpu.status, icon: IconCpu },
                { label: 'Memory Usage', value: `${monitoring.memory.usage_percent}%`, status: monitoring.memory.status, icon: IconDeviceSdCard },
                { label: 'PostgreSQL', value: `${monitoring.database.latency_ms}ms`, status: monitoring.database.status, icon: IconDatabase },
                { label: 'Redis', value: monitoring.redis.status, status: monitoring.redis.status, icon: IconActivity },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl border p-4 ${statusBg(m.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <m.icon size={20} className={statusColor(m.status)} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${statusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-[22px] font-bold text-white">{m.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Uptime', value: formatUptime(monitoring.uptime_seconds), status: 'healthy', icon: IconServer },
                { label: 'Telegram', value: monitoring.telegram.status, status: monitoring.telegram.status === 'healthy' ? 'healthy' : monitoring.telegram.status === 'disabled' ? 'warning' : 'critical', icon: IconBrandTelegram },
                { label: 'Queue', value: `${monitoring.queue.active} active`, status: monitoring.queue.status, icon: IconListDetails },
                { label: 'Backup Age', value: monitoring.backup.age_hours !== null ? `${monitoring.backup.age_hours}h` : 'None', status: monitoring.backup.status, icon: IconCloudUpload },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl border p-4 ${statusBg(m.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <m.icon size={20} className={statusColor(m.status)} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${statusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-[22px] font-bold text-white">{m.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Resource Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-[14px] font-semibold text-white mb-3">Memory Details</h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-gray-400">Total System</span><span>{monitoring.memory.total_gb} GB</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Free</span><span>{monitoring.memory.free_gb} GB</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Process RSS</span><span>{monitoring.memory.process_rss_mb} MB</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Heap Used</span><span>{monitoring.memory.heap_used_mb} MB</span></div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div className={`h-2 rounded-full ${monitoring.memory.usage_percent > 85 ? 'bg-red-500' : monitoring.memory.usage_percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, monitoring.memory.usage_percent)}%` }} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-[14px] font-semibold text-white mb-3">Storage & Backups</h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-gray-400">Uploads</span><span>{monitoring.storage.uploads_count} files ({monitoring.storage.used_mb} MB)</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Backup Files</span><span>{monitoring.storage.backups_count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Latest Backup</span><span>{monitoring.backup.latest || 'None'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Backup Age</span>
                    <span className={monitoring.backup.age_hours && monitoring.backup.age_hours > 24 ? 'text-red-400 font-bold' : ''}>
                      {monitoring.backup.age_hours !== null ? `${monitoring.backup.age_hours} hours` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {monitoring.alerts.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                <h3 className="text-[14px] font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <IconAlertTriangle size={18} /> Active Alerts ({monitoring.alerts.length})
                </h3>
                <div className="space-y-2">
                  {monitoring.alerts.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-[12px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.level === 'SYSTEM_CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {a.level}
                      </span>
                      <span className="text-gray-300">{a.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ AUDIT TRAIL TAB ═══ */}
        {tab === 'audit' && (
          <div className="space-y-4">
            {/* Audit Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Failed Logins', value: summary.failed_logins, icon: IconUserOff, color: 'text-red-400' },
                  { label: 'Permission Denied', value: summary.permission_denied, icon: IconLock, color: 'text-amber-400' },
                  { label: 'Token Blacklist', value: summary.token_blacklist, icon: IconShieldCheck, color: 'text-blue-400' },
                  { label: 'Inventory Adjustments', value: summary.inventory_adjustments, icon: IconListDetails, color: 'text-cyan-400' },
                  { label: 'Manual Journals', value: summary.manual_journals, icon: IconActivity, color: 'text-purple-400' },
                  { label: 'GST Overrides', value: summary.gst_overrides, icon: IconAlertTriangle, color: 'text-orange-400' },
                  { label: 'Rollbacks', value: summary.rollback_executions, icon: IconRefresh, color: 'text-red-400' },
                  { label: 'Supplier Actions', value: summary.supplier_governance, icon: IconDatabase, color: 'text-green-400' },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <c.icon size={14} className={c.color} />
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{c.label}</span>
                    </div>
                    <div className="text-[20px] font-bold text-white">{c.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-3 items-center bg-white/5 rounded-xl p-3 border border-white/10">
              <IconFilter size={16} className="text-gray-400" />
              <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
                className="bg-white/10 border border-white/10 rounded-lg text-[12px] text-white px-3 py-1.5">
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
              </select>
              <select value={filters.module} onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
                className="bg-white/10 border border-white/10 rounded-lg text-[12px] text-white px-3 py-1.5">
                <option value="">All Modules</option>
                <option value="AUTH">Authentication</option>
                <option value="INVENTORY">Inventory</option>
                <option value="ACCOUNTING">Accounting</option>
                <option value="GST">GST</option>
                <option value="CATALOG">Catalog</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            {/* Event Log Table */}
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Event Type</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit events found</td></tr>
                  ) : events.map(e => (
                    <tr key={e.event_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.event_type?.includes('CRITICAL') || e.event_type?.includes('FAILED') ? 'bg-red-500/20 text-red-400' :
                          e.event_type?.includes('WARNING') || e.event_type?.includes('DENIED') ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {e.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-300">{e.user?.full_name || e.user?.username || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-[400px] truncate">{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ DISASTER RECOVERY TAB ═══ */}
        {tab === 'dr' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Disaster Recovery Verification</h2>
              <button onClick={runDR} disabled={drLoading}
                className="flex items-center gap-1.5 bg-[#1a3480] hover:bg-[#1a3480]/80 text-white text-[13px] px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <IconRefresh size={15} className={drLoading ? 'animate-spin' : ''} />
                {drLoading ? 'Running Checks...' : 'Run DR Verification'}
              </button>
            </div>

            {drReport && (
              <>
                {/* Verdict Banner */}
                <div className={`rounded-xl border p-5 ${statusBg(drReport.summary.verdict === 'PASS' ? 'PASS' : drReport.summary.verdict === 'PASS_WITH_WARNINGS' ? 'WARN' : 'FAIL')}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-[20px] font-bold ${statusColor(drReport.summary.verdict === 'PASS' ? 'PASS' : drReport.summary.verdict === 'PASS_WITH_WARNINGS' ? 'WARN' : 'FAIL')}`}>
                        {drReport.summary.verdict}
                      </div>
                      <div className="text-[12px] text-gray-400 mt-1">
                        {drReport.summary.passed} passed • {drReport.summary.warnings} warnings • {drReport.summary.failed} failed
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500">{new Date(drReport.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                {/* Check Results */}
                <div className="space-y-2">
                  {drReport.checks.map((c, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${statusBg(c.status)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-[18px] ${statusColor(c.status)}`}>
                            {c.status === 'PASS' ? '✓' : c.status === 'WARN' ? '⚠' : '✗'}
                          </span>
                          <div>
                            <div className="text-[13px] font-medium text-white">{c.name}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {typeof c.details === 'object' ? JSON.stringify(c.details) : c.details || c.error || ''}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[11px] font-bold ${statusColor(c.status)}`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {loading && !monitoring && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}
