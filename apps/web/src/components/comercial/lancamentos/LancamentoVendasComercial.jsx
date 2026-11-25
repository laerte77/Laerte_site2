import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShoppingCart, RefreshCw, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ModalComercialPadrao from '../ModalComercialPadrao';

const GREEN = 'hsl(var(--neon-comercial))';
const FORM_ID = 'form-nova-venda';
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDate = v => v ? new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR') : '—';
const subtotalItem = i => Number((Math.max(0, Number(i.quantidade) || 0) * Math.max(0, Number(i.valor_unitario) || 0)).toFixed(2));
const newItem = () => ({ produto_id: '', quantidade: '1', valor_unitario: '' });

export default function LancamentoVendasComercial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [dataVenda, setDataVenda] = useState(hoje());
  const [clienteId, setClienteId] = useState('');
  const [forma, setForma] = useState('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([newItem()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [c, p, v] = await Promise.all([
      supabase.from('comercial_clientes')
        .select('id,nome,ativo')
        .eq('user_id', user.id)
        .order('nome'),
      supabase.from('comercial_produtos')
        .select('id,nome,codigo,unidade,ativo')
        .eq('user_id', user.id)
        .order('nome'),
      supabase.from('comercial_vendas')
        .select('id,data_venda,status,forma_pagamento,observacoes,valor_total,cliente_id,comercial_venda_itens(id,descricao,quantidade,valor_unitario,subtotal,produto_id)')
        .eq('user_id', user.id)
        .order('data_venda', { ascending: false })
        .limit(100)
    ]);

    const error = c.error || p.error || v.error;
    if (error) toast({ title: 'Erro ao carregar vendas', description: error.message, variant: 'destructive' });

    setClientes(c.data || []);
    setProdutos(p.data || []);
    setVendas(v.data || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirModal = () => {
    setDataVenda(hoje());
    setClienteId('');
    setForma('PIX');
    setObservacoes('');
    setItens([newItem()]);
    setModalOpen(true);
  };

  const alterarItem = (index, field, value) => {
    setItens(old => old.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const total = useMemo(
    () => Number(itens.reduce((sum, item) => sum + subtotalItem(item), 0).toFixed(2)),
    [itens]
  );

  const salvar = async e => {
    e.preventDefault();
    if (!user || saving) return;

    const validos = itens.filter(i =>
      i.produto_id &&
      Number(i.quantidade) > 0 &&
      i.valor_unitario.trim() !== '' &&
      Number(i.valor_unitario) >= 0
    );

    if (!dataVenda || validos.length !== itens.length || !validos.length) {
      toast({
        title: 'Confira os dados da venda',
        description: 'Informe a data, selecione os produtos e preencha quantidades e preços válidos.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    let vendaId = null;

    try {
      const { data: venda, error: vendaError } = await supabase
        .from('comercial_vendas')
        .insert({
          user_id: user.id,
          cliente_id: clienteId || null,
          data_venda: dataVenda,
          valor_total: 0,
          valor_recebido: 0,
          forma_pagamento: forma,
          status: 'pendente',
          observacoes: observacoes.trim() || null
        })
        .select('id')
        .single();

      if (vendaError) throw vendaError;
      vendaId = venda.id;

      const itensBanco = validos.map(i => {
        const produto = produtos.find(p => p.id === i.produto_id);
        const quantidade = Number(i.quantidade);
        const valorUnitario = Number(i.valor_unitario);

        return {
          user_id: user.id,
          venda_id: vendaId,
          produto_id: i.produto_id,
          descricao: produto?.nome || 'Produto',
          quantidade,
          valor_unitario: valorUnitario,
          subtotal: Number((quantidade * valorUnitario).toFixed(2))
        };
      });

      const { error: itemError } = await supabase
        .from('comercial_venda_itens')
        .insert(itensBanco);

      if (itemError) throw itemError;

      toast({
        title: 'Venda registrada!',
        description: 'Os itens foram salvos e o estoque foi movimentado automaticamente.'
      });

      setModalOpen(false);
      await carregar();
    } catch (error) {
      if (vendaId) {
        const { error: cancelError } = await supabase
          .from('comercial_vendas')
          .update({ status: 'cancelado' })
          .eq('id', vendaId)
          .eq('user_id', user.id);

        if (cancelError) {
          console.error('Falha ao cancelar venda incompleta:', cancelError);
          toast({
            title: 'Atenção: venda incompleta',
            description: 'Ocorreu um erro ao salvar os itens e não foi possível confirmar o cancelamento automático. Verifique essa venda no banco.',
            variant: 'destructive'
          });
        }
      }

      toast({
        title: 'Não foi possível registrar a venda',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async venda => {
    if (venda.status === 'cancelado' || !window.confirm('Deseja cancelar esta venda? O estoque dos produtos será estornado automaticamente.')) return;

    const { error } = await supabase
      .from('comercial_vendas')
      .update({ status: 'cancelado' })
      .eq('id', venda.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao cancelar venda', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Venda cancelada', description: 'O banco processou o estorno do estoque.' });
      carregar();
    }
  };

  const produtoNome = id => produtos.find(p => p.id === id)?.nome || 'Produto';
  const clienteNome = id => clientes.find(c => c.id === id)?.nome || 'Consumidor não identificado';

  const statusInfo = {
    pendente: { texto: 'Pendente', cor: 'text-amber-400' },
    parcial: { texto: 'Parcial', cor: 'text-blue-400' },
    recebido: { texto: 'Recebido', cor: 'text-emerald-400' },
    cancelado: { texto: 'Cancelado', cor: 'text-red-400' }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--neon-comercial)/.3)', color: GREEN }}>
            <ShoppingCart />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Lançamentos</p>
            <h1 className="text-2xl font-bold text-white">Vendas</h1>
            <p className="text-sm text-muted-foreground">Registre vendas e acompanhe os lançamentos.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={carregar} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar
          </Button>
          <Button onClick={abrirModal} className="font-bold text-black" style={{ background: GREEN }}>
            <Plus className="mr-2 h-4 w-4" />Nova venda
          </Button>
        </div>
      </div>

      <ModalComercialPadrao
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Nova venda"
        description="Informe os dados da venda e adicione os produtos."
        icon={ShoppingCart}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Fechar
            </Button>
            <Button type="submit" form={FORM_ID} disabled={saving || !produtos.some(p => p.ativo)} className="font-bold text-black" style={{ background: GREEN }}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Salvar venda
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={salvar} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data da venda</Label>
              <Input type="date" required value={dataVenda} onChange={e => setDataVenda(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
                <option value="">Consumidor não identificado</option>
                {clientes.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Forma de pagamento</Label>
              <select value={forma} onChange={e => setForma(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
                {['PIX', 'DINHEIRO', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO', 'TRANSFERÊNCIA', 'A PRAZO', 'OUTRO'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Produtos da venda</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setItens(v => [...v, newItem()])}>
                <Plus className="mr-1 h-4 w-4" />Adicionar produto
              </Button>
            </div>

            {itens.map((item, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-300">Produto {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" disabled={itens.length === 1} onClick={() => setItens(v => v.filter((_, i) => i !== index))} className="text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Produto</Label>
                  <select required value={item.produto_id} onChange={e => alterarItem(index, 'produto_id', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
                    <option value="">Selecione um produto</option>
                    {produtos.filter(p => p.ativo).map(p => (
                      <option key={p.id} value={p.id}>{p.nome}{p.codigo ? ` (${p.codigo})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input required type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e => alterarItem(index, 'quantidade', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço unitário (R$)</Label>
                    <Input required type="number" min="0" step="0.01" placeholder="Digite o preço" value={item.valor_unitario} onChange={e => alterarItem(index, 'valor_unitario', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtotal (R$)</Label>
                    <Input readOnly tabIndex={-1} value={money(subtotalItem(item))} className="font-semibold" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informações adicionais..." />
          </div>

          <div className="rounded-xl border border-[hsl(var(--neon-comercial)/.3)] bg-[hsl(var(--neon-comercial)/.06)] p-4">
            <p className="text-sm text-gray-400">Total da venda</p>
            <p className="text-2xl font-bold" style={{ color: GREEN }}>{money(total)}</p>
          </div>

          {!produtos.some(p => p.ativo) && (
            <p className="text-sm text-amber-400">Cadastre e ative produtos antes de registrar uma venda.</p>
          )}
        </form>
      </ModalComercialPadrao>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle style={{ color: GREEN }}>Vendas recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Itens</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Situação</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : vendas.length ? vendas.map(v => {
                const status = statusInfo[v.status] || { texto: v.status, cor: 'text-gray-400' };
                return (
                  <tr key={v.id} className="border-b border-border">
                    <td className="p-3">{formatDate(v.data_venda)}</td>
                    <td className="p-3">{clienteNome(v.cliente_id)}</td>
                    <td className="max-w-[260px] p-3">
                      {(v.comercial_venda_itens || []).map(i => `${i.descricao || produtoNome(i.produto_id)} (${i.quantidade})`).join(', ') || '—'}
                    </td>
                    <td className="p-3">{v.forma_pagamento || '—'}</td>
                    <td className="p-3 text-right font-semibold">{money(v.valor_total)}</td>
                    <td className={`p-3 ${status.cor}`}>{status.texto}</td>
                    <td className="p-3 text-right">
                      {v.status !== 'cancelado' && (
                        <Button size="sm" variant="ghost" onClick={() => cancelar(v)} className="text-red-400">
                          <XCircle className="mr-1 h-4 w-4" />Cancelar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
