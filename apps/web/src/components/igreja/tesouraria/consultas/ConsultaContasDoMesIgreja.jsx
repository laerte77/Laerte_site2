import React,{useState,useMemo,useEffect,useCallback}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,CalendarClock,FileBarChart,FileText,Filter}from'lucide-react';
import{format,parseISO,endOfMonth,isBefore,startOfDay}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';

const MONTHS=[
 {value:1,label:'Janeiro'},{value:2,label:'Fevereiro'},{value:3,label:'Março'},
 {value:4,label:'Abril'},{value:5,label:'Maio'},{value:6,label:'Junho'},
 {value:7,label:'Julho'},{value:8,label:'Agosto'},{value:9,label:'Setembro'},
 {value:10,label:'Outubro'},{value:11,label:'Novembro'},{value:12,label:'Dezembro'}
];

export default function ConsultaContasDoMesIgreja(){
 const{user}=useAuth(),now=new Date();
 const[selectedMonth,setSelectedMonth]=useState(now.getMonth()+1);
 const[selectedYear,setSelectedYear]=useState(now.getFullYear());
 const[selectedStatus,setSelectedStatus]=useState('Todos');
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);

  try{
   const startDate=format(new Date(selectedYear,selectedMonth-1,1),'yyyy-MM-dd');
   const endDate=format(endOfMonth(new Date(selectedYear,selectedMonth-1,1)),'yyyy-MM-dd');

   const{data:previstas,error:a}=await supabase
    .from('igreja_despesas_previstas')
    .select('*')
    .eq('user_id',user.id)
    .gte('vencimento',startDate)
    .lte('vencimento',endDate);

   if(a)throw a;

   const{data:reais,error:b}=await supabase
    .from('igreja_despesas')
    .select('*')
    .eq('user_id',user.id)
    .gte('data',startDate)
    .lte('data',endDate);

   if(b)throw b;

   const processed=(previstas||[]).map(p=>{
    const previsto=Number(p.valor)||0;
    const desc=(p.despesa||'').toLowerCase().trim();
    const reaisMes=(reais||[]).filter(r=>
     (r.despesa||'').toLowerCase().trim()===desc
    );

    const real=reaisMes.reduce((s,r)=>s+Number(r.valor||0),0);
    const diferenca=real-previsto;
    let status='Pendente';

    if(real>=previsto&&previsto>0)status='Pago';
    else if(real===0)status='Pendente';

    const venc=parseISO(p.vencimento);

    if(status==='Pendente'&&isBefore(venc,startOfDay(new Date())))
     status='Vencido';

    if(real===0&&p.status==='PAGO')status='Pago';

    return{
     id:p.id,
     data_vencimento:p.vencimento,
     descricao:p.despesa,
     categoria:'Despesa Fixa',
     valor_previsto:previsto,
     valor_real:real,
     diferenca,
     status
    };
   });

   processed.sort((a,b)=>new Date(a.data_vencimento)-new Date(b.data_vencimento));
   setData(processed);
  }catch(e){
   setError(e.message);
  }finally{
   setLoading(false);
  }
 },[user,selectedMonth,selectedYear]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filtered=useMemo(
  ()=>data.filter(x=>selectedStatus==='Todos'||x.status===selectedStatus),
  [data,selectedStatus]
 );

 const totals=useMemo(()=>filtered.reduce((a,c)=>({
  previsto:a.previsto+c.valor_previsto,
  real:a.real+c.valor_real,
  diferenca:a.diferenca+c.diferenca
 }),{previsto:0,real:0,diferenca:0}),[filtered]);

 const years=useMemo(()=>{
  const y=new Date().getFullYear();
  return[y-2,y-1,y,y+1,y+2];
 },[]);

 const statusBadge=s=>{
  if(s==='Pago')
   return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="mr-1 h-3 w-3"/>Pago</Badge>;
  if(s==='Vencido')
   return <Badge className="bg-red-500/10 text-red-400 border border-red-500/30"><AlertCircle className="mr-1 h-3 w-3"/>Vencido</Badge>;
  return <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"><Clock className="mr-1 h-3 w-3"/>Pendente</Badge>;
 };

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <FileBarChart className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>
      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Consultas • Tesouraria</p>
       <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--neon-igreja))]">Contas do Mês</h1>
       <p className="text-sm text-muted-foreground">Acompanhamento das despesas previstas e realizadas.</p>
      </div>
     </div>

     <Button variant="outline" onClick={fetchData} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-[hsl(var(--neon-igreja))]"/>Filtros</CardTitle>
    </CardHeader>
    <CardContent className="p-4">
     <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

      <Select value={String(selectedMonth)} onValueChange={v=>setSelectedMonth(Number(v))}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Mês"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        {MONTHS.map(m=><SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={String(selectedYear)} onValueChange={v=>setSelectedYear(Number(v))}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Ano"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        {years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Status"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <SelectItem value="Todos">Todos os Status</SelectItem>
        <SelectItem value="Pago">Pago</SelectItem>
        <SelectItem value="Pendente">Pendente</SelectItem>
        <SelectItem value="Vencido">Vencido</SelectItem>
       </SelectContent>
      </Select>

     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Previsto</p><p className="mt-1 text-2xl font-bold text-[hsl(var(--neon-igreja))]">{formatCurrency(totals.previsto)}</p></CardContent></Card>
    <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Realizado</p><p className="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(totals.real)}</p></CardContent></Card>
    <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Diferença</p><p className={`mt-1 text-2xl font-bold ${totals.diferenca<0?'text-emerald-400':totals.diferenca>0?'text-red-400':'text-muted-foreground'}`}>{formatCurrency(totals.diferenca)}</p></CardContent></Card>
   </div>

   {error?(
    <Card className="border-red-500/30 bg-red-500/10">
     <CardContent className="flex flex-col items-center gap-3 p-8 text-red-400">
      <AlertCircle className="h-8 w-8"/>
      <p>Erro ao carregar dados: {error}</p>
      <Button variant="outline" onClick={fetchData}>Tentar novamente</Button>
     </CardContent>
    </Card>
   ):(
    <Card className="overflow-hidden border-border bg-card/70">
     <CardHeader className="border-b border-border bg-muted/20 pb-3">
      <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Contas do período</CardTitle>
     </CardHeader>

     <CardContent className="p-0">
      {loading?(
       <div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>
      ):(
       <div className="overflow-x-auto">
        <Table>
         <TableHeader className="bg-secondary/30">
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
          {!filtered.length?(
           <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
          ):filtered.map(x=>(
           <TableRow key={x.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
            <TableCell className="font-medium"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/>{format(parseISO(x.data_vencimento),'dd/MM/yyyy')}</div></TableCell>
            <TableCell className="font-medium">{x.descricao}</TableCell>
            <TableCell className="text-muted-foreground">{x.categoria}</TableCell>
            <TableCell className="text-right">{formatCurrency(x.valor_previsto)}</TableCell>
            <TableCell className="text-right font-medium text-emerald-400">{x.valor_real?formatCurrency(x.valor_real):'-'}</TableCell>
            <TableCell className={`text-right font-medium ${x.diferenca<0?'text-emerald-400':x.diferenca>0?'text-red-400':'text-muted-foreground'}`}>{formatCurrency(x.diferenca)}</TableCell>
            <TableCell className="text-center">{statusBadge(x.status)}</TableCell>
           </TableRow>
          ))}

          {filtered.length>0&&(
           <TableRow className="bg-secondary/30 font-bold">
            <TableCell colSpan={3} className="text-right">Totais:</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.previsto)}</TableCell>
            <TableCell className="text-right text-emerald-400">{formatCurrency(totals.real)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.diferenca)}</TableCell>
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
