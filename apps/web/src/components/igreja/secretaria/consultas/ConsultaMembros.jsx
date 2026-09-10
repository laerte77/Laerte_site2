import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Printer, ChevronDown, ChevronUp, Download, FileText, Droplets, Flame, Calendar, Heart, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const CardSkeleton = () => (
    <div className="bg-card p-4 rounded-xl border border-border space-y-3 shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
        </div>
        <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
        </div>
    </div>
);

const ConsultaMembros = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [membros, setMembros] = useState([]);
    const [funcoes, setFuncoes] = useState([]);
    const [conjuntos, setConjuntos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ATIVO');
    const [filterFuncao, setFilterFuncao] = useState('todos');
    const [filterConjunto, setFilterConjunto] = useState('todos');
    const [filterEstadoCivil, setFilterEstadoCivil] = useState('todos');
    const [showFilters, setShowFilters] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [membrosRes, funcoesRes, conjuntosRes] = await Promise.all([
                supabase.from('igreja_membros').select(`
                    *,
                    igreja_funcoes(nome_funcao),
                    conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
                    dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
                    igreja_classes(nome_classe),
                    cargo:cargos_igreja(nome_cargo)
                `).order('nome_completo', { ascending: true }),
                supabase.from('igreja_funcoes').select('*').order('nome_funcao', { ascending: true }),
                supabase.from('igreja_conjuntos').select('*').order('nome_conjunto', { ascending: true }),
            ]);

            if (membrosRes.error) throw membrosRes.error;
            setMembros(membrosRes.data || []);
            if (funcoesRes.error) throw funcoesRes.error;
            setFuncoes(funcoesRes.data || []);
            if (conjuntosRes.error) throw conjuntosRes.error;
            setConjuntos(conjuntosRes.data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar dados", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredMembros = useMemo(() => {
        return membros.filter(m => {
            const searchMatch = m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());
            
            const statusMatch = filterStatus === 'todos' || (m.status || 'ATIVO') === filterStatus;
            const funcaoMatch = filterFuncao === 'todos' || String(m.cargo_id) === filterFuncao; // using cargo now, but keeping var name
            const conjuntoMatch = filterConjunto === 'todos' || String(m.conjunto_id) === filterConjunto || String(m.dirige_conjunto_id) === filterConjunto;
            const estadoCivilMatch = filterEstadoCivil === 'todos' || m.estado_civil === filterEstadoCivil;
            return searchMatch && statusMatch && funcaoMatch && conjuntoMatch && estadoCivilMatch;
        });
    }, [membros, searchTerm, filterStatus, filterFuncao, filterConjunto, filterEstadoCivil]);
    
    const handlePrint = () => {
        window.print();
    };

    const handleGeneratePDF = async () => {
        if (filteredMembros.length === 0) {
            toast({ title: "Sem dados", description: "Não há membros para exportar.", variant: "warning" });
            return;
        }

        const doc = new jsPDF();
        const logoUrl = 'https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
        
        try {
            const logoData = await getBase64Image(logoUrl);
            if (logoData) {
                doc.addImage(logoData, 'PNG', 15, 15, 20, 20);
            }
        } catch (error) {
            console.warn("Could not add logo to PDF", error);
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138); 
        doc.text("IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text("LEROLÂNDIA", 105, 28, { align: "center" });
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("LISTAGEM DE MEMBROS", 105, 38, { align: "center" });
        
        const tableColumn = ["Nome", "Nascimento", "Admissão", "Cargo", "Est. Civil", "Status"];
        const tableRows = filteredMembros.map(m => [
            m.nome_completo,
            m.data_nascimento ? new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            m.data_entrada ? new Date(m.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            m.cargo?.nome_cargo || '-',
            m.estado_civil ? m.estado_civil.toLowerCase() : '-',
            m.status || 'ATIVO'
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 }, 
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Total de Membros Listados: ${filteredMembros.length}`, 14, finalY + 10);

        doc.save(`Membros_${new Date().toISOString().split('T')[0]}.pdf`);
        toast({ title: "PDF Gerado", description: "O relatório foi baixado com sucesso." });
    };

    const handleExportExcel = () => {
        if (filteredMembros.length === 0) {
            toast({ title: 'Nenhum dado', description: 'A lista de membros está vazia.', variant: 'destructive' });
            return;
        }

        const dataToExport = filteredMembros.map(m => ({
            'Nome': m.nome_completo,
            'Data de Nascimento': m.data_nascimento ? new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            'Data de Admissão': m.data_entrada ? new Date(m.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
            'Cargo': m.cargo?.nome_cargo || '-',
            'Estado Civil': m.estado_civil || '-',
            'Batismo nas Águas': m.is_batizado_aguas ? 'Sim' : 'Não',
            'Batismo Espírito Santo': m.is_batizado_espirito ? 'Sim' : 'Não',
            'Status': m.status || 'ATIVO'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');
        XLSX.writeFile(workbook, 'Listagem_Membros.xlsx');
        toast({ title: 'Sucesso', description: 'Excel exportado com sucesso.' });
    };

    const getInitials = (name) => {
        if (!name) return "M";
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="dark-igreja text-foreground">
            <style>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background-color: white !important; color: black !important; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th { background-color: #dbeafe !important; color: #1e3a8a !important; font-weight: bold; text-align: left; padding: 4px; border: 1px solid #93c5fd; }
                    td { padding: 4px; border: 1px solid #e2e8f0; vertical-align: middle; }
                    tr:nth-child(even) { background-color: #f8fafc !important; }
                    .header-logo { width: 80px; height: 80px; object-fit: contain; display: block; margin: 0 auto; }
                }
                .print-only { display: none; }
            `}</style>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png" alt="Logo" className="w-16 h-16 object-contain" />
                        <div>
                            <h2 className="text-3xl font-bold text-primary">Consulta de Membros</h2>
                            <p className="text-muted-foreground">Visualize e filtre os membros da igreja.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
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

                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/50">
                            <Download className="w-4 h-4 mr-2"/> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/50">
                            <FileText className="w-4 h-4 mr-2"/> PDF
                        </Button>
                        <Button variant="default" size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Printer className="w-4 h-4 mr-2"/> Imprimir
                        </Button>
                    </div>
                </div>
                
                <Card className="bg-card backdrop-blur-sm border-border shadow-lg">
                    <CardHeader className="pb-3 border-b border-border">
                        <CardTitle className="flex items-center justify-between text-base">
                            <div className="flex items-center font-bold">
                                <Filter className="w-4 h-4 mr-2 text-primary" /> Filtros Avançados
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8 w-8 p-0">
                                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar por nome..." 
                                            value={searchTerm || ''} 
                                            onChange={(e) => setSearchTerm(e.target.value)} 
                                            className="pl-9 bg-background/50 border-input" 
                                        />
                                    </div>
                                    <Select value={filterConjunto || 'todos'} onValueChange={setFilterConjunto}>
                                        <SelectTrigger className="bg-background/50 border-input"><SelectValue placeholder="Conjunto" /></SelectTrigger>
                                        <SelectContent className="dark-igreja max-h-[200px]">
                                            <SelectItem value="todos">Todos os Conjuntos</SelectItem>
                                            {conjuntos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={filterEstadoCivil || 'todos'} onValueChange={setFilterEstadoCivil}>
                                        <SelectTrigger className="bg-background/50 border-input"><SelectValue placeholder="Estado Civil" /></SelectTrigger>
                                        <SelectContent className="dark-igreja">
                                            <SelectItem value="todos">Todos</SelectItem>
                                            <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
                                            <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
                                            <SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem>
                                            <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground font-medium">
                        Exibindo <span className="font-bold text-primary text-lg mx-1">{filteredMembros.length}</span> registro(s) {filterStatus !== 'todos' && <span>(Status: <strong>{filterStatus}</strong>)</span>}
                    </p>
                </div>

                <div className="rounded-md border border-border overflow-hidden bg-card">
                    <ScrollArea className="h-[calc(100vh-340px)] min-h-[400px]">
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-4">
                            {loading ? (
                                Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)
                            ) : filteredMembros.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                                    <div className="bg-muted p-6 rounded-full mb-4 animate-pulse">
                                        <Users className="w-12 h-12 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold">Nenhum membro encontrado</h3>
                                    <p className="text-muted-foreground mt-2 max-w-sm">Tente ajustar seus filtros de busca.</p>
                                </div>
                            ) : (
                                filteredMembros.map(membro => {
                                    const isInactive = membro.status === 'INATIVO';
                                    return (
                                    <motion.div 
                                        key={membro.id} 
                                        layout 
                                        initial={{ opacity: 0, scale: 0.95 }} 
                                        animate={{ opacity: 1, scale: 1 }} 
                                        transition={{ duration: 0.2 }}
                                        className="group"
                                    >
                                        <Card className={`overflow-hidden border transition-all duration-300 rounded-xl relative ${isInactive ? 'border-red-500/50 bg-red-950/10' : 'border-border hover:border-primary bg-card'}`}>
                                            
                                            {isInactive && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs font-bold border border-red-500/30">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    INATIVO
                                                </div>
                                            )}

                                            <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0 relative overflow-hidden">
                                                <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 shadow-sm border z-10 ${isInactive ? 'bg-red-900/30 text-red-400 border-red-500/30' : 'bg-secondary text-secondary-foreground border-border'}`}>
                                                    {getInitials(membro.nome_completo)}
                                                </div>
                                                <div className="flex-1 min-w-0 z-10 pr-16">
                                                    <CardTitle className={`text-base font-bold truncate transition-colors ${isInactive ? 'text-red-400' : 'group-hover:text-primary'}`}>
                                                        {membro.nome_completo}
                                                    </CardTitle>
                                                    <div className="flex flex-col gap-1 mt-1.5">
                                                        {membro.cargo?.nome_cargo && (
                                                            <span className={`text-[11px] font-bold w-fit px-2 py-0.5 rounded-full flex items-center gap-1 ${isInactive ? 'text-red-300 bg-red-900/20' : 'text-primary bg-primary/10'}`}>
                                                                <Shield className="w-3 h-3" /> {membro.cargo.nome_cargo}
                                                            </span>
                                                        )}
                                                        {membro.funcoes_multiplas?.quantidade && (
                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                {membro.funcoes_multiplas.quantidade} Função(ões)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            
                                            <CardContent className="pb-3 space-y-3 text-sm pt-1">
                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                    <div className="space-y-1">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${isInactive ? 'text-red-400' : 'text-primary'}`}>
                                                            <Calendar className="w-3 h-3" /> Nascimento
                                                        </span>
                                                        <p className="font-semibold truncate pl-4 border-l-2 border-border">
                                                            {membro.data_nascimento ? new Date(membro.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${isInactive ? 'text-red-400' : 'text-primary'}`}>
                                                            <Heart className="w-3 h-3" /> Estado Civil
                                                        </span>
                                                        <p className="font-semibold truncate capitalize pl-4 border-l-2 border-border">
                                                            {membro.estado_civil ? membro.estado_civil.toLowerCase() : '-'}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1 col-span-2 pt-1">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${isInactive ? 'text-red-400' : 'text-primary'}`}>
                                                            <Users className="w-3 h-3" /> Conjunto / Classe
                                                        </span>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {membro.conjunto?.nome_conjunto && (
                                                                <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
                                                                    {membro.conjunto.nome_conjunto}
                                                                </Badge>
                                                            )}
                                                            {membro.igreja_classes?.nome_classe && (
                                                                <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
                                                                    EBD: {membro.igreja_classes.nome_classe}
                                                                </Badge>
                                                            )}
                                                            {!membro.conjunto?.nome_conjunto && !membro.igreja_classes?.nome_classe && (
                                                                <span className="text-muted-foreground italic text-xs pl-2">Nenhuma participação</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            
                                            <CardFooter className={`pt-3 pb-4 border-t flex justify-between items-center gap-2 ${isInactive ? 'border-red-500/20 bg-red-950/20' : 'border-border bg-muted/20'}`}>
                                                <div className="flex gap-2 w-full">
                                                    <div className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold border ${membro.is_batizado_aguas ? (isInactive ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-primary/20 text-primary border-primary/50') : 'bg-muted text-muted-foreground border-border grayscale opacity-70'}`}>
                                                        <Droplets className="w-3.5 h-3.5" /> 
                                                        <span>Águas</span>
                                                    </div>
                                                    <div className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold border ${membro.is_batizado_espirito ? (isInactive ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-primary/20 text-primary border-primary/50') : 'bg-muted text-muted-foreground border-border grayscale opacity-70'}`}>
                                                        <Flame className="w-3.5 h-3.5" />
                                                        <span>Espírito</span>
                                                    </div>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </motion.div>

            <div className="print-only p-4 bg-white text-black max-w-[297mm] mx-auto">
                <div className="flex flex-col items-center mb-6 border-b-2 border-black pb-4">
                    <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png" alt="Logo" className="header-logo mb-2" />
                    <h1 className="text-xl font-extrabold uppercase text-center tracking-wide">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1>
                    <h2 className="text-lg font-bold uppercase text-center">LEROLÂNDIA</h2>
                    <h3 className="text-lg font-bold uppercase text-center mt-3 px-6 py-1 border rounded-full">LISTAGEM DE MEMBROS</h3>
                    {filterStatus !== 'todos' && (
                        <h4 className="text-md font-bold uppercase text-center mt-1">STATUS: {filterStatus}</h4>
                    )}
                </div>

                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="border-b-2 p-2 text-left font-bold uppercase">NOME</th>
                            <th className="border-b-2 p-2 text-center font-bold uppercase">NASCIMENTO</th>
                            <th className="border-b-2 p-2 text-center font-bold uppercase">ADMISSÃO</th>
                            <th className="border-b-2 p-2 text-left font-bold uppercase">CARGO</th>
                            <th className="border-b-2 p-2 text-center font-bold uppercase">EST. CIVIL</th>
                            <th className="border-b-2 p-2 text-center font-bold uppercase">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembros.map((m, idx) => (
                            <tr key={m.id} className={idx % 2 === 0 ? 'bg-gray-100' : ''}>
                                <td className="border-b p-2 uppercase font-semibold">{m.nome_completo}</td>
                                <td className="border-b p-2 text-center">
                                    {m.data_nascimento ? new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="border-b p-2 text-center">
                                    {m.data_entrada ? new Date(m.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="border-b p-2 uppercase font-medium">{m.cargo?.nome_cargo || '-'}</td>
                                <td className="border-b p-2 text-center capitalize">{m.estado_civil ? m.estado_civil.toLowerCase() : '-'}</td>
                                <td className="border-b p-2 text-center font-bold">{m.status || 'ATIVO'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 pt-4 border-t-2 font-bold text-sm text-center">
                    Total de Membros Listados: {filteredMembros.length}
                </div>
            </div>
        </div>
    );
};

export default ConsultaMembros;