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
import { Trash2, Plus, AlertTriangle } from 'lucide-react';

const reasonColors = {
  spoilage: 'bg-amber-100 text-amber-700',
  damage: 'bg-orange-100 text-orange-700',
  theft: 'bg-red-100 text-red-700',
  expiry: 'bg-slate-100 text-slate-700',
  quality_recall: 'bg-purple-100 text-purple-700',
  other: 'bg-blue-100 text-blue-700',
};

export default function WasteLog() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: '', product_name: '', quantity: 0, unit: 'each',
    reason: 'spoilage', value_loss: 0, notes: '',
  });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [list, prods] = await Promise.all([
        db.entities.WasteLog.filter({ store_id: currentStore.id }, '-created_date'),
        db.entities.Product.filter({ store_id: currentStore.id }),
      ]);
      setLogs(list);
      setProducts(prods);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const totalLoss = logs.reduce((s, l) => s + (l.value_loss || 0), 0);

  const save = async () => {
    if (!form.product_name || form.quantity <= 0) {
      toast({ title: 'Product and quantity required', variant: 'destructive' });
      return;
    }
    try {
      await db.entities.WasteLog.create({
        ...form,
        store_id: currentStore.id,
        logged_by: 'Staff',
      });
      toast({ title: 'Waste logged', description: `$${form.value_loss.toFixed(2)} loss recorded` });
      setDialogOpen(false);
      setForm({ product_id: '', product_name: '', quantity: 0, unit: 'each', reason: 'spoilage', value_loss: 0, notes: '' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (log) => {
    if (!confirm('Delete this waste record?')) return;
    await db.entities.WasteLog.delete(log.id);
    load();
  };

  const selectProduct = (pid) => {
    const p = products.find(p => p.id === pid);
    if (p) {
      setForm({
        ...form,
        product_id: pid,
        product_name: p.name,
        unit: p.unit,
        value_loss: form.quantity * (p.cost || 0),
      });
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waste Management</h1>
          <p className="text-slate-500 text-sm mt-1">Record inventory losses and track shrinkage by reason</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Log Waste</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-sm text-slate-500">Total Loss Value</div>
          <div className="text-2xl font-bold text-red-600">${totalLoss.toFixed(2)}</div>
        </CardContent></Card>
        {['spoilage', 'damage', 'theft'].map(r => {
          const sum = logs.filter(l => l.reason === r).reduce((s, l) => s + (l.value_loss || 0), 0);
          return (
            <Card key={r}><CardContent className="p-4">
              <div className="text-sm text-slate-500 capitalize">{r}</div>
              <div className="text-2xl font-bold text-slate-900">${sum.toFixed(2)}</div>
            </CardContent></Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Loss Value</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.product_name}</TableCell>
                  <TableCell className="text-right">{l.quantity} {l.unit}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${reasonColors[l.reason] || reasonColors.other}`}>{l.reason}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">${(l.value_loss || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-slate-500 max-w-xs truncate">{l.notes || '-'}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(l.created_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(l)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No waste recorded yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Inventory Waste</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select onValueChange={selectProduct}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['spoilage', 'damage', 'theft', 'expiry', 'quality_recall', 'other'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Loss Value ($)</Label><Input type="number" step="0.01" value={form.value_loss} onChange={(e) => setForm({ ...form, value_loss: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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