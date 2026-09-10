import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { Heart, PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

const LancamentoCasamentos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [casamentos, setCasamentos] = useState([]);
  const [filteredCasamentos, setFilteredCasamentos] = useState([]);
  const [membros, setMembros] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState('');
  const [membroId, setMembroId] = useState('');

  const fetchCasamentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('igreja_casamentos')
        .select('*, membro:igreja_membros(nome_completo)')
        .order('data', { ascending: false });

      if (error) throw error;
      setCasamentos(result || []);
    } catch (error) {
      toast({ title: 'Erro ao buscar casamentos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchMembros = useCallback(async () => {
    if (!user) return;
    try {
      const { data: result, error } = await supabase
        .from('igreja_membros')
        .select('id, nome_completo')
        .order('nome_completo', { ascending: true });

      if (error) throw error;
      setMembros(result || []);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  useEffect(() => {
    fetchCasamentos();
    fetchMembros();

    if (user) {
      const channel = supabase.channel('public:igreja_casamentos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_casamentos' }, fetchCasamentos)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [fetchCasamentos, fetchMembros, user]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = casamentos.filter(item => 
      item.membro?.nome_completo?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredCasamentos(filtered);
  }, [searchTerm, casamentos]);

  const resetForm = () => {
    setData('');
    setMembroId('');
    setEditingId(null);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setData(item.data);
      setMembroId(item.membro_id);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data || !membroId) {
      toast({ title: 'Aviso', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        data,
        membro_id: membroId,
        user_id: user.id
      };

      if (editingId) {
        const { error } = await supabase.from('igreja_casamentos').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Casamento atualizado com sucesso!' });
        handleCloseModal();
      } else {
        const { error } = await supabase.from('igreja_casamentos').insert([payload]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Casamento adicionado com sucesso!' });
        // Do not close modal, just reset for next entry
        resetForm();
      }
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('igreja_casamentos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Casamento excluído com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Helmet><title>Lançamento de Casamentos | Secretaria</title></Helmet>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Heart className="w-8 h-8" />
              Lançamento de Casamentos
            </h1>
            <p className="text-muted-foreground mt-1">Registre e gerencie os casamentos dos membros.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Casamento
          </Button>
        </div>

        <Card className="glass-card bg-card border-border">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por membro..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9 bg-background/50 border-input" 
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-primary">Data</TableHead>
                    <TableHead className="font-semibold text-primary">Membro</TableHead>
                    <TableHead className="text-right font-semibold text-primary">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan="3" className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                          Carregando...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCasamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="3" className="h-32 text-center text-muted-foreground">
                        Nenhum casamento encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCasamentos.map((item) => (
                      <TableRow key={item.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">{format(parseISO(item.data), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{item.membro?.nome_completo || 'Membro não encontrado'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="dark-igreja border-border bg-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover este registro de casamento? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="text-xs text-muted-foreground text-right px-2 mt-2">
              Total de registros: {filteredCasamentos.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-[425px] dark-igreja border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Heart className="w-5 h-5 text-primary" />}
              {editingId ? 'Editar Casamento' : 'Novo Casamento'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="data" className="text-foreground">Data do Casamento <span className="text-destructive">*</span></Label>
              <Input 
                id="data" 
                type="date" 
                value={data} 
                onChange={(e) => setData(e.target.value)} 
                className="bg-background/50 border-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="membro_id" className="text-foreground">Membro <span className="text-destructive">*</span></Label>
              <Select value={membroId} onValueChange={setMembroId} required>
                <SelectTrigger className="bg-background/50 border-input">
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent className="dark-igreja border-border max-h-[300px]">
                  {membros.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="bg-transparent border-border hover:bg-secondary">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LancamentoCasamentos;