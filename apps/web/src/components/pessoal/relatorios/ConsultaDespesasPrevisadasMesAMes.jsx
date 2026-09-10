import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMonthlyAccountsData } from '@/hooks/useMonthlyAccountsData';
import StatusBadge from '@/components/pessoal/lancamentos/StatusBadge';
import CategoryIcon from '@/components/pessoal/lancamentos/CategoryIcon';
import ManualExpenseMatchModal from '@/components/pessoal/lancamentos/ManualExpenseMatchModal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export default function ConsultaDespesasPrevisadasMesAMes() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data, loading, error, refetch } = useMonthlyAccountsData(user?.id, selectedMonth, selectedYear);
  
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2];
  }, []);

  const subtotals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      previsto: acc.previsto + curr.valor_previsto,
      real: acc.real + curr.valor_real,
      diferenca: acc.diferenca + curr.diferenca
    }), { previsto: 0, real: 0, diferenca: 0 });
  }, [data]);

  const handleStatusClick = (expenseId) => {
    const exp = data.find(d => d.id === expenseId);
    if (exp) {
      setSelectedExpense(exp);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatório Comparativo Mensal</h1>
          <p className="text-muted-foreground">Compare suas despesas previstas com o valor real pago.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(Number(val))}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
            <SelectTrigger className="w-[110px] bg-card">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Erro ao carregar dados: {error}</p>
            <Button variant="outline" onClick={refetch} className="mt-2 text-foreground">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>Detalhamento de {MONTHS.find(m => m.value === selectedMonth)?.label} de {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton count={5} height="h-12" />
              </div>
            ) : (
              <div className="responsive-table-wrapper">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[120px]">Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor Previsto</TableHead>
                      <TableHead className="text-right">Valor Real</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-center w-[160px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhuma despesa prevista para este mês.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((item) => (
                        <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CategoryIcon category={item.categoria} className="w-4 h-4 text-primary" />
                              <span>{item.categoria}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.valor_previsto)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.valor_real)}
                          </TableCell>
                          <TableCell className={`text-right ${item.diferenca < 0 ? 'text-destructive' : item.diferenca > 0 ? 'text-positive' : 'text-muted-foreground'}`}>
                            {formatCurrency(item.diferenca)}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge 
                              status={item.status} 
                              expenseId={item.id} 
                              onClick={handleStatusClick} 
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {data.length > 0 && (
                    <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                      <TableCell colSpan={3} className="text-right">Subtotais do Mês:</TableCell>
                      <TableCell className="text-right">{formatCurrency(subtotals.previsto)}</TableCell>
                      <TableCell className="text-right text-[hsl(var(--status-pago))]">{formatCurrency(subtotals.real)}</TableCell>
                      <TableCell className={`text-right ${subtotals.diferenca < 0 ? 'text-destructive' : 'text-positive'}`}>
                        {formatCurrency(subtotals.diferenca)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ManualExpenseMatchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        expense={selectedExpense}
        onSave={refetch}
      />
    </div>
  );
}