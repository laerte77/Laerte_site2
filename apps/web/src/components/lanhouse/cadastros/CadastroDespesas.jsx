import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroDespesas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDespesa, setCurrentDespesa] = useState(null);
  const [nomeDespesa, setNomeDespesa] = useState('');

  const fetchDespesas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('lm_despesas')
      .select('*')
      .eq('user_id', user.id)
      .order('despesa', { ascending: true }); // Sorted

    if (error) {
      toast({ title: 'Erro ao buscar tipos de despesa', description: error.message, variant: 'destructive' });
    } else {
      setDespesas(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchDespesas();
  }, [fetchDespesas]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('lm_despesas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lm_despesas', filter: `user_id=eq.${user.id}`}, () => fetchDespesas())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchDespesas]);

  const resetForm = () => {
    setNomeDespesa('');
    setCurrentDespesa(null);
  };

  const handleSave = async () => {
    if (!nomeDespesa.trim()) {
      toast({ title: 'Erro', description: 'O nome da despesa não pode estar vazio.', variant: 'destructive' });
      return;
    }

    const dataToSave = { despesa: nomeDespesa, user_id: user.id };

    if (currentDespesa) {
      const { error } = await supabase.from('lm_despesas').update(dataToSave).eq('id', currentDespesa.id);
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Tipo de despesa atualizado.', className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('lm_despesas').insert(dataToSave);
      if (error) toast({ title: 'Erro ao cadastrar', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Novo tipo de despesa cadastrado.', className: 'bg-green-500 text-white' });
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openDialog = (despesa = null) => {
    setCurrentDespesa(despesa);
    setNomeDespesa(despesa ? despesa.despesa : '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('lm_despesas').delete().eq('id', id);
    if (error) toast({ title: 'Erro ao remover', variant: 'destructive' });
    else toast({ title: 'Removido', description: 'Tipo de despesa removido.', className: 'bg-red-500 text-white' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Cadastro de Tipos de Despesa</h2>
          <p className="text-muted-foreground">Gerencie os tipos de despesas do seu negócio.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nova Despesa</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark-lm-impressoes bg-card border-border text-foreground z-[100]">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">{currentDespesa ? 'Editar' : 'Adicionar'} Tipo de Despesa</DialogTitle>
              <DialogDescription>Preencha as informações abaixo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="nome" className="text-right text-muted-foreground">Nome</Label><Input id="nome" value={nomeDespesa} onChange={(e) => setNomeDespesa(e.target.value)} className="col-span-3 bg-background/70 border-border focus:border-cyan-400" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="p-4 text-left font-semibold text-muted-foreground">Nome da Despesa</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
            <tbody>
              {loading ? (<tr><td colSpan="2" className="p-8 text-center text-muted-foreground">Carregando...</td></tr>) : despesas.length === 0 ? (
                <tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><DollarSign className="mx-auto w-10 h-10 mb-2" />Nenhum tipo de despesa cadastrado.</td></tr>
              ) : (
                despesas.map((despesa) => (
                  <tr key={despesa.id} className="border-b border-border last:border-b-0 hover:bg-blue-500/10 transition-colors duration-200">
                    <td className="p-4 text-foreground">{despesa.despesa}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(despesa)}><Edit className="w-4 h-4 text-cyan-400" /></Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="dark-lm-impressoes bg-card border-border z-[150]">
                          <AlertDialogHeader><AlertDialogTitle className="text-cyan-400">Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente o tipo de despesa.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(despesa.id)} className="bg-red-500 hover:bg-red-600">Deletar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
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

export default CadastroDespesas;