import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, DollarSign, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';
import { exportToExcel } from '@/lib/ExportUtils';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

const LancamentoDespesas = () => {
    const { toast } = useToast();
    const { user, adminUser } = useAuth();
    const isMountedRef = useRef(true);
    const [allItems, setAllItems] = useState([]);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [currentItem, setCurrentItem] = useState(null);
    const initialFormState = { data: new Date().toISOString().split('T')[0], valor: '', despesa: '' };
    const [formData, setFormData] = useState(initialFormState);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userIdToFetch = adminUser?.id || user.id;
            const [despesasRes, tiposRes] = await Promise.all([
                supabase.from('igreja_despesas').select('*').eq('user_id', userIdToFetch).order('data', { ascending: false }),
                supabase.from('igreja_tipos_despesa').select('id, despesa').eq('user_id', userIdToFetch),
            ]);
            if (despesasRes.error) throw despesasRes.error; setAllItems(despesasRes.data || []);
            if (tiposRes.error) throw tiposRes.error; setTiposDespesa(tiposRes.data || []);
        } catch (error) { toast({ title: 'Erro', variant: 'destructive', description: error.message }); } finally { setLoading(false); }
    }, [user, adminUser, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('igreja_despesas_lanc_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_despesas' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            const itemDate = new Date(item.data);
            const monthMatch = selectedMonth === 'all' || itemDate.getUTCMonth() === parseInt(selectedMonth);
            const yearMatch = selectedYear === 'all' || itemDate.getUTCFullYear() === parseInt(selectedYear);
            const searchMatch = !searchTerm || item.despesa?.toLowerCase().includes(searchTerm.toLowerCase());
            return monthMatch && yearMatch && searchMatch;
        });
    }, [allItems, selectedMonth, selectedYear, searchTerm]);

    const totalPeriodo = filteredItems.reduce((acc, curr) => acc + Number(curr.valor), 0);

    const resetForm = () => { setFormData(initialFormState); setCurrentItem(null); };

    const handleSave = async () => {
        if (!formData.data || !formData.valor || !formData.despesa) { toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' }); return; }
        const dataToSave = { data: formData.data, valor: formData.valor, despesa: formData.despesa, user_id: adminUser?.id || user.id };
        try {
            if (currentItem) {
    const { error } = await supabase
        .from('igreja_despesas')
        .update(dataToSave)
        .eq('id', currentItem.id);

    if (error) throw error;

    toast({ title: 'Sucesso', description: 'Atualizada.' });
} else {
    const { error } = await supabase
        .from('igreja_despesas')
        .insert(dataToSave);

    if (error) throw error;

    toast({ title: 'Sucesso', description: 'Registrada.' });
}
            setFormData(initialFormState); setCurrentItem(null);
        } catch (error) { toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
    };

    const openDialog = (item = null) => { if (item) { setCurrentItem(item); setFormData({ data: item.data || '', valor: item.valor || '', despesa: item.despesa || '' }); } else { resetForm(); } setIsDialogOpen(true); };

    const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
        const { error } = await supabase
            .from('igreja_despesas')
            .delete()
            .eq('id', itemToDelete.id);

        if (error) throw error;

        toast({ title: 'Removido' });
        setItemToDelete(null);
    } catch (error) {
        toast({
            title: 'Erro',
            variant: 'destructive',
            description: error.message
        });
    }
};
    const handleExport = () => { if (filteredItems.length === 0) { toast({ title: 'Aviso', description: 'Nenhum dado.', variant: 'destructive' }); return; } const dataToExport = filteredItems.map(item => ({ 'Data': new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), 'Descrição': item.despesa, 'Valor': parseFloat(item.valor) })); exportToExcel(dataToExport, 'Lançamento_Despesas', 'Despesas'); };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-igreja space-y-6">
            <div className="glass-card overflow-hidden"><div className="bg-card border-b border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="p-3 bg-red-500/10 rounded-full border border-red-500/20"><DollarSign className="w-8 h-8 text-red-500" /></div><div><h1 className="text-2xl font-bold text-primary">Lançamento de Despesas</h1></div></div><div className="flex gap-2 flex-wrap"><Button onClick={handleExport} variant="outline"><Download className="w-4 h-4 mr-2" /> Excel</Button><Button onClick={() => setIsSearchModalOpen(true)} variant="outline"><Search className="w-4 h-4 mr-2" />Selecionar Registro</Button><Button onClick={() => openDialog()} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button></div></div></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6"><div className="lg:col-span-3 flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-input" /></div><div className="w-full md:w-48"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-igreja bg-card igreja-select-hover"><SelectItem value="all">Todos</SelectItem>{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select></div><div className="w-full md:w-32"><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-igreja bg-card igreja-select-hover"><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div></div><Card className="bg-card border-border"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-muted-foreground">Total</p><p className="text-2xl font-bold text-red-500 mt-1">R$ {totalPeriodo.toFixed(2)}</p></div></CardContent></Card></div>
            <div className="glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="4" className="p-8 text-center">Nenhum registro.</td></tr> : filteredItems.map((item) => (<tr key={item.id} className="border-b border-border hover:bg-secondary/50"><td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4">{item.despesa}</td><td className="p-4 text-right font-bold text-red-500">R$ {parseFloat(item.valor || 0).toFixed(2)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-primary" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-destructive" /></Button></td></tr>))}</tbody></table></div></div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => { openDialog(item); setIsSearchModalOpen(false); }} tableName="igreja_despesas" searchField="despesa" displayFields={[{ key: 'data', label: 'Data', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'despesa', label: 'Tipo' }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="dark-igreja bg-card border-border text-foreground">
                    <DialogHeader><DialogTitle className="text-primary">{currentItem ? 'Editar' : 'Nova'} Despesa</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-input" /></div></div><div><Label>Tipo</Label><Select value={formData.despesa} onValueChange={v => setFormData({ ...formData, despesa: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-igreja bg-card igreja-select-hover"><ScrollArea className="h-48">{[...tiposDespesa].sort((a, b) => a.despesa.localeCompare(b.despesa, 'pt-BR')).map(t => <SelectItem key={t.id} value={t.despesa}>{t.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div></div>
                    <DialogFooter><Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button><Button onClick={handleSave} className="bg-primary text-primary-foreground">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </motion.div>
    );
};
export default LancamentoDespesas;
