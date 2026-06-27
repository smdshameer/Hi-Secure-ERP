import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy load all pages — only the current page is downloaded
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Search = lazy(() => import('./pages/Search'));
const Repairs = lazy(() => import('./pages/Repairs'));
const RepairsForm = lazy(() => import('./pages/forms/RepairsForm'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceForm = lazy(() => import('./pages/forms/InvoiceForm'));
const POS = lazy(() => import('./pages/POS'));
const Quotations = lazy(() => import('./pages/Quotations'));
const QuotationsForm = lazy(() => import('./pages/forms/QuotationsForm'));
const CRM = lazy(() => import('./pages/CRM'));
const CRMForm = lazy(() => import('./pages/forms/CRMForm'));
const Products = lazy(() => import('./pages/Products'));
const PartsForm = lazy(() => import('./pages/forms/PartsForm'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const SuppliersForm = lazy(() => import('./pages/forms/SuppliersForm'));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseOrderForm = lazy(() => import('./pages/forms/PurchaseOrderForm'));
const DeliveryChallan = lazy(() => import('./pages/DeliveryChallan'));
const DeliveryChallanForm = lazy(() => import('./pages/forms/DeliveryChallanForm'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomersForm = lazy(() => import('./pages/forms/CustomersForm'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Technicians = lazy(() => import('./pages/Technicians'));
const TechniciansForm = lazy(() => import('./pages/forms/TechniciansForm'));
const Locations = lazy(() => import('./pages/Locations'));
const LocationsForm = lazy(() => import('./pages/forms/LocationsForm'));
const Users = lazy(() => import('./pages/Users'));
const UsersForm = lazy(() => import('./pages/forms/UsersForm'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Payroll = lazy(() => import('./pages/Payroll'));
const PayrollForm = lazy(() => import('./pages/forms/PayrollForm'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Banking = lazy(() => import('./pages/Banking'));
const Companies = lazy(() => import('./pages/Companies'));
const CompaniesForm = lazy(() => import('./pages/forms/CompaniesForm'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const QuotationDetail = lazy(() => import('./pages/QuotationDetail'));
const DeliveryChallanDetail = lazy(() => import('./pages/DeliveryChallanDetail'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const Approvals = lazy(() => import('./pages/Approvals'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const AuditDashboard = lazy(() => import('./pages/AuditDashboard'));
const GstReturns = lazy(() => import('./pages/GstReturns'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<Search />} />
            <Route path="/repairs" element={<Repairs />} />
            <Route path="/repairs/new" element={<RepairsForm backPath="/repairs" />} />
            <Route path="/repairs/:id" element={<RepairsForm backPath="/repairs" />} />
            <Route path="/repairs/:id/edit" element={<RepairsForm backPath="/repairs" />} />
            <Route path="/sales" element={<Invoices />} />
            <Route path="/sales/:id" element={<InvoiceDetail />} />
            <Route path="/sales/:id/print" element={<InvoiceDetail />} />
            <Route path="/sales/new" element={<InvoiceForm backPath="/sales" />} />
            <Route path="/sales/:id/edit" element={<InvoiceForm backPath="/sales" />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/:id" element={<QuotationDetail />} />
            <Route path="/quotations/new" element={<QuotationsForm backPath="/quotations" />} />
            <Route path="/quotations/:id/edit" element={<QuotationsForm backPath="/quotations" />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/crm/new" element={<CRMForm backPath="/crm" />} />
            <Route path="/crm/:id/edit" element={<CRMForm backPath="/crm" />} />
            <Route path="/parts" element={<Products />} />
            <Route path="/parts/:id" element={<ProductDetail />} />
            <Route path="/parts/new" element={<PartsForm backPath="/parts" />} />
            <Route path="/parts/:id/edit" element={<PartsForm backPath="/parts" />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/suppliers/new" element={<SuppliersForm backPath="/suppliers" />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/suppliers/:id/edit" element={<SuppliersForm backPath="/suppliers" />} />
            <Route path="/purchases" element={<PurchaseOrders />} />
            <Route path="/purchases/:id" element={<PurchaseOrderDetail />} />
            <Route path="/purchases/new" element={<PurchaseOrderForm backPath="/purchases" />} />
            <Route path="/purchases/:id/edit" element={<PurchaseOrderForm backPath="/purchases" />} />
            <Route path="/delivery-challans" element={<DeliveryChallan />} />
            <Route path="/delivery-challans/:id" element={<DeliveryChallanDetail />} />
            <Route path="/delivery-challans/new" element={<DeliveryChallanForm backPath="/delivery-challans" />} />
            <Route path="/delivery-challans/:id/edit" element={<DeliveryChallanForm backPath="/delivery-challans" />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<CustomersForm backPath="/customers" />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/customers/:id/edit" element={<CustomersForm backPath="/customers" />} />
            <Route path="/technicians" element={<Technicians />} />
            <Route path="/technicians/new" element={<TechniciansForm backPath="/technicians" />} />
            <Route path="/technicians/:id/edit" element={<TechniciansForm backPath="/technicians" />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/locations/new" element={<LocationsForm backPath="/locations" />} />
            <Route path="/locations/:id/edit" element={<LocationsForm backPath="/locations" />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/new" element={<UsersForm backPath="/users" />} />
            <Route path="/users/:id/edit" element={<UsersForm backPath="/users" />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll/runs" element={<PayrollForm backPath="/payroll" />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/banking" element={<Banking />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/new" element={<CompaniesForm backPath="/companies" />} />
            <Route path="/companies/:id/edit" element={<CompaniesForm backPath="/companies" />} />
            <Route path="/admin/audit" element={<AuditDashboard />} />
            <Route path="/gst-returns" element={<GstReturns />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <p className="text-6xl font-bold text-gray-200">404</p>
                <p className="text-[15px]">Page not found</p>
              </div>
            } />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
