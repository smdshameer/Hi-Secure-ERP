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
    tax_in_words?: string;
  };
  upiPaymentId?: string;
  logoSize?: 'small' | 'medium' | 'large' | 'hidden';
}

const FontStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,650;0,700;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap');
    .font-sans-premium { font-family: 'Inter', sans-serif !important; }
    .font-serif-premium { font-family: 'Lora', serif !important; }
    .font-mono-premium { font-family: 'JetBrains Mono', monospace !important; }
  ` }} />
);

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });


// ─────────────────────────────────────────────────────────────────
// THEME 1: Hi Secure Default (Standard A4 Corporate Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeDefault({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#212121] border border-gray-300 print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className={`object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="text-[18px] font-bold text-[#1565C0]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">{company.email && `Email : ${company.email}`}{company.website && ` · Web : ${company.website}`}</div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-gray-400 mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-400 align-top p-0">
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-1.5">Bill To :</div>
              <div className="p-3">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-3">
              <table className="w-full text-[11px] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="text-gray-500 py-0.5">Invoice No.</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5 italic">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 py-0.5">Date</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5 italic">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="text-gray-500 py-0.5">Due Date</td>
                      <td className="text-gray-400 py-0.5 px-1">:</td>
                      <td className="font-bold text-gray-900 py-0.5 italic">{invoice.due_date}</td>
                    </tr>
                  )}
                  {invoice.place_of_supply && (
                    <tr>
                      <td className="text-gray-500 py-0.5">Place of Supply</td>
                      <td className="text-gray-400 py-0.5 px-1">:</td>
                      <td className="text-gray-900 py-0.5">{invoice.place_of_supply}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border border-gray-400 text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1565C0] text-white">
            <th className="p-2 border border-gray-400 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-2 border border-gray-400 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-2 border border-gray-400 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-2 border border-gray-400 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-2 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-2 border border-gray-400 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-2 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-400">
              <td className="p-2 border border-gray-400 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-2 border border-gray-400 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
                {item.warranty && <span className="font-normal text-[#1565C0] block text-[9px]">Warranty: {item.warranty}</span>}
              </td>
              <td className="p-2 border border-gray-400 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-2 border border-gray-400 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-2 border border-gray-400 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
              <td className="p-2 border border-gray-400 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-2 border border-gray-400 text-right align-middle font-bold font-mono-premium">₹{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full border border-gray-400 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            <td className="w-[60%] border-r border-gray-400 align-top p-0">
              <div className="p-2 border-b border-gray-400 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-1 border-b border-gray-400">Invoice Amount in Words</div>
              <div className="p-2.5 border-b border-gray-400 font-semibold text-gray-900">{summary.amount_in_words}</div>
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-1 border-b border-gray-400">Terms / Declaration</div>
              <div className="p-3 flex justify-between gap-3 items-center">
                <div className="text-[10px] text-gray-655 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1.5 border border-gray-200 rounded bg-white shadow-sm flex-shrink-0">
                    <img src={qrUrl} alt="UPI QR Code" className="w-[70px] h-[70px]" />
                    <div className="text-[7px] text-gray-400 mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              {company.bank_name && (
                <div className="border-t border-gray-200">
                  <div className="bg-[#1565C0] text-white text-[10px] font-bold px-3 py-1 border-b border-gray-400">Bank Details</div>
                  <div className="p-2 text-[10px] grid grid-cols-2 gap-2 text-gray-700 bg-gray-50/50">
                    <div><span className="font-semibold text-gray-500">Bank:</span> {company.bank_name}</div>
                    <div><span className="font-semibold text-gray-500">A/c No:</span> {company.bank_account}</div>
                    <div><span className="font-semibold text-gray-500">IFSC Code:</span> {company.ifsc_code}</div>
                    <div><span className="font-semibold text-gray-500">Branch:</span> {company.branch || '—'}</div>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-1.5 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic font-bold">Powered By Hitech BillSoft</div>
              </div>
            </td>
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-2 text-gray-650">Sub Total</td>
                    <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-2 text-gray-655">Add CGST (9%)</td>
                        <td className="p-2 text-right font-mono-premium text-gray-700">₹{fmt(summary.cgst_total)}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-2 text-gray-655">Add SGST (9%)</td>
                        <td className="p-2 text-right font-mono-premium text-gray-700">₹{fmt(summary.sgst_total)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-2 text-gray-655">Add IGST (18%)</td>
                      <td className="p-2 text-right font-mono-premium text-gray-700">₹{fmt(summary.igst_total)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-2 text-gray-655">Round Off</td>
                    <td className="p-2 text-right font-mono-premium text-gray-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                  <tr className="bg-[#1565C0] text-white font-bold">
                    <td className="p-2 text-white">TOTAL</td>
                    <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                  </tr>
                  <tr className="border-b border-gray-200 font-bold text-gray-900 bg-gray-50/50">
                    <td className="p-2">Amount Paid</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                  </tr>
                  <tr className="font-bold text-gray-900 bg-gray-50/50">
                    <td className="p-2">Balance</td>
                    <td className="p-2 text-right font-mono-premium">₹0.00</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-3 border-t border-gray-400 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1.5">Authorized Signatory</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 2: HiSecure Premium (Rounded Modern Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeHiSecure({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#212121] border border-gray-300 print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="text-center mb-4 border-b border-blue-100 pb-2">
        <h1 className="text-xl font-bold tracking-widest text-[#1565C0] uppercase">{invoice.title || 'TAX INVOICE'}</h1>
        <span className="text-[10px] bg-blue-50 text-[#1565C0] px-3 py-0.5 rounded-full font-semibold mt-1 inline-block">{invoice.copy_type || 'Original for Recipient'}</span>
      </div>

      <div className="flex justify-between items-center mb-5 bg-gradient-to-r from-blue-50/30 to-transparent p-3 rounded-xl border border-blue-50">
        <div className="w-[35%]">
          {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
            <img src={company.logo_url} alt={company.name} className={`object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} />
          ) : (logoSize || 'medium') !== 'hidden' ? (
            <div className="text-[18px] font-bold text-[#1565C0]">{company.name}</div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide">{company.name}</div>
          <div className="text-[11px] text-gray-500 mt-1">{company.address}</div>
          <div className="text-[11px] text-gray-500">{company.phone && `Contact: ${company.phone}`}</div>
          <div className="text-[11px] text-gray-500">{company.email && `Email: ${company.email}`} · {company.website && `Web: ${company.website}`}</div>
          {company.gstin && <div className="text-[11px] font-bold text-[#1565C0] mt-1">GSTIN: {company.gstin}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-blue-100 rounded-xl bg-blue-50/20 p-3 flex flex-col justify-between">
          <div>
            <div className="bg-[#1565C0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">BILL TO</div>
            <div className="text-[13px] font-bold text-gray-900">{customer.name}</div>
            <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
          </div>
          <div className="text-[11px] text-gray-650 mt-3 pt-2 border-t border-blue-100/50">
            {customer.phone && `Contact: ${customer.phone}`}
            {customer.gstin && <div className="text-[11px] font-bold text-gray-900 mt-0.5">GSTIN: {customer.gstin}</div>}
          </div>
        </div>

        <div className="border border-blue-100 rounded-xl bg-blue-50/20 p-3">
          <div className="bg-[#1565C0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">INVOICE DETAILS</div>
          <table className="w-full text-[11px] leading-loose">
            <tbody>
              <tr>
                <td className="text-gray-505 font-semibold">Invoice No.</td>
                <td className="text-gray-400 px-1">:</td>
                <td className="font-bold text-gray-900 italic">{invoice.number}</td>
              </tr>
              <tr>
                <td className="text-gray-505 font-semibold">Date</td>
                <td className="text-gray-400 px-1">:</td>
                <td className="font-bold text-gray-900 italic">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="text-gray-505 font-semibold">Due Date</td>
                  <td className="text-gray-400 px-1">:</td>
                  <td className="font-bold text-gray-900 italic">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="text-gray-505 font-semibold">Place of Supply</td>
                  <td className="text-gray-400 px-1">:</td>
                  <td className="text-gray-900">{invoice.place_of_supply}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
        <table className="w-full text-[11px] text-center border-collapse">
          <thead>
            <tr className="bg-[#1565C0] text-white text-[10px] uppercase tracking-wider">
              <th className="p-2 border-b border-r border-blue-600 font-bold" style={{ width: '6%' }}>S.No.</th>
              <th className="p-2 border-b border-r border-blue-600 text-left font-bold" style={{ width: '44%' }}>Particulars</th>
              <th className="p-2 border-b border-r border-blue-600 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-2 border-b border-r border-blue-600 font-bold" style={{ width: '8%' }}>Qty</th>
              <th className="p-2 border-b border-r border-blue-600 text-right font-bold" style={{ width: '12%' }}>Unit Price</th>
              <th className="p-2 border-b border-r border-blue-600 font-bold" style={{ width: '8%' }}>GST</th>
              <th className="p-2 border-b font-bold text-right" style={{ width: '12%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`border-b border-gray-150 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/10'}`}>
                <td className="p-2 border-r border-gray-200 align-middle">{item.sr || (idx + 1)}</td>
                <td className="p-2 border-r border-gray-200 text-left align-middle font-bold text-gray-900">
                  {item.description}
                  {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-[#1565C0] block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-2 border-r border-gray-200 align-middle">{item.hsn_sac || '-'}</td>
                <td className="p-2 border-r border-gray-200 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                <td className="p-2 border-r border-gray-200 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-2 border-r border-gray-200 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="p-2 text-right align-middle font-bold font-mono-premium text-gray-900">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-3">
          <div className="border border-blue-100 rounded-xl bg-blue-50/20 p-2.5 flex justify-between items-center text-gray-700">
            <div><span className="font-bold text-gray-900">Delivery terms :</span> Immediate</div>
            <div className="font-bold text-[#1565C0]">Total Qty : {totalQty}</div>
          </div>
          
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <div className="bg-[#1565C0] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Invoice Amount in Words</div>
            <div className="p-2.5 bg-blue-50/10 font-bold text-gray-900 text-xs italic">{summary.amount_in_words}</div>
          </div>

          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <div className="bg-[#1565C0] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Terms / Declaration</div>
            <div className="p-3 flex justify-between gap-3 items-center bg-blue-50/10">
              <div className="text-[9.5px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
              </div>
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-blue-100 rounded-xl bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[65px] h-[65px]" />
                  <div className="text-[7px] text-[#1565C0] mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>

          {company.bank_name && (
            <div className="border border-blue-100 rounded-xl overflow-hidden">
              <div className="bg-[#1565C0] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Bank Details</div>
              <div className="p-2 bg-blue-50/10 text-[10px] grid grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold text-gray-500">Bank:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-gray-500">Account:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-gray-500">IFSC:</span> {company.ifsc_code}</div>
                <div><span className="font-semibold text-gray-500">Branch:</span> {company.branch || '—'}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center px-3 py-1.5 border border-blue-100 rounded-xl text-[8px] text-[#1565C0] bg-blue-50/20 font-semibold">
            <div>See Backside For Full Terms and Conditions</div>
            <div className="italic">Powered By Hitech BillSoft</div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-blue-50">
                  <td className="p-2 text-gray-600">Sub Total</td>
                  <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-blue-50">
                      <td className="p-2 text-gray-600">Add CGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-blue-50">
                      <td className="p-2 text-gray-600">Add SGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-blue-50">
                    <td className="p-2 text-gray-600">Add IGST (18%)</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-blue-50">
                  <td className="p-2 text-gray-600">Round Off (-)</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="bg-[#1565C0] text-white font-bold">
                  <td className="p-2 text-white uppercase tracking-wider">TOTAL</td>
                  <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="border-b border-blue-50 font-bold text-gray-900 bg-blue-50/10">
                  <td className="p-2">Amount Paid</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-bold text-gray-900 bg-blue-50/10">
                  <td className="p-2">Balance</td>
                  <td className="p-2 text-right font-mono-premium">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/10 text-right mt-4 flex-grow flex flex-col justify-between min-h-[100px]">
            <div className="text-[10px] text-gray-500">For <span className="font-bold text-[#1565C0]">{company.name}</span></div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#1565C0] text-center border-t border-blue-100 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 3: Classic Serif (Elegant Letterhead Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeClassic({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=&pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-serif-premium text-[12px] leading-relaxed text-black border-4 double border-black" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="text-center mb-6">
        <h1 className="text-2xl font-normal tracking-[0.25em] uppercase border-b border-black pb-2 inline-block px-10">{invoice.title || 'TAX INVOICE'}</h1>
        <div className="text-[10px] italic text-gray-650 mt-1 uppercase tracking-widest">{invoice.copy_type || 'Original Copy'}</div>
      </div>

      <div className="text-center mb-6 border-b-2 border-black pb-4">
        {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
          <img src={company.logo_url} alt={company.name} className="object-contain mx-auto mb-3 max-h-[70px] max-w-[200px]" />
        )}
        <div className="text-[18px] font-bold uppercase tracking-wider">{company.name}</div>
        <div className="text-[11px] max-w-xl mx-auto italic mt-1">{company.address}</div>
        <div className="text-[11px] mt-1">Ph: {company.phone} | Email: {company.email} | Web: {company.website || '—'}</div>
        {company.gstin && <div className="text-[11px] font-bold uppercase mt-1">GSTIN: {company.gstin}</div>}
      </div>

      <div className="flex justify-between gap-8 mb-6 text-[11px]">
        <div className="w-1/2">
          <div className="font-bold border-b border-black pb-1 mb-2 uppercase tracking-wider text-[10px]">Customer Details</div>
          <div className="text-[13px] font-bold">{customer.name}</div>
          <div className="text-gray-700 mt-1 whitespace-pre-line">{customer.address || '—'}</div>
          <div className="mt-2 text-gray-600">
            {customer.phone && `Phone: ${customer.phone}`}
            {customer.gstin && <div className="font-bold text-black mt-0.5">GSTIN: {customer.gstin}</div>}
          </div>
        </div>

        <div className="w-1/2">
          <div className="font-bold border-b border-black pb-1 mb-2 uppercase tracking-wider text-[10px]">Invoice metadata</div>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="text-gray-500 py-0.5">Invoice No.</td>
                <td className="font-bold py-0.5 text-right">{invoice.number}</td>
              </tr>
              <tr>
                <td className="text-gray-500 py-0.5">Invoice Date</td>
                <td className="font-bold py-0.5 text-right">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="text-gray-500 py-0.5">Due Date</td>
                  <td className="font-bold py-0.5 text-right">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="text-gray-500 py-0.5">Place of Supply</td>
                  <td className="text-right py-0.5">{invoice.place_of_supply}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <table className="w-full border-t-2 border-b-2 border-black text-[11px] text-center border-collapse mb-6">
        <thead>
          <tr className="border-b border-black uppercase text-[10px] tracking-wider bg-gray-50">
            <th className="p-2 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-2 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-2 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-2 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-2 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-2 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-2 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="p-2 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-2 text-left align-middle font-bold">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px] italic">Model: {item.model}</span>}
                {item.warranty && <span className="font-normal text-gray-650 block text-[9px] italic">Warranty: {item.warranty}</span>}
              </td>
              <td className="p-2 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-2 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-2 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
              <td className="p-2 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-2 text-right align-middle font-bold font-mono-premium">₹{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-4">
        <div className="flex justify-between items-start border-b border-black pb-4 gap-4">
          <div className="text-[11px] space-y-1">
            <div><span className="font-bold uppercase tracking-wider text-[9px] text-gray-500">Delivery Terms:</span> Immediate</div>
            <div><span className="font-bold uppercase tracking-wider text-[9px] text-gray-500">Total Qty:</span> {totalQty} NOS</div>
            {company.bank_name && (
              <div className="pt-2">
                <span className="font-bold uppercase tracking-wider text-[9px] text-gray-500 block">Bank Account Details</span>
                <div>{company.bank_name} · A/c: {company.bank_account}</div>
                <div>IFSC: {company.ifsc_code} {company.branch && `· Branch: ${company.branch}`}</div>
              </div>
            )}
          </div>
          {upiPaymentId && qrUrl && (
            <div className="flex items-center gap-3 border border-black p-2 rounded">
              <img src={qrUrl} alt="UPI QR Code" className="w-[60px] h-[60px]" />
              <div className="text-[8px] uppercase tracking-wider font-bold max-w-[60px]">Scan QR to pay</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6 border-b border-black pb-4 text-[11px]">
          <div className="col-span-7 space-y-2">
            <div>
              <span className="font-bold uppercase tracking-wider text-[9px] text-gray-500 block">Amount in Words</span>
              <div className="font-semibold italic">{summary.amount_in_words}</div>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[9px] text-gray-500 block">Terms &amp; Declaration</span>
              <div className="text-[9.5px] text-gray-600 space-y-0.5 leading-relaxed">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-650">Sub Total</td>
                  <td className="py-1 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr>
                      <td className="py-1 text-gray-655">Add CGST (9%)</td>
                      <td className="py-1 text-right font-mono-premium text-gray-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-655">Add SGST (9%)</td>
                      <td className="py-1 text-right font-mono-premium text-gray-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1 text-gray-655">Add IGST (18%)</td>
                    <td className="py-1 text-right font-mono-premium text-gray-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-gray-655">Round Off</td>
                  <td className="py-1 text-right font-mono-premium text-gray-500">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="border-t border-b border-black font-bold bg-gray-50">
                  <td className="py-2 text-[11px] uppercase tracking-wider">Grand Total</td>
                  <td className="py-2 text-right font-mono-premium text-[12px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-700">Amount Paid</td>
                  <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-700">Balance Due</td>
                  <td className="py-1 text-right font-mono-premium font-bold">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-end pt-2 text-[10px]">
          <div className="text-gray-500 italic space-y-0.5 text-[8.5px]">
            <div>See Backside For Full Terms and Conditions</div>
            <div>Powered By Hitech BillSoft</div>
          </div>
          <div className="text-right w-1/3">
            <div className="italic text-gray-600">For {company.name}</div>
            <div className="h-10"></div>
            <div className="border-t border-black pt-1 text-center font-bold uppercase tracking-wider text-[9px]">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 4: Modern Indigo (Mirrored Grid Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeModernBlue({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-[#f8f9fc] p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#1a1a2e] border border-gray-300 print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="flex justify-between items-center text-[10px] text-gray-500 mb-4 border-b border-indigo-100 pb-2">
        <div className="bg-[#1A237E] text-white px-3 py-1 rounded text-[11px] font-bold tracking-wider uppercase">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic text-[#1A237E] font-bold">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div className="w-[60%]">
          <div className="text-[20px] font-black text-[#1A237E] uppercase tracking-wide leading-none">{company.name}</div>
          <div className="text-[11px] text-gray-660 mt-2 max-w-md leading-relaxed">{company.address}</div>
          <div className="text-[11px] text-gray-500 mt-1">Phone: {company.phone} | Email: {company.email}</div>
          {company.website && <div className="text-[11px] text-gray-500">Website: {company.website}</div>}
          {company.gstin && <div className="text-[11px] font-bold text-[#1A237E] mt-1.5 bg-indigo-50 inline-block px-2 py-0.5 rounded">GSTIN: {company.gstin}</div>}
        </div>
        <div className="w-[40%] flex justify-end">
          {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
            <img src={company.logo_url} alt={company.name} className={`object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} />
          ) : (logoSize || 'medium') !== 'hidden' ? (
            <div className="text-[24px] font-black text-[#1A237E]/20 uppercase select-none">{company.name}</div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-5">
        <div className="col-span-7 bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
          <div className="text-[#1A237E] text-[10px] font-extrabold uppercase tracking-widest mb-2 pb-1 border-b border-indigo-50">Billed Recipient</div>
          <div className="text-[13px] font-extrabold text-gray-900">{customer.name}</div>
          <div className="text-[11px] text-gray-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
          <div className="text-[11px] text-gray-650 mt-3 flex justify-between">
            {customer.phone && <span>Contact: {customer.phone}</span>}
            {customer.gstin && <span className="font-bold text-[#1A237E]">GSTIN: {customer.gstin}</span>}
          </div>
        </div>

        <div className="col-span-5 bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
          <div className="text-[#1A237E] text-[10px] font-extrabold uppercase tracking-widest mb-2 pb-1 border-b border-indigo-50">Invoice Context</div>
          <table className="w-full text-[11px] leading-relaxed">
            <tbody>
              <tr>
                <td className="text-gray-505 py-1 font-semibold">Document No.</td>
                <td className="font-bold text-gray-900 py-1 text-right">{invoice.number}</td>
              </tr>
              <tr>
                <td className="text-gray-505 py-1 font-semibold">Issued Date</td>
                <td className="font-bold text-gray-900 py-1 text-right">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="text-gray-505 py-1 font-semibold">Due Date</td>
                  <td className="font-bold text-[#1A237E] py-1 text-right">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="text-gray-505 py-1 font-semibold">Place of Supply</td>
                  <td className="text-gray-900 py-1 text-right">{invoice.place_of_supply}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden mb-5 shadow-sm">
        <table className="w-full text-[11px] text-center border-collapse">
          <thead>
            <tr className="bg-[#1A237E] text-white">
              <th className="p-2.5 border-b border-indigo-800 font-bold" style={{ width: '6%' }}>S.No.</th>
              <th className="p-2.5 border-b border-indigo-800 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
              <th className="p-2.5 border-b border-indigo-800 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-2.5 border-b border-indigo-800 font-bold" style={{ width: '8%' }}>QTY</th>
              <th className="p-2.5 border-b border-indigo-800 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
              <th className="p-2.5 border-b border-indigo-800 font-bold" style={{ width: '8%' }}>GST</th>
              <th className="p-2.5 border-b border-indigo-800 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`border-b border-indigo-50 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#E8EAF6]/30'}`}>
                <td className="p-2 align-middle">{item.sr || (idx + 1)}</td>
                <td className="p-2 text-left align-middle font-bold text-gray-900">
                  {item.description}
                  {item.model && <span className="font-normal text-[#1A237E] block text-[9px]">S/N: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-gray-500 block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-2 align-middle">{item.hsn_sac || '-'}</td>
                <td className="p-2 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                <td className="p-2 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-2 align-middle text-indigo-800">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="p-2 text-right align-middle font-bold font-mono-premium text-[#1A237E]">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-indigo-100 p-3 flex justify-between items-center text-gray-700 shadow-sm">
            <div><span className="font-bold text-[#1A237E]">Delivery terms:</span> Immediate</div>
            <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
          </div>
          
          <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
            <div className="bg-[#1A237E] text-white text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">Invoice Amount in Words</div>
            <div className="p-3 font-semibold text-gray-800 text-xs italic">{summary.amount_in_words}</div>
          </div>

          <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
            <div className="bg-[#1A237E] text-white text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">Declarations &amp; Conditions</div>
            <div className="p-3 flex justify-between gap-3 items-start bg-[#E8EAF6]/10">
              <div className="text-[9.5px] text-gray-600 space-y-0.5 leading-relaxed max-w-[70%]">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
              </div>
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-indigo-100 rounded-xl bg-white shadow-sm flex-shrink-0 animate-fade-in">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[65px] h-[65px]" />
                  <div className="text-[7px] text-[#1A237E] mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>

          {company.bank_name && (
            <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
              <div className="bg-[#1A237E] text-white text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider">Payment Bank Gateway</div>
              <div className="p-3 text-[10px] grid grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold text-indigo-700">Bank:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-indigo-700">Account No:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-indigo-700">IFSC Code:</span> {company.ifsc_code}</div>
                <div><span className="font-semibold text-indigo-700">Branch:</span> {company.branch || '—'}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center px-3 py-1.5 border border-indigo-100 rounded-xl text-[8px] text-[#1A237E] bg-indigo-50/50 font-bold">
            <div>See Backside For Full Terms and Conditions</div>
            <div className="italic">Powered By Hitech BillSoft</div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-indigo-50">
                  <td className="p-2 text-gray-600">Sub Total</td>
                  <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-indigo-50">
                      <td className="p-2 text-gray-600">Add CGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-indigo-50">
                      <td className="p-2 text-gray-600">Add SGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-indigo-50">
                    <td className="p-2 text-gray-600">Add IGST (18%)</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-indigo-50">
                  <td className="p-2 text-gray-600">Round Off</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="bg-[#1A237E] text-white font-bold">
                  <td className="p-2 text-white">TOTAL DUE</td>
                  <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="border-b border-indigo-50 font-bold text-gray-900 bg-indigo-50/20">
                  <td className="p-2">Amount Paid</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-bold text-gray-900 bg-indigo-50/20">
                  <td className="p-2">Balance</td>
                  <td className="p-2 text-right font-mono-premium">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-indigo-100 p-3 text-right mt-4 flex-grow flex flex-col justify-between min-h-[100px] shadow-sm">
            <div className="text-[10px] text-gray-500">For <span className="font-bold text-[#1A237E]">{company.name}</span></div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#1A237E] text-center border-t border-indigo-100 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 5: Minimalist (Swiss Typography Clean Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeMinimal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-gray-800" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="flex justify-between items-baseline mb-6 border-b border-gray-900 pb-3">
        <div>
          <h1 className="text-3xl font-light uppercase tracking-[0.15em] text-gray-950">{invoice.title || 'INVOICE'}</h1>
          <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{invoice.copy_type || 'Original for Recipient'}</span>
        </div>
        <div className="text-right">
          {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
            <img src={company.logo_url} alt={company.name} className="object-contain ml-auto max-h-[50px] max-w-[150px]" />
          ) : (logoSize || 'medium') !== 'hidden' ? (
            <div className="text-[18px] font-bold tracking-widest text-gray-900 uppercase">{company.name}</div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-8">
          <div className="text-[14px] font-bold text-gray-900">{company.name}</div>
          <div className="text-[11px] text-gray-500 mt-1 max-w-md">{company.address}</div>
          <div className="text-[11px] text-gray-500 mt-1">Ph: {company.phone} | Email: {company.email}</div>
          {company.gstin && <div className="text-[11px] text-gray-800 font-bold mt-1.5 uppercase">GSTIN: {company.gstin}</div>}
        </div>
        <div className="col-span-4 text-right">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Invoice Details</div>
          <div className="text-[11px] mt-1"><span className="text-gray-400">Number :</span> <span className="font-bold text-gray-900">{invoice.number}</span></div>
          <div className="text-[11px]"><span className="text-gray-400">Date :</span> {invoice.date}</div>
          {invoice.due_date && <div className="text-[11px]"><span className="text-gray-400">Due Date :</span> {invoice.due_date}</div>}
          {invoice.place_of_supply && <div className="text-[11px]"><span className="text-gray-400">PoS :</span> {invoice.place_of_supply}</div>}
        </div>
      </div>

      <div className="border-t border-gray-900 pt-3 mb-6">
        <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-1.5">Billed To</div>
        <div className="text-[14px] font-bold text-gray-900">{customer.name}</div>
        <div className="text-[11px] text-gray-500 mt-0.5 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
        <div className="text-[11px] text-gray-500 mt-2">
          {customer.phone && `Contact: ${customer.phone}`}
          {customer.gstin && <span className="font-bold text-gray-900 ml-4">GSTIN: {customer.gstin}</span>}
        </div>
      </div>

      <table className="w-full text-[11px] text-center border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-gray-900 text-gray-400 uppercase text-[9px] tracking-wider">
            <th className="py-2 text-left" style={{ width: '6%' }}>S.No.</th>
            <th className="py-2 text-left" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="py-2" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="py-2" style={{ width: '8%' }}>QTY</th>
            <th className="py-2 text-right" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="py-2" style={{ width: '8%' }}>GST</th>
            <th className="py-2 text-right" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-150">
              <td className="py-2.5 text-left align-middle text-gray-400">{item.sr || (idx + 1)}</td>
              <td className="py-2.5 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-400 block text-[9px]">S/N: {item.model}</span>}
                {item.warranty && <span className="font-normal text-gray-505 block text-[9px]">Warranty: {item.warranty}</span>}
              </td>
              <td className="py-2.5 align-middle text-gray-500">{item.hsn_sac || '-'}</td>
              <td className="py-2.5 align-middle font-semibold text-gray-750">{item.qty} {item.unit || 'NOS'}</td>
              <td className="py-2.5 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
              <td className="py-2.5 align-middle text-gray-500">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="py-2.5 text-right align-middle font-bold font-mono-premium text-gray-950">₹{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-12 gap-6 border-t border-gray-900 pt-4">
        <div className="col-span-7 flex flex-col gap-4 text-[10.5px]">
          <div className="flex justify-between items-center text-gray-700">
            <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
            <div className="font-bold">Total Qty : {totalQty}</div>
          </div>
          
          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Amount in Words</div>
            <div className="font-semibold text-gray-900 italic text-xs">{summary.amount_in_words}</div>
          </div>

          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest mb-1">Terms &amp; Declaration</div>
            <div className="text-[9.5px] text-gray-500 space-y-0.5 leading-relaxed">
              <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
              <div>• Goods Once Sold will not be taken back.</div>
              <div>• Guarantee/Warantee is only at company service center.</div>
              <div>• Interest @18%p.m will be charged if payment delayed.</div>
              <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
              <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</div>
            </div>
          </div>

          {company.bank_name && (
            <div>
              <div className="text-[8px] text-gray-400 uppercase tracking-widest mb-1">Bank Information</div>
              <div className="text-[9.5px] text-gray-650 flex flex-wrap gap-x-4 gap-y-1">
                <div><span className="font-semibold text-gray-800">Bank:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-gray-800">A/c:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-gray-800">IFSC:</span> {company.ifsc_code}</div>
                {company.branch && <div><span className="font-semibold text-gray-800">Branch:</span> {company.branch}</div>}
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 pt-2 border-t border-gray-100">
            {upiPaymentId && qrUrl && (
              <div className="flex items-center gap-2.5">
                <img src={qrUrl} alt="UPI QR Code" className="w-[50px] h-[50px]" />
                <div className="text-[7px] text-gray-400 max-w-[50px] leading-tight font-bold uppercase tracking-wider">Scan QR to pay</div>
              </div>
            )}
            <div className="text-[8px] text-gray-400 self-center">
              <div>See Backside For Full Terms and Conditions</div>
              <div className="italic mt-0.5">Powered By Hitech BillSoft</div>
            </div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500">Sub Total</td>
                <td className="py-1.5 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
              </tr>
              {!invoice.is_interstate ? (
                <>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-505">CGST (9%)</td>
                    <td className="py-1.5 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-505">SGST (9%)</td>
                    <td className="py-1.5 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                  </tr>
                </>
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-505">IGST (18%)</td>
                  <td className="py-1.5 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-gray-550">Round Off</td>
                <td className="py-1.5 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
              </tr>
              <tr className="border-b-2 border-gray-900 font-bold text-gray-900">
                <td className="py-2.5 text-[11px] uppercase tracking-widest">Grand Total</td>
                <td className="py-2.5 text-right font-mono-premium text-[13px]">₹{fmt(summary.grand_total)}</td>
              </tr>
              <tr className="border-b border-gray-100 font-semibold text-gray-805">
                <td className="py-1.5">Amount Paid</td>
                <td className="py-1.5 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
              </tr>
              <tr className="font-semibold text-gray-805">
                <td className="py-1.5">Balance</td>
                <td className="py-1.5 text-right font-mono-premium">₹0.00</td>
              </tr>
            </tbody>
          </table>

          <div className="text-right mt-6 border-t border-gray-200 pt-3">
            <div className="text-[10px] text-gray-400">For <span className="font-bold text-gray-900">{company.name}</span></div>
            <div className="h-[35px]" />
            <div className="text-[8.5px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-900 pt-1.5 font-sans-premium">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 6: Saffron (Indian Tricolor Watermark Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeSaffron({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#212121] border-2 border-[#FF6F00] relative print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
        <div className="text-[75px] font-black text-gray-900 tracking-[0.25em] rotate-[-30deg] select-none uppercase">HI-SECURE</div>
      </div>

      <div className="flex w-full mb-3" style={{ height: '6px' }}>
        <div className="flex-1 bg-[#FF6F00]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#1B5E20]" />
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2 border-b border-gray-150 pb-1 relative z-10">
        <div className="font-extrabold uppercase tracking-wide text-[#FF6F00]">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic text-[#1B5E20] font-bold">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      <table className="w-full mb-4 relative z-10">
        <tbody>
          <tr>
            <td className="w-[35%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className={`object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="text-[18px] font-bold text-[#FF6F00]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[65%] text-right align-top py-1">
              <div className="text-[16px] font-black text-[#FF6F00] uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">{company.email && `Email : ${company.email}`}{company.website && ` · Web : ${company.website}`}</div>
              {company.gstin && <div className="text-[11px] font-bold text-[#1B5E20] mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-12 gap-4 mb-4 relative z-10">
        <div className="col-span-7 border border-[#FF6F00] rounded-xl bg-orange-50/10 overflow-hidden flex flex-col justify-between">
          <div className="bg-[#FF6F00] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Bill To (Buyer)</div>
          <div className="p-3">
            <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
            <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
          </div>
          <div className="p-3 border-t border-orange-100 text-[11px] text-gray-650 flex justify-between bg-orange-50/30">
            {customer.phone && <span>Contact: {customer.phone}</span>}
            {customer.gstin && <span className="font-bold text-[#1B5E20]">GSTIN: {customer.gstin}</span>}
          </div>
        </div>

        <div className="col-span-5 border border-[#1B5E20] rounded-xl bg-green-50/10 overflow-hidden">
          <div className="bg-[#1B5E20] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Invoice Metadata</div>
          <div className="p-3">
            <table className="w-full text-[11px] leading-loose">
              <tbody>
                <tr>
                  <td className="text-gray-550 py-0.5">Invoice No.</td>
                  <td className="text-gray-400 py-0.5 px-1">:</td>
                  <td className="font-bold text-gray-900 py-0.5 italic">{invoice.number}</td>
                </tr>
                <tr>
                  <td className="text-gray-550 py-0.5">Date</td>
                  <td className="text-gray-400 py-0.5 px-1">:</td>
                  <td className="font-bold text-gray-900 py-0.5 italic">{invoice.date}</td>
                </tr>
                {invoice.due_date && (
                  <tr>
                    <td className="text-gray-555 py-0.5">Due Date</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5 italic">{invoice.due_date}</td>
                  </tr>
                )}
                {invoice.place_of_supply && (
                  <tr>
                    <td className="text-gray-555 py-0.5">Place of Supply</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="text-gray-900 py-0.5">{invoice.place_of_supply}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="border border-[#1B5E20] rounded-xl overflow-hidden mb-4 relative z-10">
        <table className="w-full text-[11px] text-center border-collapse">
          <thead>
            <tr className="bg-[#1B5E20] text-white text-[10px] uppercase tracking-wider">
              <th className="p-2 border-r border-[#1B5E20] font-bold" style={{ width: '6%' }}>S.No.</th>
              <th className="p-2 border-r border-[#1B5E20] text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
              <th className="p-2 border-r border-[#1B5E20] font-bold" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-2 border-r border-[#1B5E20] font-bold" style={{ width: '8%' }}>QTY</th>
              <th className="p-2 border-r border-[#1B5E20] text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
              <th className="p-2 border-r border-[#1B5E20] font-bold" style={{ width: '8%' }}>GST</th>
              <th className="p-2 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`border-b border-[#1B5E20]/20 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/5'}`}>
                <td className="p-2 border-r border-[#1B5E20]/20 align-middle">{item.sr || (idx + 1)}</td>
                <td className="p-2 border-r border-[#1B5E20]/20 text-left align-middle font-bold text-gray-900">
                  {item.description}
                  {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-[#1B5E20] block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-2 border-r border-[#1B5E20]/20 align-middle">{item.hsn_sac || '-'}</td>
                <td className="p-2 border-r border-[#1B5E20]/20 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                <td className="p-2 border-r border-[#1B5E20]/20 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-2 border-r border-[#1B5E20]/20 align-middle text-[#1B5E20]">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="p-2 text-right align-middle font-bold font-mono-premium text-gray-900">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-4 relative z-10 mb-2">
        <div className="col-span-7 flex flex-col gap-3">
          <div className="border border-[#FF6F00] rounded-xl bg-orange-50/10 p-2 flex justify-between items-center text-gray-700">
            <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
            <div className="font-bold text-[#FF6F00]">Total Qty : {totalQty}</div>
          </div>
          
          <div className="border border-[#FF6F00] rounded-xl overflow-hidden">
            <div className="bg-[#FF6F00] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Invoice Amount in Words</div>
            <div className="p-2.5 bg-orange-50/10 font-bold text-gray-900 text-xs italic">{summary.amount_in_words}</div>
          </div>

          <div className="border border-[#FF6F00] rounded-xl overflow-hidden">
            <div className="bg-[#FF6F00] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Terms / Declaration</div>
            <div className="p-3 flex justify-between gap-3 items-center bg-orange-50/5">
              <div className="text-[9.5px] text-gray-655 space-y-0.5 leading-relaxed max-w-[70%]">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
              </div>
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-[#FF6F00] rounded-xl bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[65px] h-[65px]" />
                  <div className="text-[7px] text-[#FF6F00] mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>

          {company.bank_name && (
            <div className="border border-[#1B5E20] rounded-xl overflow-hidden">
              <div className="bg-[#1B5E20] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Bank Details</div>
              <div className="p-3 bg-green-50/5 text-[10px] grid grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold text-gray-500">Bank:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-gray-500">Account:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-gray-500">IFSC:</span> {company.ifsc_code}</div>
                <div><span className="font-semibold text-gray-500">Branch:</span> {company.branch || '—'}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center px-3 py-1.5 border border-[#FF6F00] rounded-xl text-[8px] text-[#FF6F00] bg-orange-50/10 font-bold">
            <div>See Backside For Full Terms and Conditions</div>
            <div className="italic">Powered By Hitech BillSoft</div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <div className="border border-[#1B5E20] rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Sub Total</td>
                  <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-gray-100">
                      <td className="p-2 text-gray-600">Add CGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-2 text-gray-600">Add SGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-600">Add IGST (18%)</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Round Off (-)</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="bg-[#FF6F00] text-white font-bold">
                  <td className="p-2 text-white uppercase tracking-wider">TOTAL</td>
                  <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="border-b border-gray-100 font-bold text-gray-900 bg-orange-50/5">
                  <td className="p-2">Amount Paid</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-bold text-gray-900 bg-orange-50/5">
                  <td className="p-2">Balance</td>
                  <td className="p-2 text-right font-mono-premium">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-[#1B5E20] rounded-xl p-3 bg-green-50/5 text-right mt-4 flex-grow flex flex-col justify-between min-h-[100px]">
            <div className="text-[10px] text-gray-500">For <span className="font-bold text-[#1B5E20]">{company.name}</span></div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#1B5E20] text-center border-t border-green-100 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full mt-2 relative z-10" style={{ height: '6px' }}>
        <div className="flex-1 bg-[#1B5E20]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#FF6F00]" />
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 7: Tally Monospace (Ledger Monospace Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeTally({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const fillerRows = Math.max(0, 4 - items.length);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-mono-premium text-[12px] leading-relaxed text-black border-2 border-black print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="text-center border-b-2 border-black pb-2 mb-3">
        <h1 className="text-xl font-bold tracking-[0.2em] uppercase">{invoice.title || 'TAX INVOICE'}</h1>
        <div className="text-[9px] uppercase mt-0.5 tracking-wider font-semibold">{invoice.copy_type || '(Original for Recipient)'}</div>
      </div>

      <div className="grid grid-cols-12 gap-4 border-b border-black pb-3 mb-3">
        <div className="col-span-7 border-r border-black pr-3">
          {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
            <img src={company.logo_url} alt={company.name} className="object-contain mb-2 max-h-[50px] max-w-[150px] border border-black p-1" />
          )}
          <div className="text-[14px] font-bold uppercase">{company.name}</div>
          <div className="text-[11px] mt-1 leading-normal">{company.address}</div>
          <div className="text-[11px]">Phone: {company.phone} | Email: {company.email}</div>
          {company.gstin && <div className="text-[11px] font-bold mt-1.5 uppercase">GSTIN/UIN: {company.gstin}</div>}
        </div>
        <div className="col-span-5 pl-2 text-[11px] leading-loose">
          <div><span className="text-gray-500">Invoice No:</span> <span className="font-bold">{invoice.number}</span></div>
          <div><span className="text-gray-500">Dated:</span> <span className="font-bold">{invoice.date}</span></div>
          {invoice.due_date && <div><span className="text-gray-505">Due Date:</span> <span className="font-bold">{invoice.due_date}</span></div>}
          {invoice.place_of_supply && <div><span className="text-gray-505">Place of Supply:</span> {invoice.place_of_supply}</div>}
        </div>
      </div>

      <div className="border border-black mb-3">
        <div className="bg-black text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">Buyer (Bill to)</div>
        <div className="p-3 text-[11px]">
          <div className="font-bold text-[12px] uppercase">{customer.name}</div>
          <div className="whitespace-pre-line mt-1 text-gray-800">{customer.address || '—'}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-dashed border-gray-300">
            {customer.phone && <div>Contact: {customer.phone}</div>}
            {customer.gstin && <div>GSTIN/UIN: <span className="font-bold">{customer.gstin}</span></div>}
          </div>
        </div>
      </div>

      <div className="border border-black mb-3">
        <table className="w-full text-[11px] text-center border-collapse">
          <thead>
            <tr className="border-b border-black uppercase font-bold text-[10px] bg-gray-50">
              <th className="p-1.5 border-r border-black" style={{ width: '6%' }}>Sl No.</th>
              <th className="p-1.5 border-r border-black text-left" style={{ width: '40%' }}>Description of Goods</th>
              <th className="p-1.5 border-r border-black" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-1.5 border-r border-black" style={{ width: '8%' }}>QTY</th>
              <th className="p-1.5 border-r border-black font-bold" style={{ width: '7%' }}>per</th>
              <th className="p-1.5 border-r border-black text-right" style={{ width: '13%' }}>Rate</th>
              <th className="p-1.5 text-right" style={{ width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-dashed border-black">
                <td className="p-1.5 border-r border-black align-top">{item.sr || (idx + 1)}</td>
                <td className="p-1.5 border-r border-black text-left align-top font-bold">
                  {item.description}
                  {item.model && <span className="font-normal block text-[9px]">S/N: {item.model}</span>}
                  {item.warranty && <span className="font-normal block text-[9px] text-gray-500">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-1.5 border-r border-black align-top">{item.hsn_sac || '-'}</td>
                <td className="p-1.5 border-r border-black align-top font-bold">{item.qty}</td>
                <td className="p-1.5 border-r border-black align-top">{item.unit || 'NOS'}</td>
                <td className="p-1.5 border-r border-black text-right align-top font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-1.5 text-right align-top font-bold font-mono-premium">₹{fmt(item.total)}</td>
              </tr>
            ))}
            {Array.from({ length: fillerRows }).map((_, idx) => (
              <tr key={`filler-${idx}`} className="border-b border-dashed border-black h-[25px]">
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
            <tr className="border-t border-black font-bold bg-gray-50">
              <td className="p-1.5 border-r border-black"></td>
              <td className="p-1.5 border-r border-black text-right">Total</td>
              <td className="p-1.5 border-r border-black"></td>
              <td className="p-1.5 border-r border-black font-bold">{totalQty}</td>
              <td className="p-1.5 border-r border-black">{items[0]?.unit || 'NOS'}</td>
              <td className="p-1.5 border-r border-black"></td>
              <td className="p-1.5 text-right font-mono-premium font-bold">₹{fmt(summary.taxable_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-black">
        <div className="border-b border-black p-2 bg-gray-50">
          <span className="font-bold text-[9px] uppercase tracking-wider text-gray-500 block">Amount Chargeable (in words)</span>
          <span className="font-bold text-[11px]">{summary.amount_in_words}</span>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-7 border-r border-black p-2 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <span className="font-bold text-[9px] uppercase tracking-wider text-gray-500 block">Declaration</span>
                <div className="text-[9.5px] leading-relaxed text-gray-700">
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>
              </div>

              {company.bank_name && (
                <div>
                  <span className="font-bold text-[9px] uppercase tracking-wider text-gray-500 block">Bank Account details</span>
                  <div className="text-[10px] text-gray-700 font-semibold">
                    {company.bank_name} · A/c: {company.bank_account}
                    <div>IFSC Code: {company.ifsc_code} {company.branch && `· Branch: ${company.branch}`}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-3 mt-3 border-t border-dashed border-gray-300">
              {upiPaymentId && qrUrl && (
                <div className="flex items-center gap-2 border border-black p-1 bg-white">
                  <img src={qrUrl} alt="UPI QR" className="w-[50px] h-[50px]" />
                  <span className="text-[8px] max-w-[50px] leading-tight font-bold">Scan to Pay</span>
                </div>
              )}
              <div className="text-[9px] font-bold text-gray-500 italic">E. &amp; O.E.</div>
            </div>
          </div>

          <div className="col-span-5 p-2 bg-gray-50 flex flex-col justify-between">
            <table className="w-full text-xs">
              <tbody>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-gray-200">
                      <td className="py-1">CGST</td>
                      <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-1">SGST</td>
                      <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-gray-200">
                    <td className="py-1">IGST</td>
                    <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="py-1">Round Off</td>
                  <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="border-b border-black font-bold bg-white text-[12px]">
                  <td className="py-2">TOTAL</td>
                  <td className="py-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-semibold text-gray-800 text-[10px]">
                  <td className="py-1">Amount Paid</td>
                  <td className="py-1 text-right font-mono-premium font-bold">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-semibold text-gray-800 text-[10px]">
                  <td className="py-1">Balance</td>
                  <td className="py-1 text-right font-mono-premium font-bold">₹0.00</td>
                </tr>
              </tbody>
            </table>

            <div className="text-right mt-6 border-t border-black pt-2 bg-white p-2">
              <div className="text-[10px]">For <span className="font-bold">{company.name}</span></div>
              <div className="h-[40px]" />
              <div className="text-[9px] uppercase tracking-wider font-bold text-center border-t border-black pt-1">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[9px] mt-2 text-gray-500 border-t border-black pt-1">
        <span>See Backside For Full Terms and Conditions</span>
        <span>Powered By Hitech BillSoft</span>
      </div>
    </div>
  );
}




// ─────────────────────────────────────────────────────────────────
// THEME 8: Emerald Corporate (Header Banner Theme)
// ─────────────────────────────────────────────────────────────────
export function ThemeEmerald({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#1b3d2f] border border-emerald-600/30 print:border-0 rounded-xl" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="bg-[#0A5C36] text-white rounded-t-xl p-4 flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
            <img src={company.logo_url} alt={company.name} className="object-contain max-h-[50px] max-w-[150px] bg-white p-1 rounded" />
          )}
          <div>
            <div className="text-[18px] font-black uppercase tracking-wider">{company.name}</div>
            <div className="text-[10px] text-emerald-100 mt-0.5">{company.address}</div>
            <div className="text-[10px] text-emerald-100">Ph: {company.phone} | Email: {company.email}</div>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-[20px] font-black tracking-widest uppercase">{invoice.title || 'TAX INVOICE'}</h1>
          <span className="text-[9px] bg-emerald-700 text-white px-2 py-0.5 rounded-full mt-1 inline-block font-medium">{invoice.copy_type || 'Original Copy'}</span>
          {company.gstin && <div className="text-[10px] font-bold text-emerald-200 mt-1.5 uppercase">GSTIN: {company.gstin}</div>}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-7 border border-emerald-100 rounded-xl bg-emerald-50/20 p-3 flex flex-col justify-between">
          <div>
            <div className="bg-[#0A5C36] text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">BILL TO</div>
            <div className="text-[13px] font-bold text-gray-900">{customer.name}</div>
            <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
          </div>
          <div className="text-[11px] text-gray-650 mt-3 pt-2 border-t border-emerald-100/50">
            {customer.phone && `Contact: ${customer.phone}`}
            {customer.gstin && <div className="text-[11px] font-bold text-[#0A5C36] mt-0.5">GSTIN: {customer.gstin}</div>}
          </div>
        </div>

        <div className="col-span-5 border border-emerald-100 rounded-xl bg-emerald-50/20 p-3">
          <div className="bg-[#0A5C36] text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2">DETAILS</div>
          <table className="w-full text-[11px] leading-loose">
            <tbody>
              <tr>
                <td className="text-gray-505 font-semibold">Invoice No.</td>
                <td className="text-gray-400 px-1">:</td>
                <td className="font-bold text-gray-900 italic">{invoice.number}</td>
              </tr>
              <tr>
                <td className="text-gray-505 font-semibold">Date</td>
                <td className="text-gray-400 px-1">:</td>
                <td className="font-bold text-gray-900 italic">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="text-gray-505 font-semibold">Due Date</td>
                  <td className="text-gray-400 px-1">:</td>
                  <td className="font-bold text-gray-900 italic">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="text-gray-505 font-semibold">Place of Supply</td>
                  <td className="text-gray-400 px-1">:</td>
                  <td className="text-gray-900">{invoice.place_of_supply}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-emerald-150 rounded-xl overflow-hidden mb-4 shadow-sm">
        <table className="w-full text-[11px] text-center border-collapse">
          <thead>
            <tr className="bg-[#0A5C36] text-white text-[10px] uppercase tracking-wider">
              <th className="p-2 border-r border-emerald-700 font-bold" style={{ width: '6%' }}>S.No.</th>
              <th className="p-2 border-r border-emerald-700 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
              <th className="p-2 border-r border-emerald-700 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-2 border-r border-emerald-700 font-bold" style={{ width: '8%' }}>QTY</th>
              <th className="p-2 border-r border-emerald-700 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
              <th className="p-2 border-r border-emerald-700 font-bold" style={{ width: '8%' }}>GST</th>
              <th className="p-2 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`border-b border-emerald-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/10'}`}>
                <td className="p-2 border-r border-emerald-100 align-middle">{item.sr || (idx + 1)}</td>
                <td className="p-2 border-r border-emerald-100 text-left align-middle font-bold text-gray-900">
                  {item.description}
                  {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-[#0A5C36] block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-2 border-r border-emerald-100 align-middle">{item.hsn_sac || '-'}</td>
                <td className="p-2 border-r border-emerald-100 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                <td className="p-2 border-r border-emerald-100 text-right align-middle font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-2 border-r border-emerald-100 align-middle text-[#0A5C36]">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="p-2 text-right align-middle font-bold font-mono-premium text-gray-900">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-3">
          <div className="border border-emerald-100 rounded-xl bg-emerald-50/20 p-2.5 flex justify-between items-center text-gray-700">
            <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
            <div className="font-bold text-[#0A5C36]">Total Qty : {totalQty}</div>
          </div>
          
          <div className="border border-emerald-100 rounded-xl overflow-hidden">
            <div className="bg-[#0A5C36] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Invoice Amount in Words</div>
            <div className="p-2.5 bg-emerald-50/10 font-bold text-gray-900 text-xs italic">{summary.amount_in_words}</div>
          </div>

          <div className="border border-emerald-100 rounded-xl overflow-hidden">
            <div className="bg-[#0A5C36] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Terms / Declaration</div>
            <div className="p-3 flex justify-between gap-3 items-center bg-emerald-50/5">
              <div className="text-[9.5px] text-gray-655 space-y-0.5 leading-relaxed max-w-[70%]">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
              </div>
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-emerald-100 rounded-xl bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[65px] h-[65px]" />
                  <div className="text-[7px] text-[#0A5C36] mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>

          {company.bank_name && (
            <div className="border border-emerald-100 rounded-xl overflow-hidden">
              <div className="bg-[#0A5C36] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">Bank Details</div>
              <div className="p-2.5 bg-emerald-50/10 text-[10px] grid grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold text-gray-500">Bank Name:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-gray-500">Account No:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-gray-500">IFSC Code:</span> {company.ifsc_code}</div>
                <div><span className="font-semibold text-gray-500">Branch:</span> {company.branch || '—'}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center px-3 py-1.5 border border-emerald-100 rounded-xl text-[8px] text-[#0A5C36] bg-emerald-50/20 font-bold">
            <div>See Backside For Full Terms and Conditions</div>
            <div className="italic">Powered By Hitech BillSoft</div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <div className="border border-emerald-100 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-emerald-50">
                  <td className="p-2 text-gray-655">Sub Total</td>
                  <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-emerald-50">
                      <td className="p-2 text-gray-655">Add CGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-emerald-50">
                      <td className="p-2 text-gray-655">Add SGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-emerald-50">
                    <td className="p-2 text-gray-655">Add IGST (18%)</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-emerald-50">
                  <td className="p-2 text-gray-655">Round Off (-)</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="bg-[#0A5C36] text-white font-bold">
                  <td className="p-2 text-white uppercase tracking-wider">TOTAL</td>
                  <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="border-b border-emerald-50 font-bold text-gray-900 bg-emerald-50/10">
                  <td className="p-2">Amount Paid</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-bold text-gray-900 bg-emerald-50/10">
                  <td className="p-2">Balance</td>
                  <td className="p-2 text-right font-mono-premium">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-emerald-100 rounded-xl p-3 bg-emerald-50/10 text-right mt-4 flex-grow flex flex-col justify-between min-h-[100px]">
            <div className="text-[10px] text-gray-500">For <span className="font-bold text-[#0A5C36]">{company.name}</span></div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#0A5C36] text-center border-t border-emerald-100 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 9: Charcoal Sleek (Dark Card Deck Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeCharcoal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="w-[794px] min-h-[1080px] bg-white p-8 print:p-0 mx-auto font-sans-premium text-[12px] leading-relaxed text-[#2c3e50] border-t-4 border-[#2c3e50] border-l border-r border-b border-gray-200 print:border-0" style={{ boxSizing: 'border-box' }}>
      <FontStyles />
      <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-200">
        <div>
          {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
            <img src={company.logo_url} alt="Logo" className="max-h-[50px] mb-2 object-contain" />
          )}
          <div className="text-[18px] font-black uppercase tracking-wider text-[#2c3e50]">{company.name}</div>
          <div className="text-[10px] text-gray-500 mt-1">{company.address}</div>
          <div className="text-[10px] text-gray-500">Contact: {company.phone} | Email: {company.email}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-light uppercase tracking-widest text-gray-400">{invoice.title || 'TAX INVOICE'}</div>
          <span className="text-[9px] bg-slate-100 text-[#2c3e50] font-bold px-2 py-0.5 rounded uppercase tracking-wider mt-1.5 inline-block">{invoice.copy_type || 'Original'}</span>
          {company.gstin && <div className="text-[10px] font-bold text-[#2c3e50] mt-2">GSTIN: {company.gstin}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-[#f8f9fa] p-4 rounded-xl border border-gray-150 flex flex-col justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-2">Billed Customer</div>
            <div className="font-extrabold text-[13px] text-gray-900 leading-tight">{customer.name}</div>
            <div className="text-gray-650 text-[11px] mt-1.5 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
          </div>
          <div className="text-gray-505 text-[10px] mt-3 pt-2 border-t border-gray-200 flex justify-between">
            {customer.phone && <span>Ph: {customer.phone}</span>}
            {customer.gstin && <span className="font-bold text-[#2c3e50]">GSTIN: {customer.gstin}</span>}
          </div>
        </div>

        <div className="bg-[#f8f9fa] p-4 rounded-xl border border-gray-150">
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-2">Documentation Metadata</div>
          <table className="w-full text-[11px] leading-loose">
            <tbody>
              <tr>
                <td className="text-gray-505 font-semibold">Document No.</td>
                <td className="font-bold text-gray-900 text-right">{invoice.number}</td>
              </tr>
              <tr>
                <td className="text-gray-505 font-semibold">Issue Date</td>
                <td className="font-bold text-gray-900 text-right">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="text-gray-505 font-semibold">Due Date</td>
                  <td className="font-bold text-[#2c3e50] text-right">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="text-gray-550 font-semibold">PoS</td>
                  <td className="text-gray-900 text-right">{invoice.place_of_supply}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#2c3e50] text-white font-bold uppercase text-[9px] tracking-wider text-center">
              <th className="p-2 border-r border-[#2c3e50]" style={{ width: '6%' }}>S.No.</th>
              <th className="p-2 text-left border-r border-[#2c3e50]" style={{ width: '44%' }}>Description</th>
              <th className="p-2 border-r border-[#2c3e50]" style={{ width: '12%' }}>HSN/SAC</th>
              <th className="p-2 border-r border-[#2c3e50]" style={{ width: '8%' }}>Qty</th>
              <th className="p-2 text-right border-r border-[#2c3e50]" style={{ width: '12%' }}>Price</th>
              <th className="p-2 border-r border-[#2c3e50]" style={{ width: '8%' }}>GST</th>
              <th className="p-2 text-right" style={{ width: '12%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-150 last:border-0 hover:bg-gray-50/50">
                <td className="p-2 text-center border-r border-gray-200 text-gray-500">{item.sr || (idx + 1)}</td>
                <td className="p-2 border-r border-gray-200 font-extrabold text-gray-900 text-left">
                  {item.description}
                  {item.model && <span className="font-normal text-gray-500 block text-[9px]">S/N: {item.model}</span>}
                  {item.warranty && <span className="font-normal text-[#2c3e50] block text-[9px]">Warranty: {item.warranty}</span>}
                </td>
                <td className="p-2 border-r border-gray-200 text-center text-gray-500">{item.hsn_sac || '-'}</td>
                <td className="p-2 border-r border-gray-200 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                <td className="p-2 text-right border-r border-gray-200 font-mono-premium">₹{fmt(item.rate)}</td>
                <td className="p-2 border-r border-gray-200 text-center text-[#2c3e50]">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                <td className="p-2 text-right font-bold font-mono-premium text-gray-900">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-3">
          <div className="border border-gray-200 rounded-xl p-2.5 flex justify-between items-center text-gray-700 bg-gray-50">
            <div><span className="font-bold text-gray-900">Delivery terms:</span> Immediate</div>
            <div className="font-bold text-[#2c3e50]">Total Qty: {totalQty}</div>
          </div>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#2c3e50] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Amount in Words</div>
            <div className="p-2.5 bg-gray-50/20 font-bold text-gray-900 text-xs italic">{summary.amount_in_words}</div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#2c3e50] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Terms &amp; Declarations</div>
            <div className="p-3 flex justify-between gap-3 items-center bg-gray-50/20">
              <div className="text-[9.5px] text-gray-600 space-y-0.5 leading-relaxed max-w-[70%]">
                <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                <div>• Goods Once Sold will not be taken back.</div>
                <div>• Guarantee/Warantee is only at company service center.</div>
                <div>• Interest @18%p.m will be charged if payment delayed.</div>
                <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</div>
              </div>
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1.5 border border-gray-200 rounded-xl bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[65px] h-[65px]" />
                  <div className="text-[7px] text-[#2c3e50] mt-1 font-bold uppercase tracking-wider">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>

          {company.bank_name && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#2c3e50] text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider">Direct Bank Remittance</div>
              <div className="p-2.5 bg-gray-50/20 text-[10px] grid grid-cols-2 gap-2 text-gray-700">
                <div><span className="font-semibold text-gray-800">Bank:</span> {company.bank_name}</div>
                <div><span className="font-semibold text-gray-800">A/c No:</span> {company.bank_account}</div>
                <div><span className="font-semibold text-gray-800">IFSC Code:</span> {company.ifsc_code}</div>
                <div><span className="font-semibold text-gray-800">Branch:</span> {company.branch || '—'}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center px-3 py-1.5 border border-gray-200 rounded-xl text-[8px] text-[#2c3e50] bg-gray-50/50 font-bold">
            <div>See Backside For Full Terms and Conditions</div>
            <div className="italic">Powered By Hitech BillSoft</div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-655">Sub Total</td>
                  <td className="p-2 text-right font-mono-premium font-semibold">₹{fmt(summary.taxable_total)}</td>
                </tr>
                {!invoice.is_interstate ? (
                  <>
                    <tr className="border-b border-gray-100">
                      <td className="p-2 text-gray-655">Add CGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="p-2 text-gray-655">Add SGST (9%)</td>
                      <td className="p-2 text-right font-mono-premium">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-gray-100">
                    <td className="p-2 text-gray-655">Add IGST (18%)</td>
                    <td className="p-2 text-right font-mono-premium">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-655">Round Off (-)</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.round_off)}</td>
                </tr>
                <tr className="bg-[#2c3e50] text-white font-bold">
                  <td className="p-2 text-white uppercase tracking-wider">TOTAL DUE</td>
                  <td className="p-2 text-right font-mono-premium text-white text-[13px]">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="border-b border-gray-100 font-bold text-gray-900 bg-gray-50/20">
                  <td className="p-2">Amount Paid</td>
                  <td className="p-2 text-right font-mono-premium">₹{fmt(summary.grand_total)}</td>
                </tr>
                <tr className="font-bold text-gray-900 bg-gray-50/20">
                  <td className="p-2">Balance</td>
                  <td className="p-2 text-right font-mono-premium">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/20 text-right mt-4 flex-grow flex flex-col justify-between min-h-[100px]">
            <div className="text-[10px] text-gray-500">For <span className="font-bold text-[#2c3e50]">{company.name}</span></div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-bold text-[#2c3e50] text-center border-t border-gray-200 pt-1.5">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
