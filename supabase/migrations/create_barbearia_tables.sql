-- Migration: Create Barbearia Brothers Tables
-- Description: Creates all necessary tables for the Barbearia Brothers module.

-- 1. barbearia_clientes
CREATE TABLE IF NOT EXISTS barbearia_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_clientes_nome ON barbearia_clientes(nome);
COMMENT ON TABLE barbearia_clientes IS 'Armazena os clientes da barbearia.';

-- 2. barbearia_produtos
CREATE TABLE IF NOT EXISTS barbearia_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_produtos_nome ON barbearia_produtos(nome);
COMMENT ON TABLE barbearia_produtos IS 'Armazena os produtos vendidos na barbearia.';

-- 3. barbearia_servicos
CREATE TABLE IF NOT EXISTS barbearia_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_servicos_nome ON barbearia_servicos(nome);
COMMENT ON TABLE barbearia_servicos IS 'Armazena os serviços oferecidos na barbearia.';

-- 4. barbearia_tipos_corte
CREATE TABLE IF NOT EXISTS barbearia_tipos_corte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_corte_nome ON barbearia_tipos_corte(nome);
COMMENT ON TABLE barbearia_tipos_corte IS 'Armazena os tipos de cortes de cabelo/barba.';

-- 5. barbearia_tipos_despesa
CREATE TABLE IF NOT EXISTS barbearia_tipos_despesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_despesa_nome ON barbearia_tipos_despesa(nome);
COMMENT ON TABLE barbearia_tipos_despesa IS 'Armazena as categorias de despesas da barbearia.';

-- 6. barbearia_barbeiros
CREATE TABLE IF NOT EXISTS barbearia_barbeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_barbeiros_nome ON barbearia_barbeiros(nome);
COMMENT ON TABLE barbearia_barbeiros IS 'Armazena os profissionais (barbeiros) que atuam no estabelecimento.';

-- 7. barbearia_tipos_planos
CREATE TABLE IF NOT EXISTS barbearia_tipos_planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_planos_nome ON barbearia_tipos_planos(nome);
COMMENT ON TABLE barbearia_tipos_planos IS 'Armazena os tipos de planos de assinatura ou pacotes.';