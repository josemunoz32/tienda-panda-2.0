import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { MonedaProvider } from './context/MonedaContext';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';

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
