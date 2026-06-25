import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconTool, IconFileInvoice, IconDeviceDesktop,
  IconFileText, IconHierarchy, IconPackage, IconBuildingStore, IconShoppingCart,
  IconTruckDelivery, IconShieldCheck, IconUsers, IconScissors, IconMapPin,
  IconIdBadge, IconChartLine, IconSettings, IconCash, IconBook2,
  IconBuildingBank, IconBuilding, IconShieldLock
} from '@tabler/icons-react';

type IconComp = React.FC<{ size?: number; stroke?: number }>;

interface NavItem {
  label: string;
  path: string;
  icon: IconComp;
  iconSize?: number;
  badge?: number;
  badgeColor?: 'red' | 'yellow';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: IconLayoutDashboard },
  { label: 'Repairs', path: '/repairs', icon: IconTool, badge: 29, badgeColor: 'red' },
  { label: 'Invoices', path: '/sales', icon: IconFileInvoice },
  { label: 'POS', path: '/pos', icon: IconDeviceDesktop },
  { label: 'Quotations', path: '/quotations', icon: IconFileText },
  { label: 'CRM', path: '/crm', icon: IconHierarchy },
  { label: 'Products', path: '/parts', icon: IconPackage, badge: 282, badgeColor: 'yellow' },
  { label: 'Suppliers', path: '/suppliers', icon: IconBuildingStore },
  { label: 'Purchase Orders', path: '/purchases', icon: IconShoppingCart },
  { label: 'Delivery Challan', path: '/delivery-challans', icon: IconTruckDelivery },
  { label: 'Approvals', path: '/approvals', icon: IconShieldCheck },
  { label: 'Customers', path: '/customers', icon: IconUsers },
  { label: 'Technicians', path: '/technicians', icon: IconScissors },
  { label: 'Locations', path: '/locations', icon: IconMapPin },
  { label: 'Users', path: '/users', icon: IconIdBadge },
  { label: 'Reports', path: '/reports', icon: IconChartLine },
  { label: 'Settings', path: '/settings', icon: IconSettings },
  { label: 'Payroll', path: '/payroll', icon: IconCash },
  { label: 'Accounting', path: '/accounting', icon: IconBook2 },
  { label: 'Banking', path: '/banking', icon: IconBuildingBank },
  { label: 'Companies', path: '/companies', icon: IconBuilding },
  { label: 'System Audit', path: '/admin/audit', icon: IconShieldLock },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <nav className={`sidebar-nav ${isOpen ? 'open' : ''} w-[180px] bg-[#1a3480] flex-shrink-0 overflow-y-auto flex flex-col gap-0.5 px-2 py-1.5 h-full no-print`}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-[11px] px-3 py-[7.5px] rounded-lg text-[13.5px] transition-colors duration-150 cursor-pointer ${
              isActive
                ? 'bg-white/[0.18] text-white font-medium'
                : 'text-white/[0.78] hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18 }}>
            <item.icon size={18} stroke={1.5} />
          </span>
          <span className="sidebar-label flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span className={`text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
              item.badgeColor === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
