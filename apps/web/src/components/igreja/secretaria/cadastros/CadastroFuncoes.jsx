import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Briefcase}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const CadastroFuncoes=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[funcoes,setFuncoes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[open,setOpen]=useState(false);
 const[current,setCurrent]=useState(null);
 const[nome,setNome]=useState('');

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('igreja_funcoes')
    .select('*')
    .order('nome_funcao',{ascending:true});

   if(error)throw error;
   setFuncoes(data||[]);
  }catch(error){
   toast({
    title:'Erro ao buscar funções',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
 },[fetchData]);

 useEffect(()=>{
  if(!user)return;

  const channel=supabase
   .channel('igreja_funcoes_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'igreja_funcoes'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const reset=()=>{
  setNome('');
  setCurrent(null);
 };

 const openCreate=()=>{
  reset();
  setOpen(true);
 };

 const openEdit=funcao=>{
  setCurrent(funcao);
  setNome(funcao.nome_funcao||'');
  setOpen(true);
 };

 const close=()=>{
  setOpen(false);
  reset();
 };

 const save=async()=>{
  const value=nome.trim();

  if(!value){
   toast({
    title:'Campo obrigatório',
    description:'Informe o nome da função.',
    variant:'destructive'
   });
   return;
  }

  try{
   if(current){
    const{error}=await supabase
     .from('igreja_funcoes')
     .update({
      nome_funcao:value
     })
     .eq('id',current.id);

    if(error)throw error;

    toast({
     title:'Função atualizada',
     description:'A função foi atualizada com sucesso.'
    });
   }else{
    const{error}=await supabase
     .from('igreja_funcoes')
     .insert({
      nome_funcao:value,
      user_id:user.id
     });

    if(error)throw error;

    toast({
     title:'Função cadastrada',
     description:'A nova função foi cadastrada com sucesso.'
    });
   }

   close();
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    description:error.message,
    variant:'destructive'
   });
  }
 };

 const remove=async id=>{
  try{
   const{count,error:checkError}=await supabase
    .from('igreja_membros')
    .select('*',{count:'exact',head:true})
    .eq('funcao_id',id);

   if(checkError)throw checkError;

   if(count>0){
    toast({
     title:'Exclusão bloqueada',
     description:`Esta função está vinculada a ${count} membro(s).`,
     variant:'destructive'
    });
    return;
   }

   const{error}=await supabase
    .from('igreja_funcoes')
    .delete()
    .eq('id',id);

   if(error)throw error;

   toast({
    title:'Função removida',
    description:'A função foi excluída com sucesso.'
   });

   fetchData();
  }catch(error){
   toast({
    title:'Erro ao remover',
    description:error.message,
    variant:'destructive'
   });
  }
 };

 return(
  <motion.div
   initial={{opacity:0,y:12}}
   animate={{opacity:1,y:0}}
   className="dark-igreja space-y-5"
  >
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">
      Secretaria
     </p>
     <h1 className="text-2xl font-bold md:text-3xl">
      Funções
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">
      Cadastre e organize as funções exercidas pelos membros.
     </p>
    </div>

    <Button
     type="button"
     onClick={openCreate}
     className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))] hover:bg-[hsl(var(--neon-igreja))]/90"
    >
     <Plus className="mr-2 h-4 w-4"/>
     Nova Função
    </Button>
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border">
         <th className="p-4 text-left font-semibold text-muted-foreground">
          Função
         </th>
         <th className="p-4 text-right font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan="2" className="p-10 text-center text-muted-foreground">
           Carregando funções...
          </td>
         </tr>
        ):funcoes.length===0?(
         <tr>
          <td colSpan="2" className="p-12 text-center text-muted-foreground">
           <Briefcase className="mx-auto mb-3 h-10 w-10 opacity-40"/>
           Nenhuma função cadastrada.
          </td>
         </tr>
        ):(
         funcoes.map(funcao=>(
          <tr
           key={funcao.id}
           className="border-b border-border/50 last:border-0 hover:bg-muted/30"
          >
           <td className="p-4 font-medium">
            {funcao.nome_funcao}
           </td>

           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={()=>openEdit(funcao)}
              className="text-[hsl(var(--neon-igreja))] hover:bg-[hsl(var(--neon-igreja)/.10)]"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
               >
                <Trash className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-igreja border-border bg-card">
               <AlertDialogHeader>
                <AlertDialogTitle>
                 Excluir função
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja realmente excluir a função "{funcao.nome_funcao}"?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>
                 Cancelar
                </AlertDialogCancel>

                <AlertDialogAction
                 onClick={()=>remove(funcao.id)}
                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar função':'Nova função'}
    description="Informe o nome da função exercida na igreja."
    icon={current?Edit:Briefcase}
    theme="gold"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={close}
      >
       Cancelar
      </Button>

      <Button
       type="button"
       onClick={save}
       className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))] hover:bg-[hsl(var(--neon-igreja))]/90"
      >
       Salvar
      </Button>
     </>
    }
   >
    <div className="space-y-2">
     <Label htmlFor="nome_funcao">
      Nome da função
     </Label>

     <Input
      id="nome_funcao"
      value={nome}
      onChange={e=>setNome(e.target.value)}
      placeholder="Ex.: Diácono"
      className="h-11 bg-background/60"
      autoFocus
     />
    </div>
   </ModalLancamentoPadrao>
  </motion.div>
 );
};

export default CadastroFuncoes;
