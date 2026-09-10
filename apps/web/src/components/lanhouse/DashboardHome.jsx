import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, Users, Banknote, Loader2, CheckCircle2, Church, PieChart as PieChartIcon, Printer } from 'lucide-react';
import { format, getMonth, getYear, subMonths, startOfDay } from 'date-fns';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SaldoEmCaixaGeral from './relatorios/SaldoEmCaixaGeral';
import NeonBorder from '@/components/ui/NeonBorder';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CURRENT_DATE = new Date();
const PIE_COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, valueColorClass, neonColor = 'lanhouse' }) => (
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

const DashboardHome = () => {
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    
    const [selectedMonth, setSelectedMonth] = useState(CURRENT_DATE.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(CURRENT_DATE.getFullYear().toString());
    
    const [rawServicos, setRawServicos] = useState([]);
    const [rawDespesas, setRawDespesas] = useState([]);
    const [rawClientes, setRawClientes] = useState([]);
    const [rawDizimos, setRawDizimos] = useState([]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const servicosRes = await getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_servicos', 'data, valor, cliente_id, cliente, lm_servicos(servico)');
            const despesasRes = await getAccessibleDataQuery(user.id, isAdmin, 'lm_lanc_despesas', 'data, valor');
            const clientesRes = await getAccessibleDataQuery(user.id, isAdmin, 'lm_clientes', 'id, created_at');
            const dizimosRes = await getAccessibleDataQuery(user.id, isAdmin, 'lm_dizimos_ofertas', 'data, valor, tipo_movimento');

            if (servicosRes.error) throw new Error(`Serviços: ${servicosRes.error.message}`);
            if (despesasRes.error) throw new Error(`Despesas: ${despesasRes.error.message}`);
            if (clientesRes.error) throw new Error(`Clientes: ${clientesRes.error.message}`);
            if (dizimosRes.error) throw new Error(`Dízimos: ${dizimosRes.error.message}`);

            setRawServicos(servicosRes.data || []);
            setRawDespesas(despesasRes.data || []);
            setRawClientes(clientesRes.data || []);
            setRawDizimos(dizimosRes.data || []);
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
            toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user, isAdmin]);

    const availableYears = useMemo(() => {
        const years = [
            ...rawServicos.map(d => getYear(new Date(d.data + 'T00:00:00'))),
            ...rawDespesas.map(d => getYear(new Date(d.data + 'T00:00:00'))),
            ...rawDizimos.map(d => getYear(new Date(d.data + 'T00:00:00'))),
            CURRENT_DATE.getFullYear()
        ];
        return [...new Set(years)].sort((a, b) => b - a);
    }, [rawServicos, rawDespesas, rawDizimos]);

    const filteredServicos = useMemo(() => {
        return rawServicos.filter(item => {
            const date = new Date(item.data + 'T00:00:00');
            return (selectedYear === 'all' || getYear(date).toString() === selectedYear) &&
                   (selectedMonth === 'all' || getMonth(date).toString() === selectedMonth);
        });
    }, [rawServicos, selectedMonth, selectedYear]);

    const filteredDespesas = useMemo(() => {
        return rawDespesas.filter(item => {
            const date = new Date(item.data + 'T00:00:00');
            return (selectedYear === 'all' || getYear(date).toString() === selectedYear) &&
                   (selectedMonth === 'all' || getMonth(date).toString() === selectedMonth);
        });
    }, [rawDespesas, selectedMonth, selectedYear]);

    const filteredDizimos = useMemo(() => {
        return rawDizimos.filter(item => {
            const date = new Date(item.data + 'T00:00:00');
            return (selectedYear === 'all' || getYear(date).toString() === selectedYear) &&
                   (selectedMonth === 'all' || getMonth(date).toString() === selectedMonth);
        });
    }, [rawDizimos, selectedMonth, selectedYear]);

    const receitaMes = filteredServicos.reduce((acc, l) => acc + parseFloat(l.valor || 0), 0);
    const despesaMes = filteredDespesas.reduce((acc, l) => acc + parseFloat(l.valor || 0), 0);
    // Dizimos has been explicitly requested to be removed from Saldo calculation formula: Total Receitas - Total Despesas = Saldo
    const saldoFiltered = receitaMes - despesaMes;

    const totalClientes = rawClientes.length;
    
    const clientesAtivos = useMemo(() => {
        const threeMonthsAgo = startOfDay(subMonths(CURRENT_DATE, 3));
        const recentServices = rawServicos.filter(s => new Date(s.data + 'T00:00:00') >= threeMonthsAgo);
        const uniqueClients = new Set();
        recentServices.forEach(s => {
            if (s.cliente_id) uniqueClients.add(s.cliente_id);
            else if (s.cliente) uniqueClients.add(s.cliente);
        });
        return uniqueClients.size;
    }, [rawServicos]);

    const topClientes = useMemo(() => {
        const map = {};
        filteredServicos.forEach(s => {
            const clientName = s.cliente || 'Desconhecido';
            map[clientName] = (map[clientName] || 0) + parseFloat(s.valor || 0);
        });
        return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 5);
    }, [filteredServicos]);

    const topServicos = useMemo(() => {
        const map = {};
        filteredServicos.forEach(s => {
            const name = s.lm_servicos?.servico || 'Outro';
            map[name] = (map[name] || 0) + parseFloat(s.valor || 0);
        });
        return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 5);
    }, [filteredServicos]);

    const chartDataDizimos = useMemo(() => {
        const map = {};
        filteredDizimos.forEach(d => {
            const name = d.tipo_movimento || 'Outro';
            map[name] = (map[name] || 0) + parseFloat(d.valor || 0);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredDizimos]);

    const chartData = useMemo(() => {
        const dataMap = {};
        if (selectedYear === 'all') {
            const years = availableYears.sort();
            years.forEach(y => {
                mesesNomes.forEach((m, i) => {
                    dataMap[`${m}/${y}`] = { name: `${m.substring(0,3)}/${y}`, order: y*100+i, entradas: 0, despesas: 0, dizimos_ofertas: 0 };
                });
            });
        } else {
            mesesNomes.forEach((m, i) => {
                dataMap[m] = { name: m.substring(0,3), order: i, entradas: 0, despesas: 0, dizimos_ofertas: 0 };
            });
        }

        const addDataToMap = (sourceArray, key) => {
            sourceArray.forEach(item => {
                const date = new Date(item.data + 'T00:00:00');
                const y = getYear(date).toString();
                const mIdx = getMonth(date);
                if (selectedYear !== 'all' && y !== selectedYear) return;
                const mapKey = selectedYear === 'all' ? `${mesesNomes[mIdx]}/${y}` : mesesNomes[mIdx];
                if (dataMap[mapKey]) {
                    dataMap[mapKey][key] += parseFloat(item.valor || 0);
                }
            });
        };

        addDataToMap(rawServicos, 'entradas');
        addDataToMap(rawDespesas, 'despesas');
        addDataToMap(rawDizimos, 'dizimos_ofertas');

        return Object.values(dataMap)
            .sort((a, b) => a.order - b.order)
            .filter(d => selectedYear !== 'all' || (d.entradas > 0 || d.despesas > 0 || d.dizimos_ofertas > 0));

    }, [rawServicos, rawDespesas, rawDizimos, selectedYear, availableYears]);

    const containerVariants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    
    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--neon-lanhouse))]" />
                <p className="text-muted-foreground font-medium uppercase tracking-widest">Carregando Dashboard...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--neon-lanhouse))]/10 flex items-center justify-center glow-lanhouse">
                        <Printer className="w-6 h-6 text-[hsl(var(--neon-lanhouse))]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--neon-lanhouse))] to-cyan-200 tracking-tight">
                            Lan House
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">Visão Geral e Indicadores Financeiros</p>
                    </div>
                </div>
                <div className="flex gap-3 glass-card p-2 rounded-xl">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px] bg-background border-none shadow-none font-medium text-sm">
                            <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Meses</SelectItem>
                            {mesesNomes.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="w-px bg-border my-2"></div>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px] bg-background border-none shadow-none font-medium text-sm">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Anos</SelectItem>
                            {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Balances Section - Split between Overall and Filtered */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <motion.div variants={itemVariants} className="h-full">
                    <SaldoEmCaixaGeral selectedMonth={selectedMonth} selectedYear={selectedYear} />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <StatCard 
                        icon={Banknote} 
                        title="Lucro Operacional" 
                        value={saldoFiltered} 
                        subtitle="Total Receitas - Total Despesas no período"
                        colorClass={saldoFiltered >= 0 ? "from-blue-500 to-blue-400" : "from-orange-500 to-orange-400"} 
                        valueColorClass={saldoFiltered >= 0 ? "text-blue-500" : "text-orange-500"}
                    />
                </motion.div>
            </motion.div>

            {/* Metrics Grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <motion.div variants={itemVariants} className="h-full">
                    <StatCard 
                        icon={Users} 
                        title="Total de Clientes" 
                        value={totalClientes.toString()} 
                        subtitle={`${clientesAtivos} ativos (3M)`}
                        colorClass="from-purple-500 to-purple-400" 
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <StatCard 
                        icon={DollarSign} 
                        title="Entradas (Filtro)" 
                        value={receitaMes} 
                        subtitle="Total de serviços prestados"
                        colorClass="from-emerald-500 to-emerald-400" 
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <StatCard 
                        icon={CreditCard} 
                        title="Despesas (Filtro)" 
                        value={despesaMes} 
                        subtitle="Total de gastos no período"
                        colorClass="from-orange-500 to-orange-400" 
                    />
                </motion.div>
            </motion.div>

            {/* Intermediate Section (2 Cards) */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="lanhouse" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                                <Users className="w-5 h-5 mr-2 text-[hsl(var(--neon-lanhouse))]" />
                                Top 5 Clientes (Filtro)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/40">
                                        <TableHead className="py-3 pl-6 text-muted-foreground font-semibold text-[12px] md:text-[14px]">Nome do Cliente</TableHead>
                                        <TableHead className="py-3 pr-6 text-right text-muted-foreground font-semibold text-[12px] md:text-[14px]">Valor Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topClientes.length === 0 ? (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8 text-[13px] text-muted-foreground">Nenhum dado no período.</TableCell></TableRow>
                                    ) : (
                                        topClientes.map(([nome, valor], i) => (
                                            <TableRow key={i}>
                                                <TableCell className="py-3 pl-6 font-medium text-[13px] md:text-[15px]">{nome}</TableCell>
                                                <TableCell className="py-3 pr-6 text-right text-emerald-500 font-bold text-[13px] md:text-[15px]">{formatCurrency(valor)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </NeonBorder>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="lanhouse" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                                <Printer className="w-5 h-5 mr-2 text-[hsl(var(--neon-lanhouse))]" />
                                Top 5 Serviços (Filtro)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/40">
                                        <TableHead className="py-3 pl-6 text-muted-foreground font-semibold text-[12px] md:text-[14px]">Tipo de Serviço</TableHead>
                                        <TableHead className="py-3 pr-6 text-right text-muted-foreground font-semibold text-[12px] md:text-[14px]">Valor Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topServicos.length === 0 ? (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8 text-[13px] text-muted-foreground">Nenhum dado no período.</TableCell></TableRow>
                                    ) : (
                                        topServicos.map(([nome, valor], i) => (
                                            <TableRow key={i}>
                                                <TableCell className="py-3 pl-6 font-medium text-[13px] md:text-[15px]">{nome}</TableCell>
                                                <TableCell className="py-3 pr-6 text-right text-cyan-500 font-bold text-[13px] md:text-[15px]">{formatCurrency(valor)}</TableCell>
                                            </TableRow>
                                        ))
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
                    <NeonBorder neonColor="lanhouse" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                                <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
                                Entradas e Despesas Mês a Mês
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} cursor={{ fill: 'hsl(var(--accent)/0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" maxBarSize={40} />
                                    <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </NeonBorder>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <NeonBorder neonColor="lanhouse" className="overflow-hidden">
                        <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                            <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                                <PieChartIcon className="w-5 h-5 mr-2 text-purple-500"/>
                                Dízimos e Ofertas (Por Tipo)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-6 flex flex-col items-center justify-center">
                            {chartDataDizimos.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartDataDizimos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                                            {chartDataDizimos.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} />
                                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground text-sm">Sem dízimos no período.</div>
                            )}
                        </CardContent>
                    </NeonBorder>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default DashboardHome;