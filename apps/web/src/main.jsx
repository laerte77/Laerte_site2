import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { validateStoredTokens } from '@/lib/tokenUtils';
import { initDB } from '@/lib/offlineStorage';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.error('SW registration failed:', err);
    });
  });
}

// Initialize Offline Storage
initDB().catch(err => console.error("IndexedDB init failed:", err));

// Clean corrupt or expired tokens BEFORE rendering anything 
// to prevent initial render issues or ghost sessions
validateStoredTokens();

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </>
);