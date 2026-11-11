// Dados inteiramente fictícios, com o formato do site em novembro de 2026 (começo em 12/09, ~220 contas, ~70
// pagantes, a maior parte dos mensais no Pix, anuais pelo preço antigo em outubro), para fotografar e testar o
// Financeiro, as Metas, o Crescimento e o Início refeitos em 11/11/2026. Nenhum dado pessoal real.
import { instalarDados as instalarBase } from './admin-negocio-dados.mjs'
export const AGORA = '2026-11-11T22:20:00Z'
const agora = Date.parse(AGORA), dia = 86400000
let semente = 11
const sorte = () => (semente = (semente * 16807) % 2147483647) / 2147483647
const nomes = ['Marina Almeida', 'Rafael Torres', 'Camila Santos', 'Pedro Henrique', 'Luísa Martins', 'Gustavo Rocha', 'Beatriz Ferreira', 'Thiago Lima', 'Ana Clara', 'Bruno Costa', 'Júlia Ramos', 'Lucas Prado']
const inicio = Date.parse('2026-09-12T13:00:00Z')
// Cadastros: ~3,3 por dia em setembro e outubro, ~4,2 em novembro, menos no sábado.
const criados = []
for (let t = inicio; t < agora; t += dia) {
  const d = new Date(t), sab = d.getUTCDay() === 6, nov = t >= Date.parse('2026-11-01T03:00:00Z')
  const n = Math.round((nov ? 4.2 : 3.2) * (sab ? 0.5 : 1) * (0.6 + sorte() * 0.8))
  for (let k = 0; k < n; k++) criados.push(t + Math.floor(sorte() * dia * 0.98) - 13 * 3600000 + 10 * 3600000)
}
const etapas = [['residente', 'R1'], ['residente', 'R2'], ['residente', 'R3'], ['ortopedista', null], ['estudante', null]]
const servicos = ['HAC', 'Hospital Angelina Caron', 'Mandaqui', 'Santa Casa de São Paulo', 'HU UFJF', 'Hospital Federal do Andarai', 'iot', 'HSPM', 'Hospital Evangélico de Belo Horizonte', 'UFVJM']
export const usuarios = criados.filter(t => t <= agora).map((t, i) => {
  const [situacao, ano] = etapas[i % 5]
  const resp = sorte() < 0.25 ? 0 : Math.floor(sorte() ** 2 * 1500)
  return {
    id_usuario: `00000000-0000-4000-9000-${String(i + 1).padStart(12, '0')}`, nome: `${nomes[i % 12]} ${i + 1}`, email: `conta${i + 1}@exemplo.test`,
    criado_em: new Date(t).toISOString(), ultimo_login: new Date(agora - (i % 9) * dia).toISOString(), ultima_atividade: resp ? new Date(agora - (i % 12) * dia).toISOString() : null,
    respondidas: resp, acertos: Math.round(resp * 0.6), erros: Math.round(resp * 0.4), respondidas_7d: resp ? Math.floor(sorte() * 300) : 0, respondidas_hoje: i % 7 === 0 ? Math.floor(sorte() * 60) : 0,
    plano_vigente: null, administrador: false, online: i % 23 === 0, situacao, ano_residencia: ano, servico: servicos[i % servicos.length], uf: ['SP', 'PR', 'MG', 'RJ', 'BA'][i % 5], cidade: 'Cidade de exemplo', provas: 'teot,taro',
    origem: { fonte: i % 3 ? 'instagram' : 'google', meio: 'social', campanha: 'exemplo' }, acertos_primeira: Math.round(resp * 0.5), erros_primeira: Math.round(resp * 0.5),
  }
})
export const assinaturas = [], cobrancas = []
const PRECO = { mensal: 39.9, semestral: 209.4, anual: 358.8 }, ANTIGO = { semestral: 179.9, anual: 239.9 }
const somarMeses = (t, m) => { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() + m); return d.getTime() }
usuarios.forEach((u, i) => {
  const criado = Date.parse(u.criado_em)
  const out = criado < Date.parse('2026-11-01T03:00:00Z') && criado >= Date.parse('2026-10-01T03:00:00Z')
  if (sorte() > (criado >= Date.parse('2026-11-01T03:00:00Z') ? 0.42 : 0.33)) return
  const compra = Math.min(agora - 3600000, criado + Math.floor(sorte() ** 3 * 9 * dia) + 1800000)
  const plano = out ? (sorte() < 0.45 ? 'anual' : sorte() < 0.2 ? 'semestral' : 'mensal') : (sorte() < 0.78 ? 'mensal' : sorte() < 0.75 ? 'anual' : 'semestral')
  const meio = plano === 'mensal' ? (sorte() < 0.9 ? 'pix' : 'cartao') : (sorte() < 0.55 ? 'pix' : 'cartao')
  const valor = plano === 'mensal' ? PRECO.mensal : compra < Date.parse('2026-11-01T03:00:00Z') ? ANTIGO[plano] : PRECO[plano]
  const meses = plano === 'mensal' ? 1 : plano === 'semestral' ? 6 : 12
  const base = { id_usuario: u.id_usuario, usuario: u.email, nome: u.nome, plano, meio, administrador: false, proxima_cobranca: null, ultima_atualizacao: AGORA }
  if (meio === 'pix') {
    // Pix: cada pagamento é uma assinatura; o mensal renova (paga de novo) com 75% de chance.
    let t = compra
    for (let k = 0; k < 6; k++) {
      const fim = somarMeses(t, meses)
      const a = { ...base, status: 'ativa', criada_em: new Date(t).toISOString(), inicio_periodo: new Date(t).toISOString(), ultima_cobranca_em: new Date(t).toISOString(), fim_periodo: new Date(fim).toISOString(), cancelar_ao_fim: true, cancelada_em: null }
      assinaturas.push(a); cobrancas.push({ ...base, valor, em: a.ultima_cobranca_em, id_pagamento: String(3000000 + cobrancas.length), situacao: 'paga' })
      if (fim > agora || sorte() > 0.75) { if (fim <= agora) a.status = 'vencida'; break }
      t = fim - Math.floor(sorte() * 2 * dia)
      if (t > agora) break
    }
  } else {
    let ultima = compra
    while (somarMeses(ultima, meses) < agora) ultima = somarMeses(ultima, meses)
    const desligou = sorte() < 0.08
    assinaturas.push({ ...base, status: 'ativa', criada_em: new Date(compra).toISOString(), inicio_periodo: new Date(ultima).toISOString(), ultima_cobranca_em: new Date(ultima).toISOString(), fim_periodo: new Date(somarMeses(ultima, meses)).toISOString(), cancelar_ao_fim: desligou, cancelada_em: desligou ? new Date(agora - 2 * dia).toISOString() : null })
    cobrancas.push({ ...base, valor, em: new Date(ultima).toISOString(), id_pagamento: String(4000000 + cobrancas.length), situacao: 'paga' })
  }
  u.plano_vigente = plano
})
const serie = Array.from({ length: 365 }, (_, i) => {
  const d = new Date(agora - (364 - i) * dia), k = d.toISOString().slice(0, 10), ativo = d.getTime() >= inicio
  const fds = d.getUTCDay() === 6 ? 0.55 : d.getUTCDay() === 0 ? 0.8 : 1
  return { dia: k, cadastros: 0, ativos: ativo ? Math.round((25 + (i - 300) * 0.4) * fds * (0.85 + sorte() * 0.3)) : 0, respostas: ativo ? Math.round((900 + (i - 300) * 18) * fds * (0.8 + sorte() * 0.4)) : 0 }
})
export async function instalarDados(page) {
  const chamadas = await instalarBase(page)
  await page.route('https://falso.supabase.co/rest/v1/rpc/**', async route => {
    const nome = new URL(route.request().url()).pathname.split('/').at(-1)
    const dados = {
      listar_usuarios_admin: usuarios, listar_assinaturas_admin: assinaturas, cobrancas_admin: cobrancas, listar_metas_comerciais_admin: [],
      resumo_admin: [{ usuarios: usuarios.length, novos_7d: 30, online_agora: 3, ativos_hoje: 30, ativos_7d: 90, ativos_30d: 130, respondidas_hoje: 900, respondidas_7d: 8000, assinantes_vigentes: 70 }],
      jornada_crescimento_admin: { serie, coortes: [], primeiros: [] },
      sinais_usuarios_admin: usuarios.filter((_, i) => i % 4 === 0).map(u => ({ id_usuario: u.id_usuario, planos_vezes: 2, planos_ultima: new Date(agora - (u.id_usuario.endsWith('4') ? 0 : 5) * dia).toISOString(), flashcards_semana: 4, flashcards_total: 20, locais_trabalho: null })),
    }
    if (nome in dados) { chamadas.push(nome); await route.fulfill({ json: dados[nome] }); return }
    await route.fallback()
  })
  return chamadas
}
