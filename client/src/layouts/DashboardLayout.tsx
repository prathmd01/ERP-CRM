import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface NavItem {
  name: string;
  path: string;
  roles: Role[];
  icon: string;
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
      icon: '📊',
    },
    {
      name: 'Customers CRM',
      path: '/customers',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      icon: '👥',
    },
    {
      name: 'Products Master',
      path: '/products',
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
      icon: '📦',
    },
    {
      name: 'Inventory & Stock',
      path: '/inventory',
      roles: ['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'],
      icon: '🔄',
    },
    {
      name: 'Sales Challans',
      path: '/challans',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      icon: '📄',
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-30 bg-gray-900/50 md:hidden"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-indigo-900 text-white shadow-xl transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center justify-center bg-indigo-950 px-6">
            <span className="text-xl font-bold tracking-wider text-indigo-200">ERP + CRM Portal</span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-4 space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-700 text-white shadow-md'
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-indigo-850 bg-indigo-950 flex flex-col space-y-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate text-white">{user?.name}</span>
            <span className="text-xs text-indigo-300 truncate">{user?.email}</span>
            <span className="mt-1 self-start inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-800 text-indigo-200 uppercase">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 shadow"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-indigo-800 hover:bg-indigo-50 md:hidden"
            >
              <span className="mb-1 block h-0.5 w-5 bg-current" />
              <span className="mb-1 block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </button>
            <h1 className="truncate text-base font-bold text-gray-800 sm:text-lg">
            {location.pathname === '/dashboard' && 'Dashboard Overview'}
            {location.pathname.startsWith('/customers') && 'CRM Customer Management'}
            {location.pathname.startsWith('/products') && 'Products Catalog'}
            {location.pathname.startsWith('/inventory') && 'Inventory & Stock Ledger'}
            {location.pathname.startsWith('/challans') && 'Sales Challan Operations'}
            </h1>
          </div>
          <div className="hidden sm:flex items-center space-y-1">
            <span className="text-sm text-gray-500 mr-2">Current System Date:</span>
            <span className="text-sm font-semibold text-gray-700">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
