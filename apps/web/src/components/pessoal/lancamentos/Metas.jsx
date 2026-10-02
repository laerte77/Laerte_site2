import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogFooter}from'@/components/ui/alert-dialog';
import{Progress}from'@/components/ui/progress';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const showMoney=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);

const Metas=()=>{
 const{toast}=useToast(),{user}=useAuth(),isMountedRef=useRef(true);
 const[metas,setMetas]=useState([]),[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false),[currentItem,setCurrentItem]=useState(null);
 const[formData,setFormData]=useState({descricao:'',valor:'',meta:''});
 const[itemToDelete,setItemToDelete]=useState(null);

 useEffect(()=>{isMountedRef.current=true;return()=>{isMountedRef.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase
    .from('metas')
    .select('*')
    .eq('user_id',user.id)
    .order('created_at',{ascending:false});
   if(!isMountedRef.current)return;
   if(error)throw error;
   setMetas(data||[]);
  }catch(error){
   if(isMountedRef.current)toast({
    title:'Erro',
    variant:'destructive',
    description:error.message||'Não foi possível carregar as metas.'
   });
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase
   .channel('metas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'metas'},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const resetForm=()=>{
  setFormData({descricao:'',valor:'',meta:''});
  setCurrentItem(null);
 };

 const handleSave=async()=>{
  if(!formData.descricao||!formData.meta){
   toast({
    title:'Erro',
    description:'Descrição e Meta são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   descricao:formData.descricao,
   valor:moneyNum(formData.valor),
   meta:moneyNum(formData.meta),
   user_id:user.id
  };

  if(dataToSave.meta<=0){
   toast({
    title:'Erro',
    description:'A Meta deve ser maior que zero.',
    variant:'destructive'
   });
   return;
  }

  try{
   if(currentItem){
    const{error}=await supabase
     .from('metas')
     .update(dataToSave)
     .eq('id',currentItem.id);
    if(error)throw error;
   }else{
    const{error}=await supabase
     .from('metas')
     .insert(dataToSave);
    if(error)throw error;
   }

   if(!isMountedRef.current)return;

   toast({
    title:'Sucesso',
    description:currentItem?'Meta atualizada.':'Meta salva.'
   });

   resetForm();
   fetchData();
   setIsDialogOpen(true);
  }catch(error){
   if(isMountedRef.current){
    toast({
     title:'Erro',
     description:error.message||'Não foi possível salvar a meta.',
     variant:'destructive'
    });
   }
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrentItem(item);
   setFormData({
    descricao:item.descricao||'',
    valor:money(item.valor),
    meta:money(item.meta)
   });
  }else{
   resetForm();
  }
  setIsDialogOpen(true);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const handleDelete=async()=>{
  if(!itemToDelete)return;

  try{
   const{error}=await supabase
    .from('metas')
    .delete()
    .eq('id',itemToDelete.id);

   if(error)throw error;

   if(!isMountedRef.current)return;

   toast({
    title:'Removido',
    description:'Meta removida.'
   });

   setItemToDelete(null);
   fetchData();
  }catch(error){
   if(isMountedRef.current){
    toast({
     title:'Erro',
     description:error.message||'Não foi possível remover a meta.',
     variant:'destructive'
    });
   }
  }
 };

 return(
  <React.Fragment>

   <motion.div
    initial={{opacity:0,y:20}}
    animate={{opacity:1,y:0}}
    className="dark-pessoal space-y-6"
   >
    <div className="flex items-center justify-between">
     <div>
      <h2 className="text-3xl font-bold text-blue-500">
       Metas Financeiras
      </h2>
      <p className="text-muted-foreground">
       Acompanhe seus objetivos.
      </p>
     </div>

     <Button
      onClick={()=>openDialog()}
      className="bg-blue-600 text-white hover:bg-blue-700"
     >
      <Plus className="w-4 h-4 mr-2"/>
      Nova Meta
     </Button>
    </div>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {loading?(
      <p className="col-span-full p-8 text-center">
       Carregando...
      </p>
     ):metas.length===0?(
      <div className="col-span-full p-8 text-center text-muted-foreground">
       Nenhuma meta.
      </div>
     ):(
      metas.map(item=>{
       const atual=Number(item.valor)||0;
       const meta=Number(item.meta)||0;
       const percent=meta>0
        ?Math.min(100,Math.max(0,(atual/meta)*100))
        :0;

       return(
        <div
         key={item.id}
         className="group rounded-xl border border-border bg-card p-4 shadow-sm"
        >
         <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-bold">
           {item.descricao}
          </h3>

          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
           <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-500"
            onClick={()=>openDialog(item)}
           >
            <Edit className="w-4 h-4"/>
           </Button>

           <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={()=>setItemToDelete(item)}
           >
            <Trash className="w-4 h-4"/>
           </Button>
          </div>
         </div>

         <div className="space-y-2">
          <div className="flex justify-between text-sm">
           <span className="text-muted-foreground">
            Atual: {showMoney(atual)}
           </span>
           <span className="text-muted-foreground">
            Meta: {showMoney(meta)}
           </span>
          </div>

          <Progress value={percent} className="h-2"/>

          <div className="text-right text-xs text-muted-foreground">
           {percent.toFixed(1)}% concluído
          </div>
         </div>
        </div>
       );
      })
     )}
    </div>
   </motion.div>

   <Dialog
    open={isDialogOpen}
    onOpenChange={open=>open?setIsDialogOpen(true):closeDialog()}
   >
    <DialogContent
     className="dark-pessoal bg-card border-border text-foreground sm:max-w-lg"
     onInteractOutside={e=>e.preventDefault()}
     onPointerDownOutside={e=>e.preventDefault()}
     onEscapeKeyDown={e=>e.preventDefault()}
    >
     <DialogHeader>
      <DialogTitle className="text-xl text-blue-500">
       {currentItem?'Editar':'Nova'} Meta
      </DialogTitle>
     </DialogHeader>

     <div className="space-y-4 py-4">

      <div>
       <Label>Descrição</Label>
       <Input
        type="text"
        value={formData.descricao}
        onChange={e=>setFormData({
         ...formData,
         descricao:e.target.value
        })}
        className="bg-input"
        placeholder="Ex.: Viagem, carro, reserva..."
       />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

       <div>
        <Label>Valor Atual</Label>
        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={e=>setFormData({
          ...formData,
          valor:money(e.target.value)
         })}
         className="bg-input"
         placeholder="R$ 0,00"
        />
       </div>

       <div>
        <Label>Meta</Label>
        <Input
         type="text"
         inputMode="numeric"
         value={formData.meta}
         onChange={e=>setFormData({
          ...formData,
          meta:money(e.target.value)
         })}
         className="bg-input"
         placeholder="R$ 0,00"
        />
       </div>

      </div>

     </div>

     <DialogFooter>
      <Button
       variant="outline"
       onClick={closeDialog}
      >
       Cancelar
      </Button>

      <Button
       onClick={handleSave}
       className="bg-blue-600 text-white hover:bg-blue-700"
      >
       Salvar
      </Button>
     </DialogFooter>

    </DialogContent>
   </Dialog>

   <AlertDialog
    open={!!itemToDelete}
    onOpenChange={open=>{if(!open)setItemToDelete(null)}}
   >
    <AlertDialogContent className="dark-pessoal">
     <AlertDialogHeader>
      <AlertDialogTitle>
       Excluir Meta?
      </AlertDialogTitle>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>
       Cancelar
      </AlertDialogCancel>

      <AlertDialogAction
       onClick={handleDelete}
       className="bg-red-600"
      >
       Excluir
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </React.Fragment>
 );
};

export default Metas;
