import React,{useState,useEffect,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import{Loader2,TrendingUp,FileText,RefreshCw,Filter,DollarSign}from'lucide-react';
import{getAccessibleDataQuery}from'@/lib/dataAccessUtils';
import{parseISO,getMonth,getYear}from'date-fns';
import{generatePDF}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function ConsultaEntradasMesAMes(){
 const{user,isAdmin}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(false);
 const currentYear=new Date().getFullYear();
 const[filterYear,setFilterYear]=useState(String(currentYear));
 const years=Array.from({length:5},(_,i)=>String(currentYear-i));

 const fetchData=async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const year=Number(filterYear);
   const start=new Date(year,0,1).toISOString();
   const end=new Date(year,11,31,23,59,59).toISOString();

   const{data:result,error}=await getAccessibleDataQuery(
    user.id,isAdmin,'igreja_entradas','data,valor'
   ).gte('data',start).lte('data',end);

   if(error)throw error;
   setData(result||[]);
  }catch(e){
   toast({title:'Erro',description:e.message,variant:'destructive'});
  }finally{
   setLoading(false);
  }
 };

 useEffect(()=>{fetchData()},[user,isAdmin,filterYear]);

 const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

 const processed=useMemo(()=>{
  const total=Array(12).fill(0);

  data.forEach(x=>{
   const d=parseISO(x.data);
   if(getYear(d)===Number(filterYear))
    total[getMonth(d)]+=Number(x.valor)||0;
  });

  const rows=total.map((valor,mesIndex)=>({mes:meses[mesIndex],mesIndex,valor}));
  const sorted=[...rows].sort((a,b)=>b.valor-a.valor);
  const top3=sorted.slice(0,3).map(x=>x.mesIndex);
  const nonZero=sorted.filter(x=>x.valor>0).reverse();
  const bottom=(nonZero.length>=3?nonZero:[...sorted].reverse()).slice(0,3).map(x=>x.mesIndex);

  return rows.map(x=>({
   ...x,
   isTop3:top3.includes(x.mesIndex)&&x.valor>0,
   isBottom3:bottom.includes(x.mesIndex)&&x.valor>0&&!top3.includes(x.mesIndex)
  }));
 },[data,filterYear]);

 const totalGeral=processed.reduce((s,x)=>s+x.valor,0);

 const pdf=()=>{
  try{
   generatePDF(
    `Arrecadação Mês a Mês - ${filterYear}`,
    ['Mês','Valor Total Arrecadado','Status'],
    [...processed.map(x=>[
     x.mes,
     money(x.valor),
     x.isTop3?'Top 3 Maior':x.isBottom3?'Top 3 Menor':'Médio'
    ]),['TOTAL GERAL',money(totalGeral),'']],
    `EntradasMesAMes_${filterYear}`
   );

   toast({title:'Sucesso',description:'PDF gerado com sucesso!'});
  }catch{
   toast({title:'Erro',description:'Falha ao gerar PDF.',variant:'destructive'});
  }
 };

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <TrendingUp className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>
      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Consultas • Tesouraria</p>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">Entradas Mês a Mês</h1>
       <p className="text-sm text-muted-foreground">Visão anual da arrecadação da igreja.</p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={fetchData} disabled={loading}>
       <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
      </Button>

      <Button variant="outline" onClick={pdf}>
       <FileText className="mr-2 h-4 w-4"/>PDF
      </Button>
     </div>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-[hsl(var(--neon-igreja))]"/>Filtros</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
     <div className="w-full md:w-60">
      <label className="mb-2 block text-sm font-medium text-muted-foreground">Ano</label>
      <Select value={filterYear} onValueChange={setFilterYear}>
       <SelectTrigger className="bg-input"><SelectValue/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        {years.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>

     <div className="rounded-xl border border-border bg-secondary/20 p-4 md:min-w-[240px]">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total do Ano</p>
      <p className="mt-1 text-2xl font-bold text-[hsl(var(--neon-igreja))]">{money(totalGeral)}</p>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    <Card><CardContent className="flex items-center gap-3 p-4"><DollarSign className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Total Anual</p><p className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">{money(totalGeral)}</p></div></CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><TrendingUp className="h-6 w-6 text-emerald-400"/><div><p className="text-[11px] uppercase text-muted-foreground">Maior Mês</p><p className="text-2xl font-bold">{money(Math.max(...processed.map(x=>x.valor)))}</p></div></CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><FileText className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Meses com Movimento</p><p className="text-2xl font-bold">{processed.filter(x=>x.valor>0).length}</p></div></CardContent></Card>
   </div>

   <Card className="overflow-hidden border-border bg-card/70">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Arrecadação por mês</CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     {loading?(
      <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--neon-igreja))]"/></div>
     ):(
      <div className="overflow-x-auto">
       <Table>
        <TableHeader className="bg-secondary/30">
         <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead className="text-right">Valor Total</TableHead>
          <TableHead className="text-center">Destaque</TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>
         {processed.map(x=>(
          <TableRow key={x.mesIndex} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
           <TableCell className="font-medium">{x.mes}</TableCell>
           <TableCell className={`text-right font-bold ${x.isTop3?'text-emerald-400':x.isBottom3?'text-yellow-400':'text-foreground'}`}>{money(x.valor)}</TableCell>
           <TableCell className="text-center">
            {x.isTop3&&<Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Maior Arrecadação</Badge>}
            {x.isBottom3&&<Badge className="border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">Menor Arrecadação</Badge>}
            {!x.isTop3&&!x.isBottom3&&x.valor>0&&<span className="text-muted-foreground">-</span>}
            {x.valor===0&&<span className="text-muted-foreground/60 italic">Sem dados</span>}
           </TableCell>
          </TableRow>
         ))}

         <TableRow className="bg-secondary/30 font-bold">
          <TableCell>TOTAL GERAL</TableCell>
          <TableCell className="text-right text-[hsl(var(--neon-igreja))]">{money(totalGeral)}</TableCell>
          <TableCell/>
         </TableRow>
        </TableBody>
       </Table>
      </div>
     )}
    </CardContent>
   </Card>
  </div>
 );
}
