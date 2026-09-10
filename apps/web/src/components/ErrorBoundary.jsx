import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("CRITICAL UI ERROR CAUGHT:", error);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
    
    // Check if it's the specific removeChild error and attempt a recovery if possible
    if (error.toString().includes("removeChild")) {
        console.warn("Recoverable DOM Sync error detected.");
    }
    
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleHome = () => {
     window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "";
      const isRemoveChildError = errorMsg.includes("removeChild") || 
                                 errorMsg.includes("node to be removed") ||
                                 errorMsg.includes("NotFoundError");

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 m-4 bg-card rounded-xl border border-red-500/20 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="bg-red-500/10 p-4 rounded-full mb-4 ring-1 ring-red-500/30">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2 text-center">Algo deu errado!</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {isRemoveChildError 
              ? "A interface perdeu a sincronização. Isso geralmente acontece ao navegar muito rápido ou fechar janelas durante animações." 
              : "Ocorreu um erro inesperado ao processar sua solicitação."}
          </p>
          
          <div className="bg-slate-950/50 p-4 rounded-lg w-full max-w-lg mb-6 overflow-auto border border-red-500/10 max-h-[200px]">
            <p className="text-red-400 font-mono text-xs break-all whitespace-pre-wrap">
              {errorMsg}
            </p>
            {this.state.errorInfo && (
               <p className="text-muted-foreground font-mono text-[10px] mt-2 border-t border-white/10 pt-2 break-all">
                  {this.state.errorInfo.componentStack.slice(0, 300)}...
               </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button 
                onClick={this.handleHome}
                variant="outline"
                className="gap-2"
            >
                <Home className="w-4 h-4" /> Início
            </Button>
            <Button 
                onClick={this.handleReload}
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
                <RefreshCw className="w-4 h-4" /> Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;