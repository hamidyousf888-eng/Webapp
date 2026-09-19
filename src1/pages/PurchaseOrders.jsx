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
import { Plus, Trash2, ClipboardList, Send } from 'lucide-react';

const statusColors = {
  draft: 'secondary', sent: 'blue', partially_received: 'amber', received: 'emerald', cancelled: 'destructive',
};

export default function PurchaseOrders() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '', items: [] });
  const [itemForm, setItemForm] = useState({ product_id: '', quantity: 1, unit_cost: 0 });

  const load = async () => {
    if (!currentStore) return;
    try {
      const [o, s, p] = await Promise.all([
        db.entities.PurchaseOrder.filter({ store_id: currentStore.id }, '-created_date'),
        db.entities.Supplier.filter({ store_id: currentStore.id }),
        db.entities.Product.filter({ store_id: currentStore.id }),
      ]);
      setOrders(o);
      setSuppliers(s);
      setProducts(p);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const addItem = () => {
    if (!itemForm.product_id) return;
    const product = productMap[itemForm.product_id];
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: itemForm.product_id,
        name: product.name,
        quantity: parseFloat(itemForm.quantity),
        unit_cost: parseFloat(itemForm.unit_cost),
        line_total: parseFloat(itemForm.quantity) * parseFloat(itemForm.unit_cost),
      }]
    }));
    setItemForm({ product_id: '', quantity: 1, unit_cost: 0 });
  };

  const removeItem = (idx) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const poTotal = form.items.reduce((sum, i) => sum + i.line_total, 0);

  const createPO = async (sendNow) => {
    if (!form.supplier_id || form.items.length === 0) {
      toast({ title: 'Add a supplier and at least one item', variant: 'destructive' });
      return;
    }
    try {
      const supplier = supplierMap[form.supplier_id];
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      await db.entities.PurchaseOrder.create({
        po_number: poNumber,
        supplier_id: form.supplier_id,
        supplier_name: supplier.name,
        store_id: currentStore.id,
        status: sendNow ? 'sent' : 'draft',
        items: form.items,
        total: poTotal,
        order_date: new Date().toISOString().split('T')[0],
        expected_date: form.expected_date || '',
        notes: form.notes,
      });
      toast({ title: sendNow ? 'PO created and sent' : 'PO saved as draft' });
      setDialogOpen(false);
      setForm({ supplier_id: '', expected_date: '', notes: '', items: [] });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const updateStatus = async (po, status) => {
    await db.entities.PurchaseOrder.update(po.id, { status });
    toast({ title: `PO marked as ${status}` });
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Generate POs and track vendor deliveries</p>
        </div>
        <Button onClick={() => { setForm({ supplier_id: '', expected_date: '', notes: '', items: [] }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New PO
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name}</TableCell>
                  <TableCell className="text-right font-medium">${po.total?.toFixed(2)}</TableCell>
                  <TableCell className="text-slate-500">{po.order_date}</TableCell>
                  <TableCell className="text-slate-500">{po.expected_date || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[po.status] || 'secondary'} className="capitalize">
                      {po.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {po.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(po, 'sent')}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Send
                      </Button>
                    )}
                    {(po.status === 'sent' || po.status === 'partially_received') && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(po, 'received')}>Mark Received</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No purchase orders yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Expected Date</Label><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
            </div>

            {/* Line items */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium">Line Items</div>
              <div className="flex gap-2">
                <Select value={itemForm.product_id} onValueChange={(v) => {
                  const p = productMap[v];
                  setItemForm({ ...itemForm, product_id: v, unit_cost: p?.cost || 0 });
                }}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Qty" className="w-20" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                <Input type="number" step="0.01" placeholder="Cost" className="w-24" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} />
                <Button onClick={addItem}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.items.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unit_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${item.line_total?.toFixed(2)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="text-red-500 h-7 w-7" onClick={() => removeItem(i)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end font-bold">Total: ${poTotal.toFixed(2)}</div>
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => createPO(false)}>Save Draft</Button>
            <Button onClick={() => createPO(true)}>Create & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}