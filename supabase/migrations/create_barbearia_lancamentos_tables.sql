-- Migration: Create Barbearia Lancamentos Tables
-- Description: Creates 5 tables for transactions with foreign keys and RLS.

CREATE TABLE IF NOT EXISTS public.barbearia_lancamentos_cortes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    tipo_corte_id UUID REFERENCES public.barbearia_tipos_corte(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.barbearia_clientes(id) ON DELETE SET NULL,
    tem_servico BOOLEAN DEFAULT FALSE,
    servico_id UUID REFERENCES public.barbearia_servicos(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    barbeiro_id UUID REFERENCES public.barbearia_barbeiros(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_lanc_cortes_user_id ON barbearia_lancamentos_cortes(user_id);
ALTER TABLE public.barbearia_lancamentos_cortes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable shared access" ON public.barbearia_lancamentos_cortes;
CREATE POLICY "Enable shared access" ON public.barbearia_lancamentos_cortes FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'laertemendes722@gmail.com');

CREATE TABLE IF NOT EXISTS public.barbearia_lancamentos_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    produto_id UUID REFERENCES public.barbearia_produtos(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    cliente_id UUID REFERENCES public.barbearia_clientes(id) ON DELETE SET NULL,
    barbeiro_id UUID REFERENCES public.barbearia_barbeiros(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_lanc_vendas_user_id ON barbearia_lancamentos_vendas(user_id);
ALTER TABLE public.barbearia_lancamentos_vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable shared access" ON public.barbearia_lancamentos_vendas;
CREATE POLICY "Enable shared access" ON public.barbearia_lancamentos_vendas FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'laertemendes722@gmail.com');

CREATE TABLE IF NOT EXISTS public.barbearia_lancamentos_assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data_assinatura DATE NOT NULL,
    plano_id UUID REFERENCES public.barbearia_tipos_planos(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.barbearia_clientes(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_lanc_assinaturas_user_id ON barbearia_lancamentos_assinaturas(user_id);
ALTER TABLE public.barbearia_lancamentos_assinaturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable shared access" ON public.barbearia_lancamentos_assinaturas;
CREATE POLICY "Enable shared access" ON public.barbearia_lancamentos_assinaturas FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'laertemendes722@gmail.com');

CREATE TABLE IF NOT EXISTS public.barbearia_lancamentos_debitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    tipo_corte_id UUID REFERENCES public.barbearia_tipos_corte(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.barbearia_clientes(id) ON DELETE SET NULL,
    tem_servico BOOLEAN DEFAULT FALSE,
    servico_id UUID REFERENCES public.barbearia_servicos(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    barbeiro_id UUID REFERENCES public.barbearia_barbeiros(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'devendo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_lanc_debitos_user_id ON barbearia_lancamentos_debitos(user_id);
ALTER TABLE public.barbearia_lancamentos_debitos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable shared access" ON public.barbearia_lancamentos_debitos;
CREATE POLICY "Enable shared access" ON public.barbearia_lancamentos_debitos FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'laertemendes722@gmail.com');

CREATE TABLE IF NOT EXISTS public.barbearia_lancamentos_despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    tipo_despesa_id UUID REFERENCES public.barbearia_tipos_despesa(id) ON DELETE SET NULL,
    valor NUMERIC NOT NULL DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_lanc_despesas_user_id ON barbearia_lancamentos_despesas(user_id);
ALTER TABLE public.barbearia_lancamentos_despesas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable shared access" ON public.barbearia_lancamentos_despesas;
CREATE POLICY "Enable shared access" ON public.barbearia_lancamentos_despesas FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'email' = 'laertemendes722@gmail.com');