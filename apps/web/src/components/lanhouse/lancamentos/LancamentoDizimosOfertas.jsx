import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Coins as HandCoins, Search, Download } from 'lucide-react';
import { format, parse, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';
import * as XLSX from 'xlsx';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const LancamentoDizimosOfertas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    
    const [lancamentos, setLancamentos] = useState([]);
    const [filteredLancamentos, setFilteredLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFilters, setExportFilters] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
    
    const [currentLancamentoId, setCurrentLancamentoId] = useState(null);
    const initialFormState = { data: format(new Date(), 'yyyy-MM-dd'), valor: '', tipo_movimento: '' };
    const [formData, setFormData] = useState(initialFormState);

    const tiposMovimento = ['DÍZIMO', 'OFERTA', 'VOTO'];

    const availableYears = useMemo(() => {
      const years = lancamentos.map(d => new Date(d.data).getFullYear());
      years.push(new Date().getFullYear());
      return [...new Set(years)].sort((a, b) => b - a);
    }, [lancamentos]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('lm_dizimos_ofertas').select('*').eq('user_id', user.id).order('data', { ascending: false });
            if (!isMountedRef.current) return;
            if (error) throw error;
            setLancamentos(data || []);
        } catch (error) {
            if (!isMountedRef.current) return;
            toast({ title: 'Erro ao buscar lançamentos', variant: 'destructive', description: error.message });
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        if (!user) return;
        const channel = supabase.channel('lm_dizimos_ofertas_changes_v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_dizimos_ofertas' }, () => { if(isMountedRef.current) fetchData(); })
            .subscribe();
        return () => { isMountedRef.current = false; supabase.removeChannel(channel); }
    }, [user, fetchData]);

    useEffect(() => {
        let results = lancamentos;
        if (selectedYear !== 'all') results = results.filter(item => getYear(new Date(item.data)).toString() === selectedYear);
        if (selectedMonth !== 'all') results = results.filter(item => getMonth(new Date(item.data)).toString() === selectedMonth);
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            results = results.filter(item => item.tipo_movimento?.toLowerCase().includes(search));
        }
        setFilteredLancamentos(results);
    }, [searchTerm, selectedMonth, selectedYear, lancamentos]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.data || !formData.valor || !formData.tipo_movimento) {
            toast({ title: 'Erro', description: 'Todos os campos são obrigatórios.', variant: 'destructive' });
            return;
        }
        const dataToSave = { ...formData, user_id: user.id, valor: Number(formData.valor) };

        try {
            if (currentLancamentoId) {
                const { error } = await supabase.from('lm_dizimos_ofertas').update(dataToSave).eq('id', currentLancamentoId);
                if (error) throw error;
                toast({ title: 'Sucesso', description: `Lançamento atualizado.` });
                setCurrentLancamentoId(null);
                // Keep modal open, just clear id
            } else {
                const { error } = await supabase.from('lm_dizimos_ofertas').insert(dataToSave);
                if (error) throw error;
                toast({ title: 'Sucesso', description: `Lançamento registrado.` });
            }
            setFormData(prev => ({ ...initialFormState, data: prev.data }));
            setCurrentLancamentoId(null);
            fetchData();
        } catch (error) {
            toast({ title: 'Erro ao salvar', variant: 'destructive', description: error.message });
        }
    };

    const openDialog = (item = null) => {
        if (item) {
            setCurrentLancamentoId(item.id);
            setFormData({
                data: item.data || format(new Date(), 'yyyy-MM-dd'),
                valor: item.valor || '',
                tipo_movimento: item.tipo_movimento || '',
            });
        } else {
            setCurrentLancamentoId(null);
            setFormData(initialFormState);
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setCurrentLancamentoId(null);
        setFormData(initialFormState);
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase.from('lm_dizimos_ofertas').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Removido', description: 'Lançamento removido.' });
            fetchData();
        } catch (error) {
            toast({ title: 'Erro ao remover', variant: 'destructive', description: error.message });
        }
    };

    const handleExport = () => {
        const filteredData = lancamentos.filter(item => {
            const itemDate = new Date(item.data);
            return itemDate.getMonth() === exportFilters.month && itemDate.getFullYear() === exportFilters.year;
        });

        if (filteredData.length === 0) {
            toast({ title: 'Nenhum dado para exportar', description: 'Não há registros para o período selecionado.', variant: 'destructive' });
            return;
        }
        
        const dataToExport = filteredData.map(item => ({
            'DATA': new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            'TIPO': item.tipo_movimento,
            'VALOR': parseFloat(item.valor)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dizimos e Ofertas");
        XLSX.writeFile(workbook, `Dizimos_Ofertas_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`);
        setIsExportOpen(false);
    };

    const totalPeriodo = useMemo(() => filteredLancamentos.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0), [filteredLancamentos]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Dízimos e Ofertas</h1>
                  <p className="text-muted-foreground mt-1 text-lg">Registre e gerencie as contribuições.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setIsExportOpen(true)} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors"><Download className="w-4 h-4 mr-2" />Exportar</Button>
                    <Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors"><Search className="w-4 h-4 mr-2" />Selecionar</Button>
                    <Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground shadow-md transition-colors"><Plus className="w-4 h-4 mr-2" /> Nova Oferta</Button>
                </div>
            </div>

            <Dialog open={isExportOpen} onOpenChange={(o) => { if(o) setIsExportOpen(true); }}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="dark-lm-impressoes bg-card border-border text-foreground z-[100]">
                    <DialogHeader><DialogTitle className="text-cyan-400">Exportar Dízimos e Ofertas</DialogTitle><DialogDescription>Selecione o mês e o ano para exportar.</DialogDescription></DialogHeader>
                    <div className="py-4 grid grid-cols-2 gap-4">
                        <div><Label>Mês</Label><Select value={String(exportFilters.month)} onValueChange={v => setExportFilters(prev => ({ ...prev, month: Number(v) }))}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent className="z-[200]"><ScrollArea className="h-48">{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
                        <div><Label>Ano</Label><Select value={String(exportFilters.year)} onValueChange={v => setExportFilters(prev => ({ ...prev, year: Number(v) }))}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent className="z-[200]">{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancelar</Button><Button onClick={handleExport} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">Exportar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => { openDialog(item); setIsSearchModalOpen(false); }} tableName="lm_dizimos_ofertas" searchField="tipo_movimento" displayFields={[{ key: 'data', label: 'Data', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'tipo_movimento', label: 'Tipo' }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Lançamento" />

            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(!o) closeDialog(); }}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="dark-lm-impressoes bg-card border-cyan-500/20 text-foreground z-[100]">
                    <DialogHeader><DialogTitle className="text-cyan-400">{currentLancamentoId ? 'Editar' : 'Novo'} Lançamento</DialogTitle><DialogDescription>Preencha os dados da contribuição.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-background text-foreground" required /></div>
                            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-background text-foreground" placeholder="0,00" required /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Movimento</Label>
                            <Select value={formData.tipo_movimento} onValueChange={v => setFormData({ ...formData, tipo_movimento: v })} required>
                                <SelectTrigger className="bg-background text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent className="z-[200]">{tiposMovimento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button><Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">Salvar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-4">
              <Card className="col-span-1 md:col-span-3 shadow-md border-cyan-500/20 rounded-2xl">
                <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 flex-1 w-full relative">
                    <Search className="w-5 h-5 text-muted-foreground absolute left-3" />
                    <Input placeholder="Buscar por tipo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 pl-10 bg-background/50 h-12 text-base text-foreground"/>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[150px] bg-background/50 h-12 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todos os Meses</SelectItem>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[110px] bg-background/50 h-12 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todos os Anos</SelectItem>{availableYears.map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 shadow-md rounded-2xl flex flex-col justify-center">
                <CardHeader className="pb-1 pt-5"><CardTitle className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Total Filtrado</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-black text-cyan-400 truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPeriodo)}</div></CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-cyan-500/20 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader className="bg-card/50 sticky top-0 z-10 backdrop-blur-sm border-b border-cyan-500/20">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="py-4 pl-6 font-semibold">Data</TableHead>
                                  <TableHead className="py-4 font-semibold">Tipo</TableHead>
                                  <TableHead className="text-right py-4 font-semibold">Valor</TableHead>
                                  <TableHead className="text-center w-[120px] py-4 pr-6 font-semibold">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (<tr><td colSpan="4" className="text-center py-16 text-muted-foreground">Carregando...</td></tr>) : filteredLancamentos.length === 0 ? (<tr><td colSpan="4" className="text-center py-16 text-muted-foreground"><HandCoins className="mx-auto w-10 h-10 mb-2" />Nenhum lançamento registrado neste período.</td></tr>) : (
                                    filteredLancamentos.map((item) => (
                                        <TableRow key={item.id} className="border-b border-cyan-500/10 hover:bg-blue-500/10 transition-colors duration-200">
                                            <TableCell className="font-medium pl-6 py-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                            <TableCell className="py-4"><span className="font-semibold text-foreground">{item.tipo_movimento}</span></TableCell>
                                            <TableCell className="text-right font-bold text-yellow-400 py-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</TableCell>
                                            <TableCell className="text-center pr-6 py-4">
                                              <div className="flex items-center justify-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-full" onClick={() => openDialog(item)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                  <AlertDialogContent className="dark-lm-impressoes z-[150]">
                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este lançamento?</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default LancamentoDizimosOfertas;