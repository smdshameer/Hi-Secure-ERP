'use client';

import React from 'react';

export default function InvoicesPage() {
  const invoices = [
    { id: '1', invoice_number: 'INV-2026-0045', date: '2026-06-01', amount: '₹12,450.00', status: 'PAID' },
    { id: '2', invoice_number: 'INV-2026-0089', date: '2026-06-15', amount: '₹4,500.00', status: 'UNPAID' }
  ];

  const handleDownload = (invNum: string) => {
    alert(`Initiating secure PDF download for invoice ${invNum}...`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Invoices & Downloads</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '12px' }}>Invoice No</th>
            <th style={{ padding: '12px' }}>Invoice Date</th>
            <th style={{ padding: '12px' }}>Amount</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{inv.invoice_number}</td>
              <td style={{ padding: '12px' }}>{inv.date}</td>
              <td style={{ padding: '12px' }}>{inv.amount}</td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: inv.status === 'PAID' ? '#065f46' : '#7f1d1d',
                  color: inv.status === 'PAID' ? '#34d399' : '#f87171'
                }}>
                  {inv.status}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <button
                  onClick={() => handleDownload(inv.invoice_number)}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
