import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/ui/KPICard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { Users, DollarSign, RefreshCw, AlertCircle, Edit, Trash2, CalendarClock, UserCheck, UserMinus } from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ConsultaTodosDizimistas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filtroPeriodo, setFilterPeriodo] = useState('12'); // meses para avaliar status ativo
  const [filtroStatus, setFilterStatus] = useState('Todos');
  const [data, setData] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const months = parseInt(filtroPeriodo, 10);
      const cutoffDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');

      // 1. Fetch all dizimistas
      const { data: dizimistas, error: dizError } = await supabase
        .from('igreja_dizimistas')
        .select('id, nome, telefone')
        .eq('user_id', user.id);

      if (dizError) throw dizError;

      // 2. Fetch all entradas associated with dizimistas
      const { data: entradas, error: entError } = await supabase
        .from('igreja_entradas')
        .select('dizimista_id, valor, data')
        .eq('user_id', user.id)
        .not('dizimista_id', 'is', null);

      if (entError) throw entError;

      // Process and determine status based on cutoffDate
      const processado = dizimistas.map(d => {
        const contribs = entradas.filter(e => e.dizimista_id === d.id);
        const valorTotal = contribs.reduce((acc, curr) => acc + Number(curr.valor), 0);
        
        // Filter recent contribs to check active status
        const recentContribs = contribs.filter(c => new Date(c.data) >= new Date(cutoffDate));
        const isAtivo = recentContribs.length > 0;

        let ultimaData = null;
        if (contribs.length > 0) {
          const datas = contribs.map(c => new Date(c.data));
          ultimaData = new Date(Math.max.apply(null, datas));
        }

        return {
          id: d.id,
          nome: d.nome,
          telefone: d.telefone,
          valorTotal: valorTotal,
          ultimaContribuicao: ultimaData ? format(ultimaData, 'yyyy-MM-dd') : null,
          status: isAtivo ? 'Ativo' : 'Inativo'
        };
      });

      processado.sort((a, b) => a.nome.localeCompare(b.nome));
      setData(processado);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, filtroPeriodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (filtroStatus === 'Todos') return data;
    return data.filter(d => d.status === filtroStatus);
  }, [data, filtroStatus]);

  const kpis = useMemo(() => {
    const totalDizimistas = data.length;
    const totalValor = data.reduce((acc, curr) => acc + curr.valorTotal, 0);
    const ativos = data.filter(d => d.status === 'Ativo').length;
    const inativos = data.filter(d => d.status === 'Inativo').length;
    return { totalDizimistas, totalValor, ativos, inativos };
  }, [data]);

  const subtotals = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.valorTotal, 0);
  }, [filteredData]);

  const handleAction = (action, item) => {
    toast({
      title: "🚧 Ação em desenvolvimento",
      description: `A funcionalidade de ${action} para ${item.nome} será implementada em breve!`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Todos os Dizimistas</h1>
          <p className="text-muted-foreground">Lista completa e análise geral do comportamento de todos os membros.</p>
        </div>
      </div>

      <div className="filter-section border-primary/20">
        <Select value={filtroStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[180px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            <SelectItem value="Ativo">Ativos</SelectItem>
            <SelectItem value="Inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroPeriodo} onValueChange={setFilterPeriodo}>
          <SelectTrigger className="w-full md:w-[220px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Período p/ Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Analisar últimos 3 Meses</SelectItem>
            <SelectItem value="6">Analisar últimos 6 Meses</SelectItem>
            <SelectItem value="12">Analisar últimos 12 Meses</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchData} 
          disabled={loading} 
          className="w-full md:w-auto text-primary border-primary/50 hover:bg-primary/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Cadastrados" value={kpis.totalDizimistas} icon={Users} colorScheme="igreja" label="Geral" />
        <KPICard title="Total Geral (Histórico)" value={kpis.totalValor} icon={DollarSign} colorScheme="igreja" label="Volume Histórico" isCurrency />
        <KPICard title="Ativos" value={kpis.ativos} icon={UserCheck} colorScheme="igreja" label={`No período (${filtroPeriodo}M)`} />
        <KPICard title="Inativos" value={kpis.inativos} icon={UserMinus} colorScheme="igreja" label={`Sem contribuição (${filtroPeriodo}M)`} />
      </div>

      {error ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Erro ao carregar dados: {error}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-primary/20 shadow-sm glow-neon">
          <CardHeader className="border-b border-primary/10 pb-4">
            <CardTitle className="text-primary">Relação Completa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><LoadingSkeleton count={5} height="h-12" /></div>
            ) : (
              <div className="responsive-table-wrapper">
                <Table className="neon-zebra-table">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Total Histórico</TableHead>
                      <TableHead className="text-center">Última Contribuição</TableHead>
                      <TableHead className="text-center w-[120px]">Status</TableHead>
                      <TableHead className="text-center w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Nenhum dizimista encontrado para o filtro selecionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-500">
                            {formatCurrency(item.valorTotal)}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.ultimaContribuicao ? (
                              <div className="flex items-center justify-center gap-2">
                                <CalendarClock className="w-4 h-4 text-primary" />
                                {format(parseISO(item.ultimaContribuicao), 'dd/MM/yyyy')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <Badge className={item.status === 'Ativo' ? 'badge-ativo' : 'badge-inativo'}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20 hover:text-primary" onClick={() => handleAction('editar', item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => handleAction('excluir', item)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {filteredData.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold border-t border-primary/20">
                      <TableCell className="text-right">Total Acumulado na Visão:</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(subtotals)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
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