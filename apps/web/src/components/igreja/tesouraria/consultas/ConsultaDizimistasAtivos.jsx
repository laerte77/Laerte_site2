import React,{useState,useEffect,useCallback,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{Users,DollarSign,RefreshCw,AlertCircle,CalendarClock,Search,Filter,FileText}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{formatCurrency}from'@/lib/utils';

export default function ConsultaDizimistasAtivos(){
 const{user}=useAuth();
 const[loading,setLoading]=useState(true),[error,setError]=useState(null),[periodo,setPeriodo]=useState('3'),[data,setData]=useState([]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);

  try{
   const months=parseInt(periodo,10);
   const cutoff=format(subMonths(new Date(),months),'yyyy-MM-dd');

   const{data:dizimistas,error:a}=await supabase
    .from('igreja_dizimistas')
    .select('id,nome')
    .eq('user_id',user.id);

   if(a)throw a;

   const{data:entradas,error:b}=await supabase
    .from('igreja_entradas')
    .select('dizimista_id,valor,data')
    .eq('user_id',user.id)
    .gte('data',cutoff)
    .not('dizimista_id','is',null);

   if(b)throw b;

   const processado=(dizimistas||[]).map(d=>{
    const c=(entradas||[]).filter(e=>e.dizimista_id===d.id);
    const total=c.reduce((s,x)=>s+Number(x.valor||0),0);
    const dates=c.map(x=>new Date(x.data));
    const last=dates.length?new Date(Math.max(...dates)):null;

    return{
     id:d.id,
     nome:d.nome,
     valorContribuido:total,
     ultimaContribuicao:last?format(last,'yyyy-MM-dd'):null,
     status:total>0?'Ativo':'Inativo'
    };
   }).filter(x=>x.status==='Ativo')
    .sort((a,b)=>b.valorContribuido-a.valorContribuido);

   setData(processado);
  }catch(e){
   setError(e.message);
  }finally{
   setLoading(false);
  }
 },[user,periodo]);

 useEffect(()=>{fetchData()},[fetchData]);

 const total=data.reduce((s,x)=>s+x.valorContribuido,0);

 return(
  <div className="dark-igreja space-y-4">

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]">
       <Users className="h-7 w-7 text-[hsl(var(--neon-igreja))]"/>
      </div>
      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Consultas • Tesouraria</p>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">Dizimistas Ativos</h1>
       <p className="text-sm text-muted-foreground">Membros que contribuíram nos últimos {periodo} meses.</p>
      </div>
     </div>

     <Button variant="outline" onClick={fetchData} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3">
     <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-[hsl(var(--neon-igreja))]"/>Filtros</CardTitle>
    </CardHeader>
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex items-center gap-2 text-muted-foreground">
       <Search className="h-4 w-4"/>
       <span className="text-sm">Período de análise</span>
      </div>

      <Select value={periodo} onValueChange={setPeriodo}>
       <SelectTrigger className="w-full bg-input sm:w-60"><SelectValue/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card">
        <SelectItem value="3">Últimos 3 meses</SelectItem>
        <SelectItem value="6">Últimos 6 meses</SelectItem>
        <SelectItem value="12">Últimos 12 meses</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Dizimistas Ativos</p><p className="text-2xl font-bold">{data.length}</p></div></CardContent></Card>
    <Card><CardContent className="flex items-center gap-3 p-4"><DollarSign className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/><div><p className="text-[11px] uppercase text-muted-foreground">Total Contribuído</p><p className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">{formatCurrency(total)}</p></div></CardContent></Card>
   </div>

   {error?(
    <Card className="border-red-500/30 bg-red-500/10">
     <CardContent className="flex flex-col items-center gap-2 p-8 text-red-400">
      <AlertCircle className="h-8 w-8"/>
      <p>Erro ao carregar dados: {error}</p>
     </CardContent>
    </Card>
   ):(
    <Card className="overflow-hidden border-border bg-card/70">
     <CardHeader className="border-b border-border bg-muted/20 pb-3">
      <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Dizimistas ativos</CardTitle>
     </CardHeader>

     <CardContent className="p-0">
      {loading?(
       <div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>
      ):(
       <div className="overflow-x-auto">
        <Table>
         <TableHeader className="bg-secondary/30">
          <TableRow>
           <TableHead>Nome</TableHead>
           <TableHead className="text-right">Valor Contribuído</TableHead>
           <TableHead className="text-center">Última Contribuição</TableHead>
           <TableHead className="text-center">Status</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>
          {!data.length?(
           <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum dizimista ativo encontrado.</TableCell></TableRow>
          ):data.map(x=>(
           <TableRow key={x.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
            <TableCell className="font-medium">{x.nome}</TableCell>
            <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(x.valorContribuido)}</TableCell>
            <TableCell className="text-center text-muted-foreground">{x.ultimaContribuicao?<div className="flex items-center justify-center gap-2"><CalendarClock className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/>{format(parseISO(x.ultimaContribuicao),'dd/MM/yyyy')}</div>:'-'}</TableCell>
            <TableCell className="text-center"><Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Ativo</Badge></TableCell>
           </TableRow>
          ))}

          {data.length>0&&(
           <TableRow className="bg-secondary/30 font-bold">
            <TableCell className="text-right">Total:</TableCell>
            <TableCell className="text-right text-emerald-400">{formatCurrency(total)}</TableCell>
            <TableCell colSpan={2}/>
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
