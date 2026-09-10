# Database Setup Checklist & Guide

Este guia contém as instruções para configurar corretamente o banco de dados (Supabase) para todos os módulos da aplicação, focado nas exigências de RLS (Row Level Security) e tabelas associadas ao `user_id`.

## 1. Módulo Barbearia Brothers

A Barbearia Brothers necessita de 7 tabelas. Se você estiver recebendo o erro `PGRST205` ou `Tabela não encontrada`, certifique-se de executar as migrações.

### 1.1 Criar as tabelas (SQL Editor no Supabase)
Copie e cole o conteúdo do arquivo `supabase/migrations/create_barbearia_complete_tables.sql` no SQL Editor do Supabase e clique em "Run".

Isso criará as tabelas:
- `barbearia_clientes`
- `barbearia_produtos`
- `barbearia_servicos`
- `barbearia_tipos_corte`
- `barbearia_tipos_despesa`
- `barbearia_barbeiros`
- `barbearia_tipos_planos`

### 1.2 Verificação e Testes
1. Navegue até a tela **"Diagnóstico do Banco"** no dashboard da Barbearia (`/barbearia/debug/database-test`).
2. Clique no botão **"1. Verificar Tabelas"**. Todas devem retornar "Tabela Existe".
3. **ATENÇÃO:** Você *precisa* estar logado na aplicação. Se não estiver, os próximos passos falharão por causa da segurança (RLS).
4. Clique em **"2. Testar CRUD/RLS"**. O sistema irá criar, ler, atualizar e deletar um registro temporário.
5. Somente após todos os testes estarem Verdes, clique em **"3. Inserir Demo Data"**.

---

## 2. Erros Comuns e Soluções

### Erro: `AbortError: The operation was aborted`
- **Causa:** O sistema cancelou uma requisição antiga porque o componente foi desmontado ou recarregado muito rápido (usando `AbortController`).
- **Solução Atualizada:** O código foi refatorado para utilizar o padrão `isMountedRef`, eliminando os falsos positivos de AbortError durante navegação rápida.

### Erro: `PGRST205 / 42P01 (relation does not exist)`
- **Causa:** Você está tentando ler uma tabela que não foi criada no banco de dados.
- **Solução:** Rode o script SQL correspondente ao módulo na aba SQL Editor do Supabase.

### Erro: `PGRST116 (0 rows returned) ou Lista Vazia`
- **Causa:** O Row Level Security (RLS) está ativado, mas você não passou o token de autenticação (não está logado), ou o `user_id` do registro não bate com o `auth.uid()` do seu usuário atual.
- **Solução:** Verifique se o login foi realizado. Registros criados por outros usuários ou sem `user_id` não serão visíveis.

---

## 3. Padrão de Tratamento de Erros Implementado
Para evitar telas "quebradas" ao carregar componentes sem tabelas prontas:
1. Criamos `src/lib/errorHandlingUtils.js`.
2. Todos os cadastros utilizam o `handleSupabaseError()` para traduzir códigos técnicos para Português.
3. Requisições ignoram atualizações de state se o componente for desmontado (`useIsMounted`).