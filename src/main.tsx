import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './GestureCommandApp'
import { ErrorBoundary } from './components/ErrorBoundary'
import './command.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
}
