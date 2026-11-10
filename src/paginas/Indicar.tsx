import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { recurso, urlCss } from '../config'
import { usarConta } from '../conta/ContextoConta'
import {
  DIAS_POR_AMIGO, LIMITE_AMIGOS, QUESTOES_PARA_CONFIRMAR, guardarConviteRecebido, linkIndicacao,
  previaConvite, textoIndicacao, usarAmigosIndicados, usarMinhaIndicacao, type AmigoIndicado,
} from '../conta/indicacao'
import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { GatoPixel } from '../componentes/mascote/GatoPixel'
import { DURACAO_DRAGAO, DragaoPixel } from '../componentes/mascote/DragaoPixel'
import type { IdLinhaDragao } from '../componentes/mascote/sprites'
import { Mascote } from '../componentes/mascote/Mascote'
import { BotaoGoogle } from '../componentes/BotaoGoogle'
import { IconeWhatsapp } from '../componentes/ConviteCompartilhar'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import '../estilos/paginas/Indicar.css'

type Quem = 'esqueleto' | 'gato' | 'coruja' | 'dragao'
const FALAS_INDICAR: Record<Quem, readonly string[]> = {
  esqueleto: [
    'Estudar junto rende mais. E o tesouro cresce para os dois.',
    'Cada amigo confirmado vale 7 dias para você e 7 para ele.',
    'Manda no grupo da residência. Alguém sempre precisa de um empurrão.',
    'Eu indicaria, mas meus amigos são todos esqueletos de museu.',
  ],
  gato: [
    'Indiquei a coruja. Ela ainda não respondeu as 20 questões.',
    'Eu mandaria o link, mas o celular está longe. Uns dois metros.',
    'O dragão dorme em cima do ouro. Eu durmo ao lado. É tradição.',
    'Chame um amigo. Assim alguém faz as questões por mim.',
  ],
  coruja: [
    'O link é pessoal: é por ele que o site sabe quem convidou quem.',
    'A indicação confirma quando o amigo responde 20 questões.',
    'Os dias entram depois da assinatura paga ativa. Nada se perde.',
    'Vale para até 12 amigos confirmados.',
  ],
  dragao: [
    'Este ouro é meu. Os 7 dias são seus. Pode levar.',
    'Doze amigos, 84 dias de plano completo. Eu fiz a conta: dragão entende de tesouro.',
    'Cada amigo confirmado é mais uma moeda no monte. Eu conto todas.',
    'Solto fogo, mas não mordo. Manda o link.',
    'Tesouro guardado não rende. Tesouro dividido rende 7 dias para cada um.',
  ],
}

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Moedas em pixel que caem por cima da cena (enfeite; some com "menos movimento"). `n` muda a chuva. */
function ChuvaDeMoedas({ n, quantas = 16 }: { n: number; quantas?: number }) {
  if (!n) return null
  return (
    <span key={n} className="ind-chuva" aria-hidden="true">
      {Array.from({ length: quantas }, (_, i) => (
        <i key={i} style={{ '--x': `${38 + ((i * 37 + n * 13) % 60)}%`, '--d': `${(i % 7) * 0.13}s`, '--t': `${1.1 + (i % 5) * 0.16}s` } as CSSProperties} />
      ))}
    </span>
  )
}

/**
 * A Câmara do Tesouro (10/11/2026, "tom de ouro, como se a pessoa estivesse ganhando muito"): o cenário HD-2D de
 * scripts/gerar_cena_tesouro.py. Cada bicho tem o seu posto: o esqueleto é o cavaleiro no alto do monte, ao lado da
 * espada que fincou; a coruja faz a contabilidade em cima do baú; o gato dorme encostado nele. O flanco esquerdo do
 * monte é o ninho do dragão (DragaoViajante), que não fica preso à pintura.
 */
function Tesouro({ comemora, chuva, aoChover }: { comemora: boolean; chuva: number; aoChover: () => void }) {
  const [fala, definirFala] = useState<{ quem: Exclude<Quem, 'dragao'>; texto: string } | null>(null)
  const voltas = useRef({ esqueleto: 0, gato: 0, coruja: 0 })
  const toquesGato = useRef<number[]>([])
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 6500); return () => window.clearTimeout(t) }, [fala])
  const falar = (quem: Exclude<Quem, 'dragao'>) => {
    if (quem === 'gato') {
      const agora = Date.now()
      toquesGato.current = [...toquesGato.current.filter((t) => agora - t < 5000), agora]
      if (toquesGato.current.length >= 3) {
        toquesGato.current = []
        guardarNoAlbum('gato-recrutador')
        aoChover()
        definirFala({ quem, texto: 'Está bem, eu indico alguém. Indiquei a almofada. Ela é ótima ouvinte.' })
        return
      }
    }
    const lista = FALAS_INDICAR[quem]
    definirFala({ quem, texto: lista[voltas.current[quem]++ % lista.length] })
  }
  const tocarEspada = () => {
    guardarNoAlbum('tesouro-espada')
    aoChover()
    definirFala({ quem: 'esqueleto', texto: 'Conhecimento vale ouro. E amigo que estuda junto vale mais ainda.' })
  }
  return (
    <div className="ind-cena">
      <div className="ind-cena__arte" style={{ '--arte': urlCss('pixel/paginas/tesouro.webp'), '--arte-960': urlCss('pixel/paginas/tesouro-960.webp') } as CSSProperties}>
        <span className="ind-cena__cintila" aria-hidden="true">{[[62, 58], [70, 47], [77, 61], [84, 52], [91, 70], [58, 74], [73, 78], [88, 83], [66, 88], [81, 40]].map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--d': `${i * 0.41}s` } as CSSProperties} />)}</span>
        <span className="ind-ninho" data-poleiro="ninho" aria-hidden="true" />
        <button type="button" className="ind-espada" onClick={tocarEspada} aria-label="Tocar na espada no alto do tesouro" />
        <button type="button" className="ind-bicho ind-bicho--esqueleto" onClick={() => falar('esqueleto')} aria-label="Falar com o esqueleto">
          <Mascote comportamento={comemora ? 'trofeu' : 'acenar'} falar={false} interativo={false} />
        </button>
        <button type="button" className="ind-bicho ind-bicho--gato" onClick={() => falar('gato')} aria-label="Falar com o gato"><GatoPixel estado={fala?.quem === 'gato' ? 'acordado' : 'dormindo'} /></button>
        <button type="button" className="ind-bicho ind-bicho--coruja" onClick={() => falar('coruja')} aria-label="Falar com a coruja"><CorujaPixel estado={fala?.quem === 'coruja' ? 'acenando' : 'parada'} /></button>
        <ChuvaDeMoedas n={chuva} />
        {fala && <p className={`ind-balao ind-balao--${fala.quem}`} role="status" onClick={() => definirFala(null)}>{fala.texto}</p>}
      </div>
    </div>
  )
}

/**
 * O dragão que quebra a quarta parede (Tales, 10/11/2026: "ele voa pela página inteira e pousa no teto do bloco").
 * Ele não mora dentro da pintura: é uma camada por cima da página. Sai do ninho no ouro, voa em arco e pousa na
 * borda de cima de um bloco qualquer que esteja à vista (`data-poleiro`), vira para o meio da página e, às vezes,
 * sopra fogo ou ruge. De tempos em tempos volta ao ouro e dorme. Um toque: fogo e uma fala. O ponto guardado é o
 * dos pés, em coordenadas da página (`raiz`), então rolar não o desloca. Com "menos movimento", fica no ninho.
 */
function DragaoViajante({ raiz, aoSoprar }: { raiz: RefObject<HTMLDivElement | null>; aoSoprar: () => void }) {
  const [ponto, definirPonto] = useState<{ x: number; y: number } | null>(null)
  const [linha, definirLinha] = useState<IdLinhaDragao>('voando')
  const [virado, definirVirado] = useState(false)
  const [voo, definirVoo] = useState(0)
  const [fala, definirFala] = useState<string | null>(null)
  const pouso = useRef<{ el: Element; f: number } | null>(null)
  const linhaRef = useRef(linha); linhaRef.current = linha
  const relogios = useRef<number[]>([])
  const proxima = useRef(0)
  const falas = useRef(0)
  const largura = () => (window.innerWidth < 700 ? 150 : 256)

  useEffect(() => {
    const base = raiz.current
    if (!base) return
    const depois = (f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }
    const pontoDe = (el: Element, f: number) => {
      const r = el.getBoundingClientRect(), b = base.getBoundingClientRect(), w = largura()
      const ninho = (el as HTMLElement).dataset.poleiro === 'ninho'
      const x = Math.min(b.width - w * 0.45, Math.max(w * 0.6, r.left - b.left + r.width * f))
      return { x: ninho ? r.left - b.left + r.width / 2 : x, y: (ninho ? r.bottom : r.top) - b.top }
    }
    const ninho = base.querySelector('[data-poleiro="ninho"]')
    if (!ninho) return
    const noNinho = () => (pouso.current?.el as HTMLElement | undefined)?.dataset.poleiro === 'ninho'
    const agendar = (ms: number) => { window.clearTimeout(proxima.current); proxima.current = window.setTimeout(partir, ms) }
    const pousar = () => {
      const el = pouso.current!.el, p = pontoDe(el, pouso.current!.f)
      // Pousado, ele olha para o meio da página (o desenho olha para a esquerda).
      definirVirado(noNinho() ? false : p.x < base.getBoundingClientRect().width / 2)
      definirLinha('pousando')
      depois(() => {
        definirLinha('parado')
        const sorte = Math.random()
        if (noNinho() && sorte < 0.45) { depois(() => definirLinha((l) => (l === 'parado' ? 'dormindo' : l)), 2500); agendar(17000); return }
        if (sorte < 0.6) {
          const gesto: IdLinhaDragao = sorte < 0.42 ? 'fogo' : 'rugindo'
          depois(() => definirLinha((l) => (l === 'parado' ? gesto : l)), 900)
          depois(() => definirLinha((l) => (l === gesto ? 'parado' : l)), 900 + DURACAO_DRAGAO[gesto] * 1000 + 200)
        }
        agendar(7000 + Math.random() * 5000)
      }, DURACAO_DRAGAO.pousando * 1000)
    }
    const voarPara = (el: Element, f: number) => {
      const b = base.getBoundingClientRect(), de = pouso.current ? pontoDe(pouso.current.el, pouso.current.f) : null
      pouso.current = { el, f }
      const para = pontoDe(el, f)
      const dist = de ? Math.hypot(para.x - de.x, para.y - de.y) : 500
      const dur = Math.min(2.6, Math.max(1.2, dist / 380))
      if (de) definirVirado(para.x > de.x)
      definirVoo(dur); definirLinha('voando'); definirPonto(para)
      depois(pousar, dur * 1000)
      void b
    }
    function partir() {
      if (document.hidden || fala) { agendar(3000); return }
      const alto = window.innerHeight
      const todos = [...base!.querySelectorAll('[data-poleiro]')].filter((el) => el !== pouso.current?.el)
      const aVista = todos.filter((el) => { const r = el.getBoundingClientRect(); return r.top > 90 && r.top < alto - 40 })
      // Nada à vista além de onde ele está: fica. Se ele mesmo saiu da tela, vai para o bloco mais perto do meio dela.
      const meuTopo = pouso.current ? pouso.current.el.getBoundingClientRect().top : -1
      const euAVista = meuTopo > 60 && meuTopo < alto
      if (!aVista.length && euAVista) { agendar(4000); return }
      const perto = [...todos].sort((a, b) => Math.abs(a.getBoundingClientRect().top - alto / 2) - Math.abs(b.getBoundingClientRect().top - alto / 2)).slice(0, 1)
      const lista = aVista.length ? aVista : perto
      if (!lista.length) return
      // O ninho pesa mais: ele sempre acaba voltando para o ouro.
      const volta = lista.find((el) => (el as HTMLElement).dataset.poleiro === 'ninho')
      const el = volta && Math.random() < 0.3 ? volta : lista[Math.floor(Math.random() * lista.length)]
      voarPara(el, 0.2 + Math.random() * 0.6)
    }
    if (semMovimento()) { pouso.current = { el: ninho, f: 0.5 }; definirPonto(pontoDe(ninho, 0.5)); definirLinha('parado'); return }
    // A chegada: vem de fora da tela, pelo alto, e pousa no ouro.
    const alvo = pontoDe(ninho, 0.5)
    definirVoo(0); definirPonto({ x: alvo.x + 420, y: alvo.y - 330 })
    depois(() => voarPara(ninho, 0.5), 450)
    const aoRedimensionar = () => { if (pouso.current && linhaRef.current !== 'voando') { definirVoo(0); definirPonto(pontoDe(pouso.current.el, pouso.current.f)) } }
    window.addEventListener('resize', aoRedimensionar)
    // A pessoa rolou e ele ficou para trás: vem atrás dela.
    let rolou = 0
    const aoRolar = () => {
      window.clearTimeout(rolou)
      rolou = window.setTimeout(() => {
        if (!pouso.current || linhaRef.current === 'voando' || linhaRef.current === 'pousando') return
        const t = pouso.current.el.getBoundingClientRect().top
        if (t < 60 || t > window.innerHeight) agendar(500)
      }, 350)
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    const todos = relogios.current
    return () => { todos.forEach((t) => window.clearTimeout(t)); window.clearTimeout(proxima.current); window.clearTimeout(rolou); window.removeEventListener('resize', aoRedimensionar); window.removeEventListener('scroll', aoRolar) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 6500); return () => window.clearTimeout(t) }, [fala])

  const tocar = () => {
    if (linha === 'voando' || linha === 'pousando' || linha === 'fogo' || linha === 'rugindo') return
    guardarNoAlbum('dragao-fogo')
    const n = falas.current++
    definirFala(FALAS_INDICAR.dragao[n % FALAS_INDICAR.dragao.length])
    if (semMovimento()) return
    const gesto: IdLinhaDragao = n % 3 === 2 ? 'rugindo' : 'fogo'
    definirLinha(gesto)
    if (gesto === 'fogo') aoSoprar()
    relogios.current.push(window.setTimeout(() => definirLinha((l) => (l === gesto ? 'parado' : l)), DURACAO_DRAGAO[gesto] * 1000 + 250))
  }
  if (!ponto) return null
  return (
    <div className={`ind-voador ind-voador--${linha}${virado ? ' ind-voador--virado' : ''}`} style={{ transform: `translate(${ponto.x}px, ${ponto.y}px)`, '--voo': `${voo}s` } as CSSProperties}>
      <span className="ind-voador__arco">
        <button type="button" className="ind-voador__botao" onClick={tocar} aria-label="O dragão do tesouro: tocar para ele soltar fogo">
          <DragaoPixel estado={linha} />
        </button>
      </span>
      {fala && <p className="ind-voador__fala" role="status" onClick={() => definirFala(null)}>{fala}</p>}
    </div>
  )
}

/**
 * As margens da página (Tales, 10/11/2026: "até as bordas, o canto direito e o esquerdo, que costumam ficar vazios"):
 * em telas largas, um estandarte dourado pende de cada lado, moedas sobem devagar e um monte de ouro fecha cada canto
 * de baixo. Só enfeite: não recebe toque nem foco e some quando a tela não tem margem sobrando.
 */
function Margens() {
  return (
    <div className="ind-margens" aria-hidden="true">
      {(['esq', 'dir'] as const).map((lado) => (
        <div key={lado} className={`ind-margem ind-margem--${lado}`}>
          <div className="ind-margem__ar">
            <span className="ind-estandarte"><i /></span>
            {Array.from({ length: 7 }, (_, i) => <b key={i} style={{ '--x': `${12 + ((i * 31) % 70)}%`, '--d': `${i * 1.7}s`, '--t': `${9 + (i % 4) * 2.5}s` } as CSSProperties} />)}
            <img src={recurso('pixel/paginas/tesouro-canto.png')} width={396} height={282} alt="" draggable={false} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** O que os 7 dias liberam (o plano completo) e o que a conta grátis já traz: a vitrine que vende o convite. */
const LIBERA: ReadonlyArray<{ img: string; titulo: string; texto: string }> = [
  { img: 'pixel/ciclo.png', titulo: 'Questões sem limite', texto: 'Acabou o teto do dia. Treine o quanto a escala deixar, com cada alternativa comentada.' },
  { img: 'pixel/revisao.png', titulo: 'Cronograma até a prova', texto: 'A lista pronta de cada dia: o que mais cai primeiro, dia de plantão respeitado e reta final.' },
  { img: 'pixel/atlas.png', titulo: 'Atlas 3D completo', texto: 'Nervos, artérias, veias, ligamentos e fáscias por cima dos ossos e músculos, ligados às questões.' },
  { img: 'pixel/flashcards.png', titulo: 'Flashcards ilimitados', texto: 'O que você erra volta na hora certa, sem limite por dia. E ainda vira torneio.' },
  { img: 'pixel/treinar.png', titulo: 'Resumos completos', texto: 'A Biblioteca inteira, na ordem em que a prova cobra, e todas as frases que caem.' },
  { img: 'pixel/simulado.png', titulo: 'Simulado Nacional', texto: 'A mesma prova para o Brasil todo, corrigida na hora, com a sua posição.' },
  { img: 'pixel/turma.png', titulo: 'Como a turma respondeu', texto: 'Quantos marcaram cada alternativa, onde está a pegadinha e treino pelas mais erradas.' },
  { img: 'pixel/liga.png', titulo: 'Liga da residência', texto: 'Ranking privado do serviço e o relatório do mês no e-mail.' },
]
const JA_VEM: ReadonlyArray<{ img: string; titulo: string }> = [
  { img: 'pixel/erros.png', titulo: 'Caderno de erros' },
  { img: 'pixel/desempenho.png', titulo: 'Desempenho por área' },
  { img: 'pixel/ranking.png', titulo: 'Ranking' },
  { img: 'pixel/relatorio.png', titulo: 'Revisão espaçada' },
]

function Beneficios({ convidado = false }: { convidado?: boolean }) {
  return (
    <section data-poleiro="" className="ind-vitrine" aria-labelledby="ind-vitrine-titulo">
      <header className="ind-vitrine__cabeca">
        <p className="ind-sobre">O que está dentro do baú</p>
        <h2 id="ind-vitrine-titulo">{DIAS_POR_AMIGO} dias de <em>plano completo</em>. {convidado ? 'Para você e para quem te chamou.' : 'Para você e para o seu amigo.'}</h2>
        <p>Não é amostra. Durante os {DIAS_POR_AMIGO} dias, {convidado ? 'vocês dois usam' : 'cada um de vocês usa'} o site inteiro, como assinante.</p>
      </header>
      <ul className="ind-beneficios">
        {LIBERA.map((b, i) => (
          <li key={b.titulo} style={{ '--i': i } as CSSProperties}>
            <img src={recurso(b.img)} width={56} height={56} alt="" loading="lazy" decoding="async" draggable={false} />
            <div><strong>{b.titulo}</strong><span>{b.texto}</span></div>
          </li>
        ))}
      </ul>
      <div className="ind-javem">
        <p><strong>E o que a conta grátis já traz continua lá,</strong> do primeiro dia em diante:</p>
        <ul>{JA_VEM.map((b) => <li key={b.titulo}><img src={recurso(b.img)} width={28} height={28} alt="" loading="lazy" decoding="async" draggable={false} /> {b.titulo}</li>)}</ul>
      </div>
    </section>
  )
}

/** A conta que convence: 1 amigo, 4 amigos, 12 amigos. */
function Conta() {
  const marcos = [1, 4, LIMITE_AMIGOS]
  return (
    <ul className="ind-conta" data-poleiro="" aria-label="Quanto você ganha">
      {marcos.map((n) => (
        <li key={n}>
          <span className="ind-conta__amigos">{n} {n === 1 ? 'amigo' : 'amigos'}</span>
          <strong>{n * DIAS_POR_AMIGO}<small> dias</small></strong>
          <span className="ind-conta__nota">{n === 1 ? 'uma semana inteira' : n === 4 ? 'quase um mês' : 'quase três meses'}</span>
        </li>
      ))}
    </ul>
  )
}

/** As raridades vistas (o álbum da Sala dos bichos, Bichos.tsx): ficam no aparelho. */
function guardarNoAlbum(id: string) {
  try {
    const album: string[] = JSON.parse(localStorage.getItem('bichos:album') ?? '[]')
    if (!album.includes(id)) localStorage.setItem('bichos:album', JSON.stringify([...album, id]))
  } catch { /* sem armazenamento */ }
}

function Regras() {
  return (
    <ol className="ind-passos">
      <li><span className="ind-moeda">1</span><div><strong>Mande o seu link</strong><span>No grupo da residência, no WhatsApp de um colega, onde quiser.</span></div></li>
      <li><span className="ind-moeda">2</span><div><strong>O colega cria a conta e responde {QUESTOES_PARA_CONFIRMAR} questões</strong><span>Pelo Google leva um toque. As {QUESTOES_PARA_CONFIRMAR} questões mostram que é gente de verdade estudando.</span></div></li>
      <li><span className="ind-moeda">3</span><div><strong>Vocês dois ganham {DIAS_POR_AMIGO} dias do plano completo</strong><span>Sem limite de questões, Cronograma e tudo o que os planos liberam. Vale para até {LIMITE_AMIGOS} amigos.</span></div></li>
    </ol>
  )
}

/** As regras de uso, por escrito: o que vale, o que não vale e o que acontece com conta falsa. */
function RegrasDeUso() {
  return (
    <section data-poleiro="" className="folha ind-folha ind-folha--regras" aria-labelledby="ind-regras-titulo">
      <h2 id="ind-regras-titulo">Regras de uso</h2>
      <p className="ind-regras__abre">O Indique e ganhe existe para colega chamar colega. Para continuar justo com todo mundo, ele segue estas regras.</p>
      <ol className="ind-regras">
        <li><strong>Uma pessoa, uma conta.</strong> A indicação vale para um colega de verdade, com a conta dele, criada pelo seu link.</li>
        <li><strong>Cada conta nova usa um convite só.</strong> Quem já tinha conta não conta como indicado, e ninguém pode indicar a si mesmo.</li>
        <li><strong>As {QUESTOES_PARA_CONFIRMAR} questões são do seu amigo.</strong> A indicação confirma quando ele mesmo responde, estudando de verdade.</li>
        <li><strong>Até {LIMITE_AMIGOS} amigos dão dias.</strong> São {DIAS_POR_AMIGO} dias de plano completo por amigo confirmado, para você e para ele. Os dias não viram dinheiro nem passam para outra conta.</li>
        <li><strong>Para quem já assina, nada se perde.</strong> Os dias ganhos entram depois do período pago que estiver ativo.</li>
        <li><strong>Conta falsa não vale.</strong> Criar contas para si mesmo, usar e-mails descartáveis, repetir a mesma pessoa em várias contas ou combinar cadastros só para ganhar dias é uso indevido.</li>
        <li><strong>As indicações são acompanhadas caso a caso.</strong> Se uma conta falsa ou um uso indevido for identificado, os dias ganhos são retirados e as contas envolvidas podem ser suspensas ou banidas.</li>
        <li><strong>Achou que houve engano?</strong> Fale com a gente pelo <a href={href('/contato')}>suporte</a>: toda situação é olhada por uma pessoa.</li>
      </ol>
    </section>
  )
}

/** O número sobe de zero até o valor, como moedas sendo contadas (direto no valor com "menos movimento"). */
function Contador({ ate }: { ate: number }) {
  const [n, definir] = useState(0)
  useEffect(() => {
    if (ate <= 0 || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) { definir(ate); return }
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 1100)
      definir(Math.round(ate * (1 - (1 - t) ** 3)))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [ate])
  return <>{n}</>
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')

/** A lista dos amigos que entraram pelo link: confirmados com os dias ganhos, os outros com o caminho até 20 questões. */
function Amigos({ amigos }: { amigos: AmigoIndicado[] }) {
  if (!amigos.length) return (
    <div className="ind-vazio">
      <GatoPixel estado="dormindo" className="ind-vazio__gato" />
      <p><strong>Ninguém entrou pelo seu link ainda.</strong> O gato está guardando o lugar. Que tal mandar no grupo da residência?</p>
    </div>
  )
  return (
    <ul className="ind-amigos">
      {amigos.map((a, i) => {
        const confirmado = !!a.confirmada_em
        return (
          <li key={`${a.entrou_em}-${i}`} className={confirmado ? 'ind-amigo ind-amigo--confirmado' : 'ind-amigo'}>
            <span className="ind-amigo__inicial" aria-hidden="true">{a.nome.charAt(0).toUpperCase()}</span>
            <span className="ind-amigo__texto">
              <strong>{a.nome}</strong>
              <small>{confirmado ? `Confirmou em ${dataCurta(a.confirmada_em!)}` : `Entrou em ${dataCurta(a.entrou_em)} · ${a.respondidas} de ${QUESTOES_PARA_CONFIRMAR} questões`}</small>
              {!confirmado && <span className="ind-amigo__barra" aria-hidden="true"><i style={{ width: `${Math.min(100, (a.respondidas / QUESTOES_PARA_CONFIRMAR) * 100)}%` }} /></span>}
            </span>
            <span className={confirmado ? 'ind-amigo__selo ind-amigo__selo--ok' : 'ind-amigo__selo'}>
              {confirmado && a.dias > 0 && <i className="ind-moedinha" aria-hidden="true" />}{confirmado ? (a.dias > 0 ? `+${a.dias} dias` : 'Confirmado') : 'A caminho'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Os botões de envio (WhatsApp, copiar, mais opções); sem conta, levam a criar a conta para pegar o link. */
function Acoes({ codigo, grande = false }: { codigo: string | null; grande?: boolean }) {
  const [copiado, definirCopiado] = useState(false)
  if (!codigo) return (
    <div className={grande ? 'ind-acoes ind-acoes--grande' : 'ind-acoes'}>
      <a className="ind-acoes__ouro" href={href('/conta?modo=criar')}>Criar conta e pegar meu link</a>
    </div>
  )
  const link = linkIndicacao(codigo)
  async function copiar() {
    try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copie o seu link:', link) }
    definirCopiado(true); window.setTimeout(() => definirCopiado(false), 2500)
  }
  async function compartilhar() {
    try { await navigator.share({ title: 'Orto Questões', text: textoIndicacao(codigo!) }) } catch { /* cancelado */ }
  }
  return (
    <div className={grande ? 'ind-acoes ind-acoes--grande' : 'ind-acoes'}>
      <a className="ind-acoes__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoIndicacao(codigo))}`} target="_blank" rel="noopener noreferrer"><IconeWhatsapp tamanho={18} /> Enviar no WhatsApp</a>
      <button type="button" className="ind-acoes__ouro" onClick={() => void copiar()}><Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar meu link'}</button>
      {typeof navigator !== 'undefined' && 'share' in navigator && <button type="button" className="ind-acoes__mais" onClick={() => void compartilhar()}>Mais opções</button>}
    </div>
  )
}

/** #/indicar: a página que vende o convite. O tesouro no topo, o que os 7 dias liberam, o link, o placar e os amigos. */
export function Indicar() {
  const { sessao } = usarConta()
  const { dados, carregado } = usarMinhaIndicacao(sessao?.user.id)
  const amigos = usarAmigosIndicados(sessao?.user.id)
  const link = dados ? linkIndicacao(dados.codigo) : ''
  const ativoAte = dados?.cortesia_ate && new Date(dados.cortesia_ate) > new Date() ? new Date(dados.cortesia_ate).toLocaleDateString('pt-BR') : null
  const faltam = dados ? Math.max(0, dados.limite - dados.confirmados) : LIMITE_AMIGOS
  const raiz = useRef<HTMLDivElement>(null)
  const [chuva, definirChuva] = useState(0)
  const chover = () => definirChuva((n) => n + 1)

  return (
    <div className="ind" ref={raiz}>
      <Margens />
      <DragaoViajante raiz={raiz} aoSoprar={chover} />
      <section data-poleiro="" className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Indique e ganhe</p>
          <h1 id="ind-titulo">Chame um amigo. Vocês dois ganham <em>{DIAS_POR_AMIGO} dias de tudo.</em></h1>
          <p>Ele entra pelo seu link e responde {QUESTOES_PARA_CONFIRMAR} questões. Pronto: {DIAS_POR_AMIGO} dias de plano completo para ele e {DIAS_POR_AMIGO} para você. Com {LIMITE_AMIGOS} amigos, são {LIMITE_AMIGOS * DIAS_POR_AMIGO} dias.</p>
          {sessao && !dados ? null : <Acoes codigo={dados?.codigo ?? null} grande />}
        </div>
        <Tesouro comemora={(dados?.confirmados ?? 0) > 0} chuva={chuva} aoChover={chover} />
      </section>

      <Conta />

      {!sessao && <section data-poleiro="" className="folha ind-folha ind-folha--bilhete">
        <h2>Entre para pegar o seu link</h2>
        <p className="texto-2">O link é pessoal: é por ele que o site sabe quem convidou quem. Criar a conta é grátis e leva um toque.</p>
        <BotaoGoogle separador={false} />
        <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
      </section>}

      {sessao && !carregado && <p className="texto-2" role="status">Preparando o seu link…</p>}
      {sessao && carregado && !dados && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o seu link agora. Recarregue a página em instantes.</p>}

      {dados && <div className="ind-grade">
        <section data-poleiro="" className="folha ind-folha ind-folha--bilhete" aria-labelledby="ind-link-titulo">
          <h2 id="ind-link-titulo">Seu link dourado</h2>
          <p className="texto-2 ind-nota">É só mandar. A mensagem já vai escrita, e o seu amigo cai direto no convite.</p>
          <div className="ind-link"><code>{link}</code></div>
          <Acoes codigo={dados.codigo} />
          <details className="ind-previa">
            <summary>Ver a mensagem que vai junto</summary>
            <p>{textoIndicacao(dados.codigo)}</p>
          </details>
          {dados.fui_convidado && !dados.minha_confirmada && <p className="texto-2 ind-nota">Você entrou por convite: ao chegar a {QUESTOES_PARA_CONFIRMAR} questões respondidas, os seus {DIAS_POR_AMIGO} dias são liberados.</p>}
        </section>

        <section data-poleiro="" className="folha ind-folha ind-folha--ouro" aria-labelledby="ind-placar-titulo">
          <h2 id="ind-placar-titulo">Seu tesouro</h2>
          <div className="ind-cofre">
            <span className="ind-cofre__rotulo">Dias ganhos</span>
            <strong className="ind-cofre__numero"><Contador ate={dados.dias_ganhos} /></strong>
            <span className="ind-cofre__sub">de plano completo, por indicação</span>
          </div>
          <dl className="ind-placar">
            <div><dt>Entraram</dt><dd>{dados.convidados}</dd></div>
            <div><dt>Confirmados</dt><dd>{dados.confirmados}</dd></div>
          </dl>
          <div className="ind-limite">
            <span className="ind-moedas" role="img" aria-label={`${dados.confirmados} de ${dados.limite} amigos que dão dias`}>
              {Array.from({ length: dados.limite }, (_, i) => <i key={i} className={i < dados.confirmados ? 'ind-moedas--cheia' : ''} style={{ '--d': `${i * 60}ms` } as CSSProperties} />)}
            </span>
            <small>{faltam > 0 ? <>Ainda cabem <strong>{faltam} {faltam === 1 ? 'moeda' : 'moedas'}</strong> no seu monte: mais {faltam * DIAS_POR_AMIGO} dias esperando.</> : 'Monte cheio: você chegou ao máximo de amigos. Obrigado por espalhar o site.'}</small>
          </div>
          {ativoAte && <p className="ind-ate"><Icone nome="certo" tamanho={14} /> Plano completo liberado até {ativoAte}.</p>}
        </section>
      </div>}

      {dados && amigos && <section data-poleiro="" className="folha ind-folha" aria-labelledby="ind-amigos-titulo">
        <h2 id="ind-amigos-titulo">Seus amigos</h2>
        <Amigos amigos={amigos} />
      </section>}

      <Beneficios />

      <section data-poleiro="" className="folha ind-folha" aria-labelledby="ind-como-titulo">
        <h2 id="ind-como-titulo">Como funciona</h2>
        <Regras />
      </section>

      <RegrasDeUso />

      <section data-poleiro="" className="ind-fecho" aria-labelledby="ind-fecho-titulo">
        <div>
          <h2 id="ind-fecho-titulo">O grupo da residência está a um toque.</h2>
          <p>Uma mensagem, {QUESTOES_PARA_CONFIRMAR} questões do seu colega, {DIAS_POR_AMIGO} dias para cada um. O dragão guarda o ouro até lá.</p>
        </div>
        <Acoes codigo={dados?.codigo ?? null} />
      </section>
    </div>
  )
}

/** #/convite/CODIGO: quem recebeu o link vê quem convidou, o que ganha e cria a conta. */
export function ConviteRecebido({ codigo }: { codigo: string }) {
  const { sessao } = usarConta()
  const [quem, definirQuem] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    guardarConviteRecebido(codigo)
    let ativo = true
    void previaConvite(codigo).then((nome) => { if (ativo) definirQuem(nome) })
    return () => { ativo = false }
  }, [codigo])

  const raiz = useRef<HTMLDivElement>(null)
  const [chuva, definirChuva] = useState(0)
  const chover = () => definirChuva((n) => n + 1)

  return (
    <div className="ind" ref={raiz}>
      <Margens />
      <DragaoViajante raiz={raiz} aoSoprar={chover} />
      <section data-poleiro="" className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Você recebeu um convite</p>
          <h1 id="ind-titulo">{quem ? <>{quem} te chamou para <em>treinar junto</em></> : quem === null ? 'Convite não encontrado' : <>Um colega te chamou para <em>treinar junto</em></>}</h1>
          <p>{quem === null
            ? 'Este link de convite não existe ou foi digitado errado. Você ainda pode criar sua conta grátis e treinar normalmente.'
            : `Questões das provas oficiais (TEOT, TARO e outras), comentadas alternativa por alternativa. Crie sua conta grátis e responda ${QUESTOES_PARA_CONFIRMAR} questões: vocês dois ganham ${DIAS_POR_AMIGO} dias do plano completo.`}</p>
        </div>
        <Tesouro comemora={false} chuva={chuva} aoChover={chover} />
      </section>
      {sessao
        ? <section data-poleiro="" className="folha ind-folha ind-folha--bilhete">
            <h2>Você já está na sua conta</h2>
            <p className="texto-2">O convite vale para contas criadas nos últimos 7 dias. Se a sua for nova, ele já foi aplicado: é só treinar.</p>
            <a className="botao botao--principal" href={href('/treinar')}>Começar a treinar</a>
          </section>
        : <section data-poleiro="" className="folha ind-folha ind-folha--bilhete">
            <h2>Crie sua conta grátis</h2>
            <BotaoGoogle separador={false} />
            <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
            <p className="meta">Já tem conta? <a href={href('/conta')}>Entrar</a>. O convite vale para contas criadas a partir dele.</p>
          </section>}
      {quem !== null && <Beneficios convidado />}
      <section data-poleiro="" className="folha ind-folha">
        <h2>Como funciona</h2>
        <Regras />
      </section>
      <RegrasDeUso />
    </div>
  )
}
