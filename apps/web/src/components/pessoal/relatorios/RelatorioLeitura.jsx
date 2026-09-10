import React, { useState, useEffect, useMemo, useCallback } from 'react';
    import { Helmet } from 'react-helmet';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Progress } from '@/components/ui/progress';
    import { Search, FileDown } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useToast } from '@/components/ui/use-toast';
    import { Badge } from '@/components/ui/badge';

    const RelatorioLeitura = () => {
      const { user } = useAuth();
      const { toast } = useToast();
      const [leituras, setLeituras] = useState([]);
      const [livros, setLivros] = useState([]);
      const [filtro, setFiltro] = useState('');
      const [loading, setLoading] = useState(true);

      const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const [leiturasRes, livrosRes] = await Promise.all([
          supabase.from('leituras').select('*').eq('user_id', user.id),
          supabase.from('livros').select('*').eq('user_id', user.id)
        ]);

        if (leiturasRes.error) toast({ title: 'Erro ao buscar leituras', description: leiturasRes.error.message, variant: 'destructive' });
        else setLeituras(leiturasRes.data);

        if (livrosRes.error) toast({ title: 'Erro ao buscar livros', description: livrosRes.error.message, variant: 'destructive' });
        else setLivros(livrosRes.data);
        
        setLoading(false);
      }, [user, toast]);

      useEffect(() => {
        fetchData();
        
        if (!user) return;
        const channel = supabase.channel('pessoal_relatorio_leitura_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras' }, fetchData)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'livros' }, fetchData)
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }, [user, fetchData]);

      const dadosRelatorio = useMemo(() => {
        const dadosAgrupados = livros.map(livro => {
          const leiturasDoLivro = leituras.filter(l => l.livro === livro.nome_livro);
          const capitulosLidos = leiturasDoLivro.reduce((acc, curr) => acc + parseInt(curr.capitulos_lidos || 0), 0);
          const totalCapitulos = parseInt(livro.capitulos || 0);
          const restantes = totalCapitulos - capitulosLidos;
          const progresso = totalCapitulos > 0 ? (capitulosLidos / totalCapitulos) * 100 : 0;
          
          let status;
          if (progresso >= 100) {
            status = <Badge className="bg-green-500">Finalizado</Badge>;
          } else if (progresso > 0) {
            status = <Badge variant="secondary">Parcial</Badge>;
          } else {
            status = <Badge variant="outline">Não Iniciado</Badge>;
          }

          return {
            id: livro.id,
            nome_livro: livro.nome_livro,
            total_capitulos: totalCapitulos,
            lidos: capitulosLidos,
            restantes: restantes < 0 ? 0 : restantes,
            progresso: progresso > 100 ? 100 : progresso,
            status: status,
          };
        });

        return dadosAgrupados.filter(d =>
          d.nome_livro.toLowerCase().includes(filtro.toLowerCase())
        );
      }, [livros, leituras, filtro]);

      return (
        <>
          <Helmet>
            <title>Relatório de Leitura - Módulo Pessoal</title>
          </Helmet>
          <div className="space-y-6">
            <header className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Relatório de Leitura</h1>
              <Button variant="outline" onClick={() => toast({title: "Em breve!", description: "A exportação de relatórios estará disponível em breve."})}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </header>

            <div className="p-6 bg-card rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Progresso de Leitura</h2>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar por livro..." 
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10 bg-background/70 text-white"
                  />
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Livro</TableHead>
                    <TableHead>Total Cap.</TableHead>
                    <TableHead>Lidos</TableHead>
                    <TableHead>Restantes</TableHead>
                    <TableHead className="w-[20%]">Progresso</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : dadosRelatorio.length > 0 ? (
                    dadosRelatorio.map((dado) => (
                      <TableRow key={dado.id}>
                        <TableCell className="font-medium">{dado.nome_livro}</TableCell>
                        <TableCell>{dado.total_capitulos}</TableCell>
                        <TableCell>{dado.lidos}</TableCell>
                        <TableCell>{dado.restantes}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={dado.progresso} className="w-[70%]" />
                            <span className="text-sm text-muted-foreground">{Math.round(dado.progresso)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{dado.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center">Nenhum dado de leitura encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      );
    };

    export default RelatorioLeitura;