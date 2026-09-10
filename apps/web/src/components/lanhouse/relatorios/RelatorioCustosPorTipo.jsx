import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#06b6d4', '#ef4444'];

const RelatorioCustosPorTipo = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [costsByType, setCostsByType] = useState([]);

  const fetchCostsByType = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('lm_lanc_custos')
        .select('tipo_folha, tipo, custo_total, data_lancamento')
        .eq('user_id', user.id);

      const hasStartDate = dateRange.start_date && dateRange.start_date.trim() !== '';
      const hasEndDate = dateRange.end_date && dateRange.end_date.trim() !== '';

      if (hasStartDate) {
        query = query.gte('data_lancamento', dateRange.start_date);
      }
      if (hasEndDate) {
        query = query.lte('data_lancamento', dateRange.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      const grouped = {};
      
      (data || []).forEach(item => {
        const tipoFolha = item.tipo_folha || 'Não especificado';
        
        if (!grouped[tipoFolha]) {
          grouped[tipoFolha] = {
            tipo_folha: tipoFolha,
            total_consumo: 0,
            total_perda: 0,
            total_custos: 0,
            margem_perda: 0
          };
        }
        
        if (item.tipo === 'Consumo') {
          grouped[tipoFolha].total_consumo += item.custo_total || 0;
        } else if (item.tipo === 'Perda') {
          grouped[tipoFolha].total_perda += item.custo_total || 0;
        }
      });

      const results = Object.values(grouped).map(item => {
        item.total_custos = item.total_consumo + item.total_perda;
        item.margem_perda = item.total_custos > 0 
          ? ((item.total_perda / item.total_custos) * 100) 
          : 0;
        return item;
      });

      results.sort((a, b) => b.total_custos - a.total_custos);

      setCostsByType(results);

    } catch (error) {
      console.error('Error fetching costs by type:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao carregar relatório de custos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, toast]);

  useEffect(() => {
    fetchCostsByType();
  }, [fetchCostsByType]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const handleExport = () => {
    toast({
      title: 'Exportação',
      description: '🚧 Funcionalidade de exportação em desenvolvimento!',
      variant: 'default'
    });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-semibold">{payload[0].payload.tipo_folha}</p>
          <p className="text-cyan-400">{payload[0].name}: {formatCurrency(payload[0].value)}</p>
          {payload[1] && (
            <p className="text-red-400">{payload[1].name}: {formatCurrency(payload[1].value)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Relatório de Custos por Tipo de Folha
        </h2>
        <p className="text-muted-foreground mt-1">
          Análise detalhada de consumo e perdas por tipo de folha
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Análise
          </CardTitle>
          <CardDescription>
            {!dateRange.start_date && !dateRange.end_date 
              ? 'Exibindo todos os registros (sem filtro de data)' 
              : 'Filtrar por período específico'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchCostsByType}
                className="bg-cyan-500 hover:bg-cyan-600 text-white w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Atualizar
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setDateRange({ start_date: '', end_date: '' })}
                variant="outline"
                className="w-full"
                disabled={loading || (!dateRange.start_date && !dateRange.end_date)}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-cyan-400">Custos por Tipo de Folha</CardTitle>
            <CardDescription>Detalhamento de consumo e perdas</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground">Tipo de Folha</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Consumo (R$)</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Perda (R$)</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Custos (R$)</TableHead>
                  <TableHead className="text-right text-muted-foreground">Margem de Perda (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                    </TableCell>
                  </TableRow>
                ) : costsByType.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum custo registrado {dateRange.start_date || dateRange.end_date ? 'no período selecionado' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  costsByType.map((item, index) => (
                    <TableRow key={index} className="border-border/50 hover:bg-accent/30">
                      <TableCell className="font-medium">{item.tipo_folha}</TableCell>
                      <TableCell className="text-right font-mono text-cyan-400">
                        {formatCurrency(item.total_consumo)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(item.total_perda)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(item.total_custos)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={item.margem_perda > 10 ? 'text-red-400' : 'text-muted-foreground'}>
                          {formatPercent(item.margem_perda)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400">Consumo vs Perda por Tipo de Folha</CardTitle>
          <CardDescription>Comparação visual de custos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : costsByType.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-muted-foreground">
              Nenhum dado para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={costsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="tipo_folha" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total_consumo" fill={COLORS[0]} name="Consumo" />
                <Bar dataKey="total_perda" fill={COLORS[1]} name="Perda" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RelatorioCustosPorTipo;