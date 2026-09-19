import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { StoreProvider } from '@/lib/storeContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import Inventory from '@/pages/Inventory';
import Customers from '@/pages/Customers';
import Suppliers from '@/pages/Suppliers';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Promotions from '@/pages/Promotions';
import Staff from '@/pages/Staff';
import Delivery from '@/pages/Delivery';
import Settings from '@/pages/Settings';
import Storefront from '@/pages/Storefront';
import OnlineOrders from '@/pages/OnlineOrders';
import Marketing from '@/pages/Marketing';
import Transfers from '@/pages/Transfers';
import CycleCounts from '@/pages/CycleCounts';
import Forecasting from '@/pages/Forecasting';
import WasteLog from '@/pages/WasteLog';
import StoreTransfers from '@/pages/StoreTransfers';
import GiftCards from '@/pages/GiftCards';
import KitchenDisplay from '@/pages/KitchenDisplay';
import CustomerPortal from '@/pages/CustomerPortal';
import FinancialReports from '@/pages/FinancialReports';
import SupplierPortal from '@/pages/SupplierPortal';
import AuditLog from '@/pages/AuditLog';
import MarketingCampaigns from '@/pages/MarketingCampaigns';
import ExpenseTracker from '@/pages/ExpenseTracker';
import DeviceManagement from '@/pages/DeviceManagement';
import TaxConfig from '@/pages/TaxConfig';
import VendorReturns from '@/pages/VendorReturns';
import RestrictedItems from '@/pages/RestrictedItems';
import ShiftSummary from '@/pages/ShiftSummary';
import SuperAdmin from '@/pages/SuperAdmin';
import ExpenseTracking from '@/pages/ExpenseTracking';
import PriceHistory from '@/pages/PriceHistory';
import StaffPerformance from '@/pages/StaffPerformance';
import CustomerHistory from '@/pages/CustomerHistory';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <StoreProvider>
      <Routes>
        <Route path="/storefront" element={<Storefront />} />
        <Route path="/customer-portal" element={<CustomerPortal />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/online-orders" element={<OnlineOrders />} />
          <Route path="/kitchen-display" element={<KitchenDisplay />} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/store-transfers" element={<StoreTransfers />} />
          <Route path="/cycle-counts" element={<CycleCounts />} />
          <Route path="/waste-log" element={<WasteLog />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/supplier-portal" element={<SupplierPortal />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/marketing-campaigns" element={<MarketingCampaigns />} />
          <Route path="/gift-cards" element={<GiftCards />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/forecasting" element={<Forecasting />} />
          <Route path="/financial-reports" element={<FinancialReports />} />
          <Route path="/expense-tracker" element={<ExpenseTracker />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/hardware-management" element={<DeviceManagement />} />
          <Route path="/tax-settings" element={<TaxConfig />} />
          <Route path="/vendor-returns" element={<VendorReturns />} />
          <Route path="/restricted-items" element={<RestrictedItems />} />
          <Route path="/shift-summary" element={<ShiftSummary />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/expenses" element={<ExpenseTracking />} />
          <Route path="/price-history" element={<PriceHistory />} />
          <Route path="/staff-performance" element={<StaffPerformance />} />
          <Route path="/customer-history" element={<CustomerHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </StoreProvider>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App