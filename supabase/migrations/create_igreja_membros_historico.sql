create table if not exists public.igreja_membros_historico(
 id uuid primary key default gen_random_uuid(),
 membro_id uuid null references public.igreja_membros(id) on delete set null,
 membro_nome text not null,
 acao text not null default 'ALTERAÇÃO',
 campo text not null,
 campo_label text not null,
 valor_anterior jsonb null,
 valor_novo jsonb null,
 valor_anterior_texto text null,
 valor_novo_texto text null,
 alterado_em timestamptz not null default now(),
 alterado_por uuid null references auth.users(id) on delete set null
);

create index if not exists idx_igreja_membros_historico_membro on public.igreja_membros_historico(membro_id);
create index if not exists idx_igreja_membros_historico_data on public.igreja_membros_historico(alterado_em desc);
create index if not exists idx_igreja_membros_historico_usuario on public.igreja_membros_historico(alterado_por);

alter table public.igreja_membros_historico enable row level security;

drop policy if exists "Historico membros - leitura autenticada" on public.igreja_membros_historico;
create policy "Historico membros - leitura autenticada"
on public.igreja_membros_historico
for select
to authenticated
using(true);

create or replace function public.fn_igreja_historico_campo_label(p_campo text)
returns text
language plpgsql
immutable
as $$
begin
 return case p_campo
  when 'nome_completo' then 'Nome completo'
  when 'data_nascimento' then 'Data de nascimento'
  when 'estado_civil' then 'Estado civil'
  when 'data_entrada' then 'Data de entrada'
  when 'classe_id' then 'Classe da EBD'
  when 'funcoes_exercidas' then 'Função exercida'
  when 'cargo_id' then 'Cargo ministerial'
  when 'participa_conjunto' then 'Participa de conjunto'
  when 'conjunto_id' then 'Conjunto'
  when 'is_dirigente' then 'É dirigente'
  when 'dirige_conjunto_id' then 'Conjunto que dirige'
  when 'is_batizado_aguas' then 'Batizado nas águas'
  when 'is_batizado_espirito' then 'Batizado no Espírito Santo'
  when 'status' then 'Status'
  else replace(initcap(replace(p_campo,'_',' ')),'Id','ID')
 end;
end;
$$;

create or replace function public.fn_igreja_historico_valor_texto(
 p_campo text,
 p_valor jsonb
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
 v_id uuid;
 v_texto text;
begin
 if p_valor is null or p_valor = 'null'::jsonb then
  return 'Não informado';
 end if;

 if p_campo='cargo_id' then
  begin
   v_id := trim(both '"' from p_valor::text)::uuid;
   select nome_cargo into v_texto from public.cargos_igreja where id=v_id limit 1;
   return coalesce(v_texto,v_id::text,'Não informado');
  exception when others then
   return trim(both '"' from p_valor::text);
  end;
 end if;

 if p_campo='classe_id' then
  begin
   v_id := trim(both '"' from p_valor::text)::uuid;
   select nome_classe into v_texto from public.igreja_classes where id=v_id limit 1;
   return coalesce(v_texto,v_id::text,'Não informado');
  exception when others then
   return trim(both '"' from p_valor::text);
  end;
 end if;

 if p_campo in('conjunto_id','dirige_conjunto_id') then
  begin
   v_id := trim(both '"' from p_valor::text)::uuid;
   select nome_conjunto into v_texto from public.igreja_conjuntos where id=v_id limit 1;
   return coalesce(v_texto,v_id::text,'Não informado');
  exception when others then
   return trim(both '"' from p_valor::text);
  end;
 end if;

 if p_campo in('participa_conjunto','is_dirigente','is_batizado_aguas','is_batizado_espirito') then
  return case when lower(trim(both '"' from p_valor::text))='true' then 'Sim' else 'Não' end;
 end if;

 if jsonb_typeof(p_valor)='array' then
  return p_valor::text;
 end if;

 if jsonb_typeof(p_valor)='object' then
  return p_valor::text;
 end if;

 v_texto:=trim(both '"' from p_valor::text);
 return case
  when v_texto='' then 'Não informado'
  else v_texto
 end;
end;
$$;

create or replace function public.fn_registrar_historico_igreja_membros()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
 v_old jsonb;
 v_new jsonb;
 v_campo text;
 v_anterior jsonb;
 v_novo jsonb;
 v_nome text;
 v_usuario uuid;
begin
 v_usuario:=coalesce(auth.uid(),nullif(coalesce(NEW.user_id,OLD.user_id)::text,'')::uuid);

 if TG_OP='INSERT' then
  v_nome:=coalesce(NEW.nome_completo,'Membro');
  insert into public.igreja_membros_historico(
   membro_id,membro_nome,acao,campo,campo_label,valor_anterior,valor_novo,
   valor_anterior_texto,valor_novo_texto,alterado_em,alterado_por
  )
  values(
   NEW.id,v_nome,'CADASTRO','cadastro','Cadastro do membro',null,
   to_jsonb(NEW),'Não informado','Membro cadastrado',now(),v_usuario
  );
  return NEW;
 end if;

 if TG_OP='DELETE' then
  v_nome:=coalesce(OLD.nome_completo,'Membro');
  insert into public.igreja_membros_historico(
   membro_id,membro_nome,acao,campo,campo_label,valor_anterior,valor_novo,
   valor_anterior_texto,valor_novo_texto,alterado_em,alterado_por
  )
  values(
   OLD.id,v_nome,'EXCLUSÃO','cadastro','Cadastro do membro',
   to_jsonb(OLD),null,'Membro existente','Membro excluído',now(),v_usuario
  );
  return OLD;
 end if;

 v_old:=to_jsonb(OLD);
 v_new:=to_jsonb(NEW);
 v_nome:=coalesce(NEW.nome_completo,OLD.nome_completo,'Membro');

 for v_campo in
  select key
  from jsonb_object_keys(v_old||v_new) as key
  where key not in('id','user_id','funcoes_multiplas','created_at','updated_at')
 loop
  v_anterior:=v_old->v_campo;
  v_novo:=v_new->v_campo;

  if v_anterior is distinct from v_novo then
   insert into public.igreja_membros_historico(
    membro_id,membro_nome,acao,campo,campo_label,
    valor_anterior,valor_novo,
    valor_anterior_texto,valor_novo_texto,
    alterado_em,alterado_por
   )
   values(
    NEW.id,
    v_nome,
    'ALTERAÇÃO',
    v_campo,
    public.fn_igreja_historico_campo_label(v_campo),
    v_anterior,
    v_novo,
    public.fn_igreja_historico_valor_texto(v_campo,v_anterior),
    public.fn_igreja_historico_valor_texto(v_campo,v_novo),
    now(),
    v_usuario
   );
  end if;
 end loop;

 return NEW;
end;
$$;

drop trigger if exists trg_igreja_membros_historico on public.igreja_membros;

create trigger trg_igreja_membros_historico
after insert or update or delete
on public.igreja_membros
for each row
execute function public.fn_registrar_historico_igreja_membros();
