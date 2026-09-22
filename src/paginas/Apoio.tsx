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

export function Sobre() {
  return (
    <article className="limite-leitura empilha">
      <h1>O projeto OrtoQuestões</h1>
      <p>
        O OrtoQuestões é um banco de questões de ortopedia e traumatologia. Reúne questões de
        provas anteriores — TEOT, TARO, R4 do ENARE e outras — organizadas por assunto, para quem
        se prepara para o título de especialista ou para as provas da residência. Foi feito por um ortopedista
        para residentes que estudam entre plantões e cirurgias, com uma regra simples: da página
        inicial até a primeira questão respondida, no máximo dois cliques.
      </p>

      <h2>O foco é a comunidade</h2>
      <p>
        A ideia que sustenta o projeto é a de que conhecimento de prova circula melhor quando é
        compartilhado. Quem passou pelo TEOT sabe explicar a questão que caiu; quem está estudando
        agora tem a dúvida fresca. O OrtoQuestões existe para juntar as duas pontas: um lugar em
        que ortopedistas e residentes deixam registrado o que aprenderam, e onde a explicação de
        uma questão fica disponível para quem vier depois.
      </p>
      <p>
        Não é um curso e não substitui livro nem serviço. É um ponto de encontro em torno das
        questões — e cresce na medida em que as pessoas contribuem.
      </p>

      <h2>Duas fontes de comentário</h2>
      <p>
        Cada questão pode ter dois tipos de comentário, e eles não competem:
      </p>
      <ul className="lista">
        <li>
          <strong>Comentário de IA.</strong> Os comentários são produzidos com apoio de IA e publicados com referências. Quando houver revisão médica, ela será indicada explicitamente. Explica o conceito por trás da questão, por que a
          alternativa correta é correta e por que cada uma das erradas está errada. Quando há
          dúvida sobre o gabarito ou sobre uma afirmação da banca, o comentário diz isso em vez de
          inventar uma explicação segura de aparência.
        </li>
        <li>
          <strong>Comentário da comunidade.</strong> Escrito por ortopedistas e residentes que
          usam o site. É o espaço da experiência de prova: o macete que ficou, a divergência entre
          serviços, a referência que a banca costuma seguir, a correção de um gabarito que não
          fecha. Toda questão tem um botão para enviar o seu.
        </li>
      </ul>

      <h2>O acervo</h2>
      <p>
        As questões são originais das provas, transcritas dos PDFs sem reescrita, sem resumo e sem
        correção do enunciado. O gabarito vem da própria prova, ou — quando a banca não publica um
        gabarito oficial, como costuma ocorrer no TARO — de uma resposta justificada e sinalizada
        como tal. Questões anuladas ficam marcadas como anuladas e não entram no cálculo de
        desempenho.
      </p>
      <p>
        Os assuntos cobrem o programa inteiro da especialidade: mão e punho, ombro e cotovelo,
        quadril, joelho, pé e tornozelo, coluna, trauma e fraturas, tumores ósseos, ortopedia
        pediátrica, doenças osteometabólicas e conceitos básicos (biomateriais, infecção,
        consolidação óssea, metodologia científica). Você pode montar sua sessão por assunto,
        prova, ano ou dificuldade, e revisar o que errou a qualquer momento.
      </p>

      <h2>Como funciona hoje</h2>
      <p>
        O acervo inteiro está disponível para responder, e continua gratuito. Criar uma conta é
        necessário para começar: é o que garante que suas respostas, revisões e desempenho fiquem
        guardados com segurança e acompanhem você em qualquer aparelho, e não apenas neste
        navegador. No futuro pretendo cobrar uma taxa pequena para manter o projeto de pé,
        preservando um uso diário livre — a ideia é que ninguém fique sem estudar por causa disso.
        Quando isso mudar, será avisado aqui, com antecedência.
      </p>

      <h2>Seus dados</h2>
      <p>
        Respostas, revisões, favoritas, anotações e histórico ficam associados à sua conta e são
        sincronizados pelo Supabase, com acesso restrito ao titular. Você pode exportar ou apagar
        seu progresso a qualquer momento na página de <a href={href('/dados')}>desempenho</a>.
      </p>

      <h2>Erros</h2>
      <p>
        Extração de PDF erra. Se um enunciado estiver truncado, uma figura faltando ou um gabarito
        parecer errado, use o <a href={href('/contato')}>relato de erro</a> — é o caminho mais
        rápido para corrigir. Vale o mesmo princípio do acervo: uma questão com gabarito errado é
        pior do que uma questão ausente.
      </p>

      <h2>Onde acompanhar</h2>
      <p>
        O projeto tem um perfil no Instagram —{' '}
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">
          @{SITE.instagramUsuario}
        </a>{' '}
        — com questão comentada, avisos de acervo novo e o andamento do que está sendo comentado.
      </p>

      <div className="linha linha--empilha-celular">
        <a className="botao botao--principal" href={href('/conta?modo=criar')}>
          Criar minha conta
        </a>
        <a className="botao" href={href('/treinar')}>
          Montar uma sessão
        </a>
        <a className="botao" href={href('/contato')}>
          Falar com o autor
        </a>
      </div>

      <p className="texto-2">Feito por {SITE.autor}.</p>
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
