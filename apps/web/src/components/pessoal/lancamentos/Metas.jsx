import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Metas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    const [metas, setMetas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ descricao: '', valor: '', meta: '' });
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('metas').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (!isMountedRef.current) return;
            if (error) throw error;
            setMetas(data || []);
        } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive', description: error.message }); } finally { if (isMountedRef.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('metas_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const handleSave = async () => {
        if (!formData.descricao || !formData.meta) { toast({ title: 'Erro', description: 'Descrição e Meta são obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { descricao: formData.descricao, valor: Number(formData.valor) || 0, meta: Number(formData.meta), user_id: user.id };
        try {
            if (currentItem) { const { error } = await supabase.from('metas').update(dataToSave).eq('id', currentItem.id); if (error) throw error; } else { const { error } = await supabase.from('metas').insert(dataToSave); if (error) throw error; }
            if (!isMountedRef.current) return;
            toast({ title: 'Sucesso', description: 'Meta salva.' });
            setFormData({ descricao: '', valor: '', meta: '' });
            setCurrentItem(null);
        } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive' }); }
    };

    const openDialog = (item = null) => { setCurrentItem(item); setFormData(item ? { ...item } : { descricao: '', valor: '0', meta: '' }); setIsDialogOpen(true); };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try { const { error } = await supabase.from('metas').delete().eq('id', itemToDelete.id); if (error) throw error; if (!isMountedRef.current) return; toast({ title: 'Removido' }); setItemToDelete(null); } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', variant: 'destructive' }); }
    };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-6">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-3xl font-bold text-blue-500">Metas Financeiras</h2><p className="text-muted-foreground">Acompanhe seus objetivos.</p></div>
                    <Button onClick={() => openDialog()} className="bg-blue-600 text-white"><Plus className="w-4 h-4 mr-2" /> Nova Meta</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? <p className="col-span-full text-center p-8">Carregando...</p> : metas.length === 0 ? <div className="col-span-full text-center p-8 text-muted-foreground">Nenhuma meta.</div> : 
                        metas.map((item) => {
                            const percent = Math.min(100, Math.max(0, (item.valor / item.meta) * 100));
                            return (
                                <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm group">
                                    <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg">{item.descricao}</h3><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => openDialog(item)}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4" /></Button></div></div>
                                    <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Atual: R$ {parseFloat(item.valor).toFixed(2)}</span><span className="text-muted-foreground">Meta: R$ {parseFloat(item.meta).toFixed(2)}</span></div><Progress value={percent} className="h-2" /><div className="text-right text-xs text-muted-foreground">{percent.toFixed(1)}% concluído</div></div>
                                </div>
                            );
                        })
                    }
                </div>
            </motion.div>
            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(o) setIsDialogOpen(true); }}>
                <DialogContent className="dark-pessoal bg-card border-border"><DialogHeader><DialogTitle className="text-blue-500">{currentItem ? 'Editar' : 'Nova'} Meta</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4"><div><Label>Descrição</Label><Input value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} className="bg-input" /></div><div className="grid grid-cols-2 gap-4"><div><Label>Valor Atual</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-input" /></div><div><Label>Meta</Label><Input type="number" value={formData.meta} onChange={e => setFormData({ ...formData, meta: e.target.value })} className="bg-input" /></div></div></div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-pessoal"><AlertDialogHeader><AlertDialogTitle>Excluir Meta?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};
export default Metas;