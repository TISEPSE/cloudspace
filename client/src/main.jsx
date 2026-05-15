import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UploadProvider } from './contexts/UploadContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import BackendGate from './components/BackendGate'
import BiometricGate from './components/BiometricGate'
import { initAuthStorage } from './lib/api'
import './index.css'
import App from './App.jsx'

// Sur web, le cache est initialisé synchrone (cf. lib/api.js).
// Sur native, on lance l'init en parallèle du render (fire-and-forget) :
// si un apiFetch arrive avant que le cache soit prêt, il échouera puis
// AuthContext fera un retry après le refresh token. Pas de blocage.
initAuthStorage().catch((e) => console.error('initAuthStorage failed:', e))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BackendGate>
        <BiometricGate>
          <BrowserRouter>
            <AuthProvider>
              <UploadProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </UploadProvider>
            </AuthProvider>
          </BrowserRouter>
        </BiometricGate>
      </BackendGate>
    </ThemeProvider>
  </StrictMode>,
)
