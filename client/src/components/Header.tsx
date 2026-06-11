import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  userName: string;
  role: string;
}

export default function Header({ userName: propUserName, role: propRole }: HeaderProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    navigate('/login');
  };

  // Fallback to localStorage values if logged in
  let userName = propUserName;
  let role = propRole;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed.full_name) userName = parsed.full_name;
      if (parsed.role) role = parsed.role;
    }
  } catch (e) {
    console.error('Error reading user from localStorage:', e);
  }

  return (
    <header className="flex items-center justify-between bg-[#1a3480] px-4 h-[52px] flex-shrink-0 relative no-print">

      {/* Logo */}
      <div className="flex items-center gap-2 text-white text-[15px] font-medium select-none">
        <i className="ti ti-shield-check text-[20px]" aria-hidden="true" />
        Hi Secure Solutions
      </div>

      {/* Search */}
      <div className="flex items-center bg-white/15 rounded-md px-3 gap-2 h-[34px] w-[260px]">
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
          placeholder="Search customers, parts, invoices..."
          className="bg-transparent border-none outline-none text-white text-[13px] w-full placeholder:text-white/60"
        />
      </div>

      {/* User */}
      <div 
        className="flex items-center gap-2 text-white text-[13px] cursor-pointer select-none relative h-full"
        ref={dropdownRef}
        onClick={() => setShowDropdown(v => !v)}
      >
        <div className="w-[30px] h-[30px] rounded-full bg-white/20 flex items-center justify-center">
          <i className="ti ti-user text-[16px] text-white" aria-hidden="true" />
        </div>
        {userName}
        <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
          {role}
        </span>
        <i className="ti ti-chevron-down text-[14px]" aria-hidden="true" />

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
    </header>
  );
}