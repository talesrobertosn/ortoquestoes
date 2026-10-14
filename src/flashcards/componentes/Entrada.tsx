import { Volume } from './Volume'
import { useEffect, useMemo, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { FLASHCARDS_RANKING } from '../../config'
import { href, navegar } from '../../util/rotas'
import { configurarSom, volumeDaSessao, destravar, instalarDestrave, tocar, tocarAmbiente, tocarMusica } from '../efeitos/sons'
import type { Personagem } from '../efeitos/personagens'
import { ALTAR_VAZIO, TALENTOS, comprarTalento, custoDoProximo, nivelDe, type EstadoAltar } from '../motor/altar'
import { BESTIARIO } from '../motor/bestiario'
import { migrarPartida } from '../motor/regras'
import {
  BESTIARIO_VAZIO, CHAVE_AJUSTES, CHAVE_ALTAR, CHAVE_SOM_ESCOLHIDO, CHAVE_BESTIARIO, CHAVE_PARTIDA, CHAVE_RECORDES, CHAVE_REGISTROS,
  flashcardsUnicos, RECORDES_VAZIOS, type Bestiario, type Recordes,
} from '../progresso'
import { Cenario } from './Cenario'
import { Ator } from './Hud'
import { ModalJogo } from './ModalJogo'
import { Sprite } from './Sprite'

/**
 * Entrada da Cripta do Residente: o portão da masmorra dos flashcards.
 * Daqui a pessoa escolhe a Cripta sem fim ou a Biblioteca para treinar flashcards, gasta cristais no Altar do Saber e vê o
 * Bestiário. O ranking fica pronto atrás de uma trava (config.ts).
 */
export function Entrada() {
  const [painel, definirPainel] = useState<'altar' | 'bestiario' | null>(null)
  const [altar, definirAltar] = useState<EstadoAltar>(() => ({ ...ALTAR_VAZIO, ...ler<Partial<EstadoAltar>>(CHAVE_ALTAR, {}) }))
  const rec = useMemo(() => ({ ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }), [])
  const unicos = useMemo(() => flashcardsUnicos(ler<Record<string, unknown>>(CHAVE_REGISTROS, {})), [])
  const cripta = useMemo(() => migrarPartida(ler<unknown>(CHAVE_PARTIDA, null)), [])
  const bestiario = useMemo(() => ({ ...BESTIARIO_VAZIO, ...ler<Partial<Bestiario>>(CHAVE_BESTIARIO, {}) }), [])
  const criptaViva = cripta && cripta.fase !== 'fim' ? cripta : null
  const [volume, definirVolume] = useState(volumeDaSessao)
  const [somAtivo, definirSomAtivo] = useState(() => ler<{som?:boolean}>(CHAVE_AJUSTES,{}).som ?? true)
  const mudarVolume = (n: number) => {
    definirVolume(n); definirSomAtivo(n>0)
    const a=ler<Record<string,unknown>>(CHAVE_AJUSTES,{})
    gravar(CHAVE_AJUSTES,{...a,versao:3,volume:n,som:n>0})
    configurarSom({ligado:n>0,volume:n,efeitos:Number(a.volEfeitos??0.85),musica:Number(a.volMusica??0.45),ambiente:Number(a.volAmbiente??0.35)})
  }

  useEffect(() => {
    const a = ler<{ som?: boolean; volEfeitos?: number; volAmbiente?: number; volMusica?: number }>(CHAVE_AJUSTES, {})
    configurarSom({ ligado: a.som ?? true, efeitos: a.volEfeitos ?? 0.85, ambiente: a.volAmbiente ?? 0.35, musica: a.volMusica ?? 0.45, volume: volumeDaSessao() })
    tocarMusica('entrada'); tocarAmbiente('masmorra')
    // destrave por gesto e pausa por visibilidade, instalados uma vez para o jogo todo (sons.ts)
    instalarDestrave()
  }, [])

  // primeira entrada: a pessoa escolhe com ou sem som (o toque no botão já destrava o áudio no celular)
  const [escolherSom, definirEscolherSom] = useState(() => !ler<boolean>(CHAVE_SOM_ESCOLHIDO, false))
  const escolher = (comSom: boolean) => {
    const a = ler<Record<string, unknown>>(CHAVE_AJUSTES, {})
    gravar(CHAVE_AJUSTES, { ...a, versao: 3, som: comSom })
    configurarSom({ ligado: comSom, efeitos: (a.volEfeitos as number) ?? 0.85, ambiente: (a.volAmbiente as number) ?? 0.35, musica: (a.volMusica as number) ?? 0.45, volume: volumeDaSessao() })
    if (comSom) { destravar(); tocar('confirmar') }
    gravar(CHAVE_SOM_ESCOLHIDO, true)
    definirSomAtivo(comSom)
    definirEscolherSom(false)
  }

  const ir = (rota: string) => { tocar('porta'); window.setTimeout(() => navegar(rota), 160) }
  const comprar = (id: (typeof TALENTOS)[number]['id']) => {
    const novo = comprarTalento(altar, id)
    if (novo === altar) return
    gravar(CHAVE_ALTAR, novo); definirAltar(novo); tocar('evolucao')
  }

  return (
    <ModalJogo titulo="Cripta do Residente" aoPedirFechar={() => { tocarMusica(null); tocarAmbiente(null); navegar('/flashcards') }}>
      <div className="fc-arena fc-entrada">
        <Cenario cena="campo" reduzido={false} clima="noite" />
        <div className="fc-entrada__volume"><Volume valor={somAtivo ? volume : 0} aoMudar={mudarVolume} /></div>
        <div className="fc-entrada__miolo">
          <header className="fc-entrada__cabeca">
            <span className="fc-entrada__selo">Um encontro com o conhecimento</span>
            <h1>Cripta do <em>Residente</em></h1>
            <p>Escolha sua aventura: avance pela Cripta ou encontre um lugar tranquilo para treinar na Biblioteca.</p>
          </header>

          <div className="fc-entrada__palco" aria-hidden="true">
            <Ator quem="sabio" escala={2.2} classe="fc-ator--npc" />
            <Ator quem="heroi" escala={2.6} variante={rec.chefesDerrotados >= 10 ? 'heroi-5' : rec.chefesDerrotados >= 5 ? 'heroi-4' : rec.chefesDerrotados >= 2 ? 'heroi-3' : rec.chefesDerrotados >= 1 ? 'heroi-2' : undefined} classe="fc-ator--heroi" />
            <Ator quem="caixeira" escala={2.2} classe="fc-ator--npc" />
          </div>

          <div className="fc-modos">
            <button type="button" className="fc-modo fc-modo--cripta" onClick={() => ir('/flashcards/cripta')} onPointerEnter={() => tocar('hover')}>
              <span className="fc-modo__icone"><Sprite nome="porta" /></span>
              <strong>Cripta do Residente</strong>
              <small>Desça o quanto aguentar. A cada 3 andares, um chefe; a cada passo, portas que mostram a recompensa.</small>
              <span className="fc-modo__dados">{rec.andarMaximo ? <>Recorde: <b>andar {rec.andarMaximo}</b></> : 'Sem recorde ainda'}</span>
              <span className="fc-modo__acao">{criptaViva ? `Continuar no andar ${criptaViva.andar}` : `Entrar na Cripta`}</span>
            </button>
            <button type="button" className="fc-modo fc-modo--biblioteca" onClick={() => ir('/flashcards/biblioteca')} onPointerEnter={() => tocar('hover')}>
              <span className="fc-modo__icone"><Sprite nome="livro" /></span>
              <strong>Biblioteca de Flashcards</strong>
              <small>Treine flashcards no seu ritmo. Escolha um assunto, responda e revise, sem combate.</small>
              <span className="fc-modo__dados"><b>{unicos.toLocaleString('pt-BR')}</b> flashcards únicos respondidos</span>
              <span className="fc-modo__acao">Treinar flashcards</span>
            </button>
          </div>

          <div className="fc-entrada__extras">
            <button type="button" className="fc-extra" onClick={() => { tocar('selecao'); definirPainel('altar') }}><Sprite nome="estrela" className="fc-sprite--icone" /><span><strong>Altar do Saber</strong><small>{altar.cristais} cristais</small></span></button>
            <button type="button" className="fc-extra" onClick={() => { tocar('selecao'); definirPainel('bestiario') }}><Sprite nome="pergaminho" className="fc-sprite--icone" /><span><strong>Bestiário</strong><small>{bestiario.vistos.length} de {BESTIARIO.length} descobertos</small></span></button>
            {FLASHCARDS_RANKING && <a className="fc-extra" href={href('/ranking?aba=flashcards')} onClick={() => tocar('selecao')}><Sprite nome="coroa" className="fc-sprite--icone" /><span><strong>Ranking</strong><small>Um só ranking · maior andar</small></span></a>}
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
