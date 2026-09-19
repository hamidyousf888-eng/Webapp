const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const { currentStore } = useStore();
  const [stats, setStats] = useState({ todaySales: 0, todayCount: 0, productCount: 0, lowStock: 0, customerCount: 0, expiringBatches: 0 });
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;
    (async () => {
      setLoading(true);
      try {
        const [sales, products, customers, batches] = await Promise.all([
          db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }),
          db.entities.Product.filter({ store_id: currentStore.id, is_active: true }),
          db.entities.Customer.filter({ store_id: currentStore.id }),
          db.entities.InventoryBatch.filter({ store_id: currentStore.id, status: 'active' }),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.created_date?.startsWith(today));
        const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

        // Low stock products
        const lowStockProducts = [];
        for (const p of products) {
          const productBatches = batches.filter(b => b.product_id === p.id);
          const totalQty = productBatches.reduce((sum, b) => sum + b.quantity, 0);
          if (totalQty <= (p.reorder_threshold || 10)) {
            lowStockProducts.push({ ...p, stock: totalQty });
          }
        }

        // Expiring soon (within 7 days)
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const expiring = batches.filter(b => new Date(b.expiry_date) <= weekFromNow);

        // Sales by day (last 7 days)
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const daySales = sales.filter(s => s.created_date?.startsWith(dateStr));
          last7.push({
            date: d.toLocaleDateString('en', { weekday: 'short' }),
            sales: daySales.reduce((sum, s) => sum + s.total, 0),
          });
        }

        // Top products by sale frequency
        const productSales = {};
        sales.forEach(s => {
          (s.items || []).forEach(item => {
            if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
            productSales[item.name].qty += item.quantity;
            productSales[item.name].revenue += item.line_total;
          });
        });
        const top = Object.entries(productSales)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data }));

        setStats({
          todaySales: todayTotal,
          todayCount: todaySales.length,
          productCount: products.length,
          lowStock: lowStockProducts.length,
          customerCount: customers.length,
          expiringBatches: expiring.length,
        });
        setSalesData(last7);
        setTopProducts(top);
      } catch (e) {
        console.error('Dashboard error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentStore]);

  const statCards = [
    { label: "Today's Sales", value: `$${stats.todaySales.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Today's Transactions", value: stats.todayCount, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Products', value: stats.productCount, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Expiring Soon', value: stats.expiringBatches, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Customers', value: stats.customerCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{currentStore?.name} — Overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Sales — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}