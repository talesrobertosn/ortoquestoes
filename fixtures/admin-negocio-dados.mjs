// Dados inteiramente fictícios para testar e fotografar as telas reais do painel.
export const AGORA = '2026-11-08T21:00:00Z'
const agora = Date.parse(AGORA), dia = 86400000
const nomes = ['Marina Almeida','Rafael Torres','Camila Santos','Pedro Henrique','Luísa Martins','Gustavo Rocha','Beatriz Ferreira','Thiago Lima']
export const usuarios = Array.from({ length: 200 }, (_, i) => ({
  id_usuario: `00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`, nome: `${nomes[i%8]} ${i+1}`, email: `pessoa${i+1}@exemplo.test`,
  criado_em: new Date(agora-(199-i)*.8*dia).toISOString(), ultimo_login: new Date(agora-i%17*dia).toISOString(), ultima_atividade: i%5===0 ? null : new Date(agora-i%15*dia).toISOString(),
  respondidas: i%5===0 ? 0 : i*12+1, acertos: i*8, erros:i*4, respondidas_7d:i%3 ? i%41:0, plano_vigente: i%3===0 && i<120 ? ['mensal','semestral','anual'][i%7%3]:null,
  administrador:false, online:i===199, situacao:i%4 ? 'residente':'ortopedista', ano_residencia:`R${i%3+1}`, servico:i%2?'Hospital das Clínicas':'Santa Casa', uf:['SP','PR','MG','RJ'][i%4], cidade:'Cidade de exemplo', provas:'teot,taro',
  origem:{fonte:i%3?'instagram':'google',meio:'social',campanha:'campanha de exemplo'}, acertos_primeira:i*6, erros_primeira:i*4,
}))
export const assinaturas = usuarios.filter((_,i)=>i%3===0).map((u,i)=> {
  const plano=i%7===0?'anual':i%5===0?'semestral':'mensal', meio=i%3===0?'pix':'cartao'
  const ativa=i<40
  const ultima=new Date(agora-(ativa?20+i%9:50+i%20)*dia).toISOString()
  return {id_usuario:u.id_usuario,usuario:u.email,nome:u.nome,plano,meio,status:ativa?'ativa':'vencida',administrador:false,
    criada_em:ultima,inicio_periodo:ultima,ultima_cobranca_em:ultima,fim_periodo:new Date(agora+(ativa?3+i%27:-5-i%9)*dia).toISOString(),cancelar_ao_fim:meio==='pix'||i===4,cancelada_em:i===4?AGORA:null,ultima_atualizacao:AGORA,proxima_cobranca:null}
})
export const cobrancas = assinaturas.map((a,i)=>({id_usuario:a.id_usuario,usuario:a.usuario,nome:a.nome,plano:a.plano,meio:a.meio,valor:i===2?null:a.plano==='anual'?349:a.plano==='semestral'?209.9:39.9,em:a.ultima_cobranca_em,id_pagamento:String(1000000+i),situacao:'paga'}))
// Compras recentes para dar aos gráficos cadastros e compras em ritmos diferentes.
for(let i=150;i<200;i+=5){const u=usuarios[i],em=new Date(Math.min(agora,Date.parse(u.criado_em)+2*dia)).toISOString();const a={id_usuario:u.id_usuario,usuario:u.email,nome:u.nome,plano:'mensal',meio:'pix',status:'ativa',criada_em:em,inicio_periodo:em,ultima_cobranca_em:em,fim_periodo:new Date(Date.parse(em)+30*dia).toISOString(),cancelar_ao_fim:true,ultima_atualizacao:em,administrador:false};assinaturas.push(a);cobrancas.push({...a,em,valor:39.9,situacao:'paga',id_pagamento:String(2000000+i)});u.plano_vigente='mensal'}
export const jornada={
  serie:Array.from({length:365},(_,i)=>({dia:new Date(agora-(364-i)*dia).toISOString().slice(0,10),cadastros:i>205?1+i%3:0,ativos:i>205?5+i%19:0,respostas:i>205?60+i%251:0})),
  coortes:Array.from({length:8},(_,i)=>({semana:new Date(Date.parse('2026-10-19T12:00:00Z')-i*7*dia).toISOString().slice(0,10),cadastros:9+i%3,estudaram_1a_semana:7,voltaram_2a_semana:4})),
  primeiros:usuarios.filter(u=>u.respondidas>0).map(u=>({id_usuario:u.id_usuario,primeira:new Date(Date.parse(u.criado_em)+1800000).toISOString(),decima:u.respondidas>=10?new Date(Date.parse(u.criado_em)+dia).toISOString():null})),
}
export async function instalarDados(page, { vazio=false, falha=false }={}) {
  let notas=[{id:1,dia:'2026-11-03',texto:'Campanha de TEOT começou (exemplo fictício)'},{id:2,dia:'2026-10-28',texto:'Post sobre revisão por questões (exemplo fictício)'}]
  const chamadas=[]
  await page.route('https://falso.supabase.co/rest/v1/rpc/**',async route=>{
    const nome=new URL(route.request().url()).pathname.split('/').at(-1), args=route.request().postDataJSON()??{}
    chamadas.push(nome)
    const dados={
      eh_administrador:true, listar_usuarios_admin:vazio?[]:usuarios,listar_assinaturas_admin:vazio?[]:assinaturas,cobrancas_admin:vazio?[]:cobrancas,
      resumo_admin:[{usuarios:vazio?0:200,novos_7d:8,online_agora:1,ativos_hoje:16,ativos_7d:87,ativos_30d:120,respondidas_hoje:178,respondidas_7d:1872,assinantes_vigentes:40}],
      contadores_admin:[{usuarios:vazio?0:200,online_agora:1,relatos_abertos:0,avaliacoes_para_ler:0}],
      sinais_usuarios_admin:vazio?[]:usuarios.filter((_,i)=>i%3===0).map(u=>({id_usuario:u.id_usuario,planos_vezes:2,planos_ultima:AGORA,condicoes_ultima:AGORA,flashcards_semana:4,flashcards_total:20,locais_trabalho:'Santa Casa'})),
      listar_cortesias_admin:[],listar_fora_publico_admin:[],listar_eventos_pagamento_admin:vazio?[]:[
        {id:501,id_evento:'evento-501',tipo:'payment',id_recurso:'111111',status_processamento:'erro',erro:'consulta_mercado_pago_falhou',recebido_em:AGORA,processado_em:null,id_usuario:usuarios[0].id_usuario,nome:'Primeiro evento de exemplo',usuario:'evento1@exemplo.test'},
        {id:502,id_evento:'evento-502',tipo:'payment',id_recurso:'222222',status_processamento:'erro',erro:'consulta_mercado_pago_falhou',recebido_em:AGORA,processado_em:null,id_usuario:usuarios[1].id_usuario,nome:'Segundo evento de exemplo',usuario:'evento2@exemplo.test'},
      ],listar_decisoes_eventos_admin:[],auditoria_pagamentos_admin:[],listar_metas_comerciais_admin:[],listar_lidos_admin:[],
      jornada_crescimento_admin:vazio?{serie:[],coortes:[],primeiros:[]}:jornada,
      listar_anotacoes_negocio_admin:notas,resumo_indicacoes_admin:[{codigos:12,convidados:8,confirmados:5,confirmados_7d:2,dias_dados:150}],listar_indicacoes_admin:[],
    }
    if(falha&&['jornada_crescimento_admin','listar_anotacoes_negocio_admin'].includes(nome)){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Falha simulada'})});return}
    if(nome==='salvar_anotacao_negocio_admin'){notas=[{id:3,dia:args.p_dia,texto:args.p_texto},...notas];await route.fulfill({json:null});return}
    if(nome==='remover_anotacao_negocio_admin'){notas=notas.filter(n=>n.id!==args.p_id);await route.fulfill({json:null});return}
    if(nome in dados){await route.fulfill({json:dados[nome]});return}
    await route.fallback()
  })
  return chamadas
}
