import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, CreditCard, Search } from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { pertenceCompetencia } from '@/lib/cartaoCompetencia';
import { getInstallmentValue } from '@/lib/cartaoParcelas';

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const CartaoLancamentos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const cartoesRef = useRef([]);
  const toastRef = useRef(toast);
  const [loading, setLoading] = useState(true);
  const [metaReady, setMetaReady] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposDespesa, setTiposDespesa] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCartao, setSelectedCartao] = useState('todos');
  const [selectedResponsavel, setSelectedResponsavel] = useState('todos');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCompraId, setEditingCompraId] = useState(null);

  const initialForm = {
    cartao_id: '', data: format(new Date(), 'yyyy-MM-dd'), descricao: '',
    valor: '', parcelas: 1, categoria: '', responsavel_id: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { cartoesRef.current = cartoes; }, [cartoes]);

  // Cadastros estáticos: só recarrega quando o usuário muda (evita loop com lançamentos).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setMetaReady(false);
    (async () => {
      const [cartoesRes, usuariosRes, tiposRes] = await Promise.all([
        supabase.from('pessoal_cartoes').select('id, nome, bandeira, dia_fechamento').eq('user_id', user.id).order('nome', { ascending: true }),
        supabase.from('pessoal_cartao_usuarios').select('id, nome, parentesco').eq('user_id', user.id).order('nome', { ascending: true }),
        supabase.from('tipos_despesa').select('nome_despesa, categoria').eq('user_id', user.id).order('nome_despesa', { ascending: true }),
      ]);
      if (cancelled || !isMountedRef.current) return;
      const nextCartoes = cartoesRes.data || [];
      cartoesRef.current = nextCartoes;
      setCartoes(nextCartoes);
      setUsuarios(usuariosRes.data || []);
      setTiposDespesa(tiposRes.data || []);
      setMetaReady(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const fetchLancamentos = useCallback(async () => {
    if (!user || !metaReady) return;
    setLoading(true);
    const mes = parseInt(selectedMonth, 10);
    const ano = parseInt(selectedYear, 10);
    // Busca de 1 mês antes até o fim do mês selecionado para abranger compras
    // feitas após o fechamento do mês anterior (competência do mês selecionado).
    const startDate = format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(ano, mes + 1, 0), 'yyyy-MM-dd');
    let query = supabase.from('pessoal_cartao_lancamentos').select('*').eq('user_id', user.id).gte('data', startDate).lte('data', endDate);
    if (selectedCartao !== 'todos') query = query.eq('cartao_id', selectedCartao);
    if (selectedResponsavel !== 'todos') {
      if (selectedResponsavel === 'sem') query = query.or('responsavel_id.is.null');
      else query = query.eq('responsavel_id', selectedResponsavel);
    }
    const { data, error } = await query.order('data', { ascending: false });
    if (!isMountedRef.current) return;
    if (error) {
      toastRef.current?.({ title: 'Erro', description: 'Não foi possível carregar os lançamentos.', variant: 'destructive' });
      setLancamentos([]);
    } else {
      // Filtra pela competência (dia de fechamento do cartão) e não pelo mês calendário.
      const listaCartoes = cartoesRef.current;
      const compFiltrados = (data || []).filter((l) => {
        const cartao = listaCartoes.find((c) => c.id === l.cartao_id);
        const diaFech = cartao?.dia_fechamento || 1;
        return pertenceCompetencia(l.data, diaFech, mes, ano);
      });
      setLancamentos(compFiltrados);
    }
    setLoading(false);
  }, [user, metaReady, selectedMonth, selectedYear, selectedCartao, selectedResponsavel]);

  useEffect(() => {
    fetchLancamentos();
  }, [fetchLancamentos]);

  // Filtro de busca derivado — sem setState extra que cause re-render em cascata.
  const filtered = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return lancamentos;
    return lancamentos.filter(item =>
      (item.descricao || '').toLowerCase().includes(term) ||
      (item.categoria && item.categoria.toLowerCase().includes(term))
    );
  }, [searchTerm, lancamentos]);

  const cartaoNome = (id) => cartoes.find((c) => c.id === id)?.nome || '—';
  const responsavelNome = (id) => usuarios.find((u) => u.id === id)?.nome || '—';

  const openDialog = (lanc = null) => {
    if (lanc) {
      // Edita a compra inteira: reconstrói a data da 1ª parcela a partir da parcela aberta.
      const pa = lanc.parcela_atual || 1;
      let baseDate = parse(lanc.data, 'yyyy-MM-dd', new Date());
      if (pa > 1) baseDate = subMonths(baseDate, pa - 1);
      setEditingId(lanc.id);
      setEditingCompraId(lanc.compra_id || null);
      setFormData({
        cartao_id: lanc.cartao_id || '',
        data: format(baseDate, 'yyyy-MM-dd'), descricao: lanc.descricao, valor: lanc.valor,
        parcelas: lanc.parcelas || 1, categoria: lanc.categoria || '',
        responsavel_id: lanc.responsavel_id || ''
      });
    } else {
      setEditingId(null);
      setEditingCompraId(null);
      setFormData({ ...initialForm, cartao_id: cartoes[0]?.id || '', data: format(new Date(), 'yyyy-MM-dd') });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setEditingCompraId(null); setFormData(initialForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cartao_id || !formData.descricao || !formData.valor || !formData.data) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha cartão, descrição, valor e data.', variant: 'destructive' });
      return;
    }
    const parcelas = Math.max(1, parseInt(formData.parcelas, 10) || 1);
    const valorTotal = parseFloat(formData.valor);
    if (!(valorTotal > 0)) {
      toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' });
      return;
    }
    let baseDate;
    try { baseDate = parse(formData.data, 'yyyy-MM-dd', new Date()); }
    catch { toast({ title: 'Erro', description: 'Data inválida.', variant: 'destructive' }); return; }

    const compraId = editingId ? (editingCompraId || null) : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);
    const rows = Array.from({ length: parcelas }, (_, i) => ({
      user_id: user.id,
      cartao_id: formData.cartao_id,
      data: format(addMonths(baseDate, i), 'yyyy-MM-dd'),
      descricao: formData.descricao,
      valor: valorTotal,
      parcelas,
      parcela_atual: i + 1,
      categoria: formData.categoria,
      responsavel_id: formData.responsavel_id || null,
      compra_id: compraId,
    }));

    try {
      if (editingId) {
        // Recria todas as parcelas da compra preservando o compra_id.
        let delQ = supabase.from('pessoal_cartao_lancamentos').delete().eq('user_id', user.id);
        if (editingCompraId) delQ = delQ.eq('compra_id', editingCompraId);
        else delQ = delQ.eq('id', editingId);
        const { error: delErr } = await delQ;
        if (delErr) throw delErr;
        const { error } = await supabase.from('pessoal_cartao_lancamentos').insert(rows);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Compra atualizada.' });
      } else {
        const { error } = await supabase.from('pessoal_cartao_lancamentos').insert(rows);
        if (error) throw error;
        toast({ title: 'Sucesso', description: parcelas > 1 ? `Compra parcelada em ${parcelas}x adicionada.` : 'Lançamento adicionado.' });
      }
      closeModal();
      fetchLancamentos();
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar lançamento.', variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    let q = supabase.from('pessoal_cartao_lancamentos').delete().eq('user_id', user.id);
    if (item.compra_id) q = q.eq('compra_id', item.compra_id);
    else q = q.eq('id', item.id);
    const { error } = await q;
    if (error) toast({ title: 'Erro', description: 'Falha ao remover lançamento.', variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: item.parcelas > 1 ? 'Compra removida (todas as parcelas).' : 'Lançamento removido.' }); fetchLancamentos(); }
  };

  const total = filtered.reduce((acc, c) => acc + getInstallmentValue(c.valor, c.parcelas, c.parcela_atual), 0);
  const formatDate = (d) => { if (!d) return '-'; try { return format(parse(d, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; } };

  return (
    <div className="dark-pessoal space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-500">Lançamentos do Cartão</h1>
          <p className="text-muted-foreground">Compras e despesas no cartão de crédito.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openDialog(null)} disabled={cartoes.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
        </Button>
      </div>

      {cartoes.length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-400 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Cadastre um cartão antes de lançar despesas.
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) closeModal(); else setIsModalOpen(true); }}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[500px] border-border bg-card text-foreground">
          <DialogHeader><DialogTitle className="text-blue-500">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cartão</Label>
              <Select value={formData.cartao_id} onValueChange={(v) => setFormData(p => ({ ...p, cartao_id: v }))}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                <SelectContent className="dark-pessoal bg-card border-border">
                  {cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" name="data" value={formData.data} onChange={(e) => setFormData(p => ({ ...p, data: e.target.value }))} required className="bg-input" /></div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" required className="bg-input" /></div>
            </div>
            <div className="space-y-2">
              <Label>Descrição (Tipo de Despesa)</Label>
              {tiposDespesa.length === 0 ? (
                <p className="text-sm text-amber-400 italic">Nenhum tipo de despesa cadastrado. Cadastre em Cadastros → Tipos de Despesa.</p>
              ) : (
                <Select value={formData.descricao} onValueChange={(v) => { const sel = tiposDespesa.find((t) => t.nome_despesa === v); setFormData((p) => ({ ...p, descricao: v, categoria: sel ? sel.categoria || '' : '' })); }}>
                  <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="dark-pessoal bg-card border-border"><ScrollArea className="h-48">{tiposDespesa.map((t) => <SelectItem key={t.nome_despesa} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea></SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Responsável pela Compra</Label>
              {usuarios.length === 0 ? (
                <p className="text-sm text-amber-400 italic">Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.</p>
              ) : (
                <Select value={formData.responsavel_id || 'nenhum'} onValueChange={(v) => setFormData(p => ({ ...p, responsavel_id: v === 'nenhum' ? '' : v }))}>
                  <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent className="dark-pessoal bg-card border-border">
                    <SelectItem value="nenhum">— Sem responsável —</SelectItem>
                    {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2"><Label>Categoria</Label><Input value={formData.categoria} onChange={(e) => setFormData(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: Alimentação" className="bg-input" /></div>
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input type="number" min="1" value={formData.parcelas} onChange={(e) => setFormData(p => ({ ...p, parcelas: e.target.value }))} className="bg-input" />
              <p className="text-xs text-muted-foreground">A compra será dividida em parcelas mensais (1/{formData.parcelas || 1}, 2/{formData.parcelas || 1}, ...) e cada parcela cairá na fatura do mês correspondente.</p>
            </div>
            <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">{editingId ? 'Atualizar' : 'Salvar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-3 border-border"><CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 w-full"><Search className="w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-input" /></div>
          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <Select value={selectedCartao} onValueChange={setSelectedCartao}><SelectTrigger className="w-[160px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="todos">Todos os cartões</SelectItem>{cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}><SelectTrigger className="w-[160px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="todos">Todas as pessoas</SelectItem><SelectItem value="sem">Sem responsável</SelectItem>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[130px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[100px] bg-input"><SelectValue /></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border"><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select>
          </div>
        </CardContent></Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-400/10 border-red-200/20"><CardContent className="p-4"><p className="text-sm font-medium text-red-500">Total no Período</p><p className="text-2xl font-bold text-red-500">{formatBRL(total)}</p></CardContent></Card>
      </div>

      <Card className="border-border bg-card"><CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader><TableRow><TableHead>Cartão</TableHead><TableHead>Descrição</TableHead><TableHead>Responsável</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead>Parcelas</TableHead><TableHead className="text-right">Valor/Parcela</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow> : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="p-4 text-sm text-muted-foreground">{cartaoNome(item.cartao_id)}</TableCell>
                    <TableCell className="p-4 font-medium text-foreground">{item.descricao}</TableCell>
                    <TableCell className="p-4 text-sm">{item.responsavel_id ? <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{responsavelNome(item.responsavel_id)}</Badge> : <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                    <TableCell className="p-4">{item.categoria ? <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{item.categoria}</Badge> : <span className="text-muted-foreground text-sm italic">—</span>}</TableCell>
                    <TableCell className="p-4 text-sm">{formatDate(item.data)}</TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground">{item.parcela_atual}/{item.parcelas}</TableCell>
                    <TableCell className="p-4 text-right font-bold text-red-500">{formatBRL(getInstallmentValue(item.valor, item.parcelas, item.parcela_atual))}</TableCell>
                    <TableCell className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="text-blue-400 hover:bg-blue-500/10" onClick={() => openDialog(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent></Card>
    </div>
  );
};

export default CartaoLancamentos;
