import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Search,Download,RefreshCw,TrendingUp,Receipt,CalendarDays,WalletCards}from'lucide-react';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{exportToExcel}from'@/lib/ExportUtils';

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const money=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL',
 minimumFractionDigits:2,
 maximumFractionDigits:2
}).format(fromCents(toCents(v)));

const dateBR=v=>{
 if(!v)return'—';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${m[3]}/${m[2]}/${m[1]}`:new Date(v).toLocaleDateString('pt-BR');
};

const StatCard=({label,value,icon:Icon,type='blue',note})=>{
 const styles={
  blue:{
   border:'border-blue-500/20',
   bg:'from-blue-500/10 to-blue-700/10',
   icon:'bg-blue-500/10',
   text:'text-blue-400'
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
       {label}
      </p>

      <p className={`mt-1 truncate text-xl font-bold ${s.text}`}>
       {value}
      </p>

      {note&&(
       <p className="mt-1 text-xs text-muted-foreground">
        {note}
       </p>
      )}
     </div>
    </div>
   </CardContent>
  </Card>
 );
};

const RelatorioReceitas=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[receitas,setReceitas]=useState([]);
 const[tiposReceita,setTiposReceita]=useState([]);
 const[loading,setLoading]=useState(true);

 const[filtros,setFiltros]=useState({
  dataInicial:'',
  dataFinal:'',
  tipo:'all',
  pesquisa:''
 });

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const[receitasRes,tiposRes]=await Promise.all([
   supabase
    .from('receitas')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false}),

   supabase
    .from('tipos_receita')
    .select('*')
    .eq('user_id',user.id)
    .order('nome_receita',{ascending:true})
  ]);

  if(receitasRes.error){
   toast({
    title:'Erro ao buscar receitas',
    variant:'destructive'
   });
  }else{
   setReceitas(receitasRes.data||[]);
  }

  if(tiposRes.error){
   toast({
    title:'Erro ao buscar tipos',
    variant:'destructive'
   });
  }else{
   setTiposReceita(tiposRes.data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_relatorio_receitas_changes')
   .on(
    'postgres_changes',
    {event:'*',schema:'public'},
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const receitasFiltradas=useMemo(()=>{
  const pesquisa=filtros.pesquisa.trim().toLowerCase();

  return receitas.filter(r=>{
   const data=String(r.data||'').slice(0,10);

   if(filtros.dataInicial&&data<filtros.dataInicial)return false;
   if(filtros.dataFinal&&data>filtros.dataFinal)return false;

   if(
    filtros.tipo!=='all'&&
    r.receita!==filtros.tipo
   )return false;

   if(pesquisa){
    const tipo=String(r.receita||'').toLowerCase();
    const origem=String(r.origem||'').toLowerCase();

    if(!tipo.includes(pesquisa)&&!origem.includes(pesquisa)){
     return false;
    }
   }

   return true;
  });
 },[receitas,filtros]);

 const totalReceitasCents=useMemo(
  ()=>receitasFiltradas.reduce(
   (sum,r)=>sum+toCents(r.valor),
   0
  ),
  [receitasFiltradas]
 );

 const quantidade=receitasFiltradas.length;

 const mediaCents=quantidade
  ?Math.round(totalReceitasCents/quantidade)
  :0;

 const maiorReceita=useMemo(
  ()=>receitasFiltradas.reduce(
   (max,r)=>toCents(r.valor)>toCents(max.valor)?r:max,
   {valor:0}
  ),
  [receitasFiltradas]
 );

 const handleExport=()=>{
  if(!receitasFiltradas.length){
   toast({
    title:'Aviso',
    description:'Nenhuma receita para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   receitasFiltradas.map(r=>({
    Data:dateBR(r.data),
    Tipo:r.receita||'-',
    Origem:r.origem||'-',
    Valor:fromCents(toCents(r.valor))
   })),
   'Relatorio_Receitas',
   'Receitas'
  );
 };

 const clearFilters=()=>{
  setFiltros({
   dataInicial:'',
   dataFinal:'',
   tipo:'all',
   pesquisa:''
  });
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <TrendingUp className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Relatórios
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Receitas
      </h1>

      <p className="text-sm text-muted-foreground">
       Consulte e analise suas receitas realizadas.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!receitasFiltradas.length}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={fetchData}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">

     <div className="space-y-2">
      <Label className="text-xs">Data inicial</Label>

      <Input
       type="date"
       value={filtros.dataInicial}
       onChange={e=>setFiltros(prev=>({
        ...prev,
        dataInicial:e.target.value
       }))}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Data final</Label>

      <Input
       type="date"
       value={filtros.dataFinal}
       onChange={e=>setFiltros(prev=>({
        ...prev,
        dataFinal:e.target.value
       }))}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Tipo de receita</Label>

      <Select
       value={filtros.tipo}
       onValueChange={value=>setFiltros(prev=>({
        ...prev,
        tipo:value
       }))}
      >
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Todos"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        <ScrollArea className="h-48">
         <SelectItem value="all">
          Todos os tipos
         </SelectItem>

         {tiposReceita.map(tipo=>(
          <SelectItem
           key={tipo.id}
           value={tipo.nome_receita}
          >
           {tipo.nome_receita}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Pesquisar</Label>

      <div className="relative">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        value={filtros.pesquisa}
        onChange={e=>setFiltros(prev=>({
         ...prev,
         pesquisa:e.target.value
        }))}
        placeholder="Tipo ou origem..."
        className="bg-input pl-9"
       />
      </div>
     </div>
    </CardContent>

    <div className="flex justify-end border-t border-border/50 px-4 py-3">
     <Button
      variant="ghost"
      size="sm"
      onClick={clearFilters}
     >
      Limpar filtros
     </Button>
    </div>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatCard
     label="Total de Receitas"
     value={money(fromCents(totalReceitasCents))}
     icon={TrendingUp}
     type="blue"
    />

    <StatCard
     label="Quantidade"
     value={quantidade}
     icon={Receipt}
     type="blue"
    />

    <StatCard
     label="Média por Receita"
     value={money(fromCents(mediaCents))}
     icon={WalletCards}
     type="blue"
    />

    <StatCard
     label="Maior Receita"
     value={money(maiorReceita.valor)}
     icon={CalendarDays}
     type="blue"
    />
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
      Resultados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead>Origem</TableHead>
         <TableHead className="text-right">Valor</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={4}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):receitasFiltradas.length===0?(
         <TableRow>
          <TableCell
           colSpan={4}
           className="py-10 text-center text-muted-foreground"
          >
           Nenhuma receita encontrada.
          </TableCell>
         </TableRow>
        ):(
         receitasFiltradas.map(receita=>(
          <TableRow
           key={receita.id}
           className="hover:bg-blue-500/5"
          >
           <TableCell className="text-sm">
            {dateBR(receita.data)}
           </TableCell>

           <TableCell className="font-medium">
            {receita.receita||'—'}
           </TableCell>

           <TableCell className="text-sm text-muted-foreground">
            {receita.origem||'—'}
           </TableCell>

           <TableCell className="text-right font-semibold text-[hsl(var(--neon-pessoal))]">
            {money(receita.valor)}
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default RelatorioReceitas;
