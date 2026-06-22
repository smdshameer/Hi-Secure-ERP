import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  userName: string;
  role: string;
  onMenuClick?: () => void;
}

export default function Header({ userName: propUserName, role: propRole, onMenuClick }: HeaderProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [placeholder, setPlaceholder] = useState('Search customers, parts, invoices...');

  // Load and sanitize username/role if stored in local storage
  const localUserStr = localStorage.getItem('user');
  let userName = propUserName;
  let role = propRole;
  if (localUserStr) {
    try {
      const localUser = JSON.parse(localUserStr);
      if (localUser.full_name) userName = localUser.full_name;
      if (localUser.role) role = localUser.role;
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    navigate('/login');
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setPlaceholder('Search...');
      } else {
        setPlaceholder('Search customers, parts, invoices...');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="flex items-center justify-between bg-[#1a3480] px-4 h-[52px] flex-shrink-0 relative no-print">

      <div className="flex items-center h-full">
        {/* Hamburger Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white/80 hover:text-white p-1 mr-2 rounded transition-colors cursor-pointer header-menu-btn"
          aria-label="Open navigation menu"
        >
          <i className="ti ti-menu-2 text-[22px]" aria-hidden="true" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 md:gap-2 text-white select-none header-logo-wrap">
          <i className="hidden sm:inline-block ti ti-shield-check text-[18px] md:text-[20px]" aria-hidden="true" />
          <span className="hidden lg:inline text-[15px] font-medium">Hi Secure Solutions</span>
          <span className="hidden sm:inline lg:hidden text-[11px] font-bold tracking-tight">Hi-Secure ERP</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center bg-white/15 rounded-md px-3 gap-2 h-[34px] w-[260px] header-search-wrap">
        <i className="ti ti-search text-white/70 text-[16px]" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && search.trim()) {
              navigate(`/search?q=${encodeURIComponent(search.trim())}`);
            }
          }}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none text-white text-[13px] w-full placeholder:text-white/60"
        />
      </div>

      {/* Notifications Icon (Mobile/Tablet only) */}
      <div className="hidden relative text-white/80 hover:text-white cursor-pointer header-bell flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 transition-colors mr-1">
        <i className="ti ti-bell text-[20px]" aria-hidden="true" />
        <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full"></span>
      </div>

      {/* Settings & User Wrapper */}
      <div className="flex items-center gap-1.5 md:gap-2 h-full header-right-wrap">
        {/* User */}
        <div 
          className="flex items-center gap-2 text-white text-[13px] cursor-pointer select-none relative h-full header-user"
          ref={dropdownRef}
          onClick={() => setShowDropdown(v => !v)}
        >
          <div className="w-[30px] h-[30px] rounded-full bg-white/20 flex items-center justify-center">
            <i className="ti ti-user text-[16px] text-white" aria-hidden="true" />
          </div>
          <span className="hidden lg:inline">{userName}</span>
          <span className="hidden lg:inline-block bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium header-user-role">
            {role?.toLowerCase()}
          </span>
          <i className="hidden lg:inline-block ti ti-chevron-down text-[14px]" aria-hidden="true" />

          {showDropdown && (
            <div className="absolute right-0 top-[45px] bg-white rounded-lg shadow-lg border border-gray-100 p-1 min-w-[140px] z-50 text-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 rounded-md transition-colors border-none bg-none cursor-pointer text-gray-600 font-medium"
              >
                <i className="ti ti-logout text-[14px]" /> Logout
              </button>
            </div>
          )}
        </div>

        {/* Settings Icon (Mobile/Tablet only) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/settings');
          }}
          className="lg:hidden text-white/80 hover:text-white cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors border-none bg-transparent"
          aria-label="Settings"
        >
          <i className="ti ti-settings text-[20px]" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
