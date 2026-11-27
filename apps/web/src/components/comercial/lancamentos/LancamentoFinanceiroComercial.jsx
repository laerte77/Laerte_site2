import React, { useCallback, useEffect, useState } from 'react';
import {
  Receipt, Wallet, Plus, RefreshCw, Loader2,
  CheckCircle, XCircle, Pencil, Trash2
} from 'lucide-react';

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
const FORM_ID = 'form-lancamento-financeiro-comercial';

const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const money = v => Number(v || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const brDate = v => v
  ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR')
  : '—';

const createInitial = type => ({
  fornecedor_id: '',
  tipo: type || 'custo',
  descricao: '',
  valor: '',
  data: today(),
  vencimento: '',
  pagamento: '',
  forma: '',
  status: 'pendente',
  observacoes: ''
});

export default function LancamentoFinanceiroComercial({ mode = 'outros' }) {
  const isCusto = mode === 'custo';
  const isInvestimento = mode === 'investimento';
  const fixedType = isCusto ? 'custo' : isInvestimento ? 'investimento' : null;

  const title = isCusto
    ? 'Custos'
    : isInvestimento
      ? 'Investimentos'
      : 'Outros Lançamentos';

  const description = isCusto
    ? 'Registre e acompanhe os custos do negócio.'
    : isInvestimento
      ? 'Registre e acompanhe os investimentos realizados ou previstos.'
      : 'Registre custos e investimentos do negócio.';

  const Icon = isInvestimento ? Receipt : Wallet;

  const choices = [
    { value: 'custo', label: 'Custo' },
    { value: 'investimento', label: 'Investimento' }
  ];

  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState(() => createInitial(fixedType));
  const [fornecedores, setFornecedores] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const carregar = useCallback(async () => {
    if (!user) {
      setRows([]);
      setFornecedores([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let registrosQuery = supabase
      .from('comercial_outros_lancamentos')
      .select('*')
      .eq('user_id', user.id)
      .order('data_lancamento', { ascending: false })
      .limit(150);

    if (fixedType) {
      registrosQuery = registrosQuery.eq('tipo', fixedType);
    }

    const [f, r] = await Promise.all([
      supabase
        .from('comercial_fornecedores')
        .select('id,nome')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome'),

      registrosQuery
    ]);

    const error = f.error || r.error;

    if (error) {
      toast({
        title: 'Erro ao carregar lançamentos',
        description: error.message,
        variant: 'destructive'
      });
    }

    setFornecedores(f.data || []);
    setRows(r.data || []);
    setLoading(false);
  }, [user, fixedType, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const set = (key, value) => {
    setForm(old => ({ ...old, [key]: value }));
  };

  const abrirModal = () => {
    setEditId(null);
    setForm(createInitial(fixedType));
    setModalOpen(true);
  };

  const editar = row => {
    setEditId(row.id);

    setForm({
      fornecedor_id: row.fornecedor_id || '',
      tipo: row.tipo || fixedType || 'custo',
      descricao: row.descricao || '',
      valor: String(row.valor ?? ''),
      data: row.data_lancamento || today(),
      vencimento: row.data_vencimento || '',
      pagamento: row.data_pagamento || '',
      forma: row.forma_pagamento || '',
      status: row.status || 'pendente',
      observacoes: row.observacoes || ''
    });

    setModalOpen(true);
  };

  const fecharModal = () => {
    if (saving || deleting) return;

    setModalOpen(false);
    setEditId(null);
    setForm(createInitial(fixedType));
  };

  const salvar = async e => {
    e.preventDefault();

    if (!user || saving) return;

    const valor = Number(String(form.valor).replace(',', '.'));

    if (
      !form.descricao.trim() ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !form.data
    ) {
      toast({
        title: 'Confira os campos',
        description: 'Informe descrição, valor maior que zero e data do lançamento.',
        variant: 'destructive'
      });
      return;
    }

    if (!['pendente', 'pago', 'cancelado'].includes(form.status)) {
      toast({
        title: 'Situação inválida',
        description: 'Selecione uma situação válida.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const tipo = fixedType || form.tipo;

      const payload = {
        fornecedor_id: form.fornecedor_id || null,
        tipo,
        descricao: form.descricao.trim(),
        valor: Number(valor.toFixed(2)),
        data_lancamento: form.data,
        data_vencimento: form.vencimento || null,
        data_pagamento: form.status === 'pago'
          ? (form.pagamento || today())
          : (form.pagamento || null),
        forma_pagamento: form.forma.trim() || null,
        status: form.status,
        observacoes: form.observacoes.trim() || null
      };

      const result = editId
        ? await supabase
            .from('comercial_outros_lancamentos')
            .update(payload)
            .eq('id', editId)
            .eq('user_id', user.id)
        : await supabase
            .from('comercial_outros_lancamentos')
            .insert({
              ...payload,
              user_id: user.id
            });

      if (result.error) throw result.error;

      toast({
        title: editId ? 'Lançamento atualizado' : 'Lançamento salvo',
        description: `${title} ${editId ? 'atualizado' : 'registrado'} com sucesso.`
      });

      setModalOpen(false);
      setEditId(null);
      setForm(createInitial(fixedType));

      await carregar();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const alterarStatus = async (row, status) => {
    if (!user) return;

    const patch = { status };

    if (status === 'pago') {
      patch.data_pagamento = today();
    }

    const { error } = await supabase
      .from('comercial_outros_lancamentos')
      .update(patch)
      .eq('id', row.id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Não foi possível atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({ title: 'Situação atualizada' });
      await carregar();
    }
  };

  const excluir = async row => {
    if (!window.confirm('Deseja realmente excluir este lançamento? Esta ação não poderá ser desfeita.')) {
      return;
    }

    setDeleting(true);

    const { error } = await supabase
      .from('comercial_outros_lancamentos')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Erro ao excluir lançamento',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Lançamento excluído',
        description: 'O registro foi removido.'
      });

      if (editId === row.id) {
        setModalOpen(false);
        setEditId(null);
      }

      await carregar();
    }

    setDeleting(false);
  };

  const fornecedorNome = id =>
    fornecedores.find(f => f.id === id)?.nome || '—';

  const statusLabel = value => {
    if (value === 'pago') return 'Pago';
    if (value === 'cancelado') return 'Cancelado';
    return 'Pendente';
  };

  const totalRegistros = rows
    .filter(r => r.status !== 'cancelado')
    .reduce((sum, r) => sum + Number(r.valor || 0), 0);

  const totalPago = rows
    .filter(r => r.status === 'pago')
    .reduce((sum, r) => sum + Number(r.valor || 0), 0);

  const totalPendente = rows
    .filter(r => r.status === 'pendente')
    .reduce((sum, r) => sum + Number(r.valor || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl border p-3"
            style={{
              borderColor: 'hsl(var(--neon-comercial)/.3)',
              color: GREEN
            }}
          >
            <Icon />
          </div>

          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: GREEN }}
            >
              Lançamentos
            </p>

            <h1 className="text-2xl font-bold text-white">{title}</h1>

            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={carregar}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          <Button
            onClick={abrirModal}
            className="font-bold text-black"
            style={{ background: GREEN }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCusto ? 'Novo custo' : isInvestimento ? 'Novo investimento' : 'Novo lançamento'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total registrado</p>
            <p className="mt-2 text-xl font-bold" style={{ color: GREEN }}>
              {money(totalRegistros)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="mt-2 text-xl font-bold text-emerald-400">
              {money(totalPago)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total pendente</p>
            <p className="mt-2 text-xl font-bold text-amber-400">
              {money(totalPendente)}
            </p>
          </CardContent>
        </Card>
      </div>

      <ModalComercialPadrao
        open={modalOpen}
        onClose={fecharModal}
        title={editId
          ? `Editar ${isCusto ? 'custo' : isInvestimento ? 'investimento' : 'lançamento'}`
          : `Novo ${isCusto ? 'custo' : isInvestimento ? 'investimento' : 'lançamento'}`
        }
        description={`Preencha os dados ${isCusto ? 'do custo' : isInvestimento ? 'do investimento' : 'do lançamento'}.`}
        icon={Icon}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={fecharModal}
              disabled={saving || deleting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              form={FORM_ID}
              disabled={saving || deleting}
              className="font-bold text-black"
              style={{ background: GREEN }}
            >
              {saving
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : editId
                  ? <Pencil className="mr-2 h-4 w-4" />
                  : <Plus className="mr-2 h-4 w-4" />
              }
              {editId ? 'Salvar alterações' : 'Salvar lançamento'}
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={salvar}
          className="grid gap-4 sm:grid-cols-2"
        >
          {!fixedType && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipo de lançamento *</Label>

              <select
                required
                value={form.tipo}
                onChange={e => set('tipo', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white"
              >
                {choices.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>Fornecedor (opcional)</Label>

            <select
              value={form.fornecedor_id}
              onChange={e => set('fornecedor_id', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white"
            >
              <option value="">Sem fornecedor</option>

              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Descrição *</Label>

            <Input
              required
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder={`Descreva ${isCusto ? 'o custo' : isInvestimento ? 'o investimento' : 'o lançamento'}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>

            <Input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={form.valor}
              onChange={e => set('valor', e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Data do lançamento *</Label>

            <Input
              required
              type="date"
              value={form.data}
              onChange={e => set('data', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de vencimento</Label>

            <Input
              type="date"
              value={form.vencimento}
              onChange={e => set('vencimento', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Situação</Label>

            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Data de pagamento</Label>

            <Input
              type="date"
              value={form.pagamento}
              onChange={e => set('pagamento', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>

            <Input
              value={form.forma}
              onChange={e => set('forma', e.target.value)}
              placeholder="PIX, dinheiro, cartão..."
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Observações</Label>

            <Textarea
              rows={3}
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="rounded-xl border border-[hsl(var(--neon-comercial)/.3)] bg-[hsl(var(--neon-comercial)/.06)] p-4 sm:col-span-2">
            <p className="text-sm text-gray-400">
              Valor do lançamento
            </p>

            <p className="text-2xl font-bold" style={{ color: GREEN }}>
              {money(form.valor)}
            </p>

            <p className={`mt-1 text-xs font-semibold ${
              form.status === 'pago'
                ? 'text-emerald-400'
                : form.status === 'cancelado'
                  ? 'text-red-400'
                  : 'text-amber-400'
            }`}>
              Situação: {statusLabel(form.status)}
            </p>
          </div>
        </form>
      </ModalComercialPadrao>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle style={{ color: GREEN }}>
            {title} recentes
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
                <th className="p-3">Data</th>
                {!fixedType && <th className="p-3">Classificação</th>}
                <th className="p-3">Descrição</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Situação</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={fixedType ? 7 : 8} className="p-8 text-center">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map(r => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="p-3">
                      {brDate(r.data_lancamento)}
                    </td>

                    {!fixedType && (
                      <td className="p-3 capitalize">
                        {r.tipo === 'investimento' ? 'Investimento' : 'Custo'}
                      </td>
                    )}

                    <td className="p-3">{r.descricao}</td>

                    <td className="p-3">
                      {fornecedorNome(r.fornecedor_id)}
                    </td>

                    <td className="p-3 text-right font-semibold">
                      {money(r.valor)}
                    </td>

                    <td className="p-3">
                      {brDate(r.data_vencimento)}
                    </td>

                    <td className={`p-3 font-semibold ${
                      r.status === 'pago'
                        ? 'text-emerald-400'
                        : r.status === 'cancelado'
                          ? 'text-red-400'
                          : 'text-amber-400'
                    }`}>
                      {statusLabel(r.status)}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editar(r)}
                        disabled={saving || deleting}
                        className="text-emerald-400"
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Editar
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => excluir(r)}
                        disabled={saving || deleting}
                        className="text-red-400"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Excluir
                      </Button>

                      {r.status === 'pendente' && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Marcar como pago"
                            onClick={() => alterarStatus(r, 'pago')}
                            className="text-emerald-400"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Cancelar lançamento"
                            onClick={() => {
                              if (window.confirm('Cancelar este lançamento?')) {
                                alterarStatus(r, 'cancelado');
                              }
                            }}
                            className="text-red-400"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={fixedType ? 7 : 8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Nenhum lançamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
