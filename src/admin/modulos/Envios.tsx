import { useCallback, useEffect, useMemo, useState } from 'react'
import { nomeEdicao } from '../../estado/sessao'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { PRAZO_LOTE_MS, avisarEmailsEnviados, enviarEmLotes, erroDoPainel, motivoFalhaEmail, ouvirEmailsEnviados, textoLote, type RespostaLote } from '../../componentes/admin/formatos'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, dataHora, inteiro, normalizar } from '../ui/formato'
import { Busca, Cabeca, Carregando, Estado, Faixa, Filtro, Interruptor, Metrica, Painel, Selo } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'
import { Tabela } from '../ui/tabela'

interface ConfigEmails { marcos_automaticos: boolean; alertas_admin: boolean }
interface EmailEnviado { id: number; tipo: string; marco: number | null; assunto: string | null; status: string; erro: string | null; enviado_em: string; usuario: string | null }
interface ResumoRelatorio { pendentes: number; enviados: number; falharam: number }
const MIGRACAO = '202609290200_painel_admin_2.sql'
const TIPO_EMAIL: Record<string, string> = { marco: 'Parabéns automático', parabens: 'Carta enviada por você', carta: 'Carta pessoal', alerta_admin: 'Alerta para você', relatorio: 'Resumo de estudo', lembrete: 'Lembrete', relato_resolvido: 'Aviso de relato resolvido' }
function mesAnterior() { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

/** Comunicação › Relatórios e envios: o relatório do mês, os e-mails automáticos e o registro do que saiu. */
export default function Envios() {
  const parte = defParte('envios')
  const [config, definirConfig] = useState<ConfigEmails | null>(null)
  const [enviados, definirEnviados] = useState<EmailEnviado[] | null>(null)
  const [erro, definirErro] = useState('')
  const carregar = useCallback(async () => {
    try {
      const [e, lista] = await Promise.all([chamarRpc<ConfigEmails[]>('obter_config_emails_admin', {}), chamarRpc<EmailEnviado[]>('listar_emails_admin', {})])
      definirConfig(e[0] ?? null); definirEnviados(lista); definirErro('')
    } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])
  useEffect(() => ouvirEmailsEnviados(() => void carregar()), [carregar])

  async function salvar(proximo: ConfigEmails) {
    definirConfig(proximo)
    try { await chamarRpc('definir_config_emails_admin', { p_marcos: proximo.marcos_automaticos, p_alertas: proximo.alertas_admin }); avisoRapido('Configuração dos e-mails salva.') }
    catch { avisoRapido('Não foi possível salvar a configuração de e-mails. Nada mudou.', 'erro'); await carregar() }
  }
  const semana = enviados?.filter(e => Date.now() - Date.parse(e.enviado_em) < 7 * 86_400_000) ?? []

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Comunicação" titulo={parte.rotulo} pergunta={parte.pergunta} />
    {erro && <Faixa tom="erro" titulo="Os e-mails não carregaram">{erro}</Faixa>}
    {enviados && <section className="a3-painel"><div className="a3-faixa-metricas" style={{ '--colunas': 4 } as React.CSSProperties}>
      <Metrica rotulo="Enviados em 7 dias" valor={inteiro(semana.filter(e => e.status === 'enviado').length)} qualidade="confirmado" nota={`dos últimos ${enviados.length} registros`} />
      <Metrica rotulo="Falharam em 7 dias" valor={inteiro(semana.filter(e => e.status === 'falhou').length)} qualidade="confirmado" nota="motivo em cada linha abaixo" />
      <Metrica rotulo="Cartas e lembretes" valor={inteiro(semana.filter(e => e.tipo === 'carta' || e.tipo === 'lembrete' || e.tipo === 'parabens').length)} qualidade="confirmado" nota="em 7 dias" />
      <Metrica rotulo="Automáticos" valor={inteiro(semana.filter(e => e.tipo === 'marco' || e.tipo === 'relatorio').length)} qualidade="confirmado" nota="parabéns e resumos, em 7 dias" />
    </div></section>}
    <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <RelatorioMensal />
      <Painel titulo="E-mails automáticos" descricao="Saem sozinhos; desligar aqui vale para todo mundo.">
        {!config ? (erro ? <Estado compacto tipo="erro" titulo="Configuração indisponível" /> : <Carregando linhas={2} />) : <div className="a3-pilha">
          <Interruptor marcado={config.marcos_automaticos} aoMudar={v => void salvar({ ...config, marcos_automaticos: v })} titulo="Parabéns pelos emblemas" descricao="50, 100, 250, 500, 1.000, 2.000, 3.000 e 4.000 questões; uma vez por emblema e só para quem não desligou em Minha conta." />
          <Interruptor marcado={config.alertas_admin} aoMudar={v => void salvar({ ...config, alertas_admin: v })} titulo="Me avisar por e-mail" descricao="Quando um pagamento der erro ou alguém escrever que um comentário não ajudou." />
          <p className="a3-mudo a3-pequeno">Todos os e-mails para as pessoas saem como carta: só texto, sem logo, assinados “Um abraço, Tales, do Orto Questões”.</p>
        </div>}
      </Painel>
    </div>
    <UltimosEnvios lista={enviados} />
  </div>
}

function RelatorioMensal() {
  const [mes, definirMes] = useState(mesAnterior)
  const [resumo, definirResumo] = useState<ResumoRelatorio | null>(null)
  const [previa, definirPrevia] = useState<string | null>(null)
  const [enviando, definirEnviando] = useState('')
  const [versao, definirVersao] = useState(0)
  const [resultado, definirResultado] = useState<{ texto: string; erro: boolean } | null>(null)
  useEffect(() => {
    let vivo = true
    definirResumo(null)
    chamarRpc<ResumoRelatorio[]>('resumo_relatorio_admin', { p_mes: mes }).then(([r]) => { if (vivo) definirResumo(r ?? null) }).catch(() => undefined)
    return () => { vivo = false }
  }, [mes, versao])
  async function verPrevia() {
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_relatorio', mes }); definirPrevia(r.html) }
    catch (f) { avisoRapido(`Não deu para montar a prévia: ${String(f).replace(/^Error: /, '')}`, 'erro') }
  }
  async function enviar() {
    if (!resumo?.pendentes || !(await confirmar({ titulo: `Enviar o relatório de ${nomeEdicao(mes)} para ${resumo.pendentes} ${resumo.pendentes === 1 ? 'assinante' : 'assinantes'}?`, texto: 'Sai em lotes; quem desligou em Minha conta fica de fora.', sim: 'Enviar agora' }))) return
    let total = 0
    try {
      const soma = await enviarEmLotes(limite => chamarFuncao<RespostaLote>('enviar-email', { acao: 'relatorios_mensais', mes, limite }, { prazoMs: PRAZO_LOTE_MS }), n => { total = n; definirEnviando(`Enviando… ${n} até agora`) })
      definirResultado({ texto: `Relatório de ${nomeEdicao(mes)}: ${textoLote(soma)}.`, erro: false })
    } catch (f) { definirResultado({ texto: `A tela parou de esperar (${String(f).replace(/^Error: /, '')}). ${total} já tinham saído; o servidor pode ter mandado mais. Os números foram recarregados.`, erro: true }) }
    finally { definirEnviando(''); definirVersao(v => v + 1); avisarEmailsEnviados() }
  }
  return <Painel titulo="Relatório mensal dos assinantes" descricao="Evolução do mês, temas que subiram e caíram e o próximo passo, para cada assinante que não desligou.">
    <div className="a3-pilha">
      <div className="a3-editor__numero">
        <label className="a3-campo"><span>Mês do relatório</span><input className="a3-entrada" type="month" value={mes} max={mesAnterior()} onChange={e => e.target.value && definirMes(e.target.value)} /></label>
      </div>
      <dl className="a3-pares">
        <div><dt>Para enviar</dt><dd>{resumo ? inteiro(resumo.pendentes) : '…'}</dd></div>
        <div><dt>Já enviados</dt><dd>{resumo ? inteiro(resumo.enviados) : '…'}</dd></div>
        {!!resumo?.falharam && <div><dt>Com falha</dt><dd className="a3-erro-texto">{resumo.falharam}</dd></div>}
      </dl>
      {resultado && <Faixa tom={resultado.erro ? 'erro' : 'ok'}>{resultado.texto}</Faixa>}
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => void verPrevia()}><Icone nome="olho" tamanho={15} />Ver o meu relatório</button>
        <button type="button" className="a3-botao" disabled={!resumo?.pendentes || !!enviando} onClick={() => void enviar()}><Icone nome="enviar" tamanho={15} />{enviando || (resumo?.pendentes ? `Enviar para ${resumo.pendentes}` : 'Ninguém pendente')}</button>
      </div>
      <p className="a3-mudo a3-pequeno">Para sair sozinho todo dia 1º, dá para agendar no Supabase (instruções no guia de configuração).</p>
      {previa && <div className="a3-pilha"><iframe className="a3-previa-email" title="Prévia do relatório mensal" srcDoc={previa} sandbox="" /><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" style={{ justifySelf: 'start' }} onClick={() => definirPrevia(null)}>Fechar prévia</button></div>}
    </div>
  </Painel>
}

function UltimosEnvios({ lista }: { lista: EmailEnviado[] | null }) {
  const [filtro, definirFiltro] = useState<'todos' | 'falhou' | string>('todos')
  const [busca, definirBusca] = useState('')
  const termo = normalizar(busca.trim())
  const tipos = useMemo(() => [...new Set((lista ?? []).map(e => e.tipo))], [lista])
  const visiveis = useMemo(() => (lista ?? []).filter(e => (filtro === 'todos' || (filtro === 'falhou' ? e.status === 'falhou' : e.tipo === filtro)) && combina([e.assunto, e.usuario, TIPO_EMAIL[e.tipo]], termo)), [lista, filtro, termo])
  return <Painel justo titulo="Registro de envios" descricao="Os mais recentes primeiro, de todos os tipos.">
    {!lista ? <div style={{ padding: 20 }}><Carregando linhas={4} /></div> : <>
      <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar assunto ou e-mail" /></div>
      <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Filtrar">
        <Filtro ativo={filtro === 'todos'} aoClicar={() => definirFiltro('todos')} contagem={lista.length}>Todos</Filtro>
        <Filtro ativo={filtro === 'falhou'} aoClicar={() => definirFiltro('falhou')} contagem={lista.filter(e => e.status === 'falhou').length}>Com falha</Filtro>
        {tipos.map(t => <Filtro key={t} ativo={filtro === t} aoClicar={() => definirFiltro(t)} contagem={lista.filter(e => e.tipo === t).length}>{TIPO_EMAIL[t] ?? t}</Filtro>)}
      </div>
      <Tabela rotulo="Registro de envios" linhas={visiveis} chave={e => String(e.id)} porPagina={30}
        vazio={<div style={{ padding: 20 }}><Estado icone="carta" titulo="Nenhum e-mail neste filtro" /></div>}
        colunas={[
          { id: 'a', titulo: 'E-mail', celula: e => <span style={{ display: 'grid' }}><span className="a3-nome">{e.assunto ?? TIPO_EMAIL[e.tipo]}</span><span className="a3-sub">{TIPO_EMAIL[e.tipo] ?? e.tipo}{e.usuario ? ` · ${e.usuario}` : ''}</span>{e.status === 'falhou' && <span className="a3-sub a3-erro-texto">{motivoFalhaEmail(e.erro)}</span>}</span> },
          { id: 's', titulo: 'Situação', rotuloCelular: 'Situação', celula: e => <Selo tom={e.status === 'enviado' ? 'ok' : e.status === 'falhou' ? 'erro' : undefined}>{e.status === 'enviado' ? 'Enviado' : e.status === 'falhou' ? 'Falhou' : e.status}</Selo> },
          { id: 'q', titulo: 'Quando', numero: true, rotuloCelular: 'Quando', ordem: e => e.enviado_em, celula: e => dataHora(e.enviado_em) },
        ]} ordemInicial={{ coluna: 'q', sentido: 'desc' }} />
    </>}
  </Painel>
}
