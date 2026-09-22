import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown, CalendarClock, TrendingUp, Percent, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { supabase } from '@/lib/customSupabaseClient';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const fmtNumber = (v) => new Intl.NumberFormat('pt-BR').format(Number(v || 0));
const fmtAxis = (v) => Math.abs(Number(v || 0)) >= 1000 ? `R$${(Number(v) / 1000).toFixed(1)}k` : `R$${Number(v || 0).toFixed(0)}`;
const getMonthFromDate = (date) => { if (!date) return -1; const s = String(date); return /^\d{4}-\d{2}-\d{2}/.test(s) ? Number(s.slice(5, 7)) - 1 : new Date(date).getMonth(); };

export default function IgrejaDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    saldoCaixa: 0, dizimistas: 0, entradasMes: 0, despesasMes: 0, despesasPrevistasMes: 0,
    saldoMes: 0, saldoProjetado: 0, comprometimento: 0, entradasTipo: [], topDizimistas: [],
    entradasChart: [], despesasChart: [], previstoChart: []
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const year = new Date().getFullYear();
      const startOfYear = new Date(year, 0, 1, 0, 0, 0).toISOString();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
      const [entRes, despRes, prevRes, dizRes, allEntRes, allDespRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data, valor, tipo_entrada, igreja_dizimistas(nome)').gte('data', startOfYear).lte('data', endOfYear),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'data, valor').gte('data', startOfYear).lte('data', endOfYear),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas_previstas', 'vencimento, valor, despesa').gte('vencimento', startOfYear).lte('vencimento', endOfYear),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_dizimistas', 'id'),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'valor'),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'valor')
      ]);

      const firstError = [entRes.error, despRes.error, prevRes.error, dizRes.error, allEntRes.error, allDespRes.error].find(Boolean);
      if (firstError) throw new Error(firstError.message || 'Não foi possível carregar os dados da Tesouraria.');

      const entradas = entRes.data || [], despesas = despRes.data || [], previstas = prevRes.data || [];
      const totalEntradasHistorico = (allEntRes.data || []).reduce((a, b) => a + Number(b.valor || 0), 0);
      const totalDespesasHistorico = (allDespRes.data || []).reduce((a, b) => a + Number(b.valor || 0), 0);
      const currentMonth = new Date().getMonth();

      const entradasMes = entradas.filter(e => getMonthFromDate(e.data) === currentMonth).reduce((a, b) => a + Number(b.valor || 0), 0);
      const despesasMes = despesas.filter(d => getMonthFromDate(d.data) === currentMonth).reduce((a, b) => a + Number(b.valor || 0), 0);
      const despesasPrevistasMes = previstas.filter(d => getMonthFromDate(d.vencimento) === currentMonth).reduce((a, b) => a + Number(b.valor || 0), 0);
      const saldoMes = entradasMes - despesasMes;
      const saldoProjetado = saldoMes - despesasPrevistasMes;
      const comprometimento = entradasMes > 0 ? (despesasMes / entradasMes) * 100 : 0;

      const tiposMap = {};
      entradas.forEach(e => { const tipo = e.tipo_entrada || 'Outro'; tiposMap[tipo] = (tiposMap[tipo] || 0) + Number(e.valor || 0); });
      const entradasTipo = Object.entries(tiposMap).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);

      const dizMap = {};
      entradas.forEach(e => { const nome = e.igreja_dizimistas?.nome; if (nome) dizMap[nome] = (dizMap[nome] || 0) + Number(e.valor || 0); });
      const topDizimistas = Object.entries(dizMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, valor]) => ({ nome, valor }));

      const entradasChart = months.map(name => ({ name, Entradas: 0 }));
      const despesasChart = months.map(name => ({ name, Despesas: 0 }));
      const previstoChart = months.map(name => ({ name, Previsto: 0, Realizado: 0 }));

      entradas.forEach(e => { const m = getMonthFromDate(e.data); if (m >= 0) { entradasChart[m].Entradas += Number(e.valor || 0); previstoChart[m].Realizado += Number(e.valor || 0); } });
      despesas.forEach(d => { const m = getMonthFromDate(d.data); if (m >= 0) { despesasChart[m].Despesas += Number(d.valor || 0); previstoChart[m].Realizado -= Number(d.valor || 0); } });
      previstas.forEach(d => { const m = getMonthFromDate(d.vencimento); if (m >= 0) previstoChart[m].Previsto += Number(d.valor || 0); });

      setData({
        saldoCaixa: totalEntradasHistorico - totalDespesasHistorico,
        dizimistas: dizRes.data?.length || 0,
        entradasMes, despesasMes, despesasPrevistasMes, saldoMes, saldoProjetado, comprometimento,
        entradasTipo, topDizimistas, entradasChart, despesasChart, previstoChart
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard da Tesouraria:', err);
      setError(err?.message || 'Não foi possível carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('tesouraria_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_entradas' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_despesas' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_despesas_previstas' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_dizimistas' }, fetchData)
      .subscribe();
    const interval = setInterval(fetchData, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [user, fetchData]);

  const alertas = useMemo(() => {
    const lista = [];
    if (data.entradasMes > 0 && data.comprometimento >= 80) lista.push({ icon: AlertTriangle, title: 'Alto comprometimento da receita', description: `As despesas do mês representam ${data.comprometimento.toFixed(1)}% das entradas.` });
    if (data.saldoMes < 0) lista.push({ icon: AlertTriangle, title: 'Saldo mensal negativo', description: 'As despesas do mês ultrapassaram as entradas do mês.' });
    if (data.saldoProjetado < 0) lista.push({ icon: CalendarClock, title: 'Projeção negativa', description: 'Após considerar as despesas previstas, o saldo projetado ficará negativo.' });
    return lista;
  }, [data]);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Atualizando painel da Tesouraria...</div>;

  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto w-full"><NeonCard colorScheme="igreja" className="p-6 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" /><p className="font-semibold text-destructive">Não foi possível carregar o painel.</p><p className="text-sm text-muted-foreground mt-2">{error}</p></NeonCard></div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">Painel da Tesouraria</h1>
          <div className="h-1 w-16 rounded-full bg-[hsl(var(--neon-igreja))] mt-3 mx-auto md:mx-0" />
          <p className="text-sm text-muted-foreground text-center md:text-left mt-1">Acompanhe o caixa, entradas, despesas e compromissos da igreja</p>
        </div>
        <p className="text-xs font-medium text-[hsl(var(--neon-igreja))] text-center lg:text-right">Visão mensal • {months[new Date().getMonth()]} de {new Date().getFullYear()}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={Wallet} label="Saldo Caixa • Histórico" value={data.saldoCaixa} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={Users} label="Dizimistas Ativos" value={data.dizimistas} iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={ArrowUp} label="Entradas Mês" value={data.entradasMes} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={ArrowDown} label="Despesas Mês" value={data.despesasMes} isCurrency iconColor="orange" className="w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={CalendarClock} label="Despesas Previstas" value={data.despesasPrevistasMes} isCurrency iconColor="orange" className="w-full" />
        <KPICard colorScheme="igreja" icon={TrendingUp} label="Saldo do Mês" value={data.saldoMes} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={Wallet} label="Saldo Projetado" value={data.saldoProjetado} isCurrency iconColor={data.saldoProjetado >= 0 ? 'gold' : 'orange'} className="w-full" />
        <NeonCard colorScheme="igreja" className="flex flex-col justify-center p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Comprometimento da Receita</p><p className={`text-2xl font-bold mt-1 ${data.comprometimento >= 80 ? 'text-destructive' : 'text-[hsl(var(--neon-igreja))]'}`}>{data.comprometimento.toFixed(1)}%</p><p className="text-xs text-muted-foreground mt-1">Despesas em relação às entradas do mês</p></NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="igreja" className="p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Entradas por Tipo</h3>
          {data.entradasTipo.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[hsl(var(--neon-igreja)/0.2)]"><th className="text-left py-3 text-xs uppercase tracking-wide text-muted-foreground">Tipo de Entrada</th><th className="text-right py-3 text-xs uppercase tracking-wide text-muted-foreground">Valor Arrecadado</th></tr></thead><tbody>{data.entradasTipo.map((item, i) => <tr key={`${item.tipo}-${i}`} className="border-b border-border/40"><td className="py-3">{item.tipo}</td><td className="py-3 text-right font-semibold text-[hsl(var(--neon-igreja))]">{fmt(item.valor)}</td></tr>)}</tbody></table></div> : <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma entrada registrada no ano atual.</div>}
        </NeonCard>

        <NeonCard colorScheme="igreja" className="p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Top Dizimistas</h3>
          {data.topDizimistas.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[hsl(var(--neon-igreja)/0.2)]"><th className="text-left py-3 text-xs uppercase tracking-wide text-muted-foreground">Membro</th><th className="text-right py-3 text-xs uppercase tracking-wide text-muted-foreground">Valor Contribuído</th></tr></thead><tbody>{data.topDizimistas.map((item, i) => <tr key={`${item.nome}-${i}`} className="border-b border-border/40"><td className="py-3">{item.nome}</td><td className="py-3 text-right font-semibold text-[hsl(var(--neon-igreja))]">{fmt(item.valor)}</td></tr>)}</tbody></table></div> : <div className="py-8 text-center text-sm text-muted-foreground">Nenhum dízimo identificado no ano atual.</div>}
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="igreja" className="h-[300px] md:h-[380px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Entradas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%"><BarChart data={data.entradasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} /><Tooltip formatter={(value) => [fmt(value), 'Entradas']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Bar dataKey="Entradas" fill="hsl(var(--neon-igreja))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="igreja" className="h-[300px] md:h-[380px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Despesas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%"><LineChart data={data.despesasChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} /><Tooltip formatter={(value) => [fmt(value), 'Despesas']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Line type="monotone" dataKey="Despesas" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--destructive))' }} /></LineChart></ResponsiveContainer>
        </NeonCard>
      </div>

      <NeonCard colorScheme="igreja" className="h-[300px] md:h-[380px] overflow-hidden">
        <h3 className="text-lg md:text-xl font-semibold mb-4">Despesas Previstas x Realizadas</h3>
        <ResponsiveContainer width="100%" height="85%"><BarChart data={data.previstoChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} /><Tooltip formatter={(value, name) => [fmt(Math.abs(value)), name]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Legend /><Bar dataKey="Previsto" name="Previsto" fill="hsl(var(--neon-igreja))" radius={[4,4,0,0]} opacity={0.5} /><Bar dataKey="Realizado" name="Realizado" fill="hsl(var(--destructive))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
      </NeonCard>

      <NeonCard colorScheme="igreja" className="p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4"><div><h3 className="text-lg font-semibold">Atenção da Tesouraria</h3><p className="text-xs text-muted-foreground mt-1">Indicadores do período atual</p></div><span className="shrink-0 rounded-full bg-[hsl(var(--neon-igreja)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--neon-igreja))]">{alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}</span></div>
        {alertas.length ? <div className="space-y-3">{alertas.map((item, index) => <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--neon-igreja)/0.25)] bg-background/30 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><item.icon className="h-4 w-4" /></div><div><p className="font-medium text-destructive">{item.title}</p><p className="text-xs text-muted-foreground mt-1">{item.description}</p></div></div>)}</div> : <div className="flex flex-col items-center justify-center py-7 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-igreja)/0.1)] text-[hsl(var(--neon-igreja))]"><CheckCircle2 className="h-5 w-5" /></div><p className="font-medium mt-3">Tesouraria sem alertas</p><p className="text-xs text-muted-foreground mt-1">Nenhuma situação de atenção foi identificada no período atual.</p></div>}
      </NeonCard>
    </div>
  );
}
