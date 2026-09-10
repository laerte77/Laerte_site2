import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ConsultaDividasPrevisadasMesAMes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState(Array(12).fill({ month: '', total: 0, percentage: 0 }));
  const [totalYear, setTotalYear] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data, error } = await supabase
        .from('despesas_previstas')
        .select('valor, data_vencimento')
        .eq('user_id', user.id)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (error) throw error;

      const monthlyTotals = Array(12).fill(0);
      let grandTotal = 0;

      data?.forEach(item => {
        const date = new Date(item.data_vencimento);
        const monthIndex = date.getUTCMonth();
        const valor = Number(item.valor) || 0;
        monthlyTotals[monthIndex] += valor;
        grandTotal += valor;
      });

      const processedData = monthlyTotals.map((total, index) => ({
        month: MONTHS[index],
        total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0
      }));

      setMonthlyData(processedData);
      setTotalYear(grandTotal);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao buscar dados anuais.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedYear]);

  const getRowColorClass = (percentage) => {
    if (percentage > 10) return 'bg-red-500/20 text-red-100';
    if (percentage < 5 && percentage > 0) return 'bg-green-500/20 text-green-100';
    return ''; // neutral
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dívidas Previstas Mês a Mês</h1>
          <p className="text-muted-foreground">Acompanhe suas obrigações financeiras anuais.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] bg-card">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {['2024', '2025', '2026', '2027', '2028'].map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border/50">
          <CardTitle>Resumo de {selectedYear}</CardTitle>
          <div className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
            Total Previsto: {formatCurrency(totalYear)}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[150px]">Mês</TableHead>
                    <TableHead className="text-right w-[200px]">Total Previsto</TableHead>
                    <TableHead className="text-right">Percentual do Ano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((data, idx) => (
                    <TableRow key={idx} className={`transition-colors ${data.total > 0 ? getRowColorClass(data.percentage) : ''}`}>
                      <TableCell className="font-medium">{data.month}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(data.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {data.percentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}