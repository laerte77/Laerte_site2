import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient.js';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useToast } from '@/components/ui/use-toast.js';
import { Badge } from '@/components/ui/badge.jsx';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { format, addMonths, subMonths, isBefore, startOfMonth, endOfMonth, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateGastoReal } from '@/lib/gastoRealUtils.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';

const DespesasPrevisadasMes = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [items, setItems] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState({
        previstoAnterior: 0,
        gastoRealAnterior: 0,
        previstoAtual: 0,
        gastoRealAtual: 0,
        diffGastoReal: 0 
    });

    const formatCurrency = (value) => {
        return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const processMonthData = (plannedData, actualData, targetDate) => {
        let totalPrevisto = 0;
        
        const processedItems = plannedData.map(item => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const vencimento = parseISO(item.data_vencimento);

            const match = actualData.find(actual => {
                const actualDate = parseISO(actual.data);
                const isSameMonthYear = isSameMonth(actualDate, targetDate) && isSameYear(actualDate, targetDate);
                if (!isSameMonthYear) return false;

                // Match description (for LM, actual.despesa is the name string from joined table)
                const descMatch = actual.despesa.trim().toLowerCase() === item.descricao.trim().toLowerCase();
                const isEnergy = item.descricao.toLowerCase().includes('energia');
                const valueMatch = Math.abs(parseFloat(actual.valor) - parseFloat(item.valor)) < 0.5;
                
                return descMatch && (isEnergy || valueMatch);
            });

            // Status Logic: Priority to DB status, then Date check
            let displayStatus = item.status;
            
            if (item.status !== 'Paga') {
                if (isBefore(vencimento, today)) {
                    displayStatus = 'Atrasada';
                }
            }

            let gastoReal = 0;
            let diferenca = 0;

            if (match) {
                gastoReal = parseFloat(match.valor);
                diferenca = parseFloat(item.valor) - gastoReal;
            } else {
                diferenca = parseFloat(item.valor);
            }

            totalPrevisto += parseFloat(item.valor);

            return { 
                ...item, 
                displayStatus: displayStatus, 
                gastoReal: match ? gastoReal : null,
                diferenca: parseFloat(item.valor) - (match ? gastoReal : 0)
            };
        });

        return { processedItems, totalPrevisto };
    };

    const fetchItems = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const currentStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const currentEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        const prevMonthDate = subMonths(currentDate, 1);
        const prevStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
        const prevEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');

        try {
            // 1. Fetch Planned Expenses
            const { data: plannedCurrent, error: pcError } = await supabase
                .from('lm_despesas_previstas')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_vencimento', currentStart)
                .lte('data_vencimento', currentEnd)
                .order('data_vencimento', { ascending: false });
            if (pcError) throw pcError;

            const { data: plannedPrev, error: ppError } = await supabase
                .from('lm_despesas_previstas')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_vencimento', prevStart)
                .lte('data_vencimento', prevEnd);
            if (ppError) throw ppError;

            // 2. Fetch Actual Expenses List (For Row Matching Only)
            const fetchActual = async (start, end) => {
                const { data: raw, error } = await supabase
                    .from('lm_lanc_despesas')
                    .select(`
                        data, 
                        valor,
                        lm_despesas (
                            despesa
                        )
                    `)
                    .eq('user_id', user.id)
                    .gte('data', start)
                    .lte('data', end);
                
                if (error) throw error;
                return raw.map(item => ({
                    data: item.data,
                    valor: item.valor,
                    despesa: item.lm_despesas?.despesa || 'Desconhecido'
                }));
            };

            const rawActualCurrent = await fetchActual(currentStart, currentEnd);
            const rawActualPrev = await fetchActual(prevStart, prevEnd);

            // 3. Filter Actual Expenses (Exclude Dizimo/Oferta for consistency in matching)
            const filterExpenses = (list) => {
                return list.filter(item => {
                    const desc = item.despesa?.toLowerCase() || '';
                    return !desc.includes('dízimo') && !desc.includes('dizimo') && !desc.includes('oferta');
                });
            };

            const actualCurrent = filterExpenses(rawActualCurrent);
            const actualPrev = filterExpenses(rawActualPrev);

            // 4. Process Data (Matching)
            const currentData = processMonthData(plannedCurrent, actualCurrent, currentDate);
            const prevData = processMonthData(plannedPrev, actualPrev, prevMonthDate);

             // 5. Calculate Stats (Using Async Utility for accurate global Totals)
            const totalGastoRealAtual = await calculateGastoReal(user.id, currentDate, 'lanhouse');
            const totalGastoRealAnterior = await calculateGastoReal(user.id, prevMonthDate, 'lanhouse');

            setItems(currentData.processedItems);
            setStats({
                previstoAnterior: prevData.totalPrevisto,
                gastoRealAnterior: totalGastoRealAnterior,
                previstoAtual: currentData.totalPrevisto,
                gastoRealAtual: totalGastoRealAtual,
                diffGastoReal: totalGastoRealAtual - totalGastoRealAnterior
            });

        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, currentDate, toast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleMarkAsPaid = async (id, currentStatus) => {
        setUpdatingId(id);
        const newStatus = currentStatus === 'Paga' ? 'Pendente' : 'Paga';
        try {
            const { error } = await supabase
                .from('lm_despesas_previstas')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Sucesso', description: `Despesa marcada como ${newStatus}.` });
            await fetchItems();
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível atualizar o status.', variant: 'destructive' });
        } finally {
            setUpdatingId(null);
        }
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Paga': return <Badge className="bg-green-500 hover:bg-green-600">Paga</Badge>;
            case 'Atrasada': return <Badge className="bg-red-500 hover:bg-red-600">Atrasada</Badge>;
            default: return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Pendente</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Despesas do Mês (LanHouse)</h1>
                <div className="flex items-center gap-4 bg-card p-2 rounded-lg border border-border shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}><ChevronLeft className="w-5 h-5" /></Button>
                    <span className="text-lg font-medium capitalize w-40 text-center">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
                    <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}><ChevronRight className="w-5 h-5" /></Button>
                </div>
            </div>

             {/* Comparison Section */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-cyan-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Previsto (Mês Anterior)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.previstoAnterior)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-cyan-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto Real (Mês Anterior)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.gastoRealAnterior)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-cyan-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Previsto (Mês Atual)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.previstoAtual)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-cyan-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto Real (Mês Atual)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(stats.gastoRealAtual)}</div>
                        <div className="flex items-center mt-1 text-xs">
                            {stats.diffGastoReal > 0 ? (
                                <span className="text-red-400 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Gastou {formatCurrency(stats.diffGastoReal)} a mais</span>
                            ) : stats.diffGastoReal < 0 ? (
                                <span className="text-green-400 flex items-center"><TrendingDown className="w-3 h-3 mr-1" /> Economizou {formatCurrency(Math.abs(stats.diffGastoReal))}</span>
                            ) : (
                                <span className="text-muted-foreground flex items-center"><Minus className="w-3 h-3 mr-1" /> Mesmo valor</span>
                            )}
                            <span className="text-muted-foreground ml-1">vs mês anterior</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border border-cyan-500/10 bg-card shadow-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-cyan-950/20">
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor Previsto</TableHead>
                            <TableHead>Gasto Real</TableHead>
                            <TableHead>Diferença</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow><TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell></TableRow>
                        ) : items.length === 0 ? (
                             <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma despesa prevista para este mês.</TableCell></TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} className="hover:bg-cyan-500/5 transition-colors">
                                    <TableCell className="font-medium">{item.descricao}</TableCell>
                                    <TableCell>{format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{formatCurrency(parseFloat(item.valor))}</TableCell>
                                    <TableCell>
                                        {item.gastoReal ? (
                                            <span className="font-medium text-blue-300">{formatCurrency(item.gastoReal)}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.gastoReal ? (
                                            <span className={item.diferenca > 0 ? "text-green-400 font-medium" : item.diferenca < 0 ? "text-red-400 font-medium" : ""}>
                                                {item.diferenca > 0 ? "+" : ""}{formatCurrency(item.diferenca)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">Aguardando Pagamento</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">{getStatusBadge(item.displayStatus)}</TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        disabled={updatingId === item.id}
                                                        onClick={() => handleMarkAsPaid(item.id, item.status)}
                                                        className={item.status === 'Paga' ? "text-green-400 hover:text-green-300 hover:bg-green-400/10" : "text-muted-foreground hover:text-foreground"}
                                                    >
                                                        {updatingId === item.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-900 border-slate-700">
                                                    <p>{item.status === 'Paga' ? 'Marcar como Pendente' : 'Marcar como Paga'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default DespesasPrevisadasMes;