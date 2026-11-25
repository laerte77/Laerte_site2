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

const GREEN = 'hsl(var(--neon-comercial))';
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = v => v ? new Date(v).toLocaleString('pt-BR') : '—';
const newItem = () => ({ produto_id: '', quantidade: '1', preco_unitario: '' });

export default function LancamentoVendasComercial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [forma, setForma] = useState('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([newItem()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [c, p, v] = await Promise.all([
      supabase.from('comercial_clientes').select('id,nome').eq('user_id', user.id).eq('ativo', true).order('nome'),
      supabase.from('comercial_produtos').select('id,nome,codigo,unidade,preco_venda,ativo').eq('user_id', user.id).eq('ativo', true).order('nome'),
      supabase.from('comercial_vendas').select('id,data_venda,status,forma_pagamento,observacoes,total,cliente_id,comercial_venda_itens(id,quantidade,preco_unitario,subtotal,produto_id)').eq('user_id', user.id).order('data_venda', { ascending: false }).limit(100)
    ]);
    const error = c.error || p.error || v.error;
    if (error) toast({ title: 'Erro ao carregar vendas', description: error.message, variant: 'destructive' });
    setClientes(c.data || []);
    setProdutos(p.data || []);
    setVendas(v.data || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const alterarItem = (index, field, value) => setItens(old => old.map((item, i) => {
    if (i !== index) return item;
    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value);
      return { ...item, produto_id: value, preco_unitario: produto ? String(produto.preco_venda ?? 0) : '' };
    }
    return { ...item, [field]: value };
  }));

  const total = useMemo(() => itens.reduce((sum, i) => sum + Math.max(0, Number(i.quantidade) || 0) * Math.max(0, Number(i.preco_unitario) || 0), 0), [itens]);

  const salvar = async e => {
    e.preventDefault();
    if (!user) return;
    const validos = itens.filter(i => i.produto_id && Number(i.quantidade) > 0 && Number(i.preco_unitario) >= 0);
    if (validos.length !== itens.length || !validos.length) {
      toast({ title: 'Confira os itens', description: 'Selecione um produto e informe quantidade e preço válidos em todas as linhas.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    let vendaId;
    try {
      const { data: venda, error: vendaError } = await supabase.from('comercial_vendas').insert({
        user_id: user.id, cliente_id: clienteId || null, forma_pagamento: forma,
        observacoes: observacoes.trim() || null, total: 0, status: 'ATIVA'
      }).select('id').single();
      if (vendaError) throw vendaError;
      vendaId = venda.id;
      const { error: itemError } = await supabase.from('comercial_venda_itens').insert(validos.map(i => ({
        user_id: user.id, venda_id: vendaId, produto_id: i.produto_id,
        quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario)
      })));
      if (itemError) throw itemError;
      toast({ title: 'Venda registrada', description: 'Venda salva e estoque atualizado automaticamente.' });
      setClienteId(''); setForma('PIX'); setObservacoes(''); setItens([newItem()]);
      await carregar();
    } catch (error) {
      if (vendaId) {
        const { error: cancelError } = await supabase.from('comercial_vendas').update({ status: 'CANCELADA' }).eq('id', vendaId).eq('user_id', user.id);
        if (cancelError) console.error('Falha ao cancelar venda incompleta:', cancelError);
      }
      toast({ title: 'Não foi possível registrar a venda', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const cancelar = async venda => {
    if (venda.status !== 'ATIVA' || !window.confirm('Deseja cancelar esta venda? O estoque será estornado automaticamente.')) return;
    const { error } = await supabase.from('comercial_vendas').update({ status: 'CANCELADA' }).eq('id', venda.id).eq('user_id', user.id);
    if (error) toast({ title: 'Erro ao cancelar venda', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Venda cancelada', description: 'O estorno do estoque foi processado pelo banco.' }); carregar(); }
  };

  const produtoNome = id => produtos.find(p => p.id === id)?.nome || 'Produto';
  const clienteNome = id => clientes.find(c => c.id === id)?.nome || 'Cliente não identificado';

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
      <div className="flex items-center gap-3"><div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--neon-comercial)/.3)', color: GREEN }}><ShoppingCart /></div><div><p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Lançamentos</p><h1 className="text-2xl font-bold text-white">Vendas</h1><p className="text-sm text-muted-foreground">Registre vendas e acompanhe os lançamentos.</p></div></div>
      <Button variant="outline" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
    </div>

    <Card className="border-border bg-card/80"><CardHeader><CardTitle style={{ color: GREEN }}>Nova venda</CardTitle></CardHeader><CardContent>
      <form onSubmit={salvar} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Cliente (opcional)</Label><select value={clienteId} onChange={e => setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Consumidor não identificado</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div className="space-y-2"><Label>Forma de pagamento</Label><select value={forma} onChange={e => setForma(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{['PIX','DINHEIRO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','TRANSFERÊNCIA','A PRAZO','OUTRO'].map(x => <option key={x}>{x}</option>)}</select></div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label>Produtos da venda</Label><Button type="button" size="sm" variant="outline" onClick={() => setItens(v => [...v, newItem()])}><Plus className="mr-1 h-4 w-4" />Adicionar produto</Button></div>
          {itens.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-border p-3 md:grid-cols-[minmax(180px,2fr)_1fr_1fr_auto]">
            <div className="space-y-1"><Label>Produto</Label><select required value={item.produto_id} onChange={e => alterarItem(index, 'produto_id', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}{p.codigo ? ` (${p.codigo})` : ''}</option>)}</select></div>
            <div className="space-y-1"><Label>Quantidade</Label><Input required min="0.001" step="0.001" type="number" value={item.quantidade} onChange={e => alterarItem(index, 'quantidade', e.target.value)} /></div>
            <div className="space-y-1"><Label>Preço unitário (R$)</Label><Input required min="0" step="0.01" type="number" value={item.preco_unitario} onChange={e => alterarItem(index, 'preco_unitario', e.target.value)} /></div>
            <div className="flex items-end justify-between gap-2"><span className="pb-2 text-sm font-semibold">{money(Number(item.quantidade) * Number(item.preco_unitario))}</span><Button type="button" variant="ghost" size="icon" disabled={itens.length === 1} onClick={() => setItens(v => v.filter((_, i) => i !== index))} className="text-red-400"><Trash2 className="h-4 w-4" /></Button></div>
          </div>)}
        </div>
        <div className="space-y-2"><Label>Observações</Label><Textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informações adicionais..." /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="text-sm text-muted-foreground">Total da venda</p><p className="text-2xl font-bold" style={{ color: GREEN }}>{money(total)}</p></div><Button type="submit" disabled={saving || !produtos.length} className="font-bold text-black" style={{ background: GREEN }}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Salvar venda</Button></div>
        {!produtos.length && <p className="text-sm text-amber-400">Cadastre e ative produtos antes de registrar uma venda.</p>}
      </form>
    </CardContent></Card>

    <Card className="border-border bg-card"><CardHeader><CardTitle style={{ color: GREEN }}>Vendas recentes</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground"><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Itens</th><th className="p-3">Pagamento</th><th className="p-3 text-right">Total</th><th className="p-3">Situação</th><th className="p-3 text-right">Ação</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="7" className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : vendas.length ? vendas.map(v => <tr key={v.id} className="border-b border-border"><td className="p-3">{dateTime(v.data_venda)}</td><td className="p-3">{clienteNome(v.cliente_id)}</td><td className="p-3">{(v.comercial_venda_itens || []).map(i => `${produtoNome(i.produto_id)} (${i.quantidade})`).join(', ') || '—'}</td><td className="p-3">{v.forma_pagamento || '—'}</td><td className="p-3 text-right font-semibold">{money(v.total)}</td><td className={`p-3 ${v.status === 'ATIVA' ? 'text-emerald-400' : 'text-red-400'}`}>{v.status}</td><td className="p-3 text-right">{v.status === 'ATIVA' && <Button size="sm" variant="ghost" onClick={() => cancelar(v)} className="text-red-400"><XCircle className="mr-1 h-4 w-4" />Cancelar</Button>}</td></tr>) : <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>}
      </tbody></table>
    </CardContent></Card>
  </div>;
}
