import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function ManualExpenseMatchModal({ isOpen, onClose, expense, onSave }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [actualExpenses, setActualExpenses] = useState([]);
  const [fetchingExpenses, setFetchingExpenses] = useState(false);
  
  const [matchMode, setMatchMode] = useState('link'); // 'link' or 'manual'
  const [selectedMatchId, setSelectedMatchId] = useState('none');
  const [manualAmount, setManualAmount] = useState('');

  useEffect(() => {
    if (isOpen && expense) {
      setManualAmount(expense.valor_previsto.toString());
      setMatchMode('link');
      setSelectedMatchId('none');
      fetchUnmatchedExpenses();
    }
  }, [isOpen, expense]);

  const fetchUnmatchedExpenses = async () => {
    if (!expense) return;
    setFetchingExpenses(true);
    try {
      // Get all despesas for this user from current month
      const start = format(parseISO(expense.data_vencimento), 'yyyy-MM-01');
      
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user.id)
        .gte('data', start)
        .order('data', { ascending: false });

      if (error) throw error;
      setActualExpenses(data || []);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível buscar os lançamentos.' });
    } finally {
      setFetchingExpenses(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (matchMode === 'link' && selectedMatchId !== 'none') {
        const { error } = await supabase
          .from('despesas_previstas')
          .update({ 
            matched_transaction_id: selectedMatchId,
            status: 'Pago' 
          })
          .eq('id', expense.id);
          
        if (error) throw error;
      } else if (matchMode === 'manual') {
        // Just mark as paid directly without matching an existing id
        const { error } = await supabase
          .from('despesas_previstas')
          .update({ 
            status: 'Pago',
            valor: Number(manualAmount),
            matched_transaction_id: null
          })
          .eq('id', expense.id);
          
        if (error) throw error;
      }
      
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso!' });
      onSave();
      onClose();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Atualizar Status da Conta</DialogTitle>
          <DialogDescription>
            {expense.descricao} - {formatCurrency(expense.valor_previsto)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Modo de Atualização</Label>
            <Select value={matchMode} onValueChange={setMatchMode}>
              <SelectTrigger className="bg-input text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Vincular a um Lançamento Existente</SelectItem>
                <SelectItem value="manual">Marcar como Pago Manualmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {matchMode === 'link' ? (
            <div className="flex flex-col gap-2">
              <Label>Lançamento Correspondente</Label>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger className="bg-input text-foreground">
                  <SelectValue placeholder={fetchingExpenses ? "Buscando..." : "Selecione o lançamento real"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Remover vínculo)</SelectItem>
                  {actualExpenses.map(exp => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {format(parseISO(exp.data), 'dd/MM')} - {exp.despesa} ({formatCurrency(Number(exp.valor))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Valor Real Pago (R$)</Label>
              <Input 
                type="number" 
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || (matchMode === 'link' && selectedMatchId === 'none')} className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal))]/80">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}