import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Wallet,Users,ArrowUp,ArrowDown,ShoppingCart,CreditCard,CalendarClock,AlertTriangle,CheckCircle2,Printer,Activity,TrendingUp}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{getAccessibleDataQuery}from'@/lib/dataAccessUtils';
import KPICard from'@/components/ui/KPICard';
import NeonCard from'@/components/ui/NeonCard';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{BarChart,Bar,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from'recharts';

const months=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=Array.from({length:5},(_,i)=>new Date().getFullYear()-i);
const fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const getMonth=d=>/^\d{4}-\d{2}-\d{2}/.test(String(d))?Number(String(d).slice(5,7))-1:new Date(d).getMonth();

export default function DashboardHome(){
 const{user,isAdmin}=useAuth(),now=new Date();
 const[filters,setFilters]=useState({year:now.getFullYear(),month:now.getMonth()});
 const[loading,setLoading]=useState(true),[error,setError]=useState(null);
 const[data,setData]=useState({saldoGeral:0,entradas:0,despesas:0,saldo:0,clientes:0,pedidos:0,debitos:0,despesasPrevistas:0,topClientes:[],topServicos:[],entradasChart:[],despesasChart:[]});

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);

  try{
   const{year,month}=filters;
   const start=month==='all'?new Date(Date.UTC(year,0,1)):new Date(Date.UTC(year,Number(month),1));
   const end=month==='all'?new Date(Date.UTC(year,11,31,23,59,59,999)):new Date(Date.UTC(year,Number(month)+1,0,23,59,59,999));
   const ys=new Date(Date.UTC(year,0,1)).toISOString(),ye=new Date(Date.UTC(year,11,31,23,59,59,999)).toISOString();

   const[servRes,despRes,cliRes,pedRes,debRes,prevRes,allServRes,allDespRes,allDizimosRes,entAnoRes,despAnoRes]=await Promise.all([
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','data,valor,cliente,cliente_id,lm_servicos(servico)').gte('data',start.toISOString()).lte('data',end.toISOString()),
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','data,valor').gte('data',start.toISOString()).lte('data',end.toISOString()),
    getAccessibleDataQuery(user.id,isAdmin,'lm_clientes','id'),
    getAccessibleDataQuery(user.id,isAdmin,'lm_pedidos','data_pedido,status').gte('data_pedido',start.toISOString().slice(0,10)).lte('data_pedido',end.toISOString().slice(0,10)),
    getAccessibleDataQuery(user.id,isAdmin,'lm_clientes_debito','cliente,status,valor').eq('status','DEVENDO'),
    getAccessibleDataQuery(user.id,isAdmin,'lm_despesas_previstas','data_vencimento,valor,status').gte('data_vencimento',start.toISOString().slice(0,10)).lte('data_vencimento',end.toISOString().slice(0,10)),
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','valor'),
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','valor'),
    getAccessibleDataQuery(user.id,isAdmin,'lm_dizimos_ofertas','valor'),
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','data,valor').gte('data',ys).lte('data',ye),
    getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','data,valor').gte('data',ys).lte('data',ye)
   ]);

   const err=[servRes,despRes,cliRes,pedRes,debRes,prevRes,allServRes,allDespRes,allDizimosRes,entAnoRes,despAnoRes].map(r=>r.error).find(Boolean);
   if(err)throw new Error(err.message||'Erro ao carregar os dados.');

   const serv=servRes.data||[],desp=despRes.data||[],prev=prevRes.data||[];
   const soma=a=>a.reduce((t,i)=>t+Number(i.valor||0),0);
   const entradas=soma(serv),despesas=soma(desp),saldo=entradas-despesas;
   const totalDizimosOfertas=soma(allDizimosRes.data||[]);
   const saldoGeral=soma(allServRes.data||[])-soma(allDespRes.data||[])-totalDizimosOfertas;
   const debitos=new Set((debRes.data||[]).map(i=>i.cliente)).size;

   const cMap={},sMap={};
   serv.forEach(i=>{
    const c=i.cliente||'Outros',s=i.lm_servicos?.servico||'Outros';
    cMap[c]=(cMap[c]||0)+Number(i.valor||0);
    sMap[s]=(sMap[s]||0)+Number(i.valor||0);
   });

   const topClientes=Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
   const topServicos=Object.entries(sMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
   const entradasChart=months.map(name=>({name,Entradas:0}));
   const despesasChart=months.map(name=>({name,Despesas:0}));

   (entAnoRes.data||[]).forEach(i=>{
    const m=getMonth(i.data);
    if(m>=0&&m<12)entradasChart[m].Entradas+=Number(i.valor||0);
   });

   (despAnoRes.data||[]).forEach(i=>{
    const m=getMonth(i.data);
    if(m>=0&&m<12)despesasChart[m].Despesas+=Number(i.valor||0);
   });

   setData({saldoGeral,entradas,despesas,saldo,clientes:cliRes.data?.length||0,pedidos:pedRes.data?.length||0,debitos,despesasPrevistas:soma(prev),topClientes,topServicos,entradasChart,despesasChart});
  }catch(e){
   console.error(e);
   setError(e?.message||'Não foi possível carregar o dashboard.');
  }finally{
   setLoading(false);
  }
 },[user,isAdmin,filters]);

 useEffect(()=>{fetchData()},[fetchData]);

 const percentualDespesas=data.entradas>0?Math.min(data.despesas/data.entradas*100,100):0;

 const alertas=useMemo(()=>{
  const a=[];
  if(data.debitos>0)a.push({icon:CreditCard,title:`${data.debitos} cliente${data.debitos>1?'s':''} com débito`,description:'Existem valores pendentes registrados no período.'});
  if(data.despesasPrevistas>0)a.push({icon:CalendarClock,title:'Despesas previstas',description:`Há ${fmt(data.despesasPrevistas)} em compromissos para o período.`});
  if(data.saldo<0)a.push({icon:AlertTriangle,title:'Saldo do período negativo',description:'As despesas ultrapassaram as entradas.'});
  return a;
 },[data]);

 if(loading)return <div className="flex min-h-[60vh] flex-col items-center justify-center"><Activity className="mb-3 h-10 w-10 animate-pulse text-[hsl(var(--neon-lanhouse))]"/><p className="text-muted-foreground">Carregando LM Impressões...</p></div>;

 if(error)return <div className="mx-auto max-w-7xl p-4"><NeonCard colorScheme="lanhouse" className="p-8 text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive"/><p className="font-semibold text-destructive">Erro ao carregar o painel</p><p className="mt-2 text-sm text-muted-foreground">{error}</p></NeonCard></div>;

 return <div className="relative mx-auto w-full max-w-[1400px] space-y-5 p-2 md:space-y-6 md:p-3">

  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--neon-lanhouse)/.10)] blur-3xl"/>
  <div className="pointer-events-none absolute -left-24 top-[380px] h-56 w-56 rounded-full bg-cyan-400/5 blur-3xl"/>

  <div className="relative flex flex-col gap-5 rounded-2xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-card/55 p-5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--neon-lanhouse)/.30)] bg-[hsl(var(--neon-lanhouse)/.08)] shadow-[0_0_24px_hsl(var(--neon-lanhouse)/.12)]"><Printer className="h-6 w-6 text-[hsl(var(--neon-lanhouse))]"/></div>
    <div>
     <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[hsl(var(--neon-lanhouse))]">Gestão Inteligente</p>
     <h1 className="text-2xl font-black tracking-tight md:text-3xl">LM Impressões</h1>
     <p className="mt-1 text-sm text-muted-foreground">Visão financeira e operacional do negócio</p>
    </div>
   </div>

   <div className="flex w-full flex-wrap gap-2 rounded-xl border border-border bg-background/40 p-2 lg:w-auto">
    <Select value={String(filters.month)} onValueChange={v=>setFilters(p=>({...p,month:v==='all'?'all':Number(v)}))}>
     <SelectTrigger className="w-full border-0 bg-transparent sm:w-[145px]"><SelectValue/></SelectTrigger>
     <SelectContent><SelectItem value="all">Todos os meses</SelectItem>{monthNames.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
    </Select>
    <div className="hidden h-6 w-px bg-border sm:block"/>
    <Select value={String(filters.year)} onValueChange={v=>setFilters(p=>({...p,year:Number(v)}))}>
     <SelectTrigger className="w-full border-0 bg-transparent sm:w-[95px]"><SelectValue/></SelectTrigger>
     <SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
    </Select>
   </div>
  </div>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
   <NeonCard colorScheme="lanhouse" className="relative overflow-hidden p-6">
    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[hsl(var(--neon-lanhouse)/.10)] blur-3xl"/>
    <div className="relative">
     <div className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-muted-foreground"><Wallet className="h-4 w-4 text-[hsl(var(--neon-lanhouse))]"/>Saldo Geral</div>
     <div className={`mt-3 text-3xl font-black md:text-4xl ${data.saldoGeral>=0?'text-[hsl(var(--neon-lanhouse))]':'text-destructive'}`}>{fmt(data.saldoGeral)}</div>
     <p className="mt-2 text-xs text-muted-foreground">Acumulado histórico</p>
     <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full w-full rounded-full bg-[hsl(var(--neon-lanhouse))]"/></div>
    </div>
   </NeonCard>

   <KPICard colorScheme="lanhouse" icon={ArrowUp} label="Entradas • Período" value={data.entradas} isCurrency iconColor="lanhouse" className="w-full"/>
   <KPICard colorScheme="lanhouse" icon={ArrowDown} label="Despesas • Período" value={data.despesas} isCurrency iconColor="orange" className="w-full"/>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <KPICard colorScheme="lanhouse" icon={TrendingUp} label="Saldo • Período" value={data.saldo} isCurrency iconColor={data.saldo>=0?'lanhouse':'orange'} className="w-full"/>
   <KPICard colorScheme="lanhouse" icon={Users} label="Clientes" value={data.clientes} iconColor="lanhouse" className="w-full"/>
   <KPICard colorScheme="lanhouse" icon={ShoppingCart} label="Pedidos • Período" value={data.pedidos} iconColor="lanhouse" className="w-full"/>
   <KPICard colorScheme="lanhouse" icon={CreditCard} label="Clientes com Débito" value={data.debitos} iconColor="orange" className="w-full"/>
  </div>

  <NeonCard colorScheme="lanhouse" className="p-5">
   <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Resumo Financeiro</p><h3 className="mt-1 text-lg font-semibold">Composição do período</h3></div>
    <div className="text-left md:text-right"><p className="text-xs text-muted-foreground">Despesas consomem</p><p className={`text-2xl font-black ${percentualDespesas>=80?'text-destructive':'text-[hsl(var(--neon-lanhouse))]'}`}>{percentualDespesas.toFixed(1)}%</p><p className="text-xs text-muted-foreground">das entradas</p></div>
   </div>
   <div className="mt-5 h-3 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--neon-lanhouse))] to-cyan-300 transition-[width] duration-500" style={{width:`${percentualDespesas}%`}}/></div>
   <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground"><span>Entradas <strong className="text-foreground">{fmt(data.entradas)}</strong></span><span>Despesas <strong className="text-foreground">{fmt(data.despesas)}</strong></span></div>
  </NeonCard>

  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
   <NeonCard colorScheme="lanhouse" className="p-5">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Desempenho</p><h3 className="text-lg font-semibold">Top 5 Clientes</h3></div><Users className="h-5 w-5 text-[hsl(var(--neon-lanhouse))]"/></div>
    {data.topClientes.length?data.topClientes.map(([n,v],i)=>{const max=data.topClientes[0][1]||1;return <div key={i} className="mb-4 last:mb-0"><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate pr-3 font-medium">{String(i+1).padStart(2,'0')} • {n}</span><span className="shrink-0 font-semibold text-[hsl(var(--neon-lanhouse))]">{fmt(v)}</span></div><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-[hsl(var(--neon-lanhouse))]" style={{width:`${Math.max(v/max*100,8)}%`}}/></div></div>}):<p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado no período.</p>}
   </NeonCard>

   <NeonCard colorScheme="lanhouse" className="p-5">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Faturamento</p><h3 className="text-lg font-semibold">Top 5 Serviços</h3></div><Printer className="h-5 w-5 text-[hsl(var(--neon-lanhouse))]"/></div>
    {data.topServicos.length?data.topServicos.map(([n,v],i)=>{const max=data.topServicos[0][1]||1;return <div key={i} className="mb-4 last:mb-0"><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate pr-3 font-medium">{String(i+1).padStart(2,'0')} • {n}</span><span className="shrink-0 font-semibold text-cyan-300">{fmt(v)}</span></div><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-cyan-300" style={{width:`${Math.max(v/max*100,8)}%`}}/></div></div>}):<p className="py-8 text-center text-sm text-muted-foreground">Nenhum serviço no período.</p>}
   </NeonCard>
  </div>

  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
   <NeonCard colorScheme="lanhouse" className="h-[340px] p-5">
    <div className="mb-3 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Movimentação</p><h3 className="text-lg font-semibold">Entradas Mês a Mês</h3></div><ArrowUp className="h-5 w-5 text-[hsl(var(--neon-lanhouse))]"/></div>
    <ResponsiveContainer width="100%" height="82%"><LineChart data={data.entradasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={v=>fmt(v)} contentStyle={{backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--neon-lanhouse)/.3)',borderRadius:12}}/><Line type="monotone" dataKey="Entradas" stroke="hsl(var(--neon-lanhouse))" strokeWidth={3} dot={{r:3}} activeDot={{r:6}}/></LineChart></ResponsiveContainer>
   </NeonCard>

   <NeonCard colorScheme="lanhouse" className="h-[340px] p-5">
    <div className="mb-3 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Controle de gastos</p><h3 className="text-lg font-semibold">Despesas Mês a Mês</h3></div><ArrowDown className="h-5 w-5 text-destructive"/></div>
    <ResponsiveContainer width="100%" height="82%"><BarChart data={data.despesasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={v=>fmt(v)} contentStyle={{backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:12}}/><Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
   </NeonCard>
  </div>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
   <KPICard colorScheme="lanhouse" icon={CalendarClock} label="Despesas Previstas" value={data.despesasPrevistas} isCurrency iconColor="orange" className="w-full"/>
   <NeonCard colorScheme="lanhouse" className="p-5">
    <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Operação</p><p className="mt-1 font-semibold">Atividade do período</p></div><div className="text-right"><p className="text-2xl font-black text-[hsl(var(--neon-lanhouse))]">{data.pedidos}</p><p className="text-xs text-muted-foreground">pedidos registrados</p></div></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-[hsl(var(--neon-lanhouse)/.15)] p-3"><span className="text-xs text-muted-foreground">Clientes</span><p className="mt-1 font-bold">{data.clientes}</p></div><div className="rounded-xl border border-orange-400/20 p-3"><span className="text-xs text-muted-foreground">Débitos</span><p className="mt-1 font-bold text-orange-300">{data.debitos}</p></div></div>
   </NeonCard>
  </div>

  <NeonCard colorScheme="lanhouse" className="p-5">
   <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Monitoramento</p><h3 className="text-lg font-semibold">Atenção do LM Impressões</h3><p className="mt-1 text-xs text-muted-foreground">Pendências financeiras e operacionais</p></div><span className="rounded-full bg-[hsl(var(--neon-lanhouse)/.10)] px-2.5 py-1 text-[10px] font-semibold uppercase text-[hsl(var(--neon-lanhouse))]">{alertas.length} {alertas.length===1?'alerta':'alertas'}</span></div>
   {alertas.length?<div className="grid grid-cols-1 gap-3 md:grid-cols-3">{alertas.map((a,i)=><div key={i} className="rounded-xl border border-orange-400/15 bg-orange-400/5 p-4"><a.icon className="mb-3 h-5 w-5 text-orange-300"/><p className="font-semibold">{a.title}</p><p className="mt-1 text-xs text-muted-foreground">{a.description}</p></div>)}</div>:<div className="flex flex-col items-center justify-center py-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-lanhouse)/.10)]"><CheckCircle2 className="h-6 w-6 text-[hsl(var(--neon-lanhouse))]"/></div><p className="mt-3 font-semibold">Tudo em ordem</p><p className="mt-1 text-xs text-muted-foreground">Nenhuma pendência financeira ou operacional encontrada.</p></div>}
  </NeonCard>

 </div>;
}
