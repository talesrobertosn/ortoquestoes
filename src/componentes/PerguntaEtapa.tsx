import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { supabase } from '../conta/supabase'
import { lerProvas, perfilEstudoCompleto, type ProvaInteresse } from '../conta/perfilEstudo'
import { CamposEtapa } from './CamposEtapa'
import { Icone } from './Icone'
import { href } from '../util/rotas'

const CHAVE_LOCAL = 'perfil-estudo:perguntado'

/**
 * Pergunta única, para quem criou a conta antes de o cadastro pedir a etapa
 * (R1, R2, R3, R4, mão…) e a prova de interesse. Aparece uma vez, na página
 * inicial: ao ser mostrada, já fica marcada na conta como perguntada, e não
 * volta nem se a pessoa fechar sem responder. Depois, tudo se edita em
 * Minha conta › Perfil.
 */
export function PerguntaEtapa() {
  const { sessao } = usarConta()
  const meta = sessao?.user.user_metadata as Record<string, unknown> | undefined
  const deveMostrar = !!sessao && !perfilEstudoCompleto(meta) && !meta?.perfil_estudo_perguntado && !lerLocal(sessao.user.id)
  const [visivel, definirVisivel] = useState(false)
  const [situacao, definirSituacao] = useState(String(meta?.situacao ?? ''))
  const [ano, definirAno] = useState(String(meta?.ano_residencia ?? ''))
  const [provas, definirProvas] = useState<ProvaInteresse[]>(() => lerProvas(meta?.provas_interesse))
  const [estado, definirEstado] = useState<'livre' | 'salvando' | 'salvo' | 'erro'>('livre')

  useEffect(() => {
    if (!deveMostrar || !sessao || !supabase) return
    definirVisivel(true)
    gravarLocal(sessao.user.id)
    // Marca na conta já na primeira exibição: a pergunta não volta em outro aparelho.
    void supabase.auth.updateUser({ data: { perfil_estudo_perguntado: true } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deveMostrar, sessao?.user.id])

  if (!visivel) return null

  const pronto = !!situacao && (situacao !== 'residente' || !!ano) && provas.length > 0
  async function salvar() {
    if (!supabase || !pronto) return
    definirEstado('salvando')
    const { error } = await supabase.auth.updateUser({ data: {
      situacao, ano_residencia: situacao === 'residente' ? ano : null, provas_interesse: provas,
      perfil_estudo_em: new Date().toISOString(), perfil_estudo_perguntado: true,
    } })
    definirEstado(error ? 'erro' : 'salvo')
  }

  if (estado === 'salvo') return (
    <section className="pergunta-etapa" role="status">
      <p className="pergunta-etapa__cabeca"><Icone nome="certo" tamanho={18} /> <span>Obrigado! Dá para mudar quando quiser em <a href={href('/conta?secao=perfil')}>Minha conta › Perfil</a>.</span></p>
      <div className="pergunta-etapa__acoes"><button type="button" className="botao botao--fantasma" onClick={() => definirVisivel(false)}>Fechar</button></div>
    </section>
  )

  return (
    <section className="pergunta-etapa" aria-labelledby="pergunta-etapa-titulo">
      <div className="pergunta-etapa__cabeca">
        <div>
          <span className="pergunta-etapa__selo">Novidade no perfil · leva 10 segundos</span>
          <h2 id="pergunta-etapa-titulo">Em que etapa você está?</h2>
          <p>Conta para a gente se você é R1, R2, R3, R4, faz cirurgia da mão, e para qual prova estuda. Esta pergunta aparece só esta vez.</p>
        </div>
      </div>
      <CamposEtapa situacao={situacao} ano={ano} provas={provas} aoMudarSituacao={definirSituacao} aoMudarAno={definirAno} aoMudarProvas={definirProvas} />
      {estado === 'erro' && <p className="relato__erro" role="alert">Não foi possível salvar agora. Você também pode preencher em Minha conta › Perfil.</p>}
      <div className="pergunta-etapa__acoes">
        <button type="button" className="botao botao--principal" disabled={!pronto || estado === 'salvando'} onClick={() => void salvar()}>{estado === 'salvando' ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="botao botao--fantasma" onClick={() => definirVisivel(false)}>Agora não</button>
      </div>
    </section>
  )
}

function lerLocal(id: string) { try { return localStorage.getItem(`${CHAVE_LOCAL}:${id}`) === '1' } catch { return false } }
function gravarLocal(id: string) { try { localStorage.setItem(`${CHAVE_LOCAL}:${id}`, '1') } catch { /* sem armazenamento: a marca na conta basta */ } }
