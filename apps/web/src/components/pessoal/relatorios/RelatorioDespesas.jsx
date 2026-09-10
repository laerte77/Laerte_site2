import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileDown } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const RelatorioDespesas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [despesas, setDespesas] = useState([]);
  const [tiposDespesa, setTiposDespesa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipoDespesa: 'todos',
    pesquisa: '',
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [despesasRes, tiposRes] = await Promise.all([
      supabase.from('despesas').select('*').eq('user_id', user.id).order('data', { ascending: false }),
      supabase.from('tipos_despesa').select('*').eq('user_id', user.id),
    ]);
    if (despesasRes.error) toast({ title: 'Erro ao buscar despesas', variant: 'destructive' });
    else setDespesas(despesasRes.data);
    if (tiposRes.error) toast({ title: 'Erro ao buscar tipos', variant: 'destructive' });
    else setTiposDespesa(tiposRes.data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if (!user) return;
    const channel = supabase.channel('pessoal_relatorio_despesas_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchData]);

  const filteredDespesas = useMemo(() => {
    return despesas.filter(d => {
      const dataDespesa = new Date(d.data);
      const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
      const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;
      if (dataInicio && dataDespesa < dataInicio) return false;
      if (dataFim && dataDespesa > dataFim) return false;
      if (filtros.tipoDespesa !== 'todos' && d.despesa !== filtros.tipoDespesa) return false;
      if (filtros.pesquisa && !(d.despesa.toLowerCase().includes(filtros.pesquisa.toLowerCase()) || d.forma_pagamento.toLowerCase().includes(filtros.pesquisa.toLowerCase()))) return false;
      return true;
    });
  }, [filtros, despesas]);

  const total = filteredDespesas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value) => {
    setFiltros(prev => ({ ...prev, tipoDespesa: value }));
  };

  return (
    <>
      <Helmet>
        <title>Relatório de Despesas - Módulo Pessoal</title>
      </Helmet>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Relatório de Despesas</h1>
          <Button variant="outline" onClick={() => toast({ title: 'Em breve!', description: 'Exportação de relatórios será implementada.' })}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </header>

        <div className="p-6 bg-card rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input type="date" name="dataInicio" value={filtros.dataInicio} onChange={handleFilterChange} className="bg-background/70 text-white" />
            <Input type="date" name="dataFim" value={filtros.dataFim} onChange={handleFilterChange} className="bg-background/70 text-white" />
            <Select onValueChange={handleSelectChange} value={filtros.tipoDespesa}>
              <SelectTrigger className="bg-background/70 text-white">
                <SelectValue placeholder="Tipo de Despesa" />
              </SelectTrigger>
              <SelectContent className="dark-pessoal">
                <ScrollArea className="h-48">
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  {tiposDespesa.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.nome_despesa}>{tipo.nome_despesa}</SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar..." 
                name="pesquisa"
                value={filtros.pesquisa}
                onChange={handleFilterChange}
                className="pl-10 bg-background/70 text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Resultados</h2>
            <div className="text-right">
              <p className="text-muted-foreground">Total das Despesas</p>
              <p className="text-2xl font-bold text-red-400">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo de Despesa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Parcelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan="5" className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredDespesas.length > 0 ? (
                filteredDespesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>{new Date(despesa.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                    <TableCell>{despesa.despesa}</TableCell>
                    <TableCell className="text-red-400">{parseFloat(despesa.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell>{despesa.forma_pagamento}</TableCell>
                    <TableCell>{despesa.parcelas || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" className="text-center">Nenhuma despesa encontrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default RelatorioDespesas;