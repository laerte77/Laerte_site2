import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trash2, Edit } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';

const CadastroParticipantes = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editApelido, setEditApelido] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [participantes, setParticipantes] = useState([]);
  const [fetching, setFetching] = useState(true);

  const fetchParticipantes = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await getAccessibleDataQuery(user.id, isAdmin, 'ent_participantes', '*').order('nome', { ascending: true });
      if (error) throw error;
      setParticipantes(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchParticipantes();
  }, [user, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast({ title: 'Aviso', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('ent_participantes').insert([{ user_id: user.id, nome, apelido }]);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Participante adicionado com sucesso!' });
      setNome('');
      setApelido('');
      fetchParticipantes();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (p) => {
    setEditId(p.id);
    setEditNome(p.nome);
    setEditApelido(p.apelido || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editNome.trim()) {
      toast({ title: 'Aviso', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setEditLoading(true);
    try {
      const { error } = await supabase.from('ent_participantes').update({ nome: editNome, apelido: editApelido }).eq('id', editId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Participante atualizado com sucesso!' });
      setIsEditModalOpen(false);
      fetchParticipantes();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('ent_participantes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Participante excluído.' });
      fetchParticipantes();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-primary">Cadastro de Participantes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" required className="bg-input" />
              </div>
              <div className="space-y-2">
                <Label>Apelido</Label>
                <Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Apelido (opcional)" className="bg-input" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setNome(''); setApelido(''); }}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Lista de Participantes</CardTitle>
        </CardHeader>
        <CardContent>
          {fetching ? (
             <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Apelido</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>{p.apelido || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)} className="text-primary hover:text-primary hover:bg-primary/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {participantes.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum participante cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[400px] dark-entretenimento bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-primary">Editar Participante</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} required className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Apelido</Label>
              <Input value={editApelido} onChange={(e) => setEditApelido(e.target.value)} className="bg-input" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {editLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CadastroParticipantes;