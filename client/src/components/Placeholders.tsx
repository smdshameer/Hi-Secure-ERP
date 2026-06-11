// Placeholder pages — replace each with full implementation

import { Link } from 'react-router-dom';
import {
  IconDeviceDesktop, IconFileText, IconHierarchy,
  IconBuildingStore, IconShoppingCart, IconTruckDelivery,
  IconCut, IconMapPin, IconIdBadge, IconChartLine,
  IconSettings, IconCash, IconBook2, IconBuildingBank, IconBuilding,
  IconArrowLeft, IconTools,
} from '@tabler/icons-react';
import { ReactNode } from 'react';

function PlaceholderPage({
  icon, title, subtitle, backPath = '/',
}: {
  icon: ReactNode; title: string; subtitle: string; backPath?: string;
}) {
  return (
    <div>
      <div className="page-banner mb-6">
        <div className="flex items-center gap-3">
          <div className="text-white/80 text-[28px]">{icon}</div>
          <div>
            <h1 className="text-white text-[22px] font-semibold">{title}</h1>
            <p className="text-white/65 text-[13px]">{subtitle}</p>
          </div>
        </div>
        <Link
          to={backPath}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg no-underline transition-colors"
        >
          <IconArrowLeft size={15} /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <IconTools size={32} color="#1a3480" />
        </div>
        <p className="text-[16px] font-semibold text-gray-700">
          {title} Module
        </p>
        <p className="text-[13px] text-gray-400 text-center max-w-xs">
          This module is under development. It will be fully implemented in the next phase.
        </p>
        <Link
          to="/"
          className="mt-2 px-4 py-2 rounded-lg text-white text-[13px] font-medium no-underline"
          style={{ background: '#1a3480' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function POS() {
  return <PlaceholderPage icon={<IconDeviceDesktop size={28} />} title="POS" subtitle="Point of Sale — Checkout & billing" />;
}
export function Quotations() {
  return <PlaceholderPage icon={<IconFileText size={28} />} title="Quotations" subtitle="Create and manage customer quotations" />;
}
export function CRM() {
  return <PlaceholderPage icon={<IconHierarchy size={28} />} title="CRM" subtitle="Customer relationship management" />;
}
export function Suppliers() {
  return <PlaceholderPage icon={<IconBuildingStore size={28} />} title="Suppliers" subtitle="Manage your supplier directory" />;
}
export function PurchaseOrders() {
  return <PlaceholderPage icon={<IconShoppingCart size={28} />} title="Purchase Orders" subtitle="Track and manage purchase orders" />;
}
export function DeliveryChallan() {
  return <PlaceholderPage icon={<IconTruckDelivery size={28} />} title="Delivery Challan" subtitle="Manage delivery challans" />;
}
export function Technicians() {
  return <PlaceholderPage icon={<IconCut size={28} />} title="Technicians" subtitle="Manage your technician team" />;
}
export function Locations() {
  return <PlaceholderPage icon={<IconMapPin size={28} />} title="Locations" subtitle="Manage branch locations" />;
}
export function Users() {
  return <PlaceholderPage icon={<IconIdBadge size={28} />} title="Users" subtitle="Manage system users and roles" />;
}
export function Reports() {
  return <PlaceholderPage icon={<IconChartLine size={28} />} title="Reports" subtitle="Business analytics and reports" />;
}
export function Settings() {
  return <PlaceholderPage icon={<IconSettings size={28} />} title="Settings" subtitle="System configuration and preferences" />;
}
export function Payroll() {
  return <PlaceholderPage icon={<IconCash size={28} />} title="Payroll" subtitle="Manage employee salaries and payroll" />;
}
export function Accounting() {
  return <PlaceholderPage icon={<IconBook2 size={28} />} title="Accounting" subtitle="Financial records and ledger" />;
}
export function Banking() {
  return <PlaceholderPage icon={<IconBuildingBank size={28} />} title="Banking" subtitle="Manage bank accounts and transactions" />;
}
export function Companies() {
  return <PlaceholderPage icon={<IconBuilding size={28} />} title="Companies" subtitle="Multi-company management" />;
}