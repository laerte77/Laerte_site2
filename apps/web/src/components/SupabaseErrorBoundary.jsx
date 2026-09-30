import React from'react';
import{AlertCircle,RefreshCcw,Home,UserPlus}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Alert,AlertDescription,AlertTitle}from'@/components/ui/alert';

class SupabaseErrorBoundary extends React.Component{
 constructor(props){
  super(props);
  this.state={hasError:false,error:null,errorInfo:null};
 }

 static getDerivedStateFromError(error){
  return{hasError:true,error};
 }

 componentDidCatch(error,errorInfo){
  console.error('Supabase Error Boundary Caught:',error,errorInfo);
  this.setState({errorInfo});
 }

 handleRetry=()=>{
  this.setState({hasError:false,error:null,errorInfo:null});
  window.location.reload();
 };

 handleHome=()=>{
  window.location.assign('/');
 };

 render(){
  if(!this.state.hasError)return this.props.children;

  const errorMsg=this.state.error?.toString()||'';
  const isMissingIntegration=
   errorMsg.includes('A integração com o Supabase está incompleta')||
   errorMsg.includes('integração');

  const isPGRST116=
   errorMsg.includes('PGRST116')||
   errorMsg.includes('JSON object requested, multiple (or no) rows returned');

  const alertVariant=isPGRST116?'default':'destructive';

  const icon=isPGRST116
   ?<UserPlus className="h-5 w-5 text-primary" aria-hidden="true"/>
   :<AlertCircle className="h-5 w-5" aria-hidden="true"/>;

  const title=isMissingIntegration
   ?'Integração Incompleta'
   :isPGRST116
    ?'Perfil Não Encontrado'
    :'Erro de Conexão com Banco de Dados';

  const description=isMissingIntegration
   ?'As configurações do Supabase não foram encontradas. Siga as instruções para conectar seu projeto ao Supabase.'
   :isPGRST116
    ?'O perfil do usuário não foi encontrado ou não pôde ser carregado. Uma tentativa de criar um perfil padrão será feita na próxima renderização. Por favor, tente novamente.'
    :'Não foi possível carregar os dados. Verifique sua conexão com a internet ou tente novamente.';

  return <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6" role="alert" aria-live="assertive" aria-atomic="true">
   <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none sm:p-7">
    <Alert variant={alertVariant} className="border-2 border-primary/20 bg-card/70 shadow-sm">
     {icon}
     <AlertTitle className="text-base font-bold sm:text-lg">{title}</AlertTitle>
     <AlertDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</AlertDescription>
    </Alert>

    {import.meta.env.DEV&&!isMissingIntegration&&!isPGRST116&&<details className="mt-5 overflow-hidden rounded-xl border border-red-900/30 bg-slate-950">
     <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium text-red-400 transition-[background-color,color] duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none">
      Detalhes técnicos
     </summary>

     <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all border-t border-red-900/30 p-4 font-mono text-xs leading-relaxed text-red-400">
      {errorMsg}
     </pre>
    </details>}

    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
     <Button type="button" onClick={this.handleHome} variant="outline" className="min-h-11 w-full gap-2" aria-label="Voltar ao início">
      <Home className="h-4 w-4" aria-hidden="true"/>
      Voltar ao Início
     </Button>

     <Button type="button" onClick={this.handleRetry} className="min-h-11 w-full gap-2" aria-label="Tentar novamente">
      <RefreshCcw className="h-4 w-4" aria-hidden="true"/>
      Tentar Novamente
     </Button>
    </div>
   </div>
  </main>;
 }
}

export default SupabaseErrorBoundary;
