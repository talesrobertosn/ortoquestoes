import { useState } from 'react'

/**
 * Ações para enviar um texto por e-mail a partir de um site estático.
 *
 * `mailto:` sozinho não serve: quando o navegador não tem programa de e-mail
 * registrado — o caso mais comum no computador —, o clique não faz
 * absolutamente nada e o usuário fica achando que o site quebrou. Por isso a
 * ação principal aqui é copiar o texto, que funciona em qualquer lugar, e o
 * e-mail vem como caminho secundário: pelo Gmail na web, que só precisa de
 * navegador, ou pelo programa instalado, para quem tem um.
 */
export function AcoesDeEmail({
  para,
  assunto,
  corpo,
  rotuloCopiar = 'Copiar o relato',
}: {
  para: string
  assunto: string
  corpo: string
  rotuloCopiar?: string
}) {
  const [copiado, definirCopiado] = useState<'texto' | 'endereco' | null>(null)

  async function copiar(texto: string, qual: 'texto' | 'endereco') {
    try {
      await navigator.clipboard.writeText(texto)
      definirCopiado(qual)
      window.setTimeout(() => definirCopiado(null), 4000)
    } catch {
      window.prompt('Copie com Ctrl+C:', texto)
    }
  }

  const parametros = `to=${encodeURIComponent(para)}&su=${encodeURIComponent(
    assunto,
  )}&body=${encodeURIComponent(corpo)}`

  return (
    <div className="empilha">
      <div className="linha">
        <button
          type="button"
          className="botao botao--principal botao--grande"
          onClick={() => copiar(corpo, 'texto')}
        >
          {rotuloCopiar}
        </button>
        <a
          className="botao"
          href={`https://mail.google.com/mail/?view=cm&fs=1&${parametros}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir no Gmail
        </a>
        <a
          className="botao"
          href={`mailto:${para}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`}
        >
          Abrir no meu programa de e-mail
        </a>
      </div>

      {copiado === 'texto' && (
        <p className="menor" role="status">
          Copiado. Cole numa mensagem para <strong className="numerico">{para}</strong>.
        </p>
      )}

      <p className="meta">
        Endereço:{' '}
        <button
          type="button"
          className="botao botao--fantasma"
          style={{ minHeight: 'auto', padding: '0 0.25rem' }}
          onClick={() => copiar(para, 'endereco')}
        >
          <span className="numerico">{para}</span>
        </button>
        {copiado === 'endereco' && ' copiado.'}
      </p>
    </div>
  )
}
