import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PARENTESCOS = ['Titular', 'Cônjuge', 'Filho(a)', 'Pai/Mãe', 'Irmão(ã)', 'Outro'];

const CartaoUsuarios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', parentesco: 'Titular' });

  const fetchUsuarios = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoal_cartao_usuarios')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });
    if (error) toast({ title: 'Erro ao buscar pessoas', variant: 'destructive' });
    else setUsuarios(data || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchUsuarios();
    if (!user) return;
    const channel = supabase.channel('pessoal_cartao_usuarios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoal_cartao_usuarios' }, fetchUsuarios)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchUsuarios]);

  const resetForm = () => {
    setFormData({ nome: '', parentesco: 'Titular' });
    setEditingId(null);
  };

  const openDialog = (usuario = null) => {
    if (usuario) {
      setFormData({ nome: usuario.nome || '', parentesco: usuario.parentesco || 'Titular' });
      setEditingId(usuario.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => { setIsDialogOpen(false); resetForm(); };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome da pessoa.', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: user.id,
      nome: formData.nome.trim(),
      parentesco: formData.parentesco,
    };
    if (editingId) {
      const { error } = await supabase.from('pessoal_cartao_usuarios').update(payload).eq('id', editingId);
      if (error) toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Pessoa atualizada.', className: 'bg-green-500 text-white' });
    } else {
      const { error } = await supabase.from('pessoal_cartao_usuarios').insert(payload);
      if (error) toast({ title: 'Erro', description: 'Não foi possível cadastrar.', variant: 'destructive' });
      else toast({ title: 'Sucesso!', description: 'Pessoa cadastrada.', className: 'bg-green-500 text-white' });
    }
    closeDialog();
    fetchUsuarios();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('pessoal_cartao_usuarios').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    else { toast({ title: 'Sucesso!', description: 'Pessoa excluída.', className: 'bg-red-500 text-white' }); fetchUsuarios(); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-blue-500 mb-2">Pessoas do Cartão</h2>
            <p className="text-muted-foreground">Cadastre quem usa os cartões e atribua responsáveis às compras (A-Z)</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Nova Pessoa
          </Button>
        </div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="dark-pessoal bg-card border-border sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-blue-500">{editingId ? 'Editar' : 'Nova'} Pessoa</DialogTitle>
            <DialogDescription>Informe o nome e o parentesco da pessoa autorizada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Maria Silva" className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Parentesco / Relação</Label>
              <select
                value={formData.parentesco}
                onChange={(e) => setFormData(p => ({ ...p, parentesco: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : usuarios.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="mx-auto w-12 h-12 mb-3 opacity-50" />
            <p>Nenhuma pessoa cadastrada.</p>
            <p className="text-sm mt-1">Cadastre quem usa os cartões para atribuir responsáveis às compras.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((usuario) => (
            <motion.div key={usuario.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border bg-gradient-to-br from-blue-600/10 to-blue-900/20 border-blue-500/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground leading-tight">{usuario.nome}</h3>
                        <span className="text-xs text-muted-foreground">{usuario.parentesco || '—'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" onClick={() => openDialog(usuario)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="dark-pessoal bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Pessoa</AlertDialogTitle>
                            <AlertDialogDescription>Isso removerá a pessoa. As compras já lançadas manterão o nome do responsável até serem editadas. Deseja continuar?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(usuario.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CartaoUsuarios;
