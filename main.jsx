import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App, { ErrorBoundary } from './App.jsx'
import i18n from './src/i18n.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nextProvider>
  </React.StrictMode>,
)
const _sp = document.getElementById('dork-splash');
if (_sp) { _sp.style.opacity = '0'; setTimeout(() => _sp.remove(), 280); }
