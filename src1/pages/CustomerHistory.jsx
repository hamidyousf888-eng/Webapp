const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Heart, Award, Star, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CustomerHistory() {
  const { currentStore } = useStore();
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        db.entities.Customer.filter({ store_id: currentStore.id }, '-created_date', 500),
        db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }, '-created_date', 1000),
      ]);
      setCustomers(c); setSales(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  const customer = customers.find(c => c.id === selectedId);
  const customerSales = useMemo(() => {
    if (!selectedId) return [];
    return sales.filter(s => s.customer_id === selectedId).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [selectedId, sales]);

  const stats = useMemo(() => {
    const total = customerSales.reduce((s, sale) => s + (sale.total || 0), 0);
    const itemCount = customerSales.reduce((s, sale) => s + (sale.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0), 0);
    const favMap = {};
    customerSales.forEach(sale => (sale.items || []).forEach(i => {
      favMap[i.name] = (favMap[i.name] || 0) + (i.quantity || 0);
    }));
    const favorites = Object.entries(favMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    return { total, count: customerSales.length, itemCount, favorites };
  }, [customerSales]);

  const loyaltyMilestone = (points) => {
    if (points >= 5000) return { label: 'Diamond', color: 'bg-cyan-100 text-cyan-700' };
    if (points >= 2000) return { label: 'Gold', color: 'bg-amber-100 text-amber-700' };
    if (points >= 500) return { label: 'Silver', color: 'bg-slate-100 text-slate-700' };
    if (points >= 100) return { label: 'Bronze', color: 'bg-orange-100 text-orange-700' };
    return { label: 'New', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer History</h1>
        <p className="text-slate-500 text-sm mt-1">View past purchases, favorite items, and loyalty milestones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-4 space-y-3">
            <Label>Select Customer</Label>
            <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-96 overflow-y-auto space-y-1">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === c.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.email || c.phone || 'No contact'}</div>
                </button>
              ))}
              {filteredCustomers.length === 0 && <div className="text-center text-slate-400 text-sm py-4">No customers</div>}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          {!customer ? (
            <Card><CardContent className="p-12 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Select a customer to view their purchase history
            </CardContent></Card>
          ) : (
            <>
              <Card><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
                    <div className="text-sm text-slate-500">{customer.email || '—'} · {customer.phone || '—'}</div>
                    {customer.address && <div className="text-sm text-slate-500">{customer.address}</div>}
                  </div>
                  <div className="text-right">
                    <Badge className={loyaltyMilestone(customer.loyalty_points || 0).color}>
                      <Award className="w-3 h-3 mr-1" />{loyaltyMilestone(customer.loyalty_points || 0).label}
                    </Badge>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{customer.loyalty_points || 0}</div>
                    <div className="text-xs text-slate-500">loyalty points</div>
                  </div>
                </div>
              </CardContent></Card>

              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="w-4 h-4" /> Total Spent</div>
                  <div className="text-2xl font-bold text-slate-900">${stats.total.toFixed(2)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-sm"><ShoppingBag className="w-4 h-4" /> Orders</div>
                  <div className="text-2xl font-bold text-slate-900">{stats.count}</div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 text-slate-500 text-sm"><Heart className="w-4 h-4" /> Items Bought</div>
                  <div className="text-2xl font-bold text-slate-900">{stats.itemCount}</div>
                </CardContent></Card>
              </div>

              {stats.favorites.length > 0 && (
                <Card><CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Favorite Items</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.favorites} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="qty" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent></Card>
              )}

              <Card>
                <CardContent className="p-0">
                  <div className="px-4 pt-4 font-semibold">Recent Purchases</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerSales.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="text-slate-500 text-sm">{new Date(s.created_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{(s.items || []).length} items</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{s.payment_method}</Badge></TableCell>
                          <TableCell className="text-right font-medium">${(s.total || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {customerSales.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">No purchases yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}