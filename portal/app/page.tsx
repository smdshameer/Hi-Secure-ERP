'use client';

import React from 'react';

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Welcome back, Acme Corp</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#94a3b8' }}>Active Complaints</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#38bdf8' }}>3</p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#94a3b8' }}>Active AMC Contracts</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#34d399' }}>1</p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#94a3b8' }}>Registered Assets</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>12</p>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#94a3b8' }}>Outstanding Balance</h3>
          <p style={{ margin: 0, fontSize: '36px', fontWeight: 'bold', color: '#f87171' }}>₹4,500.00</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/complaints" style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>Register a Complaint</a>
          <a href="/invoices" style={{ backgroundColor: '#475569', color: 'white', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>Download Latest Invoices</a>
        </div>
      </div>
    </div>
  );
}
