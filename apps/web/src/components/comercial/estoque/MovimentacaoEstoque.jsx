import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Package, ArrowDownToLine,
  ArrowUpFromLine, AlertTriangle, Loader2,
  Boxes, Pencil, RotateCcw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Card, CardContent
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';

import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const THEME = 'hsl(var(--neon-comercial))';
const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: BRASILIA_TIMEZONE
  }).format(new Date());

const formatDate = value => {
  if (!value) return '—';

  let dateValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    dateValue += 'T12:00:00-03:00';
  } else {
    dateValue = dateValue.replace(' ', 'T');

    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(dateValue)) {
      dateValue += '-03:00';
    }
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const dateForInput = value => {
  if (!value) return today();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRASILIA_TIMEZONE
  }).format(date);
};

const formatNumber = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 3
  });

const initialForm = () => ({
  produto_id: '',
  tipo_movimento: 'ENTRADA',
  quantidade: '',
  data_movimento: today(),
  observacoes: ''
});

const isManual = item =>
  ['MANUAL', 'AJUSTE'].includes(item.origem_tipo);

export default function MovimentacaoEstoque() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [movimentos, setMovimentos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);

  const [editingItem, setEditingItem] = useState(null);
  const [estornarItem, setEstornarItem] = useState(null);
  const [estornando, setEstornando] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setProdutos([]);
      setEstoque([]);
      setMovimentos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [p, e, m] = await Promise.all([
        supabase
          .from('comercial_produtos')
          .select('id,nome,codigo,unidade,ativo')
          .eq('user_id', user.id)
          .order('nome'),

        supabase
          .from('comercial_estoque_atual')
          .select('*')
          .eq('user_id', user.id)
          .order('nome'),

        supabase
          .from('comercial_historico_estoque')
          .select('*')
          .eq('user_id', user.id)
          .order('data_movimento', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

      for (const result of [p, e, m]) {
        if (result.error) throw result.error;
      }

      setProdutos(p.data || []);
      setEstoque(e.data || []);
      setMovimentos(m.data || []);

    } catch (error) {
      toast({
        title: 'Erro ao carregar estoque',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const produtoSelecionado = produtos.find(
    p => String(p.id) === String(form.produto_id)
  );

  const estoqueSelecionado = estoque.find(
    e => String(e.produto_id) === String(form.produto_id)
  );

  const abrirDialog = () => {
    setEditingItem(null);
    setForm(initialForm());
    setDialogOpen(true);
  };

  const abrirEdicao = item => {
    if (!isManual(item)) return;

    setEditingItem(item);

    setForm({
      produto_id: String(item.produto_id),
      tipo_movimento: item.tipo_movimento,
      quantidade: String(item.quantidade),
      data_movimento: dateForInput(item.data_movimento),
      observacoes: item.observacoes || ''
    });

    setDialogOpen(true);
  };

  const salvarMovimentacao = async () => {
    const quantidade = Number(form.quantidade);

    if (
      !user ||
      !form.produto_id ||
      !form.data_movimento ||
      !Number.isFinite(quantidade) ||
      quantidade <= 0
    ) {
      toast({
        title: 'Dados obrigatórios',
        description: 'Selecione o produto, informe a data e uma quantidade maior que zero.',
        variant: 'destructive'
      });
      return;
    }

    if (!['ENTRADA', 'SAIDA', 'PERDA'].includes(form.tipo_movimento)) {
      toast({
        title: 'Movimento inválido',
        description: 'Selecione Entrada, Saída ou Perda.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const dataMovimento =
        `${form.data_movimento}T12:00:00-03:00`;

      if (editingItem) {
        const { error } = await supabase.rpc(
          'comercial_editar_movimentacao_manual',
          {
            p_movimentacao_id: editingItem.movimentacao_id,
            p_produto_id: form.produto_id,
            p_tipo_movimento: form.tipo_movimento,
            p_quantidade: quantidade,
            p_data_movimento: dataMovimento,
            p_observacoes: form.observacoes.trim() || null
          }
        );

        if (error) throw error;

        toast({
          title: 'Movimentação editada',
          description: 'A movimentação anterior foi compensada e a nova foi registrada.'
        });

      } else {
        const { error } = await supabase
          .from('comercial_estoque_movimentacoes')
          .insert({
            user_id: user.id,
            produto_id: form.produto_id,
            tipo_movimento: form.tipo_movimento,
            origem_tipo: 'MANUAL',
            quantidade,
            data_movimento: dataMovimento,
            observacoes: form.observacoes.trim() || null
          });

        if (error) throw error;

        toast({
          title: 'Movimentação registrada',
          description: 'O estoque foi atualizado com sucesso.'
        });
      }

      setDialogOpen(false);
      setEditingItem(null);
      setForm(initialForm());

      await fetchData();

    } catch (error) {
      toast({
        title: editingItem ? 'Erro ao editar' : 'Erro ao registrar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmarEstorno = async () => {
    if (!estornarItem || estornando) return;

    setEstornando(true);

    try {
      const { error } = await supabase.rpc(
        'comercial_estornar_movimentacao_manual',
        {
          p_movimentacao_id: estornarItem.movimentacao_id,
          p_observacoes: 'Estorno solicitado pela tela de movimentação de estoque.'
        }
      );

      if (error) throw error;

      toast({
        title: 'Movimentação estornada',
        description: 'O registro original foi preservado e o estoque foi compensado.'
      });

      setEstornarItem(null);

      await fetchData();

    } catch (error) {
      toast({
        title: 'Erro ao estornar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setEstornando(false);
    }
  };

  const filtrados = movimentos.filter(item => {
    const termo = search.trim().toLowerCase();

    if (!termo) return true;

    return [
      item.produto,
      item.codigo_produto,
      item.tipo_movimento,
      item.origem_tipo,
      item.observacoes
    ].some(value =>
      String(value || '').toLowerCase().includes(termo)
    );
  });

  const totalEntradas = movimentos
    .filter(x => x.tipo_movimento === 'ENTRADA')
    .reduce((s, x) => s + Number(x.quantidade || 0), 0);

  const totalSaidas = movimentos
    .filter(x => x.tipo_movimento === 'SAIDA')
    .reduce((s, x) => s + Number(x.quantidade || 0), 0);

  const totalPerdas = movimentos
    .filter(x => x.tipo_movimento === 'PERDA')
    .reduce((s, x) => s + Number(x.quantidade || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[.2em]"
            style={{ color: THEME }}
          >
            Módulo Comercial
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            Movimentação de Estoque
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Registre entradas, saídas e perdas dos produtos.
          </p>
        </div>

        <Button
          onClick={abrirDialog}
          style={{ background: THEME }}
          className="font-semibold text-black hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Produtos cadastrados
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {produtos.length}
              </p>
            </div>
            <Package className="h-6 w-6" style={{ color: THEME }} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Entradas
              </p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {formatNumber(totalEntradas)}
              </p>
            </div>
            <ArrowDownToLine className="h-6 w-6 text-green-400" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Saídas
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {formatNumber(totalSaidas)}
              </p>
            </div>
            <ArrowUpFromLine className="h-6 w-6 text-blue-400" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Perdas
              </p>
              <p className="mt-1 text-2xl font-bold text-red-400">
                {formatNumber(totalPerdas)}
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5" style={{ color: THEME }} />
            <h2 className="font-semibold text-white">
              Estoque atual dos produtos
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estoque atual</TableHead>
                  <TableHead>Unidade</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {estoque.map(item => (
                  <TableRow key={item.produto_id}>
                    <TableCell className="font-medium text-white">
                      {item.nome}
                    </TableCell>
                    <TableCell>{item.codigo || '—'}</TableCell>
                    <TableCell className="font-bold" style={{ color: THEME }}>
                      {formatNumber(item.estoque_atual)}
                    </TableCell>
                    <TableCell>{item.unidade || 'un'}</TableCell>
                  </TableRow>
                ))}

                {!loading && estoque.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-white">
              Histórico de movimentações
            </h2>
            <p className="text-sm text-muted-foreground">
              Consulte entradas, saídas, perdas e movimentações automáticas.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por produto ou tipo de movimentação..."
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Movimento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                ) : filtrados.map(item => (
                  <TableRow key={item.movimentacao_id}>
                    <TableCell>{formatDate(item.data_movimento)}</TableCell>

                    <TableCell className="font-medium text-white">
                      {item.produto}
                    </TableCell>

                    <TableCell>
                      <span className={
                        item.tipo_movimento === 'ENTRADA'
                          ? 'text-green-400'
                          : item.tipo_movimento === 'PERDA'
                            ? 'text-red-400'
                            : 'text-blue-400'
                      }>
                        {item.tipo_movimento}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className={
                        item.origem_tipo === 'VENDA'
                          ? 'text-blue-300'
                          : item.origem_tipo === 'ESTORNO'
                            ? 'text-orange-400'
                            : 'text-muted-foreground'
                      }>
                        {item.origem_tipo}
                      </span>
                    </TableCell>

                    <TableCell className="font-semibold">
                      {formatNumber(item.quantidade)} {item.unidade || ''}
                    </TableCell>

                    <TableCell className="max-w-64 truncate">
                      {item.observacoes || '—'}
                    </TableCell>

                    <TableCell>
                      {isManual(item) ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Editar movimentação"
                            onClick={() => abrirEdicao(item)}
                            className="h-8 w-8 border-border hover:border-[var(--neon-comercial)]"
                          >
                            <Pencil className="h-4 w-4" style={{ color: THEME }} />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Estornar movimentação"
                            onClick={() => setEstornarItem(item)}
                            className="h-8 w-8 border-red-500/40 hover:border-red-500"
                          >
                            <RotateCcw className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Protegido
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de cadastro e edição */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!saving) {
            setDialogOpen(open);

            if (!open) {
              setEditingItem(null);
              setForm(initialForm());
            }
          }
        }}
      >
        <DialogContent className="border-border bg-gray-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: THEME }}>
              {editingItem ? 'Editar Movimentação' : 'Nova Movimentação'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'A alteração preservará o registro original por meio de um estorno.'
                : 'Informe os dados da movimentação do produto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={form.produto_id}
                onValueChange={value =>
                  setForm(prev => ({ ...prev, produto_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>

                <SelectContent>
                  {produtos
                    .filter(p =>
                      p.ativo !== false ||
                      String(p.id) === String(form.produto_id)
                    )
                    .map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nome}
                        {p.codigo ? ` — ${p.codigo}` : ''}
                        {p.ativo === false ? ' (Inativo)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {produtoSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Estoque atual: {formatNumber(estoqueSelecionado?.estoque_atual)}{' '}
                  {produtoSelecionado.unidade || 'un'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de movimentação *</Label>
              <Select
                value={form.tipo_movimento}
                onValueChange={value =>
                  setForm(prev => ({ ...prev, tipo_movimento: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                  <SelectItem value="PERDA">Perda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.quantidade}
                  onChange={e =>
                    setForm(prev => ({ ...prev, quantidade: e.target.value }))
                  }
                  placeholder="0,000"
                />
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.data_movimento}
                  onChange={e =>
                    setForm(prev => ({ ...prev, data_movimento: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={e =>
                  setForm(prev => ({ ...prev, observacoes: e.target.value }))
                }
                placeholder="Descreva o motivo da movimentação..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              onClick={salvarMovimentacao}
              disabled={saving}
              style={{ background: THEME }}
              className="font-semibold text-black hover:opacity-90"
            >
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingItem ? 'Salvar alterações' : 'Registrar movimentação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de estorno */}
      <Dialog
        open={Boolean(estornarItem)}
        onOpenChange={open => {
          if (!open && !estornando) setEstornarItem(null);
        }}
      >
        <DialogContent className="border-border bg-gray-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              Estornar movimentação?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              O registro original não será apagado. O sistema criará uma
              movimentação inversa para compensar o estoque.
            </DialogDescription>
          </DialogHeader>

          {estornarItem && (
            <div className="space-y-2 rounded-lg border border-border bg-black/30 p-4 text-sm">
              <p>
                <strong>Produto:</strong> {estornarItem.produto}
              </p>
              <p>
                <strong>Movimento:</strong> {estornarItem.tipo_movimento}
              </p>
              <p>
                <strong>Quantidade:</strong>{' '}
                {formatNumber(estornarItem.quantidade)} {estornarItem.unidade || ''}
              </p>
              <p>
                <strong>Data:</strong> {formatDate(estornarItem.data_movimento)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEstornarItem(null)}
              disabled={estornando}
            >
              Cancelar
            </Button>

            <Button
              onClick={confirmarEstorno}
              disabled={estornando}
              className="bg-red-600 font-semibold text-white hover:bg-red-700"
            >
              {estornando && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar estorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
