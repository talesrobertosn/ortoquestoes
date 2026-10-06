import { useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { PLANOS, acertoAposRevisao, acertoReal, baixarCsv, corresponde, data, haQuanto, normalizar, somarAcertos } from './formatos'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import { rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { servicoConhecido } from './servicosConhecidos'

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
  // Da migração 202610031200 em diante.
  situacao?: string | null
  servico?: string | null
  cidade?: string | null
  uf?: string | null
  // Da migração 202610060100 em diante.
  ano_residencia?: string | null
  /** Provas de interesse separadas por vírgula (taro,teot,mao,r4,atualizacao). */
  provas?: string | null
  // Da migração 202610060400 em diante: primeira resposta e todas as tentativas.
  acertos_primeira?: number | null
  erros_primeira?: number | null
  acertos_tentativas?: number | null
  erros_tentativas?: number | null
}

export type FiltroUsuarios = 'todos' | 'online' | 'hoje' | 'ativos' | 'novos' | 'novos_parados' | 'assinantes' | 'parados'
type Filtro = FiltroUsuarios
type Ordem = 'respondidas' | 'acerto' | 'semana' | 'atividade' | 'cadastro'

const FILTROS: Array<[Filtro, string]> = [['todos', 'Todos'], ['online', 'Online agora'], ['hoje', 'Ativos hoje'], ['ativos', 'Ativos na semana'], ['novos', 'Recém-cadastrados'], ['novos_parados', 'Novos que pararam'], ['assinantes', 'Assinantes'], ['parados', 'Sem respostas']]
const ORDENS: Array<[Ordem, string]> = [
  ['respondidas', 'Mais questões'], ['acerto', 'Maior acerto'], ['semana', 'Mais na semana'],
  ['atividade', 'Atividade mais recente'], ['cadastro', 'Cadastro mais recente'],
]
/** Com poucas respostas o acerto oscila demais para comparar. */
const MINIMO_PARA_ACERTO = 20

const ativo7d = (u: LinhaUsuario) => u.respondidas_7d > 0
const diaSP = (d: Date | string) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
export const ativoHoje = (u: LinhaUsuario) => !!u.ultima_atividade && diaSP(u.ultima_atividade) === diaSP(new Date())
/** Cadastro nos últimos 14 dias. */
const novo = (u: LinhaUsuario) => Date.now() - new Date(u.criado_em).getTime() < 14 * 86_400_000
/** Chegou há pelo menos 2 dias, nos últimos 30, fez menos de 10 questões e não estudou nos últimos 2 dias: pede um empurrão. */
const novoParado = (u: LinhaUsuario) => {
  const idade = Date.now() - new Date(u.criado_em).getTime()
  const parado = !u.ultima_atividade || Date.now() - new Date(u.ultima_atividade).getTime() > 2 * 86_400_000
  return idade > 2 * 86_400_000 && idade < 30 * 86_400_000 && u.respondidas < 10 && parado
}
const passaFiltro = (u: LinhaUsuario, f: Filtro) => f === 'todos' || (f === 'online' && !!u.online) || (f === 'hoje' && ativoHoje(u)) || (f === 'ativos' && ativo7d(u))
  || (f === 'novos' && novo(u)) || (f === 'novos_parados' && novoParado(u)) || (f === 'assinantes' && !!u.plano_vigente) || (f === 'parados' && u.respondidas === 0)
/** O acerto que ordena e colore: o real (1ª tentativa) quando existe; senão, o após revisão. */
const acertoDe = (u: LinhaUsuario) => acertoReal(u) ?? acertoAposRevisao(u)

/**
 * Ranking privado: todas as contas (inclusive quem saiu do ranking público),
 * com total de questões, acerto e atividade. Só o administrador vê.
 */
export function AdminUsuarios({ usuarios, filtroInicial = 'todos' }: { usuarios: LinhaUsuario[]; filtroInicial?: FiltroUsuarios }) {
  const [busca, definirBusca] = useState('')
  const [filtro, definirFiltro] = useState<Filtro>(filtroInicial)
  const [ordem, definirOrdem] = useState<Ordem>(filtroInicial === 'novos' || filtroInicial === 'novos_parados' ? 'cadastro' : filtroInicial === 'hoje' ? 'atividade' : 'respondidas')
  const [aberto, definirAberto] = useState<LinhaUsuario | null>(null)

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(([f]) => [f, usuarios.filter(u => passaFiltro(u, f)).length])) as Record<Filtro, number>, [usuarios])

  const totais = useMemo(() => {
    const soma = somarAcertos(usuarios)
    return { respondidas: usuarios.reduce((s, u) => s + u.respondidas, 0), real: acertoReal(soma), revisao: acertoAposRevisao(soma) }
  }, [usuarios])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    const lista = usuarios.filter(u => passaFiltro(u, filtro) && corresponde([u.nome, u.email, u.servico, servicoConhecido(u.servico, u.uf), u.cidade], termo))
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
        <p>Ranking privado de todas as contas, inclusive de quem não aparece no ranking público. Somadas, {totais.respondidas.toLocaleString('pt-BR')} questões respondidas{totais.real !== null ? <>, com <strong>{totais.real}% de acerto real</strong> (na 1ª tentativa) e {totais.revisao}% depois da revisão</> : totais.revisao !== null && <>, com {totais.revisao}% de acerto depois da revisão</>}.</p>
      </div>
    </div>

    <div className="adm-filtros" role="group" aria-label="Filtrar usuários">
      {FILTROS.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{contagem[valor]}</span></button>)}
    </div>
    <div className="adm-busca">
      <label className="campo">Buscar por nome, e-mail, serviço ou cidade<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Ordenar por<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as Ordem)}>
        {ORDENS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
    </div>
    {filtro === 'novos_parados' && <p className="adm-nota adm-dica">Chegaram nas últimas semanas, fizeram menos de 10 questões e não voltaram nos últimos 2 dias. Abra a ficha e use um modelo de e-mail de retorno: um recado pessoal costuma trazer de volta.</p>}
    {ordem === 'acerto' && <p className="adm-nota">Ordenado pelo acerto real (1ª tentativa). Quem respondeu menos de {MINIMO_PARA_ACERTO} questões vai para o fim da lista: com poucas respostas o acerto ainda não diz muito.</p>}
    <div className="adm-linha-nota">
      <p className="adm-nota" role="status">Mostrando {visiveis.length} de {usuarios.length} conta(s). Toque numa pessoa para abrir a ficha.</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Etapa', 'Provas de interesse', 'Serviço', 'UF', 'Conta criada', 'Questões', 'Acerto real, 1ª tentativa (%)', 'Acerto após revisão (%)', 'Na semana', 'Última atividade', 'Plano'],
        visiveis.map(u => [u.nome, u.email, u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : '', (u.provas ?? '').split(',').filter(Boolean).map(rotuloProva).join(', '), u.servico, u.uf, data(u.criado_em), u.respondidas, acertoReal(u), acertoAposRevisao(u), u.respondidas_7d, u.ultima_atividade ? data(u.ultima_atividade) : '', u.plano_vigente ? PLANOS[u.plano_vigente] : '']))}>
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
            {(u.situacao || u.servico || u.cidade) && <span className="adm-usuario__servico"><Icone nome="bandeira" tamanho={13} />{[u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : null, u.servico, [u.cidade, u.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}</span>}
            {u.provas && <span className="adm-usuario__servico"><Icone nome="alvo" tamanho={13} />Estuda para {u.provas.split(',').map(rotuloProva).join(', ')}</span>}
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
              <div><dt>{acertoReal(u) !== null ? 'Acerto real' : 'Acerto'}</dt><dd className={acerto === null ? '' : acerto >= 70 ? 'adm-bom' : acerto < 50 ? 'adm-ruim' : ''} title={acertoReal(u) !== null ? 'Na 1ª tentativa de cada questão' : undefined}>{acerto === null ? '—' : `${acerto}%`}</dd></div>
              {acertoReal(u) !== null && <div><dt>Após revisão</dt><dd title="Última resposta de cada questão: erros acertados na revisão contam como acerto">{acertoAposRevisao(u) === null ? '—' : `${acertoAposRevisao(u)}%`}</dd></div>}
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
