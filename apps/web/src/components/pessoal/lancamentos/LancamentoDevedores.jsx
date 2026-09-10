import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, UserMinus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';

const LancamentoDevedores = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    const [devedores, setDevedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [currentDevedor, setCurrentDevedor] = useState(null);
    const [formData, setFormData] = useState({ data: '', valor: '', pessoa: '', data_vencimento: '' });

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('pessoal_devedores').select('*').eq('user_id', user.id).order('data', { ascending: false });
            if (!isMountedRef.current) return;
            if (error) throw error;
            setDevedores(data || []);
        } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive', description: error.message }); } finally { if (isMountedRef.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('pessoal_devedores_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_devedores' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const resetForm = () => { setFormData({ data: new Date().toISOString().split('T')[0], valor: '', pessoa: '', data_vencimento: '' }); setCurrentDevedor(null); };

    const handleSave = async () => {
        if (!formData.data || !formData.valor || !formData.pessoa || !formData.data_vencimento) { toast({ title: 'Erro', description: 'Todos os campos são obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id };
        if (currentDevedor) {
            const { error } = await supabase.from('pessoal_devedores').update(dataToSave).eq('id', currentDevedor.id);
            if (!isMountedRef.current) return;
            if (error) toast({ title: 'Erro', variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Devedor atualizado.' }); resetForm(); }
        } else {
            const { error } = await supabase.from('pessoal_devedores').insert(dataToSave);
            if (!isMountedRef.current) return;
            if (error) toast({ title: 'Erro', variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Novo devedor registrado.' }); resetForm(); }
        }
    };

    const openDialog = (item = null) => { setCurrentDevedor(item); setFormData(item ? { ...item } : { data: new Date().toISOString().split('T')[0], valor: '', pessoa: '', data_vencimento: '' }); setIsDialogOpen(true); };

    const handleDelete = async (id) => { const { error } = await supabase.from('pessoal_devedores').delete().eq('id', id); if (!isMountedRef.current) return; if (error) toast({ title: 'Erro ao remover', variant: 'destructive' }); else toast({ title: 'Removido', description: 'Devedor removido.' }); };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-400">Banco de Devedores</h2></div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="text-blue-500 border-blue-500 hover:bg-blue-500/10"><Search className="w-4 h-4 mr-2" />Buscar</Button>
                    <Button onClick={() => openDialog()} className="bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Novo Devedor</Button>
                </div>
            </div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => { openDialog(item); setIsSearchModalOpen(false); }} tableName="pessoal_devedores" searchField="pessoa" displayFields={[{ key: 'pessoa', label: 'Pessoa' }, { key: 'data_vencimento', label: 'Vencimento', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Devedor" />
            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(o) setIsDialogOpen(true); }}>
                <DialogContent className="dark-pessoal bg-card border-border text-foreground">
                    <DialogHeader><DialogTitle className="text-blue-500">{currentDevedor ? 'Editar' : 'Novo'} Devedor</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-input" placeholder="0,00" /></div></div>
                        <div><Label>Pessoa</Label><Input type="text" value={formData.pessoa} onChange={e => setFormData({ ...formData, pessoa: e.target.value })} className="bg-input" placeholder="Nome" /></div>
                        <div><Label>Vencimento</Label><Input type="date" value={formData.data_vencimento} onChange={e => setFormData({ ...formData, data_vencimento: e.target.value })} className="bg-input" /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Pessoa</th><th className="p-4 text-left font-semibold text-muted-foreground">Vencimento</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                        <tbody>{loading ? <tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr> : devedores.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">Nenhum devedor registrado.</td></tr> : devedores.map((item) => (
                            <tr key={item.id} className="border-b border-border hover:bg-secondary/50"><td className="p-4">{item.pessoa}</td><td className="p-4">{new Date(item.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4 text-green-400 font-semibold text-right">R$ {parseFloat(item.valor).toFixed(2)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-blue-500" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>
                        ))}</tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};
export default LancamentoDevedores;