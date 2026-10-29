import { useEffect, useMemo, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { supabase } from '../conta/supabase'
import {
  ETAPAS_RAPIDAS, PROVAS, SERVICO_VARIOS, deveMostrarCracha, etapaRapidaDe, lerProvas, passosPerfil, provasSugeridas,
  rotuloBotaoProva, type PassoPerfil, type ProvaInteresse,
} from '../conta/perfilEstudo'
import { CampoServico } from './CampoServico'
import { CrachaPixel, type DadosCracha } from './CrachaPixel'
import { Icone } from './Icone'
import { href } from '../util/rotas'
import '../estilos/componentes/CrachaPerfil.css'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const CHAVE_VISTO = 'perfil:cracha-visto'

function lerVisto(id: string): { login?: string | null; em?: number } | null {
  try { return JSON.parse(localStorage.getItem(`${CHAVE_VISTO}:${id}`) ?? 'null') } catch { return null }
}
function marcarVisto(id: string, login: string | null | undefined) {
  try { localStorage.setItem(`${CHAVE_VISTO}:${id}`, JSON.stringify({ login: login ?? null, em: Date.now() })) } catch { /* sem armazenamento */ }
}

/** O que cada passo pergunta, conforme a etapa (residência, faculdade, onde trabalha). */
function textosDoPasso(passo: PassoPerfil, situacao: string): { titulo: string; apoio: string } {
  switch (passo) {
    case 'etapa': return { titulo: 'Em que fase você está?', apoio: 'Um toque. Com isso o site sugere as provas e as questões certas para o seu momento.' }
    case 'provas': return { titulo: 'Para qual prova você estuda?', apoio: 'Já marcamos a mais comum para a sua fase. Pode trocar e marcar mais de uma.' }
    case 'servico':
      if (situacao === 'estudante') return { titulo: 'Qual é a sua faculdade?', apoio: 'Assim a gente sabe de onde vêm os estudantes que treinam aqui.' }
      if (situacao === 'outro') return { titulo: 'Onde você trabalha?', apoio: 'O hospital, a clínica ou a instituição.' }
      if (situacao === 'mao') return { titulo: 'Onde você faz a residência de mão?', apoio: 'No ranking, você pode aparecer junto com o seu serviço.' }
      return { titulo: 'Onde você faz residência?', apoio: 'No ranking, você pode aparecer junto com o seu serviço.' }
    case 'nome': return { titulo: 'Como você quer aparecer?', apoio: 'É o nome do seu crachá e dos e-mails. Opcional: dá para pular.' }
    case 'local': return { titulo: 'De que estado você é?', apoio: 'Último passo. A cidade é opcional.' }
  }
}

/**
 * O crachá do perfil (21/10/2026, pedido do Tales). O cadastro continua só com e-mail e
 * senha; ao entrar, aparece no topo do site um crachá de hospital em pixel que a pessoa
 * vai preenchendo, uma pergunta por vez. Cada resposta grava na hora e aparece no
 * crachá, que fica pronto ao longo de alguns logins: "Depois" esconde até a próxima
 * entrada (novo login ou 20 horas), sem insistir na mesma visita. Quem já tem tudo
 * nunca vê. Os dados alimentam o painel (etapas, provas, serviços, estados).
 */
export default function CompletarPerfil() {
  const { sessao } = usarConta()
  const usuario = sessao?.user
  const metaConta = (usuario?.user_metadata ?? {}) as Record<string, unknown>
  // O que foi gravado aqui vale na hora, sem esperar a conta devolver os metadados novos.
  const [gravado, definirGravado] = useState<Record<string, unknown>>({})
  const meta = useMemo(() => ({ ...metaConta, ...gravado }), [metaConta, gravado])
  const passos = passosPerfil(meta)
  const passo = passos.find((p) => !p.feito)?.passo ?? null

  const [visivel, definirVisivel] = useState(false)
  const [concluido, definirConcluido] = useState(false)
  const [estado, definirEstado] = useState<'livre' | 'salvando' | 'erro'>('livre')
  const [carimbo, definirCarimbo] = useState(0)
  // Rascunho do passo atual: aparece no crachá enquanto a pessoa escolhe.
  const [situacao, definirSituacao] = useState(String(meta.situacao ?? ''))
  const [ano, definirAno] = useState(String(meta.ano_residencia ?? ''))
  const [provas, definirProvas] = useState<ProvaInteresse[]>(() => lerProvas(meta.provas_interesse))
  const [servico, definirServico] = useState(String(meta.servico ?? meta.residencia ?? ''))
  const [nome, definirNome] = useState(String(meta.nome ?? ''))
  const [sobrenome, definirSobrenome] = useState(String(meta.sobrenome ?? ''))
  const [uf, definirUf] = useState(String(meta.uf ?? ''))
  const [cidade, definirCidade] = useState(String(meta.cidade ?? ''))
  const mexeuNasProvas = useRef(lerProvas(meta.provas_interesse).length > 0)
  const caixa = useRef<HTMLElement>(null)
  const [longe, definirLonge] = useState(false)

  // Uma vez por entrada: aparece se é um login novo ou se já passaram 20 horas.
  useEffect(() => {
    if (!usuario || !passo) return
    if (!deveMostrarCracha(lerVisto(usuario.id), usuario.last_sign_in_at)) return
    marcarVisto(usuario.id, usuario.last_sign_in_at)
    definirVisivel(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id])

  // Fora da tela, o crachá para de balançar.
  useEffect(() => {
    const no = caixa.current
    if (!no || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirLonge(!e.isIntersecting))
    io.observe(no)
    return () => io.disconnect()
  }, [visivel])

  if (!visivel || !usuario) return null
  if (!passo && !concluido) return null

  async function gravar(dados: Record<string, unknown>) {
    if (!supabase) return
    definirEstado('salvando')
    const { error } = await supabase.auth.updateUser({ data: dados })
    if (error) { definirEstado('erro'); return }
    definirEstado('livre')
    definirGravado((g) => ({ ...g, ...dados }))
    definirCarimbo((n) => n + 1)
    if (!passosPerfil({ ...meta, ...dados }).some((p) => !p.feito)) definirConcluido(true)
  }

  function escolherEtapa(id: string) {
    const etapa = ETAPAS_RAPIDAS.find((e) => e.id === id)
    if (!etapa) return
    definirSituacao(etapa.situacao); definirAno(etapa.ano)
    if (!mexeuNasProvas.current) definirProvas(provasSugeridas(etapa.situacao, etapa.ano))
  }
  function alternarProva(p: ProvaInteresse) {
    mexeuNasProvas.current = true
    definirProvas((atuais) => atuais.includes(p) ? atuais.filter((x) => x !== p) : [...atuais, p])
  }

  const etapaOk = !!situacao && (situacao !== 'residente' || !!ano)
  const pronto = passo === 'etapa' ? etapaOk
    : passo === 'provas' ? provas.length > 0
    : passo === 'servico' ? servico.trim().length >= 2
    : passo === 'nome' ? nome.trim().length >= 2
    : passo === 'local' ? !!uf : false

  function continuar() {
    if (!pronto || estado === 'salvando') return
    const agora = new Date().toISOString()
    if (passo === 'etapa') {
      const dados: Record<string, unknown> = { situacao, ano_residencia: situacao === 'residente' ? ano : null }
      // Ortopedista atua em vários serviços: não perguntamos onde.
      if (situacao === 'ortopedista' && String(meta.servico ?? '').trim().length < 2) dados.servico = SERVICO_VARIOS
      void gravar(dados)
    } else if (passo === 'provas') void gravar({ provas_interesse: provas, perfil_estudo_em: agora, perfil_estudo_perguntado: true })
    else if (passo === 'servico') void gravar({ servico: servico.trim() })
    else if (passo === 'nome') void gravar({ nome: nome.trim(), sobrenome: sobrenome.trim() })
    else if (passo === 'local') void gravar({ uf, ...(cidade.trim() ? { cidade: cidade.trim() } : {}) })
  }
  function pular() {
    const pulados = Array.isArray(meta.perfil_pulados) ? meta.perfil_pulados.map(String) : []
    void gravar({ perfil_pulados: [...new Set([...pulados, String(passo)])] })
  }
  function depois() {
    marcarVisto(usuario!.id, usuario!.last_sign_in_at)
    definirVisivel(false)
  }

  const feitos = passos.filter((p) => p.feito).length
  const total = passos.length
  // O crachá mostra o que já está gravado e, no passo atual, o rascunho.
  const ver: DadosCracha = {
    situacao: passo === 'etapa' ? situacao : String(meta.situacao ?? ''),
    ano: passo === 'etapa' ? ano : String(meta.ano_residencia ?? ''),
    provas: passo === 'provas' || passo === 'etapa' ? provas : lerProvas(meta.provas_interesse),
    servico: passo === 'servico' ? servico : String(meta.servico ?? ''),
    nome: passo === 'nome' ? nome : String(meta.nome ?? ''),
    sobrenome: passo === 'nome' ? sobrenome : String(meta.sobrenome ?? ''),
    uf: passo === 'local' ? uf : String(meta.uf ?? ''),
  }
  const textos = passo ? textosDoPasso(passo, situacao || String(meta.situacao ?? '')) : null
  const opcional = passos.find((p) => p.passo === passo)?.opcional

  return (
    <section ref={caixa} className={'cracha-perfil' + (concluido ? ' cracha-perfil--pronto' : '')} aria-labelledby="cracha-perfil-titulo">
      <div className="cracha-perfil__palco" aria-hidden="true">
        <CrachaPixel dados={ver} foco={concluido ? '' : passo ?? ''} carimbo={carimbo} textoCarimbo={concluido ? 'PRONTO' : 'OK'} parado={longe} />
      </div>

      <div className="cracha-perfil__cabeca">
        <span className="cracha-perfil__selo">{concluido ? 'Crachá completo' : `Seu crachá · ${feitos} de ${total}`}</span>
        <ol className="cracha-perfil__trilha" aria-label={`${feitos} de ${total} partes prontas`}>
          {passos.map((p) => <li key={p.passo} className={p.feito ? 'feito' : p.passo === passo ? 'agora' : ''} />)}
        </ol>
        {concluido
          ? <><h2 id="cracha-perfil-titulo">Pronto, seu crachá está completo</h2>
            <p>Obrigado! Agora o site sabe para onde você vai. Dá para mudar quando quiser em <a href={href('/conta?secao=perfil')}>Minha conta › Perfil</a>.</p></>
          : <><h2 id="cracha-perfil-titulo">{textos!.titulo}{opcional && <span className="cracha-perfil__opcional">opcional</span>}</h2>
            <p>{textos!.apoio}</p></>}
      </div>

      <div className="cracha-perfil__pergunta">
        {!concluido && passo === 'etapa' && <div className="perfil-rapido__chips" role="group" aria-label="Sua fase">
          {ETAPAS_RAPIDAS.map((e) => {
            const marcado = etapaRapidaDe(situacao, ano) === e.id
            return <button key={e.id} type="button" className="perfil-rapido__chip" aria-pressed={marcado} onClick={() => escolherEtapa(e.id)}>{marcado && <Icone nome="certo" tamanho={14} />}{e.rotulo}</button>
          })}
        </div>}

        {!concluido && passo === 'provas' && <div className="perfil-rapido__chips" role="group" aria-label="Provas">
          {PROVAS.map(([valor, rotulo, explica]) => <button key={valor} type="button" className="perfil-rapido__chip perfil-rapido__chip--prova" aria-pressed={provas.includes(valor)} title={explica} onClick={() => alternarProva(valor)}>
            {provas.includes(valor) && <Icone nome="certo" tamanho={14} />}{rotuloBotaoProva(valor, rotulo)}
          </button>)}
        </div>}

        {!concluido && passo === 'servico' && <CampoServico situacao={situacao || String(meta.situacao ?? '')} valor={servico} aoMudar={definirServico} uf={uf || String(meta.uf ?? '')} />}

        {!concluido && passo === 'nome' && <div className="cracha-perfil__duplo">
          <label className="campo">Nome<input className="entrada" autoComplete="given-name" value={nome} onChange={(e) => definirNome(e.target.value)} /></label>
          <label className="campo">Sobrenome<input className="entrada" autoComplete="family-name" value={sobrenome} onChange={(e) => definirSobrenome(e.target.value)} /></label>
        </div>}

        {!concluido && passo === 'local' && <div className="cracha-perfil__duplo">
          <label className="campo campo-uf">Estado (UF)<select className="entrada" value={uf} onChange={(e) => definirUf(e.target.value)}><option value="">Selecione</option>{UFS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="campo">Cidade <span className="meta">(opcional)</span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={(e) => definirCidade(e.target.value)} /></label>
        </div>}

        {estado === 'erro' && <p className="relato__erro" role="alert">Não foi possível salvar agora. Tente de novo ou preencha em Minha conta › Perfil.</p>}

        <div className="cracha-perfil__acoes">
          {concluido
            ? <button type="button" className="botao botao--principal" onClick={() => definirVisivel(false)}>Fechar</button>
            : <>
              <button type="button" className="botao botao--principal" disabled={!pronto || estado === 'salvando'} onClick={continuar}>
                {estado === 'salvando' ? 'Salvando…' : feitos + 1 >= total ? 'Concluir o crachá' : 'Salvar e continuar'}
              </button>
              {opcional && <button type="button" className="botao botao--fantasma" disabled={estado === 'salvando'} onClick={pular}>Pular</button>}
              <button type="button" className="cracha-perfil__depois" onClick={depois}>Depois</button>
            </>}
        </div>
      </div>
    </section>
  )
}
