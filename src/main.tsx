import { ProvedorConta } from './conta/ContextoConta'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErroDePagina } from './componentes/ErroDePagina'
// CSS global: só o que várias páginas usam. O que é de uma página só mora em
// estilos/paginas/ e é importado pela própria página, para descer junto com
// ela e não em toda visita (a inicial usava menos de 10% do CSS antigo).
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
      {/* Última rede: um erro fora da área da página (cabeçalho, conta) também
          vira aviso com botão, nunca a tela toda em branco. */}
      <ErroDePagina caminho=""><ProvedorConta><App /></ProvedorConta></ErroDePagina>
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
    // Falhar aqui não é problema: é só adiantamento (e a página, quando for
    // aberta de verdade, trata o erro).
    const ignorar = () => undefined
    import('./paginas/Treinar').catch(ignorar)
    import('./paginas/Sessao').catch(ignorar)
    import('./paginas/Resumo').catch(ignorar)
  }), { once: true })
}
