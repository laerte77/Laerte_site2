import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSearch, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const RelatorioDespesas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useRef(true);
    const [despesas, setDespesas] = useState([]);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', tipo: 'todos', mes: 'todos' });

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [despesasRes, tiposRes] = await Promise.all([
                supabase.from('igreja_despesas').select('*').eq('user_id', user.id),
                supabase.from('igreja_tipos_despesa').select('despesa').eq('user_id', user.id),
            ]);
            
            if (!isMounted.current) return;

            if (despesasRes.error) throw despesasRes.error;
            setDespesas(despesasRes.data || []);
            if (tiposRes.error) throw tiposRes.error;
            setTiposDespesa(tiposRes.data || []);
        } catch(error) {
            if (isMounted.current) {
                toast({ title: 'Erro ao buscar dados', variant: 'destructive', description: error.message });
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('igreja_relatorio_despesas_changes_v4')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                if(isMounted.current) fetchData();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const filteredData = useMemo(() => {
        if (loading) return [];
        return despesas.filter(item => {
            const dataItem = new Date(item.data);
            const dataInicio = filters.dataInicio ? new Date(filters.dataInicio + 'T00:00:00') : null;
            const dataFim = filters.dataFim ? new Date(filters.dataFim + 'T23:59:59') : null;
            if (dataInicio && dataItem < dataInicio) return false;
            if (dataFim && dataItem > dataFim) return false;
            if (filters.tipo !== 'todos' && item.despesa !== filters.tipo) return false;
            if (filters.mes !== 'todos' && dataItem.getUTCMonth() !== parseInt(filters.mes)) return false;
            return true;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
    }, [despesas, filters, loading]);

    const subtotal = useMemo(() => {
        return filteredData.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
    }, [filteredData]);

    const handleExport = () => toast({ title: '🚧 Em Construção 🚧', description: 'A exportação será implementada em breve!' });
    const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const MobileCard = ({ item }) => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/95 border border-border/60 rounded-xl p-4 shadow-sm mb-3"
        >
             <div className="flex justify-between items-start">
                <div>
                     <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                        Despesa
                    </span>
                    <h4 className="font-bold text-lg mt-1 text-foreground">{item.despesa}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                </div>
                <div className="text-right">
                    <span className="block text-lg font-bold text-red-400">{formatCurrency(item.valor)}</span>
                </div>
             </div>
        </motion.div>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">
                        <span>Relatório de Despesas</span>
                    </h2>
                    <p className="text-muted-foreground text-sm"><span>Filtre e visualize as despesas.</span></p>
                </div>
                <Button onClick={handleExport} variant="outline" className="w-full md:w-auto text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    <Download className="w-4 h-4 mr-2" />
                    <span>Exportar</span>
                </Button>
            </div>

            <div className="bg-card/80 p-4 md:p-6 rounded-xl border border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label><span>Data Início</span></Label>
                        <Input type="date" value={filters.dataInicio} onChange={e => setFilters({ ...filters, dataInicio: e.target.value })} className="bg-input text-foreground h-11" />
                    </div>
                    <div>
                        <Label><span>Data Fim</span></Label>
                        <Input type="date" value={filters.dataFim} onChange={e => setFilters({ ...filters, dataFim: e.target.value })} className="bg-input text-foreground h-11" />
                    </div>
                    <div>
                        <Label><span>Tipo de Despesa</span></Label>
                        <Select value={filters.tipo} onValueChange={v => setFilters({ ...filters, tipo: v })}>
                            <SelectTrigger className="bg-input text-foreground h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark-igreja">
                                <ScrollArea className="h-48">
                                    <SelectItem value="todos"><span>Todos</span></SelectItem>
                                    {tiposDespesa.map(t => <SelectItem key={t.despesa} value={t.despesa}><span>{t.despesa}</span></SelectItem>)}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label><span>Mês</span></Label>
                        <Select value={filters.mes} onValueChange={v => setFilters({ ...filters, mes: v })}>
                            <SelectTrigger className="bg-input text-foreground h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark-igreja">
                                <ScrollArea className="h-48">
                                    <SelectItem value="todos"><span>Todos</span></SelectItem>
                                    {meses.map((m, i) => <SelectItem key={i} value={String(i)}><span>{m}</span></SelectItem>)}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end p-2 bg-card/50 rounded-lg border border-border">
                 <div className="text-right">
                    <p className="text-xs text-muted-foreground"><span>Subtotal do Período</span></p>
                    <p className="text-xl md:text-2xl font-bold text-red-400"><span>{formatCurrency(subtotal)}</span></p>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
                {loading ? (
                    <div className="p-8 text-center"><span>Carregando...</span></div>
                ) : filteredData.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <FileSearch className="w-10 h-10 mb-2 opacity-50" />
                        <span>Nenhum resultado encontrado.</span>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredData.map(item => (
                            <MobileCard key={item.id} item={item} />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg shadow-primary/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-4 text-left font-semibold text-muted-foreground"><span>Data</span></th>
                                <th className="p-4 text-left font-semibold text-muted-foreground"><span>Descrição</span></th>
                                <th className="p-4 text-right font-semibold text-muted-foreground"><span>Valor</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" className="p-8 text-center"><span>Carregando...</span></td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center">
                                            <FileSearch className="w-10 h-10 mb-2 opacity-50" />
                                            <span>Nenhum resultado encontrado.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground">
                                            <span>{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                        </td>
                                        <td className="p-4 text-foreground"><span>{item.despesa}</span></td>
                                        <td className="p-4 text-right font-semibold text-red-400"><span>{formatCurrency(item.valor)}</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default RelatorioDespesas;