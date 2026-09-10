import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookUser, Printer, Download, FileText, Loader2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
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

const ConsultaMembrosFuncaoRelatorio = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [allMembers, setAllMembers] = useState([]);
    const [groupedMembers, setGroupedMembers] = useState({});
    const [loading, setLoading] = useState(true);
    const [funcoes, setFuncoes] = useState([]);
    const [filterFuncao, setFilterFuncao] = useState('todos');
    const [filterStatus, setFilterStatus] = useState('ATIVO');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [membersRes, funcoesRes] = await Promise.all([
                supabase.from('igreja_membros').select('*, funcao:igreja_funcoes(nome_funcao)').order('nome_completo', { ascending: true }),
                supabase.from('igreja_funcoes').select('*').order('nome_funcao', { ascending: true })
            ]);

            if (membersRes.error) throw membersRes.error;
            if (funcoesRes.error) throw funcoesRes.error;
            
            setAllMembers(membersRes.data || []);
            setFuncoes(funcoesRes.data || []);
        } catch (error) {
            toast({ title: "Erro", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const functionMap = useMemo(() => {
        return funcoes.reduce((acc, f) => {
            acc[f.id] = f.nome_funcao;
            return acc;
        }, {});
    }, [funcoes]);

    // Extrai os nomes das funções de um membro, considerando todos os formatos
    // possíveis armazenados no banco:
    //  - funcoes_multiplas como objeto { quantidade, funcoes_ids: [...] } (formato atual)
    //  - funcoes_multiplas como array de IDs (formato legado)
    //  - funcoes_exercidas como texto separado por vírgulas
    //  - funcao.nome_funcao via join (função única)
    const getMemberFunctionNames = useCallback((member) => {
        const names = new Set();

        // Formato atual: objeto com funcoes_ids
        if (member.funcoes_multiplas && typeof member.funcoes_multiplas === 'object') {
            let ids = [];
            if (Array.isArray(member.funcoes_multiplas)) {
                ids = member.funcoes_multiplas;
            } else if (Array.isArray(member.funcoes_multiplas.funcoes_ids)) {
                ids = member.funcoes_multiplas.funcoes_ids;
            }
            ids.forEach(id => {
                const name = functionMap[id];
                if (name) names.add(name);
            });
        }

        // Fallback: texto com nomes separados por vírgula
        if (names.size === 0 && member.funcoes_exercidas) {
            member.funcoes_exercidas
                .split(',')
                .map(n => n.trim())
                .filter(Boolean)
                .forEach(n => names.add(n));
        }

        // Fallback: função única via join
        if (names.size === 0 && member.funcao?.nome_funcao) {
            names.add(member.funcao.nome_funcao);
        }

        return names.size > 0 ? Array.from(names) : ['Sem Função'];
    }, [functionMap]);

    useEffect(() => {
        const grouped = {};

        const membersToGroup = allMembers.filter(member =>
            filterStatus === 'todos' || (member.status || 'ATIVO') === filterStatus
        );

        membersToGroup.forEach(member => {
            const memberFunctions = getMemberFunctionNames(member);

            if (filterFuncao !== 'todos') {
                if (memberFunctions.includes(filterFuncao)) {
                    if (!grouped[filterFuncao]) grouped[filterFuncao] = [];
                    grouped[filterFuncao].push(member);
                }
            } else {
                const uniqueFunctions = [...new Set(memberFunctions)];
                uniqueFunctions.forEach(funcaoName => {
                    if (!grouped[funcaoName]) grouped[funcaoName] = [];
                    grouped[funcaoName].push(member);
                });
            }
        });

        const sortedGrouped = Object.keys(grouped).sort().reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
        }, {});
        setGroupedMembers(sortedGrouped);
    }, [allMembers, filterFuncao, filterStatus, getMemberFunctionNames]);

    const totalMembers = useMemo(() => {
        return Object.values(groupedMembers).reduce((acc, curr) => acc + curr.length, 0);
    }, [groupedMembers]);

    const calculateAge = (dateString) => {
        if (!dateString) return '-';
        const today = new Date();
        const birthDate = new Date(dateString + 'T00:00:00');
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handleGeneratePDF = async () => {
        const doc = new jsPDF();
        const logoUrl = 'https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
        try {
            const logoData = await getBase64Image(logoUrl);
            if (logoData) doc.addImage(logoData, 'PNG', 15, 15, 20, 20);
        } catch (e) { console.warn(e); }
        
        doc.setFontSize(14);
        doc.setTextColor(21, 128, 61); 
        doc.text("IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text("LEROLÂNDIA", 105, 28, { align: "center" });
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61);
        doc.text("RELATÓRIO DE MEMBROS POR FUNÇÃO", 105, 38, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const statusLabelFunc = filterStatus === 'todos' ? 'Todos os Status' : (filterStatus === 'ATIVO' ? 'Ativos' : 'Inativos');
        doc.text(`Status: ${statusLabelFunc}`, 105, 44, { align: "center" });

        let finalY = 50;
        Object.entries(groupedMembers).forEach(([funcaoName, members]) => {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setFillColor(220, 252, 231);
            doc.rect(14, finalY, 182, 8, 'F');
            doc.setTextColor(20, 83, 45);
            doc.text(`${funcaoName} (${members.length})`, 16, finalY + 6);
            finalY += 10;

            const rows = members.map(m => [
                m.nome_completo,
                m.data_nascimento ? new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
                calculateAge(m.data_nascimento),
                m.status || 'ATIVO'
            ]);

            autoTable(doc, {
                head: [["Nome", "Nascimento", "Idade", "Status"]],
                body: rows,
                startY: finalY,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [34, 197, 94] },
                margin: { left: 14, right: 14 }
            });
            finalY = doc.lastAutoTable.finalY + 10;
        });
        doc.save("Relatorio_Funcoes.pdf");
    };

    const handleExportExcel = () => {
        const data = [];
        Object.entries(groupedMembers).forEach(([funcao, members]) => {
            members.forEach(m => {
                data.push({ Funcao: funcao, Nome: m.nome_completo, Idade: calculateAge(m.data_nascimento), Status: m.status || 'ATIVO' });
            });
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Funcoes");
        XLSX.writeFile(wb, "Membros_Funcoes.xlsx");
    };

    return (
        <div className="dark-igreja text-foreground h-full flex flex-col">
            <style>{`
                @media print {
                    @page { margin: 1cm; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; color: black !important; }
                    .header-logo { width: 80px; height: 80px; object-fit: contain; display: block; margin: 0 auto; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
                    th { background: #dcfce7 !important; color: #14532d !important; border-bottom: 2px solid #86efac; padding: 4px; }
                    td { border-bottom: 1px solid #e2e8f0; padding: 4px; }
                }
                .print-only { display: none; }
            `}</style>

            <div className="space-y-6 no-print flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png" alt="Logo" className="w-16 h-16 object-contain" />
                         <div>
                            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Membros por Função</h2>
                            <p className="text-muted-foreground">Relatório agrupado de membros por função exercida.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-36 bg-background border-input font-bold"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent className="dark-igreja">
                                <SelectItem value="todos" className="font-bold">Todos</SelectItem>
                                <SelectItem value="ATIVO" className="font-bold text-green-500">Ativos</SelectItem>
                                <SelectItem value="INATIVO" className="font-bold text-red-500">Inativos</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                            <SelectTrigger className="w-[180px] bg-background border-input"><SelectValue placeholder="Filtrar Função" /></SelectTrigger>
                            <SelectContent className="dark-igreja max-h-[200px]">
                                <SelectItem value="todos">Todas as Funções</SelectItem>
                                {funcoes.map(f => <SelectItem key={f.id} value={f.nome_funcao}>{f.nome_funcao}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="w-4 h-4 mr-2"/> Excel</Button>
                        <Button variant="outline" size="sm" onClick={handleGeneratePDF}><FileText className="w-4 h-4 mr-2"/> PDF</Button>
                        <Button variant="default" size="sm" onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700"><Printer className="w-4 h-4 mr-2"/> Imprimir</Button>
                    </div>
                </div>

                <Card className="flex-1 bg-card border-border backdrop-blur-sm overflow-hidden flex flex-col shadow-xl">
                    <CardContent className="p-0 h-full">
                        <ScrollArea className="h-[calc(100vh-220px)] p-6">
                            {loading ? (
                                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-green-500" /></div>
                            ) : (
                                <div className="space-y-8 max-w-5xl mx-auto pb-10">
                                    {Object.entries(groupedMembers).map(([funcaoName, members]) => (
                                        <motion.div 
                                            key={funcaoName}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                                        >
                                            <div className="bg-secondary/50 px-5 py-3 border-b border-border flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <BookUser className="w-5 h-5 text-green-400" />
                                                    <h3 className="font-bold text-lg">{funcaoName}</h3>
                                                </div>
                                                <Badge variant="secondary">{members.length} membros</Badge>
                                            </div>
                                            <div className="divide-y divide-border">
                                                {members.map((member, idx) => (
                                                    <div key={member.id} className="px-5 py-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-green-900/20 text-green-300 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                                            <span className="font-medium">{member.nome_completo}</span>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{calculateAge(member.data_nascimento)} anos</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div className="mt-8 p-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-center shadow-lg text-white">
                                        <p className="text-green-100 text-sm uppercase tracking-wider font-medium mb-1">Total Geral</p>
                                        <span className="font-bold text-3xl">{totalMembers} Membros Listados</span>
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            
            <div className="print-only p-6 bg-white text-black max-w-[297mm] mx-auto">
                <div className="flex flex-col items-center mb-8 border-b-2 border-green-800 pb-4">
                    <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png" alt="Logo" className="header-logo mb-2" />
                    <h1 className="text-xl font-extrabold text-green-900 uppercase text-center">IGREJA ASSEMBLEIA DE DEUS</h1>
                    <h3 className="text-lg font-bold text-green-800 uppercase text-center mt-2">RELATÓRIO DE MEMBROS POR FUNÇÃO</h3>
                    <h4 className="text-md font-bold text-green-700 uppercase text-center mt-1">STATUS: {filterStatus === 'todos' ? 'TODOS' : filterStatus}</h4>
                </div>
                {Object.entries(groupedMembers).map(([funcaoName, members]) => (
                    <div key={funcaoName} className="mb-6 break-inside-avoid">
                        <div className="flex justify-between border-b-2 border-green-300 mb-2 bg-green-50 px-2 pt-2">
                            <h4 className="font-bold text-green-900">{funcaoName}</h4>
                            <span className="text-xs font-bold">Qtd: {members.length}</span>
                        </div>
                        <table>
                            <thead><tr><th className="w-[55%]">NOME</th><th className="w-[18%] text-center">NASCIMENTO</th><th className="w-[12%] text-center">IDADE</th><th className="w-[15%] text-center">STATUS</th></tr></thead>
                            <tbody>
                                {members.map((m, idx) => (
                                    <tr key={m.id} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                                        <td className="pl-2">{m.nome_completo}</td>
                                        <td className="text-center">{m.data_nascimento ? new Date(m.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="text-center">{calculateAge(m.data_nascimento)}</td>
                                        <td className="text-center font-bold">{m.status || 'ATIVO'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConsultaMembrosFuncaoRelatorio;