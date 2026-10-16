import { forwardRef, memo } from 'react'
import { recurso } from '../../config'
import { ASSADOS, type MetaAssada } from '../efeitos/assados'
import { caixaDoCorpo, pintarPersonagem, POSES, TAMANHO, type Personagem } from '../efeitos/personagens'
import { RECOMPENSAS, type TipoPoder, type TipoReliquia } from '../motor/poderes'
import { usarDica, type ConteudoDica } from './Dica'
import { Sprite } from './Sprite'

/** Folhas de sprite já montadas (uma imagem por personagem e variante), reaproveitadas entre telas. */
const folhas = new Map<string, { poses: string; clarao: string }>()
function folhaDe(quem: Personagem, variante?: string) {
  const chave = quem + '|' + (variante ?? '')
  let f = folhas.get(chave)
  if (!f) {
    const [w, h] = TAMANHO[quem]
    const folha = document.createElement('canvas'); folha.width = w * POSES.length; folha.height = h
    const c = folha.getContext('2d')!
    const quadro = document.createElement('canvas')
    POSES.forEach((pose, k) => { pintarPersonagem(quadro, quem, pose, variante); c.drawImage(quadro, k * w, 0) })
    // silhueta branca da pose de dano (o clarão do golpe)
    pintarPersonagem(quadro, quem, 'dano', variante)
    const g = quadro.getContext('2d')!; g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h)
    f = { poses: folha.toDataURL(), clarao: quadro.toDataURL() }
    folhas.set(chave, f)
  }
  return f
}

/**
 * Sprite assado (scripts/sprites/: modelado em volume e convertido em pixel
 * art), quando existe para o personagem; senão, o desenho antigo em código.
 * O herói usa a folha do estágio; as variantes de cor dos adversários usam a
 * folha <arquétipo>-<variante> quando ela existe (golem, guardião, serpente).
 */
function assadoDe(quem: Personagem, variante?: string): { nome: string; meta: MetaAssada } | null {
  // variantes de cor dos adversários (Etapa 8) têm folha própria, <arquétipo>-<variante>; sem ela, o desenho antigo
  const nome = quem === 'heroi' ? (variante ?? 'heroi-1') : variante ? `${quem}-${variante}` : quem
  const meta = nome ? ASSADOS[nome] : undefined
  return meta ? { nome, meta } : null
}

/**
 * Quanto a folha assada cresce em relação à escala pedida (que foi pensada para
 * o desenho antigo): mantém a altura do corpo antigo, um pouco maior para dar
 * presença, arredondada a quartos de pixel para os pixels ficarem regulares.
 */
const CRESCE: Partial<Record<Personagem, number>> = { heroi: 1.65, dragao: 1.5, guardiao: 1.17, golem: 1.3, serpente: 1.4, aranha: 0.9 }
function escalaAssada(quem: Personagem, escala: number, meta: MetaAssada) {
  const [, , , hAntigo] = caixaDoCorpo(quem)
  // o herói cresce de verdade a cada estágio (scripts/sprites/heroi.py): a referência é sempre o
  // corpo do aprendiz, para a lenda adulta aparecer mais alta na tela, e não encolhida ao mesmo tamanho
  const ref = quem === 'heroi' ? (ASSADOS['heroi-1']?.caixa[3] ?? meta.caixa[3]) : meta.caixa[3]
  const alvo = (escala * hAntigo * (CRESCE[quem] ?? 1.15)) / ref
  return Math.max(0.5, Math.round(alvo * 4) / 4)
}

/** Folhas já pedidas ao navegador (pré-carregamento: o sprite não "pisca" vazio ao entrar). */
const pedidas = new Set<string>()
/** Começa a baixar a folha assada do personagem (e o clarão branco) antes de ele aparecer. */
export function precarregarAtor(quem: Personagem, variante?: string) {
  const a = assadoDe(quem, variante)
  if (!a || typeof Image === 'undefined') return
  for (const arquivo of [a.nome, a.nome + '-branco']) {
    if (pedidas.has(arquivo)) continue
    pedidas.add(arquivo)
    const img = new Image()
    img.decoding = 'async'
    img.src = recurso(`flashcards/sprites/${arquivo}.png`)
  }
}

const QuadrosAssados = memo(function QuadrosAssados({ nome, meta, escala, dx, dy }: { nome: string; meta: MetaAssada; escala: number; dx: number; dy: number }) {
  const w = meta.largura * escala, h = meta.altura * escala
  const [x, y] = meta.caixa
  const vars: Record<string, string | number> = { width: w, height: h, left: dx - x * escala, top: dy - y * escala, ['--w']: w + 'px', ['--h']: h + 'px' }
  for (const [anim, a] of Object.entries(meta.animacoes)) {
    vars['--l-' + anim] = a.linha
    vars['--n-' + anim] = a.quadros
    vars['--d-' + anim] = a.quadros * a.ms + 'ms'
  }
  const tam = `${meta.colunas * w}px ${Object.keys(meta.animacoes).length * h}px`
  return (
    <span className="fc-ator__quadros fc-ator__quadros--assado" style={vars as React.CSSProperties}>
      <span className="fc-ator__folha fc-ator__folha--assada" style={{ backgroundImage: `url(${recurso(`flashcards/sprites/${nome}.png`)})`, backgroundSize: tam }} />
      <span className="fc-ator__clarao fc-ator__folha--assada" style={{ backgroundImage: `url(${recurso(`flashcards/sprites/${nome}-branco.png`)})`, backgroundSize: tam }} />
    </span>
  )
})

/**
 * Sprite em pixel art: todas as poses numa folha só (uma imagem), e a pose é
 * escolhida pela posição do fundo. Antes eram 7 canvases empilhados por
 * personagem, cada um uma camada de composição; a folha única deixa o
 * celular bem mais leve. Parado alterna com "respira"; as outras poses
 * aparecem quando o diretor de efeitos põe `data-pose` no ator.
 */
const Quadros = memo(function Quadros({ quem, escala, variante }: { quem: Personagem; escala: number; variante?: string }) {
  const [w, h] = TAMANHO[quem]
  const [x, y] = caixaDoCorpo(quem)
  const f = folhaDe(quem, variante)
  const estilo = { width: w * escala, height: h * escala }
  return (
    <span className="fc-ator__quadros" style={{ ...estilo, left: -x * escala, top: -y * escala }}>
      <span className="fc-ator__folha" style={{ ...estilo, backgroundImage: `url(${f.poses})`, backgroundSize: `${w * POSES.length * escala}px ${h * escala}px` }} />
      <span className="fc-ator__clarao" style={{ ...estilo, backgroundImage: `url(${f.clarao})`, backgroundSize: `${w * escala}px ${h * escala}px` }} />
    </span>
  )
})

interface AtorProps {
  quem: Personagem
  escala: number
  classe?: string
  chefe?: boolean
  /** Troca de paleta (variante do adversário ou estágio do herói). */
  variante?: string
  /**
   * A folha assada é maior que a caixa do desenho antigo e transborda dela. Com
   * `contido`, o ator ganha margens do tamanho do transbordo: o corpo não sai pela
   * borda da tela (o Golem de Gesso ficava cortado à esquerda no celular) nem
   * entra por baixo do cabeçalho (a cabeça sumia atrás das abas no computador).
   */
  contido?: boolean
  children?: React.ReactNode
}

/**
 * Personagem em cena: sprite no chão, com sombra, luz de recorte e aura.
 * As animações (dano, ataque, bloqueio, derrota) entram por classes no
 * elemento `.fc-ator__corpo`; as poses, por `data-pose` no próprio ator.
 */
export const Ator = forwardRef<HTMLDivElement, AtorProps>(function Ator({ quem, escala, classe, chefe, variante, contido, children }, ref) {
  const assado = assadoDe(quem, variante)
  const ea = assado ? escalaAssada(quem, escala, assado.meta) : escala
  // o ator ocupa no layout o mesmo espaço do desenho antigo; a folha assada, maior,
  // cresce para cima e para os lados a partir dos pés, sem empurrar a mesa
  const [, , w, h] = caixaDoCorpo(quem)
  const dx = assado ? (w * escala - assado.meta.caixa[2] * ea) / 2 : 0
  // um terço do que cresceu desce sobre a borda da mesa (o adversário pisa na beira da arena)
  // o herói fica de pé sobre a mesma linha em todos os estágios: cresce só para cima
  const dy = assado ? (h * escala - assado.meta.caixa[3] * ea) * (quem === 'heroi' ? 1 : 0.66) : 0
  // transbordo do corpo visível para os lados e para cima (só a folha assada transborda)
  const lado = contido && dx < 0 ? Math.ceil(-dx) : 0
  const acima = contido && dy < 0 ? Math.ceil(-dy) : 0
  const caixa: React.CSSProperties = { width: w * escala, height: h * escala }
  // o CSS pode encolher o transbordo da direita no celular (a placa do adversário passa por cima da asa)
  if (lado) { caixa.marginLeft = lado; caixa.marginRight = lado; (caixa as Record<string, unknown>)['--ator-lado'] = lado + 'px' }
  if (acima) caixa.marginTop = acima
  return (
    <div ref={ref} className={`fc-ator fc-ator--${quem}${assado ? ' fc-ator--assado' : ''}${chefe ? ' fc-ator--chefe' : ''}${classe ? ' ' + classe : ''}`} style={caixa}>
      <span className="fc-ator__aura" aria-hidden="true" />
      <span className="fc-ator__sombra" aria-hidden="true" />
      <div className="fc-ator__corpo" aria-hidden="true">{assado ? <QuadrosAssados nome={assado.nome} meta={assado.meta} escala={ea} dx={dx} dy={dy} /> : <Quadros quem={quem} escala={escala} variante={variante} />}</div>
      {children}
    </div>
  )
})

/**
 * Número curto para a barra de vida (16/10/2026): até 9.999 fica inteiro, sem ponto (1472, 2280);
 * daí em diante, em milhares ("12,4 mil"). O valor exato segue no aria-valuenow.
 */
export function numeroCompacto(n: number) {
  const v = Math.round(n)
  if (Math.abs(v) < 10000) return String(v)
  const mil = v / 1000
  return `${(Math.abs(mil) < 100 ? Math.floor(mil * 10) / 10 : Math.floor(mil)).toLocaleString('pt-BR')} mil`
}

/** Barra de vida com moldura, faixa de dano residual e número legível. */
export function BarraVida({ atual, maximo, tipo, rotulo }: { atual: number; maximo: number; tipo: 'inimigo' | 'heroi' | 'chefe'; rotulo: string }) {
  const pct = Math.max(0, Math.min(100, (100 * atual) / maximo))
  const baixa = tipo === 'heroi' && pct <= 25
  return (
    <div className={`fc-vida fc-vida--${tipo}${baixa ? ' fc-vida--baixa' : ''}`} role="meter" aria-label={rotulo} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={atual}>
      <span className="fc-vida__trilho">
        <s style={{ width: pct + '%' }} />
        <i style={{ width: pct + '%' }} />
        <em aria-hidden="true" />
      </span>
      <b>{numeroCompacto(atual)}<small>/{numeroCompacto(maximo)}</small></b>
    </div>
  )
}

const NOME_RARIDADE = { comum: 'Comum', incomum: 'Incomum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' } as const

/**
 * Encaixe de poder: vazio elegante, ícone grande e cargas, com a dica do jogo
 * (nome, efeito, cargas e se dá para usar agora). No computador, o clique usa e
 * o mouse mostra a dica; no toque, o primeiro toque mostra a dica com "Usar".
 * O botão nunca fica `disabled`: um botão desabilitado engole o toque e a dica
 * não abriria; quando não dá para usar, ele avisa por quê.
 */
export function Encaixe({ tipo, carga, extra, usavel, aoUsar, motivo }: { tipo?: TipoPoder; carga?: number; extra?: number; usavel?: boolean; aoUsar?: () => void; motivo?: string }) {
  const d = tipo ? RECOMPENSAS[tipo] : null
  const cargas = carga ?? 0
  const conteudo: ConteudoDica | null = d ? {
    titulo: d.nome, selo: `Poder ${d.ativo ? 'de usar' : 'automático'} · ${NOME_RARIDADE[d.raridade]}`, texto: d.texto, detalhe: d.detalhe, icone: d.icone, cor: d.cor,
    estado: [cargas > 0 ? `${cargas} carga${cargas > 1 ? 's' : ''}` : '', extra !== undefined ? `faltam ${extra} acerto${extra === 1 ? '' : 's'}` : '',
      d.ativo ? (usavel ? 'pronto para usar' : motivo ?? 'use antes de responder') : 'dispara sozinho na hora certa'].filter(Boolean).join(' · '),
    acao: usavel && aoUsar ? { rotulo: 'Usar agora', aoUsar } : undefined,
  } : null
  const dica = usarDica(conteudo)
  if (!tipo || !d) return <span className="fc-encaixe fc-encaixe--vazio" aria-label="Encaixe vazio"><span aria-hidden="true" /></span>
  return (
    <>
      <button type="button" {...dica.ouvintes} className={`fc-encaixe${usavel ? ' fc-encaixe--usavel' : ' fc-encaixe--espera'}`} style={{ ['--cor' as string]: d.cor }}
        aria-disabled={!usavel || undefined}
        onClick={() => { if (dica.toqueAbre()) return; if (usavel) { dica.fechar(); aoUsar?.() } }}
        aria-label={`${d.nome}${cargas > 1 ? `, ${cargas} cargas` : ''}${usavel ? ', toque para usar' : ''}`}>
        <Sprite nome={d.icone} className="fc-sprite--icone" />
        {cargas > 1 && <b>{cargas}</b>}
        {extra !== undefined && <b>{extra}</b>}
      </button>
      {dica.balao}
    </>
  )
}

/** Relíquia equipada, com a mesma dica dos poderes (passar o mouse ou tocar). */
export function Reliquia({ tipo, copias }: { tipo: TipoReliquia; copias: number }) {
  const d = RECOMPENSAS[tipo]
  const dica = usarDica({ titulo: d.nome, selo: `Relíquia · ${NOME_RARIDADE[d.raridade]}`, texto: d.texto, detalhe: d.detalhe, icone: d.icone, cor: d.cor, estado: copias > 1 ? `${copias} cópias · vale a partida toda` : 'vale a partida toda' })
  return (
    <>
      <button type="button" {...dica.ouvintes} className="fc-reliquia" style={{ ['--cor' as string]: d.cor }} onClick={() => { if (!dica.toqueAbre()) dica.alternar() }} aria-label={`Relíquia ${d.nome}${copias > 1 ? ` ×${copias}` : ''}: ${d.texto}`}>
        <Sprite nome={d.icone} className="fc-sprite--icone" />{copias > 1 && <b>{copias}</b>}
      </button>
      {dica.balao}
    </>
  )
}

/** No celular não cabe uma pedra por relíquia: um selo com a contagem abre a lista inteira. */
export function ReliquiasCompactas({ lista }: { lista: TipoReliquia[] }) {
  const unicas = [...new Set(lista)]
  const dica = usarDica(unicas.length ? {
    titulo: unicas.length === 1 ? '1 relíquia' : `${unicas.length} relíquias`, selo: 'Valem a partida toda', texto: 'Bônus que você ganhou nas recompensas.', cor: '#e9b955',
    extra: (
      <ul className="fc-dica-jogo__lista">
        {unicas.map((r) => {
          const d = RECOMPENSAS[r], n = lista.filter((x) => x === r).length
          return <li key={r} style={{ ['--cor' as string]: d.cor }}><span className="fc-dica-jogo__mini" aria-hidden="true"><Sprite nome={d.icone} /></span><span><strong>{d.nome}{n > 1 ? ` ×${n}` : ''}</strong><small>{d.texto}</small></span></li>
        })}
      </ul>
    ),
  } : null)
  if (!unicas.length) return null
  return (
    <>
      <button type="button" {...dica.ouvintes} className="fc-reliquias-selo" onClick={() => { if (!dica.toqueAbre()) dica.alternar() }} aria-label={`${unicas.length} relíquias: ver a lista`}>
        <Sprite nome={RECOMPENSAS[unicas[unicas.length - 1]].icone} className="fc-sprite--icone" /><b>{lista.length}</b>
      </button>
      {dica.balao}
    </>
  )
}
