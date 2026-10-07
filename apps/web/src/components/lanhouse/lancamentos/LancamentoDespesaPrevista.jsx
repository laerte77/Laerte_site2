import React,{useState,useEffect,useCallback}from'react';
import{supabase}from'@/lib/customSupabaseClient.js';
import{useAuth}from'@/contexts/SupabaseAuthContext.jsx';
import{Button}from'@/components/ui/button.jsx';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table.jsx';
import{useToast}from'@/components/ui/use-toast.js';
import{Badge}from'@/components/ui/badge.jsx';
import{ChevronLeft,ChevronRight,TrendingDown,TrendingUp,Minus,CheckCircle2,Loader2,CalendarDays}from'lucide-react';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card.jsx';
import{format,addMonths,subMonths,isBefore,startOfMonth,endOfMonth,parseISO,isSameMonth,isSameYear}from'date-fns';
import{ptBR}from'date-fns/locale';
import{calculateGastoReal}from'@/lib/gastoRealUtils.js';
import{Tooltip,TooltipContent,TooltipProvider,TooltipTrigger}from'@/components/ui/tooltip.jsx';

const CYAN='#06b6d4';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});

const DespesasPrevisadasMes=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const[loading,setLoading]=useState(true);
 const[updatingId,setUpdatingId]=useState(null);
 const[items,setItems]=useState([]);
 const[currentDate,setCurrentDate]=useState(new Date());
 const[stats,setStats]=useState({
  previstoAnterior:0,
  gastoRealAnterior:0,
  previstoAtual:0,
  gastoRealAtual:0,
  diffGastoReal:0
 });

 const formatCurrency=value=>BRL.format(value||0);

 const processMonthData=(plannedData,actualData,targetDate)=>{
  let totalPrevisto=0;

  const processedItems=plannedData.map(item=>{
   const today=new Date();
   today.setHours(0,0,0,0);

   const vencimento=parseISO(item.data_vencimento);

   const match=actualData.find(actual=>{
    const actualDate=parseISO(actual.data);
    const isSameMonthYear=isSameMonth(actualDate,targetDate)&&isSameYear(actualDate,targetDate);

    if(!isSameMonthYear)return false;

    const descMatch=actual.despesa.trim().toLowerCase()===item.descricao.trim().toLowerCase();
    const isEnergy=item.descricao.toLowerCase().includes('energia');
    const valueMatch=Math.abs(parseFloat(actual.valor)-parseFloat(item.valor))<0.5;

    return descMatch&&(isEnergy||valueMatch);
   });

   let displayStatus=item.status;

   if(item.status!=='Paga'){
    if(isBefore(vencimento,today))displayStatus='Atrasada';
   }

   let gastoReal=0;

   if(match)gastoReal=parseFloat(match.valor);

   totalPrevisto+=parseFloat(item.valor);

   return{
    ...item,
    displayStatus,
    gastoReal:match?gastoReal:null,
    diferenca:parseFloat(item.valor)-(match?gastoReal:0)
   };
  });

  return{processedItems,totalPrevisto};
 };

 const fetchItems=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  const currentStart=format(startOfMonth(currentDate),'yyyy-MM-dd');
  const currentEnd=format(endOfMonth(currentDate),'yyyy-MM-dd');

  const prevMonthDate=subMonths(currentDate,1);
  const prevStart=format(startOfMonth(prevMonthDate),'yyyy-MM-dd');
  const prevEnd=format(endOfMonth(prevMonthDate),'yyyy-MM-dd');

  try{
   const{data:plannedCurrent,error:pcError}=await supabase
    .from('lm_despesas_previstas')
    .select('*')
    .eq('user_id',user.id)
    .gte('data_vencimento',currentStart)
    .lte('data_vencimento',currentEnd)
    .order('data_vencimento',{ascending:false});

   if(pcError)throw pcError;

   const{data:plannedPrev,error:ppError}=await supabase
    .from('lm_despesas_previstas')
    .select('*')
    .eq('user_id',user.id)
    .gte('data_vencimento',prevStart)
    .lte('data_vencimento',prevEnd);

   if(ppError)throw ppError;

   const fetchActual=async(start,end)=>{
    const{data:raw,error}=await supabase
     .from('lm_lanc_despesas')
     .select(`
      data,
      valor,
      lm_despesas (
       despesa
      )
     `)
     .eq('user_id',user.id)
     .gte('data',start)
     .lte('data',end);

    if(error)throw error;

    return raw.map(item=>({
     data:item.data,
     valor:item.valor,
     despesa:item.lm_despesas?.despesa||'Desconhecido'
    }));
   };

   const rawActualCurrent=await fetchActual(currentStart,currentEnd);
   const rawActualPrev=await fetchActual(prevStart,prevEnd);

   const filterExpenses=list=>list.filter(item=>{
    const desc=item.despesa?.toLowerCase()||'';
    return!desc.includes('dízimo')&&!desc.includes('dizimo')&&!desc.includes('oferta');
   });

   const actualCurrent=filterExpenses(rawActualCurrent);
   const actualPrev=filterExpenses(rawActualPrev);

   const currentData=processMonthData(plannedCurrent,actualCurrent,currentDate);
   const prevData=processMonthData(plannedPrev,actualPrev,prevMonthDate);

   const totalGastoRealAtual=await calculateGastoReal(user.id,currentDate,'lanhouse');
   const totalGastoRealAnterior=await calculateGastoReal(user.id,prevMonthDate,'lanhouse');

   setItems(currentData.processedItems);

   setStats({
    previstoAnterior:prevData.totalPrevisto,
    gastoRealAnterior:totalGastoRealAnterior,
    previstoAtual:currentData.totalPrevisto,
    gastoRealAtual:totalGastoRealAtual,
    diffGastoReal:totalGastoRealAtual-totalGastoRealAnterior
   });

  }catch(error){
   console.error(error);
   toast({
    title:'Erro',
    description:'Erro ao carregar dados.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,currentDate,toast]);

 useEffect(()=>{
  fetchItems();
 },[fetchItems]);

 const handleMarkAsPaid=async(id,currentStatus)=>{
  setUpdatingId(id);

  const newStatus=currentStatus==='Paga'?'Pendente':'Paga';

  try{
   const{error}=await supabase
    .from('lm_despesas_previstas')
    .update({status:newStatus})
    .eq('id',id);

   if(error)throw error;

   toast({
    title:'Sucesso',
    description:`Despesa marcada como ${newStatus}.`
   });

   await fetchItems();
  }catch(error){
   toast({
    title:'Erro',
    description:'Não foi possível atualizar o status.',
    variant:'destructive'
   });
  }finally{
   setUpdatingId(null);
  }
 };

 const navigateMonth=direction=>{
  setCurrentDate(prev=>direction==='next'?addMonths(prev,1):subMonths(prev,1));
 };

 const getStatusBadge=status=>{
  switch(status){
   case'Paga':
    return <Badge className="bg-green-500 hover:bg-green-600">Paga</Badge>;
   case'Atrasada':
    return <Badge className="bg-red-500 hover:bg-red-600">Atrasada</Badge>;
   default:
    return <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">Pendente</Badge>;
  }
 };

 return(
  <div className="space-y-5">

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>
      LM Impressões
     </p>

     <div className="mt-1 flex items-center gap-2">
      <CalendarDays className="h-6 w-6" style={{color:CYAN}}/>
      <h1 className="text-2xl font-bold">Despesas do Mês</h1>
     </div>

     <p className="mt-1 text-sm text-muted-foreground">
      Compare despesas previstas com os gastos realizados.
     </p>
    </div>

    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
     <Button
      variant="ghost"
      size="icon"
      onClick={()=>navigateMonth('prev')}
     >
      <ChevronLeft className="h-5 w-5"/>
     </Button>

     <span className="w-40 text-center text-sm font-semibold capitalize">
      {format(currentDate,'MMMM yyyy',{locale:ptBR})}
     </span>

     <Button
      variant="ghost"
      size="icon"
      onClick={()=>navigateMonth('next')}
     >
      <ChevronRight className="h-5 w-5"/>
     </Button>
    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

    <Card>
     <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Previsto — Mês Anterior
      </p>
      <p className="mt-1 text-xl font-bold">
       {formatCurrency(stats.previstoAnterior)}
      </p>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Gasto Real — Mês Anterior
      </p>
      <p className="mt-1 text-xl font-bold">
       {formatCurrency(stats.gastoRealAnterior)}
      </p>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Previsto — Mês Atual
      </p>
      <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>
       {formatCurrency(stats.previstoAtual)}
      </p>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Gasto Real — Mês Atual
      </p>

      <p className="mt-1 text-xl font-bold text-blue-400">
       {formatCurrency(stats.gastoRealAtual)}
      </p>

      <div className="mt-1 text-xs">
       {stats.diffGastoReal>0?
        <span className="inline-flex items-center text-red-400">
         <TrendingUp className="mr-1 h-3 w-3"/>
         Gastou {formatCurrency(stats.diffGastoReal)} a mais
        </span>
       :
       stats.diffGastoReal<0?
        <span className="inline-flex items-center text-green-400">
         <TrendingDown className="mr-1 h-3 w-3"/>
         Economizou {formatCurrency(Math.abs(stats.diffGastoReal))}
        </span>
       :
        <span className="inline-flex items-center text-muted-foreground">
         <Minus className="mr-1 h-3 w-3"/>
         Mesmo valor
        </span>
       }
       <span className="ml-1 text-muted-foreground">vs mês anterior</span>
      </div>
     </CardContent>
    </Card>

   </div>

   <Card>
    <CardHeader>
     <CardTitle className="text-base">Despesas Previstas</CardTitle>
     <CardDescription>
      Acompanhe vencimentos, pagamentos e diferenças entre o previsto e o realizado.
     </CardDescription>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>

       <TableHeader className="bg-secondary/70">
        <TableRow>
         <TableHead>Descrição</TableHead>
         <TableHead>Vencimento</TableHead>
         <TableHead>Valor Previsto</TableHead>
         <TableHead>Gasto Real</TableHead>
         <TableHead>Diferença</TableHead>
         <TableHead className="text-center">Status</TableHead>
         <TableHead className="text-right">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>

        {loading?
         <TableRow>
          <TableCell colSpan={7} className="py-12 text-center">
           <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{color:CYAN}}/>
          </TableCell>
         </TableRow>
        :
        items.length===0?
         <TableRow>
          <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
           Nenhuma despesa prevista para este mês.
          </TableCell>
         </TableRow>
        :
        items.map(item=>
         <TableRow key={item.id} className="hover:bg-muted/40">

          <TableCell className="font-semibold">
           {item.descricao}
          </TableCell>

          <TableCell>
           {format(parseISO(item.data_vencimento),'dd/MM/yyyy')}
          </TableCell>

          <TableCell>
           {formatCurrency(parseFloat(item.valor))}
          </TableCell>

          <TableCell>
           {item.gastoReal?
            <span className="font-medium text-blue-300">
             {formatCurrency(item.gastoReal)}
            </span>
           :
            <span className="text-muted-foreground">-</span>
           }
          </TableCell>

          <TableCell>
           {item.gastoReal?
            <span className={
             item.diferenca>0
              ?'font-medium text-green-400'
              :item.diferenca<0
              ?'font-medium text-red-400'
              :''
            }>
             {item.diferenca>0?'+':''}
             {formatCurrency(item.diferenca)}
            </span>
           :
            <span className="text-xs italic text-muted-foreground">
             Aguardando pagamento
            </span>
           }
          </TableCell>

          <TableCell className="text-center">
           {getStatusBadge(item.displayStatus)}
          </TableCell>

          <TableCell className="text-right">
           <TooltipProvider>
            <Tooltip>
             <TooltipTrigger asChild>
              <Button
               variant="ghost"
               size="icon"
               disabled={updatingId===item.id}
               onClick={()=>handleMarkAsPaid(item.id,item.status)}
               className={
                item.status==='Paga'
                 ?'text-green-400 hover:bg-green-400/10 hover:text-green-300'
                 :'text-muted-foreground hover:text-foreground'
               }
              >
               {updatingId===item.id?
                <Loader2 className="h-4 w-4 animate-spin"/>
               :
                <CheckCircle2 className="h-4 w-4"/>
               }
              </Button>
             </TooltipTrigger>

             <TooltipContent>
              <p>
               {item.status==='Paga'
                ?'Marcar como Pendente'
                :'Marcar como Paga'}
              </p>
             </TooltipContent>
            </Tooltip>
           </TooltipProvider>
          </TableCell>

         </TableRow>
        )}

       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default DespesasPrevisadasMes;
