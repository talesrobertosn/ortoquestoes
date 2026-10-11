import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { supabase } from '../conta/supabase'
import { lerProvas, type ProvaInteresse } from '../conta/perfilEstudo'
import { CamposEtapa } from './CamposEtapa'
import { CampoServico } from './CampoServico'
import { Icone } from './Icone'
import { href } from '../util/rotas'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
/** Intervalo entre um pedido e outro para quem fechou sem completar. */
const INTERVALO_MS = 10 * 864e5
const CHAVE = 'perfil:lembrado-em'

type Falta = 'etapa' | 'servico' | 'uf'

/** O que falta no perfil: etapa (com ano e provas), onde estuda ou trabalha, e o estado. */
export function faltasPerfil(meta: Record<string, unknown> | undefined): Falta[] {
  if (!meta) return []
  const f: Falta[] = []
  const situacao = String(meta.situacao ?? '')
  if (!situacao || (situacao === 'residente' && !meta.ano_residencia) || lerProvas(meta.provas_interesse).length === 0) f.push('etapa')
  if (String(meta.servico ?? meta.residencia ?? '').trim().length < 2) f.push('servico')
  if (!meta.uf) f.push('uf')
  return f
}

function lembradoEm(id: string, meta: Record<string, unknown>) {
  let local = 0
  try { local = Number(localStorage.getItem(`${CHAVE}:${id}`) ?? 0) } catch { /* sem armazenamento */ }
  return Math.max(local, Date.parse(String(meta.perfil_lembrado_em ?? '')) || 0)
}

/**
 * Pede, de tempos em tempos, só os dados de perfil que faltam (etapa, prova de
 * interesse, serviço ou faculdade, estado). Aparece ao entrar, na página
 * inicial; "Agora não" adia por 10 dias, em todos os aparelhos. Quem já tem
 * tudo nunca vê. Os dados alimentam o painel (perfis, serviços, etapas).
 */
export function CompletarPerfil() {
  const { sessao } = usarConta()
  const meta = (sessao?.user.user_metadata ?? {}) as Record<string, unknown>
  const faltas = sessao ? faltasPerfil(meta) : []
  const [visivel, definirVisivel] = useState(false)
  const [situacao, definirSituacao] = useState(String(meta.situacao ?? ''))
  const [ano, definirAno] = useState(String(meta.ano_residencia ?? ''))
  const [provas, definirProvas] = useState<ProvaInteresse[]>(() => lerProvas(meta.provas_interesse))
  const [servico, definirServico] = useState(String(meta.servico ?? meta.residencia ?? ''))
  const [uf, definirUf] = useState(String(meta.uf ?? ''))
  const [estado, definirEstado] = useState<'livre' | 'salvando' | 'salvo' | 'erro'>('livre')
  const [pedidas] = useState(faltas)

  useEffect(() => {
    if (!sessao || !faltas.length) return
    if (Date.now() - lembradoEm(sessao.user.id, meta) < INTERVALO_MS) return
    definirVisivel(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.user.id, faltas.length])

  if (!visivel || !sessao) return null

  function adiar() {
    const agora = new Date()
    try { localStorage.setItem(`${CHAVE}:${sessao!.user.id}`, String(agora.getTime())) } catch { /* ok */ }
    void supabase?.auth.updateUser({ data: { perfil_lembrado_em: agora.toISOString() } })
    definirVisivel(false)
  }

  const etapaOk = !pedidas.includes('etapa') || (!!situacao && (situacao !== 'residente' || !!ano) && provas.length > 0)
  const servicoOk = !pedidas.includes('servico') || servico.trim().length >= 2
  const ufOk = !pedidas.includes('uf') || !!uf
  const algumPreenchido = (pedidas.includes('etapa') && etapaOk) || (pedidas.includes('servico') && servicoOk) || (pedidas.includes('uf') && ufOk)

  async function salvar() {
    if (!supabase || !algumPreenchido) return
    definirEstado('salvando')
    const dados: Record<string, unknown> = { perfil_lembrado_em: new Date().toISOString() }
    if (pedidas.includes('etapa') && etapaOk) Object.assign(dados, { situacao, ano_residencia: situacao === 'residente' ? ano : null, provas_interesse: provas, perfil_estudo_em: new Date().toISOString(), perfil_estudo_perguntado: true })
    if (pedidas.includes('servico') && servicoOk) dados.servico = servico.trim()
    if (pedidas.includes('uf') && ufOk) dados.uf = uf
    const { error } = await supabase.auth.updateUser({ data: dados })
    definirEstado(error ? 'erro' : 'salvo')
  }

  if (estado === 'salvo') return (
    <section className="pergunta-etapa" role="status">
      <p className="pergunta-etapa__cabeca"><Icone nome="certo" tamanho={18} /> <span>Obrigado! Seu perfil está em dia. Dá para mudar quando quiser em <a href={href('/conta?secao=perfil')}>Minha conta › Perfil</a>.</span></p>
      <div className="pergunta-etapa__acoes"><button type="button" className="botao botao--fantasma" onClick={() => definirVisivel(false)}>Fechar</button></div>
    </section>
  )

  const n = pedidas.length
  return (
    <section className="pergunta-etapa" aria-labelledby="completar-perfil-titulo">
      <div className="pergunta-etapa__cabeca">
        <div>
          <span className="pergunta-etapa__selo">Falta{n > 1 ? 'm' : ''} {n} {n === 1 ? 'dado' : 'dados'} · leva 20 segundos</span>
          <h2 id="completar-perfil-titulo">Complete seu perfil</h2>
          <p>Com isso, o site sugere as provas certas para você e o ranking mostra seu serviço, se você quiser. Só pedimos o que ainda está em branco.</p>
        </div>
      </div>
      {pedidas.includes('etapa') && <CamposEtapa situacao={situacao} ano={ano} provas={provas} aoMudarSituacao={definirSituacao} aoMudarAno={definirAno} aoMudarProvas={definirProvas} />}
      {pedidas.includes('servico') && <CampoServico situacao={situacao} valor={servico} aoMudar={definirServico} />}
      {pedidas.includes('uf') && <label className="campo campo-uf">Estado (UF)<select className="entrada" value={uf} onChange={(e) => definirUf(e.target.value)}><option value="">Selecione</option>{UFS.map((s) => <option key={s}>{s}</option>)}</select></label>}
      {estado === 'erro' && <p className="relato__erro" role="alert">Não foi possível salvar agora. Você também pode preencher em Minha conta › Perfil.</p>}
      <div className="pergunta-etapa__acoes">
        <button type="button" className="botao botao--principal" disabled={!algumPreenchido || estado === 'salvando'} onClick={() => void salvar()}>{estado === 'salvando' ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="botao botao--fantasma" onClick={adiar}>Agora não</button>
      </div>
    </section>
  )
}
