import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, FileStack } from 'lucide-react';
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

const CadastroTiposFolhas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tiposFolha, setTiposFolha] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTipoFolha, setCurrentTipoFolha] = useState(null);
  const [nomeTipoFolha, setNomeTipoFolha] = useState('');

  const fetchTiposFolha = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('lm_tipos_folha')
      .select('*')
      .eq('user_id', user.id)
      .order('tipo_folha', { ascending: true }); // Sorted
    
    if (error) {
      toast({ title: 'Erro ao buscar tipos de folha', description: error.message, variant: 'destructive' });
    } else {
      setTiposFolha(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTiposFolha();
  }, [fetchTiposFolha]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('lm_tipos_folha_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_tipos_folha',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        fetchTiposFolha();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTiposFolha]);

  const resetForm = () => {
    setNomeTipoFolha('');
    setCurrentTipoFolha(null);
  };

  const handleSave = async () => {
    if (!nomeTipoFolha.trim()) {
      toast({
        title: 'Erro de Validação',
        description: 'O nome do tipo de folha não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    const dataToSave = { tipo_folha: nomeTipoFolha, user_id: user.id };

    if (currentTipoFolha) {
      const { error } = await supabase
        .from('lm_tipos_folha')
        .update(dataToSave)
        .eq('id', currentTipoFolha.id);
      if (error) {
        toast({ title: 'Erro ao atualizar tipo de folha', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Tipo de folha atualizado com sucesso.', className: 'bg-green-500 text-white' });
      }
    } else {
      const { error } = await supabase
        .from('lm_tipos_folha')
        .insert(dataToSave);
      if (error) {
        toast({ title: 'Erro ao cadastrar tipo de folha', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Novo tipo de folha cadastrado.', className: 'bg-green-500 text-white' });
      }
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openDialog = (item = null) => {
    setCurrentTipoFolha(item);
    setNomeTipoFolha(item ? item.tipo_folha : '');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('lm_tipos_folha').delete().eq('id', id);
    if (error) {
        toast({ title: 'Erro ao remover tipo de folha', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'Tipo de Folha Removido', description: 'O tipo de folha foi removido com sucesso.', className: 'bg-red-500 text-white' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
            Cadastro de Tipos de Folhas
          </h2>
          <p className="text-muted-foreground">Gerencie os tipos de folhas para impressão e estoque.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark-lm-impressoes bg-card border-border text-foreground z-[100]">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">
                {currentTipoFolha ? 'Editar Tipo de Folha' : 'Adicionar Tipo de Folha'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome" className="text-right text-muted-foreground">
                  Nome
                </Label>
                <Input
                  id="nome"
                  value={nomeTipoFolha}
                  onChange={(e) => setNomeTipoFolha(e.target.value)}
                  className="col-span-3 bg-background/70 border-border focus:border-cyan-400"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-semibold text-muted-foreground">Tipo de Folha</th>
                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-muted-foreground">Carregando...</td>
                </tr>
              ) : tiposFolha.length === 0 ? (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-muted-foreground">
                    <FileStack className="mx-auto w-10 h-10 mb-2" />
                    Nenhum tipo de folha cadastrado.
                  </td>
                </tr>
              ) : (
                tiposFolha.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-blue-500/10 transition-colors duration-200">
                    <td className="p-4 text-foreground">{item.tipo_folha}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                        <Edit className="w-4 h-4 text-cyan-400" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="dark-lm-impressoes bg-card border-border z-[150]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-400">Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. Isso irá deletar permanentemente o tipo de folha.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600">Deletar</AlertDialogAction>
                          </AlertDialogFooter>
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

export default CadastroTiposFolhas;