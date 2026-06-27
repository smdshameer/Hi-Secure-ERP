import { useState, useEffect } from 'react';
import api from '../services/api';
import PageBanner from '../components/PageBanner';
import {
  IconKey, IconUsers, IconDevices, IconPlus,
  IconClock, IconCopy, IconCheck, IconMail,
  IconShieldCheck, IconAlertTriangle, IconActivity
} from '@tabler/icons-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
  licenseKey: string;
  expiresAt: string;
  createdAt: string;
  _count?: {
    users: number;
  };
}

interface ActiveDevice {
  id: string;
  tenantId: string;
  userId: number;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  os: string;
  browser: string;
  lastActiveAt: string;
  user: {
    username: string;
    full_name: string;
  };
  tenant: {
    name: string;
    subdomain: string;
  };
}

export default function SuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('BASIC');
  const [durationMonths, setDurationMonths] = useState('12');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, devicesRes] = await Promise.all([
        api.get('/saas/tenants'),
        api.get('/saas/active-devices')
      ]);
      setTenants(tenantsRes.data);
      setDevices(devicesRes.data);
    } catch (err: any) {
      console.error('Failed to fetch SaaS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setGeneratedKey(null);

    if (!companyName || !subdomain || !email) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      const res = await api.post('/saas/generate-key', {
        companyName,
        subdomain,
        email,
        plan,
        durationMonths
      });

      const data = res.data;
      setGeneratedKey(data.tenant.licenseKey);
      setFormSuccess(`SaaS Tenant ${companyName} created successfully! Product key emailed.`);
      
      // Clear inputs
      setCompanyName('');
      setSubdomain('');
      setEmail('');
      
      // Refresh list
      fetchDashboardData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to generate license key.');
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to determine subscription duration remaining
  const getSubscriptionStatus = (expiresAtStr: string, status: Tenant['status']) => {
    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (status === 'SUSPENDED') {
      return <span className="pill pill-red">Suspended</span>;
    }

    if (diffDays < -5) {
      return <span className="pill pill-red">Expired ({Math.abs(diffDays)}d ago)</span>;
    }

    if (diffDays < 0 && diffDays >= -5) {
      const graceDaysLeft = 5 - Math.abs(diffDays);
      return (
        <span className="pill pill-amber animate-pulse">
          Grace Period ({graceDaysLeft}d left)
        </span>
      );
    }

    if (diffDays <= 15) {
      return <span className="pill pill-amber">Expiring soon ({diffDays}d left)</span>;
    }

    return <span className="pill pill-green">Active ({diffDays}d left)</span>;
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <IconShieldCheck className="text-blue-500" size={28} />
            Hi-Secure SaaS Console
          </h1>
          <p className="text-gray-400 text-[13px] mt-0.5">
            Super Administrator cockpit to manage tenants, licenses, and active device sessions.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="btn btn-secondary flex items-center gap-1.5 text-[12px] py-1.5"
        >
          <IconActivity size={14} /> Refresh Logs
        </button>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <IconUsers size={24} />
          </div>
          <div>
            <div className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold">Total Tenants</div>
            <div className="text-2xl font-bold text-white mt-1">{tenants.length}</div>
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <IconDevices size={24} />
          </div>
          <div>
            <div className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold">Active Sessions</div>
            <div className="text-2xl font-bold text-white mt-1">{devices.length}</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <IconKey size={24} />
          </div>
          <div>
            <div className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold">Master Server Status</div>
            <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> ONLINE
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create Tenant / Key Generator */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4 lg:col-span-1">
          <h2 className="text-base font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-3">
            <IconPlus size={18} className="text-blue-500" />
            Provision New Client
          </h2>

          <form onSubmit={handleGenerateKey} className="flex flex-col gap-4">
            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[12px] flex items-center gap-2">
                <IconAlertTriangle size={16} /> {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[12px]">
                {formSuccess}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-gray-400 uppercase font-semibold">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="input input-dark"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-gray-400 uppercase font-semibold">Subdomain</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="acme"
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  className="input input-dark flex-grow"
                  required
                />
                <span className="text-gray-400 text-[12px] font-semibold">.hisecure.store</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-gray-400 uppercase font-semibold">Contact Email</label>
              <input
                type="email"
                placeholder="client@acme.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-dark"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-gray-400 uppercase font-semibold">Plan</label>
                <select 
                  value={plan} 
                  onChange={e => setPlan(e.target.value)}
                  className="input input-dark py-1.5"
                >
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-gray-400 uppercase font-semibold">Duration</label>
                <select 
                  value={durationMonths} 
                  onChange={e => setDurationMonths(e.target.value)}
                  className="input input-dark py-1.5"
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">1 Year</option>
                  <option value="24">2 Years</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary flex items-center justify-center gap-2 mt-2 py-2"
            >
              <IconMail size={16} /> Generate & Send Key
            </button>
          </form>

          {/* Generated Key Panel */}
          {generatedKey && (
            <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-2">
              <div className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">Product Key Generated</div>
              <div className="flex items-center justify-between gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
                <span className="font-mono text-sm text-white select-all font-bold tracking-wider">{generatedKey}</span>
                <button 
                  onClick={handleCopyKey}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <IconCheck size={16} className="text-emerald-400" /> : <IconCopy size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tenant List & Device Sessions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Subscribed Clients List */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-1.5 border-b border-white/5 pb-3">
              <IconClock size={18} className="text-blue-500" />
              Subscribed Companies
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400">
                    <th className="py-2.5 font-semibold uppercase">Company</th>
                    <th className="py-2.5 font-semibold uppercase">Subdomain</th>
                    <th className="py-2.5 font-semibold uppercase">Plan</th>
                    <th className="py-2.5 font-semibold uppercase">Status</th>
                    <th className="py-2.5 font-semibold uppercase">Expires At</th>
                    <th className="py-2.5 font-semibold uppercase text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">No tenants registered yet.</td>
                    </tr>
                  ) : (
                    tenants.map(t => (
                      <tr key={t.id} className="text-gray-300 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold text-white">{t.name}</td>
                        <td className="py-3 font-mono text-blue-400">{t.subdomain}</td>
                        <td className="py-3">
                          <span className={`pill ${t.plan === 'PREMIUM' ? 'pill-purple' : t.plan === 'STANDARD' ? 'pill-blue' : 'pill-gray'}`}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="py-3">{getSubscriptionStatus(t.expiresAt, t.status)}</td>
                        <td className="py-3">{new Date(t.expiresAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 text-right font-semibold">{t._count?.users ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Device Sessions */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-1.5 border-b border-white/5 pb-3">
              <IconDevices size={18} className="text-blue-500" />
              Live Device Sessions
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400">
                    <th className="py-2.5 font-semibold uppercase">User</th>
                    <th className="py-2.5 font-semibold uppercase">Company</th>
                    <th className="py-2.5 font-semibold uppercase">IP Address</th>
                    <th className="py-2.5 font-semibold uppercase">OS / Browser</th>
                    <th className="py-2.5 font-semibold uppercase">Device</th>
                    <th className="py-2.5 font-semibold uppercase text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">No active device sessions.</td>
                    </tr>
                  ) : (
                    devices.map(d => (
                      <tr key={d.id} className="text-gray-300 hover:bg-white/5 transition-colors">
                        <td className="py-3">
                          <div className="font-semibold text-white">{d.user?.full_name}</div>
                          <div className="text-[10px] text-gray-500">@{d.user?.username}</div>
                        </td>
                        <td className="py-3 font-semibold text-blue-400">{d.tenant?.name}</td>
                        <td className="py-3 font-mono text-[11px] text-gray-400">{d.ipAddress}</td>
                        <td className="py-3">
                          <span className="text-white">{d.os}</span>
                          <span className="text-gray-500 text-[10px] ml-1">({d.browser})</span>
                        </td>
                        <td className="py-3">
                          <span className={`pill ${d.deviceType === 'Mobile' ? 'pill-blue' : 'pill-gray'}`}>
                            {d.deviceType}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-400">
                          {new Date(d.lastActiveAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
