import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useModuleAccessGuard = (requiredModule) => {
  const { canAccessModule, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (loading || isAdmin) return;

    if (requiredModule && !canAccessModule(requiredModule)) {
      setHasAccess(false);
      toast({
        title: 'Acesso Revogado',
        description: 'Você perdeu acesso a este módulo. Redirecionando...',
        variant: 'destructive',
      });
      // Delay slightly so the user sees the toast before navigation
      const timer = setTimeout(() => navigate('/modules'), 1500);
      return () => clearTimeout(timer);
    } else {
      setHasAccess(true);
    }
  }, [canAccessModule, requiredModule, loading, isAdmin, navigate, toast]);

  return { hasAccess, shouldRedirect: !hasAccess };
};