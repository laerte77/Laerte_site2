-- 1. Cadastro central de insumos
CREATE TABLE IF NOT EXISTS public.lm_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  estoque_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lm_insumos_nome_usuario
ON public.lm_insumos (user_id, LOWER(TRIM(nome)));

ALTER TABLE public.lm_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lm_insumos_select_own" ON public.lm_insumos;
CREATE POLICY "lm_insumos_select_own"
ON public.lm_insumos FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lm_insumos_insert_own" ON public.lm_insumos;
CREATE POLICY "lm_insumos_insert_own"
ON public.lm_insumos FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lm_insumos_update_own" ON public.lm_insumos;
CREATE POLICY "lm_insumos_update_own"
ON public.lm_insumos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lm_insumos_delete_own" ON public.lm_insumos;
CREATE POLICY "lm_insumos_delete_own"
ON public.lm_insumos FOR DELETE
USING (auth.uid() = user_id);

-- 2. Criar os vínculos sem remover os campos antigos
ALTER TABLE public.lm_tipos_folha
ADD COLUMN IF NOT EXISTS insumo_id UUID
REFERENCES public.lm_insumos(id) ON DELETE SET NULL;

ALTER TABLE public.lm_estoques_inicial
ADD COLUMN IF NOT EXISTS insumo_id UUID
REFERENCES public.lm_insumos(id) ON DELETE SET NULL;

ALTER TABLE public.lm_lanc_despesas
ADD COLUMN IF NOT EXISTS insumo_id UUID
REFERENCES public.lm_insumos(id) ON DELETE SET NULL;

-- 3. Migrar os tipos de folha já cadastrados
INSERT INTO public.lm_insumos (user_id, nome, unidade)
SELECT DISTINCT ON (user_id, LOWER(TRIM(tipo_folha)))
  user_id, TRIM(tipo_folha), 'folha'
FROM public.lm_tipos_folha
WHERE NULLIF(TRIM(tipo_folha), '') IS NOT NULL
ORDER BY user_id, LOWER(TRIM(tipo_folha)), tipo_folha
ON CONFLICT DO NOTHING;

-- 4. Migrar produtos do estoque inicial
INSERT INTO public.lm_insumos (user_id, nome, unidade)
SELECT DISTINCT ON (user_id, LOWER(TRIM(produto)))
  user_id, TRIM(produto), 'unidade'
FROM public.lm_estoques_inicial
WHERE NULLIF(TRIM(produto), '') IS NOT NULL
ORDER BY user_id, LOWER(TRIM(produto)), produto
ON CONFLICT DO NOTHING;


-- 5. Migrar materiais usados em lançamentos de estoque
INSERT INTO public.lm_insumos (user_id, nome, unidade)
SELECT DISTINCT ON (l.user_id, LOWER(TRIM(n.nome)))
  l.user_id, TRIM(n.nome), n.unidade
FROM public.lm_lanc_despesas l
JOIN public.lm_despesas d ON d.id = l.despesa_id
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN d.despesa ILIKE '%reposi%folha%' THEN l.tipo_folha
      ELSE d.despesa
    END AS nome,
    CASE
      WHEN d.despesa ILIKE '%reposi%folha%' THEN 'folha'
      ELSE 'unidade'
    END AS unidade
) n
WHERE l.tipo_lancamento = 'Estoque'
  AND NULLIF(TRIM(n.nome), '') IS NOT NULL
ORDER BY l.user_id, LOWER(TRIM(n.nome))
ON CONFLICT DO NOTHING;

-- 6. Vincular tipos de folha aos insumos migrados
UPDATE public.lm_tipos_folha t
SET insumo_id = i.id
FROM public.lm_insumos i
WHERE i.user_id = t.user_id
  AND LOWER(TRIM(i.nome)) = LOWER(TRIM(t.tipo_folha))
  AND t.insumo_id IS NULL;

-- 7. Vincular saldos iniciais aos insumos migrados
UPDATE public.lm_estoques_inicial e
SET insumo_id = i.id
FROM public.lm_insumos i
WHERE i.user_id = e.user_id
  AND LOWER(TRIM(i.nome)) = LOWER(TRIM(e.produto))
  AND e.insumo_id IS NULL;

-- 8. Vincular lançamentos antigos de estoque
UPDATE public.lm_lanc_despesas l
SET insumo_id = i.id
FROM public.lm_despesas d, public.lm_insumos i
WHERE d.id = l.despesa_id
  AND i.user_id = l.user_id
  AND LOWER(TRIM(i.nome)) = LOWER(TRIM(
    CASE
      WHEN d.despesa ILIKE '%reposi%folha%' THEN l.tipo_folha
      ELSE d.despesa
    END
  ))
  AND l.tipo_lancamento = 'Estoque'
  AND l.insumo_id IS NULL;
