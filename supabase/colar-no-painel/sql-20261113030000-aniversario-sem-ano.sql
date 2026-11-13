-- Aniversário só com dia e mês (13/11/2026, Termos de Uso, item 17.2): o ano de nascimento deixa de ser pedido e
-- guardado. O site passa a gravar "0000-MM-DD"; aqui, o ano das datas já cadastradas vira "0000". O formato
-- continua o mesmo ("AAAA-MM-DD"), por isso o e-mail de aniversário (candidatos_aniversario), o aviso de parabéns
-- do site e a ficha do administrador seguem funcionando sem outra mudança (a idade deixa de aparecer).
update auth.users
set raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{nascimento}',
  to_jsonb('0000-' || substr(raw_user_meta_data->>'nascimento', 6, 5))
)
where (raw_user_meta_data->>'nascimento') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  and (raw_user_meta_data->>'nascimento') not like '0000-%';

-- Datas incompletas ou fora do formato deixam de ser guardadas.
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'nascimento'
where raw_user_meta_data ? 'nascimento'
  and coalesce(raw_user_meta_data->>'nascimento', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
