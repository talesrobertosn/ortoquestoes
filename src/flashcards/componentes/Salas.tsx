import { useCallback, useEffect, useRef, useState } from 'react'
import { tocar } from '../efeitos/sons'
import type { Personagem } from '../efeitos/personagens'
import { andarDeChefe, CURA_LOJA, type ItemLoja, type OfertaSabio, type OpcaoSala, type Partida, type Porta } from '../motor/regras'
import { inimigoDoAndar } from '../motor/bestiario'
import { PATRONOS, RECOMPENSAS } from '../motor/poderes'
import { Ator } from './Hud'
import { Sprite } from './Sprite'

/**
 * Portas da Cripta, refeitas em 14/10/2026 (pedido do Tales: "difícil de entender o que é e para
 * que serve cada porta"). Cada porta tem identidade própria (arco, cor, placa e o que se vê lá dentro
 * ao entreabrir) e uma ficha clara: ANTES (há luta? contra quem?) e DEPOIS (o que você ganha).
 */
interface InfoPorta { nome: string; depois: string; explica: string; icone: string; cor: string; vista: string }

const PORTA_INFO: Record<string, InfoPorta> = {
  misto: { nome: 'Surpresa', depois: 'Um prêmio ao acaso', explica: 'Pode ser um poder, uma relíquia ou um evento.', icone: 'brasao', cor: '#e3b04b', vista: 'surpresa' },
  poder: { nome: 'Poder', depois: 'Escolha 1 de 3 poderes', explica: 'Poder é uma habilidade que você usa na batalha.', icone: 'espada', cor: '#b07cff', vista: 'runas' },
  reliquia: { nome: 'Relíquia', depois: 'Escolha 1 de 3 relíquias', explica: 'Relíquia é um bônus que vale a partida toda.', icone: 'amuleto', cor: '#ffcf5a', vista: 'altar' },
  cura: { nome: 'Cura', depois: 'Recupere vida', explica: 'Vida, corações e um descanso na fogueira.', icone: 'coracao2', cor: '#ff6a7a', vista: 'fogueira' },
  ouro: { nome: 'Tesouro', depois: 'Ganhe moedas', explica: 'Moedas compram itens com a Caixeira.', icone: 'moeda', cor: '#ffd24a', vista: 'moedas' },
  loja: { nome: 'Caixeira do Arsenal', depois: 'Compre com suas moedas', explica: 'Poderes, relíquias e poção de cura.', icone: 'bolsa', cor: '#5fdc7a', vista: 'loja' },
  sabio: { nome: 'Velho Preceptor', depois: 'Uma ajuda grátis', explica: 'Ele oferece um conselho à sua escolha.', icone: 'lanterna', cor: '#a8d8ff', vista: 'lanterna' },
  chefe: { nome: 'Chefe', depois: 'Prêmio de chefe', explica: 'Vencer o guardião abre o próximo trecho.', icone: 'coroa', cor: '#ff5a3c', vista: 'chefe' },
  ferreiro: { nome: 'Mestre Ferreiro', depois: 'Reforce um poder', explica: 'Troque moedas por equipamento melhor.', icone: 'bigorna', cor: '#ff9a4a', vista: 'forja' },
  curandeira: { nome: 'Irmã do Calo Ósseo', depois: 'Cura e uma lição', explica: 'Recupere vida e ganhe uma dica.', icone: 'frasco', cor: '#ff8ab0', vista: 'fogueira' },
  bau: { nome: 'Baú esquecido', depois: 'Tesouro... ou armadilha', explica: 'Arrisque: pode valer muito.', icone: 'bolsa', cor: '#e8b85a', vista: 'moedas' },
  secreta: { nome: 'Parede rachada', depois: 'Sala secreta', explica: 'Uma sala que quase ninguém acha.', icone: 'porta', cor: '#c9a0ff', vista: 'runas' },
  evento: { nome: 'Encontro', depois: 'Algo no caminho', explica: 'Um encontro com escolhas.', icone: 'lanterna', cor: '#9ad8ff', vista: 'lanterna' },
}

function infoDaPorta(p: Porta): InfoPorta {
  if (p.tipo === 'loja' || p.tipo === 'sabio') return PORTA_INFO[p.tipo]
  if (p.tipo === 'sala') return PORTA_INFO[p.sala]
  if (p.tipo === 'chefe') return PORTA_INFO.chefe
  if (p.recompensa === 'bencao' && p.patrono) {
    const pat = PATRONOS[p.patrono]
    return { nome: pat.nome, depois: 'Bênção: escolha 1 de 3', explica: pat.estilo, icone: pat.icone, cor: pat.cor, vista: 'bencao' }
  }
  return PORTA_INFO[p.recompensa]
}

export function Portas({ partida, aoEntrar, rapido }: { partida: Partida; aoEntrar: (k: number) => void; rapido: boolean }) {
  const [aberta, definirAberta] = useState<number | null>(null)
  const [foco, definirFoco] = useState<number | null>(null)
  const proximo = partida.andar + 1
  const chefe = andarDeChefe(proximo, partida.modo)
  const adversario = inimigoDoAndar(proximo, partida.sementeBase, partida.modo).inimigo
  const vidaBaixa = partida.vida <= partida.vidaMax * 0.45
  const vivo = useRef(true)
  useEffect(() => { vivo.current = true; return () => { vivo.current = false } }, [])
  const entrar = useCallback((k: number) => {
    if (aberta !== null) return
    definirAberta(k)
    tocar('porta')
    window.setTimeout(() => {
      if (!vivo.current) return
      aoEntrar(k)
      // se a porta não abriu (a encruzilhada continua na tela), as portas voltam a responder
      window.setTimeout(() => { if (vivo.current) definirAberta(null) }, 1200)
    }, rapido ? 220 : 700)
  }, [aberta, aoEntrar, rapido])
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { const k = Number(e.key); if (k >= 1 && k <= partida.portas.length) entrar(k - 1) }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [entrar, partida.portas.length])
  return (
    <div className={`fc-veu fc-veu--portas${aberta !== null ? ' fc-veu--abrindo' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fc-portas-titulo">
      <div className="fc-encruzilhada">
        <header className="fc-encruzilhada__cabeca">
          <span className="fc-encruzilhada__andar">Andar {proximo}{partida.modo === 'torre' ? ' de 100' : ''}</span>
          <h2 id="fc-portas-titulo">{chefe ? 'O guardião espera' : 'Encruzilhada'}</h2>
          <p>{chefe
            ? <>Atrás da porta vermelha está <b>{adversario.nome}</b>. Vencer o chefe rende um prêmio maior.</>
            : <>Escolha o caminho. Nas portas com <b>luta</b>, você enfrenta <b>{adversario.nome}</b> e ganha o prêmio da porta ao vencer. As outras são paradas sem luta.</>}</p>
        </header>
        <div className="fc-portais">
          {partida.portas.map((p, k) => {
            const info = infoDaPorta(p)
            const luta = p.tipo === 'combate' || p.tipo === 'chefe'
            const dica = (p.tipo === 'combate' && p.recompensa === 'cura' && vidaBaixa) || (p.tipo === 'sala' && p.sala === 'curandeira' && vidaBaixa)
              ? 'Vida baixa: boa escolha'
              : p.tipo === 'loja' ? `Você tem ${partida.ouro} moedas`
              : null
            const estado = aberta === k ? ' fc-portal--aberta' : aberta !== null ? ' fc-portal--recua' : foco === k ? ' fc-portal--foco' : ''
            return (
              <button key={k} type="button" className={`fc-portal fc-portal--${p.tipo} fc-portal--vista-${info.vista}${estado}`}
                style={{ ['--cor' as string]: info.cor, ['--i' as string]: k }}
                onClick={() => entrar(k)} onPointerEnter={() => { tocar('hover'); definirFoco(k) }} onPointerLeave={() => definirFoco(null)}
                onFocus={() => definirFoco(k)} onBlur={() => definirFoco(null)} autoFocus={k === 0} disabled={aberta !== null && aberta !== k}
                aria-label={`${info.nome}. ${luta ? `Luta contra ${adversario.nome}` : 'Sem luta'}. Depois: ${info.depois}. ${info.explica}`}>
                <span className="fc-portal__placa" aria-hidden="true"><Sprite nome={info.icone} /></span>
                <span className="fc-portal__arco" aria-hidden="true">
                  <span className="fc-portal__vista"><i /><i /><i /><i /><i /></span>
                  <span className="fc-portal__folha fc-portal__folha--e" />
                  <span className="fc-portal__folha fc-portal__folha--d" />
                  <span className="fc-portal__brilho" />
                  <span className="fc-portal__degrau" />
                </span>
                <span className="fc-portal__ficha">
                  <strong>{info.nome}</strong>
                  <span className={`fc-portal__antes${luta ? ' fc-portal__antes--luta' : ''}`}>
                    <em>Antes</em>{luta ? <>Luta contra {adversario.nome}</> : 'Sem luta'}
                  </span>
                  <span className="fc-portal__depois"><em>Depois</em>{info.depois}</span>
                  <small>{info.explica}</small>
                  {dica && <span className="fc-portal__dica">{dica}</span>}
                </span>
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

/**
 * Sala de evento (Etapa 6): ferreiro, curandeira, baú, sala secreta ou um
 * encontro no caminho. Mesmo desenho do Velho Preceptor; cada opção mostra o
 * custo (moedas ou vida) e fica apagada quando não dá para pagar.
 */
export function SalaEvento({ partida, aoEscolher }: { partida: Partida; aoEscolher: (k: number) => void }) {
  const sala = partida.sala
  useEffect(() => { tocar(sala?.tipo === 'secreta' ? 'lendario' : sala?.tipo === 'ferreiro' ? 'compra-loja' : sala?.tipo === 'bau' ? 'moedas' : 'ajuda') }, [sala?.tipo])
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { const k = Number(e.key); if (sala && k >= 1 && k <= sala.opcoes.length && pode(sala.opcoes[k - 1])) aoEscolher(k - 1) }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  })
  if (!sala) return null
  const pode = (o: OpcaoSala) => (!o.custoOuro || partida.ouro >= o.custoOuro) && (!o.precisaPoder || partida.encaixes.length > 0)
  const info = PORTA_INFO[sala.tipo]
  return (
    <div className="fc-veu fc-veu--sala" role="dialog" aria-modal="true" aria-labelledby="fc-sala-titulo">
      <div className={`fc-sala fc-sala--evento fc-sala--${sala.tipo}`} style={{ ['--cor' as string]: info.cor }}>
        <div className="fc-sala__npc fc-sala__npc--icone" aria-hidden="true"><span className="fc-sala__emblema"><Sprite nome={sala.icone} /></span></div>
        <div className="fc-sala__conteudo">
          <h2 id="fc-sala-titulo">{sala.titulo}</h2>
          <Fala texto={sala.fala} />
          <p className="fc-sala__ouro"><Sprite nome="moeda" className="fc-sprite--icone" /> <b>{partida.ouro}</b> moedas · <Sprite nome="coracao" className="fc-sprite--icone" /> <b>{partida.vida}</b>/{partida.vidaMax}</p>
          <div className="fc-ofertas">
            {sala.opcoes.map((o, k) => {
              const ok = pode(o)
              return (
                <button key={k} type="button" className="fc-oferta" style={{ ['--cor' as string]: info.cor }} onClick={() => ok && aoEscolher(k)} disabled={!ok} autoFocus={k === 0}>
                  <span className="fc-loja__icone"><Sprite nome={o.icone} /></span>
                  <span>
                    <strong>{o.rotulo}</strong>
                    <small>{o.detalhe}{!ok && o.precisaPoder && !partida.encaixes.length ? ' (precisa de um poder equipado)' : ''}</small>
                    {(o.custoOuro || o.custoVida) && <em className="fc-oferta__custo">{o.custoOuro ? <><Sprite nome="moeda" className="fc-sprite--icone" />{o.custoOuro}</> : `−${Math.round((o.custoVida ?? 0) * 100)}% de vida`}</em>}
                  </span>
                  <span className="fc-recompensa__tecla" aria-hidden="true">{k + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
