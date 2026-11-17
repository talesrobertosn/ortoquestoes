begin;
-- O lote pode trabalhar por 40 s. O timeout HTTP antigo de 5 s interrompia a leitura
-- do retorno (inclusive na resolução DNS). Preserva ação, horário e credenciais.
do $$ declare n text;c text;h text;begin
 foreach n in array array['relatorio-mensal','resumo-quinzenal'] loop
  select command,schedule into c,h from cron.job where jobname=n;
  if c is null then raise exception 'Agendamento ausente: %',n;end if;
  if c not like '%timeout_milliseconds%' then
   c:=regexp_replace(c,'\);\s*$' ,', timeout_milliseconds:=60000);');
   if c not like '%timeout_milliseconds:=60000%' then raise exception 'Formato de agendamento inesperado';end if;
   perform cron.schedule(n,h,c);
  end if;
 end loop;
end $$;
commit;
