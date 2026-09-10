import React, { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert } from 'lucide-react';

const PermissionsUpdateNotification = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionsUpdated = (event) => {
      toast({
        title: 'Permissões Atualizadas',
        description: 'Suas permissões de acesso foram atualizadas pelo administrador.',
        duration: 4000,
        className: 'bg-blue-500/10 border-blue-500/50 text-blue-500',
        action: (
          <div className="flex-shrink-0 bg-blue-500/20 p-2 rounded-full">
             <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
        )
      });
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdated);

    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated);
    };
  }, [toast]);

  return null; // This component doesn't render any visible UI directly, only toasts
};

export default PermissionsUpdateNotification;