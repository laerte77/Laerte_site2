import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,TrendingDown,Tag}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Badge}from'@/components/ui/badge';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const TiposDespesa=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[tipos,setTipos]=useState([]);
 const[loading,setLoading]=useState(true);
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
   .on('postgres_changes',{event:'*',schema:'public',table:'tipos_despesa'},fetchTipos)
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchTipos]);

 const resetForm=useCallback(()=>{
  setNomeDespesa('');
  setCategoria('');
  setEditingId(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

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

  const dataToSave={
   nome_despesa:nomeDespesa.trim(),
   categoria:categoria.trim(),
   user_id:user.id
  };

  try{
   if(editingId!==null){
    const{error}=await supabase
     .from('tipos_despesa')
     .update(dataToSave)
     .eq('id',editingId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de despesa atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('tipos_despesa')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Tipo de despesa cadastrado.'
    });
   }

   resetForm();
   fetchTipos();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar o tipo de despesa.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('tipos_despesa')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o tipo de despesa.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Tipo de despesa excluído.'
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
       Tipos de Despesa
      </h2>

      <p className="text-muted-foreground">
       Cadastre e categorize seus tipos de despesa (A-Z)
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
    title={editingId!==null?'Editar Tipo de Despesa':'Novo Tipo de Despesa'}
    description="Preencha os dados do tipo de despesa."
    icon={TrendingDown}
    theme="red"
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
       form="form-tipo-despesa"
       className="h-11 rounded-xl px-6 font-semibold text-white shadow-[0_0_18px_hsl(0_84%_60%/.22)] hover:opacity-90"
       style={{background:'hsl(0 84% 60%)'}}
      >
       {editingId!==null?'Salvar Alterações':'Salvar Tipo'}
      </Button>
     </>
    }
   >
    <form
     id="form-tipo-despesa"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

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

      <tbody className="divide-y divide-border">
       {loading?(
        <tr>
         <td colSpan="3" className="p-8 text-center">
          Carregando...
         </td>
        </tr>
       ):tipos.length===0?(
        <tr>
         <td colSpan="3" className="p-8 text-center text-muted-foreground">
          <TrendingDown className="mx-auto mb-2 h-10 w-10"/>
          Nenhum tipo de despesa cadastrado
         </td>
        </tr>
       ):(
        tipos.map(tipo=>(
         <tr
          key={tipo.id}
          className="transition-colors hover:bg-muted/50"
         >
          <td className="p-4 font-medium text-foreground">
           {tipo.nome_despesa}
          </td>

          <td className="p-4">
           {tipo.categoria?(
            <Badge
             variant="outline"
             className="flex w-fit items-center gap-1 border-blue-400/30 font-normal text-blue-400"
            >
             <Tag className="h-3 w-3"/>
             {tipo.categoria}
            </Badge>
           ):(
            <span className="text-sm italic text-muted-foreground">
             Sem categoria
            </span>
           )}
          </td>

          <td className="p-4 text-right">
           <div className="flex items-center justify-end gap-2">

            <Button
             variant="ghost"
             size="icon"
             onClick={()=>openDialog(tipo)}
             className="h-8 w-8 text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"
            >
             <Edit className="h-4 w-4"/>
            </Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-400"
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
                Deseja remover este tipo de despesa?
               </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>Cancelar</AlertDialogCancel>

               <AlertDialogAction
                onClick={()=>handleDelete(tipo.id)}
                className="bg-red-600 hover:bg-red-700"
               >
                Deletar
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
   </motion.div>

  </div>
 );
};

export default TiposDespesa;
