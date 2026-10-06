import type { Questao, Resposta } from '../dados/tipos'
import { MINIMO_TURMA, usarTurmaQuestao } from '../dados/turma'
import { usarPremium } from '../conta/premium'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { SeloAssinante } from './Premium'

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0)
const pessoas = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'pessoa' : 'pessoas'}`

/**
 * "Como a turma respondeu": a primeira resposta de cada pessoa, letra a letra.
 * Para o assinante, logo abaixo do resultado (posicao "topo"). Para quem não
 * assina, o convite fica discreto no pé, depois do comentário (posicao
 * "rodape"), para não interromper o estudo a cada questão.
 */
export function ComoATurma({ questao, resposta, posicao }: { questao: Questao; resposta: Resposta; posicao: 'topo' | 'rodape' }) {
  const { logado, premium } = usarPremium()
  const valida = !!questao.gabarito && !questao.anulada
  const minha = posicao === 'topo' ? premium : !premium
  const { dados, falhou } = usarTurmaQuestao(questao.id, logado && valida && minha)
  if (!minha || !logado || !valida || falhou || !dados) return null

  if (!premium || dados.letras === null) {
    if (posicao === 'topo') return null
    return (
      <section className="tu tu--bloqueado" aria-label="Como a turma respondeu">
        <div className="tu-previa" aria-hidden="true">
          {questao.alternativas.map((a, i) => <span key={a.letra} className="tu-previa__barra" style={{ width: `${[62, 18, 12, 6, 2][i] ?? 4}%` }}><b>{a.letra}</b></span>)}
        </div>
        <div className="tu-bloqueio">
          <p className="tu-bloqueio__titulo"><Icone nome="grupo" tamanho={18} /> Como a turma respondeu</p>
          <p className="tu-bloqueio__texto">
            {dados.respondentes >= MINIMO_TURMA
              ? <><strong>{pessoas(dados.respondentes)}</strong> já responderam esta questão. Veja quantos marcaram cada alternativa e onde a turma cai.</>
              : 'Veja quantos marcaram cada alternativa e onde a turma cai, em todas as questões.'}
          </p>
          <a className="botao botao--ouro" href={href('/assinatura')}><Icone nome="cadeado" tamanho={16} /> Exclusivo para assinantes</a>
        </div>
      </section>
    )
  }

  const letras = questao.alternativas.map((a) => a.letra)
  const comLetra = dados.com_letra ?? 0
  const acertoPrimeira = pct(dados.acertos ?? 0, dados.respondentes)

  if (dados.respondentes < MINIMO_TURMA) {
    return (
      <section className="tu" aria-label="Como a turma respondeu">
        <header className="tu-cabeca"><p className="tu-titulo"><Icone nome="grupo" tamanho={18} /> Como a turma respondeu</p><SeloAssinante /></header>
        <p className="tu-vazio">Ainda {dados.respondentes === 0 ? 'ninguém respondeu' : `só ${pessoas(dados.respondentes)} ${dados.respondentes === 1 ? 'respondeu' : 'responderam'}`} esta questão. Os números aparecem a partir de {MINIMO_TURMA} pessoas.</p>
      </section>
    )
  }

  const ordenadas = letras
    .map((letra) => ({ letra, n: dados.letras?.[letra] ?? 0 }))
    .map((x) => ({ ...x, p: pct(x.n, comLetra) }))
  const pegadinha = ordenadas.filter((x) => x.letra !== questao.gabarito).sort((a, b) => b.n - a.n)[0]
  const certa = ordenadas.find((x) => x.letra === questao.gabarito)
  const manchete = comLetra >= MINIMO_TURMA && certa
    ? `${certa.p}% marcaram ${certa.letra}${pegadinha && pegadinha.p >= 10 ? `, ${pegadinha.p}% caíram na ${pegadinha.letra}` : ''}.`
    : `${acertoPrimeira}% acertaram de primeira.`
  const sua = resposta.escolhida

  return (
    <section className="tu" aria-label="Como a turma respondeu">
      <header className="tu-cabeca">
        <p className="tu-titulo"><Icone nome="grupo" tamanho={18} /> Como a turma respondeu</p>
        <SeloAssinante />
      </header>
      <p className="tu-manchete">{manchete}</p>
      <p className="tu-sub">Primeira resposta de {pessoas(dados.respondentes)} · {acertoPrimeira}% acertaram de primeira{resposta.correta === false && acertoPrimeira >= 80 ? ' · quase todo mundo acerta esta: vale reler o comentário' : resposta.correta === true && acertoPrimeira <= 40 ? ' · você acertou uma que a maioria erra' : ''}</p>
      {comLetra >= MINIMO_TURMA ? (
        <ol className="tu-barras">
          {ordenadas.map((x) => {
            const eCerta = x.letra === questao.gabarito
            const ePegadinha = !eCerta && pegadinha?.letra === x.letra && x.p >= 20
            return (
              <li key={x.letra} className={'tu-barra' + (eCerta ? ' tu-barra--certa' : '') + (ePegadinha ? ' tu-barra--pegadinha' : '')}>
                <span className="tu-barra__letra">{x.letra}</span>
                <span className="tu-barra__trilho"><span className="tu-barra__cheio" style={{ width: `${Math.max(x.p, x.n ? 2 : 0)}%` }} /></span>
                <span className="tu-barra__valor numerico">{x.p}%</span>
                <span className="tu-barra__marcas">
                  {eCerta && <em className="tu-marca tu-marca--certa">gabarito</em>}
                  {ePegadinha && <em className="tu-marca tu-marca--pegadinha">pegadinha</em>}
                  {sua === x.letra && <em className="tu-marca">você</em>}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="tu-vazio">A distribuição por alternativa começa a aparecer conforme mais gente responde.</p>
      )}
    </section>
  )
}
