
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet, Search, RefreshCw, FileSpreadsheet,
  FileText, Printer, Loader2, TrendingUp, Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const GREEN = 'hsl(var(--neon-comercial))';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const STATUS = {
  pago: { nome: 'Pago', cor: 'text-emerald-400' },
  pendente: { nome: 'Pendente', cor: 'text-amber-400' },
  cancelado: { nome: 'Cancelado', cor: 'text-red-400' }
};

const money = value => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const brDate = value => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
  : '—';

const escapeHtml = value => String(value ?? '').replace(
  /[&<>"']/g,
  char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char])
);

export default function ConsultaCustosComercial() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    mes: '',
    ano: '',
    inicio: '',
    fim: '',
    fornecedor: '',
    status: ''
  });

  const set = (key, value) => {
    setFilters(old => ({ ...old, [key]: value }));
  };

  const consultar = useCallback(async () => {
    if (!user) {
      setRows([]);
      setFornecedores([]);
      setLoading(false);
      return;
    }

    if (filters.inicio && filters.fim && filters.inicio > filters.fim) {
      toast({
        title: 'Período inválido',
        description: 'A data inicial não pode ser posterior à data final.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const [f, resultado] = await Promise.all([
      supabase
        .from('comercial_fornecedores')
        .select('id,nome')
        .eq('user_id', user.id)
        .order('nome'),

      (async () => {
        let query = supabase
          .from('comercial_outros_lancamentos')
          .select(`
            id,
            fornecedor_id,
            tipo,
            descricao,
            valor,
            data_lancamento,
            data_vencimento,
            data_pagamento,
            forma_pagamento,
            status,
            observacoes
          `)
          .eq('user_id', user.id)
          .eq('tipo', 'custo')
          .order('data_lancamento', { ascending: false })
          .limit(3000);

        if (filters.fornecedor) {
          query = query.eq('fornecedor_id', filters.fornecedor);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.inicio) {
          query = query.gte('data_lancamento', filters.inicio);
        }

        if (filters.fim) {
          query = query.lte('data_lancamento', filters.fim);
        }

        if (!filters.inicio && !filters.fim && filters.mes && filters.ano) {
          const ultimoDia = new Date(
            Number(filters.ano),
            Number(filters.mes),
            0
          ).getDate();

          const mes = filters.mes.padStart(2, '0');

          query = query
            .gte('data_lancamento', `${filters.ano}-${mes}-01`)
            .lte(
              'data_lancamento',
              `${filters.ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
            );
        } else if (!filters.inicio && !filters.fim && filters.ano) {
          query = query
            .gte('data_lancamento', `${filters.ano}-01-01`)
            .lte('data_lancamento', `${filters.ano}-12-31`);
        }

        return query;
      })()
    ]);

    const error = f.error || resultado.error;

    if (error) {
      toast({
        title: 'Erro na consulta',
        description: error.message,
        variant: 'destructive'
      });

      setLoading(false);
      return;
    }

    setFornecedores(f.data || []);
    setRows(resultado.data || []);
    setLoading(false);
  }, [user, filters, toast]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  const fornecedorNome = id =>
    fornecedores.find(f => f.id === id)?.nome || '—';

  const statusInfo = value =>
    STATUS[value] || { nome: value || '—', cor: 'text-gray-400' };

  const totalRegistrado = useMemo(
    () => rows
      .filter(r => r.status !== 'cancelado')
      .reduce((sum, r) => sum + Number(r.valor || 0), 0),
    [rows]
  );

  const totalPago = useMemo(
    () => rows
      .filter(r => r.status === 'pago')
      .reduce((sum, r) => sum + Number(r.valor || 0), 0),
    [rows]
  );

  const totalPendente = useMemo(
    () => rows
      .filter(r => r.status === 'pendente')
      .reduce((sum, r) => sum + Number(r.valor || 0), 0),
    [rows]
  );

  const quantidadePaga = rows.filter(r => r.status === 'pago').length;
  const quantidadePendente = rows.filter(r => r.status === 'pendente').length;
  const quantidadeCancelada = rows.filter(r => r.status === 'cancelado').length;

  const exportData = rows.map(r => ({
    Data: brDate(r.data_lancamento),
    Descrição: r.descricao || '',
    Fornecedor: fornecedorNome(r.fornecedor_id),
    Valor: Number(r.valor || 0),
    Vencimento: brDate(r.data_vencimento),
    'Data de pagamento': brDate(r.data_pagamento),
    'Forma de pagamento': r.forma_pagamento || '',
    Situação: statusInfo(r.status).nome,
    Observações: r.observacoes || ''
  }));

  const exportExcel = () => {
    if (!rows.length) {
      toast({
        title: 'Sem dados para exportar',
        variant: 'destructive'
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 35 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Custos');

    XLSX.writeFile(workbook, 'consulta_de_custos.xlsx');
  };

  const exportPDF = () => {
    if (!rows.length) {
      toast({
        title: 'Sem dados para exportar',
        variant: 'destructive'
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(17);
    doc.text('CONSULTA DE CUSTOS', 14, 17);

    doc.setFontSize(9);
    doc.text(
      `Registros: ${rows.length} | Total registrado: ${money(totalRegistrado)} | Pago: ${money(totalPago)} | Pendente: ${money(totalPendente)}`,
      14,
      24
    );

    autoTable(doc, {
      startY: 30,
      head: [[
        'Data',
        'Descrição',
        'Fornecedor',
        'Valor',
        'Vencimento',
        'Pagamento',
        'Forma',
        'Situação'
      ]],
      body: exportData.map(r => [
        r.Data,
        r.Descrição,
        r.Fornecedor,
        money(r.Valor),
        r.Vencimento,
        r['Data de pagamento'],
        r['Forma de pagamento'],
        r.Situação
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 45, 32],
        textColor: [255, 255, 255]
      }
    });

    doc.save('consulta_de_custos.pdf');
  };

  const imprimir = () => {
    if (!rows.length) {
      toast({
        title: 'Sem dados para imprimir',
        variant: 'destructive'
      });
      return;
    }

    const htmlRows = exportData.map(r => `
      <tr>
        <td>${escapeHtml(r.Data)}</td>
        <td>${escapeHtml(r.Descrição)}</td>
        <td>${escapeHtml(r.Fornecedor)}</td>
        <td>${escapeHtml(money(r.Valor))}</td>
        <td>${escapeHtml(r.Vencimento)}</td>
        <td>${escapeHtml(r['Data de pagamento'])}</td>
        <td>${escapeHtml(r['Forma de pagamento'])}</td>
        <td>${escapeHtml(r.Situação)}</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');

    if (!win) {
      toast({
        title: 'Impressão bloqueada',
        description: 'Permita a abertura de janelas para imprimir.',
        variant: 'destructive'
      });
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Consulta de Custos</title>
          <style>
            body { font-family: Arial; padding: 20px; color: #222; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ccc; padding: 7px; text-align: left; }
            th { background: #eee; }
            h1 { font-size: 20px; }
          </style>
        </head>
        <body>
          <h1>Consulta de Custos</h1>
          <p>
            Registros: ${rows.length} |
            Total registrado: ${escapeHtml(money(totalRegistrado))} |
            Pago: ${escapeHtml(money(totalPago))} |
            Pendente: ${escapeHtml(money(totalPendente))}
          </p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Pagamento</th>
                <th>Forma</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
          <script>window.onload=function(){window.print()}</script>
        </body>
      </html>
    `);

    win.document.close();
  };

  const limpar = () => {
    setFilters({
      mes: '',
      ano: '',
      inicio: '',
      fim: '',
      fornecedor: '',
      status: ''
    });
  };

  const anos = Array.from(
    { length: 8 },
    (_, i) => String(new Date().getFullYear() - 5 + i)
  );

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
            <Wallet />
          </div>

          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: GREEN }}
            >
              Consultas
            </p>

            <h1 className="text-2xl font-bold text-white">
              Custos
            </h1>

            <p className="text-sm text-muted-foreground">
              Consulte, filtre e acompanhe os custos do negócio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={consultar} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>

          <Button variant="outline" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>

          <Button variant="outline" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle style={{ color: GREEN }}>
            Filtros da consulta
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Mês</Label>

            <select
              value={filters.mes}
              onChange={e => set('mes', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {MESES.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Ano</Label>

            <select
              value={filters.ano}
              onChange={e => set('ano', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Fornecedor</Label>

            <select
              value={filters.fornecedor}
              onChange={e => set('fornecedor', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Situação</Label>

            <select
              value={filters.status}
              onChange={e => set('status', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={filters.inicio}
              onChange={e => set('inicio', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Período final</Label>
            <Input
              type="date"
              value={filters.fim}
              onChange={e => set('fim', e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <Button
              onClick={consultar}
              disabled={loading}
              className="font-bold text-black"
              style={{ background: GREEN }}
            >
              <Search className="mr-2 h-4 w-4" />
              Consultar
            </Button>

            <Button variant="outline" onClick={limpar}>
              Limpar filtros
            </Button>
          </div>

          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
            O período informado tem prioridade sobre mês e ano. Para filtrar por mês, selecione também o ano. A consulta considera a data do lançamento.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total registrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: GREEN }}>
              {money(totalRegistrado)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">
              {money(totalPago)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Total pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">
              {money(totalPendente)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registros encontrados</p>
            <p className="mt-1 text-xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pagos</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              {quantidadePaga}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-xl font-bold text-amber-400">
              {quantidadePendente}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cancelados</p>
            <p className="mt-1 text-xl font-bold text-red-400">
              {quantidadeCancelada}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle style={{ color: GREEN }}>
            Resultado da consulta
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
                <th className="p-3">Data</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Forma</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map(r => {
                  const status = statusInfo(r.status);

                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-border ${
                        r.status === 'cancelado' ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3">
                        {brDate(r.data_lancamento)}
                      </td>

                      <td className="p-3">{r.descricao || '—'}</td>

                      <td className="p-3">
                        {fornecedorNome(r.fornecedor_id)}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {money(r.valor)}
                      </td>

                      <td className="p-3">
                        {brDate(r.data_vencimento)}
                      </td>

                      <td className="p-3">
                        {brDate(r.data_pagamento)}
                      </td>

                      <td className="p-3">
                        {r.forma_pagamento || '—'}
                      </td>

                      <td className={`p-3 font-semibold ${status.cor}`}>
                        {status.nome}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Nenhum custo encontrado.
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
