const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from 'react';

import { useStore } from '@/lib/storeContext';
import { deductFEFO, getAvailableStock } from '@/lib/fefo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, Trash2, Pause, Play, ShoppingCart, CreditCard, Banknote, Smartphone, Scan, X, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import BarcodeScanner from '@/components/BarcodeScanner';

export default function POS() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [pausedCarts, setPausedCarts] = useState([]);
  const [category, setCategory] = useState('all');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [selfCheckout, setSelfCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!currentStore) return;
    (async () => {
      setLoading(true);
      try {
        const list = await db.entities.Product.filter({ store_id: currentStore.id, is_active: true });
        setProducts(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentStore]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'all' || p.category === category;
      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  const handleScan = (code) => {
    const product = products.find(p => p.barcode === code || p.sku === code);
    if (product) {
      addToCart(product);
      toast({ title: 'Added to cart', description: product.name });
    } else {
      toast({ title: 'No product found', description: `Barcode: ${code}`, variant: 'destructive' });
    }
    setScannerOpen(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.price }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        unit: product.unit,
        line_total: product.price,
        allow_fractional: product.allow_fractional,
      }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(0, i.quantity + delta);
      return { ...i, quantity: newQty, line_total: newQty * i.price };
    }).filter(i => i.quantity > 0));
  };

  const setQtyDirect = (productId, qty) => {
    setCart(prev => prev.map(i =>
      i.product_id === productId
        ? { ...i, quantity: qty, line_total: qty * i.price }
        : i
    ).filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.line_total, 0);
  const tax = cart.reduce((sum, i) => sum + (i.line_total * 0.08), 0); // 8% tax
  const total = subtotal + tax;

  const pauseCart = () => {
    if (cart.length === 0) return;
    setPausedCarts(prev => [...prev, { id: Date.now(), items: cart, total }]);
    setCart([]);
    toast({ title: 'Cart paused', description: 'Transaction saved for later.' });
  };

  const resumeCart = (paused) => {
    setCart(paused.items);
    setPausedCarts(prev => prev.filter(p => p.id !== paused.id));
    toast({ title: 'Cart resumed' });
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      // FEFO deduction for each cart item
      const updatedItems = [];
      for (const item of cart) {
        const batchUpdates = await deductFEFO(item.product_id, currentStore.id, item.quantity);
        // Apply batch updates
        for (const update of batchUpdates) {
          await db.entities.InventoryBatch.update(update.id, {
            quantity: update.quantity,
            status: update.status,
          });
        }
        updatedItems.push(item);
      }

      // Create sale record
      const sale = await db.entities.Sale.create({
        store_id: currentStore.id,
        cashier_name: 'POS User',
        items: updatedItems,
        subtotal,
        tax,
        discount: 0,
        total,
        payment_method: paymentMethod,
        status: 'completed',
        is_self_checkout: selfCheckout,
      });

      setReceipt({ ...sale, items: updatedItems });
      setCart([]);
      setCheckoutOpen(false);
      toast({ title: 'Sale completed', description: `Total: $${total.toFixed(2)}` });
    } catch (e) {
      toast({ title: 'Sale failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'card', label: 'Card', icon: CreditCard },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
  ];

  return (
    <div className="flex h-full">
      {/* Left: Product grid */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search products or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
              autoFocus
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="h-11"
            title="Scan barcode to add product"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scan
          </Button>
          <Button
            variant={selfCheckout ? 'default' : 'outline'}
            onClick={() => setSelfCheckout(!selfCheckout)}
            className={cn('h-11', selfCheckout && 'bg-blue-600 hover:bg-blue-700')}
          >
            <Scan className="w-4 h-4 mr-2" />
            Self-Checkout
          </Button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                category === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto pb-4">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl border border-slate-200 p-3 text-left hover:border-emerald-400 hover:shadow-md transition-all group"
              >
                <div className="aspect-square rounded-lg bg-slate-100 mb-2 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">{product.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-600 font-bold">${product.price.toFixed(2)}</span>
                  {product.allow_fractional && (
                    <Badge variant="secondary" className="text-xs">/{product.unit}</Badge>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">
                No products found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Cart panel */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Current Sale
            </h2>
            <div className="flex gap-1">
              {pausedCarts.length > 0 && (
                <Button variant="ghost" size="sm" onClick={pauseCart} disabled={cart.length === 0} title="Pause cart">
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={pauseCart} disabled={cart.length === 0} title="Pause cart">
                <Pause className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Paused carts */}
          {pausedCarts.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {pausedCarts.map(pc => (
                <button
                  key={pc.id}
                  onClick={() => resumeCart(pc)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm hover:bg-amber-100 transition-colors"
                >
                  <span className="flex items-center gap-2 text-amber-800">
                    <Play className="w-3.5 h-3.5" /> Paused ({pc.items.length} items)
                  </span>
                  <span className="font-medium text-amber-900">${pc.total.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-3" />
              <p className="text-sm">Scan or tap products to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
                  <div className="text-xs text-slate-500">${item.price.toFixed(2)} / {item.unit}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}>
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <input
                    type="number"
                    step={item.allow_fractional ? '0.01' : '1'}
                    value={item.quantity}
                    onChange={(e) => setQtyDirect(item.product_id, parseFloat(e.target.value) || 0)}
                    className="w-12 text-center text-sm border-0 bg-transparent focus:outline-none font-medium"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="w-16 text-right text-sm font-bold text-slate-900">
                  ${item.line_total.toFixed(2)}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.product_id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Totals & checkout */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" /> Checkout
          </Button>
        </div>
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-sm text-slate-500 mb-1">Total Due</div>
              <div className="text-4xl font-bold text-slate-900">${total.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">Payment Method</div>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map(pm => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-colors',
                        paymentMethod === pm.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={completeSale} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
              {processing ? 'Processing...' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Sale Complete
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3">
              <div className="text-center text-sm text-slate-500">
                {currentStore?.name}<br />
                {new Date(receipt.created_date).toLocaleString()}
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${item.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${receipt.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>${receipt.tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1"><span>Total</span><span>${receipt.total.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Paid via</span><span className="capitalize">{receipt.payment_method}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReceipt(null)} className="w-full">New Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onDetected={handleScan}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}