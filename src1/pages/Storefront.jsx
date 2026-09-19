const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, Plus, Minus, Trash2, Search, Store, Truck, CheckCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Storefront() {
  const { stores, currentStore, switchStore } = useStore();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState('bopis');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' });
  const [placedOrder, setPlacedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    if (!currentStore) return;
    (async () => {
      setLoading(true);
      try {
        const [prods, promos] = await Promise.all([
          db.entities.Product.filter({ store_id: currentStore.id, is_active: true }),
          db.entities.Promotion.filter({ store_id: currentStore.id, active: true }),
        ]);
        setProducts(prods);
        const today = new Date().toISOString().slice(0, 10);
        setPromotions(promos.filter(p => (!p.start_date || p.start_date <= today) && (!p.end_date || p.end_date >= today)));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [currentStore]);

  const categories = useMemo(() => ['all', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const filtered = useMemo(() => products.filter(p => {
    const ms = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const mc = category === 'all' || p.category === category;
    return ms && mc;
  }), [products, search, category]);

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.price } : i);
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, line_total: product.price }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: Math.max(0, i.quantity + delta), line_total: Math.max(0, i.quantity + delta) * i.price } : i).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
  const discount = appliedPromo
    ? appliedPromo.type === 'percentage'
      ? subtotal * (appliedPromo.value / 100)
      : appliedPromo.type === 'fixed'
      ? Math.min(appliedPromo.value, subtotal)
      : 0
    : 0;
  const taxedAmount = Math.max(0, subtotal - discount);
  const tax = taxedAmount * 0.08;
  const deliveryFee = orderType === 'delivery' ? 4.99 : 0;
  const total = taxedAmount + tax + deliveryFee;

  const applyPromo = () => {
    setPromoError('');
    if (!promoCode.trim()) return;
    const promo = promotions.find(p => p.name.toLowerCase() === promoCode.trim().toLowerCase());
    if (!promo) {
      setPromoError('Invalid promo code');
      setAppliedPromo(null);
      return;
    }
    if (promo.min_purchase && subtotal < promo.min_purchase) {
      setPromoError(`Minimum purchase of $${promo.min_purchase.toFixed(2)} required`);
      setAppliedPromo(null);
      return;
    }
    setAppliedPromo(promo);
    toast({ title: 'Promo applied', description: `${promo.name} — ${promo.type === 'percentage' ? promo.value + '% off' : '$' + promo.value + ' off'}` });
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const placeOrder = async () => {
    if (!customer.name || !customer.phone) {
      toast({ title: 'Name and phone required', variant: 'destructive' });
      return;
    }
    if (orderType === 'delivery' && !customer.address) {
      toast({ title: 'Delivery address required', variant: 'destructive' });
      return;
    }
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const order = await db.entities.OnlineOrder.create({
        order_number: orderNumber,
        store_id: currentStore.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        items: cart,
        subtotal, discount, tax, delivery_fee: deliveryFee, total,
        fulfillment_type: orderType,
        delivery_address: orderType === 'delivery' ? customer.address : '',
        status: 'pending',
      });
      setPlacedOrder(order);
      setCart([]);
      setCheckoutOpen(false);
      setCustomer({ name: '', email: '', phone: '', address: '' });
    } catch (e) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900">{currentStore?.name || 'Store'}</div>
              <div className="text-xs text-slate-500">Online Ordering</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stores.length > 1 && (
              <select
                value={currentStore?.id || ''}
                onChange={(e) => { const s = stores.find(s => s.id === e.target.value); if (s) switchStore(s); }}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <Button onClick={() => setCheckoutOpen(true)} className="relative">
              <ShoppingCart className="w-4 h-4 mr-2" /> Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cart.length}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Order Online</h1>
          <p className="text-emerald-50">Pick up in store (BOPIS) or get it delivered to your door</p>
        </div>

        {/* Search + categories */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                category === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Products */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(p => (
              <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-slate-100 flex items-center justify-center">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-slate-300" />}
                </div>
                <CardContent className="p-3">
                  <div className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">{p.name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 font-bold">${p.price.toFixed(2)}</span>
                    <Button size="sm" variant="outline" onClick={() => addToCart(p)}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2" />Your cart is empty</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Fulfillment type */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setOrderType('bopis')} className={cn('flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-colors', orderType === 'bopis' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200')}>
                  <Store className="w-5 h-5" /><span className="text-sm font-medium">Pick Up</span>
                </button>
                <button onClick={() => setOrderType('delivery')} className={cn('flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-colors', orderType === 'delivery' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200')}>
                  <Truck className="w-5 h-5" /><span className="text-sm font-medium">Delivery</span>
                </button>
              </div>

              {/* Cart items */}
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{item.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}><Minus className="w-3.5 h-3.5" /></Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}><Plus className="w-3.5 h-3.5" /></Button>
                    <span className="w-14 text-right font-medium">${item.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <Input placeholder="Phone *" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                <Input placeholder="Email" className="col-span-2" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                {orderType === 'delivery' && <Input placeholder="Delivery address *" className="col-span-2" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
                {deliveryFee > 0 && <div className="flex justify-between text-slate-600"><span>Delivery Fee</span><span>${deliveryFee.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={placeOrder} disabled={cart.length === 0} className="bg-emerald-600 hover:bg-emerald-700">Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order confirmation */}
      <Dialog open={!!placedOrder} onOpenChange={(o) => !o && setPlacedOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-600" /> Order Placed!</DialogTitle></DialogHeader>
          {placedOrder && (
            <div className="space-y-3 text-center">
              <div className="text-lg font-bold text-slate-900">{placedOrder.order_number}</div>
              <div className="text-sm text-slate-500">
                {placedOrder.fulfillment_type === 'bopis' ? 'Pick up at store' : 'Delivery to your address'}<br />
                We'll text you when it's ready.
              </div>
              <div className="text-2xl font-bold">${placedOrder.total.toFixed(2)}</div>
              <div className="border-t pt-3 text-left space-y-1">
                {placedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm"><span>{item.quantity}x {item.name}</span><span>${item.line_total.toFixed(2)}</span></div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setPlacedOrder(null)} className="w-full">Continue Shopping</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}