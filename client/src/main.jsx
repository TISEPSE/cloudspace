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

// Ne jamais bloquer le rendu : si l'init du storage rate ou hang,
// on rend quand même l'app après 2 s (l'utilisateur sera redirigé sur login).
await Promise.race([
  initAuthStorage().catch((e) => console.error('initAuthStorage failed:', e)),
  new Promise(resolve => setTimeout(resolve, 2000)),
])

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
