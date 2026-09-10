import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Download, CheckCircle, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';

const RelatorioDevedores = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [devedores, setDevedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ dataInicio: '', dataFim: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('pessoal_devedores').select('*').eq('user_id', user.id);
        if (error) toast({ title: 'Erro ao buscar devedores', variant: 'destructive' });
        else setDevedores(data);
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('relatorio_pessoal_devedores_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_devedores' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const filteredDevedores = useMemo(() => {
        return devedores.filter(d => {
            const dataVencimento = new Date(d.data_vencimento);
            const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
            const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
            if (dataInicio && dataVencimento < dataInicio) return false;
            if (dataFim && dataVencimento > dataFim) return false;
            return true;
        }).sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
    }, [devedores, filters]);

    const handleExport = () => toast({ title: '🚧 Funcionalidade em breve! 🚀', description: 'A exportação para PDF/Excel será implementada em breve!' });

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'PAGO' ? 'PENDENTE' : 'PAGO';
        const { error } = await supabase.from('pessoal_devedores').update({ status: newStatus }).eq('id', id);
        if (error) {
            toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
        } else {
            toast({ title: 'Status atualizado com sucesso!' });
            fetchData();
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAGO': return <Badge variant="default" className="bg-green-500">Pago</Badge>;
            case 'PENDENTE': return <Badge variant="destructive">Pendente</Badge>;
            default: return <Badge variant="secondary">{status || 'PENDENTE'}</Badge>;
        }
    };

    const calculateDaysRemaining = (dateString) => {
        const dueDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const differenceInTime = dueDate.getTime() - today.getTime();
        const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
        if (differenceInDays < 0) return `Vencido há ${Math.abs(differenceInDays)} dias`;
        if (differenceInDays === 0) return 'Vence hoje';
        return `Faltam ${differenceInDays} dias`;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-start">
                <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Relatório de Devedores</h2><p className="text-muted-foreground">Filtre e visualize seus valores a receber.</p></div>
                <Button onClick={handleExport} variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10 hover:text-blue-300"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
            <div className="bg-card/80 p-6 rounded-xl border border-blue-500/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div><Label className="text-muted-foreground">Data de Vencimento Inicial</Label><Input type="date" value={filters.dataInicio} onChange={e => setFilters({ ...filters, dataInicio: e.target.value })} className="bg-background/70 text-white" /></div>
                    <div><Label className="text-muted-foreground">Data de Vencimento Final</Label><Input type="date" value={filters.dataFim} onChange={e => setFilters({ ...filters, dataFim: e.target.value })} className="bg-background/70 text-white" /></div>
                </div>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-blue-500/10 rounded-xl shadow-lg shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-blue-500/10"><th className="p-4 text-left text-muted-foreground">Pessoa</th><th className="p-4 text-left text-muted-foreground">Vencimento</th><th className="p-4 text-left text-muted-foreground">Dias Restantes</th><th className="p-4 text-left text-muted-foreground">Status</th><th className="p-4 text-right text-muted-foreground">Valor</th><th className="p-4 text-center text-muted-foreground">Ação</th></tr></thead>
                        <tbody>
                            {loading ? (<tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>) : filteredDevedores.length === 0 ? (<tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><UserMinus className="mx-auto w-10 h-10 mb-2" />Nenhum devedor encontrado.</td></tr>) : (
                                filteredDevedores.map((devedor) => (
                                    <tr key={devedor.id} className="border-b border-blue-500/10 last:border-b-0 hover:bg-accent/50 text-foreground">
                                        <td className="p-4">{devedor.pessoa}</td>
                                        <td className="p-4">{new Date(devedor.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                        <td className="p-4">{devedor.status !== 'PAGO' ? calculateDaysRemaining(devedor.data_vencimento) : '-'}</td>
                                        <td className="p-4">{getStatusBadge(devedor.status)}</td>
                                        <td className="p-4 text-right font-semibold text-green-400">R$ {parseFloat(devedor.valor).toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <Button size="sm" variant="ghost" onClick={() => toggleStatus(devedor.id, devedor.status)} className="text-green-400 hover:text-green-300 hover:bg-green-500/10">
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                {devedor.status === 'PAGO' ? 'Marcar Pendente' : 'Marcar Pago'}
                                            </Button>
                                        </td>
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

export default RelatorioDevedores;