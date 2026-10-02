import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,TrendingUp}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const TiposReceita=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[tipos,setTipos]=useState([]);
 const[loading,setLoading]=useState(true);
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
  }else{
   setTipos(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchTipos();

  if(!user)return;

  const channel=supabase
   .channel('tipos_receita_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'tipos_receita'},fetchTipos)
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchTipos]);

 const resetForm=useCallback(()=>{
  setNomeReceita('');
  setEditingId(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=tipo=>{
  if(tipo){
   setNomeReceita(tipo.nome_receita||'');
   setEditingId(tipo.id);
  }else{
   resetForm();
  }

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

  const dataToSave={
   nome_receita:nomeReceita.trim(),
   user_id:user.id
  };

  try{
   if(editingId!==null){
    const{error}=await supabase
     .from('tipos_receita')
     .update(dataToSave)
     .eq('id',editingId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de receita atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('tipos_receita')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de receita cadastrado.'
    });
   }

   resetForm();
   fetchTipos();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar o tipo de receita.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('tipos_receita')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o tipo de receita.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Tipo de receita excluído.'
   });

   fetchTipos();
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
      <h2 className="mb-2 text-3xl font-bold text-foreground">
       Tipos de Receita
      </h2>

      <p className="text-muted-foreground">
       Cadastre os tipos de receita (A-Z)
      </p>
     </div>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Tipo
     </Button>
    </div>
   </motion.div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId!==null?'Editar Tipo de Receita':'Novo Tipo de Receita'}
    description="Preencha o nome do tipo de receita."
    icon={TrendingUp}
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
       form="form-tipo-receita"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {editingId!==null?'Salvar Alterações':'Salvar Tipo'}
      </Button>
     </>
    }
   >
    <form
     id="form-tipo-receita"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

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
      <thead className="border-b border-border bg-muted/50">
       <tr>
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
         Nome da Receita
        </th>

        <th className="p-4 text-right text-sm font-semibold text-muted-foreground">
         Ações
        </th>
       </tr>
      </thead>

      <tbody className="divide-y divide-border">
       {loading?(
        <tr>
         <td colSpan="2" className="p-8 text-center">
          Carregando...
         </td>
        </tr>
       ):tipos.length===0?(
        <tr>
         <td colSpan="2" className="p-8 text-center text-muted-foreground">
          <TrendingUp className="mx-auto mb-2 h-10 w-10"/>
          Nenhum tipo de receita cadastrado
         </td>
        </tr>
       ):(
        tipos.map(tipo=>(
         <tr
          key={tipo.id}
          className="transition-colors hover:bg-accent"
         >
          <td className="p-4 text-foreground">
           {tipo.nome_receita}
          </td>

          <td className="p-4 text-right">
           <Button
            variant="ghost"
            size="icon"
            onClick={()=>openDialog(tipo)}
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
              <AlertDialogTitle>
               Confirmar Exclusão
              </AlertDialogTitle>

              <AlertDialogDescription>
               Deseja remover este tipo de receita?
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

export default TiposReceita;
