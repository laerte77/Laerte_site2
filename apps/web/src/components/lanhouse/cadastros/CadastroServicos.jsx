import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroServicos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentServico, setCurrentServico] = useState(null);
  const [formData, setFormData] = useState({
    servico: '',
    valor: '',
    usa_folha: false,
  });

  const fetchServicos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('lm_servicos')
        .select('*')
        .eq('user_id', user.id)
        .order('servico', { ascending: true });

      if (error) {
        // Check if error is related to missing column
        if (error.message?.includes('column') && error.message?.includes('usa_folha')) {
          console.warn('⚠️ usa_folha column not found in database. Using fallback behavior.');
          toast({ 
            title: 'Aviso', 
            description: 'O campo "Usa Folha" ainda não está disponível. Execute a migração do banco de dados.', 
            variant: 'destructive' 
          });
        } else {
          throw error;
        }
      }

      // Ensure usa_folha field exists in data, default to false if missing
      const servicosWithFolha = (data || []).map(servico => ({
        ...servico,
        usa_folha: servico.usa_folha !== undefined ? servico.usa_folha : false
      }));

      console.log('✅ Serviços carregados:', servicosWithFolha.length);
      console.log('📋 Sample servico with usa_folha:', servicosWithFolha[0]);
      
      setServicos(servicosWithFolha);
    } catch (error) {
      console.error('❌ Erro ao buscar serviços:', error);
      toast({ 
        title: 'Erro ao buscar serviços', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchServicos();
  }, [fetchServicos]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('lm_servicos_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_servicos',
        filter: `user_id=eq.${user.id}`
      }, () => fetchServicos())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchServicos]);

  const resetForm = () => {
    setFormData({ servico: '', valor: '', usa_folha: false });
    setCurrentServico(null);
  };

  const handleSave = async () => {
    if (!formData.servico.trim()) {
      toast({
        title: 'Erro de Validação',
        description: 'O nome do serviço é obrigatório.',
        variant: 'destructive',
      });
      return;
    }
    
    const dataToSave = { 
      servico: formData.servico.trim(),
      valor: formData.valor || 0, 
      usa_folha: formData.usa_folha,
      user_id: user.id 
    };

    console.log('💾 Salvando serviço:', dataToSave);

    try {
      if (currentServico) {
        const { error } = await supabase
          .from('lm_servicos')
          .update(dataToSave)
          .eq('id', currentServico.id);
        
        if (error) throw error;
        
        console.log('✅ Serviço atualizado com sucesso');
        toast({ 
          title: 'Sucesso!', 
          description: 'Serviço atualizado com sucesso.', 
          className: 'bg-green-500 text-white' 
        });
      } else {
        const { data: insertedData, error } = await supabase
          .from('lm_servicos')
          .insert(dataToSave)
          .select();
        
        if (error) throw error;
        
        console.log('✅ Serviço cadastrado:', insertedData[0]);
        toast({ 
          title: 'Sucesso!', 
          description: 'Novo serviço cadastrado com sucesso.', 
          className: 'bg-green-500 text-white' 
        });
      }
      
      resetForm();
      setIsDialogOpen(false);
      fetchServicos();
    } catch (error) {
      console.error('❌ Erro ao salvar serviço:', error);
      
      // Provide specific error message for usa_folha column issues
      if (error.message?.includes('column') && error.message?.includes('usa_folha')) {
        toast({
          title: 'Erro de Banco de Dados',
          description: 'O campo "Usa Folha" não está disponível. Execute a migração do banco de dados primeiro.',
          variant: 'destructive',
        });
      } else {
        toast({ 
          title: 'Erro ao salvar serviço', 
          description: error.message, 
          variant: 'destructive' 
        });
      }
    }
  };

  const openDialog = (servico = null) => {
    setCurrentServico(servico);
    setFormData(servico ? { 
      servico: servico.servico, 
      valor: servico.valor,
      usa_folha: servico.usa_folha !== undefined ? servico.usa_folha : false
    } : { servico: '', valor: '', usa_folha: false });
    setIsDialogOpen(true);
    
    if (servico) {
      console.log('✏️ Editando serviço:', servico);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('lm_servicos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('🗑️ Serviço removido:', id);
      toast({ 
        title: 'Serviço Removido', 
        description: 'O serviço foi removido com sucesso.', 
        className: 'bg-red-500 text-white' 
      });
      
      fetchServicos();
    } catch (error) {
      console.error('❌ Erro ao remover serviço:', error);
      toast({ 
        title: 'Erro ao remover serviço', 
        description: error.message, 
        variant: 'destructive' 
      });
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
            Cadastro de Serviços
          </h2>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark-lm-impressoes bg-card border-border text-foreground z-[100]">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">{currentServico ? 'Editar' : 'Adicionar'} Serviço</DialogTitle>
              <DialogDescription>Preencha as informações do serviço abaixo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome" className="text-right text-muted-foreground">Nome</Label>
                <Input 
                  id="nome" 
                  value={formData.servico} 
                  onChange={(e) => setFormData({...formData, servico: e.target.value})} 
                  className="col-span-3 bg-background/70 border-border focus:border-cyan-400 text-foreground" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="valor" className="text-right text-muted-foreground">Valor</Label>
                <Input 
                  id="valor" 
                  type="number" 
                  value={formData.valor} 
                  onChange={(e) => setFormData({...formData, valor: e.target.value})} 
                  placeholder="R$ 0,00" 
                  className="col-span-3 bg-background/70 border-border focus:border-cyan-400 text-foreground" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usa_folha" className="text-right text-muted-foreground">Usa Folha?</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="usa_folha"
                    checked={formData.usa_folha}
                    onCheckedChange={(checked) => setFormData({...formData, usa_folha: checked})}
                  />
                  <Label htmlFor="usa_folha" className="text-sm text-muted-foreground cursor-pointer">
                    {formData.usa_folha ? 'Sim, consome folhas' : 'Não consome folhas'}
                  </Label>
                </div>
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
                <th className="p-4 text-left font-semibold text-muted-foreground">Nome do Serviço</th>
                <th className="p-4 text-left font-semibold text-muted-foreground">Valor</th>
                <th className="p-4 text-center font-semibold text-muted-foreground">Usa Folha?</th>
                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : servicos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground">
                    <Settings className="mx-auto w-10 h-10 mb-2" />
                    Nenhum serviço cadastrado ainda.
                  </td>
                </tr>
              ) : (
                servicos.map((servico) => (
                  <tr key={servico.id} className="border-b border-border last:border-b-0 hover:bg-blue-500/10 transition-colors duration-200">
                    <td className="p-4 text-foreground">{servico.servico}</td>
                    <td className="p-4 text-cyan-400">R$ {parseFloat(servico.valor || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {servico.usa_folha ? (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30">
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Não
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(servico)}>
                        <Edit className="w-4 h-4 text-cyan-400" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="dark-lm-impressoes bg-card border-border z-[150]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-400">Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente o serviço.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(servico.id)} className="bg-red-500 hover:bg-red-600">Deletar</AlertDialogAction>
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

export default CadastroServicos;