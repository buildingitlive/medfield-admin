import { useState } from 'react';
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
import { PartnerDashboardScreen } from './screens/PartnerDashboardScreen';
import { Loader2 } from 'lucide-react';
import './index.css';

function AppContent() {
  const { user, role, loading } = useAuth();
  const [route, setRoute] = useState('/admin/dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          onNavigate={setRoute}
        />
        <PartnerDashboardScreen onNavigate={setRoute} />
      </div>
    );
  }

  // Admin Portal
  const renderAdminScreen = () => {
    switch (route) {
      case '/admin/dashboard':
        return <DashboardScreen onNavigate={setRoute} />;
      case '/admin/orders':
        return <OrdersScreen onNavigate={setRoute} />;
      case '/admin/users':
        return <UsersScreen onNavigate={setRoute} />;
      case '/admin/products':
        return <ProductsScreen onNavigate={setRoute} />;
      case '/admin/banners':
        return <BannersScreen onNavigate={setRoute} />;
      case '/admin/partners':
        return <PartnersScreen onNavigate={setRoute} />;
      default:
        return <DashboardScreen onNavigate={setRoute} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <Sidebar currentRoute={route} onNavigate={(r) => { setRoute(r); setMobileSidebarOpen(false); }} />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px] bg-inverse-surface">
            <Sidebar currentRoute={route} onNavigate={(r) => { setRoute(r); setMobileSidebarOpen(false); }} />
          </div>
        </div>
      )}

      {/* Main Area */}
      <main className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <TopNavbar
          currentRoute={route}
          onNavigate={setRoute}
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
