-- Migration: Add RLS Policies for Barbearia Tables
-- Description: Enables Row Level Security and adds policies for authenticated users and admins.

ALTER TABLE public.barbearia_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_tipos_corte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_tipos_despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbearia_tipos_planos ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['barbearia_clientes', 'barbearia_produtos', 'barbearia_servicos', 'barbearia_tipos_corte', 'barbearia_tipos_despesa', 'barbearia_barbeiros', 'barbearia_tipos_planos'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable shared access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Enable shared access" ON public.%I FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>''email'' = ''laertemendes722@gmail.com'') WITH CHECK (auth.uid() = user_id OR auth.jwt()->>''email'' = ''laertemendes722@gmail.com'')', t);
    END LOOP;
END $$;