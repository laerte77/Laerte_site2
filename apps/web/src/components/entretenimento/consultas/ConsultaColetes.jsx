import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, Trash2, Shirt, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';

const ConsultaColetes = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const isMounted = useIsMounted();
  
  const [coletes, setColetes] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({ jogador_id: '', possui_colete: 'sim' });
  const [saving, setSaving] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [partRes, colRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'ent_participantes', 'id, nome').order('nome', { ascending: true }),
        getAccessibleDataQuery(user.id, isAdmin, 'coletes', '*, participante:ent_participantes(nome)')
      ]);
      
      if (partRes.error) throw partRes.error;
      if (colRes.error) throw colRes.error;
      
      withIsMountedCheck(() => {
        setParticipantes(partRes.data || []);
        // Sort by participant name
        const sortedColetes = (colRes.data || []).sort((a, b) => {
           const nameA = a.participante?.nome || '';
           const nameB = b.participante?.nome || '';
           return nameA.localeCompare(nameB);
        });
        setColetes(sortedColetes);
      }, isMounted);
    } catch (error) {
      withIsMountedCheck(() => toast({ title: 'Erro ao buscar dados', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    } finally {
      withIsMountedCheck(() => setLoading(false), isMounted);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin]);

  const filteredColetes = useMemo(() => {
    if (!searchTerm) return coletes;
    return coletes.filter(c => 
      c.participante?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coletes, searchTerm]);

  const openEditModal = (item) => {
    setItemToEdit(item);
    setEditFormData({
      jogador_id: item.jogador_id,
      possui_colete: item.possui_colete ? 'sim' : 'nao'
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleEditSave = async () => {
    if (!editFormData.jogador_id) {
      toast({ title: 'Erro', description: 'Selecione um jogador.', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      // Check duplicate if changing player
      if (itemToEdit.jogador_id !== editFormData.jogador_id) {
        const { data: existing, error: checkError } = await getAccessibleDataQuery(user.id, isAdmin, 'coletes', 'id')
          .eq('jogador_id', editFormData.jogador_id)
          .neq('id', itemToEdit.id)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existing) {
          toast({ title: 'Aviso', description: 'Este jogador já possui um registro de colete.', variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      const dataToUpdate = {
        jogador_id: editFormData.jogador_id,
        possui_colete: editFormData.possui_colete === 'sim'
      };

      const { error } = await supabase.from('coletes').update(dataToUpdate).eq('id', itemToEdit.id);
      if (error) throw error;

      withIsMountedCheck(() => {
        toast({ title: 'Sucesso', description: 'Registro atualizado.' });
        closeEditModal();
        fetchData();
      }, isMounted);

    } catch (error) {
      withIsMountedCheck(() => toast({ title: 'Erro ao atualizar', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    } finally {
      withIsMountedCheck(() => setSaving(false), isMounted);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from('coletes').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      
      withIsMountedCheck(() => {
        toast({ title: 'Sucesso', description: 'Registro removido.' });
        setItemToDelete(null);
        fetchData();
      }, isMounted);
    } catch (error) {
      withIsMountedCheck(() => toast({ title: 'Erro ao remover', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    }
  };

  const stats = useMemo(() => {
    const total = coletes.length;
    const comColete = coletes.filter(c => c.possui_colete).length;
    const semColete = total - comColete;
    return { total, comColete, semColete };
  }, [coletes]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Consulta de Coletes</h2>
          <p className="text-muted-foreground mt-1">Gerencie a distribuição de coletes da pelada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Registrado</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Shirt className="w-8 h-8 text-primary opacity-80" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Com Colete</p>
              <p className="text-2xl font-bold text-green-500 mt-1">{stats.comColete}</p>
            </div>
            <Check className="w-8 h-8 text-green-500 opacity-80" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Sem Colete</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{stats.semColete}</p>
            </div>
            <X className="w-8 h-8 text-red-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por participante..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border">
                    <TableHead>Jogador (Participante)</TableHead>
                    <TableHead className="text-center w-32">Possui Colete?</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColetes.length > 0 ? (
                    filteredColetes.map((item) => (
                      <TableRow key={item.id} className="border-border hover:bg-secondary/30">
                        <TableCell className="font-medium">{item.participante?.nome || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          {item.possui_colete ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                              <Check className="w-3 h-3 mr-1" /> Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                              <X className="w-3 h-3 mr-1" /> Não
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        {searchTerm ? 'Nenhum colete encontrado para a busca.' : 'Nenhum colete registrado.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-md dark-entretenimento bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Registro
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <Label>Jogador <span className="text-destructive">*</span></Label>
              <Select value={editFormData.jogador_id} onValueChange={(v) => setEditFormData({ ...editFormData, jogador_id: v })}>
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
                value={editFormData.possui_colete} 
                onValueChange={(v) => setEditFormData({ ...editFormData, possui_colete: v })}
                className="flex flex-row gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="edit-sim" className="border-primary text-primary" />
                  <Label htmlFor="edit-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="edit-nao" className="border-primary text-primary" />
                  <Label htmlFor="edit-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditModal}>Cancelar</Button>
            <Button type="button" onClick={handleEditSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="dark-entretenimento bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover este registro de colete? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ConsultaColetes;