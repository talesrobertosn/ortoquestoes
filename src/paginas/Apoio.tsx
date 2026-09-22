import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { Icone } from '../componentes/Icone'
import { useMemo, useState } from 'react'
import { SITE } from '../config'
import { href } from '../util/rotas'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { armazenamentoDisponivel, tamanhoArmazenado } from '../estado/armazenamento'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarIndice } from '../dados/usarIndice'
import { conquistaAtual, proximaConquista } from '../estado/conquistas'
import { Medalha } from '../componentes/Medalha'
import { chaveDia, inicioDia } from '../estado/planoRevisao'

const BIBLIOGRAFIA = [
  "Campbell's Operative Orthopaedics",
  'Rockwood and Green: Fractures in Adults',
  "Tachdjian's Pediatric Orthopaedics",
  'Lovell and Winter: Pediatric Orthopaedics',
  "Green's Operative Hand Surgery",
  'The Adult Hip',
  'Hebert: Ortopedia e Traumatologia',
  'Classificação de tumores da OMS',
  'AO Surgery Reference',
  'POSNA Study Guide',
]

const TEMAS_ACERVO = ['Mão e punho', 'Ombro e cotovelo', 'Quadril', 'Joelho', 'Pé e tornozelo', 'Coluna', 'Trauma adulto', 'Tumores ósseos', 'Ortopedia pediátrica', 'Osteometabólicas', 'Conceitos básicos']

export function Sobre() {
  const { indice } = usarIndice()
  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])
  return (
    <article className="empilha-2 pj">
      <section className="pj-heroi">
        <p className="pj-heroi__selo">O projeto</p>
        <h1>Questões de ortopedia comentadas, feitas por quem vive a especialidade.</h1>
        <p className="pj-heroi__lide">
          O OrtoQuestões reúne questões de provas anteriores (TEOT, TARO, R4 do ENARE e outras),
          organizadas por assunto, para quem se prepara para o título de especialista ou para a
          residência. Foi criado por um ortopedista para residentes que estudam entre plantões e
          cirurgias: da página inicial até a primeira questão, no máximo dois cliques.
        </p>
        {indice && (
          <dl className="pj-heroi__numeros">
            <div><dt>Questões</dt><dd>{indice.total.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Comentadas</dt><dd>{comentadas.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Temas</dt><dd>{indice.temas.length}</dd></div>
            <div><dt>Provas</dt><dd>{(indice.provas ?? []).filter((p) => !['TEOT', 'TARO'].includes(p)).length}</dd></div>
          </dl>
        )}
      </section>

      <section className="pj-secao">
        <header className="pj-secao__cabeca">
          <p className="meta">OS COMENTÁRIOS</p>
          <h2>Como cada comentário é construído</h2>
          <p>Todo comentário segue o mesmo roteiro: o conceito por trás da questão, por que a alternativa correta está certa e por que cada uma das outras está errada.</p>
        </header>
        <ol className="pj-passos">
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="livro" tamanho={22} /></span>
            <h3>Bibliografia de referência</h3>
            <p>A base é a literatura que as bancas cobram: os tratados clássicos da ortopedia, as classificações oficiais e os guias das sociedades.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="raio" tamanho={22} /></span>
            <h3>Redação com apoio de IA</h3>
            <p>A inteligência artificial pode ser usada para organizar e redigir a explicação a partir dessas fontes. Ela é ferramenta de escrita, não a fonte do conteúdo.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="alvo" tamanho={22} /></span>
            <h3>Fontes à vista e correção contínua</h3>
            <p>Quando o comentário cita fontes específicas, elas aparecem no fim, com livro e capítulo. Se o gabarito da banca parece errado, o comentário avisa. Erro relatado é corrigido.</p>
          </li>
        </ol>
        <div className="pj-biblio">
          <p className="pj-biblio__titulo">Algumas das obras citadas nos comentários</p>
          <ul>{BIBLIOGRAFIA.map((livro) => <li key={livro}>{livro}</li>)}</ul>
        </div>
        <p className="pj-nota">
          <Icone nome="alerta" tamanho={16} />
          <span>Comentário de questão é material de estudo e não substitui o livro nem a conduta do seu serviço. Quando uma questão passar por revisão médica individual, isso aparece indicado nela.</span>
        </p>
      </section>

      <div className="pj-duas">
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="usuario" tamanho={20} /></span>
          <h2>Comentários da comunidade</h2>
          <p>
            Conhecimento de prova circula melhor quando é compartilhado. Quem passou pelo TEOT sabe
            explicar a questão que caiu; quem está estudando agora tem a dúvida fresca. Toda questão
            tem um botão para você enviar o seu comentário: o macete que ficou, a divergência entre
            serviços, a referência que a banca costuma seguir. Ele é conferido e publicado com o
            seu crédito.
          </p>
        </section>
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="mapa" tamanho={20} /></span>
          <h2>O acervo</h2>
          <p>
            As questões são transcritas das provas sem reescrita nem correção do enunciado. O
            gabarito vem da própria prova ou, quando a banca não publica um oficial, de uma resposta
            justificada e sinalizada como tal. Anuladas ficam marcadas e não contam no desempenho.
          </p>
          <ul className="pj-temas">{TEMAS_ACERVO.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>

      <div className="pj-tres">
        <section className="pj-cartao">
          <h2>Como funciona hoje</h2>
          <p>
            O acervo inteiro está disponível para responder. A conta guarda suas respostas, revisões
            e desempenho em qualquer aparelho. No futuro pretendo cobrar uma taxa pequena para manter
            o projeto de pé, preservando um uso diário livre. Qualquer mudança será avisada aqui, com
            antecedência.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Seus dados</h2>
          <p>
            Respostas, revisões, favoritas, anotações e histórico ficam na sua conta, sincronizados
            pelo Supabase com acesso restrito a você. Exporte ou zere seu progresso quando quiser em{' '}
            <a href={href('/dados')}>Desempenho</a>.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Achou um erro?</h2>
          <p>
            Extração de PDF erra. Enunciado truncado, figura faltando ou gabarito estranho: use o{' '}
            <a href={href('/contato')}>relato de erro</a>. Uma questão com gabarito errado é pior do
            que uma questão ausente.
          </p>
        </section>
      </div>

      <section className="pj-final">
        <div>
          <h2>Bora estudar?</h2>
          <p>
            Acompanhe também no Instagram,{' '}
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">@{SITE.instagramUsuario}</a>,
            com questão comentada e avisos de acervo novo. Feito por {SITE.autor}.
          </p>
        </div>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--claro" href={href('/treinar')}>Montar uma sessão</a>
          <a className="botao botao--vidro" href={href('/contato')}>Falar com o autor</a>
        </div>
      </section>
    </article>
  )
}

export function Contato({ consulta }: { consulta: URLSearchParams }) {
  const questao = consulta.get('questao')

  const modelo = useMemo(
    () =>
      [
        `Questão: ${questao ?? '(identificador da questão)'}`,
        'Problema: (enunciado truncado, figura faltando, gabarito divergente, outro)',
        'O que eu esperava: ',
        '',
      ].join('\n'),
    [questao],
  )

  const assunto = questao
    ? `OrtoQuestões — erro na questão ${questao}`
    : 'OrtoQuestões — relato de erro'

  return (
    <article className="limite-leitura empilha">
      <h1>Relatar erro</h1>
      <p>
        Erro em questão é o tipo de coisa que precisa ser corrigida rápido. Quanto mais específico o
        relato, mais rápido a correção entra no ar.
      </p>
      {questao && (
        <p>
          Você está relatando a questão <span className="numerico">{questao}</span>.
        </p>
      )}
      <h2>Modelo do relato</h2>
      <pre
        className="cartao"
        style={{
          padding: '1rem',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--fonte-dados)',
          fontSize: 'var(--corpo-menor)',
          margin: 0,
        }}
      >
        {modelo}
      </pre>
      <AcoesDeEmail para={SITE.contato} assunto={assunto} corpo={modelo} />

      <p className="texto-2">
        Prefere mandar por mensagem? O projeto também está no Instagram, em{' '}
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">
          @{SITE.instagramUsuario}
        </a>
        .
      </p>


    </article>
  )
}

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const { sessao: conta, status: statusSync, sincronizar, reiniciarProgresso } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const respondidas = Object.keys(marcadas).length
  const [apagado, definirApagado] = useState(false)
  const [reinicioPendente] = usarArmazenado<string | null>('reinicio:pendente', null)
  const bytes = tamanhoArmazenado()

  // Desempenho acumulado por tema: cruza as questões já respondidas neste
  // navegador com o tema de cada uma, que vem do índice do acervo.
  const porTema = useMemo(() => {
    if (!indice) return []
    const temaPorId = new Map<string, { nome: string; slug: string }>()
    for (const item of indice.questoes) {
      const tema = indice.temas[item.t]
      if (tema) temaPorId.set(item.id, { nome: tema.nome, slug: tema.slug })
    }
    const soma = new Map<string, { certas: number; total: number; slug: string }>()
    for (const [id, registro] of Object.entries(marcadas)) {
      if (registro.c === null) continue
      const tema = temaPorId.get(id)
      if (!tema) continue
      const nome = tema.nome
      const atual = soma.get(nome) ?? { certas: 0, total: 0, slug: tema.slug }
      atual.total++
      if (registro.c) atual.certas++
      soma.set(nome, atual)
    }
    return [...soma.entries()]
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.total - a.total)
  }, [indice, marcadas])

  const totalCertas = porTema.reduce((n, t) => n + t.certas, 0)
  const totalContadas = porTema.reduce((n, t) => n + t.total, 0)
  const errosTotais = Object.values(marcadas).reduce((n, registro) => n + (registro.erros ?? (registro.c === false ? 1 : 0)), 0)
  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const percentualGeral = totalContadas > 0 ? totalCertas / totalContadas : null
  const incertas = Object.values(marcadas).filter(registro => registro.confianca === 'duvida' || registro.confianca === 'chute').length
  const minhaConquista = conquistaAtual(respondidas)
  const proximaConquistaAlvo = proximaConquista(respondidas)
  const porConfianca = useMemo(() => {
    const grupos = { seguro: { certas: 0, total: 0 }, duvida: { certas: 0, total: 0 }, chute: { certas: 0, total: 0 } }
    for (const registro of Object.values(marcadas)) {
      const eventos = registro.historico?.length ? registro.historico : [{ correta: registro.c, confianca: registro.confianca ?? 'seguro' as const }]
      for (const evento of eventos) {
        if (evento.correta === null) continue
        const grupo = grupos[evento.confianca]
        grupo.total++
        if (evento.correta) grupo.certas++
      }
    }
    return grupos
  }, [marcadas])
  const atividade = useMemo(() => {
    const porDia = new Map<string, { total: number; certas: number }>()
    for (const registro of Object.values(marcadas)) {
      const eventos = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c }] : []
      for (const evento of eventos) {
        const chave = chaveDia(evento.em)
        const atual = porDia.get(chave) ?? { total: 0, certas: 0 }
        atual.total++
        if (evento.correta) atual.certas++
        porDia.set(chave, atual)
      }
    }
    const hoje = inicioDia()
    return Array.from({ length: 28 }, (_, i) => {
      const dia = hoje - (27 - i) * 86400000
      return { dia, ...(porDia.get(chaveDia(dia)) ?? { total: 0, certas: 0 }) }
    })
  }, [marcadas])
  const maiorDia = Math.max(1, ...atividade.map((d) => d.total))
  const diasAtivos = atividade.filter((d) => d.total > 0).length
  const questoesMes = atividade.reduce((n, d) => n + d.total, 0)
  const avaliados = porTema.filter((t) => t.total >= 5)
  const temaForte = [...avaliados].sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const temaFragil = [...avaliados].sort((a, b) => a.certas / a.total - b.certas / b.total)[0]
  const mensagemDesempenho = percentualGeral === null
    ? 'Vamos começar e construir seu histórico.'
    : percentualGeral >= 0.8
      ? 'Mandou muito bem! Desempenho excelente. Continue nesse ritmo.'
      : percentualGeral >= 0.6
        ? 'Você está no caminho certo. Mais algumas revisões vão fazer essa porcentagem subir.'
        : percentualGeral >= 0.4
          ? 'Há espaço para melhorar. Revise as questões que errou e tente novamente.'
          : 'Atenção redobrada agora: revise com calma os temas mais difíceis e reforce a base.'

  const pct = percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const perimetro = 2 * Math.PI * 52
  const faixa = (p: number) => (p >= 70 ? 'bom' : p >= 50 ? 'medio' : 'baixo')
  return (
    <article className="empilha-2 dp">
      <section className="dp-heroi">
        <div className="dp-heroi__texto">
          <p className="dp-heroi__selo"><Icone nome="grafico" tamanho={16} /> Seu desempenho</p>
          <h1>{nome ? `Olha seu desempenho, ${nome}` : 'Seu desempenho'}</h1>
          <p>{mensagemDesempenho}</p>
          {conta && (
            <p className="dp-heroi__sync" role="status">
              <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
              {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.estado === 'salvo' ? 'Progresso sincronizado' : statusSync.pendentes ? `${statusSync.pendentes} alteração(ões) aguardando envio` : 'Progresso salvo neste dispositivo'}
              {statusSync.estado !== 'sincronizando' && <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>}
            </p>
          )}
        </div>
        <div className="dp-anel" aria-label={pct === null ? 'Sem respostas ainda' : `${pct}% de acerto no total`}>
          <svg viewBox="0 0 120 120" width="168" height="168" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#ffe3a3" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${((pct ?? 0) / 100) * perimetro} ${perimetro}`} transform="rotate(-90 60 60)" />
          </svg>
          <span className="dp-anel__valor"><strong>{pct === null ? '0%' : `${pct}%`}</strong><small>de acerto</small></span>
        </div>
        <dl className="dp-heroi__numeros">
          <div><dt>Respondidas</dt><dd>{respondidas.toLocaleString('pt-BR')}{minhaConquista && <span className="medalha-inline"><Medalha conquista={minhaConquista} tamanho={20} titulo={`Emblema ${minhaConquista.rotulo}`} /></span>}</dd></div>
          <div><dt>Sessões</dt><dd>{historico.length}</dd></div>
          <div><dt>Erros acumulados</dt><dd>{errosTotais}</dd></div>
          <div><dt>Favoritas</dt><dd><a href={href('/favoritas')}>{favoritos.length}</a></dd></div>
        </dl>
      </section>

      {!conta && <p className="aviso-ia">Crie uma conta gratuita para salvar seu desempenho, revisões e histórico e acompanhar sua evolução em qualquer dispositivo. <a href={href('/conta')}>Criar minha conta</a></p>}
      {conta && !armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e bloqueio de cookies costumam ser a causa.</p>
        </div>
      )}

      <div className="dp-duas">
        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca">
            <div><h2>Últimas 4 semanas</h2><p className="texto-2">{questoesMes} {questoesMes === 1 ? 'resposta' : 'respostas'} em {diasAtivos} {diasAtivos === 1 ? 'dia ativo' : 'dias ativos'}</p></div>
          </div>
          <div className="dp-barras" role="img" aria-label={`Atividade diária: ${questoesMes} respostas em 28 dias`}>
            {atividade.map((d) => (
              <span key={d.dia} className="dp-barras__dia" title={`${new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}: ${d.total} ${d.total === 1 ? 'resposta' : 'respostas'}${d.total ? `, ${Math.round((d.certas / d.total) * 100)}% de acerto` : ''}`}>
                <span className="dp-barras__barra" style={{ height: `${d.total ? Math.max(6, (d.total / maiorDia) * 100) : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="dp-barras__eixo"><span>há 4 semanas</span><span>hoje</span></div>
        </section>

        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca"><div><h2>Pontos de atenção</h2><p className="texto-2">Temas com pelo menos 5 respostas.</p></div></div>
          {temaForte && temaFragil && temaForte.nome !== temaFragil.nome ? (
            <div className="dp-destaques">
              <a className="dp-destaque dp-destaque--bom" href={href(`/treinar?temas=${temaForte.slug}&limite=10`)}>
                <small>Ponto forte</small>
                <strong>{temaForte.nome}</strong>
                <span>{Math.round((temaForte.certas / temaForte.total) * 100)}% de acerto</span>
              </a>
              <a className="dp-destaque dp-destaque--baixo" href={href(`/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`)}>
                <small>Para reforçar</small>
                <strong>{temaFragil.nome}</strong>
                <span>{Math.round((temaFragil.certas / temaFragil.total) * 100)}% de acerto · refazer erros</span>
              </a>
            </div>
          ) : <p className="texto-2">Responda mais algumas questões em temas diferentes para ver seu ponto forte e o que reforçar.</p>}
        </section>
      </div>

      {(porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0) && <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca">
          <div>
            <h2>Sua sensação combina com o resultado?</h2>
            <p className="texto-2">Acerto separado pelo que você marcou ao responder. Chute volta em 1 dia, dúvida em 3, certeza em 10. <a href={href('/revisao')}>Ver a escada completa</a></p>
          </div>
        </div>
        <div className="dp-confianca">
          {([['seguro', 'Certeza', 'certo'], ['duvida', 'Dúvida', 'olho'], ['chute', 'Chute', 'interrogacao']] as const).map(([tipo, rotulo, icone]) => {
            const grupo = porConfianca[tipo]
            const p = grupo.total ? Math.round((grupo.certas / grupo.total) * 100) : 0
            return <div className="dp-confianca__linha" key={tipo}>
              <span className="dp-confianca__rotulo"><Icone nome={icone} tamanho={16} /> {rotulo}</span>
              <span className="dp-confianca__trilho"><span className={`dp-faixa--${faixa(p)}`} style={{ width: `${grupo.total ? Math.max(3, p) : 0}%` }} /></span>
              <span className="dp-confianca__valor"><strong>{grupo.total ? `${p}%` : '–'}</strong> <small>{grupo.total} {grupo.total === 1 ? 'resposta' : 'respostas'}</small></span>
            </div>
          })}
        </div>
        {incertas > 0 && <a className="botao botao--principal" href={href('/treinar?situacao=incertas&limite=20')}>Refazer {incertas} {incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}</a>}
      </section>}

      <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca">
          <div><h2>Por tema</h2><p className="texto-2">Toque em um tema para treinar só ele.</p></div>
          {proximaConquistaAlvo && <a className="dp-emblema" href={href('/ranking')}>Faltam {proximaConquistaAlvo.minimo - respondidas} questões para {proximaConquistaAlvo.rotulo}</a>}
        </div>
        {porTema.length === 0 ? (
          <p className="texto-2">Ainda não há questões respondidas nesta conta. Responda uma sessão e o desempenho por tema aparece aqui.</p>
        ) : (
          <ul className="dp-temas">
            {porTema.map((tema) => {
              const percentual = Math.round((tema.certas / tema.total) * 100)
              return (
                <li key={tema.nome}>
                  <a className="dp-tema" href={href(`/treinar?temas=${tema.slug}&limite=10`)}>
                    <span className="dp-tema__nome">{tema.nome}</span>
                    <span className={`dp-tema__pct dp-texto--${faixa(percentual)}`}>{percentual}%</span>
                    <span className="dp-tema__trilho"><span className={`dp-faixa--${faixa(percentual)}`} style={{ width: `${percentual}%` }} /></span>
                    <span className="dp-tema__meta">{tema.certas} de {tema.total} certas</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {conta && <p className="meta dp-guardado">Seu progresso fica salvo e sincronizado com a sua conta ({(bytes / 1024).toFixed(1)} kB neste perfil). <a href={href('/conta')}>Minha conta</a></p>}

      <BackupProgresso />

      {conta && <section className="zona-risco cartao__corpo empilha">
        <p className="meta"><Icone nome="alerta" tamanho={15} /> ZONA DE RISCO</p>
        <h2>Começar do zero</h2>
        <p className="texto-2">Zera respostas, revisões, favoritas, anotações, histórico e sessão em andamento. Sua conta e preferências são mantidas. Os registros anteriores ficam fora do progresso ativo, sem exclusão definitiva do banco. Exporte um backup antes se quiser guardar uma cópia.</p>
        <div className="linha">
          <button
            type="button"
            className="botao botao--perigo"
            disabled={!!reinicioPendente}
            onClick={() => {
              if (window.confirm('Começar do zero nesta conta? Respostas, revisões, favoritas, anotações e histórico deixarão de contar. O reinício será sincronizado com seus outros dispositivos.')) {
                reiniciarProgresso()
                definirApagado(true)
              }
            }}
          >
            {reinicioPendente ? 'Sincronizando reinício…' : 'Zerar meu progresso'}
          </button>
          {reinicioPendente && <button type="button" className="botao botao--fantasma" onClick={sincronizar}>Tentar sincronizar agora</button>}
        </div>
        {(apagado || reinicioPendente) && <span className="meta" role="status">{reinicioPendente ? 'Progresso zerado neste navegador. O reinício na conta está pendente de sincronização; você já pode estudar.' : 'Reinício sincronizado. Seu novo progresso já está valendo.'}</span>}
      </section>}
    </article>
  )
}

export function NaoEncontrada() {
  return (
    <article className="limite-leitura empilha">
      <h1>Página não encontrada</h1>
      <p>O endereço digitado não existe no site.</p>
      <div className="linha">
        <a className="botao botao--principal" href={href('/')}>
          Ir para o início
        </a>
        <a className="botao" href={href('/treinar')}>
          Montar uma sessão
        </a>
      </div>
    </article>
  )
}
