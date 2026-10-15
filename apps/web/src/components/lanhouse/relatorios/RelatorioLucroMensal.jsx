import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{TrendingUp,Calendar,Download,Loader2,Search,RotateCcw,AlertTriangle}from'lucide-react';
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

const CYAN='#06b6d4',RED='#ef4444',AMBER='#f59e0b';
const COLORS=['#06b6d4','#ef4444','#f59e0b','#10b981','#8b5cf6','#f97316'];
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const monthKey=v=>String(v||'').slice(0,7);
const currentMonthKey=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const shiftMonth=(key,offset)=>{const[y,m]=key.split('-').map(Number),d=new Date(y,m-1+offset,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const monthStart=key=>`${key}-01`;
const monthEnd=key=>{const[y,m]=key.split('-').map(Number),last=new Date(y,m,0).getDate();return`${key}-${String(last).padStart(2,'0')}`};
const monthLabel=key=>{const[y,m]=key.split('-').map(Number),s=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));return s.charAt(0).toUpperCase()+s.slice(1)};
const shortMonthLabel=key=>{const[y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1))};
const sum=(rows,key)=>rows.reduce((s,x)=>s+Number(x[key]||0),0);
const isStockPurchase=x=>normalize(x.tipo_lancamento)==='estoque';
const origemNaoIdentificada=x=>!x.custo_origem&&x.custo_estimado==null;

const calcularCustosServicos=(servicos,termo='')=>{
 let total=0,itensPendentes=0,itensEstimados=0,itensSemOrigem=0;
 const filtro=normalize(termo);
 (servicos||[]).forEach(s=>{
  if(!Array.isArray(s.folhas_gastas))return;
  s.folhas_gastas.forEach(f=>{
   if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
   if(filtro&&!normalize(f.tipo_folha).includes(filtro))return;
   const confirmado=f.custo_automatico===true&&!f.custo_pendente&&f.custo_total!==undefined&&f.custo_total!==null&&Number.isFinite(Number(f.custo_total))&&Number(f.custo_total)>=0;
   if(!confirmado){itensPendentes++;return}
   total+=Number(f.custo_total);
   if(!f.custo_origem||f.custo_origem==='historico')itensSemOrigem++;
   else if(f.custo_estimado===true||f.custo_origem==='cadastro')itensEstimados++;
  });
 });
 return{total:Math.round(total*100)/100,itensPendentes,itensEstimados,itensSemOrigem};
};

const calculateMonth=(key,services,expenses,costs,term='')=>{
 const servicosMes=services.filter(x=>monthKey(x.data)===key);
 const despesasMes=expenses.filter(x=>monthKey(x.data)===key);
 const custosMes=costs.filter(x=>monthKey(x.data_lancamento)===key);
 const compras=despesasMes.filter(isStockPurchase);
 const operacionais=despesasMes.filter(x=>!isStockPurchase(x));
 const fixas=operacionais.filter(x=>normalize(x.tipo_custo)==='fixo');
 const variaveis=operacionais.filter(x=>normalize(x.tipo_custo)==='variavel');
 const outras=operacionais.filter(x=>!['fixo','variavel'].includes(normalize(x.tipo_custo)));
 const custosManuaisValidos=custosMes.filter(x=>x.custo_pendente!==true);
 const consumo=custosManuaisValidos.filter(x=>normalize(x.tipo)==='consumo');
 const perdas=custosManuaisValidos.filter(x=>normalize(x.tipo)==='perda');
 const custosServicos=calcularCustosServicos(servicosMes,term);
 const receita=sum(servicosMes,'valor');
 const totalFixas=sum(fixas,'valor');
 const totalVariaveis=sum(variaveis,'valor');
 const totalOutras=sum(outras,'valor');
 const totalCompras=sum(compras,'valor');
 const totalConsumo=sum(consumo,'custo_total');
 const totalPerdas=sum(perdas,'custo_total');
 const pendentesManuais=custosMes.filter(x=>x.custo_pendente===true).length;
 const estimadosManuais=custosManuaisValidos.filter(x=>x.custo_estimado===true||x.custo_origem==='cadastro').length;
 const semOrigemManuais=custosManuaisValidos.filter(origemNaoIdentificada).length;
 const despesas=totalFixas+totalVariaveis+totalOutras+totalConsumo+totalPerdas+custosServicos.total;
 const lucro=receita-despesas;
 return{
  receita_total:receita,despesas_fixas:totalFixas,
  despesas_variaveis:totalVariaveis,outras_despesas:totalOutras,
  compras_estoque:totalCompras,custo_consumo:totalConsumo,
  custo_perda:totalPerdas,custo_folhas_servicos:custosServicos.total,
  itens_folhas_pendentes:custosServicos.itensPendentes,
  itens_custos_pendentes:pendentesManuais+custosServicos.itensPendentes,
  itens_custos_estimados:estimadosManuais+custosServicos.itensEstimados,
  itens_custos_sem_origem:semOrigemManuais+custosServicos.itensSemOrigem,
  total_despesas:despesas,lucro_liquido:lucro,
  margem_lucro:receita>0?lucro/receita*100:0
 };
};

export default function RelatorioLucroMensal(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true);
 const[selectedMonth,setSelectedMonth]=useState(currentMonthKey);
 const[expenseSearch,setExpenseSearch]=useState('');
 const[monthlyData,setMonthlyData]=useState(null);
 const[profitEvolution,setProfitEvolution]=useState([]);

 const fetchMonthlyReport=useCallback(async()=>{
  if(!user){setMonthlyData(null);setProfitEvolution([]);setLoading(false);return}
  if(!/^\d{4}-\d{2}$/.test(selectedMonth))return;
  setLoading(true);
  try{
   const start=monthStart(shiftMonth(selectedMonth,-5)),end=monthEnd(selectedMonth),term=expenseSearch.trim();
   const[servicesRes,expensesRes,costsRes]=await Promise.all([
    supabase.from('lm_lanc_servicos').select('data,valor,folhas_gastas').eq('user_id',user.id).gte('data',start).lte('data',end),
    (()=>{
     let q=supabase.from('lm_lanc_despesas').select(`data,valor,tipo_custo,tipo_lancamento,lm_despesas${term?'!inner':''}(despesa)`).eq('user_id',user.id).gte('data',start).lte('data',end);
     if(term)q=q.ilike('lm_despesas.despesa',`%${term}%`);
     return q;
    })(),
    (()=>{
     let q=supabase.from('lm_lanc_custos').select('data_lancamento,custo_total,tipo,tipo_folha,custo_estimado,custo_pendente,custo_origem').eq('user_id',user.id).gte('data_lancamento',start).lte('data_lancamento',end);
     if(term)q=q.ilike('tipo_folha',`%${term}%`);
     return q;
    })()
   ]);
   const erro=[servicesRes,expensesRes,costsRes].find(x=>x.error)?.error;
   if(erro)throw erro;
   const services=servicesRes.data||[],expenses=expensesRes.data||[],costs=costsRes.data||[];
   const report=calculateMonth(selectedMonth,services,expenses,costs,term);
   setMonthlyData({...report,mes_ano:selectedMonth});
   const keys=Array.from({length:6},(_,i)=>shiftMonth(selectedMonth,i-5));
   setProfitEvolution(keys.map(key=>({mes:shortMonthLabel(key),lucro:calculateMonth(key,services,expenses,costs,term).lucro_liquido})));
  }catch(e){
   console.error('Erro no relatório mensal:',e);
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível calcular o lucro mensal.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,selectedMonth,expenseSearch,toast]);

 useEffect(()=>{fetchMonthlyReport()},[fetchMonthlyReport]);

 const formatCurrency=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
 const formatPercent=v=>`${(Number(v)||0).toFixed(2)}%`;
 const generateMonthOptions=()=>Array.from({length:12},(_,i)=>{const value=shiftMonth(currentMonthKey(),-i);return{value,label:monthLabel(value)}});

 const expenseDistribution=monthlyData?[
  {name:'Despesas Fixas',value:monthlyData.despesas_fixas,fill:COLORS[0]},
  {name:'Despesas Variáveis',value:monthlyData.despesas_variaveis,fill:COLORS[1]},
  {name:'Outras Despesas',value:monthlyData.outras_despesas,fill:COLORS[2]},
  {name:'Uso fora de serviço',value:monthlyData.custo_consumo,fill:COLORS[3]},
  {name:'Perdas de material',value:monthlyData.custo_perda,fill:COLORS[4]},
  {name:'Folhas usadas em serviços',value:monthlyData.custo_folhas_servicos,fill:COLORS[5]}
 ].filter(x=>x.value>0):[];

 const handleExport=()=>{
  if(!monthlyData){toast({title:'Sem dados',description:'Carregue o relatório antes de exportar.'});return}
  const rows=[
   ['Indicador','Valor'],['Mês',monthLabel(selectedMonth)],
   ['Receita Total',monthlyData.receita_total.toFixed(2)],
   ['Despesas Fixas',monthlyData.despesas_fixas.toFixed(2)],
   ['Despesas Variáveis',monthlyData.despesas_variaveis.toFixed(2)],
   ['Outras Despesas',monthlyData.outras_despesas.toFixed(2)],
   ['Compras de Estoque (informativo, fora do lucro)',monthlyData.compras_estoque.toFixed(2)],
   ['Uso fora de serviço',monthlyData.custo_consumo.toFixed(2)],
   ['Perdas de Material',monthlyData.custo_perda.toFixed(2)],
   ['Custo automático de folhas em serviços',monthlyData.custo_folhas_servicos.toFixed(2)],
   ['Itens com custo estimado',monthlyData.itens_custos_estimados],
   ['Itens com origem não identificada',monthlyData.itens_custos_sem_origem],
   ['Itens com custo pendente',monthlyData.itens_custos_pendentes],
   ['Total de Despesas Consideradas no Lucro',monthlyData.total_despesas.toFixed(2)],
   ['Lucro Líquido',monthlyData.lucro_liquido.toFixed(2)],
   ['Margem de Lucro',formatPercent(monthlyData.margem_lucro)]
  ];
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`Relatorio_Lucro_${selectedMonth}.csv`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div>
    <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><div className="mt-1 flex items-center gap-2"><TrendingUp className="h-6 w-6" style={{color:CYAN}}/><h1 className="text-2xl font-bold">Relatório Mensal de Lucro</h1></div><p className="mt-1 text-sm text-muted-foreground">Receitas, despesas e custos das folhas usadas nos serviços.</p>
   </div><Button variant="outline" onClick={handleExport} disabled={!monthlyData||loading}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button></div>

   <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-5 w-5" style={{color:CYAN}}/>Filtros</CardTitle><CardDescription>Selecione o mês e, opcionalmente, filtre despesas e materiais pelo nome.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-4">
    <div><Label>Mês/Ano</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{generateMonthOptions().map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
    <div><Label>Filtrar despesa ou insumo</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Ex.: papel ofício" value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)} className="pl-9"/></div></div>
    <div className="flex items-end"><Button onClick={fetchMonthlyReport} className="w-full text-white" style={{background:CYAN}} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div>
    <div className="flex items-end"><Button variant="outline" onClick={()=>setExpenseSearch('')} className="w-full"><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div>
   </div></CardContent></Card>

   {monthlyData&&monthlyData.itens_custos_pendentes>0&&<Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="flex gap-3 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"/><div className="space-y-1 text-sm"><p className="font-semibold text-amber-400">Há custos pendentes</p><p className="text-muted-foreground">{monthlyData.itens_custos_pendentes} item(ns) não possuem custo confirmado. Esses valores não entram no custo calculado e o lucro pode estar acima do real até que sejam conferidos.</p></div></CardContent></Card>}

   {monthlyData&&<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
     <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Receita Total</p><p className="mt-1 text-2xl font-bold text-green-400">{formatCurrency(monthlyData.receita_total)}</p></CardContent></Card>
     <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Despesas no Cálculo do Lucro</p><p className="mt-1 text-2xl font-bold text-red-400">{formatCurrency(monthlyData.total_despesas)}</p></CardContent></Card>
     <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Lucro Líquido</p><p className={`mt-1 text-2xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>{formatCurrency(monthlyData.lucro_liquido)}</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="text-base">Detalhamento Mensal</CardTitle><CardDescription>{monthLabel(selectedMonth)}. Compras de estoque são informativas e ficam fora do lucro; o custo das folhas é contabilizado quando está salvo no serviço.{expenseSearch&&<span className="ml-1 font-semibold" style={{color:CYAN}}>Filtro: {expenseSearch}</span>}</CardDescription></CardHeader>
     <CardContent className="p-0"><div className="overflow-x-auto"><Table>
      <TableHeader className="bg-secondary/70"><TableRow><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>
       <TableRow><TableCell className="font-semibold text-green-400">Receita Total</TableCell><TableCell className="text-right font-bold text-green-400">{formatCurrency(monthlyData.receita_total)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Despesas Fixas</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.despesas_fixas)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Despesas Variáveis</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.despesas_variaveis)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Outras Despesas</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.outras_despesas)}</TableCell></TableRow>
       <TableRow className="bg-amber-500/5"><TableCell className="pl-8 text-amber-400">Compras de Estoque (informativo)</TableCell><TableCell className="text-right text-amber-400">{formatCurrency(monthlyData.compras_estoque)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Uso fora de serviço (registros manuais)</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.custo_consumo)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Perdas de material</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.custo_perda)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Folhas usadas em serviços (automático)</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.custo_folhas_servicos)}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Itens com custo estimado</TableCell><TableCell className="text-right text-amber-400">{monthlyData.itens_custos_estimados}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Itens com origem não identificada</TableCell><TableCell className="text-right text-amber-400">{monthlyData.itens_custos_sem_origem}</TableCell></TableRow>
       <TableRow><TableCell className="pl-8">Itens com custo pendente</TableCell><TableCell className="text-right text-amber-400">{monthlyData.itens_custos_pendentes}</TableCell></TableRow>
       <TableRow className="bg-secondary/40 font-bold"><TableCell>Total de Despesas Consideradas no Lucro</TableCell><TableCell className="text-right text-red-400">{formatCurrency(monthlyData.total_despesas)}</TableCell></TableRow>
       <TableRow><TableCell className={`font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>LUCRO LÍQUIDO</TableCell><TableCell className={`text-right text-xl font-bold ${monthlyData.lucro_liquido>=0?'text-cyan-400':'text-red-400'}`}>{formatCurrency(monthlyData.lucro_liquido)}</TableCell></TableRow>
       <TableRow><TableCell className="font-semibold">Margem de Lucro</TableCell><TableCell className={`text-right font-bold ${monthlyData.margem_lucro>=0?'text-cyan-400':'text-red-400'}`}>{formatPercent(monthlyData.margem_lucro)}</TableCell></TableRow>
      </TableBody>
     </Table></div></CardContent>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
     <Card><CardHeader><CardTitle className="text-base">Evolução do Lucro</CardTitle><CardDescription>Seis meses até {monthLabel(selectedMonth)}</CardDescription></CardHeader><CardContent>
      {!profitEvolution.length?<div className="flex h-64 items-center justify-center text-muted-foreground">Nenhum dado disponível.</div>:<ResponsiveContainer width="100%" height={300}><LineChart data={profitEvolution}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes"/><YAxis/><Tooltip formatter={v=>formatCurrency(v)}/><Legend/><Line type="monotone" dataKey="lucro" stroke={CYAN} strokeWidth={2} name="Lucro Líquido"/></LineChart></ResponsiveContainer>}
     </CardContent></Card>
     <Card><CardHeader><CardTitle className="text-base">Distribuição de Despesas</CardTitle><CardDescription>Compras de estoque ficam fora do cálculo do lucro.</CardDescription></CardHeader><CardContent>
      {!expenseDistribution.length?<div className="flex h-64 items-center justify-center text-muted-foreground">Nenhuma despesa registrada no período.</div>:<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={expenseDistribution} cx="50%" cy="50%" labelLine={false} label={({name,percent})=>`${name}: ${(percent*100).toFixed(1)}%`} outerRadius={100} dataKey="value">{expenseDistribution.map((x,i)=><Cell key={`cell-${i}`} fill={x.fill||COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>formatCurrency(v)}/><Legend/></PieChart></ResponsiveContainer>}
     </CardContent></Card>
    </div>
   </>}

   {loading&&<div className="flex items-center justify-center py-10"><Loader2 className="h-10 w-10 animate-spin" style={{color:CYAN}}/></div>}
  </motion.div>
 );
}
