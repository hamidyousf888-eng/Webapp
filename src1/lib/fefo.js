const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


/**
 * Deducts quantity from inventory batches using FEFO (First-Expired-First-Out).
 * Returns the list of batch updates to apply.
 */
export async function deductFEFO(productId, storeId, quantityNeeded) {
  const batches = await db.entities.InventoryBatch.filter({
    product_id: productId,
    store_id: storeId,
    status: 'active'
  }, 'expiry_date');

  const updates = [];
  let remaining = quantityNeeded;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    const newQty = batch.quantity - deduct;
    updates.push({
      id: batch.id,
      quantity: newQty,
      status: newQty <= 0 ? 'depleted' : 'active'
    });
    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock for product ${productId}. Short by ${remaining}.`);
  }

  return updates;
}

/**
 * Gets total available stock for a product at a store.
 */
export async function getAvailableStock(productId, storeId) {
  const batches = await db.entities.InventoryBatch.filter({
    product_id: productId,
    store_id: storeId,
    status: 'active'
  });
  return batches.reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Gets the earliest-expiring batch for a product (for display/warning).
 */
export async function getEarliestBatch(productId, storeId) {
  const batches = await db.entities.InventoryBatch.filter({
    product_id: productId,
    store_id: storeId,
    status: 'active'
  }, 'expiry_date', 1);
  return batches[0] || null;
}