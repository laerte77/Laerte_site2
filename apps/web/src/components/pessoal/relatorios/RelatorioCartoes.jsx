import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { competenciaFatura } from '@/lib/cartaoCompetencia';
import { getInstallmentValue } from '@/lib/cartaoParcelas';

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const STATUS_STYLE = {
  aberta: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  fechada: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  paga: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

const RelatorioCartoes = () => {
  const { user } = useAuth();
  const [cartoes, setCartoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const ano = parseInt(selectedYear, 10);
    // Inclui dezembro do ano anterior para abranger compras de final de dezembro
    // cuja competência cai em janeiro do ano selecionado.
    const startDate = `${ano - 1}-12-01`;
    const endDate = `${ano}-12-31`;
    const [c, l, f, p] = await Promise.all([
      supabase.from('pessoal_cartoes').select('*').eq('user_id', user.id).order('nome', { ascending: true }),
      supabase.from('pessoal_cartao_lancamentos').select('cartao_id, valor, parcelas, data').eq('user_id', user.id).gte('data', startDate).lte('data', endDate),
      supabase.from('pessoal_faturas').select('*').eq('user_id', user.id).eq('ano', ano),
      supabase.from('pessoal_cartao_pagamentos').select('fatura_id, valor').in('fatura_id', (await supabase.from('pessoal_faturas').select('id').eq('user_id', user.id).eq('ano', ano)).data?.map(x => x.id) || []),
    ]);
    setCartoes(c.data || []);
    setLancamentos(l.data || []);
    setFaturas(f.data || []);
    setPagamentos(p.data || []);
    setLoading(false);
  }, [user, selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Pagamentos por fatura e por cartão (apenas faturas do ano selecionado).
  const pagamentosPorFatura = {};
  pagamentos.forEach((p) => {
    pagamentosPorFatura[p.fatura_id] = (pagamentosPorFatura[p.fatura_id] || 0) + Number(p.valor || 0);
  });
  const pagamentosPorCartao = {};
  faturas.forEach((f) => {
    const pago = pagamentosPorFatura[f.id] || 0;
    pagamentosPorCartao[f.cartao_id] = (pagamentosPorCartao[f.cartao_id] || 0) + pago;
  });

  // Total de compras do ano (valor bruto das parcelas cuja competência cai no ano).
  const comprasPorCartao = (cartaoId) =>
    lancamentos
      .filter((l) => l.cartao_id === cartaoId)
      .filter((l) => {
        const cartao = cartoes.find((c) => c.id === cartaoId);
        const comp = competenciaFatura(l.data, cartao?.dia_fechamento || 1);
        return comp && comp.ano === parseInt(selectedYear, 10);
      })
      .reduce((acc, l) => acc + getInstallmentValue(l.valor, l.parcelas, l.parcela_atual), 0);

  // Limite utilizado = compras do ano menos os pagamentos computados nas faturas
  // do ano. Quando uma fatura é paga (total ou parcialmente), o valor pago libera
  // o limite correspondente, retornando ao limite disponível do cartão.
  const utilizadoPorCartao = (cartaoId) =>
    Math.max(0, comprasPorCartao(cartaoId) - (pagamentosPorCartao[cartaoId] || 0));

  const totalGastoAno = cartoes.reduce((acc, c) => acc + comprasPorCartao(c.id), 0);
  const totalPagoAno = cartoes.reduce((acc, c) => acc + (pagamentosPorCartao[c.id] || 0), 0);
  const totalLimite = cartoes.reduce((acc, c) => acc + Number(c.limite || 0), 0);
  const totalUtilizado = cartoes.reduce((acc, c) => acc + utilizadoPorCartao(c.id), 0);
  const faturasAbertas = faturas.filter((f) => f.status === 'aberta' || f.status === 'fechada');
  const totalFaturasEmAberto = faturasAbertas.reduce((acc, f) => {
    const pago = pagamentosPorFatura[f.id] || 0;
    return acc + Math.max(0, Number(f.valor_total) - pago);
  }, 0);

  const resumoCartoes = cartoes.map((c) => {
    const utilizado = utilizadoPorCartao(c.id);
    const limite = Number(c.limite || 0);
    const pct = limite > 0 ? (utilizado / limite) * 100 : 0;
    const fatCartao = faturas.filter((f) => f.cartao_id === c.id);
    const totalFat = fatCartao.reduce((s, f) => s + Number(f.valor_total), 0);
    const totalPagoFat = fatCartao.reduce((s, f) => s + (pagamentosPorFatura[f.id] || 0), 0);
    return { ...c, utilizado, limite, pct, totalFat, totalPagoFat };
  });

  return (
    <div className="dark-pessoal space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-blue-500">Relatório de Cartões</h1>
        <p className="text-muted-foreground">Visão geral de limite, faturas e pagamentos.</p>
      </motion.div>

      <div className="w-full md:w-[140px]">
        <Label className="text-xs">Ano</Label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
          <SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 border-blue-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Limite Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{formatBRL(totalLimite)}</div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-700/10 border-red-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Limite Utilizado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{formatBRL(totalUtilizado)}</div><p className="text-xs text-muted-foreground mt-1">Compras - pagamentos</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 border-emerald-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Pago no Ano</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-400">{formatBRL(totalPagoAno)}</div><p className="text-xs text-muted-foreground mt-1">Limite liberado</p></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 border-blue-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Gasto no Ano</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{formatBRL(totalGastoAno)}</div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-700/10 border-amber-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Faturas em Aberto</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{formatBRL(totalFaturasEmAberto)}</div></CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-lg text-blue-500">Limite por Cartão</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader><TableRow><TableHead>Cartão</TableHead><TableHead>Bandeira</TableHead><TableHead>Limite</TableHead><TableHead>Utilizado</TableHead><TableHead>Disponível</TableHead><TableHead>Uso</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow> : resumoCartoes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cartão cadastrado.</TableCell></TableRow> : (
                  resumoCartoes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/50">
                      <TableCell className="p-4 font-medium text-foreground">{c.nome}</TableCell>
                      <TableCell className="p-4 text-sm text-muted-foreground">{c.bandeira || '—'}</TableCell>
                      <TableCell className="p-4 text-sm">{formatBRL(c.limite)}</TableCell>
                      <TableCell className="p-4 text-sm text-red-400">{formatBRL(c.utilizado)}</TableCell>
                      <TableCell className="p-4 text-sm text-emerald-400">{formatBRL(Math.max(0, c.limite - c.utilizado))}</TableCell>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${c.pct > 80 ? 'bg-red-500' : c.pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, c.pct)}%` }} /></div>
                          <span className="text-xs text-muted-foreground">{c.pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-lg text-blue-500">Faturas do Ano</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader><TableRow><TableHead>Cartão</TableHead><TableHead>Referência</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Pago</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {faturas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma fatura fechada neste ano.</TableCell></TableRow> : (
                  faturas
                    .slice()
                    .sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes))
                    .map((f) => {
                      const nomeCartao = cartoes.find((c) => c.id === f.cartao_id)?.nome || '—';
                      const pago = pagamentosPorFatura[f.id] || 0;
                      return (
                        <TableRow key={f.id} className="hover:bg-muted/50">
                          <TableCell className="p-4 font-medium text-foreground">{nomeCartao}</TableCell>
                          <TableCell className="p-4 text-sm">{String(f.mes + 1).padStart(2, '0')}/{f.ano}</TableCell>
                          <TableCell className="p-4 text-sm">{f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                          <TableCell className="p-4 text-sm font-semibold">{formatBRL(f.valor_total)}</TableCell>
                          <TableCell className="p-4 text-sm text-emerald-400">{formatBRL(pago)}</TableCell>
                          <TableCell className="p-4"><Badge className={STATUS_STYLE[f.status] || STATUS_STYLE.aberta} variant="outline">{(f.status || 'aberta').toUpperCase()}</Badge></TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioCartoes;
