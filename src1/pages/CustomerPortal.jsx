const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Star, ShoppingBag, Truck, Award, Search, Package } from 'lucide-react';

const orderStatusColors = {
  pending: 'bg-amber-100 text-amber-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  picked_up: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function CustomerPortal() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const custs = await db.entities.Customer.filter({ store_id: currentStore.id, phone: phone.trim() });
      const cust = custs[0];
      if (!cust) {
        setCustomer(null);
        setOrders([]);
        setSales([]);
        return;
      }
      setCustomer(cust);
      const [onlineOrders, storeSales] = await Promise.all([
        db.entities.OnlineOrder.filter({ store_id: currentStore.id, customer_phone: phone.trim() }, '-created_date'),
        db.entities.Sale.filter({ store_id: currentStore.id, customer_name: cust.name }, '-created_date'),
      ]);
      setOrders(onlineOrders);
      setSales(storeSales);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => !['delivered', 'picked_up', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="w-6 h-6" /> Loyalty Portal</h1>
          <p className="text-emerald-50 text-sm mt-1">{currentStore?.name} — View your points, orders, and deliveries</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {!customer ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              <Label>Enter your phone number to access your account</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} className="pl-10" />
                </div>
                <Button onClick={lookup} disabled={loading || !phone.trim()}>Look Up</Button>
              </div>
              {searched && !loading && !customer && (
                <div className="text-center py-6 text-slate-400">
                  <p>No account found with that phone number.</p>
                  <p className="text-sm mt-1">Ask a cashier to register you next time you shop!</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Loyalty summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center">
                <Star className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                <div className="text-2xl font-bold text-slate-900">{customer.loyalty_points || 0}</div>
                <div className="text-xs text-slate-500">Loyalty Points</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold text-slate-900">{orders.length + sales.length}</div>
                <div className="text-xs text-slate-500">Total Orders</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Award className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                <div className="text-2xl font-bold text-slate-900">${(customer.house_account_balance || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-500">House Account</div>
              </CardContent></Card>
            </div>

            {/* Active deliveries */}
            {activeOrders.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Truck className="w-5 h-5" /> Active Orders</h2>
                  <div className="space-y-2">
                    {activeOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <div className="font-medium text-sm">{o.order_number}</div>
                          <div className="text-xs text-slate-500 capitalize">{o.fulfillment_type} • {new Date(o.created_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', orderStatusColors[o.status])}>{o.status}</span>
                          <div className="text-sm font-bold mt-0.5">${(o.total || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order history */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-slate-900 mb-3">Order History</h2>
                <div className="space-y-2">
                  {[...orders.map(o => ({ ...o, type: 'online' })), ...sales.map(s => ({ ...s, type: 'in-store', order_number: `Sale ${s.id.slice(-6)}` }))]
                    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                    .slice(0, 20)
                    .map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                        <div>
                          <div className="font-medium text-sm">{o.order_number}</div>
                          <div className="text-xs text-slate-500">{new Date(o.created_date).toLocaleDateString()} • {o.type}</div>
                        </div>
                        <div className="text-right">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', orderStatusColors[o.status] || 'bg-slate-100 text-slate-700')}>{o.status}</span>
                          <div className="text-sm font-bold mt-0.5">${(o.total || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  {orders.length === 0 && sales.length === 0 && (
                    <div className="text-center py-6 text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No orders yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}