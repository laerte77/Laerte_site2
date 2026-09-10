import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Zap, Home, Wrench, Sparkles, Box, CheckCircle2, Clock, AlertCircle, ArrowUpDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isBefore, isToday } from 'date-fns';

const CATEGORY_MAP = {
  'Energia': { icon: Zap, color: 'text-[hsl(var(--cat-energia))] border-[hsl(var(--cat-energia))]', label: '💡 Energia' },
  'Despesas da Casa': { icon: Home, color: 'text-[hsl(var(--cat-casa))] border-[hsl(var(--cat-casa))]', label: '🏠 Despesas da Casa' },
  'Serviços': { icon: Wrench, color: 'text-[hsl(var(--cat-servicos))] border-[hsl(var(--cat-servicos))]', label: '🔧 Serviços' },
  'Perfumaria': { icon: Sparkles, color: 'text-[hsl(var(--cat-perfumaria))] border-[hsl(var(--cat-perfumaria))]', label: '🛍️ Perfumaria' },
  'Outros': { icon: Box, color: 'text-[hsl(var(--cat-outros))] border-[hsl(var(--cat-outros))]', label: '📱 Outros' }
};

const STATUS_OPTIONS = ['Pendente', 'Pago', 'Atrasado'];

export default function DespesasPrevisadasMes() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  
  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [sortConfig, setSortConfig] = useState({ key: 'data_vencimento', direction: 'desc' });
  
  // Selection & Inline Editing
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');

  // Summary state
  const [summary, setSummary] = useState({ total: 0, pago: 0, pendente: 0 });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: expenses, error } = await supabase
        .from('despesas_previstas')
        .select('*')
        .eq('user_id', user.id)
        .gte('data_vencimento', start)
        .lte('data_vencimento', end);

      if (error) throw error;

      // Extract unique categories
      const uniqueCategories = [...new Set(expenses.map(e => e.categoria).filter(Boolean))];
      setCategories(uniqueCategories);

      // Recalculate auto-status if 'Pendente' but past due
      const processed = expenses.map(item => {
        let currentStatus = item.status || 'Pendente';
        if (currentStatus === 'Pendente') {
          const dueDate = parseISO(item.data_vencimento);
          if (isBefore(dueDate, new Date()) && !isToday(dueDate)) {
            currentStatus = 'Atrasado';
          }
        }
        return { ...item, computedStatus: currentStatus };
      });

      setData(processed);
      calculateSummary(processed);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar despesas.' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateSummary = (items) => {
    const total = items.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const pago = items.filter(i => i.computedStatus === 'Pago').reduce((acc, curr) => acc + Number(curr.valor), 0);
    setSummary({ total, pago, pendente: total - pago });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredData = React.useMemo(() => {
    let result = [...data];
    if (selectedCategory !== 'Todos') {
      result = result.filter(item => item.categoria === selectedCategory);
    }
    if (selectedStatus !== 'Todos') {
      result = result.filter(item => item.computedStatus === selectedStatus);
    }

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, selectedCategory, selectedStatus, sortConfig]);

  const toggleSelection = (id) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const toggleAll = () => {
    if (selectedItems.size === filteredData.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(filteredData.map(i => i.id)));
  };

  const markAsPaid = async () => {
    if (selectedItems.size === 0) return;
    try {
      const ids = Array.from(selectedItems);
      const { error } = await supabase
        .from('despesas_previstas')
        .update({ status: 'Pago' })
        .in('id', ids);

      if (error) throw error;

      toast({ title: 'Sucesso', description: `${ids.length} despesas marcadas como pagas.` });
      setSelectedItems(new Set());
      fetchData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const handleInlineEditSave = async (id, field) => {
    try {
      const val = field === 'valor' ? Number(editValue) : editValue;
      const { error } = await supabase
        .from('despesas_previstas')
        .update({ [field]: val })
        .eq('id', id);

      if (error) throw error;
      
      setEditingCell(null);
      fetchData();
      toast({ title: 'Atualizado', description: 'Registro salvo com sucesso.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const renderCategoryBadge = (category) => {
    const mapInfo = CATEGORY_MAP[category] || CATEGORY_MAP['Outros'];
    const label = mapInfo.label.replace(/.*? /, ''); // get label text without emoji
    
    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/50 ${mapInfo.color}`}>
        {mapInfo.label}
      </Badge>
    );
  };

  const renderStatus = (status) => {
    if (status === 'Pago') return <Badge className="bg-[hsl(var(--status-pago))] text-white hover:bg-[hsl(var(--status-pago))]/80"><CheckCircle2 className="w-3 h-3 mr-1"/> Pago</Badge>;
    if (status === 'Atrasado') return <Badge variant="destructive" className="bg-[hsl(var(--status-atrasado))] text-white hover:bg-[hsl(var(--status-atrasado))]/80"><AlertCircle className="w-3 h-3 mr-1"/> Atrasado</Badge>;
    return <Badge className="bg-[hsl(var(--status-pendente))] text-black hover:bg-[hsl(var(--status-pendente))]/80"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>;
  };

  const getRowCategoryColor = (category) => {
    const mapInfo = CATEGORY_MAP[category] || CATEGORY_MAP['Outros'];
    // This will give a subtle background tint based on category
    if(category === 'Energia') return 'hover:bg-[hsl(var(--cat-energia))]/10';
    if(category === 'Despesas da Casa') return 'hover:bg-[hsl(var(--cat-casa))]/10';
    if(category === 'Serviços') return 'hover:bg-[hsl(var(--cat-servicos))]/10';
    if(category === 'Perfumaria') return 'hover:bg-[hsl(var(--cat-perfumaria))]/10';
    return 'hover:bg-[hsl(var(--cat-outros))]/10';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contas do Mês</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.total)}</div></CardContent>
        </Card>
        <Card className="bg-[hsl(var(--status-pago))]/5 border-[hsl(var(--status-pago))]/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(var(--status-pago))]">Total Pago</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-[hsl(var(--status-pago))]">{formatCurrency(summary.pago)}</div></CardContent>
        </Card>
        <Card className="bg-[hsl(var(--status-pendente))]/5 border-[hsl(var(--status-pendente))]/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[hsl(var(--status-pendente))]">Total Pendente</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-[hsl(var(--status-pendente))]">{formatCurrency(summary.pendente)}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px] bg-input"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas as Categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px] bg-input"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedItems.size > 0 && (
          <Button onClick={markAsPaid} className="bg-[hsl(var(--status-pago))] hover:bg-[hsl(var(--status-pago))]/90 text-white">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Marcar {selectedItems.size} como Pago
          </Button>
        )}
      </div>

      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox checked={selectedItems.size === filteredData.length && filteredData.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/80" onClick={() => handleSort('data_vencimento')}>
                  Data <ArrowUpDown className="inline w-3 h-3 ml-1" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/80" onClick={() => handleSort('descricao')}>
                  Descrição <ArrowUpDown className="inline w-3 h-3 ml-1" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/80" onClick={() => handleSort('categoria')}>
                  Categoria <ArrowUpDown className="inline w-3 h-3 ml-1" />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/80 text-right" onClick={() => handleSort('valor')}>
                  Valor (R$) <ArrowUpDown className="inline w-3 h-3 ml-1" />
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
              ) : (
                filteredData.map(item => (
                  <TableRow key={item.id} className={`${selectedItems.has(item.id) ? 'bg-primary/5' : ''} ${getRowCategoryColor(item.categoria)} transition-colors`}>
                    <TableCell><Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleSelection(item.id)} /></TableCell>
                    <TableCell>{format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell>{renderCategoryBadge(item.categoria)}</TableCell>
                    
                    <TableCell className="text-right cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => { setEditingCell({ id: item.id, field: 'valor' }); setEditValue(item.valor); }}>
                      {editingCell?.id === item.id && editingCell.field === 'valor' ? (
                        <Input 
                          autoFocus
                          type="number" 
                          value={editValue} 
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleInlineEditSave(item.id, 'valor')}
                          onKeyDown={e => e.key === 'Enter' && handleInlineEditSave(item.id, 'valor')}
                          className="h-8 w-24 text-right ml-auto bg-input text-foreground border-border"
                        />
                      ) : formatCurrency(Number(item.valor))}
                    </TableCell>

                    <TableCell className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setEditingCell({ id: item.id, field: 'status' }); setEditValue(item.computedStatus); }}>
                      {editingCell?.id === item.id && editingCell.field === 'status' ? (
                         <Select value={editValue} onValueChange={(val) => { setEditValue(val); handleInlineEditSave(item.id, 'status'); }}>
                          <SelectTrigger className="h-8 w-[120px] mx-auto bg-input text-foreground border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : renderStatus(item.computedStatus)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}