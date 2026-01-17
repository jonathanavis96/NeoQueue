import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { UiEffectsProvider } from './hooks';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <UiEffectsProvider>
      <App />
    </UiEffectsProvider>
  </React.StrictMode>
);
