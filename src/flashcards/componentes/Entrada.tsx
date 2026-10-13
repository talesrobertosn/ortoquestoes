import { useEffect, useMemo, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { FLASHCARDS_RANKING } from '../../config'
import { href, navegar } from '../../util/rotas'
import { sairDoJogo } from '../fundo'
import { configurarSom, destravar, instalarDestrave, tocar, tocarAmbiente, tocarMusica } from '../efeitos/sons'
import type { Personagem } from '../efeitos/personagens'
import { ALTAR_VAZIO, TALENTOS, comprarTalento, custoDoProximo, nivelDe, type EstadoAltar } from '../motor/altar'
import { BESTIARIO, TORRE } from '../motor/bestiario'
import { migrarPartida, NIVEIS, nivelDaPartida, type NivelJogo } from '../motor/regras'
import {
  BESTIARIO_VAZIO, CHAVE_AJUSTES, CHAVE_ALTAR, CHAVE_SOM_ESCOLHIDO, CHAVE_BESTIARIO, CHAVE_NIVEL, CHAVE_PARTIDA, CHAVE_PARTIDA_TORRE, CHAVE_PATAMAR, CHAVE_RECORDES, CHAVE_REGISTROS,
  flashcardsUnicos, RECORDES_VAZIOS, type Bestiario, type Recordes,
} from '../progresso'
import { Cenario } from './Cenario'
import { Ator } from './Hud'
import { ModalJogo } from './ModalJogo'
import { Sprite } from './Sprite'

/**
 * Entrada da Cripta do Residente: o portão da masmorra dos flashcards.
 * Daqui a pessoa escolhe o modo (Cripta sem fim, Torre do Título de 100
 * andares, Biblioteca de estudo), gasta cristais no Altar do Saber e vê o
 * Bestiário. O ranking fica pronto atrás de uma trava (config.ts).
 */
export function Entrada() {
  const [painel, definirPainel] = useState<'altar' | 'bestiario' | null>(null)
  const [altar, definirAltar] = useState<EstadoAltar>(() => ({ ...ALTAR_VAZIO, ...ler<Partial<EstadoAltar>>(CHAVE_ALTAR, {}) }))
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  const unicos = useMemo(() => flashcardsUnicos(ler<Record<string, unknown>>(CHAVE_REGISTROS, {})), [])
  const cripta = useMemo(() => migrarPartida(ler<unknown>(CHAVE_PARTIDA, null)), [])
  const torre = useMemo(() => migrarPartida(ler<unknown>(CHAVE_PARTIDA_TORRE, null)), [])
  const patamar = useMemo(() => migrarPartida(ler<unknown>(CHAVE_PATAMAR, null)), [])
  const bestiario = useMemo(() => ({ ...BESTIARIO_VAZIO, ...ler<Partial<Bestiario>>(CHAVE_BESTIARIO, {}) }), [])
  const criptaViva = cripta && cripta.fase !== 'fim' ? cripta : null
  const torreViva = torre && torre.fase !== 'fim' ? torre : null
  const andarTorre = torreViva?.andar ?? (patamar ? patamar.andar : 0)
  const [nivel, definirNivelBruto] = useState<NivelJogo>(() => { const n = ler<string>(CHAVE_NIVEL, 'normal'); return n in NIVEIS ? (n as NivelJogo) : 'normal' })
  const definirNivel = (n: NivelJogo) => { gravar(CHAVE_NIVEL, n); definirNivelBruto(n); tocar('selecao') }
  /** Partida em andamento continua na dificuldade em que começou. */
  const emAndamento = (p: { nivel?: NivelJogo } | null) => (p ? ` · ${NIVEIS[nivelDaPartida(p)].nome}` : '')

  useEffect(() => {
    const a = ler<{ som?: boolean; volEfeitos?: number; volAmbiente?: number; volMusica?: number }>(CHAVE_AJUSTES, {})
    configurarSom({ ligado: a.som ?? true, efeitos: a.volEfeitos ?? 0.85, ambiente: a.volAmbiente ?? 0.35, musica: a.volMusica ?? 0.45 })
    tocarMusica('entrada'); tocarAmbiente('masmorra')
    // destrave por gesto e pausa por visibilidade, instalados uma vez para o jogo todo (sons.ts)
    instalarDestrave()
  }, [])

  // primeira entrada: a pessoa escolhe com ou sem som (o toque no botão já destrava o áudio no celular)
  const [escolherSom, definirEscolherSom] = useState(() => !ler<boolean>(CHAVE_SOM_ESCOLHIDO, false))
  const escolher = (comSom: boolean) => {
    const a = ler<Record<string, unknown>>(CHAVE_AJUSTES, {})
    gravar(CHAVE_AJUSTES, { ...a, versao: 3, som: comSom })
    configurarSom({ ligado: comSom, efeitos: (a.volEfeitos as number) ?? 0.85, ambiente: (a.volAmbiente as number) ?? 0.35, musica: (a.volMusica as number) ?? 0.45 })
    if (comSom) { destravar(); tocar('confirmar') }
    gravar(CHAVE_SOM_ESCOLHIDO, true)
    definirEscolherSom(false)
  }

  const ir = (rota: string) => { tocar('porta'); window.setTimeout(() => navegar(rota), 160) }
  const comprar = (id: (typeof TALENTOS)[number]['id']) => {
    const novo = comprarTalento(altar, id)
    if (novo === altar) return
    gravar(CHAVE_ALTAR, novo); definirAltar(novo); tocar('evolucao')
  }

  return (
    <ModalJogo titulo="Cripta do Residente" aoPedirFechar={() => { tocarMusica(null); tocarAmbiente(null); sairDoJogo() }}>
      <div className="fc-arena fc-entrada">
        <Cenario cena="covil" reduzido={false} clima="noite" />
        <div className="fc-entrada__miolo">
          <header className="fc-entrada__cabeca">
            <span className="fc-entrada__selo">Masmorra dos flashcards</span>
            <h1>Cripta do <em>Residente</em></h1>
            <p>Flashcards das provas reais viram combate. Acerte para golpear, erre e o adversário revida: cada erro volta para a sua revisão.</p>
          </header>

          <div className="fc-entrada__palco" aria-hidden="true">
            <Ator quem="sabio" escala={2.2} classe="fc-ator--npc" />
            <Ator quem="heroi" escala={2.6} variante={rec.chefesDerrotados >= 10 ? 'heroi-5' : rec.chefesDerrotados >= 5 ? 'heroi-4' : rec.chefesDerrotados >= 2 ? 'heroi-3' : rec.chefesDerrotados >= 1 ? 'heroi-2' : undefined} classe="fc-ator--heroi" />
            <Ator quem="caixeira" escala={2.2} classe="fc-ator--npc" />
          </div>

          <div className="fc-niveis" role="radiogroup" aria-label="Dificuldade das partidas novas">
            {(Object.keys(NIVEIS) as NivelJogo[]).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={nivel === n} className={`fc-nivel fc-nivel--${n}${nivel === n ? ' fc-nivel--ativo' : ''}`} onClick={() => definirNivel(n)} onPointerEnter={() => tocar('hover')}>
                <strong>{NIVEIS[n].nome}</strong>
                <small>{NIVEIS[n].resumo}</small>
              </button>
            ))}
            <p className="fc-niveis__nota" aria-live="polite">{NIVEIS[nivel].resumo}</p>
          </div>

          <div className="fc-modos">
            <button type="button" className="fc-modo fc-modo--cripta" onClick={() => ir('/flashcards/cripta')} onPointerEnter={() => tocar('hover')}>
              <span className="fc-modo__icone"><Sprite nome="porta" /></span>
              <strong>Cripta do Residente</strong>
              <small>Desça o quanto aguentar. A cada 3 andares, um chefe; a cada passo, portas que mostram a recompensa.</small>
              <span className="fc-modo__dados">{rec.andarMaximo ? <>Recorde: <b>andar {rec.andarMaximo}</b></> : 'Sem recorde ainda'}</span>
              <span className="fc-modo__acao">{criptaViva ? `Continuar no andar ${criptaViva.andar}${emAndamento(criptaViva)}` : `Descer · ${NIVEIS[nivel].nome}`}</span>
            </button>
            <button type="button" className="fc-modo fc-modo--torre" onClick={() => ir('/flashcards/torre')} onPointerEnter={() => tocar('hover')}>
              <span className="fc-modo__icone"><Sprite nome="muralha" /></span>
              <strong>Torre do Título</strong>
              <small>100 andares, cada um mais difícil. Patamar a cada 5: se cair, volta de lá. No topo, o Dragão Ancestral.</small>
              <span className="fc-escalada fc-escalada--grande" role="meter" aria-label={`Recorde da Torre: andar ${rec.torreMaximo ?? 0} de ${TORRE.andares}`} aria-valuemin={0} aria-valuemax={TORRE.andares} aria-valuenow={rec.torreMaximo ?? 0}><i style={{ width: `${rec.torreMaximo ?? 0}%` }} /></span>
              <span className="fc-modo__dados">Recorde: <b>{rec.torreMaximo ?? 0}/{TORRE.andares}</b>{rec.torreConcluida ? ` · topo ×${rec.torreConcluida}` : ''}</span>
              <span className="fc-modo__acao">{torreViva ? `Continuar no andar ${torreViva.andar}${emAndamento(torreViva)}` : andarTorre > 1 ? `Voltar ao patamar ${andarTorre - 1}${emAndamento(patamar)}` : `Começar a subida · ${NIVEIS[nivel].nome}`}</span>
            </button>
            <button type="button" className="fc-modo fc-modo--biblioteca" onClick={() => ir('/flashcards/biblioteca')} onPointerEnter={() => tocar('hover')}>
              <span className="fc-modo__icone"><Sprite nome="livro" /></span>
              <strong>Biblioteca</strong>
              <small>Estudo calmo, por área, sem combate. Os que te derrubaram aparecem primeiro.</small>
              <span className="fc-modo__dados"><b>{unicos.toLocaleString('pt-BR')}</b> flashcards únicos respondidos</span>
              <span className="fc-modo__acao">Estudar</span>
            </button>
          </div>

          <div className="fc-entrada__extras">
            <button type="button" className="fc-extra" onClick={() => { tocar('selecao'); definirPainel('altar') }}><Sprite nome="estrela" className="fc-sprite--icone" /><span><strong>Altar do Saber</strong><small>{altar.cristais} cristais</small></span></button>
            <button type="button" className="fc-extra" onClick={() => { tocar('selecao'); definirPainel('bestiario') }}><Sprite nome="pergaminho" className="fc-sprite--icone" /><span><strong>Bestiário</strong><small>{bestiario.vistos.length} de {BESTIARIO.length} descobertos</small></span></button>
            {FLASHCARDS_RANKING && <a className="fc-extra" href={href('/ranking?aba=flashcards')} onClick={() => tocar('selecao')}><Sprite nome="coroa" className="fc-sprite--icone" /><span><strong>Ranking</strong><small>Cripta: Normal e Difícil</small></span></a>}
          </div>
        </div>

        {escolherSom && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-som-titulo">
            <div className="fc-janela fc-som-escolha">
              <h2 id="fc-som-titulo">Como você quer entrar?</h2>
              <p className="fc-janela__sub">A Cripta tem trilha e efeitos próprios. Dá para mudar depois no botão de som, no alto da tela.</p>
              <div className="fc-janela__botoes">
                <button type="button" className="fc-botao" onClick={() => escolher(true)} autoFocus>Entrar com som</button>
                <button type="button" className="fc-botao fc-botao--secundario" onClick={() => escolher(false)}>Entrar sem som</button>
              </div>
              <p className="fc-janela__nota">No iPhone, confira o volume do aparelho.</p>
            </div>
          </div>
        )}
        {painel === 'altar' && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-altar-titulo" onClick={() => definirPainel(null)}>
            <div className="fc-janela fc-janela--larga fc-altar" onClick={(e) => e.stopPropagation()}>
              <h2 id="fc-altar-titulo">Altar do Saber</h2>
              <p className="fc-janela__sub">Cada acerto rende cristais de conhecimento (o difícil vale o dobro; o brilhante, o dobro de novo). Talentos permanentes, pequenos de propósito: quem vence é quem sabe.</p>
              <p className="fc-sala__ouro"><Sprite nome="estrela" className="fc-sprite--icone" /> <b>{altar.cristais}</b> cristais · {altar.ganhos} ganhos no total</p>
              <ul className="fc-talentos">
                {TALENTOS.map((t) => {
                  const n = nivelDe(altar, t.id), custo = custoDoProximo(altar, t)
                  return (
                    <li key={t.id} className="fc-talento">
                      <span className="fc-loja__icone"><Sprite nome={t.icone} /></span>
                      <span className="fc-talento__texto"><strong>{t.nome}</strong><small>{t.texto(Math.max(1, n))}</small>
                        <span className="fc-talento__niveis" aria-label={`Nível ${n} de ${t.custos.length}`}>{t.custos.map((_, k) => <i key={k} className={k < n ? 'aceso' : ''} />)}</span>
                      </span>
                      <button type="button" className="fc-botao fc-loja__preco" disabled={custo === null || altar.cristais < custo} onClick={() => comprar(t.id)}>{custo === null ? 'Máximo' : <><Sprite nome="estrela" className="fc-sprite--icone" />{custo}</>}</button>
                    </li>
                  )
                })}
              </ul>
              <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={() => definirPainel(null)} autoFocus>Fechar</button></div>
            </div>
          </div>
        )}

        {painel === 'bestiario' && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-best-titulo" onClick={() => definirPainel(null)}>
            <div className="fc-janela fc-janela--larga fc-bestiario" onClick={(e) => e.stopPropagation()}>
              <h2 id="fc-best-titulo">Bestiário</h2>
              <p className="fc-janela__sub">{bestiario.vencidos.length} vencidos · {bestiario.vistos.length} de {BESTIARIO.length} descobertos</p>
              <ul className="fc-bestas">
                {BESTIARIO.map((i) => {
                  const visto = bestiario.vistos.includes(i.id), vencido = bestiario.vencidos.includes(i.id)
                  return (
                    <li key={i.id} className={`fc-besta${visto ? '' : ' fc-besta--oculta'}${vencido ? ' fc-besta--vencida' : ''}`}>
                      <span className="fc-besta__retrato"><Ator quem={i.sprite as Personagem} variante={i.variante} escala={i.sprite === 'dragao' || i.sprite === 'guardiao' ? 0.7 : i.sprite === 'golem' ? 0.85 : 1} chefe={i.chefe} /></span>
                      <span className="fc-besta__texto">
                        <strong>{visto ? i.nome : '???'}</strong>
                        <small>{{ comum: 'Comum', elite: 'Elite', chefe: 'Chefe' }[i.nivel]}{visto ? ` · ${i.lema}` : ''}</small>
                        {visto && <small className="fc-besta__hab">{i.habilidade}</small>}
                      </span>
                      {vencido && <em className="fc-selo fc-selo--elite">Vencido</em>}
                    </li>
                  )
                })}
              </ul>
              <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={() => definirPainel(null)}>Fechar</button></div>
            </div>
          </div>
        )}
      </div>
    </ModalJogo>
  )
}
