import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { MonedaProvider } from './context/MonedaContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MonedaProvider>
      <App />
    </MonedaProvider>
  </React.StrictMode>
);

reportWebVitals();
