import React,{useState,useEffect,useCallback,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import KPICard from'@/components/ui/KPICard';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{Users,DollarSign,RefreshCw,AlertCircle,CalendarClock,Search}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{formatCurrency}from'@/lib/utils';

export default function ConsultaDizimistasAtivos(){
 const{user}=useAuth();
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);
 const[periodo,setPeriodo]=useState('3');
 const[data,setData]=useState([]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);
  try{
   const months=parseInt(periodo,10);
   const cutoffDate=format(subMonths(new Date(),months),'yyyy-MM-dd');

   const{data:dizimistas,error:dizError}=await supabase
    .from('igreja_dizimistas').select('id,nome').eq('user_id',user.id);
   if(dizError)throw dizError;

   const{data:entradas,error:entError}=await supabase
    .from('igreja_entradas')
    .select('dizimista_id,valor,data')
    .eq('user_id',user.id)
    .gte('data',cutoffDate)
    .not('dizimista_id','is',null);
   if(entError)throw entError;

   const processado=dizimistas.map(d=>{
    const contribs=entradas.filter(e=>e.dizimista_id===d.id);
    const valorTotal=contribs.reduce((a,c)=>a+Number(c.valor),0);
    const datas=contribs.map(c=>new Date(c.data));
    const ultimaData=datas.length?new Date(Math.max(...datas)):null;

    return{
     id:d.id,
     nome:d.nome,
     valorContribuido:valorTotal,
     ultimaContribuicao:ultimaData?format(ultimaData,'yyyy-MM-dd'):null,
     status:valorTotal>0?'Ativo':'Inativo'
    };
   })
   .filter(d=>d.status==='Ativo')
   .sort((a,b)=>b.valorContribuido-a.valorContribuido);

   setData(processado);
  }catch(err){setError(err.message)}
  finally{setLoading(false)}
 },[user,periodo]);

 useEffect(()=>{fetchData()},[fetchData]);

 const kpis=useMemo(()=>({
  totalDizimistas:data.length,
  totalValor:data.reduce((a,c)=>a+c.valorContribuido,0)
 }),[data]);

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <Users className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>
     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Consultas • Tesouraria
      </p>
      <h1 className="text-2xl font-bold text-foreground">Dizimistas Ativos</h1>
      <p className="text-sm text-muted-foreground">
       Membros que contribuíram nos últimos {periodo} meses.
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

   <Card className="border-border/60 bg-card/80">
    <CardContent className="p-4">
     <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
       <Search className="w-4 h-4"/>
       <span className="text-sm font-medium">Período de análise</span>
      </div>

      <Select value={periodo} onValueChange={setPeriodo}>
       <SelectTrigger className="w-full sm:w-[240px] bg-input">
        <SelectValue placeholder="Período"/>
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="3">Últimos 3 meses</SelectItem>
        <SelectItem value="6">Últimos 6 meses</SelectItem>
        <SelectItem value="12">Últimos 12 meses</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <KPICard
     title="Dizimistas Ativos"
     value={kpis.totalDizimistas}
     icon={Users}
     colorScheme="igreja"
     label="Membros contribuintes"
    />
    <KPICard
     title={`Total Contribuído (${periodo}M)`}
     value={kpis.totalValor}
     icon={DollarSign}
     colorScheme="igreja"
     label="Volume financeiro"
     isCurrency
    />
   </div>

   {error?(
    <Card className="border-destructive/30 bg-destructive/10">
     <CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-destructive">
      <AlertCircle className="w-8 h-8"/>
      <p>Erro ao carregar dados: {error}</p>
     </CardContent>
    </Card>
   ):(
    <Card className="bg-card border-border/60 shadow-sm overflow-hidden">
     <CardHeader className="border-b border-border/60">
      <CardTitle className="text-lg">Relação de Dizimistas Ativos</CardTitle>
     </CardHeader>

     <CardContent className="p-0">
      {loading?(
       <div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>
      ):(
       <div className="responsive-table-wrapper">
        <Table className="neon-zebra-table">
         <TableHeader className="bg-muted/50">
          <TableRow>
           <TableHead>Nome</TableHead>
           <TableHead className="text-right">Valor Contribuído</TableHead>
           <TableHead className="text-center">Última Contribuição</TableHead>
           <TableHead className="text-center">Status</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>
          {!data.length?(
           <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
             Nenhum dizimista ativo encontrado no período.
            </TableCell>
           </TableRow>
          ):data.map(item=>(
           <TableRow key={item.id} className="hover:bg-primary/5">
            <TableCell className="font-medium">{item.nome}</TableCell>

            <TableCell className="text-right font-semibold text-emerald-500">
             {formatCurrency(item.valorContribuido)}
            </TableCell>

            <TableCell className="text-center text-muted-foreground">
             {item.ultimaContribuicao?(
              <div className="flex items-center justify-center gap-2">
               <CalendarClock className="w-4 h-4 text-[hsl(var(--neon-igreja))]"/>
               {format(parseISO(item.ultimaContribuicao),'dd/MM/yyyy')}
              </div>
             ):'-'}
            </TableCell>

            <TableCell className="text-center">
             <Badge className="badge-ativo">Ativo</Badge>
            </TableCell>
           </TableRow>
          ))}

          {data.length>0&&(
           <TableRow className="bg-muted/50 font-bold border-t">
            <TableCell className="text-right">Total:</TableCell>
            <TableCell className="text-right text-emerald-500">
             {formatCurrency(kpis.totalValor)}
            </TableCell>
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
