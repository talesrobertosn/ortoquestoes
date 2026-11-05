# Prompt mestre: andamento (05/11/2026)

Branch local `claude/trusting-hypatia-wztfzk`. **Nada publicado**: a publicação espera o Tales dizer "AUTORIZO PUBLICAR EM PRODUÇÃO".
SQL a rodar: `supabase/migrations/202611050100_metas_e_publico.sql` (idempotente, numa transação). Sem ele, a tela
funciona com o que já existe e avisa onde falta.

| Fase | Situação |
|---|---|
| 1 Metas, projeção, ritmo, comparação, tipos de receita | feito |
| 1.7 Auditoria de pagamentos e decisões | feito |
| 2 Funil completo, coortes por tipo, fora do público, duplicadas, canais | feito (etapas 5, 7, 8 e 10 do funil ainda não medidas) |
| 3.1 Aviso gentil de vencimento do Pix | feito |
| 3.3/3.4 Página de renovação personalizada, experiência de acesso expirado | pendente |
| 4 Central manual de e-mails | pendente (já existem Cartas e Campanhas, sem envio automático) |
| 5.4–5.8 Recursos do aluno | pendente (já existem Revisão, Progresso, Desempenho) |
| 6 Conversão do gratuito | pendente |
| 7 Indicações | pendente (já existe Indicar) |
| 8 Risco de abandono | feito |
| 9 Camadas do painel | parcial (faixas resumidas e "ver mais") |
| 11 Testes | `fixtures/testar_metas.mjs`, `testar_qualidade.mjs`, `testar_risco.mjs`, `testar_admin_secoes.mjs` |
