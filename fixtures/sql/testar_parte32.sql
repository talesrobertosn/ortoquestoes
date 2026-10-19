-- Testes da parte 32 (Simulado Nacional 2.0), rodados por fixtures/testar_parte32.sh depois de colar
-- a parte duas vezes. Cada falha levanta uma exceção com o motivo; no fim sai "parte 32: N conferências ok".
--
-- O relógio: dentro de um bloco "do", now() é fixo. Para simular o tempo passando, o teste mexe direto
-- nas datas (prazo_em, abre_em, fecha_em) como superusuário; as funções só leem now().
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create table pg_temp.conferencias (n integer);
insert into pg_temp.conferencias values (0);

create function pg_temp.confere(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  update pg_temp.conferencias set n = n + 1;
end $$;

-- O erro que um comando levanta (null se não levantar).
create function pg_temp.erro(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlerrm;
end $$;

-- Uma pessoa confirmada, criada há 40 dias (passa nas travas das campanhas de e-mail).
create function pg_temp.pessoa(p_nome text, p_sobrenome text default 'Teste') returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, last_sign_in_at)
  values (v, lower(p_nome) || '-' || left(v::text, 8) || '@teste', jsonb_build_object('nome', p_nome, 'sobrenome', p_sobrenome),
          now() - interval '39 days', now() - interval '40 days', now() - interval '2 hours');
  return v;
end $$;

create function pg_temp.assinar(p_id uuid) returns void language sql as $$
  insert into public.assinaturas (id_usuario, plano, status, criada_em, inicio_periodo, fim_periodo)
  values (p_id, 'mensal', 'ativa', now() - interval '5 days', now() - interval '5 days', now() + interval '25 days');
$$;
create function pg_temp.desassinar(p_id uuid) returns void language sql as $$
  delete from public.assinaturas where id_usuario = p_id;
$$;

-- Quem chama as RPCs (null = visitante).
create function pg_temp.como(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
$$;

-- Itens de teste: n questões em três áreas, com as permutações girando.
create function pg_temp.itens(p_n integer, p_prefixo text default 'q') returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'ordem', g, 'id_questao', p_prefixo || '-' || lpad(g::text, 4, '0'),
    'area', (array['Trauma adulto', 'Joelho', 'Coluna'])[1 + g % 3],
    'foco', case when g % 2 = 0 then 'Foco ' || (g % 3) end,
    'gabarito_original', (array['A', 'B', 'C', 'D'])[1 + g % 4],
    'permutacao', (array['CADB', 'BCDA', 'DCBA', 'ABCD'])[1 + g % 4]) order by g)
  from generate_series(1, p_n) g;
$$;

-- As letras NOVAS certas (ou erradas) de uma edição, para montar respostas.
create function pg_temp.respostas(p_edicao text, p_certas integer, p_erradas integer default 0) returns jsonb language sql as $$
  select coalesce(jsonb_object_agg(i.id_questao,
           case when i.ordem <= p_certas then i.gabarito::text
                else case i.gabarito when 'A' then 'B' else 'A' end end), '{}'::jsonb)
  from public.sn_itens i where i.edicao = p_edicao and i.ordem <= p_certas + p_erradas;
$$;

-- Um participante com a entrega já feita (direto pelas RPCs).
create function pg_temp.participante(p_edicao text, p_nome text, p_certas integer, p_segundos integer, p_no_tempo boolean default true) returns uuid language plpgsql as $$
declare v uuid := pg_temp.pessoa(p_nome);
begin
  perform pg_temp.assinar(v);
  perform pg_temp.como(v);
  perform public.sn_iniciar(p_edicao);
  update public.sn_participacoes set iniciado_em = now() - make_interval(secs => p_segundos),
         prazo_em = case when p_no_tempo then now() - make_interval(secs => p_segundos) + interval '120 minutes' else now() - interval '10 minutes' end
   where edicao = p_edicao and usuario_id = v;
  perform public.sn_entregar(p_edicao, pg_temp.respostas(p_edicao, p_certas, 12 - p_certas));
  return v;
end $$;

create table pg_temp.ids (rotulo text primary key, id uuid);
create function pg_temp.id(p_rotulo text) returns uuid language sql as $$ select id from pg_temp.ids where rotulo = p_rotulo $$;

update public.configuracao_premium set recursos_exclusivos = true;

-- ---------------------------------------------------------------------------
-- 0. Estrutura, RLS e permissões
-- ---------------------------------------------------------------------------
do $$
declare t text; f text;
begin
  foreach t in array array['sn_edicoes', 'sn_itens', 'sn_participacoes', 'sn_inscricoes'] loop
    perform pg_temp.confere((select c.relrowsecurity from pg_class c where c.oid = ('public.' || t)::regclass), t || ': RLS ligado');
    perform pg_temp.confere(not exists (select 1 from pg_policies p where p.tablename = t), t || ': sem políticas');
    perform pg_temp.confere(not has_table_privilege('anon', 'public.' || t, 'select') and not has_table_privilege('authenticated', 'public.' || t, 'select')
                            and not has_table_privilege('authenticated', 'public.' || t, 'insert'), t || ': sem grants');
  end loop;
  foreach f in array array['public.sn_obter(text)', 'public.sn_ranking(text, text, integer)', 'public.sn_destaque_inicio()'] loop
    perform pg_temp.confere(has_function_privilege('anon', f, 'execute') and has_function_privilege('authenticated', f, 'execute'), f || ': anon e authenticated');
  end loop;
  foreach f in array array['public.sn_iniciar(text)', 'public.sn_salvar(text, jsonb, jsonb)', 'public.sn_entregar(text, jsonb)', 'public.sn_resultado(text)',
                           'public.sn_gabarito(text)', 'public.sn_admin_listar()',
                           'public.sn_admin_salvar(text, text, text, timestamptz, timestamptz, integer, jsonb, boolean, text, boolean, jsonb, boolean)',
                           'public.sn_admin_config(text, text, text, boolean, boolean)', 'public.sn_inscrever(text)', 'public.sn_cancelar_inscricao(text)',
                           'public.sn_admin_trocar_item(text, integer, jsonb)', 'public.sn_admin_publicar(text, boolean)',
                           'public.sn_admin_datas(text, timestamptz, timestamptz)', 'public.sn_admin_estatisticas(text)'] loop
    perform pg_temp.confere(not has_function_privilege('anon', f, 'execute') and has_function_privilege('authenticated', f, 'execute'), f || ': só authenticated');
  end loop;
  perform pg_temp.confere(not has_function_privilege('anon', 'public.sn_entregar_vencidas()', 'execute')
                          and not has_function_privilege('authenticated', 'public.sn_entregar_vencidas()', 'execute')
                          and has_function_privilege('service_role', 'public.sn_entregar_vencidas()', 'execute'), 'sn_entregar_vencidas: só service_role');
  foreach f in array array['public.sn_marcar_lembrete(text, uuid)', 'public.candidatos_simulado_lembrete(integer)'] loop
    perform pg_temp.confere(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                            and has_function_privilege('service_role', f, 'execute'), f || ': só service_role');
  end loop;
  perform pg_temp.confere(pg_get_function_result('public.candidatos_simulado_lembrete(integer)'::regprocedure) = 'TABLE(id_usuario uuid, referencia text, dados jsonb)', 'lembrete: a assinatura das campanhas');
  perform pg_temp.confere((select bool_and(p.prosecdef and p.proconfig @> array['search_path=public']) from pg_proc p
                           where p.pronamespace = 'public'::regnamespace and p.proname like 'sn\_%'), 'sn_*: security definer, search_path = public');
  perform pg_temp.confere((select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sn\_%' and p.prosecdef) >= 15, 'sn_*: as funções existem');
  perform pg_temp.confere(not exists (select 1 from public.sn_edicoes), 'a parte não semeia edição');
end $$;

-- ---------------------------------------------------------------------------
-- 1. Administração: quem pode, validações e o gabarito calculado no servidor
-- ---------------------------------------------------------------------------
do $$
declare
  adm uuid := pg_temp.pessoa('Admin');
  comum uuid := pg_temp.pessoa('Comum');
  r jsonb;
begin
  insert into public.administradores (id_usuario) values (adm);
  insert into pg_temp.ids values ('adm', adm), ('comum', comum);
  perform pg_temp.assinar(comum);

  perform pg_temp.como(comum);
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_listar()') = 'nao_admin', 'listar: não-admin recusado');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'mensal', 'Outubro', pg_temp.itens(12))) = 'nao_admin', 'salvar: não-admin recusado');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_publicar(''2026-10'', true)') = 'nao_admin', 'publicar: não-admin recusado');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_datas(''2026-10'', now(), now() + interval ''2 days'')') = 'nao_admin', 'datas: não-admin recusado');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_trocar_item(''2026-10'', 1, ''{}''::jsonb)') = 'nao_admin', 'trocar: não-admin recusado');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_estatisticas(''2026-10'')') = 'nao_admin', 'estatísticas: não-admin recusado');
  perform pg_temp.como(null);
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_listar()') = 'nao_admin', 'listar: visitante recusado');

  perform pg_temp.como(adm);
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-13x', 'mensal', 'Outubro', pg_temp.itens(12))) = 'edicao_invalida', 'salvar: código mal formado');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10-vespera-teot', 'mensal', 'Outubro', pg_temp.itens(12))) = 'edicao_invalida', 'salvar: código de véspera com tipo mensal');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'semanal', 'Outubro', pg_temp.itens(12))) = 'edicao_invalida', 'salvar: tipo desconhecido');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() - interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'mensal', 'Outubro', pg_temp.itens(12))) = 'datas_invalidas', 'salvar: fecha antes de abrir');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'mensal', 'Outubro', pg_temp.itens(9))) = 'itens_invalidos', 'salvar: 9 itens');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'mensal', 'Outubro',
                          jsonb_set(pg_temp.itens(12), '{0,permutacao}', '"AABC"'))) = 'itens_invalidos', 'salvar: permutação com letra repetida');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true)', '2026-10', 'mensal', 'Outubro',
                          jsonb_set(pg_temp.itens(12), '{0,gabarito_original}', '"E"'))) = 'itens_invalidos', 'salvar: gabarito fora da permutação');
  perform pg_temp.confere(not exists (select 1 from public.sn_edicoes), 'salvar recusado não grava nada');

  r := public.sn_admin_salvar('2026-10', 'mensal', 'Simulado Nacional · Outubro de 2026', now() - interval '1 day', now() + interval '10 days', 120, pg_temp.itens(12), true,
                              'A primeira edição nova.', true,
                              '{"provas":["TEOT","TARO","TEOT/TARO"],"peso_recentes":2,"anos_recentes":5,"cotas":{"Trauma adulto":4,"Joelho":4,"Coluna":4},"nivel_alto_pct":60}');
  perform pg_temp.confere(r->>'edicao' = '2026-10' and (r->>'publicado')::boolean and (r->>'total')::int = 12, 'salvar: edição gravada e publicada (' || r::text || ')');
  perform pg_temp.confere((select descricao = 'A primeira edição nova.' and destaque_inicio and (config->>'nivel_alto_pct')::int = 60 from public.sn_edicoes where edicao = '2026-10'), 'salvar: descrição, destaque e config');
  perform pg_temp.confere(r ?& array['descricao','destaque_inicio','config','aberto_a_todos','inscritos'], 'salvar: devolve descrição, destaque, config, aberto_a_todos e inscritos');
  perform pg_temp.confere(not (r->>'aberto_a_todos')::boolean and (r->>'inscritos')::int = 0, 'salvar: fechado ao plano por padrão');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now(), now() + interval ''1 day'', 120, %L::jsonb, true, null, true, ''[1]''::jsonb)', '2026-07', 'mensal', 'Julho', pg_temp.itens(12))) = 'config_invalida', 'salvar: config não-objeto');
  -- Item 1: original B ('BCDA'): a letra nova A mostra a original B, então o gabarito novo é A.
  perform pg_temp.confere((select gabarito from public.sn_itens where edicao = '2026-10' and ordem = 1) = 'A', 'gabarito novo do item 1');
  -- Item 2: original C ('DCBA'): a nova C mostra a original B... a original C está na posição 2 → B.
  perform pg_temp.confere((select gabarito from public.sn_itens where edicao = '2026-10' and ordem = 2) = 'B', 'gabarito novo do item 2');
  -- Item 4: original A ('CADB') → posição 2 → B.
  perform pg_temp.confere((select gabarito from public.sn_itens where edicao = '2026-10' and ordem = 4) = 'B', 'gabarito novo do item 4');
  perform pg_temp.confere((select bool_and(strpos(permutacao, gabarito_original) = ascii(gabarito) - 64) from public.sn_itens where edicao = '2026-10'), 'gabarito = posição da original na permutação');
  perform pg_temp.confere((select foco from public.sn_itens where edicao = '2026-10' and ordem = 2) = 'Foco 2' and (select foco from public.sn_itens where edicao = '2026-10' and ordem = 1) is null, 'foco gravado');

  -- Sem participantes, dá para trocar os itens inteiros e um item.
  r := public.sn_admin_salvar('2026-10', 'mensal', 'Simulado Nacional · Outubro de 2026', now() - interval '1 day', now() + interval '10 days', 120, pg_temp.itens(12, 'x'), true);
  perform pg_temp.confere((select count(*) from public.sn_itens where edicao = '2026-10' and id_questao like 'x-%') = 12, 'salvar de novo troca os itens');
  r := public.sn_admin_salvar('2026-10', 'mensal', 'Simulado Nacional · Outubro de 2026', now() - interval '1 day', now() + interval '10 days', 120, pg_temp.itens(12), true,
                              'A primeira edição nova.', true, '{"provas":["TEOT","TARO","TEOT/TARO"],"cotas":{"Trauma adulto":4,"Joelho":4,"Coluna":4},"nivel_alto_pct":60}');
  r := public.sn_admin_trocar_item('2026-10', 3, '{"id_questao":"novo-0001","area":"Quadril","foco":null,"gabarito_original":"D","permutacao":"DABC"}');
  perform pg_temp.confere((select id_questao || area || gabarito from public.sn_itens where edicao = '2026-10' and ordem = 3) = 'novo-0001QuadrilA', 'trocar item sem participantes');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_trocar_item(''2026-10'', 4, ''{"id_questao":"novo-0001","area":"Quadril","gabarito_original":"D","permutacao":"DABC"}'')') = 'itens_invalidos', 'trocar por questão já na edição');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_trocar_item(''2026-10'', 99, ''{"id_questao":"novo-0002","area":"Quadril","gabarito_original":"D","permutacao":"DABC"}'')') = 'itens_invalidos', 'trocar ordem inexistente');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_trocar_item(''2099-01'', 1, ''{"id_questao":"novo-0002","area":"Quadril","gabarito_original":"D","permutacao":"DABC"}'')') = 'edicao_invalida', 'trocar em edição inexistente');
  r := public.sn_admin_trocar_item('2026-10', 3, (pg_temp.itens(12))->2);

  -- Despublicar e publicar sem participantes.
  r := public.sn_admin_publicar('2026-10', false);
  perform pg_temp.confere(not (r->>'publicado')::boolean, 'despublicar sem participantes');
  r := public.sn_admin_publicar('2026-10', true);
  perform pg_temp.confere((r->>'publicado')::boolean, 'publicar de novo');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_publicar(''2099-01'', true)') = 'edicao_invalida', 'publicar edição inexistente');

  -- Véspera: código com slug, tipo próprio.
  r := public.sn_admin_salvar('2026-11-vespera-teot', 'vespera', 'Véspera do TEOT', now() + interval '20 days', now() + interval '22 days', 240, pg_temp.itens(20, 'v'), false);
  perform pg_temp.confere(r->>'tipo' = 'vespera' and (r->>'duracao_min')::int = 240 and not (r->>'publicado')::boolean, 'véspera salva sem publicar');

  r := public.sn_admin_listar();
  perform pg_temp.confere(jsonb_typeof(r) = 'array' and jsonb_array_length(r) = 2, 'listar: duas edições');
  perform pg_temp.confere((select bool_and(e ?& array['edicao','tipo','titulo','abre_em','fecha_em','duracao_min','publicado','total','participantes','entregas','media','ids','inscritos','aberto_a_todos']) from jsonb_array_elements(r) e), 'listar: todos os campos');
  perform pg_temp.confere((select (e->'ids'->>0) = 'q-0001' and jsonb_array_length(e->'ids') = 12 from jsonb_array_elements(r) e where e->>'edicao' = '2026-10'), 'listar: ids em ordem');
  perform pg_temp.confere((r->0->>'edicao') = '2026-11-vespera-teot', 'listar: mais nova primeiro');
end $$;

-- ---------------------------------------------------------------------------
-- 2. Datas (sn_admin_datas)
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; v_fecha timestamptz;
begin
  perform pg_temp.como(pg_temp.id('adm'));
  -- Antes de abrir: muda tudo.
  r := public.sn_admin_datas('2026-11-vespera-teot', now() + interval '21 days', now() + interval '23 days');
  perform pg_temp.confere((select abre_em from public.sn_edicoes where edicao = '2026-11-vespera-teot') = now() + interval '21 days', 'datas: antes de abrir muda a abertura');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_datas(''2026-11-vespera-teot'', now() + interval ''21 days'', now() + interval ''20 days'')') = 'datas_invalidas', 'datas: fecha antes de abrir');
  -- Aberta e publicada: só estende o fechamento.
  select fecha_em into v_fecha from public.sn_edicoes where edicao = '2026-10';
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_datas(''2026-10'', now() - interval ''3 days'', null)') = 'datas_invalidas', 'datas: aberta não muda a abertura');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_datas(''2026-10'', null, %L::timestamptz - interval ''1 day'')', v_fecha)) = 'datas_invalidas', 'datas: aberta não encurta');
  r := public.sn_admin_datas('2026-10', null, v_fecha + interval '1 day');
  perform pg_temp.confere((r->>'fecha_em')::timestamptz = v_fecha + interval '1 day', 'datas: aberta estende o fechamento');
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_datas(''2026-10'', (select abre_em from public.sn_edicoes where edicao = ''2026-10''), %L)', v_fecha)) = 'datas_invalidas', 'datas: mesma abertura, fechamento menor que o atual');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_datas(''2099-01'', null, now())') = 'edicao_invalida', 'datas: edição inexistente');
end $$;

-- ---------------------------------------------------------------------------
-- 3. sn_iniciar
-- ---------------------------------------------------------------------------
do $$
declare
  ana uuid := pg_temp.pessoa('Ana', 'Lima');
  sem uuid := pg_temp.pessoa('Semplano');
  r jsonb; r2 jsonb;
begin
  insert into pg_temp.ids values ('ana', ana), ('sem', sem);
  perform pg_temp.assinar(ana);

  perform pg_temp.como(null);
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-10'')') = 'autenticacao_necessaria', 'iniciar: visitante');
  perform pg_temp.como(sem);
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-10'')') = 'premium_necessario', 'iniciar: sem plano');
  perform pg_temp.como(ana);
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2099-01'')') = 'edicao_invalida', 'iniciar: inexistente');
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-11-vespera-teot'')') = 'edicao_invalida', 'iniciar: não publicada');
  update public.sn_edicoes set publicado = true where edicao = '2026-11-vespera-teot';
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-11-vespera-teot'')') = 'edicao_nao_aberta', 'iniciar: ainda não abriu');
  update public.sn_edicoes set publicado = false where edicao = '2026-11-vespera-teot';
  insert into public.sn_edicoes (edicao, tipo, titulo, abre_em, fecha_em, duracao_min, publicado)
  values ('2026-09', 'mensal', 'Simulado Nacional · Setembro de 2026', now() - interval '40 days', now() - interval '10 days', 120, true);
  insert into public.sn_itens (edicao, ordem, id_questao, area, foco, gabarito_original, permutacao, gabarito)
  select '2026-09', g, 's-' || g, 'Joelho', null, 'A', 'ABCD', 'A' from generate_series(1, 10) g;
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-09'')') = 'edicao_fechada', 'iniciar: encerrada');

  r := public.sn_iniciar('2026-10');
  perform pg_temp.confere(r->>'edicao' = '2026-10' and (r->>'duracao_min')::int = 120, 'iniciar: devolve a edição');
  perform pg_temp.confere((r->>'prazo_em')::timestamptz = (r->>'iniciado_em')::timestamptz + interval '120 minutes', 'iniciar: prazo = início + duração');
  perform pg_temp.confere(jsonb_array_length(r->'itens') = 12 and (r->'itens'->0) ?& array['ordem','id_questao','permutacao'], 'iniciar: itens com permutação');
  perform pg_temp.confere(not (r::text ~ 'gabarito'), 'iniciar: sem gabarito (' || left(r::text, 200) || ')');
  perform pg_temp.confere(r->'respostas' = '{}'::jsonb and r->'revisar' = '[]'::jsonb, 'iniciar: respostas vazias');
  perform pg_temp.confere((r->'itens'->0->>'ordem')::int = 1 and (r->'itens'->11->>'ordem')::int = 12, 'iniciar: itens em ordem');

  -- Idempotente: o mesmo início, mesmo depois de um tempo.
  update public.sn_participacoes set iniciado_em = iniciado_em - interval '10 minutes', prazo_em = prazo_em - interval '10 minutes' where usuario_id = ana;
  r2 := public.sn_iniciar('2026-10');
  perform pg_temp.confere((r2->>'iniciado_em')::timestamptz = (r->>'iniciado_em')::timestamptz - interval '10 minutes', 'iniciar: idempotente');
  perform pg_temp.confere((select count(*) from public.sn_participacoes where usuario_id = ana) = 1, 'iniciar: uma participação');
  -- Perdeu o plano no meio: retoma a mesma prova.
  perform pg_temp.desassinar(ana);
  r2 := public.sn_iniciar('2026-10');
  perform pg_temp.confere((r2->>'iniciado_em')::timestamptz = (r->>'iniciado_em')::timestamptz - interval '10 minutes', 'iniciar: retoma sem plano');
  perform pg_temp.assinar(ana);
end $$;

-- ---------------------------------------------------------------------------
-- 3b. Inscrição
-- ---------------------------------------------------------------------------
do $$
declare
  comum uuid := pg_temp.id('comum'); sem uuid := pg_temp.id('sem'); ana uuid := pg_temp.id('ana');
  r jsonb; r2 jsonb;
begin
  perform pg_temp.como(null);
  perform pg_temp.confere(pg_temp.erro('select public.sn_inscrever(''2026-10'')') = 'autenticacao_necessaria', 'inscrever: visitante');
  perform pg_temp.como(sem);
  r := public.sn_inscrever('2026-10');
  perform pg_temp.confere(r ?& array['inscrito_em','inscritos'] and r->>'inscrito_em' is not null, 'inscrever: qualquer conta, sem plano (' || r::text || ')');
  perform pg_temp.confere(r->'inscritos' = 'null'::jsonb, 'inscrever: menos de 10, sem número');
  update public.sn_inscricoes set inscrito_em = inscrito_em - interval '1 hour' where usuario_id = sem;
  r2 := public.sn_inscrever('2026-10');
  perform pg_temp.confere((r2->>'inscrito_em')::timestamptz = (r->>'inscrito_em')::timestamptz - interval '1 hour', 'inscrever: idempotente');
  perform pg_temp.confere(((public.sn_obter('2026-10'))->>'minha_inscricao')::timestamptz = (r2->>'inscrito_em')::timestamptz, 'obter: minha inscrição');
  perform pg_temp.confere(pg_temp.erro('select public.sn_inscrever(''2026-11-vespera-teot'')') = 'edicao_invalida', 'inscrever: não publicada');
  perform pg_temp.confere(pg_temp.erro('select public.sn_inscrever(''2026-09'')') = 'edicao_fechada', 'inscrever: encerrada');
  perform pg_temp.confere(pg_temp.erro('select public.sn_inscrever(''2099-01'')') = 'edicao_invalida', 'inscrever: inexistente');
  r := public.sn_cancelar_inscricao('2026-10');
  perform pg_temp.confere(r->'inscrito_em' = 'null'::jsonb and not exists (select 1 from public.sn_inscricoes where usuario_id = sem), 'cancelar: sai da lista');
  perform pg_temp.confere((public.sn_obter('2026-10'))->'minha_inscricao' = 'null'::jsonb, 'obter: sem inscrição');
  perform pg_temp.confere(pg_temp.erro('select public.sn_cancelar_inscricao(''2026-11-vespera-teot'')') = 'edicao_invalida', 'cancelar: não publicada');
  perform pg_temp.como(comum);
  perform public.sn_inscrever('2026-10');
  perform pg_temp.confere(exists (select 1 from public.sn_inscricoes where usuario_id = ana and edicao = '2026-10'), 'iniciar inscreve sozinho');
  perform pg_temp.confere(not exists (select 1 from public.sn_participacoes where usuario_id = comum), 'inscrever não começa a prova');
  -- Dez inscritos: o número aparece.
  perform pg_temp.como(null);
  perform pg_temp.confere((public.sn_obter('2026-10'))->'inscritos' = 'null'::jsonb, 'obter: inscritos escondido com menos de 10');
end $$;

-- ---------------------------------------------------------------------------
-- 4. sn_salvar
-- ---------------------------------------------------------------------------
do $$
declare ana uuid := pg_temp.id('ana'); r jsonb; v_resp jsonb;
begin
  perform pg_temp.como(ana);
  r := public.sn_salvar('2026-10', '{"q-0001":"A","q-0002":"b"}');
  perform pg_temp.confere(r ? 'salvo_em', 'salvar: devolve salvo_em');
  r := public.sn_salvar('2026-10', '{"q-0002":"C","q-0003":null,"nao-existe":"A","q-0004":"Z"}', '["q-0005","nao-existe"]');
  select respostas into v_resp from public.sn_participacoes where usuario_id = ana and edicao = '2026-10';
  perform pg_temp.confere(v_resp = '{"q-0001":"A","q-0002":"C","q-0003":null}'::jsonb, 'salvar: mescla, a última vence, ignora o que não é da edição (' || v_resp::text || ')');
  perform pg_temp.confere((select revisar from public.sn_participacoes where usuario_id = ana and edicao = '2026-10') = '["q-0005"]'::jsonb, 'salvar: revisar');
  r := public.sn_salvar('2026-10', '{"q-0004":"D"}');
  perform pg_temp.confere((select revisar from public.sn_participacoes where usuario_id = ana and edicao = '2026-10') = '["q-0005"]'::jsonb, 'salvar: revisar nulo não mexe');
  perform pg_temp.confere((select salvo_em from public.sn_participacoes where usuario_id = ana and edicao = '2026-10') is not null, 'salvar: grava salvo_em');
  perform pg_temp.confere((public.sn_iniciar('2026-10'))->'respostas' ? 'q-0004', 'salvar: outro aparelho vê as respostas');
  perform pg_temp.confere(pg_temp.erro('select public.sn_salvar(''2026-10'', ''[1]''::jsonb)') = 'respostas_invalidas', 'salvar: respostas não-objeto');

  -- Tolerância de 5 minutos.
  update public.sn_participacoes set prazo_em = now() - interval '4 minutes' where usuario_id = ana and edicao = '2026-10';
  r := public.sn_salvar('2026-10', '{"q-0006":"A"}');
  perform pg_temp.confere((select respostas ? 'q-0006' from public.sn_participacoes where usuario_id = ana and edicao = '2026-10'), 'salvar: aceita 4 min depois do prazo');
  update public.sn_participacoes set prazo_em = now() - interval '6 minutes' where usuario_id = ana and edicao = '2026-10';
  perform pg_temp.confere(pg_temp.erro('select public.sn_salvar(''2026-10'', ''{"q-0007":"A"}'')') = 'tempo_esgotado', 'salvar: recusa 6 min depois do prazo');
  perform pg_temp.confere(not (select respostas ? 'q-0007' from public.sn_participacoes where usuario_id = ana and edicao = '2026-10'), 'salvar: nada gravado depois do prazo');
  update public.sn_participacoes set prazo_em = now() + interval '100 minutes' where usuario_id = ana and edicao = '2026-10';

  perform pg_temp.como(pg_temp.id('comum'));
  perform pg_temp.confere(pg_temp.erro('select public.sn_salvar(''2026-10'', ''{"q-0001":"A"}'')') = 'nao_iniciado', 'salvar: não iniciado');
end $$;

-- ---------------------------------------------------------------------------
-- 5. sn_entregar
-- ---------------------------------------------------------------------------
do $$
declare
  ana uuid := pg_temp.id('ana');
  bia uuid := pg_temp.pessoa('Bia', 'Souza');
  r jsonb; r2 jsonb; v_orig jsonb;
begin
  insert into pg_temp.ids values ('bia', bia);
  -- Ana marca a letra ORIGINAL do acervo em tudo: só acerta onde a permutação não mexeu no gabarito.
  perform pg_temp.como(ana);
  select jsonb_object_agg(id_questao, gabarito_original) into v_orig from public.sn_itens where edicao = '2026-10';
  perform pg_temp.confere(pg_temp.erro('select public.sn_entregar(''2099-01'')') = 'edicao_invalida', 'entregar: edição inexistente');
  -- Sem plano na hora de entregar: entrega do mesmo jeito.
  perform pg_temp.desassinar(ana);
  r := public.sn_entregar('2026-10', v_orig);
  perform pg_temp.confere((r->>'acertos')::int = (select count(*) from public.sn_itens where edicao = '2026-10' and gabarito = gabarito_original)
                          and (r->>'total')::int = 12, 'entregar: corrige pela letra nova (' || r::text || ')');
  perform pg_temp.confere((r->>'acertos')::int < 12, 'entregar: a letra original não serve para colar');
  perform pg_temp.confere((r->>'no_tempo')::boolean, 'entregar: no tempo');
  perform pg_temp.confere(r ?& array['acertos','total','segundos','no_tempo','por_area'], 'entregar: formato');
  perform pg_temp.confere((r->'por_area'->'Joelho'->>'total')::int = 4 and (r->'por_area'->'Coluna'->>'total')::int = 4, 'entregar: por área');
  perform pg_temp.confere((select sum((v->>'certas')::int) from jsonb_each(r->'por_area') x(k, v)) = (r->>'acertos')::int, 'entregar: soma das áreas');
  perform pg_temp.confere((r->>'segundos')::int between 595 and 7200, 'entregar: segundos desde o início');
  perform pg_temp.confere((select entregue_em is not null and not entrega_automatica from public.sn_participacoes where usuario_id = ana and edicao = '2026-10'), 'entregar: gravado');
  -- Idempotente: segunda chamada devolve o gravado, mesmo com outras respostas.
  r2 := public.sn_entregar('2026-10', pg_temp.respostas('2026-10', 12));
  perform pg_temp.confere(r2 = r, 'entregar: idempotente');
  perform pg_temp.confere(pg_temp.erro('select public.sn_salvar(''2026-10'', ''{"q-0001":"A"}'')') = 'ja_entregue', 'salvar depois de entregar');
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-10'')') = 'ja_entregue', 'iniciar depois de entregar');
  perform pg_temp.assinar(ana);

  -- Bia: salva algumas, entrega 4 min depois do prazo com as finais (aceitas): no tempo.
  perform pg_temp.assinar(bia);
  perform pg_temp.como(bia);
  perform public.sn_iniciar('2026-10');
  perform public.sn_salvar('2026-10', pg_temp.respostas('2026-10', 3));
  update public.sn_participacoes set iniciado_em = now() - interval '124 minutes', prazo_em = now() - interval '4 minutes' where usuario_id = bia;
  r := public.sn_entregar('2026-10', pg_temp.respostas('2026-10', 5));
  perform pg_temp.confere((r->>'acertos')::int = 5 and (r->>'no_tempo')::boolean, 'entregar: 4 min de atraso conta e mescla as finais');
  perform pg_temp.confere((r->>'segundos')::int = 7200, 'entregar: segundos limitados à duração');

  perform pg_temp.como(pg_temp.id('comum'));
  perform pg_temp.confere(pg_temp.erro('select public.sn_entregar(''2026-10'')') = 'nao_iniciado', 'entregar: não iniciado');
end $$;

do $$
declare
  caio uuid := pg_temp.pessoa('Caio', 'Reis');
  r jsonb;
begin
  insert into pg_temp.ids values ('caio', caio);
  perform pg_temp.assinar(caio);
  perform pg_temp.como(caio);
  perform public.sn_iniciar('2026-10');
  perform public.sn_salvar('2026-10', pg_temp.respostas('2026-10', 2));
  update public.sn_participacoes set iniciado_em = now() - interval '126 minutes', prazo_em = now() - interval '6 minutes' where usuario_id = caio;
  r := public.sn_entregar('2026-10', pg_temp.respostas('2026-10', 12));
  perform pg_temp.confere((r->>'acertos')::int = 2, 'entregar: 6 min de atraso ignora as respostas finais');
  perform pg_temp.confere(not (r->>'no_tempo')::boolean, 'entregar: 6 min de atraso fica fora do tempo');
end $$;

-- ---------------------------------------------------------------------------
-- 6. sn_entregar_vencidas
-- ---------------------------------------------------------------------------
do $$
declare
  dani uuid := pg_temp.pessoa('Dani'); edu uuid := pg_temp.pessoa('Edu');
  n integer;
begin
  insert into pg_temp.ids values ('dani', dani), ('edu', edu);
  perform pg_temp.assinar(dani); perform pg_temp.assinar(edu);
  perform pg_temp.como(dani); perform public.sn_iniciar('2026-10'); perform public.sn_salvar('2026-10', pg_temp.respostas('2026-10', 7, 2));
  perform pg_temp.como(edu); perform public.sn_iniciar('2026-10');
  update public.sn_participacoes set iniciado_em = now() - interval '127 minutes', prazo_em = now() - interval '7 minutes' where usuario_id = dani;
  update public.sn_participacoes set prazo_em = now() - interval '3 minutes' where usuario_id = edu;
  n := public.sn_entregar_vencidas();
  perform pg_temp.confere(n = 1, 'vencidas: entrega só a vencida (' || n || ')');
  perform pg_temp.confere((select entregue_em is not null and entrega_automatica and acertos = 7 and not no_tempo and segundos = 7200
                           from public.sn_participacoes where usuario_id = dani), 'vencidas: entregue com o que foi salvo');
  perform pg_temp.confere((select entregue_em is null from public.sn_participacoes where usuario_id = edu), 'vencidas: dentro da tolerância espera');
  perform pg_temp.confere(public.sn_entregar_vencidas() = 0, 'vencidas: repetir não faz nada');
  perform pg_temp.como(dani);
  perform pg_temp.confere((public.sn_entregar('2026-10'))->>'acertos' = '7', 'vencidas: a pessoa vê o resultado gravado');
  update public.sn_participacoes set prazo_em = now() + interval '60 minutes' where usuario_id = edu;
end $$;

-- ---------------------------------------------------------------------------
-- 7. sn_resultado e 9. sn_gabarito
-- ---------------------------------------------------------------------------
do $$
declare
  ana uuid := pg_temp.id('ana'); bia uuid := pg_temp.id('bia'); caio uuid := pg_temp.id('caio'); edu uuid := pg_temp.id('edu');
  r jsonb; v_media numeric; n integer;
begin
  perform pg_temp.como(edu);
  perform pg_temp.confere(pg_temp.erro('select public.sn_resultado(''2026-10'')') = 'nao_entregue', 'resultado: antes de entregar');
  perform pg_temp.confere(pg_temp.erro('select * from public.sn_gabarito(''2026-10'')') = 'nao_entregue', 'gabarito: antes de entregar');
  perform pg_temp.como(pg_temp.id('comum'));
  perform pg_temp.confere(pg_temp.erro('select public.sn_resultado(''2026-10'')') = 'nao_entregue', 'resultado: sem participação');

  -- No tempo: Ana (acertos baixos) e Bia (5). Fora: Caio e Dani.
  select round(avg(acertos::numeric * 100 / total), 1) into v_media from public.sn_participacoes where edicao = '2026-10' and entregue_em is not null and no_tempo;
  perform pg_temp.como(bia);
  r := public.sn_resultado('2026-10');
  perform pg_temp.confere(r ?& array['acertos','total','segundos','no_tempo','entregue_em','posicao','colocados','percentil','media','media_segundos','por_area','encerrada'], 'resultado: formato');
  perform pg_temp.confere((r->>'colocados')::int = 2, 'resultado: colocados só no tempo');
  perform pg_temp.confere((r->>'media')::numeric = v_media, 'resultado: média só das entregas no prazo (' || (r->>'media') || ' vs ' || v_media || ')');
  perform pg_temp.confere((r->>'media_segundos')::int = (select round(avg(segundos))::int from public.sn_participacoes where edicao = '2026-10' and entregue_em is not null and no_tempo), 'resultado: média de tempo no prazo');
  perform pg_temp.confere((r->>'acertos')::int = 5 and not (r->>'encerrada')::boolean, 'resultado: placar e aberta');
  perform pg_temp.confere(jsonb_array_length(r->'por_area') = 3 and (r->'por_area'->0) ?& array['area','certas','total','media'], 'resultado: por área');
  perform pg_temp.confere((select (a->>'media')::numeric from jsonb_array_elements(r->'por_area') a where a->>'area' = 'Joelho')
                          = (select round(avg((por_area->'Joelho'->>'certas')::numeric * 100 / (por_area->'Joelho'->>'total')::numeric), 1)
                             from public.sn_participacoes where edicao = '2026-10' and entregue_em is not null and no_tempo), 'resultado: média da área só no prazo');
  n := (r->>'posicao')::int;
  perform pg_temp.confere(n is not null and (r->>'percentil') is not null, 'resultado: assinante no tempo tem posição e percentil');
  perform pg_temp.confere(((r->>'acertos')::int > (select acertos from public.sn_participacoes where usuario_id = ana and edicao = '2026-10')) = (n = 1), 'resultado: posição pela ordem');
  perform pg_temp.desassinar(bia);
  r := public.sn_resultado('2026-10');
  perform pg_temp.confere((r->>'posicao') is null and (r->>'percentil') is null and (r->>'colocados')::int = 2, 'resultado: sem plano, sem posição');
  perform pg_temp.assinar(bia);
  perform pg_temp.como(caio);
  r := public.sn_resultado('2026-10');
  perform pg_temp.confere((r->>'posicao') is null and not (r->>'no_tempo')::boolean, 'resultado: fora do tempo, sem posição');

  -- Gabarito depois de entregar.
  perform pg_temp.como(bia);
  perform pg_temp.confere((select count(*) from public.sn_gabarito('2026-10')) = 12, 'gabarito: 12 linhas');
  perform pg_temp.confere((select bool_and(g.gabarito = i.gabarito and g.permutacao = i.permutacao) from public.sn_gabarito('2026-10') g join public.sn_itens i on i.edicao = '2026-10' and i.ordem = g.ordem), 'gabarito: letra nova e permutação');
  perform pg_temp.confere((select count(*) from public.sn_gabarito('2026-10') g where g.marcada = g.gabarito) = 5, 'gabarito: marcadas');
  perform pg_temp.confere((select string_agg(g.ordem::text, ',' order by g.ordem) from public.sn_gabarito('2026-10') g) = '1,2,3,4,5,6,7,8,9,10,11,12', 'gabarito: em ordem');
end $$;

-- ---------------------------------------------------------------------------
-- 8. sn_ranking
-- ---------------------------------------------------------------------------
do $$
declare
  r jsonb; f uuid; g uuid; h uuid; i uuid; j uuid;
begin
  -- Edição nova, só para o ranking: notas e tempos conhecidos.
  perform pg_temp.como(pg_temp.id('adm'));
  perform public.sn_admin_salvar('2026-08', 'mensal', 'Simulado Nacional · Agosto de 2026', now() - interval '2 days', now() + interval '5 days', 120, pg_temp.itens(12, 'r'), true);
  f := pg_temp.participante('2026-08', 'Fabio', 10, 3000);
  g := pg_temp.participante('2026-08', 'Gil', 10, 2000);     -- empate em acertos, menos tempo: na frente
  h := pg_temp.participante('2026-08', 'Helena', 11, 5000);  -- primeiro
  i := pg_temp.participante('2026-08', 'Ivo', 12, 4000);     -- oculto: não aparece, mas ocupa a posição
  j := pg_temp.participante('2026-08', 'Joana', 12, 100, false); -- fora do tempo: fora do ranking
  insert into pg_temp.ids values ('fabio', f), ('gil', g), ('helena', h), ('ivo', i), ('joana', j);
  insert into public.ranking_ocultos (usuario_id, motivo) values (i, 'teste');
  insert into public.perfis_publicos (usuario_id, apelido, participa_ranking) values (g, 'Gilzão', true);

  perform pg_temp.como(null);
  r := public.sn_ranking('2026-08');
  perform pg_temp.confere(r ?& array['colocados','top','voce','melhores_por_area'], 'ranking: formato');
  perform pg_temp.confere((r->>'colocados')::int = 4, 'ranking: colocados só no tempo (' || (r->>'colocados') || ')');
  perform pg_temp.confere(jsonb_array_length(r->'top') = 3, 'ranking: oculto fora do top');
  perform pg_temp.confere((r->'top'->0->>'posicao')::int = 2 and r->'top'->0->>'apelido' = 'Helena T.', 'ranking: Helena em 2º (o oculto fica com o 1º) ' || (r->'top')::text);
  perform pg_temp.confere(r->'top'->1->>'apelido' = 'Gilzão' and (r->'top'->1->>'posicao')::int = 3, 'ranking: empate decide pelo tempo, com o apelido escolhido');
  perform pg_temp.confere(r->'top'->2->>'apelido' = 'Fabio T.' and (r->'top'->2->>'posicao')::int = 4, 'ranking: Fabio em 4º');
  perform pg_temp.confere(r->'voce' = 'null'::jsonb and not (r->'top'->0->>'eh_voce')::boolean, 'ranking: visitante sem "você"');
  perform pg_temp.confere(r->'melhores_por_area' = '[]'::jsonb, 'ranking: por área só com 10 ou mais');
  perform pg_temp.confere((r->'top'->0) ?& array['posicao','apelido','acertos','total','segundos','eh_voce'], 'ranking: campos do top');

  perform pg_temp.como(i);
  r := public.sn_ranking('2026-08');
  perform pg_temp.confere((r->'voce'->>'posicao')::int = 1 and (r->'top'->0->>'eh_voce')::boolean and jsonb_array_length(r->'top') = 4, 'ranking: o oculto se vê');
  perform pg_temp.como(f);
  r := public.sn_ranking('2026-08', null, 2);
  perform pg_temp.confere(jsonb_array_length(r->'top') = 1 and (r->'voce'->>'posicao')::int = 4 and (r->'voce') ?& array['posicao','acertos','total','segundos'], 'ranking: limite e "você" fora do top');
  perform pg_temp.como(j);
  perform pg_temp.confere((public.sn_ranking('2026-08'))->'voce' = 'null'::jsonb, 'ranking: fora do tempo não tem posição');
  perform pg_temp.confere(pg_temp.erro('select public.sn_ranking(''2099-01'')') = 'edicao_invalida', 'ranking: edição inexistente');

  -- Mais seis no tempo: 10 entregas, aparece o melhor por área.
  perform pg_temp.participante('2026-08', 'P' || n, 3, 6000) from generate_series(1, 6) n;
  perform pg_temp.como(null);
  r := public.sn_ranking('2026-08');
  perform pg_temp.confere((r->>'colocados')::int = 10, 'ranking: 10 colocados');
  perform pg_temp.confere(jsonb_array_length(r->'melhores_por_area') = 3 and (r->'melhores_por_area'->0) ?& array['area','apelido','certas','total'], 'ranking: melhores por área ' || (r->'melhores_por_area')::text);
  perform pg_temp.confere(not exists (select 1 from jsonb_array_elements(r->'melhores_por_area') m where m->>'apelido' like 'Ivo%'), 'ranking: oculto não é o melhor da área');
  -- Gil (10/12, 2000 s) erra só as ordens 11 (Coluna) e 12 (Trauma); Helena (11/12, 5000 s) erra a 12 (Trauma).
  perform pg_temp.confere((select string_agg(m->>'area' || '=' || (m->>'apelido') || ' ' || (m->>'certas') || '/' || (m->>'total'), '; ' order by m->>'area') from jsonb_array_elements(r->'melhores_por_area') m)
                          = 'Coluna=Helena T. 4/4; Joelho=Gilzão 4/4; Trauma adulto=Gilzão 3/4', 'ranking: o melhor visível em cada área, empate pelo tempo');
  -- Ranking de uma área.
  r := public.sn_ranking('2026-08', 'Coluna');
  perform pg_temp.confere((r->'top'->0->>'total')::int = 4, 'ranking por área: acertos e total da área');
  perform pg_temp.confere((select bool_and((a->>'acertos')::int >= (b->>'acertos')::int) from jsonb_array_elements(r->'top') with ordinality x(a, n)
                           join jsonb_array_elements(r->'top') with ordinality y(b, m) on m = n + 1), 'ranking por área: em ordem');
end $$;

-- ---------------------------------------------------------------------------
-- 10. Admin com participantes e estatísticas
-- ---------------------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform pg_temp.como(pg_temp.id('adm'));
  perform pg_temp.confere(pg_temp.erro(format('select public.sn_admin_salvar(%L, %L, %L, now() - interval ''1 day'', now() + interval ''10 days'', 120, %L::jsonb, true)',
                          '2026-10', 'mensal', 'Outubro', pg_temp.itens(12, 'z'))) = 'edicao_com_participantes', 'salvar: troca de itens com participantes');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_trocar_item(''2026-10'', 1, ''{"id_questao":"novo-0009","area":"Quadril","gabarito_original":"D","permutacao":"DABC"}'')') = 'edicao_com_participantes', 'trocar: com participantes');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_publicar(''2026-10'', false)') = 'edicao_com_participantes', 'despublicar: com participantes');
  -- Mesmos itens: dá para mudar o título.
  r := public.sn_admin_salvar('2026-10', 'mensal', 'Simulado Nacional · Outubro', (select abre_em from public.sn_edicoes where edicao = '2026-10'),
                              (select fecha_em from public.sn_edicoes where edicao = '2026-10'), 120,
                              (select jsonb_agg(jsonb_build_object('ordem', ordem, 'id_questao', id_questao, 'area', area, 'foco', foco, 'gabarito_original', gabarito_original, 'permutacao', permutacao) order by ordem) from public.sn_itens where edicao = '2026-10'), true);
  perform pg_temp.confere(r->>'titulo' = 'Simulado Nacional · Outubro', 'salvar: mesmo conjunto de itens muda o título');
  perform pg_temp.confere((r->>'participantes')::int = 5 and (r->>'entregas')::int = 4, 'salvar: devolve participantes e entregas (' || r::text || ')');

  -- Textos e o destaque no início mudam a qualquer hora, mesmo com participantes.
  r := public.sn_admin_config('2026-10', 'Simulado Nacional · Outubro de 2026', 'Texto novo.', false);
  perform pg_temp.confere(r->>'titulo' = 'Simulado Nacional · Outubro de 2026' and r->>'descricao' = 'Texto novo.' and not (r->>'destaque_inicio')::boolean, 'config: muda com participantes');
  r := public.sn_admin_config('2026-10', null, null, true);
  perform pg_temp.confere(r->>'titulo' = 'Simulado Nacional · Outubro de 2026' and r->>'descricao' = 'Texto novo.' and (r->>'destaque_inicio')::boolean, 'config: nulo mantém');
  r := public.sn_admin_config('2026-10', null, '', null);
  perform pg_temp.confere(r->'descricao' = 'null'::jsonb and (r->>'destaque_inicio')::boolean, 'config: texto vazio apaga a descrição');
  r := public.sn_admin_config('2026-10', null, 'A primeira edição nova.', null);
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_config(''2026-10'', ''x'', null, null)') = 'titulo_invalido', 'config: título curto');
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_config(''2099-01'', null, null, null)') = 'edicao_invalida', 'config: edição inexistente');
  perform pg_temp.como(pg_temp.id('comum'));
  perform pg_temp.confere(pg_temp.erro('select public.sn_admin_config(''2026-10'', null, null, false)') = 'nao_admin', 'config: não-admin recusado');
  perform pg_temp.como(pg_temp.id('adm'));

  r := public.sn_admin_estatisticas('2026-10');
  perform pg_temp.confere(r ?& array['inscritos','participantes','entregas','no_tempo','media','por_area','mais_erradas'], 'estatísticas: formato');
  perform pg_temp.confere((r->>'inscritos')::int = 6, 'estatísticas: inscritos (os cinco que começaram e um só inscrito) ' || (r->>'inscritos'));
  perform pg_temp.confere((r->>'participantes')::int = 5 and (r->>'entregas')::int = 4 and (r->>'no_tempo')::int = 2, 'estatísticas: contagens (' || r::text || ')');
  perform pg_temp.confere(jsonb_array_length(r->'mais_erradas') between 1 and 10 and (r->'mais_erradas'->0) ?& array['id_questao','ordem','erros','total'], 'estatísticas: mais erradas');
  perform pg_temp.confere((select bool_and((a->>'erros')::int >= (b->>'erros')::int) from jsonb_array_elements(r->'mais_erradas') with ordinality x(a, n)
                           join jsonb_array_elements(r->'mais_erradas') with ordinality y(b, m) on m = n + 1), 'estatísticas: mais erradas em ordem');
  perform pg_temp.confere((r->'mais_erradas'->0->>'total')::int = 4, 'estatísticas: total = entregas');
  perform pg_temp.confere(jsonb_array_length(r->'por_area') = 3, 'estatísticas: por área');
end $$;

-- ---------------------------------------------------------------------------
-- 11. sn_obter: destaque, números, "minha" e outubro antigo nos anteriores
-- ---------------------------------------------------------------------------
do $$
declare
  ana uuid := pg_temp.id('ana'); edu uuid := pg_temp.id('edu');
  velho uuid := pg_temp.pessoa('Velho');
  r jsonb;
begin
  -- Quem fez o outubro antigo (tabelas simulado_*, semeado pela migração antiga).
  insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em, entregue_em, acertos, total, segundos, no_tempo)
  values ('2026-10', velho, now() - interval '5 days 1 hour', now() - interval '5 days', 33, 50, 3600, true);

  -- A mensal aberta é o destaque (a véspera não está publicada; 2026-08 também está aberta e é mais velha).
  perform pg_temp.como(null);
  r := public.sn_obter();
  perform pg_temp.confere(r ?& array['edicao','tipo','titulo','abre_em','fecha_em','duracao_min','total','por_area','participantes','tambem_no_ar','minha','anteriores','agora',
                                     'descricao','destaque_inicio','config','aberto_a_todos','inscritos','minha_inscricao'], 'obter: formato');
  perform pg_temp.confere(not (r->>'aberto_a_todos')::boolean, 'obter: aberto_a_todos');
  perform pg_temp.confere(r->>'edicao' in ('2026-10', '2026-08') and r->>'tipo' = 'mensal', 'obter: mensal aberta em destaque (' || (r->>'edicao') || ')');
  perform pg_temp.confere(r->>'edicao' = '2026-10', 'obter: entre duas mensais abertas, a mais recente');
  perform pg_temp.confere((select bool_or(t->>'edicao' = '2026-08') from jsonb_array_elements(r->'tambem_no_ar') t), 'obter: a outra aberta em "também no ar"');
  perform pg_temp.confere((r->>'total')::int = 12 and jsonb_array_length(r->'por_area') = 3 and (r->'por_area'->0) ?& array['area','n'], 'obter: total e por área');
  perform pg_temp.confere(r->'participantes' = 'null'::jsonb, 'obter: menos de 10 entregas, sem número');
  perform pg_temp.confere(r->'minha' = 'null'::jsonb, 'obter: visitante sem "minha"');
  perform pg_temp.confere(not exists (select 1 from jsonb_array_elements(r->'anteriores') a where a->>'edicao' = '2026-10-antiga'), 'obter: visitante sem outubro antigo');
  perform pg_temp.confere((select bool_or(a->>'edicao' = '2026-09') from jsonb_array_elements(r->'anteriores') a), 'obter: setembro encerrado nos anteriores');
  perform pg_temp.confere(not exists (select 1 from jsonb_array_elements(r->'anteriores') a where a->>'edicao' in ('2026-10', '2026-08', '2026-11-vespera-teot')), 'obter: anteriores só encerradas');
  perform pg_temp.confere((r->>'agora')::timestamptz = now(), 'obter: agora');
  perform pg_temp.confere(r->>'descricao' = 'A primeira edição nova.' and (r->>'destaque_inicio')::boolean, 'obter: descrição e destaque no início');
  perform pg_temp.confere(r->'config' = '{"provas":["TEOT","TARO","TEOT/TARO"],"cotas":{"Trauma adulto":4,"Joelho":4,"Coluna":4}}'::jsonb, 'obter: só a parte pública da config (' || (r->'config')::text || ')');

  -- A chamada da página inicial.
  r := public.sn_destaque_inicio();
  perform pg_temp.confere(r ?& array['edicao','titulo','tipo','abre_em','fecha_em','total','duracao_min','minha_situacao'] and r->>'edicao' = '2026-10', 'início: a edição em destaque ' || coalesce(r::text, 'nada'));
  perform pg_temp.confere(r->'minha_situacao' = 'null'::jsonb and (r->>'total')::int = 12, 'início: visitante sem situação');
  update public.sn_edicoes set destaque_inicio = false where edicao = '2026-10';
  perform pg_temp.confere(public.sn_destaque_inicio() is null, 'início: desligado pelo admin');
  update public.sn_edicoes set destaque_inicio = true where edicao = '2026-10';
  perform pg_temp.confere(not (r::text ~ 'gabarito'), 'obter: sem gabarito');

  perform pg_temp.como(velho);
  r := public.sn_obter();
  perform pg_temp.confere((select a->>'titulo' = 'Outubro de 2026 (versão anterior)' and a->>'tipo' = 'mensal'
                                  and (a->'minha'->>'acertos')::int = 33 and (a->'minha'->>'total')::int = 50 and (a->'minha'->>'no_tempo')::boolean
                           from jsonb_array_elements(r->'anteriores') a where a->>'edicao' = '2026-10-antiga'), 'obter: outubro antigo nos anteriores ' || (r->'anteriores')::text);
  perform pg_temp.confere(jsonb_array_length(r->'anteriores') <= 12, 'obter: até 12 anteriores');

  perform pg_temp.confere(not ((public.sn_destaque_inicio())->>'inscrito')::boolean, 'início: quem não se inscreveu');
  perform pg_temp.confere((public.sn_destaque_inicio()) ? 'inscrito', 'início: campo inscrito');
  perform pg_temp.como(edu);
  perform pg_temp.confere((public.sn_destaque_inicio())->>'minha_situacao' = 'andamento', 'início: em andamento');
  perform pg_temp.confere(((public.sn_destaque_inicio())->>'inscrito')::boolean, 'início: inscrito');
  perform pg_temp.como(ana);
  perform pg_temp.confere((public.sn_destaque_inicio())->>'minha_situacao' = 'entregue', 'início: entregue');
  perform pg_temp.como(edu);
  r := public.sn_obter();
  perform pg_temp.confere((r->'minha') ?& array['iniciado_em','prazo_em','entregue_em','acertos','total','segundos','no_tempo','respondidas'] and r->'minha'->'entregue_em' = 'null'::jsonb, 'obter: "minha" em andamento');
  perform pg_temp.confere(not exists (select 1 from jsonb_array_elements(r->'anteriores') a where a->>'edicao' = '2026-10-antiga'), 'obter: sem outubro antigo para quem não fez');
  perform pg_temp.como(ana);
  perform pg_temp.confere(((public.sn_obter('2026-10'))->'minha'->>'respondidas')::int = 12, 'obter: respondidas conta as marcadas');
  perform pg_temp.confere((public.sn_obter('2026-11-vespera-teot'))->'edicao' = 'null'::jsonb, 'obter: não publicada fica escondida');
  perform pg_temp.confere((public.sn_obter('2099-01'))->'edicao' = 'null'::jsonb, 'obter: inexistente');
  perform pg_temp.como(pg_temp.id('adm'));
  perform pg_temp.confere((public.sn_obter('2026-11-vespera-teot'))->>'edicao' = '2026-11-vespera-teot', 'obter: admin vê a não publicada');

  -- 10 entregas no tempo em 2026-08: aparece o número.
  perform pg_temp.confere(((public.sn_obter('2026-08'))->>'participantes')::int = 11, 'obter: número a partir de 10 (' || ((public.sn_obter('2026-08'))->>'participantes') || ')');
end $$;

-- A regra do destaque, cenário por cenário (as datas são mexidas e voltam no fim).
do $$
declare r jsonb;
begin
  perform pg_temp.como(null);
  -- Véspera aberta vence a mensal aberta.
  update public.sn_edicoes set publicado = true, abre_em = now() - interval '1 hour', fecha_em = now() + interval '1 day' where edicao = '2026-11-vespera-teot';
  r := public.sn_obter();
  perform pg_temp.confere(r->>'edicao' = '2026-11-vespera-teot' and r->>'tipo' = 'vespera', 'destaque: véspera aberta');
  perform pg_temp.confere((select bool_or(t->>'edicao' = '2026-10' and t->>'tipo' = 'mensal' and t ? 'titulo') from jsonb_array_elements(r->'tambem_no_ar') t), 'destaque: mensal em "também no ar"');
  -- Véspera publicada mas ainda fechada: a mensal aberta vence a próxima a abrir.
  update public.sn_edicoes set abre_em = now() + interval '2 days', fecha_em = now() + interval '3 days' where edicao = '2026-11-vespera-teot';
  r := public.sn_obter();
  perform pg_temp.confere(r->>'edicao' = '2026-10', 'destaque: mensal aberta vence a próxima');
  -- Nenhuma aberta: a próxima a abrir.
  update public.sn_edicoes set fecha_em = now() - interval '1 hour', abre_em = now() - interval '20 days' where edicao in ('2026-10', '2026-08');
  r := public.sn_obter();
  perform pg_temp.confere(r->>'edicao' = '2026-11-vespera-teot', 'destaque: a próxima a abrir');
  perform pg_temp.confere((public.sn_destaque_inicio())->>'edicao' = '2026-11-vespera-teot', 'início: abre em até 7 dias');
  update public.sn_edicoes set abre_em = now() + interval '8 days', fecha_em = now() + interval '9 days' where edicao = '2026-11-vespera-teot';
  perform pg_temp.confere(public.sn_destaque_inicio() is null, 'início: abre em mais de 7 dias, sem chamada');
  -- Nada aberto nem por abrir: a última encerrada.
  update public.sn_edicoes set publicado = false where edicao = '2026-11-vespera-teot';
  r := public.sn_obter();
  perform pg_temp.confere(r->>'edicao' in ('2026-10', '2026-08'), 'destaque: a última encerrada (' || (r->>'edicao') || ')');
  update public.sn_edicoes set fecha_em = now() - interval '2 hours' where edicao = '2026-08';
  perform pg_temp.confere((public.sn_obter())->>'edicao' = '2026-10', 'destaque: a que fechou por último');
  perform pg_temp.como(pg_temp.id('bia'));
  perform pg_temp.confere(((public.sn_resultado('2026-10'))->>'encerrada')::boolean, 'resultado: encerrada');
  perform pg_temp.confere((public.sn_destaque_inicio()) is null, 'início: nada aberto nem perto de abrir, sem chamada');
  -- Desfaz as datas mexidas (o contador também volta; por isso a conferência vai no handler).
  raise exception using errcode = 'P0099', message = 'desfazer';
exception when sqlstate 'P0099' then
  perform pg_temp.confere(true, 'destaque: cenários conferidos');
end $$;

-- Sem nenhuma edição publicada.
do $$
declare r jsonb;
begin
  update public.sn_edicoes set publicado = false;
  r := public.sn_obter();
  perform pg_temp.confere(r->'edicao' = 'null'::jsonb and r ? 'anteriores' and r ? 'agora', 'obter: sem edição publicada');
  update public.sn_edicoes set publicado = true where edicao in ('2026-10', '2026-08', '2026-09');
  update public.sn_edicoes set abre_em = now() - interval '1 day', fecha_em = now() + interval '5 days' where edicao in ('2026-10', '2026-08');
end $$;

-- ---------------------------------------------------------------------------
-- 12. autorizar_resposta: a prova aberta não gasta o limite grátis
-- ---------------------------------------------------------------------------
do $$
declare
  gui uuid := pg_temp.pessoa('Gui');
  r record;
begin
  update public.configuracao_comercial set paywall_ativo = true, limite_diario_gratis = 1;
  perform pg_temp.assinar(gui);
  perform pg_temp.como(gui);
  perform public.sn_iniciar('2026-10');
  perform pg_temp.desassinar(gui);   -- perdeu o plano no meio da prova (ou o site está em promoção)

  select * into r from public.autorizar_resposta(gen_random_uuid(), 'avulsa-0001');
  perform pg_temp.confere(r.permitido and not r.ilimitado, 'autorizar: questão avulsa gasta a cota');
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'avulsa-0002');
  perform pg_temp.confere(not r.permitido, 'autorizar: cota esgotada');
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'q-0003');
  perform pg_temp.confere(r.permitido and r.ilimitado, 'autorizar: questão da prova aberta não gasta');
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'r3:q-0004');
  perform pg_temp.confere(r.permitido and r.ilimitado, 'autorizar: com prefixo de rodada');
  update public.sn_participacoes set prazo_em = now() - interval '29 minutes' where usuario_id = gui;
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'q-0003');
  perform pg_temp.confere(r.permitido, 'autorizar: até 30 min depois do prazo');
  update public.sn_participacoes set prazo_em = now() - interval '31 minutes' where usuario_id = gui;
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'q-0003');
  perform pg_temp.confere(not r.permitido, 'autorizar: passou de 30 min, volta a contar');
  update public.sn_participacoes set prazo_em = now() + interval '30 minutes', entregue_em = now() where usuario_id = gui;
  select * into r from public.autorizar_resposta(gen_random_uuid(), 'q-0003');
  perform pg_temp.confere(not r.permitido, 'autorizar: entregue, volta a contar');
  -- O caso antigo continua: participação aberta no outubro antigo.
  insert into public.simulado_participacoes (edicao, usuario_id, iniciado_em) values ('2026-10', gui, now());
  select * into r from public.autorizar_resposta(gen_random_uuid(), (select id_questao from public.simulado_itens where edicao = '2026-10' order by ordem limit 1));
  perform pg_temp.confere(r.permitido and r.ilimitado, 'autorizar: o simulado antigo continua isento');
  update public.configuracao_comercial set paywall_ativo = false, limite_diario_gratis = 20;
end $$;

-- ---------------------------------------------------------------------------
-- 13. meus_feitos e 14. candidatos_simulado_resultado
-- ---------------------------------------------------------------------------
do $$
declare
  hel uuid := pg_temp.id('helena'); joa uuid := pg_temp.id('joana'); velho uuid;
  r jsonb; v_sp jsonb;
begin
  perform pg_temp.como(hel);
  r := public.meus_feitos();
  perform pg_temp.confere(r->'simulado_edicoes' @> '["2026-08", "2026-10", "2026-09"]'::jsonb, 'feitos: edições mensais novas ' || (r->'simulado_edicoes')::text);
  perform pg_temp.confere(not (r->'simulado_edicoes' @> '["2026-11-vespera-teot"]'::jsonb), 'feitos: véspera não conta');
  perform pg_temp.confere((select count(*) from jsonb_array_elements_text(r->'simulado_edicoes') e where e = '2026-10') = 1, 'feitos: outubro uma vez só');
  v_sp := (select p from jsonb_array_elements(r->'simulado_participacoes') p where p->>'edicao' = '2026-08');
  perform pg_temp.confere((v_sp->>'posicao')::int = 2 and (v_sp->>'classificados')::int = 10, 'feitos: posição na nova ' || coalesce(v_sp::text, 'nada'));
  perform pg_temp.como(joa);
  perform pg_temp.confere(not exists (select 1 from jsonb_array_elements((public.meus_feitos())->'simulado_participacoes') p where p->>'edicao' = '2026-08'), 'feitos: fora do tempo não conta');
  -- Quem fez o outubro antigo continua com ele.
  select usuario_id into velho from public.simulado_participacoes where edicao = '2026-10' and acertos = 33;
  perform pg_temp.como(velho);
  perform pg_temp.confere(exists (select 1 from jsonb_array_elements((public.meus_feitos())->'simulado_participacoes') p where p->>'edicao' = '2026-10'), 'feitos: o antigo continua');
  perform pg_temp.confere((select count(*) from jsonb_array_elements((public.meus_feitos())->'simulado_participacoes') p where p->>'edicao' = '2026-10') = 1, 'feitos: uma linha por edição');

  -- Candidatos: 2026-08 fechou ontem.
  update public.sn_edicoes set fecha_em = now() - interval '1 day', abre_em = now() - interval '20 days' where edicao = '2026-08';
  perform pg_temp.confere(exists (select 1 from public.candidatos_simulado_resultado(80) c where c.id_usuario = hel and c.referencia = 'simulado_resultado:2026-08'
                                  and (c.dados->>'acertos')::int = 11 and (c.dados->>'total')::int = 12 and (c.dados->>'posicao')::int = 2
                                  and (c.dados->>'participantes')::int = 10 and c.dados->>'titulo' = 'Simulado Nacional · Agosto de 2026'), 'candidatos: lê sn_participacoes');
  perform pg_temp.confere(exists (select 1 from public.candidatos_simulado_resultado(80) c where c.id_usuario = joa and c.dados->'posicao' = 'null'::jsonb), 'candidatos: fora do tempo sem posição');
  perform pg_temp.desassinar(hel);
  perform pg_temp.confere(exists (select 1 from public.candidatos_simulado_resultado(80) c where c.id_usuario = hel and c.dados->'posicao' = 'null'::jsonb), 'candidatos: sem plano sem posição');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_resultado(80) c where c.referencia = 'simulado_resultado:2026-10'), 'candidatos: aberta não entra');
  perform pg_temp.confere(pg_get_function_result('public.candidatos_simulado_resultado(integer)'::regprocedure) = 'TABLE(id_usuario uuid, referencia text, dados jsonb)', 'candidatos: mesma assinatura');
  perform pg_temp.confere(not has_function_privilege('authenticated', 'public.candidatos_simulado_resultado(integer)', 'execute') and has_function_privilege('service_role', 'public.candidatos_simulado_resultado(integer)', 'execute'), 'candidatos: permissões');
  update public.sn_edicoes set publicado = false where edicao = '2026-08';
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_resultado(80) c where c.referencia = 'simulado_resultado:2026-08'), 'candidatos: não publicada não entra');
end $$;

-- ---------------------------------------------------------------------------
-- 15. Edição aberta a todos (sem o plano)
-- ---------------------------------------------------------------------------
do $$
declare
  livre uuid := pg_temp.pessoa('Livre', 'Silva'); outra uuid := pg_temp.pessoa('Outra');
  r jsonb;
begin
  insert into pg_temp.ids values ('livre', livre);
  perform pg_temp.como(pg_temp.id('adm'));
  r := public.sn_admin_config('2026-10', null, null, null, true);
  perform pg_temp.confere((r->>'aberto_a_todos')::boolean, 'config: abre a edição a todos');
  perform pg_temp.como(livre);
  perform pg_temp.confere(((public.sn_obter('2026-10'))->>'aberto_a_todos')::boolean, 'obter: aberto a todos');
  r := public.sn_iniciar('2026-10');
  perform pg_temp.confere(r->>'edicao' = '2026-10', 'aberto a todos: começa sem o plano');
  r := public.sn_entregar('2026-10', pg_temp.respostas('2026-10', 12));
  r := public.sn_resultado('2026-10');
  perform pg_temp.confere((r->>'posicao')::int = 1 and (r->>'percentil')::int = 100 and jsonb_array_length(r->'por_area') = 3, 'aberto a todos: posição e áreas sem o plano (' || r::text || ')');
  perform pg_temp.como(pg_temp.id('adm'));
  r := public.sn_admin_config('2026-10', null, null, null, false);
  perform pg_temp.como(outra);
  perform pg_temp.confere(pg_temp.erro('select public.sn_iniciar(''2026-10'')') = 'premium_necessario', 'fechado de novo: exige o plano');
  perform pg_temp.como(livre);
  perform pg_temp.confere((public.sn_resultado('2026-10'))->'posicao' = 'null'::jsonb, 'fechado de novo: sem posição para quem não assina');
  -- sn_admin_salvar também grava o aberto_a_todos.
  perform pg_temp.como(pg_temp.id('adm'));
  r := public.sn_admin_salvar('2026-12', 'mensal', 'Simulado Nacional · Dezembro de 2026', now() + interval '12 hours', now() + interval '20 days', 120, pg_temp.itens(10, 'd'), true,
                              null, true, '{}', true);
  perform pg_temp.confere((r->>'aberto_a_todos')::boolean, 'salvar: aberto a todos');
end $$;

-- ---------------------------------------------------------------------------
-- 16. Lembrete por e-mail (candidatos_simulado_lembrete)
-- ---------------------------------------------------------------------------
do $$
declare
  x uuid := pg_temp.pessoa('Xavier'); z uuid := pg_temp.pessoa('Zilda'); w uuid := pg_temp.pessoa('Wagner'); v uuid := pg_temp.pessoa('Vera');
  adm uuid := pg_temp.id('adm');
  c record; n integer;
begin
  perform pg_temp.como(adm);
  -- 2026-12 abre em 12 h (criada acima); 2027-01 abriu há 2 h; 2027-02 abriu há 30 h; 2027-03 abre em 12 h, sem publicar.
  perform public.sn_admin_salvar('2027-01', 'mensal', 'Simulado Nacional · Janeiro de 2027', now() - interval '2 hours', now() + interval '20 days', 120, pg_temp.itens(10, 'j'), true);
  perform public.sn_admin_salvar('2027-02', 'mensal', 'Simulado Nacional · Fevereiro de 2027', now() - interval '30 hours', now() + interval '20 days', 120, pg_temp.itens(10, 'f'), true);
  perform public.sn_admin_salvar('2027-03', 'mensal', 'Simulado Nacional · Março de 2027', now() + interval '1 hour', now() + interval '20 days', 120, pg_temp.itens(10, 'm'), true);
  perform pg_temp.como(x); perform public.sn_inscrever('2026-12'); perform public.sn_inscrever('2027-02'); perform public.sn_inscrever('2027-03');
  perform pg_temp.como(z); perform public.sn_inscrever('2027-01');
  perform pg_temp.assinar(w); perform pg_temp.como(w); perform public.sn_inscrever('2027-01'); perform public.sn_iniciar('2027-01');
  perform pg_temp.como(adm); perform public.sn_inscrever('2026-12');
  perform pg_temp.como(v); perform public.sn_inscrever('2026-12');
  insert into public.preferencias_email (id_usuario, cartas) values (v, false) on conflict (id_usuario) do update set cartas = false;
  perform pg_temp.como(pg_temp.id('adm'));
  perform public.sn_admin_publicar('2027-03', false);

  select * into c from public.candidatos_simulado_lembrete(80) k where k.id_usuario = x and k.referencia = 'simulado_lembrete:2026-12';
  perform pg_temp.confere(c.dados->>'tipo_lembrete' = 'abre_amanha' and c.dados->>'titulo' = 'Simulado Nacional · Dezembro de 2026'
                          and (c.dados->>'total')::int = 10 and (c.dados->>'duracao_min')::int = 120 and c.dados ? 'abre_em' and c.dados ? 'fecha_em', 'lembrete: abre amanhã ' || coalesce(c.dados::text, 'nada'));
  perform pg_temp.confere(not (c.dados->>'precisa_plano')::boolean, 'lembrete: edição aberta a todos não pede o plano');
  select * into c from public.candidatos_simulado_lembrete(80) k where k.id_usuario = z;
  perform pg_temp.confere(c.referencia = 'simulado_lembrete:2027-01' and c.dados->>'tipo_lembrete' = 'abriu_hoje' and (c.dados->>'precisa_plano')::boolean, 'lembrete: abriu hoje, sem plano');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.id_usuario = w), 'lembrete: quem já começou fica de fora');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.referencia = 'simulado_lembrete:2027-02'), 'lembrete: abriu há mais de 24 h');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.referencia = 'simulado_lembrete:2027-03'), 'lembrete: não publicada');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.id_usuario = adm), 'lembrete: administrador fica de fora');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.id_usuario = v), 'lembrete: quem desligou as cartas fica de fora');
  -- Já recebeu (o envio registrado) ou já marcado: não volta.
  insert into public.emails_enviados (id_usuario, tipo, modelo, referencia, status, enviado_em) values (z, 'carta', 'simulado_lembrete', 'simulado_lembrete:2027-01', 'enviado', now() - interval '3 days');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.id_usuario = z), 'lembrete: a mesma referência já saiu');
  perform pg_temp.confere(public.sn_marcar_lembrete('2026-12', x), 'marcar: marca');
  perform pg_temp.confere((select lembrete_enviado_em is not null from public.sn_inscricoes where usuario_id = x and edicao = '2026-12'), 'marcar: grava a hora');
  perform pg_temp.confere(not exists (select 1 from public.candidatos_simulado_lembrete(80) k where k.id_usuario = x), 'lembrete: marcado não volta');
  perform pg_temp.confere(not public.sn_marcar_lembrete('2026-12', z), 'marcar: sem inscrição devolve falso');
  select count(*) into n from public.candidatos_simulado_lembrete(1);
  perform pg_temp.confere(n <= 1, 'lembrete: respeita o limite');
end $$;

select format('parte 32: %s conferências ok', n) as resultado from pg_temp.conferencias;
