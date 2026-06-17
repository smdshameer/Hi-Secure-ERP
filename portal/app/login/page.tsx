'use client';

import React, { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Logged in successfully!');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Portal Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', boxSizing: 'border-box' }}
            required
          />
        </div>
        <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          Login
        </button>
      </form>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a href="/forgot-password" style={{ color: '#3b82f6', fontSize: '14px', textDecoration: 'none' }}>Forgot Password?</a>
      </div>
    </div>
  );
}
