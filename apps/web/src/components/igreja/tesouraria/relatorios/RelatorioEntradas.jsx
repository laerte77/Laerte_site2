import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Download,Filter,DollarSign,BarChart,User,Calendar,RefreshCw,FileBarChart3}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import * as XLSX from'xlsx';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=Array.from({length:5},(_,i)=>new Date().getFullYear()-i);

export default function RelatorioEntradas(){
 const{user}=useAuth();

 const[entradas,setEntradas]=useState([]);
 const[tiposEntrada,setTiposEntrada]=useState([]);
 const[dizimistas,setDizimistas]=useState([]);
 const[loading,setLoading]=useState(true);

 const[filters,setFilters]=useState({
  month:new Date().getMonth(),
  year:new Date().getFullYear(),
  tipo:'todos',
  dizimista:'todos'
 });

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const[
   entradasRes,
   tiposRes,
   dizimistasRes
  ]=await Promise.all([
   supabase
    .from('igreja_entradas')
    .select('*, igreja_dizimistas(nome)'),

   supabase
    .from('igreja_tipos_entrada')
    .select('id, entrada'),

   supabase
    .from('igreja_dizimistas')
    .select('id, nome')
  ]);

  if(!entradasRes.error)
   setEntradas(entradasRes.data||[]);

  if(!tiposRes.error)
   setTiposEntrada(tiposRes.data||[]);

  if(!dizimistasRes.error)
   setDizimistas(dizimistasRes.data||[]);

  setLoading(false);
 },[user]);

 useEffect(()=>{
  fetchData();
 },[fetchData]);

 const filteredData=useMemo(()=>entradas.filter(item=>{
  const date=new Date(item.data);

  return(
   date.getUTCMonth()===filters.month&&
   date.getUTCFullYear()===filters.year&&
   (
    filters.tipo==='todos'||
    item.tipo_entrada===filters.tipo
   )&&
   (
    filters.dizimista==='todos'||
    String(item.dizimista_id)===filters.dizimista
   )
  );
 }),[entradas,filters]);

 const totalEntradas=useMemo(
  ()=>filteredData.reduce(
   (acc,item)=>acc+parseFloat(item.valor||0),
   0
  ),
  [filteredData]
 );

 const change=(key,value)=>
  setFilters(prev=>({...prev,[key]:value}));

 const handleExport=()=>{
  const data=filteredData.map(item=>({
   DATA:new Date(item.data).toLocaleDateString(
    'pt-BR',
    {timeZone:'UTC'}
   ),
   TIPO:item.tipo_entrada,
   'DIZIMISTA/OFERTANTE':
    item.igreja_dizimistas?.nome||
    item.ofertante||
    'N/A',
   VALOR:parseFloat(item.valor||0),
   CONFERENTE:item.conferente
  }));

  const worksheet=XLSX.utils.json_to_sheet(data);

  XLSX.utils.sheet_add_aoa(
   worksheet,
   [['','','','TOTAL:',totalEntradas]],
   {origin:-1}
  );

  const workbook=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
   workbook,
   worksheet,
   'Relatório de Entradas'
  );

  XLSX.writeFile(
   workbook,
   `Relatorio_Entradas_${meses[filters.month]}_${filters.year}.xlsx`
  );
 };

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <FileBarChart3 className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>
      <h1 className="text-2xl font-bold">
       Relatório de Entradas
      </h1>
      <p className="text-sm text-muted-foreground">
       Visualize o resumo das entradas financeiras.
      </p>
     </div>
    </div>

    <div className="flex gap-2">
     <Button
      variant="outline"
      onClick={fetchData}
      disabled={loading}
     >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>
      Atualizar
     </Button>

     <Button
      onClick={handleExport}
      variant="outline"
      className="text-emerald-500 border-emerald-500/50"
     >
      <Download className="w-4 h-4 mr-2"/>
      Excel
     </Button>
    </div>
   </div>

   <Card className="bg-card border-border/60">
    <CardHeader className="border-b border-border/60">
     <CardTitle className="flex items-center">
      <Filter className="w-5 h-5 mr-2"/>
      Filtros do Relatório
     </CardTitle>
    </CardHeader>

    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

     <div>
      <label className="text-sm font-medium flex items-center mb-2">
       <Calendar className="w-4 h-4 mr-2"/>
       Mês
      </label>

      <Select
       value={String(filters.month)}
       onValueChange={v=>change('month',Number(v))}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <ScrollArea className="h-48">
         {meses.map((m,i)=>(
          <SelectItem key={i} value={String(i)}>
           {m}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div>
      <label className="text-sm font-medium flex items-center mb-2">
       <Calendar className="w-4 h-4 mr-2"/>
       Ano
      </label>

      <Select
       value={String(filters.year)}
       onValueChange={v=>change('year',Number(v))}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        {availableYears.map(y=>(
         <SelectItem key={y} value={String(y)}>
          {y}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     <div>
      <label className="text-sm font-medium flex items-center mb-2">
       <BarChart className="w-4 h-4 mr-2"/>
       Tipo de Entrada
      </label>

      <Select
       value={filters.tipo}
       onValueChange={v=>change('tipo',v)}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos</SelectItem>

         {tiposEntrada.map(t=>(
          <SelectItem
           key={t.id}
           value={t.entrada}
          >
           {t.entrada}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div>
      <label className="text-sm font-medium flex items-center mb-2">
       <User className="w-4 h-4 mr-2"/>
       Dizimista
      </label>

      <Select
       value={filters.dizimista}
       onValueChange={v=>change('dizimista',v)}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        <ScrollArea className="h-48">
         <SelectItem value="todos">Todos</SelectItem>

         {dizimistas.map(d=>(
          <SelectItem
           key={d.id}
           value={String(d.id)}
          >
           {d.nome}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

    </CardContent>
   </Card>

   <Card className="bg-card border-border/60 overflow-hidden">

    <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
     <CardTitle>Detalhes das Entradas</CardTitle>

     <div className="text-xl font-bold text-green-400">
      Total: R$ {totalEntradas.toFixed(2)}
     </div>
    </CardHeader>

    <CardContent className="p-0">

     <div className="responsive-table-wrapper">
      <Table>

       <TableHeader className="bg-muted/50">
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead>Dizimista/Ofertante</TableHead>
         <TableHead>Conferente</TableHead>
         <TableHead className="text-right">Valor</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>

        {loading?(
         <TableRow>
          <TableCell colSpan="5" className="text-center h-24">
           Carregando dados...
          </TableCell>
         </TableRow>
        ):filteredData.length===0?(
         <TableRow>
          <TableCell colSpan="5" className="text-center h-24">
           <DollarSign className="mx-auto w-8 h-8 mb-2 text-muted-foreground"/>
           Nenhuma entrada encontrada para este período.
          </TableCell>
         </TableRow>
        ):(
         filteredData.map(item=>(
          <TableRow key={item.id}>

           <TableCell>
            {new Date(item.data).toLocaleDateString(
             'pt-BR',
             {timeZone:'UTC'}
            )}
           </TableCell>

           <TableCell>{item.tipo_entrada}</TableCell>

           <TableCell>
            {item.igreja_dizimistas?.nome||
             item.ofertante||
             'N/A'}
           </TableCell>

           <TableCell>{item.conferente}</TableCell>

           <TableCell className="text-right font-semibold text-green-400">
            R$ {parseFloat(item.valor||0).toFixed(2)}
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
}
