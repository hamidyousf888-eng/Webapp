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
import { Plus, Trash2, CalendarClock, ArrowLeftRight } from 'lucide-react';

const empty = { staff_name: '', role: 'cashier', start_time: '', end_time: '', notes: '' };

export default function Staff() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [shifts, setShifts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!currentStore) return;
    try {
      const list = await db.entities.Shift.filter({ store_id: currentStore.id }, 'start_time');
      setShifts(list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const save = async () => {
    try {
      await db.entities.Shift.create({
        ...form,
        store_id: currentStore.id,
        status: 'scheduled',
      });
      toast({ title: 'Shift scheduled' });
      setDialogOpen(false);
      setForm(empty);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const remove = async (s) => {
    await db.entities.Shift.delete(s.id);
    toast({ title: 'Shift deleted' });
    load();
  };

  const requestTrade = async (s) => {
    await db.entities.Shift.update(s.id, { status: 'traded', trade_requested_by: s.staff_name });
    toast({ title: 'Trade requested', description: `${s.staff_name}'s shift is now open for pickup` });
    load();
  };

  const claimShift = async (s) => {
    await db.entities.Shift.update(s.id, { status: 'scheduled', trade_requested_by: '' });
    toast({ title: 'Shift claimed' });
    load();
  };

  const statusBadge = (status) => {
    const map = { scheduled: 'secondary', open: 'blue', completed: 'emerald', traded: 'amber', unassigned: 'destructive' };
    return <Badge variant={map[status] || 'secondary'} className="capitalize">{status}</Badge>;
  };

  const fmtTime = (dt) => {
    if (!dt) return '-';
    try { return new Date(dt).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch { return dt; }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Scheduling</h1>
          <p className="text-slate-500 text-sm mt-1">Shift management and trading</p>
        </div>
        <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Schedule Shift</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.staff_name}</TableCell>
                  <TableCell className="capitalize text-slate-500">{s.role}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{fmtTime(s.start_time)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{fmtTime(s.end_time)}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{s.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.status === 'scheduled' && (
                        <Button variant="ghost" size="sm" onClick={() => requestTrade(s)} title="Request trade">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {s.status === 'traded' && (
                        <Button variant="ghost" size="sm" onClick={() => claimShift(s)}>Claim</Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(s)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {shifts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No shifts scheduled
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Shift</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Staff Name</Label><Input value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cashier','manager','fulfillment','delivery','purchasing'].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div />
            <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}