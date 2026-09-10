import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

const RelatorioEntradasDespesasPDF = () => {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState({ ofertas: [], dizimos: [], outras: [], despesas: [] });
    const [allTimeTotals, setAllTimeTotals] = useState({ entradas: 0, despesas: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentDateTime, setCurrentDateTime] = useState('');

    const filterType = searchParams.get('filterType');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shouldPrint = searchParams.get('print') === 'true';

    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        let start, end;

        // Validate parameters before fetching
        if (filterType === 'mensal' && year && month) {
            start = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
            end = new Date(Date.UTC(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59));
        } else if (filterType === 'periodo' && startDate && endDate) {
            start = new Date(startDate + 'T00:00:00Z');
            end = new Date(endDate + 'T23:59:59Z');
        } else {
            setLoading(false);
            setError("Parâmetros inválidos para geração do relatório.");
            return;
        }

        try {
            const [entradasRes, despesasRes, allEntradasRes, allDespesasRes] = await Promise.all([
                supabase.from('igreja_entradas').select('*, igreja_dizimistas(nome)').gte('data', start.toISOString()).lte('data', end.toISOString()).order('data', { ascending: true }),
                supabase.from('igreja_despesas').select('*').gte('data', start.toISOString()).lte('data', end.toISOString()).order('data', { ascending: true }),
                supabase.from('igreja_entradas').select('valor'),
                supabase.from('igreja_despesas').select('valor')
            ]);

            if (entradasRes.error) throw entradasRes.error;
            if (despesasRes.error) throw despesasRes.error;
            // For accumulated totals, errors are less critical, but logging them is good
            if (allEntradasRes.error) console.warn("Erro ao buscar totais gerais de entradas:", allEntradasRes.error);
            if (allDespesasRes.error) console.warn("Erro ao buscar totais gerais de despesas:", allDespesasRes.error);

            setData({
                ofertas: (entradasRes.data || []).filter(e => (e.tipo_entrada || '').toUpperCase() === 'OFERTA'),
                dizimos: (entradasRes.data || []).filter(e => (e.tipo_entrada || '').toUpperCase() === 'DÍZIMO' || (e.tipo_entrada || '').toUpperCase() === 'DIZIMO'),
                outras: (entradasRes.data || []).filter(e => {
                    const t = (e.tipo_entrada || '').toUpperCase();
                    return t !== 'OFERTA' && t !== 'DÍZIMO' && t !== 'DIZIMO';
                }),
                despesas: (despesasRes.data || []),
            });

            const totalEntradasGeral = (allEntradasRes.data || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
            const totalDespesasGeral = (allDespesasRes.data || []).reduce((acc, curr) => acc + (curr.valor || 0), 0);
            setAllTimeTotals({ entradas: totalEntradasGeral, despesas: totalDespesasGeral });

        } catch (err) {
            console.error('Erro ao buscar dados para o relatório:', err);
            setError("Não foi possível carregar os dados do relatório. Tente novamente.");
        } finally {
            setLoading(false);
            setCurrentDateTime(new Date().toLocaleString('pt-BR'));
        }
    }, [filterType, year, month, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Handle Auto-Print
    useEffect(() => {
        if (!loading && !error && shouldPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 800); // Slightly increased timeout to ensure render
            return () => clearTimeout(timer);
        }
    }, [loading, error, shouldPrint]);

    const totals = useMemo(() => {
        const safeOfertas = Array.isArray(data.ofertas) ? data.ofertas : [];
        const safeDizimos = Array.isArray(data.dizimos) ? data.dizimos : [];
        const safeOutras = Array.isArray(data.outras) ? data.outras : [];
        const safeDespesas = Array.isArray(data.despesas) ? data.despesas : [];

        const totalOfertas = safeOfertas.reduce((acc, item) => acc + (item.valor || 0), 0);
        const totalDizimos = safeDizimos.reduce((acc, item) => acc + (item.valor || 0), 0);
        const totalOutras = safeOutras.reduce((acc, item) => acc + (item.valor || 0), 0);
        const totalDespesas = safeDespesas.reduce((acc, item) => acc + (item.valor || 0), 0);
        const totalEntradasPeriodo = totalOfertas + totalDizimos + totalOutras;
        const saldoGeral = allTimeTotals.entradas - allTimeTotals.despesas;
        return { totalOfertas, totalDizimos, totalOutras, totalDespesas, totalEntradasPeriodo, saldoGeral };
    }, [data, allTimeTotals]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen font-sans bg-white text-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-lg">Gerando relatório...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen font-sans bg-white text-black p-4">
                <div className="text-red-600 text-xl mb-2">⚠️ Erro</div>
                <p className="text-gray-700 text-center mb-4">{error}</p>
                <Button onClick={() => window.close()} variant="outline">Fechar</Button>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Relatório de Entradas e Despesas</title>
                {/* Force white background for print to override any dark mode inheritance */}
                <style>{`
                    @media print {
                        body, #root { background-color: white !important; color: black !important; -webkit-print-color-adjust: exact; }
                        .print-hidden { display: none !important; }
                    }
                    body { background-color: white; color: black; }
                `}</style>
            </Helmet>
            
            <div className="bg-white text-black min-h-screen flex flex-col">
                {/* Control Bar - Hidden when printing */}
                <div className="print-hidden bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                    <div className="text-sm text-gray-500">Pré-visualização de Impressão</div>
                    <div className="flex gap-2">
                        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Printer className="w-4 h-4 mr-2" /> Imprimir
                        </Button>
                        <Button onClick={() => window.close()} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-200">
                            <X className="w-4 h-4 mr-2" /> Fechar
                        </Button>
                    </div>
                </div>

                <div className="p-8 max-w-4xl mx-auto w-full flex-1" id="pdf-content">
                    <header className="mb-8 border-b-2 border-gray-200 pb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-4">
                            <span>Gerado em: {currentDateTime}</span>
                            <span>Sistema Integrado de Gestão</span>
                        </div>
                        <div className="text-center">
                            <img 
                                alt="Logo Ministério Plantar" 
                                className="h-24 w-auto mx-auto mb-4" 
                                src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/612e5784f3faca006483ae69c11fa425.png" 
                                onError={(e) => e.target.style.display = 'none'}
                            />
                            <h1 className="text-xl font-bold uppercase tracking-wide mb-1">Igreja Assembleia de Deus Ministério Plantar</h1>
                            <h2 className="text-sm font-semibold text-gray-600 uppercase">Lerolândia</h2>
                            <div className="mt-4 inline-block bg-gray-100 px-4 py-1 rounded-full">
                                <h3 className="text-sm font-bold text-gray-800 uppercase">Relatório Financeiro de Entradas e Despesas</h3>
                            </div>
                        </div>
                    </header>

                    <main className="space-y-8">
                        {/* OFERTA */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-1 bg-green-600 rounded-full"></div>
                                <h3 className="font-bold text-green-700 text-lg">Ofertas</h3>
                            </div>
                            {data.ofertas.length > 0 ? (
                                <table className="w-full text-sm border-collapse border border-gray-200 shadow-sm">
                                    <thead>
                                        <tr className="bg-green-50 text-green-900 border-b border-green-100">
                                            <th className="p-2 text-left w-1/4 font-semibold">Data</th>
                                            <th className="p-2 text-left font-semibold">Descrição / Ofertante</th>
                                            <th className="p-2 text-right w-1/4 font-semibold">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.ofertas.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{formatDate(item.data)}</td>
                                                <td className="p-2 text-gray-800 font-medium">{item.ofertante || 'OFERTA GERAL'}</td>
                                                <td className="p-2 text-right text-gray-800">{formatCurrency(item.valor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-green-50 font-bold border-t border-green-200">
                                            <td colSpan="2" className="p-2 text-right text-green-800">TOTAL OFERTAS</td>
                                            <td className="p-2 text-right text-green-800">{formatCurrency(totals.totalOfertas)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : <p className="text-gray-500 italic text-sm p-2 border border-dashed border-gray-300 rounded">Nenhum registro de oferta encontrado para este período.</p>}
                        </section>

                        {/* DÍZIMO */}
                        <section>
                             <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                                <h3 className="font-bold text-blue-700 text-lg">Dízimos</h3>
                            </div>
                            {data.dizimos.length > 0 ? (
                                <table className="w-full text-sm border-collapse border border-gray-200 shadow-sm">
                                    <thead>
                                        <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                                            <th className="p-2 text-left w-1/4 font-semibold">Data</th>
                                            <th className="p-2 text-left font-semibold">Dizimista</th>
                                            <th className="p-2 text-right w-1/4 font-semibold">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.dizimos.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{formatDate(item.data)}</td>
                                                <td className="p-2 text-gray-800 font-medium">{item.igreja_dizimistas?.nome || 'NÃO IDENTIFICADO'}</td>
                                                <td className="p-2 text-right text-gray-800">{formatCurrency(item.valor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-blue-50 font-bold border-t border-blue-200">
                                            <td colSpan="2" className="p-2 text-right text-blue-800">TOTAL DÍZIMOS</td>
                                            <td className="p-2 text-right text-blue-800">{formatCurrency(totals.totalDizimos)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : <p className="text-gray-500 italic text-sm p-2 border border-dashed border-gray-300 rounded">Nenhum registro de dízimo encontrado para este período.</p>}
                        </section>

                        {/* OUTRAS ENTRADAS (Voto, Rendimento, etc.) */}
                        <section>
                             <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-1 bg-amber-600 rounded-full"></div>
                                <h3 className="font-bold text-amber-700 text-lg">Outras Entradas</h3>
                            </div>
                            {data.outras.length > 0 ? (
                                <table className="w-full text-sm border-collapse border border-gray-200 shadow-sm">
                                    <thead>
                                        <tr className="bg-amber-50 text-amber-900 border-b border-amber-100">
                                            <th className="p-2 text-left w-1/4 font-semibold">Data</th>
                                            <th className="p-2 text-left w-1/4 font-semibold">Tipo</th>
                                            <th className="p-2 text-left font-semibold">Descrição / Origem</th>
                                            <th className="p-2 text-right w-1/4 font-semibold">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.outras.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{formatDate(item.data)}</td>
                                                <td className="p-2 text-gray-800 font-medium">{item.tipo_entrada}</td>
                                                <td className="p-2 text-gray-800 font-medium">{item.igreja_dizimistas?.nome || item.ofertante || '—'}</td>
                                                <td className="p-2 text-right text-gray-800">{formatCurrency(item.valor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-amber-50 font-bold border-t border-amber-200">
                                            <td colSpan="3" className="p-2 text-right text-amber-800">TOTAL OUTRAS ENTRADAS</td>
                                            <td className="p-2 text-right text-amber-800">{formatCurrency(totals.totalOutras)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : <p className="text-gray-500 italic text-sm p-2 border border-dashed border-gray-300 rounded">Nenhum outro registro de entrada encontrado para este período.</p>}
                        </section>

                        {/* DESPESAS */}
                        <section style={{ pageBreakBefore: 'auto' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-4 w-1 bg-red-600 rounded-full"></div>
                                <h3 className="font-bold text-red-700 text-lg">Despesas</h3>
                            </div>
                             {data.despesas.length > 0 ? (
                                <table className="w-full text-sm border-collapse border border-gray-200 shadow-sm">
                                    <thead>
                                        <tr className="bg-red-50 text-red-900 border-b border-red-100">
                                            <th className="p-2 text-left w-1/4 font-semibold">Data</th>
                                            <th className="p-2 text-left font-semibold">Descrição da Despesa</th>
                                            <th className="p-2 text-right w-1/4 font-semibold">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.despesas.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{formatDate(item.data)}</td>
                                                <td className="p-2 text-gray-800 font-medium">{item.despesa}</td>
                                                <td className="p-2 text-right text-gray-800">{formatCurrency(item.valor)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-red-50 font-bold border-t border-red-200">
                                            <td colSpan="2" className="p-2 text-right text-red-800">TOTAL DESPESAS</td>
                                            <td className="p-2 text-right text-red-800">{formatCurrency(totals.totalDespesas)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : <p className="text-gray-500 italic text-sm p-2 border border-dashed border-gray-300 rounded">Nenhum registro de despesa encontrado para este período.</p>}
                        </section>

                        {/* RESUMO */}
                        <section className="mt-8 pt-4 border-t-2 border-gray-200 break-inside-avoid">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase text-right">Resumo do Período</h3>
                            <div className="w-full max-w-md ml-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-gray-200">
                                            <td className="py-2 text-gray-600">Total de Entradas (Ofertas + Dízimos + Outras)</td>
                                            <td className="py-2 text-right font-bold text-green-700">{formatCurrency(totals.totalEntradasPeriodo)}</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                            <td className="py-2 text-gray-600">Total de Saídas (Despesas)</td>
                                            <td className="py-2 text-right font-bold text-red-700">{formatCurrency(totals.totalDespesas)}</td>
                                        </tr>
                                        <tr className="text-base">
                                            <td className="py-3 font-bold text-gray-800">Saldo do Período</td>
                                            <td className={`py-3 text-right font-bold ${totals.totalEntradasPeriodo - totals.totalDespesas >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                                {formatCurrency(totals.totalEntradasPeriodo - totals.totalDespesas)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                             <div className="w-full max-w-md ml-auto mt-4 bg-gray-800 text-white rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold uppercase text-sm tracking-wider">Saldo Atual em Caixa (Geral)</span>
                                    <span className="text-xl font-bold">{formatCurrency(totals.saldoGeral)}</span>
                                </div>
                            </div>
                        </section>
                    </main>
                    
                    <div className="mt-16 pt-8 border-t border-gray-300 text-center">
                         <div className="inline-block px-16 border-t border-black pt-2">
                            <p className="text-sm font-medium text-gray-800">Tesouraria</p>
                         </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RelatorioEntradasDespesasPDF;