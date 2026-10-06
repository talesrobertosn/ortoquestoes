import { useState } from 'react'
import type { Session } from '@supabase/auth-js'
import { usarPerfilRanking } from '../conta/perfilRanking'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Serviço (local da residência) ao lado do nome no ranking: um pino discreto
 * que mostra o hospital ao passar o mouse ou tocar. Só aparece para quem
 * ligou a opção.
 */
export function SeloServico({ servico }: { servico?: string | null }) {
  if (!servico) return null
  return <span className="rk-servico" tabIndex={0} title={servico} aria-label={`Residência: ${servico}`}>
    <Icone nome="bandeira" tamanho={12} /><span className="rk-servico__texto">{servico}</span>
  </span>
}

/**
 * Interruptor "Mostrar meu local de residência no ranking". Vem desligado.
 * Sem serviço no cadastro, mostra o botão para preencher no perfil.
 */
export function OpcaoServicoRanking({ sessao, compacta = false, noPerfil = false }: { sessao: Session | null; compacta?: boolean; noPerfil?: boolean }) {
  const { mostrarServico, salvarMostrarServico, servicoCadastro } = usarPerfilRanking(sessao)
  const [aviso, definirAviso] = useState('')
  if (!sessao || mostrarServico === null) return null
  return <div className={'rk-opcao-servico' + (compacta ? ' rk-opcao-servico--compacta' : '')}>
    <span className="rk-opcao-servico__icone" aria-hidden="true"><Icone nome="bandeira" tamanho={16} /></span>
    <div className="rk-opcao-servico__texto">
      <strong>Mostrar meu local de residência no ranking</strong>
      <small>{servicoCadastro
        ? <>Aparece um pino ao lado do seu nome; ao passar o mouse, mostra <b>{servicoCadastro}</b>. Vem desligado.</>
        : noPerfil ? 'Preencha o serviço acima e salve o perfil para poder ligar esta opção.' : 'Você ainda não informou o serviço onde faz residência ou trabalha.'}</small>
      {aviso && <small role="alert" className="rk-opcao-servico__aviso">{aviso}</small>}
    </div>
    {servicoCadastro
      ? <label className="ct-interruptor rk-opcao-servico__chave"><input type="checkbox" checked={mostrarServico} onChange={async e => definirAviso((await salvarMostrarServico(e.target.checked)) ?? '')} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span className="so-leitor">Mostrar meu local de residência no ranking</span></label>
      : !noPerfil && <a className="botao botao--fantasma rk-opcao-servico__botao" href={href('/conta?secao=perfil')}><Icone nome="lapis" tamanho={14} /> Preencher no perfil</a>}
  </div>
}
