import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, CalendarCheck, Search, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';
import * as XLSX from 'xlsx';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

const LancamentoDespesaPrevista = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    const [despesas, setDespesas] = useState([]);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFilters, setExportFilters] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
    const [currentDespesa, setCurrentDespesa] = useState(null);
    const initialFormState = { vencimento: '', despesa: '', valor: '', forma_pagamento: '', parcelas: 1, status: 'PENDENTE' };
    const [formData, setFormData] = useState(initialFormState);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [despesasRes, tiposRes] = await Promise.all([
                supabase.from('igreja_despesas_previstas').select('*').eq('user_id', user.id).order('vencimento', { ascending: true }),
                supabase.from('igreja_tipos_despesa').select('id, despesa').eq('user_id', user.id),
            ]);
            if (despesasRes.error) throw despesasRes.error; setDespesas(despesasRes.data);
            if (tiposRes.error) throw tiposRes.error; setTiposDespesa(tiposRes.data);
        } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } finally { setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('igreja_despesas_previstas_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_despesas_previstas' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const resetForm = () => { setFormData(initialFormState); setCurrentDespesa(null); };

    const handleSave = async () => {
        if (!formData.vencimento || !formData.despesa || !formData.valor || !formData.forma_pagamento) { toast({ title: 'Erro', description: 'Preencha os campos obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, parcelas: formData.forma_pagamento === 'CARTÃO DE CRÉDITO' ? formData.parcelas : null };
        try {
            if (currentDespesa) { await supabase.from('igreja_despesas_previstas').update(dataToSave).eq('id', currentDespesa.id); toast({ title: 'Sucesso', description: 'Atualizada.' }); } else { await supabase.from('igreja_despesas_previstas').insert(dataToSave); toast({ title: 'Sucesso', description: 'Registrada.' }); }
            resetForm();
        } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); }
    };

    const openDialog = (item = null) => { if (item) { setCurrentDespesa(item); setFormData({ ...item, parcelas: item.parcelas || 1 }); } else { resetForm(); } setIsDialogOpen(true); };

    const handleDelete = async () => { if (!itemToDelete) return; try { await supabase.from('igreja_despesas_previstas').delete().eq('id', itemToDelete.id); toast({ title: 'Removida' }); setItemToDelete(null); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } };

    const getStatusIcon = (status) => { switch (status) { case 'PAGO': return <CheckCircle className="w-5 h-5 text-green-500" />; case 'PENDENTE': return <Clock className="w-5 h-5 text-yellow-500" />; case 'VENCIDO': return <XCircle className="w-5 h-5 text-red-500" />; default: return null; } };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between"><div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">Despesas Previstas</h2></div><div className="flex gap-2"><Button onClick={() => setIsExportOpen(true)} variant="outline"><Download className="w-4 h-4 mr-2" /> Exportar</Button><Button onClick={() => setIsSearchModalOpen(true)} variant="outline"><Search className="w-4 h-4 mr-2" />Buscar</Button><Button onClick={() => openDialog()} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nova</Button></div></div>
                <div className="bg-card/80 border border-border rounded-xl shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="p-4 text-left font-semibold">Vencimento</th><th className="p-4 text-left font-semibold">Tipo</th><th className="p-4 text-left font-semibold">Pagamento</th><th className="p-4 text-right font-semibold">Valor</th><th className="p-4 text-center font-semibold">Status</th><th className="p-4 text-right font-semibold">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : despesas.length === 0 ? <tr><td colSpan="6" className="p-8 text-center"><CalendarCheck className="mx-auto w-10 h-10 mb-2 opacity-50" />Nenhuma despesa.</td></tr> : despesas.map((item) => (<tr key={item.id} className="border-b border-border hover:bg-accent/50"><td className="p-4">{new Date(item.vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4">{item.despesa}</td><td className="p-4">{item.forma_pagamento}{item.forma_pagamento === 'CARTÃO DE CRÉDITO' && item.parcelas > 1 ? ` (${item.parcelas}x)` : ''}</td><td className="p-4 text-red-400 text-right">R$ {parseFloat(item.valor).toFixed(2)}</td><td className="p-4 flex justify-center">{getStatusIcon(item.status)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-primary" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>))}</tbody></table></div></div>
            </motion.div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => { openDialog(item); setIsSearchModalOpen(false); }} tableName="igreja_despesas_previstas" searchField="despesa" displayFields={[{ key: 'vencimento', label: 'Venc', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'despesa', label: 'Tipo' }, { key: 'valor', label: 'Valor' }]} title="Buscar" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="dark-igreja bg-card border-border text-foreground"><DialogHeader><DialogTitle className="text-primary">{currentDespesa ? 'Editar' : 'Nova'} Despesa</DialogTitle></DialogHeader><div className="py-4 space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Vencimento</Label><Input type="date" value={formData.vencimento} onChange={e => setFormData({ ...formData, vencimento: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-input" /></div></div><div><Label>Tipo</Label><Select value={formData.despesa} onValueChange={v => setFormData({ ...formData, despesa: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card igreja-select-hover"><ScrollArea className="h-48">{[...tiposDespesa].sort((a, b) => a.despesa.localeCompare(b.despesa, 'pt-BR')).map(t => <SelectItem key={t.id} value={t.despesa}>{t.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>Pagamento</Label><Select value={formData.forma_pagamento} onValueChange={v => setFormData({ ...formData, forma_pagamento: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card igreja-select-hover"><SelectItem value="DINHEIRO">Dinheiro</SelectItem><SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem><SelectItem value="CARTÃO DE DÉBITO">Cartão de Débito</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="BOLETO">Boleto</SelectItem></SelectContent></Select></div>{formData.forma_pagamento === 'CARTÃO DE CRÉDITO' && (<div><Label>Parcelas</Label><Input type="number" value={formData.parcelas} onChange={e => setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })} min="1" className="bg-input" /></div>)}</div><div><Label>Status</Label><Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card igreja-select-hover"><SelectItem value="PENDENTE">Pendente</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="VENCIDO">Vencido</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button><Button onClick={handleSave} className="bg-primary text-primary-foreground">Salvar</Button></DialogFooter></DialogContent>
            </Dialog>
            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}><DialogContent className="dark-igreja bg-card border-border text-foreground"><DialogHeader><DialogTitle className="text-primary">Exportar</DialogTitle></DialogHeader><div className="py-4 grid grid-cols-2 gap-4"><div><Label>Mês</Label><Select value={String(exportFilters.month)} onValueChange={v => setExportFilters(prev => ({ ...prev, month: Number(v) }))}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card igreja-select-hover"><ScrollArea className="h-48">{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div><Label>Ano</Label><Select value={String(exportFilters.year)} onValueChange={v => setExportFilters(prev => ({ ...prev, year: Number(v) }))}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card igreja-select-hover">{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancelar</Button><Button onClick={() => setIsExportOpen(false)} className="bg-primary text-primary-foreground">Exportar</Button></DialogFooter></DialogContent></Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};
export default LancamentoDespesaPrevista;