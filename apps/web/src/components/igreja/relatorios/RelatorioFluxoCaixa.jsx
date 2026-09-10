import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, ArrowDownCircle, DollarSign, Calendar, Filter, FileDown, Printer, Eye, BookOpen, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ResponsiveContainer, Bar as RechartsBar, XAxis, YAxis, Tooltip, Legend, ComposedChart } from 'recharts';
import { useToast } from '@/components/ui/use-toast';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entradas = payload.find(p => p.dataKey === 'entradas')?.value || 0;
    const despesas = payload.find(p => p.dataKey === 'despesas')?.value || 0;
    return (
      <div className="bg-gray-900/90 backdrop-blur-sm p-4 border border-gray-700 rounded-lg shadow-lg">
        <p className="label font-bold text-lg mb-2 text-white">{label}</p>
        <p className="text-green-400">{`Entradas: ${entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
        <p className="text-red-400">{`Despesas: ${despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}</p>
      </div>
    );
  }
  return null;
};

const RelatorioFluxoCaixa = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allEntradas, setAllEntradas] = useState([]);
  const [allDespesas, setAllDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('anual');
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: 'all',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [entradasRes, despesasRes] = await Promise.all([
      supabase.from('igreja_entradas').select('data, valor, tipo_entrada'),
      supabase.from('igreja_despesas').select('data, valor')
    ]);
    if (entradasRes.data) setAllEntradas(entradasRes.data);
    if (despesasRes.data) setAllDespesas(despesasRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredData = useMemo(() => {
    let filteredEntradas = [];
    let filteredDespesas = [];
    let title = '';
    const { year, month, startDate, endDate } = filters;

    if (filterType === 'anual') {
        let firstDay = new Date(Date.UTC(year, 0, 1));
        let lastDay = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
        title = `Resumo de ${year}`;
        if (month !== 'all') {
            firstDay = new Date(Date.UTC(year, parseInt(month), 1));
            lastDay = new Date(Date.UTC(year, parseInt(month) + 1, 0, 23, 59, 59));
            title = `Resumo de ${meses[month]}/${year}`;
        }
        filteredEntradas = allEntradas.filter(e => { const d = new Date(e.data); return d >= firstDay && d <= lastDay; });
        filteredDespesas = allDespesas.filter(d => { const dt = new Date(d.data); return dt >= firstDay && dt <= lastDay; });

    } else if (filterType === 'periodo') {
      const start = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T23:59:59Z`);
      title = `Resumo de ${start.toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${end.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
      filteredEntradas = allEntradas.filter(e => new Date(e.data) >= start && new Date(e.data) <= end);
      filteredDespesas = allDespesas.filter(d => new Date(d.data) >= start && new Date(d.data) <= end);
    }
    return { filteredEntradas, filteredDespesas, title };
  }, [allEntradas, allDespesas, filters, filterType]);

  const chartData = useMemo(() => {
    const { filteredEntradas, filteredDespesas } = filteredData;
    let data = [];
    if (filterType === 'anual' && filters.month === 'all') {
      data = meses.map(mes => ({ name: mes.substring(0, 3), entradas: 0, despesas: 0 }));
      filteredEntradas.forEach(e => { data[new Date(e.data).getUTCMonth()].entradas += parseFloat(e.valor || 0); });
      filteredDespesas.forEach(d => { data[new Date(d.data).getUTCMonth()].despesas += parseFloat(d.valor || 0); });
    } else { 
      const dailyData = {};
      [...filteredEntradas, ...filteredDespesas].forEach(item => {
          const dateStr = new Date(item.data).toLocaleDateString('pt-BR', {timeZone:'UTC'});
          if (!dailyData[dateStr]) dailyData[dateStr] = { name: dateStr, entradas: 0, despesas: 0 };
      });
      filteredEntradas.forEach(e => { dailyData[new Date(e.data).toLocaleDateString('pt-BR', {timeZone:'UTC'})].entradas += parseFloat(e.valor || 0); });
      filteredDespesas.forEach(d => { dailyData[new Date(d.data).toLocaleDateString('pt-BR', {timeZone:'UTC'})].despesas += parseFloat(d.valor || 0); });
      data = Object.values(dailyData).sort((a,b) => new Date(a.name.split('/').reverse().join('-')) - new Date(b.name.split('/').reverse().join('-')));
    }
    return data;
  }, [filteredData, filterType, filters.month]);
  
  const subtotals = useMemo(() => {
    const { filteredEntradas, filteredDespesas } = filteredData;
    const tiposEntrada = filteredEntradas.reduce((acc, curr) => {
        const tipo = curr.tipo_entrada || 'Outros';
        acc[tipo] = (acc[tipo] || 0) + parseFloat(curr.valor || 0);
        return acc;
    }, {});
    const totalDespesas = filteredDespesas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

    const saldoGeralEntradas = allEntradas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const saldoGeralDespesas = allDespesas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const saldoFinal = saldoGeralEntradas - saldoGeralDespesas;

    return { ...tiposEntrada, totalDespesas, saldoFinal };
  }, [filteredData, allEntradas, allDespesas]);

  const generateReportUrl = () => {
    const { year, month, startDate, endDate } = filters;
    let queryParams = `?filterType=${filterType}`;
    if (filterType === 'anual') queryParams += `&year=${year}&month=${month}`;
    else if (filterType === 'periodo') queryParams += `&startDate=${startDate}&endDate=${endDate}`;
    else return null;
    return `/igreja/relatorios/fluxo-caixa-pdf${queryParams}`;
  };

  const handleViewReport = () => {
    const url = generateReportUrl();
    if (url) window.open(url, '_blank');
    else toast({ title: 'Seleção de Período Necessária', variant: 'destructive' });
  };

  const handlePrintReport = () => {
    const url = generateReportUrl();
    if (url) {
        const printWindow = window.open(url, '_blank');
        if (printWindow) printWindow.onload = () => {
            setTimeout(() => {
                 printWindow.print();
            }, 500);
        }
    } else {
        toast({ title: 'Seleção de Período Necessária', variant: 'destructive' });
    }
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-black to-gray-900 min-h-screen text-gray-100 p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Fluxo de Caixa</h2>
          <p className="text-gray-400">Compare as entradas e saídas financeiras.</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400">
                    <FileDown className="w-4 h-4 mr-2" /> Gerar Relatório
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700 text-gray-100">
                <DropdownMenuItem onClick={handleViewReport} className="hover:bg-gray-700 cursor-pointer"><Eye className="w-4 h-4 mr-2" />Visualizar Relatório</DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintReport} className="hover:bg-gray-700 cursor-pointer"><Printer className="w-4 h-4 mr-2" />Imprimir Relatório</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-white"><Filter className="w-5 h-5 mr-2 text-yellow-500" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="md:w-1/3 bg-gray-800 border-gray-700 text-gray-100"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-gray-100"><SelectItem value="anual">Por Ano/Mês</SelectItem><SelectItem value="periodo">Por Período</SelectItem></SelectContent>
          </Select>
          <AnimatePresence mode="wait">
              <motion.div key={filterType} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filterType === 'anual' && (
                  <>
                  <Select value={String(filters.year)} onValueChange={v => handleFilterChange('year', Number(v))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={String(filters.month)} onValueChange={v => handleFilterChange('month', v)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-gray-100"><SelectItem value='all'>Todos os Meses</SelectItem>{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  </>
              )}
              {filterType === 'periodo' && (
                  <>
                  <div className="text-gray-300"><Label>Data de Início</Label><Input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100"/></div>
                  <div className="text-gray-300"><Label>Data de Fim</Label><Input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100"/></div>
                  </>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-l-4 border-l-green-500 shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Dízimos</CardTitle>
                <BookOpen className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{(subtotals['DÍZIMO'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <p className="text-xs text-gray-500">{filteredData.title}</p>
            </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-l-4 border-l-emerald-500 shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Ofertas</CardTitle>
                <Gift className="w-5 h-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{(subtotals['OFERTA'] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <p className="text-xs text-gray-500">{filteredData.title}</p>
            </CardContent>
        </Card>

        <Card className="bg-gray-900 border-l-4 border-l-red-500 shadow-md">
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Despesas</CardTitle>
                <ArrowDownCircle className="w-5 h-5 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{subtotals.totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                <p className="text-xs text-gray-500">{filteredData.title}</p>
            </CardContent>
        </Card>

        <Card className={`bg-gray-900 border-l-4 shadow-md ${subtotals.saldoFinal < 0 ? 'border-l-red-500' : 'border-l-blue-500'}`}>
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Saldo Final (Geral)</CardTitle>
                <DollarSign className={`w-5 h-5 ${subtotals.saldoFinal < 0 ? 'text-red-500' : 'text-blue-500'}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${subtotals.saldoFinal < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {subtotals.saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-xs text-gray-500">Saldo de todo o período</p>
            </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800">
          <CardHeader>
              <CardTitle className="flex items-center text-white"><BarChart className="w-5 h-5 mr-2 text-yellow-500" /> Gráfico de Entradas e Saídas</CardTitle>
          </CardHeader>
        <CardContent>{loading ? <div className="text-center p-8 text-gray-400">Carregando gráfico...</div> : (
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" tickFormatter={(value) => `R$${(value/1000).toLocaleString('pt-BR')}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)'}} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <RechartsBar dataKey="entradas" fill="#22C55E" name="Entradas" radius={[4, 4, 0, 0]} />
                    <RechartsBar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </ComposedChart>
            </ResponsiveContainer>
        )}</CardContent>
      </Card>
    </motion.div>
  );
};

export default RelatorioFluxoCaixa;