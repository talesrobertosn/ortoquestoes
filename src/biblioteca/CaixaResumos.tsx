import { useMemo } from 'react'
import { usarPremium } from '../conta/premium'
import { Icone } from '../componentes/Icone'
import { corDaArea } from '../dados/coresAreas'
import { hojeBR } from '../util/dia'
import { href } from '../util/rotas'
import { ChamaPixel } from '../componentes/ChamaPixel'
import { ordemDoDia, resumosDosSubtemas, usarIndiceBiblioteca } from './recomendar'
import type { Leitura, ResumoCapitulo } from './tipos'
import { usarBiblioteca } from './usarBiblioteca'
import '../estilos/componentes/Biblioteca.css'

const estiloArea = (c: ResumoCapitulo) => ({ ['--bib-area' as string]: corDaArea(c.especialidade) })

/** Uma linha para o estado da leitura: quanto falta, se já leu ou quanto tempo leva. */
function estadoLeitura(c: ResumoCapitulo, l: Leitura | undefined): string {
  if (l?.concluidoEm || (l?.progresso ?? 0) >= 95) return 'Lido · bom para revisar'
  if (l && l.progresso > 0) return `${l.progresso}% lido · faltam ~${Math.max(1, Math.round(c.minutos * (1 - l.progresso / 100)))} min`
  return `~${c.minutos} min de leitura`
}

/**
 * Caixa "Resumos" da coluna lateral do cronograma (pedido do Tales, 16/10/2026): o resumo que combina com
 * o tema de hoje vem em destaque, com o convite para ler antes das questões; abaixo, outros da estante
 * (os que a pessoa está lendo primeiro, depois uma ordem que muda a cada dia) e o caminho para a Biblioteca.
 */
export function CaixaResumos({ subtemasHoje, especialidade, rotuloDia }: { subtemasHoje: Set<string>; /** Dia escolhido no calendário, quando não é hoje ("sáb, 2/11"). */ rotuloDia?: string; /** Só os resumos desta área (o cronograma da mão mostra só os da mão). */ especialidade?: string }) {
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const { premium } = usarPremium()
  const dia = hojeBR()
  const { combina, outros } = useMemo(() => {
    const daArea = (c: ResumoCapitulo) => !especialidade || c.especialidade === especialidade
    const combina = resumosDosSubtemas(biblioteca, subtemasHoje).filter(daArea)[0] ?? null
    const resto = (biblioteca?.capitulos ?? []).filter((c) => c.id !== combina?.id && daArea(c))
    const lendo = resto.filter((c) => leituras[c.id]?.progresso && !leituras[c.id]?.concluidoEm).sort((a, b) => (leituras[b.id]?.em ?? 0) - (leituras[a.id]?.em ?? 0))
    const outros = [...lendo, ...ordemDoDia(resto.filter((c) => !lendo.includes(c)), dia)].slice(0, combina ? 2 : 3)
    return { combina, outros }
  }, [biblioteca, subtemasHoje, leituras, dia, especialidade])
  if (!combina && !outros.length) return null
  const fechado = (c: ResumoCapitulo) => c.acesso !== 'gratis' && !premium

  return (
    <section className="cp-bloco" aria-labelledby="bib-caixa-titulo">
      <p className="cp-rotulo"><span id="bib-caixa-titulo">Resumos <span className="cp-tag">Beta</span></span><a className="bib-caixa__todos" href={href(especialidade ? `/resumos?area=${especialidade}` : '/resumos')}>Ver a biblioteca</a></p>
      <div className="bib-caixa">
        {combina && <div className="bib-destaque-fogo"><ChamaPixel altura={30} lados={10} forca={0.9} raio={14} /><a className={'bib-destaque' + (fechado(combina) ? ' bib-destaque--fechado' : '')} href={href(`/resumos/${combina.id}`)} style={estiloArea(combina)}>
          <span className="bib-destaque__lombada" aria-hidden="true" />
          <span className="bib-destaque__corpo">
            <span className="bib-destaque__selo"><Icone nome="alvo" tamanho={13} /> {rotuloDia ? `Combina com o tema de ${rotuloDia}` : 'Combina com o tema de hoje'}</span>
            <strong>{combina.titulo}</strong>
            <small>{combina.capitulo.split('·')[0].trim()} · {combina.livro.replace(/ in Adults$/, '')}</small>
            {leituras[combina.id]?.progresso ? <span className="bib-barra" aria-hidden="true"><span style={{ width: `${leituras[combina.id]!.progresso}%` }} /></span> : null}
            <span className="bib-destaque__rodape">
              <span>{estadoLeitura(combina, leituras[combina.id])}</span>
              <span className="bib-destaque__acao">{fechado(combina) ? <><Icone nome="cadeado" tamanho={13} /> Assinantes</> : leituras[combina.id]?.progresso ? 'Continuar' : 'Ler antes das questões'} <Icone nome="direita" tamanho={14} /></span>
            </span>
          </span>
        </a></div>}
        {outros.length > 0 && <ul className="bib-pilha" aria-label={combina ? 'Outros resumos' : 'Resumos para ler'}>
          {outros.map((c) => <li key={c.id}><a href={href(`/resumos/${c.id}`)} style={estiloArea(c)}>
            <span className="bib-pilha__lombada" aria-hidden="true" />
            <span className="bib-pilha__texto"><strong>{c.titulo}</strong><small>{estadoLeitura(c, leituras[c.id])}</small></span>
            {fechado(c) ? <Icone nome="cadeado" tamanho={14} /> : <Icone nome="direita" tamanho={14} />}
          </a></li>)}
        </ul>}
        <p className="bib-caixa__nota"><Icone nome="livro" tamanho={14} /> Resumos novos toda semana, feitos dos capítulos de referência e das questões que já caíram.</p>
      </div>
    </section>
  )
}
