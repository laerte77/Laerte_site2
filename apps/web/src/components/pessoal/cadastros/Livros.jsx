import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,BookOpen}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const Livros=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[livros,setLivros]=useState([]);
 const[loading,setLoading]=useState(true);
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
   .order('nome_livro',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar livros',
    description:error.message,
    variant:'destructive'
   });
  }else{
   setLivros(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchLivros();
 },[fetchLivros]);

 useEffect(()=>{
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
    ()=>fetchLivros()
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchLivros]);

 const resetForm=useCallback(()=>{
  setFormData({
   ordem:'',
   nome_livro:'',
   capitulos:'',
   testamento:''
  });
  setEditingId(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=livro=>{
  if(livro){
   setFormData({
    ordem:livro.ordem??'',
    nome_livro:livro.nome_livro||'',
    capitulos:livro.capitulos??'',
    testamento:livro.testamento||''
   });
   setEditingId(livro.id);
  }else{
   resetForm();
  }

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

  const dataToSave={
   ordem:formData.ordem,
   nome_livro:formData.nome_livro.trim(),
   capitulos:formData.capitulos,
   testamento:formData.testamento,
   user_id:user.id
  };

  try{
   if(editingId!==null){
    const{error}=await supabase
     .from('livros')
     .update(dataToSave)
     .eq('id',editingId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Livro atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('livros')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Livro cadastrado.'
    });
   }

   resetForm();
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
   .eq('id',id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o livro.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Livro excluído.'
   });

   fetchLivros();
  }
 };

 return(
  <div className="dark-pessoal space-y-6">

   <motion.div
    initial={{opacity:0,y:-20}}
    animate={{opacity:1,y:0}}
   >
    <div className="flex items-center justify-between">
     <div>
      <h2 className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-bold text-transparent">
       Livros
      </h2>

      <p className="text-muted-foreground">
       Cadastre os livros para controle de leitura (A-Z)
      </p>
     </div>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Livro
     </Button>
    </div>
   </motion.div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId!==null?'Editar Livro':'Novo Livro'}
    description="Preencha os dados do livro."
    icon={BookOpen}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeDialog}
       className="h-11 rounded-xl border-border px-5"
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-livro"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {editingId!==null?'Salvar Alterações':'Salvar Livro'}
      </Button>
     </>
    }
   >
    <form
     id="form-livro"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

      <div className="space-y-2">
       <Label>Ordem</Label>

       <Input
        type="number"
        value={formData.ordem}
        onChange={e=>setFormData(p=>({...p,ordem:e.target.value}))}
        placeholder="Ex: 1"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Nome do Livro</Label>

       <Input
        value={formData.nome_livro}
        onChange={e=>setFormData(p=>({...p,nome_livro:e.target.value}))}
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
        onChange={e=>setFormData(p=>({...p,capitulos:e.target.value}))}
        placeholder="Ex: 50"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Testamento</Label>

       <Select
        value={formData.testamento}
        onValueChange={value=>setFormData(p=>({...p,testamento:value}))}
       >
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue placeholder="Selecione"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         <SelectItem value="Antigo">Antigo Testamento</SelectItem>
         <SelectItem value="Novo">Novo Testamento</SelectItem>
        </SelectContent>
       </Select>
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   <motion.div
    initial={{opacity:0,y:20}}
    animate={{opacity:1,y:0}}
    transition={{delay:.2}}
    className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
   >
    <div className="overflow-x-auto">
     <table className="w-full">
      <thead className="border-b border-border bg-secondary/50">
       <tr>
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
         Nome do Livro
        </th>
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
         Ordem (Orig.)
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

      <tbody className="divide-y divide-border">
       {loading?(
        <tr>
         <td colSpan="5" className="p-8 text-center text-muted-foreground">
          Carregando...
         </td>
        </tr>
       ):livros.length===0?(
        <tr>
         <td colSpan="5" className="p-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-10 w-10"/>
          Nenhum livro cadastrado
         </td>
        </tr>
       ):(
        livros.map(livro=>(
         <tr
          key={livro.id}
          className="transition-colors hover:bg-accent"
         >
          <td className="p-4 text-foreground">
           {livro.nome_livro}
          </td>

          <td className="p-4 text-foreground">
           {livro.ordem}
          </td>

          <td className="p-4 text-foreground">
           {livro.capitulos}
          </td>

          <td className="p-4 text-foreground">
           {livro.testamento}
          </td>

          <td className="p-4 text-right">
           <Button
            variant="ghost"
            size="icon"
            onClick={()=>openDialog(livro)}
            className="mr-2 text-blue-400 hover:text-blue-300"
           >
            <Edit className="h-4 w-4"/>
           </Button>

           <AlertDialog>
            <AlertDialogTrigger asChild>
             <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-400"
             >
              <Trash className="h-4 w-4"/>
             </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="dark-pessoal border-border bg-card">
             <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>

              <AlertDialogDescription>
               Deseja remover este livro?
              </AlertDialogDescription>
             </AlertDialogHeader>

             <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>

              <AlertDialogAction
               onClick={()=>handleDelete(livro.id)}
               className="bg-red-600 text-white hover:bg-red-700"
              >
               Deletar
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
   </motion.div>

  </div>
 );
};

export default Livros;
