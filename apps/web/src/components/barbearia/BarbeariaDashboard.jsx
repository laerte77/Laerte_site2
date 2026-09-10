import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Users, TrendingUp, TrendingDown, Wallet, Loader2, Calendar, Award, Star, PieChart } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const months = [
    { value: 'all', label: 'Todos os Meses' },
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

const years = ['all', ...Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)];

const BarbeariaDashboard = () => {
    const { user } = useAuth();
    
    const [globalMonth, setGlobalMonth] = useState(currentMonth);
    const [globalYear, setGlobalYear] = useState(currentYear);
    
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        saldo: 0, entradas: 0, saidas: 0,
        clientesUnicos: 0,
        barbeirosStats: [],
        topClientes: [],
        chartEntradas: [],
        chartSaidas: [],
        entradasPorTipo: []
    });

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [
                { data: cortes },
                { data: servicos },
                { data: vendas },
                { data: assinaturas },
                { data: despesas },
                { data: clientesDb },
                { data: barbeirosDb },
                { data: tiposCorteDb }
            ] = await Promise.all([
                supabase.from('barbearia_lancamentos_cortes').select('data, valor, cliente_id, barbeiro_id, tipo_corte_id').eq('user_id', user.id),
                supabase.from('barbearia_lancamentos_servicos').select('data, valor, cliente_id, barbeiro_id').eq('user_id', user.id),
                supabase.from('barbearia_lancamentos_vendas').select('data, valor, cliente_id').eq('user_id', user.id),
                supabase.from('barbearia_lancamentos_assinaturas').select('data_assinatura, valor, cliente_id').eq('user_id', user.id),
                supabase.from('barbearia_lancamentos_despesas').select('data, valor').eq('user_id', user.id),
                supabase.from('barbearia_clientes').select('id, nome').eq('user_id', user.id),
                supabase.from('barbearia_barbeiros').select('id, nome').eq('user_id', user.id),
                supabase.from('barbearia_tipos_corte').select('id, nome').eq('user_id', user.id)
            ]);

            const mapCliente = (id) => clientesDb?.find(c => c.id === id)?.nome || 'Desconhecido';
            const mapBarbeiro = (id) => barbeirosDb?.find(b => b.id === id)?.nome || 'Desconhecido';

            const matchesFilter = (dateStr) => {
                if (!dateStr) return false;
                const [y, m] = dateStr.split('T')[0].split('-');
                const matchY = globalYear === 'all' || Number(y) === Number(globalYear);
                const matchM = globalMonth === 'all' || Number(m) === Number(globalMonth);
                return matchY && matchM;
            };

            const filteredCortes = (cortes || []).filter(c => matchesFilter(c.data));
            const filteredServicos = (servicos || []).filter(s => matchesFilter(s.data));
            const filteredVendas = (vendas || []).filter(v => matchesFilter(v.data));
            const filteredAssinaturas = (assinaturas || []).filter(a => matchesFilter(a.data_assinatura));
            const filteredDespesas = (despesas || []).filter(d => matchesFilter(d.data));

            const entradasCortes = filteredCortes.reduce((acc, curr) => acc + Number(curr.valor), 0);
            const entradasServicos = filteredServicos.reduce((acc, curr) => acc + Number(curr.valor), 0);
            const entradasVendas = filteredVendas.reduce((acc, curr) => acc + Number(curr.valor), 0);
            const entradasAssinaturas = filteredAssinaturas.reduce((acc, curr) => acc + Number(curr.valor), 0);
            
            const totalEntradas = entradasCortes + entradasServicos + entradasVendas + entradasAssinaturas;
            const totalDespesas = filteredDespesas.reduce((acc, curr) => acc + Number(curr.valor), 0);
            const saldoFinal = totalEntradas - totalDespesas;

            const uniqueClients = new Set();
            filteredCortes.forEach(c => c.cliente_id && uniqueClients.add(c.cliente_id));
            filteredServicos.forEach(s => s.cliente_id && uniqueClients.add(s.cliente_id));
            filteredVendas.forEach(v => v.cliente_id && uniqueClients.add(v.cliente_id));
            filteredAssinaturas.forEach(a => a.cliente_id && uniqueClients.add(a.cliente_id));

            const entradasPorTipoArray = [
                { tipo: 'Cortes', quantidade: filteredCortes.length, valor: entradasCortes },
                { tipo: 'Serviços', quantidade: filteredServicos.length, valor: entradasServicos },
                { tipo: 'Produtos', quantidade: filteredVendas.length, valor: entradasVendas },
                { tipo: 'Planos', quantidade: filteredAssinaturas.length, valor: entradasAssinaturas }
            ];

            const bStatsMap = {};
            filteredCortes.forEach(c => {
                if(!c.barbeiro_id) return;
                if(!bStatsMap[c.barbeiro_id]) bStatsMap[c.barbeiro_id] = { id: c.barbeiro_id, valor: 0, cortes: 0, servicos: 0 };
                bStatsMap[c.barbeiro_id].valor += Number(c.valor);
                bStatsMap[c.barbeiro_id].cortes += 1;
            });
            filteredServicos.forEach(s => {
                if(!s.barbeiro_id) return;
                if(!bStatsMap[s.barbeiro_id]) bStatsMap[s.barbeiro_id] = { id: s.barbeiro_id, valor: 0, cortes: 0, servicos: 0 };
                bStatsMap[s.barbeiro_id].valor += Number(s.valor);
                bStatsMap[s.barbeiro_id].servicos += 1;
            });
            const barbeirosStatsArray = Object.values(bStatsMap).map(b => ({
                ...b,
                nome: mapBarbeiro(b.id)
            })).sort((a,b) => b.valor - a.valor);

            const clientSpentMap = {};
            [...filteredCortes, ...filteredServicos, ...filteredVendas, ...filteredAssinaturas].forEach(i => {
                if(!i.cliente_id) return;
                clientSpentMap[i.cliente_id] = (clientSpentMap[i.cliente_id] || 0) + Number(i.valor);
            });
            const topClientes = Object.entries(clientSpentMap)
                .map(([id, total]) => ({ nome: mapCliente(id), total }))
                .sort((a,b) => b.total - a.total).slice(0, 5);

            const getChartData = () => {
                const yearToFilter = globalYear === 'all' ? currentYear : Number(globalYear);
                const cData = Array.from({length: 12}, (_, i) => ({ name: months[i+1].label.substring(0,3), Entradas: 0, Despesas: 0 }));
                const addData = (arr, key, dateField = 'data') => {
                    (arr || []).forEach(item => {
                        const dateStr = item[dateField];
                        if (!dateStr) return;
                        const [y, m] = dateStr.split('T')[0].split('-');
                        if (Number(y) === yearToFilter) {
                            cData[Number(m) - 1][key] += Number(item.valor);
                        }
                    });
                };
                addData(cortes, 'Entradas');
                addData(servicos, 'Entradas');
                addData(vendas, 'Entradas');
                addData(assinaturas, 'Entradas', 'data_assinatura');
                addData(despesas, 'Despesas');
                return cData;
            };

            const chartData = getChartData();

            setStats({
                saldo: saldoFinal,
                entradas: totalEntradas,
                saidas: totalDespesas,
                clientesUnicos: uniqueClients.size,
                barbeirosStats: barbeirosStatsArray,
                topClientes,
                chartEntradas: chartData.map(d => ({ name: d.name, total: d.Entradas })),
                chartSaidas: chartData.map(d => ({ name: d.name, total: d.Despesas })),
                entradasPorTipo: entradasPorTipoArray
            });

        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [globalMonth, globalYear, user]);

    if (loading && !stats.entradas) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh] space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
                <p className="text-[#A9A9A9] text-xs font-medium tracking-widest uppercase">Carregando Dashboard...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8 pb-16">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-[#D4AF37] to-[#B5952F] rounded-xl shadow-lg shadow-[#D4AF37]/20">
                        <Scissors className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Visão Geral</h1>
                        <p className="text-[13px] text-[#A9A9A9] mt-0.5 font-medium">Acompanhe o desempenho da sua barbearia</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-900/80 p-2.5 rounded-xl border border-[#D4AF37]/30 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2 text-[#D4AF37] pr-2 border-r border-[#D4AF37]/20">
                        <Calendar className="w-4 h-4" />
                        <span className="font-bold text-[11px] uppercase tracking-wider">Filtro</span>
                    </div>
                    <select value={globalMonth} onChange={(e) => setGlobalMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-black border border-[#D4AF37]/30 text-white font-medium text-xs p-1.5 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all">
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select value={globalYear} onChange={(e) => setGlobalYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-black border border-[#D4AF37]/30 text-white font-medium text-xs p-1.5 rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all">
                        {years.map(y => <option key={y} value={y}>{y === 'all' ? 'Todos os Anos' : y}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-5 bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-[#D4AF37]/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/80 transition-colors duration-500 min-h-[200px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet className="w-40 h-40 text-[#D4AF37]" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-[14px] font-semibold text-[#A9A9A9] uppercase tracking-widest mb-2">Saldo em Caixa</h2>
                        <div className={`text-3xl md:text-4xl font-bold tracking-tighter ${stats.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            R$ {stats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex gap-4 mt-4 text-[13px] font-medium">
                            <span className="text-green-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> R$ {stats.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[#A9A9A9]">|</span>
                            <span className="text-red-400 flex items-center gap-1.5"><TrendingDown className="w-4 h-4"/> R$ {stats.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-gray-900/80 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center hover:bg-gray-800/50 transition-all">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-[#A9A9A9] uppercase tracking-widest text-[13px] mb-1">Clientes</h3>
                        <p className="text-3xl font-bold text-blue-400">{stats.clientesUnicos}</p>
                        <p className="text-[12px] text-[#A9A9A9] mt-1.5">atendidos no período</p>
                    </div>

                    <div className="bg-gray-900/80 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center hover:bg-gray-800/50 transition-all">
                        <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20 mb-4">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="font-semibold text-[#A9A9A9] uppercase tracking-widest text-[13px] mb-1">Total Entradas</h3>
                        <p className="text-2xl md:text-3xl font-bold text-green-400 break-all">R$ {stats.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="bg-orange-950/10 border border-orange-500/20 rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center hover:bg-orange-900/20 transition-all">
                        <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 mb-4">
                            <TrendingDown className="w-6 h-6 text-orange-500" />
                        </div>
                        <h3 className="font-semibold text-[#A9A9A9] uppercase tracking-widest text-[13px] mb-1">Total Despesas</h3>
                        <p className="text-2xl md:text-3xl font-bold text-orange-500 break-all">R$ {stats.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-gray-900/80 border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl overflow-hidden">
                    <h3 className="font-semibold text-[#D4AF37] uppercase tracking-widest text-base mb-6 flex items-center gap-2.5">
                        <Star className="w-5 h-5"/> Por Barbeiro
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px] min-w-[500px]">
                            <thead>
                                <tr className="border-b border-[#D4AF37]/30 text-[#A9A9A9] uppercase tracking-wider text-[12px]">
                                    <th className="pb-3 px-3 font-semibold">Barbeiro</th>
                                    <th className="pb-3 px-3 font-semibold text-center">Cortes</th>
                                    <th className="pb-3 px-3 font-semibold text-center">Serviços</th>
                                    <th className="pb-3 px-3 font-semibold text-right">Valor Ganho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.barbeirosStats.length === 0 ? <tr><td colSpan="4" className="py-6 text-center text-[#A9A9A9] text-sm">Nenhum dado encontrado.</td></tr> : 
                                 stats.barbeirosStats.map((b, idx) => (
                                    <tr key={idx} className="border-b border-[#D4AF37]/10 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-3 text-white font-medium flex items-center gap-2.5 text-[14px]">
                                            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold">{b.nome.charAt(0)}</div>
                                            {b.nome}
                                        </td>
                                        <td className="py-4 px-3 text-center font-bold text-white text-[14px]">{b.cortes}</td>
                                        <td className="py-4 px-3 text-center font-bold text-white text-[14px]">{b.servicos}</td>
                                        <td className="py-4 px-3 text-right text-[#D4AF37] font-bold text-[16px]">R$ {b.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-gray-900/80 border border-[#D4AF37]/30 rounded-3xl p-6 shadow-xl overflow-hidden">
                    <h3 className="font-semibold text-green-400 uppercase tracking-widest text-base mb-6 flex items-center gap-2.5">
                        <PieChart className="w-5 h-5"/> Entradas por Tipo
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px] min-w-[400px]">
                            <thead>
                                <tr className="border-b border-green-500/30 text-[#A9A9A9] uppercase tracking-wider text-[12px]">
                                    <th className="pb-3 px-3 font-semibold">Tipo</th>
                                    <th className="pb-3 px-3 font-semibold text-center">Quantidade</th>
                                    <th className="pb-3 px-3 font-semibold text-right">Valor Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.entradasPorTipo.map((item, idx) => (
                                    <tr key={idx} className="border-b border-green-500/10 hover:bg-white/5 transition-colors">
                                        <td className="py-5 px-3 text-white font-semibold tracking-wide text-[14px]">{item.tipo}</td>
                                        <td className="py-5 px-3 text-center font-bold text-[#A9A9A9] text-[14px]">{item.quantidade}</td>
                                        <td className="py-5 px-3 text-right text-green-400 font-bold text-[16px]">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-gray-900/80 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl">
                    <h3 className="font-semibold text-green-400 uppercase tracking-widest text-base mb-6 flex items-center gap-2">
                         Evolução Anual - Entradas ({globalYear === 'all' ? currentYear : globalYear})
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartEntradas} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#A9A9A9" axisLine={false} tickLine={false} fontSize={11} />
                                <YAxis stroke="#A9A9A9" axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} fontSize={11} />
                                <RechartsTooltip contentStyle={{backgroundColor:'#000', border:'1px solid #22c55e', borderRadius:'12px', fontSize: '12px'}} itemStyle={{color:'#22c55e', fontWeight:'bold'}} formatter={(v)=>`R$ ${Number(v).toFixed(2)}`} />
                                <Bar dataKey="total" name="Entradas R$" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gray-900/80 border border-[#D4AF37]/20 rounded-3xl p-6 shadow-xl">
                    <h3 className="font-semibold text-[#D4AF37] uppercase tracking-widest text-base mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5"/> Melhores Clientes do Período
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-[#D4AF37]/20 text-[#A9A9A9] text-[12px] uppercase">
                                    <th className="pb-3 font-semibold">Posição</th>
                                    <th className="pb-3 font-semibold">Cliente</th>
                                    <th className="pb-3 font-semibold text-right">Valor Gasto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topClientes.length === 0 ? <tr><td colSpan="3" className="py-6 text-center text-[#A9A9A9] text-sm">Sem dados.</td></tr> : 
                                 stats.topClientes.map((c, i) => (
                                    <tr key={i} className="border-b border-[#D4AF37]/10 hover:bg-white/5 transition-colors">
                                        <td className="py-4 text-[#D4AF37] font-bold text-base">#{i+1}</td>
                                        <td className="py-4 text-white font-medium text-[14px]">{c.nome}</td>
                                        <td className="py-4 text-right text-green-400 font-bold text-[16px]">R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </motion.div>
    );
};

export default BarbeariaDashboard;