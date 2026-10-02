import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,Users,User,RefreshCw}from'lucide-react';
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
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const PARENTESCOS=[
 'Titular',
 'Cônjuge',
 'Filho(a)',
 'Pai/Mãe',
 'Irmão(ã)',
 'Outro'
];

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
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_cartao_usuarios'
    },
    fetchUsuarios
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchUsuarios]);

 const resetForm=()=>{
  setFormData({
   nome:'',
   parentesco:'Titular'
  });
  setEditingId(null);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

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
     .eq('id',editingId)
     .eq('user_id',user.id);

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

   closeDialog();
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
   description:'Pessoa excluída.'
  });

  fetchUsuarios();
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <Users className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Pessoas do Cartão
      </h1>

      <p className="text-sm text-muted-foreground">
       Cadastre os responsáveis que utilizam seus cartões.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={fetchUsuarios}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Nova Pessoa
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-2">
     <CardTitle className="text-sm font-medium text-muted-foreground">
      Pessoas cadastradas
     </CardTitle>
    </CardHeader>

    <CardContent>
     <p className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
      {usuarios.length}
     </p>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId?'Editar Pessoa':'Nova Pessoa'}
    description="Informe o nome e o parentesco da pessoa."
    icon={User}
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
       form="form-pessoa-cartao"
       className="bg-[hsl(var(--neon-pessoal))] text-white hover:opacity-90"
      >
       {editingId?'Salvar Alterações':'Salvar Pessoa'}
      </Button>
     </>
    }
   >
    <form
     id="form-pessoa-cartao"
     onSubmit={handleSave}
     className="space-y-5"
    >
     <div className="space-y-2">
      <Label>Nome</Label>

      <Input
       value={formData.nome}
       onChange={e=>setFormData(prev=>({
        ...prev,
        nome:e.target.value
       }))}
       placeholder="Ex: Maria Silva"
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>

     <div className="space-y-2">
      <Label>Parentesco / Relação</Label>

      <select
       value={formData.parentesco}
       onChange={e=>setFormData(prev=>({
        ...prev,
        parentesco:e.target.value
       }))}
       className="flex h-11 w-full rounded-xl border border-input bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
       {PARENTESCOS.map(parentesco=>(
        <option
         key={parentesco}
         value={parentesco}
        >
         {parentesco}
        </option>
       ))}
      </select>
     </div>
    </form>
   </ModalLancamentoPadrao>

   {loading?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      Carregando...
     </CardContent>
    </Card>
   ):usuarios.length===0?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      <Users className="mx-auto mb-3 h-12 w-12 opacity-50"/>
      <p>Nenhuma pessoa cadastrada.</p>
      <p className="mt-1 text-sm">
       Cadastre quem utiliza os cartões para atribuir responsáveis.
      </p>
     </CardContent>
    </Card>
   ):(
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {usuarios.map(usuario=>(
      <Card
       key={usuario.id}
       className="border-border bg-gradient-to-br from-blue-500/10 to-blue-800/10"
      >
       <CardContent className="p-5">

        <div className="flex items-start justify-between gap-3">
         <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
           <User className="h-5 w-5 text-blue-400"/>
          </div>

          <div>
           <h3 className="font-semibold">
            {usuario.nome}
           </h3>

           <p className="text-xs text-muted-foreground">
            {usuario.parentesco||'—'}
           </p>
          </div>
         </div>

         <div className="flex gap-1">
          <Button
           variant="ghost"
           size="icon"
           className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
           onClick={()=>openDialog(usuario)}
           title="Editar"
          >
           <Edit className="h-4 w-4"/>
          </Button>

          <AlertDialog>
           <AlertDialogTrigger asChild>
            <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 text-red-400 hover:bg-red-500/10"
             title="Excluir"
            >
             <Trash2 className="h-4 w-4"/>
            </Button>
           </AlertDialogTrigger>

           <AlertDialogContent className="dark-pessoal border-border bg-card">
            <AlertDialogHeader>
             <AlertDialogTitle>
              Excluir Pessoa
             </AlertDialogTitle>

             <AlertDialogDescription>
              Isso removerá <strong>{usuario.nome}</strong>.
              Deseja continuar?
             </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
             <AlertDialogCancel>
              Cancelar
             </AlertDialogCancel>

             <AlertDialogAction
              onClick={()=>handleDelete(usuario.id)}
              className="bg-red-600 text-white hover:bg-red-700"
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
     ))}
    </div>
   )}
  </div>
 );
};

export default CartaoUsuarios;
