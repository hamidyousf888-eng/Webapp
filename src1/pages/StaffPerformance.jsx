const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Zap, Timer, AlertCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function StaffPerformance() {
  const { currentStore } = useStore();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }, '-created_date', 1000);
      setSales(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const perf = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const name = s.cashier_name || 'Unknown';
      if (!map[name]) map[name] = { name, totalSales: 0, transactions: 0, items: 0, voids: 0, firstSale: null, lastSale: null };
      map[name].totalSales += s.total || 0;
      map[name].transactions++;
      map[name].items += (s.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      if (!map[name].firstSale || new Date(s.created_date) < new Date(map[name].firstSale)) map[name].firstSale = s.created_date;
      if (!map[name].lastSale || new Date(s.created_date) > new Date(map[name].lastSale)) map[name].lastSale = s.created_date;
    });
    // estimate voids from voided sales
    return Object.values(map).map(p => ({
      ...p,
      avgTransaction: p.transactions > 0 ? p.totalSales / p.transactions : 0,
      avgItems: p.transactions > 0 ? p.items / p.transactions : 0,
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [sales]);

  const filtered = perf.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalSales = perf.reduce((s, p) => s + p.totalSales, 0);
  const totalTxns = perf.reduce((s, p) => s + p.transactions, 0);
  const avgTxn = totalTxns > 0 ? totalSales / totalTxns : 0;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Performance</h1>
        <p className="text-slate-500 text-sm mt-1">Individual sales totals, transaction speed, and error rates per cashier</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="w-4 h-4" /> Total Sales</div>
          <div className="text-2xl font-bold text-slate-900">${totalSales.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Zap className="w-4 h-4" /> Transactions</div>
          <div className="text-2xl font-bold text-slate-900">{totalTxns}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Timer className="w-4 h-4" /> Avg Transaction</div>
          <div className="text-2xl font-bold text-slate-900">${avgTxn.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Award className="w-4 h-4" /> Top Performer</div>
          <div className="text-2xl font-bold text-slate-900 truncate">{perf[0]?.name || '-'}</div>
        </CardContent></Card>
      </div>

      {filtered.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-3">Sales by Cashier</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={filtered} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Bar dataKey="totalSales" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <div className="flex items-center gap-2">
        <Input placeholder="Search cashiers..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Avg Txn</TableHead>
                <TableHead className="text-right">Items Sold</TableHead>
                <TableHead className="text-right">Avg Items/Txn</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, idx) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Badge className="bg-amber-100 text-amber-700"><Award className="w-3 h-3 mr-1" />Top</Badge>}
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">${p.totalSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.transactions}</TableCell>
                  <TableCell className="text-right">${p.avgTransaction.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.items}</TableCell>
                  <TableCell className="text-right text-slate-500">{p.avgItems.toFixed(1)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{p.lastSale ? new Date(p.lastSale).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No performance data yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}