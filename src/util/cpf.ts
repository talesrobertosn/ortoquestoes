/** Mesma conta dos dígitos verificadores de supabase/functions/_shared/pix.ts (cpfValido): o
 *  checkout avisa na hora, embaixo do campo, em vez de mandar ao servidor um CPF que ele recusa. */
export function cpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, '')
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...cpf.slice(0, tamanho)].reduce((s, n, i) => s + Number(n) * (tamanho + 1 - i), 0)
    if ((soma * 10 % 11) % 10 !== Number(cpf[tamanho])) return false
  }
  return true
}
