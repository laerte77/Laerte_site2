import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, endOfMonth, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

const MONTHS = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, 
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' }, 
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' }, 
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, 
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' }, 
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

export default function ConsultaContasDoMesIgreja() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const [contasMes, setContasMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const startDate = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), 'yyyy-MM-dd');

      // Fetch planned
      const { data: previstas, error: previstasError } = await supabase
        .from('igreja_despesas_previstas')
        .select('*')
        .eq('user_id', user.id)
        .gte('vencimento', startDate)
        .lte('vencimento', endDate);

      if (previstasError) throw previstasError;

      // Fetch actual
      const { data: reais, error: reaisError } = await supabase
        .from('igreja_despesas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate);

      if (reaisError) throw reaisError;

      const processedData = previstas.map(prevista => {
        const valorPrevisto = Number(prevista.valor) || 0;
        const descPrevista = (prevista.despesa || '').toLowerCase().trim();

        // Match all actual expenses with similar description
        const matchedReais = reais.filter(r => {
          const descReal = (r.despesa || '').toLowerCase().trim();
          return descReal === descPrevista;
        });

        const valorReal = matchedReais.reduce((sum, r) => sum + (Number(r.valor) || 0), 0);
        const diferenca = valorReal - valorPrevisto;

        // Status Logic
        let calculatedStatus = 'Pendente';
        if (valorReal >= valorPrevisto && valorPrevisto > 0) {
          calculatedStatus = 'Pago';
        } else if (valorReal > 0 && valorReal < valorPrevisto) {
          calculatedStatus = 'Pendente'; // Partial usually treated as pendente unless strictly defined
        } else if (valorReal === 0) {
          calculatedStatus = 'Pendente';
        }

        // Check if Vencido (overdue)
        const vencimentoDate = parseISO(prevista.vencimento);
        if (calculatedStatus === 'Pendente' && isBefore(vencimentoDate, startOfDay(new Date()))) {
            calculatedStatus = 'Vencido';
        }

        if (valorReal === 0 && prevista.status === 'Pago') {
           calculatedStatus = 'Pago'; // Override if manually marked in db
        }

        return { 
          id: prevista.id, 
          data_vencimento: prevista.vencimento, 
          descricao: prevista.despesa, 
          categoria: 'Despesa Fixa', // Usually fixed expenses, can be extended
          valor_previsto: valorPrevisto, 
          valor_real: valorReal, 
          diferenca: diferenca, 
          status: calculatedStatus 
        };
      });

      processedData.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
      setContasMes(processedData);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const years = useMemo(() => { 
    const current = new Date().getFullYear(); 
    return [current - 2, current - 1, current, current + 1, current + 2]; 
  }, []);

  const filteredData = useMemo(() => {
    return contasMes.filter(item => {
      if (selectedStatus === 'Todos') return true;
      return item.status === selectedStatus;
    });
  }, [contasMes, selectedStatus]);

  const subtotals = useMemo(() => { 
    return filteredData.reduce((acc, curr) => ({ 
      previsto: acc.previsto + curr.valor_previsto, 
      real: acc.real + curr.valor_real, 
      diferenca: acc.diferenca + curr.diferenca 
    }), { previsto: 0, real: 0, diferenca: 0 }); 
  }, [filteredData]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pago': 
        return <Badge className="badge-pago"><CheckCircle2 className="w-3 h-3 mr-1"/> Pago</Badge>;
      case 'Vencido': 
        return <Badge className="badge-vencido"><AlertCircle className="w-3 h-3 mr-1"/> Vencido</Badge>;
      case 'Pendente':
      default: 
        return <Badge className="badge-pendente"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Contas do Mês</h1>
          <p className="text-muted-foreground">Acompanhamento e status das despesas do mês selecionado.</p>
        </div>
      </div>

      <div className="filter-section border-primary/20">
        <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(Number(val))}>
          <SelectTrigger className="w-full md:w-[140px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
          <SelectTrigger className="w-full md:w-[110px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full md:w-[180px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Status</SelectItem>
            <SelectItem value="Pago">Pago</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchData} 
          disabled={loading} 
          className="w-full md:w-auto mt-2 md:mt-0 text-primary border-primary/50 hover:bg-primary/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Erro ao carregar dados: {error}</p>
            <Button variant="outline" onClick={fetchData} className="mt-2">Tentar Novamente</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-primary/20 shadow-sm glow-neon">
          <CardHeader className="border-b border-primary/10 pb-4">
            <CardTitle className="text-primary">Listagem de Contas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <LoadingSkeleton count={5} height="h-12" />
              </div>
            ) : (
              <div className="responsive-table-wrapper">
                <Table className="neon-zebra-table">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[120px]">Data Vencimento</TableHead>
                      <TableHead>Descrição da Despesa</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor Previsto</TableHead>
                      <TableHead className="text-right">Valor Real</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-center w-[160px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhuma conta encontrada para o período e filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id} className="transition-colors hover:bg-primary/5">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-foreground">{item.descricao}</TableCell>
                          <TableCell className="text-muted-foreground">{item.categoria}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valor_previsto)}</TableCell>
                          <TableCell className="text-right">{item.valor_real > 0 ? formatCurrency(item.valor_real) : "-"}</TableCell>
                          <TableCell className={`text-right ${item.diferenca < 0 ? 'text-emerald-500' : item.diferenca > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {formatCurrency(item.diferenca)}
                          </TableCell>
                          <TableCell className="text-center align-middle">{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {filteredData.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold border-t border-primary/20">
                      <TableCell colSpan={3} className="text-right">Totais:</TableCell>
                      <TableCell className="text-right">{formatCurrency(subtotals.previsto)}</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(subtotals.real)}</TableCell>
                      <TableCell className={`text-right ${subtotals.diferenca < 0 ? 'text-emerald-500' : subtotals.diferenca > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
    </div>
  );
}