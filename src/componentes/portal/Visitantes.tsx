import { useEffect, useRef, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { CorujaPixel, type EstadoCoruja } from '../../biblioteca/sala/CorujaPixel'
import { GatoPixel } from '../mascote/GatoPixel'
import type { IdLinhaGato } from '../mascote/sprites'

/**
 * Os visitantes do Portal (31/10/2026, pedido do Tales: "o menu parece um lugar que os personagens visitam, e não uma
 * interface permanentemente decorada"). Regras leves e testáveis:
 * - a coruja bibliotecária (a mesma da Biblioteca) pousa no alto do menu logo ao abrir (desde 01/11/2026, pedido do
 *   Tales: "faz os pets do menu aparecer antes"): em metade das aberturas, no máximo uma vez por minuto, já na
 *   primeira abertura; pisca, lê um pouco e vai embora sozinha;
 * - o gato (o mesmo da página inicial) aparece depois de 1,5 segundo sem mexer no menu, em 6 de cada 10 aberturas:
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

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const forcado = () => { try { return sessionStorage.getItem('portal:forcar') ?? '' } catch { return '' } }

export function Visitantes({ digitando }: { digitando: boolean }) {
  const [coruja, definirCoruja] = useState<FaseCoruja>('longe')
  const [estadoCoruja, definirEstadoCoruja] = useState<EstadoCoruja>('voando')
  const [fala, definirFala] = useState<string | null>(null)
  const [gato, definirGato] = useState<FaseGato>('longe')
  const [miau, definirMiau] = useState(false)
  const relogios = useRef<number[]>([])
  const depois = (f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => relogios.current.forEach((t) => window.clearTimeout(t)), [])
  const falas = useRef(0)

  // A coruja: decide na abertura.
  useEffect(() => {
    const f = forcado()
    const aberturas = ler<number>(CHAVE_ABERTURAS, 0) + 1
    gravar(CHAVE_ABERTURAS, aberturas)
    const ultima = ler<number>(CHAVE_CORUJA, 0)
    const pode = f === 'coruja' || f === 'todos' || (Date.now() - ultima > 60_000 && Math.random() < 0.5)
    if (!pode) return
    gravar(CHAVE_CORUJA, Date.now())
    if (semMovimento()) { definirCoruja('pousada'); definirEstadoCoruja('repouso'); return }
    depois(() => { definirCoruja('chegando'); definirEstadoCoruja('voando') }, 250)
    depois(() => { definirCoruja('pousada'); definirEstadoCoruja('piscando') }, 1150)
    depois(() => definirEstadoCoruja('olhando'), 4600)
    depois(() => definirEstadoCoruja('lendo'), 7600)
    depois(() => definirEstadoCoruja('repouso'), 12600)
    depois(() => { definirCoruja((c) => (c === 'pousada' ? 'saindo' : c)); definirEstadoCoruja('voando') }, 17000)
    depois(() => definirCoruja((c) => (c === 'saindo' ? 'longe' : c)), 18200)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // O gato: depois de 1,5 s sem mexer no menu.
  useEffect(() => {
    const f = forcado()
    const pode = f === 'gato' || f === 'todos' || Math.random() < 0.6
    if (!pode || semMovimento()) return
    let parado: number | undefined
    const armar = () => {
      window.clearTimeout(parado)
      parado = window.setTimeout(() => {
        definirGato((g) => (g === 'longe' ? 'andando' : g))
        depois(() => definirGato((g) => (g === 'andando' ? 'sentado' : g)), 5200)
        depois(() => definirGato((g) => (g === 'sentado' ? 'espreguicando' : g)), 11000)
        depois(() => definirGato((g) => (g === 'espreguicando' ? 'dormindo' : g)), 13500)
      }, f ? 400 : 1500)
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
    definirEstadoCoruja('piando')
    definirFala(FALAS[falas.current++ % FALAS.length])
    if (gato !== 'longe') definirGato('reagindo')
    depois(() => definirEstadoCoruja('repouso'), 900)
    depois(() => definirFala(null), 7000)
  }
  const tocarGato = () => {
    definirGato('reagindo')
    definirMiau(true)
    depois(() => definirMiau(false), 1600)
    depois(() => definirGato('dormindo'), 2600)
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
          {fala && <p className="pt-coruja__fala" role="status" onClick={() => definirFala(null)}>{fala}</p>}
          <button type="button" className="pt-coruja__botao" onClick={tocarCoruja} aria-label="A coruja bibliotecária: uma dica">
            <CorujaPixel estado={estadoCoruja} />
          </button>
        </div>
      )}
      {gato !== 'longe' && (
        <div className={`pt-gato pt-gato--${gato}`}>
          {miau && <span className="pt-gato__miau" aria-hidden="true">Miau!</span>}
          <button type="button" className="pt-gato__botao" onClick={tocarGato} aria-label="O gato do OrtoQuestões">
            <GatoPixel estado={linhaGato} />
          </button>
        </div>
      )}
    </>
  )
}
