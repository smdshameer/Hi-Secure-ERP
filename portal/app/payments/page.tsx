'use client';

import React from 'react';

export default function PaymentsPage() {
  const payments = [
    { id: '1', payment_ref: 'PAY-8827391', date: '2026-06-02', amount: '₹12,450.00', method: 'Razorpay UPI' }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>Payment History</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
            <th style={{ padding: '12px' }}>Payment Ref</th>
            <th style={{ padding: '12px' }}>Date</th>
            <th style={{ padding: '12px' }}>Amount</th>
            <th style={{ padding: '12px' }}>Method</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.payment_ref}</td>
              <td style={{ padding: '12px' }}>{p.date}</td>
              <td style={{ padding: '12px' }}>{p.amount}</td>
              <td style={{ padding: '12px' }}>{p.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
