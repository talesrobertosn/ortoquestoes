import { banco, cors, json, usuarioDoPedido } from '../_shared/http.ts'
import { enviarEmail, emailConfigurado, linkDescadastro, site } from '../_shared/email.ts'
import {
  CAMPANHAS_DIARIAS,
  emailLembrete,
  emailRelatorio,
  type CampanhaLembrete,
  type DadosRelatorio,
  type TipoCampanhaDiaria,
} from '../_shared/modelo-email.ts'
import {
  TIPOS,
  TIPOS_APOSENTADOS,
  anterioresDosDados,
  perfilDosDados,
  gerarCarta,
  sementeDe,
  problemaGrave,
  renderizarCarta,
  type DadosCartaBanco,
  type DadosCampanha,
} from '../_shared/cartas.ts'
import {
  PRIORIDADE,
  cenarioValido,
  type CenarioHub,
  diaSP,
  selecionarHub,
  sugestaoPessoal,
  contaTeste,
  type MensagemHub,
} from '../_shared/hub-regras.ts'

// O processador não cria rodadas: só consome a fila autorizada no painel.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }
const erro = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300)
async function ler<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const r = await banco(caminho, init)
  if (!r.ok) throw new Error(`consulta_falhou:${caminho.split('?')[0]}:${r.status}`)
  return (await r.json()) as T
}
const rpc = <T>(nome: string, args: Record<string, unknown> = {}) =>
  ler<T>(`rpc/${nome}`, { method: 'POST', body: JSON.stringify(args) })
const gravar = (t: string, corpo: Record<string, unknown>) => ler(t, { method: 'PATCH', body: JSON.stringify(corpo) })
interface Fonte {
  id_usuario: string
  referencia: string
  dados?: Record<string, unknown>
}
interface ItemFila {
  id: string
  id_usuario: string
  rodada: string
  status: string
  mensagem: MensagemHub
  motivo: string | null
  envio_id: number | null
}
const LIMITES = 200
const TIPO_LEMBRETE = {
  nunca: 'nunca_comecou',
  tres_dias: 'pausa',
  sete_dias: 'sumiu',
  renovacao_pix: 'pix_3_dias',
  renovacao_pix_hoje: 'pix_hoje',
} as const

function campanhaDados(t: TipoCampanhaDiaria, d: Record<string, unknown>): DadosCampanha {
  if (t === 'simulado_resultado') return { simulado: d as DadosCampanha['simulado'] }
  if (t === 'um_ano') return { anos: Number(d.anos) }
  if (t === 'indicacao_deu_certo') return { cortesia: d.cortesia === true }
  if (t === 'resumo_do_tema') return { resumo: d as DadosCampanha['resumo'] }
  if (t === 'simulado_lembrete') return { lembrete: d as DadosCampanha['lembrete'] }
  return {}
}
async function preparar(variar?: { chave: string; semente: number }, incluirCartao = false) {
  const hoje = new Date(),
    dia = diaSP(hoje),
    avisos: string[] = []
  const pessoas = await rpc<Array<{ id_usuario: string; dados: DadosCartaBanco }>>('hub_pessoas')
  if (pessoas.length > 2000)
    throw new Error(
      'Mais de 2.000 pessoas: ampliar a paginação antes de preparar a rodada; nenhuma seleção parcial será enviada.',
    )
  const perfis = new Map(pessoas.map((p) => [p.id_usuario, p.dados]))
  const candidatas: MensagemHub[] = []
  for (const p of pessoas) {
    try {
      const m = sugestaoPessoal(p.id_usuario, p.dados, hoje, site())
      if (m) candidatas.push(m)
    } catch {
      avisos.push(`Não foi possível escrever a carta de ${p.dados.nome ?? 'uma pessoa'}.`)
    }
  }
  // Atualiza somente os metadados de publicação da biblioteca; não cria rodada nem envia.
  try {
    const r = await fetch(`${site()}biblioteca/indice.json`)
    if (!r.ok) throw new Error('catalogo_indisponivel')
    const indice = (await r.json()) as { capitulos?: Array<{ id: string; titulo: string; especialidade: string }> }
    if (indice.capitulos?.length)
      await rpc('registrar_catalogo_biblioteca', {
        p_capitulos: indice.capitulos.map(({ id, titulo, especialidade }) => ({ id, titulo, especialidade })),
      })
  } catch {
    avisos.push('Não foi possível atualizar as novidades da Biblioteca. Confira esse grupo antes de enviar.')
  }
  const fontes = await Promise.all(
    CAMPANHAS_DIARIAS.map(async (t) => {
      const linhas = await rpc<Fonte[]>(`candidatos_${t}`, { p_limite: LIMITES })
      if (linhas.length === LIMITES)
        avisos.push(
          `${TIPOS[t].rotulo}: janela de ${LIMITES} pessoas atingida; pode haver mais elegíveis além desta rodada.`,
        )
      return { t, linhas }
    }),
  )
  const lembretes = await Promise.all(
    (Object.keys(TIPO_LEMBRETE) as CampanhaLembrete[]).map(async (c) => {
      const pix = c.startsWith('renovacao')
      const linhas = await rpc<Array<Fonte & Record<string, unknown>>>(
        pix ? 'destinatarios_renovacao_pix' : 'destinatarios_lembrete',
        pix
          ? { p_etapa: c === 'renovacao_pix_hoje' ? 'hoje' : 'tres_dias', p_limite: 500 }
          : { p_campanha: c, p_limite: 500 },
      )
      if (linhas.length === 500) avisos.push(`${TIPOS[TIPO_LEMBRETE[c]].rotulo}: janela de 500 pessoas atingida.`)
      return { c, linhas }
    }),
  )
  // Relatórios entram nos dias devidos; os agendamentos existentes continuam como garantia.
  const diaMes = Number(dia.slice(-2)),
    ano = Number(dia.slice(0, 4)),
    mes = Number(dia.slice(5, 7))
  const anterior = `${mes === 1 ? ano - 1 : ano}-${String(mes === 1 ? 12 : mes - 1).padStart(2, '0')}`
  const periodos: Array<{ fonte: 'mensal' | 'quinzenal'; ref: string; ids: Array<{ id_usuario: string }> }> = []
  if (diaMes === 1)
    periodos.push({
      fonte: 'mensal',
      ref: anterior,
      ids: await rpc('destinatarios_relatorio_mensal', { p_mes: anterior, p_limite: 500 }),
    })
  if (diaMes === 1 || diaMes === 16) {
    const ref = diaMes === 16 ? `${dia.slice(0, 7)}-q1` : `${anterior}-q2`
    periodos.push({
      fonte: 'quinzenal',
      ref,
      ids: await rpc('destinatarios_relatorio_quinzenal', { p_ref: ref, p_limite: 500 }),
    })
  }
  const faltantes = [
    ...new Set(
      [
        ...fontes.flatMap((x) => x.linhas),
        ...lembretes.flatMap((x) => x.linhas),
        ...periodos.flatMap((x) => x.ids),
      ].map((x) => x.id_usuario),
    ),
  ].filter((id) => !perfis.has(id))
  // Sem consulta silenciosamente vazia em caso de falha: interrompe a preparação inteira.
  for (let i = 0; i < faltantes.length; i += 12)
    await Promise.all(
      faltantes.slice(i, i + 12).map(async (id) => {
        const p = await rpc<DadosCartaBanco>('dados_carta_usuario', { p_id: id })
        if (p) perfis.set(id, p)
      }),
    )
  const base = (id: string) => {
    const d = perfis.get(id)
    return d?.email && !contaTeste(d.nome, d.email) && !d.administrador && d.confirmado ? d : null
  }
  const acrescentar = (
    id: string,
    ref: string,
    t: MensagemHub['tipo'],
    fonte: MensagemHub['fonte'],
    d: DadosCartaBanco,
    e: { assunto: string; corpo?: string; modelo: string | null; versao: string | null; personalizacao?: string[] },
    origem: Record<string, unknown>,
    categoria: MensagemHub['categoria'] = 'cartas',
  ) => {
    if (!e.corpo) throw new Error('modelo_sem_corpo')
    candidatas.push({
      chave: `${id}:${ref}`,
      id_usuario: id,
      nome: d.nome ?? d.email!,
      email: d.email!,
      tipo: t,
      referencia: ref,
      fonte,
      origem_dados: origem,
      categoria,
      tipo_log: fonte === 'lembrete' ? 'lembrete' : t === 'relatorio' ? 'relatorio' : 'carta',
      prioridade: PRIORIDADE[t] ?? 80,
      motivo: TIPOS[t].descricao,
      assunto: e.assunto,
      corpo: e.corpo,
      modelo: e.modelo ?? t,
      versao: e.versao ?? t,
      personalizacao: e.personalizacao ?? [],
      ultimo_envio: anterioresDosDados(d).find((x) => x.status !== 'falhou')?.em ?? null,
      concorrentes: [],
      bloqueio: null,
    })
  }
  for (const { t, linhas } of fontes)
    for (const l of linhas) {
      const d = base(l.id_usuario)
      if (!d) continue
      const perfil = perfilDosDados(d),
        origem = l.dados ?? {}
      // O motor precisa da data do acontecimento, além dos dados da pessoa.
      if (t === 'vespera_prova') perfil.diasParaProva = 1
      if (typeof origem.prova === 'string') perfil.provaCronograma = origem.prova
      if (t === 'assinante_parado_7') perfil.diasParado = Number(origem.dias_fora ?? perfil.diasParado)
      const carta = gerarCarta(perfil, {
        tipo: t,
        anteriores: anterioresDosDados(d),
        hoje,
        site: site(),
        ignorarCadencia: true,
        campanha: campanhaDados(t, origem),
        semente: variar?.chave === `${l.id_usuario}:${l.referencia}` ? variar.semente : sementeDe(`${l.id_usuario}:${l.referencia}:${dia}`),
      })
      acrescentar(l.id_usuario, l.referencia, t, 'campanha', d, carta, origem)
    }
  // Cenário operacional próprio: não pode ser enviado sem revalidar a tentativa no banco.
  const cartoes = incluirCartao ? await rpc<Fonte[]>('hub_cartoes_recusados', { p_limite: 200 }) : []
  if (cartoes.length === 200) avisos.push('Cartões não concluídos: janela de 200 pessoas atingida; pode haver mais pessoas além desta seleção.')
  for (const l of cartoes) {
    const d = base(l.id_usuario)
    if (!d || d.assinante) continue
    const carta = gerarCarta(perfilDosDados(d), { tipo: 'cartao_recusado', anteriores: anterioresDosDados(d), hoje, site: site(), ignorarCadencia: true, semente: sementeDe(l.referencia) })
    acrescentar(l.id_usuario, l.referencia, 'cartao_recusado', 'pagamento', d, carta, l.dados ?? {})
  }
  for (const { c, linhas } of lembretes)
    for (const l of linhas) {
      const d = base(l.id_usuario)
      if (!d) continue
      const e = emailLembrete({
        campanha: c,
        nome: d.nome ?? null,
        respondidas: Number(d.respondidas),
        diasFora: Number(l.dias_fora ?? 0),
        diasRestantes: Number(l.dias_restantes ?? 3),
        fimEm: typeof l.fim_periodo === 'string' ? l.fim_periodo : null,
        plano: typeof l.plano === 'string' ? l.plano : null,
        site: site(),
        linkDescadastro: '',
        perfil: perfilDosDados(d),
        anteriores: [],
        referencia: l.referencia,
        hoje,
        semente: variar?.chave === `${l.id_usuario}:${l.referencia}` ? variar.semente : undefined,
      })
      acrescentar(l.id_usuario, l.referencia, TIPO_LEMBRETE[c], 'lembrete', d, e, { ...l, campanha: c }, 'lembretes')
    }
  for (const p of periodos) {
    if (p.ids.length === 500) avisos.push('Relatórios: janela de 500 pessoas atingida.')
    for (const { id_usuario: id } of p.ids) {
      const d = base(id)
      if (!d) continue
      let dados: DadosRelatorio
      if (p.fonte === 'mensal') dados = await rpc('dados_relatorio_mensal', { p_id: id, p_mes: p.ref })
      else {
        const [a, m] = p.ref.split('-').map(Number),
          q1 = p.ref.endsWith('q1'),
          inicio = `${p.ref.slice(0, 7)}-${q1 ? '01' : '16'}`,
          fim = q1
            ? `${p.ref.slice(0, 7)}-16`
            : `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`
        dados = await rpc('dados_relatorio_periodo', { p_id: id, p_inicio: inicio, p_fim: fim, p_ref: p.ref })
      }
      const e = emailRelatorio({
        ...dados,
        site: site(),
        linkDescadastro: '',
        perfil: perfilDosDados(d),
        anteriores: anterioresDosDados(d),
        hoje,
        semente: variar?.chave === `${id}:${p.ref}` ? variar.semente : undefined,
      })
      acrescentar(id, p.ref, 'relatorio', p.fonte, d, e, {}, 'relatorio')
    }
  }
  // Ajuste de versão só afeta a carta aberta; não muda a elegibilidade nem o destinatário.
  if (variar) {
    const m = candidatas.find((x) => x.chave === variar.chave)
    if (m && ['pessoal', 'pagamento'].includes(m.fonte)) {
      const d = perfis.get(m.id_usuario)!
      const c = gerarCarta(perfilDosDados(d), {
        tipo: m.tipo,
        anteriores: anterioresDosDados(d),
        hoje,
        site: site(),
        ignorarCadencia: true,
        semente: variar.semente,
      })
      Object.assign(m, { assunto: c.assunto, corpo: c.corpo, versao: c.versao, personalizacao: c.personalizacao })
    }
  }
  const bloqueios = await rpc<Array<{ chave: string; bloqueio: string | null }>>('hub_avaliar', {
    p_itens: candidatas.map(({ chave, id_usuario, tipo, categoria, referencia }) => ({
      chave,
      id_usuario,
      tipo,
      categoria,
      referencia,
    })),
  })
  const porChave = new Map(bloqueios.map((x) => [x.chave, x.bloqueio]))
  for (const m of candidatas)
    m.bloqueio = porChave.has(m.chave) ? porChave.get(m.chave)! : 'Não foi possível conferir as regras'
  const deHoje = await ler<Array<{ id: string }>>(`email_rodadas?dia=eq.${dia}&select=id`)
  const enfileiradas = deHoje.length ? await ler<Array<{ id_usuario: string }>>(`email_fila?rodada=eq.${deHoje[0].id}&select=id_usuario&limit=2001`) : []
  if (enfileiradas.length > 2000) throw new Error('Fila diária excedeu o limite de consulta')
  const incluidos = new Set(enfileiradas.map(x => x.id_usuario))
  for (const m of candidatas) if (incluidos.has(m.id_usuario)) m.bloqueio = 'Já incluído nos envios de hoje'
  return { dia, opcoes: candidatas, ...selecionarHub(candidatas), avisos: [...new Set(avisos)], consultadas: perfis.size }
}

async function estado(rodadaId?: string) {
  const dia = diaSP(),
    rodadas = await ler<Array<{ id: string; dia: string; status: string; criado_em: string; resumo: unknown }>>(
      'email_rodadas?order=dia.desc&limit=14',
    )
  const rodada = rodadaId
    ? (rodadas.find((r) => r.id === rodadaId) ?? null)
    : (rodadas.find((r) => r.dia === dia) ?? null)
  const fila = rodada
    ? await ler<ItemFila[]>(`email_fila?rodada=eq.${rodada.id}&order=atualizado_em.asc&limit=2000`)
    : []
  const inicio = new Date(`${dia}T00:00:00-03:00`).toISOString()
  const automaticos = await ler<Array<Record<string, unknown>>>(
    `emails_enviados?origem=eq.automatico&enviado_em=gte.${inicio}&select=id,assunto,status,enviado_em,modelo&order=enviado_em.desc&limit=100`,
  )
  return { dia, rodada, fila, rodadas, automaticos, worker_ativo: await rpc<boolean>('hub_worker_ativo') }
}

async function aindaPertinente(m: MensagemHub): Promise<boolean> {
  if (TIPOS_APOSENTADOS.includes(m.tipo)) return false
  const atual = await rpc<DadosCartaBanco>('dados_carta_usuario', { p_id: m.id_usuario })
  if (
    !atual?.email ||
    !atual.confirmado ||
    atual.administrador ||
    contaTeste(atual.nome, atual.email) ||
    atual.email !== m.email
  )
    return false
  if (m.fonte === 'pagamento') return !atual.assinante && (await rpc<Fonte[]>('hub_cartoes_recusados', { p_limite: 200 })).some(x => x.id_usuario === m.id_usuario && x.referencia === m.referencia)
  if (m.fonte === 'campanha')
    return (await rpc<Fonte[]>(`candidatos_${m.tipo}`, { p_limite: LIMITES })).some(
      (x) => x.id_usuario === m.id_usuario && x.referencia === m.referencia,
    )
  if (m.fonte === 'lembrete') {
    const c = m.origem_dados?.campanha as CampanhaLembrete,
      pix = c.startsWith('renovacao')
    const linhas = await rpc<Fonte[]>(
      pix ? 'destinatarios_renovacao_pix' : 'destinatarios_lembrete',
      pix
        ? { p_etapa: c === 'renovacao_pix_hoje' ? 'hoje' : 'tres_dias', p_limite: 500 }
        : { p_campanha: c, p_limite: 500 },
    )
    return linhas.some((x) => x.id_usuario === m.id_usuario && x.referencia === m.referencia)
  }
  if (m.fonte === 'mensal' || m.fonte === 'quinzenal')
    return (
      await rpc<Array<{ id_usuario: string }>>(
        m.fonte === 'mensal' ? 'destinatarios_relatorio_mensal' : 'destinatarios_relatorio_quinzenal',
        m.fonte === 'mensal' ? { p_mes: m.referencia, p_limite: 500 } : { p_ref: m.referencia, p_limite: 500 },
      )
    ).some((x) => x.id_usuario === m.id_usuario)
  const nova = sugestaoPessoal(m.id_usuario, atual, new Date(), site())
  return nova?.tipo === m.tipo && nova?.referencia === m.referencia
}
async function processar() {
  if (!emailConfigurado()) return { erro: 'email_nao_configurado' }
  const inicio = Date.now()
  let feitos = 0
  while (Date.now() - inicio < 45_000 && feitos < 40) {
    const [item] = await rpc<ItemFila[]>('hub_proximo')
    if (!item) break
    const m = item.mensagem
    let reservado = false,
      aceito = false
    try {
      if (!(await aindaPertinente(m))) {
        await gravar(`email_fila?id=eq.${item.id}`, {
          status: 'adiado',
          motivo: 'A situação mudou desde a preparação',
          atualizado_em: new Date().toISOString(),
        })
        continue
      }
      const reserva = await rpc<{ envio_id?: number; bloqueio?: string }>('hub_reservar', { p_fila: item.id })
      if (!reserva.envio_id) continue
      reservado = true
      const descadastro = await linkDescadastro(m.id_usuario, m.categoria)
      const e = renderizarCarta({ assunto: m.assunto, corpo: m.corpo, descadastro })
      // Chave estável no provedor: a mesma mensagem não vira dois e-mails num retry de rede.
      await enviarEmail(m.email, e.assunto, e.html, e.texto, descadastro, undefined, undefined, `hub/${item.id}`)
      aceito = true
      await gravar(`emails_enviados?id=eq.${reserva.envio_id}`, { status: 'enviado' })
      await gravar(`email_fila?id=eq.${item.id}`, {
        status: 'enviado',
        motivo: null,
        atualizado_em: new Date().toISOString(),
      })
      if (m.tipo === 'simulado_lembrete')
        await rpc('sn_marcar_lembrete', { p_edicao: m.origem_dados?.edicao, p_usuario: m.id_usuario }).catch(() => null)
    } catch (e) {
      // Timeout ou falha depois de reservar podem ter enviado. Não fazem retry automático.
      const explicito = /envio_recusado_4\d\d/.test(erro(e)),
        status = aceito || (reservado && !explicito) ? 'incerto' : 'falhou'
      await gravar(`email_fila?id=eq.${item.id}`, {
        status,
        motivo: erro(e),
        atualizado_em: new Date().toISOString(),
      }).catch(() => null)
      if (explicito && reservado) {
        const [atual] = await ler<ItemFila[]>(`email_fila?id=eq.${item.id}`)
        if (atual?.envio_id)
          await gravar(`emails_enviados?id=eq.${atual.envio_id}`, { status: 'falhou', erro: erro(e) }).catch(() => null)
      }
      if (/envio_recusado_(429|401|403)/.test(erro(e))) {
        await gravar(`email_rodadas?id=eq.${item.rodada}`, { status: 'pausada' })
        break // Não consumir a fila com a cota ou credencial do provedor indisponível.
      }
    }
    feitos++
    await new Promise((r) => setTimeout(r, 650))
  }
  const ativas = await ler<Array<{ id: string }>>('email_rodadas?status=eq.ativa&select=id')
  for (const r of ativas) await rpc('hub_concluir', { p_rodada: r.id })
  return { processados: feitos }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405, req)
  try {
    const p = (await req.json()) as {
      acao?: string
      versao?: number
      cenario?: unknown
      chave?: string
      semente?: number
      itens?: Array<{ chave: string; assunto?: string; corpo?: string }>
      id?: string
      rodada?: string
    }
    if (p.acao === 'processar') {
      const esperado = Deno.env.get('EMAIL_SEGREDO') ?? '',
        recebido = req.headers.get('x-segredo') ?? ''
      const legado = !!esperado && esperado === recebido
      const agendador = !legado && /^[a-f0-9]{64}$/.test(recebido)
        ? await rpc<boolean>('hub_autenticar_processador', { p_segredo: recebido }).catch(() => false)
        : false
      if (!legado && !agendador) return json({ erro: 'acesso_negado' }, 403, req)

      return json(await processar(), 200, req)
    }
    const u = await usuarioDoPedido(req)
    const adm = await ler<unknown[]>(`administradores?id_usuario=eq.${u.id}&select=id_usuario`)
    if (!adm.length) return json({ erro: 'acesso_negado' }, 403, req)
    if (p.acao === 'estado') {
      const atual = await estado(p.rodada)
      if (p.versao !== 2 && atual.fila.some(x => x.mensagem.tipo === 'cartao_recusado')) return json({ erro: 'Atualize a página para ver os novos cenários de e-mail.' }, 409, req)
      return json(atual, 200, req)
    }
    if (p.acao === 'preparar')
      return json(
        await preparar(p.chave ? { chave: p.chave, semente: Number(p.semente) || Date.now() } : undefined, p.versao === 2),
        200,
        req,
      )
    if (p.acao === 'iniciar') {
      if (!emailConfigurado()) return json({ erro: 'email_nao_configurado' }, 503, req)
      if (!(await rpc<boolean>('hub_worker_ativo')))
        return json({ erro: 'O processador da fila precisa estar ativo antes de iniciar uma rodada.' }, 503, req)
      const atual = await estado()
      if (!Array.isArray(p.itens) || !p.itens.length || p.itens.length > 2000)
        return json({ erro: 'selecao_invalida' }, 400, req)
      if (p.cenario !== undefined && !cenarioValido(p.cenario)) return json({ erro: 'cenario_invalido' }, 400, req)
      // Um clique repetido na mesma seleção não acrescenta nem reenvia ninguém.
      if (atual.rodada && p.itens.every((i: { chave: string }) => atual.fila.some(f => f.mensagem.chave === i.chave))) return json(atual, 200, req)
      const previa = await preparar(undefined, p.versao === 2),
        selecao = selecionarHub(previa.opcoes, p.cenario as CenarioHub | undefined),
        mapa = new Map(selecao.prontas.map((x) => [x.chave, x])),
        vistos = new Set<string>(),
        itens: MensagemHub[] = []
      for (const i of p.itens) {
        const m = mapa.get(i.chave)
        if (!m || vistos.has(m.id_usuario))
          return json({ erro: 'A seleção mudou. Atualize a rodada antes de enviar.' }, 409, req)
        const assunto = i.assunto?.trim() ?? m.assunto,
          corpo = i.corpo?.trim() ?? m.corpo
        if (!assunto || assunto.length > 120 || !corpo || corpo.length > 6000 || problemaGrave(assunto + '\n' + corpo))
          return json({ erro: 'texto_invalido' }, 400, req)
        vistos.add(m.id_usuario)
        itens.push({
          ...m,
          assunto,
          corpo,
          versao: assunto !== m.assunto || corpo !== m.corpo ? `${m.modelo}#editada` : m.versao,
        })
      }
      await rpc('hub_iniciar', {
        p_admin: u.id,
        p_itens: itens,
        p_resumo: {
          cenario: p.cenario ?? 'todos',
          consultadas: previa.consultadas,
          avisos: previa.avisos,
          excluidas: [
            ...selecao.adiadas.map((m) => ({ nome: m.nome, motivo: m.bloqueio })),
            ...selecao.prontas
              .filter((m) => !vistos.has(m.id_usuario))
              .map((m) => ({ nome: m.nome, motivo: 'Pulado pelo administrador' })),
          ],
        },
      })
      EdgeRuntime.waitUntil(processar().catch(console.error))
      return json(await estado(), 200, req)
    }
    if (p.acao === 'repetir') {
      if (!p.id || !/^[0-9a-f-]{36}$/.test(p.id)) return json({ erro: 'rodada_invalida' }, 400, req)
      await rpc('hub_repetir', { p_rodada: p.id })
      EdgeRuntime.waitUntil(processar().catch(console.error))
      return json(await estado(), 200, req)
    }
    if (p.acao === 'pausar' || p.acao === 'retomar') {
      if (!p.id || !/^[0-9a-f-]{36}$/.test(p.id)) return json({ erro: 'rodada_invalida' }, 400, req)
      await gravar(`email_rodadas?id=eq.${p.id}&dia=eq.${diaSP()}&status=in.(ativa,pausada)`, {
        status: p.acao === 'pausar' ? 'pausada' : 'ativa',
      })
      if (p.acao === 'retomar') EdgeRuntime.waitUntil(processar().catch(console.error))
      return json(await estado(), 200, req)
    }
    return json({ erro: 'acao_invalida' }, 400, req)
  } catch (e) {
    return json({ erro: erro(e) }, erro(e) === 'autenticacao_necessaria' ? 401 : 500, req)
  }
})
