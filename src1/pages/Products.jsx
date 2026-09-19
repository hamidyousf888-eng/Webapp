const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Pencil, Trash2, Package, Scan } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

const emptyProduct = {
  name: '', sku: '', barcode: '', category: '', price: 0, cost: 0,
  unit: 'each', allow_fractional: false, tax_rate: 0, image_url: '',
  reorder_threshold: 10, description: '', is_active: true,
};

export default function Products() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.Product.filter({ store_id: currentStore.id });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProducts(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm(emptyProduct); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...emptyProduct, ...p }); setDialogOpen(true); };

  const save = async () => {
    try {
      if (editing) {
        await db.entities.Product.update(editing.id, { ...form, store_id: currentStore.id });
        toast({ title: 'Product updated' });
      } else {
        await db.entities.Product.create({ ...form, store_id: currentStore.id });
        toast({ title: 'Product created' });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      await db.entities.Product.delete(p.id);
      toast({ title: 'Product deleted' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 text-sm mt-1">{currentStore?.name} — Product Catalog</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Fractional</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-slate-500">{p.sku || '-'}</TableCell>
                  <TableCell className="text-slate-500">{p.barcode || '-'}</TableCell>
                  <TableCell>{p.category || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">${p.price?.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-slate-500">${p.cost?.toFixed(2)}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{p.allow_fractional ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(p)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-400">No products found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div>
              <Label>Barcode</Label>
              <div className="flex gap-2">
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Scan barcode"><Scan className="w-4 h-4" /></Button>
              </div>
            </div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div>
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['each','kg','lb','g','oz','liter','ml'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Cost ($)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Tax Rate (%)</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Reorder Threshold</Label><Input type="number" value={form.reorder_threshold} onChange={(e) => setForm({ ...form, reorder_threshold: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.allow_fractional} onCheckedChange={(v) => setForm({ ...form, allow_fractional: v })} />
              <Label>Allow fractional sales</Label>
            </div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onDetected={(code) => {
          setForm({ ...form, barcode: code });
          setScannerOpen(false);
          toast({ title: 'Barcode scanned', description: code });
        }}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}