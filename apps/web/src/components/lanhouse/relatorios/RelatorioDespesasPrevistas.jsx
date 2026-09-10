import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSearch, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const RelatorioDespesasPrevistas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useRef(true);
    const [despesasPrevistas, setDespesasPrevistas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMes, setFilterMes] = useState('todos');

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('lm_despesas_previstas').select('*').eq('user_id', user.id);
            if (!isMounted.current) return;
            if (error) throw error;
            setDespesasPrevistas(data || []);
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
        const channel = supabase.channel('lm_despesas_previstas_rel_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_despesas_previstas' }, () => {
                if(isMounted.current) fetchData();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const processedDespesas = useMemo(() => {
        if (loading) return [];
        const allInstallments = [];
        despesasPrevistas.forEach(dp => {
            if (dp.forma_pagamento === 'CARTÃO DE CRÉDITO' && dp.parcelas > 1) {
                const valorParcela = parseFloat(dp.valor || 0) / dp.parcelas;
                for (let i = 0; i < dp.parcelas; i++) {
                    const vencimento = new Date(dp.data_vencimento);
                    vencimento.setMonth(vencimento.getMonth() + i);
                    const installmentId = `${dp.id}-${i + 1}`;
                    const parcelaStatus = dp.status && dp.status[i + 1] ? dp.status[i + 1] : 'PENDENTE';
                    allInstallments.push({ ...dp, id: installmentId, valor: valorParcela, data_vencimento: vencimento.toISOString().split('T')[0], descricao: `${dp.descricao} (${i + 1}/${dp.parcelas})`, original_id: dp.id, parcela_num: i + 1, status: parcelaStatus });
                }
            } else {
                allInstallments.push({ ...dp, original_id: dp.id, status: dp.status === 'PAGO' ? 'PAGO' : 'PENDENTE' });
            }
        });
        return allInstallments;
    }, [despesasPrevistas, loading]);

    const filteredDespesas = useMemo(() => {
        return processedDespesas.filter(d => {
            if (filterMes !== 'todos') {
                const dataVencimento = new Date(d.data_vencimento);
                return dataVencimento.getUTCMonth() === parseInt(filterMes);
            }
            return true;
        }).sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
    }, [processedDespesas, filterMes]);

    const toggleStatus = async (item) => {
        if (!item.original_id) return;
        
        let newStatusValue;
        if (item.forma_pagamento === 'CARTÃO DE CRÉDITO' && item.parcelas > 1) {
            const originalItem = despesasPrevistas.find(dp => dp.id === item.original_id);
            if (!originalItem) return;
            const newStatus = { ...(typeof originalItem.status === 'object' && originalItem.status !== null ? originalItem.status : {}) };
            newStatus[item.parcela_num] = item.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
            newStatusValue = { status: newStatus };
        } else {
            const newStatus = item.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
            newStatusValue = { status: newStatus };
        }

        const { error } = await supabase.from('lm_despesas_previstas').update(newStatusValue).eq('id', item.original_id);
        if (error && isMounted.current) toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
        else if (isMounted.current) toast({ title: 'Status atualizado com sucesso!' });
    };

    const getStatusBadge = (status) => status === 'PAGO' ? <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600"><span>Pago</span></Badge> : <Badge variant="destructive" className="bg-red-500/90 text-white hover:bg-red-600"><span>Pendente</span></Badge>;
    const calculateDaysRemaining = (dateString) => { const diff = new Date(dateString) - new Date(); const days = Math.ceil(diff / (1000 * 60 * 60 * 24)); if (days < 0) return `Vencido há ${Math.abs(days)} dias`; if (days === 0) return 'Vence hoje'; return `Vence em ${days} dias`; };

    const MobileCard = ({ item }) => (
         <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/95 border border-border/60 rounded-xl p-4 shadow-sm mb-3"
        >
             <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h4 className="font-bold text-lg text-foreground leading-tight">{item.descricao}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Vencimento: {new Date(item.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                    {item.status !== 'PAGO' && <p className="text-xs font-medium text-orange-400 mt-0.5">{calculateDaysRemaining(item.data_vencimento)}</p>}
                </div>
                 <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(item.status)}
                    <span className="text-lg font-bold text-red-400 mt-1">R$ {parseFloat(item.valor).toFixed(2)}</span>
                </div>
             </div>
             <Button 
                variant={item.status === 'PAGO' ? "outline" : "default"} 
                size="sm" 
                onClick={() => toggleStatus(item)} 
                className={`w-full mt-2 ${item.status === 'PAGO' ? 'border-green-500/50 text-green-500' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>{item.status === 'PAGO' ? 'Marcar como Pendente' : 'Marcar como Pago'}</span>
            </Button>
        </motion.div>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col justify-between items-start">
                <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-300">
                    <span>Relatório de Despesas Previstas</span>
                </h2>
                <p className="text-muted-foreground text-sm"><span>Acompanhe suas contas a pagar.</span></p>
            </div>
            
            <div className="bg-card/80 p-4 md:p-6 rounded-xl border border-border">
                <div className="w-full md:w-1/2 lg:w-1/3">
                    <Label><span>Filtrar por Mês de Vencimento</span></Label>
                    <Select value={filterMes} onValueChange={setFilterMes}>
                        <SelectTrigger className="bg-input text-foreground h-11"><SelectValue /></SelectTrigger>
                        <SelectContent className="dark-lanhouse">
                            <ScrollArea className="h-48">
                                <SelectItem value="todos"><span>Todos os Meses</span></SelectItem>
                                {meses.map((m, i) => <SelectItem key={i} value={String(i)}><span>{m}</span></SelectItem>)}
                            </ScrollArea>
                        </SelectContent>
                    </Select>
                </div>
            </div>

             {/* Mobile View */}
            <div className="md:hidden">
                {loading ? (
                    <div className="p-8 text-center"><span>Carregando...</span></div>
                ) : filteredDespesas.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <FileSearch className="w-10 h-10 mb-2 opacity-50" />
                        <span>Nenhuma despesa prevista encontrada.</span>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredDespesas.map(item => (
                            <MobileCard key={item.id} item={item} />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg shadow-black/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-4 text-left text-muted-foreground"><span>Descrição</span></th>
                                <th className="p-4 text-left text-muted-foreground"><span>Vencimento</span></th>
                                <th className="p-4 text-left text-muted-foreground"><span>Dias Restantes</span></th>
                                <th className="p-4 text-left text-muted-foreground"><span>Status</span></th>
                                <th className="p-4 text-right text-muted-foreground"><span>Valor</span></th>
                                <th className="p-4 text-center text-muted-foreground"><span>Ação</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center"><span>Carregando...</span></td></tr>
                            ) : filteredDespesas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center">
                                            <FileSearch className="w-10 h-10 mb-2 opacity-50" />
                                            <span>Nenhuma despesa encontrada.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDespesas.map((item) => (
                                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-accent/50 text-foreground">
                                        <td className="p-4"><span>{item.descricao}</span></td>
                                        <td className="p-4"><span>{new Date(item.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></td>
                                        <td className="p-4"><span>{item.status !== 'PAGO' ? calculateDaysRemaining(item.data_vencimento) : '-'}</span></td>
                                        <td className="p-4">{getStatusBadge(item.status)}</td>
                                        <td className="p-4 text-right font-semibold text-red-400"><span>R$ {parseFloat(item.valor).toFixed(2)}</span></td>
                                        <td className="p-4 text-center">
                                            <Button size="sm" variant="ghost" onClick={() => toggleStatus(item)} className="text-green-400 hover:text-green-300 hover:bg-green-500/10">
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                <span>{item.status === 'PAGO' ? 'Marcar Pendente' : 'Marcar Pago'}</span>
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

export default RelatorioDespesasPrevistas;