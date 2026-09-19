const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function CycleCounts() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [counts, setCounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', count_type: 'cycle_count', counted_qty: 0, notes: '' });

  const load = async () => {
    if (!currentStore) return;
    try {
      const [c, p, b] = await Promise.all([
        db.entities.CycleCount.filter({ store_id: currentStore.id }, '-created_date'),
        db.entities.Product.filter({ store_id: currentStore.id }),
        db.entities.InventoryBatch.filter({ store_id: currentStore.id, status: 'active' }),
      ]);
      setCounts(c);
      setProducts(p);
      setBatches(b);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const getExpectedQty = (productId) => {
    return batches.filter(b => b.product_id === productId).reduce((sum, b) => sum + b.quantity, 0);
  };

  const createCount = async () => {
    if (!form.product_id) {
      toast({ title: 'Select a product', variant: 'destructive' });
      return;
    }
    try {
      const product = productMap[form.product_id];
      const expected = getExpectedQty(form.product_id);
      const counted = parseFloat(form.counted_qty) || 0;
      const variance = counted - expected;

      await db.entities.CycleCount.create({
        store_id: currentStore.id,
        product_id: form.product_id,
        product_name: product.name,
        expected_qty: expected,
        counted_qty: counted,
        variance,
        count_type: form.count_type,
        status: 'completed',
        notes: form.notes,
        counted_by: 'Staff',
      });

      // If shrinkage/damage/theft, adjust inventory
      if (variance < 0 && (form.count_type === 'shrinkage' || form.count_type === 'damage' || form.count_type === 'theft')) {
        const productBatches = batches.filter(b => b.product_id === form.product_id).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        let remaining = Math.abs(variance);
        for (const batch of productBatches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.quantity, remaining);
          const newQty = batch.quantity - deduct;
          await db.entities.InventoryBatch.update(batch.id, {
            quantity: newQty,
            status: newQty <= 0 ? 'depleted' : 'active',
          });
          remaining -= deduct;
        }
        toast({ title: 'Count logged & inventory adjusted', description: `Removed ${Math.abs(variance)} units as ${form.count_type}` });
      } else {
        toast({ title: 'Count logged', description: `Variance: ${variance >= 0 ? '+' : ''}${variance}` });
      }

      setDialogOpen(false);
      setForm({ product_id: '', count_type: 'cycle_count', counted_qty: 0, notes: '' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const varianceColor = (v) => v === 0 ? 'text-slate-500' : v < 0 ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cycle Counts & Shrinkage</h1>
          <p className="text-slate-500 text-sm mt-1">Inventory audits and loss logging</p>
        </div>
        <Button onClick={() => { setForm({ product_id: '', count_type: 'cycle_count', counted_qty: 0, notes: '' }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Count
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-slate-900">{counts.length}</div>
          <div className="text-xs text-slate-500">Total Counts</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {counts.filter(c => c.variance < 0).reduce((s, c) => s + Math.abs(c.variance), 0).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500">Units Lost</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">
            ${counts.filter(c => c.variance < 0).reduce((s, c) => s + Math.abs(c.variance) * (productMap[c.product_id]?.cost || 0), 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">Shrinkage Cost</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.product_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{c.count_type}</Badge></TableCell>
                  <TableCell className="text-right">{c.expected_qty}</TableCell>
                  <TableCell className="text-right">{c.counted_qty}</TableCell>
                  <TableCell className={`text-right font-medium ${varianceColor(c.variance)}`}>
                    {c.variance > 0 ? '+' : ''}{c.variance}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(c.created_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.notes || '-'}</TableCell>
                </TableRow>
              ))}
              {counts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No counts logged yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Count / Shrinkage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Expected: {getExpectedQty(p.id)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Count Type</Label>
              <Select value={form.count_type} onValueChange={(v) => setForm({ ...form, count_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cycle_count">Cycle Count</SelectItem>
                  <SelectItem value="shrinkage">Shrinkage</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Counted Quantity</Label>
              <Input type="number" step="0.01" value={form.counted_qty} onChange={(e) => setForm({ ...form, counted_qty: e.target.value })} />
              {form.product_id && (
                <div className="text-xs text-slate-500 mt-1">
                  Expected: {getExpectedQty(form.product_id)} units
                  {parseFloat(form.counted_qty) >= 0 && (
                    <span className={`ml-2 font-medium ${varianceColor(parseFloat(form.counted_qty) - getExpectedQty(form.product_id))}`}>
                      Variance: {parseFloat(form.counted_qty) - getExpectedQty(form.product_id) > 0 ? '+' : ''}{(parseFloat(form.counted_qty) || 0) - getExpectedQty(form.product_id)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {form.count_type !== 'cycle_count' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Negative variance will automatically deduct inventory from the earliest-expiring batches (FEFO).</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createCount}>Log Count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}