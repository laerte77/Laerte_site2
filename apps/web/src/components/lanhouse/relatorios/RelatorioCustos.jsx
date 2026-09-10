import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  consumo: '#06b6d4', // cyan-500
  perda: '#ef4444'    // red-500
};

const RelatorioCustos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [costData, setCostData] = useState({
    total_consumo: 0,
    total_perda: 0,
    total_custos: 0,
    margem_perda: 0
  });
  const [chartData, setChartData] = useState([]);

  const fetchCostData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all costs
      const { data, error } = await supabase
        .from('lm_lanc_custos')
        .select('tipo, custo_total, quantidade')
        .eq('user_id', user.id)
        .gte('data_lancamento', dateRange.start_date)
        .lte('data_lancamento', dateRange.end_date);

      if (error) throw error;

      // Aggregate by tipo
      const consumoTotal = (data || [])
        .filter(item => item.tipo === 'Consumo')
        .reduce((sum, item) => sum + (item.custo_total || 0), 0);

      const perdaTotal = (data || [])
        .filter(item => item.tipo === 'Perda')
        .reduce((sum, item) => sum + (item.custo_total || 0), 0);

      const totalCustos = consumoTotal + perdaTotal;
      const margemPerda = totalCustos > 0 ? (perdaTotal / totalCustos) * 100 : 0;

      setCostData({
        total_consumo: consumoTotal,
        total_perda: perdaTotal,
        total_custos: totalCustos,
        margem_perda: margemPerda
      });

      // Prepare chart data
      setChartData([
        { name: 'Consumo', value: consumoTotal, fill: COLORS.consumo },
        { name: 'Perda', value: perdaTotal, fill: COLORS.perda }
      ]);

    } catch (error) {
      console.error('Error fetching cost data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de custos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, toast]);

  useEffect(() => {
    fetchCostData();
  }, [fetchCostData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-semibold">{payload[0].name}</p>
          <p className="text-cyan-400">{formatCurrency(payload[0].value)}</p>
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
          Relatório de Custos
        </h2>
        <p className="text-muted-foreground mt-1">
          Análise de consumo e perdas de folhas
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onClick={fetchCostData}
                className="bg-cyan-500 hover:bg-cyan-600 text-white w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
          <CardHeader className="pb-3">
            <CardDescription className="text-cyan-300">Total de Consumo</CardDescription>
            <CardTitle className="text-2xl font-bold text-cyan-400">
              {formatCurrency(costData.total_consumo)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-300">Total de Perda</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-400">
              {formatCurrency(costData.total_perda)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-300">Total de Custos</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-400">
              {formatCurrency(costData.total_custos)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardDescription className="text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Margem de Perda
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {formatPercent(costData.margem_perda)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-cyan-400">Distribuição de Custos</CardTitle>
            <CardDescription>Comparação entre consumo e perda</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : costData.total_custos === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum custo registrado no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" fill="#06b6d4" name="Valor (R$)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-cyan-400">Proporção de Custos</CardTitle>
            <CardDescription>Visualização em pizza</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              </div>
            ) : costData.total_custos === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                Nenhum custo registrado no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default RelatorioCustos;