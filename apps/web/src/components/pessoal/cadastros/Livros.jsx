import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,BookOpen,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
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

const Livros=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[livros,setLivros]=useState([]);
 const[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[formData,setFormData]=useState({
  ordem:'',
  nome_livro:'',
  capitulos:'',
  testamento:''
 });
 const[editingId,setEditingId]=useState(null);
 const[isDialogOpen,setIsDialogOpen]=useState(false);

 const fetchLivros=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('livros')
   .select('*')
   .eq('user_id',user.id)
   .order('ordem',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar livros',
    description:error.message,
    variant:'destructive'
   });
  }else setLivros(data||[]);

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchLivros();

  if(!user)return;

  const channel=supabase
   .channel('livros_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'livros',
     filter:`user_id=eq.${user.id}`
    },
    fetchLivros
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchLivros]);

 const resetForm=()=>{
  setFormData({
   ordem:'',
   nome_livro:'',
   capitulos:'',
   testamento:''
  });
  setEditingId(null);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const openDialog=livro=>{
  if(livro){
   setFormData({
    ordem:livro.ordem??'',
    nome_livro:livro.nome_livro||'',
    capitulos:livro.capitulos??'',
    testamento:livro.testamento||''
   });
   setEditingId(livro.id);
  }else resetForm();

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  if(
   !formData.ordem||
   !formData.nome_livro.trim()||
   !formData.capitulos||
   !formData.testamento
  ){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha todos os campos.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   user_id:user.id,
   ordem:formData.ordem,
   nome_livro:formData.nome_livro.trim(),
   capitulos:formData.capitulos,
   testamento:formData.testamento
  };

  try{
   if(editingId!==null){
    const{error}=await supabase
     .from('livros')
     .update(payload)
     .eq('id',editingId)
     .eq('user_id',user.id);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Livro atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('livros')
     .insert(payload);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Livro cadastrado.'
    });
   }

   closeDialog();
   fetchLivros();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar o livro.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('livros')
   .delete()
   .eq('id',id)
   .eq('user_id',user.id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o livro.',
    variant:'destructive'
   });
   return;
  }

  toast({
   title:'Sucesso',
   description:'Livro excluído.'
  });

  fetchLivros();
 };

 const livrosFiltrados=livros.filter(livro=>{
  const termo=search.trim().toLowerCase();

  if(!termo)return true;

  return(
   String(livro.nome_livro||'').toLowerCase().includes(termo)||
   String(livro.testamento||'').toLowerCase().includes(termo)
  );
 });

 const totalCapitulos=livros.reduce(
  (sum,livro)=>sum+Number(livro.capitulos||0),
  0
 );

 const antigoTestamento=livros.filter(
  livro=>livro.testamento==='Antigo'
 ).length;

 const novoTestamento=livros.filter(
  livro=>livro.testamento==='Novo'
 ).length;

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <BookOpen className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Livros
      </h1>

      <p className="text-sm text-muted-foreground">
       Cadastre os livros para controle de leitura.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={fetchLivros}>
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Livro
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
       placeholder="Pesquisar livro ou testamento..."
       className="bg-input pl-9"
      />
     </div>

     <span className="text-sm text-muted-foreground">
      {livrosFiltrados.length} livro(s)
     </span>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-4">
    {[
     ['Livros cadastrados',livros.length,true],
     ['Capítulos',totalCapitulos,true],
     ['Antigo Testamento',antigoTestamento,false],
     ['Novo Testamento',novoTestamento,false]
    ].map(([title,value,accent])=>(
     <Card key={title} className="border-border bg-card">
      <CardHeader className="pb-2">
       <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
       </CardTitle>
      </CardHeader>

      <CardContent>
       <p className={`text-2xl font-bold ${accent?'text-[hsl(var(--neon-pessoal))]':''}`}>
        {value}
       </p>
      </CardContent>
     </Card>
    ))}
   </div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId!==null?'Editar Livro':'Novo Livro'}
    description="Preencha os dados do livro."
    icon={BookOpen}
    theme="blue"
    footer={
     <>
      <Button type="button" variant="outline" onClick={closeDialog}>
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-livro"
       className="bg-[hsl(var(--neon-pessoal))] text-white hover:opacity-90"
      >
       {editingId!==null?'Salvar Alterações':'Salvar Livro'}
      </Button>
     </>
    }
   >
    <form id="form-livro" onSubmit={handleSave} className="space-y-5">
     <div className="grid gap-4 sm:grid-cols-2">

      <div className="space-y-2">
       <Label>Ordem</Label>

       <Input
        type="number"
        value={formData.ordem}
        onChange={e=>setFormData(prev=>({
         ...prev,
         ordem:e.target.value
        }))}
        placeholder="Ex: 1"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Nome do Livro</Label>

       <Input
        value={formData.nome_livro}
        onChange={e=>setFormData(prev=>({
         ...prev,
         nome_livro:e.target.value
        }))}
        placeholder="Ex: Gênesis"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Capítulos</Label>

       <Input
        type="number"
        value={formData.capitulos}
        onChange={e=>setFormData(prev=>({
         ...prev,
         capitulos:e.target.value
        }))}
        placeholder="Ex: 50"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Testamento</Label>

       <Select
        value={formData.testamento}
        onValueChange={value=>setFormData(prev=>({
         ...prev,
         testamento:value
        }))}
       >
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue placeholder="Selecione"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         <SelectItem value="Antigo">
          Antigo Testamento
         </SelectItem>

         <SelectItem value="Novo">
          Novo Testamento
         </SelectItem>
        </SelectContent>
       </Select>
      </div>
     </div>
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
      Livros cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Livro
         </th>

         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Ordem
         </th>

         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Capítulos
         </th>

         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Testamento
         </th>

         <th className="p-4 text-right text-sm font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan={5} className="p-10 text-center text-muted-foreground">
           Carregando...
          </td>
         </tr>
        ):livrosFiltrados.length===0?(
         <tr>
          <td colSpan={5} className="p-10 text-center text-muted-foreground">
           <BookOpen className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           Nenhum livro encontrado.
          </td>
         </tr>
        ):(
         livrosFiltrados.map(livro=>(
          <tr
           key={livro.id}
           className="border-b border-border last:border-0 hover:bg-muted/20"
          >
           <td className="p-4 font-medium">
            {livro.nome_livro}
           </td>

           <td className="p-4 text-sm text-muted-foreground">
            {livro.ordem}
           </td>

           <td className="p-4 text-sm">
            {livro.capitulos}
           </td>

           <td className="p-4 text-sm text-muted-foreground">
            {livro.testamento==='Antigo'
             ?'Antigo Testamento'
             :'Novo Testamento'}
           </td>

           <td className="p-4 text-right">
            <Button
             variant="ghost"
             size="icon"
             onClick={()=>openDialog(livro)}
             className="mr-1 text-blue-400 hover:bg-blue-500/10"
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
                Deseja remover o livro{' '}
                <strong>{livro.nome_livro}</strong>?
               </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>
                Cancelar
               </AlertDialogCancel>

               <AlertDialogAction
                onClick={()=>handleDelete(livro.id)}
                className="bg-red-600 text-white hover:bg-red-700"
               >
                Excluir
               </AlertDialogAction>
              </AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
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

export default Livros;
