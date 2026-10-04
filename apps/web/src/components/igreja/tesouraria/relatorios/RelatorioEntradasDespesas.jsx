import React,{useState,useEffect,useCallback,useRef}from'react';
import{Calendar,Filter,FileDown,Printer,Eye,AlertCircle,Loader2,FileBarChart}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Button}from'@/components/ui/button';
import{DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger}from'@/components/ui/dropdown-menu';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Alert,AlertDescription,AlertTitle}from'@/components/ui/alert';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{cn}from'@/lib/utils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
const money=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function RelatorioEntradasDespesas(){
 const{toast}=useToast();
 const{user}=useAuth();

 const mounted=useRef(false);
 const abortRef=useRef(null);
 const cache=useRef(new Map());

 const[filterType,setFilterType]=useState('mensal');
 const[filters,setFilters]=useState({
  year:new Date().getFullYear(),
  month:new Date().getMonth(),
  startDate:new Date(
   new Date().getFullYear(),
   new Date().getMonth(),
   1
  ).toISOString().split('T')[0],
  endDate:new Date().toISOString().split('T')[0]
 });

 const[totals,setTotals]=useState(null);
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState(null);

 useEffect(()=>{
  mounted.current=true;

  return()=>{
   mounted.current=false;
   abortRef.current?.abort();
  };
 },[]);

 const change=(key,value)=>
  setFilters(prev=>({...prev,[key]:value}));

 const changeType=value=>{
  setFilterType(value);
  setTotals(null);
  setError(null);
 };

 const fetchTotals=useCallback(async()=>{
  if(!user)return;

  abortRef.current?.abort();
  abortRef.current=new AbortController();

  const signal=abortRef.current.signal;

  setLoading(true);
  setError(null);

  const key=JSON.stringify({
   filterType,
   filters,
   userId:user.id
  });

  if(cache.current.has(key)){
   setTotals(cache.current.get(key));
   setLoading(false);
   return;
  }

  try{
   let start,end;

   if(filterType==='mensal'){
    if(filters.year==='all'){
     start='2000-01-01T00:00:00Z';
     end='2100-12-31T23:59:59Z';
    }else if(filters.month==='all'){
     start=new Date(
      Date.UTC(filters.year,0,1)
     ).toISOString();

     end=new Date(
      Date.UTC(filters.year,11,31,23,59,59)
     ).toISOString();
    }else{
     start=new Date(
      Date.UTC(filters.year,filters.month,1)
     ).toISOString();

     end=new Date(
      Date.UTC(
       filters.year,
       filters.month+1,
       0,
       23,
       59,
       59
      )
     ).toISOString();
    }
   }else{
    if(!filters.startDate||!filters.endDate)
     throw new Error('Datas inválidas');

    start=`${filters.startDate}T00:00:00Z`;
    end=`${filters.endDate}T23:59:59Z`;
   }

   const[a,b]=await Promise.all([
    supabase
     .from('igreja_entradas')
     .select('valor')
     .gte('data',start)
     .lte('data',end)
     .eq('user_id',user.id)
     .abortSignal(signal),

    supabase
     .from('igreja_despesas')
     .select('valor')
     .gte('data',start)
     .lte('data',end)
     .eq('user_id',user.id)
     .abortSignal(signal)
   ]);

   if(signal.aborted)return;

   if(a.error)throw a.error;
   if(b.error)throw b.error;

   const result={
    entradas:(a.data||[]).reduce(
     (s,x)=>s+Number(x.valor||0),
     0
    ),
    despesas:(b.data||[]).reduce(
     (s,x)=>s+Number(x.valor||0),
     0
    )
   };

   result.saldo=result.entradas-result.despesas;

   cache.current.set(key,result);

   if(mounted.current)setTotals(result);

  }catch(e){
   if(e.name==='AbortError')return;

   setError(e.message||'Erro desconhecido');

   toast({
    title:'Erro ao buscar dados',
    description:e.message,
    variant:'destructive'
   });
  }finally{
   if(mounted.current&&!signal.aborted)
    setLoading(false);
  }
 },[filterType,filters,user,toast]);

 const generateReportUrl=useCallback(print=>{
  const{
   year,
   month,
   startDate,
   endDate
  }=filters;

  let q=`?filterType=${filterType}`;

  if(filterType==='mensal'){
   q+=`&year=${year}&month=${month}`;
  }else if(filterType==='periodo'){
   if(!startDate||!endDate)return null;

   q+=`&startDate=${startDate}&endDate=${endDate}`;
  }else return null;

  if(print)q+='&print=true';

  return`${window.location.origin}/igreja/relatorios/entradas-despesas-pdf${q}`;
 },[filterType,filters]);

 const action=type=>{
  const url=generateReportUrl(type==='print');

  if(!url){
   toast({
    title:'Seleção de Período Inválida',
    description:'Verifique as datas selecionadas.',
    variant:'destructive'
   });
   return;
  }

  window.open(url,'_blank');
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <FileBarChart className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>

      <h1 className="text-2xl font-bold">
       Entradas e Despesas
      </h1>

      <p className="text-sm text-muted-foreground">
       Visualize o resumo financeiro consolidado.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      onClick={fetchTotals}
      disabled={loading}
      className="bg-[hsl(var(--neon-igreja))] text-white"
     >
      {loading
       ?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>
       :<Eye className="mr-2 h-4 w-4"/>}

      {loading?'Calculando...':'Visualizar'}
     </Button>

     <DropdownMenu>
      <DropdownMenuTrigger asChild>
       <Button
        variant="outline"
        className="border-[hsl(var(--neon-igreja))]/50"
       >
        <FileDown className="mr-2 h-4 w-4"/>
        Gerar Relatório
       </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="dark-igreja">
       <DropdownMenuItem onSelect={()=>action('view')}>
        <FileDown className="mr-2 h-4 w-4"/>
        Gerar PDF
       </DropdownMenuItem>

       <DropdownMenuItem onSelect={()=>action('print')}>
        <Printer className="mr-2 h-4 w-4"/>
        Imprimir
       </DropdownMenuItem>
      </DropdownMenuContent>
     </DropdownMenu>
    </div>

   </div>

   <Card className="bg-card border-border/60">
    <CardHeader className="border-b border-border/60">
     <CardTitle className="flex items-center">
      <Filter className="mr-2 h-5 w-5"/>
      Filtros
     </CardTitle>
    </CardHeader>

    <CardContent className="space-y-5">

     <div className="max-w-md">
      <Label>Tipo de Filtro</Label>

      <Select
       value={filterType}
       onValueChange={changeType}
       disabled={loading}
      >
       <SelectTrigger className="bg-input mt-2">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <SelectItem value="mensal">
         Por Mês/Ano
        </SelectItem>

        <SelectItem value="periodo">
         Por Período Personalizado
        </SelectItem>
       </SelectContent>
      </Select>
     </div>

     {filterType==='mensal'?(
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

       <div>
        <Label>Ano</Label>

        <Select
         value={String(filters.year)}
         onValueChange={v=>change(
          'year',
          v==='all'?'all':Number(v)
         )}
         disabled={loading}
        >
         <SelectTrigger className="bg-input mt-2">
          <Calendar className="mr-2 h-4 w-4"/>
          <SelectValue/>
         </SelectTrigger>

         <SelectContent className="dark-igreja">
          <ScrollArea className="h-[200px]">
           <SelectItem value="all">
            Todos
           </SelectItem>

           {years.map(y=>(
            <SelectItem
             key={y}
             value={String(y)}
            >
             {y}
            </SelectItem>
           ))}
          </ScrollArea>
         </SelectContent>
        </Select>
       </div>

       <div>
        <Label>Mês</Label>

        <Select
         value={String(filters.month)}
         onValueChange={v=>change(
          'month',
          v==='all'?'all':Number(v)
         )}
         disabled={loading}
        >
         <SelectTrigger className="bg-input mt-2">
          <Calendar className="mr-2 h-4 w-4"/>
          <SelectValue/>
         </SelectTrigger>

         <SelectContent className="dark-igreja">
          <ScrollArea className="h-[200px]">
           <SelectItem value="all">
            Todos
           </SelectItem>

           {meses.map((m,i)=>(
            <SelectItem
             key={i}
             value={String(i)}
            >
             {m}
            </SelectItem>
           ))}
          </ScrollArea>
         </SelectContent>
        </Select>
       </div>

      </div>
     ):(
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

       <div>
        <Label>Data de Início</Label>
        <Input
         type="date"
         value={filters.startDate}
         onChange={e=>change('startDate',e.target.value)}
         className="bg-input mt-2"
         disabled={loading}
        />
       </div>

       <div>
        <Label>Data de Fim</Label>
        <Input
         type="date"
         value={filters.endDate}
         onChange={e=>change('endDate',e.target.value)}
         className="bg-input mt-2"
         disabled={loading}
        />
       </div>

      </div>
     )}

    </CardContent>
   </Card>

   {error&&(
    <Alert variant="destructive">
     <AlertCircle className="h-4 w-4"/>
     <AlertTitle>Erro</AlertTitle>
     <AlertDescription>{error}</AlertDescription>
    </Alert>
   )}

   {totals&&!loading&&(
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

     <Card className="bg-card border-l-4 border-l-green-500">
      <CardHeader className="pb-2">
       <CardTitle className="text-sm text-muted-foreground">
        Total Entradas
       </CardTitle>
      </CardHeader>

      <CardContent>
       <p className="text-3xl font-bold text-green-400">
        {money(totals.entradas)}
       </p>
      </CardContent>
     </Card>

     <Card className="bg-card border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
       <CardTitle className="text-sm text-muted-foreground">
        Total Despesas
       </CardTitle>
      </CardHeader>

      <CardContent>
       <p className="text-3xl font-bold text-red-400">
        {money(totals.despesas)}
       </p>
      </CardContent>
     </Card>

     <Card className={cn(
      'bg-card border-l-4',
      totals.saldo>=0
       ?'border-l-blue-500'
       :'border-l-orange-500'
     )}>
      <CardHeader className="pb-2">
       <CardTitle className="text-sm text-muted-foreground">
        Saldo
       </CardTitle>
      </CardHeader>

      <CardContent>
       <p className="text-3xl font-bold">
        {money(totals.saldo)}
       </p>
      </CardContent>
     </Card>

    </div>
   )}

  </div>
 );
}
