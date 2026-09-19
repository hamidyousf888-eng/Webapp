const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

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
import { Plus, ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  disputed: 'bg-red-100 text-red-700',
};

export default function ShiftSummary() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    staff_name: '', shift_date: new Date().toISOString().slice(0, 10),
    starting_drawer: 100, counted_cash: 0, card_total: 0, mobile_total: 0,
    tips_declared: 0, notes: '',
  });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [s, sales] = await Promise.all([
        db.entities.ShiftSummary.filter({ store_id: currentStore.id }, '-created_date', 200),
        db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }, '-created_date', 500),
      ]);
      setSummaries(s); setSales(sales);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = filterStatus === 'all' ? summaries : summaries.filter(s => s.status === filterStatus);

  const computeExpectedCash = (staffName, date) => {
    const daySales = sales.filter(s => {
      const sd = new Date(s.created_date).toISOString().slice(0, 10);
      return sd === date && (!staffName || s.cashier_name === staffName) && s.payment_method === 'cash';
    });
    return daySales.reduce((sum, s) => sum + (s.total || 0), 0);
  };

  const save = async () => {
    if (!form.staff_name) { toast({ title: 'Staff name required', variant: 'destructive' }); return; }
    const expected = form.starting_drawer + computeExpectedCash(form.staff_name, form.shift_date);
    const variance = form.counted_cash - expected;
    try {
      await db.entities.ShiftSummary.create({
        ...form, store_id: currentStore.id,
        expected_cash: expected, variance, total_sales: expected - form.starting_drawer,
        status: 'pending_approval',
      });
      toast({ title: 'Shift summary submitted for approval' });
      setDialogOpen(false);
      setForm({ staff_name: '', shift_date: new Date().toISOString().slice(0, 10), starting_drawer: 100, counted_cash: 0, card_total: 0, mobile_total: 0, tips_declared: 0, notes: '' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const approve = async (s) => {
    await db.entities.ShiftSummary.update(s.id, {
      status: 'approved', approved_by: 'Current Manager', approved_at: new Date().toISOString(),
    });
    toast({ title: 'Shift approved' });
    load();
  };

  const dispute = async (s) => {
    await db.entities.ShiftSummary.update(s.id, { status: 'disputed' });
    toast({ title: 'Shift marked disputed' });
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Summary</h1>
          <p className="text-slate-500 text-sm mt-1">Cashier drawer reconciliation and manager approval</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Close Shift</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-600">{summaries.filter(s => s.status === 'pending_approval').length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Approved</div>
          <div className="text-2xl font-bold text-emerald-600">{summaries.filter(s => s.status === 'approved').length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Total Variance</div>
          <div className="text-2xl font-bold text-slate-900">${summaries.reduce((sum, s) => sum + (s.variance || 0), 0).toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Tips Declared</div>
          <div className="text-2xl font-bold text-slate-900">${summaries.reduce((sum, s) => sum + (s.tips_declared || 0), 0).toFixed(2)}</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(statusColors).map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Starting</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Tips</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.staff_name}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(s.shift_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">${(s.starting_drawer || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(s.counted_cash || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-slate-500">${(s.expected_cash || 0).toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-medium ${(s.variance || 0) === 0 ? 'text-emerald-600' : Math.abs(s.variance || 0) < 5 ? 'text-amber-600' : 'text-red-600'}`}>
                    ${(s.variance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">${(s.tips_declared || 0).toFixed(2)}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[s.status] || ''}`}>{s.status.replace('_', ' ')}</span></TableCell>
                  <TableCell>
                    {s.status === 'pending_approval' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => approve(s)}><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => dispute(s)}><AlertTriangle className="w-3 h-3 mr-1" />Dispute</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No shift summaries yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Close Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cashier Name</Label><Input value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} /></div>
            <div><Label>Shift Date</Label><Input type="date" value={form.shift_date} onChange={(e) => setForm({ ...form, shift_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starting Drawer ($)</Label><Input type="number" step="0.01" value={form.starting_drawer} onChange={(e) => setForm({ ...form, starting_drawer: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Counted Cash ($)</Label><Input type="number" step="0.01" value={form.counted_cash} onChange={(e) => setForm({ ...form, counted_cash: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Card Total ($)</Label><Input type="number" step="0.01" value={form.card_total} onChange={(e) => setForm({ ...form, card_total: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Mobile Total ($)</Label><Input type="number" step="0.01" value={form.mobile_total} onChange={(e) => setForm({ ...form, mobile_total: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Tips Declared ($)</Label><Input type="number" step="0.01" value={form.tips_declared} onChange={(e) => setForm({ ...form, tips_declared: parseFloat(e.target.value) || 0 })} /></div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              Expected cash: <span className="font-semibold">${(form.starting_drawer + computeExpectedCash(form.staff_name, form.shift_date)).toFixed(2)}</span>
              <br />Variance: <span className="font-semibold">${(form.counted_cash - form.starting_drawer - computeExpectedCash(form.staff_name, form.shift_date)).toFixed(2)}</span>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Submit for Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}