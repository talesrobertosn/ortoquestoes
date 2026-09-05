import { useState } from 'react'
import { SITE } from '../config'
import type { Questao } from '../dados/tipos'
import { href } from '../util/rotas'
import { usarArmazenado } from '../estado/usarArmazenado'
import { Painel } from './Painel'
import { Icone } from './Icone'
import { AcoesDeEmail } from './AcoesDeEmail'

interface Identificacao {
  nome: string
  especialidade: string
  subespecialidade: string
  centro: string
}

const VAZIA: Identificacao = { nome: '', especialidade: '', subespecialidade: '', centro: '' }

/**
 * Envio de comentário da comunidade.
 *
 * O site é estático e sem cadastro, então não existe formulário que grave em
 * servidor. O caminho é o e-mail: o formulário monta a mensagem já estruturada
 * e abre o programa de e-mail do colega, onde ele anexa os prints do livro.
 * A identificação fica guardada neste navegador para não ser redigitada.
 */
export function ContribuirComentario({ questao }: { questao: Questao }) {
  const [aberto, definirAberto] = useState(false)
  const [identificacao, definirIdentificacao] = usarArmazenado<Identificacao>(
    'identificacao',
    VAZIA,
  )
  const [texto, definirTexto] = useState('')
  const [referencia, definirReferencia] = useState('')

  const alternativaCorreta = questao.alternativas.find((a) => a.letra === questao.gabarito)
  const podeEnviar = texto.trim().length >= 20 && identificacao.nome.trim().length >= 2

  const assunto = `OrtoQuestões — comentário da questão ${questao.id}`

  function corpoDoEmail(): string {
    const link = window.location.href.split('#')[0] + href(`/questao/${questao.id}`)
    return [
      `Questão: ${questao.id}`,
      `Link: ${link}`,
      `Gabarito: ${questao.gabarito ?? '—'}${alternativaCorreta ? ` (${alternativaCorreta.texto})` : ''}`,
      '',
      `Enunciado: ${questao.enunciado.slice(0, 300)}${questao.enunciado.length > 300 ? '…' : ''}`,
      '',
      '--- COMENTÁRIO ---',
      texto.trim(),
      '',
      referencia.trim() ? `Referência: ${referencia.trim()}` : 'Referência: (não informada)',
      '',
      '--- CRÉDITO ---',
      `Nome: ${identificacao.nome.trim()}`,
      `Especialidade: ${identificacao.especialidade.trim() || '(não informada)'}`,
      `Subespecialidade: ${identificacao.subespecialidade.trim() || '(não informada)'}`,
      `Centro: ${identificacao.centro.trim() || '(não informado)'}`,
      '',
      'Se houver print do livro ou imagem, anexe a esta mensagem antes de enviar.',
    ].join('\n')
  }

  return (
    <>
      <button
        type="button"
        className="botao botao--fantasma nao-imprime"
        onClick={() => definirAberto(true)}
      >
        <Icone nome="link" tamanho={16} />
        Comentar esta questão
      </button>

      <Painel
        titulo="Comentar esta questão"
        aberto={aberto}
        aoFechar={() => definirAberto(false)}
      >
        <form className="empilha" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <p className="menor texto-2">
            Justifique a resposta e assine. O comentário é conferido e publicado com o seu crédito.
            Print de livro ajuda muito: você anexa no seu programa de e-mail, na mensagem que este
            formulário abre pronta.
          </p>

          <label className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Comentário</span>
            <textarea
              className="entrada"
              name="comentario"
              autoComplete="off"
              rows={7}
              style={{ padding: '0.625rem 0.75rem', minHeight: 'auto', resize: 'vertical' }}
              placeholder="Por que a alternativa correta é essa, e por que as outras não são."
              value={texto}
              onChange={(e) => definirTexto(e.target.value)}
            />
            <span className="campo__auxilio">
              {texto.trim().length < 20
                ? `Faltam ${20 - texto.trim().length} caracteres.`
                : `${texto.trim().length} caracteres.`}
            </span>
          </label>

          <label className="campo" style={{ marginBottom: 0 }}>
            <span className="campo__rotulo">Referência</span>
            <input
              className="entrada"
              name="referencia"
              autoComplete="off"
              placeholder="Tachdjian, 6ª ed., p. 412"
              value={referencia}
              onChange={(e) => definirReferencia(e.target.value)}
            />
          </label>

          <fieldset style={{ border: 'var(--borda)', borderRadius: 'var(--raio)', padding: '0.875rem' }}>
            <legend className="campo__rotulo" style={{ padding: '0 0.375rem' }}>
              COMO VOCÊ QUER SER CREDITADO
            </legend>
            <label className="campo" style={{ marginBottom: '0.625rem' }}>
              <span className="campo__rotulo">Nome</span>
              <input
                className="entrada"
                name="nome"
                autoComplete="name"
                value={identificacao.nome}
                onChange={(e) => definirIdentificacao({ ...identificacao, nome: e.target.value })}
              />
            </label>
            <label className="campo" style={{ marginBottom: '0.625rem' }}>
              <span className="campo__rotulo">Especialidade</span>
              <input
                className="entrada"
                name="especialidade"
                autoComplete="off"
                placeholder="Ortopedia e Traumatologia"
                value={identificacao.especialidade}
                onChange={(e) =>
                  definirIdentificacao({ ...identificacao, especialidade: e.target.value })
                }
              />
            </label>
            <label className="campo" style={{ marginBottom: '0.625rem' }}>
              <span className="campo__rotulo">Subespecialidade</span>
              <input
                className="entrada"
                name="subespecialidade"
                autoComplete="off"
                placeholder="Ortopedia pediátrica"
                value={identificacao.subespecialidade}
                onChange={(e) =>
                  definirIdentificacao({ ...identificacao, subespecialidade: e.target.value })
                }
              />
            </label>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span className="campo__rotulo">Centro onde trabalha</span>
              <input
                className="entrada"
                name="centro"
                autoComplete="organization"
                placeholder="Hospital, cidade"
                value={identificacao.centro}
                onChange={(e) => definirIdentificacao({ ...identificacao, centro: e.target.value })}
              />
            </label>
            <p className="campo__auxilio">
              Fica guardado só neste navegador, para você não redigitar na próxima questão.
            </p>
          </fieldset>

          {podeEnviar ? (
            <AcoesDeEmail
              para={SITE.contato}
              assunto={assunto}
              corpo={corpoDoEmail()}
              rotuloCopiar="Copiar o comentário"
            />
          ) : (
            <button type="button" className="botao botao--largo botao--grande" disabled>
              Escreva o comentário e assine
            </button>
          )}
        </form>
      </Painel>
    </>
  )
}
