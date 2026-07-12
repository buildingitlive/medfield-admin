import React, { useState } from 'react';
import { Bell, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TopNavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleMobileSidebar }) => {
  const { adminProfile, partnerProfile, role, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const name = role === 'admin' ? adminProfile?.name : partnerProfile?.name;
  const initial = name?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="flex justify-between items-center w-full h-16 px-6 sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <div className="flex items-center gap-6">
        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-primary p-1"
          onClick={onToggleMobileSidebar}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="text-xl font-semibold text-primary tracking-tight">
          MedField Portal
        </div>
      </div>


      <div className="flex-1 flex justify-end items-center gap-3">
        {/* Action Buttons */}
        {role === 'admin' && (
          <>
            <button className="hidden sm:block px-4 py-2 text-on-surface-variant border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-variant transition-colors">
              Export
            </button>
            <button className="hidden sm:block px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold shadow-sm hover:bg-primary-container transition-colors">
              Add Record
            </button>
          </>
        )}

        {/* Icon Buttons */}
        <div className="flex items-center gap-1 text-on-surface-variant ml-3 border-l border-outline-variant pl-3">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
          </button>

          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full bg-surface-variant ml-2 flex-shrink-0 border border-outline-variant cursor-pointer flex items-center justify-center text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {initial}
            </div>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/30 mb-1">
                    <p className="text-sm font-semibold text-on-surface truncate">{name}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{role}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/30 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
