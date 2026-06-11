import { useEffect, useState, FormEvent } from 'react';
import PageBanner from './PageBanner';
import api from '../services/api';

interface FormPageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  backPath: string;
  backLabel?: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  loadRefData?: () => Promise<void>;
  submitEndpoint: string;
  successRedirect: string;
  submitLabel?: string;
  isLoading?: boolean;
}

interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox' | 'url';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  colSpan?: number;
}

export default function FormPage({
  title, subtitle, icon, backPath, backLabel = 'Back',
  fields, initialData = {}, loadRefData, submitEndpoint,
  successRedirect, submitLabel = 'Save', isLoading: externalLoading,
}: FormPageProps) {
  const [form, setForm] = useState<Record<string, any>>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (loadRefData) loadRefData();
  }, []);

  const isEdit = !!initialData && Object.keys(initialData).length > 0;

  const update = (name: string, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = isEdit ? 'put' : 'post';
      const url = isEdit ? submitEndpoint.replace('{id}', String(initialData.id)) : submitEndpoint;
      await api[method](url, form);
      window.location.href = successRedirect;
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageBanner
        icon={icon}
        title={title}
        subtitle={subtitle}
        backLabel={backLabel}
        backPath={backPath}
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.name} className={f.colSpan === 2 ? 'col-span-2' : ''}>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  name={f.name}
                  value={form[f.name] ?? ''}
                  onChange={e => update(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  required={f.required}
                  readOnly={f.readOnly}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-300"
                />
              ) : f.type === 'select' ? (
                <select
                  name={f.name}
                  value={form[f.name] ?? ''}
                  onChange={e => update(f.name, e.target.value === '' ? '' : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)))}
                  required={f.required}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[38px] text-[13px] text-gray-700 outline-none focus:border-blue-300"
                >
                  <option value="">Select...</option>
                  {f.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={form[f.name] ?? false}
                    onChange={e => update(f.name, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#1a3480] focus:ring-[#1a3480]"
                  />
                  <span className="text-[13px] text-gray-500">Yes</span>
                </label>
              ) : (
                <input
                  type={f.type || 'text'}
                  name={f.name}
                  value={form[f.name] ?? ''}
                  onChange={e => update(f.name, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  readOnly={f.readOnly}
                  className="w-full border border-gray-200 rounded-lg px-3 h-[38px] text-[13px] text-gray-800 outline-none focus:border-blue-300"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-50">
          <a href={backPath} className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">Cancel</a>
          <button
            type="submit"
            disabled={saving || (loadRefData !== undefined && loading)}
            className="px-5 py-2 rounded-lg text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: '#1a3480' }}
          >
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export type { FormField };
