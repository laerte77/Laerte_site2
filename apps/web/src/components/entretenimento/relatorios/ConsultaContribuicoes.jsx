import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Printer, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ConsultaContribuicoes = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [participantes, setParticipantes] = useState([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedParticipante, setSelectedParticipante] = useState('all');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const pRes = await getAccessibleDataQuery(user.id, isAdmin, 'ent_participantes', 'id, nome');
      if (pRes.data) setParticipantes(pRes.data);

      let query = getAccessibleDataQuery(user.id, isAdmin, 'ent_contribuicoes', '*, contribuinte:ent_participantes(nome), recebedor:ent_organizadores(nome)');
      
      if (startDate) query = query.gte('data', startDate);
      if (endDate) query = query.lte('data', endDate);
      if (selectedParticipante !== 'all') query = query.eq('contribuinte_id', selectedParticipante);

      const { data: result, error } = await query.order('data', { ascending: false });
      if (error) throw error;
      setData(result || []);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin, startDate, endDate, selectedParticipante]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const groupedData = useMemo(() => {
    const groups = data.reduce((acc, curr) => {
      const id = curr.contribuinte_id;
      if (!acc[id]) {
        acc[id] = {
          id,
          nome: curr.contribuinte?.nome || 'N/A',
          count: 0,
          totalValor: 0,
          items: []
        };
      }
      acc[id].count += 1;
      acc[id].totalValor += Number(curr.valor);
      acc[id].items.push(curr);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [data]);

  const toggleRow = (id) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
    );
  };

  const exportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const logoUrl = 'https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/942fa7069eb698c9889c6961b39b5ccc.png';
      
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = logoUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // proceed even if image fails
      });

      let startY = 15;

      if (img.width > 0) {
        const imgHeight = 22;
        const imgWidth = (img.width * imgHeight) / img.height;
        const xPos = (doc.internal.pageSize.width - imgWidth) / 2;
        doc.addImage(img, 'PNG', xPos, startY, imgWidth, imgHeight);
        startY += imgHeight + 10;
      }

      doc.setFontSize(16);
      const title = 'Consulta de Contribuições - Pelada do Sábado';
      const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, startY);
      
      startY += 8;

      doc.setFontSize(10);
      const dateStr = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
      const dateWidth = doc.getStringUnitWidth(dateStr) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      doc.text(dateStr, (doc.internal.pageSize.width - dateWidth) / 2, startY);

      startY += 10;

      const body = [];
      groupedData.forEach(group => {
        body.push([
          { content: `Participante: ${group.nome}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: group.count.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } },
          { content: formatCurrency(group.totalValor), colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right', textColor: [255, 140, 0] } }
        ]);
        
        body.push([
          { content: 'Data', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
          { content: 'Recebedor', colSpan: 2, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
          { content: 'Valor', styles: { fontStyle: 'italic', halign: 'right', textColor: [100, 100, 100] } }
        ]);

        group.items.forEach(item => {
          body.push([
            format(parseISO(item.data), 'dd/MM/yyyy'),
            { content: item.recebedor?.nome || 'N/A', colSpan: 2 },
            { content: formatCurrency(item.valor), halign: 'right' }
          ]);
        });
        
        body.push([{ content: '', colSpan: 4, styles: { minCellHeight: 4, fillColor: [255, 255, 255] } }]);
      });

      doc.autoTable({
        head: [['Participante / Detalhes', 'Qtd. Contribuições', 'Recebedor', 'Valor']],
        body: body,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [255, 140, 0] },
        didParseCell: function(data) {
          if (data.row.index > -1 && data.cell.text[0] === '') {
             data.cell.styles.lineWidth = 0;
          }
        }
      });
      
      doc.save('contribuicoes.pdf');
      toast({ title: 'Sucesso', description: 'PDF gerado com sucesso!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao gerar o PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const exportExcel = () => {
    try {
      const excelData = [];
      
      groupedData.forEach(group => {
        excelData.push({
          'Participante / Data': `[PARTICIPANTE] ${group.nome}`,
          'Recebedor': '-',
          'Qtd. Contribuições': group.count,
          'Valor': group.totalValor
        });
        
        group.items.forEach(item => {
          excelData.push({
            'Participante / Data': `    ${format(parseISO(item.data), 'dd/MM/yyyy')}`,
            'Recebedor': item.recebedor?.nome || 'N/A',
            'Qtd. Contribuições': '',
            'Valor': item.valor
          });
        });
        
        excelData.push({ 'Participante / Data': '', 'Recebedor': '', 'Qtd. Contribuições': '', 'Valor': '' });
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contribuições");
      XLSX.writeFile(wb, "contribuicoes.xlsx");
      toast({ title: 'Sucesso', description: 'Planilha exportada com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao exportar o Excel.', variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-primary">Consulta de Contribuições</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={generatingPDF}>
            {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Data Inicial</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-input [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-sm font-medium">Data Final</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-input [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-sm font-medium">Participante</label>
            <Select value={selectedParticipante} onValueChange={setSelectedParticipante}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent className="dark-entretenimento bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                {participantes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border">
                  <TableHead>Participante</TableHead>
                  <TableHead className="text-center">Qtd. Contribuições</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedData.map((group) => (
                  <React.Fragment key={`group-${group.id}`}>
                    <TableRow className={`font-semibold border-border hover:bg-secondary/30 ${expandedRows.includes(group.id) ? 'bg-secondary/50' : ''}`}>
                      <TableCell>{group.nome}</TableCell>
                      <TableCell className="text-center">{group.count}</TableCell>
                      <TableCell className="text-right text-green-500">{formatCurrency(group.totalValor)}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleRow(group.id)}
                          className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          {expandedRows.includes(group.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRows.includes(group.id) && (
                      <TableRow className="bg-secondary/20 border-border">
                        <TableCell colSpan={4} className="p-0">
                          <div className="p-4 pl-12 border-b border-border">
                            <Table size="sm" className="bg-background rounded-md border border-border">
                              <TableHeader>
                                <TableRow className="bg-secondary/50 hover:bg-secondary/50 border-border">
                                  <TableHead>Data</TableHead>
                                  <TableHead>Recebedor</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map(item => (
                                  <TableRow key={item.id} className="border-border">
                                    <TableCell className="text-muted-foreground">{format(parseISO(item.data), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.recebedor?.nome || 'N/A'}</TableCell>
                                    <TableCell className="text-right text-green-500 font-medium">
                                      {formatCurrency(item.valor)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {groupedData.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsultaContribuicoes;