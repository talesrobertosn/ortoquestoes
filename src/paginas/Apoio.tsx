import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { Icone } from '../componentes/Icone'
import { useMemo, useState } from 'react'
import { SITE, recurso } from '../config'
import { href } from '../util/rotas'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { armazenamentoDisponivel, tamanhoArmazenado } from '../estado/armazenamento'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarIndice } from '../dados/usarIndice'
import { conquistaAtual, proximaConquista } from '../estado/conquistas'

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

      <p>
        Há também uma <a href={recurso('questoes/')}>coleção de questões comentadas por assunto</a>,
        em páginas abertas que podem ser lidas e compartilhadas sem entrar no site.
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
    const temaPorId = new Map<string, string>()
    for (const item of indice.questoes) {
      const tema = indice.temas[item.t]
      if (tema) temaPorId.set(item.id, tema.nome)
    }
    const soma = new Map<string, { certas: number; total: number }>()
    for (const [id, registro] of Object.entries(marcadas)) {
      if (registro.c === null) continue
      const nome = temaPorId.get(id)
      if (!nome) continue
      const atual = soma.get(nome) ?? { certas: 0, total: 0 }
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
  const mensagemDesempenho = percentualGeral === null
    ? 'Vamos começar e construir seu histórico.'
    : percentualGeral >= 0.8
      ? 'Mandou muito bem! Seu desempenho está excelente — continue nesse ritmo.'
      : percentualGeral >= 0.6
        ? 'Você está no caminho certo. Mais algumas revisões vão fazer essa porcentagem subir.'
        : percentualGeral >= 0.4
          ? 'Há espaço para melhorar. Revise as questões que errou e tente novamente.'
          : 'Atenção redobrada agora: revise com calma os temas mais difíceis e reforce a base.'

  return (
    <article className="empilha-2">
      <header className="limite-leitura">
        <h1>{nome ? `Olha seu desempenho, ${nome}` : 'Seu desempenho'}</h1>
        <p style={{ marginTop: '0.5rem' }} className="texto-2">
          Contado a partir de todas as questões que você já respondeu nesta conta, não só da
          última sessão ou deste dispositivo.
        </p>
        {nome && <p className="heroi__nota">{mensagemDesempenho}</p>}
        {!conta && <p className="aviso-ia">Crie uma conta gratuita para salvar seu desempenho, revisões e histórico e acompanhar sua evolução em qualquer dispositivo. <a href={href('/conta')}>Criar minha conta</a></p>}
        {conta && (
          <p className="meta status-sincronia" role="status" style={{ marginTop: '0.75rem' }}>
            <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
            {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.estado === 'salvo' ? 'Progresso sincronizado' : statusSync.pendentes ? `${statusSync.pendentes} alteração(ões) aguardando envio` : 'Progresso salvo neste dispositivo'}
            {statusSync.estado !== 'sincronizando' && (
              <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>
            )}
          </p>
        )}
      </header>

      {conta && !armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>
            O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e
            bloqueio de cookies costumam ser a causa.
          </p>
        </div>
      )}

      <section className="cartao cartao__corpo">
        <p className="meta">RESUMO GERAL</p>
        <div className="numeros numeros--destaque">
          <div className="numeros__celula">
            <span className="numeros__valor">
              {totalContadas > 0 ? `${Math.round((totalCertas / totalContadas) * 100)}%` : '—'}
            </span>
            <span className="numeros__rotulo">de acerto no total</span>
          </div>
          <div className="numeros__celula">
            <span className="numeros__valor">{respondidas}{minhaConquista && <span title={minhaConquista.rotulo}> {minhaConquista.emoji}</span>}</span>
            <span className="numeros__rotulo">questões respondidas</span>
          </div>
          <div className="numeros__celula">
            <span className="numeros__valor">{historico.length}</span>
            <span className="numeros__rotulo">sessões concluídas</span>
          </div>
        </div>
        <div className="numeros-apoio">
          <span>{errosTotais} {errosTotais === 1 ? 'erro acumulado' : 'erros acumulados'}</span>
          <a href={href('/favoritas')}>{favoritos.length} {favoritos.length === 1 ? 'favorita' : 'favoritas'}</a>
          {conta && <a href={href('/ranking')}>ver ranking</a>}
        </div>
        {proximaConquistaAlvo && <p className="meta" style={{ marginTop: '0.5rem' }}>Faltam {proximaConquistaAlvo.minimo - respondidas} questões para o emblema {proximaConquistaAlvo.emoji} {proximaConquistaAlvo.rotulo}.</p>}
      </section>

      {(porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0) && <section className="cartao cartao__corpo">
        <p className="meta">ACERTO POR CONFIANÇA</p>
        <h2>Sua sensação combina com o resultado?</h2>
        <p className="texto-2" style={{ marginTop: '0.25rem' }}>Use isso para identificar quando vale revisar mesmo depois de acertar. Cada faixa também tem um ciclo próprio: chute volta em 1 dia, dúvida em 2, certeza em 3 — <a href={href('/revisao')}>veja a escada completa</a>.</p>
        <div className="numeros" style={{ marginTop: '0.75rem' }}>
          {([['seguro', 'Quando tinha certeza'], ['duvida', 'Quando tinha dúvida'], ['chute', 'Quando foi chute']] as const).map(([tipo, rotulo]) => {
            const grupo = porConfianca[tipo]
            return <div className="numeros__celula" key={tipo}><span className="numeros__valor">{grupo.total ? `${Math.round((grupo.certas / grupo.total) * 100)}%` : '—'}</span><span className="numeros__rotulo">{rotulo} · {grupo.total} {grupo.total === 1 ? 'resposta' : 'respostas'}</span></div>
          })}
        </div>
        {incertas > 0 && <div className="linha" style={{ marginTop: '0.75rem' }}><a className="botao botao--principal" href={href('/treinar?situacao=incertas&limite=20')}>Refazer {incertas} {incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}</a></div>}
      </section>}

      <section>
        <h2>Por tema</h2>
        {porTema.length === 0 ? (
          <p className="texto-2" style={{ marginTop: '0.5rem' }}>
            Ainda não há questões respondidas nesta conta. Responda uma sessão e o desempenho
            por tema aparece aqui.
          </p>
        ) : (
          <ul className="distribuicao" style={{ marginTop: '0.75rem' }}>
            {porTema.map((tema) => {
              const percentual = Math.round((tema.certas / tema.total) * 100)
              return (
                <li className="distribuicao__item" key={tema.nome}>
                  <div className="distribuicao__link" style={{ cursor: 'default' }}>
                    <span>{tema.nome}</span>
                    <span className="distribuicao__quantidade">
                      {tema.certas}/{tema.total} · {percentual}%
                    </span>
                    <span className="distribuicao__trilho">
                      <span
                        className="distribuicao__parte"
                        style={{
                          width: `${percentual}%`,
                          background: percentual >= 60 ? 'var(--acerto)' : 'var(--erro)',
                          opacity: 0.75,
                        }}
                      />
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {conta && <section className="limite-leitura">
        <h2>Onde isso fica guardado</h2>
        <p>
          Seu progresso é salvo com segurança e sincronizado com sua conta no Supabase. São {(bytes / 1024).toFixed(1)} kB guardados neste perfil. <a href={href('/conta')}>Minha conta</a>
        </p>
      </section>}

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
