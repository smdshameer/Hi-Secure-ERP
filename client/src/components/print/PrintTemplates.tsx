import React from 'react';
import QRCode from 'qrcode';

export interface PrintTemplateProps {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    state: string;
    website?: string;
    bank_name?: string;
    bank_account?: string;
    ifsc_code?: string;
    branch?: string;
    logo_url?: string;
  };
  invoice: {
    number: string;
    date: string;
    due_date?: string;
    place_of_supply?: string;
    reverse_charge?: string;
    is_interstate: boolean;
    copy_type?: string;
    grand_total: number;
    subtotal: number;
    tax_amount: number;
    notes?: string;
    title?: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    state?: string;
    contactPerson?: string;
  };
  items: Array<{
    sr: number;
    description: string;
    model?: string;
    warranty?: string;
    hsn_sac?: string;
    qty: number;
    unit?: string;
    rate: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    total: number;
  }>;
  summary: {
    taxable_total: number;
    cgst_total: number;
    sgst_total: number;
    igst_total: number;
    round_off: number;
    grand_total: number;
    amount_in_words: string;
  };
  upiPaymentId?: string;
  logoSize?: 'small' | 'medium' | 'large' | 'hidden';
}

const FontStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
    
    .font-sans-premium {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .font-serif-premium {
      font-family: 'Lora', Georgia, Cambria, serif !important;
    }
    .font-mono-premium {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
    }
  ` }} />
);

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper to generate HSN/GST summary table
const getHsnSummary = (items: PrintTemplateProps['items']) => {
  const summaryMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; rate: number }> = {};
  items.forEach(item => {
    const hsn = item.hsn_sac || '—';
    const qty = item.qty || 0;
    const rate = item.rate || 0;
    const taxable = qty * rate;
    const cgst = item.cgst_amount || 0;
    const sgst = item.sgst_amount || 0;
    const igst = item.igst_amount || 0;
    const itemRate = (item.cgst_rate || 0) + (item.sgst_rate || 0) + (item.igst_rate || 0);
    
    if (!summaryMap[hsn]) {
      summaryMap[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: itemRate };
    }
    summaryMap[hsn].taxable += taxable;
    summaryMap[hsn].cgst += cgst;
    summaryMap[hsn].sgst += sgst;
    summaryMap[hsn].igst += igst;
  });
  return Object.entries(summaryMap).map(([hsn, data]) => ({
    hsn,
    ...data,
  }));
};

// ─────────────────────────────────────────────────────────────────
// THEME 1: Hi Secure Default (Standard A4 Corporate Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeDefault({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Top Content Area */}
      <div className="flex-grow flex flex-col">
        {/* Header Info */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-4 border-b border-slate-100 pb-2">
          <div className="font-semibold uppercase tracking-wider">{invoice.title || 'TAX INVOICE'}</div>
          <div className="italic">{invoice.copy_type || 'Original Copy'}</div>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
              <img src={company.logo_url} alt={company.name} className={`object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[35px]' : (logoSize || 'medium') === 'large' ? 'max-h-[70px]' : 'max-h-[50px]'}`} />
            ) : (
              <div className="text-[20px] font-bold text-slate-900 tracking-tight">{company.name}</div>
            )}
          </div>
          <div className="text-right text-[11px] text-slate-600 px-1">
            <div className="text-[14px] font-bold text-slate-900 leading-tight">{company.name}</div>
            <div className="mt-1">{company.address}</div>
            <div>Phone: {company.phone} · Email: {company.email}</div>
            {company.website && <div>Web: {company.website}</div>}
            {company.gstin && <div className="font-semibold text-slate-900 mt-1">GSTIN: {company.gstin}</div>}
          </div>
        </div>

        {/* Billing & Meta Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Billed To</div>
            <div className="text-[13px] font-bold text-slate-905">{customer.name}</div>
            <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
            <div className="text-[11px] text-slate-505 mt-2">
              {customer.phone && `Phone: ${customer.phone}`}
              {customer.state && ` · PoS: ${customer.state}`}
            </div>
            {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
          </div>

          <div className="flex flex-col justify-between pl-6 text-right pr-1">
            <div className="space-y-1.5 text-[11px]">
              <div><span className="text-slate-400">Invoice No:</span> <span className="font-bold text-slate-955">{invoice.number}</span></div>
              <div><span className="text-slate-400">Date:</span> <span className="font-medium text-slate-955">{invoice.date}</span></div>
              {invoice.due_date && <div><span className="text-slate-400">Due Date:</span> <span className="font-medium text-slate-955">{invoice.due_date}</span></div>}
              {invoice.place_of_supply && <div><span className="text-slate-400">Place of Supply:</span> <span className="text-slate-955">{invoice.place_of_supply}</span></div>}
            </div>
            {invoice.reverse_charge && (
              <div className="text-[10px] text-slate-500">Reverse Charge: {invoice.reverse_charge}</div>
            )}
          </div>
        </div>

        {/* Table - with increased padding for row height */}
        <table className="w-full text-[11px] border-collapse mb-6 flex-grow">
          <thead>
            <tr className="bg-slate-100/75 border-y border-slate-200 text-slate-700">
              <th className="py-3 px-3 text-center font-semibold w-[6%]">S.No.</th>
              <th className="py-3 px-3 text-left font-semibold w-[44%]">Particulars</th>
              <th className="py-3 px-3 text-center font-semibold w-[12%]">HSN/SAC</th>
              <th className="py-3 px-3 text-center font-semibold w-[8%]">Qty</th>
              <th className="py-3 px-3 text-right font-semibold w-[12%]">Rate</th>
              <th className="py-3 px-3 text-center font-semibold w-[8%]">GST</th>
              <th className="py-3 px-3 text-right font-semibold w-[12%]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3.5 px-3 text-center text-slate-500">{item.sr || (idx + 1)}</td>
                <td className="py-3.5 px-3 text-left font-semibold text-slate-900">
                  {item.description}
                  {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-slate-500 block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                <td className="py-3.5 px-3 text-center font-medium">{item.qty} {item.unit || 'NOS'}</td>
                <td className="py-3.5 px-3 text-right font-mono-premium text-slate-805">₹{fmt(item.rate)}</td>
                <td className="py-3.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="py-3.5 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Dynamic GST HSN Breakup Table */}
        {hsnSummaryList.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">GST Tax Breakup Summary</div>
            <table className="w-full text-[10px] border border-slate-200 border-collapse text-center">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="p-2 border-r border-slate-200">HSN/SAC</th>
                  <th className="p-2 border-r border-slate-200 text-right">Taxable Amount</th>
                  {!invoice.is_interstate ? (
                    <>
                      <th className="p-2 border-r border-slate-200">CGST Rate</th>
                      <th className="p-2 border-r border-slate-200 text-right">CGST Amt</th>
                      <th className="p-2 border-r border-slate-200">SGST Rate</th>
                      <th className="p-2 border-r border-slate-200 text-right">SGST Amt</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 border-r border-slate-200">IGST Rate</th>
                      <th className="p-2 border-r border-slate-200 text-right">IGST Amt</th>
                    </>
                  )}
                  <th className="p-2 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {hsnSummaryList.map((row, idx) => {
                  const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                  return (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-200 font-medium">{row.hsn}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                      {!invoice.is_interstate ? (
                        <>
                          <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                          <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 border-r border-slate-200">{row.rate}%</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                        </>
                      )}
                      <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Area - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Amount in Words</div>
              <div className="text-[11px] font-semibold text-slate-808 italic">{summary.amount_in_words}</div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-[10px] text-slate-500 space-y-1">
              <div className="font-bold text-slate-707 text-[11px] mb-1">Terms & Conditions:</div>
              <div>• Guarantee/Warranty claims as per manufacturer terms.</div>
              <div>• Interest @18% p.m. will be charged for delayed payments.</div>
              <div>• All disputes subject to local jurisdiction only.</div>
            </div>

            {company.bank_name && (
              <div className="grid grid-cols-2 gap-2 text-[10px] p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                <div><span className="font-medium text-slate-400">Bank:</span> {company.bank_name}</div>
                <div><span className="font-medium text-slate-400">A/c No:</span> {company.bank_account}</div>
                <div><span className="font-medium text-slate-400">IFSC:</span> {company.ifsc_code}</div>
                <div><span className="font-medium text-slate-400">Branch:</span> {company.branch || '—'}</div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-500 text-left">Sub Total</td>
                  <td className="py-1.5 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left">CGST</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left">SGST</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-500 text-left">IGST</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-400 text-left">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[13px] text-slate-900 border-t-2 border-slate-200">
                  <td className="py-2.5 text-left">Grand Total</td>
                  <td className="py-2.5 font-mono-premium text-slate-955">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-slate-100 rounded-md bg-white shadow-sm">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[64px] h-[64px]" />
                  <div className="text-[7px] text-slate-400 mt-1 font-bold tracking-wider uppercase">Scan to Pay</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-400">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-105 pt-2">
          <div>See backside for terms & conditions</div>
          <div>Powered by Hitech BillSoft</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 2: HiSecure Premium (Dark Slate Elegant Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeHiSecure({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Banner & Content area */}
      <div className="flex-grow flex flex-col justify-between">
        <div className="w-full">
          {/* Top Banner Header */}
          <div className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-start">
              <div>
                {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                  <img src={company.logo_url} alt={company.name} className="max-h-[50px] object-contain filter brightness-0 invert" />
                ) : (
                  <div className="text-[22px] font-bold tracking-tight">{company.name}</div>
                )}
                <div className="text-[11px] text-slate-400 mt-2 max-w-[320px]">{company.address}</div>
              </div>
              <div className="text-right px-1">
                <div className="text-[20px] font-bold tracking-wider uppercase text-slate-200">{invoice.title || 'INVOICE'}</div>
                <div className="text-[12px] font-mono-premium text-slate-400 mt-1">No: {invoice.number}</div>
                <div className="text-[11px] text-slate-400">Date: {invoice.date}</div>
              </div>
            </div>
          </div>

          <div className="p-8 pb-0">
            {/* Billing details grid */}
            <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-slate-100">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">CLIENT DETAILS</div>
                <div className="text-[14px] font-bold text-slate-900">{customer.name}</div>
                <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                {customer.phone && <div className="text-[11px] text-slate-500 mt-1">Phone: {customer.phone}</div>}
                {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
              </div>
              <div className="space-y-1.5 text-right text-[11px] text-slate-600 px-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 text-right">BUSINESS IDENTITY</div>
                {company.gstin && <div><span className="text-slate-400">GSTIN:</span> <span className="font-semibold text-slate-900">{company.gstin}</span></div>}
                <div><span className="text-slate-400">Email:</span> {company.email}</div>
                {company.website && <div><span className="text-slate-400">Web:</span> {company.website}</div>}
                {invoice.place_of_supply && <div><span className="text-slate-400">Place of Supply:</span> {invoice.place_of_supply}</div>}
              </div>
            </div>

            {/* Table layout - Expanded heights */}
            <table className="w-full text-[11px] border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-800">
                  <th className="py-3.5 px-3 text-center font-bold w-[6%]">S.No.</th>
                  <th className="py-3.5 px-3 text-left font-bold w-[44%]">Items & Particulars</th>
                  <th className="py-3.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                  <th className="py-3.5 px-3 text-center font-bold w-[8%]">Qty</th>
                  <th className="py-3.5 px-3 text-right font-bold w-[12%]">Unit Rate</th>
                  <th className="py-3.5 px-3 text-center font-bold w-[8%]">GST</th>
                  <th className="py-3.5 px-3 text-right font-bold w-[12%]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                    <td className="py-4 px-3 text-left font-semibold text-slate-900">
                      {item.description}
                      {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                      {item.warranty && <span className="font-normal text-slate-500 block text-[9px]">Warranty: {item.warranty}</span>}
                    </td>
                    <td className="py-4 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                    <td className="py-4 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                    <td className="py-4 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                    <td className="py-4 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                    <td className="py-4 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* GST Breakup Table */}
            {hsnSummaryList.length > 0 && (
              <div className="mb-6">
                <div className="text-[10px] uppercase font-bold text-slate-450 tracking-wider mb-2">GST Tax Breakup Summary</div>
                <table className="w-full text-[10px] border border-slate-200 border-collapse text-center">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="p-2 border-r border-slate-200">HSN/SAC</th>
                      <th className="p-2 border-r border-slate-200 text-right">Taxable Amount</th>
                      {!invoice.is_interstate ? (
                        <>
                          <th className="p-2 border-r border-slate-200">CGST Rate</th>
                          <th className="p-2 border-r border-slate-200 text-right">CGST Amt</th>
                          <th className="p-2 border-r border-slate-200">SGST Rate</th>
                          <th className="p-2 border-r border-slate-200 text-right">SGST Amt</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 border-r border-slate-200">IGST Rate</th>
                          <th className="p-2 border-r border-slate-200 text-right">IGST Amt</th>
                        </>
                      )}
                      <th className="p-2 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {hsnSummaryList.map((row, idx) => {
                      const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                      return (
                        <tr key={idx}>
                          <td className="p-2 border-r border-slate-200 font-medium">{row.hsn}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                          {!invoice.is_interstate ? (
                            <>
                              <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                              <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                              <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                              <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 border-r border-slate-200">{row.rate}%</td>
                              <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                            </>
                          )}
                          <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Area - Pushed to bottom of page */}
      <div className="mt-auto p-8 pt-4 border-t border-slate-100 flex flex-col justify-end bg-white">
        <div className="grid grid-cols-12 gap-8 mb-4">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-805 italic">{summary.amount_in_words}</div>
            </div>

            {company.bank_name && (
              <div className="p-4 border border-slate-100 rounded-lg bg-slate-50 space-y-1 text-[10px]">
                <div className="font-bold text-slate-707 text-[11px] mb-1.5">BANK ACCOUNT LEDGER</div>
                <div className="grid grid-cols-2 gap-1.5 text-slate-600">
                  <div>Bank Name: {company.bank_name}</div>
                  <div>Account No: {company.bank_account}</div>
                  <div>IFSC Code: {company.ifsc_code}</div>
                  <div>Branch Location: {company.branch || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
              <table className="w-full text-[11px] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="text-slate-500 py-1 text-left font-medium">Taxable Subtotal</td>
                    <td className="font-mono-premium font-semibold py-1">₹{fmt(summary.taxable_total)}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr>
                        <td className="text-slate-500 py-1 text-left">CGST Total</td>
                        <td className="font-mono-premium text-slate-700 py-1">₹{fmt(summary.cgst_total)}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-500 py-1 text-left">SGST Total</td>
                        <td className="font-mono-premium text-slate-700 py-1">₹{fmt(summary.sgst_total)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="text-slate-500 py-1 text-left">IGST Total</td>
                      <td className="font-mono-premium text-slate-700 py-1">₹{fmt(summary.igst_total)}</td>
                    </tr>
                  )}
                  {Math.abs(summary.round_off) > 0.001 && (
                    <tr>
                      <td className="text-slate-455 py-1 text-left">Round Off</td>
                      <td className="font-mono-premium text-slate-500 py-1">₹{fmt(summary.round_off)}</td>
                    </tr>
                  )}
                  <tr className="font-bold text-[14px] text-slate-900 border-t border-slate-200 pt-2">
                    <td className="py-2 text-slate-955 font-bold text-left">Grand Total</td>
                    <td className="py-2 font-mono-premium text-slate-955 text-[15px]">₹{fmt(summary.grand_total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[60px] h-[60px]" />
                  <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-705 border-t border-slate-200 pt-1">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 3: Classic (Editorial Serif Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeClassic({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-12 print:p-0 mx-auto font-serif-premium text-[12px] leading-relaxed text-slate-900 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Top content area */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Editorial Centered Header */}
          <div className="text-center mb-8 border-b-4 border-double border-slate-800 pb-6">
            <div className="text-[24px] font-bold uppercase tracking-wider text-slate-955 font-serif-premium">{company.name}</div>
            <div className="text-[11px] italic text-slate-500 mt-1 max-w-[500px] mx-auto leading-relaxed">{company.address}</div>
            <div className="text-[11px] text-slate-500">Contact: {company.phone} · Email: {company.email}</div>
            {company.gstin && <div className="text-[11px] font-bold mt-1 text-slate-805">GSTIN: {company.gstin}</div>}
          </div>

          {/* Invoice Title */}
          <div className="text-center mb-6">
            <span className="text-[16px] font-bold uppercase tracking-widest border-b border-slate-900 pb-1">{invoice.title || 'TAX INVOICE'}</span>
          </div>

          {/* Billing / Info Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-[12px]">
            <div>
              <div className="font-bold border-b border-slate-900 uppercase text-[10px] tracking-wider mb-2 text-slate-600">INVOICE TO</div>
              <div className="font-bold text-slate-955 text-[13px]">{customer.name}</div>
              <div className="mt-1 whitespace-pre-line leading-relaxed text-slate-700">{customer.address || '—'}</div>
              {customer.phone && <div className="mt-1.5 text-slate-550">Phone: {customer.phone}</div>}
              {customer.gstin && <div className="font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="pl-6 space-y-1.5 pr-1">
              <div className="font-bold border-b border-slate-900 uppercase text-[10px] tracking-wider mb-2 text-slate-600">DOCUMENT METADATA</div>
              <div><span className="text-slate-400">Invoice Number:</span> <span className="font-bold">{invoice.number}</span></div>
              <div><span className="text-slate-400">Issue Date:</span> {invoice.date}</div>
              {invoice.due_date && <div><span className="text-slate-400">Due Date:</span> {invoice.due_date}</div>}
              {invoice.place_of_supply && <div><span className="text-slate-400">Place of Supply:</span> {invoice.place_of_supply}</div>}
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[11px] border-collapse mb-6 border-y-2 border-slate-800">
            <thead>
              <tr className="border-b border-slate-800 text-slate-955 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 text-center font-bold w-[6%]">Sr.</th>
                <th className="py-2.5 px-3 text-left font-bold w-[44%]">Description of Services</th>
                <th className="py-2.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                <th className="py-2.5 px-3 text-center font-bold w-[8%]">Qty</th>
                <th className="py-2.5 px-3 text-right font-bold w-[12%]">Rate</th>
                <th className="py-2.5 px-3 text-center font-bold w-[8%]">GST</th>
                <th className="py-2.5 px-3 text-right font-bold w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-3 text-center">{item.sr || (idx + 1)}</td>
                  <td className="py-3.5 px-3 text-left font-bold text-slate-955">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-500 block text-[9px] italic mt-0.5">Model: {item.model}</span>}
                    {item.warranty && <span className="font-normal text-slate-500 block text-[9px] italic">Warranty: {item.warranty}</span>}
                  </td>
                  <td className="py-3.5 px-3 text-center">{item.hsn_sac || '—'}</td>
                  <td className="py-3.5 px-3 text-center">{item.qty}</td>
                  <td className="py-3.5 px-3 text-right font-mono-premium text-slate-707">₹{fmt(item.rate)}</td>
                  <td className="py-3.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="py-3.5 px-3 text-right font-bold font-mono-premium text-slate-950">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Classic GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6 text-[10px]">
              <div className="font-bold border-b border-slate-900 uppercase text-[10px] tracking-wider mb-2 text-slate-600">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-slate-800 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-850 text-slate-955 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-2 border-r border-slate-800">HSN/SAC</th>
                    <th className="p-2 border-r border-slate-800 text-right">Taxable Value</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-2 border-r border-slate-800">CGST Rate</th>
                        <th className="p-2 border-r border-slate-800 text-right">CGST Amt</th>
                        <th className="p-2 border-r border-slate-800">SGST Rate</th>
                        <th className="p-2 border-r border-slate-800 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-slate-800">IGST Rate</th>
                        <th className="p-2 border-r border-slate-800 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-800 font-semibold">{row.hsn}</td>
                        <td className="p-2 border-r border-slate-800 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-2 border-r border-slate-800">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-800 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                            <td className="p-2 border-r border-slate-800">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-800 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-slate-800">{row.rate}%</td>
                            <td className="p-2 border-r border-slate-800 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer and Totals - Pushed to bottom of A4 */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-6">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-455 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[12px] font-bold text-slate-900 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="p-3 border-t border-slate-200 text-[10px] text-slate-650 leading-relaxed bg-slate-50/50">
                <div className="font-bold text-slate-808 text-[10px] uppercase tracking-wider mb-1">REMITTANCE LEDGER</div>
                <div>Bank: {company.bank_name} · Account: {company.bank_account}</div>
                <div>IFSC Code: {company.ifsc_code} · Branch: {company.branch || '—'}</div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1 text-slate-500 text-left">Taxable Net</td>
                  <td className="py-1 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1 text-slate-500 text-left font-medium">Add CGST</td>
                      <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 text-left font-medium">Add SGST</td>
                      <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1 text-slate-500 text-left font-medium">Add IGST</td>
                    <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[13px] text-slate-900 border-t-2 border-double border-slate-900">
                  <td className="py-2.5 text-left">NET PAYABLE</td>
                  <td className="py-2.5 font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-200 rounded bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">UPI Pay</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-555">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 4: Modern Blue (Corporate Navy Accent)
// ─────────────────────────────────────────────────────────────────
export function ThemeModernBlue({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Top Header Grid */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-12 bg-blue-600 rounded-full" />
              <div>
                {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                  <img src={company.logo_url} alt={company.name} className="max-h-[45px] object-contain" />
                ) : (
                  <div className="text-[20px] font-bold text-slate-900 tracking-tight">{company.name}</div>
                )}
                <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Hi-Tech Business Solutions</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-505 leading-relaxed pr-1">
              <div className="text-[15px] font-bold text-slate-900">{company.name}</div>
              <div>{company.address}</div>
              <div>Contact: {company.phone} · Email: {company.email}</div>
              {company.gstin && <div className="font-bold text-blue-600 mt-1">GSTIN: {company.gstin}</div>}
            </div>
          </div>

          {/* Invoice Title */}
          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-6">
            <div>
              <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Document Type</div>
              <div className="text-[18px] font-bold text-slate-900">{invoice.title || 'TAX INVOICE'}</div>
            </div>
            <div className="text-right pr-1">
              <div className="text-[11px] text-slate-450 text-right">Invoice Number</div>
              <div className="text-[15px] font-bold text-slate-900 font-mono-premium">{invoice.number}</div>
            </div>
          </div>

          {/* Billing details cards */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
              <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-2">BILL TO CLIENT</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              {customer.phone && <div className="text-[11px] text-slate-500 mt-2">Contact: {customer.phone}</div>}
              {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">METADATA SUMMARY</div>
              <table className="w-full text-[11px] pr-1">
                <tbody>
                  <tr>
                    <td className="text-slate-500 py-0.5 text-left font-medium">Date of Issue</td>
                    <td className="text-right font-medium text-slate-955">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="text-slate-500 py-0.5 text-left font-medium">Due Date</td>
                      <td className="text-right font-medium text-slate-955">{invoice.due_date}</td>
                    </tr>
                  )}
                  {invoice.place_of_supply && (
                    <tr>
                      <td className="text-slate-555 py-0.5 text-left font-medium">Place of Supply</td>
                      <td className="text-right text-slate-955">{invoice.place_of_supply}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table - padding increased */}
          <table className="w-full text-[11px] border-collapse mb-6">
            <thead>
              <tr className="bg-blue-600 text-white rounded-lg overflow-hidden">
                <th className="p-2.5 px-3 text-center font-bold w-[6%] rounded-l-md">S.No.</th>
                <th className="p-2.5 px-3 text-left font-bold w-[44%]">Items & Description</th>
                <th className="p-2.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">Qty</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Rate</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">GST</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%] rounded-r-md">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-blue-50/10">
                  <td className="py-3.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="py-3.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                    {item.warranty && <span className="font-normal text-blue-600 block text-[9px]">Warranty: {item.warranty}</span>}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-655">{item.hsn_sac || '—'}</td>
                  <td className="py-3.5 px-3 text-center font-medium">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="py-3.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="py-3.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="py-3.5 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Modern Blue GST Summary Breakup */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-2">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-slate-200 border-collapse text-center">
                <thead>
                  <tr className="bg-blue-50/50 border-b-2 border-blue-600 text-slate-800 font-semibold">
                    <th className="p-2 border-r border-slate-200">HSN/SAC</th>
                    <th className="p-2 border-r border-slate-200 text-right">Taxable Amount</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-2 border-r border-slate-200">CGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">CGST Amt</th>
                        <th className="p-2 border-r border-slate-200">SGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-slate-200">IGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 font-medium">{row.hsn}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                            <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-slate-200">{row.rate}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-4">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-805 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl space-y-1 text-[10px] text-slate-600">
                <div className="font-bold text-blue-700 text-[10px] uppercase tracking-wider mb-1">BANK TRANSFER LEDGER</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>Bank Name: {company.bank_name}</div>
                  <div>Account No: {company.bank_account}</div>
                  <div>IFSC Code: {company.ifsc_code}</div>
                  <div>Branch: {company.branch || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-500 text-left">Taxable Net</td>
                  <td className="py-1.5 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-500 text-left">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-blue-700 border-t border-slate-200">
                  <td className="py-2.5 text-left">NET AMOUNT DUE</td>
                  <td className="py-2.5 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-455">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-707 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 5: Minimalist (Clean & Airy Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeMinimal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-10 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Minimal Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className="max-h-[40px] object-contain" />
              ) : (
                <div className="text-[20px] font-bold text-slate-900 tracking-tight">{company.name}</div>
              )}
              <div className="text-[10px] text-slate-400 mt-2 max-w-[280px] leading-relaxed">{company.address}</div>
            </div>
            <div className="text-right pr-1">
              <div className="text-[20px] font-light text-slate-900 tracking-widest uppercase">{invoice.title || 'INVOICE'}</div>
              <div className="text-[12px] font-semibold text-slate-800 mt-1"># {invoice.number}</div>
              <div className="text-[11px] text-slate-400 mt-1">Date: {invoice.date}</div>
            </div>
          </div>

          {/* Bill details */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-slate-100">
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">BILLED TO</div>
              <div className="text-[13px] font-bold text-slate-955">{customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{customer.address || '—'}</div>
              {customer.phone && <div className="text-[11px] text-slate-505 mt-2">Phone: {customer.phone}</div>}
              {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="space-y-1 text-right text-[11px] text-slate-500 pr-1">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5 text-right">CONTACT & REGISTRY</div>
              {company.gstin && <div>GSTIN: {company.gstin}</div>}
              <div>Email: {company.email}</div>
              {company.website && <div>Web: {company.website}</div>}
              {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
            </div>
          </div>

          {/* Minimal Table - padding increased */}
          <table className="w-full text-[11px] border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-955 uppercase tracking-widest text-[9px] font-bold">
                <th className="py-2.5 px-3 text-center w-[6%]">S.No.</th>
                <th className="py-2.5 px-3 text-left w-[44%]">Description</th>
                <th className="py-2.5 px-3 text-center w-[12%]">HSN</th>
                <th className="py-2.5 px-3 text-center w-[8%]">Qty</th>
                <th className="py-2.5 px-3 text-right w-[12%]">Price</th>
                <th className="py-2.5 px-3 text-center w-[8%]">GST</th>
                <th className="py-2.5 px-3 text-right w-[12%]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-4 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="py-4 px-3 text-left font-medium text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="py-4 px-3 text-center text-slate-500">{item.hsn_sac || '—'}</td>
                  <td className="py-4 px-3 text-center">{item.qty}</td>
                  <td className="py-4 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="py-4 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="py-4 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculations & Totals - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-6">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">IN WORDS</div>
              <div className="text-[11px] font-semibold text-slate-808 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="text-[10px] text-slate-550 space-y-0.5 border-t border-slate-100 pt-3">
                <div className="font-bold text-slate-707 text-[10px] uppercase tracking-wider mb-1">BANK REMITTANCE</div>
                <div>Bank Name: {company.bank_name} · A/c No: {company.bank_account}</div>
                <div>IFSC Code: {company.ifsc_code} · Branch: {company.branch || '—'}</div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-500 text-left font-medium">Taxable Net</td>
                  <td className="py-1 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1 text-slate-500 text-left font-medium">CGST Total</td>
                      <td className="py-1 font-mono-premium text-slate-705">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-505 text-left font-medium">SGST Total</td>
                      <td className="py-1 font-mono-premium text-slate-705">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1 text-slate-505 text-left font-medium">IGST Total</td>
                    <td className="py-1 font-mono-premium text-slate-705">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1 font-mono-premium text-slate-555">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-slate-955 border-t-2 border-slate-900">
                  <td className="py-2 text-left">Grand Total</td>
                  <td className="py-2 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">UPI Pay</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-707 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 6: Saffron (Indian Tricolor Accent Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeSaffron({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Tricolor Accent Line */}
          <div className="h-1.5 flex mb-4 rounded-full overflow-hidden">
            <div className="w-[33%] bg-orange-500" />
            <div className="w-[34%] bg-slate-100" />
            <div className="w-[33%] bg-green-600" />
          </div>

          {/* Header Info */}
          <div className="flex justify-between items-start mb-6">
            <div>
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className="max-h-[50px] object-contain" />
              ) : (
                <div className="text-[20px] font-bold text-orange-600 tracking-tight">{company.name}</div>
              )}
              <div className="text-[11px] text-slate-500 mt-2 max-w-[320px]">{company.address}</div>
            </div>
            <div className="text-right text-[11px] text-slate-600 leading-relaxed pr-1">
              <div className="text-[18px] font-bold text-orange-600 uppercase">{invoice.title || 'TAX INVOICE'}</div>
              <div>Invoice No: <span className="font-bold text-slate-900">{invoice.number}</span></div>
              <div>Date: {invoice.date}</div>
              {company.gstin && <div className="font-bold text-green-700 mt-1">GSTIN: {company.gstin}</div>}
            </div>
          </div>

          {/* Billing section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border-l-4 border-orange-500 bg-orange-50/30 rounded-r-lg">
              <div className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">BILL TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              {customer.phone && <div className="text-[11px] text-slate-500 mt-1">Phone: {customer.phone}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-805">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border-l-4 border-green-600 bg-green-50/20 rounded-r-lg flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-green-700 tracking-wider mb-1">PAYMENT DETAILS:</div>
              <div className="text-[11px] text-slate-655 font-medium">
                {invoice.due_date && <div>Due Date: <span className="font-semibold">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
              </div>
            </div>
          </div>

          {/* Table - expanded heights */}
          <table className="w-full text-[11px] border-collapse mb-6">
            <thead>
              <tr className="bg-orange-500 text-white rounded-lg">
                <th className="p-2.5 px-3 text-center font-bold w-[6%]">S.No.</th>
                <th className="p-2.5 px-3 text-left font-bold w-[44%]">Items Description</th>
                <th className="p-2.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">Qty</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Unit Rate</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">GST</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50/50">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-655">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-707">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Saffron GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-2">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-orange-200 border-collapse text-center">
                <thead>
                  <tr className="bg-orange-50 border-b border-orange-300 text-slate-800 font-semibold">
                    <th className="p-2 border-r border-orange-200">HSN/SAC</th>
                    <th className="p-2 border-r border-orange-200 text-right">Taxable Amount</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-2 border-r border-orange-200">CGST Rate</th>
                        <th className="p-2 border-r border-orange-200 text-right">CGST Amt</th>
                        <th className="p-2 border-r border-orange-200">SGST Rate</th>
                        <th className="p-2 border-r border-orange-200 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-orange-200">IGST Rate</th>
                        <th className="p-2 border-r border-orange-200 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-orange-200 font-medium">{row.hsn}</td>
                        <td className="p-2 border-r border-orange-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-2 border-r border-orange-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-orange-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                            <td className="p-2 border-r border-orange-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-orange-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-orange-200">{row.rate}%</td>
                            <td className="p-2 border-r border-orange-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calculations & Totals - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-4">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="p-3 border-l-2 border-green-600 bg-green-50/10 rounded-r-lg space-y-1 text-[10px] text-slate-655">
                <div className="font-bold text-green-700 text-[10px] uppercase tracking-wider mb-1">REMITTANCE LEDGER</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>Bank Name: {company.bank_name}</div>
                  <div>Account No: {company.bank_account}</div>
                  <div>IFSC Code: {company.ifsc_code}</div>
                  <div>Branch: {company.branch || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-500 text-left font-medium">Taxable Net</td>
                  <td className="py-1.5 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-550 text-left font-medium">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-orange-600 border-t border-slate-200">
                  <td className="py-2.5 text-left">GRAND TOTAL DUE</td>
                  <td className="py-2.5 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-705 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 7: Tally (Dense Monospace Prime Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeTally({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-6 mx-auto font-mono-premium text-[11px] leading-relaxed text-black border-2 border-black print:border-2 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Tally Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Tally Top Title Header */}
          <div className="text-center font-bold text-[14px] border-b-2 border-black pb-2 uppercase tracking-wider">
            {invoice.title || 'TAX INVOICE'}
          </div>

          {/* Main Grid Split */}
          <div className="grid grid-cols-12 border-b border-black">
            {/* Left Hand: Company & Consignee */}
            <div className="col-span-6 border-r border-black p-2 space-y-2">
              <div>
                <div className="text-[12px] font-bold uppercase">{company.name}</div>
                <div className="text-[10px] mt-0.5 leading-normal">{company.address}</div>
                {company.gstin && <div className="font-bold mt-1">GSTIN/UIN: {company.gstin}</div>}
                <div>State Name: {company.state}</div>
              </div>
              
              <div className="border-t border-black pt-2">
                <div className="font-bold text-[9px] uppercase tracking-wide text-gray-500">Buyer / Consignee (Bill To)</div>
                <div className="text-[11px] font-bold uppercase">{customer.name}</div>
                <div className="text-[10px] leading-normal whitespace-pre-line">{customer.address || '—'}</div>
                {customer.phone && <div>Contact No: {customer.phone}</div>}
                {customer.gstin && <div className="font-bold">GSTIN/UIN: {customer.gstin}</div>}
                {customer.state && <div>State Name: {customer.state}</div>}
              </div>
            </div>

            {/* Right Hand: Invoice Metadata Details */}
            <div className="col-span-6 p-0 grid grid-cols-2 divide-x divide-y divide-black">
              <div className="p-2">
                <div className="text-[8px] text-gray-500 uppercase">Invoice No.</div>
                <div className="font-bold">{invoice.number}</div>
              </div>
              <div className="p-2">
                <div className="text-[8px] text-gray-500 uppercase">Dated</div>
                <div className="font-bold">{invoice.date}</div>
              </div>
              <div className="p-2">
                <div className="text-[8px] text-gray-500 uppercase">Due Date</div>
                <div className="font-bold">{invoice.due_date || '—'}</div>
              </div>
              <div className="p-2">
                <div className="text-[8px] text-gray-555 uppercase">Place of Supply</div>
                <div className="font-bold">{invoice.place_of_supply || '—'}</div>
              </div>
              <div className="p-2 col-span-2">
                <div className="text-[8px] text-gray-500 uppercase">Remittance bank</div>
                <div className="font-bold">{company.bank_name || '—'}</div>
                <div>A/c No: {company.bank_account || '—'}</div>
                <div>IFSC: {company.ifsc_code || '—'}</div>
              </div>
            </div>
          </div>

          {/* Dense Particulars Grid Table */}
          <table className="w-full text-[10px] border-b border-black border-collapse">
            <thead>
              <tr className="border-b border-black text-center font-bold">
                <th className="py-2 px-3 border-r border-black w-[5%]">Sl No.</th>
                <th className="py-2 px-3 border-r border-black text-left w-[45%]">Description of Goods</th>
                <th className="py-2 px-3 border-r border-black w-[12%]">HSN/SAC</th>
                <th className="py-2 px-3 border-r border-black w-[8%]">Quantity</th>
                <th className="py-2 px-3 border-r border-black text-right w-[10%]">Rate</th>
                <th className="py-2 px-3 border-r border-black w-[8%]">GST Rate</th>
                <th className="py-2 px-3 text-right w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30">
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-3 px-3 border-r border-black text-center">{item.sr || (idx + 1)}</td>
                  <td className="py-3 px-3 border-r border-black text-left font-bold">
                    {item.description}
                    {item.model && <span className="font-normal block text-[8px] mt-0.5">Model: {item.model}</span>}
                    {item.warranty && <span className="font-normal block text-[8px]">Warranty: {item.warranty}</span>}
                  </td>
                  <td className="py-3 px-3 border-r border-black text-center">{item.hsn_sac || '—'}</td>
                  <td className="py-3 px-3 border-r border-black text-center font-bold">{item.qty} NOS</td>
                  <td className="py-3 px-3 border-r border-black text-right">₹{fmt(item.rate)}</td>
                  <td className="py-3 px-3 border-r border-black text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="py-3 px-3 text-right font-bold">₹{fmt(item.total)}</td>
                </tr>
              ))}
              {/* Filler rows */}
              {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                <tr key={i} className="h-10">
                  <td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td />
                </tr>
              ))}
              {/* Subtotal Row */}
              <tr className="border-t border-black font-bold text-right bg-slate-50/50">
                <td className="py-2.5 px-3 border-r border-black text-center"></td>
                <td className="py-2.5 px-3 border-r border-black text-left">Total Ledger Net</td>
                <td className="py-2.5 px-3 border-r border-black text-center"></td>
                <td className="py-2.5 px-3 border-r border-black text-center font-bold">{totalQty} NOS</td>
                <td className="py-2.5 px-3 border-r border-black"></td>
                <td className="py-2.5 px-3 border-r border-black"></td>
                <td className="py-2.5 px-3">₹{fmt(summary.taxable_total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tally GST Summary Breakup Grid */}
          {hsnSummaryList.length > 0 && (
            <div className="border-b border-black">
              <div className="p-2 font-bold uppercase text-[9px]">GST Tax Summary Ledger Breakup</div>
              <table className="w-full text-[9px] border-t border-black border-collapse text-center">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="p-1.5 px-3 border-r border-black">HSN/SAC</th>
                    <th className="p-1.5 px-3 border-r border-black text-right">Taxable Value</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-1.5 px-3 border-r border-black">CGST Rate</th>
                        <th className="p-1.5 px-3 border-r border-black text-right">CGST Amt</th>
                        <th className="p-1.5 px-3 border-r border-black">SGST Rate</th>
                        <th className="p-1.5 px-3 border-r border-black text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-1.5 px-3 border-r border-black">IGST Rate</th>
                        <th className="p-1.5 px-3 border-r border-black text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-1.5 px-3 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-1.5 px-3 border-r border-black font-semibold">{row.hsn}</td>
                        <td className="p-1.5 px-3 border-r border-black text-right">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-1.5 px-3 border-r border-black">{(row.rate / 2)}%</td>
                            <td className="p-1.5 px-3 border-r border-black text-right">₹{fmt(row.cgst)}</td>
                            <td className="p-1.5 px-3 border-r border-black">{(row.rate / 2)}%</td>
                            <td className="p-1.5 px-3 border-r border-black text-right">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-1.5 px-3 border-r border-black">{row.rate}%</td>
                            <td className="p-1.5 px-3 border-r border-black text-right">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-1.5 px-3 text-right font-bold">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dense Tally Accounting Taxation Detail - Pushed to bottom of A4 */}
      <div className="mt-auto flex flex-col justify-end">
        <div className="grid grid-cols-12 border-t-2 border-black">
          <div className="col-span-8 border-r border-black p-2 space-y-2">
            <div>
              <div className="text-[8px] uppercase tracking-wider text-gray-500">Amount Chargeable (in words)</div>
              <div className="font-bold italic text-slate-800">{summary.amount_in_words}</div>
            </div>
            
            <div className="border-t border-black/40 pt-2 text-[8px] text-gray-600 leading-normal">
              <div className="font-bold text-[9px] text-black">Company's Tax Declaration:</div>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>

          {/* Dense Calculations Column */}
          <div className="col-span-4 p-0">
            <table className="w-full text-[10px] border-collapse leading-relaxed">
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="p-1.5 text-gray-700 text-left font-bold">Sub Total Net</td>
                  <td className="p-1.5 text-right font-bold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="p-1.5 text-gray-700 text-left">Central Tax (CGST)</td>
                      <td className="p-1.5 text-right">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 text-gray-700 text-left">State Tax (SGST)</td>
                      <td className="p-1.5 text-right">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="p-1.5 text-gray-700 text-left">Integrated Tax (IGST)</td>
                    <td className="p-1.5 text-right">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="p-1.5 text-gray-650 text-left">Round Off</td>
                    <td className="p-1.5 text-right">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="bg-black text-white font-bold text-[12px]">
                  <td className="p-2 text-left">Grand Total</td>
                  <td className="p-2 text-right">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature & Authorization Block */}
        <div className="grid grid-cols-12 mt-4 items-center">
          <div className="col-span-6 flex items-center gap-3">
            {upiPaymentId && qrUrl && (
              <div className="flex flex-col items-center justify-center p-1 border border-black rounded bg-white">
                <img src={qrUrl} alt="UPI QR Code" className="w-[54px] h-[54px]" />
                <div className="text-[6px] font-bold uppercase mt-0.5">UPI Pay</div>
              </div>
            )}
            <div className="text-[8px] text-gray-500 leading-normal">
              <div>• Interest @18% p.m. will be charged for delayed payment.</div>
              <div>• Nagapattinam jurisdiction disputes only.</div>
            </div>
          </div>
          <div className="col-span-6 text-right">
            <div className="text-[10px]">For <span className="font-bold">{company.name}</span></div>
            <div className="h-[40px]" />
            <div className="text-[9px] uppercase font-bold border-t border-black pt-1 inline-block text-center w-[200px]">Authorized Signatory</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[8px] text-gray-500 border-t border-black pt-1 mt-6">
          <span>See Backside For Full Terms and Conditions</span>
          <span>Powered By Hitech BillSoft</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 8: Emerald Corporate (Header Banner Theme)
// ─────────────────────────────────────────────────────────────────
export function ThemeEmerald({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Emerald Top Accent */}
          <div className="h-2 bg-emerald-700 rounded-full mb-6" />

          {/* Header Info */}
          <div className="flex justify-between items-start mb-6">
            <div>
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className="max-h-[50px] object-contain" />
              ) : (
                <div className="text-[20px] font-bold text-emerald-800 tracking-tight">{company.name}</div>
              )}
              <div className="text-[11px] text-slate-505 mt-2 max-w-[320px]">{company.address}</div>
            </div>
            <div className="text-right text-[11px] text-slate-650 leading-relaxed pr-1">
              <div className="text-[18px] font-bold text-emerald-800 uppercase">{invoice.title || 'TAX INVOICE'}</div>
              <div>Invoice No: <span className="font-bold text-slate-900">{invoice.number}</span></div>
              <div>Date: {invoice.date}</div>
              {company.gstin && <div className="font-bold text-emerald-800 mt-1">GSTIN: {company.gstin}</div>}
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border-l-4 border-emerald-700 bg-emerald-50/20 rounded-r-lg">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1">BILL TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              {customer.phone && <div className="text-[11px] text-slate-500 mt-1">Phone: {customer.phone}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-805">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border-l-4 border-emerald-700 bg-emerald-50/10 rounded-r-lg flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1">DOCUMENT METADATA:</div>
              <div className="text-[11px] text-slate-655 font-medium">
                {invoice.due_date && <div>Due Date: <span className="font-semibold text-slate-950">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
              </div>
            </div>
          </div>

          {/* Table - expanded padding */}
          <table className="w-full text-[11px] border-collapse mb-6">
            <thead>
              <tr className="bg-emerald-700 text-white rounded-lg">
                <th className="p-2.5 px-3 text-center font-bold w-[6%]">S.No.</th>
                <th className="p-2.5 px-3 text-left font-bold w-[44%]">Items Description</th>
                <th className="p-2.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">Qty</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Unit Rate</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">GST</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50/50">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-450 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-655">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Emerald GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-2">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-emerald-250 border-collapse text-center">
                <thead>
                  <tr className="bg-emerald-50 border-b-2 border-emerald-700 text-slate-800 font-semibold">
                    <th className="p-2 border-r border-emerald-200">HSN/SAC</th>
                    <th className="p-2 border-r border-emerald-200 text-right">Taxable Amount</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-2 border-r border-emerald-200">CGST Rate</th>
                        <th className="p-2 border-r border-emerald-200 text-right">CGST Amt</th>
                        <th className="p-2 border-r border-emerald-200">SGST Rate</th>
                        <th className="p-2 border-r border-emerald-200 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-emerald-200">IGST Rate</th>
                        <th className="p-2 border-r border-emerald-200 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-emerald-200 font-medium">{row.hsn}</td>
                        <td className="p-2 border-r border-emerald-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-2 border-r border-emerald-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-emerald-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                            <td className="p-2 border-r border-emerald-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-emerald-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-emerald-200">{row.rate}%</td>
                            <td className="p-2 border-r border-emerald-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calculations - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-4">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="p-3 border-l-2 border-emerald-700 bg-emerald-50/10 rounded-r-lg space-y-1 text-[10px] text-slate-655">
                <div className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider mb-1">REMITTANCE LEDGER</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>Bank Name: {company.bank_name}</div>
                  <div>Account No: {company.bank_account}</div>
                  <div>IFSC Code: {company.ifsc_code}</div>
                  <div>Branch: {company.branch || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-500 text-left font-medium">Taxable Net</td>
                  <td className="py-1.5 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-550 text-left font-medium">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-450 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-emerald-800 border-t border-slate-200">
                  <td className="py-2.5 text-left font-medium">GRAND TOTAL DUE</td>
                  <td className="py-2.5 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-705 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 9: Charcoal Sleek (Dark Accent Theme)
// ─────────────────────────────────────────────────────────────────
export function ThemeCharcoal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 120, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const hsnSummaryList = getHsnSummary(items);

  return (
    <div className="w-[794px] min-h-[1122px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-slate-800 border border-slate-200 print:border-0 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      
      {/* Content wrapper */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Charcoal Header Banner */}
          <div className="bg-slate-800 text-white rounded-xl p-6 mb-8 flex justify-between items-center bg-slate-800">
            <div>
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className="max-h-[45px] object-contain filter brightness-0 invert" />
              ) : (
                <div className="text-[20px] font-bold tracking-tight">{company.name}</div>
              )}
              <div className="text-[10px] text-slate-355 mt-1 max-w-[280px] leading-relaxed">{company.address}</div>
            </div>
            <div className="text-right pr-1">
              <div className="text-[18px] font-bold uppercase tracking-wider text-slate-200">{invoice.title || 'TAX INVOICE'}</div>
              <div className="text-[11px] font-mono-premium text-slate-300"># {invoice.number}</div>
              <div className="text-[11px] text-slate-355">Date: {invoice.date}</div>
            </div>
          </div>

          {/* Bill details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">BILLED TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              {customer.phone && <div className="text-[11px] text-slate-500 mt-1">Phone: {customer.phone}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-850">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-550 tracking-wider mb-2">SUMMARY:</div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                {invoice.due_date && <div>Due Date: <span className="font-semibold">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
                {company.gstin && <div className="font-semibold text-slate-855 mt-1">Business GSTIN: {company.gstin}</div>}
              </div>
            </div>
          </div>

          {/* Table - expanded spacing */}
          <table className="w-full text-[11px] border-collapse mb-6">
            <thead>
              <tr className="bg-slate-800 text-white rounded-lg">
                <th className="p-2.5 px-3 text-center font-bold w-[6%]">S.No.</th>
                <th className="p-2.5 px-3 text-left font-bold w-[44%]">Items Description</th>
                <th className="p-2.5 px-3 text-center font-bold w-[12%]">HSN/SAC</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">Qty</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Unit Rate</th>
                <th className="p-2.5 px-3 text-center font-bold w-[8%]">GST</th>
                <th className="p-2.5 px-3 text-right font-bold w-[12%]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50/50">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-450 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-650">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-955">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Charcoal GST Summary Breakup Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-slate-200 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-800 text-slate-800 font-semibold">
                    <th className="p-2 border-r border-slate-200">HSN/SAC</th>
                    <th className="p-2 border-r border-slate-200 text-right">Taxable Amount</th>
                    {!invoice.is_interstate ? (
                      <>
                        <th className="p-2 border-r border-slate-200">CGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">CGST Amt</th>
                        <th className="p-2 border-r border-slate-200">SGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-slate-200">IGST Rate</th>
                        <th className="p-2 border-r border-slate-200 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hsnSummaryList.map((row, idx) => {
                    const totalTax = !invoice.is_interstate ? (row.cgst + row.sgst) : row.igst;
                    return (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 font-medium">{row.hsn}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.taxable)}</td>
                        {!invoice.is_interstate ? (
                          <>
                            <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.cgst)}</td>
                            <td className="p-2 border-r border-slate-200">{(row.rate / 2)}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.sgst)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-slate-200">{row.rate}%</td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono-premium">₹{fmt(row.igst)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-bold font-mono-premium text-slate-900">₹{fmt(totalTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calculations - Pushed to bottom of A4 */}
      <div className="mt-auto pt-4 flex flex-col justify-end">
        <div className="grid grid-cols-12 gap-8 mb-4">
          <div className="col-span-7 space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>
            {company.bank_name && (
              <div className="p-3 border border-slate-100 bg-slate-50 rounded-xl space-y-1 text-[10px] text-slate-655">
                <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">REMITTANCE LEDGER</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>Bank Name: {company.bank_name}</div>
                  <div>Account No: {company.bank_account}</div>
                  <div>IFSC Code: {company.ifsc_code}</div>
                  <div>Branch: {company.branch || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-500 text-left">Taxable Net</td>
                  <td className="py-1.5 font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-505 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-550 text-left font-medium">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-450 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-slate-800 border-t border-slate-200">
                  <td className="py-2.5 text-left font-medium">GRAND TOTAL DUE</td>
                  <td className="py-2.5 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

          <div className="flex justify-end gap-4 items-center">
            {upiPaymentId && qrUrl && (
              <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                <div className="text-[6px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
              </div>
            )}
            <div className="text-right">
              <div className="text-[10px] text-slate-505">For {company.name}</div>
              <div className="h-[40px]" />
              <div className="text-[9px] uppercase tracking-wider font-bold text-slate-705 border-t border-slate-200 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
