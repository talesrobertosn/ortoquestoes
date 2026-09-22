/**
 * Identificador aleatório no formato UUID v4. `crypto.randomUUID` não existe
 * em todo navegador (visualizadores embutidos de apps no iPhone, versões
 * antigas), e quando falta a chamada lança erro no meio do fluxo de resposta.
 */
export function gerarId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  try {
    if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  } catch { /* cai para a geração manual */ }
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
