import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TiposReceita = () => {
  const { user } = useAuth();
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeReceita, setNomeReceita] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchTipos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Modified: Order by nome_receita ascending (A-Z)
    const { data, error } = await supabase.from('tipos_receita').select('*').eq('user_id', user.id).order('nome_receita', { ascending: true });
    if (error) toast({ title: 'Erro ao buscar tipos de receita', variant: 'destructive' });
    else setTipos(data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTipos();
    if (!user) return;
    const channel = supabase.channel('tipos_receita_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tipos_receita' }, fetchTipos)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchTipos]);

  const resetForm = () => {
    setNomeReceita('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!nomeReceita.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da receita", variant: "destructive" });
      return;
    }

    const dataToSave = { nome_receita: nomeReceita, user_id: user.id };

    if (editingId !== null) {
      const { error } = await supabase.from('tipos_receita').update(dataToSave).eq('id', editingId);
      if (error) toast({ title: "Erro", description: "Não foi possível atualizar o tipo de receita.", variant: "destructive" });
      else toast({ title: "Sucesso!", description: "Tipo de receita atualizado", className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('tipos_receita').insert(dataToSave);
      if (error) toast({ title: "Erro", description: "Não foi possível cadastrar o tipo de receita.", variant: "destructive" });
      else toast({ title: "Sucesso!", description: "Tipo de receita cadastrado", className: 'bg-green-500 text-white' });
    }
    
    setIsDialogOpen(false);
    resetForm();
    fetchTipos();
  };

  const openDialog = (tipo = null) => {
    if (tipo) {
      setNomeReceita(tipo.nome_receita);
      setEditingId(tipo.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('tipos_receita').delete().eq('id', id);
    if (error) toast({ title: "Erro", description: "Não foi possível excluir o tipo de receita.", variant: "destructive" });
    else toast({ title: "Sucesso!", description: "Tipo de receita excluído", className: 'bg-red-500 text-white' });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Tipos de Receita</h2>
            <p className="text-muted-foreground">Cadastre os tipos de receita (A-Z)</p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark-pessoal bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Tipo de Receita</DialogTitle>
            <DialogDescription>Preencha o nome do tipo de receita.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="nome_receita">Nome da Receita</Label>
            <Input id="nome_receita" value={nomeReceita} onChange={(e) => setNomeReceita(e.target.value)} placeholder="Ex: Salário" className="bg-input" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome da Receita</th>
                <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (<tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr>) : tipos.length === 0 ? (
                <tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><TrendingUp className="mx-auto w-10 h-10 mb-2" />Nenhum tipo de receita cadastrado</td></tr>
              ) : (
                tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-accent transition-colors">
                    <td className="p-4 text-foreground">{tipo.nome_receita}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(tipo)} className="text-blue-400 hover:text-blue-300 mr-2"><Edit className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400"><Trash className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="dark-pessoal bg-card border-border">
                          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este tipo de receita?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(tipo.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default TiposReceita;