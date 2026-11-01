import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { gravar, ler } from '../../estado/armazenamento'
import { CorujaPixel, type EstadoCoruja } from '../../biblioteca/sala/CorujaPixel'
import { GatoPixel } from '../mascote/GatoPixel'
import type { IdLinhaGato } from '../mascote/sprites'
import { CONCEITOS_CORUJA, FALAS_GATO, proximaFala } from '../mascote/falasBichos'

/**
 * Os visitantes do Portal (31/10/2026, pedido do Tales: "o menu parece um lugar que os personagens visitam, e não uma
 * interface permanentemente decorada"). Regras leves e testáveis:
 * - a coruja bibliotecária (a mesma da Biblioteca) pousa no alto do menu logo ao abrir, em toda abertura (desde
 *   01/11/2026, pedidos do Tales: "faz os pets do menu aparecer antes" e "aparecer mais"); pisca, lê um pouco e vai
 *   embora sozinha;
 * - o gato (o mesmo da página inicial) aparece depois de 1 segundo sem mexer no menu, em toda abertura:
 *   entra andando pelo rodapé, senta, se espreguiça e dorme;
 * - os dois somem quando a pessoa começa a digitar na busca; com "menos movimento", ninguém voa nem anda;
 * - nunca os dois ao mesmo tempo de entrada: se o gato já está e a coruja pousa, ele olha para cima (o segredo raro);
 * - para testar: sessionStorage 'portal:forcar' = 'coruja' | 'gato' | 'todos'.
 * Nenhum deles cobre texto ou botão: a coruja fica no alto, à esquerda do X; o gato, na faixa do rodapé.
 */
type FaseCoruja = 'longe' | 'chegando' | 'pousada' | 'saindo'
type FaseGato = 'longe' | 'andando' | 'sentado' | 'espreguicando' | 'dormindo' | 'reagindo'

const CHAVE_CORUJA = 'portal:coruja-em'
const CHAVE_ABERTURAS = 'portal:aberturas'
const FALAS = [
  'Procurando um assunto? Experimente a busca: classificação também vale.',
  'Ctrl K abre este menu de qualquer página, já na busca.',
  'Os resumos têm partes: a busca abre o resumo direto na classificação.',
  'A revisão de hoje são as questões que você precisa rever agora.',
  'Dizem que a Biblioteca guarda segredos. O gato sabe de alguns.',
]

const CELULAR = '(max-width: 48rem)'
const noCelular = () => typeof matchMedia !== 'undefined' && matchMedia(CELULAR).matches
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const forcado = () => { try { return sessionStorage.getItem('portal:forcar') ?? '' } catch { return '' } }

export function Visitantes({ digitando }: { digitando: boolean }) {
  const [coruja, definirCoruja] = useState<FaseCoruja>('longe')
  const [estadoCoruja, definirEstadoCoruja] = useState<EstadoCoruja>('voando')
  const [fala, definirFala] = useState<string | null>(null)
  const [gato, definirGato] = useState<FaseGato>('longe')
  const [miau, definirMiau] = useState<string | null>(null)
  const relogios = useRef<number[]>([])
  const depois = (f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => relogios.current.forEach((t) => window.clearTimeout(t)), [])
  const falas = useRef(0)
  // No celular não há canto livre sobre o menu: a fala vai para a faixa abaixo da busca (Portal.tsx), no fluxo.
  const [celular, definirCelular] = useState(noCelular)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const m = matchMedia(CELULAR), mudou = () => definirCelular(m.matches)
    m.addEventListener('change', mudou); return () => m.removeEventListener('change', mudou)
  }, [])
  const naFaixa = (no: ReactNode) => {
    const faixa = celular && typeof document !== 'undefined' ? document.getElementById('pt-fala-faixa') : null
    return faixa ? createPortal(no, faixa) : no
  }

  // A coruja: decide na abertura.
  useEffect(() => {
    gravar(CHAVE_ABERTURAS, ler<number>(CHAVE_ABERTURAS, 0) + 1)
    gravar(CHAVE_CORUJA, Date.now())
    if (semMovimento()) { definirCoruja('pousada'); definirEstadoCoruja('repouso'); return }
    depois(() => { definirCoruja('chegando'); definirEstadoCoruja('voando') }, 250)
    depois(() => { definirCoruja('pousada'); definirEstadoCoruja('piscando') }, 1150)
    depois(() => definirEstadoCoruja('olhando'), 4600)
    depois(() => definirEstadoCoruja('lendo'), 7600)
    depois(() => definirEstadoCoruja('repouso'), 12600)
    // Ela fica (desde 01/11/2026, "que apareça mais vezes"): segue a rotina enquanto o menu está aberto.
    const ciclo: EstadoCoruja[] = ['olhando', 'repouso', 'lendo', 'repouso', 'acenando', 'repouso']
    let n = 0
    const vez = window.setInterval(() => { if (!document.hidden) definirEstadoCoruja((e) => (e === 'piando' ? e : ciclo[n++ % ciclo.length])) }, 5200)
    return () => window.clearInterval(vez)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // O gato: depois de 1 s sem mexer no menu.
  useEffect(() => {
    const f = forcado()
    if (semMovimento()) return
    let parado: number | undefined
    const armar = () => {
      window.clearTimeout(parado)
      parado = window.setTimeout(() => {
        definirGato((g) => (g === 'longe' ? 'andando' : g))
        depois(() => definirGato((g) => (g === 'andando' ? 'sentado' : g)), 5200)
        depois(() => definirGato((g) => (g === 'sentado' ? 'espreguicando' : g)), 11000)
        depois(() => definirGato((g) => (g === 'espreguicando' ? 'dormindo' : g)), 12800)
      }, f ? 300 : 600)
    }
    armar()
    const mexeu = () => { if (gatoRef.current === 'longe') armar() }
    window.addEventListener('pointermove', mexeu, { passive: true })
    window.addEventListener('keydown', mexeu)
    return () => { window.clearTimeout(parado); window.removeEventListener('pointermove', mexeu); window.removeEventListener('keydown', mexeu) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const gatoRef = useRef(gato)
  gatoRef.current = gato

  // Digitar na busca: os visitantes saem de cena (não atrapalham quem procura).
  useEffect(() => {
    if (!digitando) return
    definirFala(null)
    if (coruja === 'pousada' || coruja === 'chegando') { definirCoruja('saindo'); definirEstadoCoruja('voando'); depois(() => definirCoruja('longe'), 1000) }
    if (gato !== 'longe') definirGato('longe')
  }, [digitando]) // eslint-disable-line react-hooks/exhaustive-deps

  const tocarCoruja = () => {
    // A coruja é a sábia: cada toque explica um conceito que cai na prova (às vezes, uma dica do menu).
    definirEstadoCoruja('piando')
    const n = falas.current++
    const texto = n > 0 && n % 6 === 5 ? FALAS[(n / 6 | 0) % FALAS.length] : proximaFala('coruja', CONCEITOS_CORUJA)
    definirFala(texto)
    if (gato !== 'longe') definirGato('reagindo')
    depois(() => definirEstadoCoruja('repouso'), 900)
    depois(() => definirFala((f) => (f === texto ? null : f)), 11000)
  }
  const tocarGato = () => {
    // O gato é o preguiçoso: acorda, solta uma frase e volta a dormir.
    definirGato('reagindo')
    const texto = proximaFala('gato', FALAS_GATO)
    definirMiau(texto)
    depois(() => definirMiau((m) => (m === texto ? null : m)), 5500)
    // Depois de falar, fica sentado acordado um tempo e só então volta a dormir (sem deitar e levantar em seguida).
    depois(() => definirGato((g) => (g === 'reagindo' ? 'sentado' : g)), 1600)
    depois(() => definirGato((g) => (g === 'sentado' ? 'dormindo' : g)), 14000)
  }
  // Se a coruja pousa com o gato acordado, ele olha para cima (o encontro dos dois).
  const linhaGato: IdLinhaGato = gato === 'andando' ? 'andando'
    : gato === 'sentado' ? (coruja === 'pousada' ? 'olhando_cima' : 'sentado')
    : gato === 'espreguicando' ? 'espreguicando'
    : gato === 'reagindo' ? (coruja === 'pousada' ? 'olhando_cima' : 'acordando') : 'dormindo'

  return (
    <>
      {coruja !== 'longe' && (
        <div className={`pt-coruja pt-coruja--${coruja}`}>
          {fala && naFaixa(<p className="pt-coruja__fala" role="status" onClick={() => definirFala(null)}>{celular && <b>Coruja: </b>}{fala}</p>)}
          <button type="button" className="pt-coruja__botao" onClick={tocarCoruja} aria-label="A coruja bibliotecária: um conceito que cai na prova">
            <CorujaPixel estado={estadoCoruja} />
          </button>
        </div>
      )}
      {gato !== 'longe' && (
        <div className={`pt-gato pt-gato--${gato}`}>
          {miau && naFaixa(<span className="pt-gato__miau" role="status" onClick={() => definirMiau(null)}>{celular && <b>Gato: </b>}{miau}</span>)}
          <button type="button" className="pt-gato__botao" onClick={tocarGato} aria-label="O gato do OrtoQuestões: tocar">
            <GatoPixel estado={linhaGato} />
          </button>
        </div>
      )}
    </>
  )
}
