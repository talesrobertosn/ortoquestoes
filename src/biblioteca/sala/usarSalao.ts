import { CONCEITOS_CORUJA, proximaFala } from '../../componentes/mascote/falasBichos'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DATAS_PROVA } from '../../estado/conquistas'
import type { ResumoCapitulo } from '../tipos'
import {
  CURIOSIDADES_CRANIO, EVENTO_SEGREDO, SEGREDOS, acharSegredo, diasAteProva, epoca, madrugada, palavraMagica, segredosAchados, type IdSegredo,
} from '../salao/segredos'
import { ligarSom, somLigado, tocar } from './sons'
import { semMovimento } from './comum'
import { lerCenario } from '../../estado/aparencia'

/** Hora do dia da cena: a pintura da janela muda (manhã, tarde, noite). */
export type Periodo = 'manha' | 'tarde' | 'noite'
export const periodoDaHora = (h: number): Periodo => (h >= 5 && h < 12 ? 'manha' : h >= 12 && h < 18 ? 'tarde' : 'noite')
const PROXIMO: Record<Periodo, Periodo> = { manha: 'tarde', tarde: 'noite', noite: 'manha' }

export type EstadoGato = 'dormindo' | 'acordando' | 'observando' | 'sentado' | 'espreguicando' | 'tala' | 'olhando_cima'
export type EstadoCorujaCena = 'repouso' | 'piscando' | 'lendo' | 'olhando' | 'reagindo' | 'voando' | 'girando' | 'piando'

/** Dicas da coruja (um toque, uma dica). */
export const DICAS = [
  'Digite o assunto no campo de busca: classificação também vale ("Garden", "Schatzker", "Neer").',
  'Passe o mouse num livro para ver o título inteiro. Um clique abre a ficha; dali, "Ler o resumo".',
  'Na estante, a cor da lombada é a área, a fita é leitura em andamento e o selo dourado é resumo lido até o fim.',
  'A pedrinha na base da lombada diz o quanto o capítulo cai na prova: comum, raro, épico ou lendário.',
  'Prefere uma lista? O botão Lista mostra os mesmos resumos em cartões, com os mesmos filtros.',
  'Leia o resumo do tema antes das questões: você chega sabendo o que a banca procura.',
  'Dizem que este salão guarda segredos. Um livro torto leva à caderneta com as pistas de todos.',
]

/** Hora atual, atualizada a cada 30 segundos (relógio, madrugada, época, luz da janela). */
export function usarAgora() {
  const [agora, definir] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => definir(new Date()), 30000); return () => window.clearInterval(t) }, [])
  return agora
}

/**
 * O estado vivo do salão (31/10/2026): personagens, luzes, segredos, som e avisos. A cena do topo e a estante usam o
 * mesmo estado (a escada e o livro torto moram na estante; a coruja, o gato e o relógio, na cena).
 */
export function usarSalao(capitulos: ResumoCapitulo[], busca: string, abrirFicha: (c: ResumoCapitulo, selo?: string) => void) {
  const agora = usarAgora()
  const [aviso, definirAviso] = useState<{ texto: string; n: number } | null>(null)
  const [chuva, definirChuva] = useState(0)
  const [achados, definirAchados] = useState<IdSegredo[]>(() => segredosAchados())
  const [som, definirSom] = useState(() => somLigado())
  const [passagem, definirPassagem] = useState<'fechada' | 'girando' | 'aberta'>('fechada')
  const [lampadas, definirLampadas] = useState([true, true])
  const [efeitos, definirEfeitos] = useState<Set<IdSegredo>>(new Set())
  const [gato, definirGato] = useState<{ estado: EstadoGato; toques: number }>({ estado: 'dormindo', toques: 0 })
  const [coruja, definirCoruja] = useState<{ estado: EstadoCorujaCena; fala: string | null; tour: boolean }>({ estado: 'repouso', fala: null, tour: false })
  const [escada, definirEscada] = useState(0)
  const [relogioGira, definirRelogioGira] = useState(false)
  const [periodoEscolhido, definirPeriodo] = useState<Periodo | null>(null)
  const [cranio, definirCranio] = useState<number | null>(null)
  const [raroAceso, definirRaroAceso] = useState(false)
  const conceitos = useRef(0)
  const toquesCoruja = useRef<number[]>([])
  const toquesPlaca = useRef<number[]>([])
  const toquesJanela = useRef(0)
  const ultimoToque = useRef<{ quem: 'coruja' | 'gato'; em: number } | null>(null)
  const dica = useRef(-1)
  const relogios = useRef<number[]>([])
  const depois = useCallback((f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }, [])
  useEffect(() => () => relogios.current.forEach((t) => window.clearTimeout(t)), [])

  const avisar = useCallback((texto: string) => { definirAviso((a) => ({ texto, n: (a?.n ?? 0) + 1 })) }, [])
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => definirAviso(null), 6000); return () => window.clearTimeout(t) }, [aviso])
  const achar = useCallback((id: IdSegredo, texto?: string) => {
    if (acharSegredo(id)) {
      tocar('segredo')
      definirChuva((n) => n + 1)
      const s = SEGREDOS.find((x) => x.id === id)!
      avisar(`Segredo encontrado: ${s.nome} (${segredosAchados().length} de ${SEGREDOS.length})${texto ? `. ${texto}` : ''}`)
    } else if (texto) avisar(texto)
  }, [avisar])
  useEffect(() => {
    const atualizar = () => definirAchados(segredosAchados())
    window.addEventListener(EVENTO_SEGREDO, atualizar)
    return () => window.removeEventListener(EVENTO_SEGREDO, atualizar)
  }, [])

  // Hora e data: madrugada, época do ano, véspera de prova e a luz da janela.
  const ehMadrugada = madrugada(agora)
  const estacao = epoca(agora)
  const faltam = diasAteProva(agora, DATAS_PROVA)
  // No tema escuro, a Biblioteca acompanha: a luz é a da noite (01/11/2026), a não ser que a pessoa escolha outra na janela.
  const [temaEscuro, definirTemaEscuro] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.tema === 'escuro')
  useEffect(() => {
    const raiz = document.documentElement
    const olhar = new MutationObserver(() => definirTemaEscuro(raiz.dataset.tema === 'escuro'))
    olhar.observe(raiz, { attributes: true, attributeFilter: ['data-tema'] })
    return () => olhar.disconnect()
  }, [])
  // A escolha de cenário da Conta (manhã, tarde ou noite fixas) vale aqui também; só no "pela hora" o tema escuro pede a noite.
  const cenarioDaConta = lerCenario()
  const periodo = periodoEscolhido ?? (cenarioDaConta !== 'horario' ? cenarioDaConta : temaEscuro ? 'noite' : periodoDaHora(agora.getHours()))
  useEffect(() => { if (ehMadrugada) achar('madrugada', 'Plantão? Os resumos mais curtos estão na mesa.') }, [ehMadrugada]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (estacao) achar('sazonal', estacao === 'halloween' ? 'Abóboras no salão até o fim de outubro.' : 'Pisca-pisca no salão em dezembro.') }, [estacao]) // eslint-disable-line react-hooks/exhaustive-deps

  // Palavras mágicas da busca.
  const magica = palavraMagica(busca)
  useEffect(() => {
    if (!magica) return
    definirEfeitos((e) => new Set(e).add(magica.segredo))
    if (magica.segredo === 'lowell') { definirGato({ estado: 'espreguicando', toques: 0 }); depois(() => definirGato({ estado: 'dormindo', toques: 0 }), 3200) }
    if (magica.segredo === 'gesso') definirGato({ estado: 'tala', toques: 0 })
    achar(magica.segredo, magica.aviso)
  }, [magica?.segredo]) // eslint-disable-line react-hooks/exhaustive-deps

  // "ortoquestoes" digitado em qualquer lugar do salão (fora dos campos de texto).
  useEffect(() => {
    let buffer = ''
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (e.key.length !== 1) return
      buffer = (buffer + e.key.toLowerCase()).slice(-12)
      if (buffer.endsWith('ortoquestoes')) achar('orto', 'A biblioteca agradece a visita, colega.')
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [achar])

  const curtos = useMemo(() => [...capitulos].sort((a, b) => a.minutos - b.minutos).slice(0, 3), [capitulos])

  /** Coruja e gato, um logo depois do outro (6 s): os dois se olham. */
  const amizade = (quem: 'coruja' | 'gato') => {
    const t = Date.now()
    const antes = ultimoToque.current
    ultimoToque.current = { quem, em: t }
    if (antes && antes.quem !== quem && t - antes.em < 6000) {
      ultimoToque.current = null
      definirGato({ estado: 'olhando_cima', toques: 0 })
      definirCoruja({ estado: 'piando', fala: null, tour: false })
      tocar('pio')
      depois(() => { definirGato({ estado: 'dormindo', toques: 0 }); definirCoruja((c) => ({ ...c, estado: 'repouso' })) }, 3600)
      achar('amigos', 'A bibliotecária e o gato dividem o salão desde a primeira edição.')
      return true
    }
    return false
  }

  const acoes = {
    tocarGato: () => {
      if (amizade('gato')) return
      const toques = gato.toques + 1
      if (toques >= 4) {
        tocar('miau')
        definirGato({ estado: 'sentado', toques: 0 })
        const sorteado = capitulos[Math.floor(Math.random() * capitulos.length)]
        depois(() => { definirGato({ estado: 'dormindo', toques: 0 }); abrirFicha(sorteado, 'O gato derrubou este livro da prateleira'); achar('gato') }, semMovimento() ? 0 : 700)
        return
      }
      tocar(toques >= 2 ? 'miau' : 'madeira')
      const estado: EstadoGato = efeitos.has('gesso') ? 'tala' : toques === 1 ? 'acordando' : toques === 2 ? 'observando' : 'sentado'
      definirGato({ estado, toques })
      // Sem mais toques, volta a dormir.
      depois(() => definirGato((g) => (g.toques === toques ? { estado: efeitos.has('gesso') ? 'tala' : 'dormindo', toques: 0 } : g)), 5000)
    },
    tocarCoruja: () => {
      if (amizade('coruja')) return
      const t = Date.now()
      toquesCoruja.current = [...toquesCoruja.current.filter((x) => t - x < 2500), t]
      tocar('pio')
      if (toquesCoruja.current.length >= 5) {
        toquesCoruja.current = []
        definirCoruja({ estado: 'girando', fala: null, tour: false })
        depois(() => definirCoruja((c) => ({ ...c, estado: 'repouso' })), 1600)
        achar('coruja', 'Corujas giram a cabeça até 270 graus. Não tente isso no seu pescoço.')
        return
      }
      // A coruja é a sábia (01/11/2026): os toques explicam um conceito que cai na prova; a cada quatro, uma dica da
      // Biblioteca (com o convite para o tour).
      conceitos.current++
      if (conceitos.current % 4 === 1) {
        dica.current = (dica.current + 1) % DICAS.length
        definirCoruja({ estado: 'reagindo', fala: DICAS[dica.current], tour: true })
      } else definirCoruja({ estado: 'reagindo', fala: proximaFala('coruja', CONCEITOS_CORUJA), tour: false })
      depois(() => definirCoruja((c) => (c.estado === 'reagindo' ? { ...c, estado: 'repouso' } : c)), 900)
    },
    calarCoruja: () => definirCoruja((c) => ({ ...c, fala: null })),
    /** A bibliotecária fala no balão dela (dicas de uso; os segredos vão no recado do pé da tela). */
    falar: (texto: string) => { definirCoruja({ estado: 'piando', fala: texto, tour: false }); depois(() => definirCoruja((c) => (c.fala === texto ? { ...c, fala: null, estado: 'repouso' } : c)), 9000) },
    tocarPlaca: () => {
      const t = Date.now()
      toquesPlaca.current = [...toquesPlaca.current.filter((x) => t - x < 4000), t]
      if (toquesPlaca.current.length >= 7) { toquesPlaca.current = []; achar('orto', 'A biblioteca agradece a visita, colega.') }
    },
    tocarLampada: (i: number) => {
      tocar('vela')
      const novas = lampadas.map((v, j) => (j === i ? !v : v))
      definirLampadas(novas)
      if (novas.every((v) => !v)) achar('lanterna', 'Use a lanterna: ela segue o seu dedo ou o mouse. Toque numa arandela para acender.')
    },
    tocarRelogio: () => {
      tocar('tique')
      definirRelogioGira(true)
      depois(() => definirRelogioGira(false), 1200)
      const curto = curtos[0]
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      achar('relogio', curto ? `São ${hora}. Dá tempo de ler "${curto.titulo}" em ~${curto.minutos} min.` : `São ${hora}. Bom momento para um resumo curto.`)
    },
    tocarJanela: () => {
      toquesJanela.current++
      const proximo = PROXIMO[periodo]
      definirPeriodo(proximo)
      tocar('madeira')
      const nomes: Record<Periodo, string> = { manha: 'Manhã no salão.', tarde: 'Fim de tarde no salão.', noite: 'Noite no salão: o luar entra pela janela.' }
      if (toquesJanela.current >= 3) achar('janela', nomes[proximo])
      else avisar(nomes[proximo])
    },
    tocarRaro: (resumoDoAcervo: string) => {
      definirRaroAceso(true)
      depois(() => definirRaroAceso(false), 1600)
      achar('raro', resumoDoAcervo)
    },
    tocarCranio: () => {
      tocar('madeira')
      const i = cranio === null ? 0 : (cranio + 1) % CURIOSIDADES_CRANIO.length
      definirCranio(i)
      achar('cranio', CURIOSIDADES_CRANIO[i])
    },
    tocarEscada: () => {
      tocar('madeira')
      const n = escada + 1
      definirEscada(n)
      if (n >= 3) {
        const alto = [...capitulos].sort((a, b) => b.minutos - a.minutos)[0]
        depois(() => { definirEscada(0); abrirFicha(alto, 'O livro mais alto da biblioteca'); achar('escada') }, semMovimento() ? 0 : 900)
      }
    },
    abrirPassagem: () => {
      tocar('madeira')
      definirPassagem('girando')
      depois(() => {
        definirPassagem('aberta'); achar('passagem', 'Bem-vindo à Sala dos raros.')
        depois(() => document.getElementById('bb-raros-titulo')?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }), 60)
      }, semMovimento() ? 0 : 650)
    },
    fecharPassagem: () => { tocar('madeira'); definirPassagem('fechada') },
    alternarSom: () => { const novo = !som; ligarSom(novo); definirSom(novo) },
  }

  // A coruja vive sozinha quando ninguém mexe: pisca, olha em volta e lê (só com a cena na tela e sem "menos movimento").
  const [vivo, definirVivo] = useState(true)
  useEffect(() => {
    if (!vivo || semMovimento()) return
    const ciclo: EstadoCorujaCena[] = ['piscando', 'olhando', 'repouso', 'lendo', 'piscando', 'repouso']
    let i = 0
    const t = window.setInterval(() => {
      definirCoruja((c) => (c.estado === 'repouso' || c.estado === 'piscando' || c.estado === 'olhando' || c.estado === 'lendo') && !c.fala
        ? { ...c, estado: ciclo[i++ % ciclo.length] } : c)
    }, 4200)
    return () => window.clearInterval(t)
  }, [vivo])

  return {
    agora, aviso, chuva, achados, som, passagem, lampadas, efeitos, gato, coruja, escada, relogioGira, periodo, cranio, raroAceso,
    ehMadrugada, estacao, faltam, curtos, breu: lampadas.every((v) => !v), achar, avisar, acoes, definirVivo,
  }
}
export type Salao = ReturnType<typeof usarSalao>
