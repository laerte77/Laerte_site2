import React,{useState,useEffect}from'react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{formatCurrency}from'@/lib/utils';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{format,parseISO}from'date-fns';
import{Loader2,WalletCards}from'lucide-react';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

export default function ManualExpenseMatchModal({isOpen,onClose,expense,onSave}){
 const{toast}=useToast();
 const[loading,setLoading]=useState(false);
 const[actualExpenses,setActualExpenses]=useState([]);
 const[fetchingExpenses,setFetchingExpenses]=useState(false);
 const[matchMode,setMatchMode]=useState('link');
 const[selectedMatchId,setSelectedMatchId]=useState('none');
 const[manualAmount,setManualAmount]=useState('');

 useEffect(()=>{
  if(isOpen&&expense){
   setManualAmount(money(expense.valor_previsto));
   setMatchMode('link');
   setSelectedMatchId('none');
   fetchUnmatchedExpenses();
  }
 },[isOpen,expense]);

 const fetchUnmatchedExpenses=async()=>{
  if(!expense)return;

  setFetchingExpenses(true);

  try{
   const start=format(parseISO(expense.data_vencimento),'yyyy-MM-01');

   const{data,error}=await supabase
    .from('despesas')
    .select('*')
    .eq('user_id',(await supabase.auth.getUser()).data.user.id)
    .gte('data',start)
    .order('data',{ascending:false});

   if(error)throw error;

   setActualExpenses(data||[]);
  }catch(err){
   console.error(err);
   toast({
    variant:'destructive',
    title:'Erro',
    description:'Não foi possível buscar os lançamentos.'
   });
  }finally{
   setFetchingExpenses(false);
  }
 };

 const resetForm=()=>{
  setMatchMode('link');
  setSelectedMatchId('none');
  setManualAmount(expense?.valor_previsto?money(expense.valor_previsto):'');
 };

 const handleSave=async()=>{
  setLoading(true);

  try{
   if(matchMode==='link'&&selectedMatchId!=='none'){
    const{error}=await supabase
     .from('despesas_previstas')
     .update({
      matched_transaction_id:selectedMatchId,
      status:'Pago'
     })
     .eq('id',expense.id);

    if(error)throw error;
   }else if(matchMode==='manual'){
    const valor=moneyNum(manualAmount);

    if(valor<=0){
     toast({
      variant:'destructive',
      title:'Erro',
      description:'Informe um valor real pago válido.'
     });
     setLoading(false);
     return;
    }

    const{error}=await supabase
     .from('despesas_previstas')
     .update({
      status:'Pago',
      valor,
      matched_transaction_id:null
     })
     .eq('id',expense.id);

    if(error)throw error;
   }else{
    toast({
     variant:'destructive',
     title:'Seleção obrigatória',
     description:'Selecione um lançamento correspondente ou escolha o modo manual.'
    });
    setLoading(false);
    return;
   }

   toast({
    title:'Sucesso',
    description:'Status atualizado com sucesso!'
   });

   onSave?.();
   resetForm();
  }catch(err){
   toast({
    variant:'destructive',
    title:'Erro',
    description:err.message||'Não foi possível atualizar o status.'
   });
  }finally{
   setLoading(false);
  }
 };

 if(!expense)return null;

 return(
  <ModalLancamentoPadrao
   open={isOpen}
   onClose={onClose}
   title="Atualizar Status da Conta"
   description={`${expense.descricao} - ${formatCurrency(expense.valor_previsto)}`}
   icon={WalletCards}
   theme="red"
   footer={
    <>
     <Button
      type="button"
      variant="outline"
      onClick={onClose}
      disabled={loading}
      className="h-11 rounded-xl border-border px-5"
     >
      Cancelar
     </Button>

     <Button
      type="button"
      onClick={handleSave}
      disabled={loading||(matchMode==='link'&&selectedMatchId==='none')}
      className="h-11 rounded-xl bg-red-600 px-6 font-semibold text-white shadow-[0_0_18px_hsl(0_84%_60%/.22)] hover:bg-red-700"
     >
      {loading&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
      Confirmar
     </Button>
    </>
   }
  >
   <div className="space-y-5">

    <div className="space-y-2">
     <Label>Modo de Atualização</Label>

     <Select
      value={matchMode}
      onValueChange={setMatchMode}
      disabled={loading}
     >
      <SelectTrigger className="h-11 rounded-xl bg-input text-foreground">
       <SelectValue/>
      </SelectTrigger>

      <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
       <SelectItem value="link">
        Vincular a um Lançamento Existente
       </SelectItem>

       <SelectItem value="manual">
        Marcar como Pago Manualmente
       </SelectItem>
      </SelectContent>
     </Select>
    </div>

    {matchMode==='link'?(
     <div className="space-y-2">
      <Label>Lançamento Correspondente</Label>

      <Select
       value={selectedMatchId}
       onValueChange={setSelectedMatchId}
       disabled={loading||fetchingExpenses}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input text-foreground">
        <SelectValue
         placeholder={
          fetchingExpenses
           ?"Buscando..."
           :"Selecione o lançamento real"
         }
        />
       </SelectTrigger>

       <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
        <SelectItem value="none">
         Nenhum (Remover vínculo)
        </SelectItem>

        {actualExpenses.map(exp=>(
         <SelectItem key={exp.id} value={exp.id}>
          {format(parseISO(exp.data),'dd/MM')} - {exp.despesa} ({formatCurrency(Number(exp.valor))})
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>
    ):(
     <div className="space-y-2">
      <Label>Valor Real Pago (R$)</Label>

      <Input
       type="text"
       inputMode="numeric"
       value={manualAmount}
       onChange={e=>setManualAmount(money(e.target.value))}
       placeholder="R$ 0,00"
       disabled={loading}
       className="h-11 rounded-xl bg-input font-semibold tabular-nums text-foreground"
      />
     </div>
    )}

    <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3 text-sm text-muted-foreground">
     O status será alterado para
     <span className="ml-1 font-semibold text-red-400">Pago</span>
     após a confirmação.
    </div>

   </div>
  </ModalLancamentoPadrao>
 );
}
