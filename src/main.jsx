import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SecretRouter from './components/SecretRouter'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SecretRouter>
      <App />
    </SecretRouter>
  </React.StrictMode>
)
