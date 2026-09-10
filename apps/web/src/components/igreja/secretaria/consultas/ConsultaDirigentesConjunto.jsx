import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Crown, Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToExcel, generatePDF, printContent } from '@/lib/ExportUtils';

const ConsultaDirigentesConjunto = () => {
    const { toast } = useToast();
    const [conjuntosBase, setConjuntosBase] = useState([]);
    const [allDirigentes, setAllDirigentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ATIVO');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: conjuntosData, error: conjError } = await supabase
                .from('igreja_conjuntos')
                .select('*')
                .order('nome_conjunto', { ascending: true });
            if (conjError) throw conjError;

            // Fetch ALL dirigentes (status filter applied client-side)
            const { data: dirigentesData, error: dirError } = await supabase
                .from('igreja_membros')
                .select(`id, nome_completo, dirige_conjunto_id, status, igreja_funcoes(nome_funcao), cargo:cargos_igreja(nome_cargo)`)
                .eq('is_dirigente', true)
                .order('nome_completo', { ascending: true });
            if (dirError) throw dirError;

            setConjuntosBase(conjuntosData || []);
            setAllDirigentes(dirigentesData || []);
        } catch (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const conjuntos = useMemo(() => {
        const dirigentesFiltrados = allDirigentes.filter(d =>
            filterStatus === 'todos' || (d.status || 'ATIVO') === filterStatus
        );

        return conjuntosBase.map(conjunto => {
            const dirs = dirigentesFiltrados.filter(d => d.dirige_conjunto_id === conjunto.id);
            return { ...conjunto, dirigentes: dirs };
        }).filter(c => c.dirigentes.length > 0);
    }, [conjuntosBase, allDirigentes, filterStatus]);

    const handleExportExcel = () => {
        const exportData = conjuntos.flatMap(c =>
            c.dirigentes.map(d => ({
                'Conjunto': c.nome_conjunto,
                'Dirigente': d.nome_completo,
                'Função/Cargo': d.cargo?.nome_cargo || d.igreja_funcoes?.nome_funcao || '-',
                'Status': d.status || 'ATIVO'
            }))
        );
        exportToExcel(exportData, 'Dirigentes_por_Conjunto', 'Dirigentes');
    };

    const handleGeneratePDF = () => {
        const body = conjuntos.flatMap(c =>
            c.dirigentes.map(d => [
                c.nome_conjunto,
                d.nome_completo,
                d.cargo?.nome_cargo || d.igreja_funcoes?.nome_funcao || '-',
                d.status || 'ATIVO'
            ])
        );
        generatePDF('Dirigentes por Conjunto', ['Conjunto', 'Dirigente', 'Função/Cargo', 'Status'], body, 'dirigentes_conjunto');
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Helmet>
                <title>Dirigentes por Conjunto | Secretaria</title>
            </Helmet>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Dirigentes por Conjunto</h1>
                    <p className="text-muted-foreground">Relação de líderes e dirigentes de cada conjunto.</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-36 bg-card border-border font-bold">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="dark-igreja">
                            <SelectItem value="todos" className="font-bold">Todos</SelectItem>
                            <SelectItem value="ATIVO" className="font-bold text-green-500">Ativos</SelectItem>
                            <SelectItem value="INATIVO" className="font-bold text-red-500">Inativos</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="w-4 h-4 mr-2"/> Excel</Button>
                    <Button variant="outline" size="sm" onClick={handleGeneratePDF}><FileText className="w-4 h-4 mr-2"/> PDF</Button>
                    <Button variant="outline" size="sm" onClick={printContent}><Printer className="w-4 h-4 mr-2"/> Imprimir</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
            ) : conjuntos.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl">
                    Nenhum dirigente encontrado para o filtro selecionado.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-content">
                    {conjuntos.map(conjunto => (
                        <Card key={conjunto.id} className="bg-card glass-card">
                            <CardHeader className="border-b border-border bg-muted/20 pb-3">
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        {conjunto.nome_conjunto}
                                    </div>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {conjunto.dirigentes.length} {conjunto.dirigentes.length === 1 ? 'Dirigente' : 'Dirigentes'}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead>Nome do Dirigente</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Função / Cargo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {conjunto.dirigentes.map(dirigente => (
                                            <TableRow key={dirigente.id}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <Crown className="w-4 h-4 text-primary" />
                                                    {dirigente.nome_completo}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(dirigente.status || 'ATIVO') === 'ATIVO' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {(dirigente.status || 'ATIVO') === 'ATIVO' ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-sm">
                                                    {dirigente.cargo?.nome_cargo ? (
                                                        <span className="text-primary font-medium">{dirigente.cargo.nome_cargo}</span>
                                                    ) : (
                                                        dirigente.igreja_funcoes?.nome_funcao || '-'
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConsultaDirigentesConjunto;
