-- Parte 17: troca 4 questões do Simulado Nacional de outubro.
-- Rode depois das partes 1 a 16. Cole TUDO no SQL Editor do Supabase e clique em Run.
-- Simulado Nacional 2026-10: troca 4 itens retirados do acervo (12/10/2026, pedido do dono).
--
-- As questões mao-0372, ombro-cotovelo-0289, pe-tornozelo-0157 e pe-tornozelo-0215
-- eram cópias de um simulado de outro curso e saíram do site. Cada uma dá lugar a
-- uma questão oficial da mesma área, na mesma posição da edição. Quem já entregou
-- mantém o resultado gravado; quem está fazendo vê a questão nova ao abrir de novo.
--
-- Pode ser rodada de novo: depois da primeira vez os ids antigos não existem mais.
begin;

update public.simulado_itens set id_questao = 'mao-0304', gabarito = 'A'
 where edicao = '2026-10' and id_questao = 'mao-0372';
update public.simulado_itens set id_questao = 'ombro-cotovelo-0128', gabarito = 'D'
 where edicao = '2026-10' and id_questao = 'ombro-cotovelo-0289';
update public.simulado_itens set id_questao = 'pe-tornozelo-0073', gabarito = 'D'
 where edicao = '2026-10' and id_questao = 'pe-tornozelo-0157';
update public.simulado_itens set id_questao = 'pe-tornozelo-0023', gabarito = 'D'
 where edicao = '2026-10' and id_questao = 'pe-tornozelo-0215';

commit;
