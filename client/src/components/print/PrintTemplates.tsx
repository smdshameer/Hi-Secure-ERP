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
// THEME 2: HiSecure Premium
// ─────────────────────────────────────────────────────────────────
export function ThemeHiSecure({ company, invoice, customer, items, summary, upiPaymentId, logoSize = 'medium' }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');
  React.useEffect(() => {
    if (upiPaymentId) {
      QRCode.toDataURL(upiPaymentId, { width: 130, margin: 1 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: Error) => console.error('QR Code generation failed:', err));
    }
  }, [upiPaymentId]);

  const logoSizeClass = logoSize === 'small' ? 'h-12 w-12' : logoSize === 'large' ? 'h-24 w-24' : logoSize === 'hidden' ? 'hidden' : 'h-16 w-16';

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="w-full bg-white text-gray-800 text-sm font-sans">
      {/* ===== 1. HEADER ===== */}
      <div className="text-center border-b-2 border-blue-700 pb-1 mb-1">
        <h1 className="text-xl font-bold tracking-wide text-blue-800">TAX INVOICE</h1>
        {invoice.copy_type && (
          <span className="text-xs text-gray-500 italic float-right -mt-5">{invoice.copy_type}</span>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-gray-300 pb-3 mb-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          {company.logo_url && logoSize !== 'hidden' && (
            <img src={company.logo_url} alt="Logo" className={`${logoSizeClass} object-contain`} />
          )}
        </div>
        {/* Company Details */}
        <div className="text-right">
          <h2 className="text-lg font-bold text-blue-800">{company.name}</h2>
          <p className="text-xs text-gray-600">{company.address}</p>
          <p className="text-xs text-gray-600">
            Phone: {company.phone} | Email: {company.email}
          </p>
          {company.website && <p className="text-xs text-gray-600">Web: {company.website}</p>}
          <p className="text-xs font-semibold text-gray-700">GSTIN: {company.gstin}</p>
        </div>
      </div>

      {/* ===== 2. BILL TO / INVOICE META ===== */}
      <div className="flex mb-3">
        {/* Bill To */}
        <div className="w-1/2 pr-2">
          <div className="bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-1">
            Bill To
          </div>
          <div className="pl-1">
            <p className="font-bold text-sm">{customer.name}</p>
            {customer.address && <p className="text-xs text-gray-600">{customer.address}</p>}
            {customer.phone && <p className="text-xs text-gray-600">Phone: {customer.phone}</p>}
            {customer.gstin && <p className="text-xs font-semibold text-gray-700">GSTIN: {customer.gstin}</p>}
          </div>
        </div>
        {/* Invoice Meta */}
        <div className="w-1/2 pl-2">
          <div className="bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-1">
            Invoice Details
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="font-semibold py-0.5 pr-2">Invoice No:</td>
                <td>{invoice.number}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5 pr-2">Date:</td>
                <td>{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Due Date:</td>
                  <td>{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Place of Supply:</td>
                  <td>{invoice.place_of_supply}</td>
                </tr>
              )}
              {invoice.reverse_charge && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Reverse Charge:</td>
                  <td>{invoice.reverse_charge}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 3. ITEMS TABLE ===== */}
      <table className="w-full border-collapse border border-gray-400 text-xs mb-1">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="border border-blue-600 px-1 py-1 text-center" style={{ width: '5%' }}>S.No</th>
            <th className="border border-blue-600 px-1 py-1 text-left" style={{ width: '32%' }}>PARTICULARS</th>
            <th className="border border-blue-600 px-1 py-1 text-center" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="border border-blue-600 px-1 py-1 text-center" style={{ width: '10%' }}>QTY</th>
            <th className="border border-blue-600 px-1 py-1 text-right" style={{ width: '13%' }}>UNIT PRICE</th>
            <th className="border border-blue-600 px-1 py-1 text-center" style={{ width: '8%' }}>GST%</th>
            <th className="border border-blue-600 px-1 py-1 text-right" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
              <td className="border border-gray-300 px-1 py-1 text-center">{item.sr}</td>
              <td className="border border-gray-300 px-1 py-1 text-left">
                <span className="font-semibold">{item.description}</span>
                {item.model && (
                  <span className="block text-[10px] text-gray-500">S/N: {item.model}</span>
                )}
                {item.warranty && (
                  <span className="block text-[10px] text-gray-500">Warranty: {item.warranty}</span>
                )}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-center">{item.hsn_sac || '-'}</td>
              <td className="border border-gray-300 px-1 py-1 text-center">
                {item.qty} {item.unit || 'Nos'}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right font-mono">₹{fmt(item.rate)}</td>
              <td className="border border-gray-300 px-1 py-1 text-center">
                {invoice.is_interstate ? `${item.igst_rate}%` : `${item.cgst_rate + item.sgst_rate}%`}
              </td>
              <td className="border border-gray-300 px-1 py-1 text-right font-mono">₹{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 4. DELIVERY TERMS + TOTAL QTY ===== */}
      <div className="flex justify-between border border-gray-400 px-2 py-1 text-xs mb-1 bg-blue-50 rounded">
        <div>
          <span className="font-semibold">Delivery Terms: </span>
          <span>{invoice.notes || 'As per agreed terms'}</span>
        </div>
        <div>
          <span className="font-semibold">Total Qty: </span>
          <span className="font-mono">{totalQty}</span>
        </div>
      </div>

      {/* ===== 5 & 6 & 7. SUBTOTALS + TOTAL + AMOUNT PAID/BALANCE ===== */}
      <div className="flex mb-2">
        {/* Left spacer / Amount in Words */}
        <div className="w-1/2 pr-2"></div>
        {/* Right: Totals */}
        <div className="w-1/2 pl-2">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-semibold">Sub Total</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(summary.taxable_total)}</td>
              </tr>
              {!invoice.is_interstate ? (
                <>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-semibold">CGST</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(summary.cgst_total)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1 font-semibold">SGST</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(summary.sgst_total)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="border border-gray-300 px-2 py-1 font-semibold">IGST</td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(summary.igst_total)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-semibold">Round Off</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(summary.round_off)}</td>
              </tr>
              {/* TOTAL BAR */}
              <tr className="bg-blue-700 text-white font-bold">
                <td className="border border-blue-600 px-2 py-1.5 text-sm">TOTAL</td>
                <td className="border border-blue-600 px-2 py-1.5 text-right text-sm font-mono">₹{fmt(summary.grand_total)}</td>
              </tr>
              {/* Amount Paid */}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-semibold">Amount Paid</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹{fmt(invoice.grand_total)}</td>
              </tr>
              {/* Balance */}
              <tr>
                <td className="border border-gray-300 px-2 py-1 font-semibold">Balance</td>
                <td className="border border-gray-300 px-2 py-1 text-right font-mono">₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 8. AMOUNT IN WORDS ===== */}
      <div className="border border-gray-400 rounded px-3 py-1.5 mb-2 bg-blue-50">
        <span className="text-xs font-bold text-blue-800">Amount in Words: </span>
        <span className="text-xs italic">{summary.amount_in_words}</span>
      </div>

      {/* ===== 9. TERMS / DECLARATION ===== */}
      <div className="mb-2">
        <div className="bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-1">
          Terms &amp; Declaration
        </div>
        <div className="text-[10px] text-gray-700 pl-1 leading-relaxed">
          <p className="mb-0.5">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          <p className="mb-0.5">• Goods Once Sold will not be taken back.</p>
          <p className="mb-0.5">• Guarantee/Warantee is only at company service center.</p>
          <p className="mb-0.5">• Interest @18%p.m will be charged if payment delayed.</p>
          <p className="mb-0.5">• All disputes subject to Nagapattinam jurisdiction only.</p>
          <p>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</p>
        </div>
      </div>

      {/* ===== 10 & 11. QR CODE + BANK DETAILS + 12. SIGNATORY ===== */}
      <div className="flex justify-between items-start border-t border-gray-300 pt-2 mb-2">
        {/* QR Code */}
        <div className="flex-shrink-0">
          {qrCodeUrl ? (
            <div className="text-center">
              <img src={qrCodeUrl} alt="UPI QR" className="h-24 w-24" />
              <p className="text-[9px] text-gray-500 mt-0.5">Scan to Pay</p>
            </div>
          ) : (
            <div className="h-24 w-24 border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400">
              No UPI
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="text-xs px-4">
          <p className="font-bold text-blue-800 mb-0.5">Bank Details</p>
          {company.bank_name && <p className="text-[10px]"><span className="font-semibold">Bank:</span> {company.bank_name}</p>}
          {company.bank_account && <p className="text-[10px]"><span className="font-semibold">A/C No:</span> {company.bank_account}</p>}
          {company.ifsc_code && <p className="text-[10px]"><span className="font-semibold">IFSC:</span> {company.ifsc_code}</p>}
          {company.branch && <p className="text-[10px]"><span className="font-semibold">Branch:</span> {company.branch}</p>}
        </div>

        {/* Authorized Signatory */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-blue-800">For, {company.name}</p>
          <div className="h-14"></div>
          <p className="text-xs font-semibold border-t border-gray-400 pt-0.5">Authorized Signatory</p>
        </div>
      </div>

      {/* ===== 13. FOOTER BAR ===== */}
      <div className="flex justify-between items-center bg-blue-700 text-white text-[9px] px-3 py-1 rounded-b">
        <span>See Backside For Full Terms and Conditions</span>
        <span className="font-semibold">Powered By Hitech BillSoft</span>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 3: Classic (Elegant B&W Serif Layout)
// ─────────────────────────────────────────────────────────────────
export function ThemeClassic({ company, invoice, customer, items, summary, upiPaymentId, logoSize = 'medium' }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');
  React.useEffect(() => {
    if (upiPaymentId) {
      QRCode.toDataURL(upiPaymentId, { width: 130, margin: 1 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: Error) => console.error('QR Code generation failed:', err));
    }
  }, [upiPaymentId]);

  const logoSizeClass = logoSize === 'small' ? 'h-12 w-12' : logoSize === 'large' ? 'h-24 w-24' : logoSize === 'hidden' ? 'hidden' : 'h-16 w-16';

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="w-full bg-white text-black text-sm font-serif">
      {/* ===== 1. HEADER ===== */}
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-widest uppercase">Tax Invoice</h1>
          {invoice.copy_type && (
            <span className="text-xs italic text-gray-600 float-right -mt-6">{invoice.copy_type}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            {company.logo_url && logoSize !== 'hidden' && (
              <img src={company.logo_url} alt="Logo" className={`${logoSizeClass} object-contain`} />
            )}
          </div>
          {/* Company Details */}
          <div className="text-right">
            <h2 className="text-xl font-bold">{company.name}</h2>
            <p className="text-xs">{company.address}</p>
            <p className="text-xs">Phone: {company.phone} | Email: {company.email}</p>
            {company.website && <p className="text-xs">Web: {company.website}</p>}
            <p className="text-xs font-bold">GSTIN: {company.gstin}</p>
          </div>
        </div>
      </div>

      {/* ===== 2. BILL TO / INVOICE META ===== */}
      <div className="flex mb-3 border border-black">
        {/* Bill To */}
        <div className="w-1/2 p-2 border-r border-black">
          <p className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">Bill To</p>
          <p className="font-bold text-sm">{customer.name}</p>
          {customer.address && <p className="text-xs">{customer.address}</p>}
          {customer.phone && <p className="text-xs">Phone: {customer.phone}</p>}
          {customer.gstin && <p className="text-xs font-bold">GSTIN: {customer.gstin}</p>}
        </div>
        {/* Invoice Meta */}
        <div className="w-1/2 p-2">
          <p className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">Invoice Details</p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="font-semibold py-0.5 pr-2">Invoice No:</td>
                <td>{invoice.number}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5 pr-2">Date:</td>
                <td>{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Due Date:</td>
                  <td>{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Place of Supply:</td>
                  <td>{invoice.place_of_supply}</td>
                </tr>
              )}
              {invoice.reverse_charge && (
                <tr>
                  <td className="font-semibold py-0.5 pr-2">Reverse Charge:</td>
                  <td>{invoice.reverse_charge}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 3. ITEMS TABLE ===== */}
      <table className="w-full border-collapse border border-black text-xs mb-1">
        <thead>
          <tr className="bg-black text-white">
            <th className="border border-gray-600 px-1 py-1.5 text-center" style={{ width: '5%' }}>S.No</th>
            <th className="border border-gray-600 px-1 py-1.5 text-left" style={{ width: '31%' }}>PARTICULARS</th>
            <th className="border border-gray-600 px-1 py-1.5 text-center" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="border border-gray-600 px-1 py-1.5 text-center" style={{ width: '10%' }}>QTY</th>
            <th className="border border-gray-600 px-1 py-1.5 text-right" style={{ width: '13%' }}>UNIT PRICE</th>
            <th className="border border-gray-600 px-1 py-1.5 text-center" style={{ width: '8%' }}>GST%</th>
            <th className="border border-gray-600 px-1 py-1.5 text-right" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-black px-1 py-1 text-center">{item.sr}</td>
              <td className="border border-black px-1 py-1 text-left">
                <span className="font-bold">{item.description}</span>
                {item.model && (
                  <span className="block text-[10px] text-gray-600 italic">S/N: {item.model}</span>
                )}
                {item.warranty && (
                  <span className="block text-[10px] text-gray-600 italic">Warranty: {item.warranty}</span>
                )}
              </td>
              <td className="border border-black px-1 py-1 text-center">{item.hsn_sac || '-'}</td>
              <td className="border border-black px-1 py-1 text-center">
                {item.qty} {item.unit || 'Nos'}
              </td>
              <td className="border border-black px-1 py-1 text-right font-mono">₹{fmt(item.rate)}</td>
              <td className="border border-black px-1 py-1 text-center">
                {invoice.is_interstate ? `${item.igst_rate}%` : `${item.cgst_rate + item.sgst_rate}%`}
              </td>
              <td className="border border-black px-1 py-1 text-right font-mono">₹{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== 4. DELIVERY TERMS + TOTAL QTY ===== */}
      <div className="flex justify-between border border-black px-2 py-1 text-xs mb-1">
        <div>
          <span className="font-bold">Delivery Terms: </span>
          <span>{invoice.notes || 'As per agreed terms'}</span>
        </div>
        <div>
          <span className="font-bold">Total Qty: </span>
          <span className="font-mono">{totalQty}</span>
        </div>
      </div>

      {/* ===== 5, 6, 7. SUBTOTALS + TOTAL + AMOUNT PAID / BALANCE ===== */}
      <div className="flex mb-2">
        <div className="w-1/2 pr-2"></div>
        <div className="w-1/2 pl-2">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">Sub Total</td>
                <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(summary.taxable_total)}</td>
              </tr>
              {!invoice.is_interstate ? (
                <>
                  <tr>
                    <td className="border border-black px-2 py-1 font-semibold">CGST</td>
                    <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(summary.cgst_total)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-1 font-semibold">SGST</td>
                    <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(summary.sgst_total)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="border border-black px-2 py-1 font-semibold">IGST</td>
                  <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(summary.igst_total)}</td>
                </tr>
              )}
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">Round Off</td>
                <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(summary.round_off)}</td>
              </tr>
              {/* TOTAL BAR — black background for B&W theme */}
              <tr className="bg-black text-white font-bold">
                <td className="border border-gray-600 px-2 py-1.5 text-sm uppercase tracking-wider">Total</td>
                <td className="border border-gray-600 px-2 py-1.5 text-right text-sm font-mono">₹{fmt(summary.grand_total)}</td>
              </tr>
              {/* Amount Paid */}
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">Amount Paid</td>
                <td className="border border-black px-2 py-1 text-right font-mono">₹{fmt(invoice.grand_total)}</td>
              </tr>
              {/* Balance */}
              <tr>
                <td className="border border-black px-2 py-1 font-semibold">Balance</td>
                <td className="border border-black px-2 py-1 text-right font-mono">₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 8. AMOUNT IN WORDS ===== */}
      <div className="border border-black px-3 py-1.5 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider">Amount in Words: </span>
        <span className="text-xs italic">{summary.amount_in_words}</span>
      </div>

      {/* ===== 9. TERMS / DECLARATION ===== */}
      <div className="mb-2 border border-black p-2">
        <p className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">Terms &amp; Declaration</p>
        <div className="text-[10px] leading-relaxed">
          <p className="mb-0.5">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          <p className="mb-0.5">• Goods Once Sold will not be taken back.</p>
          <p className="mb-0.5">• Guarantee/Warantee is only at company service center.</p>
          <p className="mb-0.5">• Interest @18%p.m will be charged if payment delayed.</p>
          <p className="mb-0.5">• All disputes subject to Nagapattinam jurisdiction only.</p>
          <p>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</p>
        </div>
      </div>

      {/* ===== 10 & 11. QR CODE + BANK DETAILS + 12. SIGNATORY ===== */}
      <div className="flex justify-between items-start border-t-2 border-black pt-2 mb-2">
        {/* QR Code */}
        <div className="flex-shrink-0">
          {qrCodeUrl ? (
            <div className="text-center">
              <img src={qrCodeUrl} alt="UPI QR" className="h-24 w-24" />
              <p className="text-[9px] text-gray-600 mt-0.5 italic">Scan to Pay</p>
            </div>
          ) : (
            <div className="h-24 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-gray-400 italic">
              No UPI
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="text-xs px-4">
          <p className="font-bold uppercase tracking-wider text-xs mb-0.5">Bank Details</p>
          {company.bank_name && <p className="text-[10px]"><span className="font-semibold">Bank:</span> {company.bank_name}</p>}
          {company.bank_account && <p className="text-[10px]"><span className="font-semibold">A/C No:</span> {company.bank_account}</p>}
          {company.ifsc_code && <p className="text-[10px]"><span className="font-semibold">IFSC:</span> {company.ifsc_code}</p>}
          {company.branch && <p className="text-[10px]"><span className="font-semibold">Branch:</span> {company.branch}</p>}
        </div>

        {/* Authorized Signatory */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold">For, {company.name}</p>
          <div className="h-14"></div>
          <p className="text-xs font-semibold border-t border-black pt-0.5">Authorized Signatory</p>
        </div>
      </div>

      {/* ===== 13. FOOTER BAR ===== */}
      <div className="flex justify-between items-center border-t-2 border-black text-[9px] px-3 py-1">
        <span className="italic">See Backside For Full Terms and Conditions</span>
        <span className="font-bold tracking-wide">Powered By Hitech BillSoft</span>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 4: Modern Blue
// ─────────────────────────────────────────────────────────────────
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
    <div className="mb-wrap p-4 text-[12px] leading-relaxed text-[#212121] font-sans" style={{ boxSizing: 'border-box' }}>

      {/* ── 1. Header: TAX INVOICE label + copy type ── */}
      <div className="flex justify-between items-center text-[10px] mb-2 pb-1">
        <div className="bg-[#1A237E] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{invoice.title || 'TAX INVOICE'}</div>
        <div className="text-[#5C6BC0] italic font-medium">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* ── Logo + Company Details ── */}
      <table className="w-full mb-3 border-collapse">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className={`mb-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`}
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="mb-logo-text text-[20px] font-bold text-[#1A237E]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-[#1A237E] uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] text-gray-600 leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px] text-gray-600">{company.phone && `Phone: ${company.phone}`}</div>
              <div className="text-[11px] text-gray-600">
                {company.email && `Email: ${company.email}`}
                {company.website && ` · ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold text-[#1A237E] mt-1">GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 2. Bill To / Invoice Meta ── */}
      <table className="w-full border border-[#C5CAE9] mb-3 border-collapse rounded overflow-hidden">
        <tbody>
          <tr>
            <td className="w-[62%] border-r border-[#C5CAE9] align-top p-0">
              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-3 py-1.5">Bill To :</div>
              <div className="p-2.5 bg-[#E8EAF6]/40">
                <div className="text-[13px] font-bold text-gray-900 leading-tight">{customer.name}</div>
                <div className="text-[11px] text-gray-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-gray-600 mt-1.5">
                  {customer.phone && `Phone: ${customer.phone}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold text-[#1A237E] mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[38%] align-top p-2.5 bg-[#E8EAF6]/20">
              <table className="w-full text-[11px] leading-relaxed border-collapse">
                <tbody>
                  <tr>
                    <td className="text-gray-500 py-0.5">Invoice No.</td>
                    <td className="text-gray-400 py-0.5 px-1">:</td>
                    <td className="font-bold text-[#1A237E] py-0.5">{invoice.number}</td>
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

      {/* ── 3. Items Table ── */}
      <table className="w-full border border-[#C5CAE9] text-[11px] text-center border-collapse mb-3">
        <thead>
          <tr className="bg-[#1A237E] text-white">
            <th className="p-1.5 border border-[#3949AB] font-bold" style={{ width: '5%' }}>S.No</th>
            <th className="p-1.5 border border-[#3949AB] text-left font-bold" style={{ width: '35%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-[#3949AB] font-bold" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-[#3949AB] font-bold" style={{ width: '10%' }}>QTY</th>
            <th className="p-1.5 border border-[#3949AB] text-right font-bold" style={{ width: '13%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-[#3949AB] font-bold" style={{ width: '8%' }}>GST%</th>
            <th className="p-1.5 border border-[#3949AB] text-right font-bold" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#E8EAF6]/30'}>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-[#C5CAE9] text-left align-middle">
                <div className="font-bold text-gray-900">{item.description}</div>
                {item.model && <div className="text-[9px] text-[#5C6BC0]">S/N: {item.model}</div>}
                {item.warranty && <div className="text-[9px] text-gray-500">Warranty: {item.warranty}</div>}
              </td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle font-semibold">{item.qty} {item.unit || 'NOS'}</td>
              <td className="p-1.5 border border-[#C5CAE9] text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1.5 border border-[#C5CAE9] align-middle">
                <span className="bg-[#E8EAF6] text-[#1A237E] px-1.5 py-0.5 rounded-full text-[9px] font-bold">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</span>
              </td>
              <td className="p-1.5 border border-[#C5CAE9] text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 4–12. Footer Split Section ── */}
      <table className="w-full border border-[#C5CAE9] border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[58%] border-r border-[#C5CAE9] align-top p-0">

              {/* 4. Delivery Terms + Total Qty */}
              <div className="p-2 border-b border-[#C5CAE9] flex justify-between items-center bg-[#E8EAF6]/30">
                <div><span className="font-bold text-[#1A237E]">Delivery Terms :</span> <span className="text-gray-700">Immediate</span></div>
                <div className="font-bold text-[#1A237E]">Total Qty : {totalQty}</div>
              </div>

              {/* 8. Amount in Words */}
              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-3 py-1 border-b border-[#C5CAE9]">
                Invoice Amount in Words
              </div>
              <div className="p-2.5 border-b border-[#C5CAE9] font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              {/* 9. Terms / Declaration */}
              <div className="bg-[#1A237E] text-white text-[11px] font-bold px-3 py-1 border-b border-[#C5CAE9]">
                Terms / Declaration
              </div>
              <div className="p-2.5 flex justify-between gap-2 items-start relative min-h-[110px]">
                <div className="text-[10px] text-gray-600 space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* 10. QR Code */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1.5 border border-[#C5CAE9] rounded-lg bg-white shadow-sm self-center mr-2">
                    <img
                      src={qrUrl}
                      alt="UPI QR Code"
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] text-[#5C6BC0] mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>

              {/* 11. Bank Details */}
              {company.bank_name && (
                <div className="border-t border-[#C5CAE9] p-2.5 bg-[#E8EAF6]/20">
                  <div className="font-bold text-[#1A237E] uppercase text-[9px] mb-1 tracking-wide">Bank Details</div>
                  <div className="text-[10px] text-gray-700 space-y-0.5">
                    <div><span className="font-semibold text-gray-800">Bank:</span> {company.bank_name}</div>
                    <div><span className="font-semibold text-gray-800">A/c No:</span> {company.bank_account}</div>
                    <div><span className="font-semibold text-gray-800">IFSC:</span> {company.ifsc_code}</div>
                    {company.branch && <div><span className="font-semibold text-gray-800">Branch:</span> {company.branch}</div>}
                  </div>
                </div>
              )}

              {/* 13. Bottom Bar */}
              <div className="flex justify-between items-center px-3 py-1.5 border-t border-[#C5CAE9] text-[8px] text-[#5C6BC0] bg-[#E8EAF6]/40">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic font-medium">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[42%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  {/* 5. Subtotals */}
                  <tr className="border-b border-[#E8EAF6]">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-[#E8EAF6]">
                        <td className="p-1.5 text-gray-600">Add CGST</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-[#E8EAF6]">
                        <td className="p-1.5 text-gray-600">Add SGST</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-[#E8EAF6]">
                      <td className="p-1.5 text-gray-600">Add IGST</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-[#E8EAF6]">
                    <td className="p-1.5 text-gray-600">Round Off</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* 6. TOTAL bar */}
                  <tr className="bg-[#1A237E] text-white font-bold">
                    <td className="p-2 text-white text-[12px]">TOTAL</td>
                    <td className="p-2 text-right font-mono text-white text-[13px]">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* 7. Amount Paid & Balance */}
                  <tr className="border-b border-[#E8EAF6] bg-[#E8EAF6]/20">
                    <td className="p-1.5 font-bold text-gray-900">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono font-bold text-gray-900">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="bg-[#E8EAF6]/20">
                    <td className="p-1.5 font-bold text-gray-900">Balance</td>
                    <td className="p-1.5 text-right font-mono font-bold text-gray-900">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* 12. Footer: For company + Authorized Signatory */}
              <div className="p-2.5 border-t border-[#C5CAE9] mt-4 text-right">
                <div className="text-[10px] text-gray-500">For, <span className="font-bold text-[#1A237E]">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-[#5C6BC0] text-center border-t border-[#C5CAE9] pt-1">
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
// THEME 5: Minimalist
// ─────────────────────────────────────────────────────────────────
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
    <div className="mn-wrap p-6 text-[12px] leading-relaxed text-gray-800 font-sans" style={{ boxSizing: 'border-box' }}>

      {/* ── 1. Header: TAX INVOICE label + copy type ── */}
      <div className="flex justify-between items-baseline mb-6">
        <div className="font-serif text-[22px] font-bold text-gray-900 tracking-tight">{invoice.title || 'TAX INVOICE'}</div>
        <div className="text-[10px] text-gray-400 italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* ── Logo + Company Details ── */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-[35%] align-middle">
                {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className={`mn-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`}
                  />
                ) : (logoSize || 'medium') !== 'hidden' ? (
                  <div className="font-serif text-[20px] font-bold text-gray-900">{company.name}</div>
                ) : null}
              </td>
              <td className="w-[65%] text-right align-top">
                <div className="font-serif text-[15px] font-bold text-gray-900 uppercase tracking-wide">{company.name}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed mt-1">{company.address}</div>
                <div className="text-[11px] text-gray-500">{company.phone && `Phone: ${company.phone}`}</div>
                <div className="text-[11px] text-gray-500">
                  {company.email && `Email: ${company.email}`}
                  {company.website && ` · ${company.website}`}
                </div>
                {company.gstin && <div className="text-[11px] font-semibold text-gray-700 mt-1">GSTIN: {company.gstin}</div>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 2. Bill To / Invoice Meta ── */}
      <table className="w-full mb-5 border-collapse">
        <tbody>
          <tr>
            <td className="w-[60%] align-top pr-6">
              <div className="font-serif text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">Bill To</div>
              <div className="text-[14px] font-bold text-gray-900 leading-tight">{customer.name}</div>
              <div className="text-[11px] text-gray-500 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                {customer.phone && `Phone: ${customer.phone}`}
              </div>
              {customer.gstin && <div className="text-[11px] font-semibold text-gray-700 mt-0.5">GSTIN: {customer.gstin}</div>}
            </td>
            <td className="w-[40%] align-top border-l border-gray-200 pl-6">
              <table className="w-full text-[11px] leading-loose border-collapse">
                <tbody>
                  <tr>
                    <td className="text-gray-400 py-0.5 font-serif">Invoice No.</td>
                    <td className="font-bold text-gray-900 py-0.5 text-right">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="text-gray-400 py-0.5 font-serif">Date</td>
                    <td className="font-semibold text-gray-800 py-0.5 text-right">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="text-gray-400 py-0.5 font-serif">Due Date</td>
                      <td className="font-semibold text-gray-800 py-0.5 text-right">{invoice.due_date}</td>
                    </tr>
                  )}
                  {invoice.place_of_supply && (
                    <tr>
                      <td className="text-gray-400 py-0.5 font-serif">Place of Supply</td>
                      <td className="text-gray-700 py-0.5 text-right">{invoice.place_of_supply}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 3. Items Table ── */}
      <table className="w-full text-[11px] text-center border-collapse mb-4">
        <thead>
          <tr className="border-t-2 border-b border-gray-800 text-gray-500">
            <th className="py-2 font-serif font-normal text-left" style={{ width: '5%' }}>S.No</th>
            <th className="py-2 font-serif font-normal text-left" style={{ width: '36%' }}>PARTICULARS</th>
            <th className="py-2 font-serif font-normal" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="py-2 font-serif font-normal" style={{ width: '10%' }}>QTY</th>
            <th className="py-2 font-serif font-normal text-right" style={{ width: '13%' }}>UNIT PRICE</th>
            <th className="py-2 font-serif font-normal" style={{ width: '8%' }}>GST%</th>
            <th className="py-2 font-serif font-normal text-right" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-2 text-left align-middle text-gray-500">{item.sr || (idx + 1)}</td>
              <td className="py-2 text-left align-middle">
                <div className="font-semibold text-gray-900">{item.description}</div>
                {item.model && <div className="text-[9px] text-gray-400">S/N: {item.model}</div>}
                {item.warranty && <div className="text-[9px] text-gray-400">Warranty: {item.warranty}</div>}
              </td>
              <td className="py-2 align-middle text-gray-600">{item.hsn_sac || '-'}</td>
              <td className="py-2 align-middle font-medium text-gray-800">{item.qty} {item.unit || 'NOS'}</td>
              <td className="py-2 text-right align-middle font-mono text-gray-700">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="py-2 align-middle text-gray-600">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="py-2 text-right align-middle font-mono font-bold text-gray-900">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 4–12. Footer Split Section ── */}
      <table className="w-full border-t-2 border-gray-800 border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[58%] border-r border-gray-200 align-top p-0">

              {/* 4. Delivery Terms + Total Qty */}
              <div className="px-2 py-2 border-b border-gray-200 flex justify-between items-center">
                <div><span className="font-semibold text-gray-700">Delivery Terms:</span> <span className="text-gray-500">Immediate</span></div>
                <div className="font-semibold text-gray-700">Total Qty: {totalQty}</div>
              </div>

              {/* 8. Amount in Words */}
              <div className="px-2 py-1.5 border-b border-gray-100">
                <div className="font-serif text-[9px] uppercase tracking-widest text-gray-400 mb-0.5">Amount in Words</div>
                <div className="font-semibold text-gray-900">{summary.amount_in_words}</div>
              </div>

              {/* 9. Terms / Declaration */}
              <div className="px-2 py-1.5 border-b border-gray-100">
                <div className="font-serif text-[9px] uppercase tracking-widest text-gray-400 mb-1">Terms &amp; Declaration</div>
                <div className="flex justify-between gap-3 items-start min-h-[100px]">
                  <div className="text-[10px] text-gray-500 space-y-0.5 leading-relaxed max-w-[70%]">
                    <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                    <div>• Goods Once Sold will not be taken back.</div>
                    <div>• Guarantee/Warantee is only at company service center.</div>
                    <div>• Interest @18%p.m will be charged if payment delayed.</div>
                    <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                    <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                  </div>

                  {/* 10. QR Code */}
                  {upiPaymentId && qrUrl && (
                    <div className="flex flex-col items-center justify-center p-1 self-center mr-1">
                      <img
                        src={qrUrl}
                        alt="UPI QR Code"
                        className="w-[65px] h-[65px] opacity-90"
                      />
                      <div className="text-[7px] text-gray-400 mt-0.5 font-semibold uppercase tracking-wider">Scan to Pay</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 11. Bank Details */}
              {company.bank_name && (
                <div className="px-2 py-2 border-b border-gray-100">
                  <div className="font-serif text-[9px] uppercase tracking-widest text-gray-400 mb-1">Bank Details</div>
                  <div className="text-[10px] text-gray-600 space-y-0.5">
                    <div><span className="font-medium text-gray-700">Bank:</span> {company.bank_name}</div>
                    <div><span className="font-medium text-gray-700">A/c No:</span> {company.bank_account}</div>
                    <div><span className="font-medium text-gray-700">IFSC:</span> {company.ifsc_code}</div>
                    {company.branch && <div><span className="font-medium text-gray-700">Branch:</span> {company.branch}</div>}
                  </div>
                </div>
              )}

              {/* 13. Bottom Bar */}
              <div className="flex justify-between items-center px-2 py-1.5 text-[8px] text-gray-400">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[42%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  {/* 5. Subtotals */}
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500">Sub Total</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-gray-800">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-1.5 text-gray-500">Add CGST</td>
                        <td className="px-3 py-1.5 text-right font-mono text-gray-700">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-1.5 text-gray-500">Add SGST</td>
                        <td className="px-3 py-1.5 text-right font-mono text-gray-700">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-500">Add IGST</td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-700">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 text-gray-500">Round Off</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* 6. TOTAL bar */}
                  <tr className="bg-gray-900 text-white font-bold">
                    <td className="px-3 py-2 text-white font-serif text-[12px]">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono text-white text-[13px]">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* 7. Amount Paid & Balance */}
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 font-semibold text-gray-800">Amount Paid</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-gray-800">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-semibold text-gray-800">Balance</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-gray-800">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* 12. Footer: For company + Authorized Signatory */}
              <div className="px-3 py-3 border-t border-gray-200 mt-6 text-right">
                <div className="text-[10px] text-gray-400">For, <span className="font-semibold text-gray-800 font-serif">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-widest font-semibold text-gray-500 text-center border-t border-gray-200 pt-1">
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
// THEME 6: Professional Saffron
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
    <div className="sf-wrap p-4 text-[12px] leading-relaxed text-[#212121] border border-gray-400 font-sans relative" style={{ boxSizing: 'border-box' }}>

      {/* Tricolor Stripe at Top */}
      <div className="flex w-full" style={{ height: '6px' }}>
        <div className="flex-1 bg-[#FF6F00]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#1B5E20]" />
      </div>

      {/* HI-SECURE Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
        <div className="text-[80px] font-black text-gray-900 tracking-[0.3em] rotate-[-30deg] select-none uppercase">HI-SECURE</div>
      </div>

      {/* Section 1: Header Label */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mt-2 mb-2 border-b border-gray-100 pb-1 relative z-10">
        <div className="font-bold uppercase tracking-wide text-[#FF6F00]">{invoice.title || 'TAX INVOICE'}</div>
        <div className="italic">{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Section 2: Logo + Company Details Header */}
      <table className="w-full mb-3 relative z-10">
        <tbody>
          <tr>
            <td className="w-[40%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className={`sf-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`}
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="sf-logo-text text-[18px] font-bold text-[#FF6F00]">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[60%] text-right align-top py-1">
              <div className="text-[16px] font-bold text-[#FF6F00] uppercase tracking-wide leading-tight">{company.name}</div>
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

      {/* Section 3: Bill To & Invoice Meta */}
      <table className="w-full border border-gray-400 mb-3 border-collapse relative z-10">
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
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
              <table className="w-full text-[11px] leading-relaxed">
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

      {/* Section 4: Items Table */}
      <table className="w-full border border-gray-400 text-[11px] text-center border-collapse mb-3 relative z-10">
        <thead>
          <tr className="bg-[#1B5E20] text-white">
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '5%' }}>S.No</th>
            <th className="p-1.5 border border-gray-400 text-left font-bold" style={{ width: '35%' }}>PARTICULARS</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '10%' }}>QTY</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '14%' }}>UNIT PRICE</th>
            <th className="p-1.5 border border-gray-400 font-bold" style={{ width: '8%' }}>GST%</th>
            <th className="p-1.5 border border-gray-400 text-right font-bold" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300">
              <td className="p-1.5 border border-gray-300 align-top">{item.sr || (idx + 1)}</td>
              <td className="p-1.5 border border-gray-300 text-left align-top font-bold text-gray-900">
                {item.description}
                {item.model && (
                  <span className="font-normal text-gray-500 block text-[9px]">S/N: {item.model}</span>
                )}
                {item.warranty && (
                  <span className="font-normal text-[#1B5E20] block text-[9px]">Warranty: {item.warranty}</span>
                )}
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

      {/* Section 5-12: Footer Split Section */}
      <table className="w-full border border-gray-400 border-collapse mb-2 text-[11px] relative z-10">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r border-gray-400 align-top p-0">
              {/* Delivery Terms + Total Qty */}
              <div className="p-2 border-b border-gray-400 flex justify-between items-center text-gray-700">
                <div><span className="font-bold text-gray-900">Delivery Terms :</span> Immediate</div>
                <div className="font-bold text-gray-900">Total Qty : {totalQty}</div>
              </div>

              {/* Amount in Words */}
              <div className="bg-[#FF6F00] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Invoice Amount in Words
              </div>
              <div className="p-2 border-b border-gray-400 font-semibold text-gray-900">
                {summary.amount_in_words}
              </div>

              {/* Bank Details */}
              <div className="bg-[#1B5E20] text-white text-[11px] font-bold px-2 py-0.5 border-b border-gray-400">
                Bank Details
              </div>
              <div className="p-2 border-b border-gray-400 text-[10px]">
                <table className="w-full">
                  <tbody>
                    {company.bank_name && (
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-2" style={{ width: '30%' }}>Bank Name</td>
                        <td className="text-gray-400 py-0.5 px-1" style={{ width: '3%' }}>:</td>
                        <td className="font-semibold text-gray-800 py-0.5">{company.bank_name}</td>
                      </tr>
                    )}
                    {company.bank_account && (
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-2">A/C No</td>
                        <td className="text-gray-400 py-0.5 px-1">:</td>
                        <td className="font-semibold text-gray-800 py-0.5 font-mono">{company.bank_account}</td>
                      </tr>
                    )}
                    {company.ifsc_code && (
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-2">IFSC Code</td>
                        <td className="text-gray-400 py-0.5 px-1">:</td>
                        <td className="font-semibold text-gray-800 py-0.5 font-mono">{company.ifsc_code}</td>
                      </tr>
                    )}
                    {company.branch && (
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-2">Branch</td>
                        <td className="text-gray-400 py-0.5 px-1">:</td>
                        <td className="font-semibold text-gray-800 py-0.5">{company.branch}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Terms / Declaration */}
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

                {/* QR Code */}
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

              {/* Bottom bar */}
              <div className="flex justify-between items-center px-2 py-1 border-t border-gray-300 text-[8px] text-gray-500 bg-gray-50">
                <div>See Backside For Full Terms and Conditions</div>
                <div className="italic">Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  {/* Sub Total */}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-semibold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* CGST / SGST or IGST */}
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
                  {/* Round Off */}
                  <tr className="border-b border-gray-200">
                    <td className="p-1.5 text-gray-600">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* TOTAL Bar - Saffron themed */}
                  <tr className="bg-[#FF6F00] text-white font-bold">
                    <td className="p-1.5 text-white">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* Amount Paid */}
                  <tr className="border-b border-gray-200 font-bold text-gray-900">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* Balance */}
                  <tr className="font-bold text-gray-900">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer: Signatory */}
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

      {/* Tricolor Stripe at Bottom */}
      <div className="flex w-full relative z-10" style={{ height: '6px' }}>
        <div className="flex-1 bg-[#FF6F00]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#1B5E20]" />
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 7: Tally Monospace
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

  /* Filler rows to pad the items table to a minimum visual height */
  const fillerCount = Math.max(0, 4 - items.length);
  const fillerRows = Array.from({ length: fillerCount }, (_, i) => i);

  return (
    <div className="tl-wrap p-4 text-[12px] leading-relaxed text-black border-2 border-black font-mono" style={{ boxSizing: 'border-box' }}>

      {/* Section 1: Header Label */}
      <div className="flex justify-between items-center text-[10px] mb-1 border-b-2 border-black pb-1">
        <div className="font-bold uppercase tracking-widest">{invoice.title || 'TAX INVOICE'}</div>
        <div>{invoice.copy_type || '(Original Copy)'}</div>
      </div>

      {/* Section 2: Logo + Company Details Header */}
      <table className="w-full mb-2 border-collapse">
        <tbody>
          <tr>
            <td className="w-[35%] align-middle py-2">
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className={`tl-logo object-contain ${(logoSize || 'medium') === 'small' ? 'max-h-[40px] max-w-[130px]' : (logoSize || 'medium') === 'large' ? 'max-h-[85px] max-w-[240px]' : 'max-h-[60px] max-w-[170px]'}`}
                />
              ) : (logoSize || 'medium') !== 'hidden' ? (
                <div className="tl-logo-text text-[16px] font-bold uppercase">{company.name}</div>
              ) : null}
            </td>
            <td className="w-[65%] text-right align-top py-1">
              <div className="text-[15px] font-bold uppercase tracking-wide leading-tight">{company.name}</div>
              <div className="text-[11px] leading-relaxed mt-0.5">{company.address}</div>
              <div className="text-[11px]">{company.phone && `Ph: ${company.phone}`}</div>
              <div className="text-[11px]">
                {company.email && `Email: ${company.email}`}
                {company.website && ` | ${company.website}`}
              </div>
              {company.gstin && <div className="text-[11px] font-bold mt-1">GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section 3: Bill To & Invoice Meta */}
      <table className="w-full border-2 border-black mb-2 border-collapse">
        <tbody>
          <tr>
            <td className="w-[65%] border-r-2 border-black align-top p-0">
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 uppercase tracking-wider">Bill To</div>
              <div className="p-2">
                <div className="text-[13px] font-bold leading-tight uppercase">{customer.name}</div>
                <div className="text-[11px] mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] mt-1">
                  {customer.phone && `Ph: ${customer.phone}`}
                  {customer.state && ` | State: ${customer.state}`}
                </div>
                {customer.gstin && <div className="text-[11px] font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
              </div>
            </td>
            <td className="w-[35%] align-top p-2">
              <table className="w-full text-[11px] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="py-0.5">Vch No.</td>
                    <td className="py-0.5 px-1">:</td>
                    <td className="font-bold py-0.5">{invoice.number}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Dated</td>
                    <td className="py-0.5 px-1">:</td>
                    <td className="font-bold py-0.5">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="py-0.5">Due Date</td>
                      <td className="py-0.5 px-1">:</td>
                      <td className="font-bold py-0.5">{invoice.due_date}</td>
                    </tr>
                  )}
                  {invoice.place_of_supply && (
                    <tr>
                      <td className="py-0.5">Place of Supply</td>
                      <td className="py-0.5 px-1">:</td>
                      <td className="py-0.5">{invoice.place_of_supply}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section 4: Items Table (Tally-style with 'per' column, dashed borders) */}
      <table className="w-full border-2 border-black text-[11px] text-center border-collapse mb-2">
        <thead>
          <tr className="border-b-2 border-black bg-white">
            <th className="p-1 border-r border-black font-bold" style={{ width: '5%' }}>S.No</th>
            <th className="p-1 border-r border-black text-left font-bold" style={{ width: '30%' }}>PARTICULARS</th>
            <th className="p-1 border-r border-black font-bold" style={{ width: '10%' }}>HSN/SAC</th>
            <th className="p-1 border-r border-black font-bold" style={{ width: '7%' }}>QTY</th>
            <th className="p-1 border-r border-black font-bold" style={{ width: '6%' }}>per</th>
            <th className="p-1 border-r border-black text-right font-bold" style={{ width: '14%' }}>UNIT PRICE</th>
            <th className="p-1 border-r border-black font-bold" style={{ width: '8%' }}>GST%</th>
            <th className="p-1 text-right font-bold" style={{ width: '14%' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-dashed border-black">
              <td className="p-1 border-r border-black align-top">{item.sr || (idx + 1)}</td>
              <td className="p-1 border-r border-black text-left align-top font-bold">
                {item.description}
                {item.model && (
                  <span className="font-normal block text-[9px]">S/N: {item.model}</span>
                )}
                {item.warranty && (
                  <span className="font-normal block text-[9px]">Warranty: {item.warranty}</span>
                )}
              </td>
              <td className="p-1 border-r border-black align-middle">{item.hsn_sac || '-'}</td>
              <td className="p-1 border-r border-black align-middle font-bold">{item.qty}</td>
              <td className="p-1 border-r border-black align-middle">{item.unit || 'NOS'}</td>
              <td className="p-1 border-r border-black text-right align-middle font-mono">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="p-1 border-r border-black align-middle">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
              <td className="p-1 text-right align-middle font-bold font-mono">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Filler rows for Tally-style */}
          {fillerRows.map((_, idx) => (
            <tr key={`filler-${idx}`} className="border-b border-dashed border-black">
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1 border-r border-black">&nbsp;</td>
              <td className="p-1">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section 5-12: Footer Split Section */}
      <table className="w-full border-2 border-black border-collapse mb-2 text-[11px]">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="w-[60%] border-r-2 border-black align-top p-0">
              {/* Delivery Terms + Total Qty */}
              <div className="p-1.5 border-b border-black flex justify-between items-center">
                <div><span className="font-bold">Delivery Terms :</span> Immediate</div>
                <div className="font-bold">Total Qty : {totalQty}</div>
              </div>

              {/* Amount in Words */}
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black uppercase tracking-wider">
                Amount Chargeable (in words)
              </div>
              <div className="p-2 border-b border-black font-bold">
                {summary.amount_in_words}
              </div>
              <div className="px-2 py-0.5 border-b border-black text-[9px] text-right italic">
                E. & O.E.
              </div>

              {/* Bank Details */}
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black uppercase tracking-wider">
                Bank Details
              </div>
              <div className="p-2 border-b border-black text-[10px]">
                <table className="w-full">
                  <tbody>
                    {company.bank_name && (
                      <tr>
                        <td className="py-0.5 pr-2" style={{ width: '30%' }}>Bank Name</td>
                        <td className="py-0.5 px-1" style={{ width: '3%' }}>:</td>
                        <td className="font-bold py-0.5">{company.bank_name}</td>
                      </tr>
                    )}
                    {company.bank_account && (
                      <tr>
                        <td className="py-0.5 pr-2">A/C No.</td>
                        <td className="py-0.5 px-1">:</td>
                        <td className="font-bold py-0.5">{company.bank_account}</td>
                      </tr>
                    )}
                    {company.ifsc_code && (
                      <tr>
                        <td className="py-0.5 pr-2">IFSC Code</td>
                        <td className="py-0.5 px-1">:</td>
                        <td className="font-bold py-0.5">{company.ifsc_code}</td>
                      </tr>
                    )}
                    {company.branch && (
                      <tr>
                        <td className="py-0.5 pr-2">Branch</td>
                        <td className="py-0.5 px-1">:</td>
                        <td className="font-bold py-0.5">{company.branch}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Terms / Declaration */}
              <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5 border-b border-black uppercase tracking-wider">
                Declaration
              </div>
              <div className="p-2 flex justify-between gap-2 items-start relative min-h-[100px]">
                <div className="text-[10px] space-y-0.5 leading-relaxed max-w-[70%]">
                  <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  <div>• Goods Once Sold will not be taken back.</div>
                  <div>• Guarantee/Warantee is only at company service center.</div>
                  <div>• Interest @18%p.m will be charged if payment delayed.</div>
                  <div>• All disputes subject to Nagapattinam jurisdiction only.</div>
                  <div>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</div>
                </div>

                {/* QR Code */}
                {upiPaymentId && qrUrl && (
                  <div className="flex flex-col items-center justify-center p-1 border-2 border-black self-center mr-2">
                    <img
                      src={qrUrl}
                      alt="UPI QR Code"
                      className="w-[70px] h-[70px]"
                    />
                    <div className="text-[7px] mt-0.5 font-bold uppercase tracking-wider">Scan to Pay</div>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="flex justify-between items-center px-2 py-1 border-t-2 border-black text-[8px] bg-white">
                <div>See Backside For Full Terms and Conditions</div>
                <div>Powered By Hitech BillSoft</div>
              </div>
            </td>

            {/* Right Column */}
            <td className="w-[40%] align-top p-0">
              <table className="w-full border-collapse">
                <tbody>
                  {/* Sub Total */}
                  <tr className="border-b border-dashed border-black">
                    <td className="p-1.5">Sub Total</td>
                    <td className="p-1.5 text-right font-mono font-bold">₹{summary.taxable_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* CGST / SGST or IGST */}
                  {!invoice.is_interstate ? (
                    <>
                      <tr className="border-b border-dashed border-black">
                        <td className="p-1.5">Add CGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.cgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-dashed border-black">
                        <td className="p-1.5">Add SGST (9%)</td>
                        <td className="p-1.5 text-right font-mono">₹{summary.sgst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-dashed border-black">
                      <td className="p-1.5">Add IGST (18%)</td>
                      <td className="p-1.5 text-right font-mono">₹{summary.igst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {/* Round Off */}
                  <tr className="border-b border-dashed border-black">
                    <td className="p-1.5">Round Off (-)</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.round_off.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* TOTAL Bar - Black themed */}
                  <tr className="bg-black text-white font-bold border-b-2 border-black">
                    <td className="p-1.5 text-white uppercase tracking-wider">TOTAL</td>
                    <td className="p-1.5 text-right font-mono text-white">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  {/* Amount Paid */}
                  <tr className="border-b border-dashed border-black font-bold">
                    <td className="p-1.5">Amount Paid</td>
                    <td className="p-1.5 text-right font-mono">₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* Balance */}
                  <tr className="font-bold">
                    <td className="p-1.5">Balance</td>
                    <td className="p-1.5 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer: Signatory */}
              <div className="p-2 border-t-2 border-black mt-6 text-right">
                <div className="text-[10px]">For <span className="font-bold">{company.name}</span></div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-widest font-bold text-center border-t border-black pt-1">
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
// THEME 8: Emerald Corporate Green
// ─────────────────────────────────────────────────────────────────
export function ThemeEmerald({ company, invoice, customer, items, summary, upiPaymentId, logoSize = 'medium' }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');
  React.useEffect(() => {
    if (upiPaymentId) {
      QRCode.toDataURL(upiPaymentId, { width: 130, margin: 1 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: Error) => console.error('QR Code generation failed:', err));
    }
  }, [upiPaymentId]);

  const logoSizeMap: Record<string, string> = {
    small: 'h-10 w-10',
    medium: 'h-16 w-16',
    large: 'h-24 w-24',
    hidden: 'hidden',
  };

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="w-full bg-white text-gray-800 text-xs font-sans">
      {/* ========== 1. HEADER ========== */}
      <div className="bg-emerald-800 text-white rounded-t-lg px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt="Logo"
              className={`${logoSizeMap[logoSize || 'medium']} object-contain rounded bg-white p-1`}
            />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-wide">{company.name}</h1>
            <p className="text-emerald-200 text-[10px] mt-0.5">{company.address}</p>
            <p className="text-emerald-200 text-[10px]">
              Phone: {company.phone} | Email: {company.email}
              {company.website ? ` | Web: ${company.website}` : ''}
            </p>
            <p className="text-emerald-100 text-[10px] font-semibold">GSTIN: {company.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold tracking-widest">TAX INVOICE</h2>
          {invoice.copy_type && (
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">
              {invoice.copy_type}
            </span>
          )}
        </div>
      </div>

      {/* ========== 2. BILL TO / INVOICE META ========== */}
      <div className="flex border border-t-0 border-emerald-300">
        {/* Left: Customer */}
        <div className="w-1/2 p-3 border-r border-emerald-300 bg-emerald-50 rounded-bl-md">
          <h3 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Bill To</h3>
          <p className="font-bold text-sm text-gray-900">{customer.name}</p>
          {customer.address && <p className="text-gray-600">{customer.address}</p>}
          {customer.phone && <p className="text-gray-600">Phone: {customer.phone}</p>}
          {customer.email && <p className="text-gray-600">Email: {customer.email}</p>}
          {customer.gstin && <p className="text-gray-700 font-semibold mt-0.5">GSTIN: {customer.gstin}</p>}
          {customer.state && <p className="text-gray-600">State: {customer.state}</p>}
        </div>
        {/* Right: Invoice Details */}
        <div className="w-1/2 p-3 bg-white">
          <h3 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Invoice Details</h3>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="py-0.5 text-gray-500 font-medium">Invoice No:</td>
                <td className="py-0.5 font-bold text-gray-900">{invoice.number}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-gray-500 font-medium">Date:</td>
                <td className="py-0.5 text-gray-800">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium">Due Date:</td>
                  <td className="py-0.5 text-gray-800">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium">Place of Supply:</td>
                  <td className="py-0.5 text-gray-800">{invoice.place_of_supply}</td>
                </tr>
              )}
              {invoice.reverse_charge && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium">Reverse Charge:</td>
                  <td className="py-0.5 text-gray-800">{invoice.reverse_charge}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 3. ITEMS TABLE ========== */}
      <div className="mt-2 px-1">
        <table className="w-full text-xs border border-emerald-300 rounded-md overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-emerald-800 text-white text-[10px] uppercase tracking-wider">
              <th className="border border-emerald-600 px-1 py-2 text-center" style={{ width: '5%' }}>S.No</th>
              <th className="border border-emerald-600 px-2 py-2 text-left" style={{ width: '30%' }}>Particulars</th>
              <th className="border border-emerald-600 px-1 py-2 text-center" style={{ width: '10%' }}>HSN/SAC</th>
              <th className="border border-emerald-600 px-1 py-2 text-center" style={{ width: '10%' }}>Qty</th>
              <th className="border border-emerald-600 px-1 py-2 text-right" style={{ width: '12%' }}>Unit Price</th>
              <th className="border border-emerald-600 px-1 py-2 text-center" style={{ width: '8%' }}>GST%</th>
              <th className="border border-emerald-600 px-1 py-2 text-right" style={{ width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                <td className="border border-emerald-200 px-1 py-1.5 text-center">{item.sr}</td>
                <td className="border border-emerald-200 px-2 py-1.5 text-left">
                  <span className="font-semibold text-gray-900">{item.description}</span>
                  {item.model && (
                    <span className="block text-[10px] text-emerald-700 mt-0.5">S/N: {item.model}</span>
                  )}
                  {item.warranty && (
                    <span className="block text-[10px] text-emerald-600">Warranty: {item.warranty}</span>
                  )}
                </td>
                <td className="border border-emerald-200 px-1 py-1.5 text-center font-mono">{item.hsn_sac || '-'}</td>
                <td className="border border-emerald-200 px-1 py-1.5 text-center">
                  {item.qty} {item.unit || 'Nos'}
                </td>
                <td className="border border-emerald-200 px-1 py-1.5 text-right font-mono">₹{fmt(item.rate)}</td>
                <td className="border border-emerald-200 px-1 py-1.5 text-center font-mono">
                  {invoice.is_interstate ? `${item.igst_rate}%` : `${item.cgst_rate + item.sgst_rate}%`}
                </td>
                <td className="border border-emerald-200 px-1 py-1.5 text-right font-mono font-semibold">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========== 4. DELIVERY TERMS + TOTAL QTY ROW ========== */}
      <div className="flex justify-between items-center border border-emerald-300 border-t-0 mx-1 px-3 py-1.5 bg-emerald-50 rounded-b-md">
        <div className="text-[10px] text-gray-600">
          <span className="font-semibold text-emerald-800">Delivery Terms:</span>{' '}
          {invoice.notes || 'As per agreed terms and conditions'}
        </div>
        <div className="text-[10px] font-bold text-emerald-800">
          Total Qty: <span className="font-mono">{totalQty}</span>
        </div>
      </div>

      {/* ========== 5–7. SUBTOTALS + TOTAL + AMOUNT PAID / BALANCE ========== */}
      <div className="mt-2 flex mx-1">
        {/* Amount in Words - Left */}
        <div className="w-1/2 pr-3">
          {/* ========== 8. AMOUNT IN WORDS ========== */}
          <div className="border border-emerald-300 rounded-md p-3 bg-emerald-50 h-full">
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Amount in Words</h4>
            <p className="text-sm font-semibold text-gray-900 italic leading-relaxed">
              {summary.amount_in_words}
            </p>
          </div>
        </div>
        {/* Subtotals - Right */}
        <div className="w-1/2">
          <table className="w-full text-xs border border-emerald-300 rounded-md overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {/* Sub Total */}
              <tr className="bg-white">
                <td className="border border-emerald-200 px-3 py-1.5 text-gray-700 font-medium">Sub Total</td>
                <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono">₹{fmt(summary.taxable_total)}</td>
              </tr>
              {/* Tax Rows */}
              {invoice.is_interstate ? (
                <tr className="bg-emerald-50">
                  <td className="border border-emerald-200 px-3 py-1.5 text-gray-700">IGST</td>
                  <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono">₹{fmt(summary.igst_total)}</td>
                </tr>
              ) : (
                <>
                  <tr className="bg-emerald-50">
                    <td className="border border-emerald-200 px-3 py-1.5 text-gray-700">CGST</td>
                    <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono">₹{fmt(summary.cgst_total)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-emerald-200 px-3 py-1.5 text-gray-700">SGST</td>
                    <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono">₹{fmt(summary.sgst_total)}</td>
                  </tr>
                </>
              )}
              {/* Round Off */}
              <tr className="bg-emerald-50">
                <td className="border border-emerald-200 px-3 py-1.5 text-gray-500">Round Off</td>
                <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono text-gray-500">₹{fmt(summary.round_off)}</td>
              </tr>
              {/* ========== 6. TOTAL BAR ========== */}
              <tr className="bg-emerald-800 text-white">
                <td className="border border-emerald-600 px-3 py-2 font-bold text-sm uppercase tracking-wider">Total</td>
                <td className="border border-emerald-600 px-3 py-2 text-right font-mono font-bold text-sm">₹{fmt(summary.grand_total)}</td>
              </tr>
              {/* ========== 7. AMOUNT PAID / BALANCE ========== */}
              <tr className="bg-white">
                <td className="border border-emerald-200 px-3 py-1.5 text-gray-700 font-medium">Amount Paid</td>
                <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono font-semibold text-emerald-700">₹{fmt(invoice.grand_total)}</td>
              </tr>
              <tr className="bg-emerald-50">
                <td className="border border-emerald-200 px-3 py-1.5 text-gray-700 font-medium">Balance</td>
                <td className="border border-emerald-200 px-3 py-1.5 text-right font-mono font-semibold">₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 9. TERMS / DECLARATION ========== */}
      <div className="mt-2 mx-1 border border-emerald-300 rounded-md p-3 bg-white">
        <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">Terms &amp; Declaration</h4>
        <p className="text-[10px] text-gray-700 mb-1 leading-relaxed">
          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </p>
        <ul className="text-[10px] text-gray-600 space-y-0.5 list-none pl-0">
          <li>• Goods Once Sold will not be taken back.</li>
          <li>• Guarantee/Warantee is only at company service center.</li>
          <li>• Interest @18%p.m will be charged if payment delayed.</li>
          <li>• All disputes subject to Nagapattinam jurisdiction only.</li>
          <li>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</li>
        </ul>
      </div>

      {/* ========== 10 & 11. QR CODE + BANK DETAILS + 12. SIGNATORY ========== */}
      <div className="mt-2 mx-1 flex gap-2">
        {/* QR Code */}
        <div className="w-1/4 border border-emerald-300 rounded-md p-2 bg-emerald-50 flex flex-col items-center justify-center">
          {qrCodeUrl ? (
            <>
              <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded" />
              <p className="text-[9px] text-emerald-700 mt-1 font-medium">Scan to Pay</p>
            </>
          ) : (
            <p className="text-[10px] text-gray-400 italic">No UPI QR</p>
          )}
        </div>

        {/* Bank Details */}
        <div className="w-2/4 border border-emerald-300 rounded-md p-3 bg-white">
          <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Bank Details</h4>
          <table className="text-[10px] w-full" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {company.bank_name && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium pr-2">Bank Name:</td>
                  <td className="py-0.5 text-gray-800 font-semibold">{company.bank_name}</td>
                </tr>
              )}
              {company.bank_account && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium pr-2">Account No:</td>
                  <td className="py-0.5 text-gray-800 font-mono font-semibold">{company.bank_account}</td>
                </tr>
              )}
              {company.ifsc_code && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium pr-2">IFSC Code:</td>
                  <td className="py-0.5 text-gray-800 font-mono font-semibold">{company.ifsc_code}</td>
                </tr>
              )}
              {company.branch && (
                <tr>
                  <td className="py-0.5 text-gray-500 font-medium pr-2">Branch:</td>
                  <td className="py-0.5 text-gray-800">{company.branch}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== 12. AUTHORIZED SIGNATORY ========== */}
        <div className="w-1/4 border border-emerald-300 rounded-md p-3 bg-white flex flex-col justify-between text-center">
          <p className="text-[10px] text-emerald-800 font-bold">For, {company.name}</p>
          <div className="h-12"></div>
          <div className="border-t border-emerald-300 pt-1">
            <p className="text-[10px] text-gray-600 font-semibold">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* ========== 13. BOTTOM BAR ========== */}
      <div className="mt-2 bg-emerald-800 text-white rounded-b-lg px-4 py-2 flex justify-between items-center text-[9px]">
        <span>See Backside For Full Terms and Conditions</span>
        <span className="font-semibold">Powered By Hitech BillSoft</span>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// THEME 9: Charcoal Sleek
// ─────────────────────────────────────────────────────────────────
export function ThemeCharcoal({ company, invoice, customer, items, summary, upiPaymentId, logoSize = 'medium' }: PrintTemplateProps) {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');
  React.useEffect(() => {
    if (upiPaymentId) {
      QRCode.toDataURL(upiPaymentId, { width: 130, margin: 1 })
        .then((url: string) => setQrCodeUrl(url))
        .catch((err: Error) => console.error('QR Code generation failed:', err));
    }
  }, [upiPaymentId]);

  const logoSizeMap: Record<string, string> = {
    small: 'h-10 w-10',
    medium: 'h-16 w-16',
    large: 'h-24 w-24',
    hidden: 'hidden',
  };

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="w-full bg-white text-gray-800 text-xs font-sans">
      {/* ========== 1. HEADER ========== */}
      <div className="border-b-4 border-slate-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt="Logo"
              className={`${logoSizeMap[logoSize || 'medium']} object-contain rounded-lg`}
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-wide">{company.name}</h1>
            <p className="text-slate-500 text-[10px] mt-0.5">{company.address}</p>
            <p className="text-slate-500 text-[10px]">
              Phone: {company.phone} | Email: {company.email}
              {company.website ? ` | Web: ${company.website}` : ''}
            </p>
            <p className="text-slate-700 text-[10px] font-semibold mt-0.5">GSTIN: {company.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Tax Invoice</h2>
          {invoice.copy_type && (
            <span className="text-[10px] bg-slate-700 text-white px-3 py-0.5 rounded-full font-medium mt-1 inline-block">
              {invoice.copy_type}
            </span>
          )}
        </div>
      </div>

      {/* ========== 2. BILL TO / INVOICE META (grid-cols-2) ========== */}
      <div className="grid grid-cols-2 gap-3 mt-3 px-3">
        {/* Left: Customer */}
        <div className="bg-gray-100 rounded-lg p-3">
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bill To</h3>
          <p className="font-bold text-sm text-slate-900">{customer.name}</p>
          {customer.address && <p className="text-slate-600 mt-0.5">{customer.address}</p>}
          {customer.phone && <p className="text-slate-600">Phone: {customer.phone}</p>}
          {customer.email && <p className="text-slate-600">Email: {customer.email}</p>}
          {customer.gstin && <p className="text-slate-800 font-semibold mt-0.5">GSTIN: {customer.gstin}</p>}
          {customer.state && <p className="text-slate-600">State: {customer.state}</p>}
        </div>
        {/* Right: Invoice Details */}
        <div className="bg-gray-100 rounded-lg p-3">
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Invoice Details</h3>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="py-0.5 text-slate-500 font-medium">Invoice No:</td>
                <td className="py-0.5 font-bold text-slate-900">{invoice.number}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-slate-500 font-medium">Date:</td>
                <td className="py-0.5 text-slate-800">{invoice.date}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Due Date:</td>
                  <td className="py-0.5 text-slate-800">{invoice.due_date}</td>
                </tr>
              )}
              {invoice.place_of_supply && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Place of Supply:</td>
                  <td className="py-0.5 text-slate-800">{invoice.place_of_supply}</td>
                </tr>
              )}
              {invoice.reverse_charge && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Reverse Charge:</td>
                  <td className="py-0.5 text-slate-800">{invoice.reverse_charge}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 3. ITEMS TABLE ========== */}
      <div className="mt-3 px-3">
        <table className="w-full text-xs rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-slate-700 text-white text-[10px] uppercase tracking-wider">
              <th className="border border-slate-600 px-1 py-2 text-center" style={{ width: '5%' }}>S.No</th>
              <th className="border border-slate-600 px-2 py-2 text-left" style={{ width: '30%' }}>Particulars</th>
              <th className="border border-slate-600 px-1 py-2 text-center" style={{ width: '10%' }}>HSN/SAC</th>
              <th className="border border-slate-600 px-1 py-2 text-center" style={{ width: '10%' }}>Qty</th>
              <th className="border border-slate-600 px-1 py-2 text-right" style={{ width: '12%' }}>Unit Price</th>
              <th className="border border-slate-600 px-1 py-2 text-center" style={{ width: '8%' }}>GST%</th>
              <th className="border border-slate-600 px-1 py-2 text-right" style={{ width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-1 py-1.5 text-center text-slate-600">{item.sr}</td>
                <td className="border border-gray-200 px-2 py-1.5 text-left">
                  <span className="font-semibold text-slate-900">{item.description}</span>
                  {item.model && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">S/N: {item.model}</span>
                  )}
                  {item.warranty && (
                    <span className="block text-[10px] text-slate-400">Warranty: {item.warranty}</span>
                  )}
                </td>
                <td className="border border-gray-200 px-1 py-1.5 text-center font-mono text-slate-600">{item.hsn_sac || '-'}</td>
                <td className="border border-gray-200 px-1 py-1.5 text-center text-slate-700">
                  {item.qty} {item.unit || 'Nos'}
                </td>
                <td className="border border-gray-200 px-1 py-1.5 text-right font-mono text-slate-700">₹{fmt(item.rate)}</td>
                <td className="border border-gray-200 px-1 py-1.5 text-center font-mono text-slate-600">
                  {invoice.is_interstate ? `${item.igst_rate}%` : `${item.cgst_rate + item.sgst_rate}%`}
                </td>
                <td className="border border-gray-200 px-1 py-1.5 text-right font-mono font-semibold text-slate-900">₹{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========== 4. DELIVERY TERMS + TOTAL QTY ROW ========== */}
      <div className="flex justify-between items-center mx-3 px-3 py-1.5 bg-gray-100 rounded-b-lg border border-t-0 border-gray-200">
        <div className="text-[10px] text-slate-600">
          <span className="font-semibold text-slate-700">Delivery Terms:</span>{' '}
          {invoice.notes || 'As per agreed terms and conditions'}
        </div>
        <div className="text-[10px] font-bold text-slate-800">
          Total Qty: <span className="font-mono">{totalQty}</span>
        </div>
      </div>

      {/* ========== 5–7. SUBTOTALS + TOTAL + AMOUNT PAID / BALANCE ========== */}
      <div className="mt-3 px-3 flex gap-3">
        {/* Amount in Words - Left */}
        <div className="w-1/2">
          {/* ========== 8. AMOUNT IN WORDS ========== */}
          <div className="bg-gray-100 rounded-lg p-3 h-full">
            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Amount in Words</h4>
            <p className="text-sm font-semibold text-slate-900 italic leading-relaxed">
              {summary.amount_in_words}
            </p>
          </div>
        </div>
        {/* Subtotals - Right */}
        <div className="w-1/2">
          <table className="w-full text-xs rounded-lg overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {/* Sub Total */}
              <tr className="bg-white">
                <td className="border border-gray-200 px-3 py-1.5 text-slate-600 font-medium">Sub Total</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-mono text-slate-800">₹{fmt(summary.taxable_total)}</td>
              </tr>
              {/* Tax Rows */}
              {invoice.is_interstate ? (
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-3 py-1.5 text-slate-600">IGST</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-right font-mono text-slate-800">₹{fmt(summary.igst_total)}</td>
                </tr>
              ) : (
                <>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-1.5 text-slate-600">CGST</td>
                    <td className="border border-gray-200 px-3 py-1.5 text-right font-mono text-slate-800">₹{fmt(summary.cgst_total)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-3 py-1.5 text-slate-600">SGST</td>
                    <td className="border border-gray-200 px-3 py-1.5 text-right font-mono text-slate-800">₹{fmt(summary.sgst_total)}</td>
                  </tr>
                </>
              )}
              {/* Round Off */}
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-3 py-1.5 text-slate-400">Round Off</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-mono text-slate-400">₹{fmt(summary.round_off)}</td>
              </tr>
              {/* ========== 6. TOTAL BAR ========== */}
              <tr className="bg-slate-700 text-white">
                <td className="border border-slate-600 px-3 py-2.5 font-bold text-sm uppercase tracking-wider">Total</td>
                <td className="border border-slate-600 px-3 py-2.5 text-right font-mono font-bold text-sm">₹{fmt(summary.grand_total)}</td>
              </tr>
              {/* ========== 7. AMOUNT PAID / BALANCE ========== */}
              <tr className="bg-white">
                <td className="border border-gray-200 px-3 py-1.5 text-slate-600 font-medium">Amount Paid</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-mono font-semibold text-slate-800">₹{fmt(invoice.grand_total)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-3 py-1.5 text-slate-600 font-medium">Balance</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right font-mono font-semibold text-slate-800">₹0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 9. TERMS / DECLARATION ========== */}
      <div className="mt-3 mx-3 border border-gray-200 rounded-lg p-3 bg-white">
        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Terms &amp; Declaration</h4>
        <p className="text-[10px] text-slate-600 mb-1 leading-relaxed">
          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </p>
        <ul className="text-[10px] text-slate-500 space-y-0.5 list-none pl-0">
          <li>• Goods Once Sold will not be taken back.</li>
          <li>• Guarantee/Warantee is only at company service center.</li>
          <li>• Interest @18%p.m will be charged if payment delayed.</li>
          <li>• All disputes subject to Nagapattinam jurisdiction only.</li>
          <li>• Warranty be void, if damage due to Lightning, Physical damage, Water Leakage &amp; Burned.</li>
        </ul>
      </div>

      {/* ========== 10 & 11. QR CODE + BANK DETAILS + 12. SIGNATORY ========== */}
      <div className="mt-3 mx-3 flex gap-3">
        {/* QR Code */}
        <div className="w-1/4 border border-gray-200 rounded-lg p-2 bg-gray-50 flex flex-col items-center justify-center">
          {qrCodeUrl ? (
            <>
              <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded" />
              <p className="text-[9px] text-slate-500 mt-1 font-medium">Scan to Pay</p>
            </>
          ) : (
            <p className="text-[10px] text-gray-400 italic">No UPI QR</p>
          )}
        </div>

        {/* Bank Details */}
        <div className="w-2/4 border border-gray-200 rounded-lg p-3 bg-white">
          <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Bank Details</h4>
          <table className="text-[10px] w-full" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {company.bank_name && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium pr-2">Bank Name:</td>
                  <td className="py-0.5 text-slate-800 font-semibold">{company.bank_name}</td>
                </tr>
              )}
              {company.bank_account && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium pr-2">Account No:</td>
                  <td className="py-0.5 text-slate-800 font-mono font-semibold">{company.bank_account}</td>
                </tr>
              )}
              {company.ifsc_code && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium pr-2">IFSC Code:</td>
                  <td className="py-0.5 text-slate-800 font-mono font-semibold">{company.ifsc_code}</td>
                </tr>
              )}
              {company.branch && (
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium pr-2">Branch:</td>
                  <td className="py-0.5 text-slate-800">{company.branch}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== 12. AUTHORIZED SIGNATORY ========== */}
        <div className="w-1/4 border border-gray-200 rounded-lg p-3 bg-white flex flex-col justify-between text-center">
          <p className="text-[10px] text-slate-700 font-bold">For, {company.name}</p>
          <div className="h-12"></div>
          <div className="border-t border-gray-300 pt-1">
            <p className="text-[10px] text-slate-500 font-semibold">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* ========== 13. BOTTOM BAR ========== */}
      <div className="mt-3 bg-slate-700 text-white rounded-b-lg px-4 py-2 flex justify-between items-center text-[9px]">
        <span>See Backside For Full Terms and Conditions</span>
        <span className="font-semibold">Powered By Hitech BillSoft</span>
      </div>
    </div>
  );
}

