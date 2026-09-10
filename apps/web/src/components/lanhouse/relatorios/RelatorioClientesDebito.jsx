import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Download, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const RelatorioClientesDebito = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [debitos, setDebitos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', cliente: 'todos', status: 'todos' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const [debitosRes, clientesRes] = await Promise.all([
            supabase.from('lm_clientes_debito').select('*').eq('user_id', user.id),
            supabase.from('lm_clientes').select('id, nome').eq('user_id', user.id).order('nome', { ascending: true }),
        ]);
        if (debitosRes.error) toast({ title: 'Erro ao buscar débitos', variant: 'destructive' });
        else setDebitos(debitosRes.data);
        if (clientesRes.error) toast({ title: 'Erro ao buscar clientes', variant: 'destructive' });
        else setClientes(clientesRes.data);
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('relatorio_clientes_debito_changes').on('postgres_changes', { event: '*', schema: 'public' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const filteredDebitos = useMemo(() => {
        return debitos.filter(d => {
            const dataDebito = new Date(d.data);
            const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
            const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
            if (dataInicio && dataDebito < dataInicio) return false;
            if (dataFim && dataDebito > dataFim) return false;
            if (filters.cliente !== 'todos' && d.cliente !== filters.cliente) return false;
            if (filters.status !== 'todos' && d.status !== filters.status) return false;
            return true;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
    }, [debitos, filters]);

    const handleExport = () => toast({ title: '🚧 Funcionalidade em breve! 🚀', description: 'A exportação para PDF/Excel será implementada em breve!' });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAGO': return <Badge variant="default" className="bg-green-500">Pago</Badge>;
            case 'DEVENDO': return <Badge variant="destructive">Devendo</Badge>;
            case 'PARCIAL': return <Badge variant="secondary" className="bg-yellow-500">Parcial</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const calculateDays = (dateString) => {
        const debtDate = new Date(dateString);
        const today = new Date();
        const differenceInTime = today.getTime() - debtDate.getTime();
        return Math.floor(differenceInTime / (1000 * 3600 * 24));
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-start">
                <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Relatório de Clientes com Débito</h2><p className="text-muted-foreground">Filtre e visualize os débitos dos clientes.</p></div>
                <Button onClick={handleExport} variant="outline" className="text-cyan-400 border-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
            <div className="bg-card/80 p-6 rounded-xl border border-cyan-500/10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><Label className="text-muted-foreground">Data Inicial</Label><Input type="date" value={filters.dataInicio} onChange={e => setFilters({ ...filters, dataInicio: e.target.value })} className="bg-slate-900 border-slate-700 text-slate-100" /></div>
                    <div><Label className="text-muted-foreground">Data Final</Label><Input type="date" value={filters.dataFim} onChange={e => setFilters({ ...filters, dataFim: e.target.value })} className="bg-slate-900 border-slate-700 text-slate-100" /></div>
                    <div><Label className="text-muted-foreground">Filtrar por Cliente</Label><Select value={filters.cliente} onValueChange={(v) => setFilters({ ...filters, cliente: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700 text-slate-100"><ScrollArea className="h-48"><SelectItem value="todos">Todos os Clientes</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
                    <div><Label className="text-muted-foreground">Status</Label><Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700 text-slate-100"><SelectItem value="todos">Todos</SelectItem><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem></SelectContent></Select></div>
                </div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-cyan-500/10 rounded-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-cyan-500/10"><th className="p-4 text-left text-muted-foreground">Data</th><th className="p-4 text-left text-muted-foreground">Cliente</th><th className="p-4 text-left text-muted-foreground">Serviço</th><th className="p-4 text-left text-muted-foreground">Status</th><th className="p-4 text-left text-muted-foreground">Dias da Dívida</th><th className="p-4 text-right text-muted-foreground">Valor</th></tr></thead>
                        <tbody>
                            {loading ? (<tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>) : filteredDebitos.length === 0 ? (<tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><FileSearch className="mx-auto w-10 h-10 mb-2" />Nenhum débito encontrado para os filtros aplicados.</td></tr>) : (
                                filteredDebitos.map((debito) => (
                                    <tr key={debito.id} className="border-b border-cyan-500/10 last:border-b-0 hover:bg-blue-500/10 text-foreground transition-colors duration-200">
                                        <td className="p-4">{new Date(debito.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="p-4">{debito.cliente}</td>
                                        <td className="p-4">{debito.servico}</td>
                                        <td className="p-4">{getStatusBadge(debito.status)}</td>
                                        <td className="p-4">{debito.status === 'DEVENDO' ? `${calculateDays(debito.data)} dias` : '-'}</td>
                                        <td className="p-4 text-right font-semibold text-cyan-400">R$ {parseFloat(debito.valor).toFixed(2)}</td>
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

export default RelatorioClientesDebito;