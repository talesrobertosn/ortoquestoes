import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { useMemo, useState } from 'react'
import { SITE, recurso } from '../config'
import { href } from '../util/rotas'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { armazenamentoDisponivel, gravar, limparTudo, tamanhoArmazenado } from '../estado/armazenamento'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarIndice } from '../dados/usarIndice'
import { supabase } from '../conta/supabase'
import { estadoVazio } from '../conta/modeloSync'

export function Sobre() {
  return (
    <article className="limite-leitura empilha">
      <h1>O projeto OrtoQuestões</h1>
      <p>
        O OrtoQuestões é um banco de questões de ortopedia e traumatologia. Reúne questões de
        provas anteriores — TEOT, TARO e outras — organizadas por assunto, para quem se prepara
        para o título de especialista ou para as provas da residência. Foi feito por um ortopedista
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
        correção do enunciado. O gabarito vem da própria prova. Questões anuladas ficam marcadas
        como anuladas e não entram no cálculo de desempenho.
      </p>
      <p>
        Os assuntos cobrem o programa inteiro da especialidade: mão e punho, ombro e cotovelo,
        quadril, joelho, pé e tornozelo, coluna, trauma e fraturas, tumores ósseos, ortopedia
        pediátrica, doenças osteometabólicas e conceitos básicos (biomateriais, infecção,
        consolidação óssea, metodologia científica). A identificação individual de prova e ano ainda está em conferência. Os filtros por prova, ano e dificuldade só aparecem quando há dados disponíveis. Você já pode escolher assuntos e revisar as questões que errou.
      </p>

      <p>
        Há também uma <a href={recurso('questoes/')}>coleção de questões comentadas por assunto</a>,
        em páginas abertas que podem ser lidas e compartilhadas sem entrar no site.
      </p>

      <p>
        O acervo é comentado aos poucos, e o andamento é público: a{' '}
        <a href={href('/progresso')}>página de progresso</a> mostra quanto já tem comentário de IA
        e quanto já tem comentário da comunidade, tema por tema.
      </p>

      <h2>Como funciona hoje, e o que vem depois</h2>
      <p>
        Hoje o site é aberto e o acervo inteiro está disponível para responder. No futuro pretendo
        cobrar uma taxa pequena para manter o projeto de pé, preservando um uso diário livre — a
        ideia é que ninguém fique sem estudar por causa disso. Quando isso mudar, será avisado
        aqui, com antecedência.
      </p>

      <h2>Seus dados</h2>
      <p>
        Sem conta, o progresso fica apenas neste navegador. Ao entrar, respostas, revisões, favoritas, anotações e histórico podem ser sincronizados pelo Supabase, com acesso restrito ao titular da conta. Você pode exportar ou apagar seu progresso na página de{' '}
        <a href={href('/dados')}>dados locais</a>.
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
        <a className="botao botao--principal" href={href('/treinar')}>
          Montar uma sessão
        </a>
        <a className="botao" href={href('/contato')}>
          Falar com o autor
        </a>
        <a
          className="botao"
          href={SITE.instagram}
          target="_blank"
          rel="noopener noreferrer me"
        >
          Seguir no Instagram
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
  const { sessao: conta, status: statusSync, sincronizar } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const respondidas = Object.keys(marcadas).length
  const [apagado, definirApagado] = useState(false)
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

  return (
    <article className="empilha-2">
      <header className="limite-leitura">
        <h1>Seu desempenho</h1>
        <p style={{ marginTop: '0.5rem' }} className="texto-2">
          Contado a partir de todas as questões que você já respondeu nesta conta, não só da
          última sessão ou deste dispositivo.
        </p>
        {conta && <div className="linha" style={{ marginTop: '0.75rem' }}><button className="botao" type="button" onClick={sincronizar} disabled={statusSync.estado === 'sincronizando'}>{statusSync.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar progresso'}</button><span className="meta" role="status">{statusSync.estado === 'salvo' ? 'Tudo atualizado entre seus dispositivos.' : statusSync.pendentes ? `${statusSync.pendentes} alteração(ões) aguardando envio.` : ''}</span></div>}
      </header>

      {!armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>
            O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e
            bloqueio de cookies costumam ser a causa.
          </p>
        </div>
      )}

      <div className="numeros">
        <div className="numeros__celula">
          <span className="numeros__valor">
            {totalContadas > 0 ? `${Math.round((totalCertas / totalContadas) * 100)}%` : '—'}
          </span>
          <span className="numeros__rotulo">de acerto no total</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{respondidas}</span>
          <span className="numeros__rotulo">questões respondidas</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{historico.length}</span>
          <span className="numeros__rotulo">sessões concluídas</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{favoritos.length}</span>
          <span className="numeros__rotulo">
            <a href={href('/favoritas')}>favoritas</a>
          </span>
        </div>
      </div>

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

      <section className="limite-leitura">
        <h2>Onde isso fica guardado</h2>
        <p>
          {conta ? 'Seu progresso é salvo neste navegador e sincronizado com sua conta no Supabase.' : 'Sem conta, o progresso fica apenas neste navegador. Com uma conta, você pode sincronizá-lo entre dispositivos.'} São {(bytes / 1024).toFixed(1)} kB guardados neste perfil local. <a href={href('/conta')}>Minha conta</a>
        </p>
      </section>

      <BackupProgresso />

      <h2>Apagar tudo</h2>
      <p>
        Apaga favoritas, histórico de sessões, questões respondidas, revisões, anotações e a sessão em andamento deste perfil. {conta && 'A exclusão também será sincronizada com sua conta.'} Exporte um backup antes se quiser guardar uma cópia. Não afeta o acervo.
      </p>
      <div className="linha">
        <button
          type="button"
          className="botao"
          onClick={async () => {
            if (window.confirm(conta ? 'Apagar o progresso desta conta? A exclusão de respostas, notas, favoritas e histórico também será sincronizada com os outros dispositivos.' : 'Apagar todos os dados de visitante do OrtoQuestões neste navegador?')) {
              if (conta && supabase) {
                const { error } = await supabase.rpc('apagar_progresso')
                if (error) { window.alert('Não foi possível apagar o progresso da conta. Tente novamente com conexão.'); return }
                limparTudo('nuvem')
                gravar('sincronia:v1', estadoVazio(), 'nuvem')
              } else limparTudo()
              definirApagado(true)
            }
          }}
        >
          {conta ? 'Apagar meu progresso da conta' : 'Apagar progresso deste navegador'}
        </button>
        {apagado && <span className="meta">Apagado. Recarregue a página para ver o site zerado.</span>}
      </div>
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
