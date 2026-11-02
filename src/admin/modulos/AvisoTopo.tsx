import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { dataHora } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Painel, Segmento, Situacao } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'
import { Tabela } from '../ui/tabela'

interface Aviso { id: number; texto: string; link: string | null; rotulo_link: string | null; tom: 'info' | 'destaque' | 'alerta'; ativo: boolean; fim: string | null; criado_em: string }
const TOM: Record<Aviso['tom'], string> = { destaque: 'Novidade (verde)', info: 'Neutro', alerta: 'Atenção (amarelo)' }
const DURACOES: Array<[string, string]> = [['1', '1 dia'], ['3', '3 dias'], ['7', '7 dias'], ['30', '30 dias'], ['sem', 'Até eu tirar']]

/** A faixa como o site desenha (as mesmas classes do site), para a prévia ser exata. */
function Faixinha({ texto, link, rotulo, tom }: { texto: string; link: string | null; rotulo: string | null; tom: Aviso['tom'] }) {
  return <div className={`aviso-site aviso-site--${tom} a3-faixinha`}>
    <div className="aviso-site__interno"><span className="aviso-site__icone" aria-hidden="true"><Icone nome="info" tamanho={14} /></span>
      <p className="aviso-site__texto">{texto || 'O texto do aviso aparece aqui.'}{link && <> <a href={link} onClick={e => e.preventDefault()}>{rotulo || 'Saiba mais'}</a></>}</p>
    </div>
  </div>
}

/** Configurações › Aviso no topo do site: o que está no ar, a prévia enquanto escreve e a publicação. */
export default function AvisoTopo() {
  const parte = defParte('aviso')
  const [avisos, definirAvisos] = useState<Aviso[] | null>(null)
  const [erro, definirErro] = useState('')
  const [novo, definirNovo] = useState({ texto: '', link: '', rotulo: '', tom: 'destaque' as Aviso['tom'], dias: '7' })
  const [ocupado, definirOcupado] = useState(false)
  const carregar = useCallback(async () => {
    try { definirAvisos(await chamarRpc<Aviso[]>('listar_avisos_admin', {})); definirErro('') } catch (f) { definirErro(erroDoPainel(f, '202609290200_painel_admin_2.sql')) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])
  const ativo = avisos?.find(a => a.ativo)
  const linkValido = !novo.link.trim() || /^(https:\/\/|#\/)/.test(novo.link.trim())

  async function publicar() {
    if (novo.texto.trim().length < 3 || !linkValido) return
    if (!(await confirmar({ titulo: 'Publicar este aviso no topo do site?', texto: <>{ativo && <span>Ele substitui o aviso que está no ar agora.</span>}<span>Aparece para todos, com ou sem conta, {novo.dias === 'sem' ? 'até você tirar' : `por ${DURACOES.find(d => d[0] === novo.dias)?.[1]}`}.</span></>, sim: 'Publicar' }))) return
    definirOcupado(true)
    const fim = novo.dias === 'sem' ? null : new Date(Date.now() + Number(novo.dias) * 86_400_000).toISOString()
    try {
      await chamarRpc('salvar_aviso_admin', { p_texto: novo.texto.trim(), p_link: novo.link.trim() || null, p_rotulo_link: novo.rotulo.trim() || null, p_tom: novo.tom, p_fim: fim })
      definirNovo({ texto: '', link: '', rotulo: '', tom: 'destaque', dias: '7' }); avisoRapido('Aviso publicado: já aparece no topo do site.'); await carregar()
    } catch { avisoRapido('Não foi possível publicar o aviso. O link precisa começar com https:// ou #/.', 'erro') } finally { definirOcupado(false) }
  }
  async function encerrar() {
    if (!(await confirmar({ titulo: 'Tirar o aviso do ar agora?', sim: 'Tirar do ar', perigo: true }))) return
    try { await chamarRpc('encerrar_aviso_admin', {}); avisoRapido('Aviso retirado do site.'); await carregar() } catch { avisoRapido('Não foi possível retirar o aviso.', 'erro') }
  }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Configurações" titulo={parte.rotulo} pergunta={`${parte.pergunta} Quem fecha não vê mais aquele aviso; um novo substitui o anterior.`} />
    {erro && <Faixa tom="erro" titulo="Os avisos não carregaram">{erro}</Faixa>}
    <Painel titulo="No ar agora" acoes={ativo && <button type="button" className="a3-botao a3-botao--perigo a3-botao--pequeno" onClick={() => void encerrar()}>Tirar do ar</button>}>
      {!avisos ? (erro ? <Estado compacto tipo="erro" titulo="Indisponível" /> : <Carregando linhas={2} />) : ativo ? <div className="a3-pilha">
        <div className="a3-navegador"><span className="a3-navegador__barra" aria-hidden="true"><i /><i /><i /></span><Faixinha texto={ativo.texto} link={ativo.link} rotulo={ativo.rotulo_link} tom={ativo.tom} /></div>
        <p className="a3-mudo a3-pequeno"><Situacao tom="vivo">No ar</Situacao> desde {dataHora(ativo.criado_em)}{ativo.fim ? `, sai sozinho em ${dataHora(ativo.fim)}` : ', sem data para sair'}.</p>
      </div> : <Estado compacto icone="info" titulo="Nenhum aviso no ar agora" />}
    </Painel>
    <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <Painel titulo="Novo aviso">
        <div className="a3-pilha">
          <label className="a3-campo"><span>Texto ({novo.texto.length}/240)</span><textarea className="a3-entrada" rows={3} maxLength={240} value={novo.texto} onChange={e => definirNovo({ ...novo, texto: e.target.value })} placeholder="Ex.: Simulado TEOT 2027 disponível. Treine no formato da prova." /></label>
          <div className="a3-editor__linha">
            <label className="a3-campo"><span>Link (opcional)</span><input className="a3-entrada" value={novo.link} aria-invalid={!linkValido} onChange={e => definirNovo({ ...novo, link: e.target.value })} placeholder="#/treinar ou https://…" />{!linkValido && <small className="a3-erro-texto">Comece com https:// ou #/</small>}</label>
            <label className="a3-campo"><span>Texto do link</span><input className="a3-entrada" maxLength={40} value={novo.rotulo} onChange={e => definirNovo({ ...novo, rotulo: e.target.value })} placeholder="Ver agora" /></label>
          </div>
          <div className="a3-campo"><span>Cor</span><Segmento rotulo="Cor" valor={novo.tom} aoMudar={t => definirNovo({ ...novo, tom: t })} opcoes={Object.entries(TOM) as Array<[Aviso['tom'], string]>} /></div>
          <div className="a3-campo"><span>Fica no ar por</span><Segmento rotulo="Duração" valor={novo.dias} aoMudar={d => definirNovo({ ...novo, dias: d })} opcoes={DURACOES} /></div>
          <button type="button" className="a3-botao" style={{ justifySelf: 'start' }} disabled={novo.texto.trim().length < 3 || !linkValido || ocupado} onClick={() => void publicar()}><Icone nome="enviar" tamanho={15} />{ocupado ? 'Publicando…' : 'Revisar e publicar'}</button>
        </div>
      </Painel>
      <Painel titulo="Prévia" descricao="Como o site vai mostrar, no computador e no celular.">
        <div className="a3-pilha">
          <div className="a3-navegador"><span className="a3-navegador__barra" aria-hidden="true"><i /><i /><i /></span><Faixinha texto={novo.texto} link={novo.link.trim() || null} rotulo={novo.rotulo.trim() || null} tom={novo.tom} /></div>
          <div className="a3-navegador a3-navegador--celular"><Faixinha texto={novo.texto} link={novo.link.trim() || null} rotulo={novo.rotulo.trim() || null} tom={novo.tom} /></div>
        </div>
      </Painel>
    </div>
    {avisos && avisos.length > 0 && <Painel justo titulo="Avisos anteriores">
      <Tabela rotulo="Avisos anteriores" compacta linhas={avisos} chave={a => String(a.id)} porPagina={10} colunas={[
        { id: 't', titulo: 'Texto', celula: a => <span style={{ display: 'grid' }}><span className="a3-nome">{a.texto}</span>{a.link && <span className="a3-sub">{a.rotulo_link || 'Saiba mais'} → {a.link}</span>}</span> },
        { id: 'c', titulo: 'Cor', rotuloCelular: 'Cor', celula: a => TOM[a.tom] },
        { id: 'q', titulo: 'Publicado', numero: true, rotuloCelular: 'Publicado', ordem: a => a.criado_em, celula: a => <span>{dataHora(a.criado_em)}<span className="a3-sub">{a.ativo ? 'no ar' : 'encerrado'}</span></span> },
      ]} />
    </Painel>}
  </div>
}
