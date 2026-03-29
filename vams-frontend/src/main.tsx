import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { emergencyController } from './controllers/EmergencyController';
import { initAuthState } from './store/authStore';
import './index.css';

emergencyController.init();

const forceLogoutOnBoot =
  window.location.protocol === 'file:' && import.meta.env.VITE_FORCE_LOGOUT_ON_BOOT === '1';

if (forceLogoutOnBoot) {
  console.warn('[auth] VITE_FORCE_LOGOUT_ON_BOOT=1; clearing persisted auth for this launch');
}

initAuthState({ forceLogout: forceLogoutOnBoot });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
