-- Credencial exclusiva para o processador. Não depende do segredo legado dos relatórios.
begin;
create or replace function public.hub_autenticar_processador(p_segredo text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(p_segredo ~ '^[a-f0-9]{64}$' and exists(
    select 1 from cron.job j where j.jobname='email-hub-processar' and j.active
      and sha256(convert_to(p_segredo,'UTF8')) = sha256(convert_to(
        substring(j.command from '"x-segredo"\s*:\s*"([a-f0-9]{64})"'),'UTF8'))
  ),false);
$$;
revoke all on function public.hub_autenticar_processador(text) from public,anon,authenticated;
grant execute on function public.hub_autenticar_processador(text) to service_role;

do $$
declare v_url text; v_chave text; v_comando text;
begin
  select substring(command from 'url\s*:=\s*''([^'']+)''') into v_url
    from cron.job where jobname='email-hub-processar';
  if v_url is null or v_url not like 'https://%.supabase.co/functions/v1/hub-emails' then
    raise exception 'Agendamento original do hub ausente ou URL inválida';
  end if;
  v_chave:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  v_comando:=format('select net.http_post(url:=%L,headers:=%L::jsonb,body:=%L::jsonb);',
    v_url,jsonb_build_object('Content-Type','application/json','x-segredo',v_chave)::text,
    jsonb_build_object('acao','processar')::text);
  perform cron.schedule('email-hub-processar','* * * * *',v_comando);
end $$;
commit;
