import React from 'react';
import { LayoutDashboard, ShoppingCart, Users, Package, Image, Handshake, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const navItems = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders', route: '/admin/orders', icon: ShoppingCart },
  { label: 'Users', route: '/admin/users', icon: Users },
  { label: 'Products', route: '/admin/products', icon: Package },
  { label: 'Banners', route: '/admin/banners', icon: Image },
  { label: 'Partners', route: '/admin/partners', icon: Handshake },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const { adminProfile, signOut } = useAuth();

  return (
    <nav className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-inverse-surface text-inverse-on-surface z-50">
      {/* Brand */}
      <div className="p-6 pb-4">
        <h1 className="text-lg font-bold text-white tracking-tight">MedField Admin</h1>
        {adminProfile && (
          <p className="text-xs text-inverse-on-surface/60 mt-0.5">System Administrator</p>
        )}
      </div>

      {/* Admin Profile Card */}
      {adminProfile && (
        <div className="mx-4 mb-4 p-3 bg-tertiary-container/40 rounded-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container font-bold text-sm flex items-center justify-center flex-shrink-0">
            {adminProfile.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{adminProfile.name || 'Admin'}</p>
            <p className="text-[10px] text-inverse-on-surface/50 truncate">{adminProfile.email}</p>
          </div>
        </div>
      )}

      {/* New Entry Button */}
      <div className="px-4 mb-4">
        <button className="w-full py-2.5 bg-primary-fixed text-on-primary-fixed-variant font-semibold text-xs rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          + New Entry
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150
                ${isActive
                  ? 'bg-tertiary-container text-secondary-fixed border-l-4 border-secondary-fixed'
                  : 'text-on-tertiary-container hover:bg-tertiary-container/50'
                }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-2 py-4 flex flex-col gap-0.5 border-t border-tertiary-container/50">
        <button
          onClick={() => onNavigate('/admin/settings')}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-xs font-semibold text-on-tertiary-container hover:bg-tertiary-container/50 transition-colors"
        >
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-xs font-semibold text-error-container hover:bg-error/20 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};
