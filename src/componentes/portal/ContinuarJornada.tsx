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
 * Continue sua jornada (31/10/2026): a sessão em andamento em destaque (retoma a MESMA sessão, nada de criar outra) e,
 * ao lado, três atalhos compactos com números de verdade: o cronograma, a revisão de hoje e o resumo em leitura.
 * Os números vêm dos dados do aparelho e do servidor (os mesmos do resto do site); o índice do acervo desce aqui
 * quando ainda não está na memória, para o cronograma e a revisão não sumirem na primeira abertura.
 */
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

  const pctSessao = pendente ? Math.round((pendente.feitas / pendente.total) * 100) : 0
  return (
    <section className="pt-jornada" aria-labelledby="pt-jornada-titulo">
      <h3 id="pt-jornada-titulo" className="pt-rotulo">Continue sua jornada</h3>
      <div className="pt-jornada__grade">
        {pendente ? (
          <a className="pt-sessao" href={href('/sessao')} onClick={aoIr} aria-label={`Continuar de onde parei: ${pendente.feitas} de ${pendente.total} questões respondidas, ${pctSessao}%`}>
            <IconePixel nome="treinar" tamanho={64} className="pt-sessao__icone" />
            <span className="pt-sessao__texto">
              <span className="pt-sessao__eyebrow">{sessao?.origem === 'cronograma' ? 'Sessão do cronograma' : 'Sessão em andamento'}</span>
              <strong>Continuar de onde parei</strong>
              <span className="pt-sessao__conta"><b className="numerico">{pendente.feitas}</b> de <b className="numerico">{pendente.total}</b> questões · {pctSessao}%</span>
              <span className="pt-barra" aria-hidden="true"><span style={{ width: `${pctSessao}%` }} /></span>
            </span>
            <span className="pt-sessao__acao">Retomar <Icone nome="direita" tamanho={16} /></span>
          </a>
        ) : (
          <a className="pt-sessao pt-sessao--nova" href={href('/treinar')} onClick={aoIr}>
            <IconePixel nome="treinar" tamanho={64} className="pt-sessao__icone" />
            <span className="pt-sessao__texto">
              <span className="pt-sessao__eyebrow">Nenhuma sessão aberta</span>
              <strong>Começar uma sessão</strong>
              <span className="pt-sessao__conta">Escolha os temas e a quantidade de questões.</span>
            </span>
            <span className="pt-sessao__acao">Treinar <Icone nome="direita" tamanho={16} /></span>
          </a>
        )}
        <ul className="pt-pendencias">
          {premium && plano && (
            <li><a className="pt-pendencia" href={href('/cronograma')} onClick={aoIr}>
              <IconePixel nome="cronograma" tamanho={32} />
              <span><strong>Cronograma{pctPlano !== null ? ` · ${pctPlano}%` : ''}</strong>
                <small>{crono ? (crono.provaPassou ? 'A prova já passou: hora de montar o próximo plano.' : `${crono.metaDiaria ? `Hoje ${crono.feitasHoje} de ${crono.metaDiaria}` : 'Plano em dia'} · ${crono.diasAteProva} ${crono.diasAteProva === 1 ? 'dia' : 'dias'} até a prova`) : falhou ? 'Abra para ver o plano de hoje' : 'Calculando o plano…'}</small>
              </span>
              {pctPlano !== null && <span className="pt-anel" style={{ '--pct': pctPlano } as CSSProperties} aria-hidden="true" />}
            </a></li>
          )}
          <li><a className="pt-pendencia" href={href('/revisao')} onClick={aoIr}>
            <IconePixel nome="revisao" tamanho={32} />
            <span><strong>Revisão de hoje</strong>
              <small>{revisarHoje === null ? (falhou ? 'Abra para ver o que volta hoje' : 'Contando as questões…') : revisarHoje > 0 ? `${revisarHoje} ${revisarHoje === 1 ? 'questão volta' : 'questões voltam'} hoje` : 'Nada para revisar hoje. Tudo em dia.'}</small>
            </span>
            {revisarHoje ? <span className="pt-contador numerico">{revisarHoje}</span> : null}
          </a></li>
          {leitura && (
            <li><a className="pt-pendencia" href={href(`/resumos/${leitura.capitulo}`)} onClick={aoIr}>
              <IconePixel nome="resumos" tamanho={32} />
              <span><strong>{tituloLeitura ?? 'Resumo em andamento'}</strong><small>{leitura.progresso}% lido · continua no parágrafo em que parou</small></span>
              <span className="pt-anel" style={{ '--pct': leitura.progresso } as CSSProperties} aria-hidden="true" />
            </a></li>
          )}
        </ul>
      </div>
    </section>
  )
}
