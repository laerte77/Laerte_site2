import React, { useState, useEffect } from 'react';
import {Wallet,TrendingUp,ArrowUp,ArrowDown,Heart,AlertTriangle,CheckCircle2} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
export default function PessoalDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [data, setData] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0, saldoPeriodo: 0, savings: 0, totalDizimosOfertas: 0, monthlyChart: [], trendChart: [], pieChart: [], budgetProgress: [], movimentacoesRecentes: []
});

  useEffect(() => {
  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const year = selectedYear;
        const startOfYear = new Date(year, 0, 1, 0, 0, 0).toISOString();
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

        const [recRes,despRes,aportesRes,despesasPrevRes,dizimosRes,allTimeRecRes,allTimeDespRes,allTimeAportesRes,allTimeDizimosRes] = await Promise.all([
          
  getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'data, valor, receita, origem')
    .gte('data', startOfYear)
    .lte('data', endOfYear),

  getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'data, valor, despesa, categoria')
    .gte('data', startOfYear)
    .lte('data', endOfYear),

  getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'data, valor')
    .gte('data', startOfYear)
    .lte('data', endOfYear),

  getAccessibleDataQuery(user.id, isAdmin, 'despesas_previstas', 'data_vencimento, valor')
    .gte('data_vencimento', startOfYear)
    .lte('data_vencimento', endOfYear),

  getAccessibleDataQuery(user.id, isAdmin, 'pessoal_dizimos_ofertas', 'data, valor, tipo_movimento')
    .gte('data', startOfYear)
    .lte('data', endOfYear),

  getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'valor'),

  getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'valor'),

  getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'valor'),

  getAccessibleDataQuery(user.id, isAdmin, 'pessoal_dizimos_ofertas', 'valor'),
]);

const queryErrors = [
  recRes.error,
  despRes.error,
  aportesRes.error,
  despesasPrevRes.error,
  dizimosRes.error,
  allTimeRecRes.error,
  allTimeDespRes.error,
  allTimeAportesRes.error,
  allTimeDizimosRes.error
].filter(Boolean);

if (queryErrors.length > 0) {
  throw new Error(
    queryErrors[0]?.message || 'Não foi possível carregar os dados financeiros.'
  );
}

        const receitas = recRes.data || [];
        const despesas = despRes.data || [];
        const aportes = aportesRes.data || [];
        const despesasPrevistas = despesasPrevRes.data || [];
        const dizimos = dizimosRes.data || [];
        const receitasFiltradas = selectedMonth === 'all'
          ? receitas
          : receitas.filter((r) => getMonthFromDate(r.data) === Number(selectedMonth));

        const despesasFiltradas = selectedMonth === 'all'
          ? despesas
          : despesas.filter((d) => getMonthFromDate(d.data) === Number(selectedMonth));
      
        const aportesFiltrados = selectedMonth === 'all'
          ? aportes
          : aportes.filter((a) => getMonthFromDate(a.data) === Number(selectedMonth));

      const dizimosFiltrados = selectedMonth === 'all'
          ? dizimos
          : dizimos.filter((d) => getMonthFromDate(d.data) === Number(selectedMonth));

        const despesasPrevistasFiltradas = selectedMonth === 'all'
          ? despesasPrevistas
          : despesasPrevistas.filter(
      (d) => getMonthFromDate(d.data_vencimento) === Number(selectedMonth)
    );
    
        const totalIncome = receitasFiltradas.reduce((a, b) => a + Number(b.valor), 0);
        const totalExpenses = despesasFiltradas.reduce((a, b) => a + Number(b.valor), 0);
        const savings = aportesFiltrados.reduce((a, b) => a + Number(b.valor), 0);

        const totalDizimosOfertasPeriodo = dizimosFiltrados.reduce(
  (a, b) => a + Number(b.valor),
  0
);

const saldoPeriodo =
  totalIncome -
  totalExpenses -
  savings -
  totalDizimosOfertasPeriodo;

const totalReceitasAtual = (allTimeRecRes.data || []).reduce(
  (a, b) => a + Number(b.valor),
  0
);

const totalDespesasAtual = (allTimeDespRes.data || []).reduce(
  (a, b) => a + Number(b.valor),
  0
);

const totalAportesAtual = (allTimeAportesRes.data || []).reduce(
  (a, b) => a + Number(b.valor),
  0
);

const totalDizimosAtual = (allTimeDizimosRes.data || []).reduce(
  (a, b) => a + Number(b.valor),
  0
);

const saldoAtual =
  totalReceitasAtual -
  totalDespesasAtual -
  totalAportesAtual -
  totalDizimosAtual;

        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

        const chartMonths = selectedMonth === 'all'
          ? months
          : [months[Number(selectedMonth)]];

        const monthlyData = chartMonths.map(m => ({
          name: m,
          Receita: 0,
          Despesa: 0
        }));

        const trendData = chartMonths.map(m => ({
          name: m,
          Saldo: 0
        }));

        receitasFiltradas.forEach(r => {
         const mIdx = getMonthFromDate(r.data);
         const chartIndex = selectedMonth === 'all' ? mIdx : 0;

        monthlyData[chartIndex].Receita += Number(r.valor);
        trendData[chartIndex].Saldo += Number(r.valor);
        });

        despesasFiltradas.forEach(d => {
          const mIdx = getMonthFromDate(d.data);
          const chartIndex = selectedMonth === 'all' ? mIdx : 0;

  monthlyData[chartIndex].Despesa += Number(d.valor);
  trendData[chartIndex].Saldo -= Number(d.valor);
});

aportesFiltrados.forEach(a => {
  const mIdx = getMonthFromDate(a.data);
  const chartIndex = selectedMonth === 'all' ? mIdx : 0;

  trendData[chartIndex].Saldo -= Number(a.valor);
});

let acc = 0;

      dizimosFiltrados.forEach(d => {
  const mIdx = getMonthFromDate(d.data);
  const chartIndex = selectedMonth === 'all' ? mIdx : 0;

  trendData[chartIndex].Saldo -= Number(d.valor);
});
        trendData.forEach(t => { acc += t.Saldo; t.Saldo = acc; });
        const catMap = {};
        despesasFiltradas.forEach(d => {
          const cat = d.categoria || 'Diversos';
          catMap[cat] = (catMap[cat] || 0) + Number(d.valor);
        });
        const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

        const budgetProgress = selectedMonth === 'all'
  ? [0, 1, 2, 3].map((quarter) => {
      const startMonth = quarter * 3;
      const endMonth = startMonth + 2;

      const orcamento = despesasPrevistas
        .filter((d) => {
          const month = getMonthFromDate(d.data_vencimento);
          return month >= startMonth && month <= endMonth;
        })
        .reduce((total, d) => total + Number(d.valor || 0), 0);

      const gasto = despesas
        .filter((d) => {
          const month = getMonthFromDate(d.data);
          return month >= startMonth && month <= endMonth;
        })
        .reduce((total, d) => total + Number(d.valor || 0), 0);

      return {
        name: `Q${quarter + 1}`,
        Orcamento: orcamento,
        Gasto: gasto
      };
    })
  : [{
      name: months[Number(selectedMonth)],
      Orcamento: despesasPrevistasFiltradas.reduce(
        (total, d) => total + Number(d.valor || 0),
        0
      ),
      Gasto: despesasFiltradas.reduce(
        (total, d) => total + Number(d.valor || 0),
        0
      )
    }];
setData({ totalIncome, totalExpenses, balance: saldoAtual, saldoPeriodo, savings, 
  totalDizimosOfertas: totalDizimosOfertasPeriodo,
  monthlyChart: monthlyData,
  trendChart: trendData,
  pieChart: pieData,
  budgetProgress,
  movimentacoesRecentes: [
  ...receitasFiltradas.map((item) => ({
    tipo: 'receita',
    descricao: item.origem || item.receita || 'Receita',
    categoria: item.receita || 'Receita',
    valor: Number(item.valor || 0),
    data: item.data
  })),

  ...despesasFiltradas.map((item) => ({
  tipo: 'despesa',
  descricao: item.despesa || 'Despesa',
  categoria: item.categoria || 'Diversos',
  valor: Number(item.valor || 0),
  data: item.data
})),

...aportesFiltrados.map((item) => ({
  tipo: 'aporte',
  descricao: 'Aporte',
  categoria: 'Investimento',
  valor: Number(item.valor || 0),
  data: item.data
}))

  ,

...dizimosFiltrados.map((item) => ({
  tipo: 'dizimo',
  descricao: item.tipo_movimento || 'Dízimo/Oferta',
  categoria: 'Dízimos/Ofertas',
  valor: Number(item.valor || 0),
  data: item.data
}))
]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 6)
});
      } catch (err) {
  console.error('Erro ao carregar dashboard Pessoal:', err);
  setError(err?.message || 'Não foi possível carregar os dados.');
} finally {
  setLoading(false);
}
    };
    fetchData();
  }, [user, isAdmin, selectedYear, selectedMonth]);

  const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(v);
const fmtAxis = (value) => {
  const num = Number(value || 0);

  if (Math.abs(num) >= 1000) {
    return `R$${(num / 1000).toFixed(1)}k`;
  }

  return `R$${num.toFixed(0)}`;
};
  const getMonthFromDate = (date) => {
  if (!date) return -1;

  const dateString = String(date);

  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return Number(dateString.slice(5, 7)) - 1;
  }

  return new Date(date).getMonth();
};
const pieColors = [
  'hsl(var(--neon-blue))',
  'hsl(var(--neon-blue) / 0.8)',
  'hsl(var(--neon-blue) / 0.65)',
  'hsl(var(--neon-blue) / 0.5)',
  'hsl(var(--neon-blue) / 0.35)'
];

const monthNames = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
];
  const alertasFinanceiros = [];

const totalSaidasPeriodo =
  data.totalExpenses +
  data.savings +
  data.totalDizimosOfertas;

if (data.totalIncome > 0 && totalSaidasPeriodo > data.totalIncome) {
  alertasFinanceiros.push({
    tipo: 'danger',
    icone: AlertTriangle,
    titulo: 'Saídas acima das receitas',
    descricao: 'As saídas totais do período ultrapassaram o total de receitas.'
  });
}

if (data.totalIncome > 0 && (totalSaidasPeriodo / data.totalIncome) >= 0.8) {
  alertasFinanceiros.push({
    tipo: 'warning',
    icone: AlertTriangle,
    titulo: 'Alto comprometimento da receita',
    descricao: 'As saídas totais representam 80% ou mais das receitas do período.'
  });
}

if (data.saldoPeriodo < 0) {
  alertasFinanceiros.push({
    tipo: 'danger',
    icone: AlertTriangle,
    titulo: 'Saldo do período negativo',
    descricao: 'O resultado do período ficou negativo após despesas, aportes e dízimos/ofertas.'
  });
}
}
  if (loading) {
  return (
    <div className="p-8 text-center text-muted-foreground animate-pulse">
      Atualizando painel Pessoal...
    </div>
  );
}

if (error) {
  return (
    <div className="p-8">
      <NeonCard colorScheme="pessoal" className="p-6 text-center">
        <p className="font-semibold text-destructive">
          Não foi possível carregar o painel.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error}
        </p>
      </NeonCard>
    </div>
  );
}

  return (
  <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">
        Painel Pessoal
        </h1>

        <div className="h-1 w-16 rounded-full bg-[hsl(var(--neon-pessoal))] mt-3 mx-auto md:mx-0" />

<p className="text-sm text-muted-foreground text-center md:text-left mt-1">
  Acompanhe sua movimentação financeira
</p>

<p className="text-xs font-medium text-[hsl(var(--neon-blue))] text-center md:text-left mt-2">
  {selectedMonth === 'all'
    ? `Visão anual • ${selectedYear}`
    : `Visão mensal • ${monthNames[Number(selectedMonth)]} de ${selectedYear}`}
</p>

      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        <div className="flex flex-col gap-1 w-full sm:w-36">
          <label className="text-xs font-medium text-muted-foreground">
            Ano
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-10 rounded-lg border border-[hsl(var(--neon-pessoal))/50] bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-[hsl(var(--neon-pessoal))] focus:ring-2 focus:ring-[hsl(var(--neon-pessoal))/20]"
          >
            {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-40">
          <label className="text-xs font-medium text-muted-foreground">
            Período
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 rounded-lg border border-[hsl(var(--neon-pessoal))/50] bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-[hsl(var(--neon-pessoal))] focus:ring-2 focus:ring-[hsl(var(--neon-pessoal))/20]"
          >
            <option value="all">Todos os meses</option>
            <option value="0">Janeiro</option>
            <option value="1">Fevereiro</option>
            <option value="2">Março</option>
            <option value="3">Abril</option>
            <option value="4">Maio</option>
            <option value="5">Junho</option>
            <option value="6">Julho</option>
            <option value="7">Agosto</option>
            <option value="8">Setembro</option>
            <option value="9">Outubro</option>
            <option value="10">Novembro</option>
            <option value="11">Dezembro</option>
          </select>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
  <KPICard
  colorScheme="pessoal"
  icon={ArrowUp}
  label="Total Receitas"
  value={data.totalIncome}
  isCurrency
  iconColor="blue"
  className="w-full"
/>

  <KPICard
  colorScheme="pessoal"
  icon={ArrowDown}
  label="Total Despesas"
  value={data.totalExpenses}
  isCurrency
  iconColor="red"
  className="w-full"
/>

  <KPICard
  colorScheme="pessoal"
  icon={Wallet}
  label="Saldo atual • Histórico"
  value={data.balance}
  isCurrency
  iconColor={data.balance >= 0 ? "blue" : "red"}
  className={`w-full ${data.balance < 0 ? 'border-destructive/40' : ''}`}
/>

  <KPICard
    colorScheme="pessoal"
    icon={TrendingUp}
    label="Economias"
    value={data.savings}
    isCurrency
    iconColor="blue"
    className="w-full"
  />
</div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  <NeonCard colorScheme="pessoal" className="p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      Saldo do período
    </p>
    <p className="text-xl font-bold mt-1">
      {fmt(data.saldoPeriodo)}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Entradas menos saídas, aportes e dízimos/ofertas
    </p>
  </NeonCard>

  <NeonCard colorScheme="pessoal" className="p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      Taxa de aportes
    </p>
    <p className="text-xl font-bold mt-1">
      {data.totalIncome > 0
      ? `${((data.savings / data.totalIncome) * 100).toFixed(1)}%`
      : '0,0%'}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
     Aportes em relação às receitas
    </p>
  </NeonCard>

  <NeonCard colorScheme="pessoal" className="p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      Período analisado
    </p>
    <p className="text-xl font-bold mt-1">
  {selectedMonth === 'all'
    ? `Ano ${selectedYear}`
    : `${monthNames[Number(selectedMonth)]} • ${selectedYear}`}
</p>

<p className="text-xs text-muted-foreground mt-1">
  Dados financeiros do período selecionado
</p>
  </NeonCard>
        <NeonCard colorScheme="pessoal" className="p-4">
  <p className="text-xs uppercase tracking-wide text-muted-foreground">
    Comprometimento da receita total
  </p>

  <p className="text-xl font-bold mt-1">
    {data.totalIncome > 0
    ? `${((totalSaidasPeriodo / data.totalIncome) * 100).toFixed(1)}%`
    : '0,0%'}
  </p>

  <p className="text-xs text-muted-foreground mt-1">
    Saídas totais em relação às receitas
  </p>
</NeonCard>
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
  <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[400px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
  {selectedMonth === 'all'
    ? `Receitas vs Despesas • ${selectedYear}`
    : `Receitas vs Despesas • ${monthNames[Number(selectedMonth)]} ${selectedYear}`}
</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip
              cursor={{ fill: 'hsl(var(--accent)/0.1)' }}
              formatter={(value) => fmt(value)}
              contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '10px'
              }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Receita" fill="hsl(var(--neon-blue))" radius={[4,4,0,0]} />
              <Bar dataKey="Despesa" fill="hsl(var(--neon-red))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[400px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
          {selectedMonth === 'all'
          ? `Resultado acumulado do período • ${selectedYear}`
          : `Resultado do período • ${monthNames[Number(selectedMonth)]} ${selectedYear}`}
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.trendChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip formatter={(value) => [fmt(value), 'Resultado acumulado']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px'}} />
              <Line type="monotone" dataKey="Saldo" name="Saldo acumulado no período" stroke="hsl(var(--neon-blue))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--neon-blue))" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[350px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
        {selectedMonth === 'all'
          ? `Despesas por Categoria • ${selectedYear}`
          : `Despesas por Categoria • ${monthNames[Number(selectedMonth)]} ${selectedYear}`}
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            {data.pieChart.length > 0 ? (
              <PieChart>
                <Pie data={data.pieChart} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={5}>
                  {data.pieChart.map((e, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip cursor={{ fill: 'hsl(var(--accent)/0.1)' }}formatter= {(value) => fmt(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px'}} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
           ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-blue)/0.1)] text-[hsl(var(--neon-blue))]">
            <Wallet className="h-5 w-5" />
            </div>

            <p className="font-medium mt-3">
              Nenhuma despesa encontrada
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Não existem despesas registradas no período selecionado.
            </p>
          </div>
          )}
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[350px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
          {selectedMonth === 'all'
            ? 'Orçamento x Realizado por Trimestre'
           : `Orçamento x Realizado • ${monthNames[Number(selectedMonth)]} ${selectedYear}`
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.budgetProgress}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip cursor={{ fill: 'hsl(var(--accent)/0.1)' }} formatter={(value) => fmt(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px'}}/>
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Orcamento" name="Previsto" fill="hsl(var(--neon-blue))" radius={[4,4,0,0]} opacity={0.5}
              />

             <Bar dataKey="Gasto" name="Realizado" fill="hsl(var(--neon-red))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6">
  <NeonCard colorScheme="pessoal" className="p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold">
          Movimentações recentes
        </h3>

        <div className="inline-flex items-center rounded-full border border-[hsl(var(--neon-pessoal))/25] bg-[hsl(var(--neon-pessoal))/10] px-2.5 py-1 mt-2">
        <span className="text-xs font-semibold text-[hsl(var(--neon-blue))]">
         {data.movimentacoesRecentes.length} movimentação
        {data.movimentacoesRecentes.length !== 1 ? 'ões' : ''}
      </span>
      </div>
        <p className="text-xs text-muted-foreground mt-1">
          Últimos lançamentos do período selecionado
        </p>
      </div>
    </div>

    {data.movimentacoesRecentes.length > 0 ? (
      <div className="space-y-3">
        {data.movimentacoesRecentes.map((item, index) => (
          <div
          key={`${item.tipo}-${item.data}-${index}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--neon-pessoal))/25] bg-background/30 p-3 transition-colors hover:bg-[hsl(var(--neon-pessoal))/5]"
          >
  <div
  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
    item.tipo === 'receita'
      ? 'bg-[hsl(var(--neon-blue)/0.12)] text-[hsl(var(--neon-blue))]'
      : item.tipo === 'despesa'
        ? 'bg-destructive/10 text-destructive'
        : item.tipo === 'aporte'
          ? 'bg-purple-500/10 text-purple-400'
          : 'bg-yellow-500/10 text-yellow-400'
  }`}
>
  {item.tipo === 'receita' ? (
    <ArrowUp className="h-4 w-4" />
  ) : item.tipo === 'despesa' ? (
    <ArrowDown className="h-4 w-4" />
  ) : item.tipo === 'aporte' ? (
    <TrendingUp className="h-4 w-4" />
  ) : (
    <Heart className="h-4 w-4" />
  )}
</div>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {item.descricao}
              </p>

              <p className="text-xs text-muted-foreground">
                {item.categoria} •{' '}
                {String(item.data).slice(0, 10).split('-').reverse().join('/')}
              </p>
            </div>

            <span
              className={`font-semibold whitespace-nowrap ${
              item.tipo === 'receita'
              ? 'text-[hsl(var(--neon-blue))]'
              : item.tipo === 'despesa'
              ? 'text-destructive'
              : item.tipo === 'aporte'
              ? 'text-purple-400'
              : 'text-yellow-400'
            }`}
              >
  {item.tipo === 'receita' ? '+' : '-'} {fmt(item.valor)}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center text-center py-8">
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-blue)/0.1)] text-[hsl(var(--neon-blue))]">
    <ArrowUp className="h-5 w-5" />
  </div>

  <p className="font-medium mt-3">
    Nenhuma movimentação encontrada
  </p>

  <p className="text-xs text-muted-foreground mt-1">
    Não existem receitas, despesas, aportes ou dízimos/ofertas registrados neste período.
  </p>
</div>
    )}
  </NeonCard>
</div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 mt-4 md:mt-6">
  <NeonCard colorScheme="pessoal" className="p-5 overflow-hidden">
    <div className="flex items-start justify-between gap-3 mb-4">
  <div>
    <h3 className="text-lg font-semibold">
      Indicadores financeiros
    </h3>

    <p className="text-xs text-muted-foreground mt-1">
      Indicadores identificados no período selecionado
    </p>
  </div>

  <span className="shrink-0 rounded-full bg-[hsl(var(--neon-blue)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--neon-blue))]">
    {alertasFinanceiros.length}{' '}
    {alertasFinanceiros.length === 1 ? 'indicador' : 'indicadores'}
  </span>
</div>

    <div className="space-y-3">
    {alertasFinanceiros.length > 0 ? (
    alertasFinanceiros.map((alerta, index) => {
  const Icon = alerta.icone;

  return (
    <div
      key={`${alerta.tipo}-${index}`}
      className="flex items-start gap-3 rounded-xl border border-[hsl(var(--neon-pessoal))/25] bg-background/30 p-3"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          alerta.tipo === 'danger'
            ? 'bg-destructive/10 text-destructive'
            : alerta.tipo === 'warning'
              ? 'bg-[hsl(var(--neon-orange)/0.1)] text-[hsl(var(--neon-orange))]'
              : 'bg-[hsl(var(--neon-blue)/0.1)] text-[hsl(var(--neon-blue))]'
        }`}
      >
        {Icon && <Icon className="h-4 w-4" />}
      </div>

      <div className="min-w-0">
        <p
          className={`font-medium ${
            alerta.tipo === 'danger'
              ? 'text-destructive'
              : alerta.tipo === 'warning'
                ? 'text-[hsl(var(--neon-orange))]'
                : 'text-[hsl(var(--neon-blue))]'
          }`}
        >
          {alerta.titulo}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {alerta.descricao}
        </p>
      </div>
    </div>
  );
    })
  ) : (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-blue)/0.1)] text-[hsl(var(--neon-blue))]">
        <CheckCircle2 className="h-5 w-5" />
      </div>

      <p className="font-medium mt-3">
        Nenhum alerta financeiro
      </p>

      <p className="text-xs text-muted-foreground mt-1">
        Não foram identificados indicadores de atenção no período selecionado.
      </p>
    </div>
  )}
    </div>
  </NeonCard>
           </div>
    </div>
  );
}
