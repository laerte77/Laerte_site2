import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Lock, CheckCircle2, DollarSign, CalendarClock, Receipt } from 'lucide-react';
import { format, parse, addMonths, setDate, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { getInstallmentValue } from '@/lib/cartaoParcelas';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const formatDate = (d) => { if (!d) return '-'; try { return format(parse(d, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; } };

const MESES = Array.from({ length: 12 }, (_, i) => i);

// Janela do ciclo de fatura: a fatura referente a (mes, ano) vence no dia_vencimento desse mês
// e agrupa compras do dia_fechamento do mês anterior até a véspera do fechamento do mês de referência.
const cicloFatura = (diaFechamento, mes, ano) => {
  const refDate = new Date(ano, mes, 1);
  const inicio = addMonths(setDate(refDate, Math.min(diaFechamento, 28)), -1);
  const fimRaw = setDate(refDate, Math.min(diaFechamento, 28));
  const fim = subDays(fimRaw, 1);
  return { inicio: format(inicio, 'yyyy-MM-dd'), fim: format(fim, 'yyyy-MM-dd') };
};

const STATUS_STYLE = {
  aberta: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  fechada: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  paga: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

const Faturas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [fatura, setFatura] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [selectedCartao, setSelectedCartao] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isPagamentoOpen, setIsPagamentoOpen] = useState(false);
  const [pagForm, setPagForm] = useState({ valor: '', data: format(new Date(), 'yyyy-MM-dd'), forma_pagamento: 'Pix' });

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchCartoes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('pessoal_cartoes').select('*').eq('user_id', user.id).order('nome', { ascending: true });
    if (isMountedRef.current) {
      setCartoes(data || []);
      if (data && data.length && !selectedCartao) setSelectedCartao(data[0].id);
    }
  }, [user, selectedCartao]);

  const cartao = useMemo(() => cartoes.find((c) => c.id === selectedCartao) || null, [cartoes, selectedCartao]);
  const mes = parseInt(selectedMonth, 10);
  const ano = parseInt(selectedYear, 10);
  const ciclo = useMemo(() => cartao ? cicloFatura(cartao.dia_fechamento, mes, ano) : null, [cartao, mes, ano]);

  const fetchDados = useCallback(async () => {
    if (!user || !selectedCartao || !ciclo) return;
    setLoading(true);
    const [lancRes, fatRes] = await Promise.all([
      supabase.from('pessoal_cartao_lancamentos').select('*').eq('user_id', user.id).eq('cartao_id', selectedCartao).gte('data', ciclo.inicio).lte('data', ciclo.fim).order('data', { ascending: false }),
      supabase.from('pessoal_faturas').select('*').eq('user_id', user.id).eq('cartao_id', selectedCartao).eq('mes', mes).eq('ano', ano).maybeSingle(),
    ]);
    if (!isMountedRef.current) return;
    setLancamentos(lancRes.data || []);
    setFatura(fatRes.data || null);
    if (fatRes.data) {
      const { data: pags } = await supabase.from('pessoal_cartao_pagamentos').select('*').eq('fatura_id', fatRes.data.id).order('data', { ascending: false });
      if (isMountedRef.current) setPagamentos(pags || []);
    } else {
      setPagamentos([]);
    }
    setLoading(false);
  }, [user, selectedCartao, ciclo, mes, ano]);

  useEffect(() => { fetchCartoes(); }, [fetchCartoes]);
  useEffect(() => { if (selectedCartao) fetchDados(); }, [selectedCartao, selectedMonth, selectedYear, fetchDados]);

  const totalFatura = lancamentos.reduce((acc, l) => acc + getInstallmentValue(l.valor, l.parcelas, l.parcela_atual), 0);
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
  const saldoRestante = Math.max(0, totalFatura - totalPago);

  const dataVencimento = useMemo(() => {
    if (!cartao) return null;
    try { return format(setDate(new Date(ano, mes, 1), Math.min(cartao.dia_vencimento, 28)), 'yyyy-MM-dd'); } catch { return null; }
  }, [cartao, mes, ano]);

  const handleFecharFatura = async () => {
    if (!cartao || !ciclo) return;
    if (lancamentos.length === 0) {
      toast({ title: 'Aviso', description: 'Não há lançamentos neste ciclo para fechar a fatura.', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: user.id, cartao_id: cartao.id, mes, ano,
      data_fechamento: ciclo.fim, data_vencimento: dataVencimento,
      valor_total: totalFatura, status: 'fechada',
    };
    if (fatura) {
      const { error } = await supabase.from('pessoal_faturas').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', fatura.id);
      if (error) toast({ title: 'Erro', description: 'Não foi possível fechar a fatura.', variant: 'destructive' });
      else toast({ title: 'Sucesso', description: 'Fatura fechada.', className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('pessoal_faturas').insert(payload);
      if (error) toast({ title: 'Erro', description: 'Não foi possível fechar a fatura.', variant: 'destructive' });
      else toast({ title: 'Sucesso', description: 'Fatura fechada.', className: 'bg-green-500 text-white' });
    }
    fetchDados();
  };

  const handleReabrir = async () => {
    if (!fatura) return;
    const { error } = await supabase.from('pessoal_faturas').update({ status: 'aberta', updated_at: new Date().toISOString() }).eq('id', fatura.id);
    if (error) toast({ title: 'Erro', description: 'Não foi possível reabrir a fatura.', variant: 'destructive' });
    else toast({ title: 'Sucesso', description: 'Fatura reaberta.' });
    fetchDados();
  };

  const openPagamento = () => {
    setPagForm({ valor: String(saldoRestante.toFixed(2)), data: format(new Date(), 'yyyy-MM-dd'), forma_pagamento: 'Pix' });
    setIsPagamentoOpen(true);
  };

  const handleSalvarPagamento = async () => {
    if (!fatura) { toast({ title: 'Erro', description: 'Feche a fatura antes de registrar pagamentos.', variant: 'destructive' }); return; }
    const valor = parseFloat(pagForm.valor);
    if (!valor || valor <= 0) { toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' }); return; }
    const { error } = await supabase.from('pessoal_cartao_pagamentos').insert({
      user_id: user.id, fatura_id: fatura.id, valor, data: pagForm.data, forma_pagamento: pagForm.forma_pagamento
    });
    if (error) { toast({ title: 'Erro', description: 'Não foi possível registrar o pagamento.', variant: 'destructive' }); return; }
    const novoTotal = totalPago + valor;
    const novoStatus = novoTotal >= totalFatura ? 'paga' : 'fechada';
    const updatePayload = { status: novoStatus, updated_at: new Date().toISOString() };
    if (novoStatus === 'paga') updatePayload.data_pagamento = pagForm.data;
    await supabase.from('pessoal_faturas').update(updatePayload).eq('id', fatura.id);
    toast({ title: 'Sucesso', description: 'Pagamento registrado.', className: 'bg-green-500 text-white' });
    setIsPagamentoOpen(false);
    fetchDados();
  };

  const handleExcluirPagamento = async (id) => {
    const { error } = await supabase.from('pessoal_cartao_pagamentos').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: 'Falha ao remover pagamento.', variant: 'destructive' });
    else {
      if (fatura) {
        const novoTotal = totalPago - pagamentos.find(p => p.id === id)?.valor;
        await supabase.from('pessoal_faturas').update({ status: novoTotal >= totalFatura ? 'paga' : 'fechada', data_pagamento: null, updated_at: new Date().toISOString() }).eq('id', fatura.id);
      }
      toast({ title: 'Sucesso', description: 'Pagamento removido.' });
      fetchDados();
    }
  };

  const statusAtual = fatura?.status || 'aberta';

  return (
    <div className="dark-pessoal space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-500">Faturas do Cartão</h1>
        <p className="text-muted-foreground">Acompanhe fechamento, vencimento e pagamentos.</p>
      </div>

      {cartoes.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="p-12 text-center text-muted-foreground">
          <Receipt className="mx-auto w-12 h-12 mb-3 opacity-50" />
          <p>Cadastre um cartão para gerenciar faturas.</p>
        </CardContent></Card>
      ) : (
        <>
          <Card className="border-border bg-card"><CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-auto">
              <Label className="text-xs">Cartão</Label>
              <Select value={selectedCartao} onValueChange={setSelectedCartao}><SelectTrigger className="w-full md:w-[200px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="w-full md:w-auto">
              <Label className="text-xs">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-full md:w-[140px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{MESES.map((i) => <SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="w-full md:w-auto">
              <Label className="text-xs">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-full md:w-[100px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select>
            </div>
            <div className="w-full md:ml-auto md:text-right">
              <Label className="text-xs">Status</Label>
              <div className="pt-1"><Badge className={STATUS_STYLE[statusAtual]} variant="outline">{statusAtual.toUpperCase()}</Badge></div>
            </div>
          </CardContent></Card>

          {cartao && ciclo && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Ciclo: {formatDate(ciclo.inicio)} a {formatDate(ciclo.fim)} • Vencimento: {formatDate(dataVencimento)}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 border-blue-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Total da Fatura</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{formatBRL(totalFatura)}</div></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 border-emerald-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Total Pago</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-400">{formatBRL(totalPago)}</div></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-700/10 border-red-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Saldo Restante</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-400">{formatBRL(saldoRestante)}</div></CardContent>
            </Card>
            <Card className="border-border bg-card flex items-center justify-center">
              <CardContent className="p-4 w-full flex flex-col gap-2">
                {statusAtual === 'aberta' && (
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={handleFecharFatura}><Lock className="w-4 h-4 mr-2" /> Fechar Fatura</Button>
                )}
                {statusAtual === 'fechada' && (
                  <>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" onClick={openPagamento}><DollarSign className="w-4 h-4 mr-2" /> Registrar Pagamento</Button>
                    <Button variant="outline" className="w-full" onClick={handleReabrir}>Reabrir Fatura</Button>
                  </>
                )}
                {statusAtual === 'paga' && (
                  <>
                    <Button variant="outline" className="w-full" onClick={openPagamento}><Plus className="w-4 h-4 mr-2" /> Novo Pagamento</Button>
                    <Button variant="outline" className="w-full" onClick={handleReabrir}>Reabrir Fatura</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-lg text-blue-500">Lançamentos do Ciclo</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[360px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Parc.</TableHead><TableHead className="text-right">Valor/Parc.</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow> : lancamentos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum lançamento no ciclo.</TableCell></TableRow> : (
                        lancamentos.map((l) => (
                          <TableRow key={l.id} className="hover:bg-muted/50">
                            <TableCell className="p-4 font-medium text-foreground">{l.descricao}</TableCell>
                            <TableCell className="p-4 text-sm">{formatDate(l.data)}</TableCell>
                            <TableCell className="p-4 text-sm text-muted-foreground">{l.parcela_atual}/{l.parcelas}</TableCell>
                            <TableCell className="p-4 text-right font-semibold text-red-400">{formatBRL(getInstallmentValue(l.valor, l.parcelas, l.parcela_atual))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-lg text-emerald-500">Pagamentos</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[360px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">—</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pagamentos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado.</TableCell></TableRow> : (
                        pagamentos.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/50">
                            <TableCell className="p-4 text-sm">{formatDate(p.data)}</TableCell>
                            <TableCell className="p-4 text-sm text-muted-foreground">{p.forma_pagamento || '—'}</TableCell>
                            <TableCell className="p-4 text-right font-semibold text-emerald-400">{formatBRL(p.valor)}</TableCell>
                            <TableCell className="p-4 text-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleExcluirPagamento(p.id)}>×</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={isPagamentoOpen} onOpenChange={(o) => setIsPagamentoOpen(o)}>
        <DialogContent className="sm:max-w-[420px] border-border bg-card text-foreground">
          <DialogHeader><DialogTitle className="text-emerald-500">Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={pagForm.valor} onChange={(e) => setPagForm(p => ({ ...p, valor: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={pagForm.data} onChange={(e) => setPagForm(p => ({ ...p, data: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-2"><Label>Forma de Pagamento</Label>
              <Select value={pagForm.forma_pagamento} onValueChange={(v) => setPagForm(p => ({ ...p, forma_pagamento: v }))}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Saldo restante: <span className="font-semibold text-red-400">{formatBRL(saldoRestante)}</span></p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsPagamentoOpen(false)}>Cancelar</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSalvarPagamento}>Salvar Pagamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturas;
