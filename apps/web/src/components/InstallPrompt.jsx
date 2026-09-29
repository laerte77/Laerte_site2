import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);

      toast({
        title: 'Sucesso!',
        description: 'App instalado com sucesso no seu dispositivo.',
        className: 'bg-[hsl(var(--success))] text-white'
      });
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: 'Instalando...',
        description: 'O aplicativo está sendo instalado.'
      });
    } else {
      toast({
        title: 'Cancelado',
        description: 'A instalação foi cancelada.',
        variant: 'destructive'
      });
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) {
    return null;
  }

  return (
    <div
      className="
        mb-6
        w-full
        animate-fade-in
        motion-reduce:animate-none
      "
    >
      <button
        type="button"
        onClick={handleInstallClick}
        className="
          install-prompt-btn
          w-full
          min-h-11
          flex
          items-center
          justify-center
          gap-2
          touch-action-manipulation
          transition-[transform,box-shadow,opacity]
          duration-200
          ease-out
          hover:-translate-y-px
          active:scale-[0.98]
          motion-reduce:transition-none
          motion-reduce:transform-none
        "
        aria-label="Instalar aplicativo"
      >
        <Download
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        />

        <span>Instalar App</span>
      </button>
    </div>
  );
};

export default InstallPrompt;
