import { useEffect, useState } from 'react'
import { Icone } from '../../componentes/Icone'

type Destaque = 'esquerdo' | 'rodinha' | 'direito' | 'clique' | 'duplo' | 'teclado'
type Gesto = 'um-dedo' | 'pinca' | 'dois-dedos' | 'toque' | 'toque-duplo'
interface Passo { titulo: string; texto: string; mouse?: Destaque; dedo?: Gesto; movimento?: 'arrastar' | 'girar-roda' | 'nenhum' }

const PASSOS_MOUSE: Passo[] = [
  { titulo: 'Girar o modelo', texto: 'Segure o botão esquerdo e arraste. O esqueleto gira em volta do ponto que está no centro da tela.', mouse: 'esquerdo', movimento: 'arrastar' },
  { titulo: 'Aproximar e afastar', texto: 'Role a rodinha para frente para chegar perto do osso, e para trás para ver o conjunto.', mouse: 'rodinha', movimento: 'girar-roda' },
  { titulo: 'Mover para os lados', texto: 'Segure o botão direito e arraste para deslizar o modelo pela tela (ou Shift com o botão esquerdo).', mouse: 'direito', movimento: 'arrastar' },
  { titulo: 'Abrir a ficha', texto: 'Clique num osso: ele fica verde e a ficha abre com as classificações e as questões. Clique de novo no mesmo ponto para pegar a estrutura que está por baixo.', mouse: 'clique', movimento: 'nenhum' },
  { titulo: 'Focar na estrutura', texto: 'Dê um duplo clique na estrutura selecionada e a câmera vai até ela.', mouse: 'duplo', movimento: 'nenhum' },
  { titulo: 'Atalhos do teclado', texto: 'F foca · I isola · H esconde · 1 a 6 trocam a vista (frente, costas, lados, cima, baixo) · Esc limpa a seleção.', mouse: 'teclado', movimento: 'nenhum' },
]
const PASSOS_TOQUE: Passo[] = [
  { titulo: 'Girar o modelo', texto: 'Arraste com um dedo para girar o esqueleto.', dedo: 'um-dedo' },
  { titulo: 'Aproximar e afastar', texto: 'Afaste dois dedos para chegar perto do osso; junte os dedos para ver o conjunto.', dedo: 'pinca' },
  { titulo: 'Mover para os lados', texto: 'Arraste com dois dedos juntos para deslizar o modelo pela tela.', dedo: 'dois-dedos' },
  { titulo: 'Abrir a ficha', texto: 'Toque num osso: ele fica verde e a ficha sobe embaixo, com as classificações e as questões. Puxe a alça para ver mais.', dedo: 'toque' },
  { titulo: 'Focar na estrutura', texto: 'Toque duas vezes na estrutura selecionada e a câmera vai até ela.', dedo: 'toque-duplo' },
]

/** O mouse desenhado em traço, com o botão do gesto aceso. */
function Mouse({ destaque, movimento }: { destaque: Destaque; movimento: Passo['movimento'] }) {
  if (destaque === 'teclado') return (
    <svg viewBox="0 0 160 110" className="gc-desenho" aria-hidden="true">
      {['F', 'I', 'H', '1', '2', 'Esc'].map((t, i) => {
        const x = 14 + (i % 3) * 46, y = 14 + Math.floor(i / 3) * 46
        return <g key={t} className={`gc-tecla gc-tecla--${i}`}><rect x={x} y={y} width="40" height="38" rx="4" /><text x={x + 20} y={y + 25}>{t}</text></g>
      })}
    </svg>
  )
  const aceso = (b: 'esquerdo' | 'direito' | 'rodinha') =>
    destaque === b || (b === 'esquerdo' && (destaque === 'clique' || destaque === 'duplo')) ? ' gc-aceso' : ''
  return (
    <svg viewBox="0 0 160 110" className={`gc-desenho gc-mov--${movimento}${destaque === 'duplo' ? ' gc-duplo' : destaque === 'clique' ? ' gc-clique' : ''}`} aria-hidden="true">
      <g className="gc-mouse">
        <path className="gc-corpo" d="M80 14c-20 0-30 14-30 34v22c0 18 12 30 30 30s30-12 30-30V48c0-20-10-34-30-34z" />
        <path className={'gc-botao' + aceso('esquerdo')} d="M78 16c-17 1-26 13-26 32v4h26z" />
        <path className={'gc-botao' + aceso('direito')} d="M82 16c17 1 26 13 26 32v4H82z" />
        <rect className={'gc-roda' + aceso('rodinha')} x="76" y="26" width="8" height="16" rx="4" />
      </g>
      {movimento === 'arrastar' && <g className="gc-setas"><path d="M22 58h-12m0 0 5-5m-5 5 5 5" /><path d="M138 58h12m0 0-5-5m5 5-5 5" /></g>}
      {movimento === 'girar-roda' && <g className="gc-setas gc-setas--roda"><path d="M80 6v-4m0 0-3 3m3-3 3 3" /></g>}
      {(destaque === 'clique' || destaque === 'duplo') && <g className="gc-ondas"><circle cx="64" cy="30" r="10" /><circle cx="64" cy="30" r="17" /></g>}
    </svg>
  )
}

/** Dedos (círculos) e o caminho que fazem, para o celular. */
function Dedos({ gesto }: { gesto: Gesto }) {
  return (
    <svg viewBox="0 0 160 110" className={`gc-desenho gc-dedo--${gesto}`} aria-hidden="true">
      <rect className="gc-tela" x="45" y="8" width="70" height="94" rx="10" />
      {gesto === 'pinca'
        ? <><circle className="gc-ponta gc-ponta--a" cx="72" cy="55" r="8" /><circle className="gc-ponta gc-ponta--b" cx="88" cy="55" r="8" /></>
        : gesto === 'dois-dedos'
          ? <><circle className="gc-ponta gc-ponta--par" cx="72" cy="55" r="8" /><circle className="gc-ponta gc-ponta--par" cx="90" cy="55" r="8" /></>
          : <circle className="gc-ponta" cx="80" cy="55" r="8" />}
      {(gesto === 'toque' || gesto === 'toque-duplo') && <g className="gc-ondas"><circle cx="80" cy="55" r="13" /><circle cx="80" cy="55" r="20" /></g>}
    </svg>
  )
}

/** Tutorial curto dos controles: abre na primeira visita e pelo botão "?" do topo. */
export function GuiaControles({ toque, aoFechar }: { toque: boolean; aoFechar: () => void }) {
  const passos = toque ? PASSOS_TOQUE : PASSOS_MOUSE
  const [i, definirI] = useState(0)
  const p = passos[i]
  const ultimo = i === passos.length - 1
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') definirI((n) => Math.min(passos.length - 1, n + 1))
      else if (e.key === 'ArrowLeft') definirI((n) => Math.max(0, n - 1))
      else if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [passos.length, aoFechar])
  return (
    <div className="gc" role="dialog" aria-modal="true" aria-labelledby="gc-titulo">
      <div className="gc__cartao">
        <button type="button" className="at-convite__fechar" onClick={aoFechar} aria-label="Pular o tutorial"><Icone nome="fechar" tamanho={18} /></button>
        <p className="tr-heroi__selo">{toque ? 'Como usar com os dedos' : 'Como usar com o mouse'} · {i + 1}/{passos.length}</p>
        <div className="gc__palco" key={i}>{p.mouse ? <Mouse destaque={p.mouse} movimento={p.movimento} /> : <Dedos gesto={p.dedo!} />}</div>
        <h2 id="gc-titulo">{p.titulo}</h2>
        <p className="gc__texto">{p.texto}</p>
        <div className="gc__pontos" aria-hidden="true">{passos.map((_, n) => <span key={n} className={n === i ? 'gc__ponto gc__ponto--atual' : 'gc__ponto'} />)}</div>
        <div className="gc__acoes">
          <button type="button" className="botao" disabled={i === 0} onClick={() => definirI(i - 1)}><Icone nome="esquerda" tamanho={16} /> Voltar</button>
          {ultimo
            ? <button type="button" className="at-ouro at-ouro--curto" onClick={aoFechar}>Começar a explorar</button>
            : <button type="button" className="at-ouro at-ouro--curto" onClick={() => definirI(i + 1)}>Próximo <Icone nome="direita" tamanho={16} /></button>}
        </div>
      </div>
    </div>
  )
}
