import { lazy, Suspense, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { usarAdministrador } from '../conta/administrador'
import type { ComentarioIA, Questao } from '../dados/tipos'
import { href } from '../util/rotas'
import { Icone } from './Icone'

// Carregada só quando um administrador abre: quem estuda não baixa nada disso.
const FotoComentarioJanela = lazy(() => import('../admin/FotoComentarioJanela'))

/**
 * Atalhos só para administradores, no pé da questão: "Adicionar imagem" (no
 * comentário, rápido, sem sair da questão) e "Editar questão" (o editor completo do painel).
 */
export function EditarQuestaoAdmin({ questao, aoSalvarComentario }: { questao: Questao; aoSalvarComentario?: (c: ComentarioIA) => void }) {
  const { sessao } = usarConta()
  const admin = usarAdministrador(sessao?.user.id)
  const [foto, definirFoto] = useState(false)
  if (!admin) return null
  return <>
    <button type="button" className="qz-rodape__link" title="Cole uma imagem no comentário desta questão" onClick={() => definirFoto(true)}><Icone nome="imagem" tamanho={16} /> Adicionar imagem</button>
    <a className="qz-rodape__link" href={href(`/admin?aba=questoes&id=${encodeURIComponent(questao.id)}`)} target="_blank" rel="noopener noreferrer"><Icone nome="lapis" tamanho={16} /> Editar questão</a>
    {foto && <Suspense fallback={null}>
      <FotoComentarioJanela questao={questao} aoFechar={() => definirFoto(false)} aoSalvar={c => aoSalvarComentario?.(c)} />
    </Suspense>}
  </>
}
