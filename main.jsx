import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { inject } from '@vercel/analytics'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { ErrorBoundary } from './src/components/shared/ErrorBoundary.jsx'
import { ChatProvider } from './src/chat.jsx'
import i18n from './src/i18n.js'

inject()

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <ChatProvider>
          <App />
        </ChatProvider>
      </ErrorBoundary>
    </I18nextProvider>
  </React.StrictMode>,
)
