'use client';

import React from 'react';

export default function AmcPage() {
  const amcContracts = [
    { id: '1', contract_number: 'AMC-2026-009', start_date: '2026-01-01', end_date: '2026-12-31', status: 'ACTIVE', value: '₹18,500.00' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Active AMC Contracts</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '12px' }}>Contract No</th>
            <th style={{ padding: '12px' }}>Start Date</th>
            <th style={{ padding: '12px' }}>End Date</th>
            <th style={{ padding: '12px' }}>Value</th>
            <th style={{ padding: '12px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {amcContracts.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.contract_number}</td>
              <td style={{ padding: '12px' }}>{c.start_date}</td>
              <td style={{ padding: '12px' }}>{c.end_date}</td>
              <td style={{ padding: '12px' }}>{c.value}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#065f46', color: '#34d399' }}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
