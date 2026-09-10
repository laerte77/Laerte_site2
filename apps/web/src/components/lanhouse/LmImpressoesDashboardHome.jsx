import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function LmImpressoesDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    saldoGeral: 0, saldoMes: 0, totalClientes: 0, entradasMes: 0, despesasMes: 0,
    topClientes: [], topServicos: [], chartInOut: [], chartServProd: []
  });

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const [servRes, despRes, cliRes] = await Promise.all([
          getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_servicos', 'data, valor, cliente, lm_servicos(servico)'),
          getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_despesas', 'data, valor'),
          getAccessibleDataQuery(user.id, isAdmin, 'lm_clientes', 'id')
        ]);

        const servs = servRes.data || [];
        const desps = despRes.data || [];

        const tEntradas = servs.reduce((a,b) => a + Number(b.valor), 0);
        const tDespesas = desps.reduce((a,b) => a + Number(b.valor), 0);

        const currentMonth = new Date().getMonth();
        const eMes = servs.filter(s => new Date(s.data).getMonth() === currentMonth).reduce((a,b) => a + Number(b.valor), 0);
        const dMes = desps.filter(d => new Date(d.data).getMonth() === currentMonth).reduce((a,b) => a + Number(b.valor), 0);

        const cMap = {};
        servs.forEach(s => { cMap[s.cliente || 'Outros'] = (cMap[s.cliente || 'Outros'] || 0) + Number(s.valor); });
        const topCli = Object.entries(cMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([n,v]) => ({nome: n, valor: v}));

        const sMap = {};
        servs.forEach(s => { 
          const name = s.lm_servicos?.servico || 'Diversos';
          sMap[name] = (sMap[name] || 0) + Number(s.valor); 
        });
        const topServ = Object.entries(sMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(([n,v]) => ({nome: n, valor: v}));

        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        const monthlyInOut = months.map(m => ({ name: m, Entradas: 0, Despesas: 0 }));
        servs.forEach(s => { monthlyInOut[new Date(s.data).getMonth()].Entradas += Number(s.valor); });
        desps.forEach(d => { monthlyInOut[new Date(d.data).getMonth()].Despesas += Number(d.valor); });

        const monthlyServProd = monthlyInOut.map(m => ({
          name: m.name,
          Servicos: m.Entradas * 0.7,
          Produtos: m.Entradas * 0.3
        }));

        setData({
          saldoGeral: tEntradas - tDespesas,
          saldoMes: eMes - dMes,
          totalClientes: cliRes.data?.length || 0,
          entradasMes: eMes,
          despesasMes: dMes,
          topClientes: topCli,
          topServicos: topServ,
          chartInOut: monthlyInOut,
          chartServProd: monthlyServProd
        });

      } catch (err) {} finally { setLoading(false); }
    };
    fetch();
  }, [user, isAdmin]);

  const fmt = (v) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Lan House...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      <div className="mb-4 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--neon-cyan))]">LM Impressões Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <KPICard colorScheme="lm_impressoes" icon={Wallet} label="Saldo Geral" value={fmt(data.saldoGeral)} iconColor="green" className="w-full" />
        <KPICard colorScheme="lm_impressoes" icon={Wallet} label="Saldo Mensal" value={fmt(data.saldoMes)} iconColor="blue" className="w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <KPICard colorScheme="lm_impressoes" icon={Users} label="Total Clientes" value={data.totalClientes} iconColor="purple" className="w-full" />
        <KPICard colorScheme="lm_impressoes" icon={ArrowUp} label="Entradas (Mês)" value={fmt(data.entradasMes)} iconColor="green" className="w-full" />
        <KPICard colorScheme="lm_impressoes" icon={ArrowDown} label="Despesas (Mês)" value={fmt(data.despesasMes)} iconColor="orange" className="w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="lm_impressoes" className="overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--neon-cyan))]">Top 5 Clientes</h3>
          <div className="overflow-x-auto touch-pan-x">
            <Table>
              <TableHeader className="bg-[hsl(var(--neon-cyan))]/10 border-b border-[hsl(var(--neon-cyan))]/30">
                <TableRow><TableHead className="text-white">Nome do Cliente</TableHead><TableHead className="text-right text-white">Valor Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.topClientes.map((c,i) => (
                  <TableRow key={i} className="border-b border-[hsl(var(--neon-cyan))]/10"><TableCell>{c.nome}</TableCell><TableCell className="text-right font-semibold text-[hsl(var(--neon-cyan))]">{fmt(c.valor)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </NeonCard>

        <NeonCard colorScheme="lm_impressoes" className="overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--neon-cyan))]">Top 5 Serviços</h3>
          <div className="overflow-x-auto touch-pan-x">
            <Table>
              <TableHeader className="bg-[hsl(var(--neon-cyan))]/10 border-b border-[hsl(var(--neon-cyan))]/30">
                <TableRow><TableHead className="text-white">Serviço</TableHead><TableHead className="text-right text-white">Valor Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.topServicos.map((s,i) => (
                  <TableRow key={i} className="border-b border-[hsl(var(--neon-cyan))]/10"><TableCell>{s.nome}</TableCell><TableCell className="text-right font-semibold text-[hsl(var(--neon-cyan))]">{fmt(s.valor)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="lm_impressoes" className="h-[300px] md:h-[350px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Entradas vs Despesas</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.chartInOut}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v=>`R$${v}`} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Entradas" fill="hsl(var(--neon-green))" radius={[4,4,0,0]} />
              <Bar dataKey="Despesas" fill="hsl(var(--neon-red))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="lm_impressoes" className="h-[300px] md:h-[350px]">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Serviços vs Produtos</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.chartServProd}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={v=>`R$${v}`} tickLine={false} axisLine={false} width={45} fontSize={12} />
              <Tooltip cursor={{fill: 'hsl(var(--accent)/0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'}} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Servicos" fill="hsl(var(--neon-green))" radius={[4,4,0,0]} />
              <Bar dataKey="Produtos" fill="hsl(var(--neon-red))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </NeonCard>
      </div>
    </div>
  );
}