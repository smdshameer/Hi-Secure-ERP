// ─── Navigation ───────────────────────────────────────────────
export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  badgeColor?: 'red' | 'yellow';
}

// ─── Auth / User ───────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'accountant' | 'viewer';
}

// ─── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  activeRepairs: number;
  newRepairs: number;
  customers: number;
  lowStock: number;
  completedMonth: number;
  completedRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  revenue30Day: number;
  lowStockItems: number;
  activeLeads?: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

// ─── Repair ───────────────────────────────────────────────────
export type RepairStatus =
  | 'received'
  | 'diagnosed'
  | 'in repair'
  | 'waiting parts'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export interface Repair {
  id: number;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  product: string;
  brand: string;
  model: string;
  issue: string;
  status: RepairStatus;
  technicianId?: number;
  technicianName?: string;
  estimatedCost: number;
  actualCost: number;
  receivedAt: string;
  updatedAt: string;
  age: string;
}

// ─── Invoice ──────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partial' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial';

export interface InvoiceItem {
  id: number;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customerName: string;
  customerGstin?: string;
  placeOfSupply: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  deliveryChallanId?: number;
  notes?: string;
}

// ─── Customer ─────────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  gstin?: string;
  totalRepairs: number;
  totalInvoices: number;
  createdAt: string;
}

// ─── Product / Part ───────────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  taxRate: number;
  supplierId?: number;
  supplierName?: string;
  stocks?: any[];
}

// ─── Supplier ─────────────────────────────────────────────────
export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
}

// ─── Purchase Order ───────────────────────────────────────────
export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  grandTotal: number;
}

export interface PurchaseItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ─── Delivery Challan ─────────────────────────────────────────
export interface DeliveryChallan {
  id: number;
  challanNumber: string;
  customerId: number;
  customerName: string;
  challanDate: string;
  items: ChallanItem[];
  status: 'draft' | 'dispatched' | 'delivered';
}

export interface ChallanItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
}

// ─── Technician ───────────────────────────────────────────────
export interface Technician {
  id: number;
  name: string;
  phone: string;
  email?: string;
  specialization: string;
  activeRepairs: number;
  completedRepairs: number;
  joinedAt: string;
}

// ─── Quotation ────────────────────────────────────────────────
export interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  customerId?: number;
  quotationDate: string;
  validUntil: string;
  items: InvoiceItem[];
  grandTotal: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

// ─── Payroll ──────────────────────────────────────────────────
export interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'paid';
  paidAt?: string;
}

// ─── API Response wrapper ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
