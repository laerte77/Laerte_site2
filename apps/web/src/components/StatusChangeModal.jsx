import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function StatusChangeModal({ isOpen, onClose, onStatusChange, currentStatus, tableName, recordId }) {
  const [status, setStatus] = useState(currentStatus || 'Pendente');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) setStatus(currentStatus || 'Pendente');
  }, [isOpen, currentStatus]);

  const handleSave = async () => {
    if (!recordId || !tableName) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tableName).update({ status }).eq('id', recordId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso!' });
      if (onStatusChange) onStatusChange();
      onClose();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-foreground border-border z-[200]">
        <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
            <SelectContent className="z-[210]">
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Pago Parcialmente">Pago Parcialmente</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}