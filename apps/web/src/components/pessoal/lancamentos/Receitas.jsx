import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Download, Search, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';
import { exportToExcel } from '@/lib/ExportUtils';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { saveOfflineData } from '@/lib/offlineStorage';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

const Receitas = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline, checkPending } = useOnlineStatus();
  const isMountedRef = useRef(true);
  const [receitas, setReceitas] = useState([]);
  const [tiposReceita, setTiposReceita] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentReceita, setCurrentReceita] = useState(null);
  
  const initialFormData = { data: new Date().toISOString().split('T')[0], receita: '', valor: '', origem: '' };
  const [formData, setFormData] = useState(initialFormData);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [receitasRes, tiposRes] = await Promise.all([
        // Modified: Order by receita ascending (A-Z)
        supabase.from('receitas').select('*').eq('user_id', user.id).order('data', { ascending: false }),
        supabase.from('tipos_receita').select('id, nome_receita').eq('user_id', user.id),
      ]);
      if (!isMountedRef.current) return;
      if (receitasRes.error) throw receitasRes.error;
      if (tiposRes.error) throw tiposRes.error;
      setReceitas(receitasRes.data || []);
      setTiposReceita(tiposRes.data || []);
    } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } finally { if (isMountedRef.current) setLoading(false); }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('pessoal_receitas_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'receitas' }, () => { if(isMountedRef.current) fetchData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const filteredItems = useMemo(() => {
    return receitas.filter(item => {
        const itemDate = new Date(item.data);
        const monthMatch = selectedMonth === 'all' || itemDate.getUTCMonth() === parseInt(selectedMonth);
        const yearMatch = selectedYear === 'all' || itemDate.getUTCFullYear() === parseInt(selectedYear);
        const searchMatch = !searchTerm || (item.receita?.toLowerCase().includes(searchTerm.toLowerCase()) || item.origem?.toLowerCase().includes(searchTerm.toLowerCase()));
        return monthMatch && yearMatch && searchMatch;
    });
  }, [receitas, selectedMonth, selectedYear, searchTerm]);

  const totalPeriodo = filteredItems.reduce((acc, curr) => acc + Number(curr.valor), 0);

  const resetForm = useCallback(() => { 
    setFormData(prev => ({ ...initialFormData, data: prev.data || initialFormData.data })); 
    setCurrentReceita(null); 
  }, [initialFormData]);

  const handleCloseModal = useCallback(() => {
    setIsDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSave = async () => {
    if (!formData.data || !formData.receita || !formData.valor) { toast({ title: 'Erro', description: 'Preencha os campos obrigatórios.', variant: 'destructive' }); return; }
    const dataToSave = { data: formData.data, receita: formData.receita, valor: parseFloat(formData.valor), origem: formData.origem, user_id: user.id };
    
    try {
      if (!isOnline && !currentReceita) {
        await saveOfflineData('pessoal_receitas', dataToSave);
        if (isMountedRef.current) { toast({ title: 'Offline', description: 'Salvo localmente.' }); resetForm(); }
        checkPending();
      } else if (currentReceita) {
        if (!isOnline) { toast({ title: 'Offline', description: 'Edição offline não permitida.', variant: 'destructive' }); return; }
        const { error } = await supabase.from('receitas').update(dataToSave).eq('id', currentReceita.id);
        if (error) throw error;
        if (isMountedRef.current) { toast({ title: 'Sucesso', description: 'Atualizada.' }); resetForm(); }
      } else {
        const { error } = await supabase.from('receitas').insert(dataToSave);
        if (error) throw error;
        if (isMountedRef.current) { toast({ title: 'Sucesso', description: 'Registrada.' }); resetForm(); }
      }
    } catch (error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
  };

  const openDialog = (item = null) => {
    if (item) { setCurrentReceita(item); setFormData({ data: item.data || '', receita: item.receita || '', valor: item.valor || '', origem: item.origem || '' }); } else { resetForm(); }
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (!isOnline) { toast({ title: 'Offline', description: 'Exclusão offline não permitida.', variant: 'destructive' }); return; }
    try {
      const { error } = await supabase.from('receitas').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      if (isMountedRef.current) { toast({ title: 'Removido' }); setItemToDelete(null); }
    } catch (error) { if (isMountedRef.current) toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
  };

  const handleExport = () => {
    if (filteredItems.length === 0) { toast({ title: 'Aviso', description: 'Nenhum dado para exportar.', variant: 'destructive' }); return; }
    const dataToExport = filteredItems.map(item => ({ 'Data': new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), 'Descrição': item.origem || '-', 'Categoria': item.receita, 'Valor': parseFloat(item.valor) }));
    exportToExcel(dataToExport, 'Lançamento_Receitas', 'Receitas');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dark-pessoal space-y-6">
      <OfflineIndicator />
      <div className="glass-card overflow-hidden">
        <div className="bg-card border-b border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20"><TrendingUp className="w-8 h-8 text-blue-500" /></div>
            <div><h1 className="text-2xl font-bold text-blue-500">Lançamento de Receitas</h1><p className="text-muted-foreground text-sm">Registre suas entradas financeiras (A-Z)</p></div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExport} variant="outline" className="border-border hover:bg-secondary"><Download className="w-4 h-4 mr-2" /> Excel</Button>
            <Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="border-border hover:bg-secondary"><Search className="w-4 h-4 mr-2" />Selecionar Registro</Button>
            <Button onClick={() => openDialog()} className="bg-blue-600 text-white hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por descrição ou categoria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-input" /></div>
          <div className="w-full md:w-48"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="bg-input"><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent className="dark-pessoal bg-card"><SelectItem value="all">Todos os Meses</SelectItem>{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-full md:w-32"><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="bg-input"><SelectValue placeholder="Ano" /></SelectTrigger><SelectContent className="dark-pessoal bg-card"><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <Card className="bg-card border-border shadow-lg"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total no Período</p><p className="text-2xl font-bold text-green-400 mt-1">R$ {totalPeriodo.toFixed(2)}</p></div><div className="p-3 bg-green-400/10 rounded-full border border-green-400/20"><DollarSign className="w-6 h-6 text-green-400" /></div></CardContent></Card>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th><th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="5" className="p-8 text-center">Carregando...</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr> : (filteredItems.map((item) => (<tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"><td className="p-4 font-medium text-foreground">{item.receita}</td><td className="p-4">{item.origem || '-'}</td><td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4 text-right font-bold text-green-400">R$ {parseFloat(item.valor || 0).toFixed(2)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-blue-500" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>)))}</tbody>
          </table>
        </div>
      </div>
      <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={(item) => { openDialog(item); setIsSearchModalOpen(false); }} tableName="receitas" searchField="origem" displayFields={[{ key: 'receita', label: 'Categoria' }, { key: 'data', label: 'Data', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Receita" />
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) handleCloseModal(); else setIsDialogOpen(true); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="dark-pessoal bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-blue-500">{currentReceita ? 'Editar' : 'Nova'} Receita</DialogTitle><DialogDescription>Preencha os dados da receita.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} className="bg-input" placeholder="0,00" /></div></div><div><Label>Categoria de Receita</Label><Select value={formData.receita || ''} onValueChange={v => setFormData({ ...formData, receita: v })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><ScrollArea className="h-48">{tiposReceita.map(t => <SelectItem key={t.id} value={t.nome_receita}>{t.nome_receita}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div><Label>Descrição / Origem</Label><Input value={formData.origem} onChange={e => setFormData({ ...formData, origem: e.target.value })} className="bg-input" placeholder="Ex: Salário, Freelance" /></div></div>
          <DialogFooter><Button variant="outline" onClick={handleCloseModal}>Cancelar</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-pessoal bg-card border-border"><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover esta receita?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </motion.div>
  );
};
export default Receitas;