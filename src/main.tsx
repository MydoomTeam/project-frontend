import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Legacy libs may reference Node's global; map it to browser global to prevent runtime crash.
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);