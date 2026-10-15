-- Classificação de custos manuais e precisão do custo unitário.
-- Pode ser executada novamente sem duplicar as colunas.

ALTER TABLE public.lm_lanc_custos
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS custo_origem TEXT,
  ADD COLUMN IF NOT EXISTS custo_estimado BOOLEAN,
  ADD COLUMN IF NOT EXISTS custo_pendente BOOLEAN,
  ADD COLUMN IF NOT EXISTS custo_data_compra DATE;

-- Preserva mais casas decimais no preço de referência por unidade.
ALTER TABLE public.lm_tipos_folha
  ALTER COLUMN preco TYPE NUMERIC(14,6)
  USING preco::NUMERIC(14,6);

-- Os registros antigos permanecem sem classificação explícita.
-- Não preencher custo_origem automaticamente: a origem histórica
-- precisa ser verificada, não presumida.
