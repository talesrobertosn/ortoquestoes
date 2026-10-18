import { useEffect, useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { PLANOS, acertoAposRevisao, acertoReal, baixarCsv, corDe, corresponde, data, haQuanto, haQuantoTempo, iniciais, normalizar, rotuloPagina, somarAcertos } from './formatos'
import { href } from '../../util/rotas'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import { rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { servicoConhecido } from './servicosConhecidos'
import { usarConta } from '../../conta/ContextoConta'
import { usarRpc } from './usarRpc'
import { PLANOS_RECENTE_DIAS, ROTULOS_CATEGORIA, categoriaPessoa, indexarSinais, textoPlanos, viuPlanos, type CategoriaPessoa, type SinalUsuario } from './sinais'

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
  // Da migração 202610070100 em diante: de onde veio o cadastro (null nas contas antigas).
  origem?: { fonte?: string; meio?: string; campanha?: string; conteudo?: string; marcada?: boolean; pagina?: string; em?: string } | null
  // Da migração 202610080100 em diante: o dia de hoje e o que está aberto agora.
  respondidas_hoje?: number
  tentativas_hoje?: number
  pagina?: string | null
  questao?: string | null
  pagina_em?: string | null
  visto_em?: string | null
}

export type FiltroUsuarios = 'todos' | 'online' | 'hoje' | 'ativos' | 'novos' | 'novos_parados' | 'assinantes' | 'parados' | 'planos'
type Filtro = FiltroUsuarios
type Ordem = 'respondidas' | 'hoje' | 'acerto' | 'semana' | 'atividade' | 'cadastro' | 'planos' | 'flashcards'

const FILTROS: Array<[Filtro, string]> = [['todos', 'Todos'], ['online', 'Online agora'], ['hoje', 'Ativos hoje'], ['ativos', 'Ativos na semana'], ['novos', 'Recém-cadastrados'], ['novos_parados', 'Novos que pararam'], ['planos', 'Viu os planos'], ['assinantes', 'Assinantes'], ['parados', 'Sem respostas']]
const ORDENS: Array<[Ordem, string]> = [
  ['respondidas', 'Mais questões'], ['hoje', 'Mais questões hoje'], ['acerto', 'Maior acerto'], ['semana', 'Mais na semana'],
  ['atividade', 'Atividade mais recente'], ['cadastro', 'Cadastro mais recente'],
  ['planos', 'Viu os planos mais recentemente'], ['flashcards', 'Mais flashcards'],
]
/** Com poucas respostas o acerto oscila demais para comparar. */
const MINIMO_PARA_ACERTO = 20

const ativo7d = (u: LinhaUsuario) => u.respondidas_7d > 0
// Dia em Brasília ("2026-10-15"). Antes eram dois toLocaleDateString com fuso por chamada,
// milhares por render; agora um formatador só, o dia de cada data guardado e o "hoje" lido
// no máximo uma vez por minuto.
const FORMATO_DIA = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
const diasJaVistos = new Map<string, string>()
const diaSP = (iso: string) => {
  let dia = diasJaVistos.get(iso)
  if (dia === undefined) {
    dia = FORMATO_DIA.format(new Date(iso))
    if (diasJaVistos.size > 20_000) diasJaVistos.clear()
    diasJaVistos.set(iso, dia)
  }
  return dia
}
let hojeGuardado = { ate: 0, dia: '' }
const hojeSP = () => {
  const agora = Date.now()
  if (agora >= hojeGuardado.ate) hojeGuardado = { ate: agora + 60_000, dia: FORMATO_DIA.format(agora) }
  return hojeGuardado.dia
}
/**
 * Online agora, medido no painel (16/10/2026): o aparelho manda sinal a cada 40 s com a aba à vista;
 * sem sinal há mais de 100 s, a pessoa saiu (fechou, trocou de aba ou de app). O servidor usa 3 minutos;
 * aqui a conta é refeita a cada 10 s, então quem sai some do "ao vivo" sem esperar a próxima leitura.
 */
export const ONLINE_MS = 100_000
export const estaOnline = (u: Pick<LinhaUsuario, 'online' | 'visto_em'>, agora = Date.now()) =>
  u.visto_em ? agora - new Date(u.visto_em).getTime() < ONLINE_MS : !!u.online
export const ativoHoje = (u: LinhaUsuario) => !!u.ultima_atividade && diaSP(u.ultima_atividade) === hojeSP()
/** Cadastro nos últimos 14 dias. */
const novo = (u: LinhaUsuario) => Date.now() - new Date(u.criado_em).getTime() < 14 * 86_400_000
/** Chegou há pelo menos 2 dias, nos últimos 30, fez menos de 10 questões e não estudou nos últimos 2 dias: pede um empurrão. */
export const novoParado = (u: LinhaUsuario) => {
  const idade = Date.now() - new Date(u.criado_em).getTime()
  const parado = !u.ultima_atividade || Date.now() - new Date(u.ultima_atividade).getTime() > 2 * 86_400_000
  return idade > 2 * 86_400_000 && idade < 30 * 86_400_000 && u.respondidas < 10 && parado
}
/** Sinais da parte 25 (planos, flashcards, locais); sem a parte, o mapa fica vazio. */
type Sinais = Map<string, SinalUsuario>
const passaFiltro = (u: LinhaUsuario, f: Filtro, sinais: Sinais) => f === 'todos' || (f === 'planos' && viuPlanos(sinais.get(u.id_usuario))) || (f === 'online' && !!u.online) || (f === 'hoje' && ativoHoje(u)) || (f === 'ativos' && ativo7d(u))
  || (f === 'novos' && novo(u)) || (f === 'novos_parados' && novoParado(u)) || (f === 'assinantes' && !!u.plano_vigente) || (f === 'parados' && u.respondidas === 0)
/** O acerto que ordena e colore: o real (1ª tentativa) quando existe; senão, o após revisão. */
const acertoDe = (u: LinhaUsuario) => acertoReal(u) ?? acertoAposRevisao(u)

/**
 * Ranking privado: todas as contas (inclusive quem saiu do ranking público),
 * com total de questões, acerto e atividade. Só o administrador vê.
 */
/** Quantas contas a lista desenha de cada vez ("Mostrar mais" desenha as próximas). */
const POR_PAGINA = 50
/** Espera depois da última tecla antes de refiltrar a lista. */
const ESPERA_BUSCA_MS = 250
const hojeDe = (u: LinhaUsuario) => u.respondidas_hoje ?? (ativoHoje(u) ? null : 0)
const ORDEM_LEGENDA: CategoriaPessoa[] = ['assinante', 'comum', 'planos', 'admin']
/** Legenda discreta das cores dos cartões. */
function LegendaCores() {
  return <ul className="adm-legenda-cores" aria-label="Cores dos cartões">
    {ORDEM_LEGENDA.map(c => <li key={c}><i className={`adm-cor--${c}`} aria-hidden="true" />{ROTULOS_CATEGORIA[c]}</li>)}
  </ul>
}

/**
 * O que a pessoa está vendo agora, com link para a questão. `linha`: tudo numa linha só, cortado
 * com reticências (cartões de tamanho fixo da lista e do "Ao vivo").
 */
export function OQueVe({ u, linha = false, prefixo }: { u: Pick<LinhaUsuario, 'pagina' | 'questao' | 'pagina_em'>; linha?: boolean; prefixo?: string }) {
  if (!u.pagina) return <span className={'adm-ve adm-ve--vazio' + (linha ? ' adm-ve--linha' : '')}>{prefixo ? `${prefixo}: página` : 'Página'} ainda não registrada</span>
  if (linha) {
    const texto = `${prefixo ? `${prefixo}: ` : ''}${rotuloPagina(u.pagina)}`
    return <span className="adm-ve adm-ve--linha" title={[texto, u.questao, u.pagina_em ? haQuantoTempo(u.pagina_em) : ''].filter(Boolean).join(' · ')}>
      <Icone nome="olho" tamanho={14} />
      <span className="adm-ve__texto">{texto}{u.questao && <> · <a href={href(`/questao/${u.questao}`)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{u.questao}</a></>}</span>
      <small>{u.pagina_em ? haQuantoTempo(u.pagina_em) : ''}</small>
    </span>
  }
  return <span className="adm-ve">
    <Icone nome="olho" tamanho={14} />
    <span>{rotuloPagina(u.pagina)}{u.questao && <> · <a href={href(`/questao/${u.questao}`)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{u.questao}</a></>}</span>
    {u.pagina_em && <small>{haQuantoTempo(u.pagina_em)}</small>}
  </span>
}

/** O valor só depois de `ms` sem mudar (a busca não refiltra a lista a cada tecla). */
function usarAdiado<T>(valor: T, ms: number): T {
  const [adiado, definirAdiado] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => definirAdiado(valor), ms)
    return () => window.clearTimeout(t)
  }, [valor, ms])
  return adiado
}

/**
 * A lista vem do painel, que é o único dono de `listar_usuarios_admin` (com cache e
 * "ao vivo" a cada 15 s enquanto esta parte ou Agora está aberta e visível).
 */
export function AdminUsuarios({ usuarios, filtro: filtroUrl = 'todos', aoMudarFiltro, aoVerAgora }: { usuarios: LinhaUsuario[]; filtro?: FiltroUsuarios; aoMudarFiltro?: (filtro: FiltroUsuarios) => void; aoVerAgora?: () => void }) {
  const { sessao } = usarConta()
  // Consulta leve à parte: quem abriu os planos, flashcards e locais. Sem a parte 25 colada, fica vazia.
  const sinaisQ = usarRpc<SinalUsuario[]>(sessao?.user.id, 'sinais_usuarios_admin', {}, { atualizarCada: 60_000 })
  const sinais = useMemo(() => indexarSinais(Array.isArray(sinaisQ.dados) ? sinaisQ.dados : []), [sinaisQ.dados])
  const comSinais = Array.isArray(sinaisQ.dados)
  const [busca, definirBusca] = useState('')
  const buscaAdiada = usarAdiado(busca, ESPERA_BUSCA_MS)
  // O filtro vem do endereço (F5 e Voltar mantêm); a ordem inicial acompanha quem chegou por um atalho de Agora.
  const [filtro, definirFiltroLocal] = useState<Filtro>(filtroUrl)
  useEffect(() => { definirFiltroLocal(filtroUrl) }, [filtroUrl])
  const definirFiltro = (novo: Filtro) => { definirFiltroLocal(novo); aoMudarFiltro?.(novo); if (novo === 'planos') definirOrdem('planos') }
  const [ordem, definirOrdem] = useState<Ordem>(filtroUrl === 'novos' || filtroUrl === 'novos_parados' ? 'cadastro' : filtroUrl === 'hoje' ? 'atividade' : filtroUrl === 'planos' ? 'planos' : 'respondidas')
  const [aberto, definirAberto] = useState<LinhaUsuario | null>(null)

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(([f]) => [f, usuarios.filter(u => passaFiltro(u, f, sinais)).length])) as Record<Filtro, number>, [usuarios, sinais])

  // Os números de hoje (online, estudaram, questões, contas novas) ficam só em Agora; aqui, o somatório da lista.
  const totais = useMemo(() => {
    const soma = somarAcertos(usuarios)
    return { respondidas: usuarios.reduce((s, u) => s + u.respondidas, 0), real: acertoReal(soma), revisao: acertoAposRevisao(soma) }
  }, [usuarios])

  const visiveis = useMemo(() => {
    const termo = normalizar(buscaAdiada.trim())
    const lista = usuarios.filter(u => passaFiltro(u, filtro, sinais) && corresponde([u.nome, u.email, u.servico, servicoConhecido(u.servico, u.uf), u.cidade, sinais.get(u.id_usuario)?.locais_trabalho], termo))
    const tempo = (v: string | null) => v ? new Date(v).getTime() : 0
    const chave: Record<Ordem, (u: LinhaUsuario) => number> = {
      respondidas: u => u.respondidas,
      hoje: u => u.respondidas_hoje ?? 0,
      acerto: u => u.acertos + u.erros >= MINIMO_PARA_ACERTO ? acertoDe(u) ?? -1 : -1,
      semana: u => u.respondidas_7d,
      atividade: u => tempo(u.ultima_atividade),
      cadastro: u => tempo(u.criado_em),
      planos: u => tempo(sinais.get(u.id_usuario)?.planos_ultima ?? null),
      flashcards: u => sinais.get(u.id_usuario)?.flashcards_unicos ?? 0,
    }
    return [...lista].sort((a, b) => chave[ordem](b) - chave[ordem](a) || b.respondidas - a.respondidas)
  }, [usuarios, buscaAdiada, filtro, ordem, sinais])

  // Desenha 50 de cada vez: com centenas de cartões o celular travava. Volta a 50 quando a lista muda de critério.
  const [limite, definirLimite] = useState(POR_PAGINA)
  useEffect(() => { definirLimite(POR_PAGINA) }, [buscaAdiada, filtro, ordem])
  const desenhados = visiveis.length > limite ? visiveis.slice(0, limite) : visiveis

  const maior = useMemo(() => usuarios.reduce((m, u) => Math.max(m, u.respondidas), 1), [usuarios])

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-usuarios">
    <div className="adm-secao__cabeca">
      <div>
        <h2 id="adm-titulo-usuarios">Usuários</h2>
        <p>Ranking privado de todas as contas, inclusive de quem não aparece no ranking público. Somadas, {totais.respondidas.toLocaleString('pt-BR')} questões respondidas{totais.real !== null ? <>, com <strong>{totais.real}% de acerto real</strong> (na 1ª tentativa) e {totais.revisao}% depois da revisão</> : totais.revisao !== null && <>, com {totais.revisao}% de acerto depois da revisão</>}.</p>
      </div>
    </div>

    <LegendaCores />
    {aoVerAgora && <p className="adm-nota">Quem está online agora, o que está vendo e os números de hoje ficam em <button type="button" className="adm-link" onClick={aoVerAgora}>Agora <Icone nome="direita" tamanho={13} /></button></p>}

    <div className="adm-filtros" role="group" aria-label="Filtrar usuários">
      {FILTROS.map(([valor, rotulo]) => <button key={valor} type="button" className={'adm-chip' + (valor === 'planos' ? ' adm-chip--planos' : '')} aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{contagem[valor]}</span></button>)}
    </div>
    <div className="adm-busca">
      <label className="campo">Buscar por nome, e-mail, serviço ou cidade<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Ordenar por<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as Ordem)}>
        {ORDENS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
    </div>
    {filtro === 'novos_parados' && <p className="adm-nota adm-dica">Chegaram nas últimas semanas, fizeram menos de 10 questões e não voltaram nos últimos 2 dias. Abra a ficha e use um modelo de e-mail de retorno: um recado pessoal costuma trazer de volta.</p>}
    {filtro === 'planos' && <p className="adm-nota adm-dica">{comSinais ? `Abriram a página de planos e preços nos últimos 30 dias (o histórico de páginas guarda 30 dias). Em dourado, quem abriu nos últimos ${PLANOS_RECENTE_DIAS}. Bom momento para um recado pessoal.` : 'Para ver quem abriu a página de planos, cole no Supabase a parte 25 (supabase/colar-no-painel/sql-202610152000-parte25.sql).'}</p>}
    {ordem === 'acerto' && <p className="adm-nota">Ordenado pelo acerto real (1ª tentativa). Quem respondeu menos de {MINIMO_PARA_ACERTO} questões vai para o fim da lista: com poucas respostas o acerto ainda não diz muito.</p>}
    <div className="adm-linha-nota">
      <p className="adm-nota" role="status">{visiveis.length === usuarios.length ? `${usuarios.length} conta(s)` : `${visiveis.length} de ${usuarios.length} conta(s) neste filtro`}{desenhados.length < visiveis.length ? `, mostrando as primeiras ${desenhados.length}` : ''}. Toque numa pessoa para abrir a ficha.</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-usuarios-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Etapa', 'Provas de interesse', 'Serviço', 'Outros locais de trabalho', 'Viu os planos (30 dias)', 'Flashcards únicos', 'UF', 'Conta criada', 'Questões', 'Hoje', 'Acerto real, 1ª tentativa (%)', 'Acerto após revisão (%)', 'Na semana', 'Última atividade', 'Plano'],
        visiveis.map(u => [u.nome, u.email, u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : '', (u.provas ?? '').split(',').filter(Boolean).map(rotuloProva).join(', '), u.servico, sinais.get(u.id_usuario)?.locais_trabalho ?? '', sinais.get(u.id_usuario)?.planos_vezes || '', sinais.get(u.id_usuario)?.flashcards_unicos || '', u.uf, data(u.criado_em), u.respondidas, u.respondidas_hoje ?? '', acertoReal(u), acertoAposRevisao(u), u.respondidas_7d, u.ultima_atividade ? data(u.ultima_atividade) : '', u.plano_vigente ? PLANOS[u.plano_vigente] : '']))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>

    {visiveis.length === 0 ? <p>Ninguém neste filtro.</p> : <ol className="adm-usuarios">
      {desenhados.map((u, i) => {
        const acerto = acertoDe(u)
        const hoje = hojeDe(u)
        const sinal = sinais.get(u.id_usuario)
        const planosRecente = viuPlanos(sinal, PLANOS_RECENTE_DIAS)
        const categoria = categoriaPessoa(u, sinal)
        const perfil = [u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : null, u.servico, [u.cidade, u.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')
        const extra = [u.provas ? `Estuda para ${u.provas.split(',').map(rotuloProva).join(', ')}` : null, sinal?.locais_trabalho ? `Também em ${sinal.locais_trabalho}` : null].filter(Boolean).join(' · ')
        return <li key={u.id_usuario} className={`adm-usuario adm-usuario--clicavel adm-cor--${categoria}` + (u.online ? ' adm-usuario--online' : '')} role="button" tabIndex={0} aria-label={`Abrir ficha de ${u.nome ?? u.email ?? 'usuário'} (${ROTULOS_CATEGORIA[categoria].toLowerCase()})`}
          onClick={() => definirAberto(u)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); definirAberto(u) } }}>
          <span className="adm-usuario__lado">
            <span className="adm-avatar" style={{ background: corDe(u.id_usuario) }} aria-hidden="true">{iniciais(u)}{u.online && <span className="adm-online" />}</span>
            <span className={'adm-usuario__pos' + (i < 3 && ordem === 'respondidas' && filtro === 'todos' && !buscaAdiada ? ` adm-usuario__pos--${i + 1}` : '')}>{i + 1}º</span>
          </span>
          {/* Linhas fixas, cada uma numa linha só: o cartão não muda de tamanho quando a pessoa entra, sai ou troca de página. */}
          <div className="adm-usuario__quem">
            <strong className="adm-reticencias" title={u.nome ?? undefined}>{u.nome ?? u.email?.split('@')[0] ?? 'Sem nome'}</strong>
            <span className="adm-usuario__email adm-reticencias" title={u.email ?? undefined}>{u.email ?? 'conta sem e-mail'}</span>
            <OQueVe u={u} linha prefixo={u.online ? 'Agora' : 'Última página'} />
            <span className={'adm-usuario__info adm-reticencias' + (perfil ? '' : ' adm-usuario__info--vazia')} title={perfil || undefined}><Icone nome="bandeira" tamanho={13} />{perfil || 'Perfil não preenchido'}</span>
            <span className={'adm-usuario__info adm-reticencias' + (extra ? '' : ' adm-usuario__info--vazia')} title={extra || undefined}><Icone nome="alvo" tamanho={13} />{extra || 'Provas de interesse não informadas'}</span>
            <span className="adm-usuario__selos">
              {u.administrador && <span className="adm-selo adm-selo--admin">Administrador</span>}
              {u.plano_vigente && <span className="adm-selo adm-selo--ok">Assinante {PLANOS[u.plano_vigente]?.toLowerCase() ?? u.plano_vigente}</span>}
              {sinal && viuPlanos(sinal) && <span className={'adm-selo adm-selo--planos' + (planosRecente && !u.plano_vigente ? '' : ' adm-selo--planos-antigo')} title={`Abriu a página de planos ${sinal.planos_vezes}× nos últimos 30 dias${sinal.condicoes_ultima ? '; também abriu as Condições da Assinatura' : ''}`}><Icone nome="estrela" tamanho={12} />{textoPlanos(sinal)}</span>}
              {sinal && sinal.flashcards_unicos > 0 && <span className="adm-selo adm-selo--neutro" title={`${sinal.flashcards_7d} flashcards na semana${sinal.cripta_andar ? ` · andar ${sinal.cripta_andar} no Torneio` : ''}`}>{sinal.flashcards_unicos.toLocaleString('pt-BR')} flashcards</span>}
              <span className="adm-selo adm-selo--neutro" title={`Cadastro em ${data(u.criado_em)}`}>Conta criada {haQuanto(u.criado_em)}</span>
              {u.aparelho && <span className="adm-selo adm-selo--neutro" title="Último aparelho em que a conta entrou">{u.aparelho}</span>}
            </span>
          </div>
          <div className="adm-usuario__numeros">
            <div className="adm-usuario__placar">
              <div className={hoje ? 'adm-placar adm-placar--hoje' : 'adm-placar'}><strong className="numerico">{hoje ?? '—'}</strong><span>hoje</span></div>
              <div className="adm-placar"><strong className="numerico">{u.respondidas_7d}</strong><span>na semana</span></div>
              <div className="adm-placar"><strong className="numerico">{u.respondidas.toLocaleString('pt-BR')}</strong><span>no total</span></div>
            </div>
            <div className="adm-barra" aria-hidden="true"><span style={{ width: `${(u.respondidas / maior) * 100}%` }} /></div>
            <dl className="adm-usuario__dados">
              <div><dt>{acertoReal(u) !== null ? 'Acerto real' : 'Acerto'}</dt><dd className={acerto === null ? '' : acerto >= 70 ? 'adm-bom' : acerto < 50 ? 'adm-ruim' : ''} title={acertoReal(u) !== null ? 'Na 1ª tentativa de cada questão' : undefined}>{acerto === null ? '—' : `${acerto}%`}</dd></div>
              <div><dt>Após revisão</dt><dd title="Última resposta de cada questão: erros acertados na revisão contam como acerto">{acertoReal(u) === null || acertoAposRevisao(u) === null ? '—' : `${acertoAposRevisao(u)}%`}</dd></div>
              <div><dt>Visto pela última vez</dt><dd title={(u.visto_em ?? u.ultima_atividade) ? new Date((u.visto_em ?? u.ultima_atividade)!).toLocaleString('pt-BR') : undefined}>{u.online ? 'agora' : haQuantoTempo(u.visto_em ?? u.ultima_atividade)}</dd></div>
            </dl>
          </div>
        </li>
      })}
    </ol>}
    {desenhados.length < visiveis.length && <div className="linha">
      <button type="button" className="botao botao--fantasma" onClick={() => definirLimite(n => n + POR_PAGINA)}>
        Mostrar mais {Math.min(POR_PAGINA, visiveis.length - desenhados.length)} <small>({visiveis.length - desenhados.length} restante{visiveis.length - desenhados.length === 1 ? '' : 's'})</small>
      </button>
    </div>}
    {aberto && <AdminFichaUsuario usuario={aberto} aoFechar={() => definirAberto(null)} />}
  </section>
}
