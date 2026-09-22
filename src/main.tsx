import { ProvedorConta } from './conta/ContextoConta'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/premium.css'
import './estilos/impressao.css'
import { registrarServiceWorker } from './util/instalacao'

const raiz = document.getElementById('raiz')
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorConta><App /></ProvedorConta>
    </StrictMode>,
  )
}

registrarServiceWorker()
