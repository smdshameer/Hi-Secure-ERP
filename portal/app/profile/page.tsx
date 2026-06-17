'use client';

import React from 'react';

export default function ProfilePage() {
  const customerInfo = {
    name: 'Acme Corp',
    code: 'CUST-10023',
    email: 'billing@acme.com',
    phone: '+91 98765 43210',
    address: '123 Industrial Area, Phase II, Bangalore, Karnataka, 560001'
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Customer Profile Management</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', fontSize: '16px' }}>
        <div style={{ color: '#94a3b8' }}>Company Name:</div>
        <div style={{ fontWeight: 'bold' }}>{customerInfo.name}</div>
        
        <div style={{ color: '#94a3b8' }}>Customer Code:</div>
        <div style={{ fontFamily: 'monospace' }}>{customerInfo.code}</div>
        
        <div style={{ color: '#94a3b8' }}>Email:</div>
        <div>{customerInfo.email}</div>
        
        <div style={{ color: '#94a3b8' }}>Phone:</div>
        <div>{customerInfo.phone}</div>
        
        <div style={{ color: '#94a3b8' }}>Billing Address:</div>
        <div>{customerInfo.address}</div>
      </div>
    </div>
  );
}
