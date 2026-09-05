import { useMemo, useState } from 'react'
import { SITE } from '../config'
import { href } from '../util/rotas'
import { Atalhos } from '../componentes/Atalhos'
import { armazenamentoDisponivel, limparTudo, tamanhoArmazenado } from '../estado/armazenamento'
import { lerHistorico, lerRespondidas, usarFavoritos } from '../estado/sessao'

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

export function ComoEstudar() {
  return (
    <article className="limite-leitura empilha">
      <h1>Como estudar com o site</h1>
      <p>
        Não existe um jeito certo, mas alguns recortes rendem mais do que outros na reta final da
        prova.
      </p>
      <h2>Um tema por vez, do começo ao fim</h2>
      <p>
        Escolha um tema na página inicial e responda tudo. O padrão é embaralhado, o que evita
        decorar a ordem da prova. Ao terminar, o resumo mostra onde o tema está fraco.
      </p>
      <h2>Simulado por ano</h2>
      <p>
        Filtre por um ano específico e desmarque o embaralhamento: a sessão sai na ordem da prova
        original. Bom para calibrar tempo por questão.
      </p>
      <h2>Blocos de 20</h2>
      <p>
        Limite a sessão a 20 questões. É um bloco que cabe num intervalo e ainda dá um resumo com
        significado estatístico razoável.
      </p>
      <h2>Refazer as erradas</h2>
      <p>
        No fim de cada sessão há um botão que monta uma sessão nova só com o que você errou. Repetir
        no dia seguinte vale mais do que responder cinquenta questões novas.
      </p>
      <h2>Riscar antes de marcar</h2>
      <p>
        Riscar as alternativas improváveis muda o desempenho em prova de múltipla escolha. Use o
        risco também aqui, com <kbd>Shift</kbd> e o número da alternativa.
      </p>
      <h2>Atalhos</h2>
      <Atalhos />
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
  const historico = useMemo(() => lerHistorico(), [])
  const respondidas = useMemo(() => Object.keys(lerRespondidas()).length, [])
  const [apagado, definirApagado] = useState(false)
  const bytes = tamanhoArmazenado()

  return (
    <article className="limite-leitura empilha">
      <h1>Dados locais</h1>
      <p>
        Tudo que o site guarda sobre você fica neste navegador, em localStorage. Nada é enviado para
        servidor nenhum, porque não existe servidor: o site é um conjunto de arquivos estáticos.
      </p>

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
          <span className="numeros__valor">{respondidas}</span>
          <span className="numeros__rotulo">questões já respondidas</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{favoritos.length}</span>
          <span className="numeros__rotulo">favoritas</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{historico.length}</span>
          <span className="numeros__rotulo">sessões no histórico</span>
        </div>
        <div className="numeros__celula">
          <span className="numeros__valor">{(bytes / 1024).toFixed(1)} kB</span>
          <span className="numeros__rotulo">guardados</span>
        </div>
      </div>

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
