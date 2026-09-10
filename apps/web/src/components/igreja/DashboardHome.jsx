import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Users, PieChart, Award, BarChartHorizontal, Wallet, PiggyBank, List, Church } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid, LineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import NeonBorder from '@/components/ui/NeonBorder';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import DividaPrevistaVsPago from '@/components/igreja/tesouraria/relatorios/DividaPrevistaVsPago';
import { supabase } from '@/lib/customSupabaseClient';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-md p-3 border border-border rounded-lg shadow-xl text-[13px]">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p, index) => (
          <p key={index} style={{ color: p.color }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
            {`${p.name}: ${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const mesesAbreviados = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, valueColorClass, neonColor = 'igreja' }) => (
    <NeonBorder neonColor={neonColor} className="h-full">
        <div className="p-6 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br blur-2xl pointer-events-none" style={{ backgroundImage: `var(--${colorClass})` }} />
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${colorClass} shadow-lg shrink-0`}>
                    <Icon className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[14px] md:text-[16px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5 leading-tight">{title}</p>
                    <p className={`text-[28px] md:text-[32px] font-bold tracking-tight leading-none ${valueColorClass || 'text-foreground'}`}>
                        {typeof value === 'number' && title !== 'Dizimistas' ? <AnimatedCounter value={value} format={(v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /> : <AnimatedCounter value={value} />}
                    </p>
                    {subtitle && <p className="text-[12px] md:text-[14px] text-muted-foreground mt-1 font-medium">{subtitle}</p>}
                </div>
            </div>
        </div>
    </NeonBorder>
);

const DashboardHome = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEntradas: 0, totalDespesas: 0, saldo: 0, dizimistasCadastrados: 0, dizimistasAtivos: 0,
    entradasPorTipo: [], topDizimistas: [], topDespesas: [], entradasAnual: [], despesasAnual: [],
    entradasPorTipoTabela: []
  });

  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  const fetchData = useCallback(async (year, month) => {
    if (!user) return;
    
    const today = new Date();
    const threeMonthsAgoDate = new Date();
    threeMonthsAgoDate.setMonth(today.getMonth() - 3);
    threeMonthsAgoDate.setHours(0, 0, 0, 0);
    const threeMonthsAgoISO = threeMonthsAgoDate.toISOString();

    try {
      const { data: allEntradas } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'valor');
      const { data: allDespesas } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'valor');

      const totalEntradasGlobal = (allEntradas || []).reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);
      const totalDespesasGlobal = (allDespesas || []).reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);
      const saldoGlobal = totalEntradasGlobal - totalDespesasGlobal;

      let startDate, endDate;
      if (month === "all") {
        startDate = new Date(Date.UTC(year, 0, 1));
        endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      } else {
        startDate = new Date(Date.UTC(year, month, 1));
        endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
      }

      const { data: entradasPeriodo } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'valor, tipo_entrada, dizimista_id').gte('data', startDate.toISOString()).lte('data', endDate.toISOString());
      const { data: despesasPeriodo } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'valor, despesa').gte('data', startDate.toISOString()).lte('data', endDate.toISOString());

      const totalEntradasPeriodo = (entradasPeriodo || []).reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);
      const totalDespesasPeriodo = (despesasPeriodo || []).reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

      // Fix for Dizimistas counting: use supabase directly for reliable counts
      const { count: dizimistasCadastrados } = await supabase
        .from('igreja_dizimistas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: dizimosAtivosData } = await supabase
        .from('igreja_entradas')
        .select('dizimista_id')
        .eq('user_id', user.id)
        .not('dizimista_id', 'is', null)
        .gte('data', threeMonthsAgoISO);
        
      const dizimistasAtivos = new Set((dizimosAtivosData || []).map(d => d.dizimista_id)).size;

      const entradasPorTipoMap = (entradasPeriodo || []).reduce((acc, { tipo_entrada, valor }) => {
        const tipo = tipo_entrada ? tipo_entrada.toUpperCase() : 'OUTROS';
        acc[tipo] = (acc[tipo] || 0) + (Number(valor) || 0);
        return acc;
      }, {});
      
      const entradasPorTipoChart = Object.entries(entradasPorTipoMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      
      const predefinedTypes = ['OFERTA', 'DÍZIMO', 'VOTO', 'CANTINA'];
      const entradasPorTipoTabela = predefinedTypes.map(tipo => ({
          tipo,
          valor: entradasPorTipoMap[tipo] || 0
      })).filter(t => t.valor > 0);
      
      const outrosValor = Object.entries(entradasPorTipoMap)
          .filter(([k,v]) => !predefinedTypes.includes(k))
          .reduce((sum, [k,v]) => sum + v, 0);
          
      if (outrosValor > 0) {
          entradasPorTipoTabela.push({ tipo: 'OUTROS', valor: outrosValor });
      }

      const { data: topDizimistasData } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'dizimista_id, valor, igreja_dizimistas(nome)').not('dizimista_id', 'is', null).eq('tipo_entrada', 'DÍZIMO').gte('data', threeMonthsAgoISO);

      const dizimistasAgrupados = (topDizimistasData || []).reduce((acc, curr) => {
        const id = curr.dizimista_id;
        if (!acc[id]) acc[id] = { name: curr.igreja_dizimistas?.nome || 'Desconhecido', value: 0 };
        acc[id].value += (Number(curr.valor) || 0);
        return acc;
      }, {});

      const topDizimistas = Object.values(dizimistasAgrupados).sort((a, b) => b.value - a.value).slice(0, 5);

      const { data: topDespesasData } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'valor, despesa').gte('data', threeMonthsAgoISO);

      const despesasAgrupadas = (topDespesasData || []).reduce((acc, curr) => {
        const nome = curr.despesa || 'Outras';
        acc[nome] = (acc[nome] || 0) + (Number(curr.valor) || 0);
        return acc;
      }, {});

      const topDespesas = Object.entries(despesasAgrupadas).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

      const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
      const lastDayOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      const { data: entradasAno } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data, valor').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString());
      const { data: despesasAno } = await getAccessibleDataQuery(user.id, isAdmin, 'igreja_despesas', 'data, valor').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString());

      const entradasAnual = mesesAbreviados.map(mes => ({ name: mes, Entradas: 0 }));
      (entradasAno || []).forEach(item => { const mesIndex = new Date(item.data).getUTCMonth(); entradasAnual[mesIndex].Entradas += (Number(item.valor) || 0); });
      const despesasAnual = mesesAbreviados.map(mes => ({ name: mes, Despesas: 0 }));
      (despesasAno || []).forEach(item => { const mesIndex = new Date(item.data).getUTCMonth(); despesasAnual[mesIndex].Despesas += (Number(item.valor) || 0); });

      setStats({ 
        totalEntradas: totalEntradasPeriodo, totalDespesas: totalDespesasPeriodo, saldo: saldoGlobal, 
        dizimistasCadastrados: dizimistasCadastrados || 0, dizimistasAtivos, entradasPorTipo: entradasPorTipoChart, topDizimistas, topDespesas, 
        entradasAnual, despesasAnual, entradasPorTipoTabela
      });

    } catch (error) {
      toast({ title: "Erro ao buscar dados", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, toast]);

  useEffect(() => { fetchData(filters.year, filters.month); }, [fetchData, filters]);
  
  const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) return <div className="flex items-center justify-center h-96 text-[14px] text-muted-foreground animate-pulse">Carregando dados...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 dark-igreja pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-6">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--neon-igreja))]/10 flex items-center justify-center glow-igreja">
                  <Church className="w-6 h-6 text-[hsl(var(--neon-igreja))]" />
              </div>
              <div>
                  <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--neon-igreja))] to-yellow-200 tracking-tight">
                      Igreja
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm md:text-base">Visão geral financeira e membros</p>
              </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap glass-card p-2 rounded-xl">
              <Select value={String(filters.month)} onValueChange={v => setFilters(prev => ({ ...prev, month: v === "all" ? "all" : Number(v) }))}>
                  <SelectTrigger className="bg-transparent border-none shadow-none focus:ring-0 w-[140px] font-medium text-sm"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent className="dark-igreja"><ScrollArea className="h-[200px]"><SelectItem value="all">Todos</SelectItem>{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent>
              </Select>
              <div className="w-px h-6 bg-border mx-1"></div>
              <Select value={String(filters.year)} onValueChange={v => setFilters(prev => ({ ...prev, year: Number(v) }))}>
                  <SelectTrigger className="bg-transparent border-none shadow-none focus:ring-0 w-[100px] font-medium text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark-igreja"><ScrollArea className="h-[200px]">{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</ScrollArea></SelectContent>
              </Select>
          </div>
      </div>
      
      {/* 4 Main Metric Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div variants={itemVariants} className="h-full">
            <StatCard 
                title="Saldo em Caixa (Geral)" 
                value={stats.saldo} 
                subtitle="Acumulado histórico"
                icon={Wallet} 
                colorClass={stats.saldo >= 0 ? "from-blue-500 to-cyan-400" : "from-red-500 to-red-400"} 
                valueColorClass={stats.saldo >= 0 ? "text-blue-500" : "text-red-500"} 
            />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
            <StatCard 
                title="Dizimistas" 
                value={stats.dizimistasCadastrados} 
                subtitle={`${stats.dizimistasAtivos} ativos (3M)`}
                icon={Users} 
                colorClass="from-purple-500 to-purple-400" 
            />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
            <StatCard 
                title={filters.month === "all" ? "Entradas (Ano)" : "Entradas (Mês)"} 
                value={stats.totalEntradas} 
                subtitle="Total arrecadado"
                icon={DollarSign} 
                colorClass="from-emerald-500 to-emerald-400" 
            />
        </motion.div>
        <motion.div variants={itemVariants} className="h-full">
            <StatCard 
                title={filters.month === "all" ? "Despesas (Ano)" : "Despesas (Mês)"} 
                value={stats.totalDespesas} 
                subtitle="Total gasto"
                icon={TrendingDown} 
                colorClass="from-orange-500 to-red-400" 
            />
        </motion.div>
      </motion.div>

      {/* Dívida Prevista vs Total Pago Section */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="pt-2">
        <motion.div variants={itemVariants}>
            <DividaPrevistaVsPago year={filters.year} month={filters.month} />
        </motion.div>
      </motion.div>

      {/* Intermediate Section (2 Cards) */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <motion.div variants={itemVariants}>
            <NeonBorder neonColor="igreja" className="overflow-hidden h-full">
                <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                    <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                        <List className="w-5 h-5 mr-2 text-[hsl(var(--neon-igreja))]" />
                        Entrada Por Tipo (Filtro)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                     <Table>
                        <TableHeader>
                            <TableRow className="border-border/30 hover:bg-transparent">
                                <TableHead className="py-3 pl-6 text-muted-foreground font-semibold text-[12px] md:text-[14px]">Tipo</TableHead>
                                <TableHead className="py-3 pr-6 text-right text-muted-foreground font-semibold text-[12px] md:text-[14px]">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.entradasPorTipoTabela.length > 0 ? stats.entradasPorTipoTabela.map((t, i) => (
                                <TableRow key={i}>
                                    <TableCell className="py-3 pl-6 font-medium text-[13px] md:text-[15px]">{t.tipo}</TableCell>
                                    <TableCell className="py-3 pr-6 text-right text-emerald-500 font-bold text-[13px] md:text-[15px]">{formatCurrency(t.valor)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={2} className="text-center py-6 text-[13px] text-muted-foreground">Nenhum dado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </NeonBorder>
        </motion.div>

        <motion.div variants={itemVariants}>
            <NeonBorder neonColor="igreja" className="overflow-hidden h-full">
                <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                    <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                        <Award className="w-5 h-5 mr-2 text-yellow-500" />
                        Top 5 Dizimistas (3 Meses)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/30 hover:bg-transparent">
                                <TableHead className="py-3 pl-6 text-muted-foreground font-semibold text-[12px] md:text-[14px]">Nome do Membro</TableHead>
                                <TableHead className="py-3 pr-6 text-right text-muted-foreground font-semibold text-[12px] md:text-[14px]">Valor Contribuído</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.topDizimistas.length > 0 ? stats.topDizimistas.map((d, i) => (
                                <TableRow key={i}>
                                    <TableCell className="py-3 pl-6 font-medium text-[13px] md:text-[15px]">{d.name}</TableCell>
                                    <TableCell className="py-3 pr-6 text-right text-[hsl(var(--neon-igreja))] font-bold text-[13px] md:text-[15px]">{formatCurrency(d.value)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={2} className="text-center py-6 text-[13px] text-muted-foreground">Sem dízimos recentes.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </NeonBorder>
        </motion.div>
      </motion.div>

      {/* Bottom Section (2 Cards) */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <motion.div variants={itemVariants}>
            <NeonBorder neonColor="igreja" className="overflow-hidden h-full">
                <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                    <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-[hsl(var(--neon-igreja))]" />
                        Entradas Mês a Mês ({filters.year})
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.entradasAnual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="Entradas" stroke="hsl(var(--neon-igreja))" strokeWidth={4} dot={{ r: 5, fill: "hsl(var(--neon-igreja))", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 7 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </NeonBorder>
        </motion.div>
        
        <motion.div variants={itemVariants}>
            <NeonBorder neonColor="igreja" className="overflow-hidden h-full">
                <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                    <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                        <TrendingDown className="w-5 h-5 mr-2 text-rose-500" />
                        Despesas Mês a Mês ({filters.year})
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.despesasAnual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="Despesas" stroke="#f43f5e" strokeWidth={4} dot={{ r: 5, fill: "#f43f5e", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 7 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </NeonBorder>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardHome;