import { useEffect, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import {
  DIAS_POR_AMIGO, LIMITE_AMIGOS, QUESTOES_PARA_CONFIRMAR, guardarConviteRecebido, linkIndicacao,
  previaConvite, textoIndicacao, usarAmigosIndicados, usarMinhaIndicacao, type AmigoIndicado,
} from '../conta/indicacao'
import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { GatoPixel } from '../componentes/mascote/GatoPixel'
import { Mascote } from '../componentes/mascote/Mascote'
import { BotaoGoogle } from '../componentes/BotaoGoogle'
import { IconeWhatsapp } from '../componentes/ConviteCompartilhar'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import '../estilos/paginas/Indicar.css'

const FALAS_INDICAR: Record<'esqueleto' | 'gato' | 'coruja', readonly string[]> = {
  esqueleto: [
    'Estudar junto rende mais. E esquenta melhor a fogueira.',
    'Cada amigo confirmado vale 7 dias para você e 7 para ele.',
    'Manda no grupo da residência. Alguém sempre precisa de um empurrão.',
    'Eu indicaria, mas meus amigos são todos esqueletos de museu.',
  ],
  gato: [
    'Indiquei a coruja. Ela ainda não respondeu as 20 questões.',
    'Eu mandaria o link, mas o celular está longe. Uns dois metros.',
    'Sete dias de plano completo? Dá para tirar muitos cochilos de estudo.',
    'Chame um amigo. Assim alguém faz as questões por mim.',
  ],
  coruja: [
    'O link é pessoal: é por ele que o site sabe quem convidou quem.',
    'A indicação confirma quando o amigo responde 20 questões.',
    'Os dias entram depois da assinatura paga ativa. Nada se perde.',
    'Vale para até 12 amigos confirmados.',
  ],
}

/** Os três bichos na lareira do topo: cada toque, uma fala sobre indicar. Três toques no gato: o segredo do álbum. */
function Bichos({ comemora }: { comemora: boolean }) {
  const [fala, definirFala] = useState<{ quem: 'esqueleto' | 'gato' | 'coruja'; texto: string } | null>(null)
  const voltas = useRef({ esqueleto: 0, gato: 0, coruja: 0 })
  const toquesGato = useRef<number[]>([])
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 6000); return () => window.clearTimeout(t) }, [fala])
  const falar = (quem: 'esqueleto' | 'gato' | 'coruja') => {
    if (quem === 'gato') {
      const agora = Date.now()
      toquesGato.current = [...toquesGato.current.filter((t) => agora - t < 5000), agora]
      if (toquesGato.current.length >= 3) {
        toquesGato.current = []
        guardarNoAlbum('gato-recrutador')
        definirFala({ quem, texto: 'Está bem, eu indico alguém. Indiquei a almofada. Ela é ótima ouvinte.' })
        return
      }
    }
    const lista = FALAS_INDICAR[quem]
    definirFala({ quem, texto: lista[voltas.current[quem]++ % lista.length] })
  }
  return (
    <div className="ind-palco">
      <span className="ind-palco__lareira" aria-hidden="true" />
      <button type="button" className="ind-bicho ind-bicho--coruja" onClick={() => falar('coruja')} aria-label="Falar com a coruja"><CorujaPixel estado={fala?.quem === 'coruja' ? 'acenando' : 'parada'} /><span className="ind-caixote" aria-hidden="true" /></button>
      <button type="button" className="ind-bicho ind-bicho--esqueleto" onClick={() => falar('esqueleto')} aria-label="Falar com o esqueleto">
        <Mascote comportamento={comemora ? 'comemora2' : 'acenar'} falar={false} interativo={false} />
      </button>
      <button type="button" className="ind-bicho ind-bicho--gato" onClick={() => falar('gato')} aria-label="Falar com o gato"><GatoPixel estado={fala?.quem === 'gato' ? 'acordado' : 'sentado'} /></button>
      {fala && <p className={`ind-balao ind-balao--${fala.quem}`} role="status" onClick={() => definirFala(null)}>{fala.texto}</p>}
    </div>
  )
}

/** As raridades vistas (o álbum da Sala dos bichos, Bichos.tsx): ficam no aparelho. */
function guardarNoAlbum(id: string) {
  try {
    const album: string[] = JSON.parse(localStorage.getItem('bichos:album') ?? '[]')
    if (!album.includes(id)) localStorage.setItem('bichos:album', JSON.stringify([...album, id]))
  } catch { /* sem armazenamento */ }
}

function Regras() {
  return (
    <ol className="ind-passos">
      <li><span className="numero-passo">1</span><div><strong>Mande o seu link</strong><span>No grupo da residência, no WhatsApp de um colega, onde quiser.</span></div></li>
      <li><span className="numero-passo">2</span><div><strong>O colega cria a conta e responde {QUESTOES_PARA_CONFIRMAR} questões</strong><span>Pelo Google leva um toque. As {QUESTOES_PARA_CONFIRMAR} questões mostram que é gente de verdade estudando.</span></div></li>
      <li><span className="numero-passo">3</span><div><strong>Vocês dois ganham {DIAS_POR_AMIGO} dias do plano completo</strong><span>Sem limite de questões, Cronograma e tudo o que os planos liberam. Vale para até {LIMITE_AMIGOS} amigos.</span></div></li>
    </ol>
  )
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')

/** A lista dos amigos que entraram pelo link: confirmados com os dias ganhos, os outros com o caminho até 20 questões. */
function Amigos({ amigos }: { amigos: AmigoIndicado[] }) {
  if (!amigos.length) return (
    <div className="ind-vazio">
      <GatoPixel estado="dormindo" className="ind-vazio__gato" />
      <p><strong>Ninguém entrou pelo seu link ainda.</strong> O gato está guardando o lugar. Que tal mandar no grupo da residência?</p>
    </div>
  )
  return (
    <ul className="ind-amigos">
      {amigos.map((a, i) => {
        const confirmado = !!a.confirmada_em
        return (
          <li key={`${a.entrou_em}-${i}`} className={confirmado ? 'ind-amigo ind-amigo--confirmado' : 'ind-amigo'}>
            <span className="ind-amigo__inicial" aria-hidden="true">{a.nome.charAt(0).toUpperCase()}</span>
            <span className="ind-amigo__texto">
              <strong>{a.nome}</strong>
              <small>{confirmado ? `Confirmou em ${dataCurta(a.confirmada_em!)}` : `Entrou em ${dataCurta(a.entrou_em)} · ${a.respondidas} de ${QUESTOES_PARA_CONFIRMAR} questões`}</small>
              {!confirmado && <span className="ind-amigo__barra" aria-hidden="true"><i style={{ width: `${Math.min(100, (a.respondidas / QUESTOES_PARA_CONFIRMAR) * 100)}%` }} /></span>}
            </span>
            <span className={confirmado ? 'ind-amigo__selo ind-amigo__selo--ok' : 'ind-amigo__selo'}>
              {confirmado ? (a.dias > 0 ? `+${a.dias} dias` : 'Confirmado') : 'A caminho'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** #/indicar: o link pessoal, os botões de envio, o placar e os amigos que entraram. */
export function Indicar() {
  const { sessao } = usarConta()
  const { dados, carregado } = usarMinhaIndicacao(sessao?.user.id)
  const amigos = usarAmigosIndicados(sessao?.user.id)
  const [copiado, definirCopiado] = useState(false)
  const link = dados ? linkIndicacao(dados.codigo) : ''

  async function copiar() {
    try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copie o seu link:', link) }
    definirCopiado(true); window.setTimeout(() => definirCopiado(false), 2500)
  }
  async function compartilhar() {
    if (!dados) return
    try { await navigator.share({ title: 'Orto Questões', text: textoIndicacao(dados.codigo) }) } catch { /* cancelado */ }
  }
  const ativoAte = dados?.cortesia_ate && new Date(dados.cortesia_ate) > new Date() ? new Date(dados.cortesia_ate).toLocaleDateString('pt-BR') : null

  return (
    <div className="ind">
      <section className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Indique e ganhe</p>
          <h1 id="ind-titulo">Chame a turma. Cada amigo vale <em>{DIAS_POR_AMIGO} dias</em> para vocês dois.</h1>
          <p>O Orto Questões cresce no boca a boca. Quem entra pelo seu link e responde {QUESTOES_PARA_CONFIRMAR} questões ganha {DIAS_POR_AMIGO} dias do plano completo, e você também.</p>
        </div>
        <Bichos comemora={(dados?.confirmados ?? 0) > 0} />
      </section>

      {!sessao && <section className="folha ind-folha">
        <h2>Entre para pegar o seu link</h2>
        <p className="texto-2">O link é pessoal: é por ele que o site sabe quem convidou quem.</p>
        <BotaoGoogle separador={false} />
        <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
      </section>}

      {sessao && !carregado && <p className="texto-2" role="status">Preparando o seu link…</p>}
      {sessao && carregado && !dados && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o seu link agora. Recarregue a página em instantes.</p>}

      {dados && <div className="ind-grade">
        <section className="folha ind-folha" aria-labelledby="ind-link-titulo">
          <h2 id="ind-link-titulo">Seu link</h2>
          <div className="ind-link"><code>{link}</code></div>
          <div className="ind-acoes">
            <a className="ind-acoes__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoIndicacao(dados.codigo))}`} target="_blank" rel="noopener noreferrer"><IconeWhatsapp tamanho={18} /> Enviar no WhatsApp</a>
            <button type="button" className="botao" onClick={() => void copiar()}><Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar link'}</button>
            {'share' in navigator && <button type="button" className="botao" onClick={() => void compartilhar()}>Mais opções</button>}
          </div>
          {dados.fui_convidado && !dados.minha_confirmada && <p className="texto-2 ind-nota">Você entrou por convite: ao chegar a {QUESTOES_PARA_CONFIRMAR} questões respondidas, os seus {DIAS_POR_AMIGO} dias são liberados.</p>}
        </section>

        <section className="folha ind-folha" aria-labelledby="ind-placar-titulo">
          <h2 id="ind-placar-titulo">Seu placar</h2>
          <dl className="ind-placar">
            <div><dt>Entraram</dt><dd>{dados.convidados}</dd></div>
            <div><dt>Confirmados</dt><dd>{dados.confirmados}</dd></div>
            <div className="ind-placar__ouro"><dt>Dias ganhos</dt><dd>{dados.dias_ganhos}</dd></div>
          </dl>
          <div className="ind-limite">
            <span className="ind-limite__trilho" aria-hidden="true"><i style={{ width: `${Math.min(100, (dados.confirmados / dados.limite) * 100)}%` }} /></span>
            <small>{dados.confirmados} de {dados.limite} amigos que dão dias</small>
          </div>
          {ativoAte && <p className="ind-ate"><Icone nome="certo" tamanho={14} /> Plano completo liberado até {ativoAte}.</p>}
        </section>
      </div>}

      {dados && amigos && <section className="folha ind-folha" aria-labelledby="ind-amigos-titulo">
        <h2 id="ind-amigos-titulo">Seus amigos</h2>
        <Amigos amigos={amigos} />
      </section>}

      <section className="folha ind-folha" aria-labelledby="ind-como-titulo">
        <h2 id="ind-como-titulo">Como funciona</h2>
        <Regras />
        <p className="meta">Os dias entram depois de uma assinatura paga que esteja ativa, então nada se perde. Contas novas só podem usar um convite, e indicações para si mesmo não contam.</p>
      </section>
    </div>
  )
}

/** #/convite/CODIGO: quem recebeu o link vê quem convidou e cria a conta. */
export function ConviteRecebido({ codigo }: { codigo: string }) {
  const { sessao } = usarConta()
  const [quem, definirQuem] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    guardarConviteRecebido(codigo)
    let ativo = true
    void previaConvite(codigo).then((nome) => { if (ativo) definirQuem(nome) })
    return () => { ativo = false }
  }, [codigo])

  return (
    <div className="ind">
      <section className="ind-topo" aria-labelledby="ind-titulo">
        <div className="ind-topo__texto">
          <p className="ind-topo__selo"><Icone nome="presente" tamanho={13} /> Você recebeu um convite</p>
          <h1 id="ind-titulo">{quem ? <>{quem} te chamou para <em>treinar junto</em></> : quem === null ? 'Convite não encontrado' : <>Um colega te chamou para <em>treinar junto</em></>}</h1>
          <p>{quem === null
            ? 'Este link de convite não existe ou foi digitado errado. Você ainda pode criar sua conta grátis e treinar normalmente.'
            : `Questões das provas oficiais (TEOT, TARO e outras), comentadas alternativa por alternativa. Crie sua conta grátis e responda ${QUESTOES_PARA_CONFIRMAR} questões: vocês dois ganham ${DIAS_POR_AMIGO} dias do plano completo.`}</p>
        </div>
        <Bichos comemora={false} />
      </section>
      {sessao
        ? <section className="folha ind-folha">
            <h2>Você já está na sua conta</h2>
            <p className="texto-2">O convite vale para contas criadas nos últimos 7 dias. Se a sua for nova, ele já foi aplicado: é só treinar.</p>
            <a className="botao botao--principal" href={href('/treinar')}>Começar a treinar</a>
          </section>
        : <section className="folha ind-folha">
            <h2>Crie sua conta grátis</h2>
            <BotaoGoogle separador={false} />
            <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
            <p className="meta">Já tem conta? <a href={href('/conta')}>Entrar</a>. O convite vale para contas criadas a partir dele.</p>
          </section>}
      <section className="folha ind-folha">
        <h2>Como funciona</h2>
        <Regras />
      </section>
    </div>
  )
}
