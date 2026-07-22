import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../hooks/useToast';
import '../styles/global.scss';
import { Popup } from './Popup';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Popup />
    </ToastProvider>
  </StrictMode>,
);
