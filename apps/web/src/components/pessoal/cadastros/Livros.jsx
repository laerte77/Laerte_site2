import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Livros = () => {
  const { user } = useAuth();
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ ordem: '', nome_livro: '', capitulos: '', testamento: '' });
  const [editingId, setEditingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchLivros = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Modified: Order by nome_livro ascending (A-Z)
    const { data, error } = await supabase
      .from('livros')
      .select('*')
      .eq('user_id', user.id)
      .order('nome_livro', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao buscar livros', description: error.message, variant: 'destructive' });
    } else {
      setLivros(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchLivros();
  }, [fetchLivros]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('livros_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'livros',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        fetchLivros();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLivros]);

  const resetForm = () => {
    setFormData({ ordem: '', nome_livro: '', capitulos: '', testamento: '' });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.ordem || !formData.nome_livro || !formData.capitulos || !formData.testamento) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const dataToSave = { ...formData, user_id: user.id };

    if (editingId !== null) {
      const { error } = await supabase.from('livros').update(dataToSave).eq('id', editingId);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar o livro.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso!", description: "Livro atualizado", className: 'bg-green-500 text-white' });
      }
    } else {
      const { error } = await supabase.from('livros').insert(dataToSave);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível cadastrar o livro.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso!", description: "Livro cadastrado", className: 'bg-green-500 text-white' });
      }
    }
    
    closeDialog();
  };

  const openDialog = (livro = null) => {
    if (livro) {
      setFormData({ ordem: livro.ordem, nome_livro: livro.nome_livro, capitulos: livro.capitulos, testamento: livro.testamento });
      setEditingId(livro.id);
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
    const { error } = await supabase.from('livros').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir o livro.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Livro excluído", className: 'bg-red-500 text-white' });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Livros</h2>
            <p className="text-muted-foreground">Cadastre os livros para controle de leitura (A-Z)</p>
          </div>
          <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Novo Livro</Button>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark-pessoal bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingId ? 'Editar' : 'Novo'} Livro</DialogTitle>
            <DialogDescription>Preencha os dados do livro.</DialogDescription>
          </DialogHeader>
          <div className="py-4 grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={formData.ordem} onChange={(e) => setFormData({ ...formData, ordem: e.target.value })} placeholder="Ex: 1" className="bg-input" /></div>
            <div className="space-y-2"><Label>Nome do Livro</Label><Input value={formData.nome_livro} onChange={(e) => setFormData({ ...formData, nome_livro: e.target.value })} placeholder="Ex: Gênesis" className="bg-input" /></div>
            <div className="space-y-2"><Label>Capítulos</Label><Input type="number" value={formData.capitulos} onChange={(e) => setFormData({ ...formData, capitulos: e.target.value })} placeholder="Ex: 50" className="bg-input" /></div>
            <div className="space-y-2"><Label>Testamento</Label><Select value={formData.testamento} onValueChange={(value) => setFormData({ ...formData, testamento: value })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="Antigo">Antigo Testamento</SelectItem><SelectItem value="Novo">Novo Testamento</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome do Livro</th>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Ordem (Orig.)</th>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Capítulos</th>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Testamento</th>
                <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : livros.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted-foreground"><BookOpen className="mx-auto w-10 h-10 mb-2" />Nenhum livro cadastrado</td></tr>
              ) : (
                livros.map((livro) => (
                  <tr key={livro.id} className="hover:bg-accent transition-colors">
                    <td className="p-4 text-foreground">{livro.nome_livro}</td>
                    <td className="p-4 text-foreground">{livro.ordem}</td>
                    <td className="p-4 text-foreground">{livro.capitulos}</td>
                    <td className="p-4 text-foreground">{livro.testamento}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(livro)} className="text-blue-400 hover:text-blue-300 mr-2"><Edit className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400"><Trash className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="dark-pessoal bg-card border-border">
                          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este livro?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(livro.id)} className="bg-red-600 hover:bg-red-700 text-white">Deletar</AlertDialogAction></AlertDialogFooter>
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

export default Livros;