'use client';

import React from 'react';

export default function AssetsPage() {
  const assets = [
    { id: '1', name: 'Carrier Air Conditioner 2 Ton', serial: 'CR-90812739', model: 'CAC-2024-X', installation_date: '2024-04-12' },
    { id: '2', name: 'Voltas Water Dispenser', serial: 'VW-8871239', model: 'VWD-A10', installation_date: '2025-02-18' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Registered Assets</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '12px' }}>Asset Name</th>
            <th style={{ padding: '12px' }}>Serial Number</th>
            <th style={{ padding: '12px' }}>Model Number</th>
            <th style={{ padding: '12px' }}>Installation Date</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.name}</td>
              <td style={{ padding: '12px' }}>{a.serial}</td>
              <td style={{ padding: '12px' }}>{a.model}</td>
              <td style={{ padding: '12px' }}>{a.installation_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
