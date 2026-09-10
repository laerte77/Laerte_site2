import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroTipoEntrada = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ entrada: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase.from('igreja_tipos_entrada').select('*').eq('user_id', user.id).order('entrada', { ascending: true });
        if (error) toast({ title: 'Erro ao buscar tipos de entrada', variant: 'destructive' });
        else setItems(data);
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchData();
        if (!user) return;
        const channel = supabase.channel('igreja_tipos_entrada_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_tipos_entrada' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => setFormData({ entrada: '' });

    const handleSave = async () => {
        if (!formData.entrada.trim()) {
            toast({ title: 'Erro', description: 'O nome da entrada é obrigatório.', variant: 'destructive' });
            return;
        }
        const dataToSave = { ...formData, user_id: user.id };
        if (currentItem) {
            const { error } = await supabase.from('igreja_tipos_entrada').update(dataToSave).eq('id', currentItem.id);
            if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
            else toast({ title: 'Sucesso', description: 'Tipo de entrada atualizado.' });
        } else {
            const { error } = await supabase.from('igreja_tipos_entrada').insert(dataToSave);
            if (error) toast({ title: 'Erro ao cadastrar', variant: 'destructive' });
            else toast({ title: 'Sucesso', description: 'Novo tipo de entrada cadastrado.' });
        }
        resetForm();
    };

    const openDialog = (item = null) => {
        setCurrentItem(item);
        setFormData(item ? { entrada: item.entrada } : { entrada: '' });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setCurrentItem(null);
        resetForm();
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('igreja_tipos_entrada').delete().eq('id', id);
        if (error) toast({ title: 'Erro ao remover', variant: 'destructive' });
        else toast({ title: 'Removido', description: 'Tipo de entrada removido.' });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-500">Tipos de Entrada</h2><p className="text-muted-foreground">Gerencie as fontes de receita da igreja.</p></div>
                <Button onClick={() => openDialog()} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Tipo</Button>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="dark-igreja bg-card border-green-500/20 text-foreground">
                    <DialogHeader><DialogTitle className="text-green-400">{currentItem ? 'Editar Tipo' : 'Novo Tipo de Entrada'}</DialogTitle><DialogDescription>Preencha o nome do tipo de entrada.</DialogDescription></DialogHeader>
                    <div className="py-4"><Label htmlFor="entrada">Nome da Entrada</Label><Input id="entrada" value={formData.entrada} onChange={(e) => setFormData({ ...formData, entrada: e.target.value })} className="bg-background/70 text-white" /></div>
                    <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="bg-card/80 backdrop-blur-sm border border-green-500/10 rounded-xl shadow-lg shadow-green-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-green-500/10"><th className="p-4 text-left font-semibold text-muted-foreground">Nome</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                        <tbody>
                            {loading ? (<tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr>) : items.length === 0 ? (<tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><ArrowUpCircle className="mx-auto w-10 h-10 mb-2" />Nenhum tipo de entrada cadastrado.</td></tr>) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-b border-green-500/10 last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground font-medium">{item.entrada}</td>
                                        <td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-green-400" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger><AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este tipo de entrada?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td>
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

export default CadastroTipoEntrada;