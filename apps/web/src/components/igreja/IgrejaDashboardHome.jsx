import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown, CalendarClock, TrendingUp, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { supabase } from '@/lib/customSupabaseClient';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const fmtAxis = v => Math.abs(Number(v || 0)) >= 1000 ? `R$${(Number(v) / 1000).toFixed(1)}k` : `R$${Number(v || 0).toFixed(0)}`;
const getMonth = d => !d ? -1 : /^\d{4}-\d{2}-\d{2}/.test(String(d)) ? Number(String(d).slice(5, 7)) - 1 : new Date(d).getMonth();

export default function IgrejaDashboardHome() {
  const { user, isAdmin } = useAuth();
  const now = new Date();
  const [filters, setFilters] = useState({ year: now.getFullYear(), month: now.getMonth() });
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
      const { year, month } = filters;
      const start = month === 'all'
        ? new Date(Date.UTC(year, 0, 1))
        : new Date(Date.UTC(year, Number(month), 1));
      const end = month === 'all'
        ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
        : new Date(Date.UTC(year, Number(month) + 1, 0, 23, 59, 59, 999));
      const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
      const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString();

      const [ent, desp, prev, diz, allEnt, allDesp, entAno, despAno, prevAno] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data,valor,tipo_entrada,dizimista_id,igreja_dizimistas(nome)').gte('data', start.toISOString()).lte('data', end.toISOString()),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'data,valor,despesa').gte('data', start.toISOString()).lte('data', end.toISOString()),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas_previstas', 'vencimento,valor,despesa').gte('vencimento', start.toISOString()).lte('vencimento', end.toISOString()),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_dizimistas', 'id'),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'valor'),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'valor'),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data,valor').gte('data', yearStart).lte('data', yearEnd),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'data,valor').gte('data', yearStart).lte('data', yearEnd),
        getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas_previstas', 'vencimento,valor').gte('vencimento', yearStart).lte('vencimento', yearEnd)
      ]);

      const firstError = [ent.error, desp.error, prev.error, diz.error, allEnt.error, allDesp.error, entAno.error, despAno.error, prevAno.error].find(Boolean);
      if (firstError) throw new Error(firstError.message || 'Erro ao carregar os dados.');

      const entradas = ent.data || [], despesas = desp.data || [], previstas = prev.data || [];
      const entradasAno = entAno.data || [], despesasAno = despAno.data || [], previstasAno = prevAno.data || [];

      const soma = arr => arr.reduce((t, i) => t + Number(i.valor || 0), 0);
      const totalEntradasHistorico = soma(allEnt.data || []);
      const totalDespesasHistorico = soma(allDesp.data || []);
      const entradasPeriodo = soma(entradas);
      const despesasPeriodo = soma(despesas);
      const previstasPeriodo = soma(previstas);
      const saldoMes = entradasPeriodo - despesasPeriodo;
      const saldoProjetado = saldoMes - previstasPeriodo;
      const comprometimento = entradasPeriodo > 0 ? (despesasPeriodo / entradasPeriodo) * 100 : 0;

      const tipos = {};
      entradas.forEach(i => { const k = i.tipo_entrada || 'Outro'; tipos[k] = (tipos[k] || 0) + Number(i.valor || 0); });
      const entradasTipo = Object.entries(tipos).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);

      const dizMap = {};
      entradas.forEach(i => {
        const nome = i.igreja_dizimistas?.nome;
        if (nome) dizMap[nome] = (dizMap[nome] || 0) + Number(i.valor || 0);
      });
      const topDizimistas = Object.entries(dizMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, valor]) => ({ nome, valor }));

      const entradasChart = months.map(name => ({ name, Entradas: 0 }));
      const despesasChart = months.map(name => ({ name, Despesas: 0 }));
      const previstoChart = months.map(name => ({ name, Previsto: 0, Realizado: 0 }));

      entradasAno.forEach(i => { const m = getMonth(i.data); if (m >= 0) entradasChart[m].Entradas += Number(i.valor || 0); });
      despesasAno.forEach(i => { const m = getMonth(i.data); if (m >= 0) { despesasChart[m].Despesas += Number(i.valor || 0); previstoChart[m].Realizado += Number(i.valor || 0); } });
      previstasAno.forEach(i => { const m = getMonth(i.vencimento); if (m >= 0) previstoChart[m].Previsto += Number(i.valor || 0); });

      setData({
        saldoCaixa: totalEntradasHistorico - totalDespesasHistorico,
        dizimistas: diz.data?.length || 0,
        entradasMes: entradasPeriodo,
        despesasMes: despesasPeriodo,
        despesasPrevistasMes: previstasPeriodo,
        saldoMes,
        saldoProjetado,
        comprometimento,
        entradasTipo,
        topDizimistas,
        entradasChart,
        despesasChart,
        previstoChart
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Não foi possível carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, filters]);

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
    const a = [];
    if (data.entradasMes > 0 && data.comprometimento >= 80) a.push({
      icon: AlertTriangle,
      title: 'Alto comprometimento da receita',
      description: `As despesas representam ${data.comprometimento.toFixed(1)}% das entradas.`
    });
    if (data.saldoMes < 0) a.push({
      icon: AlertTriangle,
      title: 'Saldo do período negativo',
      description: 'As despesas ultrapassaram as entradas do período.'
    });
    if (data.saldoProjetado < 0) a.push({
      icon: CalendarClock,
      title: 'Projeção negativa',
      description: 'As despesas previstas deixam o saldo projetado negativo.'
    });
    return a;
  }, [data]);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Atualizando painel da Tesouraria...</div>;

  if (error) return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
      <NeonCard colorScheme="igreja" className="p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
        <p className="font-semibold text-destructive">Não foi possível carregar o painel.</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </NeonCard>
    </div>
  );

  const periodo = filters.month === 'all' ? 'Todos os meses' : monthNames[Number(filters.month)];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[hsl(var(--neon-igreja)/0.1)] flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[hsl(var(--neon-igreja))]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Igreja</h1>
              <p className="text-sm text-muted-foreground">Painel da Tesouraria</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[hsl(var(--neon-igreja)/0.25)] bg-card/40 p-2">
          <div className="flex items-center gap-2 px-2">
            <Filter className="w-4 h-4 text-[hsl(var(--neon-igreja))]" />
            <span className="text-xs font-medium text-muted-foreground">Filtros</span>
          </div>

          <Select value={String(filters.month)} onValueChange={v => setFilters(p => ({ ...p, month: v === 'all' ? 'all' : Number(v) }))}>
            <SelectTrigger className="w-[145px] bg-transparent border-0 shadow-none focus:ring-0"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthNames.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-border" />

          <Select value={String(filters.year)} onValueChange={v => setFilters(p => ({ ...p, year: Number(v) }))}>
            <SelectTrigger className="w-[100px] bg-transparent border-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-[hsl(var(--neon-igreja)/0.15)] bg-[hsl(var(--neon-igreja)/0.04)] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Período selecionado</p>
          <p className="font-semibold mt-0.5">{periodo} de {filters.year}</p>
        </div>
        <p className="text-xs text-[hsl(var(--neon-igreja))]">Saldo Caixa permanece histórico</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={Wallet} label="Saldo Caixa • Histórico" value={data.saldoCaixa} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={Users} label="Dizimistas" value={data.dizimistas} iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={ArrowUp} label={filters.month === 'all' ? 'Entradas • Ano' : 'Entradas • Mês'} value={data.entradasMes} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={ArrowDown} label={filters.month === 'all' ? 'Despesas • Ano' : 'Despesas • Mês'} value={data.despesasMes} isCurrency iconColor="orange" className="w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={CalendarClock} label="Despesas Previstas" value={data.despesasPrevistasMes} isCurrency iconColor="orange" className="w-full" />
        <KPICard colorScheme="igreja" icon={TrendingUp} label="Saldo do Período" value={data.saldoMes} isCurrency iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={Wallet} label="Saldo Projetado" value={data.saldoProjetado} isCurrency iconColor={data.saldoProjetado >= 0 ? 'gold' : 'orange'} className="w-full" />
        <NeonCard colorScheme="igreja" className="flex flex-col justify-center p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Comprometimento da Receita</p>
          <p className={`text-2xl font-bold mt-1 ${data.comprometimento >= 80 ? 'text-destructive' : 'text-[hsl(var(--neon-igreja))]'}`}>{data.comprometimento.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Despesas em relação às entradas</p>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="igreja" className="p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Entradas por Tipo</h3>
          {data.entradasTipo.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[hsl(var(--neon-igreja)/0.2)]">
                  <th className="text-left py-3 text-xs uppercase tracking-wide text-muted-foreground">Tipo</th>
                  <th className="text-right py-3 text-xs uppercase tracking-wide text-muted-foreground">Valor</th>
                </tr></thead>
                <tbody>{data.entradasTipo.map((i, n) => (
                  <tr key={`${i.tipo}-${n}`} className="border-b border-border/40">
                    <td className="py-3">{i.tipo}</td>
                    <td className="py-3 text-right font-semibold text-[hsl(var(--neon-igreja))]">{fmt(i.valor)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma entrada registrada no período.</div>}
        </NeonCard>

        <NeonCard colorScheme="igreja" className="p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Top Dizimistas</h3>
          {data.topDizimistas.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[hsl(var(--neon-igreja)/0.2)]">
                  <th className="text-left py-3 text-xs uppercase tracking-wide text-muted-foreground">Membro</th>
                  <th className="text-right py-3 text-xs uppercase tracking-wide text-muted-foreground">Valor</th>
                </tr></thead>
                <tbody>{data.topDizimistas.map((i, n) => (
                  <tr key={`${i.nome}-${n}`} className="border-b border-border/40">
                    <td className="py-3">{i.nome}</td>
                    <td className="py-3 text-right font-semibold text-[hsl(var(--neon-igreja))]">{fmt(i.valor)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="py-8 text-center text-sm text-muted-foreground">Nenhum dízimo identificado no período.</div>}
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="igreja" className="h-[320px] md:h-[380px] overflow-hidden p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Entradas Mês a Mês ({filters.year})</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.entradasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} />
              <Tooltip formatter={v => [fmt(v), 'Entradas']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} />
              <Line type="monotone" dataKey="Entradas" stroke="hsl(var(--neon-igreja))" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="igreja" className="h-[320px] md:h-[380px] overflow-hidden p-5">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Despesas Mês a Mês ({filters.year})</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.despesasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} />
              <Tooltip formatter={v => [fmt(v), 'Despesas']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} />
              <Line type="monotone" dataKey="Despesas" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--destructive))' }} />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>

      <NeonCard colorScheme="igreja" className="h-[320px] md:h-[380px] overflow-hidden p-5">
        <h3 className="text-lg md:text-xl font-semibold mb-4">Despesas Previstas x Realizadas ({filters.year})</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data.previstoChart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={48} fontSize={11} />
            <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} />
            <Legend />
            <Bar dataKey="Previsto" name="Previsto" fill="hsl(var(--neon-igreja))" radius={[4,4,0,0]} opacity={0.5} />
            <Bar dataKey="Realizado" name="Realizado" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </NeonCard>

      <NeonCard colorScheme="igreja" className="p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Atenção da Tesouraria</h3>
            <p className="text-xs text-muted-foreground mt-1">Indicadores do período selecionado</p>
          </div>
          <span className="shrink-0 rounded-full bg-[hsl(var(--neon-igreja)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--neon-igreja))]">
            {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
          </span>
        </div>

        {alertas.length ? (
          <div className="space-y-3">
            {alertas.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--neon-igreja)/0.25)] bg-background/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-destructive">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-igreja)/0.1)] text-[hsl(var(--neon-igreja))]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="font-medium mt-3">Tesouraria sem alertas</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma situação de atenção foi identificada.</p>
          </div>
        )}
      </NeonCard>
    </div>
  );
}
