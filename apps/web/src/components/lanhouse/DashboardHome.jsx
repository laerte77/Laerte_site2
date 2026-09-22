import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown, ShoppingCart, CreditCard, CalendarClock, AlertTriangle, CheckCircle2, Printer, Activity, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { supabase } from '@/lib/customSupabaseClient';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const months=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const monthNames=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=Array.from({length:5},(_,i)=>new Date().getFullYear()-i);
const fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const getMonth=d=>/^\d{4}-\d{2}-\d{2}/.test(String(d))?Number(String(d).slice(5,7))-1:new Date(d).getMonth();

export default function DashboardHome(){
  const {user,isAdmin}=useAuth();
  const now=new Date();
  const [filters,setFilters]=useState({year:now.getFullYear(),month:now.getMonth()});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [data,setData]=useState({
    saldoGeral:0,entradas:0,despesas:0,saldo:0,clientes:0,pedidos:0,debitos:0,
    despesasPrevistas:0,topClientes:[],topServicos:[],entradasChart:[],despesasChart:[]
  });

  const fetchData=useCallback(async()=>{
    if(!user)return;
    setLoading(true);setError(null);

    try{
      const {year,month}=filters;
      const start=month==='all'?new Date(Date.UTC(year,0,1)):new Date(Date.UTC(year,Number(month),1));
      const end=month==='all'?new Date(Date.UTC(year,11,31,23,59,59,999)):new Date(Date.UTC(year,Number(month)+1,0,23,59,59,999));
      const ys=new Date(Date.UTC(year,0,1)).toISOString();
      const ye=new Date(Date.UTC(year,11,31,23,59,59,999)).toISOString();

      const [
        servRes,despRes,cliRes,pedRes,debRes,prevRes,
        allServRes,allDespRes,entAnoRes,despAnoRes
      ]=await Promise.all([
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','data,valor,cliente,cliente_id,lm_servicos(servico)').gte('data',start.toISOString()).lte('data',end.toISOString()),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','data,valor').gte('data',start.toISOString()).lte('data',end.toISOString()),
        getAccessibleDataQuery(user.id,isAdmin,'lm_clientes','id'),
        getAccessibleDataQuery(user.id,isAdmin,'lm_pedidos','data_pedido,status').gte('data_pedido',start.toISOString().slice(0,10)).lte('data_pedido',end.toISOString().slice(0,10)),
        getAccessibleDataQuery(user.id,isAdmin,'lm_clientes_debito','cliente,status,valor').eq('status','DEVENDO'),
        getAccessibleDataQuery(user.id,isAdmin,'lm_despesas_previstas','data_vencimento,valor,status').gte('data_vencimento',start.toISOString().slice(0,10)).lte('data_vencimento',end.toISOString().slice(0,10)),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','valor'),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','valor'),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','data,valor').gte('data',ys).lte('data',ye),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','data,valor').gte('data',ys).lte('data',ye)
      ]);

      const err=[servRes,despRes,cliRes,pedRes,debRes,prevRes,allServRes,allDespRes,entAnoRes,despAnoRes].map(r=>r.error).find(Boolean);
      if(err)throw new Error(err.message||'Erro ao carregar os dados.');

      const serv=servRes.data||[],desp=despRes.data||[],prev=prevRes.data||[];
      const soma=a=>a.reduce((t,i)=>t+Number(i.valor||0),0);
      const entradas=soma(serv),despesas=soma(desp),saldo=entradas-despesas;
      const saldoGeral=soma(allServRes.data||[])-soma(allDespRes.data||[]);
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

      (entAnoRes.data||[]).forEach(i=>{const m=getMonth(i.data);if(m>=0)entradasChart[m].Entradas+=Number(i.valor||0);});
      (despAnoRes.data||[]).forEach(i=>{const m=getMonth(i.data);if(m>=0)despesasChart[m].Despesas+=Number(i.valor||0);});

      setData({
        saldoGeral,entradas,despesas,saldo,clientes:cliRes.data?.length||0,pedidos:pedRes.data?.length||0,
        debitos,despesasPrevistas:soma(prev),topClientes,topServicos,entradasChart,despesasChart
      });
    }catch(e){
      console.error(e);
      setError(e?.message||'Não foi possível carregar o dashboard.');
    }finally{setLoading(false);}
  },[user,isAdmin,filters]);

  useEffect(()=>{
    fetchData();
    if(!user)return;
    const ch=supabase.channel('lm_dashboard_changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_servicos'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_despesas'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_pedidos'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas_previstas'},fetchData)
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[user,fetchData]);

  const percentualDespesas=data.entradas>0?Math.min((data.despesas/data.entradas)*100,100):0;

  const alertas=useMemo(()=>{
    const a=[];
    if(data.debitos>0)a.push({icon:CreditCard,title:`${data.debitos} cliente${data.debitos>1?'s':''} com débito`,description:'Existem valores pendentes registrados no período.'});
    if(data.despesasPrevistas>0)a.push({icon:CalendarClock,title:'Despesas previstas',description:`Há ${fmt(data.despesasPrevistas)} em compromissos para o período.`});
    if(data.saldo<0)a.push({icon:AlertTriangle,title:'Saldo do período negativo',description:'As despesas ultrapassaram as entradas.'});
    return a;
  },[data]);

  if(loading)return <div className="min-h-[60vh] flex flex-col items-center justify-center"><Activity className="w-10 h-10 text-[hsl(var(--neon-lanhouse))] animate-pulse mb-3"/><p className="text-muted-foreground animate-pulse">Carregando LM Impressões...</p></div>;

  if(error)return <div className="p-5 max-w-7xl mx-auto"><NeonCard colorScheme="lanhouse" className="p-8 text-center"><AlertTriangle className="mx-auto w-10 h-10 text-destructive mb-3"/><p className="font-semibold text-destructive">Erro ao carregar o painel</p><p className="text-sm text-muted-foreground mt-2">{error}</p></NeonCard></div>;

  return(
    <div className="relative p-2 md:p-3 space-y-5 md:space-y-6 w-full overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full bg-[hsl(var(--neon-lanhouse)/0.12)] blur-3xl"/>
      <div className="pointer-events-none absolute top-[420px] -left-32 w-60 h-60 rounded-full bg-cyan-400/5 blur-3xl"/>

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-[hsl(var(--neon-lanhouse)/0.18)] pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--neon-lanhouse)/0.10)] border border-[hsl(var(--neon-lanhouse)/0.3)] flex items-center justify-center shadow-[0_0_25px_hsl(var(--neon-lanhouse)/0.14)]">
            <Printer className="w-7 h-7 text-[hsl(var(--neon-lanhouse))]"/>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--neon-lanhouse))] font-semibold">Gestão Inteligente</p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">LM Impressões</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão financeira e operacional do negócio</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[hsl(var(--neon-lanhouse)/0.25)] bg-card/60 backdrop-blur-md p-2 shadow-lg">
          <Select value={String(filters.month)} onValueChange={v=>setFilters(p=>({...p,month:v==='all'?'all':Number(v)}))}>
            <SelectTrigger className="w-[145px] bg-transparent border-0 focus:ring-0"><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os meses</SelectItem>{monthNames.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <div className="w-px h-6 bg-border"/>
          <Select value={String(filters.year)} onValueChange={v=>setFilters(p=>({...p,year:Number(v)}))}>
            <SelectTrigger className="w-[95px] bg-transparent border-0 focus:ring-0"><SelectValue/></SelectTrigger>
            <SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_1fr] gap-4">
        <NeonCard colorScheme="lanhouse" className="relative overflow-hidden p-6 md:p-7 bg-gradient-to-br from-card/95 to-[hsl(var(--neon-lanhouse)/0.06)]">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[hsl(var(--neon-lanhouse)/0.12)] blur-3xl"/>
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Wallet className="w-4 h-4 text-[hsl(var(--neon-lanhouse))]"/> Saldo Geral
            </div>
            <div className={`text-3xl md:text-4xl font-black mt-3 ${data.saldoGeral>=0?'text-[hsl(var(--neon-lanhouse))]':'text-destructive'}`}>{fmt(data.saldoGeral)}</div>
            <p className="text-xs text-muted-foreground mt-2">Acumulado histórico</p>
            <div className="mt-5 h-1.5 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-[hsl(var(--neon-lanhouse))]" style={{width:'100%'}}/></div>
          </div>
        </NeonCard>

        <KPICard colorScheme="lanhouse" icon={ArrowUp} label="Entradas • Período" value={data.entradas} isCurrency iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={ArrowDown} label="Despesas • Período" value={data.despesas} isCurrency iconColor="orange" className="w-full"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard colorScheme="lanhouse" icon={TrendingUp} label="Saldo • Período" value={data.saldo} isCurrency iconColor={data.saldo>=0?'lanhouse':'orange'} className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={Users} label="Clientes" value={data.clientes} iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={ShoppingCart} label="Pedidos • Período" value={data.pedidos} iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={CreditCard} label="Clientes com Débito" value={data.debitos} iconColor="orange" className="w-full"/>
      </div>

      <NeonCard colorScheme="lanhouse" className="relative overflow-hidden p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resumo Financeiro</p>
            <h3 className="text-lg font-semibold mt-1">Composição do período</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Despesas consomem</p>
            <p className={`text-2xl font-black ${percentualDespesas>=80?'text-destructive':'text-[hsl(var(--neon-lanhouse))]'}`}>{percentualDespesas.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">das entradas</p>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--neon-lanhouse))] to-cyan-300 transition-all" style={{width:`${percentualDespesas}%`}}/>
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>Entradas <strong className="text-foreground">{fmt(data.entradas)}</strong></span>
          <span>Despesas <strong className="text-foreground">{fmt(data.despesas)}</strong></span>
        </div>
      </NeonCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeonCard colorScheme="lanhouse" className="p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Desempenho</p><h3 className="text-lg font-semibold">Top 5 Clientes</h3></div><Users className="w-5 h-5 text-[hsl(var(--neon-lanhouse))]"/></div>
          {data.topClientes.length?data.topClientes.map(([n,v],i)=>{const max=data.topClientes[0][1]||1;return <div key={i} className="mb-4 last:mb-0"><div className="flex justify-between text-sm mb-1.5"><span className="font-medium truncate pr-3">{String(i+1).padStart(2,'0')} • {n}</span><span className="font-semibold text-[hsl(var(--neon-lanhouse))]">{fmt(v)}</span></div><div className="h-2 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-[hsl(var(--neon-lanhouse))]" style={{width:`${Math.max((v/max)*100,8)}%`}}/></div></div>}):<p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado no período.</p>}
        </NeonCard>

        <NeonCard colorScheme="lanhouse" className="p-5">
          <div className="flex items-center justify-between mb-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Faturamento</p><h3 className="text-lg font-semibold">Top 5 Serviços</h3></div><Printer className="w-5 h-5 text-[hsl(var(--neon-lanhouse))]"/></div>
          {data.topServicos.length?data.topServicos.map(([n,v],i)=>{const max=data.topServicos[0][1]||1;return <div key={i} className="mb-4 last:mb-0"><div className="flex justify-between text-sm mb-1.5"><span className="font-medium truncate pr-3">{String(i+1).padStart(2,'0')} • {n}</span><span className="font-semibold text-cyan-300">{fmt(v)}</span></div><div className="h-2 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-cyan-300" style={{width:`${Math.max((v/max)*100,8)}%`}}/></div></div>}):<p className="py-8 text-center text-sm text-muted-foreground">Nenhum serviço no período.</p>}
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeonCard colorScheme="lanhouse" className="h-[340px] p-5">
          <div className="flex items-center justify-between mb-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Movimentação</p><h3 className="text-lg font-semibold">Entradas Mês a Mês</h3></div><ArrowUp className="w-5 h-5 text-[hsl(var(--neon-lanhouse))]"/></div>
          <ResponsiveContainer width="100%" height="82%"><LineChart data={data.entradasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={v=>fmt(v)} contentStyle={{backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--neon-lanhouse)/0.3)',borderRadius:12}}/><Line type="monotone" dataKey="Entradas" stroke="hsl(var(--neon-lanhouse))" strokeWidth={3} dot={{r:3}} activeDot={{r:6}}/></LineChart></ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="lanhouse" className="h-[340px] p-5">
          <div className="flex items-center justify-between mb-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Controle de gastos</p><h3 className="text-lg font-semibold">Despesas Mês a Mês</h3></div><ArrowDown className="w-5 h-5 text-destructive"/></div>
          <ResponsiveContainer width="100%" height="82%"><BarChart data={data.despesasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={v=>fmt(v)} contentStyle={{backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:12}}/><Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KPICard colorScheme="lanhouse" icon={CalendarClock} label="Despesas Previstas" value={data.despesasPrevistas} isCurrency iconColor="orange" className="w-full"/>
        <NeonCard colorScheme="lanhouse" className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Operação</p><p className="font-semibold mt-1">Atividade do período</p></div>
            <div className="text-right"><p className="text-2xl font-black text-[hsl(var(--neon-lanhouse))]">{data.pedidos}</p><p className="text-xs text-muted-foreground">pedidos registrados</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[hsl(var(--neon-lanhouse)/0.15)] p-3"><span className="text-muted-foreground text-xs">Clientes</span><p className="font-bold mt-1">{data.clientes}</p></div>
            <div className="rounded-xl border border-orange-400/20 p-3"><span className="text-muted-foreground text-xs">Débitos</span><p className="font-bold mt-1 text-orange-300">{data.debitos}</p></div>
          </div>
        </NeonCard>
      </div>

      <NeonCard colorScheme="lanhouse" className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Monitoramento</p><h3 className="text-lg font-semibold">Atenção do LM Impressões</h3><p className="text-xs text-muted-foreground mt-1">Pendências financeiras e operacionais</p></div>
          <span className="text-[10px] uppercase font-semibold rounded-full px-2.5 py-1 bg-[hsl(var(--neon-lanhouse)/0.1)] text-[hsl(var(--neon-lanhouse))]">{alertas.length} {alertas.length===1?'alerta':'alertas'}</span>
        </div>

        {alertas.length?(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alertas.map((a,i)=><div key={i} className="rounded-xl border border-orange-400/15 bg-orange-400/5 p-4"><a.icon className="w-5 h-5 text-orange-300 mb-3"/><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground mt-1">{a.description}</p></div>)}
          </div>
        ):(
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--neon-lanhouse)/0.1)] flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-[hsl(var(--neon-lanhouse))]"/></div>
            <p className="font-semibold mt-3">Tudo em ordem</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma pendência financeira ou operacional encontrada.</p>
          </div>
        )}
      </NeonCard>
    </div>
  );
}
