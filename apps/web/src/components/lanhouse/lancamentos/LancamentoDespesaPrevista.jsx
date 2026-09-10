import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, CalendarClock, Search } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const LancamentoDespesaPrevista = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [despesas, setDespesas] = useState([]);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [currentDespesa, setCurrentDespesa] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    
    const initialFormState = { data_compra: new Date().toISOString().split('T')[0], descricao: '', data_vencimento: '', valor: '', forma_pagamento: '', parcelas: 1, categoria: '', status: 'Pendente' };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [despesasRes, tiposRes] = await Promise.all([
                supabase.from('lm_despesas_previstas').select('*').eq('user_id', user.id).order('data_vencimento', { ascending: false }),
                supabase.from('lm_despesas').select('despesa, categoria').eq('user_id', user.id).order('despesa', { ascending: true }),
            ]);
            if (despesasRes.error) throw despesasRes.error;
            setDespesas(despesasRes.data || []);
            if (tiposRes.error) throw tiposRes.error;
            setTiposDespesa(tiposRes.data || []);
        } catch (error) { toast({ title: 'Erro ao buscar dados', variant: 'destructive', description: error.message }); } finally { setLoading(false); }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('lm_despesas_previstas_changes_v4').on('postgres_changes', { event: '*', schema: 'public', table: 'lm_despesas_previstas' }, fetchData).on('postgres_changes', { event: '*', schema: 'public', table: 'lm_despesas' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => { setFormData(initialFormState); setCurrentDespesa(null); }

    const handleSave = async () => {
        if (!formData.descricao || !formData.data_vencimento || !formData.valor) { toast({ title: 'Erro', description: 'Descrição, vencimento e valor são obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, valor: Number(formData.valor), parcelas: formData.forma_pagamento === 'CARTÃO DE CRÉDITO' ? formData.parcelas : null };
        try {
            if (currentDespesa) {
                await supabase.from('lm_despesas_previstas').update(dataToSave).eq('id', currentDespesa.id);
                toast({ title: 'Sucesso!', description: 'Despesa prevista atualizada.' });
            } else {
                await supabase.from('lm_despesas_previstas').insert(dataToSave);
                toast({ title: 'Sucesso!', description: 'Despesa registrada.' });
            }
            resetForm();
            setIsDialogOpen(false);
        } catch (error) { toast({ title: 'Erro ao salvar', variant: 'destructive', description: error.message }); }
    };

    const openDialog = (despesa = null) => {
        if (despesa) { setCurrentDespesa(despesa); setFormData({ data_compra: despesa.data_compra || new Date().toISOString().split('T')[0], descricao: despesa.descricao || '', data_vencimento: despesa.data_vencimento || '', valor: despesa.valor || '', forma_pagamento: despesa.forma_pagamento || '', parcelas: despesa.parcelas || 1, categoria: despesa.categoria || '', status: despesa.status || 'Pendente' }); } else { resetForm(); }
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try { await supabase.from('lm_despesas_previstas').delete().eq('id', itemToDelete.id); toast({ title: 'Removido' }); setItemToDelete(null); } catch (error) { toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
    };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Despesas Previstas</h2><p className="text-muted-foreground">Gerencie contas a pagar.</p></div>
                    <div className="flex gap-2"><Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="text-cyan-400 border-cyan-400 hover:bg-cyan-400/10"><Search className="w-4 h-4 mr-2" />Selecionar</Button><Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nova Despesa</Button></div>
                </div>
                <div className="bg-card/80 backdrop-blur-sm border border-cyan-500/10 rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-cyan-500/10"><th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th><th className="p-4 text-left font-semibold text-muted-foreground">Vencimento</th><th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th><th className="p-4 text-left font-semibold text-muted-foreground">Pagamento</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                            <tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : despesas.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><CalendarClock className="mx-auto w-10 h-10 mb-2" />Nenhuma despesa.</td></tr> : despesas.map((despesa) => (
                                <tr key={despesa.id} className="border-b border-cyan-500/10 hover:bg-blue-500/10"><td className="p-4">{despesa.descricao}</td><td className="p-4">{format(new Date(despesa.data_vencimento), 'dd/MM/yyyy')}</td><td className="p-4"><Badge variant="outline" className="text-cyan-400">{despesa.categoria || 'OUTROS'}</Badge></td><td className="p-4">{despesa.forma_pagamento}</td><td className="p-4 text-right font-semibold text-cyan-400">R$ {parseFloat(despesa.valor).toFixed(2)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(despesa)}><Edit className="w-4 h-4 text-cyan-400" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(despesa)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(i) => openDialog(i)} tableName="lm_despesas_previstas" searchField="descricao" displayFields={[{ key: 'descricao', label: 'Descrição' }, { key: 'data_vencimento', label: 'Vencimento', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Despesa Prevista" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-lg bg-card border-cyan-500/20 text-foreground">
                    <DialogHeader><DialogTitle className="text-cyan-400">{currentDespesa ? 'Editar' : 'Nova'} Despesa Prevista</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Descrição</Label><Select value={formData.descricao} onValueChange={(v) => { const c = tiposDespesa.find(d => d.despesa === v); setFormData(p => ({ ...p, descricao: v, categoria: c?.categoria || '' })); }}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map(d => <SelectItem key={d.despesa} value={d.despesa}>{d.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div><Label>Categoria</Label><Input value={formData.categoria} readOnly disabled className="bg-muted text-muted-foreground" /></div><div><Label>Data Compra</Label><Input type="date" value={formData.data_compra} onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })} className="bg-input" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Vencimento</Label><Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} className="bg-input" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Pagamento</Label><Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BOLETO">Boleto</SelectItem><SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="DINHEIRO">Dinheiro</SelectItem></SelectContent></Select></div><div><Label>Parcelas</Label><Input type="number" value={formData.parcelas} onChange={(e) => setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })} min="1" disabled={formData.forma_pagamento !== 'CARTÃO DE CRÉDITO'} className="bg-input" /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button><Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="bg-card border-cyan-500/20"><AlertDialogHeader><AlertDialogTitle className="text-cyan-400">Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};

export default LancamentoDespesaPrevista;