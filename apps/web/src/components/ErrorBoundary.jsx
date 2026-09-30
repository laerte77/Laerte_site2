import React from'react';
import{Button}from'@/components/ui/button';
import{AlertTriangle,RefreshCw,Home}from'lucide-react';

class ErrorBoundary extends React.Component{
 constructor(props){
  super(props);
  this.state={hasError:false,error:null,errorInfo:null};
 }

 static getDerivedStateFromError(error){
  return{hasError:true,error};
 }

 componentDidCatch(error,errorInfo){
  console.error('CRITICAL UI ERROR CAUGHT:',error);
  console.error('COMPONENT STACK:',errorInfo.componentStack);

  if(error?.toString().includes('removeChild')){
   console.warn('Recoverable DOM Sync error detected.');
  }

  this.setState({errorInfo});
 }

 handleReload=()=>{
  this.setState({hasError:false,error:null,errorInfo:null});
  window.location.reload();
 };

 handleHome=()=>{
  window.location.assign('/');
 };

 render(){
  if(!this.state.hasError)return this.props.children;

  const errorMsg=this.state.error?.toString()||'';
  const isRemoveChildError=
   errorMsg.includes('removeChild')||
   errorMsg.includes('node to be removed')||
   errorMsg.includes('NotFoundError');

  return <main className="flex min-h-[60vh] w-full items-center justify-center p-4 sm:p-6" role="alert" aria-live="assertive">
   <section className="w-full max-w-2xl rounded-2xl border border-red-500/20 bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none sm:p-8">
    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30 sm:h-20 sm:w-20" aria-hidden="true">
     <AlertTriangle className="h-9 w-9 text-red-500 sm:h-11 sm:w-11"/>
    </div>

    <h2 className="mb-3 text-2xl font-bold text-red-500 sm:text-3xl">Algo deu errado!</h2>

    <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
     {isRemoveChildError
      ?'A interface perdeu a sincronização. Isso geralmente acontece ao navegar muito rápido ou fechar janelas durante animações.'
      :'Ocorreu um erro inesperado ao processar sua solicitação.'}
    </p>

    <details className="mb-6 w-full overflow-hidden rounded-xl border border-red-500/10 bg-slate-950/50 text-left">
     <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-red-400 transition-[background-color,color] duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none">
      Detalhes técnicos
     </summary>

     <div className="border-t border-white/10 p-4">
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-red-400">
       {errorMsg}
      </pre>

      {this.state.errorInfo&&<pre className="mt-3 max-h-40 overflow-auto border-t border-white/10 pt-3 break-all whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">
       {typeof this.state.errorInfo.componentStack==='string'
        ?this.state.errorInfo.componentStack.slice(0,300)
        :'Stack de componentes indisponível'}...
      </pre>}
     </div>
    </details>

    <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
     <Button type="button" onClick={this.handleHome} variant="outline" className="min-h-11 gap-2 px-5">
      <Home className="h-4 w-4" aria-hidden="true"/>
      Início
     </Button>

     <Button type="button" onClick={this.handleReload} className="min-h-11 gap-2 bg-red-600 px-5 text-white shadow-[0_0_14px_rgba(239,68,68,0.25)] hover:bg-red-700">
      <RefreshCw className="h-4 w-4" aria-hidden="true"/>
      Recarregar Página
     </Button>
    </div>
   </section>
  </main>;
 }
}

export default ErrorBoundary;
