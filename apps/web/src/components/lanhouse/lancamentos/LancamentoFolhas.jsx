import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const LancamentoFolhas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    const [folhas, setFolhas] = useState([]);
    const [tiposFolha, setTiposFolha] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const initialFormState = { data: new Date().toISOString().split('T')[0], tipo_folha: '', tipo_movimento: 'ENTRADA', quantidade: '', valor: '' };
    const [formData, setFormData] = useState(initialFormState);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [folhasRes, tiposRes] = await Promise.all([
                supabase.from('lm_folhas').select('*').eq('user_id', user.id).order('data', { ascending: false }),
                supabase.from('lm_tipos_folha').select('*').eq('user_id', user.id),
            ]);
            if (!isMountedRef.current) return;
            if (folhasRes.error) throw folhasRes.error;
            if (tiposRes.error) throw tiposRes.error;
            setFolhas(folhasRes.data || []); setTiposFolha(tiposRes.data || []);
        } catch (error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive', description: error.message }); } finally { if (isMountedRef.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('lm_folhas_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'lm_folhas' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const handleSave = async () => {
        if (!formData.data || !formData.tipo_folha || !formData.quantidade) { toast({ title: 'Erro', description: 'Preencha os campos obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, quantidade: Number(formData.quantidade), valor: formData.valor ? Number(formData.valor) : null };
        try {
            if (currentItem) { await supabase.from('lm_folhas').update(dataToSave).eq('id', currentItem.id); } else { await supabase.from('lm_folhas').insert(dataToSave); }
            if (!isMountedRef.current) return;
            toast({ title: 'Sucesso', description: 'Registro de folhas salvo.' });
            setFormData(initialFormState); setCurrentItem(null);
            setIsDialogOpen(false);
        } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
    };

    const openDialog = (item = null) => { setCurrentItem(item); setFormData(item ? { ...item } : initialFormState); setIsDialogOpen(true); };
    const closeDialog = () => { setIsDialogOpen(false); setFormData(initialFormState); setCurrentItem(null); };
    const handleDelete = async () => { if (!itemToDelete) return; try { await supabase.from('lm_folhas').delete().eq('id', itemToDelete.id); if (!isMountedRef.current) return; toast({ title: 'Removido' }); setItemToDelete(null); } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive' }); } };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between"><div><h2 className="text-3xl font-bold text-primary">Controle de Folhas</h2><p className="text-muted-foreground">Entrada e saída de material.</p></div><Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button></div>
                <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/50"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Tipo Folha</th><th className="p-4 text-left font-semibold text-muted-foreground">Movimento</th><th className="p-4 text-right font-semibold text-muted-foreground">Qtd</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="p-8 text-center">Carregando...</td></tr> : folhas.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-muted-foreground"><FileText className="mx-auto w-10 h-10 mb-2 opacity-50" />Nenhum registro.</td></tr> : folhas.map((item) => (<tr key={item.id} className="border-b border-border hover:bg-accent/50"><td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4">{item.tipo_folha}</td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${item.tipo_movimento === 'ENTRADA' ? 'bg-green-500/20 text-green-500' : item.tipo_movimento === 'SAÍDA' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'}`}>{item.tipo_movimento}</span></td><td className="p-4 text-right font-mono">{item.quantidade}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-cyan-400" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>))}</tbody></table></div></div>
            </motion.div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="bg-card border-border text-foreground sm:max-w-[500px]">
                    <DialogHeader><DialogTitle className="text-cyan-400">{currentItem ? 'Editar' : 'Novo'} Lançamento</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-background" /></div><div><Label>Quantidade</Label><Input type="number" min="1" value={formData.quantidade} onChange={e => setFormData({ ...formData, quantidade: e.target.value })} className="bg-background" /></div></div>
                        <div><Label>Tipo de Folha</Label><Select value={formData.tipo_folha} onValueChange={v => setFormData({ ...formData, tipo_folha: v })}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{tiposFolha.map(t => <SelectItem key={t.tipo_folha} value={t.tipo_folha}>{t.tipo_folha}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Movimento</Label><Select value={formData.tipo_movimento} onValueChange={v => setFormData({ ...formData, tipo_movimento: v })}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><SelectItem value="ENTRADA">Entrada</SelectItem><SelectItem value="SAÍDA">Saída</SelectItem><SelectItem value="PERDA">Perda</SelectItem></SelectContent></Select></div>
                        {formData.tipo_movimento === 'ENTRADA' && <div><Label>Valor Total</Label><Input type="number" step="0.01" min="0" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-background" /></div>}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="bg-card border-border"><AlertDialogHeader><AlertDialogTitle>Excluir Registro?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};

export default LancamentoFolhas;