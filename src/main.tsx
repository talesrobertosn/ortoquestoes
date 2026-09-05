import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/impressao.css'

const raiz = document.getElementById('raiz')
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
