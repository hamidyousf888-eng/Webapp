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
import { Plus, ArrowRightLeft, Trash2, Package } from 'lucide-react';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  in_transit: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function StoreTransfers() {
  const { currentStore, stores } = useStore();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ to_store_id: '', items: [] });
  const [itemDraft, setItemDraft] = useState({ product_id: '', quantity: 1 });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [list, prods] = await Promise.all([
        db.entities.TransferOrder.filter({ from_store_id: currentStore.id }, '-created_date'),
        db.entities.Product.filter({ store_id: currentStore.id }),
      ]);
      setTransfers(list);
      setProducts(prods);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const addItem = () => {
    const p = products.find(p => p.id === itemDraft.product_id);
    if (!p || itemDraft.quantity <= 0) return;
    setForm({
      ...form,
      items: [...form.items, { product_id: p.id, name: p.name, quantity: itemDraft.quantity, expiry_date: '' }],
    });
    setItemDraft({ product_id: '', quantity: 1 });
  };

  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const createTransfer = async () => {
    if (!form.to_store_id || form.items.length === 0) {
      toast({ title: 'Select destination and add items', variant: 'destructive' });
      return;
    }
    try {
      const dest = stores.find(s => s.id === form.to_store_id);
      await db.entities.TransferOrder.create({
        transfer_number: `TRF-${Date.now().toString().slice(-6)}`,
        from_store_id: currentStore.id,
        to_store_id: form.to_store_id,
        from_store_name: currentStore.name,
        to_store_name: dest.name,
        status: 'draft',
        items: form.items,
      });
      toast({ title: 'Transfer request created' });
      setDialogOpen(false);
      setForm({ to_store_id: '', items: [] });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const shipTransfer = async (t) => {
    await db.entities.TransferOrder.update(t.id, { status: 'in_transit' });
    toast({ title: 'Transfer shipped' });
    load();
  };

  const receiveTransfer = async (t) => {
    try {
      for (const item of t.items) {
        const earliestExpiry = item.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        await db.entities.InventoryBatch.create({
          product_id: item.product_id,
          store_id: t.to_store_id,
          batch_number: `TRF-${Date.now().toString().slice(-6)}`,
          quantity: item.quantity,
          expiry_date: earliestExpiry,
          received_date: new Date().toISOString().slice(0, 10),
          status: 'active',
        });
      }
      await db.entities.TransferOrder.update(t.id, { status: 'received' });
      toast({ title: 'Transfer received', description: 'Inventory updated' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Transfers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage inventory movement between franchise locations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Transfer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.transfer_number}</TableCell>
                  <TableCell>{t.to_store_name}</TableCell>
                  <TableCell className="text-right">{t.items?.length || 0}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status]}`}>{t.status}</span></TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(t.created_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.status === 'draft' && <Button size="sm" onClick={() => shipTransfer(t)}>Ship</Button>}
                      {t.status === 'in_transit' && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => receiveTransfer(t)}>Receive</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No transfers yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Store Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Destination Store</Label>
              <Select value={form.to_store_id} onValueChange={(v) => setForm({ ...form, to_store_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {stores.filter(s => s.id !== currentStore.id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3">
              <Label className="mb-2 block">Add Items</Label>
              <div className="flex gap-2">
                <Select value={itemDraft.product_id} onValueChange={(v) => setItemDraft({ ...itemDraft, product_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="1" className="w-24" value={itemDraft.quantity} onChange={(e) => setItemDraft({ ...itemDraft, quantity: parseInt(e.target.value) || 1 })} />
                <Button onClick={addItem}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {form.items.length > 0 && (
              <div className="space-y-1">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                    <span className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-slate-400" /> {item.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
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