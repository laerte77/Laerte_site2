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
import { Users, DollarSign, RefreshCw, AlertCircle, CalendarClock } from 'lucide-react';
import { format, parseISO, subMonths, isAfter } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function ConsultaDizimistasAtivos() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('3'); // meses
  const [data, setData] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const months = parseInt(periodo, 10);
      const cutoffDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');

      // 1. Fetch all dizimistas
      const { data: dizimistas, error: dizError } = await supabase
        .from('igreja_dizimistas')
        .select('id, nome')
        .eq('user_id', user.id);

      if (dizError) throw dizError;

      // 2. Fetch entradas associated with dizimistas in the cutoff period
      const { data: entradas, error: entError } = await supabase
        .from('igreja_entradas')
        .select('dizimista_id, valor, data')
        .eq('user_id', user.id)
        .gte('data', cutoffDate)
        .not('dizimista_id', 'is', null);

      if (entError) throw entError;

      // Map contributions
      const processado = dizimistas.map(d => {
        const contribs = entradas.filter(e => e.dizimista_id === d.id);
        const valorTotal = contribs.reduce((acc, curr) => acc + Number(curr.valor), 0);
        
        let ultimaData = null;
        if (contribs.length > 0) {
          const datas = contribs.map(c => new Date(c.data));
          ultimaData = new Date(Math.max.apply(null, datas));
        }

        const isAtivo = valorTotal > 0;

        return {
          id: d.id,
          nome: d.nome,
          valorContribuido: valorTotal,
          ultimaContribuicao: ultimaData ? format(ultimaData, 'yyyy-MM-dd') : null,
          status: isAtivo ? 'Ativo' : 'Inativo'
        };
      }).filter(d => d.status === 'Ativo'); // Only show active ones

      processado.sort((a, b) => b.valorContribuido - a.valorContribuido);
      setData(processado);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = useMemo(() => {
    const totalDizimistas = data.length;
    const totalValor = data.reduce((acc, curr) => acc + curr.valorContribuido, 0);
    return { totalDizimistas, totalValor };
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dizimistas Ativos</h1>
          <p className="text-muted-foreground">Membros que contribuíram nos últimos {periodo} meses.</p>
        </div>
      </div>

      <div className="filter-section border-primary/20">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-full md:w-[220px] bg-input text-foreground border-primary/30">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 Meses</SelectItem>
            <SelectItem value="6">Últimos 6 Meses</SelectItem>
            <SelectItem value="12">Últimos 12 Meses</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard 
          title="Total de Dizimistas Ativos" 
          value={kpis.totalDizimistas} 
          icon={Users} 
          colorScheme="igreja"
          label="Membros Contribuintes"
        />
        <KPICard 
          title={`Total Contribuído (${periodo}M)`} 
          value={kpis.totalValor} 
          icon={DollarSign} 
          colorScheme="igreja"
          label="Volume Financeiro"
          isCurrency
        />
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
            <CardTitle className="text-primary">Relação de Dizimistas Ativos</CardTitle>
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
                      <TableHead className="text-right">Valor Contribuído</TableHead>
                      <TableHead className="text-center">Última Contribuição</TableHead>
                      <TableHead className="text-center w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Nenhum dizimista ativo encontrado no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((item) => (
                        <TableRow key={item.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-500">
                            {formatCurrency(item.valorContribuido)}
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
                            <Badge className="badge-ativo">Ativo</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {data.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold border-t border-primary/20">
                      <TableCell className="text-right">Total:</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(kpis.totalValor)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
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