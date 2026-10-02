import React,{useState,useEffect,useCallback,useMemo}from'react';
import{format,parseISO}from'date-fns';
import{ptBR}from'date-fns/locale';
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell}from'recharts';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle,CardDescription}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{RefreshCw,Download,Receipt,TrendingDown,CheckCircle2,AlertCircle,Clock,Check,Edit}from'lucide-react';
import{findMatchingExpense}from'@/lib/gastoRealUtils';
import{useStatusCalculation}from'@/hooks/useStatusCalculation';
import{useToast}from'@/components/ui/use-toast';
import StatusEditModal from'@/components/StatusEditModal';
import{exportToExcel}from'@/lib/ExportUtils';

const MONTHS=Array.from({length:12},(_,i)=>i);
const YEARS=[2024,2025,2026];

const money=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v||0));

const STATUS_STYLE={
 Paga:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
 'Parcialmente Paga':'bg-amber-500/15 text-amber-400 border-amber-500/30',
 Atrasada:'bg-red-500/15 text-red-400 border-red-500/30',
 Pendente:'bg-slate-500/15 text-slate-400 border-slate-500/30'
};

const StatusBadge=({status})=>{
 const config={
  Paga:{icon:CheckCircle2,label:'Paga'},
  'Parcialmente Paga':{icon:Check,label:'Parcial'},
  Atrasada:{icon:AlertCircle,label:'Atrasada'},
  Pendente:{icon:Clock,label:'Pendente'}
 };

 const item=config[status]||config.Pendente;
 const Icon=item.icon;

 return(
  <Badge
   variant="outline"
   className={`${STATUS_STYLE[status]||STATUS_STYLE.Pendente} inline-flex items-center gap-1 whitespace-nowrap`}
  >
   <Icon className="h-3 w-3"/>
   {item.label}
  </Badge>
 );
};

const StatCard=({label,value,icon:Icon,type='red',note})=>{
 const styles={
  red:{
   border:'border-red-500/20',
   bg:'from-red-500/10 to-red-700/10',
   icon:'bg-red-500/10',
   text:'text-red-400'
  },
  green:{
   border:'border-emerald-500/20',
   bg:'from-emerald-500/10 to-emerald-700/10',
   icon:'bg-emerald-500/10',
   text:'text-emerald-400'
  }
 };

 const s=styles[type];

 return(
  <Card className={`${s.border} bg-gradient-to-br ${s.bg}`}>
   <CardContent className="p-4">
    <div className="flex items-center gap-3">
     <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.icon}`}>
      <Icon className={`h-5 w-5 ${s.text}`}/>
     </div>

     <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xl font-bold ${s.text}`}>{value}</p>
      {note&&<p className="mt-1 text-xs text-muted-foreground">{note}</p>}
     </div>
    </div>
   </CardContent>
  </Card>
 );
};

const RelatorioDespesasPrevistas=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const{calculateStatus}=useStatusCalculation();

 const[loading,setLoading]=useState(true);
 const[isRefreshing,setIsRefreshing]=useState(false);
 const[chartData,setChartData]=useState([]);
 const[detailedItems,setDetailedItems]=useState([]);
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[statusModalOpen,setStatusModalOpen]=useState(false);
 const[selectedExpense,setSelectedExpense]=useState(null);

 const fetchRelatorio=useCallback(async(force=false)=>{
  if(!user)return;

  force?setIsRefreshing(true):setLoading(true);

  try{
   const year=Number(selectedYear);
   const month=Number(selectedMonth);
   const startDate=format(new Date(year,month,1),'yyyy-MM-dd');
   const endDate=format(new Date(year,month+1,0),'yyyy-MM-dd');

   const[plannedRes,actualRes]=await Promise.all([
    supabase
     .from('despesas_previstas')
     .select('*')
     .eq('user_id',user.id)
     .gte('data_vencimento',startDate)
     .lte('data_vencimento',endDate)
     .order('data_vencimento'),

    supabase
     .from('despesas')
     .select('*')
     .eq('user_id',user.id)
     .gte('data',startDate)
     .lte('data',endDate)
   ]);

   if(plannedRes.error)throw plannedRes.error;
   if(actualRes.error)throw actualRes.error;

   const processed=(plannedRes.data||[]).map(item=>{
    const matched=findMatchingExpense(actualRes.data||[],item);
    const gastoReal=matched?Number(matched.valor||0):0;
    const status=item.status||calculateStatus(
     item.data_vencimento,
     gastoReal,
     item.valor
    );

    return{
     ...item,
     gastoReal,
     status,
     matchedId:matched?.id
    };
   });

   const grouped=processed.reduce((acc,item)=>{
    const categoria=item.categoria||'Sem Categoria';
    acc[categoria]=(acc[categoria]||0)+Number(item.valor||0);
    return acc;
   },{});

   setDetailedItems(processed);

   setChartData(
    Object.entries(grouped)
     .map(([name,value])=>({name,value}))
     .sort((a,b)=>b.value-a.value)
   );
  }catch(error){
   console.error(error);
   toast({
    title:'Erro',
    description:'Falha ao carregar dados.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
   setIsRefreshing(false);
  }
 },[user,selectedMonth,selectedYear,calculateStatus,toast]);

 useEffect(()=>{
  fetchRelatorio();
 },[fetchRelatorio]);

 const totalPrevisto=useMemo(
  ()=>detailedItems.reduce((sum,item)=>sum+Number(item.valor||0),0),
  [detailedItems]
 );

 const totalRealizado=useMemo(
  ()=>detailedItems.reduce((sum,item)=>sum+Number(item.gastoReal||0),0),
  [detailedItems]
 );

 const totalPendente=Math.max(0,totalPrevisto-totalRealizado);

 const percentualRealizado=totalPrevisto>0
  ?(totalRealizado/totalPrevisto)*100
  :0;

 const handleExport=()=>{
  if(!detailedItems.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   detailedItems.map(item=>({
    Vencimento:format(parseISO(item.data_vencimento),'dd/MM/yyyy'),
    Descrição:item.descricao||'-',
    Categoria:item.categoria||'-',
    Previsto:Number(item.valor||0),
    Pago:Number(item.gastoReal||0),
    Status:item.status||'Pendente'
   })),
   `Despesas_Previstas_${selectedYear}_${String(Number(selectedMonth)+1).padStart(2,'0')}`,
   'Despesas Previstas'
  );
 };

 const handleOpenStatusModal=item=>{
  setSelectedExpense(item);
  setStatusModalOpen(true);
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
      <Receipt className="h-5 w-5 text-red-400"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-red-400">
       Relatórios
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Despesas Previstas
      </h1>

      <p className="text-sm text-muted-foreground">
       Analise valores previstos, realizados e status dos pagamentos.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!detailedItems.length}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={()=>fetchRelatorio(true)}
      disabled={isRefreshing}
     >
      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing?'animate-spin':''}`}/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="grid gap-4 p-4 md:grid-cols-2">
     <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Mês</label>

      <Select
       value={selectedMonth}
       onValueChange={setSelectedMonth}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        {MONTHS.map(month=>(
         <SelectItem
          key={month}
          value={String(month)}
         >
          {format(new Date(2024,month,1),'MMMM',{locale:ptBR})}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Ano</label>

      <Select
       value={selectedYear}
       onValueChange={setSelectedYear}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        {YEARS.map(year=>(
         <SelectItem
          key={year}
          value={String(year)}
         >
          {year}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <StatCard
     label="Total Previsto"
     value={money(totalPrevisto)}
     icon={Receipt}
     type="red"
    />

    <StatCard
     label="Total Realizado"
     value={money(totalRealizado)}
     icon={CheckCircle2}
     type="green"
     note={`${percentualRealizado.toFixed(1)}% do previsto`}
    />

    <StatCard
     label="Saldo Pendente"
     value={money(totalPendente)}
     icon={TrendingDown}
     type="red"
    />

    <StatCard
     label="Registros"
     value={detailedItems.length}
     icon={Receipt}
     type="red"
    />
   </div>

   <div className="grid gap-4 lg:grid-cols-3">
    <Card className="border-border bg-card lg:col-span-2">
     <CardHeader className="pb-3">
      <CardTitle className="text-lg text-red-400">
       Distribuição por Categoria
      </CardTitle>
      <CardDescription>
       Valores previstos em {format(new Date(Number(selectedYear),Number(selectedMonth),1),'MMMM',{locale:ptBR})}.
      </CardDescription>
     </CardHeader>

     <CardContent className="h-[320px]">
      {loading?(
       <div className="flex h-full items-center justify-center text-muted-foreground">
        Carregando...
       </div>
      ):chartData.length===0?(
       <div className="flex h-full items-center justify-center text-muted-foreground">
        Nenhum dado para o período.
       </div>
      ):(
       <ResponsiveContainer width="100%" height="100%">
        <BarChart
         data={chartData}
         layout="vertical"
         margin={{top:5,right:20,left:20,bottom:5}}
        >
         <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
         />

         <XAxis
          type="number"
          tickFormatter={value=>`R$${value}`}
         />

         <YAxis
          dataKey="name"
          type="category"
          width={110}
         />

         <Tooltip
          formatter={value=>money(value)}
         />

         <Bar
          dataKey="value"
          radius={[0,4,4,0]}
         >
          {chartData.map((item,index)=>(
           <Cell
            key={item.name}
            fill={index%3===0?'#ef4444':index%3===1?'#f87171':'#dc2626'}
           />
          ))}
         </Bar>
        </BarChart>
       </ResponsiveContainer>
      )}
     </CardContent>
    </Card>

    <div className="grid gap-4">
     <StatCard
      label="Previsto"
      value={money(totalPrevisto)}
      icon={Receipt}
      type="red"
     />

     <StatCard
      label="Realizado"
      value={money(totalRealizado)}
      icon={CheckCircle2}
      type="green"
     />
    </div>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-red-400">
      Detalhes das Despesas
     </CardTitle>

     <CardDescription>
      Status atual de cada despesa prevista.
     </CardDescription>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Vencimento</TableHead>
         <TableHead>Descrição</TableHead>
         <TableHead>Categoria</TableHead>
         <TableHead className="text-right">Previsto</TableHead>
         <TableHead className="text-right">Pago</TableHead>
         <TableHead className="text-center">Status</TableHead>
         <TableHead className="text-right">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={7}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):detailedItems.length===0?(
         <TableRow>
          <TableCell
           colSpan={7}
           className="py-8 text-center text-muted-foreground"
          >
           Nenhum registro encontrado.
          </TableCell>
         </TableRow>
        ):(
         detailedItems.map(item=>(
          <TableRow
           key={item.id}
           className="hover:bg-red-500/5"
          >
           <TableCell className="text-sm">
            {format(parseISO(item.data_vencimento),'dd/MM/yyyy')}
           </TableCell>

           <TableCell className="font-medium">
            {item.descricao||'—'}
           </TableCell>

           <TableCell>
            <Badge
             variant="outline"
             className="border-border bg-muted/30"
            >
             {item.categoria||'Sem Categoria'}
            </Badge>
           </TableCell>

           <TableCell className="text-right font-semibold text-red-400">
            {money(item.valor)}
           </TableCell>

           <TableCell className="text-right font-semibold text-emerald-400">
            {item.gastoReal>0?money(item.gastoReal):'—'}
           </TableCell>

           <TableCell className="text-center">
            <StatusBadge status={item.status}/>
           </TableCell>

           <TableCell className="text-right">
            <Button
             variant="ghost"
             size="icon"
             title="Alterar status"
             onClick={()=>handleOpenStatusModal(item)}
             className="text-muted-foreground hover:text-[hsl(var(--neon-pessoal))]"
            >
             <Edit className="h-4 w-4"/>
            </Button>
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

   <StatusEditModal
    isOpen={statusModalOpen}
    onClose={()=>setStatusModalOpen(false)}
    expense={selectedExpense}
    onUpdateSuccess={()=>fetchRelatorio(true)}
   />

  </div>
 );
};

export default RelatorioDespesasPrevistas;
