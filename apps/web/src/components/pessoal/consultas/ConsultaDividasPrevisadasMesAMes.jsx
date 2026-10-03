import React,{useState,useEffect,useMemo}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{useToast}from'@/components/ui/use-toast';
import{formatCurrency}from'@/lib/utils';
import{Download,RefreshCw,CalendarDays,TrendingUp,Receipt,Loader2}from'lucide-react';
import{exportToExcel}from'@/lib/ExportUtils';

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const moneyFromCents=v=>formatCurrency(fromCents(v));

const MONTHS=[
 'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const currentYear=new Date().getFullYear();
const YEARS=Array.from({length:5},(_,i)=>currentYear-2+i);

const StatCard=({label,value,icon:Icon,red=false})=>(
 <Card className="border-border bg-card/80">
  <CardContent className="p-4">
   <div className="flex items-center gap-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${red?'bg-red-500/10':'bg-[hsl(var(--neon-pessoal)/.08)]'}`}>
     <Icon className={`h-5 w-5 ${red?'text-red-400':'text-[hsl(var(--neon-pessoal))]'}`}/>
    </div>
    <div className="min-w-0">
     <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
     <p className={`mt-1 truncate text-xl font-bold ${red?'text-red-400':'text-foreground'}`}>{value}</p>
    </div>
   </div>
  </CardContent>
 </Card>
);

export default function ConsultaDividasPrevisadasMesAMes(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[selectedYear,setSelectedYear]=useState(String(currentYear));
 const[monthlyData,setMonthlyData]=useState(
  MONTHS.map(month=>({month,total:0,percentage:0}))
 );
 const[loading,setLoading]=useState(true);

 const fetchData=async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const startDate=`${selectedYear}-01-01`;
   const endDate=`${selectedYear}-12-31`;

   const{data,error}=await supabase
    .from('despesas_previstas')
    .select('valor,data_vencimento')
    .eq('user_id',user.id)
    .gte('data_vencimento',startDate)
    .lte('data_vencimento',endDate);

   if(error)throw error;

   const totals=Array(12).fill(0);

   data?.forEach(item=>{
    const month=new Date(item.data_vencimento).getUTCMonth();
    totals[month]+=toCents(item.valor);
   });

   const total=totals.reduce((sum,value)=>sum+value,0);

   setMonthlyData(
    totals.map((value,index)=>({
     month:MONTHS[index],
     total:value,
     percentage:total>0?(value/total)*100:0
    }))
   );
  }catch(error){
   console.error(error);
   toast({
    variant:'destructive',
    title:'Erro',
    description:'Falha ao buscar dados anuais.'
   });
  }finally{
   setLoading(false);
  }
 };

 useEffect(()=>{
  fetchData();
 },[user,selectedYear]);

 const totalYear=useMemo(
  ()=>monthlyData.reduce((sum,item)=>sum+item.total,0),
  [monthlyData]
 );

 const averageMonth=Math.round(totalYear/12);
 const monthsWithDebt=monthlyData.filter(item=>item.total>0).length;

 const highestMonth=useMemo(
  ()=>monthlyData.reduce(
   (max,item)=>item.total>max.total?item:max,
   {month:'-',total:0}
  ),
  [monthlyData]
 );

 const handleExport=()=>{
  if(!monthlyData.length)return;

  exportToExcel(
   monthlyData.map(item=>({
    Mês:item.month,
    'Total Previsto':fromCents(item.total),
    'Percentual do Ano':`${item.percentage.toFixed(2)}%`
   })),
   `Dividas_Previstas_${selectedYear}`,
   'Dividas'
  );
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
      <CalendarDays className="h-5 w-5 text-red-400"/>
     </div>
     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-red-400">Consultas</p>
      <h1 className="text-2xl font-bold tracking-tight">Dívidas Previstas Mês a Mês</h1>
      <p className="text-sm text-muted-foreground">Acompanhe suas obrigações financeiras ao longo do ano.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4"/>Exportar
     </Button>

     <Button variant="outline" onClick={fetchData}>
      <RefreshCw className="mr-2 h-4 w-4"/>Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="grid gap-4 p-4 md:grid-cols-3">
     <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Ano</label>
      <Select value={selectedYear} onValueChange={setSelectedYear}>
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Ano"/>
       </SelectTrigger>
       <SelectContent className="dark-pessoal border-border bg-card">
        {YEARS.map(year=>(
         <SelectItem key={year} value={String(year)}>{year}</SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     <div className="flex items-end">
      <div className="w-full rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2">
       <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Período analisado</p>
       <p className="mt-1 font-medium">{`01/01/${selectedYear} a 31/12/${selectedYear}`}</p>
      </div>
     </div>

     <div className="flex items-end">
      <div className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2">
       <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Meses com previsão</p>
       <p className="mt-1 font-bold text-red-400">{monthsWithDebt} de 12</p>
      </div>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-4">
    <StatCard label="Total Previsto" value={moneyFromCents(totalYear)} icon={Receipt} red/>
    <StatCard label="Média Mensal" value={moneyFromCents(averageMonth)} icon={TrendingUp} red/>
    <StatCard label="Maior Mês" value={highestMonth.total?moneyFromCents(highestMonth.total):'R$ 0,00'} icon={CalendarDays} red/>
    <StatCard label="Ano" value={selectedYear} icon={CalendarDays}/>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="border-b border-border/50 pb-4">
     <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
       <CardTitle className="text-lg">Resumo de {selectedYear}</CardTitle>
       <p className="text-sm text-muted-foreground">Distribuição das despesas previstas por mês.</p>
      </div>
      <span className="text-lg font-bold text-red-400">{moneyFromCents(totalYear)}</span>
     </div>
    </CardHeader>

    <CardContent className="p-0">
     {loading?(
      <div className="flex h-64 items-center justify-center">
       <Loader2 className="h-7 w-7 animate-spin text-red-400"/>
      </div>
     ):(
      <div className="overflow-x-auto">
       <Table>
        <TableHeader>
         <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead className="text-right">Total Previsto</TableHead>
          <TableHead className="text-right">Percentual do Ano</TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>
         {monthlyData.map((item,index)=>(
          <TableRow
           key={index}
           className={item.total>0?'hover:bg-red-500/5':''}
          >
           <TableCell className="font-medium">{item.month}</TableCell>

           <TableCell className={`text-right font-semibold ${item.total>0?'text-red-400':'text-muted-foreground'}`}>
            {moneyFromCents(item.total)}
           </TableCell>

           <TableCell className="text-right text-muted-foreground">
            {item.percentage.toFixed(2)}%
           </TableCell>
          </TableRow>
         ))}
        </TableBody>
       </Table>
      </div>
     )}
    </CardContent>
   </Card>

  </div>
 );
}
