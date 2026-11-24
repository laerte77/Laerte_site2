import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Package, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, Loader2, Boxes, Pencil, Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const THEME = 'hsl(var(--neon-comercial))';
const TIMEZONE = 'America/Sao_Paulo';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

const formatDate = value => {
  if (!value) return '—';
  let str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) str += 'T12:00:00-03:00';
  else {
    str = str.replace(' ', 'T');
    if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(str)) str += '-03:00';
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
};

const dateForInput = value => {
  if (!value) return today();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) :
    new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
};

const formatNumber = value => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const initialForm = () => ({ produto_id: '', tipo_movimento: 'ENTRADA', quantidade: '', data_movimento: today(), observacoes: '' });
const isManual = item => ['MANUAL', 'AJUSTE'].includes(item.origem_tipo);

export default function MovimentacaoEstoque() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingItem, setEditingItem] = useState(null);
  const [excluirItem, setExcluirItem] = useState(null);

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
        supabase.from('comercial_produtos').select('id,nome,codigo,unidade,ativo').eq('user_id', user.id).order('nome'),
        supabase.from('comercial_estoque_atual').select('*').eq('user_id', user.id).order('nome'),
        supabase.from('comercial_historico_estoque').select('*').eq('user_id', user.id).order('data_movimento', { ascending: false }).order('created_at', { ascending: false })
      ]);

      for (const result of [p, e, m]) if (result.error) throw result.error;
      setProdutos(p.data || []);
      setEstoque(e.data || []);
      setMovimentos(m.data || []);
    } catch (error) {
      toast({ title: 'Erro ao carregar estoque', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const produtoSelecionado = produtos.find(p => String(p.id) === String(form.produto_id));
  const estoqueSelecionado = estoque.find(e => String(e.produto_id) === String(form.produto_id));

  const abrirNovo = () => {
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

    if (!user || !form.produto_id || !form.data_movimento || !Number.isFinite(quantidade) || quantidade <= 0) {
      toast({ title: 'Dados obrigatórios', description: 'Selecione o produto, informe a data e uma quantidade maior que zero.', variant: 'destructive' });
      return;
    }

    if (!['ENTRADA', 'SAIDA', 'PERDA'].includes(form.tipo_movimento)) {
      toast({ title: 'Movimento inválido', description: 'Selecione Entrada, Saída ou Perda.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const dataMovimento = `${form.data_movimento}T12:00:00-03:00`;
      const observacoes = form.observacoes.trim() || null;

      if (editingItem) {
        const { error } = await supabase.rpc('comercial_editar_movimentacao_manual', {
          p_movimentacao_id: editingItem.movimentacao_id,
          p_produto_id: form.produto_id,
          p_tipo_movimento: form.tipo_movimento,
          p_quantidade: quantidade,
          p_data_movimento: dataMovimento,
          p_observacoes: observacoes
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comercial_estoque_movimentacoes').insert({
          user_id: user.id,
          produto_id: form.produto_id,
          tipo_movimento: form.tipo_movimento,
          origem_tipo: 'MANUAL',
          quantidade,
          data_movimento: dataMovimento,
          observacoes
        });
        if (error) throw error;
      }

      toast({
        title: editingItem ? 'Movimentação editada' : 'Movimentação registrada',
        description: editingItem ? 'Os dados foram atualizados com sucesso.' : 'O estoque foi atualizado com sucesso.'
      });

      setDialogOpen(false);
      setEditingItem(null);
      setForm(initialForm());
      await fetchData();
    } catch (error) {
      toast({ title: editingItem ? 'Erro ao editar' : 'Erro ao registrar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluirItem || deleting) return;
    setDeleting(true);

    try {
      const { error } = await supabase.rpc('comercial_excluir_movimentacao_manual', {
        p_movimentacao_id: excluirItem.movimentacao_id
      });
      if (error) throw error;

      toast({ title: 'Movimentação excluída', description: 'O lançamento foi removido e o estoque atualizado.' });
      setExcluirItem(null);
      await fetchData();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filtrados = movimentos.filter(item => {
    const termo = search.trim().toLowerCase();
    return !termo || [item.produto, item.codigo_produto, item.tipo_movimento, item.origem_tipo, item.observacoes]
      .some(value => String(value || '').toLowerCase().includes(termo));
  });

  const total = tipo => movimentos.filter(x => x.tipo_movimento === tipo)
    .reduce((sum, x) => sum + Number(x.quantidade || 0), 0);

  const cards = [
    { label: 'Produtos cadastrados', value: produtos.length, icon: Package, color: THEME },
    { label: 'Entradas', value: formatNumber(total('ENTRADA')), icon: ArrowDownToLine, color: 'text-green-400' },
    { label: 'Saídas', value: formatNumber(total('SAIDA')), icon: ArrowUpFromLine, color: 'text-blue-400' },
    { label: 'Perdas', value: formatNumber(total('PERDA')), icon: AlertTriangle, color: 'text-red-400' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{ color: THEME }}>Módulo Comercial</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Movimentação de Estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registre entradas, saídas e perdas dos produtos.</p>
        </div>
        <Button onClick={abrirNovo} style={{ background: THEME }} className="font-semibold text-black hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Nova Movimentação
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{value}</p>
              </div>
              <Icon className="h-6 w-6" style={color === THEME ? { color } : undefined} {...(color !== THEME ? { className: `h-6 w-6 ${color}` } : {})} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5" style={{ color: THEME }} />
            <h2 className="font-semibold text-white">Estoque atual dos produtos</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead><TableHead>Código</TableHead>
                  <TableHead>Estoque atual</TableHead><TableHead>Unidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estoque.map(item => (
                  <TableRow key={item.produto_id}>
                    <TableCell className="font-medium text-white">{item.nome}</TableCell>
                    <TableCell>{item.codigo || '—'}</TableCell>
                    <TableCell className="font-bold" style={{ color: THEME }}>{formatNumber(item.estoque_atual)}</TableCell>
                    <TableCell>{item.unidade || 'un'}</TableCell>
                  </TableRow>
                ))}
                {!loading && !estoque.length && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum produto cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-white">Histórico de movimentações</h2>
            <p className="text-sm text-muted-foreground">Consulte entradas, saídas, perdas e movimentações automáticas.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por produto ou tipo de movimentação..." className="pl-9" />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Produto</TableHead>
                  <TableHead>Movimento</TableHead><TableHead>Origem</TableHead>
                  <TableHead>Quantidade</TableHead><TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : !filtrados.length ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma movimentação encontrada.</TableCell></TableRow>
                ) : filtrados.map(item => (
                  <TableRow key={item.movimentacao_id}>
                    <TableCell>{formatDate(item.data_movimento)}</TableCell>
                    <TableCell className="font-medium text-white">{item.produto}</TableCell>
                    <TableCell>
                      <span className={item.tipo_movimento === 'ENTRADA' ? 'text-green-400' : item.tipo_movimento === 'PERDA' ? 'text-red-400' : 'text-blue-400'}>
                        {item.tipo_movimento}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={item.origem_tipo === 'VENDA' ? 'text-blue-300' : item.origem_tipo === 'ESTORNO' ? 'text-orange-400' : 'text-muted-foreground'}>
                        {item.origem_tipo}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{formatNumber(item.quantidade)} {item.unidade || ''}</TableCell>
                    <TableCell className="max-w-64 truncate">{item.observacoes || '—'}</TableCell>
                    <TableCell>
                      {isManual(item) ? (
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="icon" title="Editar movimentação" onClick={() => abrirEdicao(item)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" style={{ color: THEME }} />
                          </Button>
                          <Button type="button" variant="outline" size="icon" title="Excluir movimentação" onClick={() => setExcluirItem(item)} className="h-8 w-8 border-red-500/40 hover:border-red-500">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Protegido</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => {
        if (!saving) {
          setDialogOpen(open);
          if (!open) { setEditingItem(null); setForm(initialForm()); }
        }
      }}>
        <DialogContent className="border-border bg-gray-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: THEME }}>{editingItem ? 'Editar Movimentação' : 'Nova Movimentação'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Altere os dados da movimentação. O registro será atualizado diretamente.' : 'Informe os dados da movimentação do produto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={form.produto_id} onValueChange={value => setForm(prev => ({ ...prev, produto_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>
                  {produtos.filter(p => p.ativo !== false || String(p.id) === String(form.produto_id)).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}{p.codigo ? ` — ${p.codigo}` : ''}{p.ativo === false ? ' (Inativo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {produtoSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Estoque atual: {formatNumber(estoqueSelecionado?.estoque_atual)} {produtoSelecionado.unidade || 'un'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de movimentação *</Label>
              <Select value={form.tipo_movimento} onValueChange={value => setForm(prev => ({ ...prev, tipo_movimento: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" min="0.001" step="0.001" value={form.quantidade} onChange={e => setForm(prev => ({ ...prev, quantidade: e.target.value }))} placeholder="0,000" />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data_movimento} onChange={e => setForm(prev => ({ ...prev, data_movimento: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Descreva o motivo da movimentação..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={salvarMovimentacao} disabled={saving} style={{ background: THEME }} className="font-semibold text-black hover:opacity-90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Salvar alterações' : 'Registrar movimentação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(excluirItem)} onOpenChange={open => {
        if (!open && !deleting) setExcluirItem(null);
      }}>
        <DialogContent className="border-border bg-gray-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir movimentação?</DialogTitle>
            <DialogDescription>
              Esta ação removerá definitivamente o lançamento manual. O estoque será recalculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          {excluirItem && (
            <div className="space-y-2 rounded-lg border border-border bg-black/30 p-4 text-sm">
              <p><strong>Produto:</strong> {excluirItem.produto}</p>
              <p><strong>Movimento:</strong> {excluirItem.tipo_movimento}</p>
              <p><strong>Quantidade:</strong> {formatNumber(excluirItem.quantidade)} {excluirItem.unidade || ''}</p>
              <p><strong>Data:</strong> {formatDate(excluirItem.data_movimento)}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirItem(null)} disabled={deleting}>Cancelar</Button>
            <Button onClick={confirmarExclusao} disabled={deleting} className="bg-red-600 font-semibold text-white hover:bg-red-700">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
