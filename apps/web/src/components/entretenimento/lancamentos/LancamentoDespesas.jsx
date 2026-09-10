import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Search, FileSpreadsheet, Edit, Trash2, Receipt } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const LancamentoDespesas = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [despesasLancadas, setDespesasLancadas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [organizadores, setOrganizadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState('');
  const [despesaId, setDespesaId] = useState('');
  const [compradorId, setCompradorId] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [despRes, orgRes, lancRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'ent_despesas', 'id, nome_despesa').order('nome_despesa', { ascending: true }),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_organizadores', 'id, nome').order('nome', { ascending: true }),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_despesas_lancamentos', '*, despesa:ent_despesas(nome_despesa), comprador:ent_organizadores(nome)').order('data', { ascending: false })
      ]);
      setDespesas(despRes.data || []); setOrganizadores(orgRes.data || []); setDespesasLancadas(lancRes.data || []);
    } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } finally { setFetching(false); }
  };

  useEffect(() => { fetchData(); }, [user, isAdmin]);

  const filteredData = despesasLancadas.filter((item) => {
    if (!item.data) return false;
    const itemDate = new Date(item.data);
    const monthMatch = selectedMonth === 'all' || (itemDate.getMonth() + 1).toString() === selectedMonth;
    const yearMatch = selectedYear === 'all' || itemDate.getFullYear().toString() === selectedYear;
    const searchMatch = !searchTerm || item.despesa?.nome_despesa?.toLowerCase().includes(searchTerm.toLowerCase()) || item.comprador?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    return monthMatch && yearMatch && searchMatch;
  });

  const totalPeriodo = filteredData.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const resetForm = () => { setEditId(null); setData(new Date().toISOString().split('T')[0]); setValor(''); setDespesaId(''); setCompradorId(''); };

  const handleOpenModal = (item = null) => { if (item) { setEditId(item.id); setData(item.data); setValor(item.valor.toString()); setDespesaId(item.despesa_id); setCompradorId(item.comprador_id); } else { resetForm(); } setIsModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data || !valor || !despesaId || !compradorId) { toast({ title: 'Aviso', description: 'Preencha todos.', variant: 'destructive' }); return; }
    setLoading(true);
    const payload = { user_id: user.id, data, valor: parseFloat(valor), despesa_id: despesaId, comprador_id: compradorId };
    try {
      if (editId) { await supabase.from('ent_despesas_lancamentos').update(payload).eq('id', editId); toast({ title: 'Sucesso', description: 'Atualizada!' }); } else { await supabase.from('ent_despesas_lancamentos').insert([payload]); toast({ title: 'Sucesso', description: 'Lançada!' }); }
      await fetchData(); resetForm();
    } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Excluir?')) return; try { await supabase.from('ent_despesas_lancamentos').delete().eq('id', id); toast({ title: 'Sucesso' }); fetchData(); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } };

  const exportExcel = () => { try { const excelData = filteredData.map(i => ({ 'Data': format(parseISO(i.data), 'dd/MM/yyyy'), 'Despesa': i.despesa?.nome_despesa, 'Comprador': i.comprador?.nome, 'Valor': i.valor })); const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Despesas"); XLSX.writeFile(wb, "lancamentos_despesas.xlsx"); toast({ title: 'Sucesso' }); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } };

  const availableYears = [...new Set(despesasLancadas.map(i => i.data ? i.data.split('-')[0] : new Date().getFullYear().toString()))].sort((a,b) => b-a);

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden"><div className="bg-card border-b border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="p-3 bg-red-500/10 rounded-full border border-red-500/20"><Receipt className="w-8 h-8 text-red-500 glow-neon" /></div><div><h1 className="text-2xl font-bold text-red-500 tracking-tight">Lançamento de Despesas</h1></div></div><div className="flex gap-2"><Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar</Button><Button onClick={() => handleOpenModal()} className="bg-red-500 text-white font-bold"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button></div></div><div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/10"><div className="md:col-span-2"><Label>Buscar</Label><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-input" /></div><div><Label>Mês</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><SelectItem value="all">Todos</SelectItem>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent></Select></div><div><Label>Ano</Label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div></div></div>
      <div className="flex justify-end px-2"><span className="text-sm text-muted-foreground">Total: <strong className="text-red-500 text-lg">{formatCurrency(totalPeriodo)}</strong></span></div>
      <div className="glass-card p-0 overflow-hidden">{fetching ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div> : <Table><TableHeader className="bg-secondary/50"><TableRow><TableHead>Data</TableHead><TableHead>Despesa</TableHead><TableHead>Comprador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredData.length > 0 ? filteredData.map((item) => (<TableRow key={item.id} className="hover:bg-secondary/30"><TableCell>{format(parseISO(item.data), 'dd/MM/yyyy')}</TableCell><TableCell>{item.despesa?.nome_despesa}</TableCell><TableCell>{item.comprador?.nome}</TableCell><TableCell className="text-right text-red-500 font-bold">{formatCurrency(item.valor)}</TableCell><TableCell><div className="flex justify-center gap-2"><Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="text-[hsl(var(--neon-entretenimento))]"><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center py-12">Nenhuma despesa.</TableCell></TableRow>}</TableBody></Table>}</div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="sm:max-w-[500px] dark-entretenimento bg-card border-border"><DialogHeader><DialogTitle className="text-red-500">{editId ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="bg-input" /></div><div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required className="bg-input" /></div></div><div><Label>Despesa</Label><Select value={despesaId} onValueChange={setDespesaId} required><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{despesas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome_despesa}</SelectItem>)}</SelectContent></Select></div><div><Label>Comprador</Label><Select value={compradorId} onValueChange={setCompradorId} required><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{organizadores.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancelar</Button><Button type="submit" disabled={loading} className="bg-red-500 text-white">Salvar</Button></div></form></DialogContent>
      </Dialog>
    </div>
  );
};
export default LancamentoDespesas;