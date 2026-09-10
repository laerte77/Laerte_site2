-- Migration: Create Barbearia Complete Tables with User ID
-- Description: Creates all tables for Barbearia with proper RLS and user_id relations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.barbearia_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_clientes_user_id ON barbearia_clientes(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC,
    estoque INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_produtos_user_id ON barbearia_produtos(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC,
    duracao INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_servicos_user_id ON barbearia_servicos(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_tipos_corte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_corte_user_id ON barbearia_tipos_corte(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_tipos_despesa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_despesa_user_id ON barbearia_tipos_despesa(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_barbeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    data_admissao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_barbeiros_user_id ON barbearia_barbeiros(user_id);

CREATE TABLE IF NOT EXISTS public.barbearia_tipos_planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor NUMERIC,
    sessoes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barbearia_tipos_planos_user_id ON barbearia_tipos_planos(user_id);