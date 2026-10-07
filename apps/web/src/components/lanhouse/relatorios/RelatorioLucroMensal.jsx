import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{TrendingUp,Calendar,Download,Loader2,Search,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Label}from'@/components/ui/label';
import{Input}from'@/components/ui/input';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer}from'recharts';

const CYAN='#06b6d4';
const RED='#ef4444';
const COLORS=['#06b6d4','#ef4444','#f59e0b','#10b981','#8b5cf6'];

const RelatorioLucroMensal=()=>{
 const{toast}=useToast();
 const{user}=useAuth();

 const[loading,setLoading]=useState(true);
 const[selectedMonth,setSelectedMonth]=useState(new Date().toISOString().slice(0,7));
 const[expenseSearch,setExpenseSearch]=useState('');
 const[monthlyData,setMonthlyData]=useState(null);
 const[profitEvolution,setProfitEvolution]=useState([]);
 const[expenseDistribution,setExpenseDistribution]=useState([]);

 const fetchMonthlyReport=useCallback(async()=>{
  if(!user||!selectedMonth)return;
  setLoading(true);

  try{
   const[year,month]=selectedMonth.split('-');
   const startDate=`${year}-${month}-01`;
   const lastDay=new Date(parseInt(year),parseInt(month),0).getDate();
   const endDate=`${year}-${month}-${lastDay}`;

   const{data:servicos,error:servicosError}=await supabase
    .from('lm_lanc_servicos')
    .select('valor')
    .eq('user_id',user.id)
    .gte('data',startDate)
    .lte('data',endDate);

   if(servicosError)throw new Error(`Falha ao carregar serviços: ${servicosError.message}`);

   let despesasQuery=supabase
    .from('lm_lanc_despesas')
    .select(`valor, tipo_custo, tipo_lancamento, despesa_id, ${expenseSearch?'lm_despesas!inner(despesa)':'lm_despesas(despesa)'}`)
    .eq('user_id',user.id)
    .gte('data',startDate)
    .lte('data',endDate);

   if(expenseSearch){
    despesasQuery=despesasQuery.ilike('lm_despesas.despesa',`%${expenseSearch}%`);
   }

   const{data:despesas,error:despesasError}=await despesasQuery;

   if(despesasError)throw new Error(`Falha ao buscar despesas. Verifique o filtro: ${despesasError.message}`);

   let custosQuery=supabase
    .from('lm_lanc_custos')
    .select('custo_total, tipo, tipo_folha')
    .eq('user_id',user.id)
    .gte('data_lancamento',startDate)
    .lte('data_lancamento',endDate);

   if(expenseSearch){
    custosQuery=custosQuery.ilike('tipo_folha',`%${expenseSearch}%`);
   }

   const{data: custos,error: custosError}=await custosQuery;

   if(custosError)throw new Error(`Falha ao buscar custos: ${custosError.message}`);

   const receitaTotal=(servicos||[]).reduce((sum,s)=>sum+(s.valor||0),0);

   const despesasFixas=(despesas||[])
    .filter(d=>d.tipo_custo==='Fixo')
    .reduce((sum,d)=>sum+(d.valor||0),0);

   const despesasVariaveis=(despesas||[])
    .filter(d=>d.tipo_custo==='Variável')
    .reduce((sum,d)=>sum+(d.valor||0),0);

   const custoEstoque=(despesas||[])
    .filter(d=>d.tipo_lancamento==='Estoque')
    .reduce((sum,d)=>sum+(d.valor||0),0);

   const custoConsumo=(custos||[])
    .filter(c=>c.tipo==='Consumo')
    .reduce((sum,c)=>sum+(c.custo_total||0),0);

   const custoPerda=(custos||[])
    .filter(c=>c.tipo==='Perda')
    .reduce((sum,c)=>sum+(c.custo_total||0),0);

   const totalDespesas=despesasFixas+despesasVariaveis+custoEstoque+custoConsumo+custoPerda;
   const lucroLiquido=receitaTotal-totalDespesas;
   const margemLucro=receitaTotal>0?(lucroLiquido/receitaTotal)*100:0;

   setMonthlyData({
    mes_ano:selectedMonth,
    receita_total:receitaTotal,
    despesas_fixas:despesasFixas,
    despesas_variaveis:despesasVariaveis,
    custo_estoque:custoEstoque,
    custo_consumo:custoConsumo,
    custo_perda:custoPerda,
    total_despesas:totalDespesas,
    lucro_liquido:lucroLiquido,
    margem_lucro:margemLucro
   });

   setExpenseDistribution([
    {name:'Despesas Fixas',value:despesasFixas,fill:COLORS[0]},
    {name:'Despesas Variáveis',value:despesasVariaveis,fill:COLORS[1]},
    {name:'Custo Estoque',value:custoEstoque,fill:COLORS[2]},
    {name:'Custo Consumo',value:custoConsumo,fill:COLORS[3]},
    {name:'Custo Perda',value:custoPerda,fill:COLORS[4]}
   ].filter(item=>item.value>0));

   const monthsData=[];
   const currentDate=new Date(selectedMonth);

   for(let i=5;i>=0;i--){
    const date=new Date(currentDate.getFullYear(),currentDate.getMonth()-i,1);
    const evoYearMonth=date.toISOString().slice(0,7);
    const[evoYear,evoMonth]=evoYearMonth.split('-');
    const evoStartDate=`${evoYear}-${evoMonth}-01`;
    const evoLastDay=new Date(parseInt(evoYear),parseInt(evoMonth),0).getDate();
    const evoEndDate=`${evoYear}-${evoMonth}-${evoLastDay}`;

    const{data:evoServicos}=await supabase
     .from('lm_lanc_servicos')
     .select('valor')
     .eq('user_id',user.id)
     .gte('data',evoStartDate)
     .lte('data',evoEndDate);

    let evoDespesasQuery=supabase
     .from('lm_lanc_despesas')
     .select(`valor, ${expenseSearch?'lm_despesas!inner(despesa)':'lm_despesas(despesa)'}`)
     .eq('user_id',user.id)
     .gte('data',evoStartDate)
     .lte('data',evoEndDate);

    if(expenseSearch){
     evoDespesasQuery=evoDespesasQuery.ilike('lm_despesas.despesa',`%${expenseSearch}%`);
    }

    const{data:evoDespesas}=await evoDespesasQuery;

    let evoCustosQuery=supabase
     .from('lm_lanc_custos')
     .select('custo_total')
     .eq('user_id',user.id)
     .gte('data_lancamento',evoStartDate)
     .lte('data_lancamento',evoEndDate);

    if(expenseSearch){
     evoCustosQuery=evoCustosQuery.ilike('tipo_folha',`%${expenseSearch}%`);
    }

    const{data:evoCustos}=await evoCustosQuery;

    const receita=(evoServicos||[]).reduce((sum,s)=>sum+(s.valor||0),0);
    const despesa=(evoDespesas||[]).reduce((sum,d)=>sum+(d.valor||0),0);
    const custo=(evoCustos||[]).reduce((sum,c)=>sum+(c.custo_total||0),0);

    monthsData.push({
     mes:date.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),
     lucro:receita-despesa-custo
    });
   }

   setProfitEvolution(monthsData);
  }catch(error){
   console.error('Error fetching monthly report:',error);
   toast({
    title:'Erro de Consulta',
    description:error.message||'Falha ao carregar relatório mensal. Verifique se o termo de busca é válido.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,selectedMonth,expenseSearch,toast]);

 useEffect(()=>{fetchMonthlyReport()},[fetchMonthlyReport]);

 const formatCurrency=value=>new Intl.NumberFormat('pt-BR',{
  style:'currency',
  currency:'BRL',
  minimumFractionDigits:2,
  maximumFractionDigits:2
 }).format(value||0);

 const formatPercent=value=>`${value.toFixed(2)}%`;

 const handleExport=()=>{
  toast({
   title:'Exportação',
   description:'🚧 Funcionalidade de exportação em desenvolvimento!',
   variant:'default'
  });
 };

 const generateMonthOptions=()=>{
  const options=[];
  const currentDate=new Date();

  for(let i=0;i<12;i++){
   const date=new Date(currentDate.getFullYear(),currentDate.getMonth()-i,1);
   const value=date.toISOString().slice(0,7);
   const label=date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
   options.push({value,label:label.charAt(0).toUpperCase()+label.slice(1)});
  }

  return options;
 };

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>
      LM Impressões
     </p>

     <div className="mt-1 flex items-center gap-2">
      <TrendingUp className="h-6 w-6" style={{color:CYAN}}/>
      <h1 className="text-2xl font-bold">Relatório Mensal de Lucro</h1>
     </div>

     <p className="mt-1 text-sm text-muted-foreground">
      Receitas, despesas e lucratividade.
     </p>
    </div>

    <Button variant="outline" onClick={handleExport}>
     <Download className="mr-2 h-4 w-4"/>
     Exportar
    </Button>
   </div>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2 text-base">
      <Calendar className="h-5 w-5" style={{color:CYAN}}/>
      Filtros
     </CardTitle>
     <CardDescription>
      Selecione o mês e, opcionalmente, filtre por tipo de despesa.
     </CardDescription>
    </CardHeader>

    <CardContent>
     <div className="grid gap-3 md:grid-cols-4">

      <div>
       <Label>Mês/Ano</Label>
       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger>
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         {generateMonthOptions().map(option=>
          <SelectItem key={option.value} value={option.value}>
           {option.label}
          </SelectItem>
         )}
        </SelectContent>
       </Select>
      </div>

      <div>
       <Label>Filtrar Tipo Despesa</Label>

       <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

        <Input
         placeholder="Ex: PAPEL OFÍCIO"
         value={expenseSearch}
         onChange={e=>setExpenseSearch(e.target.value)}
         onKeyDown={e=>e.key==='Enter'&&fetchMonthlyReport()}
         className="pl-9"
        />
       </div>
      </div>

      <div className="flex items-end">
       <Button
        onClick={fetchMonthlyReport}
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
        onClick={()=>setExpenseSearch('')}
        className="w-full"
       >
        <RotateCcw className="mr-2 h-4 w-4"/>
        Limpar
       </Button>
      </div>

     </div>
    </CardContent>
   </Card>

   {monthlyData&&
    <>
     <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

      <Card>
       <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
         Receita Total
        </p>
        <p className="mt-1 text-2xl font-bold text-green-400">
         {formatCurrency(monthlyData.receita_total)}
        </p>
       </CardContent>
      </Card>

      <Card>
       <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
         Total Despesas
        </p>
        <p className="mt-1 text-2xl font-bold text-red-400">
         {formatCurrency(monthlyData.total_despesas)}
        </p>
       </CardContent>
      </Card>

      <Card>
       <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
         Lucro Líquido
        </p>
        <p className={`mt-1 text-2xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>
         {formatCurrency(monthlyData.lucro_liquido)}
        </p>
       </CardContent>
      </Card>

     </div>

     <Card>
      <CardHeader>
       <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
       <CardDescription>
        Análise de receitas e despesas
        {expenseSearch&&
         <span className="ml-1 font-semibold" style={{color:CYAN}}>
          (Filtro: {expenseSearch})
         </span>
        }
       </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
       <div className="overflow-x-auto">
        <Table>

         <TableHeader className="bg-secondary/70">
          <TableRow>
           <TableHead>Categoria</TableHead>
           <TableHead className="text-right">Valor</TableHead>
          </TableRow>
         </TableHeader>

         <TableBody>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="font-semibold text-green-400">Receita Total</TableCell>
           <TableCell className="text-right font-bold text-green-400">
            {formatCurrency(monthlyData.receita_total)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="pl-8">Despesas Fixas</TableCell>
           <TableCell className="text-right text-red-400">
            {formatCurrency(monthlyData.despesas_fixas)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="pl-8">Despesas Variáveis</TableCell>
           <TableCell className="text-right text-red-400">
            {formatCurrency(monthlyData.despesas_variaveis)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="pl-8">Custo de Estoque</TableCell>
           <TableCell className="text-right text-red-400">
            {formatCurrency(monthlyData.custo_estoque)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="pl-8">Custo de Consumo</TableCell>
           <TableCell className="text-right text-red-400">
            {formatCurrency(monthlyData.custo_consumo)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="pl-8">Custo de Perda</TableCell>
           <TableCell className="text-right text-red-400">
            {formatCurrency(monthlyData.custo_perda)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="font-semibold text-red-400">Total Despesas</TableCell>
           <TableCell className="text-right font-bold text-red-400">
            {formatCurrency(monthlyData.total_despesas)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className={`font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>
            LUCRO LÍQUIDO
           </TableCell>

           <TableCell className={`text-right text-xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>
            {formatCurrency(monthlyData.lucro_liquido)}
           </TableCell>
          </TableRow>

          <TableRow className="hover:bg-muted/40">
           <TableCell className="font-semibold">Margem de Lucro</TableCell>
           <TableCell className={`text-right font-bold ${monthlyData.margem_lucro>=0?'text-cyan-400':'text-red-400'}`}>
            {formatPercent(monthlyData.margem_lucro)}
           </TableCell>
          </TableRow>

         </TableBody>
        </Table>
       </div>
      </CardContent>
     </Card>

     <div className="grid gap-5 lg:grid-cols-2">

      <Card>
       <CardHeader>
        <CardTitle className="text-base">Evolução do Lucro</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
       </CardHeader>

       <CardContent>
        {profitEvolution.length===0?
         <div className="flex h-64 items-center justify-center text-muted-foreground">
          Nenhum dado disponível
         </div>
        :
         <ResponsiveContainer width="100%" height={300}>
          <LineChart data={profitEvolution}>
           <CartesianGrid strokeDasharray="3 3"/>
           <XAxis dataKey="mes"/>
           <YAxis/>
           <Tooltip formatter={value=>formatCurrency(value)}/>
           <Legend/>
           <Line
            type="monotone"
            dataKey="lucro"
            stroke={CYAN}
            strokeWidth={2}
            name="Lucro Líquido"
           />
          </LineChart>
         </ResponsiveContainer>
        }
       </CardContent>
      </Card>

      <Card>
       <CardHeader>
        <CardTitle className="text-base">Distribuição de Despesas</CardTitle>
        <CardDescription>Proporção dos gastos por categoria</CardDescription>
       </CardHeader>

       <CardContent>
        {expenseDistribution.length===0?
         <div className="flex h-64 items-center justify-center text-muted-foreground">
          Nenhuma despesa registrada no período
         </div>
        :
         <ResponsiveContainer width="100%" height={300}>
          <PieChart>
           <Pie
            data={expenseDistribution}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({name,percent})=>`${name}: ${(percent*100).toFixed(1)}%`}
            outerRadius={100}
            dataKey="value"
           >
            {expenseDistribution.map((entry,index)=>
             <Cell key={`cell-${index}`} fill={entry.fill||COLORS[index%COLORS.length]}/>
            )}
           </Pie>
           <Tooltip formatter={value=>formatCurrency(value)}/>
           <Legend/>
          </PieChart>
         </ResponsiveContainer>
        }
       </CardContent>
      </Card>

     </div>
    </>
   }

   {loading&&
    <div className="flex items-center justify-center py-20">
     <Loader2 className="h-10 w-10 animate-spin" style={{color:CYAN}}/>
    </div>
   }

  </motion.div>
 );
};

export default RelatorioLucroMensal;
