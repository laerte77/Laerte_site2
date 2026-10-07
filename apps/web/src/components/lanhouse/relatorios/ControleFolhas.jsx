import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{FileText,Download,Calendar,TrendingUp,TrendingDown,AlertTriangle,Loader2,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='#06b6d4';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

const ControleFolhas=()=>{
 const{toast}=useToast();
 const{user}=useAuth();

 const[loading,setLoading]=useState(true);
 const[dateRange,setDateRange]=useState({start_date:'',end_date:''});
 const[selectedTipoFolha,setSelectedTipoFolha]=useState('Todos');
 const[tiposFolha,setTiposFolha]=useState([]);
 const[controlData,setControlData]=useState([]);

 const fetchTiposFolha=useCallback(async()=>{
  if(!user)return;
  try{
   const{data,error}=await supabase.from('lm_folhas').select('tipo_folha').eq('user_id',user.id);
   if(error)throw error;
   const unique=[...new Set((data||[]).map(item=>item.tipo_folha))].filter(Boolean);
   setTiposFolha(unique);
  }catch(error){
   console.error('Error fetching tipos de folha:',error);
  }
 },[user]);

 const fetchControlData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const hasStartDate=dateRange.start_date&&dateRange.start_date.trim()!=='';
   const hasEndDate=dateRange.end_date&&dateRange.end_date.trim()!=='';

   let entradasQuery=supabase.from('lm_estoques_entradas').select('produto, quantidade, data').eq('user_id',user.id);
   if(hasStartDate)entradasQuery=entradasQuery.gte('data',dateRange.start_date);
   if(hasEndDate)entradasQuery=entradasQuery.lte('data',dateRange.end_date);

   const{data:entradas,error:entradasError}=await entradasQuery;
   if(entradasError)throw entradasError;

   let saidasQuery=supabase.from('lm_estoques_saidas').select('produto, quantidade, data').eq('user_id',user.id);
   if(hasStartDate)saidasQuery=saidasQuery.gte('data',dateRange.start_date);
   if(hasEndDate)saidasQuery=saidasQuery.lte('data',dateRange.end_date);

   const{data:saidas,error:saidasError}=await saidasQuery;
   if(saidasError)throw saidasError;

   let perdasQuery=supabase.from('lm_lanc_custos').select('tipo_folha, quantidade, data_lancamento').eq('user_id',user.id).eq('tipo','Perda');
   if(hasStartDate)perdasQuery=perdasQuery.gte('data_lancamento',dateRange.start_date);
   if(hasEndDate)perdasQuery=perdasQuery.lte('data_lancamento',dateRange.end_date);

   const{data:perdas,error:perdasError}=await perdasQuery;
   if(perdasError)throw perdasError;

   const grouped={};

   const ensure=tipo=>{
    if(!grouped[tipo]){
     grouped[tipo]={
      tipo_folha:tipo,
      entradas:0,
      saidas:0,
      perdas:0,
      saldo:0,
      custo_unitario:0,
      saldo_valor:0
     };
    }
    return grouped[tipo];
   };

   (entradas||[]).forEach(item=>{
    const tipo=item.produto||'Não especificado';
    ensure(tipo).entradas+=item.quantidade||0;
   });

   (saidas||[]).forEach(item=>{
    const tipo=item.produto||'Não especificado';
    ensure(tipo).saidas+=item.quantidade||0;
   });

   (perdas||[]).forEach(item=>{
    const tipo=item.tipo_folha||'Não especificado';
    ensure(tipo).perdas+=item.quantidade||0;
   });

   for(const tipo in grouped){
    const{data:custoData}=await supabase
     .from('lm_lanc_despesas')
     .select('valor, quantidade')
     .eq('user_id',user.id)
     .eq('tipo_lancamento','Estoque')
     .ilike('despesa_id',`%${tipo}%`)
     .not('quantidade','is',null)
     .gt('quantidade',0)
     .order('created_at',{ascending:false})
     .limit(1);

    if(custoData&&custoData.length>0){
     grouped[tipo].custo_unitario=custoData[0].valor/custoData[0].quantidade;
    }else{
     const{data:tipoData}=await supabase
      .from('lm_tipos_folha')
      .select('preco')
      .eq('user_id',user.id)
      .eq('tipo_folha',tipo)
      .single();

     if(tipoData)grouped[tipo].custo_unitario=tipoData.preco||0;
    }
   }

   let results=Object.values(grouped).map(item=>{
    item.saldo=item.entradas-item.saidas-item.perdas;
    item.saldo_valor=item.saldo*item.custo_unitario;
    return item;
   });

   if(selectedTipoFolha!=='Todos'){
    results=results.filter(item=>item.tipo_folha===selectedTipoFolha);
   }

   setControlData(results);
  }catch(error){
   console.error('Error fetching control data:',error);
   toast({
    title:'Erro',
    description:error.message||'Falha ao carregar dados de controle.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,dateRange,selectedTipoFolha,toast]);

 useEffect(()=>{fetchTiposFolha()},[fetchTiposFolha]);
 useEffect(()=>{fetchControlData()},[fetchControlData]);

 const formatCurrency=value=>BRL.format(value||0);

 const totals=controlData.reduce((acc,item)=>({
  entradas:acc.entradas+(item.entradas||0),
  saidas:acc.saidas+(item.saidas||0),
  perdas:acc.perdas+(item.perdas||0),
  saldo:acc.saldo+(item.saldo||0),
  valor:acc.valor+(item.saldo_valor||0)
 }),{entradas:0,saidas:0,perdas:0,saldo:0,valor:0});

 const handleExport=()=>{
  toast({
   title:'Exportação',
   description:'🚧 Funcionalidade de exportação em desenvolvimento!',
   variant:'default'
  });
 };

 const clearFilters=()=>{
  setDateRange({start_date:'',end_date:''});
  setSelectedTipoFolha('Todos');
 };

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <div className="mt-1 flex items-center gap-2">
      <FileText className="h-6 w-6" style={{color:CYAN}}/>
      <h1 className="text-2xl font-bold">Controle de Folhas</h1>
     </div>
     <p className="mt-1 text-sm text-muted-foreground">
      Inventário e movimentação de estoque por tipo de folha.
     </p>
    </div>

    <Button variant="outline" onClick={handleExport}>
     <Download className="mr-2 h-4 w-4"/>
     Exportar
    </Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

    <Card>
     <CardContent className="flex items-center justify-between p-4">
      <div>
       <p className="text-xs uppercase tracking-wider text-muted-foreground">Entradas</p>
       <p className="mt-1 text-xl font-bold text-green-400">
        {totals.entradas.toLocaleString('pt-BR')}
       </p>
      </div>
      <TrendingUp className="h-5 w-5 text-green-400"/>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="flex items-center justify-between p-4">
      <div>
       <p className="text-xs uppercase tracking-wider text-muted-foreground">Saídas</p>
       <p className="mt-1 text-xl font-bold text-blue-400">
        {totals.saidas.toLocaleString('pt-BR')}
       </p>
      </div>
      <TrendingDown className="h-5 w-5 text-blue-400"/>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="flex items-center justify-between p-4">
      <div>
       <p className="text-xs uppercase tracking-wider text-muted-foreground">Perdas</p>
       <p className="mt-1 text-xl font-bold text-red-400">
        {totals.perdas.toLocaleString('pt-BR')}
       </p>
      </div>
      <AlertTriangle className="h-5 w-5 text-red-400"/>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="flex items-center justify-between p-4">
      <div>
       <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo em Valor</p>
       <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>
        {formatCurrency(totals.valor)}
       </p>
      </div>
      <FileText className="h-5 w-5" style={{color:CYAN}}/>
     </CardContent>
    </Card>

   </div>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2 text-base">
      <Calendar className="h-5 w-5" style={{color:CYAN}}/>
      Filtros
     </CardTitle>
     <CardDescription>
      {!dateRange.start_date&&!dateRange.end_date
       ?'Exibindo todos os registros.'
       :'Filtrando pelo período selecionado.'}
     </CardDescription>
    </CardHeader>

    <CardContent>
     <div className="grid gap-3 md:grid-cols-5">

      <div>
       <Label>Tipo de Folha</Label>
       <Select value={selectedTipoFolha} onValueChange={setSelectedTipoFolha}>
        <SelectTrigger>
         <SelectValue/>
        </SelectTrigger>
        <SelectContent>
         <SelectItem value="Todos">Todos</SelectItem>
         {tiposFolha.map((tipo,index)=>
          <SelectItem key={index} value={tipo}>{tipo}</SelectItem>
         )}
        </SelectContent>
       </Select>
      </div>

      <div>
       <Label>Data Inicial</Label>
       <Input
        type="date"
        value={dateRange.start_date}
        onChange={e=>setDateRange({...dateRange,start_date:e.target.value})}
       />
      </div>

      <div>
       <Label>Data Final</Label>
       <Input
        type="date"
        value={dateRange.end_date}
        onChange={e=>setDateRange({...dateRange,end_date:e.target.value})}
       />
      </div>

      <div className="flex items-end">
       <Button
        onClick={fetchControlData}
        className="w-full text-white"
        style={{background:CYAN}}
        disabled={loading}
       >
        {loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}
        Atualizar
       </Button>
      </div>

      <div className="flex items-end">
       <Button
        variant="outline"
        className="w-full"
        onClick={clearFilters}
        disabled={loading}
       >
        <RotateCcw className="mr-2 h-4 w-4"/>
        Limpar
       </Button>
      </div>

     </div>
    </CardContent>
   </Card>

   <Card>
    <CardHeader className="flex flex-row items-center justify-between">
     <div>
      <CardTitle className="text-base">Controle por Tipo de Folha</CardTitle>
      <CardDescription>Saldo de entradas, saídas e perdas.</CardDescription>
     </div>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>

       <TableHeader className="bg-secondary/70">
        <TableRow>
         <TableHead>Tipo de Folha</TableHead>
         <TableHead className="text-right">
          <span className="inline-flex items-center gap-1.5">
           <TrendingUp className="h-4 w-4 text-green-400"/>
           Entradas
          </span>
         </TableHead>
         <TableHead className="text-right">
          <span className="inline-flex items-center gap-1.5">
           <TrendingDown className="h-4 w-4 text-blue-400"/>
           Saídas
          </span>
         </TableHead>
         <TableHead className="text-right">
          <span className="inline-flex items-center gap-1.5">
           <AlertTriangle className="h-4 w-4 text-red-400"/>
           Perdas
          </span>
         </TableHead>
         <TableHead className="text-right">Saldo</TableHead>
         <TableHead className="text-right">Saldo em Valor</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>

        {loading?
         <TableRow>
          <TableCell colSpan={6} className="py-12 text-center">
           <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{color:CYAN}}/>
          </TableCell>
         </TableRow>
        :
        controlData.length===0?
         <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
           Nenhuma movimentação {dateRange.start_date||dateRange.end_date?'no período selecionado':'registrada'}.
          </TableCell>
         </TableRow>
        :
        controlData.map((item,index)=>
         <TableRow key={index} className="hover:bg-muted/40">
          <TableCell className="font-semibold">{item.tipo_folha}</TableCell>
          <TableCell className="text-right font-mono text-green-400">
           {item.entradas.toLocaleString('pt-BR')}
          </TableCell>
          <TableCell className="text-right font-mono text-blue-400">
           {item.saidas.toLocaleString('pt-BR')}
          </TableCell>
          <TableCell className="text-right font-mono text-red-400">
           {item.perdas.toLocaleString('pt-BR')}
          </TableCell>
          <TableCell className="text-right font-mono font-bold">
           {item.saldo.toLocaleString('pt-BR')}
          </TableCell>
          <TableCell className="text-right font-mono font-bold" style={{color:CYAN}}>
           {formatCurrency(item.saldo_valor)}
          </TableCell>
         </TableRow>
        )}

       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </motion.div>
 );
};

export default ControleFolhas;
