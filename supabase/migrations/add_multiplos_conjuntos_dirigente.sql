alter table public.igreja_membros
add column if not exists dirige_conjuntos_multiplos jsonb;

create index if not exists idx_igreja_membros_dirige_conjuntos_multiplos
on public.igreja_membros using gin(dirige_conjuntos_multiplos);

update public.igreja_membros
set dirige_conjuntos_multiplos=jsonb_build_object(
 'quantidade',1,
 'conjuntos_ids',jsonb_build_array(dirige_conjunto_id)
)
where is_dirigente=true
and dirige_conjunto_id is not null
and (dirige_conjuntos_multiplos is null or dirige_conjuntos_multiplos='null'::jsonb);
