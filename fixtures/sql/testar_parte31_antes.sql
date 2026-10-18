-- Antes da parte 31 (fixtures/testar_parte31.sh): cartas automáticas duplicadas como as que podem
-- existir em produção, para a limpeza da parte 31 tratar sem perder envio de verdade.
--   d1: a mesma referência enviada e depois falhada  -> a falhada some, a enviada fica;
--   d2: a mesma referência enviada duas vezes        -> as duas ficam, a segunda com a referência marcada;
--   d3: a mesma referência falhada duas vezes        -> fica só a mais antiga.
insert into auth.users (id, email, email_confirmed_at, created_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'd1@teste', now(), now() - interval '40 days'),
  ('00000000-0000-4000-8000-0000000000d2', 'd2@teste', now(), now() - interval '40 days'),
  ('00000000-0000-4000-8000-0000000000d3', 'd3@teste', now(), now() - interval '40 days');
insert into public.emails_enviados (id_usuario, tipo, referencia, modelo, status, enviado_em) values
  ('00000000-0000-4000-8000-0000000000d1', 'carta', 'primeiras_10', 'primeiras_10', 'enviado', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000d1', 'carta', 'primeiras_10', 'primeiras_10', 'falhou',  now() - interval '29 days'),
  ('00000000-0000-4000-8000-0000000000d2', 'carta', 'voltou:2026-09-01', 'voltou', 'enviado', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000d2', 'carta', 'voltou:2026-09-01', 'voltou', 'enviado', now() - interval '29 days'),
  ('00000000-0000-4000-8000-0000000000d3', 'carta', 'cronograma_pronto', 'cronograma_pronto', 'falhou', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000d3', 'carta', 'cronograma_pronto', 'cronograma_pronto', 'falhou', now() - interval '29 days'),
  -- Cartas manuais sem referência (várias por pessoa) não entram no índice.
  ('00000000-0000-4000-8000-0000000000d3', 'carta', null, 'ativo:40-60', 'enviado', now() - interval '28 days'),
  ('00000000-0000-4000-8000-0000000000d3', 'carta', null, 'ativo:40-60', 'enviado', now() - interval '27 days');
