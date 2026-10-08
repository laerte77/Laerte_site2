import React,{useState,useEffect,useCallback,useMemo}from'react';
import{FileSearch,Filter,Download,RefreshCw,Receipt}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{ScrollArea}from'@/components/ui/scroll-area';

const RelatorioDespesas=()=>{
 const{toast}=useToast(),{user}=useAuth();
 const[data,setData]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({dataInicio:'',dataFim:'',despesa_id:'todos'});

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const[a,b]=await Promise.all([
   supabase.from('lm_lanc_despesas').select('*, lm_despesas(despesa)').eq('user_id',user.id).order('data',{ascending:false}),
   supabase.from('lm_despesas').select('*').eq('user_id',user.id).order('despesa',{ascending:true})
  ]);
  if(a.error)toast({title:'Erro ao buscar despesas',variant:'destructive'});else setData(a.data||[]);
  if(b.error)toast({title:'Erro ao buscar tipos',variant:'destructive'});else setTipos(b.data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel('relatorio_lm_despesas_changes')
   .on('postgres_changes',{event:'*',schema:'public'},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>data.filter(x=>{
  const date=new Date(x.data),start=filters.dataInicio?new Date(filters.dataInicio):null,end=filters.dataFim?new Date(filters.dataFim):null;
  if(start&&date<start)return false;
  if(end&&date>end)return false;
  if(filters.despesa_id!=='todos'&&x.despesa_id!==filters.despesa_id)return false;
  return true;
 }),[data,filters]);

 const total=filtered.reduce((s,x)=>s+(parseFloat(x.valor)||0),0);
 const money=v=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 const clear=()=>setFilters({dataInicio:'',dataFim:'',despesa_id:'todos'});
 const exportData=()=>toast({title:'🚧 Em Construção 🚧',description:'A exportação será implementada em breve!'});

 return <div className="space-y-6">

  <Card className="border-cyan-500/20">
   <CardContent className="p-5">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
     <div className="flex gap-3 items-center">
      <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
       <FileSearch className="w-7 h-7 text-cyan-400"/>
      </div>
      <div>
       <p className="text-xs uppercase tracking-wider text-cyan-400">Relatórios • LM Impressões</p>
       <h1 className="text-2xl font-bold">Relatório de Despesas</h1>
       <p className="text-sm text-muted-foreground">Filtre e visualize as despesas do negócio.</p>
      </div>
     </div>
     <div className="flex gap-2">
      <Button variant="outline" onClick={fetchData} disabled={loading} className="text-cyan-400 border-cyan-500/40">
       <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>Atualizar
      </Button>
      <Button variant="outline" onClick={exportData} className="text-cyan-400 border-cyan-500/40">
       <Download className="w-4 h-4 mr-2"/>Exportar
      </Button>
     </div>
    </div>
   </CardContent>
  </Card>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   <Card className="border-cyan-500/20">
    <CardContent className="p-5 flex justify-between items-center">
     <div>
      <p className="text-xs uppercase text-muted-foreground">Lançamentos</p>
      <p className="text-2xl font-bold mt-1">{filtered.length}</p>
     </div>
     <Receipt className="w-6 h-6 text-cyan-400"/>
    </CardContent>
   </Card>
   <Card className="border-cyan-500/20">
    <CardContent className="p-5 flex justify-between items-center">
     <div>
      <p className="text-xs uppercase text-muted-foreground">Total de Despesas</p>
      <p className="text-2xl font-bold mt-1 text-red-400">{money(total)}</p>
     </div>
     <Receipt className="w-6 h-6 text-red-400"/>
    </CardContent>
   </Card>
  </div>

  <Card className="border-cyan-500/20">
   <CardHeader>
    <CardTitle className="flex items-center gap-2 text-base">
     <Filter className="w-4 h-4 text-cyan-400"/>Filtros
    </CardTitle>
   </CardHeader>
   <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

     <div>
      <Label>Data Início</Label>
      <Input type="date" value={filters.dataInicio} onChange={e=>setFilters({...filters,dataInicio:e.target.value})}/>
     </div>

     <div>
      <Label>Data Fim</Label>
      <Input type="date" value={filters.dataFim} onChange={e=>setFilters({...filters,dataFim:e.target.value})}/>
     </div>

     <div>
      <Label>Tipo de Despesa</Label>
      <Select value={filters.despesa_id} onValueChange={v=>setFilters({...filters,despesa_id:v})}>
       <SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
       <SelectContent>
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos</SelectItem>
         {tipos.map(x=><SelectItem key={x.id} value={x.id}>{x.despesa}</SelectItem>)}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div className="flex items-end">
      <Button variant="outline" onClick={clear} className="w-full">Limpar filtros</Button>
     </div>

    </div>
   </CardContent>
  </Card>

  <Card className="border-cyan-500/20">
   <CardHeader>
    <div className="flex justify-between items-center">
     <CardTitle>Resultados</CardTitle>
     <Badge variant="outline">{filtered.length} registros</Badge>
    </div>
   </CardHeader>

   <CardContent className="p-0">
    {loading?
     <div className="p-10 text-center text-muted-foreground">Carregando...</div>
    :!filtered.length?
     <div className="p-12 text-center text-muted-foreground">
      <FileSearch className="mx-auto w-10 h-10 mb-2 opacity-50"/>
      Nenhum resultado encontrado.
     </div>
    :
     <div className="responsive-table-wrapper">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Valor</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {filtered.map(x=>
         <TableRow key={x.id} className="hover:bg-cyan-500/5">
          <TableCell>{new Date(x.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</TableCell>
          <TableCell className="font-medium">{x.lm_despesas?.despesa||'N/A'}</TableCell>
          <TableCell className="text-right font-semibold text-red-400">{money(x.valor)}</TableCell>
         </TableRow>
        )}
        <TableRow className="bg-muted/30 font-bold">
         <TableCell colSpan={2} className="text-right">Total:</TableCell>
         <TableCell className="text-right text-red-400">{money(total)}</TableCell>
        </TableRow>
       </TableBody>
      </Table>
     </div>
    }
   </CardContent>
  </Card>

 </div>;
};

export default RelatorioDespesas;
