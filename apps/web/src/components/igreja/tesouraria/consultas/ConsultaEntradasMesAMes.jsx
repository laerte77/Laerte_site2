import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, FileText } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { parseISO, getMonth, getYear, format } from 'date-fns';
import { motion } from 'framer-motion';
import NeonBorder from '@/components/ui/NeonBorder';
import { generatePDF } from '@/lib/ExportUtils';

const ConsultaEntradasMesAMes = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = new Date(parseInt(filterYear), 0, 1).toISOString();
      const endDate = new Date(parseInt(filterYear), 11, 31, 23, 59, 59).toISOString();

      // Fetch all entries for the year to aggregate
      const query = getAccessibleDataQuery(user.id, isAdmin, 'igreja_entradas', 'data, valor')
        .gte('data', startDate)
        .lte('data', endDate);

      const { data: result, error } = await query;
      if (error) throw error;
      
      setData(result || []);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin, filterYear]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const processedData = useMemo(() => {
    const monthlyTotals = Array(12).fill(0);

    data.forEach(item => {
        const date = parseISO(item.data);
        if (getYear(date).toString() === filterYear) {
            const monthIdx = getMonth(date);
            monthlyTotals[monthIdx] += Number(item.valor) || 0;
        }
    });

    const formattedData = monthlyTotals.map((total, index) => ({
        mes: mesesNomes[index],
        mesIndex: index,
        valor: total
    }));

    // Find top 3 (highest) and bottom 3 (lowest, excluding 0 to be more meaningful)
    const sortedVals = [...formattedData].sort((a, b) => b.valor - a.valor);
    const top3 = sortedVals.slice(0, 3).map(d => d.mesIndex);
    
    // Filter non-zeros for bottom calculation, fallback to zero if everything is 0
    const nonZeroSorted = sortedVals.filter(d => d.valor > 0).reverse();
    const bottomArray = nonZeroSorted.length >= 3 ? nonZeroSorted : [...sortedVals].reverse();
    const bottom3 = bottomArray.slice(0, 3).map(d => d.mesIndex);

    return formattedData.map(item => ({
        ...item,
        isTop3: top3.includes(item.mesIndex) && item.valor > 0,
        isBottom3: bottom3.includes(item.mesIndex) && item.valor > 0 && !top3.includes(item.mesIndex) // ensure no overlap if very few months have data
    }));

  }, [data, filterYear]);

  const totalGeral = processedData.reduce((acc, curr) => acc + curr.valor, 0);

  const handleExportPDF = () => {
    try {
      const headers = ['Mês', 'Valor Total Arrecadado', 'Status'];
      const rows = processedData.map(item => [
        item.mes,
        formatCurrency(item.valor),
        item.isTop3 ? 'Top 3 Maior' : item.isBottom3 ? 'Top 3 Menor' : 'Médio'
      ]);
      
      rows.push(['TOTAL GERAL', formatCurrency(totalGeral), '']);

      generatePDF(
        `Arrecadação Mês a Mês - ${filterYear}`,
        headers,
        rows,
        `EntradasMesAMes_${filterYear}`
      );
      toast({ title: 'Sucesso', description: 'PDF gerado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao gerar PDF.', variant: 'destructive' });
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-[hsl(var(--neon-igreja))]/10 rounded-xl glow-igreja">
                  <TrendingUp className="w-6 h-6 text-[hsl(var(--neon-igreja))]" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-foreground">Entradas Mês a Mês</h1>
                  <p className="text-muted-foreground text-sm">Visão anual de arrecadação da Igreja</p>
              </div>
          </div>
          <Button onClick={handleExportPDF} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
             <FileText className="w-4 h-4 mr-2" /> Gerar PDF
          </Button>
      </div>

      <NeonBorder neonColor="igreja">
        <Card className="bg-card/50 backdrop-blur-sm border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-end md:items-center justify-between">
              <div className="w-full md:w-64 space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Selecione o Ano</label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="bg-input/50"><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 px-6 border border-border/50 text-right w-full md:w-auto">
                 <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Total do Ano</p>
                 <p className="text-3xl font-bold text-[hsl(var(--neon-igreja))] drop-shadow-md">
                     {formatCurrency(totalGeral)}
                 </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </NeonBorder>

      <motion.div variants={itemVariants}>
        <Card className="bg-card shadow-xl border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--neon-igreja))]" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-secondary/80">
                    <TableRow className="border-border/50">
                      <TableHead className="font-semibold py-4 w-1/3 pl-6">Mês</TableHead>
                      <TableHead className="font-semibold py-4 text-right w-1/3">Valor Total Arrecadado</TableHead>
                      <TableHead className="font-semibold py-4 text-center w-1/3 pr-6">Destaque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {processedData.map((item) => (
                        <TableRow 
                          key={item.mesIndex} 
                          className={`border-border/50 transition-colors ${
                              item.isTop3 ? 'bg-[hsl(var(--highlight-top))]/10 hover:bg-[hsl(var(--highlight-top))]/20' : 
                              item.isBottom3 ? 'bg-[hsl(var(--highlight-bottom))]/10 hover:bg-[hsl(var(--highlight-bottom))]/20' : 
                              'hover:bg-secondary/30'
                          }`}
                        >
                          <TableCell className="font-medium text-foreground py-4 pl-6 text-lg">
                            {item.mes}
                          </TableCell>
                          <TableCell className={`text-right py-4 font-bold text-lg ${
                              item.isTop3 ? 'text-[hsl(var(--highlight-top))]' : 
                              item.isBottom3 ? 'text-[hsl(var(--highlight-bottom))]' : 
                              'text-foreground'
                          }`}>
                            {formatCurrency(item.valor)}
                          </TableCell>
                          <TableCell className="text-center py-4 pr-6">
                            {item.isTop3 && (
                                <Badge variant="outline" className="bg-[hsl(var(--highlight-top))]/20 text-[hsl(var(--highlight-top))] border-[hsl(var(--highlight-top))]/50 px-3 py-1 text-sm font-medium">
                                    Maior Arrecadação
                                </Badge>
                            )}
                            {item.isBottom3 && (
                                <Badge variant="outline" className="bg-[hsl(var(--highlight-bottom))]/20 text-[hsl(var(--highlight-bottom))] border-[hsl(var(--highlight-bottom))]/50 px-3 py-1 text-sm font-medium">
                                    Menor Arrecadação
                                </Badge>
                            )}
                            {!item.isTop3 && !item.isBottom3 && item.valor > 0 && (
                                <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {item.valor === 0 && (
                                <span className="text-muted-foreground/50 text-sm italic">Sem dados</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ConsultaEntradasMesAMes;