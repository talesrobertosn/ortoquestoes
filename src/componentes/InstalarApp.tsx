import { useState } from 'react'
import { Icone } from './Icone'
import { usarInstalacao } from '../util/instalacao'
import { usarArmazenado } from '../estado/usarArmazenado'

/** Convite para instalar o OrtoQuestões na tela inicial. Some depois de instalado ou dispensado. */
export function InstalarApp() {
  const { modo, instalar } = usarInstalacao()
  const [dispensado, definirDispensado] = usarArmazenado<boolean>('instalar:dispensado', false)
  const [passos, definirPassos] = useState(false)
  if (!modo || dispensado) return null
  return (
    <section className="instalar-app" aria-label="Instalar o aplicativo">
      <img className="instalar-app__icone" src="./icone-192.png" alt="" width={56} height={56} />
      <div className="instalar-app__texto">
        <h2>Leve o OrtoQuestões na tela inicial</h2>
        {modo === 'ios' && passos ? (
          <ol className="instalar-app__passos">
            <li>Toque em <strong>Compartilhar</strong> <Icone nome="compartilhar" tamanho={16} /> na barra do navegador.</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
            <li>Confirme em <strong>Adicionar</strong>. Pronto: abre como aplicativo, em tela cheia.</li>
          </ol>
        ) : (
          <p>Abre direto nas suas questões, em tela cheia, como um aplicativo. Não ocupa espaço de loja e se atualiza sozinho.</p>
        )}
      </div>
      <div className="instalar-app__acoes">
        {modo === 'convite' && <button className="botao botao--principal" onClick={() => void instalar()}><Icone nome="celular" tamanho={18} /> Instalar app</button>}
        {modo === 'ios' && !passos && <button className="botao botao--principal" onClick={() => definirPassos(true)}><Icone nome="celular" tamanho={18} /> Como instalar</button>}
        <button className="botao botao--fantasma" onClick={() => definirDispensado(true)}>Agora não</button>
      </div>
    </section>
  )
}
