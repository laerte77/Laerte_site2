ALTER TABLE public.igreja_membros
ADD COLUMN IF NOT EXISTS tipo_vinculo TEXT NOT NULL DEFAULT 'MEMBRO'
CHECK (tipo_vinculo IN ('MEMBRO','CONGREGADO'));

UPDATE public.igreja_membros
SET tipo_vinculo='MEMBRO'
WHERE tipo_vinculo IS NULL;

CREATE INDEX IF NOT EXISTS idx_igreja_membros_tipo_vinculo
ON public.igreja_membros(tipo_vinculo);
