import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}
export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Determine main container classes based on current route requirements
  const getMainClass = () => {
    const path = location.pathname;

    // Reports and Settings scroll the main container naturally
    if (path === '/reports' || path === '/settings') {
      return "flex-1 overflow-y-auto p-5 content-area";
    }

    // Complex document forms (InvoiceForm, QuotationForm, POForm, ChallanForm)
    // require desktop side-by-side stable columns but natural scroll on mobile viewports.
    const complexFormPrefixes = ['/sales/', '/quotations/', '/purchase-orders/', '/delivery-challans/'];
    const isComplexForm = complexFormPrefixes.some(prefix => path.startsWith(prefix)) &&
      (path.endsWith('/edit') || path.endsWith('/new') || path.includes('/new') || path.includes('/create'));
    if (isComplexForm) {
      return "flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col p-5 content-area";
    }

    // Simple forms (e.g. /users/new, /users/1, /customers/new) should scroll normally
    const isSimpleForm = path.split('/').filter(Boolean).length > 1 && path !== '/pos';
    if (isSimpleForm) {
      return "flex-1 overflow-y-auto p-5 content-area";
    }

    // All standard tabular list pages get stable headers and internal table scroll containment
    return "flex-1 overflow-hidden flex flex-col p-5 content-area";
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 layout-wrapper">
      <Header userName="System Admin" role="admin" />
      <div className="flex flex-1 overflow-hidden main-container">
        <Sidebar />
        <main className={getMainClass()}>
          {children}
        </main>
      </div>
    </div>
  );
}
