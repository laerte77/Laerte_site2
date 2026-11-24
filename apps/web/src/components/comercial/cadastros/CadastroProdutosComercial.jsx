import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Package, RefreshCw, Search,
  FileSpreadsheet, FileText, Printer, Loader2, Barcode
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import ModalComercialPadrao from '@/components/comercial/ModalComercialPadrao';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const GREEN = 'hsl(var(--neon-comercial))';

const INITIAL_FORM = {
  nome: '',
  codigo: '',
  descricao: '',
  unidade: 'UN'
};

export default function CadastroProdutosComercial() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchNome, setSearchNome] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const fetchProdutos = useCallback(async () => {
    if (!user) {
      setProdutos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('comercial_produtos')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setProdutos(data || []);
    }

    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM });
    setEditingId(null);
  };

  const handleDialogChange = (open) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (produto) => {
    setEditingId(produto.id);
    setFormData({
      nome: produto.nome || '',
      codigo: produto.codigo || '',
      descricao: produto.descricao || '',
      unidade: produto.unidade || 'UN'
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;

    if (!formData.nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome do produto.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    const payload = {
      nome: formData.nome.trim(),
      codigo: formData.codigo.trim() || null,
      descricao: formData.descricao.trim() || null,
      unidade: formData.unidade.trim().toUpperCase() || 'UN',
      user_id: user.id
    };

    try {
      let error;

      if (editingId) {
        ({ error } = await supabase
          .from('comercial_produtos')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id));
      } else {
        ({ error } = await supabase
          .from('comercial_produtos')
          .insert(payload));
      }

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: editingId
          ? 'Produto atualizado com sucesso.'
          : 'Produto cadastrado com sucesso.'
      });

      resetForm();
      await fetchProdutos();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o produto.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from('comercial_produtos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Não foi possível excluir',
        description: 'Este produto pode possuir movimentações ou vendas vinculadas. Verifique os registros relacionados.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Produto excluído',
      description: 'O registro foi removido com sucesso.'
    });

    await fetchProdutos();
  };

  const produtosFiltrados = produtos.filter(produto => {
    const nome = (produto.nome || '').toLowerCase();
    const codigo = (produto.codigo || '').toLowerCase();

    return (
      nome.includes(searchNome.trim().toLowerCase()) &&
      codigo.includes(searchCodigo.trim().toLowerCase())
    );
  });

  const exportData = produtosFiltrados.map(produto => ({
    Nome: produto.nome || '',
    Codigo: produto.codigo || '',
    Descricao: produto.descricao || '',
    Unidade: produto.unidade || 'UN'
  }));

  const exportExcel = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum produto',
        description: 'Não há produtos para exportar.',
        variant: 'destructive'
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 35 }, { wch: 18 }, { wch: 45 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'lista_de_produtos_comercial.xlsx');

    toast({
      title: 'Excel gerado',
      description: 'A lista de produtos foi exportada.'
    });
  };

  const exportPDF = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum produto',
        description: 'Não há produtos para exportar.',
        variant: 'destructive'
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(18);
    doc.text('LISTA DE PRODUTOS', 14, 18);
    doc.setFontSize(9);
    doc.text(`Total de produtos: ${produtosFiltrados.length}`, 14, 25);

    autoTable(doc, {
      startY: 31,
      head: [['Nome', 'Código', 'Descrição', 'Unidade']],
      body: exportData.map(produto => [
        produto.Nome,
        produto.Codigo,
        produto.Descricao,
        produto.Unidade
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [30, 45, 32],
        textColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [245, 248, 245]
      }
    });

    doc.save('lista_de_produtos_comercial.pdf');

    toast({
      title: 'PDF gerado',
      description: 'A lista de produtos foi exportada.'
    });
  };

  const printList = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum produto',
        description: 'Não há produtos para imprimir.',
        variant: 'destructive'
      });
      return;
    }

    const escapeHTML = value =>
      String(value || '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character]);

    const rows = exportData.map(produto => `
      <tr>
        <td>${escapeHTML(produto.Nome)}</td>
        <td>${escapeHTML(produto.Codigo)}</td>
        <td>${escapeHTML(produto.Descricao)}</td>
        <td>${escapeHTML(produto.Unidade)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      toast({
        title: 'Impressão bloqueada',
        description: 'Permita a abertura de janelas para imprimir.',
        variant: 'destructive'
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lista de Produtos</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h1 { font-size: 22px; margin-bottom: 6px; }
          p { font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #eeeeee; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Lista de Produtos</h1>
        <p>Total de produtos: ${produtosFiltrados.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Código</th><th>Descrição</th><th>Unidade</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: 'hsl(var(--neon-comercial)/.25)',
              background: 'hsl(var(--neon-comercial)/.10)'
            }}
          >
            <Package className="h-5 w-5" style={{ color: GREEN }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{ color: GREEN }}>
              Cadastros
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
            <p className="text-sm text-muted-foreground">Cadastre e organize seus produtos.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchProdutos}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={printList}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={openNewDialog} className="font-bold text-black" style={{ background: GREEN }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="border-border bg-card/80">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchNome} onChange={e => setSearchNome(e.target.value)} placeholder="Pesquisar por nome..." className="bg-input pl-9" />
          </div>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchCodigo} onChange={e => setSearchCodigo(e.target.value)} placeholder="Pesquisar por código..." className="bg-input pl-9" />
          </div>
          <div className="flex items-center justify-between md:col-span-2">
            <span className="text-sm text-muted-foreground">{produtosFiltrados.length} produto(s) encontrado(s)</span>
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchNome('');
              setSearchCodigo('');
            }}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* INDICADORES */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtos cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: GREEN }}>{produtos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{produtosFiltrados.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Situação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">Ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* MODAL */}
      <ModalComercialPadrao
        open={isDialogOpen}
        onClose={() => handleDialogChange(false)}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        description="Preencha os dados do produto. Apenas o nome é obrigatório."
        icon={Package}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="form-produto-comercial" disabled={saving} className="font-bold text-black" style={{ background: GREEN }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Salvar Produto'}
            </Button>
          </>
        }
      >
        <form id="form-produto-comercial" onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label>Nome do produto *</Label>
            <Input value={formData.nome} onChange={e => updateField('nome', e.target.value)} placeholder="Nome do produto" className="h-11 rounded-xl bg-input" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Código (opcional)</Label>
            <Input value={formData.codigo} onChange={e => updateField('codigo', e.target.value)} placeholder="Código ou referência do produto" className="h-11 rounded-xl bg-input" />
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={formData.descricao} onChange={e => updateField('descricao', e.target.value)} placeholder="Descreva o produto..." className="rounded-xl bg-input" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Input value={formData.unidade} onChange={e => updateField('unidade', e.target.value)} placeholder="Ex.: UN, KG, L, M" className="h-11 rounded-xl bg-input" maxLength={10} />
            <p className="text-xs text-muted-foreground">Exemplos: UN, KG, L, M, CX, PCT.</p>
          </div>
        </form>
      </ModalComercialPadrao>

      {/* TABELA */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg" style={{ color: GREEN }}>Produtos cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Código</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Unidade</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      <span className="mt-2 block">Carregando produtos...</span>
                    </td>
                  </tr>
                ) : produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      {produtos.length ? 'Nenhum produto corresponde aos filtros.' : 'Nenhum produto cadastrado ainda.'}
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map(produto => (
                    <tr key={produto.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-comercial)/.04)]">
                      <td className="p-4 font-medium">
                        {produto.nome}
                        {produto.descricao && (
                          <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{produto.descricao}</p>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{produto.codigo || '—'}</td>
                      <td className="p-4 text-muted-foreground">{produto.unidade || 'UN'}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(produto)} className="text-[hsl(var(--neon-comercial))]" title="Editar produto">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" title="Excluir produto">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente excluir o produto <strong>{produto.nome}</strong>?
                                  Se houver vendas ou movimentações vinculadas, a exclusão poderá ser impedida pelo banco de dados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(produto.id)} className="bg-red-600 text-white hover:bg-red-700">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
