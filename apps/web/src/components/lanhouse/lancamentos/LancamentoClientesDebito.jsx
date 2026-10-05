import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,UserX}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Badge}from'@/components/ui/badge';

export default function LancamentoClientesDebito(){
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[debitos,setDebitos]=useState([]),[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false),[currentDebito,setCurrentDebito]=useState(null),[itemToDelete,setItemToDelete]=useState(null);
 const initialFormState={data:new Date().toISOString().split('T')[0],cliente:'',servico:'',valor:'',status:'DEVENDO'};
 const[formData,setFormData]=useState(initialFormState);

 useEffect(()=>()=>{mounted.current=false},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[r1,r2,r3]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_clientes').select('nome').eq('user_id',user.id).order('nome',{ascending:true}),
    supabase.from('lm_servicos').select('servico').eq('user_id',user.id).order('servico',{ascending:true})
   ]);
   if(!mounted.current)return;
   setDebitos(r1.data||[]);setClientes(r2.data||[]);setServicos(r3.data||[]);
   if(r1.error)throw r1.error;
  }catch(error){
   if(mounted.current)toast({title:'Erro',variant:'destructive',description:error.message});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const ch=supabase.channel('lm_clientes_debito_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito'},fetchData).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,fetchData]);

 const reset=()=>{setFormData(initialFormState);setCurrentDebito(null)};

 const openDialog=(item=null)=>{
  if(item){
   setCurrentDebito(item);
   setFormData({
    data:item.data||initialFormState.data,
    cliente:item.cliente||'',
    servico:item.servico||'',
    valor:item.valor||'',
    status:item.status||'DEVENDO'
   });
  }else reset();
  setIsDialogOpen(true);
 };

 const save=async()=>{
  if(!formData.data||!formData.cliente||!formData.servico||!formData.valor){
   toast({title:'Erro',description:'Preencha todos os campos.',variant:'destructive'});return;
  }
  try{
   const payload={...formData,user_id:user.id,valor:Number(formData.valor)};
   const q=currentDebito
    ?supabase.from('lm_clientes_debito').update(payload).eq('id',currentDebito.id).eq('user_id',user.id)
    :supabase.from('lm_clientes_debito').insert(payload);
   const{error}=await q;
   if(error)throw error;
   toast({title:'Sucesso',description:currentDebito?'Débito atualizado.':'Débito registrado.'});
   reset();setIsDialogOpen(false);fetchData();
  }catch(error){
   toast({title:'Erro',variant:'destructive',description:error.message});
  }
 };

 const remove=async()=>{
  if(!itemToDelete)return;
  try{
   const{error}=await supabase.from('lm_clientes_debito').delete().eq('id',itemToDelete.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido'});
   setItemToDelete(null);fetchData();
  }catch(error){
   toast({title:'Erro',variant:'destructive',description:error.message});
  }
 };

 const status=s=>s==='PAGO'
  ?<Badge className="bg-green-500">Pago</Badge>
  :s==='DEVENDO'
   ?<Badge variant="destructive">Devendo</Badge>
   :<Badge className="bg-yellow-500">Parcial</Badge>;

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-6">
   <div className="flex items-center justify-between gap-3">
    <div>
     <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Clientes com Débito</h2>
     <p className="text-muted-foreground">Controle de clientes pendentes.</p>
    </div>
    <Button onClick={()=>openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus className="mr-2 h-4 w-4"/>Novo Débito</Button>
   </div>

   <div className="overflow-hidden rounded-xl border border-border bg-card/80 shadow-lg">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead><tr className="border-b border-border">
       <th className="p-4 text-left">Data</th><th className="p-4 text-left">Cliente</th><th className="p-4 text-left">Serviço</th>
       <th className="p-4 text-left">Status</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right">Ações</th>
      </tr></thead>
      <tbody>
       {loading?
        <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>:
        debitos.length===0?
        <tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><UserX className="mx-auto mb-2 h-8 w-8"/>Nenhum débito.</td></tr>:
        debitos.map(item=>
         <tr key={item.id} className="border-b border-border hover:bg-blue-500/10">
          <td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td>
          <td className="p-4">{item.cliente}</td><td className="p-4">{item.servico}</td><td className="p-4">{status(item.status)}</td>
          <td className="p-4 text-right font-semibold text-cyan-400">R$ {Number(item.valor||0).toFixed(2)}</td>
          <td className="p-4">
           <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={()=>openDialog(item)}><Edit className="h-4 w-4 text-cyan-400"/></Button>
            <Button variant="ghost" size="icon" onClick={()=>setItemToDelete(item)}><Trash className="h-4 w-4 text-red-500"/></Button>
           </div>
          </td>
         </tr>
        )
       }
      </tbody>
     </table>
    </div>
   </div>

   <Dialog open={isDialogOpen} onOpenChange={o=>{setIsDialogOpen(o);if(!o)reset()}}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} className="sm:max-w-lg bg-card border-border text-foreground">
     <DialogHeader><DialogTitle className="text-cyan-400">{currentDebito?'Editar':'Registrar'} Débito</DialogTitle></DialogHeader>

     <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
       <div><Label>Data</Label><Input type="date" value={formData.data} onChange={e=>setFormData({...formData,data:e.target.value})}/></div>
       <div><Label>Valor</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData({...formData,valor:e.target.value})}/></div>
      </div>

      <div><Label>Cliente</Label>
       <Select value={formData.cliente} onValueChange={v=>setFormData({...formData,cliente:v})}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent><ScrollArea className="h-48">{clientes.map(c=><SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent>
       </Select>
      </div>

      <div><Label>Serviço</Label>
       <Select value={formData.servico} onValueChange={v=>setFormData({...formData,servico:v})}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent><ScrollArea className="h-48">{servicos.map(s=><SelectItem key={s.servico} value={s.servico}>{s.servico}</SelectItem>)}</ScrollArea></SelectContent>
       </Select>
      </div>

      <div><Label>Status</Label>
       <Select value={formData.status} onValueChange={v=>setFormData({...formData,status:v})}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem>
        </SelectContent>
       </Select>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>{setIsDialogOpen(false);reset()}}>Cancelar</Button>
      <Button onClick={save} className="bg-cyan-500 hover:bg-cyan-600 text-white">Salvar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <AlertDialog open={!!itemToDelete} onOpenChange={()=>setItemToDelete(null)}>
    <AlertDialogContent className="bg-card border-border">
     <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={remove} className="bg-red-500">Deletar</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </motion.div>
 );
}
