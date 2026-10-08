import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileBarChart3,
  Filter,
  Receipt,
  CircleDollarSign,
  WalletCards,
  CircleAlert,
} from 'lucide-react';
import { format, parseISO, endOfMonth } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import CategoryIcon from '@/components/CategoryIcon';
import StatusChangeModal from '@/components/StatusChangeModal';
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
  { value: 12, label: 'Dezembro' },
];

export default function ContasMesLM() {
  const { user } = useAuth();

  const currentDate = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear()
  );
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const [contasMes, setContasMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = format(
        new Date(selectedYear, selectedMonth - 1, 1),
        'yyyy-MM-dd'
      );

      const endDate = format(
        endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)),
        'yyyy-MM-dd'
      );

      const { data: previstas, error: previstasError } = await supabase
        .from('lm_despesas_previstas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (previstasError) throw previstasError;

      const { data: reais, error: reaisError } = await supabase
        .from('lm_lanc_despesas')
        .select('*, lm_despesas(despesa)')
        .eq('user_id', user.id)
        .gte('data', startDate)
        .lte('data', endDate);

      if (reaisError) throw reaisError;

      const processedData = previstas.map((prevista) => {
        const valorPrevisto = Number(prevista.valor) || 0;
        const descPrevista = (prevista.descricao || '')
          .toLowerCase()
          .trim();

        const matchedReais = reais.filter((r) => {
          const descReal = (r.lm_despesas?.despesa || '')
            .toLowerCase()
            .trim();

          return descReal === descPrevista;
        });

        const valorReal = matchedReais.reduce(
          (sum, r) => sum + (Number(r.valor) || 0),
          0
        );

        const diferenca = valorReal - valorPrevisto;

        let calculatedStatus = 'Pendente';

        if (valorReal >= valorPrevisto && valorPrevisto > 0) {
          calculatedStatus = 'Pago';
        } else if (valorReal > 0 && valorReal < valorPrevisto) {
          calculatedStatus = 'Parcial';
        } else if (valorReal === 0) {
          calculatedStatus = 'Pendente';
        }

        if (
          valorReal === 0 &&
          prevista.status &&
          prevista.status !== 'Pendente'
        ) {
          calculatedStatus = prevista.status;
        }

        return {
          id: prevista.id,
          data_vencimento: prevista.data_vencimento,
          descricao: prevista.descricao,
          categoria: prevista.categoria || 'Outros',
          valor_previsto: valorPrevisto,
          valor_real: valorReal,
          diferenca,
          status: calculatedStatus,
        };
      });

      processedData.sort(
        (a, b) =>
          new Date(a.data_vencimento) - new Date(b.data_vencimento)
      );

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

    return [
      current - 2,
      current - 1,
      current,
      current + 1,
      current + 2,
    ];
  }, []);

  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        contasMes
          .map((item) => item.categoria)
          .filter(Boolean)
      ),
    ];

    return ['Todas', ...unique];
  }, [contasMes]);

  const filteredData = useMemo(() => {
    return contasMes.filter((item) => {
      const matchCat =
        selectedCategory === 'Todas' ||
        item.categoria === selectedCategory;

      const matchStatus =
        selectedStatus === 'Todos' ||
        item.status === selectedStatus;

      return matchCat && matchStatus;
    });
  }, [contasMes, selectedCategory, selectedStatus]);

  const subtotals = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        previsto: acc.previsto + curr.valor_previsto,
        real: acc.real + curr.valor_real,
        diferenca: acc.diferenca + curr.diferenca,
      }),
      {
        previsto: 0,
        real: 0,
        diferenca: 0,
      }
    );
  }, [filteredData]);

  const totalContas = filteredData.length;

  const totalPendentes = filteredData.filter(
    (item) => item.status === 'Pendente'
  ).length;

  const totalPagas = filteredData.filter(
    (item) => item.status === 'Pago'
  ).length;

  const handleAdjustmentClick = (expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
    setSelectedCategory('Todas');
    setSelectedStatus('Todos');
  };

  const getStatusBadge = (status, expense) => {
    let badgeContent;

    switch (status) {
      case 'Pago':
        badgeContent = (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
        break;

      case 'Parcial':
      case 'Pago Parcialmente':
        badgeContent = (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Parcial
          </Badge>
        );
        break;

      case 'Atrasado':
        badgeContent = (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Atrasado
          </Badge>
        );
        break;

      case 'Pendente':
      default:
        badgeContent = (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
    }

    return (
      <div className="flex flex-col items-center gap-1">
        {badgeContent}

        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-cyan-500 hover:text-cyan-400"
          onClick={() => handleAdjustmentClick(expense)}
        >
          Mudar Status
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* CABEÇALHO */}
      <Card className="border-cyan-500/20 bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <FileBarChart3 className="h-6 w-6 text-cyan-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  Consultas • LM Impressões
                </p>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Contas do Mês
                </h1>

                <p className="text-sm text-muted-foreground mt-1">
                  Acompanhamento e status das despesas do mês selecionado.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <Card className="border-cyan-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Contas
                </p>
                <p className="text-2xl font-bold mt-1">
                  {totalContas}
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total Previsto
                </p>

                <p className="text-xl font-bold mt-1">
                  {formatCurrency(subtotals.previsto)}
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total Realizado
                </p>

                <p className="text-xl font-bold mt-1 text-emerald-500">
                  {formatCurrency(subtotals.real)}
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <WalletCards className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pendentes
                </p>

                <p className="text-2xl font-bold mt-1 text-yellow-500">
                  {totalPendentes}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {totalPagas} pagas
                </p>
              </div>

              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <CircleAlert className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* FILTROS */}
      <Card className="border-cyan-500/20">
        <CardHeader className="pb-4 border-b border-cyan-500/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4 text-cyan-400" />
            Filtros
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Mês
              </label>

              <Select
                value={selectedMonth.toString()}
                onValueChange={(val) =>
                  setSelectedMonth(Number(val))
                }
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>

                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem
                      key={m.value}
                      value={m.value.toString()}
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Ano
              </label>

              <Select
                value={selectedYear.toString()}
                onValueChange={(val) =>
                  setSelectedYear(Number(val))
                }
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>

                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Categoria
              </label>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>

                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>

              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Todos">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="Pago">
                    Pago
                  </SelectItem>
                  <SelectItem value="Pendente">
                    Pendente
                  </SelectItem>
                  <SelectItem value="Parcial">
                    Parcial
                  </SelectItem>
                  <SelectItem value="Atrasado">
                    Atrasado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full border-cyan-500/30 hover:bg-cyan-500/10"
              >
                Limpar filtros
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ERRO */}
      {error ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="flex flex-col items-center justify-center p-8 gap-2">
            <AlertCircle className="w-8 h-8" />

            <p className="text-center">
              Erro ao carregar dados: {error}
            </p>

            <Button
              variant="outline"
              onClick={fetchData}
              className="mt-2 text-foreground"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : (

        /* RESULTADOS */
        <Card className="border-cyan-500/20 shadow-sm">

          <CardHeader className="border-b border-cyan-500/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

              <div>
                <CardTitle className="text-lg">
                  Listagem de Contas
                </CardTitle>

                <p className="text-xs text-muted-foreground mt-1">
                  {MONTHS.find(
                    (m) => m.value === selectedMonth
                  )?.label}{' '}
                  de {selectedYear}
                </p>
              </div>

              {!loading && (
                <Badge
                  variant="outline"
                  className="w-fit border-cyan-500/30 text-cyan-400"
                >
                  {filteredData.length}{' '}
                  {filteredData.length === 1
                    ? 'registro'
                    : 'registros'}
                </Badge>
              )}

            </div>
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

                      <TableHead className="w-[120px]">
                        Data Vencimento
                      </TableHead>

                      <TableHead>
                        Descrição da Despesa
                      </TableHead>

                      <TableHead>
                        Categoria
                      </TableHead>

                      <TableHead className="text-right">
                        Valor Previsto
                      </TableHead>

                      <TableHead className="text-right">
                        Valor Real
                      </TableHead>

                      <TableHead className="text-right">
                        Diferença
                      </TableHead>

                      <TableHead className="text-center w-[160px]">
                        Status
                      </TableHead>

                    </TableRow>

                  </TableHeader>

                  <TableBody>

                    {filteredData.length === 0 ? (

                      <TableRow>

                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Receipt className="w-8 h-8 opacity-40" />

                            <p className="font-medium">
                              Nenhuma conta encontrada
                            </p>

                            <p className="text-xs">
                              Não existem registros para o período e
                              filtros selecionados.
                            </p>
                          </div>
                        </TableCell>

                      </TableRow>

                    ) : (

                      filteredData.map((item) => (

                        <TableRow
                          key={item.id}
                          className="transition-colors hover:bg-cyan-500/5"
                        >

                          <TableCell className="font-medium whitespace-nowrap">
                            {format(
                              parseISO(item.data_vencimento),
                              'dd/MM/yyyy'
                            )}
                          </TableCell>

                          <TableCell>

                            <div className="flex items-center gap-2">

                              <CategoryIcon
                                category={item.categoria}
                                className="w-4 h-4 text-cyan-400"
                              />

                              <span>
                                {item.descricao}
                              </span>

                            </div>

                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            {item.categoria}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              item.valor_previsto
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {item.valor_real > 0
                              ? formatCurrency(item.valor_real)
                              : '-'}
                          </TableCell>

                          <TableCell
                            className={`text-right font-medium ${
                              item.diferenca < 0
                                ? 'text-emerald-500'
                                : item.diferenca > 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formatCurrency(item.diferenca)}
                          </TableCell>

                          <TableCell className="text-center align-middle">
                            {getStatusBadge(
                              item.status,
                              item
                            )}
                          </TableCell>

                        </TableRow>

                      ))

                    )}

                    {filteredData.length > 0 && (

                      <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">

                        <TableCell
                          colSpan={3}
                          className="text-right"
                        >
                          Subtotais:
                        </TableCell>

                        <TableCell className="text-right">
                          {formatCurrency(
                            subtotals.previsto
                          )}
                        </TableCell>

                        <TableCell className="text-right text-emerald-500">
                          {formatCurrency(
                            subtotals.real
                          )}
                        </TableCell>

                        <TableCell
                          className={`text-right ${
                            subtotals.diferenca < 0
                              ? 'text-emerald-500'
                              : subtotals.diferenca > 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatCurrency(
                            subtotals.diferenca
                          )}
                        </TableCell>

                        <TableCell />

                      </TableRow>

                    )}

                  </TableBody>

                </Table>

              </div>

            )}

          </CardContent>

        </Card>

      )}

      {/* MODAL DE STATUS */}
      <StatusChangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={fetchData}
        currentStatus={selectedExpense?.status}
        tableName="lm_despesas_previstas"
        recordId={selectedExpense?.id}
      />

    </div>
  );
}
