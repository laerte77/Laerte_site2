# Barbearia Brothers - Database Setup Guide

Este guia detalha como configurar as tabelas necessárias no Supabase para o funcionamento do módulo Barbearia Brothers.

## Método 1: Via SQL Editor no Supabase (Recomendado)

1. Acesse o painel do [Supabase](https://supabase.com).
2. Selecione o seu projeto.
3. No menu lateral esquerdo, clique em **SQL Editor**.
4. Clique em **New Query**.
5. Copie e cole todo o conteúdo do arquivo `supabase/migrations/create_barbearia_tables.sql`.
6. Clique no botão **Run** no canto inferior direito para criar as tabelas.
7. Crie uma nova query (New Query).
8. Copie e cole o conteúdo do arquivo `supabase/migrations/add_barbearia_rls_policies.sql`.
9. Clique em **Run** para aplicar as políticas de segurança (RLS).

## Método 2: Via Supabase CLI

Se você tiver a CLI do Supabase instalada localmente:
1. Faça login: `npx supabase login`
2. Vincule o projeto: `npx supabase link --project-ref <seu-project-ref>`
3. Aplique as migrações: `npx supabase db push`

## Verificação e Teste

1. No seu aplicativo, acesse a rota secreta de depuração: `[SUA_URL]/barbearia/debug/database-test`
2. Clique no botão **"Testar Todas as Tabelas"**.
3. Verifique se o status de todas as 7 tabelas aparece como "🟢 Operacional".
4. Caso alguma tabela falhe, anote o código de erro.

## Solução de Problemas Comuns

### Erro PGRST205 (Table Not Found)
**Causa:** A tabela não existe no banco de dados.
**Solução:** Volte ao SQL Editor no Supabase e certifique-se de que rodou o script de criação das tabelas corretamente.

### Erro 401 ou 403 (Unauthorized / Forbidden)
**Causa:** Políticas RLS (Row Level Security) não foram aplicadas ou estão bloqueando o acesso.
**Solução:** Execute o script `add_barbearia_rls_policies.sql` no SQL Editor. Verifique se você está logado no sistema ao tentar testar.

### Checklist de Verificação
- [ ] Tabela `barbearia_clientes` criada?
- [ ] Tabela `barbearia_produtos` criada?
- [ ] Tabela `barbearia_servicos` criada?
- [ ] Tabela `barbearia_tipos_corte` criada?
- [ ] Tabela `barbearia_tipos_despesa` criada?
- [ ] Tabela `barbearia_barbeiros` criada?
- [ ] Tabela `barbearia_tipos_planos` criada?
- [ ] RLS ativado em todas as tabelas?
- [ ] Políticas (Policies) de acesso adicionadas para usuários autenticados?