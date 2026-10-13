import { Fragment } from 'react'

/**
 * Palavras-chave do jogo (no espírito de Legends of Runeterra): a mesma
 * palavra sempre quer dizer a mesma coisa, aparece destacada e mostra a regra
 * ao passar o dedo ou o mouse.
 */
export const PALAVRAS_CHAVE: Record<string, string> = {
  'Brasa': 'Fica no adversário e queima 3 por rodada, até 3 brasas. Ignora armadura e barreira.',
  'Brasas': 'Ficam no adversário e queimam 3 por rodada cada, até 3. Ignoram armadura e barreira.',
  'Barreira': 'Absorve o dano antes da vida. Gasta primeiro.',
  'Armadura': 'Desconta de cada acerto seu (o golpe causa no mínimo 5).',
  'Fúria': 'Depois de muitas rodadas, o adversário bate ×1,5.',
  'Crítico': 'Golpe mais forte. O seu: acerto difícil ou sorte. O do adversário: avisado na intenção.',
  'Sopro': 'Golpe carregado do dragão, a cada 3 rodadas, sempre avisado na intenção.',
  'Mordidas': 'O golpe vem em partes e passa pela Barreira reativa.',
  'Escudo arcano': 'Bloqueia por inteiro o próximo golpe que você levaria.',
  'Vulnerável': 'O adversário leva +25% de dano enquanto durar.',
  'Veneno': 'Dano extra a cada erro seguido.',
  'Atordoado': 'O próximo golpe do adversário não acontece.',
  'Pista': 'Elimina uma alternativa errada; o acerto conta como assistido na revisão.',
  'Raio': 'Dano extra que ignora armadura e barreira.',
  'Sequência': 'Acertos seguidos. A partir de 3, cada acerto causa +5.',
  'Desgaste': 'Quanto mais fundo, menos as curas rendem (até 35%).',
}

const PADRAO = new RegExp(`\\b(${Object.keys(PALAVRAS_CHAVE).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g')

/** Texto com as palavras-chave destacadas e com dica. */
export function ComChaves({ texto }: { texto: string }) {
  const partes = texto.split(PADRAO)
  return (
    <>
      {partes.map((p, i) => PALAVRAS_CHAVE[p]
        ? <span key={i} className="fc-chave" tabIndex={0}>{p}<span className="fc-chave__dica" role="tooltip">{PALAVRAS_CHAVE[p]}</span></span>
        : <Fragment key={i}>{p}</Fragment>)}
    </>
  )
}
