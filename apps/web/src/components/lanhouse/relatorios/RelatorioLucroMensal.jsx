import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{TrendingUp,Download,Loader2,Search,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Label}from'@/components/ui/label';
import{Input}from'@/components/ui/input';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer}from'recharts';

const COLORS=['#06b6d4','#ef4444','#f59e0b','#10b981','#8b5cf6'];
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const months=()=>{const a=[],n=new Date();for(let i=0;i<12;i++){const d=new Date(n.getFullYear(),n.getMonth()-i,1),v=d.toISOString().slice(0,7),l=d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});a.push({value:v,label:l.charAt(0).toUpperCase()+l.slice(1)})}return a};

export default function RelatorioLucroMensal(){
 const{toast}=useToast(),{user}=useAuth();
 const[selectedMonth,setSelectedMonth]=useState(new Date().toISOString().slice(0,7)),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[report,setReport]=useState(null),[evolution,setEvolution]=useState([]),[distribution,setDistribution]=useState([]);

 const load=useCallback(async()=>{
  if(!user||!selectedMonth)return;setLoading(true);
  try{
   const[y,m]=selectedMonth.split('-'),start=`${y}-${m}-01`,end=`${y}-${m}-${new Date(Number(y),Number(m),0).getDate()}`;
   let d=supabase.from('lm_lanc_despesas').select(`valor,tipo_custo,tipo_lancamento,${search?'lm_despesas!inner(despesa)':'lm_despesas(despesa)'}`).eq('user_id',user.id).gte('data',start).lte('data',end);
   if(search)d=d.ilike('lm_despesas.despesa',`%${search}%`);
   const[a,b,c]=await Promise.all([
    supabase.from('lm_lanc_servicos').select('valor').eq('user_id',user.id).gte('data',start).lte('data',end),
    d,
    (async()=>{let q=supabase.from('lm_lanc_custos').select('custo_total,tipo,tipo_folha').eq('user_id',user.id).gte('data_lancamento',start).lte('data_lancamento',end);if(search)q=q.ilike('tipo_folha',`%${search}%`);return q})()
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;

   const receita=(a.data||[]).reduce((s,x)=>s+Number(x.valor||0),0);
   const fixas=(b.data||[]).filter(x=>x.tipo_custo==='Fixo').reduce((s,x)=>s+Number(x.valor||0),0);
   const variaveis=(b.data||[]).filter(x=>x.tipo_custo==='Variável').reduce((s,x)=>s+Number(x.valor||0),0);
   const estoque=(b.data||[]).filter(x=>x.tipo_lancamento==='Estoque').reduce((s,x)=>s+Number(x.valor||0),0);
   const consumo=(c.data||[]).filter(x=>x.tipo==='Consumo').reduce((s,x)=>s+Number(x.custo_total||0),0);
   const perda=(c.data||[]).filter(x=>x.tipo==='Perda').reduce((s,x)=>s+Number(x.custo_total||0),0);
   const despesas=fixas+variaveis+estoque+consumo+perda,lucro=receita-despesas,margem=receita?lucro/receita*100:0;
   setReport({receita,fixas,variaveis,estoque,consumo,perda,despesas,lucro,margem});
   setDistribution([{name:'Despesas Fixas',value:fixas},{name:'Despesas Variáveis',value:variaveis},{name:'Estoque',value:estoque},{name:'Consumo',value:consumo},{name:'Perda',value:perda}].filter(x=>x.value>0));

   const evo=[];
   for(let i=5;i>=0;i--){
    const dt=new Date(Number(y),Number(m)-1-i,1),yy=dt.getFullYear(),mm=String(dt.getMonth()+1).padStart(2,'0'),st=`${yy}-${mm}-01`,en=`${yy}-${mm}-${new Date(yy,dt.getMonth()+1,0).getDate()}`;
    const[s1,s2,s3]=await Promise.all([
     supabase.from('lm_lanc_servicos').select('valor').eq('user_id',user.id).gte('data',st).lte('data',en),
     supabase.from('lm_lanc_despesas').select('valor').eq('user_id',user.id).gte('data',st).lte('data',en),
     supabase.from('lm_lanc_custos').select('custo_total').eq('user_id',user.id).gte('data_lancamento',st).lte('data_lancamento',en)
    ]);
    const r=(s1.data||[]).reduce((s,x)=>s+Number(x.valor||0),0),de=(s2.data||[]).reduce((s,x)=>s+Number(x.valor||0),0),cu=(s3.data||[]).reduce((s,x)=>s+Number(x.custo_total||0),0);
    evo.push({mes:dt.toLocaleDateString('pt-BR',{month:'short'}),lucro:r-de-cu});
   }
   setEvolution(evo);
  }catch(e){toast({title:'Erro de Consulta',description:e.message||'Falha ao carregar relatório.',variant:'destructive'})}finally{setLoading(false)}
 },[user,selectedMonth,search,toast]);

 useEffect(()=>load(),[load]);

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Relatório Mensal de Lucro</h1><p className="text-sm text-muted-foreground">Receitas, despesas e lucratividade.</p></div><Button variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar</Button></div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-4"><div><Label>Mês/Ano</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{months().map(x=><SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Filtrar Despesa</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex: Papel..." className="pl-9"/></div></div><div className="flex items-end"><Button onClick={load} disabled={loading} className="w-full bg-cyan-500 text-white hover:bg-cyan-600">{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div><div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>setSearch('')}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></div></CardContent></Card>

   {report&&<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[{l:'Receita Total',v:BRL.format(report.receita),c:'text-green-400'},{l:'Total Despesas',v:BRL.format(report.despesas),c:'text-red-400'},{l:'Lucro Líquido',v:BRL.format(report.lucro),c:report.lucro>=0?'text-cyan-400':'text-red-400'}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className={`mt-1 text-2xl font-bold ${x.c}`}>{x.v}</p></CardContent></Card>)}</div>

    <Card className="border-border bg-card"><CardContent className="p-0"><Table><TableHeader className="bg-secondary/70"><TableRow><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{[['Receita Total',report.receita,'text-green-400'],['Despesas Fixas',report.fixas,'text-red-400'],['Despesas Variáveis',report.variaveis,'text-red-400'],['Custo Estoque',report.estoque,'text-red-400'],['Custo Consumo',report.consumo,'text-red-400'],['Custo Perda',report.perda,'text-red-400'],['Total Despesas',report.despesas,'text-red-400'],['LUCRO LÍQUIDO',report.lucro,report.lucro>=0?'text-cyan-400':'text-red-400'],['Margem de Lucro',`${report.margem.toFixed(2)}%`,report.margem>=0?'text-cyan-400':'text-red-400']].map(x=><TableRow key={x[0]}><TableCell className="font-semibold">{x[0]}</TableCell><TableCell className={`text-right font-bold ${x[2]}`}>{typeof x[1]==='string'?x[1]:BRL.format(x[1])}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-2">
     <Card className="border-border bg-card"><CardContent className="h-[320px] p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={evolution}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes"/><YAxis/><Tooltip formatter={v=>BRL.format(Number(v)||0)}/><Legend/><Line type="monotone" dataKey="lucro" name="Lucro" stroke="#06b6d4" strokeWidth={3}/></LineChart></ResponsiveContainer></CardContent></Card>
     <Card className="border-border bg-card"><CardContent className="h-[320px] p-4">{distribution.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>{distribution.map((x,i)=><Cell key={x.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>BRL.format(Number(v)||0)}/><Legend/></PieChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center text-muted-foreground">Nenhuma despesa no período.</div>}</CardContent></Card>
    </div>
   </>}

   {loading&&!report&&<div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-cyan-400"/></div>}
  </motion.div>
 )
}
