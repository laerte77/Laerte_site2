import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search, Calendar as CalendarIcon, Filter, ArrowUpCircle, Tag, Edit } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { saveOfflineData } from '@/lib/offlineStorage';

const Despesas = () => {
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
  const [cartoes, setCartoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const initialFormData = { data: format(new Date(), 'yyyy-MM-dd'), despesa: '', valor: '', categoria: '', forma_pagamento: 'Débito', parcelas: 1, cartao_id: '', responsavel_id: '' };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const fetchTiposDespesa = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('tipos_despesa').select('nome_despesa, categoria').eq('user_id', user.id).order('nome_despesa', { ascending: true });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setTiposDespesa(data || []);
    } catch (error) { console.error(error); }
  }, [user]);

  const fetchCartoes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('pessoal_cartoes').select('id, nome').eq('user_id', user.id).order('nome', { ascending: true });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setCartoes(data || []);
    } catch (error) { console.error(error); }
  }, [user]);

  const fetchUsuarios = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('pessoal_cartao_usuarios').select('id, nome').eq('user_id', user.id).order('nome', { ascending: true });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) { console.error(error); }
  }, [user]);

  const fetchDespesas = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const firstDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
      const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0);
      const startDate = format(firstDay, 'yyyy-MM-dd');
      const endDate = format(lastDay, 'yyyy-MM-dd');
      // Modified: Order by despesa ascending (A-Z)
      const { data, error } = await supabase.from('despesas').select('*').eq('user_id', user.id).gte('data', startDate).lte('data', endDate).order('data', { ascending: false });
      if (!isMountedRef.current) return;
      if (error) throw error;
      setDespesas(data || []);
      setFilteredDespesas(data || []);
    } catch (error) { if (!isMountedRef.current) return; toast({ title: 'Erro', description: 'Não foi possível carregar as despesas.', variant: 'destructive' }); } finally { if (isMountedRef.current) setLoading(false); }
  }, [user, selectedMonth, selectedYear, toast]);

  useEffect(() => { fetchDespesas(); fetchTiposDespesa(); fetchCartoes(); fetchUsuarios(); }, [fetchDespesas, fetchTiposDespesa, fetchCartoes, fetchUsuarios]);

  useEffect(() => {
    const results = despesas.filter(item => item.despesa.toLowerCase().includes(searchTerm.toLowerCase()) || (item.categoria && item.categoria.toLowerCase().includes(searchTerm.toLowerCase())));
    setFilteredDespesas(results);
  }, [searchTerm, despesas]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSelectChange = (name, value) => { setFormData(prev => ({ ...prev, [name]: value })); };
  const handleTipoDespesaChange = (value) => { const selectedTipo = tiposDespesa.find(t => t.nome_despesa === value); setFormData(prev => ({ ...prev, despesa: value, categoria: selectedTipo ? selectedTipo.categoria : '' })); };

  const handleOpenDialog = (expense = null) => {
    if (expense) { setEditingId(expense.id); setFormData({ data: expense.data, despesa: expense.despesa, valor: expense.valor, categoria: expense.categoria || '', forma_pagamento: expense.forma_pagamento || 'Débito', parcelas: expense.parcelas || 1, cartao_id: expense.cartao_id || '', responsavel_id: expense.responsavel_id || '' }); } else { setEditingId(null); setFormData(initialFormData); }
    setIsAddModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  }, [initialFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.despesa || !formData.valor || !formData.data) { toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos.', variant: 'destructive' }); return; }
    if (formData.forma_pagamento === 'Crédito' && !formData.cartao_id) { toast({ title: 'Cartão obrigatório', description: 'Selecione o cartão de crédito utilizado.', variant: 'destructive' }); return; }
    
    try {
      const payload = { user_id: user.id, data: formData.data, despesa: formData.despesa, valor: parseFloat(formData.valor), categoria: formData.categoria, forma_pagamento: formData.forma_pagamento, parcelas: parseInt(formData.parcelas), cartao_id: formData.forma_pagamento === 'Crédito' ? formData.cartao_id : null, responsavel_id: formData.forma_pagamento === 'Crédito' ? (formData.responsavel_id || null) : null };
      
      if (!isOnline && !editingId) {
        await saveOfflineData('pessoal_despesas', payload);
        toast({ title: 'Offline', description: 'Despesa salva localmente.' });
        checkPending();
      } else if (editingId) {
        if (!isOnline) { toast({ title: 'Offline', description: 'Edição offline não permitida.', variant: 'destructive' }); return; }
        const { error } = await supabase.from('despesas').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Despesa atualizada.' }); setEditingId(null);
      } else {
        const { error } = await supabase.from('despesas').insert([payload]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Despesa adicionada.' });
      }
      
      setFormData(prev => ({ ...initialFormData, data: prev.data }));
      if(isOnline) fetchDespesas();
    } catch (error) { toast({ title: 'Erro', description: 'Falha ao salvar despesa.', variant: 'destructive' }); }
  };

  const handleDelete = async (id) => {
    if (!isOnline) { toast({ title: 'Offline', description: 'Exclusão offline não permitida.', variant: 'destructive' }); return; }
    try {
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Despesa removida.' }); fetchDespesas();
    } catch (error) { toast({ title: 'Erro', description: 'Falha ao remover despesa.', variant: 'destructive' }); }
  };

  const totalDespesas = filteredDespesas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const formatDateDisplay = (dateString) => { if (!dateString) return '-'; try { return format(parse(dateString, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch (e) { return dateString; } };
  const responsavelNome = (id) => usuarios.find((u) => u.id === id)?.nome || '';

  return (
    <div className="dark-pessoal space-y-6">
      <OfflineIndicator />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-blue-500">Despesas</h1><p className="text-muted-foreground">Gerencie seus gastos mensais (A-Z).</p></div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>
      </div>
      
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if(!open) handleCloseModal(); else setIsAddModalOpen(true); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[500px] border-border bg-card text-foreground">
          <DialogHeader><DialogTitle className="text-blue-500">{editingId ? 'Editar Despesa' : 'Adicionar Nova Despesa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" name="data" value={formData.data} onChange={handleInputChange} required className="bg-input" /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" name="valor" step="0.01" placeholder="0,00" value={formData.valor} onChange={handleInputChange} required className="bg-input" /></div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (Tipo de Despesa)</Label>
              <Select value={formData.despesa} onValueChange={handleTipoDespesaChange}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="dark-pessoal bg-card border-border"><ScrollArea className="h-48">{tiposDespesa.map((t) => <SelectItem key={t.nome_despesa} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Categoria (Automática)</Label><Input value={formData.categoria || "Selecione um tipo"} readOnly className="bg-muted text-muted-foreground border-border" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select value={formData.forma_pagamento} onValueChange={(val) => handleSelectChange('forma_pagamento', val)}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Crédito">Crédito</SelectItem><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Parcelas</Label><Input type="number" name="parcelas" min="1" value={formData.parcelas} onChange={handleInputChange} className="bg-input" /></div>
            </div>
            {formData.forma_pagamento === 'Crédito' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cartão de Crédito</Label>
                  {cartoes.length === 0 ? (
                    <p className="text-sm text-amber-400 italic">Nenhum cartão cadastrado. Cadastre um cartão em Cadastros → Cartões de Crédito.</p>
                  ) : (
                    <Select value={formData.cartao_id} onValueChange={(val) => handleSelectChange('cartao_id', val)}>
                      <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                      <SelectContent className="dark-pessoal bg-card border-border"><ScrollArea className="h-40">{cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Responsável pela Compra</Label>
                  {usuarios.length === 0 ? (
                    <p className="text-sm text-amber-400 italic">Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.</p>
                  ) : (
                    <Select value={formData.responsavel_id || 'nenhum'} onValueChange={(val) => handleSelectChange('responsavel_id', val === 'nenhum' ? '' : val)}>
                      <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                      <SelectContent className="dark-pessoal bg-card border-border"><ScrollArea className="h-40"><SelectItem value="nenhum">— Sem responsável —</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</ScrollArea></SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">{editingId ? 'Atualizar' : 'Salvar'} Despesa</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-3 border-border"><CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center"><div className="flex items-center gap-2 flex-1 w-full"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-input" /></div><div className="flex gap-2 w-full md:w-auto"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[140px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>))}</SelectContent></Select><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[100px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="2023">2023</SelectItem><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-400/10 border-red-200/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-500">Total no Período</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</div></CardContent></Card>
      </div>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow> : filteredDespesas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma despesa encontrada.</TableCell></TableRow> : (
                  filteredDespesas.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium text-foreground">{item.despesa}</td>
                      <td className="p-4"><Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{item.categoria || 'OUTROS'}</Badge></td>
                      <td className="p-4">{formatDateDisplay(item.data)}</td>
                      <td className="p-4 text-muted-foreground text-sm">{item.forma_pagamento}{item.cartao_id && cartoes.find(c => c.id === item.cartao_id) ? ` • ${cartoes.find(c => c.id === item.cartao_id).nome}` : ''}</td>
                      <td className="p-4 text-sm">{item.responsavel_id ? <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{responsavelNome(item.responsavel_id)}</Badge> : <span className="text-muted-foreground text-sm italic">—</span>}</td>
                      <td className="p-4 text-right font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
export default Despesas;