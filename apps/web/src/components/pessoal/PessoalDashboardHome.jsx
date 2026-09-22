import { useEffect, useMemo, useState } from 'react';
import {
  Wallet, TrendingUp, ArrowUp, ArrowDown, Heart,
  AlertTriangle, CheckCircle2, PiggyBank
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import NeonCard from '@/components/ui/NeonCard';
import KPICard from '@/components/ui/KPICard';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const meses = ['Todos', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesNome = m => meses[Number(m)] || '';
const valor = v => Number(v) || 0;
const dataMes = d => new Date(`${d}T12:00:00`).getMonth() + 1;
const dataAno = d => new Date(`${d}T12:00:00`).getFullYear();

export default function PessoalDashboardHome() {
  const { user, isAdmin } = useAuth();
  const hoje = new Date();
  const [selectedYear, setSelectedYear] = useState(hoje.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(hoje.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    receitas: [], despesas: [], aportes: [], previstas: [], dizimos: [],
    receitasAll: [], despesasAll: [], aportesAll: [], dizimosAll: []
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError('');
      const ini = `${selectedYear}-01-01`, fim = `${selectedYear + 1}-01-01`;

      try {
        const q = await Promise.all([
          getAccessibleDataQuery(user?.id, isAdmin, 'receitas').gte('data', ini).lt('data', fim),
          getAccessibleDataQuery(user?.id, isAdmin, 'despesas').gte('data', ini).lt('data', fim),
          getAccessibleDataQuery(user?.id, isAdmin, 'aportes').gte('data', ini).lt('data', fim),
          getAccessibleDataQuery(user?.id, isAdmin, 'despesas_previstas').gte('data_vencimento', ini).lt('data_vencimento', fim),
          getAccessibleDataQuery(user?.id, isAdmin, 'pessoal_dizimos_ofertas').gte('data', ini).lt('data', fim),
          getAccessibleDataQuery(user?.id, isAdmin, 'receitas', 'valor'),
          getAccessibleDataQuery(user?.id, isAdmin, 'despesas', 'valor'),
          getAccessibleDataQuery(user?.id, isAdmin, 'aportes', 'valor'),
          getAccessibleDataQuery(user?.id, isAdmin, 'pessoal_dizimos_ofertas', 'valor')
        ]);

        const err = q.find(x => x.error)?.error;
        if (err) throw err;

        setData({
          receitas: q[0].data || [], despesas: q[1].data || [], aportes: q[2].data || [],
          previstas: q[3].data || [], dizimos: q[4].data || [],
          receitasAll: q[5].data || [], despesasAll: q[6].data || [],
          aportesAll: q[7].data || [], dizimosAll: q[8].data || []
        });
      } catch (e) {
        setError(e.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedYear, user?.id, isAdmin]);

  const filtrar = useMemo(() => a =>
    a.filter(x => selectedMonth === 0 || dataMes(x.data || x.data_vencimento) === Number(selectedMonth)), [selectedMonth]);

  const receitas = filtrar(data.receitas);
  const despesas = filtrar(data.despesas);
  const aportes = filtrar(data.aportes);
  const dizimos = filtrar(data.dizimos);
  const previstas = filtrar(data.previstas);

  const totalReceitas = receitas.reduce((s, x) => s + valor(x.valor), 0);
  const totalDespesas = despesas.reduce((s, x) => s + valor(x.valor), 0);
  const economias = aportes.reduce((s, x) => s + valor(x.valor), 0);
  const totalDizimos = dizimos.reduce((s, x) => s + valor(x.valor), 0);

  const saldoPeriodo = totalReceitas - totalDespesas - economias - totalDizimos;
  const saldoAtual =
    data.receitasAll.reduce((s, x) => s + valor(x.valor), 0) -
    data.despesasAll.reduce((s, x) => s + valor(x.valor), 0) -
    data.aportesAll.reduce((s, x) => s + valor(x.valor), 0) -
    data.dizimosAll.reduce((s, x) => s + valor(x.valor), 0);

  const totalPrevistas = previstas.reduce((s, x) => s + valor(x.valor), 0);
  const compromisso = totalPrevistas ? Math.min((totalDespesas / totalPrevistas) * 100, 100) : 0;

  const categorias = useMemo(() => {
    const map = {};
    despesas.forEach(x => {
      const nome = x.categoria || x.tipo || 'Outros';
      map[nome] = (map[nome] || 0) + valor(x.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [despesas]);

  const anual = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const r = data.receitas.filter(x => dataMes(x.data) === i + 1).reduce((s, x) => s + valor(x.valor), 0);
    const d = data.despesas.filter(x => dataMes(x.data) === i + 1).reduce((s, x) => s + valor(x.valor), 0);
    const a = data.aportes.filter(x => dataMes(x.data) === i + 1).reduce((s, x) => s + valor(x.valor), 0);
    const z = data.dizimos.filter(x => dataMes(x.data) === i + 1).reduce((s, x) => s + valor(x.valor), 0);
    return { name: meses[i + 1].slice(0, 3), receitas: r, despesas: d, resultado: r - d - a - z };
  }), [data]);

  const chartData = selectedMonth === 0
    ? anual
    : [{ name: mesNome(selectedMonth).slice(0, 3), receitas: totalReceitas, despesas: totalDespesas, resultado: saldoPeriodo }];

  const movimentacoes = useMemo(() => [
    ...receitas.map(x => ({ data: x.data, titulo: x.descricao || x.nome || 'Receita', valor: valor(x.valor), tipo: 'entrada', Icon: ArrowUp })),
    ...despesas.map(x => ({ data: x.data, titulo: x.descricao || x.nome || 'Despesa', valor: valor(x.valor), tipo: 'saida', Icon: ArrowDown })),
    ...aportes.map(x => ({ data: x.data, titulo: x.descricao || 'Aporte', valor: valor(x.valor), tipo: 'aporte', Icon: PiggyBank })),
    ...dizimos.map(x => ({ data: x.data, titulo: x.descricao || 'Dízimo/Oferta', valor: valor(x.valor), tipo: 'dizimo', Icon: Heart }))
  ].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6), [receitas, despesas, aportes, dizimos]);

  const alertas = useMemo(() => {
    const a = [];
    if (saldoPeriodo < 0) a.push({ icon: AlertTriangle, text: 'O saldo do período está negativo.' });
    if (totalDespesas > totalReceitas && totalReceitas > 0) a.push({ icon: AlertTriangle, text: 'As despesas superaram as receitas.' });
    if (totalPrevistas > 0 && totalDespesas > totalPrevistas) a.push({ icon: AlertTriangle, text: 'As despesas ultrapassaram o previsto.' });
    if (!a.length) a.push({ icon: CheckCircle2, text: 'Nenhum alerta financeiro no período.' });
    return a;
  }, [saldoPeriodo, totalDespesas, totalReceitas, totalPrevistas]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando dashboard...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div className="relative p-2 md:p-3 space-y-5 md:space-y-6 w-full overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--neon-pessoal)/0.10)] blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--neon-pessoal))]">Pessoal</p>
          <h1 className="text-2xl md:text-3xl font-bold">Visão financeira</h1>
          <p className="text-sm text-muted-foreground">
            {selectedMonth === 0 ? selectedYear : `${mesNome(selectedMonth)} de ${selectedYear}`}
          </p>
        </div>

        <div className="flex gap-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="h-10 px-3 rounded-lg bg-background/70 border border-border text-sm">
            {meses.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="h-10 px-3 rounded-lg bg-background/70 border border-border text-sm">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <NeonCard className="p-5 xl:col-span-1 bg-gradient-to-br from-[hsl(var(--neon-pessoal)/0.16)] to-background">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo atual · histórico</p>
              <h2 className={`text-3xl font-bold mt-2 ${saldoAtual >= 0 ? 'text-[hsl(var(--neon-pessoal))]' : 'text-destructive'}`}>
                {BRL.format(saldoAtual)}
              </h2>
              <p className="text-xs text-muted-foreground mt-2">Todos os lançamentos registrados</p>
            </div>
            <div className="p-3 rounded-xl bg-[hsl(var(--neon-pessoal)/0.12)]">
              <Wallet className="w-6 h-6 text-[hsl(var(--neon-pessoal))]" />
            </div>
          </div>
        </NeonCard>

        <div className="xl:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Receitas" value={totalReceitas} icon={ArrowUp} iconColor="pessoal" isCurrency />
          <KPICard label="Despesas" value={totalDespesas} icon={ArrowDown} iconColor="pessoal" isCurrency />
          <KPICard label="Saldo do período" value={saldoPeriodo} icon={TrendingUp} iconColor="pessoal" isCurrency />
          <KPICard label="Economias" value={economias} icon={PiggyBank} iconColor="pessoal" isCurrency />
        </div>
      </div>

      <NeonCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Compromissos financeiros</h3>
            <p className="text-xs text-muted-foreground">{BRL.format(totalDespesas)} de {BRL.format(totalPrevistas)} previstos</p>
          </div>
          <span className="text-sm font-semibold text-[hsl(var(--neon-pessoal))]">{compromisso.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-[hsl(var(--neon-pessoal))]" style={{ width: `${compromisso}%` }} />
        </div>
      </NeonCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <NeonCard className="p-4">
          <h3 className="font-semibold mb-4">Receitas x despesas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `R$ ${v}`} />
                <Tooltip formatter={v => BRL.format(Number(v) || 0)} />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--neon-pessoal))" radius={[5,5,0,0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        <NeonCard className="p-4">
          <h3 className="font-semibold mb-4">Resultado acumulado</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `R$ ${v}`} />
                <Tooltip formatter={v => BRL.format(Number(v) || 0)} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(var(--neon-pessoal))" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        <NeonCard className="p-4">
          <h3 className="font-semibold mb-4">Despesas por categoria</h3>
          <div className="h-72">
            {categorias.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorias} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {categorias.map((_, i) => <Cell key={i} fill={i % 2 ? 'hsl(var(--neon-blue))' : 'hsl(var(--neon-pessoal))'} />)}
                  </Pie>
                  <Tooltip formatter={v => BRL.format(Number(v) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem despesas no período.</div>}
          </div>
        </NeonCard>

        <NeonCard className="p-4">
          <h3 className="font-semibold mb-4">Previsto x realizado</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: selectedMonth === 0 ? selectedYear : mesNome(selectedMonth), previsto: totalPrevistas, realizado: totalDespesas }]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `R$ ${v}`} />
                <Tooltip formatter={v => BRL.format(Number(v) || 0)} />
                <Bar dataKey="previsto" name="Previsto" fill="hsl(var(--neon-blue))" radius={[5,5,0,0]} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--neon-orange))" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <NeonCard className="p-4 xl:col-span-2">
          <h3 className="font-semibold mb-4">Movimentações recentes</h3>
          <div className="space-y-2">
            {movimentacoes.length ? movimentacoes.map((m, i) => {
              const Icon = m.Icon;
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[hsl(var(--neon-pessoal)/0.10)]">
                      <Icon className="w-4 h-4 text-[hsl(var(--neon-pessoal))]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${m.tipo === 'entrada' ? 'text-[hsl(var(--neon-pessoal))]' : 'text-destructive'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'} {BRL.format(m.valor)}
                  </span>
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>}
          </div>
        </NeonCard>

        <NeonCard className="p-4">
          <h3 className="font-semibold mb-4">Atenção</h3>
          <div className="space-y-3">
            {alertas.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-background/50 border border-border/60">
                  <Icon className={`w-5 h-5 mt-0.5 ${i === 0 && saldoPeriodo < 0 ? 'text-destructive' : 'text-[hsl(var(--neon-pessoal))]'}`} />
                  <p className="text-sm text-muted-foreground">{a.text}</p>
                </div>
              );
            })}
          </div>
        </NeonCard>
          </div>
        </div>
  );
}
