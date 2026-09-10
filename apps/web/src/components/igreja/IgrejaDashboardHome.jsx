import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function IgrejaDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    saldoCaixa: 0, dizimistas: 0, entradasMes: 0, despesasMes: 0,
    entradasTipo: [], topDizimistas: [], entradasChart: [], despesasChart: []
  });

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const year = 2026;
        const startOfYear = new Date(year, 0, 1).toISOString();
        const endOfYear = new Date(year, 11, 31).toISOString();

        const [entRes, despRes, dizRes] = await Promise.all([
          getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data, valor, tipo_entrada, igreja_dizimistas(nome)').gte('data', startOfYear).lte('data', endOfYear),
          getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'data, valor').gte('data', startOfYear).lte('data', endOfYear),
          getAccessibleDataQuery(user.id, isAdmin, 'igreja_dizimistas', 'id')
        ]);

        const entradas = entRes.data || [];
        const despesas = despRes.data || [];

        const tEntradas = entradas.reduce((a,b) => a + Number(b.valor), 0);
        const tDespesas = despesas.reduce((a,b) => a + Number(b.valor), 0);

        const currentMonth = new Date().getMonth();
        const eMes = entradas.filter(e => new Date(e.data).getMonth() === currentMonth).reduce((a,b) => a + Number(b.valor), 0);
        const dMes = despesas.filter(d => new Date(d.data).getMonth() === currentMonth).reduce((a,b) => a + Number(b.valor), 0);

        const tMap = {};
        entradas.forEach(e => { tMap[e.tipo_entrada || 'Outro'] = (tMap[e.tipo_entrada || 'Outro'] || 0) + Number(e.valor); });
        const eTipo = Object.entries(tMap).map(([n,v]) => ({tipo: n, valor: v})).sort((a,b) => b.valor - a.valor);

        const dMap = {};
        entradas.forEach(e => {
          if(e.igreja_dizimistas?.nome) {
            dMap[e.igreja_dizimistas.nome] = (dMap[e.igreja_dizimistas.nome] || 0) + Number(e.valor);
          }
        });
        const topDiz = Object.entries(dMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([n,v]) => ({nome: n, valor: v}));

        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        const eChart = months.map(m => ({ name: m, Entradas: 0 }));
        const dChart = months.map(m => ({ name: m, Despesas: 0 }));
        entradas.forEach(e => { eChart[new Date(e.data).getMonth()].Entradas += Number(e.valor); });
        despesas.forEach(d => { dChart[new Date(d.data).getMonth()].Despesas += Number(d.valor); });

        setData({
          saldoCaixa: tEntradas - tDespesas,
          dizimistas: dizRes.data?.length || 0,
          entradasMes: eMes,
          despesasMes: dMes,
          entradasTipo: eTipo,
          topDizimistas: topDiz,
          entradasChart: eChart,
          despesasChart: dChart
        });
      } catch (err) {} finally { setLoading(false); }
    };
    fetch();
  }, [user, isAdmin]);

  const fmt = (v) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Igreja...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-[hsl(var(--neon-gold))] mb-8">Painel da Igreja</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard colorScheme="igreja" icon={Wallet} label="Saldo Caixa" value={fmt(data.saldoCaixa)} iconColor="blue" />
        <KPICard colorScheme="igreja" icon={Users} label="Dizimistas Ativos" value={data.dizimistas} iconColor="purple" />
        <KPICard colorScheme="igreja" icon={ArrowUp} label="Entradas Mês" value={fmt(data.entradasMes)} iconColor="green" />
        <KPICard colorScheme="igreja" icon={ArrowDown} label="Despesas Mês" value={fmt(data.despesasMes)} iconColor="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard colorScheme="igreja">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--neon-gold))]">Entradas por Tipo</h3>
          <Table>
            <TableHeader className="bg-[hsl(var(--neon-gold))]/10">
              <TableRow><TableHead className="text-white">Tipo de Entrada</TableHead><TableHead className="text-right text-white">Valor Arrecadado</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.entradasTipo.map((t,i) => (
                <TableRow key={i} className="border-b border-[hsl(var(--neon-gold))]/10"><TableCell>{t.tipo}</TableCell><TableCell className="text-right font-semibold text-[hsl(var(--neon-gold))]">{fmt(t.valor)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </NeonCard>

        <NeonCard colorScheme="igreja">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--neon-gold))]">Top Dizimistas</h3>
          <Table>
            <TableHeader className="bg-[hsl(var(--neon-gold))]/10">
              <TableRow><TableHead className="text-white">Nome do Membro</TableHead><TableHead className="text-right text-white">Valor Contribuído</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.topDizimistas.map((d,i) => (
                <TableRow key={i} className="border-b border-[hsl(var(--neon-gold))]/10"><TableCell>{d.nome}</TableCell><TableCell className="text-right font-semibold text-[hsl(var(--neon-gold))]">{fmt(d.valor)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard colorScheme="igreja" className="h-[350px]">
          <h3 className="text-lg font-semibold mb-4">Entradas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.entradasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v=>`R$${v}`} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend />
              <Bar dataKey="Entradas" fill="hsl(var(--neon-gold))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="igreja" className="h-[350px]">
          <h3 className="text-lg font-semibold mb-4">Despesas Mês a Mês</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.despesasChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v=>`R$${v}`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend />
              <Line type="monotone" dataKey="Despesas" stroke="hsl(var(--neon-red))" strokeWidth={3} dot={{r: 4, fill: "hsl(var(--neon-red))"}} />
            </LineChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>
    </div>
  );
}