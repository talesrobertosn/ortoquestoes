/**
 * Pré-carga do código das páginas.
 *
 * Cada página desce sob demanda (ver App.tsx). No celular, isso quer dizer que
 * tocar num link espera a rede antes de trocar de tela. Aqui o site adianta o
 * download quando dá para prever o próximo passo:
 *
 * - dedo ou ponteiro chegando num link interno (passar o mouse por cima,
 *   encostar o dedo, focar pelo teclado): o código da página começa a descer
 *   antes do clique, que no celular chega 100 a 300 ms depois do toque;
 * - aparelho ocioso depois que a página aberta terminou de carregar: o caminho
 *   mais provável a partir dela (ver PROVAVEIS), sem nada para quem pediu
 *   economia de dados.
 *
 * Os carregadores são os mesmos que o App passa ao React.lazy: o mesmo import()
 * aponta para o mesmo arquivo, e o navegador não baixa nada duas vezes.
 */
type Carregador = () => Promise<unknown>

export const carregadores = {
  Inicio: () => import('../paginas/Inicio'),
  Treinar: () => import('../paginas/Treinar'),
  Sessao: () => import('../paginas/Sessao'),
  Resumo: () => import('../paginas/Resumo'),
  QuestaoDireta: () => import('../paginas/QuestaoDireta'),
  Apoio: () => import('../paginas/Apoio'),
  Favoritas: () => import('../paginas/Favoritas'),
  CadernoErros: () => import('../paginas/CadernoErros'),
  Progresso: () => import('../paginas/Progresso'),
  Revisao: () => import('../paginas/Revisao'),
  Ranking: () => import('../paginas/Ranking'),
  RankingCripta: () => import('../paginas/RankingCripta'),
  Termos: () => import('../paginas/Termos'),
  CondicoesAssinatura: () => import('../paginas/CondicoesAssinatura'),
  Assinatura: () => import('../paginas/Assinatura'),
  Conta: () => import('../paginas/Conta'),
  DetalhesAssinatura: () => import('../paginas/DetalhesAssinatura'),
  Emails: () => import('../paginas/Emails'),
  SimuladoNacional: () => import('../paginas/SimuladoNacional'),
  PlanoEstudo: () => import('../paginas/PlanoEstudo'),
  TemasQueMaisCaem: () => import('../paginas/TemasQueMaisCaem'),
  Resumao: () => import('../paginas/Resumao'),
  Resumos: () => import('../paginas/Resumos'),
  Indicar: () => import('../paginas/Indicar'),
  Ligas: () => import('../paginas/Ligas'),
  Flashcards: () => import('../paginas/Flashcards'),
  Atlas3D: () => import('../atlas3d/ui/Atlas'),
  AdminAssinaturas: () => import('../paginas/AdminAssinaturas'),
} satisfies Record<string, Carregador>

type Pagina = keyof typeof carregadores

/** Primeiro trecho do endereço → página (o mesmo mapa do App). */
const PAGINA_DA_ROTA: Record<string, Pagina> = {
  '': 'Inicio', treinar: 'Treinar', sessao: 'Sessao', resumo: 'Resumo', questao: 'QuestaoDireta',
  sobre: 'Apoio', projeto: 'Apoio', contato: 'Apoio', dados: 'Apoio',
  favoritas: 'Favoritas', erros: 'CadernoErros', progresso: 'Progresso', revisao: 'Revisao',
  ranking: 'Ranking', conquistas: 'Ranking', termos: 'Termos', 'condicoes-assinatura': 'CondicoesAssinatura',
  assinatura: 'Assinatura', conta: 'Conta', entrar: 'Conta', emails: 'Emails',
  'simulado-nacional': 'SimuladoNacional', cronograma: 'PlanoEstudo', 'plano-de-estudo': 'PlanoEstudo',
  'temas-que-mais-caem': 'TemasQueMaisCaem', resumao: 'Resumao', resumos: 'Resumos', atlas: 'Atlas3D', indicar: 'Indicar', convite: 'Indicar',
  ligas: 'Ligas', flashcards: 'Flashcards', admin: 'AdminAssinaturas',
}

/**
 * O próximo passo mais comum a partir de cada página, baixado quando o aparelho
 * fica ocioso. Curto de propósito: cada item é código que a pessoa talvez nem use.
 */
const PROVAVEIS: Record<string, Pagina[]> = {
  '': ['Treinar', 'Sessao', 'Resumo'],
  treinar: ['Sessao', 'Resumo'],
  sessao: ['Resumo'],
  resumo: ['Treinar', 'Sessao'],
  revisao: ['Sessao', 'Resumo'],
  cronograma: ['Sessao', 'Resumo'],
  'plano-de-estudo': ['Sessao', 'Resumo'],
  dados: ['Revisao'],
  questao: ['Sessao'],
  conta: ['Treinar'],
  entrar: ['Treinar'],
}

/** Nas demais páginas, o caminho mais usado do site: montar sessão, responder, resumo. */
const PADRAO: Pagina[] = ['Treinar', 'Sessao', 'Resumo']

const pedidas = new Set<Pagina>()

function economiaDeDados(): boolean {
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !!conexao?.saveData || conexao?.effectiveType === 'slow-2g' || conexao?.effectiveType === '2g'
}

function primeiroTrecho(hash: string): string | null {
  if (!hash.startsWith('#/') && hash !== '#' && hash !== '') return null
  return hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? ''
}

/**
 * A página que o App mostra para um endereço. Quase sempre basta o primeiro trecho; as exceções
 * são as mesmas do App: #/conta/assinatura (DetalhesAssinatura) e #/ranking?aba=flashcards ou
 * aba=cripta (RankingCripta).
 */
export function paginaDoEndereco(hash: string): Pagina | null {
  const trecho = primeiroTrecho(hash)
  if (trecho === null) return null
  const resto = hash.replace(/^#\/?/, '')
  if (trecho === 'conta' && resto.split(/[?]/)[0].split('/')[1] === 'assinatura') return 'DetalhesAssinatura'
  if (trecho === 'ranking') {
    const aba = new URLSearchParams(resto.split('?')[1] ?? '').get('aba') ?? ''
    if (aba === 'flashcards' || aba === 'cripta') return 'RankingCripta'
  }
  return PAGINA_DA_ROTA[trecho] ?? null
}

/** Adianta o código da página de um endereço ("#/treinar", "#/conta?x=1"). Falhar não é problema. */
export function preCarregarRota(hash: string): void {
  const pagina = paginaDoEndereco(hash)
  if (!pagina || pedidas.has(pagina)) return
  pedidas.add(pagina)
  // Se falhar (rede caiu), a página, quando aberta de verdade, tenta de novo e trata o erro.
  carregadores[pagina]().catch(() => pedidas.delete(pagina))
}

function linkInterno(alvo: EventTarget | null): string | null {
  const elemento = alvo instanceof Element ? alvo.closest('a[href^="#"]') : null
  return elemento?.getAttribute('href') ?? null
}

/** Liga a pré-carga por intenção (ponteiro, toque, foco) e a do aparelho ocioso. */
export function iniciarPreCarga(): void {
  if (typeof window === 'undefined') return
  const aoChegar = (evento: Event) => {
    const destino = linkInterno(evento.target)
    if (destino && destino !== window.location.hash) preCarregarRota(destino)
  }
  // Fase de captura e passivo: nunca atrasa o toque nem a rolagem.
  for (const tipo of ['pointerover', 'touchstart', 'focusin'] as const) {
    document.addEventListener(tipo, aoChegar, { capture: true, passive: true })
  }

  if (economiaDeDados()) return
  // O Safari ainda não tem requestIdleCallback.
  const quandoOcioso = (tarefa: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(tarefa, { timeout: 6000 }) : window.setTimeout(tarefa, 3000)
  const adiantarProvaveis = () => {
    const trecho = primeiroTrecho(window.location.hash) ?? ''
    for (const pagina of PROVAVEIS[trecho] ?? PADRAO) {
      if (pedidas.has(pagina)) continue
      pedidas.add(pagina)
      carregadores[pagina]().catch(() => pedidas.delete(pagina))
    }
  }
  // Só depois que a página aberta terminou de chegar (sem o guerreiro da espera
  // nem esqueleto na tela): no celular a banda é pouca, e adiantar a próxima
  // página antes disso atrasava os dados e o código da página atual.
  let agendada = false
  const depoisDaPaginaPronta = () => {
    if (agendada) return
    agendada = true
    const inicio = Date.now()
    const conferir = () => {
      const principal = document.getElementById('conteudo-principal')
      const esperando = !principal || !!principal.querySelector('.espera-pixel, .esqueleto')
      if (esperando && Date.now() - inicio < 15_000) { window.setTimeout(conferir, 400); return }
      window.setTimeout(() => quandoOcioso(() => { agendada = false; adiantarProvaveis() }), 800)
    }
    conferir()
  }
  if (document.readyState === 'complete') depoisDaPaginaPronta()
  else window.addEventListener('load', depoisDaPaginaPronta, { once: true })
  // Trocou de página: o caminho provável muda junto.
  window.addEventListener('hashchange', depoisDaPaginaPronta)
}
