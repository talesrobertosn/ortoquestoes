import type { ReactNode } from 'react'
import type { CalculoPlano, PlanoSalvo } from '../dados/planoEstudo'
import { incluiSimulados } from '../dados/planoEstudo'
import type { Constancia, Elogio, Esquecido, Risco } from '../dados/hubCronograma'
import { TAMANHO_DIAGNOSTICO } from '../dados/hubCronograma'
import { ROTULO_NIVEL, type AreaIncidencia, type Foco } from '../dados/incidencia'
import { Icone } from '../componentes/Icone'
import { IconePixel } from '../componentes/IconePixel'
import { href } from '../util/rotas'

/**
 * As peças do cronograma como painel de estudo: as fases até a prova, os
 * avisos (diagnóstico e temas esquecidos), o roteiro da reta final, a
 * constância, o desempenho por área, o mapa de risco, os OrtoQuestões
 * Simulados e a explicação completa de como tudo funciona.
 */

const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const DIA = 86_400_000
const SEMANA_CURTA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ─── Fases até a prova ─────────────────────────────────────────────────────

export function FasesCronograma({ calculo, plano }: { calculo: CalculoPlano; plano: PlanoSalvo }) {
  const criado = new Date(plano.criado_em)
  const prova = new Date(calculo.vespera.getTime() + DIA)
  const total = Math.max(1, calculo.inicioRetaFinal.getTime() - new Date(criado.getFullYear(), criado.getMonth(), criado.getDate()).getTime())
  const andado = Math.min(1, Math.max(0, (Date.now() - criado.getTime()) / total))
  const fases = [
    { id: 'conteudo', nome: 'Conteúdo novo', datas: `até ${curta(new Date(calculo.inicioRetaFinal.getTime() - DIA))}`, texto: 'Questões que você ainda não fez, do que mais cai para o que menos cai.' },
    ...(calculo.diasRetaFinal > 7 ? [{ id: 'revisao', nome: 'Revisão forte', datas: `${curta(calculo.inicioRetaFinal)} a ${curta(new Date(calculo.inicioModoProva.getTime() - DIA))}`, texto: 'Erros, dúvidas e o que mais cai, uma fatia da prova por dia.' }] : []),
    { id: 'prova', nome: 'Modo prova', datas: `${curta(calculo.inicioModoProva)} a ${curta(new Date(calculo.vespera.getTime() - DIA))}`, texto: 'Simulado cronometrado, os erros que importam e o resumão.' },
    { id: 'vespera', nome: 'Véspera', datas: curta(calculo.vespera), texto: 'Aquecimento leve e descanso. Nada de conteúdo novo.' },
  ]
  const atual = calculo.fase === 'passou' ? -1 : fases.findIndex((f) => f.id === calculo.fase)
  return (
    <section className="pe-fases" aria-label="Fases até a prova">
      <ol>
        {fases.map((f, i) => (
          <li key={f.id} className={'pe-fase' + (i === atual ? ' pe-fase--atual' : i < atual || atual < 0 ? ' pe-fase--feita' : '')}>
            <span className="pe-fase__ponto" aria-hidden="true">{i < atual || atual < 0 ? <Icone nome="certo" tamanho={13} /> : i + 1}</span>
            <span className="pe-fase__nome">{f.nome}{i === atual && <em>você está aqui</em>}</span>
            <span className="pe-fase__datas">{f.datas}</span>
            <small>{f.texto}</small>
            {f.id === 'conteudo' && i === atual && <span className="pe-fase__barra" aria-label={`${Math.round(andado * 100)}% do tempo de conteúdo novo`}><span style={{ width: `${Math.round(andado * 100)}%` }} /></span>}
          </li>
        ))}
        <li className="pe-fase pe-fase--prova"><span className="pe-fase__ponto" aria-hidden="true"><Icone nome="bandeira" tamanho={13} /></span><span className="pe-fase__nome">Prova</span><span className="pe-fase__datas">{curta(prova)}</span></li>
      </ol>
    </section>
  )
}

// ─── Avisos ────────────────────────────────────────────────────────────────

export function AvisoDiagnostico({ aoFazer, simulados }: { aoFazer: () => void; simulados: boolean }) {
  return (
    <section className="pe-aviso pe-aviso--diagnostico" aria-labelledby="pe-diag-titulo">
      <span className="pe-aviso__icone" aria-hidden="true"><IconePixel nome="relatorio" tamanho={40} /></span>
      <div>
        <p className="pe-aviso__selo">Comece por aqui</p>
        <h2 id="pe-diag-titulo">Diagnóstico de {TAMANHO_DIAGNOSTICO} questões</h2>
        <p>Questões das áreas que mais caem, na proporção da prova{simulados ? ', com alguns OrtoQuestões Simulados no meio' : ''}. Leva uns 45 minutos. Com o resultado, o cronograma já sabe onde você está mais fraco e dá mais espaço a esses temas desde o primeiro dia, sem esperar semanas de respostas.</p>
      </div>
      <button type="button" className="botao botao--principal botao--grande" onClick={aoFazer}>Fazer o diagnóstico</button>
    </section>
  )
}

export function AvisoEsquecimento({ esquecidos, aoReativar }: { esquecidos: Esquecido[]; aoReativar: (slug: string) => void }) {
  if (!esquecidos.length) return null
  return (
    <section className="pe-aviso pe-aviso--esquecimento" aria-labelledby="pe-esq-titulo">
      <span className="pe-aviso__icone" aria-hidden="true"><Icone nome="alerta" tamanho={24} /></span>
      <div>
        <p className="pe-aviso__selo">Alerta de esquecimento</p>
        <h2 id="pe-esq-titulo">{esquecidos.length === 1 ? `Você não vê ${esquecidos[0].nome} há ${esquecidos[0].dias} dias` : `${esquecidos.length} temas estão ficando para trás`}</h2>
        <p>Sem revisão, a maior parte do que se aprende some em poucas semanas. Uma sessão curta reativa a memória: primeiro os seus erros, depois as que você marcou como chute ou dúvida.</p>
        <ul className="pe-esquecidos">
          {esquecidos.slice(0, 3).map((e) => (
            <li key={e.slug}>
              <span><strong>{e.nome}</strong><small>{e.dias} dias sem ver · {e.respondidas} feitas{e.erros ? ` · ${e.erros} erros para refazer` : ''}</small></span>
              <button type="button" className="botao" onClick={() => aoReativar(e.slug)}><Icone nome="reiniciar" tamanho={15} /> Reativar em 15</button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─── Hoje, conforme a fase ─────────────────────────────────────────────────

export interface AcoesRetaFinal {
  revisaoHoje: { areas: AreaIncidencia[]; n: number } | null
  aoRevisaoForte: () => void
  errosQueImportam: number
  aoErros: () => void
  aoAquecimento: () => void
}

export function HojeRetaFinal({ calculo, acoes }: { calculo: CalculoPlano; acoes: AcoesRetaFinal }) {
  if (calculo.fase === 'revisao') {
    const areas = acoes.revisaoHoje?.areas ?? []
    return (
      <section className="pe-hoje pe-hoje--final">
        <div>
          <p className="meta">RETA FINAL · REVISÃO FORTE</p>
          <h2>{areas.length ? `Hoje: ${areas.map((a) => a.nome).join(' e ')}` : 'Revisão do que você já viu'}</h2>
          <p className="texto-2">Nada de conteúdo novo. {acoes.revisaoHoje?.n ? <>Uma sessão de <b>{acoes.revisaoHoje.n} questões</b>: seus erros, as marcadas como chute ou dúvida e as dos assuntos que mais caem que você não vê há mais tempo.</> : 'Você não tem erros nem dúvidas pendentes nestas áreas: refaça os erros que importam e leia o resumão.'}</p>
        </div>
        <div className="pe-hoje__acoes">
          {acoes.revisaoHoje?.n ? <button type="button" className="botao botao--principal botao--grande" onClick={acoes.aoRevisaoForte}>Começar a revisão de hoje</button> : <button type="button" className="botao botao--principal botao--grande" onClick={acoes.aoErros} disabled={!acoes.errosQueImportam}>Os erros que importam</button>}
          <a className="botao" href={href('/resumao')}><Icone nome="livro" tamanho={16} /> Resumão</a>
        </div>
      </section>
    )
  }
  if (calculo.fase === 'prova') {
    const tarefas: Array<{ titulo: string; texto: string; acao: ReactNode }> = [
      { titulo: 'Simulado cronometrado', texto: 'Faça no mesmo horário e com a mesma duração da prova, para treinar ritmo e cansaço. O Simulado de véspera e o Nacional estão na mesma página.', acao: <a className="botao botao--principal" href={href('/simulado-nacional')}>Ir para o simulado</a> },
      { titulo: `Os erros que importam${acoes.errosQueImportam ? ` (${acoes.errosQueImportam})` : ''}`, texto: 'Só os erros dos assuntos de prioridade alta e máxima. É onde cada acerto a mais tem mais chance de aparecer na prova.', acao: <button type="button" className="botao" onClick={acoes.aoErros} disabled={!acoes.errosQueImportam}>Refazer agora</button> },
      { titulo: 'Resumão', texto: 'As frases "Na prova" dos comentários, só dos assuntos que mais caem, para ler em minutos.', acao: <a className="botao" href={href('/resumao')}>Abrir o resumão</a> },
    ]
    return (
      <section className="pe-hoje pe-hoje--final pe-hoje--lista">
        <div>
          <p className="meta">RETA FINAL · MODO PROVA</p>
          <h2>A semana da prova</h2>
          <p className="texto-2">Sem conteúdo novo e com um pouco menos de volume, para chegar descansado. Três tarefas, na ordem que preferir:</p>
        </div>
        <ol className="pe-tarefas">
          {tarefas.map((t, i) => <li key={t.titulo}><span className="pe-tarefas__num numerico">{i + 1}</span><span><strong>{t.titulo}</strong><small>{t.texto}</small></span>{t.acao}</li>)}
        </ol>
      </section>
    )
  }
  return (
    <section className="pe-hoje pe-hoje--final">
      <div>
        <p className="meta">VÉSPERA</p>
        <h2>Aquecimento leve e descanso</h2>
        <p className="texto-2">Hoje não é dia de aprender coisa nova. Um aquecimento de 25 questões dos assuntos que mais caem (quase todas já acertadas por você, para chegar confiante), uma passada no resumão e cama cedo. Separe documento, caneta e o caminho até o local da prova.</p>
      </div>
      <div className="pe-hoje__acoes">
        <button type="button" className="botao botao--principal botao--grande" onClick={acoes.aoAquecimento}>Aquecimento de 25</button>
        <a className="botao" href={href('/resumao')}><Icone nome="livro" tamanho={16} /> Resumão</a>
      </div>
    </section>
  )
}

// ─── Constância ────────────────────────────────────────────────────────────

const ROTULO_DIA: Record<string, string> = { cumprido: 'meta cumprida', parcial: 'estudou, abaixo da meta', vazio: 'sem estudo', folga: 'folga', hoje: 'hoje', antes: 'antes do plano' }

export function CartaoConstancia({ constancia: c, elogio: e }: { constancia: Constancia; elogio: Elogio }) {
  return (
    <section className={`cartao cartao__corpo pe-constancia pe-constancia--${e.tom}`} aria-labelledby="pe-const-titulo">
      <div className="pe-constancia__topo">
        <span className="pe-constancia__fogo" aria-hidden="true"><Icone nome="fogo" tamanho={26} /></span>
        <div>
          <h2 id="pe-const-titulo">{e.titulo}</h2>
          <p>{e.texto}</p>
        </div>
      </div>
      <dl className="pe-constancia__numeros">
        <div><dt>Sequência atual</dt><dd className="numerico">{c.sequencia}<small>{c.sequencia === 1 ? 'dia' : 'dias'}</small></dd></div>
        <div><dt>Melhor sequência</dt><dd className="numerico">{c.melhor}<small>{c.melhor === 1 ? 'dia' : 'dias'}</small></dd></div>
        <div><dt>Seguiu o plano</dt><dd className="numerico">{c.aderencia === null ? '–' : `${c.aderencia}%`}<small>últimas 2 semanas</small></dd></div>
      </dl>
      <ol className="pe-dias" aria-label="Últimos 14 dias">
        {c.ultimos.map((d) => (
          <li key={d.dia.getTime()} className={`pe-dia pe-dia--${d.estado}`} title={`${d.dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'numeric' })}: ${ROTULO_DIA[d.estado]}${d.n ? `, ${d.n} questões` : ''}`}>
            <span aria-hidden="true">{SEMANA_CURTA[d.dia.getDay()]}</span>
          </li>
        ))}
      </ol>
      <p className="pe-constancia__nota">Um dia conta como cumprido com <b>{c.minimo} questões</b> ou mais (novas ou de revisão). Folga marcada não quebra a sequência.</p>
    </section>
  )
}

// ─── Desempenho e mapa de risco ────────────────────────────────────────────

export function CartaoDesempenho({ areas, media }: { areas: Array<{ slug: string; nome: string; acerto: number; respondidas: number }>; media: number | null }) {
  return (
    <section className="cartao cartao__corpo pe-desempenho" aria-labelledby="pe-desemp-titulo">
      <header className="pe-cartao-cabeca"><IconePixel nome="desempenho" tamanho={32} /><h2 id="pe-desemp-titulo">Seu acerto por área</h2></header>
      {areas.length ? <>
        <ul className="pe-barras">
          {areas.map((a) => (
            <li key={a.slug} className={media !== null && a.acerto < media - 5 ? 'pe-barras--fraco' : media !== null && a.acerto > media + 5 ? 'pe-barras--forte' : ''}>
              <span className="pe-barras__nome">{a.nome}</span>
              <span className="pe-barras__trilho"><span style={{ width: `${a.acerto}%` }} />{media !== null && <i style={{ left: `${media}%` }} aria-hidden="true" />}</span>
              <b className="numerico">{a.acerto}%</b>
            </li>
          ))}
        </ul>
        <p className="pe-cartao-nota">Na ordem do que mais cai. {media !== null && <>A marca é a sua média ({media}%): </>}as áreas em vermelho ganham mais espaço no cronograma. Acerto marcado como chute vale meio.</p>
      </> : <p className="texto-2">Responda algumas questões (ou faça o diagnóstico) e o seu acerto por área aparece aqui.</p>}
      <a className="pe-link" href={href('/dados')}>Ver o desempenho completo <Icone nome="direita" tamanho={14} /></a>
    </section>
  )
}

export function MapaRisco({ riscos, cegos, aoTreinar }: { riscos: Risco[]; cegos: Array<{ area: AreaIncidencia; foco: Foco; total: number }>; aoTreinar: (area: AreaIncidencia, foco: Foco) => void }) {
  return (
    <section className="cartao cartao__corpo pe-risco" aria-labelledby="pe-risco-titulo">
      <header className="pe-cartao-cabeca"><Icone nome="alvo" tamanho={24} /><h2 id="pe-risco-titulo">Mapa de risco</h2></header>
      <p className="texto-2">Assuntos que <b>mais caem</b> e em que você <b>mais erra</b>. Se tivesse só três dias, era por aqui que começaria.</p>
      {riscos.length ? (
        <ul className="pe-riscos">
          {riscos.map((r) => (
            <li key={r.area.slug + r.foco.nome}>
              <span className="pe-riscos__nivel" data-nivel={r.foco.nivel}>{r.acerto}%</span>
              <span className="pe-riscos__nome"><strong>{r.foco.nome}</strong><small>{r.area.nome} · {ROTULO_NIVEL[r.foco.nivel].toLowerCase()} · {r.respondidas} respondidas</small></span>
              <button type="button" className="botao" onClick={() => aoTreinar(r.area, r.foco)}>Treinar</button>
            </li>
          ))}
        </ul>
      ) : <p className="pe-risco__vazio"><Icone nome="certo" tamanho={16} /> Nenhum assunto muito cobrado com acerto abaixo de 65%. Ótimo sinal.</p>}
      {cegos.length > 0 && <>
        <h3 className="pe-risco__sub">Ainda não abertos</h3>
        <p className="texto-2">De prioridade máxima e sem nenhuma questão respondida:</p>
        <ul className="pe-cegos">
          {cegos.map((c) => <li key={c.area.slug + c.foco.nome}><button type="button" onClick={() => aoTreinar(c.area, c.foco)}>{c.foco.nome}<small>{c.area.nome} · {c.total} questões</small></button></li>)}
        </ul>
      </>}
    </section>
  )
}

// ─── OrtoQuestões Simulados ────────────────────────────────────────────────

export function CartaoSimulados({ plano, feitas, total, acerto, aoIncluir }: { plano: PlanoSalvo; feitas: number; total: number; acerto: number | null; aoIncluir: () => void }) {
  const incluidos = incluiSimulados(plano)
  const pct = total ? Math.round((feitas / total) * 100) : 0
  return (
    <section className="pe-simulados" aria-labelledby="pe-sim-titulo">
      <span className="pe-simulados__icone" aria-hidden="true"><IconePixel nome="simulado" tamanho={48} /></span>
      <div className="pe-simulados__texto">
        <p className="pe-aviso__selo">OrtoQuestões Simulados</p>
        <h2 id="pe-sim-titulo">Questões novas, feitas a partir das provas reais</h2>
        <p>Cada simulado nasce da <b>engenharia reversa das provas oficiais</b>: estudamos o que a banca cobra, como pergunta e o que repete, e escrevemos questões no mesmo padrão a partir da bibliografia, com comentário e citação do livro. Elas treinam o conteúdo de onde saem as próximas questões, e não só a memória das provas antigas.</p>
        <div className="pe-simulados__numeros">
          <span><b className="numerico">{feitas.toLocaleString('pt-BR')}</b> de {total.toLocaleString('pt-BR')} feitas</span>
          {acerto !== null && <span>acerto <b className="numerico">{acerto}%</b></span>}
          <span className="pe-simulados__barra" aria-hidden="true"><span style={{ width: `${Math.max(2, pct)}%` }} /></span>
        </div>
      </div>
      <div className="pe-simulados__acoes">
        {incluidos ? <p className="pe-simulados__ok"><Icone nome="certo" tamanho={15} /> Já entram no seu cronograma: de 2 a 6 por sessão.</p> : <button type="button" className="botao botao--principal" onClick={aoIncluir}>Incluir no cronograma</button>}
        <a className="botao" href={href('/treinar?simulados=1')}>Treinar só simulados</a>
      </div>
    </section>
  )
}

// ─── Como funciona ─────────────────────────────────────────────────────────

export function ComoFuncionaCompleto({ aberto, plano }: { aberto: boolean; plano: PlanoSalvo }) {
  const itens: Array<{ icone: Parameters<typeof Icone>[0]['nome']; titulo: string; texto: ReactNode }> = [
    { icone: 'grafico', titulo: 'Três passadas pelo que mais cai', texto: <>Na <b>1ª passada</b> você vê os assuntos de prioridade máxima de todas as áreas; na <b>2ª</b>, os de prioridade alta; na <b>3ª</b>, o resto. Se a rotina apertar, pelo menos o que mais cai já foi visto. As áreas com mais questões nas provas oficiais ganham mais espaço.</> },
    { icone: 'rota', titulo: 'Blocos de 3 dias, com mistura', texto: <>Cada área fica uns 3 dias em foco, e cerca de 30% de cada dia vem da próxima área da fila. Misturar fixa mais do que estudar em bloco e evita a semana inteira no mesmo tema.</> },
    { icone: 'alvo', titulo: 'Seus pontos fracos ganham reforço', texto: <>Tema em que você está abaixo da sua média recebe mais questões; assunto que você já domina (85% ou mais em 15 questões) vai para o fim da fila. O diagnóstico inicial calibra isso no primeiro dia, e acerto marcado como chute vale meio.</> },
    { icone: 'relogio', titulo: 'A meta se ajusta, com limite', texto: <>A meta de hoje é o que falta dividido pelos dias até a reta final. Atrasou, ela sobe no máximo 25%; o que não couber sai do fim da fila, a parte de prioridade mais baixa, e a projeção avisa. Folga ({plano.folgas.length ? 'marcada por você' : 'se marcar alguma'}) não tem meta; dia leve (plantão) tem poucas questões; e a semana difícil fica no dia mínimo de 10.</> },
    { icone: 'reiniciar', titulo: 'Revisão e mini-simulado', texto: <>As revisões do dia (o que você errou, chutou ou marcou com dúvida) estão na lista de hoje. A cada duas semanas, um mini-simulado de 30 questões cronometradas mistura o que você já viu. Tema estudado que fica 3 semanas sem resposta ganha um alerta para reativar.</> },
    { icone: 'bandeira', titulo: 'Reta final de duas semanas', texto: <>Sem conteúdo novo. Na <b>penúltima semana</b>, revisão forte: cada dia uma fatia da prova, com seus erros, dúvidas e os assuntos que mais caem. Na <b>última semana</b>, modo prova: simulado cronometrado, os erros que importam e o resumão. Na <b>véspera</b>, só aquecimento e descanso. Planos com menos de 6 semanas têm só a última semana.</> },
    { icone: 'fogo', titulo: 'Constância conta', texto: <>Cada dia de estudo com 10 questões ou mais (novas ou de revisão) entra na sua sequência, mesmo em dia de plantão. Folga marcada não quebra.</> },
    { icone: 'lapis', titulo: 'Intensidade e ajustes', texto: <>Leve cobre metade das questões que faltam, firme 80% e completo todas; cada uma mostra o tempo por dia com o seu ritmo. Data, folgas, dias leves, área para começar e áreas dominadas mudam quando quiser, em "Ajustar o cronograma".</> },
  ]
  return (
    <details className="cartao cartao__corpo pe-entenda" open={aberto}>
      <summary><Icone nome="interrogacao" tamanho={18} /> Como o seu cronograma funciona</summary>
      <ul className="pe-entenda__lista">
        {itens.map((i) => <li key={i.titulo}><span className="pe-entenda__icone" aria-hidden="true"><Icone nome={i.icone} tamanho={18} /></span><span><strong>{i.titulo}</strong><small>{i.texto}</small></span></li>)}
      </ul>
    </details>
  )
}
