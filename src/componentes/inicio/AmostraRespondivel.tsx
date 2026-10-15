import { useState } from 'react'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'

/**
 * Questão de amostra que o visitante responde ali mesmo, sem conta (proposta de 16/10/2026).
 * É a questão aprovada como referência editorial (mao-0853, UFG 2017): enunciado,
 * alternativas e gabarito iguais aos do acervo; cada porquê resume o comentário aprovado
 * (docs/exemplos/mao-0853.json). Mostra o produto em vez de descrevê-lo.
 */
const ALTERNATIVAS: Array<{ letra: string; texto: string; porque: string }> = [
  { letra: 'A', texto: 'maior espessura com maior tendência à retração.', porque: 'Ele é mais espesso e retrai mais logo após a retirada (contração primária), mas retrai menos durante a cicatrização, que é o que importa na mão.' },
  { letra: 'B', texto: 'não fechamento por primeira intenção da zona doadora.', porque: 'No enxerto total, a área doadora costuma ser fechada por sutura, justamente por primeira intenção. A frase combina com o enxerto parcial.' },
  { letra: 'C', texto: 'maior maleabilidade que o enxerto parcial, após a cicatrização.', porque: 'O enxerto total leva toda a derme, a estrutura mecânica da pele: contrai menos ao cicatrizar e acompanha a flexão dos dedos.' },
  { letra: 'D', texto: 'pele pigmentada após a cicatrização.', porque: 'Pigmentação pode acontecer, mas é variável e não exclusiva do enxerto total; não é a característica que o define.' },
]
const GABARITO = 'C'

export function AmostraRespondivel() {
  const [marcada, definirMarcada] = useState<string | null>(null)
  const respondida = marcada !== null
  const acertou = marcada === GABARITO
  const escolhida = ALTERNATIVAS.find((a) => a.letra === marcada)
  const certa = ALTERNATIVAS.find((a) => a.letra === GABARITO)!

  return (
    <figure className={`ip-amostra${respondida ? ' ip-amostra--respondida' : ''}`} aria-label="Questão de amostra para responder">
      <figcaption className="ip-amostra__topo">
        <span className="ip-amostra__selo">Experimente agora</span>
        <span className="ip-amostra__prova">UFG 2017 · Mão e punho</span>
      </figcaption>
      <p className="ip-amostra__enunciado">É uma das características do enxerto de pele total:</p>
      <ol className="ip-amostra__alternativas" role="list">
        {ALTERNATIVAS.map(({ letra, texto }) => {
          const estado = !respondida ? '' : letra === GABARITO ? ' ip-alt--certa' : letra === marcada ? ' ip-alt--errada' : ' ip-alt--apagada'
          return (
            <li key={letra}>
              <button type="button" className={`ip-alt${estado}`} disabled={respondida} aria-pressed={marcada === letra} onClick={() => definirMarcada(letra)}>
                <b>{letra}</b><span>{texto}</span>
                {respondida && letra === GABARITO && <Icone nome="certo" tamanho={16} />}
                {respondida && letra === marcada && letra !== GABARITO && <Icone nome="errado" tamanho={16} />}
              </button>
            </li>
          )
        })}
      </ol>
      {!respondida && <p className="ip-amostra__dica">Toque numa alternativa para ver a resposta comentada.</p>}
      {respondida && (
        <div className="ip-amostra__comentario" aria-live="polite">
          <p className={`ip-amostra__veredito ip-amostra__veredito--${acertou ? 'certo' : 'errado'}`}>
            {acertou ? 'Isso! A resposta é C.' : `Quase. Você marcou ${marcada}; a resposta é C.`}
          </p>
          <p><strong>Por que C:</strong> {certa.porque}</p>
          {escolhida && !acertou && <p><strong>Por que não {escolhida.letra}:</strong> {escolhida.porque}</p>}
          <div className="ip-amostra__acoes">
            <a className="botao botao--ouro" href={href('/conta?modo=criar&voltar=%2Ftreinar')}>Criar conta grátis e treinar</a>
            <a className="ip-amostra__link" href={href('/questao/mao-0853')}>Ler o comentário completo <Icone nome="direita" tamanho={14} /></a>
          </div>
        </div>
      )}
    </figure>
  )
}
