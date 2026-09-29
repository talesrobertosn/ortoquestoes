import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { usarIndice } from '../../dados/usarIndice'
import { Icone } from '../Icone'
import { BarrasHorizontais } from './AdminGraficos'
import type { LinhaUsuario } from './AdminUsuarios'
import { PLANOS, data, dataHora, haQuanto, motivoFalhaEmail, porcentagem } from './formatos'
import { escreverRecado } from './recado'

interface Detalhe {
  respostas: Array<{ id: string; c: string | null; primeira: string | null }>
  sessoes: Array<{ id: string; descricao: string; concluidaEm: number; total?: number; acertos?: number }>
  favoritas: number; anotacoes: number; oculto_ranking: boolean
  cortesia: { ate: string | null; motivo: string | null } | null
  aparelho: { descricao: string | null; entrou_em: string; visto_em: string } | null
  emails_conquistas: boolean
  emails: Array<{ tipo: string; marco: number | null; assunto: string | null; status: string; em: string }>
  perfil: { situacao: string | null; servico: string | null; cidade: string | null; uf: string | null; confirmado: boolean } | null
}

const SITUACAO: Record<string, string> = { residente: 'Residente de ortopedia', ortopedista: 'Ortopedista', outro: 'Outro profissional ou estudante' }

/** Ficha de uma pessoa: o que ela estudou e o que o administrador pode fazer por ela. */
export function AdminFichaUsuario({ usuario, aoFechar }: { usuario: LinhaUsuario; aoFechar: () => void }) {
  const { indice } = usarIndice()
  const [detalhe, definirDetalhe] = useState<Detalhe | null>(null)
  const [erro, definirErro] = useState('')
  const [aviso, definirAviso] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const [recado, definirRecado] = useState('')
  const [previa, definirPrevia] = useState<string | null>(null)
  const [formato, definirFormato] = useState<'carta' | 'cartao'>('carta')
  const [variante, definirVariante] = useState(0)
  const [cortesiaDias, definirCortesiaDias] = useState('90')
  const [cortesiaMotivo, definirCortesiaMotivo] = useState('')

  const carregar = useCallback(async () => {
    try { definirDetalhe(await chamarRpc<Detalhe>('detalhe_usuario_admin', { p_id: usuario.id_usuario })) }
    catch { definirErro('Não foi possível abrir a ficha. Confira se a migração 202609290200_painel_admin_2.sql foi aplicada.') }
  }, [usuario.id_usuario])
  useEffect(() => { void carregar() }, [carregar])
  // Por ref: quem abre passa uma função nova a cada render, e o efeito abaixo
  // precisa rodar uma vez só, senão guardaria "hidden" como rolagem original.
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar.current() }
    document.addEventListener('keydown', tecla)
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = rolagem }
  }, [])

  const porTema = useMemo(() => {
    if (!indice || !detalhe) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    const soma = new Map<number, { certas: number; erradas: number }>()
    for (const r of detalhe.respostas) {
      const t = temaDe.get(r.id); if (t === undefined || r.c === null) continue
      const item = soma.get(t) ?? { certas: 0, erradas: 0 }
      if (r.c === 'true') item.certas++; else if (r.c === 'false') item.erradas++
      soma.set(t, item)
    }
    return [...soma].map(([t, v]) => ({ nome: indice.temas[t]?.nome ?? String(t), acerto: porcentagem(v.certas, v.certas + v.erradas) ?? 0, total: v.certas + v.erradas }))
      .sort((a, b) => b.total - a.total)
  }, [indice, detalhe])

  async function acao(rotulo: string, fazer: () => Promise<unknown>, sucesso: string) {
    if (ocupado) return
    definirOcupado(true); definirAviso('')
    try { await fazer(); definirAviso(sucesso); await carregar() } catch (f) { const texto = String(f).replace(/^Error: /, ''); definirAviso(`${rotulo}: ${rotulo === 'Envio' ? motivoFalhaEmail(texto) : texto}`) } finally { definirOcupado(false) }
  }

  const nome = usuario.nome ?? usuario.email?.split('@')[0] ?? 'Sem nome'
  const acertoGeral = porcentagem(usuario.acertos, usuario.acertos + usuario.erros)
  const cortesiaVale = detalhe?.cortesia && (!detalhe.cortesia.ate || new Date(detalhe.cortesia.ate) > new Date())

  // No body: um ancestral com transform (animação de entrada da página) deslocava o position: fixed.
  return createPortal(<div className="adm-ficha" role="dialog" aria-modal="true" aria-labelledby="adm-ficha-nome" onClick={e => { if (e.target === e.currentTarget) aoFechar() }}>
    <div className="adm-ficha__painel">
      <header className="adm-ficha__cabeca">
        <div>
          <h2 id="adm-ficha-nome">{usuario.online && <span className="adm-online" aria-label="Online agora" />}{nome}</h2>
          <p>{usuario.email}</p>
          <div className="adm-usuario__selos">
            {usuario.plano_vigente && <span className="adm-selo adm-selo--ok">Assinante {PLANOS[usuario.plano_vigente]?.toLowerCase()}</span>}
            {cortesiaVale && <span className="adm-selo adm-selo--ok">Cortesia{detalhe?.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ''}</span>}
            {detalhe?.oculto_ranking && <span className="adm-selo adm-selo--neutro">Fora do ranking</span>}
            {detalhe?.perfil && !detalhe.perfil.confirmado && <span className="adm-selo adm-selo--ruim">E-mail não confirmado</span>}
          </div>
        </div>
        <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar ficha"><Icone nome="fechar" tamanho={20} /></button>
      </header>

      {erro ? <p role="alert" className="adm-alerta">{erro}</p> : !detalhe ? <p role="status">Carregando…</p> : <div className="empilha adm-ficha__corpo">
        {aviso && <p role="status" className="adm-nota adm-mensagem">{aviso}</p>}

        <dl className="adm-cartao__dados adm-ficha__numeros">
          <div><dt>Questões</dt><dd className="numerico">{usuario.respondidas.toLocaleString('pt-BR')}</dd></div>
          <div><dt>Acerto</dt><dd>{acertoGeral === null ? '—' : `${acertoGeral}%`}</dd></div>
          <div><dt>Na semana</dt><dd>{usuario.respondidas_7d}</dd></div>
          <div><dt>Favoritas</dt><dd>{detalhe.favoritas}</dd></div>
          <div><dt>Anotações</dt><dd>{detalhe.anotacoes}</dd></div>
          <div><dt>Conta criada</dt><dd>{data(usuario.criado_em)}</dd></div>
          <div><dt>Última atividade</dt><dd>{haQuanto(usuario.ultima_atividade)}</dd></div>
          <div><dt>Aparelho</dt><dd>{detalhe.aparelho?.descricao && detalhe.aparelho.descricao !== 'suporte' ? detalhe.aparelho.descricao : '—'}</dd></div>
        </dl>
        {detalhe.perfil && (detalhe.perfil.situacao || detalhe.perfil.servico) && <p className="adm-nota">{[SITUACAO[detalhe.perfil.situacao ?? ''] ?? detalhe.perfil.situacao, detalhe.perfil.servico, [detalhe.perfil.cidade, detalhe.perfil.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}</p>}

        <section className="empilha">
          <h3 className="adm-subtitulo">Mandar parabéns por e-mail</h3>
          {!detalhe.emails_conquistas ? <p className="adm-vazio">Esta pessoa desligou os e-mails de conquistas.</p> : <>
            <fieldset className="adm-formato">
              <legend>Formato</legend>
              <label className="caixa"><input type="radio" name="formato-email" checked={formato === 'carta'} onChange={() => definirFormato('carta')} /><span><strong>Carta pessoal</strong> · texto simples, assinado por você. Tem mais chance de ficar fora de Promoções no Gmail.</span></label>
              <label className="caixa"><input type="radio" name="formato-email" checked={formato === 'cartao'} onChange={() => definirFormato('cartao')} /><span><strong>Cartão com emblema</strong> · mais bonito, mas o Gmail tende a pôr em Promoções.</span></label>
            </fieldset>
            <label className="campo">{formato === 'carta' ? 'Texto da carta (se ficar vazio, vai um parabéns padrão)' : 'Recado seu (opcional, aparece destacado no e-mail)'}<textarea className="entrada" rows={formato === 'carta' ? 7 : 3} maxLength={600} value={recado} onChange={e => definirRecado(e.target.value)} placeholder="Ex.: Vi seu ritmo nas últimas semanas e fiquei feliz. Continue assim!" /></label>
            <div className="linha adm-recado__acoes">
              <button type="button" className="botao botao--fantasma" onClick={() => {
                const dias = usuario.ultima_atividade ? Math.floor((Date.now() - new Date(usuario.ultima_atividade).getTime()) / 86_400_000) : null
                definirRecado(escreverRecado({ respondidas: usuario.respondidas, acerto: acertoGeral, semana: usuario.respondidas_7d, diasParado: dias, temas: porTema }, variante))
                definirVariante(v => v + 1)
              }}><Icone nome="lapis" tamanho={16} /> {variante ? 'Escrever outra versão' : 'Escrever pelo desempenho'}</button>
              <small className="adm-nota">{recado.length}/600 · confira e ajuste antes de enviar</small>
            </div>
            <div className="linha">
              <button type="button" className="botao" disabled={ocupado} onClick={() => void acao('Prévia', async () => { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa', id_usuario: usuario.id_usuario, recado, formato }); definirPrevia(r.html) }, '')}>Ver prévia</button>
              <button type="button" className="botao botao--principal" disabled={ocupado} onClick={() => { if (window.confirm(`Enviar o e-mail de parabéns (${formato === 'carta' ? 'carta pessoal' : 'cartão com emblema'}) para ${usuario.email}?`)) void acao('Envio', () => chamarFuncao('enviar-email', { acao: 'parabens', id_usuario: usuario.id_usuario, recado, formato }), 'E-mail enviado.') }}>Enviar parabéns</button>
            </div>
            {previa && <div className="adm-previa"><div className="adm-previa__topo"><span>Prévia do e-mail</span><button type="button" className="adm-link" onClick={() => definirPrevia(null)}>Fechar prévia</button></div><iframe title="Prévia do e-mail" srcDoc={previa} sandbox="" /></div>}
          </>}
        </section>

        {porTema.length > 0 && <section className="empilha">
          <h3 className="adm-subtitulo">Acerto por tema</h3>
          <BarrasHorizontais maximo={100} formato={v => `${v}%`} itens={porTema.map(t => ({ rotulo: t.nome, valor: t.acerto, detalhe: `${t.total} questões`, destaque: t.total >= 10 ? (t.acerto < 55 ? 'ruim' : t.acerto >= 75 ? 'bom' : undefined) : undefined }))} />
        </section>}

        {detalhe.sessoes.length > 0 && <section className="empilha">
          <h3 className="adm-subtitulo">Últimas sessões</h3>
          <ul className="adm-mini">{detalhe.sessoes.slice(0, 8).map(s => <li key={s.id}><span className="adm-mini__nome">{s.descricao}<small>{dataHora(new Date(s.concluidaEm).toISOString())}</small></span><span className="adm-mini__valor numerico">{s.acertos !== undefined && s.total ? `${s.acertos}/${s.total}` : s.total ?? ''}</span></li>)}</ul>
        </section>}

        <section className="empilha">
          <h3 className="adm-subtitulo">Ações</h3>
          <div className="adm-acoes">
            <div>
              <strong>Desconectar de todos os aparelhos</strong>
              <p>A conta sai em até 1 minuto de onde estiver aberta. Útil para conta compartilhada ou aparelho perdido. A pessoa pode entrar de novo com a senha.</p>
              <button type="button" className="botao" disabled={ocupado} onClick={() => { if (window.confirm('Desconectar esta conta de todos os aparelhos?')) void acao('Desconectar', () => chamarRpc('desconectar_usuario_admin', { p_id: usuario.id_usuario }), 'Pronto: a conta sai dos aparelhos no próximo minuto.') }}>Desconectar</button>
            </div>
            <div>
              <strong>{detalhe.oculto_ranking ? 'Fora do ranking público' : 'Aparece no ranking público'}</strong>
              <p>Para quem pediu para sair do ranking (Termos, item 14.7) ou usou um nome inadequado.</p>
              <button type="button" className="botao" disabled={ocupado} onClick={() => void acao('Ranking', () => chamarRpc('ocultar_ranking_admin', { p_id: usuario.id_usuario, p_ocultar: !detalhe.oculto_ranking, p_motivo: detalhe.oculto_ranking ? null : 'pelo painel' }), detalhe.oculto_ranking ? 'Voltou para o ranking.' : 'Tirado do ranking.')}>{detalhe.oculto_ranking ? 'Mostrar no ranking' : 'Tirar do ranking'}</button>
            </div>
            <div>
              <strong>Acesso cortesia</strong>
              <p>{cortesiaVale ? `Ativo${detalhe.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ', sem prazo'}${detalhe.cortesia?.motivo ? ` (${detalhe.cortesia.motivo})` : ''}. ` : ''}Responde sem o limite diário, sem precisar assinar. Para preceptores, parceiros e sorteios.</p>
              {cortesiaVale
                ? <button type="button" className="botao" disabled={ocupado} onClick={() => void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: usuario.id_usuario, p_ate: null, p_motivo: null, p_remover: true }), 'Cortesia removida.')}>Remover cortesia</button>
                : <div className="adm-busca">
                  <label className="campo">Motivo<input className="entrada" maxLength={200} value={cortesiaMotivo} onChange={e => definirCortesiaMotivo(e.target.value)} placeholder="Ex.: preceptor do serviço X" /></label>
                  <label className="campo">Por<select className="entrada" value={cortesiaDias} onChange={e => definirCortesiaDias(e.target.value)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="sem">Sem prazo</option></select></label>
                  <button type="button" className="botao botao--principal" disabled={ocupado} onClick={() => void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: usuario.id_usuario, p_ate: cortesiaDias === 'sem' ? null : new Date(Date.now() + Number(cortesiaDias) * 86_400_000).toISOString(), p_motivo: cortesiaMotivo, p_remover: false }), 'Cortesia concedida.')}>Conceder cortesia</button>
                </div>}
            </div>
          </div>
        </section>

        {detalhe.emails.length > 0 && <section className="empilha">
          <h3 className="adm-subtitulo">E-mails enviados</h3>
          <ul className="adm-mini">{detalhe.emails.map((e, i) => <li key={i}><span className="adm-mini__nome">{e.assunto ?? (e.tipo === 'marco' && e.marco ? `Emblema de ${e.marco} questões` : e.tipo)}<small>{e.tipo === 'marco' ? 'automático' : 'enviado por você'}{e.status === 'falhou' ? ' · não saiu; o motivo aparece em Ajustes › E-mails' : ''}</small></span><span className={'adm-selo ' + (e.status === 'enviado' ? 'adm-selo--ok' : 'adm-selo--ruim')}>{e.status === 'enviado' ? data(e.em) : e.status}</span></li>)}</ul>
        </section>}
      </div>}
    </div>
  </div>, document.body)
}
