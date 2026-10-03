import React,{useState,useEffect,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import{Loader2,TrendingUp,FileText,RefreshCw}from'lucide-react';
import{getAccessibleDataQuery}from'@/lib/dataAccessUtils';
import{parseISO,getMonth,getYear}from'date-fns';
import{generatePDF}from'@/lib/ExportUtils';

export default function ConsultaEntradasMesAMes(){
 const{user,isAdmin}=useAuth();
 const{toast}=useToast();
 const[data,setData]=useState([]);
 const[loading,setLoading]=useState(false);

 const currentYear=new Date().getFullYear();
 const[filterYear,setFilterYear]=useState(String(currentYear));
 const years=Array.from({length:5},(_,i)=>String(currentYear-i));

 const meses=[
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
 ];

 const fetchData=async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const year=Number(filterYear);
   const startDate=new Date(year,0,1).toISOString();
   const endDate=new Date(year,11,31,23,59,59).toISOString();

   const{data:result,error}=await getAccessibleDataQuery(
    user.id,isAdmin,'igreja_entradas','data, valor'
   ).gte('data',startDate).lte('data',endDate);

   if(error)throw error;
   setData(result||[]);
  }catch(error){
   toast({title:'Erro',description:error.message,variant:'destructive'});
  }finally{setLoading(false)}
 };

 useEffect(()=>{fetchData()},[user,isAdmin,filterYear]);

 const formatCurrency=value=>new Intl.NumberFormat(
  'pt-BR',{style:'currency',currency:'BRL'}
 ).format(value);

 const processedData=useMemo(()=>{
  const totals=Array(12).fill(0);

  data.forEach(item=>{
   const date=parseISO(item.data);
   if(getYear(date).toString()===filterYear)
    totals[getMonth(date)]+=Number(item.valor)||0;
  });

  const rows=totals.map((valor,mesIndex)=>({
   mes:meses[mesIndex],
   mesIndex,
   valor
  }));

  const sorted=[...rows].sort((a,b)=>b.valor-a.valor);
  const top3=sorted.slice(0,3).map(x=>x.mesIndex);
  const nonZero=sorted.filter(x=>x.valor>0).reverse();
  const bottom=(nonZero.length>=3?nonZero:[...sorted].reverse())
   .slice(0,3).map(x=>x.mesIndex);

  return rows.map(item=>({
   ...item,
   isTop3:top3.includes(item.mesIndex)&&item.valor>0,
   isBottom3:bottom.includes(item.mesIndex)&&item.valor>0&&!top3.includes(item.mesIndex)
  }));
 },[data,filterYear]);

 const totalGeral=processedData.reduce((a,c)=>a+c.valor,0);

 const handleExportPDF=()=>{
  try{
   const headers=['Mês','Valor Total Arrecadado','Status'];
   const rows=processedData.map(item=>[
    item.mes,
    formatCurrency(item.valor),
    item.isTop3?'Top 3 Maior':item.isBottom3?'Top 3 Menor':'Médio'
   ]);

   rows.push(['TOTAL GERAL',formatCurrency(totalGeral),'']);

   generatePDF(
    `Arrecadação Mês a Mês - ${filterYear}`,
    headers,
    rows,
    `EntradasMesAMes_${filterYear}`
   );

   toast({title:'Sucesso',description:'PDF gerado com sucesso!'});
  }catch{
   toast({
    title:'Erro',
    description:'Falha ao gerar PDF.',
    variant:'destructive'
   });
  }
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <TrendingUp className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Consultas • Tesouraria
      </p>
      <h1 className="text-2xl font-bold text-foreground">
       Entradas Mês a Mês
      </h1>
      <p className="text-sm text-muted-foreground">
       Visão anual de arrecadação da Igreja.
      </p>
     </div>
    </div>

    <div className="flex gap-2">
     <Button
      variant="outline"
      onClick={fetchData}
      disabled={loading}
      className="border-[hsl(var(--neon-igreja))]/40"
     >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>
      Atualizar
     </Button>

     <Button onClick={handleExportPDF} variant="destructive">
      <FileText className="w-4 h-4 mr-2"/>
      Gerar PDF
     </Button>
    </div>
   </div>

   <Card className="bg-card border-border/60">
    <CardHeader>
     <CardTitle className="text-lg">Filtros da consulta</CardTitle>
    </CardHeader>

    <CardContent>
     <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">

      <div className="w-full md:w-[240px] space-y-2">
       <label className="text-sm font-medium text-muted-foreground">
        Ano
       </label>

       <Select value={filterYear} onValueChange={setFilterYear}>
        <SelectTrigger className="bg-input">
         <SelectValue placeholder="Selecione o ano"/>
        </SelectTrigger>

        <SelectContent>
         {years.map(year=>(
          <SelectItem key={year} value={year}>{year}</SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 min-w-[220px]">
       <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Total do Ano
       </p>
       <p className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">
        {formatCurrency(totalGeral)}
       </p>
      </div>

     </div>
    </CardContent>
   </Card>

   <Card className="bg-card border-border/60 overflow-hidden">
    <CardHeader className="border-b border-border/60">
     <CardTitle className="text-lg">Arrecadação por mês</CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     {loading?(
      <div className="flex justify-center items-center p-12">
       <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--neon-igreja))]"/>
      </div>
     ):(
      <div className="overflow-x-auto">
       <Table className="neon-zebra-table">
        <TableHeader className="bg-muted/50">
         <TableRow>
          <TableHead>Mês</TableHead>
          <TableHead className="text-right">Valor Total Arrecadado</TableHead>
          <TableHead className="text-center">Destaque</TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>
         {processedData.map(item=>(
          <TableRow key={item.mesIndex} className="hover:bg-primary/5">

           <TableCell className="font-medium">
            {item.mes}
           </TableCell>

           <TableCell className={`text-right font-bold ${
            item.isTop3?'text-emerald-500':
            item.isBottom3?'text-amber-500':'text-foreground'
           }`}>
            {formatCurrency(item.valor)}
           </TableCell>

           <TableCell className="text-center">
            {item.isTop3&&(
             <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">
              Maior Arrecadação
             </Badge>
            )}

            {item.isBottom3&&(
             <Badge variant="outline" className="text-amber-500 border-amber-500/40">
              Menor Arrecadação
             </Badge>
            )}

            {!item.isTop3&&!item.isBottom3&&item.valor>0&&(
             <span className="text-muted-foreground">-</span>
            )}

            {item.valor===0&&(
             <span className="text-muted-foreground/60 italic">
              Sem dados
             </span>
            )}
           </TableCell>

          </TableRow>
         ))}

         <TableRow className="bg-muted/50 font-bold border-t">
          <TableCell>TOTAL GERAL</TableCell>
          <TableCell className="text-right text-[hsl(var(--neon-igreja))]">
           {formatCurrency(totalGeral)}
          </TableCell>
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
