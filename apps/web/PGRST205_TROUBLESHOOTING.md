# Guia de Solução de Problemas: Erro PGRST205

## O que é o erro PGRST205?
O erro `PGRST205` é retornado pela API PostgREST do Supabase. Ele significa **"Table or View not found"** (Tabela ou View não encontrada).

Isso ocorre quando a sua aplicação frontend tenta fazer uma requisição (SELECT, INSERT, UPDATE, DELETE) para uma tabela que não existe no esquema `public` do banco de dados PostgreSQL.

## Causas Comuns
1. **Esquecimento da Migração:** O banco de dados foi criado, mas os scripts SQL de criação de tabelas nunca foram executados.
2. **Erro de Digitação no Código:** O nome da tabela no código JavaScript (`supabase.from('nome_errado')`) está diferente do nome real no banco.
3. **Restrições de Cache do Supabase:** Às vezes a tabela foi recém-criada e o PostgREST precisa de um recarregamento (Schema Cache).

## Passo a Passo para Resolução

### Passo 1: Verificar se as tabelas existem no Supabase
1. Acesse o [Dashboard do Supabase](https://supabase.com).
2. Vá para o projeto desejado.
3. No menu esquerdo, clique em **Table Editor**.
4. Procure pelas tabelas (ex: `barbearia_clientes`, `barbearia_produtos`, etc.).
5. **Se elas não estiverem lá:** Você precisa rodar o script SQL de criação. Vá em **SQL Editor** -> **New Query** -> Cole o script `create_barbearia_tables.sql` -> clique em **Run**.

### Passo 2: Recarregar o Schema Cache (Se a tabela já existe)
Se a tabela aparece no "Table Editor" mas o erro PGRST205 persiste:
1. No Dashboard do Supabase, clique em **Project Settings** (engrenagem).
2. Vá em **API**.
3. Desça até a seção "PostgREST".
4. Clique em **Reload Schema Cache**.
5. Atualize a página da sua aplicação e tente novamente.

### Passo 3: Verificar permissões e RLS
Se o erro mudar de `PGRST205` para algo como `401 Unauthorized` ou se retornar um array vazio `[]` mesmo havendo dados:
1. O problema agora é o **RLS (Row Level Security)**.
2. As tabelas no Supabase vêm com RLS ativado por padrão em projetos novos ou se você ativou manualmente.
3. Vá no SQL Editor e execute o script de políticas de segurança (`add_barbearia_rls_policies.sql`).
4. Verifique também se a aplicação frontend está enviando o token de autenticação (se o usuário fez login).

## Links Úteis
- [Documentação Oficial Supabase - PostgREST Errors](https://postgrest.org/en/stable/errors.html)
- [Documentação Supabase - Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)