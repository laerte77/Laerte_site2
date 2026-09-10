import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LancamentoCustos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [tiposFolha, setTiposFolha] = useState([]);
  const [estoqueInicial, setEstoqueInicial] = useState({});
  const [recentEntries, setRecentEntries] = useState([]);
  const [formData, setFormData] = useState({
    tipo_folha: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    tipo: 'Consumo',
    quantidade: '',
    custo_unitario: '',
    custo_total: '0.00',
    descricao: ''
  });

  const fetchEstoqueInicial = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lm_estoques_inicial')
        .select('produto, quantidade_inicial')
        .eq('user_id', user.id);

      if (error) throw error;

      const estoqueMap = {};
      (data || []).forEach(item => {
        estoqueMap[item.produto.toUpperCase().trim()] = item.quantidade_inicial;
      });
      setEstoqueInicial(estoqueMap);

    } catch (error) {
      console.error('Error fetching estoque inicial:', error);
    }
  }, [user]);

  const fetchTiposFolha = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lm_tipos_folha')
        .select('*')
        .eq('user_id', user.id)
        .order('tipo_folha', { ascending: true });

      if (error) throw error;

      setTiposFolha(data || []);

    } catch (error) {
      console.error('Error fetching tipos de folha:', error);
    }
  }, [user]);

  const fetchCustoUnitario = useCallback(async (tipoFolha) => {
    if (!user || !tipoFolha) {
      setFormData(prev => ({ ...prev, custo_unitario: '0.00' }));
      return;
    }

    // Check if it's RASCUNHO (special type)
    const tipoObj = tiposFolha.find(t => t.tipo_folha === tipoFolha);
    if (tipoObj && tipoObj.is_special) {
      setFormData(prev => ({
        ...prev,
        custo_unitario: '0.00'
      }));
      return;
    }
    
    try {
      // STRATEGY 1: Try to get price from lm_tipos_folha table (direct match)
      const { data: tipoFolhaData, error: tipoFolhaError } = await supabase
        .from('lm_tipos_folha')
        .select('preco')
        .eq('user_id', user.id)
        .eq('tipo_folha', tipoFolha)
        .single();

      if (!tipoFolhaError && tipoFolhaData && tipoFolhaData.preco) {
        setFormData(prev => ({
          ...prev,
          custo_unitario: tipoFolhaData.preco.toFixed(2)
        }));
        return;
      }

      // STRATEGY 2: Try to get from lm_lanc_despesas using tipo_folha column directly
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from('lm_lanc_despesas')
        .select('valor, quantidade')
        .eq('user_id', user.id)
        .eq('tipo_lancamento', 'Estoque')
        .eq('tipo_folha', tipoFolha)
        .not('quantidade', 'is', null)
        .gt('quantidade', 0)
        .order('data', { ascending: false })
        .limit(1);

      if (lancamentoError) throw lancamentoError;

      if (lancamentoData && lancamentoData.length > 0) {
        const unitCost = (lancamentoData[0].valor / lancamentoData[0].quantidade).toFixed(2);
        setFormData(prev => ({
          ...prev,
          custo_unitario: unitCost
        }));
      } else {
        toast({
          title: 'Aviso',
          description: `Nenhum lançamento de estoque encontrado para "${tipoFolha}". Usando preço zero.`,
          variant: 'default'
        });
        setFormData(prev => ({ ...prev, custo_unitario: '0.00' }));
      }

    } catch (error) {
      console.error('Error fetching custo unitario:', error);
      toast({
        title: 'Erro ao buscar preço',
        description: `Erro: ${error.message}. Usando preço zero.`,
        variant: 'destructive'
      });
      
      setFormData(prev => ({ ...prev, custo_unitario: '0.00' }));
    }
  }, [user, toast, tiposFolha]);

  const fetchRecentEntries = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lm_lanc_custos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentEntries(data || []);

    } catch (error) {
      console.error('Error fetching recent entries:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchTiposFolha();
    fetchEstoqueInicial();
    fetchRecentEntries();
  }, [fetchTiposFolha, fetchEstoqueInicial, fetchRecentEntries]);

  useEffect(() => {
    if (formData.tipo_folha) {
      fetchCustoUnitario(formData.tipo_folha);
    } else {
      setFormData(prev => ({ ...prev, custo_unitario: '0.00' }));
    }
  }, [formData.tipo_folha, fetchCustoUnitario]);

  useEffect(() => {
    // Auto-calculate custo_total
    const quantidade = parseFloat(formData.quantidade) || 0;
    const custoUnitario = parseFloat(formData.custo_unitario) || 0;
    const custoTotal = (quantidade * custoUnitario).toFixed(2);
    
    setFormData(prev => ({
      ...prev,
      custo_total: custoTotal
    }));
  }, [formData.quantidade, formData.custo_unitario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tipo_folha || !formData.quantidade || !formData.data_lancamento) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lm_lanc_custos')
        .insert({
          user_id: user.id,
          tipo_folha: formData.tipo_folha,
          tipo: formData.tipo,
          quantidade: parseInt(formData.quantidade),
          custo_unitario: parseFloat(formData.custo_unitario),
          custo_total: parseFloat(formData.custo_total),
          data_lancamento: formData.data_lancamento,
          descricao: formData.descricao || null
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Custo de ${formData.tipo.toLowerCase()} registrado com sucesso!`,
        className: 'bg-green-500 text-white'
      });

      // Reset form
      setFormData({
        tipo_folha: '',
        data_lancamento: new Date().toISOString().split('T')[0],
        tipo: 'Consumo',
        quantidade: '',
        custo_unitario: '',
        custo_total: '0.00',
        descricao: ''
      });

      // Refresh recent entries
      fetchRecentEntries();

    } catch (error) {
      console.error('Error saving cost:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar lançamento de custo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('lm_lanc_custos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Lançamento excluído com sucesso!',
        className: 'bg-green-500 text-white'
      });

      fetchRecentEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir lançamento.',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Filter tipos_folha to show only items with estoque > 0 (excluding LAMICOTE AZUL) + RASCUNHO
  const availableTiposFolha = tiposFolha.filter(tipo => {
    // Always include RASCUNHO (special type)
    if (tipo.is_special) return true;
    
    // Check if item has stock in initial inventory
    const estoque = estoqueInicial[tipo.tipo_folha.toUpperCase().trim()] || 0;
    return estoque > 0;
  });

  // Check if selected tipo is RASCUNHO (special)
  const selectedTipoObj = tiposFolha.find(t => t.tipo_folha === formData.tipo_folha);
  const isRascunho = selectedTipoObj && selectedTipoObj.is_special;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <TrendingDown className="w-8 h-8" />
          Lançamento de Custos
        </h2>
        <p className="text-muted-foreground mt-1">
          Registre consumo e perdas de folhas por tipo
        </p>
      </div>

      <Card className="bg-card/50 border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-cyan-400">Novo Lançamento de Custo</CardTitle>
          <CardDescription>
            Preencha os dados do consumo ou perda de folhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tipo_folha">
                  Tipo de Folha <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tipo_folha}
                  onValueChange={(value) => setFormData({ ...formData, tipo_folha: value })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione o tipo de folha" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {availableTiposFolha.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum tipo de folha disponível
                      </SelectItem>
                    ) : (
                      availableTiposFolha.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.tipo_folha}>
                          {tipo.tipo_folha}
                          {tipo.is_special && <Badge variant="outline" className="ml-2 text-xs">Especial</Badge>}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {isRascunho && (
                  <p className="text-xs text-yellow-500 mt-1">
                    ⚠️ {selectedTipoObj.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_lancamento">
                  Data do Consumo/Perda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_lancamento"
                  type="date"
                  value={formData.data_lancamento}
                  onChange={(e) => setFormData({ ...formData, data_lancamento: e.target.value })}
                  className="bg-background border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Consumo" id="consumo" />
                    <Label htmlFor="consumo" className="cursor-pointer">Consumo (Uso Normal)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Perda" id="perda" />
                    <Label htmlFor="perda" className="cursor-pointer">Perda (Dano/Desperdício)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">
                  Quantidade (Folhas) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  className="bg-background border-border text-foreground"
                  placeholder="Ex: 100"
                  required
                  disabled={isRascunho}
                  readOnly={isRascunho}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custo_unitario">
                  Custo Unitário (R$)
                </Label>
                <Input
                  id="custo_unitario"
                  type="text"
                  value={`R$ ${formData.custo_unitario}`}
                  className="bg-muted/50 border-border text-foreground font-mono"
                  readOnly
                  disabled
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="custo_total">
                  Custo Total (R$)
                </Label>
                <Input
                  id="custo_total"
                  type="text"
                  value={`R$ ${formData.custo_total}`}
                  className="bg-muted/50 border-border text-foreground font-bold text-lg font-mono"
                  readOnly
                  disabled
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 bg-background border border-border rounded-md text-foreground resize-y"
                  placeholder="Ex: Consumo de folhas A4 para impressão de documentos..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    tipo_folha: '',
                    data_lancamento: new Date().toISOString().split('T')[0],
                    tipo: 'Consumo',
                    quantidade: '',
                    custo_unitario: '',
                    custo_total: '0.00',
                    descricao: ''
                  });
                }}
                disabled={loading}
              >
                Limpar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Lançamento
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-cyan-400">Lançamentos Recentes</CardTitle>
          <CardDescription>Últimos 10 registros de custos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground">Tipo de Folha</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-right text-muted-foreground">Quantidade</TableHead>
                  <TableHead className="text-right text-muted-foreground">Custo Unitário</TableHead>
                  <TableHead className="text-right text-muted-foreground">Custo Total</TableHead>
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-center text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  recentEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border/50 hover:bg-accent/30">
                      <TableCell className="font-medium">{entry.tipo_folha || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(entry.data_lancamento)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.tipo === 'Consumo'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }
                        >
                          {entry.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{entry.quantidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(entry.custo_unitario)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(entry.custo_total)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {entry.descricao || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LancamentoCustos;