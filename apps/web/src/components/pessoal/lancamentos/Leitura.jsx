import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, BookOpen, Search } from 'lucide-react';
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

const Leitura = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMountedRef = useRef(true);
    const [leituras, setLeituras] = useState([]);
    const [livros, setLivros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [currentLeitura, setCurrentLeitura] = useState(null);
    const [formData, setFormData] = useState({ data: '', livro: '', capitulos_lidos: '' });
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [leiturasRes, livrosRes] = await Promise.all([
                supabase.from('leituras').select('*').eq('user_id', user.id).order('data', { ascending: false }),
                supabase.from('livros').select('nome_livro').eq('user_id', user.id),
            ]);
            if (!isMountedRef.current) return;
            if (leiturasRes.error) throw leiturasRes.error;
            setLeituras(leiturasRes.data || []);
            if (livrosRes.error) throw livrosRes.error;
            setLivros(livrosRes.data || []);
        } catch(error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive' }); } finally { if (isMountedRef.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if(!user) return; const channel = supabase.channel('pessoal_leitura_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'leituras' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const handleSave = async () => {
        if (!formData.data || !formData.livro || !formData.capitulos_lidos) { toast({ title: 'Erro', description: 'Todos os campos são obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id };
        try {
            if (currentLeitura) { const { error } = await supabase.from('leituras').update(dataToSave).eq('id', currentLeitura.id); if(error) throw error; } else { const { error } = await supabase.from('leituras').insert(dataToSave); if(error) throw error; }
            if (isMountedRef.current) { toast({ title: 'Sucesso', description: 'Leitura registrada.' }); setFormData({ data: new Date().toISOString().split('T')[0], livro: '', capitulos_lidos: '' }); setCurrentLeitura(null); }
        } catch (error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive' }); }
    };

    const openDialog = (item = null) => { setCurrentLeitura(item); setFormData(item ? { ...item } : { data: new Date().toISOString().split('T')[0], livro: '', capitulos_lidos: '' }); setIsDialogOpen(true); };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try { const { error } = await supabase.from('leituras').delete().eq('id', itemToDelete.id); if (error) throw error; if (isMountedRef.current) { toast({ title: 'Removido' }); setItemToDelete(null); } } catch (error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive' }); }
    };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-6">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-3xl font-bold text-blue-500">Lançamento de Leitura</h2></div>
                    <div className="flex gap-2"><Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="text-blue-500 border-blue-500 hover:bg-blue-500/10"><Search className="w-4 h-4 mr-2" />Buscar</Button><Button onClick={() => openDialog()} className="bg-blue-600 text-white"><Plus className="w-4 h-4 mr-2" /> Nova Leitura</Button></div>
                </div>
                <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Livro</th><th className="p-4 text-right font-semibold text-muted-foreground">Capítulos</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                            <tbody>{loading ? <tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr> : leituras.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">Nenhuma leitura registrada.</td></tr> : leituras.map((item) => (
                                <tr key={item.id} className="border-b border-border hover:bg-secondary/50"><td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4">{item.livro}</td><td className="p-4 text-blue-500 font-semibold text-right">{item.capitulos_lidos}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-blue-500" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(i) => { openDialog(i); setIsSearchModalOpen(false); }} tableName="leituras" searchField="livro" displayFields={[{ key: 'data', label: 'Data', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'livro', label: 'Livro' }, { key: 'capitulos_lidos', label: 'Capítulos' }]} title="Buscar Leitura" />
            <Dialog open={isDialogOpen} onOpenChange={(o) => { if(o) setIsDialogOpen(true); }}>
                <DialogContent className="dark-pessoal bg-card border-border"><DialogHeader><DialogTitle className="text-blue-500">{currentLeitura ? 'Editar' : 'Nova'} Leitura</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Capítulos</Label><Input type="number" value={formData.capitulos_lidos} onChange={e => setFormData({ ...formData, capitulos_lidos: e.target.value })} className="bg-input" /></div></div><div><Label>Livro</Label><Select value={formData.livro} onValueChange={v => setFormData({ ...formData, livro: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal"><ScrollArea className="h-48">{livros.map(l => <SelectItem key={l.nome_livro} value={l.nome_livro}>{l.nome_livro}</SelectItem>)}</ScrollArea></SelectContent></Select></div></div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-pessoal"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};
export default Leitura;