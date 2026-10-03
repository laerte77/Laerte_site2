import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,TrendingDown,Tag,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
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

const TiposDespesa=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[tipos,setTipos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[nomeDespesa,setNomeDespesa]=useState('');
 const[categoria,setCategoria]=useState('');
 const[editingId,setEditingId]=useState(null);
 const[isDialogOpen,setIsDialogOpen]=useState(false);

 const fetchTipos=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('tipos_despesa')
   .select('*')
   .eq('user_id',user.id)
   .order('nome_despesa',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar tipos de despesa',
    description:error.message,
    variant:'destructive'
   });
  }else{
   setTipos(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchTipos();

  if(!user)return;

  const channel=supabase
   .channel('tipos_despesa_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'tipos_despesa'
    },
    fetchTipos
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchTipos]);

 const resetForm=()=>{
  setNomeDespesa('');
  setCategoria('');
  setEditingId(null);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const openDialog=tipo=>{
  if(tipo){
   setNomeDespesa(tipo.nome_despesa||'');
   setCategoria(tipo.categoria||'');
   setEditingId(tipo.id);
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  if(!nomeDespesa.trim()||!categoria.trim()){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha o nome da despesa e a categoria.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   user_id:user.id,
   nome_despesa:nomeDespesa.trim(),
   categoria:categoria.trim()
  };

  try{
   if(editingId){
    const{error}=await supabase
     .from('tipos_despesa')
     .update(payload)
     .eq('id',editingId)
     .eq('user_id',user.id);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de despesa atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('tipos_despesa')
     .insert(payload);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de despesa cadastrado.'
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
   .from('tipos_despesa')
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
   description:'Tipo de despesa excluído.'
  });

  fetchTipos();
 };

 const tiposFiltrados=tipos.filter(tipo=>{
  const termo=search.trim().toLowerCase();

  if(!termo)return true;

  return(
   String(tipo.nome_despesa||'').toLowerCase().includes(termo)||
   String(tipo.categoria||'').toLowerCase().includes(termo)
  );
 });

 const categorias=new Set(
  tipos.map(tipo=>tipo.categoria).filter(Boolean)
 );

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
      <TrendingDown className="h-5 w-5 text-red-400"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-red-400">
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Tipos de Despesa
      </h1>

      <p className="text-sm text-muted-foreground">
       Cadastre e organize os tipos e categorias das despesas.
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
      className="bg-red-500 text-white hover:bg-red-600"
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
       placeholder="Pesquisar tipo ou categoria..."
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
      <p className="text-2xl font-bold text-red-400">
       {tipos.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Categorias
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold">
       {categorias.size}
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
      <p className="text-2xl font-bold">
       {tiposFiltrados.length}
      </p>
     </CardContent>
    </Card>
   </div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId?'Editar Tipo de Despesa':'Novo Tipo de Despesa'}
    description="Preencha o tipo e a categoria da despesa."
    icon={TrendingDown}
    theme="red"
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
       form="form-tipo-despesa"
       className="bg-red-500 text-white hover:bg-red-600"
      >
       {editingId?'Salvar Alterações':'Salvar Tipo'}
      </Button>
     </>
    }
   >
    <form
     id="form-tipo-despesa"
     onSubmit={handleSave}
     className="space-y-5"
    >
     <div className="space-y-2">
      <Label>Nome da Despesa</Label>

      <Input
       value={nomeDespesa}
       onChange={e=>setNomeDespesa(e.target.value)}
       placeholder="Ex: Fatura Internet"
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>

     <div className="space-y-2">
      <Label>Categoria</Label>

      <Input
       value={categoria}
       onChange={e=>setCategoria(e.target.value)}
       placeholder="Ex: Despesas Fixas"
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-red-400">
      Tipos cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Nome da Despesa
         </th>

         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Categoria
         </th>

         <th className="p-4 text-right text-sm font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan={3} className="p-10 text-center text-muted-foreground">
           Carregando...
          </td>
         </tr>
        ):tiposFiltrados.length===0?(
         <tr>
          <td colSpan={3} className="p-10 text-center text-muted-foreground">
           <TrendingDown className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           {tipos.length
            ?'Nenhum tipo corresponde à pesquisa.'
            :'Nenhum tipo de despesa cadastrado.'}
          </td>
         </tr>
        ):(
         tiposFiltrados.map(tipo=>(
          <tr
           key={tipo.id}
           className="border-b border-border last:border-0 hover:bg-red-500/5"
          >
           <td className="p-4 font-medium">
            {tipo.nome_despesa}
           </td>

           <td className="p-4">
            {tipo.categoria?(
             <Badge
              variant="outline"
              className="border-blue-500/30 bg-blue-500/5 text-blue-400"
             >
              <Tag className="mr-1 h-3 w-3"/>
              {tipo.categoria}
             </Badge>
            ):(
             <span className="text-sm italic text-muted-foreground">
              Sem categoria
             </span>
            )}
           </td>

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
                <AlertDialogTitle>
                 Confirmar Exclusão
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja remover o tipo{' '}
                 <strong>{tipo.nome_despesa}</strong>?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>
                 Cancelar
                </AlertDialogCancel>

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

export default TiposDespesa;
