import { Component, type ReactNode } from 'react'

const CHAVE = 'oq-recarregou-versao'

/**
 * Publicar uma versão nova troca o nome dos arquivos de cada página e apaga
 * os antigos. Quem estava com o site aberto tocava num link, o navegador
 * pedia o arquivo com o nome velho, recebia 404 e a tela ficava branca até
 * atualizar. Aqui o site se atualiza sozinho uma vez (e cai na página pedida,
 * que já está no endereço). Se ainda assim falhar, mostra o que fazer.
 */
export function recarregarParaVersaoNova(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) ?? 0)
    // Já tentou há pouco: não entra em laço de recarregar.
    if (Date.now() - ultima < 20_000) return false
    sessionStorage.setItem(CHAVE, String(Date.now()))
  } catch { /* sem sessionStorage, tenta assim mesmo */ }
  window.location.reload()
  return true
}

export function ehFalhaDeCarregamento(erro: unknown): boolean {
  const texto = String((erro as Error)?.message ?? erro)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk/i.test(texto)
}

export class ErroDePagina extends Component<{ children: ReactNode; caminho: string }, { erro: unknown }> {
  state = { erro: null as unknown }

  static getDerivedStateFromError(erro: unknown) { return { erro } }

  componentDidCatch(erro: unknown) {
    if (ehFalhaDeCarregamento(erro)) recarregarParaVersaoNova()
    else console.error(erro)
  }

  componentDidUpdate(anterior: { caminho: string }) {
    // Trocou de página: dá uma nova chance em vez de manter o aviso.
    if (anterior.caminho !== this.props.caminho && this.state.erro) this.setState({ erro: null })
  }

  render() {
    if (!this.state.erro) return this.props.children
    const versao = ehFalhaDeCarregamento(this.state.erro)
    return (
      <div className="estado" role="alert">
        <h1>{versao ? 'O site foi atualizado' : 'Esta página não abriu'}</h1>
        <p>{versao
          ? 'Saiu uma versão nova enquanto o site estava aberto. Atualize para continuar de onde parou; o seu progresso está salvo.'
          : 'Algo deu errado ao montar esta página. Atualizar costuma resolver; o seu progresso está salvo.'}</p>
        <button type="button" className="botao botao--principal" onClick={() => window.location.reload()}>Atualizar agora</button>
      </div>
    )
  }
}
