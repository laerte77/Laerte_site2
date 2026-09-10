import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';

const CadastroColetes = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const isMounted = useIsMounted();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participantes, setParticipantes] = useState([]);
  
  const [formData, setFormData] = useState({
    jogador_id: '',
    possui_colete: 'sim'
  });

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data, error } = await getAccessibleDataQuery(user.id, isAdmin, 'ent_participantes', 'id, nome').order('nome', { ascending: true });
      if (error) throw error;
      withIsMountedCheck(() => setParticipantes(data || []), isMounted);
    } catch (error) {
      withIsMountedCheck(() => toast({ title: 'Erro ao buscar participantes', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin]);

  const handleSave = async () => {
    if (!formData.jogador_id) {
      toast({ title: 'Erro', description: 'Selecione um jogador.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Check for duplicates
      const { data: existing, error: checkError } = await getAccessibleDataQuery(user.id, isAdmin, 'coletes', 'id')
        .eq('jogador_id', formData.jogador_id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existing) {
        toast({ title: 'Aviso', description: 'Este jogador já possui um registro de colete. Use a tela de Consulta para editar.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const dataToSave = {
        user_id: user.id,
        jogador_id: formData.jogador_id,
        possui_colete: formData.possui_colete === 'sim'
      };

      const { error } = await supabase.from('coletes').insert([dataToSave]);
      if (error) throw error;

      withIsMountedCheck(() => {
        toast({ title: 'Sucesso', description: 'Registro de colete salvo com sucesso!' });
        // Clear form but keep modal open
        setFormData({ jogador_id: '', possui_colete: 'sim' });
      }, isMounted);

    } catch (error) {
      withIsMountedCheck(() => toast({ title: 'Erro ao salvar', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    } finally {
      withIsMountedCheck(() => setLoading(false), isMounted);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setFormData({ jogador_id: '', possui_colete: 'sim' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Cadastro de Coletes</h2>
          <p className="text-muted-foreground mt-1">Registre quais participantes possuem colete da pelada.</p>
        </div>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-primary" />
            Gestão de Coletes
          </CardTitle>
          <CardDescription>
            Clique no botão abaixo para iniciar o registro contínuo de coletes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Iniciar Cadastro
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md dark-entretenimento bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Shirt className="w-5 h-5" />
              Registrar Colete
            </DialogTitle>
            <DialogDescription>
              Selecione o jogador e informe se ele possui o colete. A janela continuará aberta para facilitar múltiplos cadastros.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <Label>Jogador <span className="text-destructive">*</span></Label>
              <Select value={formData.jogador_id} onValueChange={(v) => setFormData({ ...formData, jogador_id: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione um participante..." />
                </SelectTrigger>
                <SelectContent className="dark-entretenimento border-border">
                  <ScrollArea className="h-[200px]">
                    {participantes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Possui Colete? <span className="text-destructive">*</span></Label>
              <RadioGroup 
                value={formData.possui_colete} 
                onValueChange={(v) => setFormData({ ...formData, possui_colete: v })}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="r-sim" className="border-primary text-primary" />
                  <Label htmlFor="r-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="r-nao" className="border-primary text-primary" />
                  <Label htmlFor="r-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button type="button" variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={loading} 
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Salvar Colete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CadastroColetes;