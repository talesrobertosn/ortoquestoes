import { chamarRpc } from '../servicos/supabase'
import { gerarId } from '../util/id'

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

  const registrar = async () => {
    await chamarRpc('registrar_aparelho', { p_aparelho: id, p_descricao: descreverAparelho() })
    gravarRegistro(usuario)
  }

  const sinal = async () => {
    if (parado || emAndamento || document.visibilityState !== 'visible') return
    emAndamento = true
    try {
      if (lerRegistro() !== usuario) { await registrar(); return }
      const [resposta] = await chamarRpc<Sinal[]>('sinal_aparelho', { p_aparelho: id })
      if (!parado && resposta && resposta.ativo === false) {
        parado = true
        gravarRegistro(null)
        aoPerder(resposta.outro_aparelho)
      }
    } catch { /* offline ou sem a migração: tenta de novo no próximo sinal */ } finally { emAndamento = false }
  }

  const aoMudarVisibilidade = () => { if (document.visibilityState === 'visible') void sinal() }
  void sinal()
  const temporizador = window.setInterval(() => void sinal(), INTERVALO_MS)
  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  window.addEventListener('focus', aoMudarVisibilidade)
  return () => {
    parado = true
    window.clearInterval(temporizador)
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    window.removeEventListener('focus', aoMudarVisibilidade)
  }
}

/** Ao sair da conta por vontade própria, o próximo login aqui se registra de novo. */
export function esquecerRegistroAparelho() { gravarRegistro(null) }

const CHAVE_EMAIL = 'oq-ultimo-email'
export function ultimoEmail(): string { try { return localStorage.getItem(CHAVE_EMAIL) ?? '' } catch { return '' } }
export function lembrarEmail(email: string) { try { localStorage.setItem(CHAVE_EMAIL, email) } catch { /* sem armazenamento */ } }
