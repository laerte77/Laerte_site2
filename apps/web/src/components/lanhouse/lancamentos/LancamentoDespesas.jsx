import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search, Edit } from 'lucide-react';
import { format, parse, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { saveOfflineData } from '@/lib/offlineStorage';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const LancamentoDespesas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, checkPending } = useOnlineStatus();
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState([]);
  const [filteredDespesas, setFilteredDespesas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tiposDespesa, setTiposDespesa] = useState([]);
  const [tiposFolha, setTiposFolha] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const availableYears = useMemo(() => {
    const years = despesas.map(d => new Date(d.data).getFullYear());
    years.push(new Date().getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [despesas]);

  const initialFormData = { data: format(new Date(), 'yyyy-MM-dd'), despesa_id: '', valor: '', forma_pagamento: '', parcelas: 1, tipo_custo: 'Fixo', categoria: '', recorrencia: '', tipo_lancamento: '', quantidade: '', tipo_folha: '' };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchTiposDespesa = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('lm_despesas').select('id, despesa, categoria').eq('user_id', user.id).order('despesa', { ascending: true });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setTiposDespesa(data || []);
    } catch (error) {}
  }, [user]);

  const fetchTiposFolha = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('lm_tipos_folha').select('id, tipo_folha').eq('user_id', user.id).order('tipo_folha', { ascending: true });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setTiposFolha(data || []);
    } catch (error) {}
  }, [user]);

  const fetchDespesas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('lm_lanc_despesas').select('*, lm_despesas(despesa, categoria)').eq('user_id', user.id).order('data', { ascending: false });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setDespesas(data || []);
    } catch (error) { toast({ title: 'Erro', description: 'Não foi possível carregar.', variant: 'destructive' }); } finally { if (isMountedRef.current) setLoading(false); }
  }, [user, toast]);

  useEffect(() => { fetchDespesas(); fetchTiposDespesa(); fetchTiposFolha(); }, [fetchDespesas, fetchTiposDespesa, fetchTiposFolha]);

  useEffect(() => {
    let results = despesas;
    if (selectedYear !== 'all') results = results.filter(item => getYear(new Date(item.data)).toString() === selectedYear);
    if (selectedMonth !== 'all') results = results.filter(item => getMonth(new Date(item.data)).toString() === selectedMonth);
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      results = results.filter(item => (item.lm_despesas?.despesa?.toLowerCase() || '').includes(search) || (item.lm_despesas?.categoria?.toLowerCase() || '').includes(search) || (item.tipo_folha?.toLowerCase() || '').includes(search));
    }
    setFilteredDespesas(results);
  }, [searchTerm, selectedMonth, selectedYear, despesas]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  useEffect(() => {
    if (formData.tipo_lancamento === 'Estoque') {
      const reposicaoFolha = tiposDespesa.find(d => d.despesa.toLowerCase().includes('reposição de folha'));
      if (reposicaoFolha && !editingId) setFormData(prev => ({ ...prev, despesa_id: reposicaoFolha.id }));
    }
  }, [formData.tipo_lancamento, tiposDespesa, editingId]);

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({ data: expense.data, despesa_id: expense.despesa_id, valor: expense.valor, forma_pagamento: expense.forma_pagamento || '', parcelas: expense.parcelas || 1, tipo_custo: expense.tipo_custo || 'Fixo', categoria: expense.categoria || '', recorrencia: expense.recorrencia || '', tipo_lancamento: expense.tipo_lancamento || '', quantidade: expense.quantidade || '', tipo_folha: expense.tipo_folha || '' });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setIsAddModalOpen(true);
  };

  const handleCloseModal = useCallback(() => { 
    setIsAddModalOpen(false); 
    setEditingId(null); 
    setFormData(initialFormData); 
  }, [initialFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.despesa_id || !formData.valor || !formData.data || !formData.forma_pagamento || !formData.tipo_custo || !formData.categoria || !formData.recorrencia || !formData.tipo_lancamento || !formData.quantidade) { toast({ title: 'Atenção', description: 'Preencha os campos.', variant: 'destructive' }); return; }
    if (formData.tipo_lancamento === 'Estoque' && !formData.tipo_folha) { toast({ title: 'Atenção', description: 'Tipo Folha é obrigatório para Estoque.', variant: 'destructive' }); return; }
    const quantidadeNum = parseInt(formData.quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) { toast({ title: 'Atenção', description: 'Quantidade inválida.', variant: 'destructive' }); return; }
    
    try {
      const payload = { user_id: user.id, data: formData.data, despesa_id: formData.despesa_id, valor: parseFloat(formData.valor), forma_pagamento: formData.forma_pagamento, parcelas: formData.forma_pagamento === 'Cartão de Crédito' ? parseInt(formData.parcelas) || 1 : null, tipo_custo: formData.tipo_custo, categoria: formData.categoria, recorrencia: formData.recorrencia, tipo_lancamento: formData.tipo_lancamento, quantidade: quantidadeNum, tipo_folha: formData.tipo_lancamento === 'Estoque' ? formData.tipo_folha : null };
      
      if (!isOnline && !editingId) {
        await saveOfflineData('lm_despesas', payload);
        toast({ title: 'Offline', description: 'Despesa salva localmente.' });
        checkPending();
      } else if (editingId) {
        if (!isOnline) { toast({ title: 'Offline', description: 'Edição offline não permitida.', variant: 'destructive' }); return; }
        await supabase.from('lm_lanc_despesas').update(payload).eq('id', editingId); toast({ title: 'Sucesso', description: 'Atualizado.' }); 
      } else { 
        await supabase.from('lm_lanc_despesas').insert([payload]); toast({ title: 'Sucesso', description: 'Registrado.' }); 
      }
      if(isOnline) fetchDespesas();
      setFormData(prev => ({ ...initialFormData, data: prev.data }));
      setEditingId(null);
    } catch (error) { toast({ title: 'Erro', description: 'Falha.', variant: 'destructive' }); }
  };

  const handleDelete = async (id) => {
    if (!isOnline) { toast({ title: 'Offline', description: 'Exclusão offline não permitida.', variant: 'destructive' }); return; }
    try { await supabase.from('lm_lanc_despesas').delete().eq('id', id); toast({ title: 'Sucesso', description: 'Removido.' }); fetchDespesas(); } catch (error) { toast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' }); }
  };

  const totalDespesas = filteredDespesas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
  const formatDateDisplay = (dateString) => { if (!dateString) return '-'; try { return format(parse(dateString, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch (e) { return dateString; } };
  const showParcelasField = formData.forma_pagamento === 'Cartão de Crédito';
  const isEstoque = formData.tipo_lancamento === 'Estoque';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
      <OfflineIndicator />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold text-red-500">Despesas</h1><p className="text-muted-foreground mt-1">Gerencie seus gastos.</p></div>
        <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if(!open) handleCloseModal(); else setIsAddModalOpen(true); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-red-500">{editingId ? 'Editar Despesa' : 'Adicionar Nova Despesa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Data *</Label><Input type="date" name="data" value={formData.data} onChange={handleInputChange} required /></div><div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" name="valor" step="0.01" value={formData.valor} onChange={handleInputChange} required /></div></div>
            <div className="space-y-2"><Label>Descrição *</Label><Select value={formData.despesa_id} onValueChange={(val) => setFormData(prev => ({...prev, despesa_id: val}))} disabled={isEstoque}><SelectTrigger className={isEstoque ? 'bg-muted' : ''}><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map((t) => (<SelectItem key={t.id} value={t.id}>{t.despesa}</SelectItem>))}</ScrollArea></SelectContent></Select></div>
            <div className="space-y-2"><Label>Tipo Lançamento *</Label><Select value={formData.tipo_lancamento} onValueChange={(val) => setFormData(prev => ({...prev, tipo_lancamento: val, tipo_folha: val === 'Estoque' ? prev.tipo_folha : ''}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Estoque">Estoque</SelectItem><SelectItem value="Consumo">Consumo</SelectItem><SelectItem value="Perda">Perda</SelectItem></SelectContent></Select></div>
            {isEstoque && (<div className="space-y-2"><Label>Tipo Folha *</Label><Select value={formData.tipo_folha} onValueChange={(val) => setFormData(prev => ({...prev, tipo_folha: val}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposFolha.map((t) => (<SelectItem key={t.id} value={t.tipo_folha}>{t.tipo_folha}</SelectItem>))}</ScrollArea></SelectContent></Select></div>)}
            <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" name="quantidade" min="1" step="1" value={formData.quantidade} onChange={handleInputChange} required /></div>
            <div className="space-y-2"><Label>Tipo de Custo *</Label><RadioGroup value={formData.tipo_custo} onValueChange={(val) => setFormData(prev => ({...prev, tipo_custo: val}))} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Fixo" id="fixo" /><Label htmlFor="fixo">Fixo</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Variável" id="variavel" /><Label htmlFor="variavel">Variável</Label></div></RadioGroup></div>
            <div className="space-y-2"><Label>Categoria *</Label><Select value={formData.categoria} onValueChange={(val) => setFormData(prev => ({...prev, categoria: val}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Impressão">Impressão</SelectItem><SelectItem value="Digital">Digital</SelectItem><SelectItem value="Infraestrutura">Infraestrutura</SelectItem><SelectItem value="Manutenção">Manutenção</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Recorrência *</Label><Select value={formData.recorrencia} onValueChange={(val) => setFormData(prev => ({...prev, recorrencia: val}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Único">Único</SelectItem><SelectItem value="Mensal">Mensal</SelectItem><SelectItem value="Anual">Anual</SelectItem></SelectContent></Select></div>
            <div className={`grid ${showParcelasField ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}><div className="space-y-2"><Label>Pagamento *</Label><Select value={formData.forma_pagamento} onValueChange={(val) => setFormData(prev => ({...prev, forma_pagamento: val}))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent></Select></div>{showParcelasField && (<div className="space-y-2"><Label>Parcelas</Label><Input type="number" name="parcelas" min="1" value={formData.parcelas} onChange={handleInputChange} /></div>)}</div>
            <DialogFooter className="gap-2 mt-6"><Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button><Button type="submit" className="bg-red-500 text-white">{editingId ? 'Atualizar' : 'Salvar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-3 shadow-sm border-border/50"><CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center"><div className="flex items-center gap-2 flex-1 w-full relative"><Search className="w-4 h-4 text-muted-foreground absolute left-3" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 pl-9"/></div><div className="flex gap-2 w-full md:w-auto"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Meses</SelectItem>{meses.map((m, i) => (<SelectItem key={i} value={i.toString()}>{m}</SelectItem>))}</SelectContent></Select><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Anos</SelectItem>{availableYears.map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent></Select></div></CardContent></Card>
        <Card className="bg-red-500/10 border-red-200/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Total Filtrado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</div></CardContent></Card>
      </div>

      <Card className="shadow-sm border-border/50 overflow-hidden"><CardContent className="p-0"><ScrollArea className="h-[500px]"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead className="w-[120px]">Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo Lanç.</TableHead><TableHead>Tipo Folha</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead>Categoria</TableHead><TableHead>Tipo Custo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center w-[100px]">Ações</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell></TableRow> : filteredDespesas.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma despesa.</TableCell></TableRow> : filteredDespesas.map((item) => (<TableRow key={item.id} className="hover:bg-accent/30"><TableCell>{formatDateDisplay(item.data)}</TableCell><TableCell className="font-semibold">{item.lm_despesas?.despesa || 'N/A'}</TableCell><TableCell><Badge variant="outline">{item.tipo_lancamento || '-'}</Badge></TableCell><TableCell>{item.tipo_lancamento === 'Estoque' && item.tipo_folha ? <Badge variant="outline" className="text-green-500">{item.tipo_folha}</Badge> : '-'}</TableCell><TableCell className="text-center">{item.quantidade || '-'}</TableCell><TableCell><Badge variant="outline">{item.categoria || 'N/A'}</Badge></TableCell><TableCell className="text-muted-foreground text-sm">{item.tipo_custo || '-'}</TableCell><TableCell className="text-right font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</TableCell><TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} className="text-blue-500"><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
    </motion.div>
  );
};

export default LancamentoDespesas;