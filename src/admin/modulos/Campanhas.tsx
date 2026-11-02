import { useCallback, useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { PRAZO_LOTE_MS, avisarEmailsEnviados, enviarEmLotes, erroDoPainel, ouvirEmailsEnviados, textoLote, type RespostaLote } from '../../componentes/admin/formatos'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone, type NomeIconeAdmin } from '../ui/Icone'
import { data, haQuanto, inteiro } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Painel, Selo } from '../ui/kit'
import { confirmar } from '../ui/sobreposicoes'
import { Tabela } from '../ui/tabela'

const MIGRACAO = '202610040100_emails_lembretes.sql'
const MIGRACAO_LISTA = '202610060300_lembretes_sem_spam.sql'
type Campanha = 'nunca' | 'tres_dias' | 'sete_dias' | 'renovacao_pix' | 'renovacao_pix_hoje'
type Escolha = Campanha | 'quinzenal'
interface Pessoa {
  id_usuario: string; nome: string | null; email: string; respondidas: number; acertos: number
  dias_fora: number | null; dias_restantes: number | null; plano: string | null; fim_periodo: string | null
  ultimo_lembrete_em: string | null; ultimo_lembrete_assunto: string | null; lembretes_30d: number; liberado: boolean
}
interface Resumo { campanha: Campanha; pessoas: number; enviados_7d: number; enviados_total: number; falharam_7d: number }
const CAMPANHAS: Array<{ id: Campanha; titulo: string; para: string; icone: NomeIconeAdmin; grupo: 'Ativação' | 'Retorno' | 'Renovação' }> = [
  { id: 'nunca', grupo: 'Ativação', titulo: 'Primeira missão', para: 'Quem criou a conta há pelo menos um dia e nunca respondeu uma questão. Apresenta o site e convida a dar uma chance. Cada pessoa recebe uma vez só.', icone: 'estrela' },
  { id: 'tres_dias', grupo: 'Retorno', titulo: 'Fogueira apagando', para: 'Quem respondia e está de 3 a 6 dias sem aparecer. Puxa de volta antes de o hábito esfriar.', icone: 'relogio' },
  { id: 'sete_dias', grupo: 'Retorno', titulo: 'Retomar a jornada', para: 'Quem respondia e está de 7 a 90 dias sem aparecer. Tom acolhedor: o progresso está guardado, é só voltar.', icone: 'voltar' },
  { id: 'renovacao_pix', grupo: 'Renovação', titulo: 'Pix: faltam 3 dias', para: 'Quem pagou no Pix e tem o acesso terminando nos próximos 3 dias, sem ter renovado. Mostra as questões, o acerto e o ritmo da semana da pessoa, e chama para renovar. Um por compra.', icone: 'pix' },
  { id: 'renovacao_pix_hoje', grupo: 'Renovação', titulo: 'Pix: termina hoje', para: 'Quem pagou no Pix e tem o acesso terminando hoje, sem ter renovado. Último aviso, com os mesmos números da pessoa. Um por compra.', icone: 'alerta' },
]
const PLANO: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }

/** Última quinzena encerrada no fuso de São Paulo (mesma regra da Function). */
function quinzenaAnterior(agora = new Date()) {
  const sp = new Date(agora.getTime() - 3 * 3_600_000)
  if (sp.getUTCDate() >= 16) return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, '0')}-q1`
  const ant = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth() - 1, 1))
  return `${ant.getUTCFullYear()}-${String(ant.getUTCMonth() + 1).padStart(2, '0')}-q2`
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
function nomeQuinzena(ref: string) {
  const [ano, mes] = ref.split('-').map(Number)
  return `${ref.endsWith('q1') ? '1 a 15' : `16 a ${new Date(Date.UTC(ano, mes, 0)).getUTCDate()}`} de ${MESES[mes - 1]}`
}

type Execucao = { estado: 'enviando'; feitos: number } | { estado: 'feito'; texto: string } | { estado: 'falha'; texto: string } | null

/**
 * Comunicação › Campanhas. Fluxo seguro: escolher → ver o público → prévia → revisão → confirmar → enviar → resultado.
 * Nada sai sem a confirmação com os nomes; as travas contra spam são do servidor e não mudam aqui.
 */
export default function Campanhas() {
  const nav = usarNav()
  const parte = defParte('lembretes')
  const [resumo, definirResumo] = useState<Resumo[] | null>(null)
  const [erro, definirErro] = useState('')
  const [listas, definirListas] = useState<Partial<Record<Campanha, Pessoa[] | string>>>({})
  const [escolha, escolher] = useState<Escolha>('nunca')
  const [ref] = useState(quinzenaAnterior)
  const [quinzenal, definirQuinzenal] = useState<{ pendentes: number; enviados: number; falharam: number } | string | null>(null)
  const [previa, definirPrevia] = useState<{ html: string; para: string | null } | string | null>(null)
  const [execucao, definirExecucao] = useState<Execucao>(null)

  const carregar = useCallback(async () => {
    try { definirResumo(await chamarRpc<Resumo[]>('resumo_lembretes_admin', {})); definirErro('') } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
    const novas: Partial<Record<Campanha, Pessoa[] | string>> = {}
    await Promise.all(CAMPANHAS.map(async c => {
      try { novas[c.id] = await chamarRpc<Pessoa[]>('listar_destinatarios_lembrete_admin', { p_campanha: c.id }) } catch (f) { novas[c.id] = erroDoPainel(f, MIGRACAO_LISTA) }
    }))
    definirListas(novas)
    chamarRpc<Array<{ pendentes: number; enviados: number; falharam: number }>>('resumo_quinzenal_admin', { p_ref: ref })
      .then(([r]) => definirQuinzenal(r ?? { pendentes: 0, enviados: 0, falharam: 0 }))
      .catch(f => definirQuinzenal(erroDoPainel(f, '202610110200_quinzenal_e_pix_antecipado.sql')))
  }, [ref])
  useEffect(() => { void carregar() }, [carregar])
  useEffect(() => ouvirEmailsEnviados(() => void carregar()), [carregar])
  useEffect(() => { definirPrevia(null); definirExecucao(null) }, [escolha])

  const c = CAMPANHAS.find(x => x.id === escolha)
  const lista = c ? listas[c.id] : undefined
  const pessoas = c ? Number(resumo?.find(x => x.campanha === c.id)?.pessoas ?? 0) : typeof quinzenal === 'object' && quinzenal ? Number(quinzenal.pendentes) : 0
  const pessoasDe = (id: Campanha) => Number(resumo?.find(x => x.campanha === id)?.pessoas ?? 0)

  async function verPrevia(pessoa?: Pessoa) {
    definirPrevia('carregando')
    try {
      if (!c) { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_quinzenal', quinzena: ref }); definirPrevia({ html: r.html, para: null }); return }
      const extra = pessoa ? { id_usuario: pessoa.id_usuario, dias_fora: pessoa.dias_fora ?? undefined, dias_restantes: pessoa.dias_restantes ?? undefined, fim_periodo: pessoa.fim_periodo ?? undefined, plano: pessoa.plano ?? undefined } : {}
      const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_lembrete', campanha: c.id, ...extra })
      definirPrevia({ html: r.html, para: pessoa ? (pessoa.nome ?? pessoa.email) : null })
    } catch (f) { definirPrevia(`Não deu para montar a prévia: ${String(f).replace(/^Error: /, '')}`) }
  }

  async function enviar() {
    if (!pessoas) return
    const nomes = Array.isArray(lista) ? lista.filter(p => p.liberado).map(p => p.nome ?? p.email) : []
    const titulo = c ? `Enviar "${c.titulo}" para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}?` : `Enviar o resumo de ${nomeQuinzena(ref)} para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}?`
    if (!(await confirmar({ titulo, sim: 'Enviar agora', texto: <>
      {nomes.length > 0 && <ul className="a3-lista-nomes">{nomes.slice(0, 15).map(n => <li key={n}>{n}</li>)}{nomes.length > 15 && <li>… e mais {nomes.length - 15}</li>}</ul>}
      <span>O envio sai em lotes. O servidor ainda segura quem recebeu e-mail nas últimas 48 horas ou 3 em 14 dias.</span>
    </> }))) return
    let total = 0
    definirExecucao({ estado: 'enviando', feitos: 0 })
    try {
      const soma = await enviarEmLotes(
        limite => chamarFuncao<RespostaLote>('enviar-email', c ? { acao: 'lembretes', campanha: c.id, limite } : { acao: 'relatorios_quinzenais', quinzena: ref, limite }, { prazoMs: PRAZO_LOTE_MS }),
        n => { total = n; definirExecucao({ estado: 'enviando', feitos: n }) })
      definirExecucao({ estado: 'feito', texto: `${c ? c.titulo : `Resumo de ${nomeQuinzena(ref)}`}: ${textoLote(soma)}.` })
    } catch (f) {
      definirExecucao({ estado: 'falha', texto: `A tela parou de esperar (${String(f).replace(/^Error: /, '')}). ${total} já tinham saído; o servidor pode ter mandado mais. A lista foi recarregada com o que ele registrou: confira antes de enviar de novo.` })
    } finally { avisarEmailsEnviados() }
  }

  if (erro) return <div className="a3-pilha a3-pilha--larga"><Cabeca area="Comunicação" titulo={parte.rotulo} pergunta={parte.pergunta} /><Estado tipo="erro" titulo="As campanhas não carregaram" texto={erro} /></div>
  const r = c ? resumo?.find(x => x.campanha === c.id) : null
  const aguardando = Array.isArray(lista) ? lista.filter(p => !p.liberado).length : 0
  const passo = execucao ? 4 : previa && typeof previa === 'object' ? 3 : 2

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Comunicação" titulo={parte.rotulo} pergunta={parte.pergunta}
      acoes={<a className="a3-botao a3-botao--contorno" href={nav.link('cartas')} onClick={e => { e.preventDefault(); nav.ir('cartas') }}><Icone nome="carta" tamanho={15} />Carta pessoal por grupo</a>} />
    <Faixa titulo="Contra o spam, vale para tudo">Ninguém recebe dois lembretes em menos de 2 dias (só "Pix: termina hoje" passa, por ser o último aviso); o servidor segura quem recebeu qualquer e-mail nas últimas 48 horas ou 3 em 14 dias; e cada lembrete sai uma vez por ausência. "Primeira missão" e a carta "Criou e não começou" falam com as mesmas pessoas, assim como "Retomar a jornada" e "Sumiu": use um ou outro.</Faixa>

    <div className="a3-campanhas">
      <nav className="a3-painel a3-campanhas__lista" aria-label="Campanhas">
        {(['Ativação', 'Retorno', 'Renovação'] as const).map(g => <div key={g}>
          <span className="a3-rotulo">{g}</span>
          {CAMPANHAS.filter(x => x.grupo === g).map(x => <button key={x.id} type="button" aria-current={escolha === x.id ? 'true' : undefined} onClick={() => escolher(x.id)}>
            <Icone nome={x.icone} tamanho={17} /><span>{x.titulo}</span><b className="num">{resumo ? pessoasDe(x.id) : '·'}</b>
          </button>)}
        </div>)}
        <div><span className="a3-rotulo">Relatório</span>
          <button type="button" aria-current={escolha === 'quinzenal' ? 'true' : undefined} onClick={() => escolher('quinzenal')}><Icone nome="grafico" tamanho={17} /><span>Resumo quinzenal</span><b className="num">{typeof quinzenal === 'object' && quinzenal ? quinzenal.pendentes : '·'}</b></button>
        </div>
      </nav>

      <div className="a3-pilha">
        <section className="a3-painel a3-campanha">
          <div className="a3-campanha__cabeca">
            <div style={{ minWidth: 0 }}>
              <span className="a3-rotulo">{c ? c.grupo : 'Relatório de estudo'}</span>
              <h2 className="a3-titulo-2">{c ? c.titulo : `Resumo quinzenal · ${nomeQuinzena(ref)}`}</h2>
              <p className="a3-mudo" style={{ marginTop: 4 }}>{c ? c.para : 'Questões da quinzena, acerto comparado com a anterior, os temas e o próximo passo. Vai para quem estudou e não desligou os resumos. Sai sozinho nos dias 1 e 16; no dia 1, assinantes recebem só o relatório do mês.'}</p>
            </div>
          </div>
          <ol className="a3-passos" aria-label="Etapas do envio">
            {['Público', 'Prévia', 'Revisão e envio', 'Resultado'].map((t, i) => <li key={t} className={i + 1 < passo ? 'feito' : i + 1 === passo ? 'atual' : undefined}><span>{i + 1}</span>{t}</li>)}
          </ol>
          <dl className="a3-campanha__numeros">
            <div><dt>Recebem agora</dt><dd className="num">{c ? (resumo ? inteiro(pessoas) : '…') : typeof quinzenal === 'object' && quinzenal ? inteiro(quinzenal.pendentes) : '…'}</dd></div>
            {c ? <><div><dt>Aguardando intervalo</dt><dd className="num">{aguardando}</dd></div><div><dt>Enviados em 7 dias</dt><dd className="num">{inteiro(Number(r?.enviados_7d ?? 0))}</dd></div><div><dt>No total</dt><dd className="num">{inteiro(Number(r?.enviados_total ?? 0))}</dd></div>{Number(r?.falharam_7d) > 0 && <div><dt>Falharam em 7 dias</dt><dd className="num a3-erro-texto">{r!.falharam_7d}</dd></div>}</>
              : typeof quinzenal === 'object' && quinzenal ? <><div><dt>Enviados</dt><dd className="num">{inteiro(Number(quinzenal.enviados))}</dd></div>{Number(quinzenal.falharam) > 0 && <div><dt>Falharam</dt><dd className="num a3-erro-texto">{quinzenal.falharam}</dd></div>}</> : null}
          </dl>
          {typeof quinzenal === 'string' && !c && <div style={{ padding: '0 20px 16px' }}><Faixa tom="aviso">{quinzenal}</Faixa></div>}
          <div className="a3-campanha__acoes">
            <button type="button" className="a3-botao a3-botao--contorno" onClick={() => void verPrevia()}><Icone nome="olho" tamanho={15} />Ver prévia</button>
            <button type="button" className="a3-botao" disabled={!pessoas || execucao?.estado === 'enviando'} onClick={() => void enviar()}>
              <Icone nome="enviar" tamanho={15} />{execucao?.estado === 'enviando' ? `Enviando… ${execucao.feitos} de ${pessoas}` : pessoas ? `Revisar e enviar para ${pessoas}` : 'Ninguém agora'}</button>
          </div>
          {execucao && execucao.estado !== 'enviando' && <div style={{ padding: '0 20px 20px' }}><Faixa tom={execucao.estado === 'feito' ? 'ok' : 'erro'} titulo={execucao.estado === 'feito' ? 'Envio concluído' : 'O envio não terminou na tela'}>{execucao.texto}</Faixa></div>}
        </section>

        {previa && <Painel titulo="Prévia" descricao={typeof previa === 'object' && previa.para ? `Com os números de ${previa.para}.` : 'Com números de exemplo.'} acoes={<button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => definirPrevia(null)}><Icone nome="fechar" tamanho={14} />Fechar</button>}>
          {previa === 'carregando' ? <Carregando linhas={4} texto="Montando a prévia…" /> : typeof previa === 'string' ? <Faixa tom="erro">{previa}</Faixa> : <iframe className="a3-previa-email" title="Prévia do e-mail" srcDoc={previa.html} sandbox="" />}
        </Painel>}

        {c && <Painel justo titulo="Quem recebe" descricao="Calculado na hora pelo banco. Quem recebeu um lembrete há menos de 2 dias aparece como aguardando e fica fora do envio.">
          {lista === undefined ? <div style={{ padding: 20 }}><Carregando linhas={3} /></div> : typeof lista === 'string' ? <div style={{ padding: 20 }}><Faixa tom="aviso">{lista}</Faixa></div> :
            <Tabela rotulo="Quem recebe" linhas={lista} chave={p => p.id_usuario} porPagina={25}
              vazio={<div style={{ padding: 20 }}><Estado icone="certo" titulo="Ninguém nesta campanha agora" texto="A lista se atualiza sozinha quando alguém entra no critério." /></div>}
              colunas={[
                { id: 'p', titulo: 'Pessoa', ordem: p => (p.nome ?? p.email).toLowerCase(), celula: p => <span style={{ display: 'grid', opacity: p.liberado ? 1 : .6 }}><span className="a3-nome">{p.nome ?? p.email}</span><span className="a3-sub">{p.nome ? p.email : ''}</span>{!p.liberado && <span><Selo tom="aviso">Aguardando intervalo</Selo></span>}</span> },
                { id: 's', titulo: c.grupo === 'Renovação' ? 'Termina' : 'Situação', rotuloCelular: 'Situação', celula: p => c.grupo === 'Renovação' && p.fim_periodo
                  ? <span>{data(p.fim_periodo)}<span className="a3-sub">{PLANO[p.plano ?? ''] ?? p.plano} · {p.dias_restantes === 0 ? 'hoje' : p.dias_restantes === 1 ? 'amanhã' : `em ${p.dias_restantes} dias`}</span></span>
                  : Number(p.respondidas) === 0 ? 'Nunca respondeu' : `${p.dias_fora} dias sem aparecer` },
                { id: 'q', titulo: 'Questões', numero: true, rotuloCelular: 'Questões', ordem: p => Number(p.respondidas), celula: p => inteiro(Number(p.respondidas)) },
                { id: 'a', titulo: 'Acerto', numero: true, soLargo: true, celula: p => Number(p.respondidas) ? `${Math.round(100 * Number(p.acertos) / Number(p.respondidas))}%` : '—' },
                { id: 'u', titulo: 'Último lembrete', soLargo: true, celula: p => p.ultimo_lembrete_em ? <span>{haQuanto(p.ultimo_lembrete_em)}<span className="a3-sub">{p.ultimo_lembrete_assunto ?? ''}{Number(p.lembretes_30d) > 1 ? ` · ${p.lembretes_30d} em 30 dias` : ''}</span></span> : <span className="a3-mudo">nenhum ainda</span> },
                { id: 'v', titulo: '', celula: p => <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => void verPrevia(p)} aria-label={`Prévia para ${p.nome ?? p.email}`}><Icone nome="olho" tamanho={14} />Prévia</button> },
              ]} />}
        </Painel>}
      </div>
    </div>
  </div>
}
