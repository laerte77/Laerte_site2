import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Users,User}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const PARENTESCOS=['Titular','Cônjuge','Filho(a)','Pai/Mãe','Irmão(ã)','Outro'];

const CartaoUsuarios=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const[usuarios,setUsuarios]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[formData,setFormData]=useState({
  nome:'',
  parentesco:'Titular'
 });

 const fetchUsuarios=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('pessoal_cartao_usuarios')
   .select('*')
   .eq('user_id',user.id)
   .order('nome',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar pessoas',
    description:error.message,
    variant:'destructive'
   });
  }else{
   setUsuarios(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchUsuarios();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_cartao_usuarios_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'pessoal_cartao_usuarios'},fetchUsuarios)
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchUsuarios]);

 const resetForm=useCallback(()=>{
  setFormData({
   nome:'',
   parentesco:'Titular'
  });
  setEditingId(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=usuario=>{
  if(usuario){
   setFormData({
    nome:usuario.nome||'',
    parentesco:usuario.parentesco||'Titular'
   });
   setEditingId(usuario.id);
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  if(!formData.nome.trim()){
   toast({
    title:'Campo obrigatório',
    description:'Informe o nome da pessoa.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   user_id:user.id,
   nome:formData.nome.trim(),
   parentesco:formData.parentesco
  };

  try{
   if(editingId){
    const{error}=await supabase
     .from('pessoal_cartao_usuarios')
     .update(payload)
     .eq('id',editingId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Pessoa atualizada.'
    });
   }else{
    const{error}=await supabase
     .from('pessoal_cartao_usuarios')
     .insert(payload);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Pessoa cadastrada.'
    });
   }

   resetForm();
   fetchUsuarios();
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
   .from('pessoal_cartao_usuarios')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Pessoa excluída.'
   });

   fetchUsuarios();
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
      <h2 className="mb-2 text-3xl font-bold text-[hsl(var(--neon-pessoal))]">
       Pessoas do Cartão
      </h2>

      <p className="text-muted-foreground">
       Cadastre quem usa os cartões e atribua responsáveis às compras (A-Z)
      </p>
     </div>

     <Button
      className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      onClick={()=>openDialog()}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Nova Pessoa
     </Button>
    </div>
   </motion.div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId?'Editar Pessoa':'Nova Pessoa'}
    description="Informe o nome e o parentesco da pessoa autorizada."
    icon={User}
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
       form="form-pessoa-cartao"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {editingId?'Salvar Alterações':'Salvar Pessoa'}
      </Button>
     </>
    }
   >
    <form
     id="form-pessoa-cartao"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

      <div className="space-y-2">
       <Label>Nome</Label>

       <Input
        value={formData.nome}
        onChange={e=>setFormData(p=>({...p,nome:e.target.value}))}
        placeholder="Ex: Maria Silva"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="space-y-2">
       <Label>Parentesco / Relação</Label>

       <select
        value={formData.parentesco}
        onChange={e=>setFormData(p=>({...p,parentesco:e.target.value}))}
        className="flex h-11 w-full rounded-xl border border-input bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
       >
        {PARENTESCOS.map(p=>(
         <option key={p} value={p}>
          {p}
         </option>
        ))}
       </select>
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   {loading?(
    <div className="py-12 text-center text-muted-foreground">
     Carregando...
    </div>
   ):usuarios.length===0?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      <Users className="mx-auto mb-3 h-12 w-12 opacity-50"/>
      <p>Nenhuma pessoa cadastrada.</p>
      <p className="mt-1 text-sm">
       Cadastre quem usa os cartões para atribuir responsáveis às compras.
      </p>
     </CardContent>
    </Card>
   ):(
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {usuarios.map(usuario=>(
      <motion.div
       key={usuario.id}
       initial={{opacity:0,y:10}}
       animate={{opacity:1,y:0}}
      >
       <Card className="border-blue-500/30 bg-gradient-to-br from-blue-600/10 to-blue-900/20">
        <CardContent className="p-5">

         <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
            <User className="h-5 w-5 text-blue-400"/>
           </div>

           <div>
            <h3 className="font-bold leading-tight text-foreground">
             {usuario.nome}
            </h3>

            <span className="text-xs text-muted-foreground">
             {usuario.parentesco||'—'}
            </span>
           </div>
          </div>

          <div className="flex gap-1">
           <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
            onClick={()=>openDialog(usuario)}
           >
            <Edit className="h-4 w-4"/>
           </Button>

           <AlertDialog>
            <AlertDialogTrigger asChild>
             <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:bg-red-500/10"
             >
              <Trash2 className="h-4 w-4"/>
             </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="dark-pessoal border-border bg-card">
             <AlertDialogHeader>
              <AlertDialogTitle>Excluir Pessoa</AlertDialogTitle>

              <AlertDialogDescription>
               Isso removerá a pessoa. As compras já lançadas manterão o nome do responsável até serem editadas. Deseja continuar?
              </AlertDialogDescription>
             </AlertDialogHeader>

             <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>

              <AlertDialogAction
               onClick={()=>handleDelete(usuario.id)}
               className="bg-red-600 hover:bg-red-700"
              >
               Excluir
              </AlertDialogAction>
             </AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>
          </div>
         </div>

        </CardContent>
       </Card>
      </motion.div>
     ))}
    </div>
   )}

  </div>
 );
};

export default CartaoUsuarios;
