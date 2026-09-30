import React,{useState,useEffect,useCallback,useRef}from'react';
import{Calendar,Filter,FileDown,Printer,Eye,AlertCircle,Loader2}from'lucide-react';
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
const availableYears=Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
const formatCurrency=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export default function RelatorioEntradasDespesas(){
 const{toast}=useToast(),{user}=useAuth();
 const mounted=useRef(false),abortRef=useRef(null),cache=useRef(new Map());
 const[filterType,setFilterType]=useState('mensal');
 const[filters,setFilters]=useState({year:new Date().getFullYear(),month:new Date().getMonth(),startDate:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0],endDate:new Date().toISOString().split('T')[0]});
 const[totals,setTotals]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(null);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abortRef.current?.abort()}},[]);
 const change=useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);
 const changeType=useCallback(v=>{setFilterType(v);setTotals(null);setError(null)},[]);

 const fetchTotals=useCallback(async()=>{
  if(!user)return;
  abortRef.current?.abort();abortRef.current=new AbortController();
  const signal=abortRef.current.signal;
  setLoading(true);setError(null);
  const key=JSON.stringify({filterType,filters,userId:user.id});
  if(cache.current.has(key)){if(mounted.current){setTotals(cache.current.get(key));setLoading(false)}return}
  try{
   let start,end;
   if(filterType==='mensal'){
    if(filters.year==='all'){start='2000-01-01T00:00:00Z';end='2100-12-31T23:59:59Z'}
    else if(filters.month==='all'){start=new Date(Date.UTC(filters.year,0,1)).toISOString();end=new Date(Date.UTC(filters.year,11,31,23,59,59)).toISOString()}
    else{start=new Date(Date.UTC(filters.year,filters.month,1)).toISOString();end=new Date(Date.UTC(filters.year,filters.month+1,0,23,59,59)).toISOString()}
   }else{
    if(!filters.startDate||!filters.endDate)throw new Error('Datas inválidas');
    start=`${filters.startDate}T00:00:00Z`;end=`${filters.endDate}T23:59:59Z`;
   }
   const[a,b]=await Promise.all([
    supabase.from('igreja_entradas').select('valor').gte('data',start).lte('data',end).eq('user_id',user.id).abortSignal(signal),
    supabase.from('igreja_despesas').select('valor').gte('data',start).lte('data',end).eq('user_id',user.id).abortSignal(signal)
   ]);
   if(signal.aborted)return;
   if(a.error)throw a.error;if(b.error)throw b.error;
   const result={entradas:(a.data||[]).reduce((s,x)=>s+Number(x.valor||0),0),despesas:(b.data||[]).reduce((s,x)=>s+Number(x.valor||0),0)};
   result.saldo=result.entradas-result.despesas;
   cache.current.set(key,result);
   if(mounted.current)setTotals(result);
  }catch(e){
   if(e.name==='AbortError')return;
   console.error(e);
   if(mounted.current){setError(e.message||'Erro desconhecido');toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})}
  }finally{if(mounted.current&&!signal.aborted)setLoading(false)}
 },[filterType,filters,user,toast]);

 const generateReportUrl=useCallback(print=>{
  const{year,month,startDate,endDate}=filters;
  let q=`?filterType=${filterType}`;
  if(filterType==='mensal')q+=`&year=${year}&month=${month}`;
  else if(filterType==='periodo'){if(!startDate||!endDate)return null;q+=`&startDate=${startDate}&endDate=${endDate}`}
  else return null;
  if(print)q+='&print=true';
  return`${window.location.origin}/igreja/relatorios/entradas-despesas-pdf${q}`;
 },[filterType,filters]);

 const action=useCallback(type=>{
  const url=generateReportUrl(type==='print');
  if(!url){toast({title:'Seleção de Período Inválida',description:'Verifique as datas selecionadas.',variant:'destructive'});return}
  window.open(url,'_blank');
 },[generateReportUrl,toast]);

 return<div className="min-h-screen space-y-6 bg-gradient-to-br from-black to-gray-900 p-4 text-gray-100">
  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
   <div><h2 className="text-3xl font-bold text-white">Relatório de Entradas e Despesas</h2><p className="text-gray-400">Visualize um resumo financeiro consolidado.</p></div>
   <div className="flex flex-wrap items-center gap-2">
    <Button onClick={fetchTotals} disabled={loading} className="min-w-[120px] bg-yellow-600 text-white hover:bg-yellow-700">{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Eye className="mr-2 h-4 w-4"/>}{loading?'Calculando...':'Visualizar'}</Button>
    <DropdownMenu>
     <DropdownMenuTrigger asChild><Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"><FileDown className="mr-2 h-4 w-4"/>Gerar Relatório</Button></DropdownMenuTrigger>
     <DropdownMenuContent className="z-50 border-gray-700 bg-gray-800 text-gray-100">
      <DropdownMenuItem onSelect={()=>action('view')} className="cursor-pointer hover:bg-gray-700"><FileDown className="mr-2 h-4 w-4"/>Gerar PDF</DropdownMenuItem>
      <DropdownMenuItem onSelect={()=>action('print')} className="cursor-pointer hover:bg-gray-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</DropdownMenuItem>
     </DropdownMenuContent>
    </DropdownMenu>
   </div>
  </div>

  <Card className="border-gray-800 bg-gray-900/50 shadow-md backdrop-blur-sm">
   <CardHeader className="border-b border-gray-800 pb-3"><CardTitle className="flex items-center text-lg text-white"><Filter className="mr-2 h-5 w-5 text-yellow-500"/>Filtros</CardTitle></CardHeader>
   <CardContent>
    <div className="flex flex-col space-y-4 pt-4">
     <div className="w-full md:w-1/3">
      <Label className="mb-2 block text-gray-400">Tipo de Filtro</Label>
      <Select value={filterType} onValueChange={changeType} disabled={loading}>
       <SelectTrigger className="border-gray-700 bg-gray-800 text-gray-100"><SelectValue/></SelectTrigger>
       <SelectContent className="border-gray-700 bg-gray-800 text-gray-100"><SelectItem value="mensal">Por Mês/Ano</SelectItem><SelectItem value="periodo">Por Período Personalizado</SelectItem></SelectContent>
      </Select>
     </div>

     <div className="p-1">
      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',filterType!=='mensal'&&'hidden')}>
       <div><Label className="mb-2 block text-gray-400">Ano</Label><Select value={String(filters.year)} onValueChange={v=>change('year',v==='all'?'all':Number(v))} disabled={loading}><SelectTrigger className="border-gray-700 bg-gray-800 text-gray-100"><Calendar className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent className="border-gray-700 bg-gray-800 text-gray-100"><ScrollArea className="h-[200px]"><SelectItem value="all">Todos</SelectItem>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
       <div><Label className="mb-2 block text-gray-400">Mês</Label><Select value={String(filters.month)} onValueChange={v=>change('month',v==='all'?'all':Number(v))} disabled={loading}><SelectTrigger className="border-gray-700 bg-gray-800 text-gray-100"><Calendar className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent className="border-gray-700 bg-gray-800 text-gray-100"><ScrollArea className="h-[200px]"><SelectItem value="all">Todos</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
      </div>

      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',filterType!=='periodo'&&'hidden')}>
       <div><Label className="mb-2 block text-gray-400">Data de Início</Label><Input type="date" value={filters.startDate} onChange={e=>change('startDate',e.target.value)} className="border-gray-700 bg-gray-800 text-gray-100" disabled={loading}/></div>
       <div><Label className="mb-2 block text-gray-400">Data de Fim</Label><Input type="date" value={filters.endDate} onChange={e=>change('endDate',e.target.value)} className="border-gray-700 bg-gray-800 text-gray-100" disabled={loading}/></div>
      </div>
     </div>
    </div>
   </CardContent>
  </Card>

  {error&&<Alert variant="destructive" className="border-red-900 bg-red-900/50 text-red-100"><AlertCircle className="h-4 w-4"/><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

  {totals&&!loading&&<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
   <Card className="border-l-4 border-l-green-500 bg-gray-900 shadow-lg"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-400">Total Entradas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-white">{formatCurrency(totals.entradas)}</p></CardContent></Card>
   <Card className="border-l-4 border-l-red-500 bg-gray-900 shadow-lg"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-400">Total Despesas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-white">{formatCurrency(totals.despesas)}</p></CardContent></Card>
   <Card className={cn('border-l-4 bg-gray-900 shadow-lg',totals.saldo>=0?'border-l-blue-500':'border-l-orange-500')}><CardHeader className="pb-2"><CardTitle className={cn('text-sm font-medium',totals.saldo>=0?'text-blue-400':'text-orange-400')}>Saldo</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-white">{formatCurrency(totals.saldo)}</p></CardContent></Card>
  </div>}
 </div>;
}
