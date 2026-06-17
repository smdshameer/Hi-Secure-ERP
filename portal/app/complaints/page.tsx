'use client';

import React, { useState } from 'react';

export default function ComplaintsPage() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [complaints, setComplaints] = useState([
    { id: '1', title: 'Compressor Leak', status: 'IN_PROGRESS', date: '2026-06-15' },
    { id: '2', title: 'Display Panel Flickering', status: 'RESOLVED', date: '2026-06-10' }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newComplaint = {
      id: String(complaints.length + 1),
      title,
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0]
    };
    setComplaints([newComplaint, ...complaints]);
    setTitle('');
    setDesc('');
    alert('Complaint registered successfully!');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155', height: 'fit-content' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Register Complaint</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Complaint Subject</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Detailed Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box', minHeight: '100px' }}
              required
            />
          </div>
          <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            Submit Complaint
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Complaint History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {complaints.map((c) => (
            <div key={c.id} style={{ padding: '15px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{c.title}</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: c.status === 'RESOLVED' ? '#065f46' : c.status === 'IN_PROGRESS' ? '#1e3a8a' : '#78350f',
                  color: c.status === 'RESOLVED' ? '#34d399' : c.status === 'IN_PROGRESS' ? '#60a5fa' : '#fbbf24'
                }}>
                  {c.status}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>Date: {c.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
