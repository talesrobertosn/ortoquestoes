import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Mascote } from '../componentes/mascote/Mascote'
import { GatoPixel } from '../componentes/mascote/GatoPixel'
import { CorujaPixel, LINHAS_CORUJA, type EstadoCoruja } from '../biblioteca/sala/CorujaPixel'
import type { IdComportamento } from '../componentes/mascote/comportamentos'
import type { IdLinhaGato } from '../componentes/mascote/sprites'
import { CONCEITOS_CORUJA, FALAS_GATO } from '../componentes/mascote/falasBichos'
import { FALAS_GERAIS } from '../componentes/mascote/falas'
import { luzNoBicho } from '../componentes/mascote/luz'
import { usarPeriodo } from '../estado/aparencia'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import '../estilos/paginas/Bichos.css'

/*
 * A sala dos bichos (01/11/2026; plano em docs/design/MASCOTES.md, seções 5.4 e 6.3): a ficha dos três mascotes, com o
 * retrato vivo (poses de verdade, com a luz da lareira da sala), quem cada um é, onde mora e uma fala por toque; e o
 * álbum das raridades que a pessoa já viu na página inicial (localStorage['bichos:album'], gravado pelo diretor de
 * cena). Nada aqui conta ponto nem muda o estudo: é o cantinho de quem gosta deles.
 */

type Raridade = { id: string; nome: string; pista: string; de: 'esqueleto' | 'gato' | 'coruja' }
const RARIDADES: Raridade[] = [
  { id: 'gato-dourado', nome: 'O gato dourado', pista: 'Uma visita em 150, ele acorda dourado na página inicial.', de: 'gato' },
  { id: 'estrela-cadente', nome: 'A estrela cadente', pista: 'Só à noite, quando a coruja olha para o céu.', de: 'coruja' },
  { id: 'osso-trocado', nome: 'O osso trocado', pista: 'Às vezes o esqueleto se monta com uma costela fora do lugar.', de: 'esqueleto' },
]

const POSES_ESQUELETO: { id: IdComportamento; nome: string }[] = [
  { id: 'acenar', nome: 'Acenando' }, { id: 'ler', nome: 'Lendo' }, { id: 'cafe', nome: 'No café' }, { id: 'raiox', nome: 'No raio X' },
  { id: 'malabares', nome: 'Malabares' }, { id: 'reflexo', nome: 'Reflexo patelar' }, { id: 'marshmallow', nome: 'Marshmallow' },
  { id: 'estudioso', nome: 'De óculos' }, { id: 'mago', nome: 'De mago' }, { id: 'trofeu', nome: 'Com o troféu' }, { id: 'dormir', nome: 'Cochilando' },
  { id: 'pescar', nome: 'Pescando' }, { id: 'martelar', nome: 'Na forja' }, { id: 'luneta', nome: 'Na luneta' }, { id: 'boneco_neve', nome: 'Boneco de neve' },
]
const POSES_GATO: { id: IdLinhaGato; nome: string }[] = [
  { id: 'sentado', nome: 'Sentado' }, { id: 'dormindo', nome: 'Dormindo' }, { id: 'lendo', nome: 'Lendo' }, { id: 'brincando', nome: 'Com a lã' },
  { id: 'ronronando', nome: 'Ronronando' }, { id: 'observando', nome: 'Observando' }, { id: 'comemorando', nome: 'Comemorando' }, { id: 'tala', nome: 'De tala' },
  { id: 'lambendo', nome: 'Lambendo a pata' }, { id: 'cacando', nome: 'Caçando' }, { id: 'pulando', nome: 'O bote' }, { id: 'derretido', nome: 'Derretido' }, { id: 'assustado', nome: 'Assustado' },
]
const NOMES_CORUJA: Record<(typeof LINHAS_CORUJA)[number], string> = {
  parada: 'Pousada', andando: 'Andando', voando: 'Voando', pousando: 'Pousando', lendo: 'Lendo', dormindo: 'Dormindo', acenando: 'Acenando', olhando: 'Olhando',
}

function lerAlbum(): string[] {
  try { const a = JSON.parse(localStorage.getItem('bichos:album') ?? '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}
/** Uma frase de cada vez, sem repetir a anterior. */
function usarFala(lista: readonly string[]) {
  const [i, definirI] = useState(() => Math.floor(Math.random() * lista.length))
  return [lista[i], () => definirI((x) => (x + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length)] as const
}

function Ficha({ nome, papel, mora, encontrar, fala, outraFala, retrato, poses, pose, definirPose, classe }: {
  nome: string; papel: string; mora: string; encontrar: string; fala: string; outraFala: () => void
  retrato: ReactNode; poses: { id: string; nome: string }[]; pose: string; definirPose: (id: string) => void; classe: string
}) {
  // A luz da lareira da sala vem da esquerda, quente; o lado de costas esfria um pouco.
  const periodo = usarPeriodo()
  const luz = luzNoBicho(60, 120, [{ x: 0, y: 120, forca: 0.85, alcance: 160, tipo: 'fogo' }], periodo)
  return (
    <article className={`bx-ficha bx-ficha--${classe}`}>
      <div className={`bx-palco ${luz.className}`} style={luz.style}>
        <span className="bx-palco__lareira" aria-hidden="true" />
        <div className={`bx-retrato bx-retrato--${classe} bicho-sombra`}>{retrato}</div>
      </div>
      <div className="bx-ficha__texto">
        <p className="bx-ficha__papel">{papel}</p>
        <h2>{nome}</h2>
        <dl className="bx-ficha__dados">
          <div><dt>Mora em</dt><dd>{mora}</dd></div>
          <div><dt>Como encontrar</dt><dd>{encontrar}</dd></div>
        </dl>
        <button type="button" className="bx-fala" onClick={outraFala} aria-live="polite">
          <span>{fala}</span>
          <small><Icone nome="reiniciar" tamanho={13} /> Outra fala</small>
        </button>
        <div className="bx-poses" role="group" aria-label={`Poses: ${nome}`}>
          {poses.map((p) => <button key={p.id} type="button" aria-pressed={pose === p.id} onClick={() => definirPose(p.id)}>{p.nome}</button>)}
        </div>
      </div>
    </article>
  )
}

export function Bichos() {
  const [poseEsq, definirPoseEsq] = useState<IdComportamento>('acenar')
  const [poseGato, definirPoseGato] = useState<IdLinhaGato>('sentado')
  const [poseCoruja, definirPoseCoruja] = useState<EstadoCoruja>('parada')
  const [falaEsq, outraEsq] = usarFala(FALAS_GERAIS)
  const [falaGato, outraGato] = usarFala(FALAS_GATO)
  const [falaCoruja, outraCoruja] = usarFala(CONCEITOS_CORUJA)
  const album = useMemo(lerAlbum, [])
  const vistas = RARIDADES.filter((r) => album.includes(r.id)).length

  return (
    <div className="bx">
      <header className="bx-topo">
        <p className="bx-topo__selo"><Icone nome="medalha" tamanho={13} /> Sala dos bichos</p>
        <h1>O esqueleto, o gato e a coruja</h1>
        <p>Eles moram nas cenas do site e acompanham o seu estudo. Toque numa fala para ouvir outra e troque a pose de cada um.</p>
      </header>

      <section className="bx-fichas" aria-label="Os três bichos">
        <Ficha classe="esqueleto" nome="O esqueleto" papel="O guardião da fogueira" mora="O acampamento da página inicial, ao lado do fogo"
          encontrar="Sempre lá. Toque no fogo para ele sentar e se aquecer."
          fala={falaEsq} outraFala={outraEsq} poses={POSES_ESQUELETO} pose={poseEsq} definirPose={(id) => definirPoseEsq(id as IdComportamento)}
          retrato={<Mascote key={poseEsq} comportamento={poseEsq} falar={false} interativo={false} className="bx-esqueleto" />} />
        <Ficha classe="gato" nome="O gato" papel="O preguiçoso oficial" mora="Todos os cantos quentes: a fogueira, a estufa, o tapete do gabinete"
          encontrar="Toque nele seis vezes seguidas. Ele não gosta, mas aparece de tala."
          fala={falaGato} outraFala={outraGato} poses={POSES_GATO} pose={poseGato} definirPose={(id) => definirPoseGato(id as IdLinhaGato)}
          retrato={<GatoPixel key={poseGato} estado={poseGato} className="bx-gato" />} />
        <Ficha classe="coruja" nome="A coruja" papel="A sábia da biblioteca" mora="Os poleiros: placas, vigas, armários e a cornija da vitrine"
          encontrar="Cada toque, um conceito que cai na prova. A cada quatro, uma dica da página."
          fala={falaCoruja} outraFala={outraCoruja} poses={LINHAS_CORUJA.map((id) => ({ id, nome: NOMES_CORUJA[id] }))} pose={poseCoruja}
          definirPose={(id) => definirPoseCoruja(id as EstadoCoruja)}
          retrato={<CorujaPixel key={poseCoruja} estado={poseCoruja} style={{ '--coruja-escala': 4 } as CSSProperties} />} />
      </section>

      <section className="bx-album" aria-labelledby="bx-album-titulo">
        <header>
          <h2 id="bx-album-titulo">Álbum das raridades</h2>
          <p><b>{vistas}</b> de {RARIDADES.length} vistas. Elas aparecem sozinhas, de vez em quando, na página inicial.</p>
        </header>
        <ul>
          {RARIDADES.map((r) => {
            const visto = album.includes(r.id)
            return (
              <li key={r.id} className={visto ? 'bx-carta bx-carta--vista' : 'bx-carta'}>
                <span className={`bx-carta__arte bx-carta__arte--${r.id}`} aria-hidden="true">
                  {r.de === 'gato' ? <GatoPixel estado="sentado" /> : r.de === 'coruja' ? <CorujaPixel estado="olhando" /> : <Mascote comportamento="raiox" falar={false} interativo={false} />}
                </span>
                <strong>{visto ? r.nome : '???'}</strong>
                <span>{visto ? 'Você viu esta.' : r.pista}</span>
              </li>
            )
          })}
        </ul>
        <a className="botao bx-voltar" href={href('/')}>Voltar ao acampamento</a>
      </section>
    </div>
  )
}
