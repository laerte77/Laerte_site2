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

const CadastroDespesas = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [nomeDespesa, setNomeDespesa] = useState('');
  const [loading, setLoading] = useState(false);
  const [despesas, setDespesas] = useState([]);
  const [fetching, setFetching] = useState(true);

  const fetchDespesas = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await getAccessibleDataQuery(user.id, isAdmin, 'ent_despesas', '*').order('nome_despesa', { ascending: true });
      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, [user, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nomeDespesa.trim()) {
      toast({ title: 'Aviso', description: 'Nome da despesa é obrigatório.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('ent_despesas').insert([{ user_id: user.id, nome_despesa: nomeDespesa }]);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Despesa adicionada com sucesso!' });
      setNomeDespesa('');
      fetchDespesas();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await supabase.from('ent_despesas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Despesa excluída.' });
      fetchDespesas();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-primary">Cadastro de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Despesa <span className="text-destructive">*</span></Label>
              <Input value={nomeDespesa} onChange={(e) => setNomeDespesa(e.target.value)} placeholder="Ex: Aluguel da Quadra" required className="bg-input" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNomeDespesa('')}>Cancelar</Button>
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
          <CardTitle>Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {fetching ? (
             <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Despesa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.nome_despesa}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {despesas.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nenhuma despesa cadastrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroDespesas;