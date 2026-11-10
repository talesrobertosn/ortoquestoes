import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
 * A Câmara do Tesouro (10/11/2026, pedidos do Tales: "tom de ouro, como se a pessoa estivesse ganhando muito" e
 * "faltou o dragão, que vai ser um novo mascote"): o cenário HD-2D de scripts/gerar_cena_tesouro.py com o dragão
 * vermelho (scripts/gerar_dragao.py) dono do monte. Ele chega voando, pousa no ouro e, sem ninguém mexer, dorme.
 * Um toque: acorda, solta fogo e fala; de vez em quando ruge. Os outros três bichos ficam em volta, cada um com as
 * suas falas; a espada no alto solta uma chuva de moedas.
 */
function Tesouro({ comemora }: { comemora: boolean }) {
  const [fala, definirFala] = useState<{ quem: Quem; texto: string } | null>(null)
  const [chuva, definirChuva] = useState(0)
  const [dragao, definirDragao] = useState<IdLinhaDragao | 'longe'>('longe')
  const [chegando, definirChegando] = useState(false)
  const voltas = useRef<Record<Quem, number>>({ esqueleto: 0, gato: 0, coruja: 0, dragao: 0 })
  const toquesGato = useRef<number[]>([])
  const relogios = useRef<number[]>([])
  const sono = useRef(0)
  const depois = (f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }
  const dormirDaquiAPouco = () => { window.clearTimeout(sono.current); sono.current = window.setTimeout(() => definirDragao((d) => (d === 'parado' ? 'dormindo' : d)), 16000) }
  useEffect(() => {
    if (semMovimento()) { definirDragao('parado'); return }
    depois(() => { definirDragao('voando'); definirChegando(true) }, 350)
    depois(() => { definirDragao('pousando'); definirChegando(false) }, 350 + 1500)
    depois(() => { definirDragao('parado'); dormirDaquiAPouco() }, 350 + 1500 + DURACAO_DRAGAO.pousando * 1000)
    const todos = relogios.current
    return () => { todos.forEach((t) => window.clearTimeout(t)); window.clearTimeout(sono.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 6500); return () => window.clearTimeout(t) }, [fala])

  const falar = (quem: Quem) => {
    if (quem === 'gato') {
      const agora = Date.now()
      toquesGato.current = [...toquesGato.current.filter((t) => agora - t < 5000), agora]
      if (toquesGato.current.length >= 3) {
        toquesGato.current = []
        guardarNoAlbum('gato-recrutador')
        definirChuva((n) => n + 1)
        definirFala({ quem, texto: 'Está bem, eu indico alguém. Indiquei a almofada. Ela é ótima ouvinte.' })
        return
      }
    }
    const lista = FALAS_INDICAR[quem]
    definirFala({ quem, texto: lista[voltas.current[quem]++ % lista.length] })
  }
  const tocarDragao = () => {
    if (dragao === 'longe' || dragao === 'voando' || dragao === 'pousando' || dragao === 'fogo' || dragao === 'rugindo') return
    guardarNoAlbum('dragao-fogo')
    // Um toque em cada três é um rugido; os outros, fogo (com as moedas pulando do monte).
    const gesto: IdLinhaDragao = voltas.current.dragao % 3 === 2 ? 'rugindo' : 'fogo'
    falar('dragao')
    if (semMovimento()) return
    definirDragao(gesto)
    if (gesto === 'fogo') depois(() => definirChuva((n) => n + 1), 350)
    depois(() => { definirDragao('parado'); dormirDaquiAPouco() }, DURACAO_DRAGAO[gesto] * 1000 + 250)
  }
  const tocarEspada = () => {
    guardarNoAlbum('tesouro-espada')
    definirChuva((n) => n + 1)
    definirFala({ quem: 'esqueleto', texto: 'Conhecimento vale ouro. E amigo que estuda junto vale mais ainda.' })
  }
  return (
    <div className={dragao === 'fogo' ? 'ind-cena ind-cena--fogo' : 'ind-cena'}>
      <div className="ind-cena__arte" style={{ '--arte': urlCss('pixel/paginas/tesouro.webp'), '--arte-960': urlCss('pixel/paginas/tesouro-960.webp') } as CSSProperties}>
        <span className="ind-cena__cintila" aria-hidden="true">{[[62, 58], [70, 47], [77, 61], [84, 52], [91, 70], [58, 74], [73, 78], [88, 83], [66, 88], [81, 40]].map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--d': `${i * 0.41}s` } as CSSProperties} />)}</span>
        <button type="button" className="ind-espada" onClick={tocarEspada} aria-label="Tocar na espada no alto do tesouro" />
        {dragao !== 'longe' && (
          <button type="button" className={chegando ? 'ind-dragao ind-dragao--chegando' : 'ind-dragao'} onClick={tocarDragao} aria-label="O dragão do tesouro: tocar para ele soltar fogo">
            <DragaoPixel estado={dragao} />
          </button>
        )}
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
    <section className="ind-vitrine" aria-labelledby="ind-vitrine-titulo">
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
    <ul className="ind-conta" aria-label="Quanto você ganha">
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

  return (
    <div className="ind">
      <Margens />
      <section className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Indique e ganhe</p>
          <h1 id="ind-titulo">Chame um amigo. Vocês dois ganham <em>{DIAS_POR_AMIGO} dias de tudo.</em></h1>
          <p>Ele entra pelo seu link e responde {QUESTOES_PARA_CONFIRMAR} questões. Pronto: {DIAS_POR_AMIGO} dias de plano completo para ele e {DIAS_POR_AMIGO} para você. Com {LIMITE_AMIGOS} amigos, são {LIMITE_AMIGOS * DIAS_POR_AMIGO} dias.</p>
          {sessao && !dados ? null : <Acoes codigo={dados?.codigo ?? null} grande />}
        </div>
        <Tesouro comemora={(dados?.confirmados ?? 0) > 0} />
      </section>

      <Conta />

      {!sessao && <section className="folha ind-folha ind-folha--bilhete">
        <h2>Entre para pegar o seu link</h2>
        <p className="texto-2">O link é pessoal: é por ele que o site sabe quem convidou quem. Criar a conta é grátis e leva um toque.</p>
        <BotaoGoogle separador={false} />
        <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
      </section>}

      {sessao && !carregado && <p className="texto-2" role="status">Preparando o seu link…</p>}
      {sessao && carregado && !dados && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o seu link agora. Recarregue a página em instantes.</p>}

      {dados && <div className="ind-grade">
        <section className="folha ind-folha ind-folha--bilhete" aria-labelledby="ind-link-titulo">
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

        <section className="folha ind-folha ind-folha--ouro" aria-labelledby="ind-placar-titulo">
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

      {dados && amigos && <section className="folha ind-folha" aria-labelledby="ind-amigos-titulo">
        <h2 id="ind-amigos-titulo">Seus amigos</h2>
        <Amigos amigos={amigos} />
      </section>}

      <Beneficios />

      <section className="folha ind-folha" aria-labelledby="ind-como-titulo">
        <h2 id="ind-como-titulo">Como funciona</h2>
        <Regras />
        <p className="meta">Os dias entram depois de uma assinatura paga que esteja ativa, então nada se perde. Contas novas só podem usar um convite, e indicações para si mesmo não contam.</p>
      </section>

      <section className="ind-fecho" aria-labelledby="ind-fecho-titulo">
        <DragaoPixel estado="dormindo" className="ind-fecho__dragao" />
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

  return (
    <div className="ind">
      <Margens />
      <section className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Você recebeu um convite</p>
          <h1 id="ind-titulo">{quem ? <>{quem} te chamou para <em>treinar junto</em></> : quem === null ? 'Convite não encontrado' : <>Um colega te chamou para <em>treinar junto</em></>}</h1>
          <p>{quem === null
            ? 'Este link de convite não existe ou foi digitado errado. Você ainda pode criar sua conta grátis e treinar normalmente.'
            : `Questões das provas oficiais (TEOT, TARO e outras), comentadas alternativa por alternativa. Crie sua conta grátis e responda ${QUESTOES_PARA_CONFIRMAR} questões: vocês dois ganham ${DIAS_POR_AMIGO} dias do plano completo.`}</p>
        </div>
        <Tesouro comemora={false} />
      </section>
      {sessao
        ? <section className="folha ind-folha ind-folha--bilhete">
            <h2>Você já está na sua conta</h2>
            <p className="texto-2">O convite vale para contas criadas nos últimos 7 dias. Se a sua for nova, ele já foi aplicado: é só treinar.</p>
            <a className="botao botao--principal" href={href('/treinar')}>Começar a treinar</a>
          </section>
        : <section className="folha ind-folha ind-folha--bilhete">
            <h2>Crie sua conta grátis</h2>
            <BotaoGoogle separador={false} />
            <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
            <p className="meta">Já tem conta? <a href={href('/conta')}>Entrar</a>. O convite vale para contas criadas a partir dele.</p>
          </section>}
      {quem !== null && <Beneficios convidado />}
      <section className="folha ind-folha">
        <h2>Como funciona</h2>
        <Regras />
      </section>
    </div>
  )
}
