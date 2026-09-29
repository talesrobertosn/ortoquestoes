import { useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { PLANOS, baixarCsv, corresponde, data, haQuanto, normalizar, porcentagem } from './formatos'
import { AdminFichaUsuario } from './AdminFichaUsuario'

export interface LinhaUsuario {
  id_usuario: string
  email: string | null
  nome: string | null
  criado_em: string
  ultimo_login: string | null
  ultima_atividade: string | null
  respondidas: number
  acertos: number
  erros: number
  respondidas_7d: number
  plano_vigente: string | null
  administrador: boolean
  online?: boolean
  aparelho?: string | null
}

type Filtro = 'todos' | 'online' | 'ativos' | 'assinantes' | 'parados'
type Ordem = 'respondidas' | 'acerto' | 'semana' | 'atividade' | 'cadastro'

const FILTROS: Array<[Filtro, string]> = [['todos', 'Todos'], ['online', 'Online agora'], ['ativos', 'Ativos na semana'], ['assinantes', 'Assinantes'], ['parados', 'Sem respostas']]
const ORDENS: Array<[Ordem, string]> = [
  ['respondidas', 'Mais questões'], ['acerto', 'Maior acerto'], ['semana', 'Mais na semana'],
  ['atividade', 'Atividade mais recente'], ['cadastro', 'Cadastro mais recente'],
]
/** Com poucas respostas o acerto oscila demais para comparar. */
const MINIMO_PARA_ACERTO = 20

const ativo7d = (u: LinhaUsuario) => u.respondidas_7d > 0
const acertoDe = (u: LinhaUsuario) => porcentagem(u.acertos, u.acertos + u.erros)

/**
 * Ranking privado: todas as contas (inclusive quem saiu do ranking público),
 * com total de questões, acerto e atividade. Só o administrador vê.
 */
export function AdminUsuarios({ usuarios }: { usuarios: LinhaUsuario[] }) {
  const [busca, definirBusca] = useState('')
  const [filtro, definirFiltro] = useState<Filtro>('todos')
  const [ordem, definirOrdem] = useState<Ordem>('respondidas')
  const [aberto, definirAberto] = useState<LinhaUsuario | null>(null)

  const contagem: Record<Filtro, number> = useMemo(() => ({
    todos: usuarios.length,
    online: usuarios.filter(u => u.online).length,
    ativos: usuarios.filter(ativo7d).length,
    assinantes: usuarios.filter(u => u.plano_vigente).length,
    parados: usuarios.filter(u => u.respondidas === 0).length,
  }), [usuarios])

  const totais = useMemo(() => {
    const acertos = usuarios.reduce((s, u) => s + u.acertos, 0)
    const erros = usuarios.reduce((s, u) => s + u.erros, 0)
    return { respondidas: usuarios.reduce((s, u) => s + u.respondidas, 0), acerto: porcentagem(acertos, acertos + erros) }
  }, [usuarios])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    const lista = usuarios.filter(u =>
      (filtro === 'todos' || (filtro === 'online' && !!u.online) || (filtro === 'ativos' && ativo7d(u)) || (filtro === 'assinantes' && !!u.plano_vigente) || (filtro === 'parados' && u.respondidas === 0))
      && corresponde([u.nome, u.email], termo))
    const tempo = (v: string | null) => v ? new Date(v).getTime() : 0
    const chave: Record<Ordem, (u: LinhaUsuario) => number> = {
      respondidas: u => u.respondidas,
      acerto: u => u.acertos + u.erros >= MINIMO_PARA_ACERTO ? acertoDe(u) ?? -1 : -1,
      semana: u => u.respondidas_7d,
      atividade: u => tempo(u.ultima_atividade),
      cadastro: u => tempo(u.criado_em),
    }
    return [...lista].sort((a, b) => chave[ordem](b) - chave[ordem](a) || b.respondidas - a.respondidas)
  }, [usuarios, busca, filtro, ordem])

  const maior = Math.max(1, ...usuarios.map(u => u.respondidas))

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-usuarios">
    <div className="adm-secao__cabeca">
      <div>
        <h2 id="adm-titulo-usuarios">Usuários</h2>
        <p>Ranking privado de todas as contas, inclusive de quem não aparece no ranking público. Somadas, {totais.respondidas.toLocaleString('pt-BR')} questões respondidas{totais.acerto !== null && <>, com {totais.acerto}% de acerto geral</>}.</p>
      </div>
    </div>

    <div className="adm-filtros" role="group" aria-label="Filtrar usuários">
      {FILTROS.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{contagem[valor]}</span></button>)}
    </div>
    <div className="adm-busca">
      <label className="campo">Buscar por nome ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Ordenar por<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as Ordem)}>
        {ORDENS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
    </div>
    {ordem === 'acerto' && <p className="adm-nota">Quem respondeu menos de {MINIMO_PARA_ACERTO} questões vai para o fim da lista: com poucas respostas o acerto ainda não diz muito.</p>}
    <div className="adm-linha-nota">
      <p className="adm-nota" role="status">Mostrando {visiveis.length} de {usuarios.length} conta(s). Toque numa pessoa para abrir a ficha.</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Conta criada', 'Questões', 'Acerto (%)', 'Na semana', 'Última atividade', 'Plano'],
        visiveis.map(u => [u.nome, u.email, data(u.criado_em), u.respondidas, acertoDe(u), u.respondidas_7d, u.ultima_atividade ? data(u.ultima_atividade) : '', u.plano_vigente ? PLANOS[u.plano_vigente] : '']))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>

    {visiveis.length === 0 ? <p>Ninguém neste filtro.</p> : <ol className="adm-usuarios">
      {visiveis.map((u, i) => {
        const acerto = acertoDe(u)
        return <li key={u.id_usuario} className="adm-usuario adm-usuario--clicavel" role="button" tabIndex={0} aria-label={`Abrir ficha de ${u.nome ?? u.email ?? 'usuário'}`}
          onClick={() => definirAberto(u)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); definirAberto(u) } }}>
          <span className={'adm-usuario__pos' + (i < 3 && ordem === 'respondidas' && filtro === 'todos' && !busca ? ` adm-usuario__pos--${i + 1}` : '')}>{i + 1}</span>
          <div className="adm-usuario__quem">
            <strong>{u.online && <span className="adm-online" title="Online agora" aria-label="Online agora" />}{u.nome ?? u.email?.split('@')[0] ?? 'Sem nome'}</strong>
            <span className="adm-usuario__email">{u.email ?? 'conta sem e-mail'}</span>
            <span className="adm-usuario__selos">
              {u.plano_vigente && <span className="adm-selo adm-selo--ok">Assinante {PLANOS[u.plano_vigente]?.toLowerCase() ?? u.plano_vigente}</span>}
              {u.administrador && <span className="adm-selo">Administrador</span>}
              <span className="adm-selo adm-selo--neutro" title={`Cadastro em ${data(u.criado_em)}`}>Conta criada {haQuanto(u.criado_em)}</span>
              {u.aparelho && <span className="adm-selo adm-selo--neutro" title="Último aparelho em que a conta entrou">{u.aparelho}</span>}
            </span>
          </div>
          <div className="adm-usuario__numeros">
            <div className="adm-usuario__total"><strong className="numerico">{u.respondidas.toLocaleString('pt-BR')}</strong><span>questões</span></div>
            <div className="adm-barra" aria-hidden="true"><span style={{ width: `${(u.respondidas / maior) * 100}%` }} /></div>
            <dl className="adm-usuario__dados">
              <div><dt>Acerto</dt><dd className={acerto === null ? '' : acerto >= 70 ? 'adm-bom' : acerto < 50 ? 'adm-ruim' : ''}>{acerto === null ? '—' : `${acerto}%`}</dd></div>
              <div><dt>Na semana</dt><dd>{u.respondidas_7d}</dd></div>
              <div><dt>Última atividade</dt><dd title={u.ultima_atividade ? new Date(u.ultima_atividade).toLocaleString('pt-BR') : undefined}>{haQuanto(u.ultima_atividade)}</dd></div>
            </dl>
          </div>
        </li>
      })}
    </ol>}
    {aberto && <AdminFichaUsuario usuario={aberto} aoFechar={() => definirAberto(null)} />}
  </section>
}
