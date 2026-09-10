import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Music, Download, FileText, Printer, UserMinus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToExcel, generatePDF, printContent } from '@/lib/ExportUtils';

const ConsultaMembrosConjunto = () => {
    const { toast } = useToast();
    const [allMembros, setAllMembros] = useState([]);
    const [conjuntosBase, setConjuntosBase] = useState([]);
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

            // Fetch ALL members (status filter applied client-side)
            const { data: membrosData, error: memError } = await supabase
                .from('igreja_membros')
                .select(`id, nome_completo, conjunto_id, participa_conjunto, status, cargo:cargos_igreja(nome_cargo)`)
                .order('nome_completo', { ascending: true });
            if (memError) throw memError;

            setConjuntosBase(conjuntosData || []);
            setAllMembros(membrosData || []);
        } catch (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { conjuntos, totalMembros, totalConjuntos } = useMemo(() => {
        const membrosFiltrados = allMembros.filter(m =>
            filterStatus === 'todos' || (m.status || 'ATIVO') === filterStatus
        );

        let total = 0;

        // Group participants into their respective conjuntos.
        // Keep ALL registered conjuntos, even those with no members.
        const grouped = conjuntosBase.map(conjunto => {
            const mems = membrosFiltrados.filter(
                m => m.participa_conjunto === true && m.conjunto_id === conjunto.id
            );
            total += mems.length;
            return { ...conjunto, membros: mems, isSemConjunto: false };
        });

        // Create a specific group for members NOT participating in any conjunto
        const semConjuntoMembros = membrosFiltrados.filter(
            m => m.participa_conjunto === false || !m.conjunto_id
        );
        if (semConjuntoMembros.length > 0) {
            grouped.push({
                id: 'sem-conjunto',
                nome_conjunto: 'SEM CONJUNTO',
                membros: semConjuntoMembros,
                isSemConjunto: true
            });
            total += semConjuntoMembros.length;
        }

        return { conjuntos: grouped, totalMembros: total, totalConjuntos: conjuntosBase.length };
    }, [allMembros, conjuntosBase, filterStatus]);

    const handleExportExcel = () => {
        const exportData = conjuntos.flatMap(c =>
            c.membros.map(m => ({
                'Conjunto': c.nome_conjunto,
                'Membro': m.nome_completo,
                'Cargo': m.cargo?.nome_cargo || '-',
                'Status': m.status || 'ATIVO'
            }))
        );
        if (exportData.length === 0) {
            toast({ title: "Aviso", description: "Nenhum membro para exportar.", variant: "default" });
            return;
        }
        exportToExcel(exportData, 'Membros_por_Conjunto', 'Membros');
    };

    const handleGeneratePDF = () => {
        const body = conjuntos.flatMap(c =>
            c.membros.map(m => [
                c.nome_conjunto,
                m.nome_completo,
                m.cargo?.nome_cargo || '-',
                m.status || 'ATIVO'
            ])
        );
        if (body.length === 0) {
            toast({ title: "Aviso", description: "Nenhum membro para gerar PDF.", variant: "default" });
            return;
        }
        generatePDF('Membros por Conjunto', ['Conjunto', 'Membro', 'Cargo', 'Status'], body, 'membros_conjunto');
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Helmet>
                <title>Membros por Conjunto | Secretaria</title>
            </Helmet>

            {/* Cabeçalho harmonizado */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">Membros por Conjunto</h1>
                        <p className="text-sm text-muted-foreground">
                            Listagem detalhada de quem participa de conjuntos musicais.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handleExportExcel}>
                            <Download className="w-4 h-4 mr-2" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
                            <FileText className="w-4 h-4 mr-2" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={printContent}>
                            <Printer className="w-4 h-4 mr-2" /> Imprimir
                        </Button>
                    </div>
                </div>

                {/* Linha de filtros e indicadores */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-40 bg-card border-border font-bold">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="dark-igreja">
                            <SelectItem value="todos" className="font-bold">Todos</SelectItem>
                            <SelectItem value="ATIVO" className="font-bold text-green-500">Ativos</SelectItem>
                            <SelectItem value="INATIVO" className="font-bold text-red-500">Inativos</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-card border border-border px-4 py-2 rounded-lg flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-md">
                                <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conjuntos</p>
                                <p className="text-xl font-bold leading-none mt-0.5">{totalConjuntos}</p>
                            </div>
                        </div>
                        <div className="bg-card border border-border px-4 py-2 rounded-lg flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-md">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Membros Listados</p>
                                <p className="text-xl font-bold leading-none mt-0.5">{totalMembros}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    <p className="text-sm text-muted-foreground">Carregando conjuntos...</p>
                </div>
            ) : conjuntos.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl">
                    Nenhum conjunto cadastrado ainda.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 print-content">
                    {conjuntos.map(conjunto => {
                        const vazio = conjunto.membros.length === 0;
                        return (
                            <Card
                                key={conjunto.id}
                                className={`bg-card glass-card overflow-hidden transition-shadow hover:shadow-md ${
                                    conjunto.isSemConjunto ? 'border-amber-500/30' : ''
                                }`}
                            >
                                <CardHeader
                                    className={`border-b py-3 px-4 ${
                                        conjunto.isSemConjunto
                                            ? 'bg-amber-500/5 border-amber-500/20'
                                            : 'bg-muted/20 border-border'
                                    }`}
                                >
                                    <CardTitle className="flex items-center justify-between text-base">
                                        <div className={`flex items-center gap-2 ${conjunto.isSemConjunto ? 'text-amber-600' : 'text-foreground'}`}>
                                            {conjunto.isSemConjunto ? (
                                                <UserMinus className="w-5 h-5" />
                                            ) : (
                                                <Music className="w-5 h-5 text-primary" />
                                            )}
                                            <span className="truncate">{conjunto.nome_conjunto}</span>
                                        </div>
                                        <span
                                            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                conjunto.isSemConjunto
                                                    ? 'bg-amber-500/10 text-amber-600'
                                                    : 'bg-primary/10 text-primary'
                                            }`}
                                        >
                                            {conjunto.membros.length}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {vazio ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                                            <Music className="w-7 h-7 text-muted-foreground/40" />
                                            <p className="text-sm text-muted-foreground">
                                                Nenhum membro vinculado a este conjunto
                                                {filterStatus !== 'todos' && ' para o filtro selecionado'}.
                                            </p>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-[280px] w-full">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b border-border">
                                                    <TableRow>
                                                        <TableHead className="w-10">#</TableHead>
                                                        <TableHead>Nome</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Cargo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {conjunto.membros.map((membro, index) => (
                                                        <TableRow
                                                            key={membro.id}
                                                            className={`hover:bg-muted/10 ${
                                                                conjunto.isSemConjunto ? 'hover:bg-amber-500/5' : ''
                                                            }`}
                                                        >
                                                            <TableCell className="text-muted-foreground text-xs font-mono">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell className="font-medium text-sm">
                                                                {membro.nome_completo}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span
                                                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                        (membro.status || 'ATIVO') === 'ATIVO'
                                                                            ? 'bg-green-500/10 text-green-500'
                                                                            : 'bg-red-500/10 text-red-500'
                                                                    }`}
                                                                >
                                                                    {(membro.status || 'ATIVO') === 'ATIVO' ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                                {membro.cargo?.nome_cargo || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ConsultaMembrosConjunto;
