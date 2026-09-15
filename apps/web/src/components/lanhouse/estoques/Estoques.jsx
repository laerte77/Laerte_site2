import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, TrendingUp, TrendingDown, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Estoques = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [estoqueData, setEstoqueData] = useState([]);
  const [baselineDate, setBaselineDate] = useState('2026-05-06');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchEstoque = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch baseline inventory
      const { data: baselineData, error: baselineError } = await supabase
        .from('lm_estoques_inicial')
        .select('*')
        .eq('user_id', user.id);

      if (baselineError) throw baselineError;

      // Get baseline date from first record
      let baseline = '2026-05-06'; // Default
      if (baselineData && baselineData.length > 0) {
        baseline = baselineData[0].data_inventario;
        setBaselineDate(baseline);
      }

      // Create baseline map
      const baselineMap = {};
      (baselineData || []).forEach(item => {
        baselineMap[item.produto.toUpperCase().trim()] = {
          quantidade: item.quantidade_inicial,
          data: item.data_inventario
        };
      });

      // Fetch movements from lm_folhas after baseline date
      const { data: folhasData, error: folhasError } = await supabase
        .from('lm_folhas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', baseline)
        .order('data', { ascending: false });

      if (folhasError) throw folhasError;

      // Fetch folhas gastas nos serviços
      const { data: servicosData, error: servicosError } = await supabase
        .from('lm_lanc_servicos')
        .select('data, folhas_gastas')
        .eq('user_id', user.id)
        .gte('data', baseline)
        .not('folhas_gastas', 'is', null);

if (servicosError) throw servicosError;

      // Build inventory calculation
      const prodMap = {};

      // Initialize with baseline
      Object.keys(baselineMap).forEach(produto => {
        prodMap[produto] = {
          produto: produto,
          baseline: baselineMap[produto].quantidade,
          entradas: 0,
          saidas: 0,
          perdas: 0,
          estoqueAtual: baselineMap[produto].quantidade,
          variacao: 0
        };
      });

      // Process movements
      let latestMovement = null;
      (folhasData || []).forEach(item => {
        if (!item.tipo_folha) return;

        const produto = item.tipo_folha.toUpperCase().trim();
        
        // Track latest movement date
        if (!latestMovement || new Date(item.data) > new Date(latestMovement)) {
          latestMovement = item.data;
        }

        // Initialize product if not in baseline
        if (!prodMap[produto]) {
          prodMap[produto] = {
            produto: produto,
            baseline: 0,
            entradas: 0,
            saidas: 0,
            perdas: 0,
            estoqueAtual: 0,
            variacao: 0
          };
        }

        const quantidade = parseInt(item.quantidade || 0);
        const movimento = item.tipo_movimento?.toLowerCase();

        if (movimento === 'entrada') {
          prodMap[produto].entradas += quantidade;
        } else if (movimento === 'saída' || movimento === 'saida') {
          prodMap[produto].saidas += quantidade;
        } else if (movimento === 'perda') {
          prodMap[produto].perdas += quantidade;
        }
      });
      // Processar folhas gastas nos serviços
      (servicosData || []).forEach(item => {
        const folhas = item.folhas_gastas || [];

        if (!Array.isArray(folhas)) return;

        if (
          !latestMovement ||
          new Date(item.data) > new Date(latestMovement)
        ) {
          latestMovement = item.data;
        }

        folhas.forEach(f => {
          if (!f.e_rascunho && f.tipo_folha && f.quantidade) {
            const produto = f.tipo_folha.toUpperCase().trim();
            const quantidade = parseInt(f.quantidade || 0, 10);

            if (!prodMap[produto]) {
              prodMap[produto] = {
                produto,
                baseline: 0,
                entradas: 0,
                saidas: 0,
                perdas: 0,
                estoqueAtual: 0,
                variacao: 0
              };
            }

            prodMap[produto].saidas += quantidade;
          }
        });
      });
      // Calculate current stock and variation for each product
      Object.keys(prodMap).forEach(produto => {
        const p = prodMap[produto];
        p.estoqueAtual = p.baseline + p.entradas - p.saidas - p.perdas;
        p.variacao = p.estoqueAtual - p.baseline;
      });

      const aggregated = Object.values(prodMap).sort((a, b) => a.produto.localeCompare(b.produto));

      if (!isMountedRef.current) return;
      setEstoqueData(aggregated);
      setLastUpdate(latestMovement);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Erro ao buscar estoque:', error);
      toast({ 
        title: 'Erro', 
        description: 'Falha ao carregar controle de estoque.', 
        variant: 'destructive' 
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchEstoque();
  }, [fetchEstoque]);

  const filteredEstoque = estoqueData.filter(item => 
    item.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Package className="w-8 h-8" /> Rastreamento de Estoque
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de estoque calculado desde {formatDate(baselineDate)} (baseline)
          </p>
        </div>
      </div>

      <Alert className="bg-cyan-500/10 border-cyan-500/20">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-500" />
              <AlertDescription className="text-sm font-medium">
                Data Baseline: <strong>{formatDate(baselineDate)}</strong>
              </AlertDescription>
            </div>
            {lastUpdate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-500" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Última Movimentação: {formatDate(lastUpdate)}
                </AlertDescription>
              </div>
            )}
          </div>
        </div>
      </Alert>

      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 w-full relative max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
            <Input 
              placeholder="Buscar por produto/folha..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movimentacao" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movimentacao">Movimentação desde Baseline</TabsTrigger>
          <TabsTrigger value="comparacao">Baseline vs. Atual</TabsTrigger>
        </TabsList>
        
        <TabsContent value="movimentacao">
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-cyan-400">Movimentação desde {formatDate(baselineDate)}</CardTitle>
              <CardDescription>
                Entradas, saídas e perdas registradas após a data baseline
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="min-w-[200px]">Produto</TableHead>
                        <TableHead className="text-center min-w-[100px]">Baseline</TableHead>
                        <TableHead className="text-center min-w-[100px]">Entradas</TableHead>
                        <TableHead className="text-center min-w-[100px]">Saídas</TableHead>
                        <TableHead className="text-center min-w-[100px]">Perdas</TableHead>
                        <TableHead className="text-center min-w-[120px]">Estoque Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Carregando estoque...
                          </TableCell>
                        </TableRow>
                      ) : filteredEstoque.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum produto em estoque.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEstoque.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-accent/30 transition-colors">
                            <TableCell className="font-semibold">{item.produto}</TableCell>
                            <TableCell className="text-center font-medium text-purple-600">
                              {item.baseline}
                            </TableCell>
                            <TableCell className="text-center text-green-600 font-medium">
                              {item.entradas}
                            </TableCell>
                            <TableCell className="text-center text-blue-600 font-medium">
                              {item.saidas}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-medium">
                              {item.perdas}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={item.estoqueAtual < 0 ? "destructive" : item.estoqueAtual < 10 ? "secondary" : "default"} 
                                className="text-sm px-3 font-semibold"
                              >
                                {item.estoqueAtual}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comparacao">
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-cyan-400">Baseline vs. Estoque Atual</CardTitle>
              <CardDescription>
                Comparação entre o inventário inicial ({formatDate(baselineDate)}) e o estoque calculado atual
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="min-w-[200px]">Produto</TableHead>
                        <TableHead className="text-center min-w-[120px]">Baseline ({formatDate(baselineDate)})</TableHead>
                        <TableHead className="text-center min-w-[120px]">Estoque Atual</TableHead>
                        <TableHead className="text-center min-w-[120px]">Variação</TableHead>
                        <TableHead className="text-center min-w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Carregando estoque...
                          </TableCell>
                        </TableRow>
                      ) : filteredEstoque.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum produto em estoque.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEstoque.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-accent/30 transition-colors">
                            <TableCell className="font-semibold">{item.produto}</TableCell>
                            <TableCell className="text-center font-medium text-purple-600">
                              {item.baseline}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={item.estoqueAtual < 0 ? "destructive" : item.estoqueAtual < 10 ? "secondary" : "default"} 
                                className="text-sm px-3 font-semibold"
                              >
                                {item.estoqueAtual}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {item.variacao > 0 && <TrendingUp className="w-4 h-4 text-green-500" />}
                                {item.variacao < 0 && <TrendingDown className="w-4 h-4 text-red-500" />}
                                <span className={
                                  item.variacao > 0 
                                    ? 'text-green-500 font-medium' 
                                    : item.variacao < 0 
                                    ? 'text-red-500 font-medium' 
                                    : 'text-muted-foreground'
                                }>
                                  {item.variacao > 0 ? '+' : ''}{item.variacao}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {item.estoqueAtual < 0 ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Negativo
                                </Badge>
                              ) : item.estoqueAtual < item.baseline ? (
                                <Badge variant="secondary" className="gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  Abaixo
                                </Badge>
                              ) : item.estoqueAtual > item.baseline ? (
                                <Badge variant="default" className="gap-1 bg-green-500">
                                  <TrendingUp className="w-3 h-3" />
                                  Acima
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Igual
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Estoques;
