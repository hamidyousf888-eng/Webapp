const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, CreditCard, Trash2, DollarSign } from 'lucide-react';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-700',
  redeemed: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
};

export default function GiftCards() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(null);
  const [redeemAmt, setRedeemAmt] = useState(0);
  const [form, setForm] = useState({ initial_value: 25, customer_name: '', customer_email: '', expiry_date: '' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.GiftCard.filter({ store_id: currentStore.id }, '-created_date');
      setCards(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const totalOutstanding = cards.filter(c => c.status === 'active').reduce((s, c) => s + (c.balance || 0), 0);

  const issueCard = async () => {
    if (form.initial_value <= 0) {
      toast({ title: 'Value must be positive', variant: 'destructive' });
      return;
    }
    try {
      const cardNumber = `GC-${Date.now().toString().slice(-8)}`;
      await db.entities.GiftCard.create({
        card_number: cardNumber,
        store_id: currentStore.id,
        balance: form.initial_value,
        initial_value: form.initial_value,
        status: 'active',
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        issued_date: new Date().toISOString().slice(0, 10),
        expiry_date: form.expiry_date || '',
        transactions: [{ type: 'load', amount: form.initial_value, date: new Date().toISOString(), reference: 'Initial issue' }],
      });
      toast({ title: 'Gift card issued', description: cardNumber });
      setDialogOpen(false);
      setForm({ initial_value: 25, customer_name: '', customer_email: '', expiry_date: '' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const redeem = async () => {
    if (redeemAmt <= 0 || redeemAmt > redeemOpen.balance) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    try {
      const newBalance = redeemOpen.balance - redeemAmt;
      const newStatus = newBalance <= 0 ? 'redeemed' : 'active';
      const txns = [...(redeemOpen.transactions || []), { type: 'redeem', amount: redeemAmt, date: new Date().toISOString(), reference: 'POS redemption' }];
      await db.entities.GiftCard.update(redeemOpen.id, { balance: newBalance, status: newStatus, transactions: txns });
      toast({ title: 'Redeemed', description: `$${redeemAmt.toFixed(2)} — Balance: $${newBalance.toFixed(2)}` });
      setRedeemOpen(null);
      setRedeemAmt(0);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (card) => {
    if (!confirm(`Delete gift card ${card.card_number}?`)) return;
    await db.entities.GiftCard.delete(card.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gift Cards</h1>
          <p className="text-slate-500 text-sm mt-1">Issue, activate, and track prepaid gift card balances</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Issue Gift Card</Button>
      </div>

      <Card><CardContent className="p-4">
        <div className="text-sm text-slate-500">Total Outstanding Balance</div>
        <div className="text-2xl font-bold text-emerald-600">${totalOutstanding.toFixed(2)}</div>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Initial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.card_number}</TableCell>
                  <TableCell>{c.customer_name || '-'}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">${(c.balance || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-slate-500">${(c.initial_value || 0).toFixed(2)}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>{c.status}</span></TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.issued_date ? new Date(c.issued_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.status === 'active' && c.balance > 0 && (
                        <Button size="sm" variant="outline" onClick={() => { setRedeemOpen(c); setRedeemAmt(c.balance); }}>
                          <DollarSign className="w-3.5 h-3.5" /> Redeem
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(c)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {cards.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No gift cards issued yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue Gift Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Initial Value ($)</Label><Input type="number" step="0.01" value={form.initial_value} onChange={(e) => setForm({ ...form, initial_value: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Customer Email</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={issueCard} className="bg-emerald-600 hover:bg-emerald-700">Issue Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!redeemOpen} onOpenChange={(o) => !o && setRedeemOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Redeem Gift Card</DialogTitle></DialogHeader>
          {redeemOpen && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">{redeemOpen.card_number}</div>
              <div className="text-2xl font-bold">Balance: ${(redeemOpen.balance || 0).toFixed(2)}</div>
              <div><Label>Redeem Amount ($)</Label><Input type="number" step="0.01" value={redeemAmt} onChange={(e) => setRedeemAmt(parseFloat(e.target.value) || 0)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(null)}>Cancel</Button>
            <Button onClick={redeem} className="bg-emerald-600 hover:bg-emerald-700">Redeem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}