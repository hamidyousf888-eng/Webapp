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
import { Plus, Undo2, FileText } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  in_transit: 'bg-blue-100 text-blue-700',
  received: 'bg-purple-100 text-purple-700',
  credited: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
};

const reasonColors = {
  damaged: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
  recall: 'bg-rose-100 text-rose-700',
  wrong_item: 'bg-amber-100 text-amber-700',
  quality: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
};

export default function VendorReturns() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creditDialog, setCreditDialog] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    supplier_id: '', supplier_name: '', product_id: '', product_name: '',
    batch_id: '', quantity: 0, unit: 'each', reason: 'damaged', return_value: 0,
    return_date: new Date().toISOString().slice(0, 10), tracking_number: '', notes: '',
  });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [r, s, p] = await Promise.all([
        db.entities.VendorReturn.filter({ store_id: currentStore.id }, '-created_date', 200),
        db.entities.Supplier.filter({ store_id: currentStore.id, is_active: true }),
        db.entities.Product.filter({ store_id: currentStore.id }, '-created_date', 200),
      ]);
      setReturns(r); setSuppliers(s); setProducts(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = filterStatus === 'all' ? returns : returns.filter(r => r.status === filterStatus);
  const totalValue = returns.reduce((s, r) => s + (r.return_value || 0), 0);
  const totalCredited = returns.reduce((s, r) => s + (r.credit_amount || 0), 0);

  const save = async () => {
    if (!form.supplier_id || !form.product_name || form.quantity <= 0) {
      toast({ title: 'Supplier, product and quantity required', variant: 'destructive' }); return;
    }
    try {
      await db.entities.VendorReturn.create({ ...form, store_id: currentStore.id, initiated_by: 'Current User', status: 'pending' });
      toast({ title: 'Return created' });
      setDialogOpen(false);
      setForm({ supplier_id: '', supplier_name: '', product_id: '', product_name: '', batch_id: '', quantity: 0, unit: 'each', reason: 'damaged', return_value: 0, return_date: new Date().toISOString().slice(0, 10), tracking_number: '', notes: '' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const updateStatus = async (id, status) => {
    await db.entities.VendorReturn.update(id, { status });
    toast({ title: `Marked ${status}` });
    load();
  };

  const applyCredit = async () => {
    if (!creditDialog) return;
    await db.entities.VendorReturn.update(creditDialog.id, {
      status: 'credited',
      credit_memo_number: creditDialog.credit_memo_number,
      credit_amount: creditDialog.credit_amount,
    });
    toast({ title: 'Credit memo applied' });
    setCreditDialog(null); load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Returns</h1>
          <p className="text-slate-500 text-sm mt-1">Track returns of damaged or expired inventory to suppliers</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Return</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Total Returns</div>
          <div className="text-2xl font-bold text-slate-900">{returns.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Return Value</div>
          <div className="text-2xl font-bold text-amber-600">${totalValue.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Credited</div>
          <div className="text-2xl font-bold text-emerald-600">${totalCredited.toFixed(2)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="text-2xl font-bold text-slate-900">{returns.filter(r => r.status === 'pending').length}</div>
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
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Credit Memo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_name}</TableCell>
                  <TableCell className="text-slate-500">{r.supplier_name}</TableCell>
                  <TableCell className="text-right">{r.quantity} {r.unit}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${reasonColors[r.reason] || reasonColors.other}`}>{r.reason.replace('_', ' ')}</span></TableCell>
                  <TableCell className="text-right font-medium">${(r.return_value || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{r.credit_memo_number || '-'}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[r.status] || ''}`}>{r.status.replace('_', ' ')}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'in_transit')}>Ship</Button>}
                      {r.status === 'in_transit' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'received')}>Received</Button>}
                      {r.status === 'received' && <Button size="sm" variant="outline" onClick={() => setCreditDialog(r)}><FileText className="w-3 h-3 mr-1" />Credit</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Undo2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No vendor returns yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Vendor Return</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => {
                const s = suppliers.find(x => x.id === v);
                setForm({ ...form, supplier_id: v, supplier_name: s?.name || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => {
                const p = products.find(x => x.id === v);
                setForm({ ...form, product_id: v, product_name: p?.name || '', unit: p?.unit || 'each' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['each', 'kg', 'lb', 'g', 'oz', 'liter', 'ml'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Return Value ($)</Label><Input type="number" step="0.01" value={form.return_value} onChange={(e) => setForm({ ...form, return_value: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reason</Label>
                <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['damaged', 'expired', 'recall', 'wrong_item', 'quality', 'other'].map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Return Date</Label><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></div>
            </div>
            <div><Label>Tracking Number</Label><Input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} /></div>
            <div><Label>Batch ID</Label><Input value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creditDialog} onOpenChange={(o) => !o && setCreditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply Credit Memo</DialogTitle></DialogHeader>
          {creditDialog && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">Return: {creditDialog.product_name} (${(creditDialog.return_value || 0).toFixed(2)})</div>
              <div><Label>Credit Memo #</Label><Input value={creditDialog.credit_memo_number || ''} onChange={(e) => setCreditDialog({ ...creditDialog, credit_memo_number: e.target.value })} /></div>
              <div><Label>Credit Amount ($)</Label><Input type="number" step="0.01" value={creditDialog.credit_amount || creditDialog.return_value || 0} onChange={(e) => setCreditDialog({ ...creditDialog, credit_amount: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(null)}>Cancel</Button>
            <Button onClick={applyCredit}>Apply Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}