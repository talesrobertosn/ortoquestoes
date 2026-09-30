import { ProvedorConta } from './conta/ContextoConta'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/premium.css'
import './estilos/recursos.css'
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

// Com a primeira tela pronta e o aparelho ocioso, o código do caminho mais
// usado (montar sessão, responder, resumo) desce em segundo plano: tocar em
// "Treinar" ou "Começar" deixa de esperar a rede. Quem ativou a economia de
// dados no celular fica de fora.
const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
if (!economia) {
  // O Safari ainda não tem requestIdleCallback.
  const quandoOcioso = (tarefa: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(tarefa, { timeout: 6000 }) : setTimeout(tarefa, 3000)
  window.addEventListener('load', () => quandoOcioso(() => {
    void import('./paginas/Treinar')
    void import('./paginas/Sessao')
    void import('./paginas/Resumo')
  }), { once: true })
}
