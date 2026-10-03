import React,{useState,useMemo,useEffect,useCallback}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,CalendarClock,FileBarChart3}from'lucide-react';
import{format,parseISO,endOfMonth,isBefore,startOfDay}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';

const MONTHS=[
 {value:1,label:'Janeiro'},{value:2,label:'Fevereiro'},
 {value:3,label:'Março'},{value:4,label:'Abril'},
 {value:5,label:'Maio'},{value:6,label:'Junho'},
 {value:7,label:'Julho'},{value:8,label:'Agosto'},
 {value:9,label:'Setembro'},{value:10,label:'Outubro'},
 {value:11,label:'Novembro'},{value:12,label:'Dezembro'}
];

export default function ConsultaContasDoMesIgreja(){
 const{user}=useAuth();
 const currentDate=new Date();

 const[selectedMonth,setSelectedMonth]=useState(currentDate.getMonth()+1);
 const[selectedYear,setSelectedYear]=useState(currentDate.getFullYear());
 const[selectedStatus,setSelectedStatus]=useState('Todos');

 const[contasMes,setContasMes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);
  setError(null);

  try{
   const startDate=format(
    new Date(selectedYear,selectedMonth-1,1),
    'yyyy-MM-dd'
   );

   const endDate=format(
    endOfMonth(new Date(selectedYear,selectedMonth-1,1)),
    'yyyy-MM-dd'
   );

   const{data:previstas,error:previstasError}=await supabase
    .from('igreja_despesas_previstas')
    .select('*')
    .eq('user_id',user.id)
    .gte('vencimento',startDate)
    .lte('vencimento',endDate);

   if(previstasError)throw previstasError;

   const{data:reais,error:reaisError}=await supabase
    .from('igreja_despesas')
    .select('*')
    .eq('user_id',user.id)
    .gte('data',startDate)
    .lte('data',endDate);

   if(reaisError)throw reaisError;

   const processedData=previstas.map(prevista=>{
    const valorPrevisto=Number(prevista.valor)||0;
    const descPrevista=(prevista.despesa||'').toLowerCase().trim();

    const matchedReais=reais.filter(r=>{
     const descReal=(r.despesa||'').toLowerCase().trim();
     return descReal===descPrevista;
    });

    const valorReal=matchedReais.reduce(
     (sum,r)=>sum+(Number(r.valor)||0),0
    );

    const diferenca=valorReal-valorPrevisto;

    let calculatedStatus='Pendente';

    if(valorReal>=valorPrevisto&&valorPrevisto>0){
     calculatedStatus='Pago';
    }else if(valorReal>0&&valorReal<valorPrevisto){
     calculatedStatus='Pendente';
    }else if(valorReal===0){
     calculatedStatus='Pendente';
    }

    const vencimentoDate=parseISO(prevista.vencimento);

    if(
     calculatedStatus==='Pendente'&&
     isBefore(vencimentoDate,startOfDay(new Date()))
    ){
     calculatedStatus='Vencido';
    }

    if(valorReal===0&&prevista.status==='Pago'){
     calculatedStatus='Pago';
    }

    return{
     id:prevista.id,
     data_vencimento:prevista.vencimento,
     descricao:prevista.despesa,
     categoria:'Despesa Fixa',
     valor_previsto:valorPrevisto,
     valor_real:valorReal,
     diferenca,
     status:calculatedStatus
    };
   });

   processedData.sort(
    (a,b)=>new Date(a.data_vencimento)-new Date(b.data_vencimento)
   );

   setContasMes(processedData);
  }catch(err){
   setError(err.message);
  }finally{
   setLoading(false);
  }
 },[user,selectedMonth,selectedYear]);

 useEffect(()=>{
  fetchData();
 },[fetchData]);

 const years=useMemo(()=>{
  const current=new Date().getFullYear();
  return[
   current-2,
   current-1,
   current,
   current+1,
   current+2
  ];
 },[]);

 const filteredData=useMemo(()=>{
  return contasMes.filter(item=>{
   if(selectedStatus==='Todos')return true;
   return item.status===selectedStatus;
  });
 },[contasMes,selectedStatus]);

 const subtotals=useMemo(()=>{
  return filteredData.reduce(
   (acc,curr)=>({
    previsto:acc.previsto+curr.valor_previsto,
    real:acc.real+curr.valor_real,
    diferenca:acc.diferenca+curr.diferenca
   }),
   {previsto:0,real:0,diferenca:0}
  );
 },[filteredData]);

 const getStatusBadge=status=>{
  if(status==='Pago'){
   return(
    <Badge className="badge-pago">
     <CheckCircle2 className="w-3 h-3 mr-1"/>
     Pago
    </Badge>
   );
  }

  if(status==='Vencido'){
   return(
    <Badge className="badge-vencido">
     <AlertCircle className="w-3 h-3 mr-1"/>
     Vencido
    </Badge>
   );
  }

  return(
   <Badge className="badge-pendente">
    <Clock className="w-3 h-3 mr-1"/>
    Pendente
   </Badge>
  );
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   {/* CABEÇALHO */}
   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <FileBarChart3 className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>

      <h1 className="text-2xl font-bold text-foreground">
       Contas do Mês
      </h1>

      <p className="text-sm text-muted-foreground">
       Acompanhamento das despesas previstas, realizadas e respectivos status.
      </p>
     </div>
    </div>

    <Button
     variant="outline"
     onClick={fetchData}
     disabled={loading}
     className="border-[hsl(var(--neon-igreja))]/40"
    >
     <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>
     Atualizar
    </Button>
   </div>

   {/* FILTROS */}
   <Card className="bg-card border-border/60">
    <CardHeader className="border-b border-border/60">
     <CardTitle className="text-base">
      Filtros do relatório
     </CardTitle>
    </CardHeader>

    <CardContent>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Mês
       </label>

       <Select
        value={selectedMonth.toString()}
        onValueChange={val=>setSelectedMonth(Number(val))}
       >
        <SelectTrigger className="bg-input">
         <SelectValue placeholder="Mês"/>
        </SelectTrigger>

        <SelectContent>
         {MONTHS.map(month=>(
          <SelectItem
           key={month.value}
           value={month.value.toString()}
          >
           {month.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Ano
       </label>

       <Select
        value={selectedYear.toString()}
        onValueChange={val=>setSelectedYear(Number(val))}
       >
        <SelectTrigger className="bg-input">
         <SelectValue placeholder="Ano"/>
        </SelectTrigger>

        <SelectContent>
         {years.map(year=>(
          <SelectItem key={year} value={year.toString()}>
           {year}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Status
       </label>

       <Select
        value={selectedStatus}
        onValueChange={setSelectedStatus}
       >
        <SelectTrigger className="bg-input">
         <SelectValue placeholder="Status"/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="Todos">Todos os Status</SelectItem>
         <SelectItem value="Pago">Pago</SelectItem>
         <SelectItem value="Pendente">Pendente</SelectItem>
         <SelectItem value="Vencido">Vencido</SelectItem>
        </SelectContent>
       </Select>
      </div>

     </div>
    </CardContent>
   </Card>

   {/* RESUMO */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

    <Card className="bg-card border-border/60">
     <CardContent className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Total Previsto
      </p>

      <p className="text-2xl font-bold mt-1">
       {formatCurrency(subtotals.previsto)}
      </p>
     </CardContent>
    </Card>

    <Card className="bg-card border-border/60">
     <CardContent className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Total Realizado
      </p>

      <p className="text-2xl font-bold mt-1 text-emerald-500">
       {formatCurrency(subtotals.real)}
      </p>
     </CardContent>
    </Card>

    <Card className="bg-card border-border/60">
     <CardContent className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Diferença
      </p>

      <p className={`text-2xl font-bold mt-1 ${
       subtotals.diferenca<0
        ?'text-emerald-500'
        :subtotals.diferenca>0
         ?'text-destructive'
         :'text-muted-foreground'
      }`}>
       {formatCurrency(subtotals.diferenca)}
      </p>
     </CardContent>
    </Card>

   </div>

   {/* ERRO */}
   {error?(
    <Card className="bg-destructive/10 border-destructive/20">
     <CardContent className="flex flex-col items-center justify-center p-8 gap-3 text-destructive">
      <AlertCircle className="w-8 h-8"/>
      <p>Erro ao carregar dados: {error}</p>

      <Button
       variant="outline"
       onClick={fetchData}
      >
       Tentar Novamente
      </Button>
     </CardContent>
    </Card>
   ):(
    <Card className="bg-card border-border/60 overflow-hidden">

     <CardHeader className="border-b border-border/60">
      <CardTitle className="text-lg">
       Contas do período selecionado
      </CardTitle>
     </CardHeader>

     <CardContent className="p-0">

      {loading?(
       <div className="p-6">
        <LoadingSkeleton count={5} height="h-12"/>
       </div>
      ):(
       <div className="responsive-table-wrapper">
        <Table className="neon-zebra-table">

         <TableHeader className="bg-muted/50">
          <TableRow>
           <TableHead>Vencimento</TableHead>
           <TableHead>Descrição</TableHead>
           <TableHead>Categoria</TableHead>
           <TableHead className="text-right">Previsto</TableHead>
           <TableHead className="text-right">Real</TableHead>
           <TableHead className="text-right">Diferença</TableHead>
           <TableHead className="text-center">Status</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>

          {!filteredData.length?(
           <TableRow>
            <TableCell
             colSpan={7}
             className="h-24 text-center text-muted-foreground"
            >
             Nenhuma conta encontrada para o período e filtros selecionados.
            </TableCell>
           </TableRow>
          ):(
           filteredData.map(item=>(
            <TableRow
             key={item.id}
             className="hover:bg-primary/5"
            >

             <TableCell className="font-medium whitespace-nowrap">
              <div className="flex items-center gap-2">
               <CalendarClock className="w-4 h-4 text-[hsl(var(--neon-igreja))]"/>
               {format(
                parseISO(item.data_vencimento),
                'dd/MM/yyyy'
               )}
              </div>
             </TableCell>

             <TableCell className="font-medium">
              {item.descricao}
             </TableCell>

             <TableCell className="text-muted-foreground">
              {item.categoria}
             </TableCell>

             <TableCell className="text-right font-medium">
              {formatCurrency(item.valor_previsto)}
             </TableCell>

             <TableCell className="text-right text-emerald-500 font-medium">
              {item.valor_real>0
               ?formatCurrency(item.valor_real)
               :'-'}
             </TableCell>

             <TableCell className={`text-right font-medium ${
              item.diferenca<0
               ?'text-emerald-500'
               :item.diferenca>0
                ?'text-destructive'
                :'text-muted-foreground'
             }`}>
              {formatCurrency(item.diferenca)}
             </TableCell>

             <TableCell className="text-center">
              {getStatusBadge(item.status)}
             </TableCell>

            </TableRow>
           ))
          )}

          {filteredData.length>0&&(
           <TableRow className="bg-muted/50 font-bold border-t">

            <TableCell
             colSpan={3}
             className="text-right"
            >
             Totais:
            </TableCell>

            <TableCell className="text-right">
             {formatCurrency(subtotals.previsto)}
            </TableCell>

            <TableCell className="text-right text-emerald-500">
             {formatCurrency(subtotals.real)}
            </TableCell>

            <TableCell className={`text-right ${
             subtotals.diferenca<0
              ?'text-emerald-500'
              :subtotals.diferenca>0
               ?'text-destructive'
               :'text-muted-foreground'
            }`}>
             {formatCurrency(subtotals.diferenca)}
            </TableCell>

            <TableCell/>

           </TableRow>
          )}

         </TableBody>
        </Table>
       </div>
      )}

     </CardContent>
    </Card>
   )}

  </div>
 );
}
