-- Testes da parte 31 (rodados por fixtures/testar_parte31.sh, depois de colar a parte duas vezes).
-- Cada falha levanta uma exceção com o motivo; no fim sai "parte 31: N conferências ok".
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create table pg_temp.conferencias (n integer);
insert into pg_temp.conferencias values (0);

create function pg_temp.confere(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  update pg_temp.conferencias set n = n + 1;
end $$;

create function pg_temp.hoje() returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Uma pessoa: confirmada (ou não), criada há 40 dias, com o que vier em meta.
create function pg_temp.pessoa(p_rotulo text, p_meta jsonb default '{}'::jsonb, p_confirmado boolean default true)
returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, last_sign_in_at)
  values (v, p_rotulo || '-' || left(v::text, 8) || '@teste', jsonb_build_object('nome', p_rotulo) || p_meta,
          case when p_confirmado then now() - interval '39 days' end, now() - interval '40 days', now() - interval '2 hours');
  return v;
end $$;

-- Respostas: n questões de uma área ("mao-0001"...), a última em p_ultima.
create function pg_temp.responder(p_id uuid, p_area text, p_n integer, p_ultima timestamptz default now()) returns void language sql as $$
  insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao, atualizado_em)
  select p_id, 'respondidas', p_area || '-' || lpad((g + coalesce((select count(*) from public.progresso_usuario x where x.usuario_id = p_id), 0))::text, 4, '0'),
         jsonb_build_object('c', g % 2 = 0, 'q', 1), gen_random_uuid(), p_ultima - (g || ' minutes')::interval
  from generate_series(1, p_n) g;
$$;

create function pg_temp.carta(p_id uuid, p_modelo text, p_horas numeric, p_status text default 'enviado', p_referencia text default null, p_tipo text default 'carta')
returns void language sql as $$
  insert into public.emails_enviados (id_usuario, tipo, modelo, referencia, status, enviado_em)
  values (p_id, p_tipo, p_modelo, p_referencia, p_status, now() - (p_horas || ' hours')::interval);
$$;

-- O que cada campanha precisa para a pessoa entrar (o caso positivo).
create function pg_temp.semear(p_campanha text, p_id uuid) returns void language plpgsql as $$
begin
  case p_campanha
    when 'assinou_sem_cronograma' then
      insert into public.assinaturas (id_usuario, plano, status, criada_em, inicio_periodo, fim_periodo)
      values (p_id, 'mensal', 'ativa', now() - interval '5 days', now() - interval '5 days', now() + interval '25 days');
    when 'assinante_parado_7' then
      insert into public.assinaturas (id_usuario, plano, status, criada_em, inicio_periodo, fim_periodo)
      values (p_id, 'semestral', 'ativa', now() - interval '60 days', now() - interval '60 days', now() + interval '120 days');
      perform pg_temp.responder(p_id, 'joelho', 30, now() - interval '9 days');
    when 'simulado_resultado' then
      insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em, entregue_em, acertos, total, segundos, no_tempo)
      values ('2026-09', p_id, now() - interval '2 days 1 hour', now() - interval '2 days', 30, 50, 3000, true);
    when 'vespera_prova' then
      insert into public.planos_estudo (usuario_id, data_prova, prova) values (p_id, pg_temp.hoje() + 1, 'TEOT');
    when 'depois_prova' then
      insert into public.planos_estudo (usuario_id, data_prova, prova) values (p_id, pg_temp.hoje() - 2, 'TARO');
    when 'aniversario' then
      update auth.users set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('nascimento', '1995-' || to_char(pg_temp.hoje(), 'MM-DD')) where id = p_id;
    when 'um_ano' then
      update auth.users set created_at = ((pg_temp.hoje() - interval '1 year')::date + time '15:00') at time zone 'America/Sao_Paulo' where id = p_id;
      perform pg_temp.responder(p_id, 'mao', 3);
    when 'indicacao_deu_certo' then
      declare v_conv uuid := pg_temp.pessoa('convidado');
      begin
        insert into public.indicacoes (id_convidado, id_padrinho, criado_em, confirmada_em, dias_padrinho, dias_convidado)
        values (v_conv, p_id, now() - interval '10 days', now() - interval '1 day', 7, 7);
      end;
    when 'resumo_do_tema' then
      update auth.users set raw_user_meta_data = raw_user_meta_data || '{"receber_novidades": true}'::jsonb where id = p_id;
      perform pg_temp.responder(p_id, 'mao', 15);
      perform pg_temp.responder(p_id, 'joelho', 5);
  end case;
end $$;

create function pg_temp.candidatos(p_campanha text) returns table (id_usuario uuid, referencia text, dados jsonb) language plpgsql as $$
begin
  return query execute format('select * from public.%I(80)', 'candidatos_' || p_campanha);
end $$;
create function pg_temp.entra(p_campanha text, p_id uuid) returns boolean language sql as $$
  select exists (select 1 from pg_temp.candidatos(p_campanha) c where c.id_usuario = p_id);
$$;
create function pg_temp.referencia(p_campanha text, p_id uuid) returns text language sql as $$
  select c.referencia from pg_temp.candidatos(p_campanha) c where c.id_usuario = p_id limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 0. Limpeza das duplicatas, índice único, permissões
-- ---------------------------------------------------------------------------
do $$
declare d1 uuid := '00000000-0000-4000-8000-0000000000d1'; d2 uuid := '00000000-0000-4000-8000-0000000000d2'; d3 uuid := '00000000-0000-4000-8000-0000000000d3';
begin
  perform pg_temp.confere((select count(*) from public.emails_enviados where id_usuario = d1) = 1, 'd1: a duplicata falhada some');
  perform pg_temp.confere((select status from public.emails_enviados where id_usuario = d1) = 'enviado', 'd1: fica a enviada');
  perform pg_temp.confere((select count(*) from public.emails_enviados where id_usuario = d2) = 2, 'd2: os dois envios de verdade ficam no histórico');
  perform pg_temp.confere((select count(*) from public.emails_enviados where id_usuario = d2 and referencia = 'voltou:2026-09-01') = 1, 'd2: só um com a referência original');
  perform pg_temp.confere((select referencia from public.emails_enviados where id_usuario = d2 order by enviado_em desc limit 1) like 'voltou:2026-09-01#duplicada:%', 'd2: o segundo fica marcado');
  perform pg_temp.confere((select count(*) from public.emails_enviados where id_usuario = d3 and referencia = 'cronograma_pronto') = 1, 'd3: das falhadas, fica uma');
  perform pg_temp.confere((select enviado_em from public.emails_enviados where id_usuario = d3 and referencia = 'cronograma_pronto') < now() - interval '29 days 12 hours', 'd3: fica a mais antiga');
  perform pg_temp.confere((select count(*) from public.emails_enviados where id_usuario = d3 and referencia is null) = 2, 'd3: cartas sem referência intactas');
  perform pg_temp.confere(exists (select 1 from pg_indexes where indexname = 'emails_enviados_carta_unica'), 'índice único criado');

  -- O índice barra a segunda carta com a mesma referência (qualquer status), e só ela.
  begin
    perform pg_temp.carta(d1, 'primeiras_10', 1, 'enviando', 'primeiras_10');
    perform pg_temp.confere(false, 'índice deixou duplicar');
  exception when unique_violation then perform pg_temp.confere(true, 'índice barra duplicata');
  end;
  perform pg_temp.carta(d1, null, 1, 'enviado', 'primeiras_10', 'parabens');
  perform pg_temp.carta(d1, 'ativo:40-60', 1, 'enviado', null);
  perform pg_temp.carta(d1, 'ativo:40-60', 1, 'enviado', null);
  perform pg_temp.confere(true, 'outro tipo e referência nula passam');
  delete from public.emails_enviados where id_usuario = d1 and (tipo = 'parabens' or referencia is null);
end $$;

do $$
declare f text;
begin
  foreach f in array array['candidatos_assinou_sem_cronograma', 'candidatos_assinante_parado_7', 'candidatos_simulado_resultado',
                           'candidatos_vespera_prova', 'candidatos_depois_prova', 'candidatos_aniversario', 'candidatos_um_ano',
                           'candidatos_indicacao_deu_certo', 'candidatos_resumo_do_tema'] loop
    perform pg_temp.confere(not has_function_privilege('anon', format('public.%I(integer)', f), 'execute'), f || ': anon não executa');
    perform pg_temp.confere(not has_function_privilege('authenticated', format('public.%I(integer)', f), 'execute'), f || ': authenticated não executa');
    perform pg_temp.confere(has_function_privilege('service_role', format('public.%I(integer)', f), 'execute'), f || ': service_role executa');
    perform pg_temp.confere((select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p where p.oid = format('public.%I(integer)', f)::regprocedure), f || ': security definer, search_path vazio');
  end loop;
  foreach f in array array['public.cadencia_livre_interno(uuid)', 'public.campanha_elegivel_interno(uuid, text)', 'public.email_transacional_interno(text, text)', 'public.dados_cartas_interno(uuid[])'] loop
    perform pg_temp.confere(not has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'), f || ': interna');
  end loop;
  perform pg_temp.confere(has_function_privilege('service_role', 'public.registrar_catalogo_biblioteca(jsonb)', 'execute')
                          and not has_function_privilege('authenticated', 'public.registrar_catalogo_biblioteca(jsonb)', 'execute'), 'catálogo: só service_role');
  perform pg_temp.confere(has_function_privilege('service_role', 'public.dados_carta_envio(uuid, text)', 'execute')
                          and not has_function_privilege('authenticated', 'public.dados_carta_envio(uuid, text)', 'execute'), 'dados_carta_envio: grant preservado');
  perform pg_temp.confere(has_function_privilege('authenticated', 'public.perfil_carta_admin(uuid)', 'execute'), 'perfil_carta_admin: grant preservado');
  perform pg_temp.confere(not has_table_privilege('authenticated', 'public.biblioteca_catalogo', 'select'), 'catálogo fechado para authenticated');
end $$;

-- ---------------------------------------------------------------------------
-- 1. Catálogo da Biblioteca: a primeira leitura não conta como novidade
-- ---------------------------------------------------------------------------
do $$
declare n integer;
begin
  n := public.registrar_catalogo_biblioteca('[{"id":"rockwood10-44-carpo","titulo":"Fraturas do carpo","especialidade":"mao"},{"id":"rockwood10-65-tornozelo","titulo":"Tornozelo","especialidade":"trauma"},{"id":"ID INVALIDO","titulo":"x"}]'::jsonb);
  perform pg_temp.confere(n = 0, 'primeira leitura: nada é novo');
  perform pg_temp.confere((select count(*) from public.biblioteca_catalogo) = 2, 'catálogo: id inválido fica de fora');
  perform pg_temp.confere((select count(*) from public.biblioteca_catalogo where publicado_em is null) = 2, 'primeira leitura sem data');
  n := public.registrar_catalogo_biblioteca('[{"id":"rockwood10-44-carpo","titulo":"Fraturas do carpo e do punho","especialidade":"mao"},{"id":"rockwood10-45-fraturas-mao","titulo":"Fraturas da mão","especialidade":"mao"}]'::jsonb);
  perform pg_temp.confere(n = 1, 'segunda leitura: um resumo novo');
  perform pg_temp.confere((select publicado_em > now() - interval '1 minute' from public.biblioteca_catalogo where id_capitulo = 'rockwood10-45-fraturas-mao'), 'novo entra com a data de hoje');
  perform pg_temp.confere((select titulo from public.biblioteca_catalogo where id_capitulo = 'rockwood10-44-carpo') = 'Fraturas do carpo e do punho', 'título atualizado');
  perform pg_temp.confere((select publicado_em is null from public.biblioteca_catalogo where id_capitulo = 'rockwood10-44-carpo'), 'o antigo continua sem data');
  begin
    perform public.registrar_catalogo_biblioteca('{"id":"x"}'::jsonb);
    perform pg_temp.confere(false, 'catálogo aceitou objeto');
  exception when invalid_parameter_value then perform pg_temp.confere(true, 'catálogo recusa o que não é lista');
  end;
end $$;

-- Edições do simulado: uma fechada ontem e uma fechada há 20 dias.
insert into public.simulado_edicoes (edicao, titulo, abre_em, fecha_em, duracao_min) values
  ('2026-09', 'Simulado Nacional de setembro', now() - interval '10 days', now() - interval '1 day', 120),
  ('2026-07', 'Simulado Nacional de julho', now() - interval '40 days', now() - interval '20 days', 120);

-- ---------------------------------------------------------------------------
-- 2. As travas comuns, em todas as campanhas
-- ---------------------------------------------------------------------------
do $$
declare
  c text; ok uuid; nc uuid; adm uuid; opt uuid; tudo uuid; cad uuid; cad3 uuid; trans uuid; ja uuid; falha uuid; ref text;
begin
  foreach c in array array['assinou_sem_cronograma', 'assinante_parado_7', 'simulado_resultado', 'vespera_prova', 'depois_prova',
                           'aniversario', 'um_ano', 'indicacao_deu_certo', 'resumo_do_tema'] loop
    ok := pg_temp.pessoa('ok'); perform pg_temp.semear(c, ok);
    nc := pg_temp.pessoa('naoconfirmado', '{}', false); perform pg_temp.semear(c, nc);
    adm := pg_temp.pessoa('admin'); perform pg_temp.semear(c, adm); insert into public.administradores (id_usuario) values (adm);
    opt := pg_temp.pessoa('semcartas'); perform pg_temp.semear(c, opt);
    insert into public.preferencias_email (id_usuario, cartas) values (opt, false);
    tudo := pg_temp.pessoa('tudodesligado'); perform pg_temp.semear(c, tudo);
    insert into public.preferencias_email (id_usuario, conquistas, relatorio_mensal, lembretes, cartas) values (tudo, false, false, false, false);
    cad := pg_temp.pessoa('cadencia48'); perform pg_temp.semear(c, cad); perform pg_temp.carta(cad, 'ativo:40-60', 20);
    cad3 := pg_temp.pessoa('cadencia14'); perform pg_temp.semear(c, cad3);
    perform pg_temp.carta(cad3, 'convite_20', 24 * 3); perform pg_temp.carta(cad3, null, 24 * 6, 'enviado', 'nunca:1', 'lembrete'); perform pg_temp.carta(cad3, null, 24 * 10, 'enviado', '2026-09-q2', 'relatorio');
    trans := pg_temp.pessoa('transacional'); perform pg_temp.semear(c, trans);
    perform pg_temp.carta(trans, 'pagamento_aprovado', 5, 'enviado', 'pagamento_aprovado:1'); perform pg_temp.carta(trans, null, 6, 'enviado', 'relato:9', 'relato_resolvido');
    perform pg_temp.carta(trans, 'obrigado_tempo', 7, 'enviado', 'obrigado_tempo:1'); perform pg_temp.carta(trans, 'pix_hoje', 8, 'enviado', 'pixhoje:1', 'lembrete');
    perform pg_temp.carta(trans, 'ativo:40-60', 20, 'falhou');
    ja := pg_temp.pessoa('jarecebeu'); perform pg_temp.semear(c, ja);
    ref := pg_temp.referencia(c, ja);
    perform pg_temp.confere(ref is not null and (ref = c or ref like c || ':%'), c || ': referência com o tipo (' || coalesce(ref, 'nula') || ')');
    -- A referência é a que a função enviar-email grava: "tipo" ou "tipo:sufixo" com o sufixo aceito por ela.
    perform pg_temp.confere(ref = c or substr(ref, length(c) + 2) ~ '^[a-zA-Z0-9_:.-]{1,60}$', c || ': sufixo aceito pela função');
    perform pg_temp.carta(ja, c, 24 * 20, 'enviado', ref);
    falha := pg_temp.pessoa('falhou'); perform pg_temp.semear(c, falha);
    perform pg_temp.carta(falha, c, 24 * 20, 'falhou', pg_temp.referencia(c, falha));

    perform pg_temp.confere(pg_temp.entra(c, ok), c || ': o caso positivo entra');
    perform pg_temp.confere(not pg_temp.entra(c, nc), c || ': e-mail não confirmado fica de fora');
    perform pg_temp.confere(not pg_temp.entra(c, adm), c || ': administrador fica de fora');
    perform pg_temp.confere(not pg_temp.entra(c, opt), c || ': quem desligou as cartas fica de fora');
    perform pg_temp.confere(not pg_temp.entra(c, tudo), c || ': quem desligou tudo fica de fora');
    perform pg_temp.confere(not pg_temp.entra(c, cad), c || ': e-mail há menos de 48 h fica de fora');
    perform pg_temp.confere(not pg_temp.entra(c, cad3), c || ': 3 e-mails em 14 dias fica de fora');
    perform pg_temp.confere(pg_temp.entra(c, trans), c || ': transacionais e falhas não contam na cadência');
    perform pg_temp.confere(not pg_temp.entra(c, ja), c || ': quem já recebeu a mesma referência fica de fora');
    perform pg_temp.confere(pg_temp.entra(c, falha), c || ': envio que falhou é tentado de novo');
    perform pg_temp.confere((select count(*) from pg_temp.candidatos(c) x where x.id_usuario = ok) = 1, c || ': uma linha por pessoa');
    perform pg_temp.confere(not exists (select 1 from pg_temp.candidatos(c) x where x.dados is null or jsonb_typeof(x.dados) <> 'object'), c || ': dados é objeto');
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. O que é próprio de cada campanha (casos negativos e dados)
-- ---------------------------------------------------------------------------
do $$
declare a uuid; b uuid; x uuid; d jsonb; conv uuid;
begin
  -- Assinou e não montou o cronograma.
  a := pg_temp.pessoa('comcronograma'); perform pg_temp.semear('assinou_sem_cronograma', a);
  insert into public.planos_estudo (usuario_id, data_prova, prova) values (a, pg_temp.hoje() + 90, 'TEOT');
  perform pg_temp.confere(not pg_temp.entra('assinou_sem_cronograma', a), 'assinou: com cronograma fica de fora');
  b := pg_temp.pessoa('assinouontem');
  insert into public.assinaturas (id_usuario, plano, status, criada_em, fim_periodo) values (b, 'mensal', 'ativa', now() - interval '1 day', now() + interval '29 days');
  perform pg_temp.confere(not pg_temp.entra('assinou_sem_cronograma', b), 'assinou: há menos de 3 dias fica de fora');
  x := pg_temp.pessoa('assinouhamuito');
  insert into public.assinaturas (id_usuario, plano, status, criada_em, fim_periodo) values (x, 'anual', 'ativa', now() - interval '200 days', now() + interval '165 days');
  perform pg_temp.confere(not pg_temp.entra('assinou_sem_cronograma', x), 'assinou: assinatura antiga fica de fora');
  x := pg_temp.pessoa('vencida');
  insert into public.assinaturas (id_usuario, plano, status, criada_em, fim_periodo) values (x, 'mensal', 'vencida', now() - interval '6 days', now() - interval '1 day');
  perform pg_temp.confere(not pg_temp.entra('assinou_sem_cronograma', x), 'assinou: sem assinatura vigente fica de fora');

  -- Assinante parado há 7 dias.
  a := pg_temp.pessoa('parado3');
  insert into public.assinaturas (id_usuario, plano, status, criada_em, fim_periodo) values (a, 'mensal', 'ativa', now() - interval '40 days', now() + interval '20 days');
  perform pg_temp.responder(a, 'mao', 20, now() - interval '3 days');
  perform pg_temp.confere(not pg_temp.entra('assinante_parado_7', a), 'parado: 3 dias fica de fora');
  b := pg_temp.pessoa('naoassina'); perform pg_temp.responder(b, 'mao', 20, now() - interval '9 days');
  perform pg_temp.confere(not pg_temp.entra('assinante_parado_7', b), 'parado: quem não assina fica de fora');
  x := pg_temp.pessoa('cortesia'); perform pg_temp.responder(x, 'mao', 20, now() - interval '9 days');
  insert into public.acessos_cortesia (id_usuario, ate, motivo) values (x, now() + interval '5 days', 'teste');
  perform pg_temp.confere(not pg_temp.entra('assinante_parado_7', x), 'parado: cortesia não é assinatura paga');
  x := pg_temp.pessoa('parado40'); perform pg_temp.semear('assinante_parado_7', x);
  update public.progresso_usuario set atualizado_em = now() - interval '40 days' where usuario_id = x;
  perform pg_temp.confere(not pg_temp.entra('assinante_parado_7', x), 'parado: ausência longa (mais de 20 dias) fica de fora');
  x := pg_temp.pessoa('parado9'); perform pg_temp.semear('assinante_parado_7', x);
  select dados into d from pg_temp.candidatos('assinante_parado_7') c where c.id_usuario = x;
  perform pg_temp.confere((d->>'dias_fora')::int = 9, 'parado: dias_fora');
  perform pg_temp.confere(pg_temp.referencia('assinante_parado_7', x) = 'assinante_parado_7:' || to_char(((now() - interval '9 days') at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'parado: referência pelo dia da última resposta');

  -- Resultado do simulado.
  a := pg_temp.pessoa('naoentregou');
  insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em) values ('2026-09', a, now() - interval '3 days');
  perform pg_temp.confere(not pg_temp.entra('simulado_resultado', a), 'simulado: quem não entregou fica de fora');
  b := pg_temp.pessoa('edicaoantiga');
  insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em, entregue_em, acertos, total, segundos, no_tempo)
  values ('2026-07', b, now() - interval '30 days', now() - interval '30 days', 40, 50, 3000, true);
  perform pg_temp.confere(not pg_temp.entra('simulado_resultado', b), 'simulado: edição fechada há mais de 3 dias fica de fora');
  x := pg_temp.pessoa('assinantesimulado');
  insert into public.assinaturas (id_usuario, plano, status, criada_em, fim_periodo) values (x, 'anual', 'ativa', now() - interval '100 days', now() + interval '265 days');
  insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em, entregue_em, acertos, total, segundos, no_tempo)
  values ('2026-09', x, now() - interval '3 days', now() - interval '3 days', 49, 50, 100, true);
  select dados into d from pg_temp.candidatos('simulado_resultado') c where c.id_usuario = x;
  perform pg_temp.confere((d->>'posicao')::int = 1 and (d->>'acertos')::int = 49 and (d->>'total')::int = 50, 'simulado: assinante vê a posição (' || d::text || ')');
  perform pg_temp.confere(pg_temp.referencia('simulado_resultado', x) = 'simulado_resultado:2026-09', 'simulado: referência por edição');
  select dados into d from pg_temp.candidatos('simulado_resultado') c where c.id_usuario <> x limit 1;
  perform pg_temp.confere(d ? 'posicao' and d->'posicao' = 'null'::jsonb, 'simulado: sem plano, sem posição');

  -- Véspera e depois da prova.
  a := pg_temp.pessoa('provadepoisdeamanha'); insert into public.planos_estudo (usuario_id, data_prova) values (a, pg_temp.hoje() + 2);
  perform pg_temp.confere(not pg_temp.entra('vespera_prova', a), 'véspera: prova depois de amanhã fica de fora');
  perform pg_temp.confere(not pg_temp.entra('depois_prova', a), 'depois: prova no futuro fica de fora');
  b := pg_temp.pessoa('provahoje'); insert into public.planos_estudo (usuario_id, data_prova) values (b, pg_temp.hoje());
  perform pg_temp.confere(not pg_temp.entra('vespera_prova', b) and not pg_temp.entra('depois_prova', b), 'prova hoje: nem véspera nem depois');
  x := pg_temp.pessoa('provahaquatro'); insert into public.planos_estudo (usuario_id, data_prova) values (x, pg_temp.hoje() - 4);
  perform pg_temp.confere(not pg_temp.entra('depois_prova', x), 'depois: 4 dias depois fica de fora');
  x := pg_temp.pessoa('provaontem'); insert into public.planos_estudo (usuario_id, data_prova, prova) values (x, pg_temp.hoje() - 1, 'TEOT');
  select dados into d from pg_temp.candidatos('depois_prova') c where c.id_usuario = x;
  perform pg_temp.confere((d->>'dias_depois')::int = 1 and d->>'prova' = 'TEOT', 'depois: dados da prova');
  perform pg_temp.confere(pg_temp.referencia('depois_prova', x) = 'depois_prova:' || to_char(pg_temp.hoje() - 1, 'YYYY-MM-DD'), 'depois: referência pela data');

  -- Aniversário.
  a := pg_temp.pessoa('anivamanha', jsonb_build_object('nascimento', '1990-' || to_char(pg_temp.hoje() + 1, 'MM-DD')));
  perform pg_temp.confere(not pg_temp.entra('aniversario', a), 'aniversário: amanhã fica de fora');
  b := pg_temp.pessoa('nascimentolixo', '{"nascimento": "15/10/1990"}');
  perform pg_temp.confere(not pg_temp.entra('aniversario', b), 'aniversário: data fora do formato fica de fora');
  x := pg_temp.pessoa('semnascimento');
  perform pg_temp.confere(not pg_temp.entra('aniversario', x), 'aniversário: sem data fica de fora');
  perform pg_temp.confere((select count(*) from pg_temp.candidatos('aniversario') c where c.referencia = 'aniversario:' || extract(year from pg_temp.hoje())::int) >= 3, 'aniversário: referência pelo ano');

  -- Um ano.
  a := pg_temp.pessoa('contanova'); perform pg_temp.responder(a, 'mao', 3);
  update auth.users set created_at = ((pg_temp.hoje())::date + time '00:30') at time zone 'America/Sao_Paulo' where id = a;
  perform pg_temp.confere(not pg_temp.entra('um_ano', a), 'um ano: conta de hoje (zero anos) fica de fora');
  b := pg_temp.pessoa('umanosemquestao');
  update auth.users set created_at = ((pg_temp.hoje() - interval '1 year')::date + time '10:00') at time zone 'America/Sao_Paulo' where id = b;
  perform pg_temp.confere(not pg_temp.entra('um_ano', b), 'um ano: sem nenhuma questão fica de fora');
  x := pg_temp.pessoa('doisanos'); perform pg_temp.responder(x, 'mao', 3);
  update auth.users set created_at = ((pg_temp.hoje() - interval '2 years')::date + time '23:30') at time zone 'America/Sao_Paulo' where id = x;
  select dados into d from pg_temp.candidatos('um_ano') c where c.id_usuario = x;
  perform pg_temp.confere((d->>'anos')::int = 2, 'um ano: dois anos (' || coalesce(d::text, 'fora') || ')');
  perform pg_temp.confere(pg_temp.referencia('um_ano', x) = 'um_ano:2', 'um ano: referência pelos anos');
  x := pg_temp.pessoa('umanoemenos1dia'); perform pg_temp.responder(x, 'mao', 3);
  update auth.users set created_at = ((pg_temp.hoje() - interval '1 year' + interval '1 day')::date + time '10:00') at time zone 'America/Sao_Paulo' where id = x;
  perform pg_temp.confere(not pg_temp.entra('um_ano', x), 'um ano: falta um dia fica de fora');

  -- Indicação.
  a := pg_temp.pessoa('padrinhopendente'); conv := pg_temp.pessoa('convidado19');
  insert into public.indicacoes (id_convidado, id_padrinho, criado_em) values (conv, a, now() - interval '5 days');
  perform pg_temp.responder(conv, 'mao', 19);
  perform pg_temp.confere(not pg_temp.entra('indicacao_deu_certo', a), 'indicação: 19 questões fica de fora');
  perform pg_temp.responder(conv, 'mao', 1);
  select dados into d from pg_temp.candidatos('indicacao_deu_certo') c where c.id_usuario = a;
  perform pg_temp.confere(d is not null and (d->>'confirmada')::boolean = false and (d->>'cortesia')::boolean, 'indicação: 20 questões, ainda não confirmada, com cortesia');
  perform pg_temp.confere(pg_temp.referencia('indicacao_deu_certo', a) = 'indicacao_deu_certo:' || conv::text, 'indicação: referência pelo amigo');
  perform pg_temp.confere(not pg_temp.entra('indicacao_deu_certo', conv), 'indicação: o convidado não recebe');
  b := pg_temp.pessoa('padrinhoantigo'); conv := pg_temp.pessoa('convidadoantigo');
  insert into public.indicacoes (id_convidado, id_padrinho, criado_em, confirmada_em, dias_padrinho) values (conv, b, now() - interval '60 days', now() - interval '40 days', 7);
  perform pg_temp.confere(not pg_temp.entra('indicacao_deu_certo', b), 'indicação: confirmada há mais de 14 dias fica de fora');
  x := pg_temp.pessoa('padrinhocheio'); conv := pg_temp.pessoa('convidado13');
  insert into public.indicacoes (id_convidado, id_padrinho, criado_em, confirmada_em, dias_padrinho) values (conv, x, now() - interval '3 days', now() - interval '1 day', 0);
  select dados into d from pg_temp.candidatos('indicacao_deu_certo') c where c.id_usuario = x;
  perform pg_temp.confere(d is not null and (d->>'cortesia')::boolean = false, 'indicação: depois de 12 amigos, sem cortesia');

  -- Resumo do tema.
  a := pg_temp.pessoa('semnovidades'); perform pg_temp.responder(a, 'mao', 15);
  perform pg_temp.confere(not pg_temp.entra('resumo_do_tema', a), 'resumo: sem aceite de novidades fica de fora');
  b := pg_temp.pessoa('estudamaisjoelho', '{"receber_novidades": true}'); perform pg_temp.responder(b, 'mao', 12); perform pg_temp.responder(b, 'joelho', 30);
  perform pg_temp.confere(not pg_temp.entra('resumo_do_tema', b), 'resumo: área do resumo que não é a mais estudada fica de fora');
  x := pg_temp.pessoa('poucamao', '{"receber_novidades": "true"}'); perform pg_temp.responder(x, 'mao', 9);
  perform pg_temp.confere(not pg_temp.entra('resumo_do_tema', x), 'resumo: menos de 10 questões na área fica de fora');
  x := pg_temp.pessoa('jaleu', '{"receber_novidades": true}'); perform pg_temp.responder(x, 'mao', 15);
  insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao) values (x, 'biblioteca', 'l.rockwood10-45-fraturas-mao', '{"tipo":"leitura","capitulo":"rockwood10-45-fraturas-mao","progresso":10}', gen_random_uuid());
  perform pg_temp.confere(not pg_temp.entra('resumo_do_tema', x), 'resumo: quem já abriu o resumo fica de fora');
  x := pg_temp.pessoa('maoresumo', '{"receber_novidades": true}'); perform pg_temp.responder(x, 'mao', 15);
  select dados into d from pg_temp.candidatos('resumo_do_tema') c where c.id_usuario = x;
  perform pg_temp.confere(d->>'id' = 'rockwood10-45-fraturas-mao' and d->>'titulo' = 'Fraturas da mão' and d->>'especialidade' = 'mao', 'resumo: o resumo novo da área (' || coalesce(d::text, 'fora') || ')');
  perform pg_temp.confere(pg_temp.referencia('resumo_do_tema', x) = 'resumo_do_tema:' || to_char(pg_temp.hoje(), 'IYYY-"s"IW'), 'resumo: referência pela semana');
  -- O resumo antigo (sem data, da primeira leitura) nunca é novidade.
  update public.biblioteca_catalogo set publicado_em = now() - interval '8 days' where id_capitulo = 'rockwood10-45-fraturas-mao';
  perform pg_temp.confere(not exists (select 1 from pg_temp.candidatos('resumo_do_tema')), 'resumo: publicado há mais de 7 dias não conta');
  update public.biblioteca_catalogo set publicado_em = now() - interval '1 day' where id_capitulo = 'rockwood10-45-fraturas-mao';
end $$;

-- ---------------------------------------------------------------------------
-- 4. Os dados novos que o motor recebe e a cadência de dados_carta_envio
-- ---------------------------------------------------------------------------
do $$
declare a uuid; d jsonb; e jsonb;
begin
  a := pg_temp.pessoa('dadosnovos', '{"cidade": " Campinas ", "nascimento": "1994-03-21", "sobrenome": "Silva"}');
  insert into public.planos_estudo (usuario_id, data_prova, prova) values (a, pg_temp.hoje() + 87, 'TEOT');
  insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao) values
    (a, 'biblioteca', 'l.rockwood10-45-fraturas-mao', '{"tipo":"leitura","capitulo":"rockwood10-45-fraturas-mao","progresso":100,"concluidoEm":1760000000000,"em":1760000000000}', gen_random_uuid()),
    (a, 'biblioteca', 'l.rockwood10-44-carpo', '{"tipo":"leitura","capitulo":"rockwood10-44-carpo","progresso":96,"em":1760500000000}', gen_random_uuid()),
    (a, 'biblioteca', 'l.rockwood10-65-tornozelo', '{"tipo":"leitura","capitulo":"rockwood10-65-tornozelo","progresso":40,"em":1760600000000}', gen_random_uuid()),
    (a, 'biblioteca', 'l.capitulo-fora-do-catalogo', '{"tipo":"leitura","capitulo":"capitulo-fora-do-catalogo","concluidoEm":1,"em":1}', gen_random_uuid()),
    (a, 'biblioteca', 'pref', '{"tipo":"pref","tema":"claro"}', gen_random_uuid());
  select dados into d from public.dados_cartas_interno(array[a]);
  perform pg_temp.confere(d->>'cidade' = 'Campinas', 'dados: cidade');
  perform pg_temp.confere(d->>'nascimento' = '1994-03-21', 'dados: nascimento');
  perform pg_temp.confere(d->>'ultimo_login' is not null, 'dados: último login');
  perform pg_temp.confere((d->>'dias_para_prova')::int = 87 and d->>'prova_cronograma' = 'TEOT' and (d->>'data_prova')::date = pg_temp.hoje() + 87, 'dados: cronograma (' || d::text || ')');
  perform pg_temp.confere((d->>'resumos_lidos')::int = 3, 'dados: resumos lidos (concluídos ou 95%+): ' || (d->>'resumos_lidos'));
  perform pg_temp.confere(d->'resumos_titulos' = '["Fraturas do carpo e do punho", "Fraturas da mão"]'::jsonb, 'dados: títulos, o mais recente primeiro: ' || (d->'resumos_titulos')::text);
  perform pg_temp.confere(d->>'nome' = 'dadosnovos Silva' and d ? 'emails' and d ? 'areas' and d ? 'horas', 'dados: as chaves antigas continuam');
  perform pg_temp.confere((select public.dados_carta_usuario(a)) ? 'dias_para_prova', 'dados_carta_usuario traz os campos novos');
  -- Prova que já passou: nada de dias negativos.
  update public.planos_estudo set data_prova = pg_temp.hoje() - 2 where usuario_id = a;
  select dados into d from public.dados_cartas_interno(array[a]);
  perform pg_temp.confere(d->'dias_para_prova' = 'null'::jsonb and d->>'data_prova' is not null, 'dados: prova passada sem dias para a prova');
  -- Sem cadastro: as chaves vêm nulas ou zeradas.
  a := pg_temp.pessoa('vazio', '{"nascimento": "ontem"}');
  select dados into d from public.dados_cartas_interno(array[a]);
  perform pg_temp.confere(d->'cidade' = 'null'::jsonb and d->'nascimento' = 'null'::jsonb and (d->>'resumos_lidos')::int = 0 and d->'resumos_titulos' = '[]'::jsonb and d->'dias_para_prova' = 'null'::jsonb, 'dados: sem cadastro');

  -- dados_carta_envio: os transacionais não contam em emails_48h nem em emails_14d.
  perform pg_temp.carta(a, 'pagamento_aprovado', 3, 'enviado', 'pagamento_aprovado:9');
  perform pg_temp.carta(a, null, 4, 'enviado', 'relato:1', 'relato_resolvido');
  perform pg_temp.carta(a, 'pix_hoje', 5, 'enviado', 'pixhoje:2', 'lembrete');
  perform pg_temp.carta(a, 'obrigado_tempo', 6, 'enviado', 'obrigado_tempo:3');
  perform pg_temp.carta(a, 'ativo:40-60', 7, 'falhou');
  e := public.dados_carta_envio(a, 'convite_50');
  perform pg_temp.confere((e->>'emails_48h')::int = 0 and (e->>'emails_14d')::int = 0, 'envio: transacionais e falhas fora da cadência (' || e::text || ')');
  perform pg_temp.carta(a, 'ativo:40-60', 30);
  perform pg_temp.carta(a, 'marco', 24 * 5, 'enviado', null, 'marco');
  e := public.dados_carta_envio(a, 'convite_50');
  perform pg_temp.confere((e->>'emails_48h')::int = 1 and (e->>'emails_14d')::int = 2, 'envio: cartas e marcos contam (' || e::text || ')');
  perform pg_temp.confere(e ? 'mesmo_tipo_30d' and e ? 'quer_cartas' and e ? 'confirmado' and e ? 'administrador', 'envio: chaves antigas');
  perform pg_temp.confere(public.cadencia_livre_interno(a) = false, 'cadência: bloqueada com e-mail há 30 h');

  perform pg_temp.confere(public.email_transacional_interno('carta', 'pagamento_aprovado') and public.email_transacional_interno('relato_resolvido', null)
                          and public.email_transacional_interno('lembrete', 'pix_hoje') and not public.email_transacional_interno('lembrete', 'pix_3_dias')
                          and not public.email_transacional_interno('carta', 'aniversario') and not public.email_transacional_interno('carta', 'ativo:40-60'), 'transacionais: a mesma lista de cartas.ts');
end $$;

select format('parte 31: %s conferências ok', n) as resultado from pg_temp.conferencias;
