import React from 'react';
import QRCode from 'qrcode';

export interface PrintTemplateProps {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin: string;
    pan?: string;
    state?: string;
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
    po_number?: string;
    po?: string;
    reference?: string;
    challan_number?: string;
    irn?: string;
    ack_number?: string;
    ack_date?: string;
    eway_bill_number?: string;
    vehicle_number?: string;
    transporter_name?: string;
    dispatch_through?: string;
    dispatch_date?: string;
    payment_terms?: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
    state?: string;
    contactPerson?: string;
    shippingAddress?: string;
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
    mrp?: number;
    serialNumber?: string;
    batchNumber?: string;
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
  showBankDetails?: boolean;
  showMrp?: boolean;
  showQrCode?: boolean;
  showTerms?: boolean;
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

const S = {
	page: {
		width: "100%",
		minHeight: "1122px",
		background: "#fff",
		padding: "5mm",
		margin: "0 auto",
		boxSizing: "border-box" as const,
		fontFamily: "Arial, Helvetica, sans-serif",
		fontSize: "10pt",
		color: "#1a1a1a",
		display: "flex",
		flexDirection: "column" as const,
		WebkitPrintColorAdjust: "exact" as const,
		printColorAdjust: "exact" as const
	},
	topRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		paddingBottom: "6px",
		fontSize: "8.5pt"
	},
	topCenter: {
		flex: 1,
		textAlign: "center" as const,
		fontSize: "9.5pt",
		fontWeight: 700,
		letterSpacing: "1px"
	},
	topRight: {
		textAlign: "right" as const,
		color: "#666",
		fontStyle: "italic",
		fontSize: "8.5pt"
	},
	box: {
		border: "1px solid #333",
		display: "flex",
		flexDirection: "column" as const,
		flexGrow: 1
	},
	headerRow: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		padding: "4px 12px 4px 4px",
		borderBottom: "1px solid #333"
	},
	companyRight: {
		textAlign: "right" as const,
		lineHeight: 1.55,
		fontSize: "9pt"
	},
	companyName: {
		fontSize: "11pt",
		fontWeight: 700,
		lineHeight: 1.2,
		marginBottom: "2px"
	},
	companyAddr: {
		fontSize: "9pt",
		color: "#333",
		maxWidth: "320px",
		alignSelf: "flex-end" as const,
		lineHeight: "1.35"
	},
	companyContact: {
		fontSize: "9pt",
		color: "#333"
	},
	gstinLine: {
		fontSize: "9pt",
		fontWeight: 700,
		marginTop: "4px"
	},
	blueBar: {
		backgroundColor: "#4a90d9",
		color: "#fff",
		fontWeight: 700,
		fontSize: "9pt",
		padding: "2px 8px",
		WebkitPrintColorAdjust: "exact" as const,
		printColorAdjust: "exact" as const
	},
	billGrid: {
		display: "grid",
		gridTemplateColumns: "62% 38%",
		borderBottom: "none"
	},
	billToCell: {
		padding: "0",
		borderRight: "1px solid #333",
		display: "flex",
		flexDirection: "column" as const,
		justifyContent: "space-between",
		minHeight: "75px"
	},
	billToInner: { padding: "8px 10px 0 10px" },
	custName: {
		fontSize: "9pt",
		fontWeight: 700,
		marginTop: "4px"
	},
	custAddr: {
		fontSize: "8.5pt",
		color: "#333",
		marginTop: "3px",
		lineHeight: 1.5
	},
	custMeta: {
		padding: "3px 10px",
		borderTop: "none",
		fontSize: "9pt",
		display: "flex",
		gap: "30px",
		marginTop: "3px"
	},
	invMetaCell: {
		padding: "6px 10px",
		display: "flex",
		flexDirection: "column" as const,
		justifyContent: "flex-start",
		gap: "4px"
	},
	metaRow: {
		display: "flex",
		fontSize: "9.5pt",
		alignItems: "baseline",
		lineHeight: "1.2"
	},
	metaLabel: {
		width: "82px",
		color: "#555",
		fontWeight: 600
	},
	metaColon: {
		width: "10px",
		color: "#555",
		fontWeight: 600,
		textAlign: "center" as const
	},
	metaValue: {
		fontWeight: 700,
		fontStyle: "italic",
		fontSize: "9.5pt"
	},
	itemsWrap: {
		flexGrow: 1,
		display: "flex",
		flexDirection: "column" as const
	},
	footerTable: {
		width: "100%",
		borderCollapse: "collapse" as const,
		borderTop: "1px solid #333",
		fontSize: "9pt"
	},
	ftTdL: {
		borderRight: "1px solid #333",
		padding: "0",
		verticalAlign: "top" as const,
		width: "62%"
	},
	ftTdR: {
		padding: "0",
		verticalAlign: "top" as const,
		width: "38%"
	},
	brandRow: {
		display: "flex",
		justifyContent: "space-between",
		borderTop: "1px solid #333",
		padding: "4px 8px",
		fontSize: "7.5pt",
		color: "#666",
		fontStyle: "italic"
	}
};

const fmtPlain = (v: number) => v.toLocaleString("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const stateCodeMap: Record<string, string> = {
	"jammu & kashmir": "01",
	"jammu and kashmir": "01",
	"himachal pradesh": "02",
	"punjab": "03",
	"chandigarh": "04",
	"uttarakhand": "05",
	"haryana": "06",
	"delhi": "07",
	"rajasthan": "08",
	"uttar pradesh": "09",
	"bihar": "10",
	"sikkim": "11",
	"arunachal pradesh": "12",
	"assam": "18",
	"west bengal": "19",
	"jharkhand": "20",
	"odisha": "21",
	"chhattisgarh": "22",
	"madhya pradesh": "23",
	"gujarat": "24",
	"daman & diu": "25",
	"daman and diu": "25",
	"dadra & nagar haveli": "26",
	"dadra and nagar haveli": "26",
	"maharashtra": "27",
	"andhra pradesh": "28",
	"karnataka": "29",
	"goa": "30",
	"lakshadweep": "31",
	"kerala": "32",
	"tamil nadu": "33",
	"tamilnadu": "33",
	"puducherry": "34",
	"pondicherry": "34",
	"telangana": "36",
	"ladakh": "38"
};

function getStateCode(s?: string) {
	if (!s) return "";
	return stateCodeMap[s.toLowerCase().trim()] || "";
}

export function ThemeDefault({ 
  company, 
  invoice, 
  customer, 
  items, 
  summary, 
  logoSize, 
  upiPaymentId, 
  showBankDetails, 
  showMrp, 
  showQrCode, 
  showTerms 
}: PrintTemplateProps) {
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const [qrUrl, setQrUrl] = React.useState("");
  const [logoError, setLogoError] = React.useState(false);

  React.useEffect(() => {
    if (upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId}&pn=${encodeURIComponent(company.name)}&am=${summary.grand_total}&cu=INR`;
      QRCode.toDataURL(upiLink, {
        width: 150,
        margin: 1
      }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total]);

  const custStateCode = customer.state ? getStateCode(customer.state) : "33";

  /* Column widths for items table (matching reference exactly) */
  const cols = [
    { w: "4%", label: "S.No.", align: "center" as const },
    { w: showMrp ? "36%" : "45%", label: "PARTICULARS", align: "left" as const },
    { w: showMrp ? "8%" : "10%", label: "HSN/SAC", align: "center" as const },
    { w: showMrp ? "8%" : "8%", label: "QTY", align: "center" as const },
    { w: showMrp ? "12%" : "12%", label: "UNIT PRICE", align: "center" as const },
    ...(showMrp ? [{ w: "12%", label: "MRP", align: "center" as const }] : []),
    { w: showMrp ? "6%" : "6%", label: "GST", align: "center" as const },
    { w: showMrp ? "14%" : "15%", label: "AMOUNT", align: "center" as const }
  ];

  return (
    <div style={S.page}>
      {/* Top Header "TAX INVOICE" row */}
      <div style={S.topRow}>
        <div style={{ flex: 1 }} />
        <div style={S.topCenter}>{invoice.title || "TAX INVOICE"}</div>
        <div style={{ flex: 1, ...S.topRight }}>{invoice.copy_type || "(Original Copy)"}</div>
      </div>

      {/* The bordered box */}
      <div style={S.box}>
        {/* Company Header Row */}
        <div style={S.headerRow}>
          <div style={{ padding: "0", margin: "0" }}>
            {!logoError && company.logo_url && (logoSize || "medium") !== "hidden" && (
              <img
                src={company.logo_url}
                alt={company.name}
                onError={() => setLogoError(true)}
                style={{ height: "55px", width: "auto", objectFit: "contain" }}
              />
            )}
          </div>
          <div style={S.companyRight}>
            <div style={S.companyName}>{(company.name || "HI SECURE SOLUTIONS").toUpperCase()}</div>
            <div style={S.companyAddr}>
              {company.address && company.address.includes("Thittachery") ? (
                <>
                  <div>99, Al-Ahad Complex, Main Road, Thittachery,</div>
                  <div>Nagapattinam - 609703</div>
                </>
              ) : (
                company.address
              )}
            </div>
            <div style={S.companyContact}>Contact: {company.phone || "9042489993, 9003400586"}</div>
            <div style={S.companyContact}>Email: {company.email || "info@hisecuresolutions.com"}</div>
            <div style={S.companyContact}>Website: {company.website || "www.hisecuresolutions.com"}</div>
            <div style={S.gstinLine}>GSTIN: {company.gstin || "33CMAPM9758H1ZQ"}</div>
          </div>
        </div>

        {/* Bill To + Invoice Metadata Grid */}
        <div style={S.billGrid}>
          <div style={S.billToCell}>
            <div style={{ ...S.blueBar, borderBottom: "1px solid #333" }}>Bill To :</div>
            <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", flexGrow: 1 }}>
              <div style={{ ...S.custName, marginTop: 0, textAlign: "left" }}>{customer.name?.trim()}</div>
              <div style={{ ...S.custAddr, marginTop: "2px", textAlign: "left" }}>{customer.address?.trim() || "—"}</div>
            </div>
            <div style={{ ...S.custMeta, justifyContent: "flex-start", padding: "3px 8px", gap: "20px" }}>
              <span style={{ whiteSpace: "nowrap" }}>
                Contact: {customer.phone && customer.phone !== "—" && customer.phone !== "" ? customer.phone : "—"}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>
                PoS: {custStateCode}-{customer.state || "Tamil Nadu"}
              </span>
              {customer.gstin && (
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>GSTIN: {customer.gstin}</span>
              )}
            </div>
          </div>
          <div style={S.invMetaCell}>
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Invoice No.</span>
              <span style={S.metaColon}>:</span>
              <span style={S.metaValue}>{invoice.number}</span>
            </div>
            <div style={S.metaRow}>
              <span style={S.metaLabel}>Date</span>
              <span style={S.metaColon}>:</span>
              <span style={S.metaValue}>{invoice.date}</span>
            </div>
            {invoice.due_date && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Due Date</span>
                <span style={S.metaColon}>:</span>
                <span style={S.metaValue}>{invoice.due_date}</span>
              </div>
            )}
            {invoice.place_of_supply && (
              <div style={S.metaRow}>
                <span style={S.metaLabel}>Supply Place</span>
                <span style={S.metaColon}>:</span>
                <span style={S.metaValue}>{invoice.place_of_supply}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div style={S.itemsWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse", flexGrow: 1 }}>
            <colgroup>
              {cols.map((c, i) => (
                <col key={i} style={{ width: c.w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {cols.map((c, i) => (
                  <th
                    key={i}
                    style={{
                      ...S.blueBar,
                      textAlign: "center",
                      padding: "2.5px 4px",
                      borderRight: i < cols.length - 1 ? "1px solid rgba(255,255,255,0.3)" : "none",
                      fontSize: "9pt"
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = item.qty || 0;
                const rate = item.rate || 0;
                const taxableVal = qty * rate;
                const totalGstRate = !invoice.is_interstate 
                  ? ((item.cgst_rate || 0) + (item.sgst_rate || 0)) 
                  : (item.igst_rate || 0);

                return (
                  <tr key={idx} style={{ borderBottom: "none" }}>
                    <td style={{ padding: "3px 4px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      {item.sr || idx + 1}
                    </td>
                    <td style={{ padding: "3px 6px", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, fontSize: "8.5pt" }}>{item.description}</div>
                      {item.model && (
                        <div style={{ fontSize: "7.5pt", color: "#666", marginTop: "2px" }}>
                          Serial No : {item.model}
                        </div>
                      )}
                      {item.warranty && (
                        <div style={{ fontSize: "7.5pt", color: "#666" }}>{item.warranty}</div>
                      )}
                    </td>
                    <td style={{ padding: "3px 4px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      {item.hsn_sac || "—"}
                    </td>
                    <td style={{ padding: "3px 4px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      {qty}&nbsp;&nbsp;{item.unit || "NOS"}
                    </td>
                    <td style={{ padding: "3px 6px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      {fmtPlain(rate)}
                    </td>
                    {showMrp && (
                      <td style={{ padding: "3px 6px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                        {fmtPlain(item.mrp || rate)}
                      </td>
                    )}
                    <td style={{ padding: "3px 4px", textAlign: "center", borderRight: "1px solid #ccc", verticalAlign: "top" }}>
                      {totalGstRate}%
                    </td>
                    <td style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, verticalAlign: "top" }}>
                      {fmtPlain(taxableVal)}
                    </td>
                  </tr>
                );
              })}
              {/* Spacer empty row to push content down if needed */}
              <tr style={{ height: "100%" }}>
                {cols.map((_, i) => (
                  <td key={i} style={{ borderRight: i < cols.length - 1 ? "1px solid #ccc" : "none" }} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer section */}
        <table style={S.footerTable}>
          <colgroup>
            <col style={{ width: "62%" }} />
            <col style={{ width: "38%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={{ ...S.ftTdL, borderRight: "1px solid #333", padding: "0", verticalAlign: "top" }}>
                <div style={{ padding: "3px 8px", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "9pt", borderBottom: "1px solid #333" }}>
                  <span>Delivery Terms :</span>
                  <span>Total Qty : {totalQty}</span>
                </div>
                <div style={{ ...S.blueBar, borderBottom: "1px solid #333" }}>Invoice Amount in Words</div>
                <div style={{ padding: "4px 8px", fontSize: "9.5pt", fontWeight: 700, fontStyle: "italic", borderBottom: "1px solid #333", minHeight: "26px", display: "flex", alignItems: "center" }}>
                  {summary.amount_in_words}
                </div>
                
                {(showTerms !== false || showQrCode !== false || (showBankDetails && company.bank_name)) && (
                  <div style={{ ...S.blueBar, borderBottom: "1px solid #333" }}>Terms / Declaration</div>
                )}
                
                {(showTerms !== false || showQrCode !== false || (showBankDetails && company.bank_name)) && (
                  <div style={{ padding: "3px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    {(showTerms !== false || (showBankDetails && company.bank_name)) && (
                      <div style={{ flex: 1, fontSize: "8pt", lineHeight: 1.45, color: "#333" }}>
                        {showTerms !== false && (
                          <div style={{ marginBottom: "4px" }}>
                            <div style={{ marginBottom: "2px" }}>
                              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                            </div>
                            <div style={{ paddingLeft: "2px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <span style={{ fontWeight: 700 }}>•</span>
                                <span>Goods Once Sold will not be taken back.</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <span style={{ fontWeight: 700 }}>•</span>
                                <span>Guarantee/Warantee is only at company service center.</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <span style={{ fontWeight: 700 }}>•</span>
                                <span>Interest @18%p.m will be charged if payment delayed.</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <span style={{ fontWeight: 700 }}>•</span>
                                <span>All disputes subject to Nagapattinam jurisdiction only.</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                <span style={{ fontWeight: 700 }}>•</span>
                                <span>Warranty be void, if damage due to Lightning, Physical damage, Water Leakage & Burned.</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {showBankDetails && company.bank_name && (
                          <div style={{ fontSize: "8pt", borderTop: "1px dotted #999", paddingTop: "4px", marginTop: "4px" }}>
                            <div style={{ fontWeight: 700, marginBottom: "1px", textTransform: "uppercase" }}>
                              Bank Details:
                            </div>
                            <div>
                              Bank Name: <span style={{ fontWeight: 700 }}>{company.bank_name}</span> | Account No: <span style={{ fontWeight: 700 }}>{company.bank_account}</span>
                            </div>
                            <div>
                              IFSC Code: <span style={{ fontWeight: 700 }}>{company.ifsc_code}</span> | Branch: <span style={{ fontWeight: 700 }}>{company.branch}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {showQrCode !== false && (
                      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {upiPaymentId && qrUrl ? (
                          <div style={{ padding: "2px", border: "1px solid #333" }}>
                            <img src={qrUrl} alt="QR" style={{ width: "85px", height: "85px", display: "block" }} />
                          </div>
                        ) : (
                          <div style={{ width: "85px", height: "85px", border: "1px dashed #ccc", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "7pt", color: "#aaa", textAlign: "center" }}>
                            QR
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td style={{ padding: "0", verticalAlign: "top", width: "38%", position: "relative" }}>
                <div style={{ borderBottom: "1px solid #333" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "3px 8px", fontWeight: 700, fontSize: "9pt" }}>Sub Total</td>
                        <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700, fontSize: "9pt" }}>
                          {fmt(summary.taxable_total)}
                        </td>
                      </tr>
                      {!invoice.is_interstate ? (
                        <>
                          <tr>
                            <td style={{ padding: "2px 8px", fontSize: "8.5pt", color: "#444" }}>Add CGST</td>
                            <td style={{ padding: "2px 8px", textAlign: "right", fontSize: "8.5pt" }}>
                              {fmt(summary.cgst_total)}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "2px 8px", fontSize: "8.5pt", color: "#444" }}>Add SGST</td>
                            <td style={{ padding: "2px 8px", textAlign: "right", fontSize: "8.5pt" }}>
                              {fmt(summary.sgst_total)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td style={{ padding: "2px 8px", fontSize: "8.5pt", color: "#444" }}>Add IGST</td>
                          <td style={{ padding: "2px 8px", textAlign: "right", fontSize: "8.5pt" }}>
                            {fmt(summary.igst_total)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: "2px 8px", fontSize: "8.5pt", color: "#666" }}>
                          ${summary.round_off < 0 ? "Round Off (-)" : "Round Off (+)"}
                        </td>
                        <td style={{ padding: "2px 8px", textAlign: "right", fontSize: "8.5pt", color: "#444" }}>
                          {fmt(Math.abs(summary.round_off))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ ...S.blueBar, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9pt", borderBottom: "1px solid #333" }}>
                    <span>TOTAL</span>
                    <span>{fmt(summary.grand_total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontWeight: 700, fontSize: "9pt" }}>
                    <span>Amount Paid</span>
                    <span>{fmt(summary.grand_total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontWeight: 700, fontSize: "9pt" }}>
                    <span>Balance</span>
                    <span>₹ 0.00</span>
                  </div>
                  <div style={{ minHeight: "35px" }} />
                  <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, fontSize: "8.5pt", fontWeight: 700, textAlign: "center" }}>
                    For, {company.name || "Hi Secure Solutions"}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Brand row */}
        <div style={S.brandRow}>
          <span>See Backside For Full Terms and Conditions</span>
          <span>Powered By Hi-Secure ERP</span>
        </div>
      </div>
    </div>
  );
}

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
                <div className="text-[11px] text-slate-400">{invoice.copy_type || 'Original Copy'}</div>
                <div className="text-[12px] font-mono-premium text-slate-400 mt-1">No: {invoice.number}</div>
                <div className="text-[11px] text-slate-400">Date: {invoice.date}</div>
              </div>
            </div>
          </div>

          <div className="p-8 pb-0">
            {/* Billing details grid */}
            <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-slate-100">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">CLIENT DETAILS</div>
                <div className="text-[14px] font-bold text-slate-900">{customer.name}</div>
                {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
                <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {customer.phone && `Phone: ${customer.phone}`}
                  {customer.email && ` · Email: ${customer.email}`}
                </div>
                {customer.state && <div className="text-[10px] text-slate-500">State: {customer.state}</div>}
                {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
              </div>
              <div className="space-y-1.5 text-right text-[11px] text-slate-600 px-1">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 text-right">BUSINESS IDENTITY</div>
                {company.gstin && <div><span className="text-slate-400">GSTIN:</span> <span className="font-semibold text-slate-900">{company.gstin}</span></div>}
                {company.pan && <div><span className="text-slate-400">PAN:</span> <span className="font-semibold text-slate-900">{company.pan}</span></div>}
                <div><span className="text-slate-400">Email:</span> {company.email}</div>
                {company.website && <div><span className="text-slate-400">Web:</span> {company.website}</div>}
                {company.state && <div><span className="text-slate-400">State:</span> {company.state}</div>}
                {invoice.place_of_supply && <div><span className="text-slate-400">Place of Supply:</span> {invoice.place_of_supply}</div>}
                {invoice.reverse_charge && <div><span className="text-slate-400">Reverse Charge:</span> {invoice.reverse_charge}</div>}
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
                    <td className="py-4 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* GST Breakup Table */}
            {hsnSummaryList.length > 0 && (
              <div className="mb-6">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">GST Tax Breakup Summary</div>
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
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total in Words</div>
              <div className="text-[12px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-4 border border-slate-150 rounded-lg bg-slate-50 space-y-1 text-[10px]">
                <div className="font-bold text-slate-700 text-[11px] mb-1.5">BANK ACCOUNT LEDGER</div>
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
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 space-y-2">
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
                      <td className="text-slate-500 py-1 text-left">Round Off</td>
                      <td className="font-mono-premium text-slate-500 py-1">₹{fmt(summary.round_off)}</td>
                    </tr>
                  )}
                  <tr className="font-bold text-[14px] text-slate-900 border-t border-slate-200 pt-2">
                    <td className="py-2 text-slate-900 font-bold text-left">Grand Total</td>
                    <td className="py-2 font-mono-premium text-slate-900 text-[15px]">₹{fmt(summary.grand_total)}</td>
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
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1 inline-block text-center w-[160px]">Authorized Signatory</div>
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
            <div className="text-[24px] font-bold uppercase tracking-wider text-slate-900 font-serif-premium">{company.name}</div>
            <div className="text-[11px] italic text-slate-500 mt-1 max-w-[500px] mx-auto leading-relaxed">{company.address}</div>
            <div className="text-[11px] text-slate-500">Contact: {company.phone} · Email: {company.email}</div>
            <div className="text-[11px] font-bold mt-1 text-slate-800">
              {company.gstin && `GSTIN: ${company.gstin}`}
              {company.pan && ` · PAN: ${company.pan}`}
            </div>
            {company.state && <div className="text-[10px] text-slate-500 italic">State: {company.state}</div>}
          </div>

          {/* Invoice Title */}
          <div className="text-center mb-6">
            <span className="text-[16px] font-bold uppercase tracking-widest border-b border-slate-900 pb-1">{invoice.title || 'TAX INVOICE'}</span>
            <div className="text-[11px] italic text-slate-500 mt-1.5">{invoice.copy_type || 'Original Copy'}</div>
          </div>

          {/* Billing / Info Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-[12px]">
            <div>
              <div className="font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider mb-2 text-slate-600">INVOICE TO</div>
              <div className="font-bold text-slate-900 text-[13px]">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="mt-1 whitespace-pre-line leading-relaxed text-slate-700">{customer.address || '—'}</div>
              <div className="mt-1.5 text-slate-500">
                {customer.phone && `Phone: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
              </div>
              {customer.state && <div className="text-[11px] text-slate-500">State: {customer.state}</div>}
              {customer.gstin && <div className="font-bold mt-0.5">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="pl-6 space-y-1.5 pr-1 text-right">
              <div className="font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider mb-2 text-slate-605 text-right">DOCUMENT METADATA</div>
              <div><span className="text-slate-400">Invoice Number:</span> <span className="font-bold">{invoice.number}</span></div>
              <div><span className="text-slate-400">Issue Date:</span> {invoice.date}</div>
              {invoice.due_date && <div><span className="text-slate-400">Due Date:</span> {invoice.due_date}</div>}
              {invoice.place_of_supply && <div><span className="text-slate-400">Place of Supply:</span> {invoice.place_of_supply}</div>}
              {invoice.reverse_charge && <div><span className="text-slate-400">Reverse Charge:</span> {invoice.reverse_charge}</div>}
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-[11px] border-collapse mb-6 border-y-2 border-slate-800">
            <thead>
              <tr className="border-b border-slate-800 text-slate-900 uppercase tracking-wider text-[9px] font-bold">
                <th className="py-2.5 px-3 text-center w-[6%]">Sr.</th>
                <th className="py-2.5 px-3 text-left w-[44%]">Description of Services</th>
                <th className="py-2.5 px-3 text-center w-[12%]">HSN/SAC</th>
                <th className="py-2.5 px-3 text-center w-[8%]">Qty</th>
                <th className="py-2.5 px-3 text-right w-[12%]">Rate</th>
                <th className="py-2.5 px-3 text-center w-[8%]">GST</th>
                <th className="py-2.5 px-3 text-right w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-3 text-center">{item.sr || (idx + 1)}</td>
                  <td className="py-3.5 px-3 text-left font-bold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-500 block text-[9px] italic mt-0.5">Model: {item.model}</span>}
                    {item.warranty && <span className="font-normal text-slate-500 block text-[9px] italic">Warranty: {item.warranty}</span>}
                  </td>
                  <td className="py-3.5 px-3 text-center">{item.hsn_sac || '—'}</td>
                  <td className="py-3.5 px-3 text-center">{item.qty}</td>
                  <td className="py-3.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="py-3.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="py-3.5 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Classic GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6 text-[10px]">
              <div className="font-bold border-b border-slate-900 uppercase text-[9px] tracking-wider mb-2 text-slate-600">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-slate-800 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-800 text-slate-900 font-bold uppercase tracking-wider text-[9px]">
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
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[12px] font-bold text-slate-900 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-3 border-t border-slate-200 text-[10px] text-slate-600 leading-relaxed bg-slate-50/50">
                <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">REMITTANCE LEDGER</div>
                <div>Bank: {company.bank_name} · Account: {company.bank_account}</div>
                <div>IFSC Code: {company.ifsc_code} · Branch: {company.branch || '—'}</div>
              </div>
            )}
          </div>

          <div className="col-span-5 text-right space-y-4 pr-1">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1 text-slate-500 text-left font-medium">Taxable Net</td>
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
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
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
            <div className="text-right text-[11px] text-slate-500 leading-relaxed pr-1">
              <div className="text-[15px] font-bold text-slate-900">{company.name}</div>
              <div>{company.address}</div>
              <div>Contact: {company.phone} · Email: {company.email}</div>
              {company.website && <div>Web: {company.website}</div>}
              <div className="font-bold text-blue-600 mt-1">
                {company.gstin && `GSTIN: ${company.gstin}`}
                {company.pan && ` · PAN: ${company.pan}`}
              </div>
              {company.state && <div className="text-[10px] text-slate-400">State: {company.state}</div>}
            </div>
          </div>

          {/* Invoice Title */}
          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-6">
            <div>
              <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">Document Type</div>
              <div className="text-[18px] font-bold text-slate-900">{invoice.title || 'TAX INVOICE'}</div>
              <div className="text-[10px] text-blue-500 italic mt-0.5">{invoice.copy_type || 'Original Copy'}</div>
            </div>
            <div className="text-right pr-1">
              <div className="text-[11px] text-slate-400 text-right">Invoice Number</div>
              <div className="text-[15px] font-bold text-slate-900 font-mono-premium">{invoice.number}</div>
            </div>
          </div>

          {/* Billing details cards */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
              <div className="text-[9px] uppercase font-bold text-blue-600 tracking-wider mb-2">BILL TO CLIENT</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-655 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-2">
                {customer.phone && `Contact: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
                {customer.state && ` · State: ${customer.state}`}
              </div>
              {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">METADATA SUMMARY</div>
              <table className="w-full text-[11px] pr-1">
                <tbody>
                  <tr>
                    <td className="text-slate-500 py-0.5 text-left font-medium">Date of Issue</td>
                    <td className="text-right font-medium text-slate-900">{invoice.date}</td>
                  </tr>
                  {invoice.due_date && (
                    <tr>
                      <td className="text-slate-500 py-0.5 text-left font-medium">Due Date</td>
                      <td className="text-right font-medium text-slate-900">{invoice.due_date}</td>
                    </tr>
                  )}
                  {invoice.place_of_supply && (
                    <tr>
                      <td className="text-slate-500 py-0.5 text-left font-medium">Place of Supply</td>
                      <td className="text-right text-slate-900">{invoice.place_of_supply}</td>
                    </tr>
                  )}
                  {invoice.reverse_charge && (
                    <tr>
                      <td className="text-slate-500 py-0.5 text-left font-medium">Reverse Charge</td>
                      <td className="text-right text-slate-900">{invoice.reverse_charge}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
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
                <tr key={idx} className="even:bg-blue-50/10 hover:bg-slate-55/40">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                    {item.warranty && <span className="font-normal text-blue-600 block text-[9px]">Warranty: {item.warranty}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-medium">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Modern Blue GST Summary Breakup */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[9px] uppercase font-bold text-blue-600 tracking-wider mb-2">GST Tax Summary Breakup</div>
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
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-blue-600 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-3 border border-slate-150 bg-slate-50/50 rounded-xl space-y-1 text-[10px] text-slate-600">
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
                  <td className="py-2.5 font-mono-premium text-blue-700 text-[15px]">₹{fmt(summary.grand_total)}</td>
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
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
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
              <div className="text-[11px] text-slate-400 italic mt-0.5">{invoice.copy_type || 'Original Copy'}</div>
              <div className="text-[12px] font-semibold text-slate-800 mt-1"># {invoice.number}</div>
              <div className="text-[11px] text-slate-400 mt-1">Date: {invoice.date}</div>
            </div>
          </div>

          {/* Bill details */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-slate-100">
            <div>
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">BILLED TO</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{customer.address || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-2">
                {customer.phone && `Phone: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
              </div>
              {customer.state && <div className="text-[10px] text-slate-500">State: {customer.state}</div>}
              {customer.gstin && <div className="text-[11px] font-bold text-slate-800 mt-1">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="space-y-1 text-right text-[11px] text-slate-500 pr-1">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5 text-right">CONTACT & REGISTRY</div>
              {company.gstin && <div>GSTIN: {company.gstin}</div>}
              {company.pan && <div>PAN: {company.pan}</div>}
              <div>Email: {company.email}</div>
              {company.website && <div>Web: {company.website}</div>}
              {company.state && <div>State: {company.state}</div>}
              {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
              {invoice.reverse_charge && <div>Reverse Charge: {invoice.reverse_charge}</div>}
            </div>
          </div>

          {/* Minimal Table */}
          <table className="w-full text-[11px] border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 uppercase tracking-widest text-[9px] font-bold">
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
                <tr key={idx} className="hover:bg-slate-50/30">
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
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-3">
                <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">BANK REMITTANCE</div>
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
                      <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 text-left font-medium">SGST Total</td>
                      <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1 text-slate-500 text-left font-medium">IGST Total</td>
                    <td className="py-1 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-slate-900 border-t-2 border-slate-900">
                  <td className="py-2 text-left">Grand Total</td>
                  <td className="py-2 font-mono-premium text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-200 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">UPI Pay</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
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
              <div className="text-[10px] italic text-slate-500 mb-1">{invoice.copy_type || 'Original Copy'}</div>
              <div>Invoice No: <span className="font-bold text-slate-900">{invoice.number}</span></div>
              <div>Date: {invoice.date}</div>
              <div className="mt-1 font-semibold">
                {company.gstin && `GSTIN: ${company.gstin}`}
                {company.pan && ` · PAN: ${company.pan}`}
              </div>
              {company.state && <div className="text-[10px] text-slate-500">State: {company.state}</div>}
            </div>
          </div>

          {/* Billing section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border-l-4 border-orange-500 bg-orange-50/30 rounded-r-lg">
              <div className="text-[9px] uppercase font-bold text-orange-600 tracking-wider mb-1">BILL TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {customer.phone && `Phone: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
              </div>
              {customer.state && <div className="text-[10px] text-slate-500">State: {customer.state}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-800">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border-l-4 border-green-600 bg-green-50/20 rounded-r-lg flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-green-700 tracking-wider mb-1">PAYMENT DETAILS:</div>
              <div className="text-[11px] text-slate-600 font-medium">
                {invoice.due_date && <div>Due Date: <span className="font-semibold text-slate-900">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
                {invoice.reverse_charge && <div>Reverse Charge: {invoice.reverse_charge}</div>}
              </div>
            </div>
          </div>

          {/* Table */}
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
                <tr key={idx} className="even:bg-slate-50/50 hover:bg-slate-100/40">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Saffron GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[9px] uppercase font-bold text-orange-600 tracking-wider mb-2">GST Tax Summary Breakup</div>
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
              <div className="text-[9px] uppercase font-bold text-orange-600 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-orange-600 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-3 border-l-2 border-green-600 bg-green-50/10 rounded-r-lg space-y-1 text-[10px] text-slate-600">
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
                      <td className="py-1.5 text-slate-500 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-500 text-left font-medium">IGST Total</td>
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
                  <td className="py-2.5 font-mono-premium text-orange-600 text-[15px]">₹{fmt(summary.grand_total)}</td>
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
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
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


const getPageMinHeight = (size: string) => {
  if (size.startsWith('thermal')) return 'auto';
  switch (size) {
    case 'a5': return '720px';
    case 'letter': return '1075px';
    case 'legal': return '1320px';
    case 'executive': return '930px';
    default: return '1050px';
  }
};

export function ThemeTally({
  company,
  invoice,
  customer,
  items,
  summary,
  upiPaymentId = 'gunalan@okaxis',
  logoSize = 'medium',
  showBankDetails = true,
  showMrp = false,
  showQrCode = true,
  showTerms = true,
  size = 'a4',
  showWebsite = true,
  showEmail = true,
  showNotes = true,
  showAmountInWords = true,
  showPageNumber = true,
  showPrintedDateTime = false,
  showCompanySealPlaceholder = true,
  showCustomerGstin = true,
  showUnit = true,
  showDiscount = true,
  showHsnSac = true,
  showSerialNumber = true,
  showWarranty = true,
  showDeliveryAddress = true,
  showFooter = true,
  repeatCompactHeader = true,
  showPrintedDate = false,
  showPrintedTime = false,
  showOriginalDuplicateLabel = true,
  showPaymentTerms = true,
  showReferenceNumber = true,
  showPoNumber = true,
  watermarkText = '',
  digitalSignatureUrl = '',
  companySealUrl = '',
  rubberStampPlaceholder = true,
}: PrintTemplateProps & {
  showWebsite?: boolean;
  showEmail?: boolean;
  showNotes?: boolean;
  showAmountInWords?: boolean;
  showPageNumber?: boolean;
  showPrintedDateTime?: boolean;
  showCompanySealPlaceholder?: boolean;
  showCustomerGstin?: boolean;
  showUnit?: boolean;
  showDiscount?: boolean;
  showHsnSac?: boolean;
  showSerialNumber?: boolean;
  showWarranty?: boolean;
  showDeliveryAddress?: boolean;
  showFooter?: boolean;
  repeatCompactHeader?: boolean;
  showPrintedDate?: boolean;
  showPrintedTime?: boolean;
  showOriginalDuplicateLabel?: boolean;
  showPaymentTerms?: boolean;
  showReferenceNumber?: boolean;
  showPoNumber?: boolean;
  watermarkText?: string;
  digitalSignatureUrl?: string;
  companySealUrl?: string;
  rubberStampPlaceholder?: boolean;
  size?: string;
}) {
  const [qrUrl, setQrUrl] = React.useState<string>('');
  const isThermal = size.startsWith('thermal');
  const inv = invoice;

  React.useEffect(() => {
    if (showQrCode && upiPaymentId) {
      const upiLink = `upi://pay?pa=${upiPaymentId.trim()}&pn=${encodeURIComponent(company.name.trim())}&am=${Number(summary.grand_total || 0).toFixed(2)}&cu=INR`;
      QRCode.toDataURL(upiLink, { margin: 1, width: 400, errorCorrectionLevel: 'H' }, (err, url) => {
        if (!err) setQrUrl(url);
      });
    }
  }, [upiPaymentId, company.name, summary.grand_total, showQrCode]);

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const w = (v: number) => '₹ ' + fmt(v);
  const T = fmt;

  if (isThermal) {
    return (
      <div
        style={{
          width: '100%',
          padding: size === 'thermal-58mm' ? '2px' : '8px',
          fontFamily: 'monospace',
          fontSize: '9pt',
          color: '#000',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>{company.name}</div>
          <div style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>{company.address}</div>
          <div style={{ fontSize: '8pt' }}>GSTIN: {company.gstin}</div>
        </div>
        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
        <div style={{ fontSize: '8.5pt', lineHeight: 1.3 }}>
          <div><strong>{invoice.title || 'INVOICE'}</strong></div>
          <div>No: {invoice.number}</div>
          <div>Date: {invoice.date}</div>
          <div>Cust: {customer.name}</div>
          {customer.gstin && <div>CGSTIN: {customer.gstin}</div>}
        </div>
        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'right', width: '40px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '60px' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '3px 0' }}>{item.description}</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>{item.qty}</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>{w(item.total).replace('₹', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
        <div
          style={{
            fontSize: '8.5pt',
            alignSelf: 'flex-end',
            marginLeft: 'auto',
            width: '140px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{w(summary.taxable_total).replace('₹', '')}</span>
          </div>
          {summary.cgst_total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CGST:</span>
              <span>{w(summary.cgst_total).replace('₹', '')}</span>
            </div>
          )}
          {summary.sgst_total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SGST:</span>
              <span>{w(summary.sgst_total).replace('₹', '')}</span>
            </div>
          )}
          {summary.igst_total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>IGST:</span>
              <span>{w(summary.igst_total).replace('₹', '')}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              borderTop: '1px solid #000',
              paddingTop: '2px',
            }}
          >
            <span>Total:</span>
            <span>{w(summary.grand_total)}</span>
          </div>
        </div>
        {showQrCode && qrUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px' }}>
            <img src={qrUrl} alt="UPI QR" style={{ width: '80px', height: '80px' }} />
            <span style={{ fontSize: '7pt', color: '#555', marginTop: '2px' }}>Scan to Pay</span>
          </div>
        )}
        <div style={{ textAlign: 'center', fontSize: '8.5pt', marginTop: '12px', color: '#666' }}>
          Thank you for your business!
        </div>
      </div>
    );
  }

  const isSameAddress = !customer.shippingAddress || customer.address === customer.shippingAddress;
  const hasWarranty = showWarranty && items.some(item => item.warranty);
  const hasModel = items.some(item => item.model);
  const hasSerial = showSerialNumber && items.some((item: any) => item.serialNumber || item.batchNumber);

  // Pagination logic:
  const pages = (() => {
    const pageList: Array<{
      items: typeof items;
      isFirst: boolean;
      isLast: boolean;
      pageNumber: number;
      startIndex: number;
    }> = [];
    let currentItems: typeof items = [];
    let heightUsed = 330;
    let pageNum = 1;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let itemHeight = 38;
      if (item.description && item.description.length > 30) itemHeight += 16;
      if (hasModel && item.model) itemHeight += 12;
      if (hasWarranty && item.warranty) itemHeight += 12;

      // Force split if we already have 10 items on Page 1
      if (pageNum === 1 && currentItems.length === 10) {
        pageList.push({
          items: currentItems,
          isFirst: true,
          isLast: false,
          pageNumber: pageNum,
          startIndex: 0,
        });
        currentItems = [item];
        heightUsed = 100 + itemHeight;
        pageNum++;
        continue;
      }
      // Force split if we already have 12 items on subsequent pages
      if (pageNum > 1 && currentItems.length === 12) {
        pageList.push({
          items: currentItems,
          isFirst: false,
          isLast: false,
          pageNumber: pageNum,
          startIndex: 0,
        });
        currentItems = [item];
        heightUsed = 100 + itemHeight;
        pageNum++;
        continue;
      }

      const isLastItem = i === items.length - 1;

      if (isLastItem) {
        const summaryHeight = showBankDetails ? 390 : 260;
        if (heightUsed + itemHeight > 1030) {
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: false,
            pageNumber: pageNum,
            startIndex: 0,
          });
          currentItems = [item];
          pageNum++;
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: true,
            pageNumber: pageNum,
            startIndex: 0,
          });
        } else if (heightUsed + itemHeight + summaryHeight > 1030) {
          currentItems.push(item);
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: false,
            pageNumber: pageNum,
            startIndex: 0,
          });
          currentItems = [];
          pageNum++;
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: true,
            pageNumber: pageNum,
            startIndex: 0,
          });
        } else {
          currentItems.push(item);
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: true,
            pageNumber: pageNum,
            startIndex: 0,
          });
        }
      } else {
        if (heightUsed + itemHeight > 1030) {
          pageList.push({
            items: currentItems,
            isFirst: pageNum === 1,
            isLast: false,
            pageNumber: pageNum,
            startIndex: 0,
          });
          currentItems = [item];
          heightUsed = 100 + itemHeight;
          pageNum++;
        } else {
          currentItems.push(item);
          heightUsed += itemHeight;
        }
      }
    }

    let indexOffset = 0;
    pageList.forEach((page) => {
      page.startIndex = indexOffset;
      indexOffset += page.items.length;
    });

    return pageList;
  })();

  const totalPages = pages.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .print-page-break-after {
                page-break-after: always !important;
                break-after: always !important;
              }
            }
          `,
        }}
      />
      {pages.map((page, pageIdx) => (
        <div
          key={pageIdx}
          className="print-page-break-after"
          style={{
            width: '100%',
            backgroundColor: '#fff',
            color: '#000',
            fontFamily: '"Courier New", Courier, monospace',
            padding: '6mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            minHeight: getPageMinHeight(size),
            lineHeight: '1.3',
            position: 'relative',
          }}
        >
          {watermarkText && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontSize: '60pt',
                color: 'rgba(220, 220, 220, 0.22)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '5px',
                pointerEvents: 'none',
                zIndex: 0,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {watermarkText}
            </div>
          )}

          {showOriginalDuplicateLabel && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '4px',
                fontSize: '9.5pt',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              {invoice.copy_type || 'Original for Recipient'}
            </div>
          )}

          <div
            style={{
              border: '2px solid #000',
              padding: '4px',
              height: '275mm',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1,
            }}
          >
            {page.isFirst ? (
              <>
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '14pt',
                    fontWeight: 'bold',
                    borderBottom: '2px solid #000',
                    paddingBottom: '10px',
                    marginBottom: '14px',
                  }}
                >
                  {invoice.title || 'TAX INVOICE'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 0.85fr',
                    borderBottom: '2.5px solid #000',
                    paddingBottom: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ paddingRight: '16px' }}>
                    <div
                      style={{
                        fontSize: '13pt',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      {company.name}
                    </div>
                    <div
                      style={{
                        fontSize: '9.5pt',
                        marginTop: '6px',
                        lineHeight: 1.45,
                      }}
                    >
                      <div>{company.address}</div>
                      <div style={{ marginTop: '3px' }}>
                        Phone: {company.phone}
                        {showEmail && company.email && ` · Email: ${company.email}`}
                      </div>
                      {showWebsite && company.website && <div>Website: {company.website}</div>}
                      <div style={{ fontWeight: 'bold', marginTop: '6px' }}>
                        GSTIN: {company.gstin}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderLeft: '1.5px solid #000',
                      paddingLeft: '20px',
                      fontSize: '8.5pt',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 10px 1fr',
                        rowGap: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>Invoice No</span>
                      <span>:</span>
                      <span style={{ fontWeight: 'bold' }}>{invoice.number}</span>

                      <span style={{ fontWeight: 'bold' }}>Dated</span>
                      <span>:</span>
                      <span>{invoice.date}</span>

                      {invoice.due_date && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Due Date</span>
                          <span>:</span>
                          <span>{invoice.due_date}</span>
                        </>
                      )}

                      {invoice.place_of_supply && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Place</span>
                          <span>:</span>
                          <span>{invoice.place_of_supply}</span>
                        </>
                      )}

                      <span style={{ fontWeight: 'bold' }}>State Code</span>
                      <span>:</span>
                      <span>{getStateCode(customer.state)}</span>

                      {showPaymentTerms && invoice.payment_terms && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Terms</span>
                          <span>:</span>
                          <span>{invoice.payment_terms}</span>
                        </>
                      )}

                      {showPoNumber && (invoice.po_number || invoice.po) && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>PO Ref</span>
                          <span>:</span>
                          <span>{invoice.po_number || invoice.po}</span>
                        </>
                      )}

                      {showReferenceNumber && (invoice.reference || invoice.challan_number) && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Challan No</span>
                          <span>:</span>
                          <span>{invoice.reference || invoice.challan_number}</span>
                        </>
                      )}

                      {invoice.irn && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>IRN</span>
                          <span>:</span>
                          <span style={{ wordBreak: 'break-all', fontSize: '8.5pt' }}>{invoice.irn}</span>
                        </>
                      )}

                      {invoice.ack_number && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Ack No</span>
                          <span>:</span>
                          <span>{invoice.ack_number}</span>
                        </>
                      )}

                      {invoice.ack_date && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Ack Date</span>
                          <span>:</span>
                          <span>{invoice.ack_date}</span>
                        </>
                      )}

                      {invoice.eway_bill_number && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>E-Way Bill</span>
                          <span>:</span>
                          <span>{invoice.eway_bill_number}</span>
                        </>
                      )}

                      {invoice.vehicle_number && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Vehicle No</span>
                          <span>:</span>
                          <span>{invoice.vehicle_number}</span>
                        </>
                      )}

                      {invoice.transporter_name && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Transporter</span>
                          <span>:</span>
                          <span>{invoice.transporter_name}</span>
                        </>
                      )}

                      {invoice.dispatch_through && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Dispatch via</span>
                          <span>:</span>
                          <span>{invoice.dispatch_through}</span>
                        </>
                      )}

                      {invoice.dispatch_date && (
                        <>
                          <span style={{ fontWeight: 'bold' }}>Dispatch Dt</span>
                          <span>:</span>
                          <span>{invoice.dispatch_date}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderBottom: '2.5px solid #000',
                    paddingBottom: '14px',
                    marginBottom: '16px',
                    fontSize: '9pt',
                    display: 'grid',
                    gridTemplateColumns: showDeliveryAddress ? '1.15fr 0.85fr' : '1fr',
                    gap: '20px',
                  }}
                >
                  <div
                    style={{
                      paddingRight: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        fontSize: '8pt',
                        marginBottom: '6px',
                        borderBottom: '1px dashed #000',
                        paddingBottom: '2px',
                      }}
                    >
                      Buyer / Consignee (Bill To)
                    </div>
                    <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
                    <div style={{ whiteSpace: 'pre-line', marginTop: '3px', lineHeight: 1.45 }}>
                      {customer.address}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '8.5pt' }}>
                      {customer.phone && <div>Ph: {customer.phone}</div>}
                      {showCustomerGstin && customer.gstin && (
                        <div style={{ fontWeight: 'bold' }}>GSTIN: {customer.gstin}</div>
                      )}
                    </div>
                  </div>

                  {showDeliveryAddress && (
                    <div
                      style={{
                        borderLeft: '1.5px solid #000',
                        paddingLeft: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          fontSize: '8pt',
                          marginBottom: '6px',
                          borderBottom: '1px dashed #000',
                          paddingBottom: '2px',
                        }}
                      >
                        Delivery Address (Ship To)
                      </div>
                      {isSameAddress ? (
                        <div style={{ fontStyle: 'italic', color: '#555', marginTop: '4px' }}>
                          Same as Billing Address
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
                          <div style={{ whiteSpace: 'pre-line', marginTop: '3px', lineHeight: 1.45 }}>
                            {customer.shippingAddress}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              repeatCompactHeader && (
                <div
                  style={{
                    borderBottom: '2px solid #000',
                    paddingBottom: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '8.5pt',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    <span>{invoice.title || 'TAX INVOICE'}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '8.5pt',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                        }}
                      >
                        {company.name}
                      </span>
                      <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>
                        GSTIN: {company.gstin}
                      </span>
                    </div>
                    <div>
                      <strong>Invoice No:</strong> {invoice.number} · <strong>Dated:</strong>{' '}
                      {invoice.date}
                    </div>
                  </div>
                </div>
              )
            )}

            <div style={{ flexGrow: 1, marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  fontSize: '8.5pt',
                  border: '1.5px solid #000',
                  flexGrow: 1,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1.5px solid #000',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <th
                      style={{
                        padding: '8px 5px',
                        borderRight: '1px solid #000',
                        textAlign: 'center',
                        width: '5%',
                        fontWeight: 'bold',
                      }}
                    >
                      Sr
                    </th>
                    <th
                      style={{
                        padding: '8px 5px',
                        borderRight: '1px solid #000',
                        textAlign: 'left',
                        width: invoice.is_interstate 
                          ? (showHsnSac ? '46%' : '57%') 
                          : (showHsnSac ? '38%' : '48%'),
                        fontWeight: 'bold',
                      }}
                    >
                      Description of Items
                    </th>
                    {showHsnSac && (
                      <th
                        style={{
                          padding: '8px 5px',
                          borderRight: '1px solid #000',
                          textAlign: 'center',
                          width: invoice.is_interstate ? '11%' : '10%',
                          fontWeight: 'bold',
                        }}
                      >
                        HSN/SAC
                      </th>
                    )}
                    <th
                      style={{
                        padding: '8px 5px',
                        borderRight: '1px solid #000',
                        textAlign: 'center',
                        width: invoice.is_interstate ? '8%' : '7%',
                        fontWeight: 'bold',
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        padding: '8px 5px',
                        borderRight: '1px solid #000',
                        textAlign: 'right',
                        width: invoice.is_interstate ? '12%' : '11%',
                        fontWeight: 'bold',
                      }}
                    >
                      Rate
                    </th>
                    {invoice.is_interstate ? (
                      <th
                        style={{
                          padding: '8px 5px',
                          borderRight: '1px solid #000',
                          textAlign: 'right',
                          width: '10%',
                          fontWeight: 'bold',
                        }}
                      >
                        IGST
                      </th>
                    ) : (
                      <>
                        <th
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            textAlign: 'right',
                            width: '9%',
                            fontWeight: 'bold',
                          }}
                        >
                          CGST
                        </th>
                        <th
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            textAlign: 'right',
                            width: '9%',
                            fontWeight: 'bold',
                          }}
                        >
                          SGST
                        </th>
                      </>
                    )}
                    <th
                      style={{
                        padding: '8px 5px',
                        textAlign: 'right',
                        width: invoice.is_interstate ? '12%' : '11%',
                        fontWeight: 'bold',
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item, itemIdx) => {
                    const globalIdx = page.startIndex + itemIdx + 1;
                    return (
                      <tr
                        key={itemIdx}
                        style={{
                          borderBottom: '1px solid #cbd5e1',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          height: '1px',
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          {globalIdx}
                        </td>
                        <td
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                            lineHeight: '1.45',
                          }}
                        >
                          <div>{item.description}</div>
                          {hasModel && item.model && (
                            <div
                              style={{
                                fontSize: '8.5pt',
                                fontWeight: 'normal',
                                color: '#475569',
                                marginTop: '3px',
                              }}
                            >
                              Model: {item.model}
                            </div>
                          )}
                          {hasWarranty && item.warranty && (
                            <div
                              style={{
                                fontSize: '8.5pt',
                                fontWeight: 'normal',
                                color: '#475569',
                              }}
                            >
                              Warranty: {item.warranty}
                            </div>
                          )}
                          {hasSerial && ((item as any).serialNumber || (item as any).batchNumber) && (
                            <div
                              style={{
                                fontSize: '8.5pt',
                                fontWeight: 'normal',
                                color: '#475569',
                              }}
                            >
                              SN/Batch: {(item as any).serialNumber || (item as any).batchNumber}
                            </div>
                          )}
                        </td>
                        {showHsnSac && (
                          <td
                            style={{
                              padding: '8px 5px',
                              borderRight: '1px solid #000',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                            }}
                          >
                            {item.hsn_sac || '—'}
                          </td>
                        )}
                        <td
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                          }}
                        >
                          {item.qty} {showUnit && (item.unit || 'NOS')}
                        </td>
                        <td
                          style={{
                            padding: '8px 5px',
                            borderRight: '1px solid #000',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                          }}
                        >
                          {T(item.rate)}
                        </td>
                        {invoice.is_interstate ? (
                          <td
                            style={{
                              padding: '8px 5px',
                              borderRight: '1px solid #000',
                              textAlign: 'right',
                              verticalAlign: 'middle',
                            }}
                          >
                            {item.igst_amount && item.igst_amount > 0 ? T(item.igst_amount) : '0.00'}
                          </td>
                        ) : (
                          <>
                            <td
                              style={{
                                padding: '8px 5px',
                                borderRight: '1px solid #000',
                                textAlign: 'right',
                                verticalAlign: 'middle',
                              }}
                            >
                              {item.cgst_amount && item.cgst_amount > 0 ? T(item.cgst_amount) : '0.00'}
                            </td>
                            <td
                              style={{
                                padding: '8px 5px',
                                borderRight: '1px solid #000',
                                textAlign: 'right',
                                verticalAlign: 'middle',
                              }}
                            >
                              {item.sgst_amount && item.sgst_amount > 0 ? T(item.sgst_amount) : '0.00'}
                            </td>
                          </>
                        )}
                        <td
                          style={{
                            padding: '8px 5px',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            verticalAlign: 'middle',
                          }}
                        >
                          {T(item.total)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Spacer row to fill remaining space and push column lines to the bottom */}
                  <tr style={{ height: 'auto', flexGrow: 1 }}>
                    <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    {showHsnSac && (
                      <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    )}
                    <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    {invoice.is_interstate ? (
                      <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                    ) : (
                      <>
                        <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                        <td style={{ borderRight: '1px solid #000', padding: '0 4px' }} />
                      </>
                    )}
                    <td style={{ padding: '0 4px' }} />
                  </tr>
                </tbody>
              </table>
            </div>

            {page.isLast && (
              <div
                style={{
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  marginTop: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.25fr 0.75fr',
                    gap: '20px',
                    borderTop: '2.5px solid #000',
                    paddingTop: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {showBankDetails && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.35fr 0.65fr',
                          gap: '12px',
                          border: '1.5px solid #000',
                          padding: '10px',
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              textTransform: 'uppercase',
                              fontSize: '8pt',
                              borderBottom: '1px dashed #000',
                              paddingBottom: '3px',
                              marginBottom: '4px',
                              display: 'inline-block',
                            }}
                          >
                            Company Bank Details
                          </strong>
                          {company.bank_name ? (
                            <div
                              style={{
                                fontSize: '8pt',
                                lineHeight: 1.45,
                                marginTop: '4px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'max-content 10px 1fr',
                                  columnGap: '8px',
                                  rowGap: '3px',
                                }}
                              >
                                <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  Bank Name
                                </span>
                                <span>:</span>
                                <span>{company.bank_name}</span>

                                <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  A/C Name
                                </span>
                                <span>:</span>
                                <span style={{ whiteSpace: 'nowrap' }}>{company.name}</span>

                                <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  A/C No
                                </span>
                                <span>:</span>
                                <span>
                                  <strong>{company.bank_account}</strong>
                                </span>

                                <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  IFSC
                                </span>
                                <span>:</span>
                                <span>
                                  <strong>{company.ifsc_code}</strong>
                                </span>

                                <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  Branch
                                </span>
                                <span>:</span>
                                <span>{company.branch}</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: '8pt',
                                fontStyle: 'italic',
                                marginTop: '4px',
                              }}
                            >
                              Bank wire details not configured.
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            borderLeft: '1.5px solid #000',
                            paddingLeft: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {showQrCode && qrUrl ? (
                            <>
                              <img
                                src={qrUrl}
                                alt="UPI QR"
                                style={{
                                  width: '72px',
                                  height: '72px',
                                  filter: 'grayscale(1)',
                                  border: '1px solid #000',
                                  padding: '1px',
                                }}
                              />
                              <span
                                style={{
                                  fontSize: '8.5pt',
                                  fontWeight: 'bold',
                                  marginTop: '4px',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                SCAN TO PAY
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: '8.5pt',
                                fontStyle: 'italic',
                                color: '#555',
                              }}
                            >
                              No QR Code
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {showNotes && invoice.notes && (
                      <div style={{ fontSize: '8pt', lineHeight: 1.35 }}>
                        <strong
                          style={{
                            textTransform: 'uppercase',
                            fontSize: '8.5pt',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Notes / Remarks
                        </strong>
                        <div style={{ color: '#333' }}>{invoice.notes}</div>
                      </div>
                    )}

                    {showTerms && (
                      <div
                        style={{
                          fontSize: '8.5pt',
                          color: '#333',
                          lineHeight: 1.35,
                        }}
                      >
                        <strong
                          style={{
                            textTransform: 'uppercase',
                            fontSize: '8.5pt',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Declaration
                        </strong>
                        <div>
                          We declare that this invoice shows the actual price of the goods described
                          and that all particulars are true and correct.
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: '8.5pt',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Taxable Value:</span>
                      <span>{T(summary.taxable_total)}</span>
                    </div>

                    {summary.cgst_total > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Total CGST:</span>
                        <span>{T(summary.cgst_total)}</span>
                      </div>
                    )}

                    {summary.sgst_total > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Total SGST:</span>
                        <span>{T(summary.sgst_total)}</span>
                      </div>
                    )}

                    {summary.igst_total > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Total IGST:</span>
                        <span>{T(summary.igst_total)}</span>
                      </div>
                    )}

                    {Math.abs(summary.round_off) > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Round Off:</span>
                        <span>{T(summary.round_off)}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        marginTop: '6px',
                      }}
                    >
                      <div
                        style={{
                          borderTop: '1px solid #000',
                          width: '100%',
                          height: '0',
                          lineHeight: '0',
                          fontSize: '0',
                        }}
                      />
                      <div
                        style={{
                          borderTop: '1px solid #000',
                          width: '100%',
                          height: '0',
                          lineHeight: '0',
                          fontSize: '0',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        fontSize: '11pt',
                        padding: '4px 0',
                      }}
                    >
                      <span>Grand Total:</span>
                      <span style={{ fontWeight: 'bold' }}>{w(summary.grand_total)}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        marginBottom: '6px',
                      }}
                    >
                      <div
                        style={{
                          borderTop: '1px solid #000',
                          width: '100%',
                          height: '0',
                          lineHeight: '0',
                          fontSize: '0',
                        }}
                      />
                      <div
                        style={{
                          borderTop: '1px solid #000',
                          width: '100%',
                          height: '0',
                          lineHeight: '0',
                          fontSize: '0',
                        }}
                      />
                    </div>

                    {showAmountInWords && summary.amount_in_words && (
                      <div
                        style={{
                          fontSize: '8pt',
                          fontStyle: 'italic',
                          color: '#111',
                          lineHeight: 1.35,
                          alignSelf: 'flex-start',
                          marginTop: '2px',
                        }}
                      >
                        Amount in Words: {summary.amount_in_words}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: '12px',
                        border: '1.5px solid #000',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '115px',
                        justifyContent: 'space-between',
                        position: 'relative',
                      }}
                    >
                      <div style={{ fontSize: '8.5pt', color: '#000' }}>
                        For <strong>{company.name}</strong>
                      </div>

                      {companySealUrl && (
                        <img
                          src={companySealUrl}
                          alt="Company Seal"
                          style={{
                            position: 'absolute',
                            bottom: '15px',
                            left: '12px',
                            maxHeight: '55px',
                            maxWidth: '120px',
                            objectFit: 'contain',
                            opacity: 0.9,
                          }}
                        />
                      )}

                      {digitalSignatureUrl && (
                        <img
                          src={digitalSignatureUrl}
                          alt="Digital Sign"
                          style={{
                            position: 'absolute',
                            bottom: '15px',
                            right: '12px',
                            maxHeight: '55px',
                            maxWidth: '120px',
                            objectFit: 'contain',
                            opacity: 0.95,
                          }}
                        />
                      )}

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          zIndex: 1,
                        }}
                      >
                        <span />
                        <span
                          style={{
                            fontSize: '8.5pt',
                            fontWeight: 'bold',
                          }}
                        >
                          Authorised Signatory
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showFooter && (
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9.5pt',
                  color: '#000',
                  fontWeight: 'bold',
                }}
              >
                <span>
                  System Generated Document{' '}
                  {showPageNumber && `(Page ${page.pageNumber} of ${totalPages})`}
                </span>
                {(showPrintedDate || showPrintedTime || showPrintedDateTime) && (
                  <span>
                    Printed On:{' '}
                    {showPrintedDate && new Date().toLocaleDateString('en-IN')}{' '}
                    {showPrintedTime && new Date().toLocaleTimeString('en-IN')}{' '}
                    {!(showPrintedDate || showPrintedTime) &&
                      showPrintedDateTime &&
                      new Date().toLocaleString('en-IN')}
                  </span>
                )}
                <span>Powered by Hi-Secure ERP</span>
              </div>
            )}
          </div>
        </div>
      ))}
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
              <div className="text-[11px] text-slate-500 mt-2 max-w-[320px]">{company.address}</div>
            </div>
            <div className="text-right text-[11px] text-slate-600 leading-relaxed pr-1">
              <div className="text-[18px] font-bold text-emerald-800 uppercase">{invoice.title || 'TAX INVOICE'}</div>
              <div className="text-[10px] italic text-slate-500 mb-1">{invoice.copy_type || 'Original Copy'}</div>
              <div>Invoice No: <span className="font-bold text-slate-900">{invoice.number}</span></div>
              <div>Date: {invoice.date}</div>
              <div className="mt-1 font-semibold text-emerald-800">
                {company.gstin && `GSTIN: ${company.gstin}`}
                {company.pan && ` · PAN: ${company.pan}`}
              </div>
              {company.state && <div className="text-[10px] text-slate-500">State: {company.state}</div>}
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border-l-4 border-emerald-700 bg-emerald-50/20 rounded-r-lg">
              <div className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider mb-1">BILL TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {customer.phone && `Phone: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
              </div>
              {customer.state && <div className="text-[10px] text-slate-500">State: {customer.state}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-800">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border-l-4 border-emerald-700 bg-emerald-50/10 rounded-r-lg flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider mb-1">DOCUMENT METADATA:</div>
              <div className="text-[11px] text-slate-600 font-medium">
                {invoice.due_date && <div>Due Date: <span className="font-semibold text-slate-900">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
                {invoice.reverse_charge && <div>Reverse Charge: {invoice.reverse_charge}</div>}
              </div>
            </div>
          </div>

          {/* Table */}
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
                <tr key={idx} className="even:bg-slate-50/50 hover:bg-slate-100/40">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-400 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Emerald GST Summary Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider mb-2">GST Tax Summary Breakup</div>
              <table className="w-full text-[10px] border border-slate-200 border-collapse text-center">
                <thead>
                  <tr className="bg-emerald-50 border-b-2 border-emerald-700 text-slate-800 font-semibold">
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
              <div className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-3 border-l-2 border-emerald-700 bg-emerald-50/10 rounded-r-lg space-y-1 text-[10px] text-slate-600">
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
                      <td className="py-1.5 text-slate-500 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-500 text-left font-medium">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-emerald-800 border-t border-slate-200">
                  <td className="py-2.5 text-left font-medium">GRAND TOTAL DUE</td>
                  <td className="py-2.5 font-mono-premium text-emerald-800 text-[15px]">₹{fmt(summary.grand_total)}</td>
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
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
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
          <div className="bg-slate-800 text-white rounded-xl p-6 mb-8 flex justify-between items-center">
            <div>
              {company.logo_url && (logoSize || 'medium') !== 'hidden' ? (
                <img src={company.logo_url} alt={company.name} className="max-h-[45px] object-contain filter brightness-0 invert" />
              ) : (
                <div className="text-[20px] font-bold tracking-tight">{company.name}</div>
              )}
              <div className="text-[10px] text-slate-300 mt-1 max-w-[280px] leading-relaxed">{company.address}</div>
            </div>
            <div className="text-right pr-1">
              <div className="text-[18px] font-bold uppercase tracking-wider text-slate-200">{invoice.title || 'TAX INVOICE'}</div>
              <div className="text-[11px] text-slate-300 italic mb-1">{invoice.copy_type || 'Original Copy'}</div>
              <div className="text-[11px] font-mono-premium text-slate-300"># {invoice.number}</div>
              <div className="text-[11px] text-slate-300">Date: {invoice.date}</div>
            </div>
          </div>

          {/* Bill details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2">BILLED TO:</div>
              <div className="text-[13px] font-bold text-slate-900">{customer.name}</div>
              {customer.contactPerson && <div className="text-[10px] font-semibold text-slate-700 mt-0.5">Attn: {customer.contactPerson}</div>}
              <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{customer.address || '—'}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {customer.phone && `Phone: ${customer.phone}`}
                {customer.email && ` · Email: ${customer.email}`}
              </div>
              {customer.state && <div className="text-[10px] text-slate-500">State: {customer.state}</div>}
              {customer.gstin && <div className="text-[11px] font-bold mt-1 text-slate-800">GSTIN: {customer.gstin}</div>}
            </div>
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col justify-between">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2">SUMMARY:</div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                {invoice.due_date && <div>Due Date: <span className="font-semibold">{invoice.due_date}</span></div>}
                {invoice.place_of_supply && <div>Place of Supply: {invoice.place_of_supply}</div>}
                {invoice.reverse_charge && <div>Reverse Charge: {invoice.reverse_charge}</div>}
                <div className="mt-1 font-semibold">
                  {company.gstin && `Business GSTIN: ${company.gstin}`}
                  {company.pan && ` · PAN: ${company.pan}`}
                </div>
                {company.state && <div>State: {company.state}</div>}
              </div>
            </div>
          </div>

          {/* Table */}
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
                <tr key={idx} className="even:bg-slate-50/50 hover:bg-slate-100/40">
                  <td className="p-2.5 px-3 text-center text-slate-400">{item.sr || (idx + 1)}</td>
                  <td className="p-2.5 px-3 text-left font-semibold text-slate-900">
                    {item.description}
                    {item.model && <span className="font-normal text-slate-450 block text-[9px] mt-0.5">Model: {item.model}</span>}
                  </td>
                  <td className="p-2.5 px-3 text-center text-slate-600">{item.hsn_sac || '—'}</td>
                  <td className="p-2.5 px-3 text-center font-semibold">{item.qty} {item.unit || 'NOS'}</td>
                  <td className="p-2.5 px-3 text-right font-mono-premium text-slate-700">₹{fmt(item.rate)}</td>
                  <td className="p-2.5 px-3 text-center">{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                  <td className="p-2.5 px-3 text-right font-bold font-mono-premium text-slate-900">₹{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Charcoal GST Summary Breakup Table */}
          {hsnSummaryList.length > 0 && (
            <div className="mb-6">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2">GST Tax Summary Breakup</div>
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
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Invoice Total in Words</div>
              <div className="text-[11px] font-semibold text-slate-800 italic">{summary.amount_in_words}</div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Notes / Remarks</div>
                <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-150 rounded-lg p-2.5 whitespace-pre-line italic">{invoice.notes}</div>
              </div>
            )}

            {company.bank_name && (
              <div className="p-3 border border-slate-150 bg-slate-50 rounded-xl space-y-1 text-[10px] text-slate-600">
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
                      <td className="py-1.5 text-slate-500 text-left font-medium">CGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-500 text-left font-medium">SGST Total</td>
                      <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-slate-500 text-left font-medium">IGST Total</td>
                    <td className="py-1.5 font-mono-premium text-slate-700">₹{fmt(summary.igst_total)}</td>
                  </tr>
                )}
                {Math.abs(summary.round_off) > 0.001 && (
                  <tr>
                    <td className="py-1.5 text-slate-400 text-left font-medium">Round Off</td>
                    <td className="py-1.5 font-mono-premium text-slate-500">₹{fmt(summary.round_off)}</td>
                  </tr>
                )}
                <tr className="font-bold text-[14px] text-slate-800 border-t border-slate-200">
                  <td className="py-2.5 text-left font-medium">GRAND TOTAL DUE</td>
                  <td className="py-2.5 font-mono-premium text-slate-800 text-[15px]">₹{fmt(summary.grand_total)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end gap-4 items-center">
              {upiPaymentId && qrUrl && (
                <div className="flex flex-col items-center justify-center p-1 border border-slate-100 rounded-md bg-white shadow-sm flex-shrink-0">
                  <img src={qrUrl} alt="UPI QR Code" className="w-[56px] h-[56px]" />
                  <div className="text-[6px] text-slate-405 font-bold uppercase tracking-wider mt-0.5">UPI PAY</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-500">For {company.name}</div>
                <div className="h-[40px]" />
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-700 border-t border-slate-200 pt-1.5 inline-block text-center w-[160px]">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
