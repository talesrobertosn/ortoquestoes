import { useMemo, useState } from 'react'
import { SITE } from '../config'
import { href } from '../util/rotas'
import { armazenamentoDisponivel, limparTudo, tamanhoArmazenado } from '../estado/armazenamento'
import { lerHistorico, lerRespondidas, usarFavoritos } from '../estado/sessao'
import { usarIndice } from '../dados/usarIndice'

export function Sobre() {
  return (
    <article className="limite-leitura empilha">
      <h1>Sobre o OrtoQuestões</h1>
      <p>
        O OrtoQuestões reúne questões de provas anteriores de TEOT e TARO em um lugar só,
        organizadas por assunto, ano e tipo de prova. Foi feito por um ortopedista para residentes
        que estudam entre plantões e cirurgias, com uma regra simples: da página inicial até a
        primeira questão respondida, no máximo dois cliques.
      </p>
      <h2>O que ele é</h2>
      <p>
        Um acervo de questões originais das provas, transcritas dos PDFs oficiais sem reescrita,
        sem resumo e sem correção do enunciado. O gabarito vem da própria prova. Questões anuladas
        ficam marcadas como anuladas e não entram no cálculo de desempenho.
      </p>
      <h2>O que ele não é</h2>
      <p>
        Não é curso, não vende nada e não pede cadastro. Não há rastreador de terceiros: seu
        progresso fica guardado apenas no seu navegador, e você pode apagá-lo quando quiser na
        página de <a href={href('/dados')}>dados locais</a>.
      </p>
      <h2>Comentários</h2>
      <p>
        Os comentários das questões estão em preparo e vão aparecendo aos poucos, escritos e
        revisados um a um. Enquanto não existem, o gabarito oficial já é mostrado.
      </p>
      <h2>Erros</h2>
      <p>
        Extração de PDF erra. Se um enunciado estiver truncado, uma figura faltando ou um gabarito
        parecer errado, use o <a href={href('/contato')}>relato de erro</a> — é o caminho mais
        rápido para corrigir.
      </p>
      <p className="texto-2">Feito por {SITE.autor}.</p>
    </article>
  )
}

export function Contato({ consulta }: { consulta: URLSearchParams }) {
  const questao = consulta.get('questao')
  const [copiado, definirCopiado] = useState(false)

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

  const assunto = encodeURIComponent(
    questao ? `OrtoQuestões — erro na questão ${questao}` : 'OrtoQuestões — relato de erro',
  )

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
      <div className="linha">
        <a className="botao botao--principal" href={`mailto:${SITE.contato}?subject=${assunto}&body=${encodeURIComponent(modelo)}`}>
          Escrever por e-mail
        </a>
        <button
          type="button"
          className="botao"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(modelo)
              definirCopiado(true)
              window.setTimeout(() => definirCopiado(false), 2500)
            } catch {
              window.prompt('Copie o modelo:', modelo)
            }
          }}
        >
          Copiar o modelo
        </button>
        {copiado && <span className="meta">Copiado.</span>}
      </div>
      <p className="texto-2">
        Endereço: <span className="numerico">{SITE.contato}</span>
      </p>
    </article>
  )
}

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const historico = useMemo(() => lerHistorico(), [])
  const marcadas = useMemo(() => lerRespondidas(), [])
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
          Contado a partir de todas as questões que você já respondeu neste navegador, não só da
          última sessão.
        </p>
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
          <span className="numeros__rotulo">favoritas</span>
        </div>
      </div>

      <section>
        <h2>Por tema</h2>
        {porTema.length === 0 ? (
          <p className="texto-2" style={{ marginTop: '0.5rem' }}>
            Ainda não há questões respondidas neste navegador. Responda uma sessão e o desempenho
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
          Tudo que o site sabe sobre você fica neste navegador, em localStorage. Nada é enviado para
          servidor nenhum, porque não existe servidor: o site é um conjunto de arquivos estáticos.
          São {(bytes / 1024).toFixed(1)} kB no total.
        </p>
      </section>

      <h2>Apagar tudo</h2>
      <p>
        Apaga favoritas, histórico de sessões, questões respondidas e a sessão em andamento. Não tem
        volta e não afeta o acervo.
      </p>
      <div className="linha">
        <button
          type="button"
          className="botao"
          onClick={() => {
            if (window.confirm('Apagar todos os dados locais do OrtoQuestões neste navegador?')) {
              limparTudo()
              definirApagado(true)
            }
          }}
        >
          Apagar todos os dados locais
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
