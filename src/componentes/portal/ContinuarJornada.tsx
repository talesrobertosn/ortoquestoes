import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { usarPlanoSalvo } from '../../conta/cronograma'
import { carregarIndice, contar, indiceCarregado } from '../../dados/acervo'
import { calcularPlano } from '../../dados/planoEstudo'
import { AREAS_TREINO, FILTROS_VAZIOS, type EstadoSessao, type Indice } from '../../dados/tipos'
import { indiceBibliotecaCarregado, carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { usarBiblioteca } from '../../biblioteca/usarBiblioteca'
import { CHAVE_SESSAO } from '../../estado/sessao'
import type { RegistroQuestao } from '../../estado/revisao'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { usarContextoLocal } from '../../estado/usarContextoLocal'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { IconePixel } from './IconePixel'

/**
 * Continue sua jornada (31/10/2026; painel desde 10/11/2026, pedido do Tales: "um pequeno hub, um painel"). No alto, o
 * cartão grande da sessão em andamento (retoma a MESMA sessão, nada de criar outra), em verde chapado, sem degradê, com a
 * barra em blocos. Embaixo, três cartões com o mesmo peso e números grandes: o cronograma (quanto do plano já foi, o
 * tema de hoje e os dias até a prova), a revisão de hoje e o resumo em leitura. Quando um deles não tem dado, o cartão
 * vira um convite para a ferramenta, e a grade nunca fica torta.
 * Os números vêm dos dados do aparelho e do servidor (os mesmos do resto do site); o índice do acervo desce aqui
 * quando ainda não está na memória, para o cronograma e a revisão não sumirem na primeira abertura.
 */
const BLOCOS = 20

export function ContinuarJornada({ premium, aoIr }: { premium: boolean; aoIr: () => void }) {
  const [sessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const feitas = sessao ? Object.keys(sessao.respostas).length : 0
  const pendente = sessao && !sessao.concluidaEm && feitas < sessao.ids.length ? { feitas, total: sessao.ids.length } : null

  const [indice, definirIndice] = useState<Indice | null>(() => indiceCarregado())
  const [falhou, definirFalhou] = useState(false)
  useEffect(() => { if (!indice) carregarIndice().then(definirIndice).catch(() => definirFalhou(true)) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [, definirBib] = useState(0)
  useEffect(() => { if (!indiceBibliotecaCarregado()) carregarIndiceBiblioteca().then(() => definirBib((n) => n + 1)).catch(() => undefined) }, [])

  const { contexto } = usarContextoLocal('')
  const revisarHoje = useMemo(() => (indice ? contar(indice, { ...FILTROS_VAZIOS, areas: AREAS_TREINO }, contexto).porSituacao.revisarHoje : null), [indice, contexto])
  const { leituras } = usarBiblioteca()
  const leitura = useMemo(() => Object.values(leituras)
    .filter((l): l is NonNullable<typeof l> => !!l && (l.progresso ?? 0) > 2 && !l.concluidoEm && (l.progresso ?? 0) < 95)
    .sort((a, b) => b.em - a.em)[0] ?? null, [leituras])
  const tituloLeitura = leitura ? indiceBibliotecaCarregado()?.capitulos.find((c) => c.id === leitura.capitulo)?.titulo ?? null : null
  const { plano } = usarPlanoSalvo(premium)
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const crono = useMemo(() => (premium && plano && indice ? calcularPlano(indice, respondidas, plano) : null), [premium, plano, indice, respondidas])
  const pctPlano = crono && crono.alvo > 0 ? Math.min(100, Math.round((crono.feitas / crono.alvo) * 100)) : null
  const temaHoje = crono?.hoje ? [crono.hoje.nome, crono.hoje.focos?.[0]].filter(Boolean).join(' · ') : null

  const pctSessao = pendente ? Math.round((pendente.feitas / pendente.total) * 100) : 0
  const cheios = Math.round((pctSessao / 100) * BLOCOS)
  return (
    <section className="pt-jornada" aria-labelledby="pt-jornada-titulo">
      <h3 id="pt-jornada-titulo" className="pt-rotulo">Continue sua jornada</h3>
      {pendente ? (
        <a className="pt-sessao" href={href('/sessao')} onClick={aoIr} aria-label={`Continuar de onde parei: ${pendente.feitas} de ${pendente.total} questões respondidas, ${pctSessao}%`}>
          <span className="pt-sessao__moldura" aria-hidden="true"><IconePixel nome="treinar" tamanho={64} className="pt-sessao__icone" /></span>
          <span className="pt-sessao__texto">
            <span className="pt-sessao__eyebrow">{sessao?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sessão em andamento'}</span>
            <strong>Continuar de onde parei</strong>
            <span className="pt-sessao__conta"><b className="numerico">{pendente.feitas}</b> de <b className="numerico">{pendente.total}</b> questões respondidas</span>
            <span className="pt-blocos" aria-hidden="true">
              {Array.from({ length: BLOCOS }, (_, i) => <i key={i} className={i < cheios ? 'cheio' : undefined} />)}
              <b className="numerico">{pctSessao}%</b>
            </span>
          </span>
          <span className="pt-sessao__acao">Retomar <Icone nome="direita" tamanho={16} /></span>
        </a>
      ) : (
        <a className="pt-sessao pt-sessao--nova" href={href('/treinar')} onClick={aoIr}>
          <span className="pt-sessao__moldura" aria-hidden="true"><IconePixel nome="treinar" tamanho={64} className="pt-sessao__icone" /></span>
          <span className="pt-sessao__texto">
            <span className="pt-sessao__eyebrow">Nenhuma sessão aberta</span>
            <strong>Começar uma sessão</strong>
            <span className="pt-sessao__conta">Escolha os temas e a quantidade de questões.</span>
          </span>
          <span className="pt-sessao__acao">Treinar <Icone nome="direita" tamanho={16} /></span>
        </a>
      )}

      <ul className="pt-painel">
        <li>{premium && plano ? (
          <a className="pt-cartao pt-cartao--crono" href={href('/cronograma')} onClick={aoIr}>
            <span className="pt-cartao__topo"><IconePixel nome="cronograma" tamanho={32} /><span>Cronograma</span></span>
            <span className="pt-cartao__meio">
              <span className="pt-anel" style={{ '--pct': pctPlano ?? 0 } as CSSProperties} aria-hidden="true"><b className="numerico">{pctPlano ?? '…'}{pctPlano !== null ? <small>%</small> : null}</b></span>
              <span className="pt-cartao__linhas">
                <strong>{crono ? (crono.provaPassou ? 'A prova já passou' : crono.metaDiaria ? <>Hoje <b className="numerico">{crono.feitasHoje}</b> de <b className="numerico">{crono.metaDiaria}</b></> : 'Plano em dia') : falhou ? 'Abra para ver o plano' : 'Calculando…'}</strong>
                {temaHoje && !crono?.provaPassou && <small className="pt-cartao__tema">Estudando: {temaHoje}</small>}
                {crono && !crono.provaPassou && <small>{crono.diasAteProva} {crono.diasAteProva === 1 ? 'dia' : 'dias'} até a prova</small>}
                {crono?.provaPassou && <small>Hora de montar o próximo plano.</small>}
              </span>
            </span>
            <span className="pt-cartao__acao">Ver o plano de hoje <Icone nome="direita" tamanho={14} /></span>
          </a>
        ) : (
          <a className="pt-cartao pt-cartao--convite" href={href('/cronograma')} onClick={aoIr}>
            <span className="pt-cartao__topo"><IconePixel nome="cronograma" tamanho={32} /><span>Cronograma</span></span>
            <span className="pt-cartao__linhas"><strong>Seu plano até a prova</strong><small>Questões do dia certas para a data da sua prova.</small></span>
            <span className="pt-cartao__acao">{premium ? 'Montar o cronograma' : 'Conhecer'} <Icone nome="direita" tamanho={14} /></span>
          </a>
        )}</li>
        <li><a className="pt-cartao pt-cartao--revisao" href={href('/revisao')} onClick={aoIr}>
          <span className="pt-cartao__topo"><IconePixel nome="revisao" tamanho={32} /><span>Revisões de hoje</span></span>
          <span className="pt-cartao__meio">
            <b className="pt-cartao__numero numerico">{revisarHoje === null ? '…' : revisarHoje}</b>
            <span className="pt-cartao__linhas">
              <strong>{revisarHoje === null ? (falhou ? 'Abra para ver' : 'Contando…') : revisarHoje === 1 ? 'questão volta hoje' : revisarHoje > 0 ? 'questões voltam hoje' : 'Tudo em dia'}</strong>
              <small>{revisarHoje ? 'Revise antes de avançar: é o que mais fixa.' : 'Nada para revisar hoje.'}</small>
            </span>
          </span>
          <span className="pt-cartao__acao">{revisarHoje ? 'Revisar agora' : 'Abrir a revisão'} <Icone nome="direita" tamanho={14} /></span>
        </a></li>
        <li>{leitura ? (
          <a className="pt-cartao pt-cartao--leitura" href={href(`/resumos/${leitura.capitulo}`)} onClick={aoIr}>
            <span className="pt-cartao__topo"><IconePixel nome="resumos" tamanho={32} /><span>Último resumo</span></span>
            <span className="pt-cartao__linhas">
              <strong className="pt-cartao__titulo">{tituloLeitura ?? 'Resumo em andamento'}</strong>
              <span className="pt-cartao__progresso" aria-hidden="true"><i style={{ width: `${leitura.progresso}%` }} /></span>
              <small><b className="numerico">{leitura.progresso}%</b> lido · volta no parágrafo em que parou</small>
            </span>
            <span className="pt-cartao__acao">Continuar lendo <Icone nome="direita" tamanho={14} /></span>
          </a>
        ) : (
          <a className="pt-cartao pt-cartao--convite" href={href('/resumos')} onClick={aoIr}>
            <span className="pt-cartao__topo"><IconePixel nome="resumos" tamanho={32} /><span>Resumos</span></span>
            <span className="pt-cartao__linhas"><strong>Os capítulos que mais caem</strong><small>Comece um resumo e ele fica aqui para você continuar.</small></span>
            <span className="pt-cartao__acao">Abrir a Biblioteca <Icone nome="direita" tamanho={14} /></span>
          </a>
        )}</li>
      </ul>
    </section>
  )
}
