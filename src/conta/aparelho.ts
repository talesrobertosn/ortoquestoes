import { ErroRpc, chamarRpc } from '../servicos/supabase'
import { gerarId } from '../util/id'
import { ler } from '../estado/armazenamento'

/**
 * Uma conta, um aparelho por vez. Cada navegador tem um identificador fixo
 * (guardado fora do prefixo do app, para sobreviver a "sair da conta"). Ao
 * entrar, o aparelho se registra como o da conta; depois manda um sinal a
 * cada minuto enquanto a aba está visível. Se outro aparelho entrou depois,
 * o sinal responde "inativo" e este sai da conta. O progresso local fica
 * guardado e volta quando a pessoa entrar de novo aqui (e aí é o outro
 * aparelho que sai). O mesmo sinal alimenta o "online agora" do painel.
 */

const CHAVE_ID = 'oq-aparelho'
/** Conta para a qual este aparelho já se registrou: sem ela, é um login novo aqui. */
const CHAVE_REGISTRO = 'oq-aparelho-conta'
const INTERVALO_MS = 60_000
/** De quanto em quanto tempo olha se a página ou a questão mudou (só manda sinal se mudou). */
const OLHAR_PAGINA_MS = 15_000

/**
 * O que está aberto agora, para o painel do administrador: a rota (sem os
 * parâmetros) e, numa questão ou numa sessão, o id da questão na tela.
 */
export function paginaAtual(): { pagina: string; questao: string | null } {
  const rota = (location.hash.replace(/^#/, '').split('?')[0] || '/').slice(0, 100)
  const avulsa = rota.match(/^\/questao\/([a-z0-9-]{3,80})/)
  if (avulsa) return { pagina: '/questao', questao: avulsa[1] }
  if (rota === '/sessao') {
    const sessao = ler<{ ids?: string[]; posicao?: number } | null>('sessao:atual', null)
    const ids = sessao?.ids ?? []
    const i = Math.min(Math.max(0, sessao?.posicao ?? 0), Math.max(0, ids.length - 1))
    const id = ids[i]
    return { pagina: ids.length ? `/sessao · ${i + 1} de ${ids.length}` : '/sessao', questao: id && /^[a-z0-9-]{3,80}$/.test(id) ? id : null }
  }
  // no Torneio de Flashcards, o andar da partida em andamento (o painel mostra "batalha no andar 7")
  const jogo = rota.match(/^\/flashcards\/(cripta|masmorra|torre)$/)
  if (jogo) {
    const partida = ler<{ andar?: number; fase?: string } | null>(jogo[1] === 'torre' ? 'flashcards:torre' : 'flashcards:partida', null)
    if (partida?.andar && partida.fase !== 'fim') return { pagina: `${rota} · andar ${partida.andar}`, questao: null }
  }
  return { pagina: rota, questao: null }
}

let idMemoria: string | null = null

export function idAparelho(): string {
  try {
    let id = localStorage.getItem(CHAVE_ID)
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) { id = gerarId(); localStorage.setItem(CHAVE_ID, id) }
    return id
  } catch {
    return (idMemoria ??= gerarId())
  }
}

function lerRegistro() { try { return localStorage.getItem(CHAVE_REGISTRO) } catch { return null } }
function gravarRegistro(usuario: string | null) {
  try { if (usuario) localStorage.setItem(CHAVE_REGISTRO, usuario); else localStorage.removeItem(CHAVE_REGISTRO) } catch { /* sem armazenamento */ }
}

/** "Chrome no Windows", "Safari no iPhone", "App no Android". */
export function descreverAparelho(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  const sistema =
    /iPhone/.test(ua) ? 'iPhone'
      : /iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) ? 'iPad'
        : /Android/.test(ua) ? 'Android'
          : /Windows/.test(ua) ? 'Windows'
            : /CrOS/.test(ua) ? 'Chromebook'
              : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
                : /Linux/.test(ua) ? 'Linux' : 'outro aparelho'
  const app = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
  const navegador = app ? 'App'
    : /Edg\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
          : /FxiOS|Firefox/.test(ua) ? 'Firefox'
            : /CriOS|Chrome/.test(ua) ? 'Chrome'
              : /Safari/.test(ua) ? 'Safari' : 'Navegador'
  return `${navegador} no ${sistema}`
}

interface Sinal { ativo: boolean; outro_aparelho: string | null }

/**
 * Começa a vigiar a conta neste aparelho. `aoPerder` é chamado uma vez, com
 * a descrição do aparelho que entrou depois. Falha de rede ou migração
 * ainda não aplicada no banco nunca tiram ninguém da conta.
 */
export function vigiarAparelho(usuario: string, aoPerder: (outro: string | null) => void): () => void {
  const id = idAparelho()
  let parado = false
  let emAndamento = false
  // Banco sem a migração do monitor (sinal com página): usa o sinal antigo.
  let semPagina = false
  let ultimaEnviada = ''

  const registrar = async () => {
    await chamarRpc('registrar_aparelho', { p_aparelho: id, p_descricao: descreverAparelho() })
    gravarRegistro(usuario)
  }

  const sinal = async () => {
    if (parado || emAndamento || document.visibilityState !== 'visible') return
    emAndamento = true
    try {
      if (lerRegistro() !== usuario) { await registrar(); return }
      const agora = paginaAtual()
      let resposta: Sinal | undefined
      if (!semPagina) {
        try {
          ;[resposta] = await chamarRpc<Sinal[]>('sinal_aparelho', { p_aparelho: id, p_pagina: agora.pagina, p_questao: agora.questao })
          ultimaEnviada = agora.pagina + '|' + agora.questao
        } catch (f) {
          // 404: o banco ainda não tem o sinal com página. Outra falha (rede) segue como antes.
          if (f instanceof ErroRpc && f.status === 404) semPagina = true
          else throw f
        }
      }
      if (semPagina) [resposta] = await chamarRpc<Sinal[]>('sinal_aparelho', { p_aparelho: id })
      if (!parado && resposta && resposta.ativo === false) {
        parado = true
        gravarRegistro(null)
        aoPerder(resposta.outro_aparelho)
      }
    } catch { /* offline ou sem a migração: tenta de novo no próximo sinal */ } finally { emAndamento = false }
  }

  const aoMudarVisibilidade = () => { if (document.visibilityState === 'visible') void sinal() }
  // Mudou de página ou de questão: avisa logo, sem esperar o sinal do minuto.
  const olharPagina = () => {
    if (semPagina) return
    const agora = paginaAtual()
    if (agora.pagina + '|' + agora.questao !== ultimaEnviada) void sinal()
  }
  void sinal()
  const temporizador = window.setInterval(() => void sinal(), INTERVALO_MS)
  const temporizadorPagina = window.setInterval(olharPagina, OLHAR_PAGINA_MS)
  const aoMudarRota = () => window.setTimeout(olharPagina, 1500)
  window.addEventListener('hashchange', aoMudarRota)
  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  window.addEventListener('focus', aoMudarVisibilidade)
  return () => {
    parado = true
    window.clearInterval(temporizador)
    window.clearInterval(temporizadorPagina)
    window.removeEventListener('hashchange', aoMudarRota)
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    window.removeEventListener('focus', aoMudarVisibilidade)
  }
}

/** Ao sair da conta por vontade própria, o próximo login aqui se registra de novo. */
export function esquecerRegistroAparelho() { gravarRegistro(null) }

const CHAVE_EMAIL = 'oq-ultimo-email'
export function ultimoEmail(): string { try { return localStorage.getItem(CHAVE_EMAIL) ?? '' } catch { return '' } }
export function lembrarEmail(email: string) { try { localStorage.setItem(CHAVE_EMAIL, email) } catch { /* sem armazenamento */ } }
