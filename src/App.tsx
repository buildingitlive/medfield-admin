import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { UsersScreen } from './screens/UsersScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { BannersScreen } from './screens/BannersScreen';
import { PartnersScreen } from './screens/PartnersScreen';
import { PushNotificationsScreen } from './screens/PushNotificationsScreen';
import { PartnerDashboardScreen } from './screens/PartnerDashboardScreen';
import { usePushNotification } from './hooks/usePushNotification';
import { Loader2 } from 'lucide-react';
import './index.css';

function getRoute(): string {
  const path = window.location.pathname;
  if (['/dashboard', '/orders', '/users', '/products', '/banners', '/partners', '/notifications', '/settings'].includes(path)) {
    return path;
  }
  return '/dashboard';
}

function AppContent() {
  const { user, role, loading } = useAuth();
  
  usePushNotification();

  const [route, setRouteState] = useState(getRoute);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigate = useCallback((r: string) => {
    setRouteState(r);
    window.history.pushState({}, '', r);
    setMobileSidebarOpen(false);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setRouteState(getRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-on-surface-variant">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user || !role) {
    return <LoginScreen />;
  }

  // Partner Portal (no sidebar, just top nav + content)
  if (role === 'partner') {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <TopNavbar
          currentRoute={route}
          onNavigate={navigate}
        />
        <PartnerDashboardScreen onNavigate={navigate} />
      </div>
    );
  }

  // Admin Portal
  const renderAdminScreen = () => {
    switch (route) {
      case '/dashboard':
        return <DashboardScreen onNavigate={navigate} />;
      case '/orders':
        return <OrdersScreen onNavigate={navigate} />;
      case '/users':
        return <UsersScreen onNavigate={navigate} />;
      case '/products':
        return <ProductsScreen onNavigate={navigate} />;
      case '/banners':
        return <BannersScreen onNavigate={navigate} />;
      case '/partners':
        return <PartnersScreen onNavigate={navigate} />;
      case '/notifications':
        return <PushNotificationsScreen onNavigate={navigate} />;
      default:
        return <DashboardScreen onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      {/* Sidebar — desktop only */}
      <Sidebar currentRoute={route} onNavigate={navigate} />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px] bg-inverse-surface">
            <Sidebar currentRoute={route} onNavigate={navigate} isMobile />
          </div>
        </div>
      )}

      {/* Main Area */}
      <main className="md:ml-[260px] flex flex-col min-h-screen min-w-0">
        <TopNavbar
          currentRoute={route}
          onNavigate={navigate}
          onToggleMobileSidebar={() => setMobileSidebarOpen(o => !o)}
        />
        {renderAdminScreen()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
