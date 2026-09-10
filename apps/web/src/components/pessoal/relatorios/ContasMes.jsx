import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableFooter, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useContasMesData } from '@/hooks/useContasMesData';
import CategoryIcon from '@/components/pessoal/lancamentos/CategoryIcon';
import StatusChangeModal from '@/components/StatusChangeModal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

const MONTHS = [{ value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' }, { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' }, { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }];

export default function ContasMes() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const { contasMes, loading, error, refetch } = useContasMesData(user?.id, selectedMonth, selectedYear);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const years = useMemo(() => { const current = new Date().getFullYear(); return [current - 2, current - 1, current, current + 1, current + 2]; }, []);
  const categories = useMemo(() => { const unique = [...new Set(contasMes.map(item => item.categoria).filter(Boolean))]; return ['Todas', ...unique]; }, [contasMes]);

  const filteredData = useMemo(() => {
    return contasMes.filter(item => {
      const matchCat = selectedCategory === 'Todas' || item.categoria === selectedCategory;
      const matchStatus = selectedStatus === 'Todos' || item.status === selectedStatus;
      return matchCat && matchStatus;
    });
  }, [contasMes, selectedCategory, selectedStatus]);

  const subtotals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({ previsto: acc.previsto + curr.valor_previsto, real: acc.real + curr.valor_real, diferenca: acc.diferenca + curr.diferenca }), { previsto: 0, real: 0, diferenca: 0 });
  }, [filteredData]);

  const handleAdjustmentClick = (expense) => { setSelectedExpense(expense); setIsModalOpen(true); };

  const getStatusBadge = (status, expense) => {
    let badgeContent;
    switch (status) {
      case 'Pago': badgeContent = <Badge className="bg-[hsl(var(--status-pago))] text-white hover:bg-[hsl(var(--status-pago))]/80"><CheckCircle2 className="w-3 h-3 mr-1"/> Pago</Badge>; break;
      case 'Pago Parcialmente': badgeContent = <Badge className="bg-[hsl(var(--status-parcial))] text-white hover:bg-[hsl(var(--status-parcial))]/80"><AlertTriangle className="w-3 h-3 mr-1"/> Parcial</Badge>; break;
      case 'Atrasado': badgeContent = <Badge className="bg-[hsl(var(--status-atrasado))] text-white hover:bg-[hsl(var(--status-atrasado))]/80"><AlertCircle className="w-3 h-3 mr-1"/> Atrasado</Badge>; break;
      default: badgeContent = <Badge className="bg-[hsl(var(--status-pendente))] text-white hover:bg-[hsl(var(--status-pendente))]/80"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
    }
    return (
      <div className="flex flex-col items-center gap-1">
        {badgeContent}
        {expense.origem !== 'cartao' && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAdjustmentClick(expense)}>Mudar Status</Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold">Contas do Mês</h1><p className="text-muted-foreground">Acompanhamento e status das despesas do mês selecionado.</p></div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(Number(val))}><SelectTrigger className="w-full md:w-[140px] bg-input"><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent></Select>
        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}><SelectTrigger className="w-full md:w-[110px] bg-input"><SelectValue placeholder="Ano" /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-full md:w-[200px] bg-input"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-full md:w-[180px] bg-input"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os Status</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Pago Parcialmente">Pago Parcialmente</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem></SelectContent></Select>
        <Button variant="outline" size="icon" onClick={refetch} disabled={loading} className="w-full md:w-auto mt-2 md:mt-0"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>
      {error ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive"><CardContent className="flex flex-col items-center justify-center p-6 gap-2"><AlertCircle className="w-8 h-8" /><p>Erro ao carregar dados: {error}</p><Button variant="outline" onClick={refetch} className="mt-2 text-foreground">Tentar Novamente</Button></CardContent></Card>
      ) : (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="border-b border-border/50 pb-4"><CardTitle>Listagem de Contas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (<div className="p-6"><LoadingSkeleton count={5} height="h-12" /></div>) : (
              <div className="responsive-table-wrapper">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow><TableHead className="w-[120px]">Data Vencimento</TableHead><TableHead>Descrição da Despesa</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor Previsto</TableHead><TableHead className="text-right">Valor Real</TableHead><TableHead className="text-right">Diferença</TableHead><TableHead className="text-center w-[160px]">Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                          <TableCell className="font-medium whitespace-nowrap">{format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                          <TableCell><div className="flex items-center gap-2"><CategoryIcon category={item.categoria} className="w-4 h-4 text-primary" />{item.descricao}</div></TableCell>
                          <TableCell className="text-muted-foreground">{item.categoria}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valor_previsto)}</TableCell>
                          <TableCell className="text-right">{item.valor_real > 0 ? formatCurrency(item.valor_real) : "-"}</TableCell>
                          <TableCell className={`text-right ${item.diferenca < 0 ? 'text-destructive' : item.diferenca > 0 ? 'text-positive' : 'text-muted-foreground'}`}>{formatCurrency(item.diferenca)}</TableCell>
                          <TableCell className="text-center align-middle">{getStatusBadge(item.status, item)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {filteredData.length > 0 && (
                    <TableFooter>
                    <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                      <TableCell colSpan={3} className="text-right">Subtotais:</TableCell><TableCell className="text-right">{formatCurrency(subtotals.previsto)}</TableCell><TableCell className="text-right text-[hsl(var(--status-pago))]">{formatCurrency(subtotals.real)}</TableCell><TableCell className={`text-right ${subtotals.diferenca < 0 ? 'text-destructive' : 'text-positive'}`}>{formatCurrency(subtotals.diferenca)}</TableCell><TableCell></TableCell>
                    </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <StatusChangeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onStatusChange={refetch} currentStatus={selectedExpense?.status} tableName="despesas_previstas" recordId={selectedExpense?.id} />
    </div>
  );
}