import { chromium } from '/home/user/ortoquestoes/node_modules/playwright/index.mjs';
import fs from 'fs';
const [,, arq, saida] = process.argv;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>${fs.readFileSync(arq,'utf8')}</body></html>`;
fs.writeFileSync(saida + '/pagina.html', html);
const b = await chromium.launch();
for (const [nome, w, h] of [['cel', 390, 740], ['pc', 1280, 800]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => m.type() === 'error' && erros.push(m.text()));
  await p.goto('file://' + saida + '/pagina.html'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${saida}/${nome}-1-estudo.png` });
  await p.click('#aba-batalha'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${saida}/${nome}-2-batalha.png` });
  // seleciona uma alternativa
  await p.click('.slot-mao:nth-child(2) .carta-mao'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${saida}/${nome}-3-selecionada.png` });
  await p.click('.slot-mao:nth-child(2) .carta-mao'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${saida}/${nome}-4-golpe.png` });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${saida}/${nome}-5-verso.png` });
  // joga até derrotar o inimigo acertando sempre
  for (let k = 0; k < 12; k++) {
    if (await p.$('.veu')) break;
    await p.click('#redondo'); await p.waitForTimeout(900);
    if (await p.$('.veu')) break;
    const certa = await p.evaluate(() => { const f = E.atual; return [...document.querySelectorAll('.carta-mao')].findIndex(b => +b.dataset.i === f.certa); });
    await p.keyboard.press(String(certa + 1)); await p.waitForTimeout(1900);
    if (await p.evaluate(() => E.hpInim <= 0)) { await p.screenshot({ path: `${saida}/${nome}-6-vitoria.png` }); await p.click('#redondo'); await p.waitForTimeout(700); break; }
  }
  await p.screenshot({ path: `${saida}/${nome}-7-poder.png` });
  console.log(nome, 'erros:', erros);
  await p.close();
}
await b.close();
