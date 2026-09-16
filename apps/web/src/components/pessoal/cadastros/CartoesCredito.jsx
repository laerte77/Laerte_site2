import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Maestro', 'Outra'];

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const CartoesCredito = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cartoes, setCartoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '', bandeira: 'Visa', limite: '', dia_fechamento: '1', dia_vencimento: '10'
  });

  const fetchCartoes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoal_cartoes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });
    if (error) toast({ title: 'Erro ao buscar cartões', variant: 'destructive' });
    else setCartoes(data || []);
    setLoading(false);
  }, [user, toast]);

  const fetchLancamentos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pessoal_cartao_lancamentos')
      .select('cartao_id, valor, parcelas, parcela_atual')
      .eq('user_id', user.id);
    setLancamentos(data || []);
  }, [user]);
  const fetchPagamentos = useCallback(async () => {
  if (!user) return;

  const { data: faturas } = await supabase
    .from('pessoal_faturas')
    .select('id, cartao_id')
    .eq('user_id', user.id);

  const faturaIds = (faturas || []).map((f) => f.id);

  if (faturaIds.length === 0) {
    setPagamentos([]);
    return;
  }

  const { data: pagamentosData } = await supabase
    .from('pessoal_cartao_pagamentos')
    .select('fatura_id, valor')
    .in('fatura_id', faturaIds);

  const pagamentosPorCartao = (pagamentosData || []).map((pagamento) => {
    const fatura = (faturas || []).find((f) => f.id === pagamento.fatura_id);

    return {
      cartao_id: fatura?.cartao_id,
      valor: Number(pagamento.valor || 0)
    };
  });

  setPagamentos(pagamentosPorCartao);
}, [user]);

  useEffect(() => {
  fetchCartoes();
  fetchLancamentos();
  fetchPagamentos();
    if (!user) return;
    const channel = supabase.channel('pessoal_cartoes_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_cartoes' }, () => { fetchCartoes(); fetchLancamentos(); })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_cartao_lancamentos' }, fetchLancamentos)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_cartao_pagamentos' }, fetchPagamentos)
  .subscribe();
    return () => supabase.removeChannel(channel);
 }, [user, fetchCartoes, fetchLancamentos, fetchPagamentos]);

  const valorUtilizado = (cartaoId) => {
  const totalLancado = lancamentos
    .filter((l) => l.cartao_id === cartaoId)
    .reduce((acc, l) => acc + (Number(l.valor) / Math.max(1, l.parcelas)), 0);

  const totalPago = pagamentos
    .filter((p) => p.cartao_id === cartaoId)
    .reduce((acc, p) => acc + Number(p.valor || 0), 0);

  return Math.max(0, totalLancado - totalPago);
};

  const resetForm = () => {
    setFormData({ nome: '', bandeira: 'Visa', limite: '', dia_fechamento: '1', dia_vencimento: '10' });
    setEditingId(null);
  };

  const openDialog = (cartao = null) => {
    if (cartao) {
      setFormData({
        nome: cartao.nome || '',
        bandeira: cartao.bandeira || 'Visa',
        limite: cartao.limite ?? '',
        dia_fechamento: String(cartao.dia_fechamento ?? 1),
        dia_vencimento: String(cartao.dia_vencimento ?? 10),
      });
      setEditingId(cartao.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => { setIsDialogOpen(false); resetForm(); };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.limite) {
      toast({ title: 'Erro', description: 'Preencha o nome e o limite do cartão.', variant: 'destructive' });
      return;
    }
    const diaFech = parseInt(formData.dia_fechamento, 10);
    const diaVenc = parseInt(formData.dia_vencimento, 10);
    if (isNaN(diaFech) || diaFech < 1 || diaFech > 31 || isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
      toast({ title: 'Erro', description: 'Os dias de fechamento e vencimento devem estar entre 1 e 31.', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: user.id,
      nome: formData.nome.trim(),
      bandeira: formData.bandeira,
      limite: parseFloat(formData.limite),
      dia_fechamento: diaFech,
      dia_vencimento: diaVenc,
    };
    if (editingId) {
      const { error } = await supabase.from('pessoal_cartoes').update(payload).eq('id', editingId);
      if (error) toast({ title: 'Erro', description: 'Não foi possível atualizar o cartão.', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Cartão atualizado.', className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('pessoal_cartoes').insert(payload);
      if (error) toast({ title: 'Erro', description: 'Não foi possível cadastrar o cartão.', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Cartão cadastrado.', className: 'bg-green-500 text-white' });
    }
    closeDialog();
    fetchCartoes();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('pessoal_cartoes').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: 'Não foi possível excluir o cartão.', variant: 'destructive' });
    else { toast({ title: 'Sucesso!', description: 'Cartão excluído.', className: 'bg-red-500 text-white' }); fetchCartoes(); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-blue-500 mb-2">Cartões de Crédito</h2>
            <p className="text-muted-foreground">Cadastre seus cartões e acompanhe o limite (A-Z)</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="dark-pessoal bg-card border-border sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-blue-500">{editingId ? 'Editar' : 'Novo'} Cartão</DialogTitle>
            <DialogDescription>Preencha os dados do cartão de crédito.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / Apelido do Cartão</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Cartão Nubank" className="bg-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bandeira</Label>
                <Select value={formData.bandeira} onValueChange={(v) => setFormData(p => ({ ...p, bandeira: v }))}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark-pessoal bg-card border-border">
                    {BANDEIRAS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Limite (R$)</Label>
                <Input type="number" step="0.01" value={formData.limite} onChange={(e) => setFormData(p => ({ ...p, limite: e.target.value }))} placeholder="0,00" className="bg-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input type="number" min="1" max="31" value={formData.dia_fechamento} onChange={(e) => setFormData(p => ({ ...p, dia_fechamento: e.target.value }))} className="bg-input" />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input type="number" min="1" max="31" value={formData.dia_vencimento} onChange={(e) => setFormData(p => ({ ...p, dia_vencimento: e.target.value }))} className="bg-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : cartoes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center text-muted-foreground">
            <CreditCard className="mx-auto w-12 h-12 mb-3 opacity-50" />
            <p>Nenhum cartão cadastrado.</p>
            <p className="text-sm mt-1">Clique em "Novo Cartão" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cartoes.map((cartao) => {
            const utilizado = valorUtilizado(cartao.id);
            const limite = Number(cartao.limite || 0);
            const disponivel = Math.max(0, limite - utilizado);
            const pct = limite > 0 ? Math.min(100, (utilizado / limite) * 100) : 0;
            return (
              <motion.div key={cartao.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border bg-gradient-to-br from-blue-600/10 to-blue-900/20 border-blue-500/30 overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground leading-tight">{cartao.nome}</h3>
                          <span className="text-xs text-muted-foreground">{cartao.bandeira || '—'}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" onClick={() => openDialog(cartao)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="dark-pessoal bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
                              <AlertDialogDescription>Isso removerá o cartão e seus lançamentos. Deseja continuar?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(cartao.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Utilizado</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Limite</p>
                        <p className="font-semibold text-foreground">{formatBRL(limite)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Utilizado</p>
                        <p className="font-semibold text-red-400">{formatBRL(utilizado)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Disponível</p>
                        <p className="font-semibold text-emerald-400">{formatBRL(disponivel)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Fech./Venc.</p>
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <Wallet className="w-3 h-3" />{cartao.dia_fechamento}/{cartao.dia_vencimento}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CartoesCredito;
