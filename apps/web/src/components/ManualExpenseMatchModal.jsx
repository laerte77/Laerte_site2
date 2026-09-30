import React,{useState,useEffect}from'react';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription}from'@/components/ui/dialog';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Search,Check}from'lucide-react';
import{format,parseISO}from'date-fns';
import{normalizeString}from'@/lib/gastoRealUtils';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';

const ManualExpenseMatchModal=({isOpen,onClose,plannedExpense,actualExpenses,onMatchSuccess})=>{
 const{toast}=useToast();
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedId,setSelectedId]=useState(null);
 const[loading,setLoading]=useState(false);

 useEffect(()=>{
  if(isOpen){
   setSearchTerm('');
   setSelectedId(plannedExpense?.matched_transaction_id||null);
  }
 },[isOpen,plannedExpense]);

 const filteredExpenses=actualExpenses.filter(expense=>{
  if(!searchTerm)return true;
  const term=normalizeString(searchTerm);
  return normalizeString(expense.despesa||'').includes(term)||normalizeString(expense.categoria||'').includes(term);
 });

 const handleSave=async()=>{
  if(!plannedExpense)return;
  setLoading(true);
  try{
   const{error}=await supabase.from('despesas_previstas').update({matched_transaction_id:selectedId}).eq('id',plannedExpense.id);
   if(error)throw error;
   toast({title:'Sucesso',description:selectedId?'Despesa vinculada manualmente com sucesso!':'Vínculo manual removido. Voltando ao modo automático.'});
   onMatchSuccess();onClose();
  }catch(error){
   console.error(error);
   toast({title:'Erro',description:'Falha ao salvar vínculo manual.',variant:'destructive'});
  }finally{setLoading(false)}
 };

 return <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="flex h-[80vh] flex-col sm:max-w-[600px]">
   <DialogHeader>
    <DialogTitle>Vincular Gasto Real</DialogTitle>
    <DialogDescription>Selecione a transação real que corresponde à despesa prevista: <span className="font-semibold text-foreground">{plannedExpense?.descricao}</span></DialogDescription>
   </DialogHeader>

   <div className="relative mb-2">
    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true"/>
    <Input placeholder="Buscar despesa realizada..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9" aria-label="Buscar despesa realizada"/>
   </div>

   <ScrollArea className="flex-1 rounded-md border p-2">
    <div className="space-y-2">
     {!filteredExpenses.length?<div className="py-8 text-center text-muted-foreground">Nenhuma despesa encontrada neste mês.</div>:filteredExpenses.map(expense=>{
      const isSelected=selectedId===expense.id;
      return <button key={expense.id} type="button" onClick={()=>setSelectedId(isSelected?null:expense.id)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:transition-none ${isSelected?'border-primary bg-primary/5 ring-1 ring-primary':'border-border hover:bg-muted'}`} aria-pressed={isSelected}>
       <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium">{expense.despesa}</span>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
         <span>{format(parseISO(expense.data),'dd/MM/yyyy')}</span>
         {expense.categoria&&<Badge variant="secondary" className="h-4 text-[10px]">{expense.categoria}</Badge>}
        </div>
       </div>
       <div className="ml-3 flex shrink-0 items-center gap-3">
        <span className="text-sm font-bold">{expense.valor?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
        {isSelected&&<Check className="h-4 w-4 text-primary" aria-hidden="true"/>}
       </div>
      </button>
     })}
    </div>
   </ScrollArea>

   <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
    <div className="flex flex-1 justify-start">
     {selectedId&&<Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={()=>setSelectedId(null)}>Remover Vínculo</Button>}
    </div>
    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
    <Button type="button" onClick={handleSave} disabled={loading} className="bg-primary">Confirmar</Button>
   </DialogFooter>
  </DialogContent>
 </Dialog>
};

export default ManualExpenseMatchModal;
