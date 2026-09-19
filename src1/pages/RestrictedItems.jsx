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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ShieldAlert, ScanLine, UserCheck, Clock } from 'lucide-react';

const restrictionColors = {
  age_verified: 'bg-red-100 text-red-700',
  prescription: 'bg-blue-100 text-blue-700',
  license_required: 'bg-purple-100 text-purple-700',
  quantity_limited: 'bg-amber-100 text-amber-700',
  time_limited: 'bg-indigo-100 text-indigo-700',
};

export default function RestrictedItems() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({
    product_id: '', product_name: '', barcode: '',
    restriction_type: 'age_verified', min_age: 21,
    requires_id_scan: true, requires_manager_approval: false,
    max_quantity: 0, allowed_start_hour: 0, allowed_end_hour: 24,
    category: '', notes: '',
  });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        db.entities.RestrictedItem.filter({ store_id: currentStore.id }, '-created_date', 200),
        db.entities.Product.filter({ store_id: currentStore.id, is_active: true }),
      ]);
      setItems(r); setProducts(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = filterType === 'all' ? items : items.filter(i => i.restriction_type === filterType);

  const save = async () => {
    if (!form.product_name) { toast({ title: 'Product name required', variant: 'destructive' }); return; }
    try {
      await db.entities.RestrictedItem.create({ ...form, store_id: currentStore.id, is_active: true });
      toast({ title: 'Restricted item added' });
      setDialogOpen(false);
      setForm({ product_id: '', product_name: '', barcode: '', restriction_type: 'age_verified', min_age: 21, requires_id_scan: true, requires_manager_approval: false, max_quantity: 0, allowed_start_hour: 0, allowed_end_hour: 24, category: '', notes: '' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const toggleActive = async (item) => {
    await db.entities.RestrictedItem.update(item.id, { is_active: !item.is_active });
    load();
  };

  const remove = async (item) => {
    if (!confirm('Remove this restriction?')) return;
    await db.entities.RestrictedItem.delete(item.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restricted Items</h1>
          <p className="text-slate-500 text-sm mt-1">Define validation requirements for age-verified and controlled products</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Restriction</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.keys(restrictionColors).map(type => (
          <Card key={type}><CardContent className="p-4">
            <div className="flex items-center gap-2">
              {type === 'age_verified' && <UserCheck className="w-4 h-4 text-red-500" />}
              {type === 'prescription' && <ShieldAlert className="w-4 h-4 text-blue-500" />}
              {type === 'license_required' && <ShieldAlert className="w-4 h-4 text-purple-500" />}
              {type === 'quantity_limited' && <ScanLine className="w-4 h-4 text-amber-500" />}
              {type === 'time_limited' && <Clock className="w-4 h-4 text-indigo-500" />}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{items.filter(i => i.restriction_type === type).length}</div>
            <div className="text-xs text-slate-500 capitalize">{type.replace('_', ' ')}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.keys(restrictionColors).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Restriction</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-slate-500 text-sm font-mono">{item.barcode || '-'}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${restrictionColors[item.restriction_type]}`}>{item.restriction_type.replace('_', ' ')}</span></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.restriction_type === 'age_verified' && <Badge variant="secondary">Min age {item.min_age}</Badge>}
                      {item.requires_id_scan && <Badge variant="outline"><ScanLine className="w-3 h-3 mr-1" />ID scan</Badge>}
                      {item.requires_manager_approval && <Badge variant="outline">Manager approval</Badge>}
                      {item.restriction_type === 'quantity_limited' && item.max_quantity > 0 && <Badge variant="secondary">Max {item.max_quantity}</Badge>}
                      {item.restriction_type === 'time_limited' && <Badge variant="secondary">{item.allowed_start_hour}:00–{item.allowed_end_hour}:00</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} /></TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(item)}><Plus className="w-4 h-4 rotate-45" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No restricted items defined
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Restricted Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => {
                const p = products.find(x => x.id === v);
                setForm({ ...form, product_id: v, product_name: p?.name || '', barcode: p?.barcode || '', category: p?.category || '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Restriction Type</Label>
                <Select value={form.restriction_type} onValueChange={(v) => setForm({ ...form, restriction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(restrictionColors).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.restriction_type === 'age_verified' && (
                <div><Label>Minimum Age</Label><Input type="number" value={form.min_age} onChange={(e) => setForm({ ...form, min_age: parseInt(e.target.value) || 0 })} /></div>
              )}
              {form.restriction_type === 'quantity_limited' && (
                <div><Label>Max Quantity</Label><Input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: parseInt(e.target.value) || 0 })} /></div>
              )}
            </div>
            {form.restriction_type === 'time_limited' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Allowed Start Hour</Label><Input type="number" min="0" max="23" value={form.allowed_start_hour} onChange={(e) => setForm({ ...form, allowed_start_hour: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Allowed End Hour</Label><Input type="number" min="0" max="24" value={form.allowed_end_hour} onChange={(e) => setForm({ ...form, allowed_end_hour: parseInt(e.target.value) || 24 })} /></div>
              </div>
            )}
            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2"><Switch checked={form.requires_id_scan} onCheckedChange={(v) => setForm({ ...form, requires_id_scan: v })} /><Label className="cursor-pointer">Require ID scan</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.requires_manager_approval} onCheckedChange={(v) => setForm({ ...form, requires_manager_approval: v })} /><Label className="cursor-pointer">Manager approval</Label></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Add Restriction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}