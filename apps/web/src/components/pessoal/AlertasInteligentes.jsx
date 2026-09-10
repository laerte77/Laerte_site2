import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, PiggyBank, Target, Lightbulb, ArrowRight, Wallet, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const AlertasInteligentes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState([]);
  const [summary, setSummary] = useState({
    totalSavingsPotential: 0,
    investmentGoal: 0,
    monthlyExcess: 0,
    totalCurrent: 0,
    totalPrev: 0
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getRecommendation = (categoryName, diff) => {
    const catLower = (categoryName || "").toLowerCase();
    if (diff <= 0) return "Ótimo trabalho! Manutenção ou redução de gastos.";
    
    if (catLower.includes('alimentação') || catLower.includes('mercado')) return "Revise itens supérfluos na lista de compras.";
    if (catLower.includes('transporte') || catLower.includes('combustível')) return "Avalie rotas alternativas ou transporte compartilhado.";
    if (catLower.includes('lazer')) return "Defina um teto máximo para saídas no fim de semana.";
    if (catLower.includes('fixa') || catLower.includes('casa')) return "Verifique consumo de luz/água ou renegocie contratos.";
    if (catLower.includes('cartão') || catLower.includes('crédito')) return "Atenção ao acúmulo de parcelas e juros.";
    
    return "Identifique gastos não essenciais nesta categoria.";
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 

    // Current Month Range
    const currentStart = new Date(currentYear, currentMonth, 1).toISOString();
    const currentEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    // Previous Month Range
    const prevStart = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const prevEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

    try {
      // 1. Fetch all tipos_despesa to know the structure (Tipo -> Categoria)
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_despesa')
        .select('nome_despesa, categoria')
        .eq('user_id', user.id);
      
      if (tiposError) throw tiposError;

      // Map: Tipo Name -> Category
      const tipoToCategoryMap = {};
      const categoriesSet = new Set();
      const tiposSet = new Set();

      tiposData?.forEach(t => {
        if (t.nome_despesa) {
            tipoToCategoryMap[t.nome_despesa] = t.categoria || 'Sem Categoria';
            categoriesSet.add(t.categoria || 'Sem Categoria');
            tiposSet.add(t.nome_despesa);
        }
      });

      // 2. Fetch expenses for Current Month
      const { data: currentData, error: currentError } = await supabase
        .from('despesas')
        .select('valor, despesa, categoria') 
        .eq('user_id', user.id)
        .gte('data', currentStart)
        .lte('data', currentEnd);

      if (currentError) throw currentError;

      // 3. Fetch expenses for Previous Month
      const { data: prevData, error: prevError } = await supabase
        .from('despesas')
        .select('valor, despesa, categoria')
        .eq('user_id', user.id)
        .gte('data', prevStart)
        .lte('data', prevEnd);

      if (prevError) throw prevError;

      // Helper to sum by "Tipo de Despesa" (field 'despesa' in expenses table)
      const sumByTipo = (data) => {
        const sums = {};
        data.forEach(item => {
          // 'despesa' column usually holds the name of the expense type (e.g. "Internet", "Aluguel")
          const tipoName = item.despesa || "Outros";
          sums[tipoName] = (sums[tipoName] || 0) + Number(item.valor);
          
          // Fallback: if this tipo wasn't in our map, try to use the category from the expense record itself
          if (!tipoToCategoryMap[tipoName]) {
             tipoToCategoryMap[tipoName] = item.categoria || 'Sem Categoria';
             categoriesSet.add(item.categoria || 'Sem Categoria');
             tiposSet.add(tipoName);
          }
        });
        return sums;
      };

      const currentSums = sumByTipo(currentData || []);
      const prevSums = sumByTipo(prevData || []);

      // 4. Build hierarchical structure: Category -> [Tipos]
      // We iterate over all known categories
      const hierarchicalData = [];
      let totalExcess = 0;
      let totalCurrent = 0;
      let totalPrev = 0;

      // Iterate through all unique categories found (from registry + expenses)
      Array.from(categoriesSet).forEach(catName => {
        // Find all tipos that belong to this category
        const tiposInThisCat = Array.from(tiposSet).filter(tName => tipoToCategoryMap[tName] === catName);

        if (tiposInThisCat.length === 0) return;

        let catCurrent = 0;
        let catPrev = 0;
        const tiposDetails = [];

        tiposInThisCat.forEach(tName => {
            const cVal = currentSums[tName] || 0;
            const pVal = prevSums[tName] || 0;
            const diff = cVal - pVal;

            // CRITERIA: ONLY show items that had expenses in the PREVIOUS month
            if (pVal > 0) { 
                tiposDetails.push({
                    name: tName,
                    current: cVal,
                    previous: pVal,
                    diff: diff
                });
                catCurrent += cVal;
                catPrev += pVal;
            }
        });

        // CRITERIA: ONLY show categories that had expenses in the PREVIOUS month (determined by if they have items)
        if (tiposDetails.length === 0) return;

        const catDiff = catCurrent - catPrev;
        totalCurrent += catCurrent;
        totalPrev += catPrev;
        if (catDiff > 0) totalExcess += catDiff;

        // Sort items within category by highest current spend
        tiposDetails.sort((a, b) => b.current - a.current);

        hierarchicalData.push({
            category: catName,
            current: catCurrent,
            previous: catPrev,
            diff: catDiff,
            items: tiposDetails,
            recommendation: getRecommendation(catName, catDiff)
        });
      });

      // Sort categories by highest current total spend
      hierarchicalData.sort((a, b) => b.current - a.current);

      setAnalysis(hierarchicalData);
      setSummary({
        totalSavingsPotential: totalExcess,
        investmentGoal: totalExcess * 0.8,
        monthlyExcess: totalExcess,
        totalCurrent,
        totalPrev
      });

    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast({ title: 'Erro na análise', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Analisando seus padrões de consumo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Alertas Inteligentes
            </h1>
            <p className="text-muted-foreground">Comparativo detalhado por tipo de despesa (Mês Anterior vs Atual).</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" className="hidden md:flex">
            Atualizar Análise
          </Button>
        </div>
      </motion.div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Aumento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.monthlyExcess)}</div>
              <p className="text-xs text-muted-foreground mt-1">Soma dos aumentos em relação ao mês anterior</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
                <Target className="w-4 h-4" /> Total Gasto (Atual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{formatCurrency(summary.totalCurrent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                 Mês Anterior: {formatCurrency(summary.totalPrev)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <PiggyBank className="w-4 h-4" /> Sugestão Investimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.investmentGoal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Se cortar os excessos</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analysis List - Hierarchical */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Detalhamento por Categoria e Tipo
        </h2>

        {analysis.length === 0 ? (
           <Card className="p-8 text-center text-muted-foreground bg-muted/20 border-dashed">
             <p>Nenhuma despesa encontrada no mês anterior para comparação.</p>
           </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {analysis.map((categoryGroup, index) => (
              <motion.div
                key={categoryGroup.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`border-l-4 ${categoryGroup.diff > 0 ? 'border-l-red-500' : 'border-l-emerald-500'} bg-card/80 backdrop-blur`}>
                  <CardContent className="p-0">
                    <Collapsible className="group">
                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg capitalize">{categoryGroup.category}</h3>
                                    <Badge variant={categoryGroup.diff > 0 ? "destructive" : "secondary"} className="text-[10px] h-5">
                                        {categoryGroup.diff > 0 ? 'Aumentou' : 'Reduziu/Manteve'}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                    <span>Total Anterior: <strong>{formatCurrency(categoryGroup.previous)}</strong></span>
                                    <ArrowRight className="w-3 h-3 hidden sm:block" />
                                    <span className="sm:hidden">↓</span>
                                    <span>Total Atual: <strong className={categoryGroup.diff > 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(categoryGroup.current)}</strong></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${categoryGroup.diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {categoryGroup.diff > 0 ? '+' : ''}{formatCurrency(categoryGroup.diff)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Diferença</p>
                                </div>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        <span className="sr-only">Toggle details</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>

                        {/* Collapsible Content: Detailed Breakdown */}
                        <CollapsibleContent>
                            <div className="px-5 pb-5 pt-0 border-t border-border/50">
                                <div className="mt-4 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detalhamento dos Tipos</h4>
                                    {categoryGroup.items.map((item, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                                            <div className="font-medium text-foreground flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${item.diff > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                                {item.name}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 sm:mt-0 pl-4 sm:pl-0 text-muted-foreground">
                                                <span className="text-xs">Ant: {formatCurrency(item.previous)}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className={`font-medium ${item.diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {formatCurrency(item.current)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Recommendation Box inside the collapse */}
                                <div className={`mt-4 p-3 rounded-lg border ${categoryGroup.diff > 0 ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}>
                                    <p className="text-sm flex gap-2">
                                        {categoryGroup.diff > 0 ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                                        <span className="font-medium">Dica:</span> {categoryGroup.recommendation}
                                    </p>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Savings Motivation */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Planejamento Futuro
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl">
            Se você mantiver esses cortes de gastos pelos próximos 12 meses e investir a diferença, você poderá acumular aproximadamente:
          </p>
          
          <div className="flex flex-col sm:flex-row gap-8">
            <div>
              <p className="text-sm text-blue-200 uppercase tracking-wider font-semibold">Em 1 Ano</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                {formatCurrency(summary.monthlyExcess * 12)}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-200 uppercase tracking-wider font-semibold">Em 5 Anos (com juros)</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-white">
                {formatCurrency(summary.monthlyExcess * 12 * 5 * 1.15)} 
              </p>
              <p className="text-[10px] text-blue-300">*Estimativa com juros compostos conservadores</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AlertasInteligentes;