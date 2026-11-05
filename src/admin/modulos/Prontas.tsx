import { useEffect, useMemo, useState } from 'react'
import { SITE } from '../../config'
import { chamarFuncao } from '../../servicos/supabase'
import { avisarEmailsEnviados, motivoFalhaEmail, ouvirEmailsEnviados } from '../../componentes/admin/formatos'
import { LIMITE_LIGADO, TIPOS, anterioresDosDados, gerarCarta, perfilDoBanco, problemaGrave } from '../../componentes/admin/modelosEmail'
import { montarProntas, type LinhaBanco, type Pronta } from '../dados/prontas'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { haQuanto, iniciais, inteiro } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Selo } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'
import { AvisosTexto, PreviaCarta } from './cartas-comum'

type Grupo = 'todas' | 'assinantes' | 'gratuitos'
const GRUPOS: Array<[Grupo, string]> = [['todas', 'Todas'], ['assinantes', 'Assinantes'], ['gratuitos', 'Plano gratuito']]
const hoje = () => new Date().toISOString().slice(0, 10)
const CHAVE_PULADAS = () => `oq:admin:prontas-puladas:${hoje()}`
function lerPuladas(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(CHAVE_PULADAS()) ?? '[]')) } catch { return new Set() } }

export default function Prontas() {
  const p = usarPainel()
  const nav = usarNav()
  const parte = defParte('prontas')
  const q = usarRpc<LinhaBanco[]>(p.conta, 'listar_sugestoes_cartas_admin', {}, { prazoMs: 40_000 })
  const semSql = !q.dados && !!q.erro && rpcInexistente(q.erro)
  const [grupo, definirGrupo] = useState<Grupo>('todas')
  const [aberta, definirAberta] = useState<string | null>(null)
  const [edicoes, definirEdicoes] = useState<Record<string, { assunto: string; corpo: string }>>({})
  const [sementes, definirSementes] = useState<Record<string, number>>({})
  const [enviadas, definirEnviadas] = useState<Record<string, 'ok' | string>>({})
  const [puladas, definirPuladas] = useState<Set<string>>(lerPuladas)
  const [enviando, definirEnviando] = useState<string | null>(null)
  const recarregar = q.recarregar
  useEffect(() => ouvirEmailsEnviados(() => void recarregar()), [recarregar])

  const admins = useMemo(() => new Set((p.usuarios ?? []).filter(u => u.administrador).map(u => u.id_usuario)), [p.usuarios])
  const todas = useMemo(() => montarProntas(q.dados ?? [], { admins, site: SITE.url, limiteGratisLigado: LIMITE_LIGADO }), [q.dados, admins])
  // "Outra versão": reescreve só a carta daquela pessoa, com outra semente.
  const comVersao = useMemo(() => todas.map(x => {
    if (sementes[x.id] === undefined) return x
    try { return { ...x, carta: gerarCarta(perfilDoBanco(x.dados), { tipo: x.carta.tipo, semente: sementes[x.id], anteriores: anterioresDosDados(x.dados), site: SITE.url }) } } catch { return x }
  }), [todas, sementes])
  const visiveis = comVersao.filter(x => !puladas.has(x.id) && enviadas[x.id] !== 'ok' && (grupo === 'todas' || x.grupo === grupo))
  const atual = visiveis.find(x => x.id === aberta) ?? visiveis[0] ?? null
  const texto = (x: Pronta) => edicoes[x.id] ?? { assunto: x.carta.assunto, corpo: x.carta.corpo }
  const nEnviadas = Object.values(enviadas).filter(v => v === 'ok').length
  const conta = (g: Grupo) => comVersao.filter(x => !puladas.has(x.id) && enviadas[x.id] !== 'ok' && (g === 'todas' || x.grupo === g)).length

  function proxima(depoisDe: string) {
    const i = visiveis.findIndex(x => x.id === depoisDe)
    definirAberta(visiveis[i + 1]?.id ?? visiveis[i - 1]?.id ?? null)
  }
  function pular(x: Pronta) {
    const n = new Set(puladas); n.add(x.id); definirPuladas(n)
    try { localStorage.setItem(CHAVE_PULADAS(), JSON.stringify([...n])) } catch { /* sem armazenamento */ }
    proxima(x.id)
  }
  async function enviar(x: Pronta) {
    const t = texto(x)
    const grave = problemaGrave(`${t.assunto}\n${t.corpo}`)
    if (grave) { avisoRapido(`A carta tem um problema: ${grave}.`, 'erro'); return }
    if (!(await confirmar({ titulo: `Enviar para ${x.nome}?`, texto: <span>“{t.assunto}” vai para <b>{x.email}</b>, assinada por você. O site confere as travas (descadastro, excesso de e-mails) antes de mandar.</span>, sim: 'Enviar agora' }))) return
    definirEnviando(x.id)
    try {
      await chamarFuncao('enviar-email', { acao: 'carta', origem: 'lote', id_usuario: x.id, assunto: t.assunto, corpo: t.corpo, modelo: x.carta.modelo, versao: x.carta.versao })
      definirEnviadas(e => ({ ...e, [x.id]: 'ok' }))
      avisoRapido(`Carta enviada para ${x.nome}.`, 'ok')
      proxima(x.id)
      avisarEmailsEnviados()
    } catch (f) {
      const m = motivoFalhaEmail(String(f))
      definirEnviadas(e => ({ ...e, [x.id]: m }))
      avisoRapido(`Não saiu: ${m}`, 'erro')
    } finally { definirEnviando(null) }
  }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="E-mails" titulo={parte.rotulo} pergunta={parte.pergunta} />
    {semSql ? <Faixa tom="aviso" titulo="Falta rodar o SQL das cartas prontas">supabase/migrations/202611051200_cartas_prontas.sql. Enquanto isso, as cartas por grupo continuam em Cartas pessoais, e a carta de uma pessoa sai pela ficha dela.</Faixa>
      : q.erro && !q.dados ? <Estado tipo="erro" titulo="As cartas não carregaram" texto="Tente atualizar em instantes." acao={<button type="button" className="a3-botao" onClick={() => void q.recarregar()}>Tentar de novo</button>} />
        : !q.dados ? <Carregando linhas={6} texto="Lendo quem estudou e escrevendo as cartas…" /> : <>
          <div className="pr-topo">
            <div className="a3-abas-grandes" role="tablist" aria-label="Para quem">
              {GRUPOS.map(([g, r]) => <button key={g} type="button" role="tab" aria-selected={grupo === g} className="a3-aba-grande" onClick={() => { definirGrupo(g); definirAberta(null) }}>
                <span className="a3-aba-grande__numero">{inteiro(conta(g))}</span><span>{r}</span>
              </button>)}
            </div>
            <p className="a3-mudo a3-pequeno">{nEnviadas > 0 && <b>{nEnviadas} {nEnviadas === 1 ? 'enviada' : 'enviadas'} agora. </b>}Quem recebeu e-mail nas últimas 48 horas, já ganhou a mesma carta há pouco ou desligou os e-mails não aparece.{puladas.size > 0 && <> {puladas.size} {puladas.size === 1 ? 'pulada' : 'puladas'} hoje · <button type="button" className="pr-link" onClick={() => { definirPuladas(new Set()); try { localStorage.removeItem(CHAVE_PULADAS()) } catch { /* nada */ } }}>mostrar de novo</button></>}</p>
          </div>
          {!atual ? <Estado icone="certo" titulo="Nenhuma carta esperando" texto="Todo mundo deste grupo já recebeu o que fazia sentido. Volte amanhã." /> :
            <div className="a3-caixa-saida">
              <section className="a3-painel a3-caixa-saida__lista" aria-label="Cartas prontas">
                <ul className="a3-saida pr-saida">{visiveis.map(x => <li key={x.id} className={atual.id === x.id ? 'aberta' : ''}>
                  <button type="button" className="a3-saida__abrir" aria-current={atual.id === x.id ? 'true' : undefined} onClick={() => definirAberta(x.id)}>
                    <span className="a3-avatar">{iniciais(x.nome)}</span>
                    <span className="a3-saida__texto">
                      <span className="a3-nome">{x.nome}{x.grupo === 'assinantes' && <Selo contorno>assina</Selo>}</span>
                      <span className="pr-tipo">{TIPOS[x.carta.tipo].rotulo}</span>
                      <span className="a3-sub">{Number(x.dados.respondidas ?? 0) > 0 ? `${inteiro(Number(x.dados.respondidas))} questões` : 'nenhuma questão'}{x.acerto !== null ? ` · ${x.acerto}% de acerto` : ''}{x.dados.ultima_atividade ? ` · estudou ${haQuanto(x.dados.ultima_atividade)}` : ''}</span>
                    </span>
                    {enviadas[x.id] && enviadas[x.id] !== 'ok' && <Selo tom="erro">não saiu</Selo>}
                  </button>
                </li>)}</ul>
              </section>

              <section className="a3-painel a3-caixa-saida__carta" aria-label="Carta">
                <div className="a3-pilha" style={{ padding: 20 }}>
                  <div className="pr-cabeca">
                    <div style={{ minWidth: 0 }}>
                      <span className="a3-rotulo">{TIPOS[atual.carta.tipo].rotulo}</span>
                      <h3 className="a3-titulo-2">{atual.nome}</h3>
                      <p className="a3-mudo a3-pequeno">{atual.motivo}{atual.melhorArea ? ` Melhor área: ${atual.melhorArea}.` : ''}{atual.carta.personalizacao.length ? ` Personalizada com: ${atual.carta.personalizacao.join(', ')}.` : ''}</p>
                    </div>
                    <span className="a3-acoes-linha">
                      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => { definirEdicoes(e => { const n = { ...e }; delete n[atual.id]; return n }); definirSementes(s => ({ ...s, [atual.id]: Math.floor(Math.random() * 2 ** 31) })) }}><Icone nome="raio" tamanho={14} />Outra versão</button>
                      <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => nav.abrirPessoa(atual.id, 'carta')}><Icone nome="usuario" tamanho={14} />Ficha</button>
                    </span>
                  </div>
                  {enviadas[atual.id] && enviadas[atual.id] !== 'ok' && <Faixa tom="erro" titulo="Esta carta não saiu">{enviadas[atual.id]}</Faixa>}
                  <PreviaCarta {...texto(atual)} descadastro />
                  <details className="pr-editar">
                    <summary>Ajustar o texto antes de enviar</summary>
                    <label className="a3-campo"><span>Assunto</span><input className="a3-entrada" maxLength={120} value={texto(atual).assunto} onChange={e => definirEdicoes(x => ({ ...x, [atual.id]: { ...texto(atual), assunto: e.target.value } }))} /></label>
                    <label className="a3-campo"><span>Texto</span><textarea className="a3-entrada" rows={10} value={texto(atual).corpo} onChange={e => definirEdicoes(x => ({ ...x, [atual.id]: { ...texto(atual), corpo: e.target.value } }))} /></label>
                  </details>
                  <AvisosTexto {...texto(atual)} />
                  <div className="pr-acoes">
                    <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => pular(atual)}>Pular por hoje</button>
                    <button type="button" className="a3-botao pr-enviar" disabled={enviando !== null} onClick={() => void enviar(atual)}><Icone nome="enviar" tamanho={16} />{enviando === atual.id ? 'Enviando…' : `Enviar para ${atual.nome.split(' ')[0]}`}</button>
                  </div>
                </div>
              </section>
            </div>}
        </>}
  </div>
}
