import { useCallback, useEffect, useState } from 'react'
import { tocar } from '../efeitos/sons'
import type { Personagem } from '../efeitos/personagens'
import { andarDeChefe, CURA_LOJA, type ItemLoja, type OfertaSabio, type Partida, type Porta } from '../motor/regras'
import { inimigoDoAndar } from '../motor/bestiario'
import { PATRONOS, RECOMPENSAS } from '../motor/poderes'
import { Ator } from './Hud'
import { Sprite } from './Sprite'

/**
 * Salas entre os andares (inspiração: as portas do Hades). Cada porta mostra
 * o que vem depois do próximo confronto; algumas levam à Caixeira do Arsenal
 * ou ao Velho Preceptor.
 */

const PORTA_INFO: Record<string, { nome: string; texto: string; icone: string; cor: string }> = {
  misto: { nome: 'Recompensa', texto: 'Um poder, uma relíquia ou um evento', icone: 'brasao', cor: '#e3b04b' },
  poder: { nome: 'Poder', texto: 'Três poderes para os encaixes', icone: 'espada', cor: '#b07cff' },
  reliquia: { nome: 'Relíquia', texto: 'Três relíquias que duram a partida', icone: 'amuleto', cor: '#ffcf5a' },
  cura: { nome: 'Cura', texto: 'Vida, corações e fogueira', icone: 'coracao2', cor: '#ff6a7a' },
  ouro: { nome: 'Tesouro', texto: 'Moedas para a Caixeira', icone: 'moeda', cor: '#ffd24a' },
  loja: { nome: 'Caixeira do Arsenal', texto: 'Compre com suas moedas', icone: 'bolsa', cor: '#5fdc7a' },
  sabio: { nome: 'Velho Preceptor', texto: 'Um conselho de quem já passou por aqui', icone: 'lanterna', cor: '#a8d8ff' },
  chefe: { nome: 'Chefe', texto: 'O guardião deste andar', icone: 'coroa', cor: '#ff5a3c' },
}

function infoDaPorta(p: Porta) {
  if (p.tipo === 'loja' || p.tipo === 'sabio') return PORTA_INFO[p.tipo]
  if (p.tipo === 'chefe') return PORTA_INFO.chefe
  if (p.recompensa === 'bencao' && p.patrono) {
    const pat = PATRONOS[p.patrono]
    return { nome: pat.nome, texto: `Bênção: ${pat.titulo.toLowerCase()}`, icone: pat.icone, cor: pat.cor }
  }
  return PORTA_INFO[p.recompensa]
}

export function Portas({ partida, aoEntrar, rapido }: { partida: Partida; aoEntrar: (k: number) => void; rapido: boolean }) {
  const [aberta, definirAberta] = useState<number | null>(null)
  const proximo = partida.andar + 1
  const chefe = andarDeChefe(proximo, partida.modo)
  const adversario = inimigoDoAndar(proximo, partida.sementeBase, partida.modo).inimigo
  const entrar = useCallback((k: number) => {
    if (aberta !== null) return
    definirAberta(k)
    tocar('porta')
    window.setTimeout(() => aoEntrar(k), rapido ? 220 : 620)
  }, [aberta, aoEntrar, rapido])
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { const k = Number(e.key); if (k >= 1 && k <= partida.portas.length) entrar(k - 1) }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [entrar, partida.portas.length])
  return (
    <div className={`fc-veu fc-veu--portas${aberta !== null ? ' fc-veu--abrindo' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fc-portas-titulo">
      <div className="fc-corredor">
        <header className="fc-corredor__cabeca">
          <h2 id="fc-portas-titulo">{chefe ? 'A porta do chefe' : 'Escolha a porta'}</h2>
          <p>Andar {proximo}{partida.modo === 'torre' ? ' de 100' : ''}{chefe ? ` · ${adversario.nome}` : ' · o símbolo mostra a recompensa depois da luta'}</p>
        </header>
        <div className="fc-portas">
          {partida.portas.map((p, k) => {
            const info = infoDaPorta(p)
            return (
              <button key={k} type="button" className={`fc-porta fc-porta--${p.tipo}${aberta === k ? ' fc-porta--aberta' : aberta !== null ? ' fc-porta--recua' : ''}`} style={{ ['--cor' as string]: info.cor, ['--i' as string]: k }}
                onClick={() => entrar(k)} onPointerEnter={() => tocar('hover')} autoFocus={k === 0} disabled={aberta !== null && aberta !== k}>
                <span className="fc-porta__arco" aria-hidden="true"><span className="fc-porta__folha fc-porta__folha--e" /><span className="fc-porta__folha fc-porta__folha--d" /><span className="fc-porta__luz" /></span>
                <span className="fc-porta__selo"><Sprite nome={info.icone} /></span>
                <strong>{info.nome}</strong>
                <small>{info.texto}</small>
                <span className="fc-recompensa__tecla" aria-hidden="true">{k + 1}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Fala com efeito de máquina de escrever (pula para o fim ao tocar). */
function Fala({ texto }: { texto: string }) {
  const [n, definirN] = useState(0)
  useEffect(() => {
    definirN(0)
    const t = window.setInterval(() => definirN((v) => { if (v >= texto.length) { window.clearInterval(t); return v } return v + 2 }), 18)
    return () => window.clearInterval(t)
  }, [texto])
  return <p className="fc-fala" onClick={() => definirN(texto.length)}>{texto.slice(0, n)}<span aria-hidden="true" className="fc-fala__cursor" /></p>
}

const FALAS_CAIXEIRA = [
  'Bem-vindo ao Arsenal! Tudo esterilizado, quase tudo afiado.',
  'Placas, parafusos e poções. Paga com moeda, não com plantão.',
  'Dizem que o dragão guarda as moedas de quem não estudou. Eu guardo as minhas aqui.',
]
const FALAS_SABIO = [
  'Já passei por estes andares quando eram só corredores. Aceite um conselho.',
  'Quem revisa os erros sobe mais rápido. Escolha uma ajuda, colega.',
  'A matéria não se vence de uma vez: se vence todo dia. Tome isto.',
]

export function Loja({ partida, aoComprar, aoSair }: { partida: Partida; aoComprar: (k: number) => void; aoSair: () => void }) {
  const fala = FALAS_CAIXEIRA[partida.andar % FALAS_CAIXEIRA.length]
  useEffect(() => { tocar('sino') }, [])
  return (
    <div className="fc-veu fc-veu--sala" role="dialog" aria-modal="true" aria-labelledby="fc-loja-titulo">
      <div className="fc-sala fc-sala--loja">
        <div className="fc-sala__npc"><Ator quem="caixeira" escala={3} classe="fc-ator--npc" /></div>
        <div className="fc-sala__conteudo">
          <h2 id="fc-loja-titulo">Caixeira do Arsenal</h2>
          <Fala texto={fala} />
          <p className="fc-sala__ouro"><Sprite nome="moeda" className="fc-sprite--icone" /> <b>{partida.ouro}</b> moedas</p>
          <ul className="fc-loja">
            {partida.loja.map((it, k) => <ItemDaLoja key={k} item={it} partida={partida} aoComprar={() => aoComprar(k)} />)}
          </ul>
          <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={aoSair} autoFocus>Seguir para o próximo andar</button></div>
        </div>
      </div>
    </div>
  )
}

function ItemDaLoja({ item, partida, aoComprar }: { item: ItemLoja; partida: Partida; aoComprar: () => void }) {
  const cura = item.item === 'cura'
  const d = cura ? null : RECOMPENSAS[item.item as keyof typeof RECOMPENSAS]
  const nome = cura ? 'Poção de bancada' : d!.nome
  const texto = cura ? `Recupera ${Math.round(CURA_LOJA.fracao * 100)}% da vida máxima agora.` : d!.texto
  const pode = !item.vendido && partida.ouro >= item.preco && (!cura || partida.vida < partida.vidaMax)
  return (
    <li className={`fc-loja__item${item.vendido ? ' fc-loja__item--vendido' : ''}${d ? ` fc-loja__item--${d.raridade}` : ''}`} style={{ ['--cor' as string]: cura ? '#ff7a5c' : d!.cor }}>
      <span className="fc-loja__icone"><Sprite nome={cura ? 'pocao' : d!.icone} /></span>
      <span className="fc-loja__texto"><strong>{nome}</strong><small>{texto}</small>{d?.patrono && <em>{PATRONOS[d.patrono].nome}</em>}</span>
      <button type="button" className="fc-botao fc-loja__preco" disabled={!pode} onClick={() => { tocar('compra-loja'); aoComprar() }} aria-label={item.vendido ? `${nome}: vendido` : `Comprar ${nome} por ${item.preco} moedas`}>
        {item.vendido ? 'Vendido' : <><Sprite nome="moeda" className="fc-sprite--icone" />{item.preco}</>}
      </button>
    </li>
  )
}

function textoOferta(o: OfertaSabio) {
  if (o.tipo === 'cura') return { nome: 'Descanso guiado', texto: `Recupera ${o.valor} de vida.`, icone: 'fogueira', cor: '#ff9a4a' }
  if (o.tipo === 'reliquia') { const d = RECOMPENSAS[o.recompensa]; return { nome: d.nome, texto: d.texto, icone: d.icone, cor: d.cor } }
  if (o.tipo === 'cristais') return { nome: 'Lição antiga', texto: `+${o.valor} cristais de conhecimento para o Altar.`, icone: 'livro', cor: '#a8d8ff' }
  return { nome: 'Bolsa esquecida', texto: `+${o.valor} moedas.`, icone: 'moeda', cor: '#ffd24a' }
}

export function Sabio({ partida, aoAceitar }: { partida: Partida; aoAceitar: (k: number) => void }) {
  const fala = FALAS_SABIO[partida.andar % FALAS_SABIO.length]
  useEffect(() => { tocar('ajuda') }, [])
  return (
    <div className="fc-veu fc-veu--sala" role="dialog" aria-modal="true" aria-labelledby="fc-sabio-titulo">
      <div className="fc-sala fc-sala--sabio">
        <div className="fc-sala__npc"><Ator quem="sabio" escala={3} classe="fc-ator--npc" /></div>
        <div className="fc-sala__conteudo">
          <h2 id="fc-sabio-titulo">O Velho Preceptor</h2>
          <Fala texto={fala} />
          <div className="fc-ofertas">
            {partida.sabio.map((o, k) => {
              const t = textoOferta(o)
              return (
                <button key={k} type="button" className="fc-oferta" style={{ ['--cor' as string]: t.cor }} onClick={() => aoAceitar(k)} autoFocus={k === 0}>
                  <span className="fc-loja__icone"><Sprite nome={t.icone} /></span>
                  <span><strong>{t.nome}</strong><small>{t.texto}</small></span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** O Velho Preceptor aparece no canto da arena, ajuda e vai embora. */
export function AjudaDoPreceptor({ cura }: { cura: number }) {
  return (
    <div className="fc-ajuda" role="status">
      <div className="fc-ajuda__npc"><Ator quem="sabio" escala={2} classe="fc-ator--npc fc-ator--ajuda" /></div>
      <div className="fc-ajuda__balao"><strong>Calma, colega!</strong><small>O Velho Preceptor cura {cura} e te dá um Escudo arcano.</small></div>
    </div>
  )
}

/** Cartaz do chefe (no estilo dos jogos de ação): nome enorme e o título por baixo. */
export function TituloChefe({ nome, lema, quem, variante }: { nome: string; lema: string; quem: Personagem; variante?: string }) {
  return (
    <div className="fc-titulo-chefe" aria-hidden="true">
      <span className="fc-titulo-chefe__faixa" />
      <span className="fc-titulo-chefe__silhueta"><Ator quem={quem} variante={variante} escala={2} chefe /></span>
      <strong>{nome}</strong>
      <em>{lema}</em>
    </div>
  )
}
