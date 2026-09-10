import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2 } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';

const CadastroOrganizadores = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [loading, setLoading] = useState(false);
  const [organizadores, setOrganizadores] = useState([]);
  const [fetching, setFetching] = useState(true);

  const fetchOrganizadores = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await getAccessibleDataQuery(user.id, isAdmin, 'ent_organizadores', '*').order('nome', { ascending: true });
      if (error) throw error;
      setOrganizadores(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchOrganizadores();
  }, [user, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast({ title: 'Aviso', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('ent_organizadores').insert([{ user_id: user.id, nome, apelido }]);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Organizador adicionado com sucesso!' });
      setNome('');
      setApelido('');
      fetchOrganizadores();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('ent_organizadores').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Organizador excluído.' });
      fetchOrganizadores();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-primary">Cadastro de Organizadores</CardTitle>
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
          <CardTitle>Lista de Organizadores</CardTitle>
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
                {organizadores.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.nome}</TableCell>
                    <TableCell>{o.apelido || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {organizadores.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum organizador cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroOrganizadores;