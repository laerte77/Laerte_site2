import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, TrendingUp, PiggyBank, Banknote, Landmark, Coins as HandCoins, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NeonBorder from '@/components/ui/NeonBorder';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, valueColorClass, neonColor = 'pessoal' }) => (
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
                        {typeof value === 'number' ? <AnimatedCounter value={value} format={(v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /> : value}
                    </p>
                    {subtitle && <p className="text-[12px] md:text-[14px] text-muted-foreground mt-1 font-medium">{subtitle}</p>}
                </div>
            </div>
        </div>
    </NeonBorder>
);

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

const DashboardHome = () => {
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ receitaMes: 0, despesaMes: 0, receitaTotal: 0, saldoCaixa: 0, totalInvestido: 0, rendimentoMes: 0 });
    const [chartData, setChartData] = useState([]);
    const [dizimosChartData, setDizimosChartData] = useState([]);
    const [investmentChartData, setInvestmentChartData] = useState([]);
    const [investmentByBank, setInvestmentByBank] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const firstDayOfYear = new Date(selectedYear, 0, 1);
        const lastDayOfYear = new Date(selectedYear, 11, 31);
        try {
            const [receitasMesRes, despesasMesRes, aportesMesRes, rendimentosMesRes, receitasAnoRes, despesasAnoRes, aportesAnoRes, dizimosAnoRes, allTimeReceitasRes, allTimeDespesasRes, allTimeAportesRes, allTimeDizimosRes] = await Promise.all([
                getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'valor').gte('data', firstDayOfMonth.toISOString()).lte('data', lastDayOfMonth.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'valor').gte('data', firstDayOfMonth.toISOString()).lte('data', lastDayOfMonth.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'valor').gte('data', firstDayOfMonth.toISOString()).lte('data', lastDayOfMonth.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'rendimentos', 'rendimento_liquido').gte('data', firstDayOfMonth.toISOString()).lte('data', lastDayOfMonth.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'data, valor').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'data, valor').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'data, valor, banco').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'pessoal_dizimos_ofertas', 'data, valor').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString()),
                getAccessibleDataQuery(user.id, isAdmin, 'receitas', 'valor'),
                getAccessibleDataQuery(user.id, isAdmin, 'despesas', 'valor'),
                getAccessibleDataQuery(user.id, isAdmin, 'aportes', 'valor'),
                getAccessibleDataQuery(user.id, isAdmin, 'pessoal_dizimos_ofertas', 'valor'),
            ]);
            const receitaMes = (receitasMesRes.data || []).reduce((acc, r) => acc + parseFloat(r.valor), 0);
            const despesaMes = (despesasMesRes.data || []).reduce((acc, d) => acc + parseFloat(d.valor), 0);
            const rendimentoMes = (rendimentosMesRes.data || []).reduce((acc, r) => acc + parseFloat(r.rendimento_liquido), 0);
            const totalReceitaAno = (receitasAnoRes.data || []).reduce((acc, r) => acc + parseFloat(r.valor), 0);
            const totalAportesAno = (aportesAnoRes.data || []).reduce((acc, a) => acc + parseFloat(a.valor), 0);
            const allTimeReceita = (allTimeReceitasRes.data || []).reduce((acc, r) => acc + parseFloat(r.valor), 0);
            const allTimeDespesa = (allTimeDespesasRes.data || []).reduce((acc, d) => acc + parseFloat(d.valor), 0);
            const allTimeAportes = (allTimeAportesRes.data || []).reduce((acc, a) => acc + parseFloat(a.valor), 0);
            const allTimeDizimos = (allTimeDizimosRes.data || []).reduce((acc, d) => acc + parseFloat(d.valor), 0);
            const saldoCaixaAllTime = allTimeReceita - allTimeDespesa - allTimeAportes - allTimeDizimos;
            const rendimentosAnoRes = await getAccessibleDataQuery(user.id, isAdmin, 'rendimentos', 'rendimento_liquido').gte('data', firstDayOfYear.toISOString()).lte('data', lastDayOfYear.toISOString());
            const totalRendimentosAno = (rendimentosAnoRes.data || []).reduce((acc, r) => acc + parseFloat(r.rendimento_liquido), 0);
            setStats({ receitaMes, despesaMes, rendimentoMes, receitaTotal: totalReceitaAno, totalInvestido: totalAportesAno + totalRendimentosAno, saldoCaixa: saldoCaixaAllTime });
            const processDataForChart = (data, key) => {
                const monthlyData = {};
                data.forEach(item => {
                    const itemDate = new Date(item.data);
                    if (itemDate.getFullYear() === selectedYear) {
                        const month = itemDate.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).toUpperCase().replace('.', '');
                        if (!monthlyData[month]) monthlyData[month] = 0;
                        monthlyData[month] += parseFloat(item[key]);
                    }
                });
                return monthlyData;
            };
            const monthlyRevenues = processDataForChart(receitasAnoRes.data, 'valor');
            const monthlyExpenses = processDataForChart(despesasAnoRes.data, 'valor');
            const monthlyInvestments = processDataForChart(aportesAnoRes.data, 'valor');
            const monthlyDizimos = processDataForChart(dizimosAnoRes.data, 'valor');
            const monthOrder = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
            setChartData(monthOrder.map(month => ({ name: month, Receita: monthlyRevenues[month] || 0, Despesa: monthlyExpenses[month] || 0 })));
            setInvestmentChartData(monthOrder.map(month => ({ name: month, Investimento: monthlyInvestments[month] || 0 })));
            setDizimosChartData(monthOrder.map(month => ({ name: month, 'Dízimos/Ofertas': monthlyDizimos[month] || 0 })));
            const bankInvestments = (aportesAnoRes.data || []).reduce((acc, a) => { acc[a.banco] = (acc[a.banco] || 0) + parseFloat(a.valor); return acc; }, {});
            setInvestmentByBank(Object.entries(bankInvestments).map(([name, value]) => ({ name, value })));
        } catch (error) { toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' }); } finally { setLoading(false); }
    }, [user, isAdmin, selectedYear, selectedMonth, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);
    const COLORS = { 'NUBANK': 'hsl(var(--secondary))', 'WILL BANK': 'hsl(var(--accent))', 'DEFAULT': 'hsl(var(--primary))' };

    const containerVariants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    
    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (loading) return <div className="text-center p-12 text-muted-foreground animate-pulse">Carregando dashboard...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--neon-pessoal))]/10 flex items-center justify-center glow-pessoal">
                        <Wallet className="w-6 h-6 text-[hsl(var(--neon-pessoal))]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--neon-pessoal))] to-blue-400 tracking-tight">Pessoal</h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">Resumo financeiro e estatísticas pessoais</p>
                    </div>
                </div>
                <div className="flex gap-3 glass-card p-2 rounded-xl">
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-[140px] bg-background border-none shadow-none font-medium text-sm"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent className="dark-pessoal"><ScrollArea className="h-48">{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                    <div className="w-px bg-border my-2"></div>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[120px] bg-background border-none shadow-none font-medium text-sm"><SelectValue placeholder="Ano" /></SelectTrigger>
                        <SelectContent className="dark-pessoal">{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <motion.div variants={itemVariants} className="h-full"><StatCard icon={Banknote} title="Saldo em Caixa" value={stats.saldoCaixa} subtitle="Saldo geral disponível" colorClass={stats.saldoCaixa >= 0 ? "from-blue-500 to-blue-400" : "from-red-500 to-red-400"} valueColorClass={stats.saldoCaixa >= 0 ? "text-blue-500" : "text-red-500"}/></motion.div>
                <motion.div variants={itemVariants} className="h-full"><StatCard icon={Landmark} title={`Investido (${selectedYear})`} value={stats.totalInvestido} subtitle="Aportes + Rendimentos" colorClass="from-purple-500 to-purple-400" /></motion.div>
                <motion.div variants={itemVariants} className="h-full"><StatCard icon={DollarSign} title="Receitas (Mês)" value={stats.receitaMes} subtitle="Total de entradas no mês" colorClass="from-blue-500 to-blue-400" /></motion.div>
                <motion.div variants={itemVariants} className="h-full"><StatCard icon={CreditCard} title="Despesas (Mês)" value={stats.despesaMes} subtitle="Total de saídas no mês" colorClass="from-orange-500 to-orange-400" /></motion.div>
            </motion.div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="pessoal" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4"><CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-[hsl(var(--neon-pessoal))]" />Receita vs Despesa ({selectedYear})</CardTitle></CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v/1000}k`} tickLine={false} axisLine={false} fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} cursor={{fill: 'hsl(var(--accent)/0.1)'}} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Receita" fill="hsl(var(--neon-pessoal))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </NeonBorder>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="pessoal" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4"><CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center"><Landmark className="w-5 h-5 mr-2 text-[hsl(var(--neon-pessoal))]" />Investimentos ({selectedYear})</CardTitle></CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={investmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v/1000}k`} tickLine={false} axisLine={false} fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} cursor={{fill: 'hsl(var(--accent)/0.1)'}} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Investimento" fill="hsl(var(--neon-pessoal))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </NeonBorder>
                </motion.div>
            </motion.div>
            
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="pessoal" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4"><CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center"><HandCoins className="w-5 h-5 mr-2 text-yellow-500" />Dízimos e Ofertas ({selectedYear})</CardTitle></CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dizimosChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `R$${value/1000}k`} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} cursor={{fill: 'hsl(var(--accent)/0.1)'}} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Dízimos/Ofertas" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </NeonBorder>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="pessoal" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4"><CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center"><PieChart className="w-5 h-5 mr-2 text-purple-500" />Distribuição de Investimentos ({selectedYear})</CardTitle></CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            {investmentByBank.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={investmentByBank} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={2} label={false}>
                                            {investmentByBank.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name.toUpperCase()] || COLORS['DEFAULT']} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum investimento no período.</div>
                            )}
                        </CardContent>
                    </NeonBorder>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};
export default DashboardHome;