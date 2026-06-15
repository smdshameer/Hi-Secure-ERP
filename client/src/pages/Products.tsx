import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconPackage, IconPlus, IconSearch, IconEye, IconEdit,
  IconAlertTriangle, IconUpload, IconX, IconDownload,
  IconCheck, IconFileSpreadsheet, IconTrash,
} from '@tabler/icons-react';
import PageBanner from '../components/PageBanner';
import api from '../services/api';
import type { Product } from '../types';
import * as XLSX from 'xlsx';



/* ─── Lightweight CSV parser ─────────────────────────────────────────── */
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim() !== '');
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  function splitRow(line: string): string[] {
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  }

  const headers = splitRow(nonEmpty[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = nonEmpty.slice(1).map(line => {
    const vals = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

/* ─── CSV template content ───────────────────────────────────────────── */
const CSV_TEMPLATE = `part_number,name,brand_name,description,cost_price,selling_price,tax_rate,initial_stock,reorder_level
HIK-DS-2CD2143G2-I,Hikvision 4MP AcuSense Fixed Dome,Hikvision,4MP IR Fixed Dome Network Camera,2800,3999,18,5,3
HIK-DS-2CD2T47G2-L,Hikvision 4MP ColorVu Fixed Bullet,Hikvision,4MP ColorVu Fixed Bullet Network Camera,3200,4499,18,3,2
`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Required columns for validation ───────────────────────────────── */
const REQUIRED_COLS = ['part_number', 'name'];
const OPTIONAL_COLS = ['brand_name', 'description', 'cost_price', 'selling_price', 'tax_rate', 'initial_stock', 'reorder_level'];
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

/* ─── Shared preview table ───────────────────────────────────────────── */
interface PreviewTableProps {
  rows: any[];
  onUpdateRow: (index: number, fields: any) => void;
}


function PreviewTable({ rows, onUpdateRow }: PreviewTableProps) {
  const headers = [
    'Part Number *',
    'Name *',
    'Brand',
    'Cost (Excl. GST)',
    'Cost (Inc. GST)',
    'Selling (Excl. GST)',
    'Selling (Inc. GST)',
    'GST Rate',
    'Initial Stock'
  ];

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '280px', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>#</th>
            {headers.map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((row, idx) => {
            const taxRate = row.tax_rate !== undefined && !isNaN(Number(row.tax_rate)) ? Number(row.tax_rate) : 18;
            // Use pre-computed display values (set inline in filteredProducts)
            const costExcl = Number(row._costExcl !== undefined ? row._costExcl : row.cost_price) || 0;
            const costInc  = Number(row._costIncl !== undefined ? row._costIncl : Math.round(costExcl * (1 + taxRate / 100) * 100) / 100) || 0;
            const sellExcl = Number(row._sellExcl !== undefined ? row._sellExcl : row.selling_price) || 0;
            const sellInc  = Number(row._sellIncl !== undefined ? row._sellIncl : Math.round(sellExcl * (1 + taxRate / 100) * 100) / 100) || 0;

            return (
              <tr key={row._index ?? idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '6px 10px', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontWeight: 600 }}>{row.part_number}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{row.brand_name || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                
                {/* Cost prices */}
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontWeight: 500 }}>₹{costExcl.toFixed(2)}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#10b981', fontWeight: 600 }}>₹{costInc.toFixed(2)}</td>
                
                {/* Selling prices */}
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontWeight: 500 }}>₹{sellExcl.toFixed(2)}</td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#3b82f6', fontWeight: 600 }}>₹{sellInc.toFixed(2)}</td>
                
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{taxRate}%</td>
                
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <input
                    type="number"
                    min="0"
                    value={row.initial_stock === 0 ? '' : row.initial_stock}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0);
                      onUpdateRow(row._index, { initial_stock: val });
                    }}
                    style={{
                      width: '75px', padding: '3px 6px', borderRadius: '6px',
                      border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none',
                      textAlign: 'center', background: '#fff', fontWeight: 600, color: '#0f172a'
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 200 && (
        <p style={{ padding: '8px 10px', margin: 0, fontSize: '12px', color: '#94a3b8', background: '#f8fafc' }}>
          Showing first 200 of {rows.length} rows. All will be imported.
        </p>
      )}
    </div>
  );
}

/* ─── Header Normalization Helper ──────────────────────────────────── */
function normalizeHeader(header: string): string {
  const h = String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h === 'partnumber' || h === 'sku' || h === 'model' || h === 'modelnumber' || h === 'partno' || h === 'modelno') return 'part_number';
  if (h === 'name' || h === 'productname' || h === 'itemname' || h === 'title' || h === 'spec' || h === 'specification') return 'name';
  if (h === 'brand' || h === 'brandname' || h === 'make') return 'brand_name';
  if (h === 'description' || h === 'desc') return 'description';
  if (h === 'cost' || h === 'costprice' || h === 'purchaseprice' || h === 'dealerprice' || h === 'price' || h === 'costexclgst' || h === 'costexcl') return 'cost_price';
  if (h === 'sell' || h === 'sellingprice' || h === 'saleprice' || h === 'mrp' || h === 'sellingexclgst' || h === 'sellingexcl') return 'selling_price';
  if (h === 'tax' || h === 'taxrate' || h === 'gst' || h === 'gstpercent' || h === 'gstrate') return 'tax_rate';
  if (h === 'stock' || h === 'quantity' || h === 'qty' || h === 'initialstock') return 'initial_stock';
  if (h === 'reorder' || h === 'reorderlevel' || h === 'minstock' || h === 'minimumstock') return 'reorder_level';
  return h;
}

/* ─── ImportModal ────────────────────────────────────────────────────── */
interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [tab, setTab] = useState<'csv' | 'pdf'>('pdf');

  // ── Shared ──
  const [products, setProducts] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; skippedCount: number; details: string[] } | null>(null);

  // ── CSV state ──
  const [csvDragging, setCsvDragging] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // ── PDF state ──
  const [pdfDragging, setPdfDragging] = useState(false);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const pdfFileRef = useRef<HTMLInputElement>(null);

  const [originalProducts, setOriginalProducts] = useState<any[] | null>(null);
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [customMarkup, setCustomMarkup] = useState<number | ''>('');
  const [gstInclusive, setGstInclusive] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  const resetState = () => {
    setProducts(null);
    setOriginalProducts(null);
    setErrors([]);
    setCsvHeaders([]);
    setPdfFileName('');
    setMarkupPercent(0);
    setCustomMarkup('');
    setGstInclusive(false);
    setPreviewSearch('');
  };

  const handleUpdateRow = (index: number, fields: any) => {
    setOriginalProducts(prev => {
      if (!prev) return null;
      return prev.map(p => p._index === index ? { ...p, ...fields } : p);
    });
  };

  const processProducts = (list: any[], percent: number, isGstInclusive: boolean) => {
    return list.map(p => {
      const taxRate = p.tax_rate !== undefined && !isNaN(Number(p.tax_rate)) ? Number(p.tax_rate) : 18;
      // Always work from the raw original price to avoid double-division
      const origCost = p._originalCost !== undefined ? Number(p._originalCost) : (Number(p.cost_price) || 0);
      const origSell = p._originalSell !== undefined ? Number(p._originalSell) : (Number(p.selling_price) || 0);
      let cost = origCost;
      let sell = origSell;

      if (isGstInclusive) {
        cost = origCost / (1 + taxRate / 100);
        sell = origSell / (1 + taxRate / 100);
      }

      if (percent > 0) {
        sell = cost + (cost * percent) / 100;
      }

      return {
        ...p,
        cost_price: Math.round(cost * 100) / 100,
        selling_price: Math.round(sell * 100) / 100,
        tax_rate: taxRate,
        _originalCost: origCost,  // always preserve the raw import price
        _originalSell: origSell,
      };
    });
  };

  useEffect(() => {
    console.log('[ImportModal useEffect] Dependency triggered. originalProducts:', !!originalProducts, 'markupPercent:', markupPercent, 'gstInclusive:', gstInclusive);
    if (originalProducts) {
      setProducts(processProducts(originalProducts, markupPercent, gstInclusive));
    } else {
      setProducts(null);
    }
  }, [originalProducts, markupPercent, gstInclusive]);

  const handleApplyMarkup = (percent: number) => {
    setMarkupPercent(percent);
  };

  // ─── CSV/Excel handlers ────────────────────────────────────────────────────
  const handleImportFile = (file: File) => {
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel';

    if (!isCsv && !isExcel) {
      setErrors(['Please upload a valid .csv or Excel (.xlsx/.xls) file.']);
      return;
    }

    resetState();

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers: hdrs, rows } = parseCSV(text);
        if (hdrs.length === 0) { setErrors(['The CSV file is empty.']); return; }
        
        const normalizedHeaders = hdrs.map(h => normalizeHeader(h));
        const missing = [];
        if (!normalizedHeaders.includes('part_number')) missing.push('"Part Number"');
        if (!normalizedHeaders.includes('name')) missing.push('"Name"');

        if (missing.length > 0) {
          setErrors([`Could not find required columns in CSV. Please make sure it has columns named: ${missing.join(' and ')}.`]);
          setProducts(null);
          return;
        }

        const mapped = rows.map(r => {
          const item: Record<string, string> = {};
          hdrs.forEach(h => {
            const normalized = normalizeHeader(h);
            item[normalized] = r[h];
          });
          return item;
        }).filter(r => r.part_number?.trim() && r.name?.trim()).map((r, idx) => {
          const cost_price = r.cost_price ? Number(r.cost_price) : 0;
          const selling_price = r.selling_price && Number(r.selling_price) > 0 ? Number(r.selling_price) : cost_price;
          return {
            _index: idx,
            part_number: r.part_number,
            name: r.name,
            brand_name: r.brand_name || r.brand || '',
            description: r.description || '',
            cost_price,
            selling_price,
            _originalCost: cost_price,
            _originalSell: selling_price,
            tax_rate: r.tax_rate ? Number(r.tax_rate) : 18,
            initial_stock: r.initial_stock ? Number(r.initial_stock) : 0,
            reorder_level: r.reorder_level ? Number(r.reorder_level) : 5,
          };
        });

        if (mapped.length === 0) {
          setErrors(['No valid product records found in CSV file (both "Part Number" and "Name" are required for each row).']);
          setProducts(null);
          setOriginalProducts(null);
          return;
        }

        setErrors([]);
        setCsvHeaders(normalizedHeaders);
        setOriginalProducts(mapped);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const allProducts: any[] = [];
          const allHeaders = new Set<string>();

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            if (rows.length === 0) return;

            // 1. Find header row in first 15 rows
            let headerRowIndex = 0;
            let maxMatches = 0;
            for (let i = 0; i < Math.min(rows.length, 15); i++) {
              const row = rows[i];
              if (!row) continue;
              let matchCount = 0;
              row.forEach(cell => {
                const val = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (['partnumber', 'sku', 'model', 'modelnumber', 'partno', 'modelno', 'name', 'productname', 'itemname', 'spec', 'price', 'cost', 'sellingprice', 'mrp'].includes(val)) {
                  matchCount++;
                }
              });
              if (matchCount > maxMatches) {
                maxMatches = matchCount;
                headerRowIndex = i;
              }
            }

            const rawHeaders = rows[headerRowIndex] || [];
            const normalizedHeaders = rawHeaders.map(h => normalizeHeader(String(h || '')));
            normalizedHeaders.forEach(h => { if (h) allHeaders.add(h); });

            // 2. Identify column groups
            interface ColumnGroup {
              part_number_col: number;
              name_col?: number;
              selling_price_col?: number;
              brand_name_col?: number;
              description_col?: number;
              cost_price_col?: number;
              tax_rate_col?: number;
              initial_stock_col?: number;
              reorder_level_col?: number;
            }

            const groups: ColumnGroup[] = [];
            let currentGroup: ColumnGroup | null = null;

            normalizedHeaders.forEach((type, colIdx) => {
              if (type === 'part_number') {
                currentGroup = { part_number_col: colIdx };
                groups.push(currentGroup);
              } else if (currentGroup && type) {
                if (type === 'name' && currentGroup.name_col === undefined) {
                  currentGroup.name_col = colIdx;
                } else if (type === 'selling_price' && currentGroup.selling_price_col === undefined) {
                  currentGroup.selling_price_col = colIdx;
                } else if (type === 'brand_name' && currentGroup.brand_name_col === undefined) {
                  currentGroup.brand_name_col = colIdx;
                } else if (type === 'description' && currentGroup.description_col === undefined) {
                  currentGroup.description_col = colIdx;
                } else if (type === 'cost_price' && currentGroup.cost_price_col === undefined) {
                  currentGroup.cost_price_col = colIdx;
                } else if (type === 'tax_rate' && currentGroup.tax_rate_col === undefined) {
                  currentGroup.tax_rate_col = colIdx;
                } else if (type === 'initial_stock' && currentGroup.initial_stock_col === undefined) {
                  currentGroup.initial_stock_col = colIdx;
                } else if (type === 'reorder_level' && currentGroup.reorder_level_col === undefined) {
                  currentGroup.reorder_level_col = colIdx;
                }
              }
            });

            if (groups.length === 0) return;

            const defaultBrand = sheetName.trim();

            // 3. Process data rows
            let productIdx = 0;
            for (let rowIdx = headerRowIndex + 1; rowIdx < rows.length; rowIdx++) {
              const row = rows[rowIdx];
              if (!row) continue;

              groups.forEach(group => {
                const partNum = String(row[group.part_number_col] !== undefined && row[group.part_number_col] !== null ? row[group.part_number_col] : '').trim();
                
                // Skip empty rows or header duplicate cells
                if (!partNum || partNum.toLowerCase() === 'model' || partNum.toLowerCase() === 'model no' || partNum.toLowerCase() === 'part number' || partNum.toLowerCase() === 'part_number') {
                  return;
                }

                const nameVal = group.name_col !== undefined ? String(row[group.name_col] || '').trim() : '';
                const brandVal = group.brand_name_col !== undefined ? String(row[group.brand_name_col] || '').trim() : '';
                const descVal = group.description_col !== undefined ? String(row[group.description_col] || '').trim() : '';
                
                const costVal = group.cost_price_col !== undefined ? row[group.cost_price_col] : undefined;
                const cost_price = costVal !== undefined && !isNaN(Number(costVal)) ? Number(costVal) : 0;
                
                const sellVal = group.selling_price_col !== undefined ? row[group.selling_price_col] : undefined;
                const raw_selling_price = sellVal !== undefined && !isNaN(Number(sellVal)) ? Number(sellVal) : 0;
                const selling_price = raw_selling_price > 0 ? raw_selling_price : cost_price;
                
                const taxVal = group.tax_rate_col !== undefined ? row[group.tax_rate_col] : undefined;
                const tax_rate = taxVal !== undefined && !isNaN(Number(taxVal)) ? Number(taxVal) : 18;

                const stockVal = group.initial_stock_col !== undefined ? row[group.initial_stock_col] : undefined;
                const initial_stock = stockVal !== undefined && !isNaN(Number(stockVal)) ? Number(stockVal) : 0;

                const reorderVal = group.reorder_level_col !== undefined ? row[group.reorder_level_col] : undefined;
                const reorder_level = reorderVal !== undefined && !isNaN(Number(reorderVal)) ? Number(reorderVal) : 5;

                allProducts.push({
                  _index: productIdx++,
                  part_number: partNum,
                  name: nameVal || partNum,
                  brand_name: brandVal || defaultBrand,
                  description: descVal || `${defaultBrand} Product`,
                  cost_price,
                  selling_price,
                  _originalCost: cost_price,
                  _originalSell: selling_price,
                  tax_rate,
                  initial_stock,
                  reorder_level
                });
              });
            }
          });

          if (allProducts.length === 0) {
            setErrors(['No valid product records found across any sheet in this Excel file. Please ensure your Excel sheet has columns named "Model", "Model no", or "Part Number".']);
            setProducts(null);
            setOriginalProducts(null);
            return;
          }

          setErrors([]);
          setCsvHeaders(Array.from(allHeaders));
          setOriginalProducts(allProducts);
        } catch (err: any) {
          console.error('Excel parse error:', err);
          setErrors(['Failed to parse Excel file: ' + err.message]);
          setProducts(null);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // ── PDF handlers ──
  const handlePdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrors(['Please upload a valid .pdf file.']); return;
    }
    setPdfFileName(file.name);
    setPdfParsing(true);
    setErrors([]);
    setProducts(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const res = await api.post('/parts/parse-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min for AI parsing
      });
      const parsedPdfProducts = (res.data.products || []).map((p: any, idx: number) => ({
        _index: idx,
        ...p,
        _originalCost: p.cost_price,
        _originalSell: p.selling_price,
      }));
      setOriginalProducts(parsedPdfProducts);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to parse PDF. Please try again.';
      setErrors([msg]);
      setPdfFileName('');
    } finally {
      setPdfParsing(false);
    }
  };

  // ── Import ──
  const handleImport = async () => {
    if (!products || products.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post('/parts/import', { products });
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setErrors([err?.response?.data?.error || 'Import failed. Please try again.']);
    } finally {
      setImporting(false);
    }
  };

  const tabBtn = (t: 'csv' | 'pdf', label: string, icon: string) => (
    <button
      onClick={() => { setTab(t); resetState(); }}
      style={{
        flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600,
        fontSize: '13px', borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
        color: tab === t ? '#2563eb' : '#64748b',
        background: tab === t ? '#eff6ff' : '#f8fafc',
        transition: 'all 0.15s',
      }}
    >{icon} {label}</button>
  );

  // Compute display values INLINE during render so gstInclusive is always current
  // (no reliance on useEffect timing or HMR state propagation)
  const filteredProducts = products ? products.filter(p => {
    const term = previewSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      String(p?.part_number || '').toLowerCase().includes(term) ||
      String(p?.name || '').toLowerCase().includes(term) ||
      String(p?.brand_name || '').toLowerCase().includes(term) ||
      String(p?.description || '').toLowerCase().includes(term)
    );
  }).map(p => {
    const taxRate = p.tax_rate !== undefined && !isNaN(Number(p.tax_rate)) ? Number(p.tax_rate) : 18;
    // rawCost = original imported price from file (always preserved, never double-processed)
    const rawCost = Number(p._originalCost !== undefined ? p._originalCost : p.cost_price) || 0;

    // Step 1: derive exclusive cost from rawCost + GST flag
    let _costExcl: number, _costIncl: number, exclCostBase: number;
    if (gstInclusive) {
      // File prices are GST-inclusive → exclusive = raw ÷ (1 + GST%)
      _costIncl = rawCost;
      exclCostBase = Math.round((rawCost / (1 + taxRate / 100)) * 100) / 100;
      _costExcl = exclCostBase;
    } else {
      // File prices are already exclusive → inclusive = raw × (1 + GST%)
      exclCostBase = rawCost;
      _costExcl = rawCost;
      _costIncl = Math.round(rawCost * (1 + taxRate / 100) * 100) / 100;
    }

    // Step 2: compute selling price by applying markupPercent on exclusive cost (inline, always current)
    const exclSell = markupPercent > 0
      ? Math.round((exclCostBase * (1 + markupPercent / 100)) * 100) / 100
      : exclCostBase;
    const _sellExcl = exclSell;
    const _sellIncl = Math.round(exclSell * (1 + taxRate / 100) * 100) / 100;

    return { ...p, _costExcl, _costIncl, _sellExcl, _sellIncl };
  }) : [];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #1a3480 0%, #2563eb 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconFileSpreadsheet size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>Bulk Import Products</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                Import from a PDF price list or CSV spreadsheet
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <IconX size={16} />
          </button>
        </div>

        {/* Tabs - Only show when no products parsed yet */}
        {!products && !result && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            {tabBtn('pdf', 'PDF Price List (AI)', '📄')}
            {tabBtn('csv', 'CSV / Excel', '📊')}
          </div>
        )}

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* ── Success result ── */}
          {result ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconCheck size={32} color="#16a34a" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Import Complete!</h3>
              <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
                <strong style={{ color: '#16a34a' }}>{result.importedCount}</strong> products imported.
                {result.skippedCount > 0 && <> &nbsp;<strong style={{ color: '#f59e0b' }}>{result.skippedCount}</strong> skipped (duplicates).</>}
              </p>
              {result.details.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: 'auto', textAlign: 'left', background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                  {result.details.map((d, i) => <div key={i} style={{ padding: '2px 0', borderBottom: i < result.details.length - 1 ? '1px solid #f1f5f9' : 'none' }}>{d}</div>)}
                </div>
              )}
              <button onClick={onClose} style={{ marginTop: '20px', background: '#1a3480', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 28px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                Done
              </button>
            </div>
          ) : products && products.length > 0 ? (
            /* ── Unified Products preview ── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  {tab === 'pdf' ? (
                    <>🤖 AI found <span style={{ color: '#2563eb' }}>{products.length} products</span> in <strong>{pdfFileName}</strong></>
                  ) : (
                    <>Preview — <span style={{ color: '#2563eb' }}>{products.length} rows</span> ready to import</>
                  )}

                </p>
                
                {/* Search Bar - Unified & Persistent */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search preview..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '5px 10px 5px 28px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}>🔍</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>Margin Markup:</span>
                    <select
                      value={markupPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomMarkup('');
                        handleApplyMarkup(val);
                      }}
                      style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#fff' }}
                    >
                      <option value="0">0% (Cost Price)</option>
                      <option value="10">10% Markup</option>
                      <option value="15">15% Markup</option>
                      <option value="20">20% Markup</option>
                      <option value="25">25% Markup</option>
                      <option value="30">30% Markup</option>
                      <option value="40">40% Markup</option>
                      <option value="50">50% Markup</option>
                    </select>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>or Custom:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="%"
                      value={customMarkup}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setCustomMarkup(val);
                        handleApplyMarkup(val === '' ? 0 : val);
                      }}
                      style={{ width: '60px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                  </div>

                  <div style={{ width: '1px', height: '16px', background: '#e2e8f0' }} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={gstInclusive}
                      onChange={(e) => setGstInclusive(e.target.checked)}
                      style={{
                        width: '15px', height: '15px', borderRadius: '4px', border: '1px solid #cbd5e1',
                        cursor: 'pointer', accentColor: '#2563eb'
                      }}
                    />
                    <span>Treat import prices as GST-inclusive</span>
                  </label>
                </div>

                <button onClick={resetState} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>
                  <IconX size={12} /> Try another file
                </button>
              </div>
              <PreviewTable rows={filteredProducts} onUpdateRow={handleUpdateRow} />
            </div>
          ) : tab === 'pdf' ? (
            /* ── PDF upload screen ── */
            <>
              {/* Info banner */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #bfdbfe', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', lineHeight: 1 }}>🤖</span>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>AI-Powered PDF Import</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#3b82f6', lineHeight: 1.5 }}>
                    Upload any Hikvision, CP Plus, Dahua, or other brand PDF price list. The AI will automatically identify model numbers, product names, and prices.
                    Works best with <strong>text-based PDFs</strong> (not scanned images).
                  </p>
                </div>
              </div>

              {/* Drop zone or parsing state */}
              {pdfParsing ? (
                <div style={{ border: '2px dashed #bfdbfe', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', background: '#eff6ff', marginBottom: '16px' }}>
                  <div style={{ width: 52, height: 52, border: '4px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>AI is reading your price list…</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#60a5fa' }}>
                    Extracting text from <strong>{pdfFileName}</strong> and identifying products. This may take 20–60 seconds.
                  </p>
                </div>
              ) : (
                <div
                  onDragEnter={() => setPdfDragging(true)}
                  onDragLeave={() => setPdfDragging(false)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setPdfDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePdfFile(f); }}
                  onClick={() => pdfFileRef.current?.click()}
                  style={{
                    border: `2px dashed ${pdfDragging ? '#2563eb' : '#cbd5e1'}`,
                    borderRadius: '12px', padding: '48px 20px', textAlign: 'center',
                    cursor: 'pointer', background: pdfDragging ? '#eff6ff' : '#f8fafc',
                    transition: 'all 0.2s', marginBottom: '16px',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '14px', background: pdfDragging ? '#bfdbfe' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '28px', transition: 'background 0.2s' }}>
                    📄
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                    {pdfDragging ? 'Drop your PDF here' : 'Drag & drop PDF price list here'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                    or click to browse · .pdf files up to 20 MB
                  </p>
                  <input ref={pdfFileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }} />
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                  {errors.map((e, i) => <p key={i} style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>⚠ {e}</p>)}
                </div>
              )}
            </>
          ) : (
            /* ── CSV upload screen ── */
            <>
              <div style={{ background: '#f0f7ff', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', border: '1px solid #bfdbfe' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>📥 Download Template</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#3b82f6' }}>
                    Required: <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: '4px' }}>part_number</code>, <code style={{ background: '#dbeafe', padding: '1px 4px', borderRadius: '4px' }}>name</code>
                    &nbsp;· Optional: brand_name, cost_price, selling_price, tax_rate, initial_stock, reorder_level
                  </p>
                </div>
                <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a3480', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <IconDownload size={14} /> Template
                </button>
              </div>

              <div
                onDragEnter={() => setCsvDragging(true)}
                onDragLeave={() => setCsvDragging(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setCsvDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                onClick={() => csvFileRef.current?.click()}
                style={{
                  border: `2px dashed ${csvDragging ? '#2563eb' : '#cbd5e1'}`,
                  borderRadius: '12px', padding: '40px 20px', textAlign: 'center',
                  cursor: 'pointer', background: csvDragging ? '#eff6ff' : '#f8fafc',
                  transition: 'all 0.2s', marginBottom: '16px',
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: '12px', background: csvDragging ? '#bfdbfe' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', transition: 'background 0.2s' }}>
                  <IconUpload size={26} color={csvDragging ? '#1d4ed8' : '#94a3b8'} />
                </div>
                <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                  {csvDragging ? 'Drop your CSV or Excel file here' : 'Drag & drop CSV or Excel file here'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>or click to browse · .csv, .xlsx, or .xls files</p>
                <input ref={csvFileRef} type="file" accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
              </div>

              {errors.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                  {errors.map((e, i) => <p key={i} style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>⚠ {e}</p>)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
            <button onClick={onClose} style={{ background: '#fff', color: '#374151', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!products || products.length === 0 || importing || pdfParsing}
              style={{
                background: products && products.length > 0 && !importing && !pdfParsing
                  ? 'linear-gradient(135deg, #1a3480, #2563eb)' : '#e2e8f0',
                color: products && products.length > 0 && !importing && !pdfParsing ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: '8px', padding: '9px 22px',
                cursor: products && products.length > 0 && !importing && !pdfParsing ? 'pointer' : 'not-allowed',
                fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
              }}
            >
              {importing ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Importing…</>
              ) : (
                <><IconUpload size={14} /> Import {products ? `${products.length} Products` : 'Products'}</>
              )}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
/* ─── Main Products page ─────────────────────────────────────────────── */

/* ─── Main Products page ─────────────────────────────────────────────── */
export default function Products() {
  const fromDashboard = typeof window !== 'undefined' && window.location.search.includes('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'all' | 'low'>('all');
  const [loading, setLoading]   = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    setDeleting(true);
    try {
      // Call the bulk delete API endpoint
      await api.delete('/parts/bulk', {
        data: { ids: Array.from(selectedIds) }
      });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      loadProducts();
      showToast(`🗑️ ${count} product${count !== 1 ? 's' : ''} deleted successfully`);
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to delete one or more products.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const loadProducts = () => {
    setLoading(true);
    api.get('/products', { params: { search, lowStock: filter === 'low' ? true : undefined } })
      .then(r => {
        const raw = r.data.data ?? r.data ?? [];
        const mapped = (raw as any[]).map(p => ({
          id: p.part_id ?? p.id,
          sku: p.part_number ?? p.sku ?? '—',
          name: p.name,
          category: p.category ?? 'Parts',
          brand: p.brand?.name ?? p.brand ?? '—',
          purchasePrice: Number(p.cost_price ?? p.purchasePrice ?? 0),
          salePrice: Number(p.selling_price ?? p.salePrice ?? 0),
          stock: p.stock_quantity ?? p.stock ?? 0,
          minStock: p.reorder_level ?? p.minStock ?? 0,
          taxRate: Number(p.tax_rate ?? p.taxRate ?? 18),
          unit: p.unit ?? 'pcs',
          stocks: p.stocks || [],
        }));
        setProducts(mapped);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/locations')
      .then(res => setLocations(res.data || []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => { loadProducts(); }, [search, filter]);

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 relative flex-1 min-h-0 flex flex-col gap-4 pb-4 lg:pb-0">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        thead th {
          position: sticky; top: 0; z-index: 10;
          background-color: #fcfdfe !important;
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
        .page-banner { margin-bottom: 0px !important; }
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeOutRight {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
      `}</style>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? '#0f172a' : '#7f1d1d',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          fontSize: '14px', fontWeight: 500,
          animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          minWidth: 240, maxWidth: 360,
          borderLeft: `4px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: toast.type === 'success' ? '#166534' : '#991b1b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>
              {toast.type === 'success' ? 'Success' : 'Error'}
            </p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.85, marginTop: 2 }}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              fontSize: '18px', lineHeight: 1, padding: '0 2px', flexShrink: 0,
            }}
          >×</button>
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { loadProducts(); }}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
            padding: '28px 28px 24px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '14px', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            }}>
              <IconTrash size={26} color="#dc2626" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Delete {selectedIds.size} Product{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              This will <strong>permanently remove</strong> the selected products along with all
              their stock levels and movement history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: '#fff', color: '#374151', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '9px 20px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                style={{
                  background: deleting ? '#fca5a5' : '#dc2626', color: '#fff',
                  border: 'none', borderRadius: '8px', padding: '9px 20px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {deleting ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Deleting…</>
                ) : (
                  <><IconTrash size={14} /> Yes, Delete {selectedIds.size}
                </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageBanner
        icon={<IconPackage size={28} />}
        title="Products & Parts"
        subtitle="Manage inventory, stock levels and pricing"
        backLabel={fromDashboard ? 'Back to Dashboard' : 'Back'}
        backPath="/"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-all border border-white/25"
            >
              <IconUpload size={15} /> Import CSV
            </button>
            <Link to="/parts/new"
              className="flex items-center gap-1.5 bg-white text-[#1a3480] text-[13px] font-semibold px-3 py-1.5 rounded-lg">
              <IconPlus size={15} /> Add Product
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-4">
          <div className="flex gap-2 items-center">
            {[
              { label: 'All Products', value: 'all' },
              { label: '⚠ Low Stock',  value: 'low' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilter(f.value as 'all' | 'low')}
                className={[
                  'px-3 py-1 rounded-full text-[12px] font-medium border transition-all',
                  filter === f.value
                    ? 'bg-[#1a3480] text-white border-[#1a3480]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                ].join(' ')}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Bulk-delete toolbar — shown when items are selected */}
            {someSelected && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '4px 10px 4px 12px',
                animation: 'fadeIn 0.15s ease',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#dc2626', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600,
                  }}
                >
                  <IconTrash size={13} /> Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: '2px', display: 'flex', alignItems: 'center',
                  }}
                >
                  <IconX size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 h-[34px] w-[240px]">
              <IconSearch size={14} className="text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Search product, SKU..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="outline-none border-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 overflow-y-auto no-scrollbar">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 12 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    title={allSelected ? 'Deselect all' : 'Select all'}
                    style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#1a3480' }}
                  />
                </th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Brand</th>
                <th className="text-right">Purchase ₹</th>
                <th className="text-right">Sale ₹</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Min</th>
                <th>GST %</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">No products found</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} style={{ background: selectedIds.has(p.id) ? '#eff6ff' : undefined }}>
                    <td style={{ paddingLeft: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#1a3480' }}
                      />
                    </td>
                    <td className="font-mono text-[11px] text-gray-500">{p.sku}</td>
                    <td className="font-medium text-[13px]">{p.name}</td>
                    <td className="text-[12px]"><span className="pill pill-blue">{p.category}</span></td>
                    <td className="text-[12px] text-gray-500">{p.brand ?? '—'}</td>
                    <td className="text-right text-[13px]">₹{p.purchasePrice.toLocaleString('en-IN')}</td>
                    <td className="text-right text-[13px] font-medium">₹{p.salePrice.toLocaleString('en-IN')}</td>
                    <td className="text-center">
                      <span className={['font-semibold text-[13px]', p.stock <= p.minStock ? 'text-red-600' : 'text-gray-800'].join(' ')}>
                        {p.stock <= p.minStock && <IconAlertTriangle size={12} className="inline mr-0.5 text-red-500" />}
                        {p.stock}
                      </span>
                      {p.stocks && p.stocks.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-gray-400 items-center">
                          {p.stocks.map((st: any) => {
                            const locName = locations.find(l => l.location_id === st.location_id)?.name || `Loc #${st.location_id}`;
                            return (
                              <span key={st.location_id} className="whitespace-nowrap">
                                {locName}: <strong>{st.quantity}</strong>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="text-center text-[12px] text-gray-400">{p.minStock}</td>
                    <td className="text-[12px]">{p.taxRate}%</td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={'/parts/' + p.id}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEye size={14} />
                        </Link>
                        <Link to={'/parts/' + p.id + '/edit'}
                          className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          <IconEdit size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
