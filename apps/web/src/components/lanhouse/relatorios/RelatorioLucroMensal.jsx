import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Download, DollarSign, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

const RelatorioLucroMensal = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expenseSearch, setExpenseSearch] = useState('');
  const [monthlyData, setMonthlyData] = useState(null);
  const [profitEvolution, setProfitEvolution] = useState([]);
  const [expenseDistribution, setExpenseDistribution] = useState([]);

  const fetchMonthlyReport = useCallback(async () => {
    if (!user || !selectedMonth) return;
    
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      // 1. Fetch receitas (from lm_lanc_servicos)
      // Receitas are not filtered by expense type, they represent total income.
      const { data: servicos, error: servicosError } = await supabase
        .from('lm_lanc_servicos')
        .select('valor')
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate);

      if (servicosError) {
          throw new Error(`Falha ao carregar serviços: ${servicosError.message}`);
      }

      // 2. Fetch despesas (from lm_lanc_despesas)
      // Fix for UUID ilike error: We conditionally use !inner join to filter by the text field in the referenced table.
      let despesasQuery = supabase
        .from('lm_lanc_despesas')
        .select(`valor, tipo_custo, tipo_lancamento, despesa_id, ${expenseSearch ? 'lm_despesas!inner(despesa)' : 'lm_despesas(despesa)'}`)
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate);

      if (expenseSearch) {
          // Applies ilike to the joined text field instead of the UUID
          despesasQuery = despesasQuery.ilike('lm_despesas.despesa', `%${expenseSearch}%`);
      }

      const { data: despesas, error: despesasError } = await despesasQuery;

      if (despesasError) {
          throw new Error(`Falha ao buscar despesas. Verifique o filtro: ${despesasError.message}`);
      }

      // 3. Fetch custos (from lm_lanc_custos)
      let custosQuery = supabase
        .from('lm_lanc_custos')
        .select('custo_total, tipo, tipo_folha')
        .eq('user_id', user.id)
        .gte('data_lancamento', startDate)
        .lte('data_lancamento', endDate);

      if (expenseSearch) {
          // If searching for paper type, filter custos as well
          custosQuery = custosQuery.ilike('tipo_folha', `%${expenseSearch}%`);
      }

      const { data: custos, error: custosError } = await custosQuery;

      if (custosError) {
          throw new Error(`Falha ao buscar custos: ${custosError.message}`);
      }

      // Calculate totals
      const receitaTotal = (servicos || []).reduce((sum, s) => sum + (s.valor || 0), 0);
      
      const despesasFixas = (despesas || [])
        .filter(d => d.tipo_custo === 'Fixo')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
      
      const despesasVariaveis = (despesas || [])
        .filter(d => d.tipo_custo === 'Variável')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
      
      const custoEstoque = (despesas || [])
        .filter(d => d.tipo_lancamento === 'Estoque')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
      
      const custoConsumo = (custos || [])
        .filter(c => c.tipo === 'Consumo')
        .reduce((sum, c) => sum + (c.custo_total || 0), 0);
      
      const custoPerda = (custos || [])
        .filter(c => c.tipo === 'Perda')
        .reduce((sum, c) => sum + (c.custo_total || 0), 0);
      
      const totalDespesas = despesasFixas + despesasVariaveis + custoEstoque + custoConsumo + custoPerda;
      const lucroLiquido = receitaTotal - totalDespesas;
      const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

      setMonthlyData({
        mes_ano: selectedMonth,
        receita_total: receitaTotal,
        despesas_fixas: despesasFixas,
        despesas_variaveis: despesasVariaveis,
        custo_estoque: custoEstoque,
        custo_consumo: custoConsumo,
        custo_perda: custoPerda,
        total_despesas: totalDespesas,
        lucro_liquido: lucroLiquido,
        margem_lucro: margemLucro
      });

      // Prepare expense distribution for pie chart
      setExpenseDistribution([
        { name: 'Despesas Fixas', value: despesasFixas, fill: COLORS[0] },
        { name: 'Despesas Variáveis', value: despesasVariaveis, fill: COLORS[1] },
        { name: 'Custo Estoque', value: custoEstoque, fill: COLORS[2] },
        { name: 'Custo Consumo', value: custoConsumo, fill: COLORS[3] },
        { name: 'Custo Perda', value: custoPerda, fill: COLORS[4] }
      ].filter(item => item.value > 0));

      // Fetch last 6 months for evolution chart
      const monthsData = [];
      const currentDate = new Date(selectedMonth);
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const evoYearMonth = date.toISOString().slice(0, 7);
        const [evoYear, evoMonth] = evoYearMonth.split('-');
        const evoStartDate = `${evoYear}-${evoMonth}-01`;
        const evoLastDay = new Date(parseInt(evoYear), parseInt(evoMonth), 0).getDate();
        const evoEndDate = `${evoYear}-${evoMonth}-${evoLastDay}`;

        const { data: evoServicos } = await supabase
          .from('lm_lanc_servicos')
          .select('valor')
          .eq('user_id', user.id)
          .gte('data', evoStartDate)
          .lte('data', evoEndDate);

        let evoDespesasQuery = supabase
          .from('lm_lanc_despesas')
          .select(`valor, ${expenseSearch ? 'lm_despesas!inner(despesa)' : 'lm_despesas(despesa)'}`)
          .eq('user_id', user.id)
          .gte('data', evoStartDate)
          .lte('data', evoEndDate);

        if (expenseSearch) {
            evoDespesasQuery = evoDespesasQuery.ilike('lm_despesas.despesa', `%${expenseSearch}%`);
        }
        const { data: evoDespesas } = await evoDespesasQuery;

        let evoCustosQuery = supabase
          .from('lm_lanc_custos')
          .select('custo_total')
          .eq('user_id', user.id)
          .gte('data_lancamento', evoStartDate)
          .lte('data_lancamento', evoEndDate);

        if (expenseSearch) {
            evoCustosQuery = evoCustosQuery.ilike('tipo_folha', `%${expenseSearch}%`);
        }
        const { data: evoCustos } = await evoCustosQuery;

        const receita = (evoServicos || []).reduce((sum, s) => sum + (s.valor || 0), 0);
        const despesa = (evoDespesas || []).reduce((sum, d) => sum + (d.valor || 0), 0);
        const custo = (evoCustos || []).reduce((sum, c) => sum + (c.custo_total || 0), 0);
        const lucro = receita - despesa - custo;

        monthsData.push({
          mes: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          lucro: lucro
        });
      }

      setProfitEvolution(monthsData);

    } catch (error) {
      console.error('Error fetching monthly report:', error);
      toast({
        title: 'Erro de Consulta',
        description: error.message || 'Falha ao carregar relatório mensal. Verifique se o termo de busca é válido.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth, expenseSearch, toast]);

  useEffect(() => {
    fetchMonthlyReport();
  }, [fetchMonthlyReport]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    
    return options;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Relatório Mensal de Lucro
        </h2>
        <p className="text-muted-foreground mt-1">
          Análise completa de receitas, despesas e lucratividade
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Opções de Filtro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Mês/Ano</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtrar Tipo Despesa (Opcional)</Label>
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Ex: PAPEL OFÍCIO"
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchMonthlyReport()}
                      className="pl-8 bg-background border-border text-foreground"
                  />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchMonthlyReport}
                className="bg-cyan-500 hover:bg-cyan-600 text-white w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Atualizar
              </Button>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {monthlyData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardHeader className="pb-3">
                <CardDescription className="text-green-300">Receita Total</CardDescription>
                <CardTitle className="text-3xl font-bold text-green-400">
                  {formatCurrency(monthlyData.receita_total)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
              <CardHeader className="pb-3">
                <CardDescription className="text-red-300">Total Despesas</CardDescription>
                <CardTitle className="text-3xl font-bold text-red-400">
                  {formatCurrency(monthlyData.total_despesas)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className={`bg-gradient-to-br ${monthlyData.lucro_liquido >= 0 ? 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30' : 'from-red-500/10 to-red-600/5 border-red-500/30'}`}>
              <CardHeader className="pb-3">
                <CardDescription className={monthlyData.lucro_liquido >= 0 ? 'text-cyan-300' : 'text-red-300'}>
                  Lucro Líquido
                </CardDescription>
                <CardTitle className={`text-3xl font-bold ${monthlyData.lucro_liquido >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {formatCurrency(monthlyData.lucro_liquido)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">Detalhamento Mensal</CardTitle>
              <CardDescription>
                  Análise completa de receitas e despesas {expenseSearch && <span className="text-cyan-400 font-semibold">(Filtro: {expenseSearch})</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Categoria</TableHead>
                      <TableHead className="text-right text-muted-foreground">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-border/50 bg-green-500/5">
                      <TableCell className="font-semibold text-green-400">Receita Total</TableCell>
                      <TableCell className="text-right font-mono text-green-400 font-bold">
                        {formatCurrency(monthlyData.receita_total)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="pl-8">Despesas Fixas</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(monthlyData.despesas_fixas)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="pl-8">Despesas Variáveis</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(monthlyData.despesas_variaveis)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="pl-8">Custo de Estoque</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(monthlyData.custo_estoque)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="pl-8">Custo de Consumo</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(monthlyData.custo_consumo)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="pl-8">Custo de Perda</TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {formatCurrency(monthlyData.custo_perda)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50 bg-red-500/5">
                      <TableCell className="font-semibold text-red-400">Total Despesas</TableCell>
                      <TableCell className="text-right font-mono text-red-400 font-bold">
                        {formatCurrency(monthlyData.total_despesas)}
                      </TableCell>
                    </TableRow>
                    <TableRow className={`border-border/50 ${monthlyData.lucro_liquido >= 0 ? 'bg-cyan-500/10' : 'bg-red-500/10'}`}>
                      <TableCell className={`font-bold ${monthlyData.lucro_liquido >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        LUCRO LÍQUIDO
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold text-xl ${monthlyData.lucro_liquido >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {formatCurrency(monthlyData.lucro_liquido)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border/50">
                      <TableCell className="font-semibold">Margem de Lucro</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${monthlyData.margem_lucro >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {formatPercent(monthlyData.margem_lucro)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-cyan-400">Evolução do Lucro (6 meses)</CardTitle>
                <CardDescription>Tendência de lucratividade</CardDescription>
              </CardHeader>
              <CardContent>
                {profitEvolution.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={profitEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="mes" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke="#06b6d4" 
                        strokeWidth={2}
                        name="Lucro Líquido"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-cyan-400">Distribuição de Despesas</CardTitle>
                <CardDescription>Proporção de gastos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseDistribution.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Nenhuma despesa registrada no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        </div>
      )}
    </motion.div>
  );
};

export default RelatorioLucroMensal;