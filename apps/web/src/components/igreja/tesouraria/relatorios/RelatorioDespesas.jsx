import React,{useState,useEffect,useMemo,useCallback,useRef}from'react';
import{FileSearch,Download,RefreshCw,FileBarChart}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{ScrollArea}from'@/components/ui/scroll-area';

const meses=[
'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

export default function RelatorioDespesas(){
 const{toast}=useToast();
 const{user}=useAuth();
 const isMounted=useRef(true);

 const[despesas,setDespesas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);

 const[filters,setFilters]=useState({
  dataInicio:'',
  dataFim:'',
  tipo:'todos',
  mes:'todos'
 });

 useEffect(()=>{
  return()=>{isMounted.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const[despesasRes,tiposRes]=await Promise.all([
    supabase
     .from('igreja_despesas')
     .select('*')
     .eq('user_id',user.id),

    supabase
     .from('igreja_tipos_despesa')
     .select('despesa')
     .eq('user_id',user.id)
   ]);

   if(!isMounted.current)return;

   if(despesasRes.error)throw despesasRes.error;
   if(tiposRes.error)throw tiposRes.error;

   setDespesas(despesasRes.data||[]);
   setTiposDespesa(tiposRes.data||[]);
  }catch(error){
   if(isMounted.current){
    toast({
     title:'Erro ao buscar dados',
     description:error.message,
     variant:'destructive'
    });
   }
  }finally{
   if(isMounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('igreja_relatorio_despesas_changes_v4')
   .on(
    'postgres_changes',
    {event:'*',schema:'public'},
    ()=>{
     if(isMounted.current)fetchData();
    }
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filteredData=useMemo(()=>{
  if(loading)return[];

  return despesas
   .filter(item=>{
    const dataItem=new Date(item.data);

    const dataInicio=filters.dataInicio
     ?new Date(filters.dataInicio+'T00:00:00')
     :null;

    const dataFim=filters.dataFim
     ?new Date(filters.dataFim+'T23:59:59')
     :null;

    if(dataInicio&&dataItem<dataInicio)return false;
    if(dataFim&&dataItem>dataFim)return false;

    if(
     filters.tipo!=='todos'&&
     item.despesa!==filters.tipo
    )return false;

    if(
     filters.mes!=='todos'&&
     dataItem.getUTCMonth()!==parseInt(filters.mes)
    )return false;

    return true;
   })
   .sort(
    (a,b)=>new Date(b.data)-new Date(a.data)
   );
 },[despesas,filters,loading]);

 const subtotal=useMemo(
  ()=>filteredData.reduce(
   (acc,item)=>acc+parseFloat(item.valor||0),
   0
  ),
  [filteredData]
 );

 const formatCurrency=value=>
  `R$ ${Number(value||0).toLocaleString(
   'pt-BR',
   {
    minimumFractionDigits:2,
    maximumFractionDigits:2
   }
  )}`;

 const handleExport=()=>{
  toast({
   title:'Exportação',
   description:'A exportação será implementada em breve!'
  });
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <FileBarChart className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>

      <h1 className="text-2xl font-bold text-foreground">
       Relatório de Despesas
      </h1>

      <p className="text-sm text-muted-foreground">
       Filtre e visualize as despesas da igreja.
      </p>
     </div>
    </div>

    <Button
     onClick={fetchData}
     variant="outline"
     disabled={loading}
     className="border-[hsl(var(--neon-igreja))]/40"
    >
     <RefreshCw
      className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}
     />
     Atualizar
    </Button>
   </div>

   <Card className="bg-card border-border/60">
    <CardHeader className="border-b border-border/60">
     <CardTitle>Filtros do Relatório</CardTitle>
    </CardHeader>

    <CardContent>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

      <div>
       <Label>Data Início</Label>
       <Input
        type="date"
        value={filters.dataInicio}
        onChange={e=>setFilters({
         ...filters,
         dataInicio:e.target.value
        })}
        className="bg-input mt-2"
       />
      </div>

      <div>
       <Label>Data Fim</Label>
       <Input
        type="date"
        value={filters.dataFim}
        onChange={e=>setFilters({
         ...filters,
         dataFim:e.target.value
        })}
        className="bg-input mt-2"
       />
      </div>

      <div>
       <Label>Tipo de Despesa</Label>

       <Select
        value={filters.tipo}
        onValueChange={v=>setFilters({
         ...filters,
         tipo:v
        })}
       >
        <SelectTrigger className="bg-input mt-2">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-igreja">
         <ScrollArea className="h-48">
          <SelectItem value="todos">
           Todos
          </SelectItem>

          {tiposDespesa.map(t=>(
           <SelectItem
            key={t.despesa}
            value={t.despesa}
           >
            {t.despesa}
           </SelectItem>
          ))}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div>
       <Label>Mês</Label>

       <Select
        value={filters.mes}
        onValueChange={v=>setFilters({
         ...filters,
         mes:v
        })}
       >
        <SelectTrigger className="bg-input mt-2">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-igreja">
         <ScrollArea className="h-48">
          <SelectItem value="todos">
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
    </CardContent>
   </Card>

   <Card className="bg-card border-border/60">
    <CardContent className="p-5 flex justify-end">
     <div className="text-right">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Subtotal do Período
      </p>

      <p className="text-2xl font-bold text-red-400">
       {formatCurrency(subtotal)}
      </p>
     </div>
    </CardContent>
   </Card>

   <Card className="bg-card border-border/60 overflow-hidden">

    <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
     <CardTitle>Despesas Encontradas</CardTitle>

     <Button
      onClick={handleExport}
      variant="outline"
      className="border-[hsl(var(--neon-igreja))]/40"
     >
      <Download className="w-4 h-4 mr-2"/>
      Exportar
     </Button>
    </CardHeader>

    <CardContent className="p-0">

     {loading?(
      <div className="p-10 text-center">
       Carregando...
      </div>
     ):filteredData.length===0?(
      <div className="p-10 text-center text-muted-foreground">
       <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-50"/>
       Nenhum resultado encontrado.
      </div>
     ):(
      <div className="responsive-table-wrapper">
       <table className="w-full text-sm">

        <thead className="bg-muted/50">
         <tr className="border-b">
          <th className="p-4 text-left">Data</th>
          <th className="p-4 text-left">Descrição</th>
          <th className="p-4 text-right">Valor</th>
         </tr>
        </thead>

        <tbody>
         {filteredData.map(item=>(
          <tr
           key={item.id}
           className="border-b last:border-b-0 hover:bg-primary/5"
          >
           <td className="p-4">
            {new Date(item.data).toLocaleDateString(
             'pt-BR',
             {timeZone:'UTC'}
            )}
           </td>

           <td className="p-4 font-medium">
            {item.despesa}
           </td>

           <td className="p-4 text-right font-semibold text-red-400">
            {formatCurrency(item.valor)}
           </td>
          </tr>
         ))}
        </tbody>

       </table>
      </div>
     )}

    </CardContent>
   </Card>

  </div>
 );
}
