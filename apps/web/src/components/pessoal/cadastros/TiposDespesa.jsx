import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, TrendingDown, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';

const TiposDespesa = () => {
  const { user } = useAuth();
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeDespesa, setNomeDespesa] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchTipos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Modified: Order by nome_despesa ascending (A-Z)
    const { data, error } = await supabase.from('tipos_despesa').select('*').eq('user_id', user.id).order('nome_despesa', { ascending: true });
    if (error) toast({ title: 'Erro ao buscar tipos de despesa', variant: 'destructive' });
    else setTipos(data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTipos();
    if (!user) return;
    const channel = supabase.channel('tipos_despesa_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tipos_despesa' }, fetchTipos)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchTipos]);

  const resetForm = () => {
    setNomeDespesa('');
    setCategoria('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!nomeDespesa.trim() || !categoria.trim()) {
      toast({ title: "Erro", description: "Preencha o nome da despesa e a categoria.", variant: "destructive" });
      return;
    }

    const dataToSave = { 
      nome_despesa: nomeDespesa, 
      categoria: categoria,
      user_id: user.id 
    };

    if (editingId !== null) {
      const { error } = await supabase.from('tipos_despesa').update(dataToSave).eq('id', editingId);
      if (error) toast({ title: "Erro", description: "Não foi possível atualizar o tipo de despesa.", variant: "destructive" });
      else toast({ title: "Sucesso!", description: "Tipo de despesa atualizado", className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('tipos_despesa').insert(dataToSave);
      if (error) toast({ title: "Erro", description: "Não foi possível cadastrar o tipo de despesa.", variant: "destructive" });
      else toast({ title: "Sucesso!", description: "Tipo de despesa cadastrado", className: 'bg-green-500 text-white' });
    }
    
    setIsDialogOpen(false);
    resetForm();
    fetchTipos();
  };

  const openDialog = (tipo = null) => {
    if (tipo) {
      setNomeDespesa(tipo.nome_despesa);
      setCategoria(tipo.categoria || '');
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
    const { error } = await supabase.from('tipos_despesa').delete().eq('id', id);
    if (error) toast({ title: "Erro", description: "Não foi possível excluir o tipo de despesa.", variant: "destructive" });
    else toast({ title: "Sucesso!", description: "Tipo de despesa excluído", className: 'bg-red-500 text-white' });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Tipos de Despesa</h2>
            <p className="text-muted-foreground">Cadastre e categorize seus tipos de despesa (A-Z)</p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark-pessoal bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Tipo de Despesa</DialogTitle>
            <DialogDescription>Preencha os dados do tipo de despesa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome_despesa">Nome da Despesa</Label>
              <Input 
                id="nome_despesa" 
                value={nomeDespesa} 
                onChange={(e) => setNomeDespesa(e.target.value)} 
                placeholder="Ex: Fatura Internet" 
                className="bg-input" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input 
                id="categoria" 
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value)} 
                placeholder="Ex: Despesas Fixas" 
                className="bg-input" 
              />
            </div>
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
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome da Despesa</th>
                <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Categoria</th>
                <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (<tr><td colSpan="3" className="p-8 text-center">Carregando...</td></tr>) : tipos.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-muted-foreground"><TrendingDown className="mx-auto w-10 h-10 mb-2" />Nenhum tipo de despesa cadastrado</td></tr>
              ) : (
                tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 text-foreground font-medium">{tipo.nome_despesa}</td>
                    <td className="p-4">
                      {tipo.categoria ? (
                        <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal text-blue-400 border-blue-400/30">
                          <Tag className="h-3 w-3" />
                          {tipo.categoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Sem categoria</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(tipo)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="dark-pessoal bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>Deseja remover este tipo de despesa?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(tipo.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

export default TiposDespesa;