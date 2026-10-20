import type { BaseResumo } from '../dados/tipos'
import { href } from '../util/rotas'

/** A indicação depende de revisão com fonte registrada; recomendação de leitura não a atribui. */
export function FonteComentario({ base }: { base?: BaseResumo }) {
  if (base?.tipo !== 'resumo' || !base.fontes.length) return null
  return (
    <aside className="cm-fonte" aria-label="Fonte do comentário">
      <strong>Comentário baseado em resumo</strong>
      {base.fontes.map((fonte) => (
        <p key={fonte.resumo}>
          {fonte.livro}, {fonte.edicao}, {fonte.capitulo}.{' '}
          <a href={href(`/resumos/${fonte.resumo}?bloco=${encodeURIComponent(fonte.blocos[0])}`)}>
            Leia o resumo: {fonte.titulo}
          </a>
          {fonte.secoes.length > 0 && <> · {fonte.secoes.join('; ')}</>}
        </p>
      ))}
    </aside>
  )
}
