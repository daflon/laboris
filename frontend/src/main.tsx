import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Aplicar tema salvo ao carregar (antes do render para evitar flash)
const savedTheme = localStorage.getItem('os-laboris-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
