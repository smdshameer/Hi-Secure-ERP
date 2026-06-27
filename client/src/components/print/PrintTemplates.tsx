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

// ─────────────────────────────────────────────────────────────────
// THEME 2: HiSecure Classic (Standard Corporate Blue #1565C0)
// ─────────────────────────────────────────────────────────────────
export function ThemeHiSecure({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="hs-wrap p-4 text-[12px] leading-relaxed text-[#212121]">
      <table className="hs-topbar w-full border-b border-gray-300 mb-2">
        <tbody>
          <tr>
            <td className="hs-topbar-center text-center font-bold text-[14px] text-gray-800 py-1">{invoice.title || 'TAX INVOICE'}</td>
            <td className="hs-topbar-right text-right text-[10px] text-gray-500 py-1">{invoice.copy_type || 'Original for Recipient'}</td>
          </tr>
        </tbody>
      </table>

      <table className="hs-header w-full mb-3">
        <tbody>
          <tr>
            <td className="hs-logo-cell w-[38%] valign-middle">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`hs-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="hs-logo-text text-[18px] font-bold text-[#1565C0]">{company.name}</div>
              ) : null}
            </td>
            <td className="hs-company-cell w-[62%] text-right align-top">
              <div className="hs-company-name text-[16px] font-bold text-gray-900">{company.name}</div>
              <div className="hs-company-addr text-[11px] text-gray-600 leading-normal">{company.address}</div>
              {company.phone && <div className="hs-company-addr text-[11px] text-gray-600">Contact: {company.phone}</div>}
              {company.email && <div className="hs-company-addr text-[11px] text-gray-600">Email: {company.email}</div>}
              {company.gstin && <div className="hs-gstin text-[11px] font-bold mt-1 text-gray-900">GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="hs-billrow w-full border border-gray-300 mb-3">
        <tbody>
          <tr>
            <td className="hs-billto-cell w-[62%] border-r border-gray-300 p-2 align-top">
              <div className="hs-section-bar bg-[#1565C0] text-white text-[11px] font-bold px-2 py-1 mb-1.5 rounded">Bill To:</div>
              <div className="hs-customer-name text-[13px] font-bold text-gray-900">{customer.name}</div>
              <div className="hs-customer-addr text-[11px] text-gray-600">{customer.address}</div>
              {customer.gstin && <div className="hs-customer-meta text-[11px] font-semibold mt-1">GSTIN: {customer.gstin}</div>}
              <div className="hs-customer-meta text-[11px] text-gray-500">
                {customer.phone && `Contact: ${customer.phone}`}
                {invoice.place_of_supply && ` · PoS: ${invoice.place_of_supply}`}
              </div>
            </td>
            <td className="hs-invdetail-cell w-[38%] p-2 align-top">
              <table className="hs-invmeta w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="text-gray-500 py-0.5">Invoice No.</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 py-0.5">Date</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-gray-900 py-0.5">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="text-gray-500 py-0.5">Due Date</td>
                      <td className="text-gray-400 py-0.5 px-1">:</td>
                      <td className="font-bold text-gray-900 py-0.5">{invoice.due_date}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-gray-500 py-0.5">Place of Supply</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="text-gray-900 py-0.5">{invoice.place_of_supply || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="hs-items w-full border border-gray-300 mb-3 text-[11px] text-center border-collapse">
        <thead>
          <tr className="hs-items-head bg-[#1565C0] text-white">
            <th className="p-2 border border-gray-300" style={{ width: '5%' }}>S.No</th>
            <th className="p-2 border border-gray-300 text-left" style={{ width: '40%' }}>PRODUCT / SERVICE NAME</th>
            <th className="p-2 border border-gray-300" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="p-2 border border-gray-300" style={{ width: '8%' }}>QTY</th>
            <th className="p-2 border border-gray-300" style={{ width: '8%' }}>UNIT</th>
            <th className="p-2 border border-gray-300 text-right" style={{ width: '12%' }}>UNIT PRICE</th>
            <th className="p-2 border border-gray-300" style={{ width: '8%' }}>GST%</th>
            <th className="p-2 border border-gray-300 text-right" style={{ width: '12%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="hs-item-row border-b border-gray-200">
              <td className="p-2 border-r border-gray-300">{item.sr || (idx + 1)}</td>
              <td className="p-2 border-r border-gray-300 text-left">
                <div className="font-bold text-gray-900">{item.description}</div>
                {item.model && <div className="text-[9px] text-gray-500">Model: {item.model}</div>}
              </td>
              <td className="p-2 border-r border-gray-300">{item.hsn_sac || '-'}</td>
              <td className="p-2 border-r border-gray-300 font-semibold">{item.qty}</td>
              <td className="p-2 border-r border-gray-300">{item.unit || 'NOS'}</td>
              <td className="p-2 border-r border-gray-300 text-right font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-2 border-r border-gray-300">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-2 text-right font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="hs-summary-row w-full border border-gray-300 text-[11px] mb-3">
        <tbody>
          <tr>
            <td className="hs-delivery-cell w-[58%] border-r border-gray-300 p-2 align-top text-gray-600">
              <span className="font-bold text-gray-800">Delivery Terms:</span> Immediate
              <span className="float-right font-bold text-gray-800">Total Qty: {totalQty}</span>
            </td>
            <td className="hs-subtotal-cell w-[42%] p-2 align-top">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="text-gray-500 py-0.5">Sub Total</td>
                    <td className="text-right text-gray-900 py-0.5 font-mono">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-100">
                        <td className="text-gray-500 py-0.5">CGST Total</td>
                        <td className="text-right text-gray-900 py-0.5 font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="text-gray-500 py-0.5">SGST Total</td>
                        <td className="text-right text-gray-900 py-0.5 font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td className="text-gray-500 py-0.5">IGST Total</td>
                      <td className="text-right text-gray-900 py-0.5 font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="text-gray-500 py-0.5">Round Off</td>
                    <td className="text-right text-gray-900 py-0.5 font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-[13px] text-[#1565C0]">
                    <td className="py-1">Grand Total</td>
                    <td className="text-right py-1 font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="hs-words-row w-full border border-gray-300 text-[11px] mb-3">
        <tbody>
          <tr>
            <td className="hs-words-cell w-[58%] border-r border-gray-300 p-2 align-top">
              <div className="font-bold text-gray-700 uppercase text-[9px] mb-1">Amount in Words:</div>
              <div className="font-semibold text-gray-900">{summary.amount_in_words}</div>
            </td>
            <td className="hs-bank-cell w-[42%] p-2 align-top text-gray-600 text-[10px]">
              <div className="font-bold text-gray-800 uppercase text-[9px] mb-1">Bank Account:</div>
              {company.bank_name && (
                <>
                  <div>Bank: {company.bank_name}</div>
                  <div>A/c: {company.bank_account}</div>
                  <div>IFSC: {company.ifsc_code}</div>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="hs-footer-bottom flex justify-between items-end border-t border-gray-200 pt-4 mt-6">
        <div className="text-[10px] text-gray-400 italic">
          This is a computer-generated tax invoice. No signature required.
        </div>
        <div className="text-right w-[180px]">
          <div className="text-[11px] text-gray-600">For, <span className="font-bold text-gray-900">{company.name}</span></div>
          <div className="h-[30px]" />
          <div className="border-t border-gray-300 pt-1 text-[9px] uppercase tracking-wider font-semibold text-gray-500 text-center">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 3: Classic (Elegant B&W Serif Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeClassic({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="cl-wrap p-4 text-[12px] leading-relaxed text-[#111] font-serif">
      <table className="cl-topbar w-full mb-3">
        <tbody>
          <tr>
            <td className="w-1/2 align-bottom">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
                <img 
                  src={company.logo_url} 
                  className={`cl-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                  alt="logo" 
                />
              )}
            </td>
            <td className="w-1/2 text-right align-middle">
              <div className="cl-title text-[20px] font-bold tracking-widest">{invoice.title || 'TAX INVOICE'}</div>
              <div className="text-[10px] text-gray-500 italic mt-0.5">{invoice.copy_type || 'Original Copy'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-t border-b border-black py-2 mb-3">
        <tbody>
          <tr>
            <td className="w-2/3 align-top">
              <div className="text-[15px] font-bold uppercase tracking-wider">{company.name}</div>
              <div className="text-[11px] mt-0.5 max-w-md">{company.address}</div>
              <div className="text-[11px]">Ph: {company.phone} · Email: {company.email}</div>
              {company.gstin && <div className="text-[11px] font-bold mt-1">GSTIN: {company.gstin}</div>}
            </td>
            <td className="w-1/3 text-right align-top text-[11px]">
              <div><span className="font-semibold">Invoice No:</span> {invoice.number}</div>
              <div><span className="font-semibold">Date:</span> {invoice.date}</div>
              {invoice.due_date && <div><span className="font-semibold">Due Date:</span> {invoice.due_date}</div>}
              {invoice.place_of_supply && <div><span className="font-semibold">PoS:</span> {invoice.place_of_supply}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full mb-3 text-[11px]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="font-bold border-b border-gray-300 pb-1 mb-1 text-[12px] uppercase tracking-wide">Customer Details</div>
              <div className="font-bold text-[13px] text-gray-900">{customer.name}</div>
              <div className="text-gray-700">{customer.address}</div>
              {customer.phone && <div className="mt-0.5">Ph: {customer.phone}</div>}
              {customer.gstin && <div className="font-semibold mt-1">GSTIN: {customer.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="cl-items w-full border border-black text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-gray-100 font-bold border-b border-black">
            <th className="p-1.5 border-r border-black" style={{ width: '6%' }}>S.No</th>
            <th className="p-1.5 border-r border-black text-left" style={{ width: '44%' }}>DESCRIPTION OF GOODS</th>
            <th className="p-1.5 border-r border-black" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="p-1.5 border-r border-black" style={{ width: '8%' }}>QTY</th>
            <th className="p-1.5 border-r border-black text-right" style={{ width: '15%' }}>RATE</th>
            <th className="p-1.5 text-right" style={{ width: '15%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black">
              <td className="p-1.5 border-r border-black">{idx + 1}</td>
              <td className="p-1.5 border-r border-black text-left font-bold">{item.description}</td>
              <td className="p-1.5 border-r border-black">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border-r border-black">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border-r border-black text-right">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 text-right font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full text-[11px] border border-black mb-3">
        <tbody>
          <tr>
            <td className="w-[60%] border-r border-black p-2 align-top">
              <div className="font-bold text-[9px] uppercase tracking-wide">Amount in Words:</div>
              <div className="font-bold text-gray-800 mt-1">{summary.amount_in_words}</div>
            </td>
            <td className="w-[40%] p-2 align-top">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td className="text-right">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td>GST Taxes</td>
                    <td className="text-right">₹{(summary.cgst_total + summary.sgst_total + summary.igst_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {summary.round_off !== 0 && (
                    <tr>
                      <td>Round Off</td>
                      <td className="text-right">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-black text-[13px]">
                    <td className="pt-1">Total</td>
                    <td className="text-right pt-1">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 4: Modern Blue (Professional alternating row styling #1A237E)
// ─────────────────────────────────────────────────────────────────
export function ThemeModernBlue({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="mb-wrap p-4 text-[12px] leading-relaxed text-[#1a1a2e]">
      <table className="mb-header w-full mb-2">
        <tbody>
          <tr>
            <td className="mb-logo-cell w-[38%] align-middle">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  className={`mb-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`} 
                  alt="logo" 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="text-[18px] font-bold text-[#1a237e]">{company.name}</div>
              ) : null}
            </td>
            <td className="mb-co-cell w-[62%] text-right align-top">
              <div className="mb-co-name text-[16px] font-bold text-[#1a237e]">{company.name}</div>
              <div className="mb-co-addr text-[11px] text-gray-500 mt-1">{company.address}</div>
              <div className="mb-co-addr text-[11px] text-gray-500">Contact: {company.phone} · Email: {company.email}</div>
              {company.gstin && <div className="text-[11px] font-bold text-[#1a237e] mt-1">GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-divider h-[2px] bg-[#1a237e] mb-3" />

      <table className="w-full mb-3 text-[11px]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="bg-[#1a237e]/5 text-[#1a237e] font-bold uppercase tracking-wider px-2 py-1 mb-1.5 rounded">Billed To</div>
              <div className="font-bold text-[13px] text-gray-900">{customer.name}</div>
              <div className="text-gray-650">{customer.address}</div>
              {customer.gstin && <div className="font-bold mt-1 text-[#1a237e]">GSTIN: {customer.gstin}</div>}
            </td>
            <td className="w-1/2 text-right align-top">
              <div className="bg-[#1a237e]/5 text-[#1a237e] font-bold uppercase tracking-wider px-2 py-1 mb-1.5 rounded">Invoice Details</div>
              <div><span className="font-semibold">Invoice No:</span> {invoice.number}</div>
              <div><span className="font-semibold">Date:</span> {invoice.date}</div>
              {invoice.place_of_supply && <div><span className="font-semibold">Place of Supply:</span> {invoice.place_of_supply}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1a237e] text-white font-semibold">
            <th className="p-2 text-left" style={{ width: '45%' }}>PARTICULARS</th>
            <th style={{ width: '12%' }}>HSN</th>
            <th style={{ width: '8%' }}>QTY</th>
            <th className="text-right" style={{ width: '15%' }}>RATE</th>
            <th className="text-right" style={{ width: '20%' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={`border-b border-gray-150 ${idx % 2 === 0 ? 'bg-[#1a237e]/2' : 'bg-white'}`}>
              <td className="p-2 text-left font-bold text-gray-900">{item.description}</td>
              <td>{item.hsn_sac || '-'}</td>
              <td>{item.qty}</td>
              <td className="text-right font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="text-right font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full text-[11px] mt-4">
        <tbody>
          <tr>
            <td className="w-3/5 align-top">
              <div className="font-bold text-[#1a237e] uppercase text-[9px]">Amount in Words:</div>
              <div className="font-bold text-gray-900 mt-1">{summary.amount_in_words}</div>
            </td>
            <td className="w-2/5 align-top bg-[#1a237e]/5 rounded p-3">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-0.5 text-gray-500">Taxable Total</td>
                    <td className="text-right py-0.5 font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-b border-gray-200 pb-1">
                    <td className="py-0.5 text-gray-500">Taxes</td>
                    <td className="text-right py-0.5">₹{(summary.cgst_total + summary.sgst_total + summary.igst_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold text-[14px] text-[#1a237e]">
                    <td className="pt-2">Grand Total</td>
                    <td className="text-right pt-2 font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 5: Minimalist (Clean Typographic Georgia Serif)
// ─────────────────────────────────────────────────────────────────
export function ThemeMinimal({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="mn-wrap p-5 text-[12px] leading-relaxed text-[#222] font-serif">
      <table className="mn-header w-full mb-4">
        <tbody>
          <tr>
            <td className="mn-logo-cell w-[50%] align-middle">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  className={`mn-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[35px] max-w-[110px]' : (logoSize || 'medium') === 'large' ? 'max-h-[80px] max-w-[200px]' : 'max-h-[55px] max-w-[150px]'}`} 
                  alt="logo" 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="mn-co-name-big text-[20px] font-bold text-gray-900">{company.name}</div>
              ) : null}
            </td>
            <td className="mn-title-cell w-[50%] text-right align-middle">
              <div className="mn-invoice-word text-[24px] font-light text-gray-400 tracking-widest uppercase">{invoice.title || 'Invoice'}</div>
              <div className="text-[11px] text-gray-500 mt-1">Invoice: {invoice.number} · Date: {invoice.date}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-gray-200 my-4" />

      <table className="w-full mb-4 text-[11px] font-sans">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Company Details</div>
              <div className="font-bold text-gray-900 text-[12px]">{company.name}</div>
              <div className="text-gray-500 max-w-sm">{company.address}</div>
              {company.gstin && <div className="text-gray-700 mt-1">GSTIN: {company.gstin}</div>}
            </td>
            <td className="w-1/2 align-top">
              <div className="text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Billed To</div>
              <div className="font-bold text-gray-900 text-[12px]">{customer.name}</div>
              <div className="text-gray-500 max-w-sm">{customer.address}</div>
              {customer.gstin && <div className="text-gray-700 mt-1">GSTIN: {customer.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-[11px] border-collapse mb-4 font-sans text-left">
        <thead>
          <tr className="border-b-2 border-gray-300 text-[9px] uppercase tracking-wider text-gray-500 font-bold">
            <th className="py-2" style={{ width: '50%' }}>Description</th>
            <th className="py-2" style={{ width: '10%' }}>HSN</th>
            <th className="py-2 text-center" style={{ width: '10%' }}>Qty</th>
            <th className="py-2 text-right" style={{ width: '15%' }}>Rate</th>
            <th className="py-2 text-right" style={{ width: '15%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-3 font-semibold text-gray-900">{item.description}</td>
              <td className="py-3 text-gray-500">{item.hsn_sac || '-'}</td>
              <td className="py-3 text-center">{item.qty}</td>
              <td className="py-3 text-right">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="py-3 text-right font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-start mt-6 font-sans">
        <div className="w-[50%] text-[10px] text-gray-500">
          <div className="font-bold text-gray-400 uppercase text-[8px] mb-1">Declaration</div>
          <div>All goods sold are subject to standard manufacturers policies and warranties.</div>
        </div>
        <div className="w-[40%] text-right text-[11px]">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-bold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-500">Tax</span>
            <span>₹{(summary.cgst_total + summary.sgst_total + summary.igst_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-gray-900 text-[14px]">
            <span>Net Total</span>
            <span>₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 6: Professional Saffron (Patriotic tricolor style #FF6F00 / #1B5E20)
// ─────────────────────────────────────────────────────────────────
export function ThemeSaffron({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="sf-wrap p-4 text-[12px] leading-relaxed text-[#212121] relative">
      {/* Watermark */}
      <div 
        className="sf-watermark absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] -rotate-[35deg] text-[64px] font-bold text-[#FF6F00]/5 pointer-events-none select-none tracking-widest uppercase z-0 font-sans"
      >
        HI-SECURE
      </div>

      <div className="sf-tricolor flex flex-col mb-2 rounded-t overflow-hidden">
        <div className="sf-stripe-saffron h-[4px] bg-[#FF6F00]" />
        <div className="sf-stripe-white h-[2px] bg-white border-t border-b border-gray-150" />
        <div className="sf-stripe-green h-[4px] bg-[#1B5E20]" />
      </div>

      <table className="sf-header w-full border-b border-[#FF6F00] pb-2 mb-2">
        <tbody>
          <tr>
            <td className="sf-logo-td w-[30%]">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img 
                  src={company.logo_url} 
                  className={`sf-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[110px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[200px]' : 'max-h-[55px] max-w-[150px]'}`} 
                  alt="logo" 
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="text-[18px] font-bold text-[#FF6F00]">{company.name}</div>
              ) : null}
            </td>
            <td className="sf-co-td w-[70%] text-right">
              <div className="sf-co-name text-[16px] font-bold text-[#FF6F00] uppercase tracking-wide">{company.name}</div>
              <div className="sf-co-addr text-[11px] text-gray-700 leading-normal">{company.address}</div>
              <div className="sf-co-addr text-[11px] text-gray-700">Contact: {company.phone} · Email: {company.email}</div>
              {company.gstin && <div className="sf-gstin text-[11px] font-bold mt-0.5 text-[#1B5E20]">GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sf-invoice-divider text-center font-bold text-[12px] text-[#1B5E20] border-t border-b border-[#FF6F00] py-1.5 my-2 tracking-widest uppercase">
        {invoice.title || 'TAX INVOICE'}
      </div>

      <table className="sf-billrow w-full border border-gray-300 mb-3">
        <tbody>
          <tr>
            <td className="sf-billto w-[62%] border-r border-gray-300 align-top p-2">
              <div className="sf-saffron-bar bg-[#FF6F00] text-white text-[11px] font-bold px-2 py-0.5 mb-1.5 rounded">Bill To (Buyer):</div>
              <div className="sf-cust-name text-[13px] font-bold text-gray-900">{customer.name}</div>
              <div className="sf-cust-addr text-[11px] text-gray-700">{customer.address}</div>
              {customer.gstin && <div className="sf-cust-meta text-[11px] font-semibold mt-1">GSTIN: {customer.gstin}</div>}
              <div className="sf-cust-meta text-[11px] text-gray-500">
                {customer.phone && `Contact: ${customer.phone}`}
                {invoice.place_of_supply && ` · PoS: ${invoice.place_of_supply}`}
              </div>
            </td>
            <td className="sf-invmeta w-[38%] p-2 align-top text-[11px]">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="sf-ml text-gray-500 py-0.5">Invoice No.</td>
                    <td className="sf-mc text-gray-400 py-0.5 px-1">:</td>
                    <td className="sf-mv font-bold text-gray-900 py-0.5">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="sf-ml text-gray-500 py-0.5">Date</td>
                    <td className="sf-mc text-gray-400 py-0.5 px-1">:</td>
                    <td className="sf-mv font-bold text-gray-900 py-0.5">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="sf-ml text-gray-500 py-0.5">Due Date</td>
                      <td className="sf-mc text-gray-400 py-0.5 px-1">:</td>
                      <td className="sf-mv font-bold text-gray-900 py-0.5">{invoice.due_date}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="sf-ml text-gray-500 py-0.5">Place of Supply</td>
                    <td className="sf-mc text-gray-400 py-0.5 px-1">:</td>
                    <td className="sf-mv text-gray-900 py-0.5">{invoice.place_of_supply || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="sf-items w-full border border-gray-300 text-[11px] text-center border-collapse mb-3 relative z-10">
        <thead>
          <tr className="sf-thead bg-[#1B5E20] text-white">
            <th className="p-2 border border-gray-300 w-[5%]">S.No</th>
            <th className="p-2 border border-gray-300 text-left w-[40%]">Description of Parts/Services</th>
            <th className="p-2 border border-gray-300 w-[10%]">HSN/SAC</th>
            <th className="p-2 border border-gray-300 w-[8%]">Qty</th>
            <th className="p-2 border border-gray-300 w-[8%]">Unit</th>
            <th className="p-2 border border-gray-300 text-right w-[12%]">Rate (₹)</th>
            <th className="p-2 border border-gray-300 w-[8%]">GST %</th>
            <th className="p-2 border border-gray-300 text-right w-[12%]">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="sf-row border-b border-gray-300">
              <td className="p-2 border-r border-gray-300">{item.sr || (idx + 1)}</td>
              <td className="p-2 border-r border-gray-300 text-left">
                <div className="font-bold text-gray-900">{item.description}</div>
                {item.model && <div className="text-[9px] text-gray-500">Model: {item.model}</div>}
              </td>
              <td className="p-2 border-r border-gray-300">{item.hsn_sac || '-'}</td>
              <td className="p-2 border-r border-gray-300 font-semibold">{item.qty}</td>
              <td className="p-2 border-r border-gray-300">{item.unit || 'NOS'}</td>
              <td className="p-2 border-r border-gray-300 text-right font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-2 border-r border-gray-300">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-2 text-right font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="sf-summary w-full border border-gray-300 text-[11px] mb-3">
        <tbody>
          <tr>
            <td className="sf-del w-[58%] border-r border-gray-300 p-2 align-top text-gray-600">
              <span className="font-bold text-gray-800">Total Quantity: {totalQty} NOS</span>
            </td>
            <td className="sf-subtotals w-[42%] p-2 align-top">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="sf-sl text-gray-500 py-0.5">Sub Total</td>
                    <td className="sf-sv text-right py-0.5 font-mono">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr>
                        <td className="sf-sl text-gray-500 py-0.5">CGST Total</td>
                        <td className="sf-sv text-right py-0.5 font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="sf-sl text-gray-500 py-0.5">SGST Total</td>
                        <td className="sf-sv text-right py-0.5 font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="sf-sl text-gray-500 py-0.5">IGST Total</td>
                      <td className="sf-sv text-right py-0.5 font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="sf-sl text-gray-500 py-0.5">Round Off</td>
                    <td className="sf-sv text-right py-0.5 font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="sf-grand font-bold text-[13px] bg-[#FFF3E0] text-[#E65100] border-t-2 border-[#FF6F00]">
                    <td className="py-1 px-1">Grand Total</td>
                    <td className="text-right py-1 px-1 font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="sf-words border border-gray-300 p-2 text-[11px] mb-3">
        <div className="text-[10px] text-gray-500 font-semibold uppercase">Amount in Words:</div>
        <div className="font-bold text-gray-900">{summary.amount_in_words}</div>
      </div>

      <table className="sf-footer w-full border border-gray-300 text-[11px] mb-3">
        <tbody>
          <tr>
            <td className="sf-terms-cell w-[58%] border-r border-gray-300 p-2 align-top">
              <div className="sf-foot-bar font-bold text-[#1B5E20] uppercase text-[9px] mb-1">Terms & Conditions:</div>
              <div className="sf-terms-text text-[10px] text-gray-650 leading-normal">
                1. Warranty claims as per manufacturer policies only.<br />
                2. Immediate payment required on delivery.
              </div>
            </td>
            <td className="sf-pay-cell w-[42%] p-2 align-top">
              <div className="sf-foot-bar font-bold text-[#1B5E20] uppercase text-[9px] mb-1">Bank Transfer Info:</div>
              <table className="w-full text-[10px]">
                <tbody>
                  {company.bank_name && (
                    <>
                      <tr><td className="text-gray-500 py-0.5">Bank</td><td className="font-semibold text-right">{company.bank_name}</td></tr>
                      <tr><td className="text-gray-500 py-0.5">Account</td><td className="font-bold text-right font-mono">{company.bank_account}</td></tr>
                      <tr><td className="text-gray-500 py-0.5">IFSC</td><td className="font-bold text-right font-mono">{company.ifsc_code}</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-6">
        <div className="text-[9px] text-gray-400 italic">
          Computer generated tax invoice. No signature required.
        </div>
        <div className="text-right w-[180px] sf-signatory border-t border-gray-300 pt-1">
          <div className="sf-sign-blank h-[25px]" />
          <div className="sf-sign-label text-[10px] text-gray-500">For, <span className="sf-sign-co font-bold text-[#1B5E20]">{company.name}</span></div>
          <div className="text-[9px] uppercase tracking-wider font-bold text-gray-650 text-center">
            Authorized Signatory
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 7: Tally Monospace (Exact Monospace Tally Style)
// ─────────────────────────────────────────────────────────────────
export function ThemeTally({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="tally-wrap p-4 text-[11px] leading-normal text-black border-2 border-black font-mono" style={{ boxSizing: 'border-box' }}>
      <div className="text-center font-bold text-[14px] border-b border-black pb-1 uppercase">{invoice.title || 'TAX INVOICE'}</div>
      
      {/* Header Grid */}
      <table className="w-full border-b border-black">
        <tbody>
          <tr>
            <td className="w-1/2 border-r border-black p-1.5 align-top">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className={`mb-2 object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[30px]' : (logoSize || 'medium') === 'large' ? 'max-h-[60px]' : 'max-h-[45px]'}`} 
                />
              )}
              <div className="font-bold text-[13px]">{company.name}</div>
              <div>{company.address}</div>
              <div>Contact: {company.phone}</div>
              <div>Email: {company.email}</div>
              <div className="font-bold mt-1">GSTIN: {company.gstin}</div>
            </td>
            <td className="w-1/2 p-1.5 align-top">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="py-0.5">Invoice No:</td>
                    <td className="font-bold py-0.5">{invoice.number}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-0.5">Dated:</td>
                    <td className="font-bold py-0.5">{invoice.date}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Place of Supply:</td>
                    <td className="py-0.5">{invoice.place_of_supply || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Destination:</td>
                    <td className="py-0.5">{customer.state || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Buyer info */}
      <table className="w-full border-b border-black">
        <tbody>
          <tr>
            <td className="p-1.5 align-top">
              <div className="italic text-[10px]">Buyer (Bill to):</div>
              <div className="font-bold text-[12px]">{customer.name}</div>
              <div className="whitespace-pre-line">{customer.address || 'N/A'}</div>
              <div>GSTIN/UIN: <span className="font-bold">{customer.gstin || 'N/A'}</span></div>
              <div>State: {customer.state || 'N/A'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tally Table */}
      <table className="w-full border-collapse border-b border-black">
        <thead>
          <tr className="border-b border-black font-bold text-center">
            <th className="border-r border-black p-1" style={{ width: '5%' }}>Sl No.</th>
            <th className="border-r border-black p-1 text-left" style={{ width: '45%' }}>Description of Goods</th>
            <th className="border-r border-black p-1" style={{ width: '12%' }}>HSN/SAC</th>
            <th className="border-r border-black p-1" style={{ width: '10%' }}>Quantity</th>
            <th className="border-r border-black p-1 text-right" style={{ width: '12%' }}>Rate</th>
            <th className="border-r border-black p-1" style={{ width: '6%' }}>per</th>
            <th className="p-1 text-right" style={{ width: '10%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black border-dashed">
              <td className="border-r border-black p-1 text-center align-top">{idx + 1}</td>
              <td className="border-r border-black p-1 align-top">
                <div className="font-bold">{item.description}</div>
                {item.model && <div className="text-[9px]">Model: {item.model}</div>}
              </td>
              <td className="border-r border-black p-1 text-center align-top">{item.hsn_sac || 'N/A'}</td>
              <td className="border-r border-black p-1 text-center align-top font-bold">{item.qty}</td>
              <td className="border-r border-black p-1 text-right align-top font-bold">{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-center align-top">{item.unit || 'NOS'}</td>
              <td className="p-1 text-right align-top font-bold">{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Empty rows to stretch table height in tally style */}
          {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
            <tr key={i} className="h-[25px]">
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="p-1" />
            </tr>
          ))}
          {/* Subtotal row */}
          <tr className="border-t border-black font-bold">
            <td className="border-r border-black p-1" />
            <td className="border-r border-black p-1 text-right">Total</td>
            <td className="border-r border-black p-1" />
            <td className="border-r border-black p-1 text-center">{totalQty} NOS</td>
            <td className="border-r border-black p-1" />
            <td className="border-r border-black p-1" />
            <td className="p-1 text-right font-bold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      {/* Tally Taxes & Signatures */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-3/5 border-r border-black p-1.5 align-top">
              <div className="font-bold uppercase text-[9px] mb-1">Amount Chargeable (in words):</div>
              <div className="font-bold text-[10px]">{summary.amount_in_words}</div>
              
              <div className="mt-3 border-t border-black border-dashed pt-2">
                <div className="font-bold text-[9px] uppercase">Declaration:</div>
                <div className="text-[9px] leading-tight">
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </div>
            </td>
            <td className="w-2/5 p-1.5 align-top">
              <table className="w-full text-[10px] leading-tight">
                <tbody>
                  {!invoice.is_interstate ? (
                    <>
                      <tr>
                        <td className="py-0.5">CGST</td>
                        <td className="text-right font-bold py-0.5">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5">SGST</td>
                        <td className="text-right font-bold py-0.5">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="py-0.5">IGST</td>
                      <td className="text-right font-bold py-0.5">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-0.5">Round Off:</td>
                    <td className="text-right font-bold py-0.5">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-t border-black font-bold text-[12px]">
                    <td className="py-1">Total:</td>
                    <td className="text-right py-1">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature */}
      <table className="w-full border-t border-black">
        <tbody>
          <tr>
            <td className="p-1.5 w-1/2 align-top text-[8px] italic">
              E. & O.E.
            </td>
            <td className="p-1.5 w-1/2 align-top text-right">
              <div>For {company.name}</div>
              <div className="h-[40px]" />
              <div className="font-bold">Authorized Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 8: Emerald Corporate Green
// ─────────────────────────────────────────────────────────────────
export function ThemeEmerald({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="eme-wrap p-4 text-[12px] leading-relaxed text-[#1b3d2f] font-sans" style={{ boxSizing: 'border-box' }}>
      {/* Header bar in emerald */}
      <div className="bg-[#0A5C36] text-white flex justify-between p-3 rounded-t-lg">
        <div>
          {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
            <img 
              src={company.logo_url} 
              className="max-h-[40px] mb-1.5 object-contain" 
              alt="logo" 
            />
          )}
          <div className="text-[20px] font-bold uppercase tracking-wider">{company.name}</div>
          <div className="text-[10px] text-emerald-100">{company.address}</div>
        </div>
        <div className="text-right">
          <div className="text-[14px] font-bold tracking-widest">{invoice.title || 'TAX INVOICE'}</div>
          <div className="text-[10px] text-emerald-100 mt-1">Invoice: {invoice.number}</div>
          <div className="text-[10px] text-emerald-100">Date: {invoice.date}</div>
        </div>
      </div>
      
      {/* Details table */}
      <table className="w-full border-l border-r border-[#0A5C36]/20 p-3 bg-emerald-50/20">
        <tbody>
          <tr>
            <td className="p-2 w-1/2 align-top">
              <div className="text-[10px] font-bold text-[#0A5C36] uppercase tracking-wider">Customer Details</div>
              <div className="font-bold text-[13px] mt-1">{customer.name}</div>
              <div className="text-gray-650">{customer.address}</div>
              {customer.gstin && <div className="font-bold mt-1 text-[#0A5C36]">GSTIN: {customer.gstin}</div>}
            </td>
            <td className="p-2 w-1/2 align-top text-right">
              {invoice.due_date && <div><span className="font-semibold">Due Date:</span> {invoice.due_date}</div>}
              {company.gstin && <div><span className="font-semibold">Our GSTIN:</span> {company.gstin}</div>}
              {company.phone && <div><span className="font-semibold">Ph:</span> {company.phone}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table className="w-full text-[11px] text-center border border-[#0A5C36]/20 border-collapse">
        <thead>
          <tr className="bg-[#0A5C36]/10 text-[#0A5C36] font-bold">
            <th className="p-2 border border-[#0A5C36]/20">S.No.</th>
            <th className="p-2 border border-[#0A5C36]/20 text-left">Item Description</th>
            <th className="p-2 border border-[#0A5C36]/20">HSN</th>
            <th className="p-2 border border-[#0A5C36]/20">Qty</th>
            <th className="p-2 border border-[#0A5C36]/20 text-right">Rate</th>
            <th className="p-2 border border-[#0A5C36]/20 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-[#0A5C36]/10 hover:bg-emerald-50/10">
              <td className="p-2 border border-[#0A5C36]/20">{idx + 1}</td>
              <td className="p-2 border border-[#0A5C36]/20 text-left font-bold">{item.description}</td>
              <td className="p-2 border border-[#0A5C36]/20">{item.hsn_sac || '-'}</td>
              <td className="p-2 border border-[#0A5C36]/20">{item.qty} NOS</td>
              <td className="p-2 border border-[#0A5C36]/20 text-right">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-2 border border-[#0A5C36]/20 text-right font-bold">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <table className="w-full mt-3 text-[11px] border border-[#0A5C36]/10">
        <tbody>
          <tr>
            <td className="w-3/5 p-2 align-top">
              <div className="font-bold text-[#0A5C36] uppercase text-[9px]">Amount in Words:</div>
              <div className="font-bold text-gray-900 mt-1">{summary.amount_in_words}</div>
            </td>
            <td className="w-2/5 p-2 align-top bg-emerald-50/30 rounded-b-lg">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1">Sub Total</td>
                    <td className="text-right py-1 font-mono">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Taxes</td>
                    <td className="text-right py-1 font-mono">₹{(summary.cgst_total + summary.sgst_total + summary.igst_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-t border-[#0A5C36]/20 font-bold text-[#0A5C36] text-[13px]">
                    <td className="py-2">Grand Total</td>
                    <td className="text-right py-2 font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// THEME 9: Charcoal Sleek (Sleek Dark Accent)
// ─────────────────────────────────────────────────────────────────
export function ThemeCharcoal({ company, invoice, customer, items, summary, logoSize }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  return (
    <div className="char-wrap p-4 text-[12px] leading-relaxed text-[#2c3e50] font-sans" style={{ boxSizing: 'border-box' }}>
      <div className="flex justify-between items-start border-b-4 border-[#2c3e50] pb-3 mb-3">
        <div>
          {company.logo_url && (logoSize || 'medium') !== 'hidden' && (
            <img 
              src={company.logo_url} 
              className="max-h-[50px] mb-2 object-contain" 
              alt="logo" 
            />
          )}
          <div className="text-[18px] font-bold uppercase tracking-wider text-[#2c3e50]">{company.name}</div>
          <div className="text-[10px] text-gray-500">{company.address}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-light uppercase tracking-widest text-gray-400">{invoice.title || 'TAX INVOICE'}</div>
          <div className="text-[11px] font-bold">Doc #: {invoice.number}</div>
          <div className="text-[11px] text-gray-500">Date: {invoice.date}</div>
        </div>
      </div>

      {/* Bill split card */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Bill To:</div>
          <div className="font-bold text-[13px] mt-1">{customer.name}</div>
          <div className="text-gray-650">{customer.address}</div>
          {customer.phone && <div className="text-gray-500 mt-1">Ph: {customer.phone}</div>}
        </div>
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Corporate Info:</div>
          <div className="mt-1"><span className="font-bold">GSTIN:</span> {company.gstin}</div>
          {customer.gstin && <div><span className="font-bold">Buyer GSTIN:</span> {customer.gstin}</div>}
          {invoice.place_of_supply && <div><span className="font-bold">PoS:</span> {invoice.place_of_supply}</div>}
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse mb-4 text-[11px]">
        <thead>
          <tr className="bg-[#2c3e50] text-white font-bold uppercase text-[9px] tracking-wider text-left">
            <th className="p-2 rounded-l">S.No.</th>
            <th className="p-2">Description</th>
            <th className="p-2 text-center">HSN</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right rounded-r">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="p-2 text-gray-500">{idx + 1}</td>
              <td className="p-2 font-bold">{item.description}</td>
              <td className="p-2 text-center text-gray-500">{item.hsn_sac || '-'}</td>
              <td className="p-2 text-center">{item.qty}</td>
              <td className="p-2 text-right font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-2 text-right font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-between mt-4">
        <div className="w-[55%] text-[10px] text-gray-500">
          <div className="font-bold text-gray-700 uppercase mb-1">Declaration</div>
          <div>We certify that this document is correct and complete in all details.</div>
          <div className="font-bold text-gray-900 mt-2">Amount in Words:</div>
          <div className="text-[11px] font-bold text-[#2c3e50]">{summary.amount_in_words}</div>
        </div>
        <div className="w-[40%] bg-gray-100 p-3 rounded">
          <table className="w-full text-[11px]">
            <tbody>
              <tr>
                <td className="py-1">Taxable Subtotal</td>
                <td className="text-right py-1 font-mono">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="border-b border-gray-300 pb-1">
                <td className="py-1">Total Tax</td>
                <td className="text-right py-1 font-mono">₹{(summary.cgst_total + summary.sgst_total + summary.igst_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr className="font-bold text-[14px] text-[#2c3e50]">
                <td className="pt-2">Net Amount</td>
                <td className="text-right pt-2 font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
