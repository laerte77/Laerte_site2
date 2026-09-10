import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart2, Printer, Download, FileText, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';

const getBase64Image = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });
};

const RelatorioGastosPorTipoDespesa = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [showFilters, setShowFilters] = useState(true);
    
    // Filters
    const [filterPeriodo, setFilterPeriodo] = useState('mensal');
    const [filterMes, setFilterMes] = useState(String(new Date().getMonth() + 1));
    const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
    const [filterTipo, setFilterTipo] = useState('todos');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch Tipos de Despesa
            const { data: tipos, error: tiposError } = await supabase.from('igreja_tipos_despesa').select('despesa').order('despesa');
            if (tiposError) throw tiposError;
            setTiposDespesa(tipos || []);
            
            // Fetch all despesas
            const { data, error } = await supabase.from('igreja_despesas').select('*').order('data', { ascending: false });
            if (error) throw error;
            setDespesas(data || []);

        } catch (error) {
            toast({ title: "Erro ao buscar dados", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const getDateRange = useCallback(() => {
        const now = new Date();
        const year = parseInt(filterAno);
        const month = parseInt(filterMes) - 1;

        switch (filterPeriodo) {
            case 'semanal':
                return { start: startOfWeek(now), end: endOfWeek(now) };
            case 'mensal':
                 // Create date in UTC to match how comparison often works, or just local
                 // Using constructor with year, month, day ensures local time
                return { start: startOfMonth(new Date(year, month)), end: endOfMonth(new Date(year, month)) };
            case 'trimestral':
                // Current quarter based on now, or could imply quarter selection. 
                // For simplicity let's stick to current quarter of selected year if not specified
                return { start: startOfQuarter(now), end: endOfQuarter(now) };
            case 'anual':
                return { start: startOfYear(new Date(year, 0, 1)), end: endOfYear(new Date(year, 0, 1)) };
            case 'personalizado':
                if (customStartDate && customEndDate) {
                     return { start: new Date(customStartDate), end: new Date(customEndDate) };
                }
                return null;
            default:
                return { start: startOfMonth(now), end: endOfMonth(now) };
        }
    }, [filterPeriodo, filterMes, filterAno, customStartDate, customEndDate]);

    const filteredData = useMemo(() => {
        const range = getDateRange();
        
        let filtered = despesas;

        if (range) {
             filtered = filtered.filter(d => {
                 // Adjust date string to ensure correct day comparison (avoid timezone offset issues)
                 const dDate = parseISO(d.data); 
                 return isWithinInterval(dDate, { start: range.start, end: range.end });
             });
        }

        if (filterTipo !== 'todos') {
            filtered = filtered.filter(d => d.despesa === filterTipo);
        }
        
        // Group by Description (tipo/despesa)
        const grouped = filtered.reduce((acc, curr) => {
            const desc = curr.despesa || 'Sem Descrição';
            if (!acc[desc]) {
                acc[desc] = 0;
            }
            acc[desc] += Number(curr.valor);
            return acc;
        }, {});

        // Convert back to array
        return Object.entries(grouped).map(([descricao, valor]) => ({
            descricao,
            valor
        })).sort((a, b) => b.valor - a.valor); // Sort by highest value

    }, [despesas, getDateRange, filterTipo]);

    const totalValor = useMemo(() => {
        return filteredData.reduce((acc, curr) => acc + curr.valor, 0);
    }, [filteredData]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handlePrint = () => window.print();

    const handleGeneratePDF = async () => {
        const doc = new jsPDF();
        const logoUrl = 'https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/7cf23b48356b9b94cb24959b2cce5390.png';
        try {
            const logoData = await getBase64Image(logoUrl);
            if (logoData) doc.addImage(logoData, 'PNG', 15, 15, 20, 20);
        } catch (e) { console.warn(e); }

        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.text("IGREJA ASSEMBLEIA DE DEUS", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text("RELATÓRIO DE GASTOS ACUMULADOS POR TIPO", 105, 30, { align: "center" });

        const rows = filteredData.map(d => [
            d.descricao,
            formatCurrency(d.valor)
        ]);

        autoTable(doc, {
            head: [["Descrição / Tipo", "Valor Acumulado"]],
            body: rows,
            startY: 40,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Geral: ${formatCurrency(totalValor)}`, 14, finalY);

        doc.save("Relatorio_Gastos_Acumulados.pdf");
    };

    const handleExportExcel = () => {
        const data = filteredData.map(d => ({
            Descricao: d.descricao,
            Valor_Acumulado: d.valor
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Gastos Acumulados");
        XLSX.writeFile(wb, "Relatorio_Gastos_Acumulados.xlsx");
    };

    // Years for filter
    const years = useMemo(() => {
        const uniqueYears = [...new Set(despesas.map(d => new Date(d.data).getFullYear()))];
        return uniqueYears.sort((a, b) => b - a);
    }, [despesas]);

    return (
        <div className="bg-gradient-to-br from-black to-gray-900 min-h-full text-gray-100 p-4 flex flex-col">
            <style>{`
                @media print {
                    @page { margin: 1cm; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; color: black !important; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: #dbeafe !important; color: #1e3a8a !important; border-bottom: 2px solid #93c5fd; padding: 4px; }
                    td { border-bottom: 1px solid #e2e8f0; padding: 4px; }
                    .header-logo { width: 60px; height: 60px; object-fit: contain; }
                }
                .print-only { display: none; }
            `}</style>

            <div className="space-y-6 no-print flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <div className="bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20">
                            <BarChart2 className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white">Gastos por Tipo</h2>
                            <p className="text-gray-400">Relatório de despesas acumuladas por categoria.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"><Download className="w-4 h-4 mr-2"/> Excel</Button>
                        <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"><FileText className="w-4 h-4 mr-2"/> PDF</Button>
                        <Button variant="default" size="sm" onClick={handlePrint} className="bg-yellow-600 hover:bg-yellow-700 text-white"><Printer className="w-4 h-4 mr-2"/> Imprimir</Button>
                    </div>
                </div>

                <Card className="bg-gray-900/50 border-gray-800 shadow-xl backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b border-gray-800">
                        <CardTitle className="flex justify-between text-base text-gray-100">
                            <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-yellow-500"/> Filtros</div>
                            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    {showFilters && (
                        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                             <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400">Período</label>
                                <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="Período" /></SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                        <SelectItem value="semanal">Semanal</SelectItem>
                                        <SelectItem value="mensal">Mensal</SelectItem>
                                        <SelectItem value="trimestral">Trimestral</SelectItem>
                                        <SelectItem value="anual">Anual</SelectItem>
                                        <SelectItem value="personalizado">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filterPeriodo === 'mensal' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-400">Mês</label>
                                        <Select value={filterMes} onValueChange={setFilterMes}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="Mês" /></SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                                {Array.from({length: 12}).map((_, i) => (
                                                    <SelectItem key={i+1} value={String(i+1)}>{format(new Date(2023, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-400">Ano</label>
                                        <Select value={filterAno} onValueChange={setFilterAno}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="Ano" /></SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                             
                            {filterPeriodo === 'anual' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-400">Ano</label>
                                    <Select value={filterAno} onValueChange={setFilterAno}>
                                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="Ano" /></SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {filterPeriodo === 'personalizado' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-400">Início</label>
                                        <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-400">Fim</label>
                                        <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-gray-800 border-gray-700 text-gray-100" />
                                    </div>
                                </>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400">Tipo de Despesa</label>
                                <Select value={filterTipo} onValueChange={setFilterTipo}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                        <SelectItem value="todos">Todos</SelectItem>
                                        {tiposDespesa.map((t, idx) => (
                                            <SelectItem key={idx} value={t.despesa}>{t.despesa}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    )}
                </Card>

                <Card className="flex-1 bg-gray-900/50 border-gray-800 overflow-hidden flex flex-col shadow-xl backdrop-blur-sm">
                    <CardContent className="p-0 h-full flex flex-col">
                        <div className="p-4 border-b border-gray-800 bg-black/20 flex justify-between items-center">
                            <span className="font-semibold text-sm text-gray-300">Tipos Encontrados: {filteredData.length}</span>
                            <span className="font-bold text-lg text-yellow-500">Total: {formatCurrency(totalValor)}</span>
                        </div>
                        <ScrollArea className="flex-1">
                            <Table>
                                <TableHeader className="bg-gray-800/50 sticky top-0">
                                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                                        <TableHead className="text-gray-300">Descrição / Tipo</TableHead>
                                        <TableHead className="text-right text-gray-300">Valor Acumulado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24 text-gray-500">Nenhum registro encontrado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((d, idx) => (
                                            <TableRow key={idx} className="border-gray-800 hover:bg-gray-800/50">
                                                <TableCell className="text-gray-300 font-medium">{d.descricao}</TableCell>
                                                <TableCell className="text-right font-bold text-yellow-500">{formatCurrency(d.valor)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="print-only p-8 bg-white text-black max-w-[297mm] mx-auto">
                <div className="flex flex-col items-center mb-8 border-b-2 border-blue-800 pb-4">
                    <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/7cf23b48356b9b94cb24959b2cce5390.png" alt="Logo" className="header-logo mb-2" />
                    <h1 className="text-xl font-extrabold text-blue-900 uppercase text-center">IGREJA ASSEMBLEIA DE DEUS</h1>
                    <h3 className="text-lg font-bold text-blue-800 uppercase text-center mt-2">RELATÓRIO DE GASTOS ACUMULADOS</h3>
                </div>
                
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="text-left w-[70%]">DESCRIÇÃO</th>
                            <th className="text-right w-[30%]">VALOR ACUMULADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((d, idx) => (
                            <tr key={idx}>
                                <td>{d.descricao}</td>
                                <td className="text-right font-bold">{formatCurrency(d.valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-6 pt-4 border-t-2 border-blue-900 text-right">
                    <span className="font-bold text-lg">Total Geral: {formatCurrency(totalValor)}</span>
                </div>
            </div>
        </div>
    );
};

export default RelatorioGastosPorTipoDespesa;