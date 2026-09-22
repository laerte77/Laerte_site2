import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown, ShoppingCart, CreditCard, CalendarClock, AlertTriangle, CheckCircle2, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { supabase } from '@/lib/customSupabaseClient';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const getMonth = d => /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? Number(String(d).slice(5,7))-1 : new Date(d).getMonth();

export default function DashboardHome() {
  const { user, isAdmin } = useAuth();
  const now = new Date();
  const [filters,setFilters] = useState({year:now.getFullYear(),month:now.getMonth()});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [data,setData] = useState({
    saldoGeral:0, entradas:0, despesas:0, saldo:0, clientes:0, pedidos:0,
    debitos:0, despesasPrevistas:0, topClientes:[], topServicos:[],
    entradasChart:[], despesasChart:[]
  });

  const fetchData = useCallback(async()=>{
    if(!user)return;
    setLoading(true); setError(null);

    try{
      const {year,month}=filters;
      const start=month==='all'
        ? new Date(Date.UTC(year,0,1))
        : new Date(Date.UTC(year,Number(month),1));
      const end=month==='all'
        ? new Date(Date.UTC(year,11,31,23,59,59,999))
        : new Date(Date.UTC(year,Number(month)+1,0,23,59,59,999));

      const yearStart=new Date(Date.UTC(year,0,1)).toISOString();
      const yearEnd=new Date(Date.UTC(year,11,31,23,59,59,999)).toISOString();

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
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','data,valor').gte('data',yearStart).lte('data',yearEnd),
        getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','data,valor').gte('data',yearStart).lte('data',yearEnd)
      ]);

      const e=[servRes,despRes,cliRes,pedRes,debRes,prevRes,allServRes,allDespRes,entAnoRes,despAnoRes].map(x=>x.error).find(Boolean);
      if(e)throw new Error(e.message||'Erro ao carregar dados.');

      const serv=servRes.data||[], desp=despRes.data||[], prev=prevRes.data||[];
      const soma=a=>a.reduce((t,i)=>t+Number(i.valor||0),0);

      const entradas=soma(serv);
      const despesas=soma(desp);
      const saldo=entradas-despesas;
      const saldoGeral=soma(allServRes.data||[])-soma(allDespRes.data||[]);

      const clientesDebito=new Set((debRes.data||[]).map(i=>i.cliente)).size;

      const cMap={};
      serv.forEach(i=>{
        const k=i.cliente||'Outros';
        cMap[k]=(cMap[k]||0)+Number(i.valor||0);
      });

      const sMap={};
      serv.forEach(i=>{
        const k=i.lm_servicos?.servico||'Outros';
        sMap[k]=(sMap[k]||0)+Number(i.valor||0);
      });

      const topClientes=Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const topServicos=Object.entries(sMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      const ec=months.map(name=>({name,Entradas:0}));
      const dc=months.map(name=>({name,Despesas:0}));

      (entAnoRes.data||[]).forEach(i=>{
        const m=getMonth(i.data); if(m>=0)ec[m].Entradas+=Number(i.valor||0);
      });

      (despAnoRes.data||[]).forEach(i=>{
        const m=getMonth(i.data); if(m>=0)dc[m].Despesas+=Number(i.valor||0);
      });

      setData({
        saldoGeral,entradas,despesas,saldo,
        clientes:cliRes.data?.length||0,
        pedidos:pedRes.data?.length||0,
        debitos:clientesDebito,
        despesasPrevistas:soma(prev),
        topClientes,topServicos,
        entradasChart:ec,
        despesasChart:dc
      });
    }catch(err){
      console.error(err);
      setError(err?.message||'Não foi possível carregar o dashboard.');
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

  const alertas=useMemo(()=>{
    const a=[];
    if(data.debitos>0)a.push({icon:CreditCard,title:'Clientes com débito',description:`Existem ${data.debitos} cliente(s) com débito em aberto.`});
    if(data.despesasPrevistas>0)a.push({icon:CalendarClock,title:'Despesas previstas',description:`Há ${fmt(data.despesasPrevistas)} em compromissos previstos para o período.`});
    if(data.saldo<0)a.push({icon:AlertTriangle,title:'Saldo do período negativo',description:'As despesas ultrapassaram as entradas no período selecionado.'});
    return a;
  },[data]);

  if(loading)return <div className="p-8 text-center text-muted-foreground animate-pulse">Atualizando painel do LM Impressões...</div>;

  if(error)return <div className="p-4 md:p-6 max-w-7xl mx-auto"><NeonCard colorScheme="lanhouse" className="p-6 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3"/><p className="font-semibold text-destructive">Erro ao carregar o painel.</p><p className="text-sm text-muted-foreground mt-2">{error}</p></NeonCard></div>;

  return(
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 max-w-7xl mx-auto w-full">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[hsl(var(--neon-lanhouse)/0.1)] flex items-center justify-center">
            <Printer className="w-6 h-6 text-[hsl(var(--neon-lanhouse))]"/>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">LM Impressões</h1>
            <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-[hsl(var(--neon-lanhouse)/0.25)] bg-card/40 p-2">
          <Select value={String(filters.month)} onValueChange={v=>setFilters(p=>({...p,month:v==='all'?'all':Number(v)}))}>
            <SelectTrigger className="w-[145px] bg-transparent border-0 focus:ring-0"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthNames.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={String(filters.year)} onValueChange={v=>setFilters(p=>({...p,year:Number(v)}))}>
            <SelectTrigger className="w-[100px] bg-transparent border-0 focus:ring-0"><SelectValue/></SelectTrigger>
            <SelectContent>{Array.from({length:5},(_,i)=>new Date().getFullYear()-i).map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard colorScheme="lanhouse" icon={Wallet} label="Saldo Geral • Histórico" value={data.saldoGeral} isCurrency iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={ArrowUp} label="Entradas • Período" value={data.entradas} isCurrency iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={ArrowDown} label="Despesas • Período" value={data.despesas} isCurrency iconColor="orange" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={Wallet} label="Saldo • Período" value={data.saldo} isCurrency iconColor={data.saldo>=0?'lanhouse':'orange'} className="w-full"/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard colorScheme="lanhouse" icon={Users} label="Clientes" value={data.clientes} iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={ShoppingCart} label="Pedidos • Período" value={data.pedidos} iconColor="lanhouse" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={CreditCard} label="Clientes com Débito" value={data.debitos} iconColor="orange" className="w-full"/>
        <KPICard colorScheme="lanhouse" icon={CalendarClock} label="Despesas Previstas" value={data.despesasPrevistas} isCurrency iconColor="orange" className="w-full"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeonCard colorScheme="lanhouse" className="p-5">
          <h3 className="text-lg font-semibold mb-4">Top 5 Clientes</h3>
          {data.topClientes.length?<table className="w-full"><thead><tr className="border-b border-border"><th className="text-left py-3 text-xs text-muted-foreground">Cliente</th><th className="text-right py-3 text-xs text-muted-foreground">Valor</th></tr></thead><tbody>{data.topClientes.map(([n,v],i)=><tr key={i} className="border-b border-border/40"><td className="py-3">{n}</td><td className="py-3 text-right font-semibold text-[hsl(var(--neon-lanhouse))]">{fmt(v)}</td></tr>)}</tbody></table>:<p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado no período.</p>}
        </NeonCard>

        <NeonCard colorScheme="lanhouse" className="p-5">
          <h3 className="text-lg font-semibold mb-4">Top 5 Serviços</h3>
          {data.topServicos.length?<table className="w-full"><thead><tr className="border-b border-border"><th className="text-left py-3 text-xs text-muted-foreground">Serviço</th><th className="text-right py-3 text-xs text-muted-foreground">Valor</th></tr></thead><tbody>{data.topServicos.map(([n,v],i)=><tr key={i} className="border-b border-border/40"><td className="py-3">{n}</td><td className="py-3 text-right font-semibold text-[hsl(var(--neon-lanhouse))]">{fmt(v)}</td></tr>)}</tbody></table>:<p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado no período.</p>}
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeonCard colorScheme="lanhouse" className="h-[320px] p-5">
          <h3 className="text-lg font-semibold mb-4">Entradas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.entradasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
              <XAxis dataKey="name" tickLine={false} axisLine={false}/>
              <YAxis tickLine={false} axisLine={false}/>
              <Tooltip formatter={v=>fmt(v)}/>
              <Line type="monotone" dataKey="Entradas" stroke="hsl(var(--neon-lanhouse))" strokeWidth={3} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="lanhouse" className="h-[320px] p-5">
          <h3 className="text-lg font-semibold mb-4">Despesas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.despesasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
              <XAxis dataKey="name" tickLine={false} axisLine={false}/>
              <YAxis tickLine={false} axisLine={false}/>
              <Tooltip formatter={v=>fmt(v)}/>
              <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>

      <NeonCard colorScheme="lanhouse" className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Atenção do LM Impressões</h3>
            <p className="text-xs text-muted-foreground mt-1">Indicadores do período selecionado</p>
          </div>
          <span className="text-[10px] uppercase font-semibold text-[hsl(var(--neon-lanhouse))]">{alertas.length} {alertas.length===1?'alerta':'alertas'}</span>
        </div>

        {alertas.length?(
          <div className="space-y-3">
            {alertas.map((a,i)=><div key={i} className="flex gap-3 rounded-xl border border-[hsl(var(--neon-lanhouse)/0.2)] p-3"><a.icon className="w-5 h-5 text-orange-400 mt-0.5"/><div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground mt-1">{a.description}</p></div></div>)}
          </div>
        ):(
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto w-7 h-7 text-[hsl(var(--neon-lanhouse))]"/>
            <p className="font-medium mt-2">Nenhum alerta financeiro ou operacional.</p>
          </div>
        )}
      </NeonCard>
    </div>
  );
}

export default DashboardHome;
