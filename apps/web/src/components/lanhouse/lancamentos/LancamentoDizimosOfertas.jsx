import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Coins as HandCoins, Search, Download } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import * as XLSX from 'xlsx';

const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const LancamentoDizimosOfertas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMountedRef = useRef(true);

  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth().toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [currentLancamentoId, setCurrentLancamentoId] = useState(null);

  const [exportFilters, setExportFilters] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  const initialFormState = {
    data: format(new Date(), 'yyyy-MM-dd'),
    valor: '',
    tipo_movimento: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const tiposMovimento = ['DÍZIMO', 'OFERTA', 'VOTO'];

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = lancamentos.map((item) =>
      new Date(item.data).getFullYear()
    );

    years.push(new Date().getFullYear());

    return [...new Set(years)].sort((a, b) => b - a);
  }, [lancamentos]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lm_dizimos_ofertas')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (error) throw error;

      if (!isMountedRef.current) return;

      setLancamentos(data || []);
    } catch (error) {
      if (!isMountedRef.current) return;

      toast({
        title: 'Erro ao buscar lançamentos',
        variant: 'destructive',
        description: error.message
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    fetchData();

    const channel = supabase
      .channel('lm_dizimos_ofertas_changes_v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lm_dizimos_ofertas'
        },
        () => {
          if (isMountedRef.current) {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const filteredLancamentos = useMemo(() => {
    let results = [...lancamentos];

    if (selectedYear !== 'all') {
      results = results.filter(
        (item) =>
          getYear(new Date(item.data)).toString() === selectedYear
      );
    }

    if (selectedMonth !== 'all') {
      results = results.filter(
        (item) =>
          getMonth(new Date(item.data)).toString() === selectedMonth
      );
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();

      results = results.filter((item) =>
        item.tipo_movimento?.toLowerCase().includes(search)
      );
    }

    return results;
  }, [lancamentos, selectedYear, selectedMonth, searchTerm]);

  const totalPeriodo = useMemo(() => {
    return filteredLancamentos.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );
  }, [filteredLancamentos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value || 0));
  };

  const openDialog = (item = null) => {
    if (item) {
      setCurrentLancamentoId(item.id);

      setFormData({
        data: item.data || format(new Date(), 'yyyy-MM-dd'),
        valor: item.valor ?? '',
        tipo_movimento: item.tipo_movimento || ''
      });
    } else {
      setCurrentLancamentoId(null);
      setFormData(initialFormState);
    }

    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setCurrentLancamentoId(null);
    setFormData(initialFormState);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (
      !formData.data ||
      !formData.valor ||
      !formData.tipo_movimento
    ) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) return;

    const dataToSave = {
      data: formData.data,
      valor: Number(formData.valor),
      tipo_movimento: formData.tipo_movimento,
      user_id: user.id
    };

    try {
      if (currentLancamentoId) {
        const { error } = await supabase
          .from('lm_dizimos_ofertas')
          .update(dataToSave)
          .eq('id', currentLancamentoId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Lançamento atualizado.'
        });
      } else {
        const { error } = await supabase
          .from('lm_dizimos_ofertas')
          .insert(dataToSave);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Lançamento registrado.'
        });
      }

      closeDialog();
      fetchData();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
        description: error.message
      });
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('lm_dizimos_ofertas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Removido',
        description: 'Lançamento removido.'
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        variant: 'destructive',
        description: error.message
      });
    }
  };

  const handleExport = () => {
    const filteredData = lancamentos.filter((item) => {
      const itemDate = new Date(item.data);

      return (
        itemDate.getMonth() === exportFilters.month &&
        itemDate.getFullYear() === exportFilters.year
      );
    });

    if (filteredData.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Não há registros para o período selecionado.',
        variant: 'destructive'
      });
      return;
    }

    const dataToExport = filteredData.map((item) => ({
      DATA: new Date(item.data).toLocaleDateString('pt-BR', {
        timeZone: 'UTC'
      }),
      TIPO: item.tipo_movimento,
      VALOR: Number(item.valor || 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Dizimos e Ofertas'
    );

    XLSX.writeFile(
      workbook,
      `Dizimos_Ofertas_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`
    );

    setIsExportOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 py-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Dízimos e Ofertas
          </h1>

          <p className="mt-1 text-lg text-muted-foreground">
            Registre e gerencie as contribuições.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsExportOpen(true)}
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <Button
            onClick={() => openDialog()}
            className="bg-cyan-500 text-primary-foreground hover:bg-cyan-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <Dialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
      >
        <DialogContent className="dark-lm-impressoes border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Exportar Dízimos e Ofertas
            </DialogTitle>

            <DialogDescription>
              Selecione o mês e o ano para exportar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Mês</Label>

              <Select
                value={String(exportFilters.month)}
                onValueChange={(value) =>
                  setExportFilters((prev) => ({
                    ...prev,
                    month: Number(value)
                  }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="z-[200]">
                  <ScrollArea className="h-48">
                    {meses.map((mes, index) => (
                      <SelectItem
                        key={index}
                        value={String(index)}
                      >
                        {mes}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>

              <Select
                value={String(exportFilters.year)}
                onValueChange={(value) =>
                  setExportFilters((prev) => ({
                    ...prev,
                    year: Number(value)
                  }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="z-[200]">
                  {availableYears.map((year) => (
                    <SelectItem
                      key={year}
                      value={String(year)}
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleExport}
              className="bg-cyan-500 text-primary-foreground hover:bg-cyan-600"
            >
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <DialogContent className="dark-lm-impressoes border-cyan-500/20 bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              {currentLancamentoId ? 'Editar' : 'Novo'} Lançamento
            </DialogTitle>

            <DialogDescription>
              Preencha os dados da contribuição.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSave}
            className="space-y-6 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>

                <Input
                  type="date"
                  value={formData.data}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      data: event.target.value
                    }))
                  }
                  className="bg-background text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Valor (R$)</Label>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      valor: event.target.value
                    }))
                  }
                  className="bg-background text-foreground"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Movimento</Label>

              <Select
                value={formData.tipo_movimento}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo_movimento: value
                  }))
                }
              >
                <SelectTrigger className="bg-background text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent className="z-[200]">
                  {tiposMovimento.map((tipo) => (
                    <SelectItem
                      key={tipo}
                      value={tipo}
                    >
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                className="bg-cyan-500 text-primary-foreground hover:bg-cyan-600"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="col-span-1 border-cyan-500/20 shadow-md md:col-span-3">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative w-full flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                <Input
                  placeholder="Buscar por tipo..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  className="h-12 bg-background/50 pl-10 text-base"
                />
              </div>

              <div className="flex gap-3">
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger className="h-12 w-[150px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      Todos os Meses
                    </SelectItem>

                    {meses.map((mes, index) => (
                      <SelectItem
                        key={index}
                        value={String(index)}
                      >
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger className="h-12 w-[110px] bg-background/50">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      Todos os Anos
                    </SelectItem>

                    {availableYears.map((year) => (
                      <SelectItem
                        key={year}
                        value={String(year)}
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center rounded-2xl border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-md">
          <CardHeader className="pb-1 pt-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
              Total Filtrado
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="truncate text-3xl font-black text-cyan-400">
              {formatCurrency(totalPeriodo)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-cyan-500/20 bg-card/80 shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 border-b border-cyan-500/20 bg-card/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-6 font-semibold">
                    Data
                  </TableHead>

                  <TableHead className="py-4 font-semibold">
                    Tipo
                  </TableHead>

                  <TableHead className="py-4 text-right font-semibold">
                    Valor
                  </TableHead>

                  <TableHead className="w-[120px] py-4 pr-6 text-center font-semibold">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-16 text-center text-muted-foreground"
                    >
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredLancamentos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <HandCoins className="mx-auto mb-2 h-10 w-10" />
                      Nenhum lançamento registrado neste período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLancamentos.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-cyan-500/10 transition-colors hover:bg-blue-500/10"
                    >
                      <TableCell className="py-4 pl-6 font-medium">
                        {new Date(item.data).toLocaleDateString(
                          'pt-BR',
                          { timeZone: 'UTC' }
                        )}
                      </TableCell>

                      <TableCell className="py-4">
                        <span className="font-semibold">
                          {item.tipo_movimento}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 text-right font-bold text-yellow-400">
                        {formatCurrency(item.valor)}
                      </TableCell>

                      <TableCell className="py-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                            onClick={() => openDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent className="dark-lm-impressoes z-[150]">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Confirmar Exclusão
                                </AlertDialogTitle>

                                <AlertDialogDescription>
                                  Deseja remover este lançamento?
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancelar
                                </AlertDialogCancel>

                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-red-600"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LancamentoDizimosOfertas;
