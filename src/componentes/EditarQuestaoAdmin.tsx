import { usarConta } from '../conta/ContextoConta'
import { usarAdministrador } from '../conta/administrador'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/** Atalho só para administradores: abre a questão no editor do painel. */
export function EditarQuestaoAdmin({ idQuestao }: { idQuestao: string }) {
  const { sessao } = usarConta()
  const admin = usarAdministrador(sessao?.user.id)
  if (!admin) return null
  return <a className="qz-rodape__link" href={href(`/admin?aba=questoes&id=${encodeURIComponent(idQuestao)}`)} target="_blank" rel="noopener noreferrer"><Icone nome="filtro" tamanho={16} /> Editar questão</a>
}
