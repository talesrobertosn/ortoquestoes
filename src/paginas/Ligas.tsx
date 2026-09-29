import { useCallback, useEffect, useState } from 'react'
import { chamarRpc, chamarRpcPublica, codigoErro } from '../servicos/supabase'
import { usarPremium } from '../conta/premium'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { ConvitePremium, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'

interface MinhaLiga { id: string; nome: string; codigo: string; sou_dono: boolean; membros: number; minha_posicao: number | null; lider: string | null }
interface LinhaLiga { posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean; eh_dono: boolean; membro: string | null }
interface Previa { id: string; nome: string; membros: number; dono: string; ja_sou_membro: boolean }

const linkConvite = (codigo: string) => `${window.location.origin}${window.location.pathname}#/ligas?entrar=${codigo}`
const iniciais = (apelido: string) => {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}
const membros = (n: number) => `${n} ${n === 1 ? 'membro' : 'membros'}`

export function Ligas({ consulta }: { consulta: URLSearchParams }) {
  const codigo = consulta.get('entrar')?.toUpperCase() ?? null
  const ligaAberta = consulta.get('liga')
  if (codigo) return <EntrarLiga codigo={codigo} />
  if (ligaAberta) return <DetalheLiga id={ligaAberta} />
  return <ListaLigas />
}

function Heroi({ children }: { children?: React.ReactNode }) {
  return (
    <section className="lg-heroi">
      <div className="lg-heroi__texto">
        <p className="lg-heroi__selo"><Icone nome="grupo" tamanho={15} /> Liga da residência</p>
        <h1>O ranking do seu serviço</h1>
        <p>Crie uma liga, mande o link no grupo da residência e acompanhe quem mais estuda entre os seus colegas, no geral e na semana.</p>
      </div>
      {children}
    </section>
  )
}

function ListaLigas() {
  const { premium, logado, carregado } = usarPremium()
  const [ligas, definirLigas] = useState<MinhaLiga[] | null>(null)
  const [nome, definirNome] = useState('')
  const [erro, definirErro] = useState('')
  const [criando, definirCriando] = useState(false)

  const carregar = useCallback(() => {
    chamarRpc<MinhaLiga[]>('minhas_ligas', {}).then(definirLigas).catch(() => { definirLigas([]); definirErro('Não foi possível carregar suas ligas agora.') })
  }, [])
  useEffect(() => { if (premium) carregar() }, [premium, carregar])

  async function criar() {
    const limpo = nome.trim()
    if (limpo.length < 3 || criando) return
    definirCriando(true); definirErro('')
    try {
      const [nova] = await chamarRpc<Array<{ id: string; codigo: string }>>('criar_liga', { p_nome: limpo })
      navegar(`/ligas?liga=${nova.id}&nova=1`)
    } catch (falha) {
      definirErro(codigoErro(falha) === 'limite_ligas' ? 'Você já criou 5 ligas, o máximo por conta.' : 'Não foi possível criar a liga agora. Tente de novo.')
    } finally { definirCriando(false) }
  }

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!premium) {
    return (
      <div className="empilha-2 lg">
        <Heroi />
        <ConvitePremium
          icone="grupo"
          titulo="Estude junto com o seu serviço"
          texto={<p>A liga reúne você e os seus colegas num ranking privado. Quem entra vê a posição de cada um, quem subiu na semana e quanto falta para passar o próximo.</p>}
          itens={['Crie até 5 ligas e convide pelo link', 'Ranking geral e da semana', 'Só os membros veem a liga']}
        />
      </div>
    )
  }

  return (
    <div className="empilha-2 lg">
      <Heroi>
        <div className="lg-criar">
          <label className="campo">Nome da nova liga
            <input className="entrada" maxLength={60} placeholder="Ex.: R2 Ortopedia HC" value={nome} onChange={(e) => definirNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void criar() }} />
          </label>
          <button type="button" className="botao botao--claro" disabled={nome.trim().length < 3 || criando} onClick={criar}>{criando ? 'Criando…' : 'Criar liga'}</button>
        </div>
      </Heroi>
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      {ligas === null ? <Carregando linhas={3} rotulo="Carregando suas ligas" /> : ligas.length === 0 ? (
        <Estado titulo="Você ainda não está em nenhuma liga">
          <p>Crie a liga do seu serviço acima, ou peça o link de convite a um colega que já tenha criado.</p>
        </Estado>
      ) : (
        <ul className="lg-cartoes">
          {ligas.map((l) => (
            <li key={l.id}>
              <a className="lg-cartao" href={href(`/ligas?liga=${l.id}`)}>
                <span className="lg-cartao__avatar">{iniciais(l.nome)}</span>
                <span className="lg-cartao__corpo">
                  <strong>{l.nome}{l.sou_dono && <span className="lg-dono">criada por você</span>}</strong>
                  <small>{membros(l.membros)}{l.lider ? ` · liderança: ${l.lider}` : ''}</small>
                </span>
                <span className="lg-cartao__posicao">{l.minha_posicao ? <>#{l.minha_posicao}<small>sua posição</small></> : '—'}</span>
                <Icone nome="direita" tamanho={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EntrarLiga({ codigo }: { codigo: string }) {
  const { premium, logado, carregado } = usarPremium()
  const [previa, definirPrevia] = useState<Previa | null | undefined>(undefined)
  const [erro, definirErro] = useState('')
  const [entrando, definirEntrando] = useState(false)

  useEffect(() => {
    const chamada = logado ? chamarRpc<Previa[]>('previa_liga', { p_codigo: codigo }) : chamarRpcPublica<Previa[]>('previa_liga', { p_codigo: codigo })
    chamada.then(([p]) => definirPrevia(p ?? null)).catch(() => definirPrevia(null))
  }, [codigo, logado])

  async function entrar() {
    definirEntrando(true); definirErro('')
    try {
      const id = await chamarRpc<string>('entrar_liga', { p_codigo: codigo })
      navegar(`/ligas?liga=${id}`)
    } catch (falha) {
      const c = codigoErro(falha)
      definirErro(c === 'liga_cheia' ? 'Esta liga já tem 300 membros, o máximo.' : c === 'limite_ligas' ? 'Você já está em 20 ligas, o máximo por conta.' : c === 'premium_necessario' ? 'Entrar em ligas é exclusivo para assinantes.' : 'Não foi possível entrar agora. Tente de novo.')
    } finally { definirEntrando(false) }
  }

  // Quem já é membro e abre o convite de novo vai direto para a liga.
  useEffect(() => { if (previa?.ja_sou_membro) navegar(`/ligas?liga=${previa.id}`, true) }, [previa])

  if (previa === undefined || (logado && !carregado)) return <Carregando linhas={3} rotulo="Abrindo o convite" />
  if (previa === null) return <Estado titulo="Convite não encontrado" acoes={<a className="botao" href={href('/ligas')}>Ver minhas ligas</a>}><p>O link pode estar incompleto, ou a liga foi encerrada por quem criou.</p></Estado>
  if (previa.ja_sou_membro) return <Carregando linhas={3} rotulo="Abrindo a liga" />

  return (
    <div className="empilha-2 lg">
      <section className="lg-convite">
        <span className="lg-convite__avatar">{iniciais(previa.nome)}</span>
        <p className="lg-heroi__selo"><Icone nome="grupo" tamanho={15} /> Convite para a liga</p>
        <h1>{previa.nome}</h1>
        <p>{previa.dono} chamou você. {membros(previa.membros)} até agora.</p>
        {!logado ? (
          <a className="botao botao--claro botao--grande" href={href(`/conta?modo=entrar&voltar=${encodeURIComponent(`/ligas?entrar=${codigo}`)}`)}>Entrar para aceitar</a>
        ) : premium ? (
          <button type="button" className="botao botao--claro botao--grande" disabled={entrando} onClick={entrar}>{entrando ? 'Entrando…' : 'Entrar na liga'}</button>
        ) : null}
        {erro && <p className="lg-convite__erro" role="alert">{erro}</p>}
      </section>
      {logado && !premium && (
        <ConvitePremium
          icone="grupo"
          titulo={`Assine para entrar na ${previa.nome}`}
          texto={<p>A liga da residência é exclusiva para assinantes. Com o plano, você entra nesta liga, cria as suas e ainda leva todos os outros recursos.</p>}
          itens={['Ranking privado com os colegas', 'Simulado Nacional todo mês', 'Como a turma respondeu cada questão', 'Plano até a prova']}
        />
      )}
    </div>
  )
}

function DetalheLiga({ id }: { id: string }) {
  const { premium, logado, carregado } = usarPremium()
  const [periodo, definirPeriodo] = useState<'geral' | 'semana'>('geral')
  const [linhas, definirLinhas] = useState<LinhaLiga[] | null>(null)
  const [liga, definirLiga] = useState<MinhaLiga | null>(null)
  const [erro, definirErro] = useState('')
  const [copiado, definirCopiado] = useState(false)
  const nova = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('nova') === '1'

  const carregar = useCallback(() => {
    definirLinhas(null)
    Promise.all([chamarRpc<LinhaLiga[]>('ranking_liga', { p_liga: id, p_periodo: periodo }), chamarRpc<MinhaLiga[]>('minhas_ligas', {})])
      .then(([r, minhas]) => { definirLinhas(r); definirLiga(minhas.find((l) => l.id === id) ?? null) })
      .catch((falha) => definirErro(codigoErro(falha) === 'acesso_negado' ? 'Você não faz parte desta liga.' : codigoErro(falha) === 'premium_necessario' ? 'A liga é exclusiva para assinantes.' : 'Não foi possível carregar a liga agora.'))
  }, [id, periodo])
  useEffect(() => { if (premium) carregar() }, [premium, carregar])

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!premium) return <ListaLigas />
  if (erro) return <Estado titulo="Liga" acoes={<a className="botao" href={href('/ligas')}>Minhas ligas</a>}><p>{erro}</p></Estado>
  if (!linhas || !liga) return <Carregando linhas={5} rotulo="Carregando a liga" />

  const link = linkConvite(liga.codigo)
  async function copiar() {
    try { await navigator.clipboard.writeText(link); definirCopiado(true); window.setTimeout(() => definirCopiado(false), 2500) }
    catch { window.prompt('Copie o link de convite:', link) }
  }
  const mensagem = encodeURIComponent(`Entra na nossa liga "${liga.nome}" no OrtoQuestões e vamos ver quem estuda mais até a prova: ${link}`)
  async function sair() {
    if (!window.confirm(liga!.sou_dono ? 'Encerrar a liga para todos os membros? Não dá para desfazer.' : 'Sair desta liga?')) return
    try { await chamarRpc('sair_liga', { p_liga: id }); navegar('/ligas') } catch { definirErro('Não foi possível sair agora.') }
  }
  async function remover(linha: LinhaLiga) {
    if (!linha.membro || !window.confirm(`Remover ${linha.apelido} da liga?`)) return
    try { await chamarRpc('remover_membro_liga', { p_liga: id, p_membro: linha.membro }); carregar() } catch { definirErro('Não foi possível remover agora.') }
  }
  async function renomear() {
    const novo = window.prompt('Novo nome da liga:', liga!.nome)?.trim()
    if (!novo || novo.length < 3 || novo === liga!.nome) return
    try { await chamarRpc('renomear_liga', { p_liga: id, p_nome: novo }); carregar() } catch { definirErro('Não foi possível renomear agora.') }
  }

  const eu = linhas.find((l) => l.eh_voce)
  const acima = eu ? linhas.find((l) => l.posicao === eu.posicao - 1) : undefined
  const lider = Math.max(1, linhas[0]?.total ?? 1)

  return (
    <div className="empilha-2 lg">
      <section className="lg-heroi lg-heroi--liga">
        <div className="lg-heroi__texto">
          <p className="lg-heroi__selo"><Icone nome="grupo" tamanho={15} /> Liga da residência · {membros(liga.membros)}</p>
          <h1>{liga.nome}</h1>
          {eu && <p>{eu.posicao === 1 ? 'Você lidera a liga. Responda hoje para defender o topo.' : acima ? `Você está em #${eu.posicao}. Faltam ${Math.max(1, acima.total - eu.total + 1)} ${periodo === 'semana' ? 'questões na semana' : 'questões'} para passar ${acima.apelido}.` : `Você está em #${eu.posicao}.`}</p>}
        </div>
        <div className="lg-convidar">
          <span className="lg-convidar__rotulo">{nova ? 'Liga criada! Agora convide o seu serviço' : 'Convidar colegas'}</span>
          <div className="lg-convidar__acoes">
            <a className="botao botao--claro" href={`https://wa.me/?text=${mensagem}`} target="_blank" rel="noreferrer"><Icone nome="compartilhar" tamanho={16} /> Mandar no WhatsApp</a>
            <button type="button" className="botao lg-convidar__copiar" onClick={copiar}><Icone nome={copiado ? 'certo' : 'copiar'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar link'}</button>
          </div>
          <small>Quem entra precisa ser assinante.</small>
        </div>
      </section>

      <div className="rk-abas" role="tablist" aria-label="Período">
        {(['geral', 'semana'] as const).map((p) => <button key={p} type="button" role="tab" aria-selected={periodo === p} className="rk-aba" onClick={() => definirPeriodo(p)}>{p === 'geral' ? 'Geral' : 'Últimos 7 dias'}</button>)}
      </div>

      <ol className="rk-lista lg-lista">
        {linhas.map((l) => (
          <li key={l.posicao} className={'rk-linha' + (l.eh_voce ? ' rk-linha--voce' : '') + (l.posicao <= 3 ? ` lg-linha--${l.posicao}` : '')}>
            <span className="rk-linha__posicao numerico">{l.posicao <= 3 ? <Icone nome="trofeu" tamanho={16} /> : l.posicao}</span>
            <span className="rk-linha__avatar">{iniciais(l.apelido)}</span>
            <span className="rk-linha__nome">
              <span className="rk-linha__apelido">{l.apelido}{l.eh_voce && <span className="rk-voce">você</span>}{l.eh_dono && <span className="lg-dono">criou a liga</span>}
                {liga.sou_dono && l.membro && !l.eh_voce && <button type="button" className="lg-remover" onClick={() => remover(l)} aria-label={`Remover ${l.apelido}`} title="Remover da liga"><Icone nome="fechar" tamanho={13} /></button>}
              </span>
              <span className="rk-linha__barra" aria-hidden="true"><span style={{ width: `${Math.max(3, (l.total / lider) * 100)}%` }} /></span>
            </span>
            <span className="rk-linha__total numerico">{l.total.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ol>

      <section className="cartao cartao__corpo lg-rodape">
        <p className="texto-2"><SeloAssinante /> Conta questões diferentes respondidas, como no ranking geral. Na liga aparece o seu nome do ranking; e-mail e outros dados nunca.</p>
        <div className="linha">
          <a className="botao botao--fantasma" href={href('/ligas')}><Icone nome="esquerda" tamanho={16} /> Minhas ligas</a>
          {liga.sou_dono && <button type="button" className="botao botao--fantasma" onClick={renomear}><Icone nome="lapis" tamanho={16} /> Renomear</button>}
          <button type="button" className="botao botao--fantasma lg-sair" onClick={sair}>{liga.sou_dono ? 'Encerrar a liga' : 'Sair da liga'}</button>
        </div>
      </section>
    </div>
  )
}
