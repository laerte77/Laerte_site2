import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingDown, Loader2, Trash, Search, Download, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split('T')[0];
        const [y, m, d] = datePart.split('-');
        return `${d}/${m}/${y}`;
    } catch (e) {
        return dateString;
    }
};

const LancamentoDespesas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [lancamentos, setLancamentos] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [editingId, setEditingId] = useState(null);

    const initialFormData = { data: format(new Date(), 'yyyy-MM-dd'), tipo_despesa_id: '', valor: '', descricao: '' };
    const [formData, setFormData] = useState(initialFormData);

    const availableYears = useMemo(() => {
        const years = lancamentos.map(d => {
            if (!d.data) return new Date().getFullYear();
            return Number(d.data.split('T')[0].split('-')[0]);
        });
        years.push(new Date().getFullYear());
        return [...new Set(years)].sort((a, b) => b - a);
    }, [lancamentos]);

    const fetchData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [resTipos, resLancamentos] = await Promise.all([
                supabase.from('barbearia_tipos_despesa').select('id, nome').eq('user_id', user.id).order('nome'),
                supabase.from('barbearia_lancamentos_despesas').select('*, barbearia_tipos_despesa(nome)').eq('user_id', user.id).order('data', { ascending: false })
            ]);
            setTiposDespesa(resTipos.data || []); 
            setLancamentos(resLancamentos.data || []);
        } catch (error) { console.error(error); } finally { setLoadingData(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    const filteredLancamentos = useMemo(() => {
        return lancamentos.filter(item => {
            if (!item.data) return false;
            const [y, m] = item.data.split('T')[0].split('-');
            const mMatch = selectedMonth === 'all' || (Number(m) - 1).toString() === selectedMonth;
            const yMatch = selectedYear === 'all' || y === selectedYear;
            const sMatch = !searchTerm || 
                item.barbearia_tipos_despesa?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
            return mMatch && yMatch && sMatch;
        });
    }, [lancamentos, selectedMonth, selectedYear, searchTerm]);

    const totalPeriodo = filteredLancamentos.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

    const openDialog = (item = null) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                data: item.data,
                tipo_despesa_id: item.tipo_despesa_id,
                valor: item.valor,
                descricao: item.descricao || ''
            });
        } else {
            setEditingId(null);
            setFormData(initialFormData);
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.data || !formData.tipo_despesa_id || !formData.valor) { 
            toast({ title: 'Atenção', description: 'Preencha os campos obrigatórios.', variant: 'destructive' }); return; 
        }
        setSaving(true);
        const payload = { ...formData, valor: parseFloat(formData.valor)||0, user_id: user.id };
        try {
            if (editingId) {
                await supabase.from('barbearia_lancamentos_despesas').update(payload).eq('id', editingId);
                toast({ title: 'Sucesso', description: 'Despesa atualizada!' });
            } else {
                await supabase.from('barbearia_lancamentos_despesas').insert(payload);
                toast({ title: 'Sucesso', description: 'Despesa registrada!' }); 
            }
            setFormData(prev => ({...initialFormData, data: prev.data}));
            setEditingId(null);
            fetchData();
        } catch (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } 
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        await supabase.from('barbearia_lancamentos_despesas').delete().eq('id', id);
        fetchData(); toast({ title: 'Excluído' });
    };

    const handleExport = () => {
        if (filteredLancamentos.length === 0) {
            toast({ title: 'Aviso', description: 'Nenhum dado para exportar.', variant: 'destructive' });
            return;
        }
        const dataToExport = filteredLancamentos.map(item => ({
            'DATA': formatDateDisplay(item.data),
            'CATEGORIA': item.barbearia_tipos_despesa?.nome || '-',
            'DESCRIÇÃO': item.descricao || '-',
            'VALOR': parseFloat(item.valor)
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");
        XLSX.writeFile(workbook, `Despesas_Barbearia_${meses[selectedMonth]}_${selectedYear}.xlsx`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 py-8 dark-barbearia">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-red-500">Saídas e Despesas</h1>
                  <p className="text-muted-foreground mt-1 text-lg">Registre os gastos da barbearia.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button onClick={handleExport} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Exportar
                    </Button>
                    <Button onClick={() => openDialog()} className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors font-bold">
                        <Plus className="w-4 h-4 mr-2" /> Nova Despesa
                    </Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(!o) setIsDialogOpen(false); }}>
                <DialogContent className="dark-barbearia bg-card border-red-500/50 text-foreground sm:max-w-[450px]">
                    <DialogHeader><DialogTitle className="text-2xl text-red-500 flex items-center gap-2"><TrendingDown className="w-6 h-6"/> {editingId ? 'Editar' : 'Lançar'} Despesa</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData({...formData, data:e.target.value})} className="bg-input border-border text-foreground" /></div>
                            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData({...formData, valor:e.target.value})} className="bg-input border-border text-foreground" placeholder="0.00" /></div>
                        </div>
                        <div><Label>Categoria *</Label><Select value={formData.tipo_despesa_id} onValueChange={v=>setFormData({...formData, tipo_despesa_id:v})}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent className="dark-barbearia bg-card"><ScrollArea className="h-48">{tiposDespesa.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
                        <div><Label>Descrição / Observação</Label><textarea value={formData.descricao} onChange={e=>setFormData({...formData, descricao:e.target.value})} className="w-full bg-input border border-border text-foreground p-3 rounded-md mt-1 min-h-[100px] outline-none resize-none" placeholder="Opcional..." /></div>
                    </div>
                    <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={()=>setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold flex-1">{saving?<Loader2 className="animate-spin w-4 h-4"/>:"Salvar"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-4">
              <Card className="col-span-1 md:col-span-3 shadow-md border-border rounded-2xl bg-card">
                <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 flex-1 w-full relative">
                    <Search className="w-5 h-5 text-muted-foreground absolute left-3" />
                    <Input placeholder="Buscar por categoria ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 pl-10 bg-input h-12 text-base text-foreground"/>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[150px] bg-input h-12 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="dark-barbearia bg-card"><SelectItem value="all">Todos os Meses</SelectItem>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()}>{meses[i]}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[110px] bg-input h-12 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="dark-barbearia bg-card"><SelectItem value="all">Todos os Anos</SelectItem>{availableYears.map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20 shadow-md rounded-2xl flex flex-col justify-center">
                <CardHeader className="pb-1 pt-5"><CardTitle className="text-sm font-semibold text-red-500 uppercase tracking-wide">Total Filtrado</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-black text-red-500 truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPeriodo)}</div></CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-border rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader className="bg-secondary/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="py-4 pl-6 font-semibold">Data</TableHead>
                                  <TableHead className="py-4 font-semibold">Categoria</TableHead>
                                  <TableHead className="py-4 font-semibold">Descrição</TableHead>
                                  <TableHead className="text-right py-4 font-semibold">Valor</TableHead>
                                  <TableHead className="text-center w-[120px] py-4 pr-6 font-semibold">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (<tr><td colSpan="5" className="text-center py-16 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" /></td></tr>) : filteredLancamentos.length === 0 ? (<tr><td colSpan="5" className="text-center py-16 text-muted-foreground">Nenhum registro encontrado.</td></tr>) : (
                                    filteredLancamentos.map((item) => (
                                        <TableRow key={item.id} className="border-b border-border hover:bg-secondary/50 transition-colors duration-200">
                                            <TableCell className="font-medium pl-6 py-4">{formatDateDisplay(item.data)}</TableCell>
                                            <TableCell className="py-4 font-medium text-foreground">{item.barbearia_tipos_despesa?.nome}</TableCell>
                                            <TableCell className="py-4 text-muted-foreground">{item.descricao || '-'}</TableCell>
                                            <TableCell className="text-right font-bold text-red-500 py-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</TableCell>
                                            <TableCell className="text-center pr-6 py-4">
                                              <div className="flex items-center justify-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-full" onClick={() => openDialog(item)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"><Trash className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                  <AlertDialogContent className="dark-barbearia bg-card border-border">
                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader>
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
export default LancamentoDespesas;