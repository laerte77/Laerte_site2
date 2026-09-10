import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ConsultaDespesas = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organizadores, setOrganizadores] = useState([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedComprador, setSelectedComprador] = useState('all');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const oRes = await getAccessibleDataQuery(user.id, isAdmin, 'ent_organizadores', 'id, nome');
      if (oRes.data) setOrganizadores(oRes.data);

      let query = getAccessibleDataQuery(user.id, isAdmin, 'ent_despesas_lancamentos', '*, despesa:ent_despesas(nome_despesa), comprador:ent_organizadores(nome)');
      
      if (startDate) query = query.gte('data', startDate);
      if (endDate) query = query.lte('data', endDate);
      if (selectedComprador !== 'all') query = query.eq('comprador_id', selectedComprador);

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
  }, [user, isAdmin, startDate, endDate, selectedComprador]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
      const title = 'Consulta de Despesas - Pelada do Sábado';
      const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, startY);
      
      startY += 8;

      doc.setFontSize(10);
      const dateStr = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
      const dateWidth = doc.getStringUnitWidth(dateStr) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      doc.text(dateStr, (doc.internal.pageSize.width - dateWidth) / 2, startY);

      startY += 10;

      doc.autoTable({
        head: [['Data', 'Despesa', 'Comprador', 'Valor']],
        body: data.map(item => [
          format(parseISO(item.data), 'dd/MM/yyyy'),
          item.despesa?.nome_despesa || 'N/A',
          item.comprador?.nome || 'N/A',
          formatCurrency(item.valor)
        ]),
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [255, 140, 0] },
      });
      doc.save('despesas.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao gerar o PDF.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      Data: format(parseISO(item.data), 'dd/MM/yyyy'),
      Despesa: item.despesa?.nome_despesa || 'N/A',
      Comprador: item.comprador?.nome || 'N/A',
      Valor: item.valor
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, "despesas.xlsx");
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-primary">Consulta de Despesas</CardTitle>
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
            <label className="text-sm font-medium">Comprador</label>
            <Select value={selectedComprador} onValueChange={setSelectedComprador}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent className="dark-entretenimento bg-card border-border">
                <SelectItem value="all">Todos</SelectItem>
                {organizadores.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-border">
                <TableHead>Data</TableHead>
                <TableHead>Despesa</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell>{format(parseISO(item.data), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{item.despesa?.nome_despesa}</TableCell>
                  <TableCell>{item.comprador?.nome}</TableCell>
                  <TableCell className="text-right font-medium text-red-500">{formatCurrency(item.valor)}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsultaDespesas;