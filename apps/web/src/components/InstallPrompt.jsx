import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Hide the app-provided install promotion
      setIsInstallable(false);
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      
      toast({
        title: 'Sucesso!',
        description: 'App instalado com sucesso no seu dispositivo.',
        className: 'bg-[hsl(var(--success))] text-white',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: 'Instalando...',
        description: 'O aplicativo está sendo instalado.',
      });
    } else {
      toast({
        title: 'Cancelado',
        description: 'A instalação foi cancelada.',
        variant: 'destructive',
      });
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <div className="mb-6 w-full animate-fade-in">
      <button
        type="button"
        onClick={handleInstallClick}
        className="install-prompt-btn"
        aria-label="Instalar aplicativo"
      >
        <Download className="w-5 h-5" />
        <span>Instalar App</span>
      </button>
    </div>
  );
};

export default InstallPrompt;