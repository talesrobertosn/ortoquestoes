import { useEffect, useRef, useState } from 'react'
import { Sprite } from './Sprite'

/** Demonstração isolada: não usa acervo, motor, ranking, limites ou progresso. */
export function Tutorial({ aoFechar }: { aoFechar: () => void }) {
  const [etapa, definirEtapa] = useState(0)
  const [aviso, definirAviso] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); definirAviso('') }, [etapa])
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); aoFechar() } }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [aoFechar])
  const responder = (certo: boolean) => certo ? definirEtapa(e => e + 1) : definirAviso('Neste exemplo, escolha “Abrir o verso”. Você pode tentar de novo.')
  return <div className="fc-veu fc-tutorial" role="dialog" aria-modal="true" aria-labelledby="fc-tutorial-titulo">
    <section className="fc-janela fc-tutorial__caixa">
      <div className="fc-tutorial__selo"><Sprite nome="pergaminho" /><span>O Preceptor explica · cerca de 30 segundos</span></div>
      <h2 id="fc-tutorial-titulo" ref={titulo} tabIndex={-1}>{['Vamos fazer uma volta rápida?', 'Primeiro, tente lembrar', 'Depois, confira o verso', 'Como foi para você?', 'Você já sabe o caminho'][etapa]}</h2>
      <ol className="fc-tutorial__passos" aria-label="Etapas do tutorial">{['Lembrar','Conferir','Revisar'].map((p, i) => <li key={p} aria-current={etapa === i + 1 ? 'step' : undefined}>{i+1}. {p}</li>)}</ol>
      {etapa === 0 && <><p>Na Biblioteca, você lembra a resposta, lê a explicação e avalia como foi. Na Batalha, escolhe uma alternativa e confirma o ataque.</p><p className="fc-tutorial__nota">Esta demonstração não conta no estudo nem consome flashcards.</p><button className="fc-botao" onClick={() => definirEtapa(1)}>Experimentar</button></>}
      {etapa === 1 && <><div className="fc-tutorial__cartao"><small>Cartão de demonstração</small><strong>Depois de tentar lembrar, como você confere a resposta?</strong></div><div className="fc-tutorial__opcoes">{['Abrir o verso','Trocar de tema','Encerrar a sessão'].map((p,i) => <button className="fc-botao-pequeno" key={p} onClick={() => responder(i === 0)}>{p}</button>)}</div></>}
      {etapa === 2 && <><div className="fc-tutorial__cartao"><small>Verso do cartão</small><strong>Leia a resposta e a explicação.</strong><p>Uma alternativa certa pode ter sido um palpite. O verso ajuda a entender a ideia e a reconhecer o que precisa rever.</p></div><button className="fc-botao" onClick={() => definirEtapa(3)}>Entendi, continuar</button></>}
      {etapa === 3 && <><p>Se lembrou com segurança, escolha “Sabia”. Se ficou em dúvida, “Hesitei”. Se não lembrou, “Errei”.</p><p>Vamos testar: você lembrou com segurança. O que escolhe?</p><div className="fc-tutorial__opcoes">{['Errei','Hesitei','Sabia'].map(p => <button key={p} className="fc-botao-pequeno" onClick={() => p === 'Sabia' ? definirEtapa(4) : definirAviso('Neste exemplo houve segurança: escolha “Sabia”. No treino real, seja sincero.')}>{p}</button>)}</div></>}
      {etapa === 4 && <><p>Pronto. Na Biblioteca, as três avaliações organizam a revisão. Na Batalha, observe a intenção do inimigo e leia o verso antes de seguir.</p><button className="fc-botao" onClick={aoFechar}>Escolher meu treino</button></>}
      {aviso && <p className="fc-tutorial__aviso" role="status">{aviso}</p>}
      {etapa < 4 && <button className="fc-tutorial__pular" onClick={aoFechar}>{etapa === 0 ? 'Agora não' : 'Pular tutorial'}</button>}
    </section>
  </div>
}
