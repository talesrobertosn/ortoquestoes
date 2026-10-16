import type { ClienteSupabase } from './supabase'
import { EVENTO_DADOS, gravar, ler, limparTudo, usuarioLocal, type MudancaDados } from '../estado/armazenamento'
import { deItens, ehTipoSync, estadoVazio, identificador, itens, receberDocumento, registrarAlteracoes, resolverConflito, TIPOS_SYNC, type Alteracao, type Documento, type EstadoSync, type TipoSync } from './modeloSync'
import { gerarId } from '../util/id'

/** A função `sincronizar_progresso` não existe neste banco (migração ainda não colada). */
function rpcAusente(erro: { code?: string; message?: string } | null, status?: number): boolean {
  if (!erro) return false
  return status === 404 || erro.code === 'PGRST202' || erro.code === '42883' || /could not find the function/i.test(erro.message ?? '')
}

/**
 * Só um erro do próprio dado (formato que o banco recusa) tira um item da fila.
 * Rede, servidor fora do ar, prazo esgotado e sessão vencida ou ainda sendo
 * renovada (401/403, "JWT expired", "permission denied") passam: o item fica
 * na fila e sobe na próxima tentativa. Antes, um 401 durante a renovação do
 * login mandava respostas boas para "itens não enviados", e elas nunca
 * chegavam aos outros aparelhos.
 */
const CODIGOS_DE_DADO = new Set(['23514', '22P02', '22023', '23502', '22003', '22001', '54000', '23505'])
const MENSAGENS_DE_DADO = /alteração incompleta|versão inválida|versão inicial inválida|lote inválido/i
export function erroDeDado(erro: unknown, status?: number): boolean {
  const e = erro as { code?: string; message?: string } | null
  if (status !== undefined && (status === 0 || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500)) return false
  if (/jwt|token|permission denied|autentica|not authorized|unauthorized/i.test(e?.message ?? '')) return false
  return CODIGOS_DE_DADO.has(e?.code ?? '') || MENSAGENS_DE_DADO.test(e?.message ?? '')
}
/** Recusas antigas que não eram culpa do item (sessão, rede): voltam para a fila sozinhas. */
const RECUSA_PASSAGEIRA = /jwt|token|permission denied|autentica|not authorized|unauthorized|fetch|network|abort|tempo esgotado|demorou|timeout|\b40[13]\b|42501|PGRST30/i
/** Item sem linha no servidor enviado com base diferente de zero: reenvia como item novo. */
const versaoInicialInvalida = (erro: unknown) => /versão inicial inválida/i.test((erro as { message?: string } | null)?.message ?? '')

/** Linhas por página na leitura (igual ao limite que a função aceita sem cortar). */
const PAGINA = 500
/** Com a leitura incremental, a conferência completa vira rede de segurança rara. */
const RECONCILIAR_A_CADA = 30 * 60_000
/** Intervalo com a aba visível. Trocar de aba ou de aparelho já sincroniza na hora. */
const INTERVALO = 30_000
/** Nenhum pedido segura a fila: passado o prazo, conta como falha de rede e tenta de novo. */
const PRAZO = 30_000
/** Foco, visibilidade e "voltou a página" chegam juntos: um ciclo basta. */
const INTERVALO_MINIMO = 1_500

class Prazo extends Error { status = 0; transitorio = true }
function comPrazo<T>(pedido: PromiseLike<T>, ms = PRAZO): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const limite = new Promise<never>((_, rejeitar) => { temporizador = setTimeout(() => rejeitar(new Prazo('O servidor demorou a responder (tempo esgotado)')), ms) })
  return Promise.race([Promise.resolve(pedido), limite]).finally(() => clearTimeout(temporizador))
}

export interface StatusSync {
  estado: 'sincronizando' | 'salvo' | 'offline' | 'erro' | 'conflito'
  pendentes: number
  conflitos: Documento[]
  pronto: boolean
  detalhe?: string
  rejeitados: { id: string; tipo: TipoSync; item: string; erro: string; em: number }[]
  /** Fim do último ciclo completo (enviou e recebeu), no relógio deste aparelho: só para o "sincronizado há X". */
  ultimaSincronia?: number
}
/** Somente uma fila por conta/aba. Operações são idempotentes e conflitos nunca sobrescrevem dados silenciosamente. */
/** Ajustes para os testes (prazo curto de cada pedido e intervalo); o site usa os padrões. */
export interface OpcoesSincronizacao { prazo?: number; intervalo?: number }
export function iniciarSincronizacao(cliente: ClienteSupabase, idUsuario: string, notificar: (s: StatusSync) => void, opcoes: OpcoesSincronizacao = {}) {
  const prazo = opcoes.prazo ?? PRAZO
  let estado = ler<EstadoSync>('sincronia:v1', estadoVazio())
  let ativo = true, executando = false, pronto = false
  let ultimaSincronia = ler<number>('sincronia:ultima', 0) || undefined
  let falhasSeguidas = 0
  let ultimoInicio = 0
  // Quem pediu para esperar (cronograma antes de montar a sessão): resolve no fim
  // do primeiro ciclo que começar depois do pedido.
  let ciclosIniciados = 0
  let esperas: { depoisDe: number; pronto: () => void }[] = []
  const conhecidos = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  // Leitura incremental (parte 24 do SQL): só as linhas com versão acima do
  // cursor. A primeira leitura de cada sessão, a volta do offline e uma vez a
  // cada RECONCILIAR_A_CADA releem tudo, como antes.
  let leituraIncremental = true
  let reconciliar = true
  let ultimaCompleta = 0
  const valido = () => ativo && usuarioLocal() === idUsuario
  const salvar = () => { if (valido()) gravar('sincronia:v1', estado, 'nuvem') }
  let detalhe: string | undefined
  const anunciar = (s: StatusSync['estado']) => {
    if (valido()) notificar({ estado: s, pendentes: Object.keys(estado.pendentes).length, conflitos: Object.values(estado.conflitos), pronto, detalhe: s === 'erro' || s === 'offline' ? detalhe : undefined, rejeitados: Object.entries(estado.rejeitados ?? {}).map(([id, r]) => ({ id, tipo: r.tipo, item: r.item, erro: r.erro, em: r.em })), ultimaSincronia })
  }
  const descrever = (erro: unknown) => {
    const e = erro as { message?: string; code?: string; details?: string; hint?: string; name?: string } | null
    return [e?.code, e?.message ?? (erro instanceof Error ? erro.message : String(erro)), e?.details, e?.hint].filter(Boolean).join(' · ').slice(0, 300)
  }
  const prefixar = (p: Alteracao) => ({ ...p, item: estado.reinicio ? `r${estado.reinicio}:${p.item}` : p.item })
  /** Envia um lote; o caminho direto (RLS) fica só para banco sem a função. */
  async function enviar(lote: Alteracao[]): Promise<{ docs: Documento[] } | { erro: unknown; transitorio?: boolean }> {
    const remotas = lote.map(prefixar)
    let resposta: { data: unknown; error: { code?: string; message?: string } | null; status: number }
    try { resposta = await comPrazo(cliente.rpc('sincronizar_progresso', { alteracoes: remotas }), prazo) } catch (erro) { return { erro, transitorio: true } }
    const { data, error, status } = resposta
    if (!error) return { docs: (data ?? []) as Documento[] }
    // A gravação direta não confere a versão e apagaria o que outro aparelho
    // salvou. Ela só serve para bancos que ainda não têm a função instalada.
    if (!rpcAusente(error, status)) return { erro: error, transitorio: !erroDeDado(error, status) }
    const linhas = remotas.map(p => ({ usuario_id: idUsuario, tipo: p.tipo, item: p.item, valor: p.valor, operacao: p.operacao }))
    let direto: { data: unknown; error: { code?: string; message?: string } | null; status: number }
    try { direto = await comPrazo(cliente.from('progresso_usuario').upsert(linhas, { onConflict: 'usuario_id,tipo,item' }).select('tipo,item,valor,versao,operacao'), prazo) } catch (erro) { return { erro, transitorio: true } }
    if (!direto.error) return { docs: (direto.data ?? []) as Documento[] }
    return { erro: direto.error ?? error, transitorio: !erroDeDado(direto.error ?? error, direto.status) }
  }
  function aplicar(documentos: Documento[], enviadas: Alteracao[] = []) {
    // O marcador é a fonte de verdade para o comando de zerar a conta.
    // Ele permite que dispositivos que estavam offline também descartem o cache antigo.
    const marcador = documentos.filter(d => d.tipo === 'historico' && (d.item === '__reinicio__' || d.item.startsWith('reinicio.v2.'))).sort((a, b) => b.versao - a.versao)[0]
    if (marcador && marcador.versao > estado.reinicio) {
      limparTudo('nuvem')
      estado = { ...estadoVazio(), cursor: estado.cursor, reinicio: marcador.versao }
      salvar()
    }
    if (marcador && marcador.versao === estado.reinicio) {
      // Guarda quando foi o reinício: gráficos que leem o histórico de cada
      // questão ignoram o que veio antes dele.
      const bruto = Number((marcador.valor as { concluidaEm?: number } | null)?.concluidaEm ?? 0)
      const em = bruto > 0 && bruto < 1e12 ? bruto * 1000 : bruto
      if (em && ler<number>('reinicio:em', 0) !== em) gravar('reinicio:em', em, 'nuvem')
    }
    const mapas = new Map<TipoSync, Record<string, unknown>>()
    for (const remoto of documentos) {
      if (remoto.tipo === 'historico' && (remoto.item === '__reinicio__' || remoto.item.startsWith('reinicio.v2.'))) continue
      const prefixo = `r${estado.reinicio}:`
      // Cada reinício tem seu próprio conjunto de linhas. Dispositivos com
      // cache antigo não conseguem reativar documentos de outra geração.
      if (estado.reinicio && !remoto.item.startsWith(prefixo)) continue
      const doc = estado.reinicio ? { ...remoto, item: remoto.item.slice(prefixo.length) } : remoto
      conhecidos.add(identificador(doc.tipo, doc.item))
      const enviada = enviadas.find(e => e.tipo === doc.tipo && e.item === doc.item)
      if (!receberDocumento(estado, doc, enviada)) continue
      const mapa = mapas.get(doc.tipo) ?? itens(doc.tipo, ler(doc.tipo, null))
      mapa[doc.item] = doc.valor
      mapas.set(doc.tipo, mapa)
    }
    for (const [tipo, mapa] of mapas) gravar(tipo, deItens(tipo, mapa), 'nuvem')
  }
  function semearLocais() {
    // Uma pessoa pode ter estudado antes de criar a conta. Esses itens não
    // aparecem como eventos retroativos, então entram na fila no primeiro sync.
    for (const tipo of TIPOS_SYNC) {
      const locais = itens(tipo, ler(tipo, null))
      for (const [item, valor] of Object.entries(locais)) {
        const id = identificador(tipo, item)
        if (!conhecidos.has(id) && !estado.versoes[id] && !estado.pendentes[id]) {
          estado.pendentes[id] = { tipo, item, valor, base: 0, operacao: gerarId() }
        }
      }
    }
  }
  /**
   * Lê o progresso da conta. Com a função `ler_progresso_desde` (parte 24),
   * pede só o que mudou desde o cursor; a função espera as gravações em
   * andamento da conta, então nenhuma versão menor aparece depois. Sem ela
   * (SQL ainda não colado), lê todas as linhas como sempre fez, e as próximas
   * leituras desta página também serão completas.
   */
  async function receber(completa: boolean): Promise<{ docs: Documento[]; cursor: number } | undefined> {
    const docs: Documento[] = []
    if (leituraIncremental) {
      let cursor = completa ? 0 : estado.cursor
      for (;;) {
        const { data, error, status } = await comPrazo(cliente.rpc('ler_progresso_desde', { p_cursor: cursor, p_limite: PAGINA }), prazo)
        if (!valido()) return undefined
        if (error) {
          if (!rpcAusente(error, status)) throw error
          // Banco sem a parte 24: volta à leitura completa até recarregar a página.
          leituraIncremental = false
          docs.length = 0
          break
        }
        const pagina = (data ?? []) as Documento[]
        docs.push(...pagina)
        for (const d of pagina) if (d.versao > cursor) cursor = d.versao
        if (pagina.length < PAGINA) return { docs, cursor }
      }
    }
    let pagina = 0
    while (valido()) {
      const { data, error } = await comPrazo(cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).order('versao').range(pagina, pagina + PAGINA - 1), prazo)
      if (!valido()) return undefined
      if (error) throw error
      const documentos = (data ?? []) as Documento[]
      docs.push(...documentos)
      if (documentos.length < PAGINA) break
      pagina += PAGINA
    }
    if (!valido()) return undefined
    return { docs, cursor: docs.reduce((m, d) => Math.max(m, d.versao), 0) }
  }
  function agendar(espera = 1200) {
    if (!valido()) return
    clearTimeout(timer)
    timer = setTimeout(() => { void sincronizar() }, espera)
  }
  function liberarEsperas(ate: number) {
    const prontas = esperas.filter(e => e.depoisDe < ate)
    esperas = esperas.filter(e => e.depoisDe >= ate)
    for (const e of prontas) e.pronto()
  }
  /**
   * Com várias abas abertas, uma sincroniza por vez (Web Locks). A outra tenta
   * de novo logo depois e, como lê do cursor, só recebe o que ainda falta.
   * Navegadores sem Web Locks seguem como antes.
   */
  async function sincronizar(): Promise<void> {
    if (!valido() || executando) return
    const travas = (navigator as Navigator & { locks?: LockManager }).locks
    if (!navigator.onLine || typeof travas?.request !== 'function') return ciclo()
    await travas.request(`ortoquestoes:sincronia:${idUsuario}`, { ifAvailable: true }, async trava => {
      if (!trava) { agendar(); return }
      await ciclo()
    })
  }
  async function ciclo() {
    if (!valido() || executando) return
    // Sem rede não há o que esperar: quem pediu segue com o que este aparelho tem.
    if (!navigator.onLine) { anunciar('offline'); liberarEsperas(Infinity); return }
    executando = true; anunciar('sincronizando')
    ultimoInicio = Date.now()
    const numero = ++ciclosIniciados
    try {
      // Sem login válido (sessão vencida e a renovação falhou), o pedido sairia
      // como visitante e seria recusado: espera a sessão voltar, sem mexer na fila.
      if (cliente.auth) {
        const { data } = await comPrazo(cliente.auth.getSession(), prazo)
        if (!valido()) return
        if (!data.session) throw Object.assign(new Error('Sessão expirada ou sendo renovada: o progresso fica guardado aqui e sobe quando ela voltar'), { status: 401 })
      }
      // Um reinício local pendente impede a importação do histórico anterior.
      // O token persistido torna a repetição segura depois de falha ou F5.
      const reinicio = ler<string | null>('reinicio:pendente', null)
      if (reinicio) {
        const itemReinicio = `reinicio.v2.${reinicio}`
        const consulta = await comPrazo(cliente.from('progresso_usuario').select('tipo,item,valor,versao,operacao').eq('usuario_id', idUsuario).eq('tipo', 'historico').eq('item', itemReinicio), prazo)
        if (!valido()) return
        if (consulta.error) throw consulta.error
        let marcador = (consulta.data ?? [])[0] as Documento | undefined
        if (marcador?.operacao !== reinicio) {
          const alteracao = { tipo: 'historico', item: itemReinicio, valor: { id: itemReinicio, descricao: 'Reinício do progresso', concluidaEm: Date.now() }, base: marcador?.versao ?? 0, operacao: reinicio }
          const resposta = await comPrazo(cliente.rpc('sincronizar_progresso', { alteracoes: [alteracao] }), prazo)
          if (!valido()) return
          if (resposta.error && !rpcAusente(resposta.error, resposta.status)) throw resposta.error
          if (resposta.error) {
            const direto = await comPrazo(cliente.from('progresso_usuario').upsert({ usuario_id: idUsuario, tipo: alteracao.tipo, item: alteracao.item, valor: alteracao.valor, operacao: reinicio }, { onConflict: 'usuario_id,tipo,item' }).select('tipo,item,valor,versao,operacao'), prazo)
            if (!valido()) return
            if (direto.error) throw direto.error
            marcador = (direto.data ?? [])[0] as Documento | undefined
          } else marcador = (resposta.data ?? [])[0] as Documento | undefined
        }
        if (!marcador || marcador.operacao !== reinicio) throw new Error('Reinício ainda não confirmado')
        // As respostas dadas depois do clique em zerar devem ser preservadas.
        estado.reinicio = marcador.versao
        salvar()
        gravar('reinicio:pendente', null, 'nuvem')
      }
      // Primeiro recebe, depois envia: as alterações locais saem já com a base
      // da versão que o servidor tem.
      // Conflitos guardados de versões anteriores: resolve e deixa o recebimento abaixo aplicar.
      for (const [id, doc] of Object.entries(estado.conflitos)) resolverConflito(estado, id, doc)
      const completa = reconciliar || Date.now() - ultimaCompleta > RECONCILIAR_A_CADA
      const referencia = estado
      const recebidos = await receber(completa)
      if (!recebidos || !valido()) return
      aplicar(recebidos.docs)
      // O cursor só avança junto com as versões aplicadas, no mesmo salvar():
      // se outra aba regravar um estado mais antigo, cursor e versões voltam
      // juntos e a próxima leitura relê o que faltou. Se o estado foi trocado
      // durante uma leitura parcial (outra aba, reinício), o cursor fica como
      // está e a próxima leitura repete as linhas, o que não tem efeito.
      if (completa || estado === referencia) estado.cursor = recebidos.cursor
      if (completa) { reconciliar = false; ultimaCompleta = Date.now() }
      semearLocais()
      salvar()
      pronto = true
      const fila = Object.values(estado.pendentes).filter(p => !estado.conflitos[identificador(p.tipo, p.item)]).slice(0, 100)
      if (fila.length) {
        const resultado = await enviar(fila)
        if (!valido()) return
        if ('docs' in resultado) {
          aplicar(resultado.docs, fila)
        } else {
          // Um único item recusado (formato antigo, dado corrompido) não pode
          // prender a fila inteira: reenvia um por um e separa só o que falhar.
          // Rede ou servidor fora do ar não é culpa de nenhum item: a fila
          // fica intacta e tenta de novo no próximo ciclo.
          if (resultado.transitorio) throw resultado.erro
          detalhe = descrever(resultado.erro)
          for (const alteracao of fila) {
            const individual = await enviar([alteracao])
            if (!valido()) return
            if ('docs' in individual) { aplicar(individual.docs, [alteracao]); salvar(); continue }
            if (individual.transitorio) throw individual.erro
            const id = identificador(alteracao.tipo, alteracao.item)
            // A linha não existe no servidor (outra geração, conta recriada): sobe como item novo.
            if (versaoInicialInvalida(individual.erro) && estado.pendentes[id] && estado.pendentes[id].base !== 0) {
              estado.pendentes[id] = { ...estado.pendentes[id], base: 0, operacao: gerarId() }
              delete estado.versoes[id]
              continue
            }
            estado.rejeitados = { ...(estado.rejeitados ?? {}), [id]: { tipo: alteracao.tipo, item: alteracao.item, valor: alteracao.valor, erro: descrever(individual.erro), em: Date.now() } }
            delete estado.pendentes[id]
          }
        }
        salvar()
      }
      const conflitos = Object.keys(estado.conflitos).length
      const pendentes = Object.keys(estado.pendentes).length
      falhasSeguidas = 0
      detalhe = undefined
      if (!pendentes) { ultimaSincronia = Date.now(); if (valido()) gravar('sincronia:ultima', ultimaSincronia, 'nuvem') }
      anunciar(conflitos ? 'conflito' : pendentes ? 'sincronizando' : 'salvo')
      if (Object.values(estado.pendentes).some(p => !estado.conflitos[identificador(p.tipo, p.item)])) agendar()
    } catch (erro) {
      detalhe = descrever(erro)
      anunciar(navigator.onLine ? 'erro' : 'offline')
      // Tenta de novo sozinho, cada vez mais espaçado (2 s, 4 s, 8 s... até 1 min).
      falhasSeguidas++
      if (navigator.onLine) agendar(Math.min(60_000, 1000 * 2 ** falhasSeguidas))
    }
    finally {
      executando = false
      // Quem esperava não fica preso: com ou sem sucesso, o ciclo terminou.
      liberarEsperas(numero)
      // Pedido feito durante este ciclo: precisa de um ciclo que comece depois dele.
      if (esperas.length) agendar(50)
    }
  }
  function aoGravar(evento: Event) {
    const m = (evento as CustomEvent<MudancaDados>).detail
    if (!valido() || m.usuario !== idUsuario || m.origem !== 'local' || !ehTipoSync(m.chave)) return
    registrarAlteracoes(estado, m.chave, m.antes, m.valor); salvar(); anunciar(navigator.onLine ? 'sincronizando' : 'offline')
    // Envia enquanto a aba ainda está em primeiro plano. O Chrome móvel pode
    // congelar timers quando o usuário troca de aplicativo ou de aba.
    void sincronizar(); agendar()
  }
  // Outra aba pode ter enfileirado operações: recarrega o estado persistido antes de sincronizar.
  function outraAba(evento: StorageEvent) {
    if (!valido() || evento.key !== `ortoquestoes:conta:${idUsuario}:sincronia:v1`) return
    estado = ler<EstadoSync>('sincronia:v1', estadoVazio()); agendar()
  }
  // Foco, visibilidade e volta da página chegam juntos: um ciclo só.
  const aoVoltar = () => { if (document.visibilityState === 'visible' && Date.now() - ultimoInicio >= INTERVALO_MINIMO) void sincronizar() }
  // Recusas antigas por sessão ou rede (versões anteriores do site): voltam para a fila.
  if (estado.rejeitados) {
    let voltaram = false
    for (const [id, r] of Object.entries(estado.rejeitados)) {
      if (!RECUSA_PASSAGEIRA.test(r.erro) || estado.pendentes[id]) continue
      estado.pendentes[id] = { tipo: r.tipo, item: r.item, valor: r.valor, base: estado.versoes[id] ?? 0, operacao: gerarId() }
      delete estado.rejeitados[id]
      voltaram = true
    }
    if (voltaram) salvar()
  }
  // Voltando do offline, relê tudo uma vez: é a rede de segurança da leitura incremental.
  const aoReconectar = () => { reconciliar = true; void sincronizar() }
  window.addEventListener(EVENTO_DADOS, aoGravar)
  window.addEventListener('storage', outraAba)
  window.addEventListener('online', aoReconectar)
  document.addEventListener('visibilitychange', aoVoltar)
  // Janela que volta ao primeiro plano sem trocar de aba (desktop) e página
  // restaurada do cache do navegador (voltar/avançar) também sincronizam.
  window.addEventListener('focus', aoVoltar)
  window.addEventListener('pageshow', aoVoltar)
  // Mantém os dispositivos próximos mesmo quando a aba fica aberta sem trocar de
  // visibilidade. Cada volta só lê o que mudou desde o cursor; trocar de aba,
  // de aplicativo ou de aparelho sincroniza na hora pelo visibilitychange.
  const intervalo = setInterval(aoVoltar, opcoes.intervalo ?? INTERVALO)
  void sincronizar()
  return {
    sincronizar,
    /**
     * Sincroniza agora e espera terminar (no máximo `ms`). Para quem vai decidir
     * algo com as respostas: o cronograma, antes de escolher as questões de hoje.
     */
    aguardar(ms = 8000): Promise<void> {
      if (!valido()) return Promise.resolve()
      return new Promise<void>(resolver => {
        const espera = { depoisDe: ciclosIniciados, pronto: () => { clearTimeout(t); resolver() } }
        const t = setTimeout(() => { esperas = esperas.filter(e => e !== espera); resolver() }, ms)
        esperas.push(espera)
        if (!executando) void sincronizar()
      })
    },
    /** Devolve à fila os itens recusados (por exemplo, depois de uma correção no servidor). */
    reenviarRejeitados() {
      if (!valido() || !estado.rejeitados) return
      for (const [id, r] of Object.entries(estado.rejeitados)) {
        estado.pendentes[id] = { tipo: r.tipo, item: r.item, valor: r.valor, base: estado.versoes[id] ?? 0, operacao: gerarId() }
      }
      estado.rejeitados = {}
      salvar(); void sincronizar()
    },
    descartarRejeitados() {
      if (!valido()) return
      estado.rejeitados = {}
      salvar(); anunciar('salvo')
    },
    resolver(doc: Documento, manterLocal: boolean) {
      const key = identificador(doc.tipo, doc.item)
      if (!valido() || !estado.conflitos[key]) return
      if (manterLocal && estado.pendentes[key]) {
        estado.pendentes[key].base = doc.versao
        estado.pendentes[key].operacao = gerarId()
      } else {
        delete estado.pendentes[key]
        aplicar([doc])
      }
      delete estado.conflitos[key]; salvar(); void sincronizar()
    },
    parar() {
      ativo = false; clearTimeout(timer); clearInterval(intervalo)
      window.removeEventListener(EVENTO_DADOS, aoGravar); window.removeEventListener('storage', outraAba)
      window.removeEventListener('online', aoReconectar); document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar); window.removeEventListener('pageshow', aoVoltar)
      liberarEsperas(Infinity)
    },
  }
}
