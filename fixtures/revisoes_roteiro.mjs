// Só dados artificiais numa conta falsa local. Nunca altera o progresso de produção.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const indice = JSON.parse(
  readFileSync(
    new URL("../public/acervo/indice.json", import.meta.url),
    "utf8",
  ),
);
const CONTA = "11111111-2222-4333-8444-555555555555",
  prefixo = `ortoquestoes:conta:${CONTA}:`;
export async function antes(p) {
  const itens = indice.questoes
    .filter((q) => !q.an && !q.dup && q.c)
    .slice(0, 600);
  await p.addInitScript(
    ({ itens, prefixo }) => {
      const D = 86400000,
        agora = Date.now(),
        regs = {};
      itens.forEach((q, i) => {
        const h = [],
          tentativas = 2 + (i % 5);
        let corretas = 0,
          erradas = 0;
        for (let j = 0; j < tentativas; j++) {
          const em = agora - (70 - (i % 50) - j * 3) * D;
          const correta = (i + j) % 5 > 1;
          h.push({
            em,
            correta,
            confianca:
              (i + j) % 4 === 0
                ? "duvida"
                : (i + j) % 7 === 0
                  ? "chute"
                  : "seguro",
          });
          if (correta) corretas++;
          else erradas++;
        }
        const u = h[h.length - 1];
        regs[q.id] = {
          c: u.correta,
          q: u.em,
          tentativas,
          acertos: corretas,
          erros: erradas,
          sequencia: u.correta ? 2 : 0,
          confianca: u.confianca,
          proximaRevisao: agora + ((i % 40) - 28) * D,
          historico: h,
        };
      });
      regs["id-antigo-indisponivel"] = {
        c: false,
        q: agora - 60 * D,
        tentativas: 1,
        confianca: "seguro",
        proximaRevisao: agora - 60 * D,
      };
      localStorage.setItem(prefixo + "respondidas", JSON.stringify(regs));
      localStorage.setItem(
        prefixo + "revisao:ritmo",
        JSON.stringify({ limite: 30, folgas: [] }),
      );
    },
    { itens, prefixo },
  );
}
export default async function (p, foto, nome) {
  await p.getByRole("heading", { name: /para hoje/, level: 1 }).waitFor();
  const feitasAntes = Number(
    await p.locator(".rvp-anel text").first().textContent(),
  );
  await foto("inicio");
  await p
    .getByRole("link", { name: "Simular outro ritmo", exact: true })
    .click();
  assert.ok(
    (await p.url()).includes("#/revisao"),
    "atalho interno mantém a rota da página",
  );
  await p.getByRole("button", { name: /Modo leve/ }).click();
  assert.ok(
    (await p.locator(".rvp-mensagem").innerText()).includes(
      `${7 - feitasAntes} questões`,
    ),
  );
  await p.locator("#rvp-titulo").scrollIntoViewIfNeeded();
  await foto("leve");
  await p.getByRole("button", { name: "Fazer meu passo de hoje" }).click();
  await p.locator("dialog[open]").waitFor();
  await foto("previa");
  await p.getByLabel("Tentar lembrar antes das alternativas").check();
  await p.getByRole("button", { name: "Voltar", exact: true }).click();
  await p.locator("#rvp-fila").scrollIntoViewIfNeeded();
  await p
    .getByRole("button", { name: "Histórico", exact: true })
    .first()
    .click();
  await foto("fila");
  await p.locator("#rvp-calendario").scrollIntoViewIfNeeded();
  await foto("calendario");
  await p.getByRole("button", { name: "Mês", exact: true }).click();
  await foto("mes");
  await p.locator("#rvp-analise-titulo").scrollIntoViewIfNeeded();
  await foto("analise");
  await p.locator(".rvp-grafico-principal header").scrollIntoViewIfNeeded();
  await foto("graficos");
  assert.ok((await p.locator(".rvp-graficos svg").count()) >= 3);
  await foto("inteira", { fullPage: true });
  await p.getByRole("button", { name: "Visual compacto", exact: true }).click();
  await p.locator("#rvp-topo").scrollIntoViewIfNeeded();
  await foto("compacto");
  const dims = await p.evaluate(() => ({
    w: document.documentElement.clientWidth,
    s: document.documentElement.scrollWidth,
  }));
  if (dims.s > dims.w + 1)
    console.log(
      "Elementos largos",
      await p.evaluate(() =>
        [...document.querySelectorAll(".rvp *")]
          .filter(
            (e) =>
              !e.closest(".rvp-nav") &&
              e.getBoundingClientRect().right > innerWidth + 1,
          )
          .map((e) => ({
            c: e.className,
            w: e.getBoundingClientRect().width,
            right: e.getBoundingClientRect().right,
          }))
          .slice(0, 25),
      ),
    );
  assert.ok(
    dims.s <= dims.w + 1,
    `Sem rolagem lateral (${nome}): ${JSON.stringify(dims)}`,
  );
  // Ponta a ponta: sessão curta, recuperação ativa, resposta e resultado real, com servidor falso.
  await p.getByRole("button", { name: "Por questões", exact: true }).click();
  await p.getByLabel("Quantidade de questões").fill("1");
  await p
    .getByRole("button", { name: "Ver minha sessão", exact: true })
    .click();
  await p.locator("dialog[open]").waitFor();
  await p.getByLabel("Tentar lembrar antes das alternativas").check();
  await p
    .getByRole("button", { name: "Começar este passo", exact: true })
    .click();
  await p.waitForURL(/#\/sessao/);
  await p
    .getByRole("button", { name: "Mostrar alternativas", exact: true })
    .waitFor();
  assert.equal(
    await p.locator(".alternativas").count(),
    0,
    "opções ficam escondidas até tentar lembrar",
  );
  await foto("sessao-lembrar");
  await p
    .getByRole("button", { name: "Mostrar alternativas", exact: true })
    .click();
  await p.locator(".alternativas > li > button:first-child").first().click();
  await p.getByRole("button", { name: /^Responder [A-E]$/ }).click();
  await p
    .getByRole("button", { name: "Ver meu resultado", exact: true })
    .click();
  await p
    .getByRole("heading", { name: "O que mudou com esta revisão" })
    .waitFor();
  await foto("resultado");
  await p
    .getByRole("link", {
      name: "Voltar à revisão · você pode encerrar por hoje",
    })
    .click();
  await p.getByRole("heading", { name: /para hoje/, level: 1 }).waitFor();
  assert.equal(
    Number(await p.locator(".rvp-anel text").first().textContent()),
    feitasAntes + 1,
  );
  assert.equal(
    (await p.locator(".rvp-anel__total").textContent()).replace(/\s/g, ""),
    "de7",
    "meta pequena não cresce depois de responder",
  );
}
