import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '@/lib/storeContext';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck,
  ClipboardList, Tag, CalendarClock, Route, Settings, Store as StoreIcon,
  Menu, X, ChevronDown, ShoppingBag, Mail, ArrowRightLeft, ClipboardCheck,
  TrendingUp, ExternalLink, Trash2, Ticket as GiftIcon, ChefHat, Award,
  BarChart3, FileText, Shield, Wallet, Monitor, Percent, Building2,
  Undo2, ShieldAlert, Crown, History, Gauge, UserSearch,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'POS Terminal', path: '/pos', icon: ShoppingCart },
      { label: 'Online Orders', path: '/online-orders', icon: ShoppingBag },
      { label: 'Kitchen Display', path: '/kitchen-display', icon: ChefHat },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', path: '/products', icon: Package },
      { label: 'Inventory', path: '/inventory', icon: Boxes },
      { label: 'Transfers', path: '/transfers', icon: ArrowRightLeft },
      { label: 'Store Transfers', path: '/store-transfers', icon: Building2 },
      { label: 'Cycle Counts', path: '/cycle-counts', icon: ClipboardCheck },
      { label: 'Waste Log', path: '/waste-log', icon: Trash2 },
      { label: 'Vendor Returns', path: '/vendor-returns', icon: Undo2 },
      { label: 'Restricted Items', path: '/restricted-items', icon: ShieldAlert },
      { label: 'Price History', path: '/price-history', icon: History },
    ],
  },
  {
    label: 'Sales & Customers',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Customer History', path: '/customer-history', icon: UserSearch },
      { label: 'Gift Cards', path: '/gift-cards', icon: GiftIcon },
      { label: 'Promotions', path: '/promotions', icon: Tag },
      { label: 'Marketing', path: '/marketing', icon: Mail },
      { label: 'Campaigns', path: '/marketing-campaigns', icon: Mail },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { label: 'Suppliers', path: '/suppliers', icon: Truck },
      { label: 'Supplier Portal', path: '/supplier-portal', icon: FileText },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
    ],
  },
  {
    label: 'Finance & Reports',
    items: [
      { label: 'Financial Reports', path: '/financial-reports', icon: BarChart3 },
      { label: 'Expense Tracking', path: '/expenses', icon: Wallet },
      { label: 'Forecasting', path: '/forecasting', icon: TrendingUp },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff Scheduling', path: '/staff', icon: CalendarClock },
      { label: 'Staff Performance', path: '/staff-performance', icon: Gauge },
      { label: 'Shift Summary', path: '/shift-summary', icon: ClipboardCheck },
      { label: 'Delivery Routes', path: '/delivery', icon: Route },
      { label: 'Audit Log', path: '/audit-log', icon: Shield },
      { label: 'Devices', path: '/hardware-management', icon: Monitor },
      { label: 'Tax Settings', path: '/tax-settings', icon: Percent },
      { label: 'Super Admin', path: '/super-admin', icon: Crown },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const { stores, currentStore, switchStore, loading } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <StoreIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">ShelfSmart</div>
              <div className="text-slate-400 text-xs">Retail ERP + POS</div>
            </div>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon className="shrink-0" style={{ width: 18, height: 18 }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700 space-y-2">
          <Link to="/storefront" target="_blank" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-emerald-400 hover:bg-slate-800 transition-colors">
            <ExternalLink className="w-4 h-4" />
            Open Storefront
          </Link>
          <Link to="/customer-portal" target="_blank" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-400 hover:bg-slate-800 transition-colors">
            <Award className="w-4 h-4" />
            Customer Portal
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white">
                <StoreIcon className="w-4 h-4 mr-2" />
                <span className="truncate">{currentStore ? currentStore.name : 'Select Store'}</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {stores.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => switchStore(s)}>
                  <StoreIcon className="w-4 h-4 mr-2" />
                  {s.name}
                </DropdownMenuItem>
              ))}
              {stores.length === 0 && (
                <DropdownMenuItem disabled>No stores yet</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold">ShelfSmart</span>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : !currentStore ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <StoreIcon className="w-12 h-12 text-slate-300" />
              <p className="text-slate-500">No store found. Create a store in Settings to get started.</p>
              <Link to="/settings"><Button>Go to Settings</Button></Link>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}