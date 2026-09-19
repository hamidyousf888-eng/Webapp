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
import { Plus, Shield, Trash2, Filter } from 'lucide-react';

const actionColors = {
  price_override: 'bg-amber-100 text-amber-700',
  void: 'bg-red-100 text-red-700',
  refund: 'bg-orange-100 text-orange-700',
  delete: 'bg-red-100 text-red-700',
  permission_change: 'bg-purple-100 text-purple-700',
  login: 'bg-blue-100 text-blue-700',
  config_change: 'bg-indigo-100 text-indigo-700',
  data_export: 'bg-slate-100 text-slate-700',
  manual_discount: 'bg-amber-100 text-amber-700',
};

const severityColors = {
  info: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterAction, setFilterAction] = useState('all');
  const [form, setForm] = useState({ action_type: 'price_override', user_name: '', entity_type: '', details: '', severity: 'info' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.AuditLog.filter({ store_id: currentStore.id }, '-created_date', 200);
      setLogs(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action_type === filterAction);

  const save = async () => {
    if (!form.user_name || !form.details) {
      toast({ title: 'User and details required', variant: 'destructive' });
      return;
    }
    try {
      await db.entities.AuditLog.create({ ...form, store_id: currentStore.id });
      toast({ title: 'Audit entry logged' });
      setDialogOpen(false);
      setForm({ action_type: 'price_override', user_name: '', entity_type: '', details: '', severity: 'info' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (log) => {
    if (!confirm('Delete this audit entry?')) return;
    await db.entities.AuditLog.delete(log.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-6 h-6" /> System Audit Log</h1>
          <p className="text-slate-500 text-sm mt-1">Track sensitive actions: price overrides, voids, permission changes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Log Entry</Button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.keys(actionColors).map(a => <SelectItem key={a} value={a} className="capitalize">{a.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => (
                <TableRow key={l.id}>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[l.action_type] || actionColors.config_change}`}>{l.action_type.replace(/_/g, ' ')}</span></TableCell>
                  <TableCell className="font-medium">{l.user_name}</TableCell>
                  <TableCell className="text-slate-500">{l.entity_type || '-'}</TableCell>
                  <TableCell className="max-w-md truncate">{l.details}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[l.severity]}`}>{l.severity}</span></TableCell>
                  <TableCell className="text-slate-500 text-sm">{new Date(l.created_date).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(l)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No audit entries
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Audit Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Action Type</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(actionColors).map(a => <SelectItem key={a} value={a} className="capitalize">{a.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>User Name</Label><Input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} /></div>
            <div><Label>Entity Type</Label><Input placeholder="e.g. Sale, Product, User" value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} /></div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['info', 'warning', 'critical'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Details</Label><Input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Log Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}