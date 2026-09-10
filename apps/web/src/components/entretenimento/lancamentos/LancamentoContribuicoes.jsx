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
import { Loader2, Plus, Search, FileSpreadsheet, Edit, Trash2, Trophy } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

const LancamentoContribuicoes = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [contribuicoes, setContribuicoes] = useState([]);
  const [participantes, setParticipantes] = useState([]);
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
  const [contribuinteId, setContribuinteId] = useState('');
  const [recebedorId, setRecebedorId] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [partRes, orgRes, contRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'ent_participantes', 'id, nome').order('nome', { ascending: true }),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_organizadores', 'id, nome').order('nome', { ascending: true }),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_contribuicoes', '*, contribuinte:ent_participantes(nome), recebedor:ent_organizadores(nome)').order('data', { ascending: false })
      ]);
      setParticipantes(partRes.data || []); setOrganizadores(orgRes.data || []); setContribuicoes(contRes.data || []);
    } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } finally { setFetching(false); }
  };

  useEffect(() => { fetchData(); }, [user, isAdmin]);

  const filteredData = contribuicoes.filter((item) => {
    if (!item.data) return false;
    const itemDate = new Date(item.data);
    const monthMatch = selectedMonth === 'all' || (itemDate.getMonth() + 1).toString() === selectedMonth;
    const yearMatch = selectedYear === 'all' || itemDate.getFullYear().toString() === selectedYear;
    const searchMatch = !searchTerm || item.contribuinte?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || item.recebedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    return monthMatch && yearMatch && searchMatch;
  });

  const totalPeriodo = filteredData.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const resetForm = () => { setEditId(null); setData(new Date().toISOString().split('T')[0]); setValor(''); setContribuinteId(''); setRecebedorId(''); };

  const handleOpenModal = (item = null) => { if (item) { setEditId(item.id); setData(item.data); setValor(item.valor.toString()); setContribuinteId(item.contribuinte_id); setRecebedorId(item.recebedor_id); } else { resetForm(); } setIsModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data || !valor || !contribuinteId || !recebedorId) { toast({ title: 'Aviso', description: 'Preencha todos os campos.', variant: 'destructive' }); return; }
    setLoading(true);
    const payload = { user_id: user.id, data, valor: parseFloat(valor), contribuinte_id: contribuinteId, recebedor_id: recebedorId };
    try {
      if (editId) { await supabase.from('ent_contribuicoes').update(payload).eq('id', editId); toast({ title: 'Sucesso', description: 'Atualizada!' }); } else { await supabase.from('ent_contribuicoes').insert([payload]); toast({ title: 'Sucesso', description: 'Lançada!' }); }
      await fetchData(); resetForm();
    } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Tem certeza?')) return; try { await supabase.from('ent_contribuicoes').delete().eq('id', id); toast({ title: 'Sucesso' }); fetchData(); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } };

  const exportExcel = () => { try { const excelData = filteredData.map(i => ({ 'Data': format(parseISO(i.data), 'dd/MM/yyyy'), 'Contribuinte': i.contribuinte?.nome, 'Recebedor': i.recebedor?.nome, 'Valor': i.valor })); const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Contribuições"); XLSX.writeFile(wb, "lancamentos_contribuicoes.xlsx"); toast({ title: 'Sucesso' }); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); } };

  const availableYears = [...new Set(contribuicoes.map(item => item.data ? item.data.split('-')[0] : new Date().getFullYear().toString()))].sort((a,b) => b-a);

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden"><div className="bg-card border-b border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="p-3 bg-[hsl(var(--neon-entretenimento))]/10 rounded-full"><Trophy className="w-8 h-8 text-[hsl(var(--neon-entretenimento))]" /></div><div><h1 className="text-2xl font-bold text-[hsl(var(--neon-entretenimento))]">Lançamento de Contribuições</h1></div></div><div className="flex gap-2"><Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar</Button><Button onClick={() => handleOpenModal()} className="bg-[hsl(var(--neon-entretenimento))] text-black"><Plus className="w-4 h-4 mr-2" /> Novo Lançamento</Button></div></div><div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/10"><div className="md:col-span-2"><Label>Buscar</Label><Input placeholder="Nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-input" /></div><div><Label>Mês</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><SelectItem value="all">Todos</SelectItem>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent></Select></div><div><Label>Ano</Label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><SelectItem value="all">Todos</SelectItem>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div></div></div>
      <div className="flex justify-end px-2"><span className="text-sm text-muted-foreground">Total: <strong className="text-green-500 text-lg">{formatCurrency(totalPeriodo)}</strong></span></div>
      <div className="glass-card p-0 overflow-hidden">{fetching ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : <Table><TableHeader className="bg-secondary/50"><TableRow><TableHead>Data</TableHead><TableHead>Contribuinte</TableHead><TableHead>Recebedor</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredData.length > 0 ? filteredData.map((item) => (<TableRow key={item.id} className="hover:bg-secondary/30"><TableCell>{format(parseISO(item.data), 'dd/MM/yyyy')}</TableCell><TableCell>{item.contribuinte?.nome}</TableCell><TableCell>{item.recebedor?.nome}</TableCell><TableCell className="text-right text-green-500 font-bold">{formatCurrency(item.valor)}</TableCell><TableCell><div className="flex justify-center gap-2"><Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="text-primary"><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center py-12">Nenhuma contribuição.</TableCell></TableRow>}</TableBody></Table>}</div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="sm:max-w-[500px] dark-entretenimento bg-card border-border"><DialogHeader><DialogTitle className="text-primary">{editId ? 'Editar' : 'Nova'} Contribuição</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="bg-input" /></div><div><Label>Valor</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required className="bg-input" /></div></div><div><Label>Contribuinte</Label><Select value={contribuinteId} onValueChange={setContribuinteId} required><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{participantes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div><div><Label>Recebedor</Label><Select value={recebedorId} onValueChange={setRecebedorId} required><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{organizadores.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancelar</Button><Button type="submit" disabled={loading} className="bg-primary text-black">Salvar</Button></div></form></DialogContent>
      </Dialog>
    </div>
  );
};
export default LancamentoContribuicoes;