import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, CalendarClock, Search, AlertTriangle } from 'lucide-react';
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
import { format, isSameMonth, parseISO } from 'date-fns';
import { normalizeString } from '@/lib/gastoRealUtils';

const DespesaPrevista = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [despesas, setDespesas] = useState([]);
    const [tiposDespesa, setTiposDespesa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [currentDespesa, setCurrentDespesa] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const isMounted = useRef(true);
    const initialFormState = { data_compra: new Date().toISOString().split('T')[0], descricao: '', data_vencimento: '', valor: '', forma_pagamento: 'Boleto', parcelas: 1, categoria: '', status: 'Pendente' };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [despesasRes, tiposRes] = await Promise.all([
                supabase.from('despesas_previstas').select('*').eq('user_id', user.id).order('data_vencimento', { ascending: false }),
                supabase.from('tipos_despesa').select('nome_despesa, categoria').eq('user_id', user.id).order('nome_despesa', { ascending: true }),
            ]);
            if (!isMounted.current) return;
            if (despesasRes.error) throw despesasRes.error;
            setDespesas(despesasRes.data || []);
            if (tiposRes.error) throw tiposRes.error;
            setTiposDespesa(tiposRes.data || []);
        } catch (error) { if (isMounted.current) toast({ title: 'Erro ao buscar dados', variant: 'destructive', description: error.message }); } finally { if (isMounted.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('despesas_previstas_changes_v1').on('postgres_changes', { event: '*', schema: 'public', table: 'despesas_previstas' }, fetchData).on('postgres_changes', { event: '*', schema: 'public', table: 'tipos_despesa' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    useEffect(() => {
        if (formData.descricao && formData.data_vencimento && !currentDespesa) {
            const normalizedNewDesc = normalizeString(formData.descricao);
            const targetDate = parseISO(formData.data_vencimento);
            const possibleDuplicate = despesas.find(d => {
                const existingDate = parseISO(d.data_vencimento);
                const normalizedExistingDesc = normalizeString(d.descricao);
                return normalizedNewDesc === normalizedExistingDesc && isSameMonth(targetDate, existingDate);
            });
            if (possibleDuplicate) setDuplicateWarning(`Atenção: Já existe uma despesa "${possibleDuplicate.descricao}" vencendo em ${format(parseISO(possibleDuplicate.data_vencimento), 'dd/MM/yyyy')}.`);
            else setDuplicateWarning(null);
        } else { setDuplicateWarning(null); }
    }, [formData.descricao, formData.data_vencimento, despesas, currentDespesa]);

    const resetForm = () => { setFormData(initialFormState); setCurrentDespesa(null); setDuplicateWarning(null); }

    const handleSave = async () => {
        if (!formData.descricao || !formData.data_vencimento || !formData.valor) { toast({ title: 'Erro', description: 'Descrição, vencimento e valor são obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, valor: Number(formData.valor), parcelas: formData.forma_pagamento === 'Cartão' ? formData.parcelas : null };
        try {
            if (currentDespesa) {
                const { error } = await supabase.from('despesas_previstas').update(dataToSave).eq('id', currentDespesa.id);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Atualizada.' });
            } else {
                const { error } = await supabase.from('despesas_previstas').insert(dataToSave);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Registrada.' });
            }
            resetForm();
        } catch (error) { toast({ title: 'Erro ao salvar', variant: 'destructive', description: error.message }); }
    };

    const openDialog = (despesa = null) => {
        if (despesa) { setCurrentDespesa(despesa); setFormData({ data_compra: despesa.data_compra || new Date().toISOString().split('T')[0], descricao: despesa.descricao || '', data_vencimento: despesa.data_vencimento || '', valor: despesa.valor || '', forma_pagamento: despesa.forma_pagamento || 'Boleto', parcelas: despesa.parcelas || 1, categoria: despesa.categoria || '', status: despesa.status || 'Pendente' }); } else { resetForm(); }
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            const { error } = await supabase.from('despesas_previstas').delete().eq('id', itemToDelete.id);
            if (error) throw error;
            toast({ title: 'Removido' }); setItemToDelete(null);
        } catch (error) { toast({ title: 'Erro ao remover', variant: 'destructive', description: error.message }); }
    };

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Pendente' ? 'Pago' : 'Pendente';
        try { const { error } = await supabase.from('despesas_previstas').update({ status: newStatus }).eq('id', id); if (error) throw error; } catch (error) { toast({ title: 'Erro', description: 'Erro ao atualizar status', variant: 'destructive' }); }
    };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-6">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Despesas Previstas</h2><p className="text-muted-foreground">Gerencie suas contas a pagar.</p></div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10 hover:text-blue-300"><Search className="w-4 h-4 mr-2" />Buscar</Button>
                        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Nova Despesa</Button>
                    </div>
                </div>
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border"><th className="p-4 text-left font-semibold text-muted-foreground">Vencimento</th><th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th><th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-center font-semibold text-muted-foreground">Status</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : despesas.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><CalendarClock className="mx-auto w-10 h-10 mb-2" />Nenhuma despesa.</td></tr> : (
                                    despesas.map((despesa) => (
                                        <tr key={despesa.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                            <td className="p-4 text-foreground">{format(new Date(despesa.data_vencimento), 'dd/MM/yyyy')}</td>
                                            <td className="p-4 text-foreground font-medium">{despesa.descricao}</td>
                                            <td className="p-4 text-foreground"><Badge variant="outline">{despesa.categoria || 'OUTROS'}</Badge></td>
                                            <td className="p-4 text-right font-semibold text-foreground">R$ {parseFloat(despesa.valor).toFixed(2)}</td>
                                            <td className="p-4 text-center"><Badge className="cursor-pointer hover:opacity-80" variant={despesa.status === 'Pago' ? "default" : "destructive"} onClick={() => handleStatusToggle(despesa.id, despesa.status)}>{despesa.status}</Badge></td>
                                            <td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(despesa)}><Edit className="w-4 h-4 text-blue-500" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(despesa)}><Trash className="w-4 h-4 text-red-500" /></Button></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => openDialog(item)} tableName="despesas_previstas" searchField="descricao" displayFields={[{ key: 'descricao', label: 'Descrição' }, { key: 'data_vencimento', label: 'Vencimento', format: (d) => format(new Date(d), 'dd/MM/yyyy') }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Despesa Prevista" />
            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(o) setIsDialogOpen(true); }}>
                <DialogContent className="sm:max-w-lg dark-pessoal bg-card border-border text-foreground">
                    <DialogHeader><DialogTitle className="text-blue-500">{currentDespesa ? 'Editar' : 'Nova'} Despesa Prevista</DialogTitle><DialogDescription>Preencha as informações da conta.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        {duplicateWarning && <div className="bg-yellow-500/10 border border-yellow-500/50 p-3 rounded-md flex items-start gap-2 text-sm text-yellow-500"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>{duplicateWarning}</p></div>}
                        <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><Label>Descrição</Label><Select value={formData.descricao} onValueChange={(v) => { const st = tiposDespesa.find(t => t.nome_despesa === v); setFormData(p => ({ ...p, descricao: v, categoria: st?.categoria || 'OUTROS' })); }}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map((t, i) => <SelectItem key={i} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div><Label>Categoria</Label><Input value={formData.categoria} readOnly disabled className="bg-muted opacity-100 text-muted-foreground" /></div><div><Label>Data Compra</Label><Input type="date" value={formData.data_compra} onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })} className="bg-input" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Vencimento</Label><Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} className="bg-input" placeholder="0.00" /></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><Label>Pagamento</Label><Select value={formData.forma_pagamento} onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal"><SelectItem value="Boleto">Boleto</SelectItem><SelectItem value="Cartão">Cartão</SelectItem><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem></SelectContent></Select></div><div><Label>Parcelas</Label><Input type="number" value={formData.parcelas} onChange={(e) => setFormData({ ...formData, parcelas: parseInt(e.target.value) || 1 })} min="1" disabled={formData.forma_pagamento !== 'Cartão'} className="bg-input" /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-pessoal"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover esta despesa?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};
export default DespesaPrevista;