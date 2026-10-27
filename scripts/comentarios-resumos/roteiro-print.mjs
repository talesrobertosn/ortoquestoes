// Roteiro para fotografar uma questão respondida, com o comentário aberto (27/10/2026).
// Uso: node scripts/capturar_telas.mjs /questao/<id> <prefixo> --roteiro scripts/comentarios-resumos/roteiro-print.mjs --pasta <dir>
// Marca a primeira alternativa com "Tenho certeza" e confirma; a página inteira sai em <prefixo>-resp-<cel|pc>.png.
export default async (p, foto) => {
  const alt = p.locator('button').filter({ hasText: 'Alternativa A.' }).first()
  if (await alt.isEnabled()) {
    await alt.click(); await p.waitForTimeout(400)
    await p.locator('button').filter({ hasText: 'Tenho certeza' }).click(); await p.waitForTimeout(300)
    await p.keyboard.press('Enter')
  }
  await p.waitForTimeout(4000)
  await foto('resp', { fullPage: true })
}
