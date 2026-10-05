import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,CalendarClock}from'lucide-react';
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
import{format}from'date-fns';

export default function LancamentoDespesaPrevista(){
 const{toast}=useToast(),{user}=useAuth();
 const[despesas,setDespesas]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false),[currentDespesa,setCurrentDespesa]=useState(null),[itemToDelete,setItemToDelete]=useState(null);
 const initialFormState={data_compra:new Date().toISOString().split('T')[0],descricao:'',data_vencimento:'',valor:'',forma_pagamento:'',parcelas:1,categoria:'',status:'Pendente'};
 const[formData,setFormData]=useState(initialFormState);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[d,t]=await Promise.all([
    supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).order('data_vencimento',{ascending:false}),
    supabase.from('lm_despesas').select('despesa,categoria').eq('user_id',user.id).order('despesa',{ascending:true})
   ]);
   if(d.error)throw d.error;
   if(t.error)throw t.error;
   setDespesas(d.data||[]);setTiposDespesa(t.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',variant:'destructive',description:error.message});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const ch=supabase.channel('lm_despesas_previstas_changes_v4')
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas_previstas'},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas'},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,fetchData]);

 const reset=()=>{setFormData(initialFormState);setCurrentDespesa(null)};

 const openDialog=item=>{
  if(item)setFormData({
   data_compra:item.data_compra||initialFormState.data_compra,
   descricao:item.descricao||'',
   data_vencimento:item.data_vencimento||'',
   valor:item.valor||'',
   forma_pagamento:item.forma_pagamento||'',
   parcelas:item.parcelas||1,
   categoria:item.categoria||'',
   status:item.status||'Pendente'
  }),setCurrentDespesa(item);
  else reset();
  setIsDialogOpen(true);
 };

 const save=async()=>{
  if(!formData.descricao||!formData.data_vencimento||!formData.valor){
   toast({title:'Erro',description:'Descrição, vencimento e valor são obrigatórios.',variant:'destructive'});return;
  }
  try{
   const payload={...formData,user_id:user.id,valor:Number(formData.valor),parcelas:formData.forma_pagamento==='CARTÃO DE CRÉDITO'?formData.parcelas:null};
   const q=currentDespesa
    ?supabase.from('lm_despesas_previstas').update(payload).eq('id',currentDespesa.id).eq('user_id',user.id)
    :supabase.from('lm_despesas_previstas').insert(payload);
   const{error}=await q;
   if(error)throw error;
   toast({title:'Sucesso!',description:currentDespesa?'Despesa prevista atualizada.':'Despesa registrada.'});
   reset();setIsDialogOpen(false);fetchData();
  }catch(error){
   toast({title:'Erro ao salvar',variant:'destructive',description:error.message});
  }
 };

 const remove=async()=>{
  if(!itemToDelete)return;
  try{
   const{error}=await supabase.from('lm_despesas_previstas').delete().eq('id',itemToDelete.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido'});setItemToDelete(null);fetchData();
  }catch(error){
   toast({title:'Erro',variant:'destructive',description:error.message});
  }
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-6">
   <div className="flex items-center justify-between gap-3">
    <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Despesas Previstas</h2><p className="text-muted-foreground">Gerencie contas a pagar.</p></div>
    <Button onClick={()=>openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button>
   </div>

   <div className="overflow-hidden rounded-xl border border-cyan-500/10 bg-card/80 shadow-lg">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead><tr className="border-b border-cyan-500/10">
       <th className="p-4 text-left">Descrição</th><th className="p-4 text-left">Vencimento</th><th className="p-4 text-left">Categoria</th><th className="p-4 text-left">Pagamento</th><th className="p-4 text-right">Valor</th><th className="p-4 text-right">Ações</th>
      </tr></thead>
      <tbody>
       {loading?
        <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>:
        despesas.length===0?
        <tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><CalendarClock className="mx-auto mb-2 h-10 w-10"/>Nenhuma despesa.</td></tr>:
        despesas.map(item=>
         <tr key={item.id} className="border-b border-cyan-500/10 hover:bg-blue-500/10">
          <td className="p-4">{item.descricao}</td>
          <td className="p-4">{format(new Date(item.data_vencimento),'dd/MM/yyyy')}</td>
          <td className="p-4"><Badge variant="outline" className="text-cyan-400">{item.categoria||'OUTROS'}</Badge></td>
          <td className="p-4">{item.forma_pagamento}</td>
          <td className="p-4 text-right font-semibold text-cyan-400">R$ {Number(item.valor||0).toFixed(2)}</td>
          <td className="p-4"><div className="flex justify-end gap-2">
           <Button variant="ghost" size="icon" onClick={()=>openDialog(item)}><Edit className="h-4 w-4 text-cyan-400"/></Button>
           <Button variant="ghost" size="icon" onClick={()=>setItemToDelete(item)}><Trash className="h-4 w-4 text-red-500"/></Button>
          </div></td>
         </tr>
        )
       }
      </tbody>
     </table>
    </div>
   </div>

   <Dialog open={isDialogOpen} onOpenChange={o=>{setIsDialogOpen(o);if(!o)reset()}}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} className="sm:max-w-lg bg-card border-cyan-500/20 text-foreground">
     <DialogHeader><DialogTitle className="text-cyan-400">{currentDespesa?'Editar':'Nova'} Despesa Prevista</DialogTitle></DialogHeader>

     <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
       <div className="col-span-2"><Label>Descrição</Label>
        <Select value={formData.descricao} onValueChange={v=>{const c=tiposDespesa.find(x=>x.despesa===v);setFormData(p=>({...p,descricao:v,categoria:c?.categoria||''}))}}>
         <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
         <SelectContent><ScrollArea className="h-48">{tiposDespesa.map(d=><SelectItem key={d.despesa} value={d.despesa}>{d.despesa}</SelectItem>)}</ScrollArea></SelectContent>
        </Select>
       </div>
       <div><Label>Categoria</Label><Input value={formData.categoria} readOnly disabled/></div>
       <div><Label>Data Compra</Label><Input type="date" value={formData.data_compra} onChange={e=>setFormData({...formData,data_compra:e.target.value})}/></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div><Label>Vencimento</Label><Input type="date" value={formData.data_vencimento} onChange={e=>setFormData({...formData,data_vencimento:e.target.value})}/></div>
       <div><Label>Valor</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData({...formData,valor:e.target.value})}/></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div><Label>Pagamento</Label>
        <Select value={formData.forma_pagamento} onValueChange={v=>setFormData({...formData,forma_pagamento:v})}>
         <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
         <SelectContent>
          <SelectItem value="BOLETO">Boleto</SelectItem><SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="DINHEIRO">Dinheiro</SelectItem>
         </SelectContent>
        </Select>
       </div>
       <div><Label>Parcelas</Label><Input type="number" min="1" value={formData.parcelas} onChange={e=>setFormData({...formData,parcelas:parseInt(e.target.value)||1})} disabled={formData.forma_pagamento!=='CARTÃO DE CRÉDITO'}/></div>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>{setIsDialogOpen(false);reset()}}>Cancelar</Button>
      <Button onClick={save} className="bg-cyan-500 hover:bg-cyan-600 text-white">Salvar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <AlertDialog open={!!itemToDelete} onOpenChange={()=>setItemToDelete(null)}>
    <AlertDialogContent className="bg-card border-cyan-500/20">
     <AlertDialogHeader><AlertDialogTitle className="text-cyan-400">Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader>
     <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-500">Deletar</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </motion.div>
 );
}
