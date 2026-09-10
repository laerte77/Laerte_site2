import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Calendar, Search, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const ConsultaDizimistasAtivos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dizimistas, setDizimistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'asc' });

  const threeMonthsAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  }, []);

  const fetchDizimistas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: entradasData, error } = await supabase
        .from('igreja_entradas')
        .select(`
          valor,
          data,
          dizimista_id,
          igreja_dizimistas (
            id,
            nome,
            telefone
          )
        `)
        .eq('tipo_entrada', 'DÍZIMO')
        .gte('data', threeMonthsAgo)
        .not('dizimista_id', 'is', null)
        .order('data', { ascending: false });

      if (error) throw error;

      const dizimistasMap = new Map();
      
      (entradasData || []).forEach(entrada => {
        if (!entrada.igreja_dizimistas) return;
        
        const dizId = entrada.dizimista_id;
        if (!dizimistasMap.has(dizId)) {
          dizimistasMap.set(dizId, {
            id: dizId,
            nome: entrada.igreja_dizimistas.nome,
            telefone: entrada.igreja_dizimistas.telefone || '-',
            valorTotal: 0,
            dataUltimoDizimo: entrada.data,
            frequencia: 0,
            dizimos: []
          });
        }
        
        const diz = dizimistasMap.get(dizId);
        diz.valorTotal += parseFloat(entrada.valor || 0);
        diz.frequencia += 1;
        diz.dizimos.push({ data: entrada.data, valor: entrada.valor });
        
        if (new Date(entrada.data) > new Date(diz.dataUltimoDizimo)) {
          diz.dataUltimoDizimo = entrada.data;
        }
      });

      const dizimistasArray = Array.from(dizimistasMap.values());
      setDizimistas(dizimistasArray);
    } catch (error) {
      toast({ 
        title: 'Erro ao buscar dados', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [user, threeMonthsAgo, toast]);

  useEffect(() => {
    fetchDizimistas();
  }, [fetchDizimistas]);

  const filteredDizimistas = useMemo(() => {
    return dizimistas.filter(d => 
      d.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dizimistas, searchTerm]);

  const sortedDizimistas = useMemo(() => {
    const sorted = [...filteredDizimistas];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'nome') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else if (sortConfig.key === 'valorTotal' || sortConfig.key === 'frequencia') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      } else if (sortConfig.key === 'dataUltimoDizimo') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredDizimistas, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const totalDizimistas = filteredDizimistas.length;
  const valorTotalArrecadado = filteredDizimistas.reduce((acc, d) => acc + d.valorTotal, 0);

  const formatCurrency = (value) => `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <div className="dark-igreja text-foreground space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary">Dizimistas Ativos</h2>
              <p className="text-muted-foreground">Últimos 3 meses de contribuições</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Dizimistas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary">{totalDizimistas}</div>
              <p className="text-xs text-muted-foreground mt-1">nos últimos 90 dias</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-emerald-500 uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Valor Total Arrecadado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-emerald-500">{formatCurrency(valorTotalArrecadado)}</div>
              <p className="text-xs text-muted-foreground mt-1">período de 3 meses</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card backdrop-blur-sm border-border shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do dizimista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-input"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando dizimistas...</p>
          </div>
        ) : sortedDizimistas.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-muted p-6 rounded-full mb-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nenhum dizimista ativo</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Não há registros de dízimos nos últimos 3 meses. Os dados serão exibidos quando houver lançamentos de entradas do tipo DÍZIMO.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border shadow-lg overflow-hidden">
            <ScrollArea className="h-[600px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary/50 backdrop-blur-sm border-b border-border z-10">
                    <tr>
                      <th className="p-4 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-muted-foreground hover:text-primary -ml-2"
                          onClick={() => handleSort('nome')}
                        >
                          Nome
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </th>
                      <th className="p-4 text-left font-semibold text-muted-foreground">Telefone</th>
                      <th className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-muted-foreground hover:text-primary -mr-2"
                          onClick={() => handleSort('valorTotal')}
                        >
                          Valor Total
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </th>
                      <th className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-muted-foreground hover:text-primary"
                          onClick={() => handleSort('dataUltimoDizimo')}
                        >
                          Último Dízimo
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </th>
                      <th className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-muted-foreground hover:text-primary"
                          onClick={() => handleSort('frequencia')}
                        >
                          Frequência
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDizimistas.map((dizimista, idx) => (
                      <motion.tr
                        key={dizimista.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border hover:bg-primary/5 transition-colors"
                      >
                        <td className="p-4 font-semibold text-foreground">{dizimista.nome}</td>
                        <td className="p-4 text-muted-foreground">{dizimista.telefone}</td>
                        <td className="p-4 text-right font-bold text-emerald-500">
                          {formatCurrency(dizimista.valorTotal)}
                        </td>
                        <td className="p-4 text-center text-foreground flex items-center justify-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {formatDate(dizimista.dataUltimoDizimo)}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                            {dizimista.frequencia}x
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default ConsultaDizimistasAtivos;