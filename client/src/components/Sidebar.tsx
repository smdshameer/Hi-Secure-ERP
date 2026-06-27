import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconTool,
  IconFileInvoice,
  IconDeviceDesktop,
  IconFileText,
  IconHierarchy,
  IconPackage,
  IconBuildingStore,
  IconShoppingCart,
  IconTruckDelivery,
  IconShieldCheck,
  IconUsers,
  IconScissors,
  IconMapPin,
  IconIdBadge,
  IconChartLine,
  IconSettings,
  IconCash,
  IconBook2,
  IconBuildingBank,
  IconBuilding,
  IconShieldLock,
  IconReceipt,
} from '@tabler/icons-react';

interface NavItem {
  label: string;
  path: string;
  /* Stores a human-readable icon key string that the render
   * function resolves via an explicit switch. This avoids
   * storing component references in data (which blocks Vite
   * tree-shaking) while keeping JSX the single source of truth. */
  iconKey: string;
  badge?: number;
  badgeColor?: 'red' | 'yellow';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', iconKey: 'IconLayoutDashboard' },
  { label: 'Repairs', path: '/repairs', iconKey: 'IconTool', badge: 29, badgeColor: 'red' },
  { label: 'Invoices', path: '/sales', iconKey: 'IconFileInvoice' },
  { label: 'POS', path: '/pos', iconKey: 'IconDeviceDesktop' },
  { label: 'Quotations', path: '/quotations', iconKey: 'IconFileText' },
  { label: 'CRM', path: '/crm', iconKey: 'IconHierarchy' },
  { label: 'Products', path: '/parts', iconKey: 'IconPackage', badge: 282, badgeColor: 'yellow' },
  { label: 'Suppliers', path: '/suppliers', iconKey: 'IconBuildingStore' },
  { label: 'Purchase Orders', path: '/purchases', iconKey: 'IconShoppingCart' },
  { label: 'Delivery Challan', path: '/delivery-challans', iconKey: 'IconTruckDelivery' },
  { label: 'Approvals', path: '/approvals', iconKey: 'IconShieldCheck' },
  { label: 'Customers', path: '/customers', iconKey: 'IconUsers' },
  { label: 'Technicians', path: '/technicians', iconKey: 'IconScissors' },
  { label: 'Locations', path: '/locations', iconKey: 'IconMapPin' },
  { label: 'Users', path: '/users', iconKey: 'IconIdBadge' },
  { label: 'Reports', path: '/reports', iconKey: 'IconChartLine' },
  { label: 'Settings', path: '/settings', iconKey: 'IconSettings' },
  { label: 'Payroll', path: '/payroll', iconKey: 'IconCash' },
  { label: 'Accounting', path: '/accounting', iconKey: 'IconBook2' },
  { label: 'GST & Returns', path: '/gst-returns', iconKey: 'IconReceipt' },
  { label: 'Banking', path: '/banking', iconKey: 'IconBuildingBank' },
  { label: 'Companies', path: '/companies', iconKey: 'IconBuilding' },
  { label: 'System Audit', path: '/admin/audit', iconKey: 'IconShieldLock' },
];

type TablerIcon = React.FC<{ size?: number; stroke?: number }>;

/* Explicit switch — every branch imports its icon directly,
 * so Vite tree-shaking can prove each icon is reachable. */
function SidebarIcon({ name, size = 18, stroke = 1.5 }: { name: string; size?: number; stroke?: number }) {
  switch (name) {
    case 'IconLayoutDashboard': return <IconLayoutDashboard size={size} stroke={stroke} />;
    case 'IconTool':           return <IconTool size={size} stroke={stroke} />;
    case 'IconFileInvoice':    return <IconFileInvoice size={size} stroke={stroke} />;
    case 'IconDeviceDesktop':  return <IconDeviceDesktop size={size} stroke={stroke} />;
    case 'IconFileText':       return <IconFileText size={size} stroke={stroke} />;
    case 'IconHierarchy':      return <IconHierarchy size={size} stroke={stroke} />;
    case 'IconPackage':        return <IconPackage size={size} stroke={stroke} />;
    case 'IconBuildingStore':  return <IconBuildingStore size={size} stroke={stroke} />;
    case 'IconShoppingCart':   return <IconShoppingCart size={size} stroke={stroke} />;
    case 'IconTruckDelivery':  return <IconTruckDelivery size={size} stroke={stroke} />;
    case 'IconShieldCheck':    return <IconShieldCheck size={size} stroke={stroke} />;
    case 'IconUsers':          return <IconUsers size={size} stroke={stroke} />;
    case 'IconScissors':       return <IconScissors size={size} stroke={stroke} />;
    case 'IconMapPin':         return <IconMapPin size={size} stroke={stroke} />;
    case 'IconIdBadge':        return <IconIdBadge size={size} stroke={stroke} />;
    case 'IconChartLine':      return <IconChartLine size={size} stroke={stroke} />;
    case 'IconSettings':       return <IconSettings size={size} stroke={stroke} />;
    case 'IconCash':           return <IconCash size={size} stroke={stroke} />;
    case 'IconBook2':          return <IconBook2 size={size} stroke={stroke} />;
    case 'IconBuildingBank':   return <IconBuildingBank size={size} stroke={stroke} />;
    case 'IconBuilding':       return <IconBuilding size={size} stroke={stroke} />;
    case 'IconShieldLock':     return <IconShieldLock size={size} stroke={stroke} />;
    case 'IconReceipt':        return <IconReceipt size={size} stroke={stroke} />;
    default:                   return null;
  }
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <nav
      className={[
        'sidebar-nav',
        isOpen ? 'open' : '',
        'w-[180px] bg-[#1a3480] flex-shrink-0',
        'flex flex-col h-full no-print overflow-hidden',
      ].join(' ')}
    >
      {/* Sidebar Header */}
      <div className="flex items-center gap-[11px] px-3 py-3 border-b border-white/10 mb-2 sidebar-header flex-shrink-0">
        <span
          className="flex-shrink-0 flex items-center justify-center text-white"
          style={{ width: 22, height: 22 }}
        >
          <IconShieldCheck size={22} stroke={1.5} />
        </span>
        <span className="sidebar-label text-white font-bold text-[15px] tracking-wide whitespace-nowrap">Hi-Secure ERP</span>
      </div>

      {/* Scrollable Navigation Items */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-2 py-1.5 custom-sidebar-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-[11px]',
                'px-3 py-[7.5px] rounded-lg text-[13.5px]',
                'transition-colors duration-150 cursor-pointer',
                isActive
                  ? 'bg-white/[0.18] text-white font-medium'
                  : 'text-white/[0.78] hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <span
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: 18, height: 18 }}
            >
              <SidebarIcon name={item.iconKey} size={18} stroke={1.5} />
            </span>
            <span className="sidebar-label flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={[
                  'text-white text-[10px] font-semibold',
                  'px-1.5 py-0.5 rounded-full min-w-[22px] text-center',
                  item.badgeColor === 'yellow' ? 'bg-amber-500' : 'bg-red-500',
                ].join(' ')}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
