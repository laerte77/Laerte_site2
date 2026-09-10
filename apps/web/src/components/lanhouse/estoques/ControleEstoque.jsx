import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Search, RefreshCw, Loader2, PackageSearch } from 'lucide-react';
import { useEstoqueCalculation } from '@/hooks/useEstoqueCalculation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import EstoqueAtualCard from './EstoqueAtualCard';
import { cn } from '@/lib/utils';

const ControleEstoque = () => {
    const { stockData, loading, refresh, lastUpdate } = useEstoqueCalculation();
    const [searchTerm, setSearchTerm] = useState('');

    const stockItems = useMemo(() => {
        return Object.values(stockData).sort((a, b) => a.tipo_folha.localeCompare(b.tipo_folha));
    }, [stockData]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return stockItems;
        return stockItems.filter(item => item.tipo_folha.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [stockItems, searchTerm]);

    const handleExport = () => {
        if (filteredItems.length === 0) return;
        const exportData = filteredItems.map(item => ({
            'TIPO DE FOLHA': item.tipo_folha,
            'ESTOQUE INICIAL (BASE)': item.baseline,
            'REPOSIÇÕES (+)': item.reposicoes,
            'FOLHAS GASTAS (-)': item.folhasGastas,
            'ESTOQUE ATUAL (=)': item.estoqueAtual
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Controle de Estoque");
        XLSX.writeFile(wb, `Controle_Estoque_LM_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-primary flex items-center gap-3">
                        <PackageSearch className="w-8 h-8" />
                        Controle de Estoque Real-time
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        Acompanhe entradas e saídas de folhas em tempo real.
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            Última atulização: {format(lastUpdate, 'HH:mm:ss')}
                        </span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={refresh} disabled={loading} className="border-primary/50 text-primary">
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button onClick={handleExport} className="bg-primary text-primary-foreground">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Relatório
                    </Button>
                </div>
            </div>

            <Card className="border-border/50 shadow-sm rounded-xl">
                <CardContent className="p-4 flex items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar tipo de folha..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background/50"
                        />
                    </div>
                </CardContent>
            </Card>

            {loading && stockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Calculando estoque em tempo real...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredItems.map(item => (
                            <EstoqueAtualCard key={item.tipo_folha} item={item} lastUpdate={lastUpdate} />
                        ))}
                        {filteredItems.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                Nenhum item de estoque encontrado.
                            </div>
                        )}
                    </div>

                    <Card className="shadow-lg border-border/60 rounded-2xl overflow-hidden mt-8">
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader className="bg-card/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border/40">
                                        <TableRow>
                                            <TableHead className="py-4 pl-6 font-semibold">Tipo de Folha</TableHead>
                                            <TableHead className="py-4 text-center font-semibold">Estoque Base</TableHead>
                                            <TableHead className="py-4 text-center font-semibold text-emerald-400">Reposições (+)</TableHead>
                                            <TableHead className="py-4 text-center font-semibold text-rose-400">Gastas (-)</TableHead>
                                            <TableHead className="py-4 text-right pr-6 font-bold">Estoque Atual</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map(item => {
                                            const isNegative = item.estoqueAtual < 0;
                                            const isLow = item.estoqueAtual >= 0 && item.estoqueAtual < 50;
                                            return (
                                                <TableRow key={item.tipo_folha} className="hover:bg-accent/5 transition-colors border-border/30">
                                                    <TableCell className="font-medium pl-6 py-4">{item.tipo_folha}</TableCell>
                                                    <TableCell className="text-center py-4 text-muted-foreground">{item.baseline}</TableCell>
                                                    <TableCell className="text-center py-4 text-emerald-400 font-medium">+{item.reposicoes}</TableCell>
                                                    <TableCell className="text-center py-4 text-rose-400 font-medium">-{item.folhasGastas}</TableCell>
                                                    <TableCell className={cn(
                                                        "text-right pr-6 py-4 font-bold text-lg",
                                                        isNegative ? "text-stock-negative" : isLow ? "text-stock-low" : "text-stock-positive"
                                                    )}>
                                                        {item.estoqueAtual}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </>
            )}
        </motion.div>
    );
};

export default ControleEstoque;