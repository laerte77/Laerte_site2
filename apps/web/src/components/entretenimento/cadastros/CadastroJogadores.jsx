import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';

const CadastroJogadores = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMounted = useIsMounted();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ nome_jogador: '' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.from('ent_jogadores').select('*').eq('user_id', user.id).order('nome_jogador', { ascending: true });
        if (error) throw error;
        withIsMountedCheck(() => setItems(data || []), isMounted);
    } catch (error) {
        withIsMountedCheck(() => toast({ title: 'Erro ao buscar jogadores', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    } finally {
        withIsMountedCheck(() => setLoading(false), isMounted);
    }
  };

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('ent_jogadores_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'ent_jogadores' }, fetchData).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleSave = async () => {
    if (!formData.nome_jogador.trim()) { toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' }); return; }
    const dataToSave = { ...formData, nome_jogador: formData.nome_jogador.toUpperCase(), user_id: user.id };
    try {
        if (currentItem) {
            const { error } = await supabase.from('ent_jogadores').update(dataToSave).eq('id', currentItem.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('ent_jogadores').insert(dataToSave);
            if (error) throw error;
        }
        withIsMountedCheck(() => { toast({ title: 'Sucesso', description: 'Salvo.' }); setIsDialogOpen(false); setFormData({ nome_jogador: '' }); }, isMounted);
    } catch (error) {
        withIsMountedCheck(() => toast({ title: 'Erro ao salvar', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    }
  };

  const openDialog = (item = null) => { setCurrentItem(item); setFormData(item ? { nome_jogador: item.nome_jogador } : { nome_jogador: '' }); setIsDialogOpen(true); };
  const closeDialog = () => { setIsDialogOpen(false); setCurrentItem(null); setFormData({ nome_jogador: '' }); };

  const handleDelete = async (id) => {
    try {
        const { error } = await supabase.from('ent_jogadores').delete().eq('id', id);
        if (error) throw error;
        withIsMountedCheck(() => toast({ title: 'Removido', description: 'Jogador removido.' }), isMounted);
    } catch (error) {
        withIsMountedCheck(() => toast({ title: 'Erro ao remover', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-primary">Cadastro de Jogadores</h2>
        <Button onClick={() => openDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Novo Jogador</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md dark-entretenimento bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-primary">{currentItem ? 'Editar' : 'Adicionar'}</DialogTitle></DialogHeader>
          <div className="py-4"><Label>Nome do Jogador</Label><Input value={formData.nome_jogador} onChange={(e) => setFormData({ ...formData, nome_jogador: e.target.value })} className="bg-input" /></div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left">Nome do Jogador</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr> : items.length === 0 ? <tr><td colSpan="2" className="p-8 text-center"><Users className="mx-auto w-10 h-10 mb-2 opacity-50" />Nenhum jogador.</td></tr> : items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors"><td className="p-4">{item.nome_jogador}</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-primary" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent className="dark-entretenimento"><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default CadastroJogadores;