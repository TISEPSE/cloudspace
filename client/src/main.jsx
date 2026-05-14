import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UploadProvider } from './contexts/UploadContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import BackendGate from './components/BackendGate'
import BiometricGate from './components/BiometricGate'
import './index.css'
import App from './App.jsx'

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
