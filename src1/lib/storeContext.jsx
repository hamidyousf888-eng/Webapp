const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { createContext, useContext, useState, useEffect } from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await db.entities.Store.list();
        setStores(list);
        const savedId = localStorage.getItem('currentStoreId');
        const found = savedId ? list.find(s => s.id === savedId) : null;
        setCurrentStore(found || list[0] || null);
      } catch (e) {
        console.error('Failed to load stores', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const switchStore = (store) => {
    setCurrentStore(store);
    if (store) localStorage.setItem('currentStoreId', store.id);
  };

  return (
    <StoreContext.Provider value={{ stores, currentStore, switchStore, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}