import { useEffect, useRef, useState } from 'react'
import { href } from '../../util/rotas'
import { destinosDaAmostra } from '../../dados/rodizioAmostras'
import { GatoPixel } from '../mascote/GatoPixel'
import type { IdLinhaGato } from '../mascote/sprites'
import { Icone } from '../Icone'
import { amostraAcessoDaVez, carregarAmostraAcesso, trocarAmostraAcessoDaVez, type AmostraAcesso, type ResumoAcesso } from './rodizioAcesso'

/** Avisa a cena que a questão foi respondida (o esqueleto comemora o acerto; nada depende disso). */
export const EVENTO_RESPOSTA_ACESSO = 'ortoquestoes:acesso-respondida'

/*
 * A ficha de estudo da tela de entrar (01/11/2026): uma questão real para responder sem conta. Uma por carregamento
 * (rodizioAcesso.ts) e outra a cada "Outra questão", sem mexer no formulário ao lado. A correção mostra a certa e o
 * porquê, um trecho do comentário verdadeiro; o comentário completo fica para quem cria a conta. O gato dorme na beira
 * da ficha, acorda quando a questão muda e comemora o acerto. Se a questão não carregar, a ficha some em silêncio: o
 * formulário nunca depende dela.
 */
export function QuestaoAcesso() {
  const [resumo, definirResumo] = useState<ResumoAcesso>(amostraAcessoDaVez)
  const [amostra, definirAmostra] = useState<AmostraAcesso | null>(null)
  const [falhou, definirFalhou] = useState(false)
  const [marcada, definirMarcada] = useState<string | null>(null)
  const [gato, definirGato] = useState<IdLinhaGato>('dormindo')
  const ficha = useRef<HTMLElement>(null)
  const voltarFoco = useRef(false)

  useEffect(() => {
    let ativo = true
    definirAmostra(null); definirMarcada(null); definirFalhou(false)
    carregarAmostraAcesso(resumo.id).then((a) => { if (ativo) definirAmostra(a) }, () => { if (ativo) definirFalhou(true) })
    return () => { ativo = false }
  }, [resumo.id])
  // Depois de "Outra questão", o foco vai para o enunciado novo (teclado e leitor de tela não se perdem).
  useEffect(() => {
    if (!amostra || !voltarFoco.current) return
    voltarFoco.current = false
    ficha.current?.querySelector<HTMLElement>('.fq-enunciado')?.focus()
  }, [amostra])
  // O gato volta a cochilar um tempo depois de cada reação.
  useEffect(() => {
    if (gato === 'dormindo') return
    const t = window.setTimeout(() => definirGato('dormindo'), gato === 'comemorando' ? 3200 : 5200)
    return () => window.clearTimeout(t)
  }, [gato, resumo.id, marcada])

  if (falhou) return null
  const outra = () => { voltarFoco.current = true; definirGato('observando'); definirResumo(trocarAmostraAcessoDaVez(resumo.id)) }
  const responder = (letra: string) => {
    if (!amostra || marcada) return
    definirMarcada(letra)
    const acertou = letra === amostra.gabarito
    definirGato(acertou ? 'comemorando' : 'observando')
    window.dispatchEvent(new CustomEvent(EVENTO_RESPOSTA_ACESSO, { detail: { acertou } }))
  }
  const respondida = marcada !== null && amostra !== null
  const acertou = respondida && marcada === amostra.gabarito
  const certa = amostra?.alternativas.find((a) => a.letra === amostra.gabarito)
  const escolhida = amostra?.alternativas.find((a) => a.letra === marcada)
  const destinos = amostra ? destinosDaAmostra(amostra) : null

  return (
    <figure ref={ficha} className={`fq${respondida ? ' fq--respondida' : ''}`} aria-label="Questão para experimentar" aria-busy={!amostra || undefined} data-amostra={resumo.id}>
      {/* O gato da casa, deitado na beira da ficha (fica fora da caixa, sem cobrir o texto). */}
      <span className="fq-gato" aria-hidden="true"><GatoPixel key={gato} estado={gato} /></span>
      <figcaption className="fq-topo">
        <span className="fq-selo">Experimente</span>
        <span className="fq-prova">{resumo.origem}<span aria-hidden="true"> · </span>{resumo.tema}</span>
      </figcaption>
      {!amostra ? (
        <span className="fq-esqueleto" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      ) : <>
        <p className="fq-enunciado" tabIndex={-1}>{amostra.enunciado}</p>
        <ol className="fq-alternativas">
          {amostra.alternativas.map(({ letra, texto }) => {
            const estado = !respondida ? '' : letra === amostra.gabarito ? ' fq-alt--certa' : letra === marcada ? ' fq-alt--errada' : ' fq-alt--apagada'
            return (
              <li key={letra}>
                <button type="button" className={`fq-alt${estado}`} disabled={respondida} aria-pressed={marcada === letra} onClick={() => responder(letra)}>
                  <b>{letra}</b><span>{texto}</span>
                  {respondida && letra === amostra.gabarito && <Icone nome="certo" tamanho={16} />}
                  {respondida && letra === marcada && letra !== amostra.gabarito && <Icone nome="errado" tamanho={16} />}
                </button>
              </li>
            )
          })}
        </ol>
        {respondida && certa && (
          <div className="fq-correcao" aria-live="polite">
            <p className={`fq-veredito fq-veredito--${acertou ? 'certo' : 'errado'}`}>
              <Icone nome={acertou ? 'certo' : 'alerta'} tamanho={18} />
              {acertou ? `Isso. A resposta é ${amostra.gabarito}.` : `Você marcou ${marcada}; a resposta é ${amostra.gabarito}.`}
            </p>
            <p><strong>Por que {amostra.gabarito}:</strong> {certa.porque}</p>
            {escolhida && !acertou && <p><strong>Por que não {escolhida.letra}:</strong> {escolhida.porque}</p>}
            {destinos && <p className="fq-convite">O comentário completo, com cada alternativa e a referência, fica na sua conta. <a href={href(destinos.comentario)}>Criar conta e ler o comentário <Icone nome="direita" tamanho={14} /></a></p>}
          </div>
        )}
      </>}
      <div className="fq-rodape">
        {!respondida && amostra && <span className="fq-dica">Escolha uma alternativa para ver a correção.</span>}
        <button type="button" className="fq-outra" onClick={outra} disabled={!amostra}>
          <Icone nome="reiniciar" tamanho={15} /> Outra questão
        </button>
      </div>
    </figure>
  )
}
