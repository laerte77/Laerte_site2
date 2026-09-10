import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Check, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { normalizeString } from '@/lib/gastoRealUtils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ManualExpenseMatchModal = ({ isOpen, onClose, plannedExpense, actualExpenses, onMatchSuccess }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedId(plannedExpense?.matched_transaction_id || null);
    }
  }, [isOpen, plannedExpense]);

  const filteredExpenses = actualExpenses.filter(expense => {
    if (!searchTerm) return true;
    const term = normalizeString(searchTerm);
    const desc = normalizeString(expense.despesa || '');
    const cat = normalizeString(expense.categoria || '');
    return desc.includes(term) || cat.includes(term);
  });

  const handleSave = async () => {
    if (!plannedExpense) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('despesas_previstas')
        .update({ matched_transaction_id: selectedId })
        .eq('id', plannedExpense.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: selectedId 
          ? "Despesa vinculada manualmente com sucesso!" 
          : "Vínculo manual removido. Voltando ao modo automático.",
      });
      
      onMatchSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao salvar vínculo manual.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = () => {
      setSelectedId(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vincular Gasto Real</DialogTitle>
          <DialogDescription>
            Selecione a transação real que corresponde à despesa prevista: <span className="font-semibold text-foreground">{plannedExpense?.descricao}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despesa realizada..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 border rounded-md p-2">
          <div className="space-y-2">
            {filteredExpenses.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                   Nenhuma despesa encontrada neste mês.
               </div>
            ) : (
                filteredExpenses.map((expense) => {
                    const isSelected = selectedId === expense.id;
                    return (
                        <div 
                            key={expense.id}
                            onClick={() => setSelectedId(isSelected ? null : expense.id)}
                            className={`
                                flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'}
                            `}
                        >
                            <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">{expense.despesa}</span>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>{format(parseISO(expense.data), 'dd/MM/yyyy')}</span>
                                    {expense.categoria && <Badge variant="secondary" className="text-[10px] h-4">{expense.categoria}</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-sm">
                                    {expense.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex-1 flex justify-start">
            {selectedId && (
                 <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleUnmatch}>
                    Remover Vínculo
                 </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-primary">Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualExpenseMatchModal;