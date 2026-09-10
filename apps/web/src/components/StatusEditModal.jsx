import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react';

const StatusEditModal = ({ isOpen, onClose, expense, onUpdateSuccess }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && expense) {
      setStatus(expense.status || 'Pendente');
    }
  }, [isOpen, expense]);

  const handleSave = async () => {
    if (!expense) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('despesas_previstas')
        .update({ status: status })
        .eq('id', expense.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da despesa atualizado com sucesso!",
      });
      
      onUpdateSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Status</DialogTitle>
          <DialogDescription>
            Defina manualmente o status para: <span className="font-semibold text-foreground">{expense?.descricao}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Selecione o Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Paga">
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" /> Paga
                    </div>
                </SelectItem>
                <SelectItem value="Parcialmente Paga">
                    <div className="flex items-center gap-2 text-yellow-600">
                         <Check className="w-4 h-4" /> Parcialmente Paga
                    </div>
                </SelectItem>
                <SelectItem value="Pendente">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-4 h-4" /> Pendente
                    </div>
                </SelectItem>
                <SelectItem value="Atrasada">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" /> Atrasada
                    </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-primary">Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusEditModal;