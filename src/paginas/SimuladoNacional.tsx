import { useCallback, useEffect, useMemo, useState } from 'react'
import { chamarRpc, chamarRpcPublica, codigoErro } from '../servicos/supabase'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { nomeEdicao, usarSessao } from '../estado/sessao'
import { prontidaoDoTema, type EdicaoNacional, type Prontidao, type ResultadoNacional } from '../dados/simuladoNacional'
import { entregarSessaoNacional } from '../dados/entregaNacional'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/SimuladoNacional.css'

const ROTULO_PRONTIDAO: Record<Prontidao, string> = { pronto: 'Pronto', caminho: 'No caminho', reforcar: 'Reforçar' }

function duracao(segundos: number) {
  const h = Math.floor(segundos / 3600), m = Math.round((segundos % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}
function faltaPara(iso: string) {
  const ms = Date.parse(iso) - Date.now()
  if (ms <= 0) return 'encerrada'
  const dias = Math.floor(ms / 86_400_000)
  if (dias >= 1) return `encerra em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  const horas = Math.max(1, Math.round(ms / 3_600_000))
  return `encerra em ${horas} ${horas === 1 ? 'hora' : 'horas'}`
}
const lista = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
const iniciais = (apelido: string) => {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

export function SimuladoNacional({ consulta }: { consulta: URLSearchParams }) {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const { sessao, iniciar } = usarSessao()
  const pedida = consulta.get('edicao')
  const [edicao, definirEdicao] = useState<EdicaoNacional | null>(null)
  const [resultado, definirResultado] = useState<ResultadoNacional | null>(null)
  const [erro, definirErro] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const [correcao, definirCorrecao] = useState<Array<{ id_questao: string; gabarito: string; marcada: string | null }> | null>(null)

  const carregar = useCallback(async () => {
    try {
      const chamada = logado ? chamarRpc<EdicaoNacional>('obter_simulado_nacional', { p_edicao: pedida }) : chamarRpcPublica<EdicaoNacional>('obter_simulado_nacional', { p_edicao: pedida })
      const ed = await chamada
      definirEdicao(ed)
      if (logado && ed.edicao && ed.minha?.entregue_em) definirResultado(await chamarRpc<ResultadoNacional>('resultado_simulado_nacional', { p_edicao: ed.edicao }))
      else definirResultado(null)
    } catch (falha) {
      definirErro(String(falha).includes('(404)') ? 'O Simulado Nacional ainda não está disponível. Volte em breve.' : 'Não foi possível carregar o simulado agora. Confira a conexão e tente de novo.')
    }
  }, [logado, pedida])
  useEffect(() => { void carregar() }, [carregar])

  // Prova feita neste aparelho, encerrada (ou com o tempo esgotado com a aba
  // fechada), mas ainda sem entrega registrada: entrega agora.
  const tempoAcabou = !!edicao?.minha && Date.parse(edicao.minha.iniciado_em) + (edicao?.duracao_min ?? 0) * 60_000 < Date.now()
  const pendenteAqui = !!edicao?.edicao && !!edicao.minha && !edicao.minha.entregue_em && sessao?.nacional === edicao.edicao && (!!sessao.concluidaEm || tempoAcabou)
  useEffect(() => {
    if (!pendenteAqui || !sessao) return
    let vivo = true
    entregarSessaoNacional(sessao).then(() => { if (vivo) void carregar() }).catch(() => undefined)
    return () => { vivo = false }
  }, [pendenteAqui, sessao, carregar])

  async function comecar() {
    if (!edicao?.edicao || ocupado) return
    if (sessao && !sessao.concluidaEm && sessao.nacional !== edicao.edicao && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    definirOcupado(true); definirErro('')
    try {
      const inicio = await chamarRpc<{ ids: string[]; iniciado_em: string; duracao_min: number }>('iniciar_simulado_nacional', { p_edicao: edicao.edicao })
      // Retomar no mesmo aparelho mantém as respostas já marcadas.
      if (!(sessao?.nacional === edicao.edicao && !sessao.concluidaEm)) {
        iniciar({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, embaralhar: false }, inicio.ids, { simulado: true, limiteSegundos: inicio.duracao_min * 60, nacional: edicao.edicao, criadaEm: Date.parse(inicio.iniciado_em) })
      }
      navegar('/sessao')
    } catch (falha) {
      const codigo = codigoErro(falha)
      definirErro(codigo === 'premium_necessario' ? 'O Simulado Nacional é exclusivo para assinantes.' : codigo === 'edicao_fechada' ? 'Esta edição já encerrou.' : codigo === 'ja_entregue' ? 'Você já entregou esta edição.' : 'Não foi possível começar agora. Tente de novo em instantes.')
      void carregar()
    } finally { definirOcupado(false) }
  }

  async function verCorrecao() {
    if (!edicao?.edicao) return
    try { definirCorrecao(await chamarRpc('gabarito_simulado_nacional', { p_edicao: edicao.edicao })) } catch { definirErro('Não foi possível carregar a correção agora.') }
  }

  const slugDoTema = useMemo(() => new Map(indice?.temas.map((t) => [t.nome, t.slug]) ?? []), [indice])

  if (erro && !edicao) return <Estado titulo="Simulado Nacional"><p>{erro}</p></Estado>
  if (!edicao || (logado && !carregado)) return <Carregando linhas={5} rotulo="Carregando o Simulado Nacional" />
  if (!edicao.edicao) return (
    <Estado titulo="A primeira edição do Simulado Nacional está chegando" acoes={<a className="botao botao--principal" href={href('/treinar')}>Treinar enquanto isso</a>}>
      <p>Todo mês, uma prova igual para todos os assinantes, com nota, posição e relatório de prontidão.</p>
    </Estado>
  )

  const minha = edicao.minha
  const tempoEsgotado = !!minha && !minha.entregue_em && Date.parse(minha.iniciado_em) + edicao.duracao_min * 60_000 < Date.now()
  const emAndamento = !!minha && !minha.entregue_em && !tempoEsgotado
  const temas = Object.entries(edicao.por_tema).sort((a, b) => b[1] - a[1])

  return (
    <div className="empilha-2 sn">
      <section className="sn-heroi">
        <div className="sn-heroi__texto">
          <p className="sn-heroi__selo"><Icone nome="trofeu" tamanho={15} /> Simulado Nacional OrtoQuestões</p>
          <h1>{edicao.titulo.replace(/^Simulado Nacional · /, '')}</h1>
          <p>A mesma prova para todos os assinantes do Brasil. No fim, sua nota, sua posição e o que falta para você estar pronto.</p>
          <ul className="sn-fatos">
            <li><Icone nome="livro" tamanho={16} /><b className="numerico">{edicao.total}</b> questões de TEOT e TARO</li>
            <li><Icone nome="relogio" tamanho={16} /><b className="numerico">{duracao(edicao.duracao_min * 60)}</b> de prova</li>
            <li><Icone nome="grupo" tamanho={16} /><b className="numerico">{edicao.participantes.toLocaleString('pt-BR')}</b> {edicao.participantes === 1 ? 'entregou' : 'entregaram'}</li>
            <li><Icone nome="calendario" tamanho={16} />{faltaPara(edicao.fecha_em)}</li>
          </ul>
        </div>
        <div className="sn-heroi__acao">
          {!logado ? (
            <a className="botao botao--claro botao--grande" href={href('/conta?modo=entrar')}>Entrar para participar</a>
          ) : !premium && !minha ? (
            <a className="botao botao--ouro botao--grande" href={href('/assinatura')}><Icone nome="cadeado" tamanho={18} /> Exclusivo para assinantes</a>
          ) : minha?.entregue_em ? (
            <p className="sn-heroi__status"><Icone nome="certo" tamanho={18} /> Prova entregue em {new Date(minha.entregue_em).toLocaleDateString('pt-BR')}</p>
          ) : emAndamento ? (
            <button type="button" className="botao botao--claro botao--grande" onClick={comecar} disabled={ocupado}>Continuar a prova</button>
          ) : tempoEsgotado ? (
            <p className="sn-heroi__status"><Icone nome="relogio" tamanho={18} /> Tempo encerrado. {pendenteAqui ? 'Entregando…' : 'Suas marcações ficaram no aparelho em que você fez a prova: abra o site nele para entregar.'}</p>
          ) : edicao.aberto ? (
            <button type="button" className="botao botao--claro botao--grande" onClick={comecar} disabled={ocupado}>{ocupado ? 'Preparando…' : 'Começar a prova'}</button>
          ) : (
            <p className="sn-heroi__status">Esta edição encerrou. A próxima abre no dia 1º.</p>
          )}
          {erro && <p className="sn-heroi__erro" role="alert">{erro}</p>}
        </div>
      </section>

      {!premium && !minha && (
        <Degustacao titulo="Assim chega o seu resultado (exemplo)" texto={<p>Uma prova por mês, igual para todos os assinantes, corrigida na hora, com a sua posição e um relatório de prontidão por tema.</p>} acao="Quero fazer o Simulado Nacional">
          <AmostraResultado />
        </Degustacao>
      )}

      {resultado?.entregue ? (
        <Resultado resultado={resultado} slugDoTema={slugDoTema} aoVerCorrecao={verCorrecao} correcao={correcao} />
      ) : (
        <div className="sn-duas">
          <section className="cartao cartao__corpo sn-regras">
            <h2>Como funciona</h2>
            <ul>
              <li><Icone nome="relogio" tamanho={18} /><span><strong>O cronômetro corre desde o início.</strong> Fechar a aba não pausa, como na prova. Faça a prova do começo ao fim no mesmo aparelho: as marcações ficam nele até a entrega.</span></li>
              <li><Icone nome="alvo" tamanho={18} /><span><strong>Uma tentativa por edição.</strong> Vale a primeira entrega; o gabarito aparece depois de entregar.</span></li>
              <li><Icone nome="trofeu" tamanho={18} /><span><strong>Ranking por acertos</strong>, com desempate pelo menor tempo. Entregas fora do tempo recebem nota, mas não entram no ranking.</span></li>
              <li><Icone nome="grafico" tamanho={18} /><span><strong>Relatório de prontidão:</strong> seu acerto em cada tema comparado à média de quem fez a mesma prova.</span></li>
            </ul>
          </section>
          <section className="cartao cartao__corpo sn-temas">
            <h2>O que cai nesta edição</h2>
            <p className="texto-2">Temas na proporção das provas de TEOT e TARO do acervo.</p>
            <ul className="sn-composicao">
              {temas.map(([tema, n]) => (
                <li key={tema}><span>{tema}</span><span className="sn-composicao__barra" aria-hidden="true"><span style={{ width: `${(n / temas[0][1]) * 100}%` }} /></span><b className="numerico">{n}</b></li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {edicao.anteriores.length > 0 && (
        <nav className="sn-anteriores" aria-label="Edições anteriores">
          <span>Edições anteriores:</span>
          {edicao.anteriores.map((a) => <a key={a.edicao} href={href(`/simulado-nacional?edicao=${a.edicao}`)}>{nomeEdicao(a.edicao)}</a>)}
          {pedida && <a href={href('/simulado-nacional')}>Edição atual</a>}
        </nav>
      )}
    </div>
  )
}

function Resultado({ resultado, slugDoTema, aoVerCorrecao, correcao }: {
  resultado: ResultadoNacional
  slugDoTema: Map<string, string>
  aoVerCorrecao: () => void
  correcao: Array<{ id_questao: string; gabarito: string; marcada: string | null }> | null
}) {
  const acertos = resultado.acertos ?? 0, total = resultado.total ?? 0
  const nota = total ? Math.round((acertos / total) * 100) : 0
  const temas = (resultado.temas ?? []).map((t) => ({ ...t, estado: prontidaoDoTema(t.certas, t.total, t.media), p: t.total ? Math.round((t.certas / t.total) * 100) : 0 }))
  const prontos = temas.filter((t) => t.estado === 'pronto').sort((a, b) => b.p - a.p).map((t) => t.tema)
  const reforcar = temas.filter((t) => t.estado === 'reforcar').sort((a, b) => a.p - b.p).map((t) => t.tema)
  const manchete = prontos.length && reforcar.length
    ? `Você está pronto em ${lista(prontos.slice(0, 3))}; ${lista(reforcar.slice(0, 3))} ${reforcar.length === 1 ? 'está abaixo' : 'estão abaixo'} da média.`
    : prontos.length ? `Você está pronto em ${lista(prontos.slice(0, 4))}. Continue no ritmo.`
    : reforcar.length ? `${lista(reforcar.slice(0, 4))} ${reforcar.length === 1 ? 'pede' : 'pedem'} reforço antes da prova.`
    : 'Você está no caminho em todos os temas. Um pouco mais de volume e a nota sobe.'

  return (
    <>
      <section className="sn-placar" aria-label="Seu resultado">
        <div className="sn-nota" style={{ '--p': `${nota}%` } as React.CSSProperties}>
          <strong className="numerico">{nota}%</strong>
          <span>{acertos} de {total}</span>
        </div>
        <dl className="sn-numeros">
          <div className="sn-numeros__destaque">
            <dt>Sua posição</dt>
            <dd>{resultado.premium && resultado.posicao ? <>#{resultado.posicao}<small> de {resultado.participantes}</small></> : resultado.no_tempo === false ? 'Fora do ranking' : '—'}</dd>
          </div>
          {resultado.percentil != null && <div><dt>Melhor que</dt><dd>{resultado.percentil}%<small> dos participantes</small></dd></div>}
          <div><dt>Média da edição</dt><dd>{resultado.media != null ? `${Math.round(resultado.media)}%` : '—'}</dd></div>
          <div><dt>Seu tempo</dt><dd>{duracao(resultado.segundos ?? 0)}</dd></div>
        </dl>
        {resultado.no_tempo === false && <p className="sn-aviso">A entrega passou do tempo da prova: a nota vale para você, mas não entra no ranking.</p>}
      </section>

      {resultado.premium && temas.length > 0 && (
        <section className="cartao cartao__corpo sn-prontidao" aria-labelledby="sn-prontidao-titulo">
          <header className="sn-prontidao__cabeca">
            <div>
              <p className="meta">RELATÓRIO DE PRONTIDÃO</p>
              <h2 id="sn-prontidao-titulo">{manchete}</h2>
            </div>
            <SeloAssinante />
          </header>
          <ul className="sn-temas-lista">
            {[...temas].sort((a, b) => a.p - b.p).map((t) => {
              const slug = slugDoTema.get(t.tema)
              return (
                <li key={t.tema} className={`sn-tema sn-tema--${t.estado}`}>
                  <span className="sn-tema__nome">{t.tema}<small>{t.certas} de {t.total}</small></span>
                  <span className="sn-tema__barra" aria-hidden="true">
                    <span className="sn-tema__voce" style={{ width: `${t.p}%` }} />
                    {t.media != null && <span className="sn-tema__media" style={{ left: `${t.media}%` }} title={`Média da turma: ${Math.round(t.media)}%`} />}
                  </span>
                  <span className="sn-tema__pct numerico">{t.p}%<small>{t.media != null ? `média ${Math.round(t.media)}%` : ''}</small></span>
                  <span className={`sn-tema__selo sn-tema__selo--${t.estado}`}>{ROTULO_PRONTIDAO[t.estado]}</span>
                  {t.estado !== 'pronto' && slug && <a className="sn-tema__treinar" href={href(`/treinar?temas=${slug}&situacao=naoRespondidas`)}>Treinar</a>}
                </li>
              )
            })}
          </ul>
          <p className="sn-legenda"><span className="sn-legenda__voce" /> você <span className="sn-legenda__media" /> média de quem fez esta edição</p>
        </section>
      )}

      {(resultado.top?.length ?? 0) > 0 && (
        <section className="cartao cartao__corpo sn-top" aria-labelledby="sn-top-titulo">
          <h2 id="sn-top-titulo"><Icone nome="trofeu" tamanho={20} /> Top 10 da edição</h2>
          <ol className="rk-lista">
            {resultado.top!.map((linha) => (
              <li key={linha.posicao} className={'rk-linha' + (linha.eh_voce ? ' rk-linha--voce' : '')}>
                <span className="rk-linha__posicao numerico">{linha.posicao}</span>
                <span className="rk-linha__avatar">{iniciais(linha.apelido)}</span>
                <span className="rk-linha__nome"><span className="rk-linha__apelido">{linha.apelido}{linha.eh_voce && <span className="rk-voce">você</span>}</span><small className="texto-2">{duracao(linha.segundos)}</small></span>
                <span className="rk-linha__total numerico">{linha.acertos}/{linha.total}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="cartao cartao__corpo sn-correcao">
        <div className="sn-correcao__cabeca">
          <div>
            <h2>Correção questão a questão</h2>
            <p className="texto-2">Abra cada questão para ler o comentário completo.</p>
          </div>
          {!correcao && <button type="button" className="botao" onClick={aoVerCorrecao}>Ver o gabarito</button>}
        </div>
        {correcao && (
          <ol className="sn-gabarito">
            {correcao.map((q, i) => {
              const certa = q.marcada === q.gabarito
              return (
                <li key={q.id_questao} className={certa ? 'sn-gabarito--certa' : 'sn-gabarito--errada'}>
                  <a href={href(`/questao/${q.id_questao}`)}>
                    <span className="numerico">{i + 1}</span>
                    <Icone nome={certa ? 'certo' : 'errado'} tamanho={14} />
                    <small>{q.marcada ? `${q.marcada} → ${q.gabarito}` : `em branco → ${q.gabarito}`}</small>
                  </a>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </>
  )
}

/** Exemplo de resultado para quem não assina: números fictícios, sob desfoque. */
function AmostraResultado() {
  const temas: Array<[string, number, number, string]> = [['Trauma adulto', 80, 62, 'pronto'], ['Ombro e cotovelo', 71, 64, 'caminho'], ['Mão e punho', 43, 58, 'reforcar']]
  return (
    <div className="empilha">
      <section className="sn-placar">
        <div className="sn-nota" style={{ '--p': '74%' } as React.CSSProperties}><strong className="numerico">74%</strong><span>37 de 50</span></div>
        <dl className="sn-numeros">
          <div className="sn-numeros__destaque"><dt>Sua posição</dt><dd>#12<small> de 318</small></dd></div>
          <div><dt>Melhor que</dt><dd>96%<small> dos participantes</small></dd></div>
          <div><dt>Média da edição</dt><dd>61%</dd></div>
        </dl>
      </section>
      <section className="cartao cartao__corpo sn-prontidao">
        <ul className="sn-temas-lista">
          {temas.map(([tema, p, media, estado]) => (
            <li key={tema} className={`sn-tema sn-tema--${estado}`}>
              <span className="sn-tema__nome">{tema}</span>
              <span className="sn-tema__barra"><span className="sn-tema__voce" style={{ width: `${p}%` }} /><span className="sn-tema__media" style={{ left: `${media}%` }} /></span>
              <span className="sn-tema__pct numerico">{p}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
