import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Check, Edit } from 'lucide-react';
import { findMatchingExpense } from '@/lib/gastoRealUtils';
import { useStatusCalculation } from '@/hooks/useStatusCalculation';
import { useToast } from '@/components/ui/use-toast';
import StatusEditModal from '@/components/StatusEditModal';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#E7E9ED', '#71B37C', '#EC932F'];

const RelatorioDespesasPrevistas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { calculateStatus } = useStatusCalculation();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [detailedItems, setDetailedItems] = useState([]);
  
  const [totalPrevisto, setTotalPrevisto] = useState(0);
  const [totalRealizado, setTotalRealizado] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const fetchRelatorio = useCallback(async (force = false) => {
    if (!user) return;
    if (force) setIsRefreshing(true);
    else setLoading(true);

    try {
      const startDate = format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0), 'yyyy-MM-dd');

      // Fetch Planned
      const { data: despesasPrevistas, error: plannedError } = await supabase
        .from('despesas_previstas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)
        .order('data_vencimento');

      if (plannedError) throw plannedError;

      // Fetch Actual for calculation
      const { data: despesasReais, error: actualError } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate);

      if (actualError) throw actualError;

      // Calculate logic matching DespesasPrevisadasMes
      const processedItems = (despesasPrevistas || []).map(item => {
          const matchedExpense = findMatchingExpense(despesasReais || [], item);
          const gastoReal = matchedExpense ? parseFloat(matchedExpense.valor) : 0;
          
          // Use DB status if available, otherwise calculate fallback
          // We prioritize the DB status to reflect manual edits
          const displayStatus = item.status || calculateStatus(item.data_vencimento, gastoReal, item.valor);
          
          return { 
            ...item, 
            gastoReal, 
            status: displayStatus,
            matchedId: matchedExpense?.id
          };
      });

      setDetailedItems(processedItems);

      // Group by Category
      const grouped = processedItems.reduce((acc, curr) => {
        const cat = curr.categoria || 'Sem Categoria';
        acc[cat] = (acc[cat] || 0) + parseFloat(curr.valor || 0);
        return acc;
      }, {});

      const processedChartData = Object.entries(grouped).map(([name, value]) => ({
        name,
        value,
      })).sort((a, b) => b.value - a.value);

      setChartData(processedChartData);
      setTotalPrevisto(processedItems.reduce((acc, curr) => acc + parseFloat(curr.valor), 0));
      setTotalRealizado(processedItems.reduce((acc, curr) => acc + curr.gastoReal, 0));

    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, selectedMonth, selectedYear, calculateStatus, toast]);

  useEffect(() => {
    fetchRelatorio();
  }, [fetchRelatorio]);

  const handleRefresh = () => {
    fetchRelatorio(true);
  };

  const handleOpenStatusModal = (item) => {
    setSelectedExpense(item);
    setStatusModalOpen(true);
  };

  const getStatusBadge = (status) => {
      switch(status) {
          case 'Paga': return <Badge className="bg-green-500 hover:bg-green-600 flex w-fit items-center gap-1 mx-auto whitespace-nowrap"><CheckCircle2 className="w-3 h-3 mr-1"/> Paga</Badge>;
          case 'Parcialmente Paga': return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex w-fit items-center gap-1 mx-auto whitespace-nowrap"><Check className="w-3 h-3 mr-1"/> Parcial</Badge>;
          case 'Atrasada': return <Badge className="bg-red-500 hover:bg-red-600 flex w-fit items-center gap-1 mx-auto whitespace-nowrap"><AlertCircle className="w-3 h-3 mr-1"/> Atrasada</Badge>;
          default: return <Badge className="bg-slate-500 hover:bg-slate-600 flex w-fit items-center gap-1 mx-auto whitespace-nowrap"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Despesas Previstas</h1>
          <p className="text-muted-foreground">Análise detalhada e status de pagamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className={isRefreshing ? "animate-spin" : ""}>
             <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>
              Previsto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrevisto)}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? <div className="h-full flex items-center justify-center">Carregando...</div> : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(val) => `R$${val}`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                  <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                     {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados.</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
           <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-primary text-lg">Total Previsto</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrevisto)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-purple-600 text-lg">Total Realizado</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRealizado)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Baseado em correspondência de descrição</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Detalhes das Despesas</CardTitle>
            <CardDescription>Status atual de cada despesa prevista.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Previsto</TableHead>
                        <TableHead className="text-right">Pago</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {detailedItems.length > 0 ? detailedItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="font-medium">
                                {item.descricao}
                            </TableCell>
                            <TableCell><Badge variant="outline">{item.categoria}</Badge></TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</TableCell>
                            <TableCell className="text-right text-purple-600 font-medium">
                                {item.gastoReal > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.gastoReal) : '-'}
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Alterar Status"
                                        onClick={() => handleOpenStatusModal(item)}
                                        className="text-muted-foreground hover:text-primary"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={7} className="text-center py-4">Nenhum registro encontrado.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <StatusEditModal 
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        expense={selectedExpense}
        onUpdateSuccess={handleRefresh}
      />
    </div>
  );
};

export default RelatorioDespesasPrevistas;