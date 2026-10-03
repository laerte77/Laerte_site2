import React,{useState,useEffect,useMemo,useCallback,useRef}from'react';
import{FileSearch,CheckCircle,FileBarChart3,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Badge}from'@/components/ui/badge';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Label}from'@/components/ui/label';
import{ScrollArea}from'@/components/ui/scroll-area';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function RelatorioDespesasPrevistas(){
 const{toast}=useToast();
 const{user}=useAuth();
 const mounted=useRef(true);

 const[despesasPrevistas,setDespesasPrevistas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({mes:'todos',tipo:'todos'});

 useEffect(()=>()=>{mounted.current=false},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const[p,t]=await Promise.all([
    supabase.from('igreja_despesas_previstas').select('*').eq('user_id',user.id),
    supabase.from('igreja_tipos_despesa').select('despesa').eq('user_id',user.id)
   ]);

   if(p.error)throw p.error;
   if(t.error)throw t.error;

   if(mounted.current){
    setDespesasPrevistas(p.data||[]);
    setTiposDespesa(t.data||[]);
   }
  }catch(error){
   if(mounted.current)toast({
    title:'Erro ao buscar dados',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;

  const channel=supabase
   .channel('relatorio_igreja_despesas_previstas_changes_v2')
   .on(
    'postgres_changes',
    {event:'*',schema:'public',table:'igreja_despesas_previstas'},
    ()=>mounted.current&&fetchData()
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const processedDespesas=useMemo(()=>{
  if(loading)return[];

  const result=[];

  despesasPrevistas.forEach(dp=>{
   if(dp.forma_pagamento==='CARTÃO DE CRÉDITO'&&dp.parcelas>1){
    const valorParcela=parseFloat(dp.valor||0)/dp.parcelas;

    for(let i=0;i<dp.parcelas;i++){
     const vencimento=new Date(dp.vencimento);
     vencimento.setMonth(vencimento.getMonth()+i);

     result.push({
      ...dp,
      id:`${dp.id}-${i+1}`,
      valor:valorParcela,
      vencimento:vencimento.toISOString().split('T')[0],
      descricao:`${dp.despesa} (${i+1}/${dp.parcelas})`,
      original_id:dp.id,
      parcela_num:i+1,
      status:dp.status&&dp.status[i+1]
       ?dp.status[i+1]
       :'PENDENTE'
     });
    }
   }else{
    result.push({
     ...dp,
     original_id:dp.id,
     descricao:dp.despesa,
     status:dp.status==='PAGO'?'PAGO':'PENDENTE'
    });
   }
  });

  return result;
 },[despesasPrevistas,loading]);

 const filteredDespesas=useMemo(()=>processedDespesas
  .filter(d=>{
   const date=new Date(d.vencimento);

   if(
    filters.mes!=='todos'&&
    date.getMonth()!==parseInt(filters.mes)
   )return false;

   if(
    filters.tipo!=='todos'&&
    d.despesa!==filters.tipo
   )return false;

   return true;
  })
  .sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)),
 [processedDespesas,filters]);

 const toggleStatus=async item=>{
  if(!item.original_id)return;

  let newStatusValue;

  if(item.forma_pagamento==='CARTÃO DE CRÉDITO'&&item.parcelas>1){
   const original=despesasPrevistas.find(
    dp=>dp.id===item.original_id
   );

   if(!original)return;

   const status={
    ...(typeof original.status==='object'&&original.status!==null
     ?original.status
     :{})
   };

   status[item.parcela_num]=
    item.status==='PAGO'?'PENDENTE':'PAGO';

   newStatusValue={status};
  }else{
   newStatusValue={
    status:item.status==='PAGO'
     ?'PENDENTE'
     :'PAGO'
   };
  }

  const{error}=await supabase
   .from('igreja_despesas_previstas')
   .update(newStatusValue)
   .eq('id',item.original_id);

  if(error){
   toast({
    title:'Erro ao atualizar status',
    variant:'destructive'
   });
  }else{
   toast({title:'Status atualizado com sucesso!'});
   fetchData();
  }
 };

 const statusBadge=status=>status==='PAGO'
  ?<Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1"/>Pago</Badge>
  :<Badge variant="destructive"><span>Pendente</span></Badge>;

 const days=date=>{
  const diff=new Date(date)-new Date();
  const days=Math.ceil(diff/(1000*60*60*24));

  if(days<0)return`Vencido há ${Math.abs(days)} dias`;
  if(days===0)return'Vence hoje';
  return`Vence em ${days} dias`;
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <FileBarChart3 className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>
      <h1 className="text-2xl font-bold">
       Despesas Previstas
      </h1>
      <p className="text-sm text-muted-foreground">
       Acompanhe as contas previstas e seus respectivos pagamentos.
      </p>
     </div>
    </div>

    <Button
     variant="outline"
     onClick={fetchData}
     disabled={loading}
    >
     <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>
     Atualizar
    </Button>
   </div>

   <div className="bg-card p-4 md:p-6 rounded-xl border border-border">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

     <div>
      <Label>Filtrar por Mês de Vencimento</Label>
      <Select
       value={filters.mes}
       onValueChange={v=>setFilters({...filters,mes:v})}
      >
       <SelectTrigger className="bg-input mt-2">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos os Meses</SelectItem>
         {meses.map((m,i)=>(
          <SelectItem key={i} value={String(i)}>
           {m}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div>
      <Label>Filtrar por Tipo de Despesa</Label>
      <Select
       value={filters.tipo}
       onValueChange={v=>setFilters({...filters,tipo:v})}
      >
       <SelectTrigger className="bg-input mt-2">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos os Tipos</SelectItem>
         {tiposDespesa.map(t=>(
          <SelectItem key={t.despesa} value={t.despesa}>
           {t.despesa}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

    </div>
   </div>

   <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="responsive-table-wrapper">
     <table className="w-full text-sm">

      <thead className="bg-muted/50">
       <tr className="border-b">
        <th className="p-4 text-left">Descrição</th>
        <th className="p-4 text-left">Vencimento</th>
        <th className="p-4 text-left">Dias Restantes</th>
        <th className="p-4 text-left">Status</th>
        <th className="p-4 text-right">Valor</th>
        <th className="p-4 text-center">Ação</th>
       </tr>
      </thead>

      <tbody>
       {loading?(
        <tr>
         <td colSpan="6" className="p-10 text-center">
          Carregando...
         </td>
        </tr>
       ):filteredDespesas.length===0?(
        <tr>
         <td colSpan="6" className="p-10 text-center text-muted-foreground">
          <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-50"/>
          Nenhuma despesa prevista encontrada.
         </td>
        </tr>
       ):(
        filteredDespesas.map(item=>(
         <tr
          key={item.id}
          className="border-b last:border-0 hover:bg-primary/5"
         >
          <td className="p-4 font-medium">
           {item.descricao}
          </td>

          <td className="p-4">
           {new Date(item.vencimento).toLocaleDateString(
            'pt-BR',
            {timeZone:'UTC'}
           )}
          </td>

          <td className="p-4 text-muted-foreground">
           {item.status!=='PAGO'
            ?days(item.vencimento)
            :'-'}
          </td>

          <td className="p-4">
           {statusBadge(item.status)}
          </td>

          <td className="p-4 text-right font-semibold text-red-400">
           R$ {parseFloat(item.valor||0).toFixed(2)}
          </td>

          <td className="p-4 text-center">
           <Button
            size="sm"
            variant="ghost"
            onClick={()=>toggleStatus(item)}
            className="text-green-400"
           >
            <CheckCircle className="w-4 h-4 mr-2"/>
            {item.status==='PAGO'
             ?'Marcar Pendente'
             :'Marcar Pago'}
           </Button>
          </td>
         </tr>
        ))
       )}
      </tbody>

     </table>
    </div>
   </div>

  </div>
 );
}
