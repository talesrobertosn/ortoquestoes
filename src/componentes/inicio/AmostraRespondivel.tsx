import { useEffect, useState } from 'react'
import { href } from '../../util/rotas'
import { recurso } from '../../config'
import { type AmostraInicio, amostraDaVez, destinosDaAmostra } from '../../dados/rodizioAmostras'
import { Icone } from '../Icone'
import './AmostraRespondivel.css'

/**
 * Questão de amostra que o visitante responde ali mesmo, sem conta (proposta de 16/10/2026).
 * Rodízio de questões do acervo (8 oficiais e 2 de OrtoQuestões Simulados): cada abertura da
 * página traz a próxima de uma ordem embaralhada guardada no aparelho (src/dados/rodizioAmostras.ts).
 * Enunciado, alternativas, gabarito e imagem iguais aos do acervo; cada porquê é um trecho do
 * comentário (scripts/gerar_amostras_inicio.py). Só a questão da vez é baixada.
 */
const CARREGAR = import.meta.glob<AmostraInicio>('../../dados/amostrasInicio/*.json', { import: 'default' })

function carregar(id: string): Promise<AmostraInicio> {
  const ler = CARREGAR[`../../dados/amostrasInicio/${id}.json`]
  return ler ? ler() : Promise.reject(new Error(`Amostra ${id} não encontrada`))
}

export function AmostraRespondivel() {
  const [resumo] = useState(amostraDaVez)
  const [amostra, definirAmostra] = useState<AmostraInicio | null>(null)
  const [marcada, definirMarcada] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregar(resumo.id).then((a) => { if (ativo) definirAmostra(a) }, () => { /* fica o esqueleto; o resto da página segue */ })
    return () => { ativo = false }
  }, [resumo.id])

  const origem = resumo.simulado ? `${resumo.origem} · feita por engenharia reversa da banca` : `${resumo.origem} · ${resumo.tema}`
  const topo = (
    <figcaption className="ip-amostra__topo">
      <span className="ip-amostra__selo">Experimente agora</span>
      <span className="ip-amostra__prova">{origem}</span>
    </figcaption>
  )

  if (!amostra) {
    return (
      <figure className="ip-amostra ip-amostra--carregando" aria-label="Questão de amostra para responder" aria-busy="true">
        {topo}
        <span className="ip-amostra__esqueleto" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </figure>
    )
  }

  const { gabarito, alternativas } = amostra
  const respondida = marcada !== null
  const acertou = marcada === gabarito
  const escolhida = alternativas.find((a) => a.letra === marcada)
  const certa = alternativas.find((a) => a.letra === gabarito)!
  const destinos = destinosDaAmostra(amostra)

  return (
    <figure className={`ip-amostra${respondida ? ' ip-amostra--respondida' : ''}`} aria-label="Questão de amostra para responder" data-amostra={amostra.id}>
      {topo}
      <p className="ip-amostra__enunciado">{amostra.enunciado}</p>
      {amostra.imagem && (
        <img
          className="ip-amostra__imagem"
          src={recurso(`imagens/${amostra.imagem.arquivo}`)}
          width={amostra.imagem.largura}
          height={amostra.imagem.altura}
          alt={amostra.imagem.legenda ?? 'Imagem da questão'}
          decoding="async"
        />
      )}
      <ol className="ip-amostra__alternativas" role="list">
        {alternativas.map(({ letra, texto }) => {
          const estado = !respondida ? '' : letra === gabarito ? ' ip-alt--certa' : letra === marcada ? ' ip-alt--errada' : ' ip-alt--apagada'
          return (
            <li key={letra}>
              <button type="button" className={`ip-alt${estado}`} disabled={respondida} aria-pressed={marcada === letra} onClick={() => definirMarcada(letra)}>
                <b>{letra}</b><span>{texto}</span>
                {respondida && letra === gabarito && <Icone nome="certo" tamanho={16} />}
                {respondida && letra === marcada && letra !== gabarito && <Icone nome="errado" tamanho={16} />}
              </button>
            </li>
          )
        })}
      </ol>
      {!respondida && <p className="ip-amostra__dica">Toque numa alternativa para ver a resposta comentada.</p>}
      {respondida && (
        <div className="ip-amostra__comentario" aria-live="polite">
          <p className={`ip-amostra__veredito ip-amostra__veredito--${acertou ? 'certo' : 'errado'}`}>
            {acertou ? `Isso! A resposta é ${gabarito}.` : `Quase. Você marcou ${marcada}; a resposta é ${gabarito}.`}
          </p>
          <p><strong>Por que {gabarito}:</strong> {certa.porque}</p>
          {escolhida && !acertou && <p><strong>Por que não {escolhida.letra}:</strong> {escolhida.porque}</p>}
          <div className="ip-amostra__acoes">
            <a className="botao botao--ouro" href={href(destinos.maisComoEsta)}>Fazer mais questões como esta</a>
            <a className="ip-amostra__link" href={href(destinos.comentario)}>Ler o comentário completo <Icone nome="direita" tamanho={14} /></a>
          </div>
          <p className="ip-amostra__dica">Para continuar, crie sua conta grátis. Depois do cadastro, você volta direto para cá.</p>
        </div>
      )}
    </figure>
  )
}
