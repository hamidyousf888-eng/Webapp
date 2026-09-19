const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Receipt, Percent } from 'lucide-react';

export default function FinancialReports() {
  const { currentStore } = useStore();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }, '-created_date', 500),
        db.entities.Expense.filter({ store_id: currentStore.id }, '-created_date', 200),
      ]);
      setSales(s);
      setExpenses(e);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const cutoff = useMemo(() => {
    const days = parseInt(dateRange);
    return Date.now() - days * 86400000;
  }, [dateRange]);

  const filteredSales = useMemo(() => sales.filter(s => new Date(s.created_date).getTime() >= cutoff), [sales, cutoff]);
  const filteredExpenses = useMemo(() => expenses.filter(e => new Date(e.date || e.created_date).getTime() >= cutoff), [expenses, cutoff]);

  const grossRevenue = filteredSales.reduce((s, sale) => s + (sale.total || 0), 0);
  const taxCollected = filteredSales.reduce((s, sale) => s + (sale.tax || 0), 0);
  const discounts = filteredSales.reduce((s, sale) => s + (sale.discount || 0), 0);
  const cogs = filteredSales.reduce((sum, sale) => sum + (sale.items || []).reduce((s, i) => s + (i.quantity * 0), 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = grossRevenue - totalExpenses;

  const paymentBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => { map[s.payment_method] = (map[s.payment_method] || 0) + (s.total || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const dailyData = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const day = new Date(s.created_date).toLocaleDateString();
      if (!map[day]) map[day] = { date: day, revenue: 0, transactions: 0 };
      map[day].revenue += s.total || 0;
      map[day].transactions += 1;
    });
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredSales]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + (e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Sales summaries, net profit, and transaction trends</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><DollarSign className="w-4 h-4" /> Gross Revenue</div>
          <div className="text-2xl font-bold text-emerald-600">${grossRevenue.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Receipt className="w-4 h-4" /> Tax Collected</div>
          <div className="text-2xl font-bold text-slate-900">${taxCollected.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="w-4 h-4" /> Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Percent className="w-4 h-4" /> Net Profit</div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${netProfit.toFixed(2)}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-3">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-3">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={paymentBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <h3 className="font-semibold mb-3">Expenses by Category</h3>
        {expenseByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expenseByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-slate-400 py-8">No expenses in this period</p>}
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.slice(0, 50).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.id.slice(-8)}</TableCell>
                  <TableCell className="text-slate-500">{new Date(s.created_date).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{s.payment_method}</TableCell>
                  <TableCell className="text-right">${(s.subtotal || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(s.tax || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${(s.total || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {filteredSales.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No sales in this period</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}