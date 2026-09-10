import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Aportes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [aportes, setAportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAporte, setCurrentAporte] = useState(null);
  const [formData, setFormData] = useState({ data: '', valor: '', banco: '' });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('aportes').select('*').eq('user_id', user.id).order('data', { ascending: false });
    if (error) toast({ title: 'Erro ao buscar aportes', variant: 'destructive' });
    else setAportes(data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('pessoal_aportes_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'aportes' }, fetchData).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchData]);

  const resetForm = () => {
    setFormData({ data: new Date().toISOString().split('T')[0], valor: '', banco: '' });
    setCurrentAporte(null);
  };

  const handleSave = async () => {
    if (!formData.data || !formData.valor || !formData.banco) {
      toast({ title: 'Erro', description: 'Todos os campos são obrigatórios.', variant: 'destructive' });
      return;
    }
    const dataToSave = { 
        data: formData.data,
        valor: formData.valor,
        banco: formData.banco,
        user_id: user.id 
    };

    if (currentAporte) {
      const { error } = await supabase.from('aportes').update(dataToSave).eq('id', currentAporte.id);
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive', description: error.message });
      else toast({ title: 'Sucesso', description: 'Aporte atualizado.' });
    } else {
      const { error } = await supabase.from('aportes').insert(dataToSave);
      if (error) toast({ title: 'Erro ao registrar', variant: 'destructive', description: error.message });
      else toast({ title: 'Sucesso', description: 'Novo aporte registrado.' });
    }
    resetForm();
    closeDialog();
  };

  const openDialog = (aporte = null) => {
    setCurrentAporte(aporte);
    setFormData(aporte ? { data: aporte.data, valor: aporte.valor, banco: aporte.banco } : { data: new Date().toISOString().split('T')[0], valor: '', banco: '' });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('aportes').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao remover', variant: 'destructive' });
    else toast({ title: 'Removido', description: 'Aporte removido.' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Aportes</h2>
          <p className="text-muted-foreground">Registre seus aportes de investimento.</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Aporte</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="dark-pessoal bg-card border-blue-500/20 text-foreground">
          <DialogHeader><DialogTitle className="text-blue-400">{currentAporte ? 'Editar' : 'Novo'} Aporte</DialogTitle><DialogDescription>Preencha os dados do aporte.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-background/70 text-white" /></div>
              <div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-background/70 text-white" placeholder="0,00" /></div>
            </div>
            <div><Label>Banco/Corretora</Label><Input value={formData.banco} onChange={e => setFormData({ ...formData, banco: e.target.value })} className="bg-background/70 text-white" placeholder="Ex: Nubank, Inter" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card/80 backdrop-blur-sm border border-blue-500/10 rounded-xl shadow-lg shadow-blue-500/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-blue-500/10"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Banco/Corretora</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr>) : aportes.length === 0 ? (<tr><td colSpan="4" className="p-8 text-center text-muted-foreground"><PiggyBank className="mx-auto w-10 h-10 mb-2" />Nenhum aporte registrado.</td></tr>) : (
                aportes.map((item) => (
                  <tr key={item.id} className="border-b border-blue-500/10 last:border-b-0 hover:bg-accent/50">
                    <td className="p-4 text-foreground">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="p-4 text-foreground">{item.banco}</td>
                    <td className="p-4 text-green-400 font-semibold text-right">R$ {parseFloat(item.valor).toFixed(2)}</td>
                    <td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-blue-400" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger><AlertDialogContent className="dark-pessoal"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este aporte?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td>
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

export default Aportes;