import { useMemo } from 'react'
import { AtalhoFlashcards } from '../componentes/AtalhoFlashcards'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { DetalhesDiaSemana, DetalhesNumeros, DetalhesProvas, DetalhesSemanas, usarDetalhes } from '../componentes/DesempenhoDetalhado'
import { GraficoColunas, Medidor } from '../componentes/GraficosDesempenho'
import { Icone } from '../componentes/Icone'
import { Medalha } from '../componentes/Medalha'
import { fraseGratis } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { usarIndice } from '../dados/usarIndice'
import { armazenamentoDisponivel, tamanhoArmazenado } from '../estado/armazenamento'
import { conquistaAtual, proximaConquista } from '../estado/conquistas'
import { chaveDia } from '../estado/planoRevisao'
import type { RegistroQuestao } from '../estado/revisao'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { FUSO_DIA, hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { href } from '../util/rotas'
import '../estilos/paginas/Desempenho.css'

/*
 * Seu desempenho (rota /dados), refeita em 18/10/2026 na identidade do Treinar.
 * Três capítulos, de cima para baixo: o placar (acerto, respondidas, sequência),
 * onde você está forte e fraco (temas, provas, confiança) e como evoluiu, com o
 * que fazer agora levando ao Treinar. Os cálculos são os mesmos de antes.
 */

type PeriodoDesempenho = { tipo: 'tudo' | '7' | '30' | '90' | 'desde'; desde?: string }
const PERIODOS: { tipo: PeriodoDesempenho['tipo']; rotulo: string }[] = [
  { tipo: 'tudo', rotulo: 'Tudo' }, { tipo: '7', rotulo: '7 dias' }, { tipo: '30', rotulo: '30 dias' }, { tipo: '90', rotulo: '90 dias' }, { tipo: 'desde', rotulo: 'Desde…' },
]
function inicioDoPeriodo(p: PeriodoDesempenho): number {
  if (p.tipo === 'tudo') return 0
  if (p.tipo === 'desde') {
    const data = p.desde && /^\d{4}-\d{2}-\d{2}$/.test(p.desde) ? inicioDaChave(p.desde) : NaN
    return Number.isFinite(data) ? data : 0
  }
  return inicioDaChave(somarDias(hojeBR(), -(Number(p.tipo) - 1)))
}
function descreverPeriodo(p: PeriodoDesempenho): string {
  if (p.tipo === 'tudo') return 'desde o começo'
  if (p.tipo === 'desde') return p.desde ? `desde ${new Date(`${p.desde}T00:00:00`).toLocaleDateString('pt-BR')}` : 'escolha a data'
  return `nos últimos ${p.tipo} dias`
}

const n = (v: number) => v.toLocaleString('pt-BR')
/** Números pequenos por extenso, como nas cartas (docs/emails/TOM.md). */
const EXTENSO = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
const numero = (v: number) => (v >= 0 && v <= 10 ? EXTENSO[v] : n(v))
/** Primeiro nome, com a mesma regra das cartas (supabase/functions/_shared/cartas.ts). */
function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}
const diaCurto = (em: number) => new Date(em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: FUSO_DIA })

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const { sessao: conta, status: statusSync, sincronizar } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  // Depois de "Começar do zero", nada anterior ao reinício entra nos gráficos,
  // mesmo que algum aparelho ainda guarde eventos antigos no histórico da questão.
  const [reinicioEm] = usarArmazenado<number>('reinicio:em', 0)
  const respondidas = Object.keys(marcadas).length
  const [reinicioPendente] = usarArmazenado<string | null>('reinicio:pendente', null)
  const bytes = tamanhoArmazenado()

  // Período escolhido: fica salvo e vale sempre que a pessoa volta. Em vez de
  // apagar o histórico, ela acompanha só a fase atual do estudo.
  const [periodo, definirPeriodo] = usarArmazenado<PeriodoDesempenho>('desempenho:periodo', { tipo: 'tudo' })
  const inicioPeriodo = inicioDoPeriodo(periodo)
  const limite = Math.max(inicioPeriodo, reinicioEm || 0)
  const detalhes = usarDetalhes({ indice, marcadas, limite, meta: conta?.user.user_metadata })

  // Cada tentativa registrada (até as últimas 8 por questão), com o tema.
  const eventos = useMemo(() => {
    const temaPorId = new Map<string, { nome: string; slug: string }>()
    if (indice) for (const item of indice.questoes) {
      const tema = indice.temas[item.t]
      if (tema) temaPorId.set(item.id, { nome: tema.nome, slug: tema.slug })
    }
    const lista: { id: string; em: number; correta: boolean | null; confianca: 'seguro' | 'duvida' | 'chute'; tema?: { nome: string; slug: string } }[] = []
    for (const [id, registro] of Object.entries(marcadas)) {
      const historicoQuestao = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c, confianca: registro.confianca ?? 'seguro' as const }] : []
      for (const evento of historicoQuestao) {
        if ((evento.em ?? 0) < limite) continue
        lista.push({ id, em: evento.em, correta: evento.correta, confianca: evento.confianca ?? 'seguro', tema: temaPorId.get(id) })
      }
    }
    return lista
  }, [indice, marcadas, limite])

  const porTema = useMemo(() => {
    const soma = new Map<string, { certas: number; total: number; slug: string }>()
    for (const evento of eventos) {
      if (evento.correta === null || !evento.tema) continue
      const atual = soma.get(evento.tema.nome) ?? { certas: 0, total: 0, slug: evento.tema.slug }
      atual.total++
      if (evento.correta) atual.certas++
      soma.set(evento.tema.nome, atual)
    }
    return [...soma.entries()]
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.total - a.total)
  }, [eventos])

  const totalCertas = porTema.reduce((n, t) => n + t.certas, 0)
  const totalContadas = porTema.reduce((n, t) => n + t.total, 0)
  const errosTotais = eventos.filter((e) => e.correta === false).length
  const questoesNoPeriodo = new Set(eventos.map((e) => e.id)).size
  const sessoesNoPeriodo = historico.filter((h) => h.concluidaEm >= limite).length
  const nome = primeiroNome(conta?.user.user_metadata?.nome)
  const percentualGeral = totalContadas > 0 ? totalCertas / totalContadas : null
  const incertas = Object.values(marcadas).filter(registro => registro.confianca === 'duvida' || registro.confianca === 'chute').length
  const minhaConquista = conquistaAtual(respondidas)
  const proximaConquistaAlvo = proximaConquista(respondidas)
  const porConfianca = useMemo(() => {
    const grupos = { seguro: { certas: 0, total: 0 }, duvida: { certas: 0, total: 0 }, chute: { certas: 0, total: 0 } }
    for (const evento of eventos) {
      if (evento.correta === null) continue
      const grupo = grupos[evento.confianca]
      grupo.total++
      if (evento.correta) grupo.certas++
    }
    return grupos
  }, [eventos])
  const atividade = useMemo(() => {
    const porDia = new Map<string, { total: number; certas: number }>()
    for (const registro of Object.values(marcadas)) {
      const historicoQuestao = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c }] : []
      for (const evento of historicoQuestao) {
        if (reinicioEm && evento.em < reinicioEm) continue
        const chave = chaveDia(evento.em)
        const atual = porDia.get(chave) ?? { total: 0, certas: 0 }
        atual.total++
        if (evento.correta) atual.certas++
        porDia.set(chave, atual)
      }
    }
    const hoje = hojeBR()
    return Array.from({ length: 28 }, (_, i) => {
      const dia = inicioDaChave(somarDias(hoje, -(27 - i)))
      return { dia, fora: dia + 86400000 <= limite, ...(porDia.get(chaveDia(dia)) ?? { total: 0, certas: 0 }) }
    })
  }, [marcadas, reinicioEm, limite])
  const diasAtivos = atividade.filter((d) => d.total > 0 && !d.fora).length
  const questoesMes = atividade.reduce((n, d) => n + (d.fora ? 0 : d.total), 0)
  const avaliados = porTema.filter((t) => t.total >= 5)
  const temaForte = [...avaliados].sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const temaFragil = [...avaliados].sort((a, b) => a.certas / a.total - b.certas / b.total)[0]
  const temDestaques = Boolean(temaForte && temaFragil && temaForte.nome !== temaFragil.nome)
  // Mensagem do topo no tom das cartas: o nome, até três observações com dado real,
  // nenhuma porcentagem abaixo de 50% e nenhum número de questões abaixo de 10.
  const pctGeral = percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const streakAtual = detalhes.d.streak.atual
  const mensagemDesempenho = (() => {
    const quem = 'Você'
    if (respondidas < 10) return `${quem} está nos primeiros passos. Cada resposta entra aqui e vai mostrando o que vale estudar a seguir.`
    // O nome já está no título logo acima; repetir aqui soaria como formulário.
    const abertura = `São ${n(respondidas)} questões feitas até aqui`
    const tom = pctGeral === null || totalContadas < 30
      ? ', e o retrato fica mais nítido a cada sessão.'
      : pctGeral >= 80 ? `, com ${pctGeral}% de acerto: de quem já domina boa parte da prova.`
        : pctGeral >= 60 ? `, com ${pctGeral}% de acerto. Mais algumas revisões e essa porcentagem sobe.`
          : pctGeral >= 50 ? `, com ${pctGeral}% de acerto: a fase em que mais dá para crescer.`
            : '. Cada uma já ensinou alguma coisa, e todo mundo que passou começou assim.'
    const frases = [abertura + tom]
    const forte = avaliados.length >= 2 && temaForte && temaForte.certas / temaForte.total >= 0.5 ? temaForte : null
    if (forte) frases.push(`Seu terreno mais firme é ${forte.nome}.`)
    if (streakAtual >= 2) frases.push(`E já são ${numero(streakAtual)} dias seguidos de estudo, o que é de quem senta e faz.`)
    return frases.join(' ')
  })()

  // Sem conta e sem respostas: números de exemplo, marcados como exemplo, no lugar dos zeros.
  const exemplo = !conta && respondidas === 0
  const pct = exemplo ? 72 : percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const streak = detalhes.d.streak
  // Temas do mais forte para o mais fraco: a lista vira um mapa de onde estudar.
  const temasOrdenados = [...porTema].sort((a, b) => b.certas / b.total - a.certas / a.total || b.total - a.total)
  const confiancas = ([['seguro', 'Certeza', 'certo'], ['duvida', 'Dúvida', 'olho'], ['chute', 'Chute', 'interrogacao']] as const)
  const temConfianca = porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0
  const mostrarSync = conta && (statusSync.estado === 'erro' || statusSync.estado === 'offline' || statusSync.estado === 'conflito' || statusSync.pendentes > 0 || statusSync.rejeitados.length > 0)

  return (
    <article className="ds">
      {/* ---------- Placar ---------- */}
      <section className="ds-heroi" aria-labelledby="ds-titulo">
        <div className="ds-heroi__texto">
          <p className="tr-heroi__selo"><Icone nome="grafico" tamanho={13} /> Seu desempenho</p>
          <h1 id="ds-titulo">{nome ? `${nome}, seu desempenho` : 'Seu desempenho'}</h1>
          {exemplo ? <>
            <p className="ds-heroi__exemplo">Exemplo com números fictícios</p>
            <p>É assim que fica o seu desempenho: acerto por tema, ritmo da semana e onde você mais erra. Cada resposta entra aqui, do celular ou do computador.</p>
            <a className="botao ds-heroi__criar" href={href('/conta?modo=criar&voltar=%2Fdados')}>Criar conta grátis e ver o meu</a>
          </> : <p>{mensagemDesempenho}</p>}
          {/* No topo só quando há algo a fazer (erro, offline, itens parados): "Sincronizando…"
              piscando no herói a cada 5 segundos competia com o desempenho. */}
          {mostrarSync && (
            <p className="ds-heroi__sync" role="status">
              <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
              {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.estado === 'salvo' ? 'Progresso sincronizado' : statusSync.pendentes ? `${statusSync.pendentes} ${statusSync.pendentes === 1 ? 'alteração aguardando' : 'alterações aguardando'} envio` : 'Progresso salvo neste dispositivo'}
              {statusSync.estado !== 'sincronizando' && <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>}
              {statusSync.estado === 'erro' && statusSync.detalhe && <small className="status-sincronia__detalhe">Motivo: {statusSync.detalhe}</small>}
              {statusSync.rejeitados.length > 0 && <a className="status-sincronia__detalhe ds-heroi__rejeitados" href={href('/conta')}>{statusSync.rejeitados.length} {statusSync.rejeitados.length === 1 ? 'item não enviado' : 'itens não enviados'} · ver em Minha conta</a>}
            </p>
          )}
          <dl className="ds-heroi__extras">
            <div><dt>Sessões</dt><dd className="ds-num">{exemplo ? 58 : periodo.tipo === 'tudo' ? historico.length : sessoesNoPeriodo}</dd></div>
            <div><dt>{periodo.tipo === 'tudo' ? 'Erros acumulados' : 'Erros no período'}</dt><dd className="ds-num"><a href={href('/erros')} title="Abrir o caderno de erros">{exemplo ? 347 : errosTotais}</a></dd></div>
            <div><dt>Favoritas</dt><dd className="ds-num"><a href={href('/favoritas')}>{exemplo ? 23 : favoritos.length}</a></dd></div>
          </dl>
          {proximaConquistaAlvo && !exemplo && <a className="tr-heroi__link" href={href('/ranking')}><Icone nome="medalha" tamanho={15} /> Faltam {numero(proximaConquistaAlvo.minimo - respondidas)} {proximaConquistaAlvo.minimo - respondidas === 1 ? 'questão' : 'questões'} para {proximaConquistaAlvo.rotulo}</a>}
        </div>

        <div className="ds-placar">
          <div className="ds-placar__acerto">
            <p className="ds-placar__rotulo">{periodo.tipo === 'tudo' ? 'Acerto geral' : 'Acerto no período'}</p>
            <p className="ds-placar__valor"><strong>{pct === null ? '0' : pct}</strong><span>%</span></p>
            <Medidor valor={pct ?? 0} rotulo={pct === null ? 'Sem respostas ainda' : `${pct}% de acerto ${periodo.tipo === 'tudo' ? 'no total' : 'no período'}`} />
            <p className="ds-placar__apoio ds-num">{exemplo ? 'em 1.240 questões de exemplo' : totalContadas ? `${n(totalCertas)} certas em ${n(totalContadas)} respostas` : 'sem respostas ainda'}</p>
          </div>
          <dl className="ds-placar__dados">
            <div>
              <dt>{periodo.tipo === 'tudo' ? 'Respondidas' : 'Questões no período'}</dt>
              <dd>{exemplo ? '1.240' : n(periodo.tipo === 'tudo' ? respondidas : questoesNoPeriodo)}{minhaConquista && <span className="ds-placar__medalha"><Medalha conquista={minhaConquista} tamanho={22} titulo={`Emblema ${minhaConquista.rotulo}`} /></span>}</dd>
            </div>
            <div>
              <dt>Sequência</dt>
              <dd>{exemplo ? 12 : streak.atual}<small>{(exemplo ? 12 : streak.atual) === 1 ? 'dia' : 'dias'}</small></dd>
              <span className="ds-placar__nota">recorde de {exemplo ? 21 : streak.recorde} {(exemplo ? 21 : streak.recorde) === 1 ? 'dia' : 'dias'}</span>
            </div>
          </dl>
        </div>
      </section>

      {/* Filtro único, acima de tudo o que ele recorta. */}
      <section className="px-cartao ds-periodo" aria-label="Período do desempenho">
        <div className="ds-periodo__texto">
          <strong><Icone nome="calendario" tamanho={16} /> Período</strong>
          <span>Mostrando {descreverPeriodo(periodo)}. Ranking e emblemas continuam contando o total.</span>
        </div>
        <div className="ds-periodo__controles">
          <div className="ds-seg" role="group" aria-label="Escolher período">
            {PERIODOS.map((opcao) => (
              <button key={opcao.tipo} type="button" aria-pressed={periodo.tipo === opcao.tipo}
                onClick={() => definirPeriodo(opcao.tipo === 'desde' ? { tipo: 'desde', desde: periodo.desde ?? somarDias(hojeBR(), -29) } : { tipo: opcao.tipo, desde: periodo.desde })}>
                {opcao.rotulo}
              </button>
            ))}
          </div>
          {periodo.tipo === 'desde' && (
            <label className="ds-periodo__data">
              <span className="so-leitor">Data inicial</span>
              <input className="entrada" type="date" value={periodo.desde ?? ''} max={hojeBR()} onChange={(e) => definirPeriodo({ tipo: 'desde', desde: e.target.value })} />
            </label>
          )}
        </div>
      </section>

      {!conta && <p className="aviso-ia">Crie uma conta gratuita ({fraseGratis('curto')}) para salvar seu desempenho, revisões e histórico e acompanhar sua evolução em qualquer dispositivo. <a href={href('/conta')}>Criar minha conta</a></p>}
      {conta && !armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e bloqueio de cookies costumam ser a causa.</p>
        </div>
      )}

      {/* ---------- Onde você está ---------- */}
      <section className="ds-capitulo" aria-labelledby="ds-cap-onde">
        <header className="ds-capitulo__cabeca">
          <p className="ds-capitulo__selo">1 · Onde você está</p>
          <h2 id="ds-cap-onde">Forte e fraco, tema por tema</h2>
        </header>

        <div className="ds-grade ds-grade--onde">
          <section className="px-cartao ds-cartao ds-temas-cartao" aria-labelledby="ds-temas-titulo">
            <div className="ds-cartao__cabeca">
              <h3 id="ds-temas-titulo">Por tema</h3>
              <p>Do maior acerto para o menor. Toque em um tema para treinar só ele.</p>
            </div>
            {porTema.length === 0 ? (
              <p className="ds-vazio">Ainda não há questões respondidas nesta conta. Responda uma sessão e o desempenho por tema aparece aqui.</p>
            ) : (
              <ul className="ds-temas">
                {temasOrdenados.map((tema) => {
                  const percentual = Math.round((tema.certas / tema.total) * 100)
                  const avaliado = tema.total >= 5
                  return (
                    <li key={tema.nome}>
                      <a className="ds-tema" href={href(`/treinar?temas=${tema.slug}&limite=10`)}>
                        <span className="ds-tema__nome">{tema.nome}</span>
                        <span className="ds-tema__pct ds-num">{percentual}%</span>
                        <Medidor valor={percentual} />
                        <span className="ds-tema__meta ds-num">
                          {tema.certas} de {tema.total} certas
                          {avaliado && percentual >= 70 && <span className="ds-status ds-status--bom"><Icone nome="certo" tamanho={12} /> forte</span>}
                          {avaliado && percentual < 50 && <span className="ds-status ds-status--baixo"><Icone nome="alvo" tamanho={12} /> dá para crescer</span>}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="ds-coluna">
            <section className="px-cartao ds-cartao" aria-labelledby="ds-atencao-titulo">
              <div className="ds-cartao__cabeca">
                <h3 id="ds-atencao-titulo">Pontos de atenção</h3>
                <p>Temas com pelo menos 5 respostas.</p>
              </div>
              {temDestaques && temaForte && temaFragil ? (
                <div className="ds-destaques">
                  <a className="ds-destaque ds-destaque--bom" href={href(`/treinar?temas=${temaForte.slug}&limite=10`)}>
                    <small><Icone nome="certo" tamanho={13} /> Ponto forte</small>
                    <strong>{temaForte.nome}</strong>
                    <span className="ds-num">{Math.round((temaForte.certas / temaForte.total) * 100)}% de acerto</span>
                  </a>
                  <a className="ds-destaque ds-destaque--baixo" href={href(`/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`)}>
                    <small><Icone nome="alvo" tamanho={13} /> Onde mais dá para crescer</small>
                    <strong>{temaFragil.nome}</strong>
                    <span className="ds-num">{Math.round((temaFragil.certas / temaFragil.total) * 100)}% de acerto · refazer erros</span>
                  </a>
                </div>
              ) : <p className="ds-vazio">Responda mais algumas questões em temas diferentes para ver seu ponto forte e onde mais dá para crescer.</p>}
            </section>
            <DetalhesProvas detalhes={detalhes} />
          </div>
        </div>

        {temConfianca && <section className="px-cartao ds-cartao" aria-labelledby="ds-confianca-titulo">
          <div className="ds-cartao__cabeca">
            <h3 id="ds-confianca-titulo">Sua sensação combina com o resultado?</h3>
            <p>Acerto separado pelo que você marcou ao responder. Chute volta em 1 dia, dúvida em 3, certeza em 10. <a href={href('/revisao')}>Ver a escada completa</a></p>
          </div>
          <div className="ds-confianca">
            {confiancas.map(([tipo, rotulo, icone]) => {
              const grupo = porConfianca[tipo]
              const p = grupo.total ? Math.round((grupo.certas / grupo.total) * 100) : 0
              return <div className="ds-confianca__linha" key={tipo}>
                <span className="ds-confianca__rotulo"><Icone nome={icone} tamanho={16} /> {rotulo}</span>
                <Medidor valor={grupo.total ? Math.max(1, p) : 0} />
                <span className="ds-confianca__valor ds-num"><strong>{grupo.total ? `${p}%` : '–'}</strong> <small>{grupo.total} {grupo.total === 1 ? 'resposta' : 'respostas'}</small></span>
              </div>
            })}
          </div>
        </section>}
      </section>

      {/* ---------- Como você evoluiu ---------- */}
      <section className="ds-capitulo" aria-labelledby="ds-cap-evolucao">
        <header className="ds-capitulo__cabeca">
          <p className="ds-capitulo__selo">2 · Como você evoluiu</p>
          <h2 id="ds-cap-evolucao">Ritmo e acerto ao longo do tempo</h2>
        </header>

        <DetalhesNumeros detalhes={detalhes} />

        <div className="ds-grade">
          <section className="px-cartao ds-cartao" aria-labelledby="ds-atividade-titulo">
            <div className="ds-cartao__cabeca">
              <h3 id="ds-atividade-titulo">Últimas 4 semanas</h3>
              <p className="ds-num">{questoesMes} {questoesMes === 1 ? 'resposta' : 'respostas'} em {diasAtivos} {diasAtivos === 1 ? 'dia ativo' : 'dias ativos'}. Hoje em ouro.</p>
            </div>
            <GraficoColunas
              rotulo={`Atividade diária: ${questoesMes} respostas em 28 dias`}
              colunas={atividade.map((d, i) => ({
                chave: String(d.dia),
                valor: d.total,
                eixo: i === 0 ? 'há 4 sem.' : i === 27 ? 'hoje' : i % 7 === 0 ? diaCurto(d.dia) : '',
                destaque: i === 27,
                apagada: d.fora,
                descricao: `${i === 27 ? 'Hoje' : diaCurto(d.dia)}: ${d.total} ${d.total === 1 ? 'resposta' : 'respostas'}${d.total ? `, ${Math.round((d.certas / d.total) * 100)}% de acerto` : ''}${d.fora ? ' (fora do período)' : ''}.`,
              }))}
            />
            <details className="ds-tabela">
              <summary>Ver os 28 dias em tabela</summary>
              <div className="rolagem-x"><table className="tabela ds-tabela__tabela">
                <thead><tr><th scope="col">Dia</th><th scope="col" className="numerico">Respostas</th><th scope="col" className="numerico">Acerto</th></tr></thead>
                <tbody>{[...atividade].reverse().map((d) => <tr key={d.dia}>
                  <th scope="row">{diaCurto(d.dia)}</th>
                  <td className="numerico">{d.total}</td>
                  <td className="numerico">{d.total ? `${Math.round((d.certas / d.total) * 100)}%` : '–'}</td>
                </tr>)}</tbody>
              </table></div>
            </details>
          </section>
          <DetalhesSemanas detalhes={detalhes} />
        </div>

        <DetalhesDiaSemana detalhes={detalhes} />
      </section>

      {/* ---------- O que fazer agora ---------- */}
      <section className="ds-capitulo" aria-labelledby="ds-cap-agora">
        <header className="ds-capitulo__cabeca">
          <p className="ds-capitulo__selo">3 · O que fazer agora</p>
          <h2 id="ds-cap-agora">{nome ? `${nome}, sua próxima sessão` : 'Sua próxima sessão'}</h2>
        </header>
        <div className="px-cartao ds-agora">
          <ol className="ds-passos">
            {temaFragil && temDestaques && <li className="ds-passo">
              <span className="px-numero" aria-hidden="true">1</span>
              <div>
                <strong>Refazer os erros de {temaFragil.nome}</strong>
                <span>É onde mais dá para crescer agora. Que tal dez questões, com calma?</span>
              </div>
              <a className="ds-passo__acao" href={href(`/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`)}>Treinar 10 <Icone nome="direita" tamanho={16} /></a>
            </li>}
            {incertas > 0 && <li className="ds-passo">
              <span className="px-numero" aria-hidden="true">{temaFragil && temDestaques ? 2 : 1}</span>
              <div>
                <strong>Refazer {numero(incertas)} {incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}</strong>
                <span>Uma passada rápida transforma o que ficou incerto em certeza.</span>
              </div>
              <a className="ds-passo__acao" href={href('/treinar?situacao=incertas&limite=20')}>Treinar 20 <Icone nome="direita" tamanho={16} /></a>
            </li>}
            <li className="ds-passo">
              <span className="px-numero" aria-hidden="true">{(temaFragil && temDestaques ? 1 : 0) + (incertas > 0 ? 1 : 0) + 1}</span>
              <div>
                <strong>Abrir o caderno de erros</strong>
                <span className="ds-num">{numero(exemplo ? 347 : errosTotais)} {(exemplo ? 347 : errosTotais) === 1 ? 'erro' : 'erros'} {periodo.tipo === 'tudo' ? 'guardados' : 'no período'}, cada um com o comentário que explica.</span>
              </div>
              <a className="ds-passo__acao" href={href('/erros')}>Abrir <Icone nome="direita" tamanho={16} /></a>
            </li>
          </ol>
          <a className="botao ds-agora__treinar" href={href('/treinar')}>
            <Icone nome="filtro" tamanho={22} />
            <span><strong>Montar uma sessão</strong><small>Escolha prova, tema e quantidade no Treinar</small></span>
          </a>
        </div>
        {!exemplo && <AtalhoFlashcards tipo="desempenho" />}
      </section>

      {conta && <p className="meta ds-guardado">Seu progresso fica salvo e sincronizado com a sua conta ({(bytes / 1024).toFixed(1)} kB neste perfil). <a href={href('/conta')}>Minha conta</a></p>}

      <BackupProgresso />

      {/* O reinício está sendo refeito: o bloco só aparece se houver um reinício pendente de sincronizar. */}
      {conta && reinicioPendente && <section className="zona-risco cartao__corpo empilha ds-risco">
        <p className="meta"><Icone nome="alerta" tamanho={15} /> ZONA DE RISCO</p>
        <h2>Começar do zero <span className="ds-embreve">Em breve</span></h2>
        <p className="texto-2">Esta opção está sendo refeita e volta em breve. Enquanto isso, use o <strong>Período</strong> lá em cima para acompanhar só a fase atual do seu estudo: o acerto, os temas e a confiança passam a contar a partir da data que você escolher, sem apagar nada.</p>
        <div className="linha">
          {/* A função reiniciarProgresso continua pronta; o botão só volta a funcionar quando o reinício for refeito. */}
          <button type="button" className="botao botao--perigo" disabled aria-disabled="true" title="Em breve">Zerar meu progresso · em breve</button>
          {reinicioPendente && <button type="button" className="botao botao--fantasma" onClick={sincronizar}>Tentar sincronizar agora</button>}
        </div>
      </section>}
    </article>
  )
}
