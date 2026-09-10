import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer, Users, BookOpen, Crown, Heart, Shield, Activity, Flame } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToExcel, generatePDF, printContent } from '@/lib/ExportUtils';

const RelatorioEstatistico = () => {
    const { toast } = useToast();
    const [stats, setStats] = useState({
        pastores: 0, evangelistas: 0, missionarios: 0, presbiteros: 0, 
        diaconos: 0, obreiros: 0, membros: 0, congregados: 0, 
        jovens: 0, criancas: 0, batizados: 0, casamentos: 0
    });
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ATIVO');

    const calculateAge = (dob) => {
        if (!dob) return 999; 
        const diff_ms = Date.now() - new Date(dob).getTime();
        const age_dt = new Date(diff_ms); 
        return Math.abs(age_dt.getUTCFullYear() - 1970);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: membros, error: memError } = await supabase
                .from('igreja_membros')
                .select(`id, data_nascimento, is_batizado_espirito, status, igreja_funcoes(nome_funcao), cargo:cargos_igreja(nome_cargo), classe:igreja_classes(nome_classe)`)
                .order('nome_completo', { ascending: true });
            if (memError) throw memError;

            const membrosFiltrados = (membros || []).filter(m =>
                filterStatus === 'todos' || (m.status || 'ATIVO') === filterStatus
            );

            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const { data: casamentos, error: casError } = await supabase
                .from('igreja_casamentos')
                .select('id, data')
                .gte('data', threeMonthsAgo.toISOString().split('T')[0]);
            if (casError) throw casError;

            let s = { pastores: 0, evangelistas: 0, missionarios: 0, presbiteros: 0, diaconos: 0, obreiros: 0, membros: 0, congregados: 0, jovens: 0, criancas: 0, batizados: 0, casamentos: casamentos?.length || 0 };

            (membrosFiltrados || []).forEach(m => {
                const func = m.igreja_funcoes?.nome_funcao?.toLowerCase() || '';
                const cargo = m.cargo?.nome_cargo?.toLowerCase() || '';
                const classe = m.classe?.nome_classe?.toLowerCase() || '';
                const age = calculateAge(m.data_nascimento);

                if (cargo.includes('pastor')) s.pastores++;
                if (cargo.includes('evangelista')) s.evangelistas++;
                if (cargo.includes('missionário') || cargo.includes('missionaria') || cargo.includes('missionária')) s.missionarios++;
                if (cargo.includes('presbítero') || cargo.includes('presbitero')) s.presbiteros++;
                if (cargo.includes('diácono') || cargo.includes('diacono')) s.diaconos++;
                if (func.includes('obreiro')) s.obreiros++;
                
                if (classe.includes('membro') || func.includes('membro')) s.membros++;
                if (classe.includes('congregado')) s.congregados++;
                if (classe.includes('congregado') && age < 30) s.jovens++;
                if (classe.includes('criança') || classe.includes('crianca') || age < 12) s.criancas++;
                if (m.is_batizado_espirito) s.batizados++;
            });

            setStats(s);
        } catch (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, filterStatus]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statsArray = [
        { label: 'Pastores', value: stats.pastores, icon: Crown, color: 'text-amber-500' },
        { label: 'Evangelistas', value: stats.evangelistas, icon: BookOpen, color: 'text-blue-500' },
        { label: 'Missionários', value: stats.missionarios, icon: Shield, color: 'text-indigo-500' },
        { label: 'Presbíteros', value: stats.presbiteros, icon: Users, color: 'text-green-500' },
        { label: 'Diáconos', value: stats.diaconos, icon: Users, color: 'text-emerald-500' },
        { label: 'Obreiros', value: stats.obreiros, icon: Activity, color: 'text-orange-500' },
        { label: 'Membros', value: stats.membros, icon: Users, color: 'text-primary' },
        { label: 'Congregados', value: stats.congregados, icon: Users, color: 'text-muted-foreground' },
        { label: 'Jovens Congregados', value: stats.jovens, icon: Users, color: 'text-pink-500' },
        { label: 'Crianças', value: stats.criancas, icon: Users, color: 'text-teal-500' },
        { label: 'Batizados E.S.', value: stats.batizados, icon: Flame, color: 'text-red-500' },
        { label: 'Casamentos (3m)', value: stats.casamentos, icon: Heart, color: 'text-rose-500' },
    ];

    const handleExportExcel = () => {
        const exportData = statsArray.map(s => ({ 'Categoria': s.label, 'Quantidade': s.value }));
        const statusLabel = filterStatus === 'todos' ? 'Todos' : (filterStatus === 'ATIVO' ? 'Ativos' : 'Inativos');
        exportToExcel(exportData, `Relatorio_Estatistico_${statusLabel}`, 'Estatisticas');
    };

    const handleGeneratePDF = () => {
        const statusLabel = filterStatus === 'todos' ? 'Todos' : (filterStatus === 'ATIVO' ? 'Ativos' : 'Inativos');
        const body = statsArray.map(s => [s.label, s.value.toString()]);
        generatePDF(`Relatório Estatístico (${statusLabel})`, ['Categoria', 'Quantidade'], body, 'relatorio_estatistico');
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Helmet><title>Relatório Estatístico | Secretaria</title></Helmet>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Relatório Estatístico</h1>
                    <p className="text-muted-foreground">Visão geral do corpo de membros e liderança.</p>
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
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print-content">
                    {statsArray.map((stat, i) => (
                        <Card key={i} className="bg-card glass-card">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RelatorioEstatistico;