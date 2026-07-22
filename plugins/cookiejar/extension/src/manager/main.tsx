import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../hooks/useToast';
import '../styles/global.scss';
import { Manager } from './Manager';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Manager />
    </ToastProvider>
  </StrictMode>,
);
