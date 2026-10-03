import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,TrendingUp,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{
 AlertDialog,AlertDialogAction,AlertDialogCancel,
 AlertDialogContent,AlertDialogDescription,
 AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,
 AlertDialogTrigger
}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const BLUE='hsl(var(--neon-pessoal))';

const TiposReceita=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[tipos,setTipos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[nomeReceita,setNomeReceita]=useState('');
 const[editingId,setEditingId]=useState(null);
 const[isDialogOpen,setIsDialogOpen]=useState(false);

 const fetchTipos=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('tipos_receita')
   .select('*')
   .eq('user_id',user.id)
   .order('nome_receita',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar tipos de receita',
    description:error.message,
    variant:'destructive'
   });
  }else setTipos(data||[]);

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchTipos();

  if(!user)return;

  const channel=supabase
   .channel('tipos_receita_changes')
   .on(
    'postgres_changes',
    {event:'*',schema:'public',table:'tipos_receita'},
    fetchTipos
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchTipos]);

 const resetForm=()=>{
  setNomeReceita('');
  setEditingId(null);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const openDialog=tipo=>{
  if(tipo){
   setNomeReceita(tipo.nome_receita||'');
   setEditingId(tipo.id);
  }else resetForm();

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  if(!nomeReceita.trim()){
   toast({
    title:'Campo obrigatório',
    description:'Preencha o nome da receita.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   user_id:user.id,
   nome_receita:nomeReceita.trim()
  };

  try{
   if(editingId){
    const{error}=await supabase
     .from('tipos_receita')
     .update(payload)
     .eq('id',editingId)
     .eq('user_id',user.id);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de receita atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('tipos_receita')
     .insert(payload);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de receita cadastrado.'
    });
   }

   closeDialog();
   fetchTipos();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('tipos_receita')
   .delete()
   .eq('id',id)
   .eq('user_id',user.id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir.',
    variant:'destructive'
   });
   return;
  }

  toast({
   title:'Sucesso',
   description:'Tipo de receita excluído.'
  });

  fetchTipos();
 };

 const tiposFiltrados=tipos.filter(tipo=>
  !search.trim()||
  String(tipo.nome_receita||'')
   .toLowerCase()
   .includes(search.trim().toLowerCase())
 );

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
      style={{
       borderColor:'hsl(var(--neon-pessoal)/.2)',
       background:'hsl(var(--neon-pessoal)/.1)'
      }}
     >
      <TrendingUp className="h-5 w-5" style={{color:BLUE}}/>
     </div>

     <div>
      <p
       className="text-[11px] font-semibold uppercase tracking-[.2em]"
       style={{color:BLUE}}
      >
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Tipos de Receita
      </h1>

      <p className="text-sm text-muted-foreground">
       Cadastre e organize os tipos de receita.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={fetchTipos}>
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="text-white"
      style={{background:BLUE}}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Tipo
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
       placeholder="Pesquisar tipo de receita..."
       className="bg-input pl-9"
      />
     </div>

     <span className="text-sm text-muted-foreground">
      {tiposFiltrados.length} tipo(s)
     </span>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">
    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Tipos cadastrados
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold" style={{color:BLUE}}>
       {tipos.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Resultado atual
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold">{tiposFiltrados.length}</p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Situação
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold text-emerald-400">Ativo</p>
     </CardContent>
    </Card>
   </div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId?'Editar Tipo de Receita':'Novo Tipo de Receita'}
    description="Preencha o nome do tipo de receita."
    icon={TrendingUp}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeDialog}
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-tipo-receita"
       className="text-white"
       style={{background:BLUE}}
      >
       {editingId?'Salvar Alterações':'Salvar Tipo'}
      </Button>
     </>
    }
   >
    <form
     id="form-tipo-receita"
     onSubmit={handleSave}
     className="space-y-5"
    >
     <div className="space-y-2">
      <Label>Nome da Receita</Label>

      <Input
       value={nomeReceita}
       onChange={e=>setNomeReceita(e.target.value)}
       placeholder="Ex: Salário"
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg" style={{color:BLUE}}>
      Tipos cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Nome da Receita
         </th>

         <th className="p-4 text-right text-sm font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan={2} className="p-10 text-center text-muted-foreground">
           Carregando...
          </td>
         </tr>
        ):tiposFiltrados.length===0?(
         <tr>
          <td colSpan={2} className="p-10 text-center text-muted-foreground">
           <TrendingUp className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           {tipos.length
            ?'Nenhum tipo corresponde à pesquisa.'
            :'Nenhum tipo de receita cadastrado.'}
          </td>
         </tr>
        ):(
         tiposFiltrados.map(tipo=>(
          <tr
           key={tipo.id}
           className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-pessoal)/.04)]"
          >
           <td className="p-4 font-medium">{tipo.nome_receita}</td>

           <td className="p-4 text-right">
            <div className="flex justify-end gap-1">
             <Button
              variant="ghost"
              size="icon"
              onClick={()=>openDialog(tipo)}
              className="text-blue-400 hover:bg-blue-500/10"
              title="Editar"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:bg-red-500/10"
                title="Excluir"
               >
                <Trash className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-pessoal border-border bg-card">
               <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja remover o tipo{' '}
                 <strong>{tipo.nome_receita}</strong>?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>

                <AlertDialogAction
                 onClick={()=>handleDelete(tipo.id)}
                 className="bg-red-600 hover:bg-red-700"
                >
                 Excluir
                </AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         ))
        )}
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default TiposReceita;
