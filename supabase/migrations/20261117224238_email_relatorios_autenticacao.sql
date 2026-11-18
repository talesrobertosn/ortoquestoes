begin;

-- Credencial de cada relatório limitada à própria ação. Somente o servidor pode validar.
create or replace function public.email_autenticar_relatorio(p_segredo text,p_acao text)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(p_segredo ~ '^[a-f0-9]{64}$' and exists(
    select 1 from cron.job j where j.active
      and j.jobname=case p_acao when 'relatorios_mensais' then 'relatorio-mensal'
        when 'relatorios_quinzenais' then 'resumo-quinzenal' else null end
      and sha256(convert_to(p_segredo,'UTF8'))=sha256(convert_to(
        substring(j.command from '"x-segredo"\s*:\s*"([a-f0-9]{64})"'),'UTF8'))
  ),false);
$$;
revoke all on function public.email_autenticar_relatorio(text,text) from public,anon,authenticated;
grant execute on function public.email_autenticar_relatorio(text,text) to service_role;

-- Mantém horários e limites existentes. Rotaciona apenas as credenciais que estavam
-- divergindo do segredo da Function (403), sem gravá-las em arquivos do projeto.
do $$
declare v_nome text; v_acao text; v_horario text; v_url text; v_chave text; v_comando text;
begin
  foreach v_nome in array array['relatorio-mensal','resumo-quinzenal'] loop
    select schedule,substring(command from 'url\s*:=\s*''([^'']+)''')
      into v_horario,v_url from cron.job where jobname=v_nome;
    if v_url is null or v_url not like 'https://%.supabase.co/functions/v1/enviar-email' then
      raise exception 'Agendamento de relatório ausente ou URL inválida: %',v_nome;
    end if;
    v_acao:=case v_nome when 'relatorio-mensal' then 'relatorios_mensais' else 'relatorios_quinzenais' end;
    v_chave:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
    v_comando:=format('select net.http_post(url:=%L,headers:=%L::jsonb,body:=%L::jsonb);',
      v_url,jsonb_build_object('Content-Type','application/json','x-segredo',v_chave)::text,
      jsonb_build_object('acao',v_acao,'limite',80)::text);
    perform cron.schedule(v_nome,v_horario,v_comando);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
