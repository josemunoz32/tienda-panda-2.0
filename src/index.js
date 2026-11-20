import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { MonedaProvider } from './context/MonedaContext';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';

// Redirige "/" → "/home" antes del primer render: <Navigate> pintaba un frame
// vacío con el footer arriba y luego lo empujaba (CLS ~0.7).
if (window.location.pathname === '/') {
  window.history.replaceState(window.history.state, '', '/home' + window.location.search + window.location.hash);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <MonedaProvider>
        <App />
      </MonedaProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
