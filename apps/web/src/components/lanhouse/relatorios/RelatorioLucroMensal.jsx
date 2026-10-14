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

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const monthKey=value=>String(value||'').slice(0,7);
const currentMonthKey=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};
const shiftMonth=(key,offset)=>{
 const[y,m]=key.split('-').map(Number);
 const d=new Date(y,m-1+offset,1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};
const monthStart=key=>`${key}-01`;
const monthEnd=key=>{
 const[y,m]=key.split('-').map(Number);
 const last=new Date(y,m,0).getDate();
 return `${key}-${String(last).padStart(2,'0')}`;
};
const monthLabel=key=>{
 const[y,m]=key.split('-').map(Number);
 const label=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
 return label.charAt(0).toUpperCase()+label.slice(1);
};
const shortMonthLabel=key=>{
 const[y,m]=key.split('-').map(Number);
 return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1));
};
const sum=(rows,key)=>rows.reduce((total,item)=>total+Number(item[key]||0),0);
const isStockPurchase=item=>normalize(item.tipo_lancamento)==='estoque';

const calculateMonth=(key,services,expenses,costs)=>{
 const monthServices=services.filter(x=>monthKey(x.data)===key);
 const monthExpenses=expenses.filter(x=>monthKey(x.data)===key);
 const monthCosts=costs.filter(x=>monthKey(x.data_lancamento)===key);

 const purchases=monthExpenses.filter(isStockPurchase);
 const operatingExpenses=monthExpenses.filter(x=>!isStockPurchase(x));
 const fixed=operatingExpenses.filter(x=>normalize(x.tipo_custo)==='fixo');
 const variable=operatingExpenses.filter(x=>normalize(x.tipo_custo)==='variavel');
 const other=operatingExpenses.filter(x=>!['fixo','variavel'].includes(normalize(x.tipo_custo)));

 const consumption=monthCosts.filter(x=>normalize(x.tipo)==='consumo');
 const losses=monthCosts.filter(x=>normalize(x.tipo)==='perda');

 const revenue=sum(monthServices,'valor');
 const fixedTotal=sum(fixed,'valor');
 const variableTotal=sum(variable,'valor');
 const otherTotal=sum(other,'valor');
 const purchasesTotal=sum(purchases,'valor');
 const consumptionTotal=sum(consumption,'custo_total');
 const lossTotal=sum(losses,'custo_total');

 const totalExpenses=fixedTotal+variableTotal+otherTotal+consumptionTotal+lossTotal;
 const profit=revenue-totalExpenses;

 return{
  receita_total:revenue,
  despesas_fixas:fixedTotal,
  despesas_variaveis:variableTotal,
  outras_despesas:otherTotal,
  compras_estoque:purchasesTotal,
  custo_consumo:consumptionTotal,
  custo_perda:lossTotal,
  total_despesas:totalExpenses,
  lucro_liquido:profit,
  margem_lucro:revenue>0?(profit/revenue)*100:0
 };
};

const RelatorioLucroMensal=()=>{
 const{toast}=useToast();
 const{user}=useAuth();
 const[loading,setLoading]=useState(true);
 const[selectedMonth,setSelectedMonth]=useState(currentMonthKey);
 const[expenseSearch,setExpenseSearch]=useState('');
 const[monthlyData,setMonthlyData]=useState(null);
 const[profitEvolution,setProfitEvolution]=useState([]);

 const fetchMonthlyReport=useCallback(async()=>{
  if(!user){
   setLoading(false);
   return;
  }

  if(!/^\d{4}-\d{2}$/.test(selectedMonth))return;

  setLoading(true);

  try{
   const historyStart=monthStart(shiftMonth(selectedMonth,-5));
   const historyEnd=monthEnd(selectedMonth);
   const term=expenseSearch.trim();

   const[servicesRes,expensesRes,costsRes]=await Promise.all([
    supabase.from('lm_lanc_servicos')
     .select('data,valor')
     .eq('user_id',user.id)
     .gte('data',historyStart)
     .lte('data',historyEnd),

    (()=>{
     let q=supabase.from('lm_lanc_despesas')
      .select(`data,valor,tipo_custo,tipo_lancamento,lm_despesas${term?'!inner':''}(despesa)`)
      .eq('user_id',user.id)
      .gte('data',historyStart)
      .lte('data',historyEnd);

     if(term)q=q.ilike('lm_despesas.despesa',`%${term}%`);
     return q;
    })(),

    (()=>{
     let q=supabase.from('lm_lanc_custos')
      .select('data_lancamento,custo_total,tipo,tipo_folha')
      .eq('user_id',user.id)
      .gte('data_lancamento',historyStart)
      .lte('data_lancamento',historyEnd);

     if(term)q=q.ilike('tipo_folha',`%${term}%`);
     return q;
    })()
   ]);

   const error=[servicesRes,expensesRes,costsRes].find(x=>x.error)?.error;
   if(error)throw error;

   const services=servicesRes.data||[];
   const expenses=expensesRes.data||[];
   const costs=costsRes.data||[];

   const report=calculateMonth(selectedMonth,services,expenses,costs);
   setMonthlyData({...report,mes_ano:selectedMonth});

   const keys=Array.from({length:6},(_,i)=>shiftMonth(selectedMonth,i-5));
   setProfitEvolution(keys.map(key=>({
    mes:shortMonthLabel(key),
    lucro:calculateMonth(key,services,expenses,costs).lucro_liquido
   })));
  }catch(error){
   console.error('Erro no relatório mensal:',error);
   toast({
    title:'Erro ao carregar relatório',
    description:error.message||'Não foi possível calcular o lucro mensal.',
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
 }).format(Number(value)||0);

 const formatPercent=value=>`${(Number(value)||0).toFixed(2)}%`;

 const generateMonthOptions=()=>{
  const current=currentMonthKey();
  return Array.from({length:12},(_,i)=>{
   const value=shiftMonth(current,-i);
   return{value,label:monthLabel(value)};
  });
 };

 const expenseDistribution=monthlyData?[
  {name:'Despesas Fixas',value:monthlyData.despesas_fixas,fill:COLORS[0]},
  {name:'Despesas Variáveis',value:monthlyData.despesas_variaveis,fill:COLORS[1]},
  {name:'Outras Despesas',value:monthlyData.outras_despesas,fill:COLORS[2]},
  {name:'Custo de Consumo',value:monthlyData.custo_consumo,fill:COLORS[3]},
  {name:'Custo de Perda',value:monthlyData.custo_perda,fill:COLORS[4]}
 ].filter(x=>x.value>0):[];

 const handleExport=()=>{
  if(!monthlyData){
   toast({title:'Sem dados',description:'Carregue o relatório antes de exportar.'});
   return;
  }

  const rows=[
   ['Indicador','Valor'],
   ['Mês',monthLabel(selectedMonth)],
   ['Receita Total',monthlyData.receita_total.toFixed(2)],
   ['Despesas Fixas',monthlyData.despesas_fixas.toFixed(2)],
   ['Despesas Variáveis',monthlyData.despesas_variaveis.toFixed(2)],
   ['Outras Despesas',monthlyData.outras_despesas.toFixed(2)],
   ['Compras de Estoque (informativo, fora do lucro)',monthlyData.compras_estoque.toFixed(2)],
   ['Custo de Consumo',monthlyData.custo_consumo.toFixed(2)],
   ['Custo de Perda',monthlyData.custo_perda.toFixed(2)],
   ['Total de Despesas Consideradas no Lucro',monthlyData.total_despesas.toFixed(2)],
   ['Lucro Líquido',monthlyData.lucro_liquido.toFixed(2)],
   ['Margem de Lucro',formatPercent(monthlyData.margem_lucro)]
  ];

  const csv=rows.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`Relatorio_Lucro_${selectedMonth}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <div className="mt-1 flex items-center gap-2">
      <TrendingUp className="h-6 w-6" style={{color:CYAN}}/>
      <h1 className="text-2xl font-bold">Relatório Mensal de Lucro</h1>
     </div>
     <p className="mt-1 text-sm text-muted-foreground">Receitas, despesas e lucratividade.</p>
    </div>
    <Button variant="outline" onClick={handleExport} disabled={!monthlyData||loading}>
     <Download className="mr-2 h-4 w-4"/>Exportar CSV
    </Button>
   </div>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2 text-base">
      <Calendar className="h-5 w-5" style={{color:CYAN}}/>Filtros
     </CardTitle>
     <CardDescription>
      Selecione o mês e, opcionalmente, filtre por tipo de despesa ou insumo.
     </CardDescription>
    </CardHeader>
    <CardContent>
     <div className="grid gap-3 md:grid-cols-4">
      <div>
       <Label>Mês/Ano</Label>
       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         {generateMonthOptions().map(option=>
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
         )}
        </SelectContent>
       </Select>
      </div>

      <div>
       <Label>Filtrar despesa ou insumo</Label>
       <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        <Input
         placeholder="Ex.: papel ofício"
         value={expenseSearch}
         onChange={e=>setExpenseSearch(e.target.value)}
         className="pl-9"
        />
       </div>
      </div>

      <div className="flex items-end">
       <Button onClick={fetchMonthlyReport} className="w-full text-white" style={{background:CYAN}} disabled={loading}>
        {loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar
       </Button>
      </div>

      <div className="flex items-end">
       <Button variant="outline" onClick={()=>setExpenseSearch('')} className="w-full">
        <RotateCcw className="mr-2 h-4 w-4"/>Limpar
       </Button>
      </div>
     </div>
    </CardContent>
   </Card>

   {monthlyData&&<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
     <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita Total</p>
      <p className="mt-1 text-2xl font-bold text-green-400">{formatCurrency(monthlyData.receita_total)}</p>
     </CardContent></Card>

     <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Despesas no Cálculo do Lucro</p>
      <p className="mt-1 text-2xl font-bold text-red-400">{formatCurrency(monthlyData.total_despesas)}</p>
     </CardContent></Card>

     <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Lucro Líquido</p>
      <p className={`mt-1 text-2xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>
       {formatCurrency(monthlyData.lucro_liquido)}
      </p>
     </CardContent></Card>
    </div>

    <Card>
     <CardHeader>
      <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
      <CardDescription>
       {monthLabel(selectedMonth)}. Compras de estoque são informativas e não são descontadas novamente do lucro.
       {expenseSearch&&<span className="ml-1 font-semibold" style={{color:CYAN}}>Filtro: {expenseSearch}</span>}
      </CardDescription>
     </CardHeader>
     <CardContent className="p-0">
      <div className="overflow-x-auto">
       <Table>
        <TableHeader className="bg-secondary/70">
         <TableRow><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
        </TableHeader>
        <TableBody>
         <TableRow><TableCell className="font-semibold text-green-400">Receita Total</TableCell><TableCell className="text-right font-bold text-green-400">{formatCurrency(monthlyData.receita_total)}</TableCell></TableRow>
         <TableRow><TableCell className="pl-8">Despesas Fixas</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.despesas_fixas)}</TableCell></TableRow>
         <TableRow><TableCell className="pl-8">Despesas Variáveis</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.despesas_variaveis)}</TableCell></TableRow>
         <TableRow><TableCell className="pl-8">Outras Despesas</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.outras_despesas)}</TableCell></TableRow>
         <TableRow className="bg-amber-500/5"><TableCell className="pl-8 text-amber-400">Compras de Estoque (informativo)</TableCell><TableCell className="text-right text-amber-400">{formatCurrency(monthlyData.compras_estoque)}</TableCell></TableRow>
         <TableRow><TableCell className="pl-8">Custo de Consumo</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.custo_consumo)}</TableCell></TableRow>
         <TableRow><TableCell className="pl-8">Custo de Perda</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.custo_perda)}</TableCell></TableRow>
         <TableRow className="bg-secondary/40 font-bold"><TableCell>Total de Despesas Consideradas no Lucro</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.total_despesas)}</TableCell></TableRow>
         <TableRow><TableCell className={`font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>LUCRO LÍQUIDO</TableCell><TableCell className={`text-right text-xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>{formatCurrency(monthlyData.lucro_liquido)}</TableCell></TableRow>
         <TableRow><TableCell className="font-semibold">Margem de Lucro</TableCell><TableCell className={`text-right font-bold ${monthlyData.margem_lucro>=0?'text-cyan-400':'text-red-400'}`}>{formatPercent(monthlyData.margem_lucro)}</TableCell></TableRow>
        </TableBody>
       </Table>
      </div>
     </CardContent>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
     <Card>
      <CardHeader>
       <CardTitle className="text-base">Evolução do Lucro</CardTitle>
       <CardDescription>Seis meses até {monthLabel(selectedMonth)}</CardDescription>
      </CardHeader>
      <CardContent>
       {!profitEvolution.length?
        <div className="flex h-64 items-center justify-center text-muted-foreground">Nenhum dado disponível.</div>
       :
        <ResponsiveContainer width="100%" height={300}>
         <LineChart data={profitEvolution}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="mes"/>
          <YAxis/>
          <Tooltip formatter={value=>formatCurrency(value)}/>
          <Legend/>
          <Line type="monotone" dataKey="lucro" stroke={CYAN} strokeWidth={2} name="Lucro Líquido"/>
         </LineChart>
        </ResponsiveContainer>
       }
      </CardContent>
     </Card>

     <Card>
      <CardHeader>
       <CardTitle className="text-base">Distribuição de Despesas</CardTitle>
       <CardDescription>Despesas consideradas no cálculo do lucro; compras de estoque ficam fora.</CardDescription>
      </CardHeader>
      <CardContent>
       {!expenseDistribution.length?
        <div className="flex h-64 items-center justify-center text-muted-foreground">Nenhuma despesa registrada no período.</div>
       :
        <ResponsiveContainer width="100%" height={300}>
         <PieChart>
          <Pie data={expenseDistribution} cx="50%" cy="50%" labelLine={false} label={({name,percent})=>`${name}: ${(percent*100).toFixed(1)}%`} outerRadius={100} dataKey="value">
           {expenseDistribution.map((entry,index)=><Cell key={`cell-${index}`} fill={entry.fill||COLORS[index%COLORS.length]}/>)}
          </Pie>
          <Tooltip formatter={value=>formatCurrency(value)}/>
          <Legend/>
         </PieChart>
        </ResponsiveContainer>
       }
      </CardContent>
     </Card>
    </div>
   </>}

   {loading&&<div className="flex items-center justify-center py-10"><Loader2 className="h-10 w-10 animate-spin" style={{color:CYAN}}/></div>}
  </motion.div>
 );
};

export default RelatorioLucroMensal;

