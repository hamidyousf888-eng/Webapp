const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Boxes, AlertTriangle, Calendar } from 'lucide-react';

const emptyBatch = { product_id: '', batch_number: '', quantity: 0, expiry_date: '', cost_per_unit: 0, warehouse_location: '', supplier_id: '' };

export default function Inventory() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyBatch);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [b, p, s] = await Promise.all([
        db.entities.InventoryBatch.filter({ store_id: currentStore.id }, 'expiry_date'),
        db.entities.Product.filter({ store_id: currentStore.id }),
        db.entities.Supplier.filter({ store_id: currentStore.id }),
      ]);
      setBatches(b);
      setProducts(p);
      setSuppliers(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const today = new Date();
  const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);

  const filtered = batches.filter(b => {
    if (filter === 'active') return b.status === 'active';
    if (filter === 'expiring') return b.status === 'active' && new Date(b.expiry_date) <= weekFromNow;
    if (filter === 'expired') return b.status === 'expired' || (b.status === 'active' && new Date(b.expiry_date) < today);
    if (filter === 'depleted') return b.status === 'depleted';
    return true;
  });

  const save = async () => {
    try {
      await db.entities.InventoryBatch.create({
        ...form,
        store_id: currentStore.id,
        received_date: new Date().toISOString().split('T')[0],
        status: 'active',
        quantity: parseFloat(form.quantity),
        cost_per_unit: parseFloat(form.cost_per_unit),
      });
      toast({ title: 'Batch added' });
      setDialogOpen(false);
      setForm(emptyBatch);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const getBadge = (batch) => {
    if (batch.status === 'depleted') return <Badge variant="secondary">Depleted</Badge>;
    if (batch.status === 'expired') return <Badge variant="destructive">Expired</Badge>;
    const exp = new Date(batch.expiry_date);
    if (exp < today) return <Badge variant="destructive">Expired</Badge>;
    if (exp <= weekFromNow) return <Badge className="bg-orange-500">Expiring Soon</Badge>;
    return <Badge className="bg-emerald-500">Active</Badge>;
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Batches</h1>
          <p className="text-slate-500 text-sm mt-1">FEFO — First-Expired-First-Out</p>
        </div>
        <Button onClick={() => { setForm(emptyBatch); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Batch</Button>
      </div>

      <div className="flex gap-2">
        {['all','active','expiring','expired','depleted'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'All Batches' : f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{productMap[b.product_id]?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-slate-500">{b.batch_number || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{b.quantity}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {b.expiry_date}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500">{b.received_date}</TableCell>
                  <TableCell>{b.warehouse_location || '-'}</TableCell>
                  <TableCell className="text-right">${b.cost_per_unit?.toFixed(2)}</TableCell>
                  <TableCell>{getBadge(b)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  No batches found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Inventory Batch</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Batch Number</Label><Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div><Label>Cost per Unit</Label><Input type="number" step="0.01" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} /></div>
            <div><Label>Warehouse Location</Label><Input value={form.warehouse_location} onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} placeholder="A-12-3" /></div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}