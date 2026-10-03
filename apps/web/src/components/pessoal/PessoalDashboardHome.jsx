import{useEffect,useMemo,useState}from'react';
import{Wallet,TrendingUp,ArrowUp,ArrowDown,Heart,AlertTriangle,CheckCircle2,PiggyBank}from'lucide-react';
import{BarChart,Bar,LineChart,Line,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from'recharts';
import{getAccessibleDataQuery}from'@/lib/dataAccessUtils';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent}from'@/components/ui/card';
import NeonCard from'@/components/ui/NeonCard';

const BLUE='hsl(var(--neon-pessoal))',RED='hsl(0 84% 60%)',GREEN='hsl(142 70% 45%)';
const meses=['Todos','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const money=v=>fromCents(toCents(v));
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const dataMes=d=>new Date(`${d}T12:00:00`).getMonth()+1;
const mesNome=m=>meses[Number(m)]||'';
const sumCents=(arr,key='valor')=>(arr||[]).reduce((s,x)=>s+toCents(x?.[key]),0);

export default function PessoalDashboardHome(){
 const{user,isAdmin}=useAuth(),hoje=new Date();
 const[selectedYear,setSelectedYear]=useState(hoje.getFullYear());
 const[selectedMonth,setSelectedMonth]=useState(hoje.getMonth()+1);
 const[loading,setLoading]=useState(true),[error,setError]=useState('');
 const[data,setData]=useState({
  receitas:[],despesas:[],aportes:[],rendimentos:[],previstas:[],dizimos:[],
  receitasAll:[],despesasAll:[],aportesAll:[],dizimosAll:[]
 });

 useEffect(()=>{
  const load=async()=>{
   setLoading(true);setError('');
   const ini=`${selectedYear}-01-01`,fim=`${selectedYear+1}-01-01`;

   try{
    const q=await Promise.all([
     getAccessibleDataQuery(user?.id,isAdmin,'receitas').gte('data',ini).lt('data',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'despesas').gte('data',ini).lt('data',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'aportes').gte('data',ini).lt('data',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'rendimentos').gte('data',ini).lt('data',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'despesas_previstas').gte('data_vencimento',ini).lt('data_vencimento',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'pessoal_dizimos_ofertas').gte('data',ini).lt('data',fim),
     getAccessibleDataQuery(user?.id,isAdmin,'receitas','valor'),
     getAccessibleDataQuery(user?.id,isAdmin,'despesas','valor'),
     getAccessibleDataQuery(user?.id,isAdmin,'aportes','valor'),
     getAccessibleDataQuery(user?.id,isAdmin,'pessoal_dizimos_ofertas','valor')
    ]);

    const err=q.find(x=>x.error)?.error;
    if(err)throw err;

    setData({
     receitas:q[0].data||[],despesas:q[1].data||[],aportes:q[2].data||[],
     rendimentos:q[3].data||[],previstas:q[4].data||[],dizimos:q[5].data||[],
     receitasAll:q[6].data||[],despesasAll:q[7].data||[],
     aportesAll:q[8].data||[],dizimosAll:q[9].data||[]
    });
   }catch(e){
    setError(e.message||'Erro ao carregar dados.');
   }finally{
    setLoading(false);
   }
  };

  load();
 },[selectedYear,user?.id,isAdmin]);

 const filtrar=useMemo(
  ()=>arr=>arr.filter(x=>selectedMonth===0||dataMes(x.data||x.data_vencimento)===Number(selectedMonth)),
  [selectedMonth]
 );

 const receitas=filtrar(data.receitas);
 const despesas=filtrar(data.despesas);
 const aportes=filtrar(data.aportes);
 const rendimentos=filtrar(data.rendimentos);
 const dizimos=filtrar(data.dizimos);
 const previstas=filtrar(data.previstas);

 const receitasC=sumCents(receitas);
 const despesasC=sumCents(despesas);
 const aportesC=sumCents(aportes);
 const rendimentosC=sumCents(rendimentos,'rendimento_liquido');
 const dizimosC=sumCents(dizimos);
 const previstasC=sumCents(previstas);

 const totalInvestido=fromCents(aportesC+rendimentosC);
 const saldoPeriodo=fromCents(receitasC-despesasC-aportesC-dizimosC);
 const saldoAtual=fromCents(
  sumCents(data.receitasAll)-
  sumCents(data.despesasAll)-
  sumCents(data.aportesAll)-
  sumCents(data.dizimosAll)
 );
 const totalReceitas=fromCents(receitasC);
 const totalDespesas=fromCents(despesasC);
 const totalPrevistas=fromCents(previstasC);
 const compromisso=previstasC?Math.min(despesasC/previstasC*100,100):0;

 const categorias=useMemo(()=>{
  const map={};
  despesas.forEach(x=>{
   const nome=x.categoria||x.tipo||'Outros';
   map[nome]=(map[nome]||0)+toCents(x.valor);
  });
  return Object.entries(map).map(([name,value])=>({name,value:fromCents(value)}));
 },[despesas]);

 const anual=useMemo(()=>Array.from({length:12},(_,i)=>{
  const r=data.receitas.filter(x=>dataMes(x.data)===i+1).reduce((s,x)=>s+toCents(x.valor),0);
  const d=data.despesas.filter(x=>dataMes(x.data)===i+1).reduce((s,x)=>s+toCents(x.valor),0);
  const a=data.aportes.filter(x=>dataMes(x.data)===i+1).reduce((s,x)=>s+toCents(x.valor),0);
  const z=data.dizimos.filter(x=>dataMes(x.data)===i+1).reduce((s,x)=>s+toCents(x.valor),0);
  return{
   name:meses[i+1].slice(0,3),
   receitas:fromCents(r),
   despesas:fromCents(d),
   resultado:fromCents(r-d-a-z)
  };
 }),[data]);

 const chartData=selectedMonth===0
  ?anual
  :[{name:mesNome(selectedMonth).slice(0,3),receitas:totalReceitas,despesas:totalDespesas,resultado:saldoPeriodo}];

 const movimentacoes=useMemo(()=>[
  ...receitas.map(x=>({data:x.data,titulo:x.descricao||x.nome||'Receita',valor:money(x.valor),tipo:'entrada',Icon:ArrowUp})),
  ...despesas.map(x=>({data:x.data,titulo:x.descricao||x.nome||'Despesa',valor:money(x.valor),tipo:'saida',Icon:ArrowDown})),
  ...aportes.map(x=>({data:x.data,titulo:x.descricao||'Aporte',valor:money(x.valor),tipo:'aporte',Icon:PiggyBank})),
  ...rendimentos.map(x=>({data:x.data,titulo:x.banco?`Rendimento · ${x.banco}`:'Rendimento',valor:money(x.rendimento_liquido),tipo:'rendimento',Icon:TrendingUp})),
  ...dizimos.map(x=>({data:x.data,titulo:x.descricao||'Dízimo/Oferta',valor:money(x.valor),tipo:'dizimo',Icon:Heart}))
 ].sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,6),[receitas,despesas,aportes,rendimentos,dizimos]);

 const alertas=useMemo(()=>{
  const a=[];
  if(saldoPeriodo<0)a.push({icon:AlertTriangle,text:'O saldo do período está negativo.'});
  if(totalDespesas>totalReceitas&&totalReceitas>0)a.push({icon:AlertTriangle,text:'As despesas superaram as receitas.'});
  if(totalPrevistas>0&&totalDespesas>totalPrevistas)a.push({icon:AlertTriangle,text:'As despesas ultrapassaram o previsto.'});
  if(!a.length)a.push({icon:CheckCircle2,text:'Nenhum alerta financeiro no período.'});
  return a;
 },[saldoPeriodo,totalDespesas,totalReceitas,totalPrevistas]);

 const formatY=v=>BRL.format(money(v));
 const kpis=[
  ['Receitas',totalReceitas,ArrowUp,BLUE],
  ['Despesas',totalDespesas,ArrowDown,RED],
  ['Saldo do período',saldoPeriodo,TrendingUp,saldoPeriodo>=0?GREEN:RED],
  ['Valor Investido',totalInvestido,PiggyBank,BLUE]
 ];

 if(loading)return <div className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground">Carregando dashboard...</div>;
 if(error)return <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">{error}</div>;

 return(
  <div className="dark-pessoal relative w-full space-y-4 overflow-hidden p-2 md:space-y-5 md:p-3">

   <div className="relative flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-end lg:justify-between">
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.22em]" style={{color:BLUE}}>Pessoal</p>
     <h1 className="text-2xl font-bold md:text-3xl">Visão financeira</h1>
     <p className="text-sm text-muted-foreground">
      {selectedMonth===0?selectedYear:`${mesNome(selectedMonth)} de ${selectedYear}`}
     </p>
    </div>
    <div className="flex flex-wrap gap-2">
     <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm">
      {meses.map((m,i)=><option key={m} value={i}>{m}</option>)}
     </select>
     <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm">
      {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
     </select>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
    <NeonCard className="p-5">
     <div className="flex items-start justify-between gap-4">
      <div>
       <p className="text-sm text-muted-foreground">Saldo atual · histórico</p>
       <h2 className="mt-2 text-3xl font-bold" style={{color:saldoAtual>=0?GREEN:RED}}>{BRL.format(saldoAtual)}</h2>
       <p className="mt-2 text-xs text-muted-foreground">Todos os lançamentos registrados</p>
      </div>
      <div className="rounded-xl bg-[hsl(var(--neon-pessoal)/.10)] p-3"><Wallet className="h-6 w-6" style={{color:BLUE}}/></div>
     </div>
    </NeonCard>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:col-span-2">
     {kpis.map(([label,value,Icon,color])=>(
      <Card key={label} className="border-border bg-card">
       <CardContent className="p-4">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg" style={{background:`${color.replace(')',' / .10)')}`}}>
         <Icon className="h-5 w-5" style={{color}}/>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold" style={{color}}>{BRL.format(money(value))}</p>
        {label==='Valor Investido'&&<p className="mt-1 text-[10px] text-muted-foreground">Aportes + rendimentos líquidos</p>}
       </CardContent>
      </Card>
     ))}
    </div>
   </div>

   <NeonCard className="p-4">
    <div className="mb-3 flex items-center justify-between">
     <div>
      <h3 className="font-semibold">Compromissos financeiros</h3>
      <p className="text-xs text-muted-foreground">{BRL.format(totalDespesas)} de {BRL.format(totalPrevistas)} previstos</p>
     </div>
     <span className="text-sm font-semibold" style={{color:BLUE}}>{compromisso.toFixed(0)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-muted">
     <div className="h-full rounded-full" style={{width:`${compromisso}%`,background:RED}}/>
    </div>
   </NeonCard>

   <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

    <NeonCard className="p-4">
     <h3 className="mb-4 font-semibold">Receitas x despesas</h3>
     <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
       <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={.15}/>
        <XAxis dataKey="name"/>
        <YAxis tickFormatter={formatY}/>
        <Tooltip formatter={v=>BRL.format(money(v))}/>
        <Bar dataKey="receitas" name="Receitas" fill={BLUE} radius={[5,5,0,0]}/>
        <Bar dataKey="despesas" name="Despesas" fill={RED} radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
     </div>
    </NeonCard>

    <NeonCard className="p-4">
     <h3 className="mb-4 font-semibold">Resultado acumulado</h3>
     <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
       <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={.15}/>
        <XAxis dataKey="name"/>
        <YAxis tickFormatter={formatY}/>
        <Tooltip formatter={v=>BRL.format(money(v))}/>
        <Line type="monotone" dataKey="resultado" name="Resultado" stroke={BLUE} strokeWidth={3} dot={{r:4}}/>
       </LineChart>
      </ResponsiveContainer>
     </div>
    </NeonCard>

    <NeonCard className="p-4">
     <h3 className="mb-4 font-semibold">Despesas por categoria</h3>
     <div className="h-72">
      {categorias.length?(
       <ResponsiveContainer width="100%" height="100%">
        <PieChart>
         <Pie data={categorias} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
          {categorias.map((_,i)=><Cell key={i} fill={i%2?'hsl(0 84% 68%)':RED}/>)}
         </Pie>
         <Tooltip formatter={v=>BRL.format(money(v))}/>
        </PieChart>
       </ResponsiveContainer>
      ):(
       <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem despesas no período.</div>
      )}
     </div>
    </NeonCard>

    <NeonCard className="p-4">
     <h3 className="mb-4 font-semibold">Previsto x realizado</h3>
     <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
       <BarChart data={[{
        name:selectedMonth===0?selectedYear:mesNome(selectedMonth),
        previsto:totalPrevistas,
        realizado:totalDespesas
       }]}>
        <CartesianGrid strokeDasharray="3 3" opacity={.15}/>
        <XAxis dataKey="name"/>
        <YAxis tickFormatter={formatY}/>
        <Tooltip formatter={v=>BRL.format(money(v))}/>
        <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--neon-blue))" radius={[5,5,0,0]}/>
        <Bar dataKey="realizado" name="Realizado" fill={RED} radius={[5,5,0,0]}/>
       </BarChart>
      </ResponsiveContainer>
     </div>
    </NeonCard>

   </div>

   <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

    <NeonCard className="p-4 xl:col-span-2">
     <h3 className="mb-4 font-semibold">Movimentações recentes</h3>
     <div className="space-y-2">
      {movimentacoes.length?movimentacoes.map((m,i)=>{
       const Icon=m.Icon;
       const color=m.tipo==='saida'?RED:m.tipo==='dizimo'?GREEN:BLUE;
       const signal=m.tipo==='saida'?'−':'+';

       return(
        <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3">
         <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg p-2" style={{background:`${color.replace(')',' / .10)')}`}}>
           <Icon className="h-4 w-4" style={{color}}/>
          </div>
          <div className="min-w-0">
           <p className="truncate text-sm font-medium">{m.titulo}</p>
           <p className="text-xs text-muted-foreground">{new Date(m.data).toLocaleDateString('pt-BR')}</p>
          </div>
         </div>
         <span className="text-sm font-semibold" style={{color}}>{signal} {BRL.format(money(m.valor))}</span>
        </div>
       );
      }):(
       <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
      )}
     </div>
    </NeonCard>

    <NeonCard className="p-4">
     <h3 className="mb-4 font-semibold">Atenção</h3>
     <div className="space-y-3">
      {alertas.map((item,i)=>{
       const Icon=item.icon;
       return(
        <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3">
         <Icon className="mt-0.5 h-5 w-5" style={{color:Icon===CheckCircle2?GREEN:RED}}/>
         <p className="text-sm text-muted-foreground">{item.text}</p>
        </div>
       );
      })}
     </div>
    </NeonCard>

   </div>
  </div>
 );
}
