/**
 * Conquistas que já têm arte própria (pixel art, PNG com fundo transparente)
 * em public/emblemas/. As demais continuam com a medalha desenhada em SVG.
 * Para acrescentar uma arte: copiar o arquivo para public/emblemas/<id>.png e
 * incluir o id aqui.
 */
export const EMBLEMAS_COM_IMAGEM: ReadonlySet<string> = new Set<string>([
  'questoes-100',
  'questoes-250',
  'questoes-500',
  'questoes-1000',
  'questoes-3000',
  'fogueira',
  'sequencia-3',
])
