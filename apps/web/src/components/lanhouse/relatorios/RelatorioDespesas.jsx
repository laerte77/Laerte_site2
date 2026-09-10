import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

const RelatorioDespesas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState([]);
  const [tiposDespesa, setTiposDespesa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', despesa_id: 'todos' });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [lancamentosRes, tiposRes] = await Promise.all([
        supabase.from('lm_lanc_despesas').select('*, lm_despesas(despesa)').eq('user_id', user.id).order('data', { ascending: false }),
        supabase.from('lm_despesas').select('*').eq('user_id', user.id).order('despesa', { ascending: true }),
    ]);
    if (lancamentosRes.error) toast({ title: 'Erro ao buscar despesas', variant: 'destructive' });
    else setLancamentos(lancamentosRes.data);
    if (tiposRes.error) toast({ title: 'Erro ao buscar tipos', variant: 'destructive' });
    else setTiposDespesa(tiposRes.data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if(!user) return;
    const channel = supabase.channel('relatorio_lm_despesas_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchData]);

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(l => {
      const dataLancamento = new Date(l.data);
      const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
      const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
      if (dataInicio && dataLancamento < dataInicio) return false;
      if (dataFim && dataLancamento > dataFim) return false;
      if (filters.despesa_id !== 'todos' && l.despesa_id !== filters.despesa_id) return false;
      return true;
    });
  }, [lancamentos, filters]);

  const totalDespesas = filteredLancamentos.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const handleExport = () => toast({ title: '🚧 Em Construção 🚧', description: 'A exportação será implementada em breve!' });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Relatório de Despesas</h2>
          <p className="text-muted-foreground">Filtre e visualize as despesas do negócio.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="text-cyan-400 border-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300"><Download className="w-4 h-4 mr-2" />Exportar</Button>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div><Label className="text-muted-foreground">Data Início</Label><Input type="date" value={filters.dataInicio} onChange={e => setFilters({...filters, dataInicio: e.target.value})} className="bg-slate-900 border-slate-700 text-slate-100" /></div>
            <div><Label className="text-muted-foreground">Data Fim</Label><Input type="date" value={filters.dataFim} onChange={e => setFilters({...filters, dataFim: e.target.value})} className="bg-slate-900 border-slate-700 text-slate-100" /></div>
            <div><Label className="text-muted-foreground">Tipo de Despesa</Label><Select value={filters.despesa_id} onValueChange={(v) => setFilters({...filters, despesa_id: v})}><SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700 text-slate-100"><ScrollArea className="h-48"><SelectItem value="todos">Todos</SelectItem>{tiposDespesa.map(d => <SelectItem key={d.id} value={d.id}>{d.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-cyan-500/10 rounded-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
        <div className="p-4 border-b border-cyan-500/10"><h3 className="font-semibold text-lg text-foreground">Total de Despesas: <span className="text-red-400">{formatCurrency(totalDespesas)}</span></h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-cyan-500/10"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Tipo</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th></tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan="3" className="p-8 text-center">Carregando...</td></tr>) : filteredLancamentos.length === 0 ? (<tr><td colSpan="3" className="p-8 text-center text-muted-foreground"><FileSearch className="mx-auto w-10 h-10 mb-2" />Nenhum resultado encontrado.</td></tr>) : (
                filteredLancamentos.map((lancamento) => (
                  <tr key={lancamento.id} className="border-b border-cyan-500/10 last:border-b-0 hover:bg-blue-500/10 transition-colors duration-200">
                    <td className="p-4 text-foreground">{new Date(lancamento.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="p-4 text-foreground">{lancamento.lm_despesas?.despesa || 'N/A'}</td>
                    <td className="p-4 text-red-400 font-semibold text-right">{formatCurrency(parseFloat(lancamento.valor))}</td>
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