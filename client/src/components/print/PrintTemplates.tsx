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

// ─────────────────────────────────────────────────────────────────
// THEME 1: Hi Secure Default (Clone of Reference PDF)
// ─────────────────────────────────────────────────────────────────
export function ThemeDefault({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-gray-400 font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#1565C0]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-gray-400 mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-400 align-top p-0">
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-gray-400 text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1565C0] text-white">
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-gray-400 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-400">
              <td className="p-1.5 border border-gray-400 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-400 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-gray-400 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-gray-400 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-gray-400 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-gray-400 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-400 align-top p-0">
              <div className="p-2 border-b border-gray-400 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-400 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Blue Bar */}
                  <tr className="bg-[#1565C0] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-gray-400 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// No imports needed — these functions are pasted into PrintTemplates.tsx which already has React, QRCode, PrintTemplateProps

export function ThemeHiSecure({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-gray-400 font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Centered TAX INVOICE Title Bar */}
      <div className="text-center text-[13px] font-bold uppercase tracking-widest text-[#1565C0] border-b-2 border-[#1565C0] pb-1.5 mb-2">
        {invoice.title || 'TAX INVOICE'}
      </div>

      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#1565C0]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-gray-400 mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-400 align-top p-0">
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-1 rounded-full mx-1 mt-1 mb-0 text-center inline-block">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-gray-400 text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1565C0] text-white">
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-gray-400 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-400">
              <td className="p-1.5 border border-gray-400 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-400 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-gray-400 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-gray-400 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-gray-400 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-gray-400 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-400 align-top p-0">
              <div className="p-2 border-b border-gray-400 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-0.5 rounded-full mx-1 mt-1 mb-0.5 inline-block border-b border-gray-400">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-400 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#1565C0] text-white text-[11px] font-bold px-3 py-0.5 rounded-full mx-1 mt-1 mb-0.5 inline-block border-b border-gray-400">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Blue Bar */}
                  <tr className="bg-[#1565C0] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-gray-400 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


export function ThemeClassic({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border-2 border-black font-serif" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-black pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-black">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-black mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-black align-top p-0">
              <div className="bg-black text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-black text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-black text-white">
            <th className="p-1.5 border border-black font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-black text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-black text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-black text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black">
              <td className="p-1.5 border border-black align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-black text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-black align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-black align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-black text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-black align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-black text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-black border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-black align-top p-0">
              <div className="p-2 border-b border-black flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-black font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-black text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Black Bar */}
                  <tr className="bg-black text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-black mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


export function ThemeModernBlue({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-[#C5CAE9] font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-[#C5CAE9] pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#1A237E]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-[#C5CAE9] mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-[#C5CAE9] align-top p-0">
              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-[#C5CAE9] text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1A237E] text-white">
            <th className="p-1.5 border border-[#C5CAE9] font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-[#C5CAE9] text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-[#C5CAE9] font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-[#C5CAE9] font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-[#C5CAE9] text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-[#C5CAE9] font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-[#C5CAE9] text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={`border-b border-[#C5CAE9] ${idx % 2 === 1 ? 'bg-[#E8EAF6]/30' : 'bg-white'}`}>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-[#C5CAE9] text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-[#C5CAE9] text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-[#C5CAE9] text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-[#C5CAE9] border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-[#C5CAE9] align-top p-0">
              <div className="p-2 border-b border-[#C5CAE9] flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-2 py-0.5 border-b border-[#C5CAE9]">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-[#C5CAE9] font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-2 py-0.5 border-b border-[#C5CAE9]">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-[#C5CAE9] text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Indigo Bar */}
                  <tr className="bg-[#1A237E] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-[#C5CAE9] mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


export function ThemeMinimal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-5 text-[12px] leading-relaxed text-[#212121] border border-gray-200 font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-3 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide font-serif">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-4">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-gray-900 font-serif">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight font-serif">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-gray-200 mb-4 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-200 align-top p-0">
              <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-1 font-serif">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-gray-200 text-[11px] text-center border-collapse mb-4">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="p-1.5 border border-gray-200 font-bold font-serif" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-gray-200 text-left font-bold font-serif" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-200 font-bold font-serif" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-200 font-bold font-serif" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-gray-200 text-right font-bold font-serif" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-200 font-bold font-serif" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-gray-200 text-right font-bold font-serif" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="p-1.5 border border-gray-200 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-200 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-gray-200 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-gray-200 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-gray-200 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-gray-200 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-gray-200 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-gray-200 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-200 align-top p-0">
              <div className="p-2 border-b border-gray-200 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-200 font-serif">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-200 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-200 font-serif">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-100 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Gray-900 Bar */}
                  <tr className="bg-gray-900 text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-gray-200 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 6: Saffron (Indian Tricolor accent)
// Primary=#FF6F00, Secondary=#1B5E20
// ─────────────────────────────────────────────────────────────────
export function ThemeSaffron({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-gray-400 font-sans relative" style={{ boxSizing: 'border-box' }}>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
        <div className="text-[80px] font-bold text-gray-900 opacity-5 uppercase" style={{ transform: 'rotate(-35deg)' }}>
          HI-SECURE
        </div>
      </div>

      {/* Tricolor Stripe */}
      <div className="mb-1">
        <div className="h-[3px] bg-[#FF6F00]" />
        <div className="h-[3px] bg-white" />
        <div className="h-[3px] bg-[#1B5E20]" />
      </div>

      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-gray-100 pb-1" style={{ position: 'relative', zIndex: 1 }}>
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3" style={{ position: 'relative', zIndex: 1 }}>
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#FF6F00]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-[#1B5E20] mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-gray-400 mb-3 border-collapse" style={{ position: 'relative', zIndex: 1 }}>
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-400 align-top p-0">
              <div className="bg-[#FF6F00] text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold text-[#1B5E20] mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-gray-400 text-[11px] text-center border-collapse mb-3" style={{ position: 'relative', zIndex: 1 }}>
        <thead>
          <tr className="bg-[#1B5E20] text-white">
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-gray-400 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-400">
              <td className="p-1.5 border border-gray-400 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-400 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-gray-400 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-gray-400 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-gray-400 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-gray-400 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-gray-400 border-collapse mb-2 text-[11px]" style={{ position: 'relative', zIndex: 1 }}>
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-400 align-top p-0">
              <div className="p-2 border-b border-gray-400 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#FF6F00] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-400 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#FF6F00] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Saffron Bar */}
                  <tr className="bg-[#FF6F00] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-gray-400 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tricolor Stripe Bottom */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="h-[3px] bg-[#1B5E20]" />
        <div className="h-[3px] bg-white" />
        <div className="h-[3px] bg-[#FF6F00]" />
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 7: Tally (Accounting Style, Monospace, Black)
// ─────────────────────────────────────────────────────────────────
export function ThemeTally({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const fillerRows = Math.max(0, 4 - items.length);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border-2 border-black font-mono" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-black pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-black">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-black mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-black align-top p-0">
              <div className="bg-black text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
              <table className="w-full text-[11px] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="text-gray-500 py-0.5">Vch No.</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5 italic">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 py-0.5">Dated</td>
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

      {/* Items Table */}
      <table className="w-full border border-black text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-black text-white">
            <th className="p-1.5 border border-black font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-black text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-black text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-black font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-black text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-dashed border-black">
              <td className="p-1.5 border-l border-r border-black align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border-l border-r border-black text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border-l border-r border-black align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border-l border-r border-black align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border-l border-r border-black text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border-l border-r border-black align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border-l border-r border-black text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Filler rows for Tally-style appearance */}
          {Array.from({ length: fillerRows }).map((_, idx) => (
            <tr key={`filler-${idx}`} className="border-b border-dashed border-black">
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
              <td className="p-1.5 border-l border-r border-black">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-black border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-black align-top p-0">
              <div className="p-2 border-b border-black flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-black font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>

              {/* E. & O.E. */}
              <div className="p-2 border-t border-black text-[10px] font-bold text-gray-700">
                E. &amp; O.E.
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Black Bar */}
                  <tr className="bg-black text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-black mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 8: Emerald (Emerald Green)
// Primary=#0A5C36
// ─────────────────────────────────────────────────────────────────
export function ThemeEmerald({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-[#0A5C36]/20 font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#0A5C36]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-[#0A5C36] mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-[#0A5C36]/20 mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-[#0A5C36]/20 align-top p-0">
              <div className="bg-[#0A5C36] text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2 bg-emerald-50/20">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold text-[#0A5C36] mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-[#0A5C36]/20 text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#0A5C36] text-white">
            <th className="p-1.5 border border-[#0A5C36]/20 font-bold" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-[#0A5C36]/20 text-left font-bold" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-[#0A5C36]/20 font-bold" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-[#0A5C36]/20 font-bold" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-[#0A5C36]/20 text-right font-bold" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-[#0A5C36]/20 font-bold" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-[#0A5C36]/20 text-right font-bold" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={`border-b border-[#0A5C36]/20 ${idx % 2 !== 0 ? 'bg-emerald-50/20' : 'bg-white'}`}>
              <td className="p-1.5 border border-[#0A5C36]/20 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-[#0A5C36]/20 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-[#0A5C36]/20 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-[#0A5C36]/20 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-[#0A5C36]/20 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-[#0A5C36]/20 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-[#0A5C36]/20 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-[#0A5C36]/20 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-[#0A5C36]/20 align-top p-0">
              <div className="p-2 border-b border-[#0A5C36]/20 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#0A5C36] text-white text-[11px] font-bold px-2 py-0.5 border-b border-[#0A5C36]/20">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-[#0A5C36]/20 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#0A5C36] text-white text-[11px] font-bold px-2 py-0.5 border-b border-[#0A5C36]/20">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Emerald Bar */}
                  <tr className="bg-[#0A5C36] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-[#0A5C36]/20 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 9: Charcoal (Dark Slate Professional)
// Primary=#2C3E50
// ─────────────────────────────────────────────────────────────────
export function ThemeCharcoal({ company, invoice, customer, items, summary, logoSize, upiPaymentId }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, { width: 150, margin: 1 }, (err, url) => {
        if (!err) {
          setQrUrl(url);
        }
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  return (
    <div className="def-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-gray-300 font-sans" style={{ boxSizing: 'border-box' }}>
      
      {/* Top Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-2 border-b border-gray-100 pb-1">
        <div className="font-bold uppercase tracking-wide">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Main Corporate Header (Logo Left, Company Info Right) */}
      <table className="w-full mb-3">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`def-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="def-logo-text text-[18px] font-bold text-[#2C3E50]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-gray-900 uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-650 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-650">{company.phone && `Contact : ${company.phone}`}</div>
              <div className="text-[11px] text-gray-650">
                {company.email && `Email : ${company.email}`}
                {company.website && ` · Website : ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-gray-900 mt-1">GSTIN : {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bill To & Invoice Info splitted block */}
      <table className="w-full border border-gray-300 mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r border-gray-300 align-top p-0">
              <div className="bg-[#2C3E50] text-white text-[11px] font-bold px-2 py-1">Bill To :</div>
              <div className="p-2 bg-gray-100">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-650 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-650 mt-2">
                  {customer.phone && `Contact: ${customer.phone}`}
                  {customer.state && ` · PoS : ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
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

      {/* Items Table */}
      <table className="w-full border border-gray-300 text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#2C3E50] text-white">
            <th className="p-1.5 border border-gray-300 font-bold uppercase text-[9px] tracking-wider" style={{ width: '6%' }}>S.No.</th>
            <th className="p-1.5 border border-gray-300 text-left font-bold uppercase text-[9px] tracking-wider" style={{ width: '44%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-300 font-bold uppercase text-[9px] tracking-wider" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-300 font-bold uppercase text-[9px] tracking-wider" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border border-gray-300 text-right font-bold uppercase text-[9px] tracking-wider" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-300 font-bold uppercase text-[9px] tracking-wider" style={{ width: '8%' }}>GST</th>
            <th className="p-1.5 border border-gray-300 text-right font-bold uppercase text-[9px] tracking-wider" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300">
              <td className="p-1.5 border border-gray-300 align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-300 text-left align-middle font-bold text-gray-900">
                {item.description}
                {item.model && <span className="font-normal text-gray-500 block text-[9px]">Model: {item.model}</span>}
              </td>
              <td className="p-1.5 border border-gray-300 align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-gray-300 align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-gray-300 text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-gray-300 align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1.5 border border-gray-300 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Split Section */}
      <table className="w-full border border-gray-300 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-300 align-top p-0">
              <div className="p-2 border-b border-gray-300 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>
              
              <div className="bg-[#2C3E50] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-300">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-300 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              <div className="bg-[#2C3E50] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-300">
                Terms / Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-650 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code Container */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border border-gray-200 rounded bg-white shadow-sm self-center mr-2">
                    <img 
                      src={qrUrl} 
                      alt="UPI QR Code" 
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-1.5 text-gray-600">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-200">
                      <td className="p-1.5 text-gray-600">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* Total Solid Charcoal Bar */}
                  <tr className="bg-[#2C3E50] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-2 border-t border-gray-300 mt-6 text-right">
                <div className="text-[10px] text-gray-500">For <span className="font-bold text-gray-800">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-gray-700 text-center border-t border-gray-200 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

