import { useEffect, useMemo, useState } from 'react'
import { SITE } from '../../config'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { motivoFalhaEmail } from '../../componentes/admin/formatos'
import {
  FAIXAS, ROTULO_FAIXA, ROTULO_ORIGEM, TIPOS, TIPOS_MANUAIS, anterioresDosDados, contarLinks, escolherTipo, gerarCarta, gravarModelosSalvos,
  lerModelosSalvos, nivelExcesso, perfilDoBanco, preencher, problemaGrave, problemaNoAssunto, problemaNoTexto, renderizarCarta, resumoHistorico, rotuloEnvio, tipoCombina,
  type Carta, type DadosCartaBanco, type EnvioHistorico, type Faixa, type ModeloSalvo, type PerfilCarta, type TipoCarta,
} from '../../componentes/admin/modelosEmail'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import type { LinhaUsuario } from '../dados/pessoas'
import { Icone } from '../ui/Icone'
import { dataHora, haQuanto } from '../ui/formato'
import { Carregando, Faixa as FaixaAviso } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

const novaSemente = () => Math.floor(Math.random() * 2 ** 31)
const diaMes = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

/** A carta exatamente como chega: remetente, assunto e o mesmo HTML que sai (iframe isolado). */
export function PreviaCarta({ assunto, corpo, descadastro }: { assunto: string; corpo: string; descadastro?: boolean }) {
  const html = useMemo(() => renderizarCarta({ assunto, corpo, descadastro: descadastro ? `${SITE.url}#/emails?u=…` : null }).html, [assunto, corpo, descadastro])
  return <figure className="a3-previa">
    <figcaption className="a3-previa__topo">
      <span><b>De</b> Tales, do Orto Questões</span>
      <span><b>Assunto</b> {assunto || <span className="a3-mudo">(sem assunto)</span>}</span>
    </figcaption>
    <iframe title="Prévia exata do e-mail" srcDoc={html} sandbox="" />
  </figure>
}

/** Avisos de texto que não bloqueiam (o grave bloqueia à parte). */
export function AvisosTexto({ assunto, corpo }: { assunto: string; corpo: string }) {
  const avisos = [
    problemaNoAssunto(assunto) && `Assunto: ${problemaNoAssunto(assunto)}.`,
    problemaNoTexto(corpo) && `Texto: ${problemaNoTexto(corpo)}.`,
    contarLinks(corpo) > 1 && 'Mais de um link: cartas com um link só têm mais chance de cair na caixa principal.',
  ].filter(Boolean) as string[]
  if (!avisos.length) return null
  return <FaixaAviso tom="aviso" titulo="Antes de enviar">{avisos.join(' ')}</FaixaAviso>
}

export function AvisoExcesso({ n7, n30 }: { n7: number; n30: number }) {
  const nivel = nivelExcesso(n7)
  if (nivel === 'ok') return null
  return <FaixaAviso tom={nivel === 'muito' ? 'erro' : 'aviso'} titulo={`${n7} e-mails nos últimos 7 dias${n30 > n7 ? ` · ${n30} em 30` : ''}`}>{nivel === 'muito' ? 'Talvez seja melhor esperar.' : 'Veja se vale mandar mais um agora.'}</FaixaAviso>
}

/** Histórico de e-mails de uma pessoa, em linha do tempo. */
export function HistoricoEnvios({ lista, carregando, nota }: { lista: readonly EnvioHistorico[] | null; carregando?: boolean; nota?: string }) {
  if (!lista) return carregando ? <Carregando linhas={4} /> : <p className="a3-mudo">Histórico indisponível.</p>
  const r = resumoHistorico(lista)
  return <div className="a3-pilha">
    <div className="a3-historico-cabeca">
      <span className="a3-rotulo">E-mails recebidos</span>
      <span className="a3-pequeno a3-mudo">{r.n7} em 7 dias · {r.n30} em 30{r.falhas ? ` · ${r.falhas} não ${r.falhas === 1 ? 'saiu' : 'saíram'}` : ''}</span>
    </div>
    {r.ultimo ? <p className="a3-pequeno">Último {haQuanto(r.ultimo.em)}: <b>{rotuloEnvio(r.ultimo)}</b> <span className="a3-mudo">({dataHora(r.ultimo.em)})</span></p> : <p className="a3-pequeno"><b>Nunca recebeu e-mail do site.</b></p>}
    {lista.length > 0 && <ol className="a3-tempo">{lista.slice(0, 14).map((e, i) => <li key={i}>
      <time dateTime={e.em}>{diaMes(e.em)}</time>
      <span className="a3-tempo__marca"><i className={e.status === 'falhou' ? 'erro' : 'ok'} /></span>
      <div className="a3-tempo__texto">{rotuloEnvio(e)}{e.assunto && <small>“{e.assunto}”</small>}
        <small>{ROTULO_ORIGEM[e.origem ?? ''] ?? (e.tipo === 'marco' || e.tipo === 'relatorio' ? 'automático' : 'enviado por você')}{e.status === 'falhou' ? ` · não saiu: ${motivoFalhaEmail(e.erro)}` : e.status === 'enviando' ? ' · enviando' : ''}</small>
      </div>
    </li>)}</ol>}
    {nota && <p className="a3-mudo a3-pequeno">{nota}</p>}
  </div>
}

/**
 * Carta para uma pessoa: tipo escolhido pela situação (ou à mão), texto já escrito pelo motor, edição
 * opcional, prévia exata e histórico ao lado. Enviar pede confirmação e mostra o resultado; os avisos de
 * excesso e de texto continuam; o envio fica bloqueado para quem não quer receber.
 */
export function EditorCarta({ usuario, perfilReserva, historicoReserva, querReserva, aoEnviar }: {
  usuario: LinhaUsuario; perfilReserva: PerfilCarta; historicoReserva: EnvioHistorico[]; querReserva: boolean; aoEnviar?: () => void
}) {
  const { conta } = usarPainel()
  const args = useMemo(() => ({ p_id: usuario.id_usuario }), [usuario.id_usuario])
  const q = usarRpc<DadosCartaBanco | null>(conta, 'perfil_carta_admin', args)
  const semParte27 = !q.dados && !!q.erro && rpcInexistente(q.erro)
  const banco = q.dados ?? null
  const perfil = useMemo(() => banco ? perfilDoBanco(banco) : perfilReserva, [banco, perfilReserva])
  const historico = banco?.emails?.lista ?? historicoReserva
  const anteriores = useMemo(() => banco ? anterioresDosDados(banco) : historicoReserva, [banco, historicoReserva])
  const querCartas = banco ? banco.quer_cartas !== false : querReserva
  const auto = useMemo(() => escolherTipo(perfil, anteriores), [perfil, anteriores])
  const [tipo, definirTipo] = useState<TipoCarta | 'auto'>('auto')
  const [faixa, definirFaixa] = useState<Faixa | 'auto'>('auto')
  const [semente, definirSemente] = useState(novaSemente)
  const [editado, definirEditado] = useState<{ assunto: string; corpo: string } | null>(null)
  const [salvos, definirSalvos] = useState<ModeloSalvo[]>(lerModelosSalvos)
  const [nomeModelo, definirNomeModelo] = useState<string | null>(null)
  const [ocupado, definirOcupado] = useState(false)
  const tipoFinal = tipo === 'auto' ? auto.tipo : tipo
  const carta: Carta | string = useMemo(() => {
    try { return gerarCarta(perfil, { tipo: tipoFinal, faixa: faixa === 'auto' ? undefined : faixa, semente, anteriores, site: SITE.url }) }
    catch (f) { return String(f).replace(/^Error: /, '') }
  }, [perfil, tipoFinal, faixa, semente, anteriores])
  const pronta = typeof carta === 'string' ? null : carta
  const assunto = editado?.assunto ?? pronta?.assunto ?? ''
  const corpo = editado?.corpo ?? pronta?.corpo ?? ''
  useEffect(() => { definirTipo('auto'); definirFaixa('auto'); definirEditado(null) }, [usuario.id_usuario])
  const r = resumoHistorico(historico)
  const grave = problemaGrave(`${assunto}\n${corpo}`)
  const nome = usuario.nome ?? usuario.email ?? 'esta pessoa'

  async function sortear() {
    if (editado && !(await confirmar({ titulo: 'Trocar o texto que você editou?', texto: 'A edição se perde e entra outra versão sorteada.', sim: 'Sortear outra' }))) return
    definirEditado(null); definirSemente(novaSemente())
  }
  async function enviar() {
    if (!pronta || !assunto.trim() || !corpo.trim() || grave || ocupado) return
    if (!(await confirmar({ titulo: `Enviar esta carta para ${nome}?`, sim: 'Enviar carta', texto: <><span>{usuario.email}</span><span>Assunto: <b>{assunto}</b></span>{r.n7 >= 2 && <span style={{ color: 'var(--a3-aviso)' }}>Atenção: {r.n7} e-mails nos últimos 7 dias.</span>}</> }))) return
    definirOcupado(true)
    try {
      await chamarFuncao('enviar-email', { acao: 'carta', id_usuario: usuario.id_usuario, assunto, corpo, modelo: pronta.modelo, versao: pronta.versao, origem: 'manual' })
      avisoRapido(`Carta enviada para ${usuario.email}.`)
      definirEditado(null); definirSemente(novaSemente())
      await q.recarregar(); aoEnviar?.()
    } catch (f) { avisoRapido(`A carta não saiu: ${motivoFalhaEmail(String(f))}`, 'erro') }
    finally { definirOcupado(false) }
  }
  function salvarModelo() {
    if (!nomeModelo?.trim()) return
    const lista = [...salvos, { id: `meu-${Date.now()}`, titulo: nomeModelo.trim().slice(0, 60), texto: corpo, assunto }]
    definirSalvos(lista); gravarModelosSalvos(lista); definirNomeModelo(null); avisoRapido('Modelo salvo neste navegador.')
  }

  return <div className="a3-carta">
    <div className="a3-pilha">
      {semParte27 && <FaixaAviso>Sem a parte 27 no Supabase, a carta usa só o que a ficha tem e o histórico mostra os 20 últimos e-mails.</FaixaAviso>}
      {!querCartas && <FaixaAviso tom="erro" titulo="Esta pessoa não quer receber e-mails do site.">O envio fica bloqueado.</FaixaAviso>}
      <p className="a3-pequeno"><Icone nome="estrela" tamanho={14} /> {tipo === 'auto' ? <>Escolhida pela situação: <b>{TIPOS[auto.tipo].rotulo}{auto.faixa && auto.tipo === 'ativo' ? ` · ${ROTULO_FAIXA[auto.faixa]}` : ''}</b>. <span className="a3-mudo">{auto.motivo}</span></> : <>Você escolheu: <b>{TIPOS[tipoFinal].rotulo}</b>.</>}</p>
      {tipoFinal.startsWith('convite') && banco && !banco.novidades && <FaixaAviso tom="aviso">Esta pessoa não marcou “Quero receber novidades” (Termos, item 17.5.3). Convite para assinar só se ela tiver pedido ou se a conversa já existir.</FaixaAviso>}
      <div className="a3-grade a3-grade--2">
        <label className="a3-campo"><span>Situação</span>
          <select className="a3-entrada" value={tipo} onChange={e => { definirTipo(e.target.value as TipoCarta | 'auto'); definirEditado(null) }}>
            <option value="auto">Automática: {TIPOS[auto.tipo].rotulo}</option>
            {TIPOS_MANUAIS.map(t => <option key={t} value={t} disabled={!tipoCombina(t, perfil)}>{TIPOS[t].rotulo}{tipoCombina(t, perfil) ? '' : ' (não combina)'}</option>)}
          </select>
        </label>
        {tipoFinal === 'ativo' ? <label className="a3-campo"><span>Tom (faixa de acerto)</span>
          <select className="a3-entrada" value={faixa} onChange={e => { definirFaixa(e.target.value as Faixa | 'auto'); definirEditado(null) }}>
            <option value="auto">Pelo acerto da pessoa{pronta?.faixa ? ` (${ROTULO_FAIXA[pronta.faixa]})` : ''}</option>
            {FAIXAS.map(f => <option key={f} value={f}>{ROTULO_FAIXA[f]}</option>)}
          </select>
        </label> : salvos.length > 0 ? <label className="a3-campo"><span>Ou um modelo seu</span>
          <select className="a3-entrada" value="" onChange={e => { const m = salvos.find(x => x.id === e.target.value); if (m) definirEditado({ assunto: m.assunto ? preencher(m.assunto, perfil) : assunto, corpo: preencher(m.texto, perfil) }) }}>
            <option value="">Escolha…</option>{salvos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
          </select>
        </label> : <span />}
      </div>
      {pronta && <p className="a3-mudo a3-pequeno">Versão {pronta.versao.split('#')[1]?.replace('v', '')} de {pronta.versoes.total} · {pronta.versoes.novas} que a pessoa ainda não recebeu{pronta.personalizacao.length ? ` · personalizada com: ${pronta.personalizacao.join(', ')}` : ' · sem dado pessoal para citar'}{editado ? ' · editada por você' : ''}</p>}
      {typeof carta === 'string' && <FaixaAviso tom="erro" titulo="Não deu para escrever esta carta">{carta}</FaixaAviso>}
      <label className="a3-campo"><span>Assunto</span><input className="a3-entrada" maxLength={120} value={assunto} onChange={e => definirEditado({ assunto: e.target.value, corpo })} /></label>
      <label className="a3-campo"><span>Texto</span><textarea className="a3-entrada" rows={11} maxLength={6000} value={corpo} onChange={e => definirEditado({ assunto, corpo: e.target.value })} /><small>A assinatura “Um abraço, Tales, do Orto Questões” entra sozinha.</small></label>
      <AvisosTexto assunto={assunto} corpo={corpo} />
      {grave && <FaixaAviso tom="erro" titulo="O texto tem um problema que impede o envio">{grave}</FaixaAviso>}
      <AvisoExcesso n7={r.n7} n30={r.n30} />
      <div className="a3-acoes-linha">
        <button type="button" className="a3-botao" disabled={ocupado || !pronta || !!grave || !querCartas || !usuario.email} aria-busy={ocupado} onClick={() => void enviar()}><Icone nome="enviar" tamanho={15} />{ocupado ? 'Enviando…' : 'Enviar carta'}</button>
        <button type="button" className="a3-botao a3-botao--contorno" disabled={ocupado} onClick={() => void sortear()}><Icone nome="raio" tamanho={15} />Outra versão</button>
        {editado && <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => definirEditado(null)}>Desfazer edição</button>}
        {nomeModelo === null ? <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => definirNomeModelo('')}>Salvar como modelo</button>
          : <span className="a3-acoes-linha"><input className="a3-entrada" style={{ width: 200 }} autoFocus maxLength={60} placeholder="Nome do modelo" value={nomeModelo} onChange={e => definirNomeModelo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') salvarModelo(); if (e.key === 'Escape') definirNomeModelo(null) }} />
            <button type="button" className="a3-botao a3-botao--suave a3-botao--pequeno" disabled={!nomeModelo.trim()} onClick={salvarModelo}>Salvar</button></span>}
        {salvos.length > 0 && <button type="button" className="a3-botao a3-botao--fantasma" onClick={async () => { if (await confirmar({ titulo: 'Apagar todos os seus modelos salvos?', texto: 'Somem só deste navegador; e-mails já enviados não mudam.', sim: 'Apagar modelos', perigo: true })) { definirSalvos([]); gravarModelosSalvos([]) } }}>Apagar meus modelos</button>}
      </div>
      <PreviaCarta assunto={assunto} corpo={corpo} />
    </div>
    <aside className="a3-carta__lado">
      <HistoricoEnvios lista={historico} carregando={q.carregando} nota={semParte27 ? 'Sem a parte 27: os 20 últimos, sem o tipo de cada carta.' : undefined} />
      {banco && <PreferenciaCartas idUsuario={usuario.id_usuario} quer={banco.quer_cartas !== false} aoMudar={() => void q.recarregar()} />}
    </aside>
  </div>
}

/** Quem respondeu "parar": o administrador desliga (ou religa) as cartas da pessoa. */
function PreferenciaCartas({ idUsuario, quer, aoMudar }: { idUsuario: string; quer: boolean; aoMudar: () => void }) {
  const [ocupado, definirOcupado] = useState(false)
  return <div className="a3-faixa">
    <Icone nome="carta" tamanho={16} />
    <div><b style={{ fontWeight: 600 }}>{quer ? 'Recebe cartas' : 'Não recebe cartas'}</b><span className="a3-mudo a3-pequeno">{quer ? 'Use “Ela pediu para parar” quando a pessoa responder “parar”.' : 'Desligado pelo painel ou por ela em Minha conta.'}</span></div>
    <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" disabled={ocupado} onClick={async () => {
      if (quer && !(await confirmar({ titulo: 'Parar de mandar cartas para esta pessoa?', texto: 'Use quando ela responder “parar”. Ela pode religar em Minha conta.', sim: 'Parar as cartas' }))) return
      definirOcupado(true)
      try { await chamarRpc('definir_cartas_admin', { p_id: idUsuario, p_quer: !quer }); avisoRapido(quer ? 'Cartas desligadas para esta pessoa.' : 'Cartas religadas.'); aoMudar() }
      catch (f) { avisoRapido(`Não deu para mudar: ${String(f).replace(/^Error: /, '')}`, 'erro') } finally { definirOcupado(false) }
    }}>{quer ? 'Ela pediu para parar' : 'Voltar a mandar'}</button>
  </div>
}
