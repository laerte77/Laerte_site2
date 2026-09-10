import React from 'react';
import { AlertCircle, RefreshCcw, Home, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

class SupabaseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Supabase Error Boundary Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "";
      const isMissingIntegration = errorMsg.includes("A integração com o Supabase está incompleta") || 
                                   errorMsg.includes("integração");
      // Handle PGRST116 specifically
      const isPGRST116 = errorMsg.includes("PGRST116") || errorMsg.includes("JSON object requested, multiple (or no) rows returned");

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6">
            <Alert variant={isPGRST116 ? "default" : "destructive"} className="border-2 border-primary/20 bg-card">
              {isPGRST116 ? <UserPlus className="h-5 w-5 text-primary" /> : <AlertCircle className="h-5 w-5" />}
              <AlertTitle className="text-lg font-bold">
                {isMissingIntegration ? "Integração Incompleta" : 
                 isPGRST116 ? "Perfil Não Encontrado" : 
                 "Erro de Conexão com Banco de Dados"}
              </AlertTitle>
              <AlertDescription className="mt-2 text-sm text-muted-foreground">
                {isMissingIntegration 
                  ? "As configurações do Supabase não foram encontradas. Siga as instruções para conectar seu projeto ao Supabase."
                  : isPGRST116 
                    ? "O perfil do usuário não foi encontrado ou não pôde ser carregado. Uma tentativa de criar um perfil padrão será feita na próxima renderização. Por favor, tente novamente."
                    : "Não foi possível carregar os dados. Verifique sua conexão com a internet ou tente novamente."}
              </AlertDescription>
            </Alert>

            {import.meta.env.DEV && !isMissingIntegration && !isPGRST116 && (
              <div className="bg-slate-950 p-4 rounded-md overflow-auto text-xs font-mono text-red-400 max-h-48 border border-red-900/30">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" /> Voltar ao Início
              </Button>
              <Button onClick={this.handleRetry} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SupabaseErrorBoundary;