import { ProvedorConta } from './conta/ContextoConta'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErroDePagina } from './componentes/ErroDePagina'
// CSS global: só o que várias páginas usam. O que é de uma página só mora em
// estilos/paginas/ e é importado pela própria página, para descer junto com
// ela e não em toda visita (a inicial usava menos de 10% do CSS antigo).
// Fontes pixel num só lugar: o CSS global (selos, heróis, rodapé, convites) já
// usa as duas, e o @font-face só baixa o arquivo quando um texto pede a fonte.
import '@fontsource/jersey-10/latin-400.css'
import '@fontsource/pixelify-sans/latin-700.css'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/premium.css'
import './estilos/recursos.css'
import './estilos/temporada.css'
import './estilos/impressao.css'
import { registrarServiceWorker } from './util/instalacao'
import { capturarOrigem } from './conta/origem'
import { iniciarPreCarga } from './util/preCarga'

// Antes de qualquer troca de endereço: guarda de onde a pessoa chegou (link
// marcado do anúncio, Instagram, Google…) para o cadastro levar junto.
capturarOrigem()

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

// Pré-carga das páginas: ao tocar ou passar por cima de um link, e o caminho
// mais provável (montar sessão, responder, resumo) quando o aparelho fica
// ocioso. Quem ativou a economia de dados no celular fica de fora da segunda.
iniciarPreCarga()
