import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, CreditCard, Receipt, User } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
const formatDate = (d) => { if (!d) return '-'; try { return format(parse(d, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; } };

const RelatorioCartaoPessoas = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [lancCartao, setLancCartao] = useState([]);
  const [despesasCredito, setDespesasCredito] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [selectedCartao, setSelectedCartao] = useState('todos');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const ano = parseInt(selectedYear, 10);
    // Inclui dezembro do ano anterior para abranger compras de final de dezembro
    // cuja competência cai em janeiro do ano selecionado.
    const startDate = `${ano - 1}-12-01`;
    const endDate = `${ano}-12-31`;

    const [u, c, l, d, f] = await Promise.all([
      supabase.from('pessoal_cartao_usuarios').select('id, nome, parentesco').eq('user_id', user.id).order('nome', { ascending: true }),
      supabase.from('pessoal_cartoes').select('id, nome, dia_fechamento').eq('user_id', user.id).order('nome', { ascending: true }),
      supabase.from('pessoal_cartao_lancamentos').select('id, cartao_id, responsavel_id, data, descricao, valor, parcelas, parcela_atual, categoria, compra_id').eq('user_id', user.id).gte('data', startDate).lte('data', endDate),
      supabase.from('despesas').select('id, cartao_id, responsavel_id, data, despesa, valor, forma_pagamento, parcelas, categoria').eq('user_id', user.id).eq('forma_pagamento', 'Crédito').gte('data', startDate).lte('data', endDate),
      supabase.from('pessoal_faturas').select('id, cartao_id, mes, ano, valor_total, status, data_vencimento').eq('user_id', user.id).eq('ano', ano),
    ]);

    setUsuarios(u.data || []);
    setCartoes(c.data || []);
    setLancCartao(l.data || []);
    setDespesasCredito(d.data || []);
    setFaturas(f.data || []);

    if (f.data && f.data.length) {
      const { data: pags } = await supabase.from('pessoal_cartao_pagamentos').select('fatura_id, valor').in('fatura_id', f.data.map((x) => x.id));
      setPagamentos(pags || []);
    } else {
      setPagamentos([]);
    }
    setLoading(false);
  }, [user, selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Aplicar filtros de mês e cartão
  const lancFiltrados = useMemo(() => {
    return lancCartao.filter((l) => {
      if (selectedCartao !== 'todos' && l.cartao_id !== selectedCartao) return false;
      const cartao = cartoes.find((c) => c.id === l.cartao_id);
      const diaFech = cartao?.dia_fechamento || 1;
      const comp = competenciaFatura(l.data, diaFech);
      if (!comp || comp.ano !== parseInt(selectedYear, 10)) return false;
      if (selectedMonth !== 'todos' && comp.mes.toString() !== selectedMonth) return false;
      return true;
    });
  }, [lancCartao, cartoes, selectedCartao, selectedMonth, selectedYear]);

  const despesasFiltradas = useMemo(() => {
    return despesasCredito.filter((d) => {
      if (selectedCartao !== 'todos' && d.cartao_id !== selectedCartao) return false;
      const cartao = cartoes.find((c) => c.id === d.cartao_id);
      const diaFech = cartao?.dia_fechamento || 1;
      const comp = competenciaFatura(d.data, diaFech);
      if (!comp || comp.ano !== parseInt(selectedYear, 10)) return false;
      if (selectedMonth !== 'todos' && comp.mes.toString() !== selectedMonth) return false;
      return true;
    });
  }, [despesasCredito, cartoes, selectedCartao, selectedMonth, selectedYear]);

  const cartaoNome = (id) => cartoes.find((c) => c.id === id)?.nome || '—';

  // Consolidar todas as compras por responsável
  const todasCompras = useMemo(() => {
    const lista = [];
    lancFiltrados.forEach((l) => lista.push({
      id: l.id, tipo: 'cartao', cartao_id: l.cartao_id, responsavel_id: l.responsavel_id,
      data: l.data, descricao: l.descricao, valor: Number(l.valor), parcelas: l.parcelas, parcela_atual: l.parcela_atual, categoria: l.categoria,
      compra_id: l.compra_id || l.id
    }));
    despesasFiltradas.forEach((d) => lista.push({
      id: `d-${d.id}`, tipo: 'despesa', cartao_id: d.cartao_id, responsavel_id: d.responsavel_id,
      data: d.data, descricao: d.despesa, valor: Number(d.valor), parcelas: d.parcelas || 1, parcela_atual: 1, categoria: d.categoria,
      compra_id: `d-${d.id}`
    }));
    return lista;
  }, [lancFiltrados, despesasFiltradas]);

  // Resumo por pessoa
  const resumoPorPessoa = useMemo(() => {
    const map = new Map();
    // Inicializa todas as pessoas cadastradas (mesmo sem compras)
    usuarios.forEach((u) => map.set(u.id, { ...u, compras: 0, valorParcelas: 0, valorTotal: 0 }));
    // Grupo "sem responsável"
    map.set('sem', { id: 'sem', nome: 'Sem responsável', parentesco: '', compras: 0, valorParcelas: 0, valorTotal: 0 });

    // Cada compra (agrupada por compra_id) conta uma vez; parcelas somam pelo período.
    const vistos = new Map(); // key(responsavel) -> Set(compra_id)
    todasCompras.forEach((c) => {
      const key = c.responsavel_id || 'sem';
      if (!map.has(key)) {
        map.set(key, { id: key, nome: 'Pessoa removida', parentesco: '', compras: 0, valorParcelas: 0, valorTotal: 0 });
      }
      const entry = map.get(key);
      // Soma o valor da parcela visível no período filtrado
      entry.valorParcelas += getInstallmentValue(c.valor, c.parcelas, c.parcela_atual);
      // Conta a compra e soma o valor total uma única vez (por compra_id)
      if (!vistos.has(key)) vistos.set(key, new Set());
      const set = vistos.get(key);
      if (!set.has(c.compra_id)) {
        set.add(c.compra_id);
        entry.compras += 1;
        entry.valorTotal += Number(c.valor);
      }
    });

    return Array.from(map.values())
      .filter((p) => p.id !== 'sem' || p.compras > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [todasCompras, usuarios]);

  const totalGeralParcelas = resumoPorPessoa.reduce((acc, p) => acc + p.valorParcelas, 0);
  const totalGeralCompras = resumoPorPessoa.reduce((acc, p) => acc + p.compras, 0);

  // Compras por pessoa selecionada para detalhamento
  const [selectedPessoa, setSelectedPessoa] = useState('todas');
  const comprasDetalhe = useMemo(() => {
    if (selectedPessoa === 'todas') return todasCompras;
    if (selectedPessoa === 'sem') return todasCompras.filter((c) => !c.responsavel_id);
    return todasCompras.filter((c) => c.responsavel_id === selectedPessoa);
  }, [todasCompras, selectedPessoa]);

  const responsavelNome = (id) => usuarios.find((u) => u.id === id)?.nome || (id ? 'Pessoa removida' : 'Sem responsável');

  // Valor de faturas por cartão (para contexto)
  const faturasResumo = useMemo(() => {
    return faturas
      .filter((f) => selectedCartao === 'todos' || f.cartao_id === selectedCartao)
      .filter((f) => selectedMonth === 'todos' || String(f.mes) === selectedMonth)
      .map((f) => {
        const pago = pagamentos.filter((p) => p.fatura_id === f.id).reduce((s, p) => s + Number(p.valor), 0);
        return { ...f, nomeCartao: cartaoNome(f.cartao_id), pago, saldo: Math.max(0, Number(f.valor_total) - pago) };
      })
      .sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes));
  }, [faturas, pagamentos, selectedCartao, selectedMonth, cartoes]);

  return (
    <div className="dark-pessoal space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-blue-500">Cartões por Pessoa</h1>
        <p className="text-muted-foreground">Totais e compras separados por responsável. O caixa só baixa quando a fatura é paga.</p>
      </motion.div>

      <Card className="border-border bg-card"><CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="w-full md:w-auto">
          <Label className="text-xs">Ano</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full md:w-[110px] bg-input"><SelectValue /></SelectTrigger>
            <SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-auto">
          <Label className="text-xs">Mês</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full md:w-[140px] bg-input"><SelectValue /></SelectTrigger>
            <SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="todos">Todos os meses</SelectItem>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-auto">
          <Label className="text-xs">Cartão</Label>
          <Select value={selectedCartao} onValueChange={setSelectedCartao}>
            <SelectTrigger className="w-full md:w-[180px] bg-input"><SelectValue /></SelectTrigger>
            <SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="todos">Todos os cartões</SelectItem>{cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-700/10 border-indigo-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-indigo-400 flex items-center gap-2"><Users className="w-4 h-4" /> Pessoas com Compras</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{resumoPorPessoa.filter((p) => p.compras > 0 && p.id !== 'sem').length}</div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 border-blue-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Total de Compras</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{totalGeralCompras}</div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-700/10 border-red-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Total em Parcelas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{formatBRL(totalGeralParcelas)}</div></CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-lg text-blue-500">Resumo por Responsável</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader><TableRow><TableHead>Pessoa</TableHead><TableHead>Parentesco</TableHead><TableHead className="text-center">Compras</TableHead><TableHead className="text-right">Total Parcelas</TableHead><TableHead className="text-right">Valor Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow> : resumoPorPessoa.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma pessoa ou compra encontrada.</TableCell></TableRow> : (
                  resumoPorPessoa.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedPessoa(selectedPessoa === p.id ? 'todas' : p.id)}>
                      <TableCell className="p-4 font-medium text-foreground flex items-center gap-2"><User className="w-4 h-4 text-indigo-400" /> {p.nome}{selectedPessoa === p.id && <Badge variant="outline" className="ml-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">filtrado</Badge>}</TableCell>
                      <TableCell className="p-4 text-sm text-muted-foreground">{p.parentesco || '—'}</TableCell>
                      <TableCell className="p-4 text-center text-sm">{p.compras}</TableCell>
                      <TableCell className="p-4 text-right font-semibold text-red-400">{formatBRL(p.valorParcelas)}</TableCell>
                      <TableCell className="p-4 text-right text-sm text-muted-foreground">{formatBRL(p.valorTotal)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle className="text-lg text-blue-500">Compras Detalhadas {selectedPessoa !== 'todas' && <span className="text-sm font-normal text-muted-foreground">— {responsavelNome(selectedPessoa === 'sem' ? null : selectedPessoa)}</span>}</CardTitle>
          {selectedPessoa !== 'todas' && <button className="text-sm text-blue-400 hover:underline" onClick={() => setSelectedPessoa('todas')}>Limpar filtro de pessoa</button>}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead>Cartão</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Parc.</TableHead><TableHead className="text-right">Valor/Parc.</TableHead></TableRow></TableHeader>
              <TableBody>
                {comprasDetalhe.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada.</TableCell></TableRow> : (
                  comprasDetalhe
                    .slice()
                    .sort((a, b) => (a.data < b.data ? 1 : -1))
                    .map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/50">
                        <TableCell className="p-4 text-sm">{c.responsavel_id ? <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{responsavelNome(c.responsavel_id)}</Badge> : <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                        <TableCell className="p-4 text-sm text-muted-foreground">{cartaoNome(c.cartao_id)}</TableCell>
                        <TableCell className="p-4 font-medium text-foreground">{c.descricao}</TableCell>
                        <TableCell className="p-4 text-sm">{formatDate(c.data)}</TableCell>
                        <TableCell className="p-4 text-sm text-muted-foreground">{c.parcela_atual}/{c.parcelas}</TableCell>
                        <TableCell className="p-4 text-right font-semibold text-red-400">{formatBRL(getInstallmentValue(c.valor, c.parcelas, c.parcela_atual))}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-lg text-emerald-500 flex items-center gap-2"><Receipt className="w-5 h-5" /> Faturas do Período</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader><TableRow><TableHead>Cartão</TableHead><TableHead>Referência</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Pago</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {faturasResumo.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma fatura no período.</TableCell></TableRow> : (
                  faturasResumo.map((f) => (
                    <TableRow key={f.id} className="hover:bg-muted/50">
                      <TableCell className="p-4 font-medium text-foreground">{f.nomeCartao}</TableCell>
                      <TableCell className="p-4 text-sm">{String(f.mes + 1).padStart(2, '0')}/{f.ano}</TableCell>
                      <TableCell className="p-4 text-sm">{f.data_vencimento ? formatDate(f.data_vencimento) : '—'}</TableCell>
                      <TableCell className="p-4 text-right font-semibold">{formatBRL(f.valor_total)}</TableCell>
                      <TableCell className="p-4 text-right text-emerald-400">{formatBRL(f.pago)}</TableCell>
                      <TableCell className="p-4"><Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{(f.status || 'aberta').toUpperCase()}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioCartaoPessoas;
