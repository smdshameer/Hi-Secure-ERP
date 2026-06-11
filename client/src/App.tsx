import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Repairs from './pages/Repairs';
import RepairsForm from './pages/forms/RepairsForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/forms/InvoiceForm';
import POS from './pages/POS';
import Quotations from './pages/Quotations';
import QuotationsForm from './pages/forms/QuotationsForm';
import CRM from './pages/CRM';
import CRMForm from './pages/forms/CRMForm';
import Products from './pages/Products';
import PartsForm from './pages/forms/PartsForm';
import Suppliers from './pages/Suppliers';
import SuppliersForm from './pages/forms/SuppliersForm';
import SupplierDetail from './pages/SupplierDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderForm from './pages/forms/PurchaseOrderForm';
import DeliveryChallan from './pages/DeliveryChallan';
import DeliveryChallanForm from './pages/forms/DeliveryChallanForm';
import Customers from './pages/Customers';
import CustomersForm from './pages/forms/CustomersForm';
import CustomerDetail from './pages/CustomerDetail';
import Technicians from './pages/Technicians';
import TechniciansForm from './pages/forms/TechniciansForm';
import Locations from './pages/Locations';
import LocationsForm from './pages/forms/LocationsForm';
import Users from './pages/Users';
import UsersForm from './pages/forms/UsersForm';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Payroll from './pages/Payroll';
import PayrollForm from './pages/forms/PayrollForm';
import Accounting from './pages/Accounting';
import Banking from './pages/Banking';
import Companies from './pages/Companies';
import CompaniesForm from './pages/forms/CompaniesForm';
import InvoiceDetail from './pages/InvoiceDetail';
import QuotationDetail from './pages/QuotationDetail';
import DeliveryChallanDetail from './pages/DeliveryChallanDetail';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Search from './pages/Search';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/payroll/runs" element={<PayrollForm backPath="/payroll" />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/banking" element={<Banking />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/new" element={<CompaniesForm backPath="/companies" />} />
          <Route path="/companies/:id/edit" element={<CompaniesForm backPath="/companies" />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <p className="text-6xl font-bold text-gray-200">404</p>
              <p className="text-[15px]">Page not found</p>
            </div>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
