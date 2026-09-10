import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const LancamentoMetas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormData = { data: format(new Date(), 'yyyy-MM-dd'), descricao: '', valor_meta: '', valor_atingido: '', status: 'nao_atingida' };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchMetas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('lm_lancamentos_metas').select('*').eq('user_id', user.id).order('data', { ascending: false });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setMetas(data || []);
    } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', description: 'Não foi possível carregar as metas.', variant: 'destructive' }); } finally { if (isMountedRef.current) setLoading(false); }
  }, [user, toast]);

  useEffect(() => { fetchMetas(); }, [fetchMetas]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleOpenDialog = (item = null) => {
    if (item) { setEditingId(item.id); setFormData({ data: item.data, descricao: item.descricao, valor_meta: item.valor_meta, valor_atingido: item.valor_atingido || 0, status: item.status || 'nao_atingida' }); } else { setEditingId(null); setFormData(initialFormData); }
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor_meta || !formData.data) { toast({ title: 'Atenção', description: 'Preencha Data, Descrição e Valor Meta.', variant: 'destructive' }); return; }
    try {
      const payload = { user_id: user.id, data: formData.data, descricao: formData.descricao, valor_meta: parseFloat(formData.valor_meta), valor_atingido: parseFloat(formData.valor_atingido || 0), status: formData.status };
      if (editingId) { await supabase.from('lm_lancamentos_metas').update(payload).eq('id', editingId); toast({ title: 'Sucesso', description: 'Meta atualizada.' }); setEditingId(null); } else { await supabase.from('lm_lancamentos_metas').insert([payload]); toast({ title: 'Sucesso', description: 'Meta adicionada.' }); }
      setFormData(prev => ({ ...initialFormData, data: prev.data }));
      fetchMetas();
      setIsAddModalOpen(false);
    } catch (error) { toast({ title: 'Erro', description: 'Falha ao salvar meta.', variant: 'destructive' }); }
  };

  const handleDelete = async (id) => { try { await supabase.from('lm_lancamentos_metas').delete().eq('id', id); toast({ title: 'Sucesso', description: 'Meta removida.' }); fetchMetas(); } catch (error) { toast({ title: 'Erro', description: 'Falha.', variant: 'destructive' }); } };
  const formatDateDisplay = (dateString) => { if (!dateString) return '-'; try { return format(parse(dateString, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch (e) { return dateString; } };
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-primary">Acompanhamento de Metas</h1><p className="text-muted-foreground mt-1">Defina e acompanhe suas metas financeiras.</p></div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" /> Nova Meta</Button>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="data">Data *</Label><Input type="date" id="data" name="data" value={formData.data} onChange={handleInputChange} required /></div>
            <div className="space-y-2"><Label htmlFor="descricao">Descrição da Meta *</Label><Input id="descricao" name="descricao" placeholder="Ex: Faturamento Mensal" value={formData.descricao} onChange={handleInputChange} required /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="valor_meta">Valor Meta (R$) *</Label><Input type="number" id="valor_meta" name="valor_meta" step="0.01" placeholder="0,00" value={formData.valor_meta} onChange={handleInputChange} required /></div><div className="space-y-2"><Label htmlFor="valor_atingido">Valor Atingido (R$)</Label><Input type="number" id="valor_atingido" name="valor_atingido" step="0.01" placeholder="0,00" value={formData.valor_atingido} onChange={handleInputChange} /></div></div>
            <div className="space-y-2"><Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(val) => setFormData(prev => ({...prev, status: val}))}><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger><SelectContent><SelectItem value="atingida">Atingida</SelectItem><SelectItem value="nao_atingida">Não Atingida</SelectItem></SelectContent></Select></div>
            <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => { setIsAddModalOpen(false); setFormData(initialFormData); setEditingId(null); }}>Cancelar</Button><Button type="submit">{editingId ? 'Atualizar' : 'Salvar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm border-border/50 overflow-hidden"><CardContent className="p-0"><ScrollArea className="h-[500px]"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead className="w-[120px]">Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Meta</TableHead><TableHead className="text-right">Atingido</TableHead><TableHead className="text-center">Progresso</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center w-[100px]">Ações</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando dados...</TableCell></TableRow> : metas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma meta cadastrada.</TableCell></TableRow> : metas.map((item) => { const percent = item.valor_meta > 0 ? ((item.valor_atingido / item.valor_meta) * 100).toFixed(0) : 0; const isSuccess = item.status === 'atingida'; return (<TableRow key={item.id} className="hover:bg-accent/30 transition-colors"><TableCell className="font-medium">{formatDateDisplay(item.data)}</TableCell><TableCell className="font-semibold">{item.descricao}</TableCell><TableCell className="text-right font-medium text-blue-500">{formatCurrency(item.valor_meta)}</TableCell><TableCell className="text-right font-medium text-green-500">{formatCurrency(item.valor_atingido)}</TableCell><TableCell className="text-center"><div className="flex items-center justify-center gap-2"><div className="w-full max-w-[80px] bg-secondary rounded-full h-2 overflow-hidden"><div className="bg-primary h-full transition-all" style={{ width: `${Math.min(percent, 100)}%` }} /></div><span className="text-xs font-medium w-8 text-right">{percent}%</span></div></TableCell><TableCell className="text-center"><Badge variant="outline" className={isSuccess ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"}>{isSuccess ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}{isSuccess ? 'Atingida' : 'Pendente'}</Badge></TableCell><TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>) })}</TableBody></Table></ScrollArea></CardContent></Card>
    </motion.div>
  );
};

export default LancamentoMetas;