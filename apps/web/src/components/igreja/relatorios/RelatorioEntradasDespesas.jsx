import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, FileDown, Printer, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RelatorioEntradasDespesas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Refs for cleanup and race condition prevention
  const isMounted = useRef(false);
  const abortControllerRef = useRef(null);
  const resultCache = useRef(new Map());

  // State
  const [filterType, setFilterType] = useState('mensal');
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Setup mount ref
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handlers wrapped in useCallback to prevent re-renders
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterTypeChange = useCallback((value) => {
    setFilterType(value);
    setTotals(null);
    setError(null);
  }, []);

  // Optimized Fetch Logic
  const fetchTotals = useCallback(async () => {
    if (!user) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    // Create a cache key
    const cacheKey = JSON.stringify({ filterType, filters, userId: user.id });

    // Check cache
    if (resultCache.current.has(cacheKey)) {
        if (isMounted.current) {
            setTotals(resultCache.current.get(cacheKey));
            setLoading(false);
        }
        return;
    }

    let start, end;
    try {
      if (filterType === 'mensal') {
        if (filters.year === 'all') {
           start = '2000-01-01T00:00:00Z';
           end = '2100-12-31T23:59:59Z';
        } else if (filters.month === 'all') {
           start = new Date(Date.UTC(filters.year, 0, 1)).toISOString();
           end = new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59)).toISOString();
        } else {
           start = new Date(Date.UTC(filters.year, filters.month, 1)).toISOString();
           end = new Date(Date.UTC(filters.year, filters.month + 1, 0, 23, 59, 59)).toISOString();
        }
      } else {
        if (!filters.startDate || !filters.endDate) throw new Error("Datas inválidas");
        start = new Date(filters.startDate + 'T00:00:00Z').toISOString();
        end = new Date(filters.endDate + 'T23:59:59Z').toISOString();
      }
      
      // Parallel requests
      const [entradasRes, despesasRes] = await Promise.all([
        supabase.from('igreja_entradas')
            .select('valor')
            .gte('data', start)
            .lte('data', end)
            .eq('user_id', user.id)
            .abortSignal(signal),
        supabase.from('igreja_despesas')
            .select('valor')
            .gte('data', start)
            .lte('data', end)
            .eq('user_id', user.id)
            .abortSignal(signal),
      ]);
      
      if (signal.aborted) return;
      if (entradasRes.error) throw entradasRes.error;
      if (despesasRes.error) throw despesasRes.error;
      
      // Calculate totals efficiently
      const totalEntradas = entradasRes.data?.reduce((acc, curr) => acc + Number(curr.valor || 0), 0) || 0;
      const totalDespesas = despesasRes.data?.reduce((acc, curr) => acc + Number(curr.valor || 0), 0) || 0;
      
      const result = {
        entradas: totalEntradas,
        despesas: totalDespesas,
        saldo: totalEntradas - totalDespesas,
      };

      // Update Cache
      resultCache.current.set(cacheKey, result);
      
      if (isMounted.current) {
        setTotals(result);
      }

    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      if (isMounted.current) {
        setError(error.message || 'Erro desconhecido');
        toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' });
      }
    } finally {
      if (isMounted.current && !signal.aborted) {
        setLoading(false);
      }
    }
  }, [filterType, filters, user, toast]);

  const generateReportUrl = (print = false) => {
    const { year, month, startDate, endDate } = filters;
    let queryParams = `?filterType=${filterType}`;
    
    if (filterType === 'mensal') {
      queryParams += `&year=${year}&month=${month}`;
    } else if (filterType === 'periodo') {
      if (!startDate || !endDate) return null;
      queryParams += `&startDate=${startDate}&endDate=${endDate}`;
    } else {
      return null;
    }
    
    if (print) {
        queryParams += `&print=true`;
    }
    
    return `${window.location.origin}/igreja/relatorios/entradas-despesas-pdf${queryParams}`;
  };

  const handleAction = (action) => {
    const url = generateReportUrl(action === 'print');
    if (!url) {
      toast({ title: 'Seleção de Período Inválida', description: 'Verifique as datas selecionadas.', variant: 'destructive' });
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gradient-to-br from-black to-gray-900 min-h-screen text-gray-100 p-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Relatório de Entradas e Despesas
          </h2>
          <p className="text-gray-400">Visualize um resumo financeiro consolidado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <Button 
                onClick={fetchTotals} 
                disabled={loading}
                className="min-w-[120px] bg-yellow-600 hover:bg-yellow-700 text-white"
            >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                {loading ? 'Calculando...' : 'Visualizar'}
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400">
                        <FileDown className="w-4 h-4 mr-2" /> Gerar Relatório
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700 text-gray-100 z-50">
                    <DropdownMenuItem onSelect={() => handleAction('view')} className="cursor-pointer hover:bg-gray-700">
                        <FileDown className="w-4 h-4 mr-2" />Gerar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAction('print')} className="cursor-pointer hover:bg-gray-700">
                        <Printer className="w-4 h-4 mr-2" />Imprimir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 shadow-md">
        <CardHeader className="pb-3 border-b border-gray-800">
          <CardTitle className="flex items-center text-lg text-white"><Filter className="w-5 h-5 mr-2 text-yellow-500" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col space-y-4 pt-4">
                <div className="w-full md:w-1/3">
                    <Label className="mb-2 block text-gray-400">Tipo de Filtro</Label>
                    <Select value={filterType} onValueChange={handleFilterTypeChange} disabled={loading}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                        <SelectItem value="mensal">Por Mês/Ano</SelectItem>
                        <SelectItem value="periodo">Por Período Personalizado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="p-1">
                    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-left-2 duration-300", filterType !== 'mensal' && "hidden")}>
                        <div>
                            <Label className="mb-2 block text-gray-400">Ano</Label>
                            <Select 
                                value={String(filters.year)} 
                                onValueChange={v => handleFilterChange('year', v === 'all' ? 'all' : Number(v))}
                                disabled={loading}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                    <ScrollArea className="h-[200px]">
                                        <SelectItem value="all">Todos</SelectItem>
                                        {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="mb-2 block text-gray-400">Mês</Label>
                            <Select 
                                value={String(filters.month)} 
                                onValueChange={v => handleFilterChange('month', v === 'all' ? 'all' : Number(v))}
                                disabled={loading}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                    <ScrollArea className="h-[200px]">
                                        <SelectItem value="all">Todos</SelectItem>
                                        {meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-right-2 duration-300", filterType !== 'periodo' && "hidden")}>
                        <div>
                            <Label className="mb-2 block text-gray-400">Data de Início</Label>
                            <Input 
                                type="date" 
                                value={filters.startDate} 
                                onChange={e => handleFilterChange('startDate', e.target.value)} 
                                className="bg-gray-800 border-gray-700 text-gray-100"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block text-gray-400">Data de Fim</Label>
                            <Input 
                                type="date" 
                                value={filters.endDate} 
                                onChange={e => handleFilterChange('endDate', e.target.value)} 
                                className="bg-gray-800 border-gray-700 text-gray-100"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
           </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300 bg-red-900/50 border-red-900 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {totals && !loading && (
            <motion.div
              key="totals-cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
            <Card className="bg-gray-900 border-l-4 border-l-green-500 shadow-lg">
                <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm font-medium">Total Entradas</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold tracking-tight text-white">{formatCurrency(totals.entradas)}</p></CardContent>
            </Card>
            <Card className="bg-gray-900 border-l-4 border-l-red-500 shadow-lg">
                <CardHeader className="pb-2"><CardTitle className="text-gray-400 text-sm font-medium">Total Despesas</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold tracking-tight text-white">{formatCurrency(totals.despesas)}</p></CardContent>
            </Card>
            <Card className={`bg-gray-900 border-l-4 shadow-lg ${totals.saldo >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                <CardHeader className="pb-2"><CardTitle className={`text-sm font-medium ${totals.saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>Saldo</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold tracking-tight text-white">{formatCurrency(totals.saldo)}</p></CardContent>
            </Card>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RelatorioEntradasDespesas;