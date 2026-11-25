import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, Wallet, Plus, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GREEN = 'hsl(var(--neon-comercial))';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = v => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—';

export default function LancamentoFinanceiroComercial({ mode }) {
  const expense = mode === 'despesa';
  const table = expense ? 'comercial_despesas' : 'comercial_outros_lancamentos';
  const dateField = expense ? 'data_despesa' : 'data_lancamento';
  const typeField = expense ? 'categoria' : 'tipo';
  const choices = expense ? [{ value: 'operacional', label: 'Operacional' }, { value: 'variavel', label: 'Variável' }] : [{ value: 'custo', label: 'Custo' }, { value: 'investimento', label: 'Investimento' }];
  const title = expense ? 'Despesas' : 'Outros Lançamentos';
  const Icon = expense ? Receipt : Wallet;
  const { user } = useAuth();
  const { toast } = useToast();
  const initial = { fornecedor_id: '', tipo: choices[0].value, descricao: '', valor: '', data: today(), vencimento: '', pagamento: '', forma: '', status: 'pendente', observacoes: '' };
  const [form, setForm] = useState(initial);
  const [fornecedores, setFornecedores] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [f, r] = await Promise.all([
      supabase.from('comercial_fornecedores').select('id,nome').eq('user_id', user.id).eq('ativo', true).order('nome'),
      supabase.from(table).select('*').eq('user_id', user.id).order(dateField, { ascending: false }).limit(150)
    ]);
    const error = f.error || r.error;
    if (error) toast({ title: 'Erro ao carregar lançamentos', description: error.message, variant: 'destructive' });
    setFornecedores(f.data || []);
    setRows(r.data || []);
    setLoading(false);
  }, [user, table, dateField, toast]);

  useEffect(() => { carregar(); }, [carregar]);
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const salvar = async e => {
    e.preventDefault();
    if (!user || !form.descricao.trim() || !(Number(form.valor) > 0)) {
      toast({ title: 'Confira os campos', description: 'Informe uma descrição e um valor maior que zero.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id, fornecedor_id: form.fornecedor_id || null,
      [typeField]: form.tipo, descricao: form.descricao.trim(), valor: Number(form.valor),
      [dateField]: form.data, data_vencimento: form.vencimento || null,
      data_pagamento: form.status === 'pago' ? (form.pagamento || today()) : (form.pagamento || null),
      forma_pagamento: form.forma.trim() || null, status: form.status,
      observacoes: form.observacoes.trim() || null
    };
    const { error } = await supabase.from(table).insert(payload);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Lançamento salvo', description: `${title} registrado com sucesso.` }); setForm({ ...initial, data: today() }); await carregar(); }
    setSaving(false);
  };

  const alterarStatus = async (row, status) => {
    const patch = { status };
    if (status === 'pago') patch.data_pagamento = today();
    const { error } = await supabase.from(table).update(patch).eq('id', row.id).eq('user_id', user.id);
    if (error) toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Situação atualizada' }); carregar(); }
  };

  const fornecedorNome = id => fornecedores.find(f => f.id === id)?.nome || '—';
  const statusLabel = v => v === 'pago' ? 'Pago' : v === 'cancelado' ? 'Cancelado' : 'Pendente';

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5"><div className="flex items-center gap-3"><div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--neon-comercial)/.3)', color: GREEN }}><Icon /></div><div><p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Lançamentos</p><h1 className="text-2xl font-bold text-white">{title}</h1><p className="text-sm text-muted-foreground">{expense ? 'Registre despesas operacionais ou variáveis.' : 'Registre custos ou investimentos.'}</p></div></div><Button variant="outline" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div>
    <Card className="border-border bg-card/80"><CardHeader><CardTitle style={{ color: GREEN }}>Novo lançamento</CardTitle></CardHeader><CardContent><form onSubmit={salvar} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>{expense ? 'Tipo de despesa' : 'Tipo de lançamento'}</Label><select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{choices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      <div className="space-y-2"><Label>Fornecedor (opcional)</Label><select value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sem fornecedor</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
      <div className="space-y-2 md:col-span-2"><Label>Descrição *</Label><Input required value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o lançamento" /></div>
      <div className="space-y-2"><Label>Valor (R$) *</Label><Input required min="0.01" step="0.01" type="number" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" /></div>
      <div className="space-y-2"><Label>Data do lançamento</Label><Input required type="date" value={form.data} onChange={e => set('data', e.target.value)} /></div>
      <div className="space-y-2"><Label>Data de vencimento</Label><Input type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} /></div>
      <div className="space-y-2"><Label>Situação</Label><select value={form.status} onChange={e => set('status', e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select></div>
      <div className="space-y-2"><Label>Data de pagamento</Label><Input type="date" value={form.pagamento} onChange={e => set('pagamento', e.target.value)} /></div>
      <div className="space-y-2"><Label>Forma de pagamento</Label><Input value={form.forma} onChange={e => set('forma', e.target.value)} placeholder="PIX, dinheiro, cartão..." /></div>
      <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} /></div>
      <div className="flex items-center justify-between border-t border-border pt-4 md:col-span-2"><p className="text-lg font-bold" style={{ color: GREEN }}>{money(form.valor)}</p><Button disabled={saving} className="font-bold text-black" style={{ background: GREEN }}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Salvar lançamento</Button></div>
    </form></CardContent></Card>
    <Card className="border-border bg-card"><CardHeader><CardTitle style={{ color: GREEN }}>Lançamentos recentes</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground"><th className="p-3">Data</th><th className="p-3">Classificação</th><th className="p-3">Descrição</th><th className="p-3">Fornecedor</th><th className="p-3 text-right">Valor</th><th className="p-3">Vencimento</th><th className="p-3">Situação</th><th className="p-3">Ações</th></tr></thead><tbody>
      {loading ? <tr><td colSpan="8" className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : rows.length ? rows.map(r => <tr key={r.id} className="border-b border-border"><td className="p-3">{brDate(r[dateField])}</td><td className="p-3 capitalize">{String(r[typeField] || '').replace('variavel', 'Variável')}</td><td className="p-3">{r.descricao}</td><td className="p-3">{fornecedorNome(r.fornecedor_id)}</td><td className="p-3 text-right font-semibold">{money(r.valor)}</td><td className="p-3">{brDate(r.data_vencimento)}</td><td className={`p-3 ${r.status === 'pago' ? 'text-emerald-400' : r.status === 'cancelado' ? 'text-red-400' : 'text-amber-400'}`}>{statusLabel(r.status)}</td><td className="p-3"><div className="flex gap-1">{r.status === 'pendente' && <><Button size="icon" variant="ghost" title="Marcar como pago" onClick={() => alterarStatus(r, 'pago')} className="text-emerald-400"><CheckCircle className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Cancelar lançamento" onClick={() => window.confirm('Cancelar este lançamento?') && alterarStatus(r, 'cancelado')} className="text-red-400"><XCircle className="h-4 w-4" /></Button></>}</div></td></tr>) : <tr><td colSpan="8" className="p-8 text-center text-muted-foreground">Nenhum lançamento cadastrado.</td></tr>}
    </tbody></table></CardContent></Card>
  </div>;
}
