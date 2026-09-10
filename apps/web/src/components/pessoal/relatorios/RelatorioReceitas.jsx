import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

const RelatorioReceitas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState([]);
  const [tiposReceita, setTiposReceita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicial: '',
    dataFinal: '',
    tipo: 'all'
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [receitasRes, tiposRes] = await Promise.all([
      supabase.from('receitas').select('*').eq('user_id', user.id).order('data', { ascending: false }),
      supabase.from('tipos_receita').select('*').eq('user_id', user.id),
    ]);
    if (receitasRes.error) toast({ title: 'Erro ao buscar receitas', variant: 'destructive' });
    else setReceitas(receitasRes.data);
    if (tiposRes.error) toast({ title: 'Erro ao buscar tipos', variant: 'destructive' });
    else setTiposReceita(tiposRes.data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('pessoal_relatorio_receitas_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchData]);

  const receitasFiltradas = useMemo(() => {
    return receitas.filter(r => {
      const dataReceita = new Date(r.data);
      const dataInicial = filtros.dataInicial ? new Date(filtros.dataInicial) : null;
      const dataFinal = filtros.dataFinal ? new Date(filtros.dataFinal) : null;
      if (dataInicial && dataReceita < dataInicial) return false;
      if (dataFinal && dataReceita > dataFinal) return false;
      if (filtros.tipo !== 'all' && r.receita !== filtros.tipo) return false;
      return true;
    });
  }, [receitas, filtros]);

  const totalReceitas = receitasFiltradas.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Relatório de Receitas</h2>
            <p className="text-muted-foreground">Visualize e filtre suas receitas</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: 'Em breve!', description: 'Exportação de relatórios será implementada.' })}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label htmlFor="dataInicial">Data Inicial</Label><Input id="dataInicial" type="date" value={filtros.dataInicial} onChange={(e) => setFiltros({ ...filtros, dataInicial: e.target.value })} className="bg-background/70 text-white" /></div>
          <div className="space-y-2"><Label htmlFor="dataFinal">Data Final</Label><Input id="dataFinal" type="date" value={filtros.dataFinal} onChange={(e) => setFiltros({ ...filtros, dataFinal: e.target.value })} className="bg-background/70 text-white" /></div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Receita</Label>
            <Select value={filtros.tipo} onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}>
              <SelectTrigger className="bg-background/70 text-white"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent className="dark-pessoal">
                <ScrollArea className="h-48">
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposReceita.map((tipo) => (<SelectItem key={tipo.id} value={tipo.nome_receita}>{tipo.nome_receita}</SelectItem>))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2"><FileText className="w-6 h-6" /><p className="text-sm opacity-90">Total de Receitas</p></div>
        <p className="text-4xl font-bold">R$ {totalReceitas.toFixed(2)}</p>
        <p className="text-sm opacity-90 mt-2">{receitasFiltradas.length} registro(s) encontrado(s)</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Data</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Tipo</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Origem</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Valor</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (<tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr>) : receitasFiltradas.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">Nenhuma receita encontrada</td></tr>
              ) : (
                receitasFiltradas.map((receita) => (
                  <tr key={receita.id} className="hover:bg-accent">
                    <td className="p-4 text-foreground">{new Date(receita.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="p-4 text-foreground">{receita.receita}</td>
                    <td className="p-4 text-foreground">{receita.origem}</td>
                    <td className="p-4 text-green-400 font-semibold">R$ {parseFloat(receita.valor).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default RelatorioReceitas;