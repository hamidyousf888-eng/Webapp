const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const categoryColors = {
  utilities: 'bg-blue-100 text-blue-700',
  rent: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-amber-100 text-amber-700',
  payroll: 'bg-indigo-100 text-indigo-700',
  supplies: 'bg-teal-100 text-teal-700',
  marketing: 'bg-pink-100 text-pink-700',
  insurance: 'bg-slate-100 text-slate-700',
  delivery: 'bg-orange-100 text-orange-700',
  technology: 'bg-cyan-100 text-cyan-700',
  other: 'bg-slate-100 text-slate-600',
};

export default function ExpenseTracker() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState({ category: 'utilities', amount: 0, date: new Date().toISOString().slice(0, 10), vendor: '', description: '', recurring: false, recurring_period: 'none' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.Expense.filter({ store_id: currentStore.id }, '-created_date', 200);
      setExpenses(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const total = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat);

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + (e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const save = async () => {
    if (form.amount <= 0 || !form.date) {
      toast({ title: 'Amount and date required', variant: 'destructive' });
      return;
    }
    try {
      await db.entities.Expense.create({ ...form, store_id: currentStore.id });
      toast({ title: 'Expense logged' });
      setDialogOpen(false);
      setForm({ category: 'utilities', amount: 0, date: new Date().toISOString().slice(0, 10), vendor: '', description: '', recurring: false, recurring_period: 'none' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (e) => {
    if (!confirm('Delete this expense?')) return;
    await db.entities.Expense.delete(e.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Log and categorize operational costs to calculate net profit</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Log Expense</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><DollarSign className="w-4 h-4" /> Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">${total.toFixed(2)}</div>
        </CardContent></Card>
        {byCategory.slice(0, 3).map(c => (
          <Card key={c.name}><CardContent className="p-4">
            <div className="text-sm text-slate-500 capitalize">{c.name}</div>
            <div className="text-2xl font-bold text-slate-900">${c.value.toFixed(2)}</div>
          </CardContent></Card>
        ))}
      </div>

      {byCategory.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-3">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <div className="flex items-center gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(categoryColors).map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[e.category] || categoryColors.other}`}>{e.category}</span></TableCell>
                  <TableCell className="max-w-xs truncate">{e.description || '-'}</TableCell>
                  <TableCell className="text-slate-500">{e.vendor || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">${(e.amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(e.date || e.created_date).toLocaleDateString()}</TableCell>
                  <TableCell>{e.recurring ? <Badge variant="secondary" className="capitalize">{e.recurring_period}</Badge> : '-'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(e)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <TrendingDown className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No expenses logged
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(categoryColors).map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recurring</Label>
                <Select value={form.recurring ? 'yes' : 'no'} onValueChange={(v) => setForm({ ...form, recurring: v === 'yes' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recurring && (
                <div>
                  <Label>Period</Label>
                  <Select value={form.recurring_period} onValueChange={(v) => setForm({ ...form, recurring_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}