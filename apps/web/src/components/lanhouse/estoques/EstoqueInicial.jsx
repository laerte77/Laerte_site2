import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { PackageOpen, Search, Save, Edit, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EstoqueInicial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estoqueData, setEstoqueData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [baselineDate, setBaselineDate] = useState('2026-05-06');

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchEstoqueInicial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lm_estoques_inicial')
        .select('*')
        .eq('user_id', user.id)
        .order('produto', { ascending: true });

      if (error) throw error;

      if (!isMountedRef.current) return;
      
      // If data exists, use the baseline date from the first record
      if (data && data.length > 0) {
        setBaselineDate(data[0].data_inventario);
      }
      
      setEstoqueData(data || []);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Erro ao buscar estoque inicial:', error);
      toast({ 
        title: 'Erro', 
        description: 'Falha ao carregar estoque inicial.', 
        variant: 'destructive' 
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchEstoqueInicial();
  }, [fetchEstoqueInicial]);

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.quantidade_inicial.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (item) => {
    const newQuantity = parseInt(editValue);
    
    // Validation
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({
        title: 'Valor inválido',
        description: 'A quantidade deve ser um número inteiro não negativo.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lm_estoques_inicial')
        .update({
          quantidade_inicial: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Quantidade de "${item.produto}" atualizada para ${newQuantity}.`,
        className: 'bg-green-500 text-white'
      });

      setEditingId(null);
      setEditValue('');
      fetchEstoqueInicial();
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar quantidade.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetBaseline = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Update all records to use today as the baseline date
      const updates = estoqueData.map(item => ({
        id: item.id,
        data_inventario: today,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('lm_estoques_inicial')
          .update({
            data_inventario: update.data_inventario,
            updated_at: update.updated_at
          })
          .eq('id', update.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast({
        title: 'Baseline Definida',
        description: `Inventário de ${today} definido como baseline. Todas as movimentações futuras serão calculadas a partir deste ponto.`,
        className: 'bg-green-500 text-white'
      });

      setBaselineDate(today);
      fetchEstoqueInicial();
    } catch (error) {
      console.error('Erro ao definir baseline:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao definir baseline do inventário.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredEstoque = estoqueData
    .filter(item => {
      const matchesSearch = item.produto.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStockFilter = showZeroStock || item.quantidade_inicial > 0;
      return matchesSearch && matchesStockFilter;
    });

  const totalProducts = filteredEstoque.length;
  const totalQuantity = filteredEstoque.reduce((sum, item) => sum + item.quantidade_inicial, 0);

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <PackageOpen className="w-8 h-8" /> Estoque Inicial (Baseline)
          </h1>
          <p className="text-muted-foreground mt-1">
            Inventário baseline registrado em {formatDate(baselineDate)}
          </p>
        </div>
        <Button
          onClick={handleSetBaseline}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {saving ? 'Salvando...' : 'Definir Hoje como Baseline'}
        </Button>
      </div>

      <Alert className="bg-blue-500/10 border-blue-500/20">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm text-muted-foreground">
          Este inventário serve como <strong>baseline (linha de base)</strong> para cálculos de estoque futuro. 
          Todas as entradas, saídas e perdas registradas após <strong>{formatDate(baselineDate)}</strong> serão 
          somadas/subtraídas destes valores para calcular o estoque atual.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Data Baseline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatDate(baselineDate)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Quantidade Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalQuantity}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto relative max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
              <Input 
                placeholder="Buscar produto..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-zero"
                checked={showZeroStock}
                onCheckedChange={setShowZeroStock}
              />
              <Label htmlFor="show-zero" className="cursor-pointer text-sm">
                Mostrar itens com estoque zero
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-primary">Inventário Baseline</CardTitle>
          <CardDescription>
            Clique no ícone de edição para ajustar quantidades. Os valores aqui serão usados como base para cálculos futuros.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="min-w-[250px]">Produto</TableHead>
                    <TableHead className="text-center min-w-[180px]">Quantidade Baseline</TableHead>
                    <TableHead className="text-center min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Carregando estoque inicial...
                      </TableCell>
                    </TableRow>
                  ) : filteredEstoque.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEstoque.map((item) => (
                      <TableRow key={item.id} className="hover:bg-accent/30 transition-colors">
                        <TableCell className="font-semibold">{item.produto}</TableCell>
                        <TableCell className="text-center">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 text-center"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <Badge 
                              variant={item.quantidade_inicial === 0 ? "destructive" : "default"} 
                              className="text-sm px-3 font-semibold"
                            >
                              {item.quantidade_inicial}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => handleSaveEdit(item)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
    </motion.div>
  );
};

export default EstoqueInicial;