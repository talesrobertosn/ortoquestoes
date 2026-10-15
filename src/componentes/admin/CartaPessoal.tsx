import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { SITE } from '../../config'
import { Icone } from '../Icone'
import { confirmar, pedirTexto } from '../Confirmar'
import { motivoFalhaEmail } from './formatos'
import { usarRpc, rpcInexistente } from './usarRpc'
import { AvisoExcesso, HistoricoEmails } from './HistoricoEmails'
import {
  FAIXAS, ROTULO_FAIXA, TIPOS, TIPOS_MANUAIS, anterioresDosDados, contarLinks, escolherTipo, gerarCarta, gravarModelosSalvos,
  lerModelosSalvos, perfilDoBanco, preencher, tipoCombina, problemaGrave, problemaNoAssunto, problemaNoTexto, renderizarCarta, resumoHistorico,
  type Carta, type DadosCartaBanco, type EnvioHistorico, type Faixa, type ModeloSalvo, type PerfilCarta, type TipoCarta,
} from './modelosEmail'
import type { LinhaUsuario } from './AdminUsuarios'
import '../../estilos/paginas/AdminCartas.css'

const novaSemente = () => Math.floor(Math.random() * 2 ** 31)

/** Como a carta aparece na caixa de entrada: remetente, assunto e o corpo exato (o mesmo HTML que sai). */
export function PreviaCarta({ assunto, corpo, descadastro }: { assunto: string; corpo: string; descadastro?: boolean }) {
  const html = useMemo(() => renderizarCarta({ assunto, corpo, descadastro: descadastro ? `${SITE.url}#/emails?u=…` : null }).html, [assunto, corpo, descadastro])
  return <div className="ce-previa">
    <div className="ce-previa__topo">
      <p><span>De</span> Tales, do Orto Questões</p>
      <p><span>Assunto</span> <strong>{assunto || '(sem assunto)'}</strong></p>
    </div>
    <iframe title="Prévia exata do e-mail" srcDoc={html} sandbox="" />
  </div>
}

/** Avisos de texto (não bloqueiam, menos o grave): palavra de promoção, link demais, número zerado. */
export function AvisosTexto({ assunto, corpo }: { assunto: string; corpo: string }) {
  const avisos = [
    problemaNoAssunto(assunto) && `Assunto: ${problemaNoAssunto(assunto)}.`,
    problemaNoTexto(corpo) && `Texto: ${problemaNoTexto(corpo)}.`,
    contarLinks(corpo) > 1 && 'Mais de um link: cartas com um link só têm mais chance de cair na caixa principal.',
  ].filter(Boolean) as string[]
  if (!avisos.length) return null
  return <ul className="ce-avisos">{avisos.map(a => <li key={a}>{a}</li>)}</ul>
}

/**
 * A carta da ficha: o tipo certo já vem escolhido pela situação da pessoa e o texto
 * já vem escrito. "Enviar" manda; "Sortear outra versão" troca o texto; editar é
 * opcional. Ao lado, o histórico de e-mails da pessoa, com aviso de excesso.
 */
export function CartaPessoal({ usuario, perfilReserva, historicoReserva, querReserva, aoEnviar }: {
  usuario: LinhaUsuario
  /** Perfil com o que a ficha já tem, para quando a parte 27 ainda não foi colada. */
  perfilReserva: PerfilCarta
  historicoReserva: EnvioHistorico[]
  /** Sem a parte 27: a preferência antiga (e-mails de conquistas). */
  querReserva: boolean
  aoEnviar?: () => void
}) {
  const conta = usarConta().sessao?.user.id
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
  const [ocupado, definirOcupado] = useState(false)
  const [aviso, definirAviso] = useState<{ texto: string; erro: boolean } | null>(null)

  const tipoFinal = tipo === 'auto' ? auto.tipo : tipo
  const carta: Carta | string = useMemo(() => {
    try {
      return gerarCarta(perfil, { tipo: tipoFinal, faixa: faixa === 'auto' ? undefined : faixa, semente, anteriores, site: SITE.url })
    } catch (f) { return String(f).replace(/^Error: /, '') }
  }, [perfil, tipoFinal, faixa, semente, anteriores])
  const pronta = typeof carta === 'string' ? null : carta
  const assunto = editado?.assunto ?? pronta?.assunto ?? ''
  const corpo = editado?.corpo ?? pronta?.corpo ?? ''
  // Trocou de pessoa: começa do zero.
  useEffect(() => { definirTipo('auto'); definirFaixa('auto'); definirEditado(null); definirAviso(null) }, [usuario.id_usuario])

  const r = resumoHistorico(historico)
  const grave = problemaGrave(`${assunto}\n${corpo}`)
  const nome = usuario.nome ?? usuario.email ?? 'esta pessoa'
  const convite = tipoFinal.startsWith('convite')

  async function sortear() {
    if (editado && !(await confirmar({ titulo: 'Trocar o texto que você editou?', texto: 'A edição se perde e entra outra versão sorteada.', sim: 'Sortear outra' }))) return
    definirEditado(null); definirSemente(novaSemente())
  }
  function editar(campo: 'assunto' | 'corpo', valor: string) {
    definirEditado({ assunto, corpo, [campo]: valor })
  }
  async function enviar() {
    if (!pronta || !assunto.trim() || !corpo.trim() || grave || ocupado) return
    const excesso = r.n7 >= 2 ? `\n\nAtenção: ${r.n7} e-mails nos últimos 7 dias.` : ''
    if (!(await confirmar({ titulo: `Enviar esta carta para ${nome}?`, texto: `${usuario.email ?? ''}\nAssunto: ${assunto}${excesso}`, sim: 'Enviar carta' }))) return
    definirOcupado(true); definirAviso(null)
    try {
      await chamarFuncao('enviar-email', { acao: 'carta', id_usuario: usuario.id_usuario, assunto, corpo, modelo: pronta.modelo, versao: pronta.versao, origem: 'manual' })
      definirAviso({ texto: `Carta enviada para ${usuario.email}.`, erro: false })
      definirEditado(null); definirSemente(novaSemente())
      await q.recarregar(); aoEnviar?.()
    } catch (f) {
      definirAviso({ texto: `Não saiu: ${motivoFalhaEmail(String(f))}`, erro: true })
    } finally { definirOcupado(false) }
  }
  function usarSalvo(id: string) {
    const m = salvos.find(x => x.id === id)
    if (!m) return
    definirEditado({ assunto: m.assunto ? preencher(m.assunto, perfil) : assunto, corpo: preencher(m.texto, perfil) })
  }
  async function salvarModelo() {
    const titulo = await pedirTexto({ titulo: 'Salvar como modelo', rotulo: 'Nome do modelo', texto: 'Fica salvo neste navegador. No texto, {nome}, {questoes}, {dias} e {prova} se preenchem sozinhos.', sim: 'Salvar modelo', obrigatorio: true, maximo: 60 })
    if (!titulo?.trim()) return
    const lista = [...salvos, { id: `meu-${Date.now()}`, titulo: titulo.trim().slice(0, 60), texto: corpo, assunto }]
    definirSalvos(lista); gravarModelosSalvos(lista); definirAviso({ texto: 'Modelo salvo neste navegador.', erro: false })
  }

  return <section className="fx-bloco ce" aria-labelledby="ce-titulo">
    <header className="fx-bloco__cabeca"><h3 id="ce-titulo"><Icone nome="correio" tamanho={16} />Carta para {usuario.nome?.split(' ')[0] ?? 'esta pessoa'}</h3><small>escolhida e escrita sozinha · editar é opcional</small></header>
    {semParte27 && <p className="adm-nota">Sem a parte 27 no Supabase, a carta usa só o que a ficha já tem e o histórico mostra os 20 últimos e-mails. Cole supabase/colar-no-painel/sql-202610152100-parte27.sql para ter ranking, horário de estudo e as travas contra repetição.</p>}
    <div className="ce__grade">
      <div className="ce__carta">
        {!querCartas && <p className="ce-excesso ce-excesso--muito" role="status"><strong>Esta pessoa não quer receber e-mails do site.</strong> O envio fica bloqueado.</p>}
        <p className="ce-motivo"><Icone nome="estrela" tamanho={14} /> {tipo === 'auto' ? <>Escolhida pela situação: <strong>{TIPOS[auto.tipo].rotulo}{auto.faixa && auto.tipo === 'ativo' ? ` · ${ROTULO_FAIXA[auto.faixa]}` : ''}</strong>. {auto.motivo}</> : <>Você escolheu: <strong>{TIPOS[tipoFinal].rotulo}</strong>.</>}</p>
        {convite && banco && !banco.novidades && <p className="adm-nota ce-nota-termos">Esta pessoa não marcou “Quero receber novidades” (Termos, item 14.3). Convite para assinar só se ela tiver pedido ou se a conversa já existir.</p>}
        <div className="ce__escolhas">
          <label className="campo">Situação
            <select className="entrada" value={tipo} onChange={e => { definirTipo(e.target.value as TipoCarta | 'auto'); definirEditado(null) }}>
              <option value="auto">Automática: {TIPOS[auto.tipo].rotulo}</option>
              {TIPOS_MANUAIS.map(t => <option key={t} value={t} disabled={!tipoCombina(t, perfil)}>{TIPOS[t].rotulo}{tipoCombina(t, perfil) ? '' : ' (não combina)'}</option>)}
            </select>
          </label>
          {tipoFinal === 'ativo' && <label className="campo">Tom (faixa de acerto)
            <select className="entrada" value={faixa} onChange={e => { definirFaixa(e.target.value as Faixa | 'auto'); definirEditado(null) }}>
              <option value="auto">Pelo acerto da pessoa{pronta?.faixa ? ` (${ROTULO_FAIXA[pronta.faixa]})` : ''}</option>
              {FAIXAS.map(f => <option key={f} value={f}>{ROTULO_FAIXA[f]}</option>)}
            </select>
          </label>}
          {salvos.length > 0 && <label className="campo">Ou um modelo seu
            <select className="entrada" value="" onChange={e => usarSalvo(e.target.value)}>
              <option value="">Escolha…</option>
              {salvos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
            </select>
          </label>}
        </div>
        {pronta && <p className="ce-versao">Versão {pronta.versao.split('#')[1]?.replace('v', '')} de {pronta.versoes.total} · {pronta.versoes.novas} que a pessoa ainda não recebeu{pronta.personalizacao.length ? <> · personalizada com: {pronta.personalizacao.join(', ')}</> : ' · sem dado pessoal para citar'}{editado ? ' · editada por você' : ''}</p>}
        {typeof carta === 'string' && <p role="alert" className="adm-nota adm-mensagem adm-mensagem--erro">Não deu para escrever esta carta: {carta}</p>}

        <label className="campo">Assunto<input className="entrada" maxLength={120} value={assunto} onChange={e => editar('assunto', e.target.value)} /></label>
        <label className="campo">Texto <small className="ce-dica">A assinatura “Um abraço, Tales, do Orto Questões” entra sozinha.</small>
          <textarea className="entrada ce__texto" rows={12} maxLength={6000} value={corpo} onChange={e => editar('corpo', e.target.value)} />
        </label>
        <AvisosTexto assunto={assunto} corpo={corpo} />
        {grave && <p role="alert" className="adm-nota adm-mensagem adm-mensagem--erro">O texto tem um problema que impede o envio: {grave}.</p>}

        <div className="ce__acoes">
          <button type="button" className="botao botao--principal" disabled={ocupado || !pronta || !!grave || !querCartas || !usuario.email} onClick={() => void enviar()}><Icone nome="correio" tamanho={16} /> {ocupado ? 'Enviando…' : 'Enviar'}</button>
          <button type="button" className="botao" disabled={ocupado} onClick={() => void sortear()}><Icone nome="raio" tamanho={16} /> Sortear outra versão</button>
          {editado && <button type="button" className="botao botao--fantasma" onClick={() => definirEditado(null)}>Desfazer edição</button>}
          <button type="button" className="adm-link" onClick={() => void salvarModelo()}>Salvar como modelo</button>
          {salvos.length > 0 && <button type="button" className="adm-link" onClick={async () => {
            if (!(await confirmar({ titulo: 'Apagar todos os seus modelos salvos?', texto: 'Somem só deste navegador; e-mails já enviados não mudam.', sim: 'Apagar modelos' }))) return
            definirSalvos([]); gravarModelosSalvos([])
          }}>Apagar meus modelos</button>}
        </div>
        <AvisoExcesso n7={r.n7} n30={r.n30} />
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}
        <PreviaCarta assunto={assunto} corpo={corpo} />
      </div>
      <HistoricoEmails lista={historico} carregando={q.carregando} aviso={semParte27 ? 'Sem a parte 27: os 20 últimos, sem o tipo de cada carta.' : undefined} />
    </div>
    {banco && <PreferenciaCartas idUsuario={usuario.id_usuario} quer={banco.quer_cartas !== false} aoMudar={() => void q.recarregar()} />}
  </section>
}

/** Quem respondeu "parar": o administrador desliga as cartas da pessoa aqui. */
function PreferenciaCartas({ idUsuario, quer, aoMudar }: { idUsuario: string; quer: boolean; aoMudar: () => void }) {
  const [ocupado, definirOcupado] = useState(false)
  return <p className="adm-nota ce-pref">
    {quer ? 'Recebe cartas.' : 'Não recebe cartas (desligado).'}{' '}
    <button type="button" className="adm-link" disabled={ocupado} onClick={async () => {
      if (quer && !(await confirmar({ titulo: 'Parar de mandar cartas para esta pessoa?', texto: 'Use quando ela responder “parar”. Ela pode religar em Minha conta.', sim: 'Parar as cartas' }))) return
      definirOcupado(true)
      try { await chamarRpc('definir_cartas_admin', { p_id: idUsuario, p_quer: !quer }); aoMudar() } catch { /* aviso fica no estado anterior */ } finally { definirOcupado(false) }
    }}>{quer ? 'Ela pediu para parar' : 'Voltar a mandar'}</button>
  </p>
}
