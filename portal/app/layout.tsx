import React from 'react';

export const metadata = {
  title: 'HiSecure Customer Portal',
  description: 'HiSecure Customer Complaint Registration & Invoicing Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0b0f19', color: '#f3f4f6', fontFamily: 'sans-serif', margin: 0 }}>
        <header style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>HiSecure Customer Portal</h1>
          <nav style={{ display: 'flex', gap: '15px' }}>
            <a href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</a>
            <a href="/complaints" style={{ color: '#94a3b8', textDecoration: 'none' }}>Complaints</a>
            <a href="/amc" style={{ color: '#94a3b8', textDecoration: 'none' }}>AMCs</a>
            <a href="/assets" style={{ color: '#94a3b8', textDecoration: 'none' }}>Assets</a>
            <a href="/invoices" style={{ color: '#94a3b8', textDecoration: 'none' }}>Invoices</a>
            <a href="/payments" style={{ color: '#94a3b8', textDecoration: 'none' }}>Payments</a>
            <a href="/profile" style={{ color: '#94a3b8', textDecoration: 'none' }}>Profile</a>
          </nav>
        </header>
        <main style={{ padding: '20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
