import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Users, Loader2 } from 'lucide-react';
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

const formatPhoneNumber = (value) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return `(${phoneNumber}`;
  if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

const CadastroClientes = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    apelido: '',
  });

  // Validation States
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const fetchClientes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('lm_clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao buscar clientes', description: error.message, variant: 'destructive' });
    } else {
      setClientes(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('lm_clientes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lm_clientes',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        fetchClientes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchClientes]);

  // Real-time Name Validation
  useEffect(() => {
    let isMounted = true;

    const checkDuplicateName = async () => {
      const nomeToCheck = formData.nome.trim();

      if (!nomeToCheck) {
        if (isMounted) {
          setNameError('');
          setIsCheckingName(false);
        }
        return;
      }

      // Skip validation if editing the same name
      if (currentCliente && nomeToCheck.toLowerCase() === currentCliente.nome.toLowerCase()) {
        if (isMounted) {
          setNameError('');
          setIsCheckingName(false);
        }
        return;
      }

      if (isMounted) setIsCheckingName(true);

      try {
        const { data, error } = await supabase
          .from('lm_clientes')
          .select('id, nome')
          .eq('user_id', user.id)
          .ilike('nome', nomeToCheck);

        if (isMounted) {
          if (!error && data && data.length > 0) {
            // Precise case-insensitive check
            const duplicate = data.find(
              c => c.nome.toLowerCase() === nomeToCheck.toLowerCase() && c.id !== currentCliente?.id
            );

            if (duplicate) {
              setNameError('Cliente com este nome já existe');
            } else {
              setNameError('');
            }
          } else {
            setNameError('');
          }
        }
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        if (isMounted) setIsCheckingName(false);
      }
    };

    // Debounce the check to avoid excessive DB calls
    const timeoutId = setTimeout(checkDuplicateName, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [formData.nome, currentCliente, user?.id]);

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const resetForm = () => {
    setFormData({ nome: '', telefone: '', apelido: '' });
    setCurrentCliente(null);
    setNameError('');
    setIsCheckingName(false);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Erro de Validação',
        description: 'O nome do cliente é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (nameError) return;

    const dataToSave = { ...formData, user_id: user.id };

    if (currentCliente) {
      const { error } = await supabase.from('lm_clientes').update(dataToSave).eq('id', currentCliente.id);
      if (error) {
        toast({ title: 'Erro ao atualizar cliente', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Cliente atualizado com sucesso.', className: 'bg-green-500 text-white' });
      }
    } else {
      const { error } = await supabase.from('lm_clientes').insert(dataToSave);
      if (error) {
        toast({ title: 'Erro ao cadastrar cliente', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Novo cliente cadastrado.', className: 'bg-green-500 text-white' });
      }
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openDialog = (cliente = null) => {
    setCurrentCliente(cliente);
    setFormData(
      cliente
        ? { nome: cliente.nome, telefone: cliente.telefone, apelido: cliente.apelido }
        : { nome: '', telefone: '', apelido: '' }
    );
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('lm_clientes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover cliente', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cliente Removido', description: 'O cliente foi removido com sucesso.', className: 'bg-red-500 text-white' });
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
            Cadastro de Clientes
          </h2>
          <p className="text-muted-foreground">Gerencie sua base de clientes.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] dark-lm-impressoes bg-card border-border text-foreground z-[100]">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">
                {currentCliente ? 'Editar Cliente' : 'Adicionar Cliente'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do cliente abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="nome" className="text-right text-muted-foreground mt-3">
                  Nome
                </Label>
                <div className="col-span-3 flex flex-col gap-1">
                  <div className="relative w-full">
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className={`bg-background/70 border-border focus:border-cyan-400 w-full ${nameError ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="Nome do cliente"
                    />
                    {isCheckingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      </div>
                    )}
                  </div>
                  {nameError && (
                    <span className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                      {nameError}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefone" className="text-right text-muted-foreground">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={handlePhoneChange}
                  placeholder="(83) 99999-9999"
                  className="col-span-3 bg-background/70 border-border focus:border-cyan-400"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apelido" className="text-right text-muted-foreground">
                  Apelido
                </Label>
                <Input
                  id="apelido"
                  value={formData.apelido}
                  onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                  className="col-span-3 bg-background/70 border-border focus:border-cyan-400"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button 
                onClick={handleSave} 
                disabled={isCheckingName || !!nameError || !formData.nome.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 text-primary-foreground disabled:opacity-50"
              >
                {isCheckingName ? 'Verificando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-lg shadow-cyan-500/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-semibold text-muted-foreground">Nome</th>
                <th className="p-4 text-left font-semibold text-muted-foreground">Telefone</th>
                <th className="p-4 text-left font-semibold text-muted-foreground">Apelido</th>
                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground">Carregando...</td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground">
                    <Users className="mx-auto w-10 h-10 mb-2" />
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-border last:border-b-0 hover:bg-blue-500/10 transition-colors duration-200">
                    <td className="p-4 text-foreground">{cliente.nome}</td>
                    <td className="p-4 text-foreground">{cliente.telefone || '-'}</td>
                    <td className="p-4 text-foreground">{cliente.apelido || '-'}</td>
                    <td className="p-4 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(cliente)}>
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
                              Essa ação não pode ser desfeita. Isso irá deletar permanentemente o cliente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(cliente.id)} className="bg-red-500 hover:bg-red-600">Deletar</AlertDialogAction>
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

export default CadastroClientes;