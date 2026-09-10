import React, { useState, useEffect, useCallback } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import NeonBorder from '@/components/ui/NeonBorder';

const DividaPrevistaVsPago = ({ year, month }) => {
    const { user } = useAuth();
    const [data, setData] = useState({ dividaPrevista: 0, totalPago: 0, diferenca: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            let startDate, endDate;
            if (month === "all") {
                startDate = new Date(Date.UTC(year, 0, 1));
                endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
            } else {
                startDate = new Date(Date.UTC(year, month, 1));
                endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
            }

            // Fetch ONLY from igreja_despesas_previstas as requested
            const { data: previstas, error } = await supabase
                .from('igreja_despesas_previstas')
                .select('valor, status')
                .eq('user_id', user.id)
                .gte('vencimento', startDate.toISOString())
                .lte('vencimento', endDate.toISOString());

            if (error) throw error;

            let dividaPrevista = 0;
            let totalPago = 0;

            (previstas || []).forEach(item => {
                const isPago = item.status && item.status.toLowerCase() === 'pago';
                const valor = Number(item.valor) || 0;
                
                if (isPago) {
                    totalPago += valor;
                } else {
                    dividaPrevista += valor;
                }
            });
            
            const diferenca = dividaPrevista - totalPago;

            setData({ dividaPrevista, totalPago, diferenca });
        } catch (error) {
            console.error('Error fetching DividaPrevistaVsPago:', error);
        } finally {
            setLoading(false);
        }
    }, [user, year, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!user) return;
        
        // Setup real-time subscription for table changes
        const channel = supabase.channel('igreja_despesas_previstas_divida')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'igreja_despesas_previstas' }, 
                () => {
                    fetchData();
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchData]);

    if (loading && data.totalPago === 0 && data.dividaPrevista === 0) {
        return <div className="animate-pulse h-[140px] bg-card rounded-xl border border-border/50"></div>;
    }

    return (
        <NeonBorder neonColor="igreja" className="h-full">
            <CardHeader className="bg-card/50 border-b border-border/40 pb-4">
                <CardTitle className="text-[14px] md:text-[16px] text-foreground font-semibold flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-rose-500" />
                    Dívida Prevista vs Pago (Mês/Ano)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Dívida Prevista */}
                    <div className="flex flex-col bg-destructive/5 rounded-xl p-4 border border-destructive/20 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-destructive font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Dívida Pendente
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                            {formatCurrency(data.dividaPrevista)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">Status diferente de Pago</p>
                    </div>

                    {/* Total Pago */}
                    <div className="flex flex-col bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Total Pago
                        </div>
                        <span className="text-2xl font-bold text-foreground">
                            {formatCurrency(data.totalPago)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">Status igual a Pago</p>
                    </div>

                    {/* Diferença */}
                    <div className="flex flex-col bg-muted/30 rounded-xl p-4 border border-border relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium">
                            <TrendingDown className="w-4 h-4" />
                            Diferença
                        </div>
                        <span className={`text-2xl font-bold ${data.diferenca > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                            {formatCurrency(data.diferenca)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">Pendente - Pago</p>
                    </div>
                </div>
            </CardContent>
        </NeonBorder>
    );
};

export default DividaPrevistaVsPago;