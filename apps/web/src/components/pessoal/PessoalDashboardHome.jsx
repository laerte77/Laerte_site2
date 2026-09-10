import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell 
} from 'recharts';

export default function PessoalDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalIncome: 0, totalExpenses: 0, balance: 0, savings: 0,
    monthlyChart: [], trendChart: [], pieChart: [], budgetProgress: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const year = 2026;
        const startOfYear = new Date(year, 0, 1).toISOString();
        const endOfYear = new Date(year, 11, 31).toISOString();

        const [recRes, despRes, aportesRes] = await Promise.all([
          getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'data, valor').gte('data', startOfYear).lte('data', endOfYear),
          getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'data, valor, categoria').gte('data', startOfYear).lte('data', endOfYear),
          getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'valor').gte('data', startOfYear).lte('data', endOfYear),
        ]);

        const receitas = recRes.data || [];
        const despesas = despRes.data || [];
        
        const totalIncome = receitas.reduce((a, b) => a + Number(b.valor), 0);
        const totalExpenses = despesas.reduce((a, b) => a + Number(b.valor), 0);
        const savings = aportesRes.data?.reduce((a, b) => a + Number(b.valor), 0) || 0;

        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        const monthlyData = months.map(m => ({ name: m, Receita: 0, Despesa: 0 }));
        const trendData = months.map(m => ({ name: m, Saldo: 0 }));

        receitas.forEach(r => { 
          const mIdx = new Date(r.data).getMonth();
          monthlyData[mIdx].Receita += Number(r.valor); 
          trendData[mIdx].Saldo += Number(r.valor);
        });
        despesas.forEach(d => { 
          const mIdx = new Date(d.data).getMonth();
          monthlyData[mIdx].Despesa += Number(d.valor); 
          trendData[mIdx].Saldo -= Number(d.valor);
        });

        let acc = 0;
        trendData.forEach(t => { acc += t.Saldo; t.Saldo = acc; });

        const catMap = {};
        despesas.forEach(d => {
          const cat = d.categoria || 'Diversos';
          catMap[cat] = (catMap[cat] || 0) + Number(d.valor);
        });
        const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

        const budgetProgress = [
          { name: "Q1", Orcamento: 15000, Gasto: monthlyData.slice(0,3).reduce((a,b)=>a+b.Despesa,0) },
          { name: "Q2", Orcamento: 15000, Gasto: monthlyData.slice(3,6).reduce((a,b)=>a+b.Despesa,0) },
          { name: "Q3", Orcamento: 15000, Gasto: monthlyData.slice(6,9).reduce((a,b)=>a+b.Despesa,0) },
          { name: "Q4", Orcamento: 15000, Gasto: monthlyData.slice(9,12).reduce((a,b)=>a+b.Despesa,0) }
        ];

        setData({
          totalIncome, totalExpenses, balance: totalIncome - totalExpenses, savings,
          monthlyChart: monthlyData, trendChart: trendData, pieChart: pieData, budgetProgress
        });
      } catch (err) {} finally { setLoading(false); }
    };
    fetchData();
  }, [user, isAdmin]);

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const pieColors = ['hsl(var(--neon-gold))', 'hsl(var(--neon-orange))', 'hsl(var(--neon-blue))', 'hsl(var(--neon-purple))', 'hsl(var(--neon-cyan))'];

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Pessoal...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-center md:text-left">Painel Pessoal</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard colorScheme="pessoal" icon={ArrowUp} label="Total Receitas" value={fmt(data.totalIncome)} iconColor="blue" className="w-full" />
        <KPICard colorScheme="pessoal" icon={ArrowDown} label="Total Despesas" value={fmt(data.totalExpenses)} iconColor="purple" className="w-full" />
        <KPICard colorScheme="pessoal" icon={Wallet} label="Saldo Atual" value={fmt(data.balance)} iconColor="blue" className="w-full" />
        <KPICard colorScheme="pessoal" icon={TrendingUp} label="Economias" value={fmt(data.savings)} iconColor="orange" className="w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[400px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Receita vs Despesa</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v/1000}k`} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Receita" fill="hsl(var(--neon-blue))" radius={[4,4,0,0]} />
              <Bar dataKey="Despesa" fill="hsl(var(--neon-red))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[400px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.trendChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v/1000}k`} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Line type="monotone" dataKey="Saldo" stroke="hsl(var(--neon-blue))" strokeWidth={3} dot={{r: 4, fill: "hsl(var(--neon-blue))"}} />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[350px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height="85%">
            {data.pieChart.length > 0 ? (
              <PieChart>
                <Pie data={data.pieChart} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={5}>
                  {data.pieChart.map((e, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            ) : <p className="text-center text-muted-foreground pt-10">Sem dados.</p>}
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="pessoal" className="h-[300px] md:h-[350px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Progresso do Orçamento (Trimestre)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.budgetProgress}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v/1000}k`} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Orcamento" fill="hsl(var(--neon-blue))" radius={[4,4,0,0]} opacity={0.5} />
              <Bar dataKey="Gasto" fill="hsl(var(--neon-blue))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>
    </div>
  );
}