import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroTipoDespesa = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ despesa: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('igreja_tipos_despesa').select('*').eq('user_id', user.id).order('despesa', { ascending: true });
        if (error) toast({ title: 'Erro ao buscar tipos de despesa', variant: 'destructive' });
        else setItems(data);
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('igreja_tipos_despesa_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_tipos_despesa' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => setFormData({ despesa: '' });

    const handleSave = async () => {
        if (!formData.despesa.trim()) {
            toast({ title: 'Erro', description: 'O nome da despesa é obrigatório.', variant: 'destructive' });
            return;
        }
        const dataToSave = { ...formData, user_id: user.id };
        if (currentItem) {
            const { error } = await supabase.from('igreja_tipos_despesa').update(dataToSave).eq('id', currentItem.id);
            if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
            else toast({ title: 'Sucesso', description: 'Tipo de despesa atualizado.' });
        } else {
            const { error } = await supabase.from('igreja_tipos_despesa').insert(dataToSave);
            if (error) toast({ title: 'Erro ao cadastrar', variant: 'destructive' });
            else toast({ title: 'Sucesso', description: 'Novo tipo de despesa cadastrado.' });
        }
        resetForm();
    };

    const openDialog = (item = null) => {
        setCurrentItem(item);
        setFormData(item ? { despesa: item.despesa } : { despesa: '' });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setCurrentItem(null);
        resetForm();
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('igreja_tipos_despesa').delete().eq('id', id);
        if (error) toast({ title: 'Erro ao remover', variant: 'destructive' });
        else toast({ title: 'Removido', description: 'Tipo de despesa removido.' });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-500">Tipos de Despesa</h2><p className="text-muted-foreground">Gerencie as categorias de despesas da igreja.</p></div>
                <Button onClick={() => openDialog()} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Tipo</Button>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="dark-igreja bg-card border-green-500/20 text-foreground">
                    <DialogHeader><DialogTitle className="text-green-400">{currentItem ? 'Editar' : 'Novo'} Tipo de Despesa</DialogTitle><DialogDescription>Preencha o nome do tipo de despesa.</DialogDescription></DialogHeader>
                    <div className="py-4"><Label htmlFor="despesa">Nome da Despesa</Label><Input id="despesa" value={formData.despesa} onChange={(e) => setFormData({ ...formData, despesa: e.target.value })} className="bg-background/70 text-white" /></div>
                    <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="bg-card/80 backdrop-blur-sm border border-green-500/10 rounded-xl shadow-lg shadow-green-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-green-500/10"><th className="p-4 text-left font-semibold text-muted-foreground">Nome</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                        <tbody>
                            {loading ? (<tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr>) : items.length === 0 ? (<tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><ArrowDownCircle className="mx-auto w-10 h-10 mb-2" />Nenhum tipo de despesa cadastrado.</td></tr>) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-b border-green-500/10 last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground font-medium">{item.despesa}</td>
                                        <td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-green-400" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger><AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este tipo de despesa?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default CadastroTipoDespesa;