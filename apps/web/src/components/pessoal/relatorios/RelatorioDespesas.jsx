import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Search,Download,RefreshCw,Receipt,TrendingDown,CalendarDays,WalletCards}from'lucide-react';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Label}from'@/components/ui/label';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
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

const StatCard=({label,value,icon:Icon,type='red',note})=>{
 const styles={
  red:{
   border:'border-red-500/20',
   bg:'from-red-500/10 to-red-700/10',
   icon:'bg-red-500/10',
   text:'text-red-400'
  },
  blue:{
   border:'border-blue-500/20',
   bg:'from-blue-500/10 to-blue-700/10',
   icon:'bg-blue-500/10',
   text:'text-blue-400'
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

const RelatorioDespesas=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[despesas,setDespesas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);

 const[filtros,setFiltros]=useState({
  dataInicio:'',
  dataFim:'',
  tipoDespesa:'todos',
  pesquisa:''
 });

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const[despesasRes,tiposRes]=await Promise.all([
   supabase
    .from('despesas')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false}),

   supabase
    .from('tipos_despesa')
    .select('*')
    .eq('user_id',user.id)
    .order('nome_despesa',{ascending:true})
  ]);

  if(despesasRes.error){
   toast({
    title:'Erro ao buscar despesas',
    variant:'destructive'
   });
  }else{
   setDespesas(despesasRes.data||[]);
  }

  if(tiposRes.error){
   toast({
    title:'Erro ao buscar tipos',
    variant:'destructive'
   });
  }else{
   setTiposDespesa(tiposRes.data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_relatorio_despesas_changes')
   .on(
    'postgres_changes',
    {event:'*',schema:'public'},
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filteredDespesas=useMemo(()=>{
  const pesquisa=filtros.pesquisa.trim().toLowerCase();

  return despesas.filter(d=>{
   const data=String(d.data||'').slice(0,10);

   if(filtros.dataInicio&&data<filtros.dataInicio)return false;
   if(filtros.dataFim&&data>filtros.dataFim)return false;

   if(
    filtros.tipoDespesa!=='todos'&&
    d.despesa!==filtros.tipoDespesa
   )return false;

   if(pesquisa){
    const descricao=String(d.despesa||'').toLowerCase();
    const pagamento=String(d.forma_pagamento||'').toLowerCase();

    if(!descricao.includes(pesquisa)&&!pagamento.includes(pesquisa)){
     return false;
    }
   }

   return true;
  });
 },[despesas,filtros]);

 const totalCents=useMemo(
  ()=>filteredDespesas.reduce(
   (sum,d)=>sum+toCents(d.valor),
   0
  ),
  [filteredDespesas]
 );

 const quantidade=filteredDespesas.length;

 const mediaCents=quantidade
  ?Math.round(totalCents/quantidade)
  :0;

 const maiorDespesa=useMemo(
  ()=>filteredDespesas.reduce(
   (max,d)=>toCents(d.valor)>toCents(max.valor)?d:max,
   {valor:0}
  ),
  [filteredDespesas]
 );

 const handleFilterChange=e=>{
  const{name,value}=e.target;

  setFiltros(prev=>({
   ...prev,
   [name]:value
  }));
 };

 const clearFilters=()=>{
  setFiltros({
   dataInicio:'',
   dataFim:'',
   tipoDespesa:'todos',
   pesquisa:''
  });
 };

 const handleExport=()=>{
  if(!filteredDespesas.length){
   toast({
    title:'Aviso',
    description:'Nenhuma despesa para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filteredDespesas.map(d=>({
    Data:dateBR(d.data),
    'Tipo de Despesa':d.despesa||'-',
    Valor:fromCents(toCents(d.valor)),
    'Forma de Pagamento':d.forma_pagamento||'-',
    Parcelas:d.parcelas||'-'
   })),
   'Relatorio_Despesas',
   'Despesas'
  );
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
      <Receipt className="h-5 w-5 text-red-400"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-red-400">
       Relatórios
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Despesas
      </h1>

      <p className="text-sm text-muted-foreground">
       Consulte e analise suas despesas realizadas.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!filteredDespesas.length}
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
       name="dataInicio"
       value={filtros.dataInicio}
       onChange={handleFilterChange}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Data final</Label>

      <Input
       type="date"
       name="dataFim"
       value={filtros.dataFim}
       onChange={handleFilterChange}
       className="bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Tipo de despesa</Label>

      <Select
       value={filtros.tipoDespesa}
       onValueChange={value=>
        setFiltros(prev=>({...prev,tipoDespesa:value}))
       }
      >
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Tipo de Despesa"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos os tipos</SelectItem>

         {tiposDespesa.map(tipo=>(
          <SelectItem
           key={tipo.id}
           value={tipo.nome_despesa}
          >
           {tipo.nome_despesa}
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
        name="pesquisa"
        value={filtros.pesquisa}
        onChange={handleFilterChange}
        placeholder="Descrição ou pagamento..."
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
     label="Total das Despesas"
     value={money(fromCents(totalCents))}
     icon={TrendingDown}
    />

    <StatCard
     label="Quantidade"
     value={quantidade}
     icon={Receipt}
     type="blue"
    />

    <StatCard
     label="Média por Despesa"
     value={money(fromCents(mediaCents))}
     icon={WalletCards}
    />

    <StatCard
     label="Maior Despesa"
     value={money(maiorDespesa.valor)}
     icon={CalendarDays}
    />
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-red-400">
      Resultados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo de Despesa</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead>Forma de Pagamento</TableHead>
         <TableHead className="text-center">Parcelas</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={5}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):filteredDespesas.length===0?(
         <TableRow>
          <TableCell
           colSpan={5}
           className="py-8 text-center text-muted-foreground"
          >
           Nenhuma despesa encontrada.
          </TableCell>
         </TableRow>
        ):(
         filteredDespesas.map(d=>(
          <TableRow
           key={d.id}
           className="hover:bg-red-500/5"
          >
           <TableCell className="text-sm">
            {dateBR(d.data)}
           </TableCell>

           <TableCell className="font-medium">
            {d.despesa||'—'}
           </TableCell>

           <TableCell className="text-right font-semibold text-red-400">
            {money(d.valor)}
           </TableCell>

           <TableCell className="text-sm text-muted-foreground">
            {d.forma_pagamento||'—'}
           </TableCell>

           <TableCell className="text-center text-sm text-muted-foreground">
            {d.parcelas||'—'}
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

  </div>
 );
};

export default RelatorioDespesas;
