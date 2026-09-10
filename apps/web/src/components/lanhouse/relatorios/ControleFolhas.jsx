import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ControleFolhas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [selectedTipoFolha, setSelectedTipoFolha] = useState('Todos');
  const [tiposFolha, setTiposFolha] = useState([]);
  const [controlData, setControlData] = useState([]);

  const fetchTiposFolha = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lm_folhas')
        .select('tipo_folha')
        .eq('user_id', user.id);

      if (error) throw error;

      const unique = [...new Set((data || []).map(item => item.tipo_folha))].filter(Boolean);
      setTiposFolha(unique);

    } catch (error) {
      console.error('Error fetching tipos de folha:', error);
    }
  }, [user]);

  const fetchControlData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const hasStartDate = dateRange.start_date && dateRange.start_date.trim() !== '';
      const hasEndDate = dateRange.end_date && dateRange.end_date.trim() !== '';

      // Fetch entradas (from lm_estoques_entradas)
      let entradasQuery = supabase
        .from('lm_estoques_entradas')
        .select('produto, quantidade, data')
        .eq('user_id', user.id);

      if (hasStartDate) entradasQuery = entradasQuery.gte('data', dateRange.start_date);
      if (hasEndDate) entradasQuery = entradasQuery.lte('data', dateRange.end_date);

      const { data: entradas, error: entradasError } = await entradasQuery;
      if (entradasError) throw entradasError;

      // Fetch saídas (from lm_estoques_saidas)
      let saidasQuery = supabase
        .from('lm_estoques_saidas')
        .select('produto, quantidade, data')
        .eq('user_id', user.id);

      if (hasStartDate) saidasQuery = saidasQuery.gte('data', dateRange.start_date);
      if (hasEndDate) saidasQuery = saidasQuery.lte('data', dateRange.end_date);

      const { data: saidas, error: saidasError } = await saidasQuery;
      if (saidasError) throw saidasError;

      // Fetch perdas (from lm_lanc_custos where tipo='Perda')
      let perdasQuery = supabase
        .from('lm_lanc_custos')
        .select('tipo_folha, quantidade, data_lancamento')
        .eq('user_id', user.id)
        .eq('tipo', 'Perda');

      if (hasStartDate) perdasQuery = perdasQuery.gte('data_lancamento', dateRange.start_date);
      if (hasEndDate) perdasQuery = perdasQuery.lte('data_lancamento', dateRange.end_date);

      const { data: perdas, error: perdasError } = await perdasQuery;
      if (perdasError) throw perdasError;

      // Group data by tipo_folha
      const grouped = {};

      (entradas || []).forEach(item => {
        const tipo = item.produto || 'Não especificado';
        if (!grouped[tipo]) {
          grouped[tipo] = {
            tipo_folha: tipo,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            saldo: 0,
            custo_unitario: 0,
            saldo_valor: 0
          };
        }
        grouped[tipo].entradas += item.quantidade || 0;
      });

      (saidas || []).forEach(item => {
        const tipo = item.produto || 'Não especificado';
        if (!grouped[tipo]) {
          grouped[tipo] = {
            tipo_folha: tipo,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            saldo: 0,
            custo_unitario: 0,
            saldo_valor: 0
          };
        }
        grouped[tipo].saidas += item.quantidade || 0;
      });

      (perdas || []).forEach(item => {
        const tipo = item.tipo_folha || 'Não especificado';
        if (!grouped[tipo]) {
          grouped[tipo] = {
            tipo_folha: tipo,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            saldo: 0,
            custo_unitario: 0,
            saldo_valor: 0
          };
        }
        grouped[tipo].perdas += item.quantidade || 0;
      });

      // Fetch custo unitário for each tipo_folha
      for (const tipo in grouped) {
        const { data: custoData } = await supabase
          .from('lm_lanc_despesas')
          .select('valor, quantidade')
          .eq('user_id', user.id)
          .eq('tipo_lancamento', 'Estoque')
          .ilike('despesa_id', `%${tipo}%`)
          .not('quantidade', 'is', null)
          .gt('quantidade', 0)
          .order('created_at', { ascending: false })
          .limit(1);

        if (custoData && custoData.length > 0) {
          grouped[tipo].custo_unitario = custoData[0].valor / custoData[0].quantidade;
        } else {
          // Try to get from lm_tipos_folha
          const { data: tipoData } = await supabase
            .from('lm_tipos_folha')
            .select('preco')
            .eq('user_id', user.id)
            .eq('tipo_folha', tipo)
            .single();

          if (tipoData) {
            grouped[tipo].custo_unitario = tipoData.preco || 0;
          }
        }
      }

      // Calculate saldo and saldo_valor
      let results = Object.values(grouped).map(item => {
        item.saldo = item.entradas - item.saidas - item.perdas;
        item.saldo_valor = item.saldo * item.custo_unitario;
        return item;
      });

      // Filter by selected tipo_folha
      if (selectedTipoFolha !== 'Todos') {
        results = results.filter(item => item.tipo_folha === selectedTipoFolha);
      }

      setControlData(results);

    } catch (error) {
      console.error('Error fetching control data:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao carregar dados de controle.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, selectedTipoFolha, toast]);

  useEffect(() => {
    fetchTiposFolha();
  }, [fetchTiposFolha]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleExport = () => {
    toast({
      title: 'Exportação',
      description: '🚧 Funcionalidade de exportação em desenvolvimento!',
      variant: 'default'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Controle de Folhas
        </h2>
        <p className="text-muted-foreground mt-1">
          Inventário e movimentação de estoque por tipo de folha
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            {!dateRange.start_date && !dateRange.end_date 
              ? 'Exibindo todos os registros (sem filtro de data)' 
              : 'Filtrar por período específico'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Folha</Label>
              <Select value={selectedTipoFolha} onValueChange={setSelectedTipoFolha}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Todos">Todos</SelectItem>
                  {tiposFolha.map((tipo, index) => (
                    <SelectItem key={index} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                onClick={fetchControlData}
                className="bg-cyan-500 hover:bg-cyan-600 text-white w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Atualizar
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setDateRange({ start_date: '', end_date: '' });
                  setSelectedTipoFolha('Todos');
                }}
                variant="outline"
                className="w-full"
                disabled={loading}
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
            <CardTitle className="text-cyan-400">Controle por Tipo de Folha</CardTitle>
            <CardDescription>Saldo de entradas, saídas e perdas</CardDescription>
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
                  <TableHead className="text-right text-muted-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      Entradas (un)
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <TrendingDown className="w-4 h-4 text-blue-400" />
                      Saídas (un)
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Perdas (un)
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground">Saldo (un)</TableHead>
                  <TableHead className="text-right text-muted-foreground">Saldo em Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                    </TableCell>
                  </TableRow>
                ) : controlData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação {dateRange.start_date || dateRange.end_date ? 'no período selecionado' : 'registrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  controlData.map((item, index) => (
                    <TableRow key={index} className="border-border/50 hover:bg-accent/30">
                      <TableCell className="font-medium">{item.tipo_folha}</TableCell>
                      <TableCell className="text-right font-mono text-green-400">
                        {item.entradas.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-400">
                        {item.saidas.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {item.perdas.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-purple-400">
                        {item.saldo.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-cyan-400">
                        {formatCurrency(item.saldo_valor)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ControleFolhas;