import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

function toRouterBasename(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') {
    return '/'
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

const routerBasename = toRouterBasename(import.meta.env.BASE_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
