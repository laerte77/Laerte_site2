import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Search, RefreshCw, Boxes, ArrowDownToLine,
  ArrowUpFromLine, AlertTriangle, Loader2, Calendar, Clock
} from 'lucide-react';
import { useEstoqueCalculation } from '@/hooks/useEstoqueCalculation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const qty = v => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const dateBR = v => v
  ? new Date(`${String(v).slice(0, 10)}T12:00:00-03:00`)
      .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  : 'Nenhuma movimentação';

export default function Estoques() {
  const { stockData, loading, error, refresh, lastUpdate, lastMovement } =
    useEstoqueCalculation();
  const [search, setSearch] = useState('');

  const items = useMemo(
    () => Object.values(stockData).sort((a, b) =>
      collator.compare(a.nomeInsumo || a.tipo_folha || '', b.nomeInsumo || b.tipo_folha || '')
    ),
    [stockData]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(x =>
      `${x.nomeInsumo || ''} ${x.tipo_folha || ''} ${x.unidade || ''}`
        .toLowerCase().includes(term)
    );
  }, [items, search]);

  const totals = useMemo(() => filtered.reduce((a, x) => ({
    itens: a.itens + 1,
    reposicoes: a.reposicoes + x.reposicoes,
    servicos: a.servicos + x.folhasGastas,
    usos: a.usos + x.consumoCustos,
    perdas: a.perdas + x.perdas,
    saldo: a.saldo + x.estoqueAtual,
    negativos: a.negativos + (x.estoqueAtual < 0 ? 1 : 0)
  }), {
    itens: 0, reposicoes: 0, servicos: 0, usos: 0,
    perdas: 0, saldo: 0, negativos: 0
  }), [filtered]);

  const status = x => x.estoqueAtual < 0
    ? { label: 'Auditar saldo', cls: 'border-red-500/30 bg-red-500/10 text-red-400' }
    : x.estoqueAtual === 0
      ? { label: 'Zerado', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' }
      : x.estoque_minimo != null && x.estoqueAtual <= Number(x.estoque_minimo)
        ? { label: 'Estoque baixo', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' }
        : { label: 'Disponível', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' };

  const Stat = ({ title, value, Icon, color = 'text-cyan-400' }) => (
    <Card className="border-border bg-card/80">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{qty(value)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  const empty = n => (
    <TableRow>
      <TableCell colSpan={n} className="py-12 text-center text-muted-foreground">
        <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
        {search ? 'Nenhum material corresponde à pesquisa.' : 'Nenhum insumo cadastrado.'}
      </TableCell>
    </TableRow>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="dark-lm-impressoes space-y-5 py-5">

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
            <Package className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-cyan-400">Estoque</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Estoque Consolidado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Saldo calculado a partir das reposições, serviços, usos e perdas.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Alert className="border-cyan-500/25 bg-cyan-500/5">
        <Calendar className="h-4 w-4 text-cyan-400" />
        <AlertDescription>
          O estoque começa em zero e considera o histórico disponível das fontes definidas.
          <span className="flex items-center gap-2 pt-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lastMovement
              ? `Última movimentação: ${dateBR(lastMovement)}`
              : 'Nenhuma movimentação registrada'}
            {lastUpdate && ` · Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR')}`}
          </span>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription>Não foi possível calcular o estoque: {error}</AlertDescription>
        </Alert>
      )}

      {totals.negativos > 0 && (
        <Alert className="border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription>
            {totals.negativos} material(is) com saldo negativo. Confira as reposições e os consumos registrados.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Materiais" value={totals.itens} Icon={Boxes} />
        <Stat title="Reposições (folhas)" value={totals.reposicoes} Icon={ArrowDownToLine} color="text-emerald-400" />
        <Stat title="Consumo em serviços" value={totals.servicos} Icon={ArrowUpFromLine} color="text-red-400" />
        <Stat title="Uso fora de serviço" value={totals.usos} Icon={ArrowUpFromLine} color="text-amber-400" />
        <Stat title="Perdas (folhas)" value={totals.perdas} Icon={AlertTriangle} color="text-red-400" />
        <Stat title="Saldo somado" value={totals.saldo} Icon={Package} color={totals.negativos ? 'text-red-400' : 'text-cyan-400'} />
      </div>

      <Card className="border-border bg-card/80">
        <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por insumo, folha ou unidade..."
              className="h-11 rounded-xl pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} material(is)</span>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-card">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-xl text-cyan-400">Estoque por material</CardTitle>
          <CardDescription>
            O saldo considera somente as três fontes definidas. Registros antigos de lm_folhas são preservados e ignorados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <TableRow>
                    <TableHead className="min-w-[210px]">Material</TableHead>
                    <TableHead className="text-center">Reposições</TableHead>
                    <TableHead className="text-center">Consumo em serviços</TableHead>
                    <TableHead className="text-center">Uso fora de serviço</TableHead>
                    <TableHead className="text-center">Perdas</TableHead>
                    <TableHead className="text-center">Estoque atual</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                        Calculando estoque...
                      </TableCell>
                    </TableRow>
                  ) : !filtered.length ? empty(7) : filtered.map(x => (
                    <TableRow key={x.insumo_id || x.nomeInsumo} className="hover:bg-cyan-500/5">
                      <TableCell>
                        <div className="font-semibold">{x.nomeInsumo || x.tipo_folha}</div>
                        <div className="text-xs text-muted-foreground">{x.unidade || 'unidade'}</div>
                      </TableCell>
                      <TableCell className="text-center text-emerald-400">+{qty(x.reposicoes)}</TableCell>
                      <TableCell className="text-center text-red-400">-{qty(x.folhasGastas)}</TableCell>
                      <TableCell className="text-center text-amber-400">-{qty(x.consumoCustos)}</TableCell>
                      <TableCell className="text-center text-red-400">-{qty(x.perdas)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={
                          x.estoqueAtual < 0
                            ? 'border-red-500/30 bg-red-500/10 text-red-400'
                            : x.estoqueAtual === 0
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                        }>
                          {qty(x.estoqueAtual)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={status(x).cls}>{status(x).label}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
