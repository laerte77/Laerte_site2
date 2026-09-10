import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search, Download, Edit, Loader2, AlertTriangle, PackageSearch } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SearchableModal from '@/components/SearchableModal';
import FolhasTable from '@/components/lanhouse/FolhasTable';
import { useServiceCache } from '@/hooks/useServiceCache';
import { useOptimizedServiceData } from '@/hooks/useOptimizedServiceData';
import { useEstoqueCalculation } from '@/hooks/useEstoqueCalculation';
import EstoqueAtualCard from '../estoques/EstoqueAtualCard';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { saveOfflineData } from '@/lib/offlineStorage';
import * as XLSX from 'xlsx';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const availableYears = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

const LancamentoServicos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, checkPending } = useOnlineStatus();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [editingId, setEditingId] = useState(null);
  const [folhasConsumo, setFolhasConsumo] = useState([]);
  const [originalFolhas, setOriginalFolhas] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { servicos: servicosOpcoes, clientes: clientesOpcoes, tiposFolha, isLoading: isCacheLoading, refreshAll: refreshCache } = useServiceCache();
  const { data: servicosLancados, loading: isLoadingLancamentos, refresh: refreshLancamentos } = useOptimizedServiceData({ month: selectedMonth, year: selectedYear });
  
  const { stockData, loading: isStockLoading, lastUpdate } = useEstoqueCalculation();

  const initialFormData = { data: format(new Date(), 'yyyy-MM-dd'), servico_id: '', cliente_id: '', valor: '', forma_pagamento: '' };
  const [formData, setFormData] = useState(initialFormData);

  const normalizeProductName = useCallback((productName) => productName ? productName.toString().toUpperCase().trim() : '', []);

  const formatFolhasGastas = useCallback((folhasGastas) => {
    if (!folhasGastas || !Array.isArray(folhasGastas) || folhasGastas.length === 0) return '-';
    const nonRascunho = folhasGastas.filter(f => !f.e_rascunho && f.tipo_folha && f.quantidade);
    if (nonRascunho.length === 0) return '-';
    return nonRascunho.map(f => `${f.tipo_folha} - ${f.quantidade} un`).join(', ');
  }, []);

  const filteredServicos = useMemo(() => {
    if (!searchTerm.trim()) return servicosLancados;
    const search = searchTerm.toLowerCase();
    return servicosLancados.filter(item => (item.lm_servicos?.servico?.toLowerCase() || '').includes(search) || (item.lm_clientes?.nome?.toLowerCase() || item.cliente?.toLowerCase() || '').includes(search));
  }, [searchTerm, servicosLancados]);

  const totalServicos = useMemo(() => filteredServicos.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0), [filteredServicos]);

  const handleInputChange = useCallback((e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }, []);

  const handleServicoChange = useCallback((servicoId) => {
    setFormData(prev => ({ ...prev, servico_id: servicoId }));
    if (!servicosOpcoes.find(s => s.id === servicoId)?.usa_folha) setFolhasConsumo([]);
  }, [servicosOpcoes]);

  const handleOpenDialog = useCallback(async (item = null) => {
    if (item) {
      let cid = item.cliente_id;
      if (!cid && item.cliente) cid = clientesOpcoes.find(c => c.nome === item.cliente)?.id;
      setEditingId(item.id);
      setFormData({ data: item.data, servico_id: item.servico_id, cliente_id: cid || '', valor: item.valor, forma_pagamento: item.forma_pagamento || '' });
      if (item.folhas_gastas && Array.isArray(item.folhas_gastas)) { 
        setOriginalFolhas(JSON.parse(JSON.stringify(item.folhas_gastas))); 
        setFolhasConsumo(item.folhas_gastas); 
      } else { 
        setOriginalFolhas([]); setFolhasConsumo([]); 
      }
    } else { 
      setEditingId(null); setFormData(initialFormData); setFolhasConsumo([]); setOriginalFolhas([]); 
    }
    setIsAddModalOpen(true);
    setIsSubmitting(false);
  }, [clientesOpcoes, initialFormData]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFolhasConsumo([]);
    setOriginalFolhas([]);
  }, [isSubmitting, initialFormData]);

  const validateFolhasConsumo = useCallback((isUpdate = false) => {
    const selectedServico = servicosOpcoes.find(s => s.id === formData.servico_id);
    if (!selectedServico?.usa_folha) return { valid: true };
    if (folhasConsumo.filter(f => !f.e_rascunho).length === 0 && folhasConsumo.length === 0) return { valid: false, message: 'Este serviço requer pelo menos uma folha.' };
    
    let adjustedEstoque = {};
    Object.keys(stockData).forEach(k => {
        adjustedEstoque[k] = stockData[k].estoqueAtual;
    });

    if (isUpdate && originalFolhas.length > 0) {
        originalFolhas.forEach(f => { 
            if (!f.e_rascunho && f.tipo_folha && f.quantidade) { 
                const n = normalizeProductName(f.tipo_folha); 
                if (adjustedEstoque[n] !== undefined) adjustedEstoque[n] += parseInt(f.quantidade); 
                else adjustedEstoque[n] = parseInt(f.quantidade);
            } 
        });
    }

    for (let i = 0; i < folhasConsumo.length; i++) {
      const folha = folhasConsumo[i];
      if (!folha.tipo_folha) return { valid: false, message: 'Selecione o tipo de folha.' };
      if (!folha.quantidade || parseInt(folha.quantidade) <= 0) return { valid: false, message: 'Quantidade deve ser maior que zero.' };
      if (!folha.e_rascunho) {
        const key = normalizeProductName(folha.tipo_folha);
        const estoqueDisponivel = adjustedEstoque[key] || 0;
        
        if (parseInt(folha.quantidade) > estoqueDisponivel) {
            return { valid: false, message: `Estoque insuficiente para ${folha.tipo_folha}. Disponível: ${estoqueDisponivel}` };
        }
      }
    }
    return { valid: true };
  }, [servicosOpcoes, formData.servico_id, folhasConsumo, stockData, originalFolhas, normalizeProductName]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.data || !formData.servico_id || !formData.cliente_id || !formData.valor || !formData.forma_pagamento) { 
      toast({ title: 'Atenção', description: 'Por favor, preencha todos os campos obrigatórios, incluindo a forma de pagamento.', variant: 'destructive' }); 
      return; 
    }
    
    const folhasValidation = validateFolhasConsumo(!!editingId);
    if (!folhasValidation.valid) { 
        toast({ title: 'Aviso de Estoque', description: folhasValidation.message, variant: 'destructive' }); 
        return; 
    }

    setIsSubmitting(true);
    try {
      const payload = { 
          user_id: user.id, 
          data: formData.data, 
          servico_id: formData.servico_id, 
          cliente_id: formData.cliente_id, 
          cliente: clientesOpcoes.find(c => c.id === formData.cliente_id)?.nome || null, 
          valor: parseFloat(formData.valor), 
          forma_pagamento: formData.forma_pagamento, 
          folhas_gastas: folhasConsumo.length > 0 ? folhasConsumo : null 
      };
      
      if (!isOnline && !editingId) {
        await saveOfflineData('lm_servicos', payload);
        toast({ title: 'Offline', description: 'Serviço salvo localmente. Será sincronizado quando reconectar.' });
        checkPending();
      } else if (editingId) {
        if (!isOnline) { toast({ title: 'Offline', description: 'Não é possível editar offline.', variant: 'destructive' }); setIsSubmitting(false); return; }
        const { error } = await supabase.from('lm_lanc_servicos').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Sucesso!', description: 'Serviço atualizado com sucesso.' });
      } else {
        const { error } = await supabase.from('lm_lanc_servicos').insert([payload]);
        if (error) throw error;
        toast({ title: 'Sucesso!', description: 'Serviço cadastrado com sucesso.' });
      }

      setFormData(prev => ({ ...initialFormData, data: prev.data }));
      setFolhasConsumo([]); 
      setOriginalFolhas([]); 
      setEditingId(null);
      if(isOnline) await refreshLancamentos(); 
    } catch (error) { 
      console.error("Save error:", error);
      toast({ title: 'Erro ao salvar', description: error.message || 'Falha ao processar o lançamento. Tente novamente.', variant: 'destructive' }); 
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateFolhasConsumo, clientesOpcoes, user, editingId, folhasConsumo, toast, initialFormData, refreshLancamentos, isOnline, checkPending]);

  const handleDelete = useCallback(async (id) => {
    if (!isOnline) { toast({ title: 'Offline', description: 'Não é possível excluir offline.', variant: 'destructive' }); return; }
    try { await supabase.from('lm_lanc_servicos').delete().eq('id', id); toast({ title: 'Sucesso', description: 'Removido.' }); refreshLancamentos(); } catch (error) { toast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' }); }
  }, [toast, refreshLancamentos, isOnline]);

  const handleExport = useCallback(() => {
    if (filteredServicos.length === 0) { toast({ title: 'Aviso', description: 'Nenhum dado.', variant: 'destructive' }); return; }
    const dataToExport = filteredServicos.map(i => ({ 'DATA': format(parse(i.data, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy'), 'SERVIÇO': i.lm_servicos?.servico || 'N/A', 'CLIENTE': i.lm_clientes?.nome || i.cliente || '-', 'FOLHAS GASTAS': formatFolhasGastas(i.folhas_gastas), 'PAGAMENTO': i.forma_pagamento || '-', 'VALOR': parseFloat(i.valor) }));
    const ws = XLSX.utils.json_to_sheet(dataToExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Serviços"); XLSX.writeFile(wb, `Servicos_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`); setIsExportOpen(false);
  }, [filteredServicos, exportFilters, toast, formatFolhasGastas]);

  const formatDateDisplay = useCallback((dateString) => dateString ? format(parse(dateString, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }) : '-', []);
  const selectedServico = useMemo(() => servicosOpcoes.find(s => s.id === formData.servico_id), [servicosOpcoes, formData.servico_id]);

  const mappedEstoqueAtual = useMemo(() => {
      const map = {};
      Object.keys(stockData).forEach(k => {
          map[k] = stockData[k].estoqueAtual;
      });
      return map;
  }, [stockData]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 py-8">
      <OfflineIndicator />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-3xl font-extrabold text-primary">Lançamento de Serviços</h1><p className="text-muted-foreground mt-1 text-lg">Registre e gerencie os serviços prestados.</p></div>
        <div className="flex flex-wrap gap-3">
            <Button onClick={() => setIsStockModalOpen(true)} variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10">
                <PackageSearch className="w-4 h-4 mr-2" /> Ver Estoque
            </Button>
            <Button onClick={() => setIsExportOpen(true)} variant="outline" className="border-primary/50 text-primary"><Download className="w-4 h-4 mr-2" /> Exportar</Button>
            <Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="border-primary/50 text-primary"><Search className="w-4 h-4 mr-2" /> Selecionar Registro</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => handleOpenDialog(null)}><Plus className="mr-2 h-4 w-4" /> Novo Serviço</Button>
        </div>
      </div>

      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[800px] border-border bg-card">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <PackageSearch className="w-5 h-5 text-primary" />
                      Estoque Atual em Tempo Real
                  </DialogTitle>
                  <DialogDescription>
                      Consulte a disponibilidade de folhas antes de realizar os lançamentos.
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                  {isStockLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                          {Object.values(stockData).map(item => (
                              <EstoqueAtualCard key={item.tipo_folha} item={item} lastUpdate={lastUpdate} />
                          ))}
                          {Object.keys(stockData).length === 0 && (
                              <div className="col-span-full text-center text-muted-foreground py-4">Nenhum estoque registrado.</div>
                          )}
                      </div>
                  )}
              </ScrollArea>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsStockModalOpen(false)}>Fechar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[400px] border-border bg-card">
          <DialogHeader><DialogTitle>Exportar Serviços</DialogTitle><DialogDescription>Selecione o período para gerar o relatório.</DialogDescription></DialogHeader>
          <div className="py-4 grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Mês</Label><Select value={String(exportFilters.month)} onValueChange={v => setExportFilters(prev => ({ ...prev, month: Number(v) }))}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><ScrollArea className="h-48">{meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div className="space-y-2"><Label>Ano</Label><Select value={String(exportFilters.year)} onValueChange={v => setExportFilters(prev => ({ ...prev, year: Number(v) }))}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancelar</Button><Button onClick={handleExport} className="bg-primary text-primary-foreground">Exportar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={handleOpenDialog} tableName="lm_lanc_servicos" searchField="lm_servicos.servico" displayFields={[{ key: 'data', label: 'Data', format: formatDateDisplay }, { key: 'lm_servicos.servico', label: 'Serviço' }, { key: 'cliente_nome', label: 'Cliente', format: (_, i) => i.lm_clientes?.nome || i.cliente || '-' }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Lançamento de Serviço" customQuery={async (supabase, st) => { const { data } = await supabase.from('lm_lanc_servicos').select('id, data, valor, forma_pagamento, servico_id, cliente_id, cliente, folhas_gastas, lm_servicos(id, servico), lm_clientes(id, nome)').eq('user_id', user.id).or(`cliente.ilike.%${st}%,lm_servicos.servico.ilike.%${st}%`).order('data', { ascending: false }).limit(50); return data || []; }} />
      
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if(!open) handleCloseModal(); else setIsAddModalOpen(true); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader><DialogTitle className="text-xl">{editingId ? 'Editar Serviço' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Data *</Label><Input type="date" name="data" value={formData.data} onChange={handleInputChange} required className="bg-background" disabled={isSubmitting} /></div><div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" name="valor" step="0.01" value={formData.valor} onChange={handleInputChange} required className="bg-background" disabled={isSubmitting} /></div></div>
            <div className="space-y-2">
              <Label>Tipo do Serviço *</Label>
              <Select value={formData.servico_id} onValueChange={handleServicoChange} disabled={isSubmitting}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><ScrollArea className="h-48">{servicosOpcoes.map((s) => (<SelectItem key={s.id} value={s.id}>{s.servico} {s.usa_folha && '📄'}</SelectItem>))}</ScrollArea></SelectContent>
              </Select>
              {selectedServico?.usa_folha && <Alert className="mt-2 bg-cyan-500/10 border-cyan-500/30"><AlertTriangle className="h-4 w-4 text-cyan-400" /><AlertDescription className="text-sm text-cyan-400">Este serviço consome folhas. O estoque será validado automaticamente.</AlertDescription></Alert>}
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={formData.cliente_id} onValueChange={(val) => setFormData(prev => ({...prev, cliente_id: val}))} disabled={isSubmitting}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><ScrollArea className="h-48">{clientesOpcoes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</ScrollArea></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select value={formData.forma_pagamento} onValueChange={(val) => setFormData(prev => ({...prev, forma_pagamento: val}))} disabled={isSubmitting}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger>
                <SelectContent><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem><SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem></SelectContent>
              </Select>
            </div>
            {selectedServico?.usa_folha && <div className="border-t border-border pt-6"><FolhasTable folhas={folhasConsumo} setFolhas={setFolhasConsumo} tiposFolha={tiposFolha} estoqueAtual={mappedEstoqueAtual} disabled={isSubmitting} /></div>}
            
            <DialogFooter className="gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingId ? 'Atualizar Serviço' : 'Salvar Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-3 shadow-md border-border/50 rounded-2xl"><CardContent className="p-5 flex flex-col md:flex-row gap-4 items-center"><div className="flex items-center gap-2 flex-1 w-full relative"><Search className="w-5 h-5 text-muted-foreground absolute left-3" /><Input placeholder="Buscar por serviço ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 pl-10 bg-background/50 h-12 text-base text-foreground"/></div><div className="flex gap-3 w-full md:w-auto"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[150px] bg-background/50 h-12 text-foreground"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>))}</SelectContent></Select><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[110px] bg-background/50 h-12 text-foreground"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}</SelectContent></Select></div></CardContent></Card>
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-md rounded-2xl flex flex-col justify-center"><CardHeader className="pb-1 pt-5"><CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">Total no Período</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalServicos)}</div></CardContent></Card>
      </div>
      
      <Card className="shadow-lg border-border/60 rounded-2xl overflow-hidden"><CardContent className="p-0"><ScrollArea className="h-[600px]"><Table><TableHeader className="bg-card/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border/40"><TableRow><TableHead className="w-[120px] py-4 pl-6 font-semibold">Data</TableHead><TableHead className="py-4 font-semibold">Serviço</TableHead><TableHead className="py-4 font-semibold">Cliente</TableHead><TableHead className="py-4 font-semibold">Folhas Gastas</TableHead><TableHead className="text-right py-4 font-semibold">Valor</TableHead><TableHead className="text-center w-[120px] py-4 pr-6 font-semibold">Ações</TableHead></TableRow></TableHeader><TableBody>{isLoadingLancamentos ? <TableRow><TableCell colSpan={6} className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></TableCell></TableRow> : filteredServicos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">Nenhum serviço registrado neste período.</TableCell></TableRow> : filteredServicos.map((item) => (<TableRow key={item.id} className="hover:bg-accent/5 transition-colors border-border/30"><TableCell className="font-medium pl-6 py-4">{formatDateDisplay(item.data)}</TableCell><TableCell className="py-4"><div className="flex flex-col"><span className="font-semibold text-foreground">{item.lm_servicos?.servico || 'N/A'}</span>{item.forma_pagamento && <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{item.forma_pagamento}</span>}</div></TableCell><TableCell className="py-4"><span className="font-semibold text-foreground uppercase tracking-wider text-sm">{item.lm_clientes?.nome || item.cliente || '-'}</span></TableCell><TableCell className="py-4"><span className="text-sm text-foreground">{formatFolhasGastas(item.folhas_gastas)}</span></TableCell><TableCell className="text-right font-bold text-primary py-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</TableCell><TableCell className="text-center pr-6 py-4"><div className="flex items-center justify-center gap-2"><Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
    </motion.div>
  );
};

export default LancamentoServicos;