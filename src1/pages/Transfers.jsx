const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

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
import { Plus, Trash2, ArrowRight, Package } from 'lucide-react';

const empty = { to_store_id: '', items: [] };
const emptyItem = { product_id: '', quantity: 1 };

export default function Transfers() {
  const { stores, currentStore } = useStore();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [itemForm, setItemForm] = useState(emptyItem);

  const otherStores = useMemo(() => stores.filter(s => s.id !== currentStore?.id), [stores, currentStore]);

  const load = async () => {
    if (!currentStore) return;
    try {
      const [t, p] = await Promise.all([
        db.entities.TransferOrder.filter({ from_store_id: currentStore.id }, '-created_date'),
        db.entities.Product.filter({ store_id: currentStore.id }),
      ]);
      setTransfers(t);
      setProducts(p);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));
  const storeMap = Object.fromEntries(stores.map(s => [s.id, s]));

  const addItem = () => {
    if (!itemForm.product_id) return;
    const p = productMap[itemForm.product_id];
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: itemForm.product_id, name: p.name, quantity: parseFloat(itemForm.quantity) }]
    }));
    setItemForm(emptyItem);
  };

  const removeItem = (idx) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const createTransfer = async () => {
    if (!form.to_store_id || form.items.length === 0) {
      toast({ title: 'Select a destination store and add items', variant: 'destructive' });
      return;
    }
    try {
      const toStore = storeMap[form.to_store_id];
      await db.entities.TransferOrder.create({
        transfer_number: `TR-${Date.now().toString().slice(-6)}`,
        from_store_id: currentStore.id,
        to_store_id: form.to_store_id,
        from_store_name: currentStore.name,
        to_store_name: toStore.name,
        status: 'draft',
        items: form.items,
      });
      toast({ title: 'Transfer created' });
      setDialogOpen(false);
      setForm(empty);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const shipTransfer = async (t) => {
    await db.entities.TransferOrder.update(t.id, { status: 'in_transit' });
    toast({ title: 'Transfer shipped' });
    load();
  };

  const receiveTransfer = async (t) => {
    // Create inventory batches at destination for each item
    const today = new Date().toISOString().split('T')[0];
    for (const item of t.items) {
      await db.entities.InventoryBatch.create({
        product_id: item.product_id,
        store_id: t.to_store_id,
        batch_number: `TR-${t.transfer_number}`,
        quantity: item.quantity,
        expiry_date: item.expiry_date || today,
        received_date: today,
        cost_per_unit: 0,
        warehouse_location: 'Received',
        status: 'active',
      });
    }
    await db.entities.TransferOrder.update(t.id, { status: 'received' });
    toast({ title: 'Transfer received — inventory added' });
    load();
  };

  const statusColors = { draft: 'secondary', in_transit: 'blue', received: 'emerald', cancelled: 'destructive' };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inter-Store Transfers</h1>
          <p className="text-slate-500 text-sm mt-1">Move inventory between store locations</p>
        </div>
        <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Transfer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>From</TableHead>
                <TableHead></TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.transfer_number}</TableCell>
                  <TableCell>{t.from_store_name}</TableCell>
                  <TableCell><ArrowRight className="w-4 h-4 text-slate-400" /></TableCell>
                  <TableCell>{t.to_store_name}</TableCell>
                  <TableCell className="text-right">{t.items?.length || 0}</TableCell>
                  <TableCell><Badge variant={statusColors[t.status] || 'secondary'} className="capitalize">{t.status?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    {t.status === 'draft' && <Button size="sm" variant="outline" onClick={() => shipTransfer(t)}>Ship</Button>}
                    {t.status === 'in_transit' && <Button size="sm" variant="outline" onClick={() => receiveTransfer(t)} className="bg-emerald-50">Receive</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No transfers yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Inter-Store Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label>From</Label>
                <Input value={currentStore?.name || ''} disabled />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 mt-6" />
              <div className="flex-1">
                <Label>To Store</Label>
                <Select value={form.to_store_id} onValueChange={(v) => setForm({ ...form, to_store_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                  <SelectContent>
                    {otherStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium">Items to Transfer</div>
              <div className="flex gap-2">
                <Select value={itemForm.product_id} onValueChange={(v) => setItemForm({ ...itemForm, product_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Qty" className="w-24" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                <Button onClick={addItem}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.items.length > 0 && (
                <div className="space-y-1">
                  {form.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Qty: {item.quantity}</span>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createTransfer}>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}