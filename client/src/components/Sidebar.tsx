import { NavLink } from 'react-router-dom';
import { IconLayoutDashboard, IconTool, IconFileInvoice, IconDeviceDesktop,
  IconFileText, IconHierarchy, IconPackage, IconBuildingStore, IconShoppingCart,
  IconTruckDelivery, IconShieldCheck, IconUsers, IconScissors, IconMapPin,
  IconIdBadge, IconChartLine, IconSettings, IconCash, IconBook2,
  IconBuildingBank, IconBuilding, IconShieldLock } from '@tabler/icons-react';

function tablerIcon(name: string, size = 18) {
  const map: Record<string, React.FC<{ size?: number; stroke?: number }>> = {
    'ti-layout-dashboard': IconLayoutDashboard,
    'ti-tool': IconTool,
    'ti-file-invoice': IconFileInvoice,
    'ti-device-desktop': IconDeviceDesktop,
    'ti-file-text': IconFileText,
    'ti-hierarchy': IconHierarchy,
    'ti-package': IconPackage,
    'ti-building-store': IconBuildingStore,
    'ti-shopping-cart': IconShoppingCart,
    'ti-truck-delivery': IconTruckDelivery,
    'ti-shield-check': IconShieldCheck,
    'ti-users': IconUsers,
    'ti-cut': IconScissors,
    'ti-map-pin': IconMapPin,
    'ti-id-badge': IconIdBadge,
    'ti-chart-line': IconChartLine,
    'ti-settings': IconSettings,
    'ti-cash': IconCash,
    'ti-book-2': IconBook2,
    'ti-building-bank': IconBuildingBank,
    'ti-building': IconBuilding,
    'ti-shield-lock': IconShieldLock,
  };
  const Comp = map[name];
  if (!Comp) return null;
  return <Comp size={size} stroke={1.5} />;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
  badgeColor?: 'red' | 'yellow';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'ti-layout-dashboard' },
  { label: 'Repairs', path: '/repairs', icon: 'ti-tool', badge: 29, badgeColor: 'red' },
  { label: 'Invoices', path: '/sales', icon: 'ti-file-invoice' },
  { label: 'POS', path: '/pos', icon: 'ti-device-desktop' },
  { label: 'Quotations', path: '/quotations', icon: 'ti-file-text' },
  { label: 'CRM', path: '/crm', icon: 'ti-hierarchy' },
  { label: 'Products', path: '/parts', icon: 'ti-package', badge: 282, badgeColor: 'yellow' },
  { label: 'Suppliers', path: '/suppliers', icon: 'ti-building-store' },
  { label: 'Purchase Orders', path: '/purchases', icon: 'ti-shopping-cart' },
  { label: 'Delivery Challan', path: '/delivery-challans', icon: 'ti-truck-delivery' },
  { label: 'Approvals', path: '/approvals', icon: 'ti-shield-check' },
  { label: 'Customers', path: '/customers', icon: 'ti-users' },
  { label: 'Technicians', path: '/technicians', icon: 'ti-cut' },
  { label: 'Locations', path: '/locations', icon: 'ti-map-pin' },
  { label: 'Users', path: '/users', icon: 'ti-id-badge' },
  { label: 'Reports', path: '/reports', icon: 'ti-chart-line' },
  { label: 'Settings', path: '/settings', icon: 'ti-settings' },
  { label: 'Payroll', path: '/payroll', icon: 'ti-cash' },
  { label: 'Accounting', path: '/accounting', icon: 'ti-book-2' },
  { label: 'Banking', path: '/banking', icon: 'ti-building-bank' },
  { label: 'Companies', path: '/companies', icon: 'ti-building' },
  { label: 'System Audit', path: '/admin/audit', icon: 'ti-shield-lock' },
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
            {tablerIcon(item.icon, 18)}
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
