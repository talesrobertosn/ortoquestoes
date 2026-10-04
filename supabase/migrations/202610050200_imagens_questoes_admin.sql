-- Correção do envio de imagens pelo editor de questões.
-- As regras do bucket "questoes" consultavam a tabela administradores
-- diretamente, e o usuário logado não pode ler essa tabela ("permission denied
-- for table administradores"). Passam a usar eh_administrador(), que roda com
-- permissão própria. Pode rodar de novo sem erro.

drop policy if exists "questoes: admin envia" on storage.objects;
create policy "questoes: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'questoes' and (select public.eh_administrador()));

drop policy if exists "questoes: admin altera" on storage.objects;
create policy "questoes: admin altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'questoes' and (select public.eh_administrador()));

drop policy if exists "questoes: admin apaga" on storage.objects;
create policy "questoes: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'questoes' and (select public.eh_administrador()));
