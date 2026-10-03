import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,ArrowDownCircle,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const CadastroTipoDespesa=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  const{data,error}=await supabase
   .from('igreja_tipos_despesa')
   .select('*')
   .eq('user_id',user.id)
   .order('despesa');

  if(error)toast({title:'Erro ao buscar tipos de despesa',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase
   .channel('igreja_tipos_despesa_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_tipos_despesa'},load)
   .subscribe();

  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setNome('');setCurrent(null)};
 const close=()=>{setOpen(false);reset()};

 const save=async()=>{
  if(!nome.trim()){
   toast({title:'Campo obrigatório',description:'Informe o tipo de despesa.',variant:'destructive'});
   return;
  }

  const payload={despesa:nome.trim(),user_id:user.id};

  const q=current
   ?await supabase.from('igreja_tipos_despesa').update(payload).eq('id',current.id).eq('user_id',user.id)
   :await supabase.from('igreja_tipos_despesa').insert(payload);

  if(q.error)toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  else{
   toast({title:'Sucesso',description:current?'Tipo de despesa atualizado.':'Tipo de despesa cadastrado.'});
   close();
   load();
  }
 };

 const remove=async id=>{
  const{error}=await supabase
   .from('igreja_tipos_despesa')
   .delete()
   .eq('id',id)
   .eq('user_id',user.id);

  if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
  else{
   toast({title:'Sucesso',description:'Tipo de despesa removido.'});
   load();
  }
 };

 const filtered=data.filter(x=>
  !search.trim()||
  String(x.despesa||'').toLowerCase().includes(search.trim().toLowerCase())
 );

 return(
  <div className="dark-igreja space-y-5">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-igreja)/.2)] bg-[hsl(var(--neon-igreja)/.1)]">
      <ArrowDownCircle className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">
       Tesouraria • Cadastros
      </p>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
       Tipos de Despesa
      </h1>
      <p className="text-sm text-muted-foreground">
       Cadastre e organize as categorias de despesas.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load}>
      <RefreshCw className="mr-2 h-4 w-4"/>Atualizar
     </Button>

     <Button
      onClick={()=>{reset();setOpen(true)}}
      className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
     >
      <Plus className="mr-2 h-4 w-4"/>Novo Tipo
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
     <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Pesquisar tipo de despesa..."
       className="bg-input pl-9"
      />
     </div>

     <span className="text-sm text-muted-foreground">
      {filtered.length} tipo(s)
     </span>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">
    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tipos cadastrados</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">{data.length}</p></CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resultado atual</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Situação</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold text-emerald-400">Ativo</p></CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">
      Tipos de despesa cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left font-semibold text-muted-foreground">Tipo de Despesa</th>
         <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
        </tr>
       </thead>

       <tbody>
        {loading?
         <tr><td colSpan={2} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:
         filtered.length?
         filtered.map(x=>(
          <tr key={x.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-igreja)/.04)]">
           <td className="p-4 font-medium">{x.despesa}</td>

           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button
              variant="ghost"
              size="icon"
              onClick={()=>{setCurrent(x);setNome(x.despesa||'');setOpen(true)}}
              className="text-[hsl(var(--neon-igreja))]"
              title="Editar"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" title="Excluir">
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-igreja">
               <AlertDialogHeader>
                <AlertDialogTitle>Excluir tipo de despesa?</AlertDialogTitle>
                <AlertDialogDescription>
                 Deseja excluir "{x.despesa}"?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600 hover:bg-red-700">
                 Excluir
                </AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         )):
         <tr>
          <td colSpan={2} className="p-12 text-center text-muted-foreground">
           <ArrowDownCircle className="mx-auto mb-3 h-10 w-10 opacity-40"/>
           {data.length?'Nenhum tipo corresponde à pesquisa.':'Nenhum tipo de despesa cadastrado.'}
          </td>
         </tr>
        }
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar Tipo de Despesa':'Novo Tipo de Despesa'}
    description="Informe o nome do tipo de despesa."
    icon={current?Edit:ArrowDownCircle}
    theme="red"
    footer={
     <>
      <Button variant="outline" onClick={close}>Cancelar</Button>
      <Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">
       {current?'Salvar Alterações':'Salvar Tipo'}
      </Button>
     </>
    }
   >
    <div className="space-y-2">
     <Label>Nome da Despesa</Label>
     <Input
      value={nome}
      onChange={e=>setNome(e.target.value)}
      placeholder="Ex.: Energia elétrica"
      className="h-11 rounded-xl bg-input"
      autoFocus
     />
    </div>
   </ModalLancamentoPadrao>
  </div>
 );
};

export default CadastroTipoDespesa;
