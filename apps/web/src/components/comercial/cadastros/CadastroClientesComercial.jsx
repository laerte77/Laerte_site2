import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Users, RefreshCw, Search,
  Phone, MapPin, FileSpreadsheet, FileText, Printer,
  Loader2
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
  telefone: '',
  email: '',
  endereco: '',
  observacoes: ''
};

export default function CadastroClientesComercial() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchNome, setSearchNome] = useState('');
  const [searchEndereco, setSearchEndereco] = useState('');
  const [searchTelefone, setSearchTelefone] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const fetchClientes = useCallback(async () => {
    if (!user) {
      setClientes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('comercial_clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setClientes(data || []);
    }

    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

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

  const openEditDialog = (cliente) => {
    setEditingId(cliente.id);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      observacoes: cliente.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;

    if (!formData.nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome do cliente.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    const payload = {
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim() || null,
      email: formData.email.trim() || null,
      endereco: formData.endereco.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      user_id: user.id
    };

    try {
      let error;

      if (editingId) {
        ({ error } = await supabase
          .from('comercial_clientes')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id));
      } else {
        ({ error } = await supabase
          .from('comercial_clientes')
          .insert(payload));
      }

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: editingId
          ? 'Cliente atualizado com sucesso.'
          : 'Cliente cadastrado com sucesso.'
      });

      resetForm();
      await fetchClientes();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o cliente.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from('comercial_clientes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Não foi possível excluir',
        description: 'Verifique se este cliente possui vendas vinculadas.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Cliente excluído',
      description: 'O registro foi removido com sucesso.'
    });

    await fetchClientes();
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const nome = (cliente.nome || '').toLowerCase();
    const endereco = (cliente.endereco || '').toLowerCase();
    const telefone = (cliente.telefone || '').toLowerCase();

    return (
      nome.includes(searchNome.trim().toLowerCase()) &&
      endereco.includes(searchEndereco.trim().toLowerCase()) &&
      telefone.includes(searchTelefone.trim().toLowerCase())
    );
  });

  const exportData = clientesFiltrados.map(cliente => ({
    Nome: cliente.nome || '',
    Telefone: cliente.telefone || '',
    Email: cliente.email || '',
    Endereco: cliente.endereco || '',
    Observacoes: cliente.observacoes || ''
  }));

  const exportExcel = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum cliente',
        description: 'Não há clientes para exportar.',
        variant: 'destructive'
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 30 },
      { wch: 40 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    XLSX.writeFile(workbook, 'lista_de_clientes_comercial.xlsx');

    toast({
      title: 'Excel gerado',
      description: 'A lista de clientes foi exportada.'
    });
  };

  const exportPDF = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum cliente',
        description: 'Não há clientes para exportar.',
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
    doc.text('LISTA DE CLIENTES', 14, 18);
    doc.setFontSize(9);
    doc.text(`Total de clientes: ${clientesFiltrados.length}`, 14, 25);

    autoTable(doc, {
      startY: 31,
      head: [['Nome', 'Telefone', 'E-mail', 'Endereço', 'Observações']],
      body: exportData.map(cliente => [
        cliente.Nome,
        cliente.Telefone,
        cliente.Email,
        cliente.Endereco,
        cliente.Observacoes
      ]),
      styles: {
        fontSize: 8,
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

    doc.save('lista_de_clientes_comercial.pdf');

    toast({
      title: 'PDF gerado',
      description: 'A lista de clientes foi exportada.'
    });
  };

  const printList = () => {
    if (!exportData.length) {
      toast({
        title: 'Nenhum cliente',
        description: 'Não há clientes para imprimir.',
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

    const rows = exportData.map(cliente => `
      <tr>
        <td>${escapeHTML(cliente.Nome)}</td>
        <td>${escapeHTML(cliente.Telefone)}</td>
        <td>${escapeHTML(cliente.Email)}</td>
        <td>${escapeHTML(cliente.Endereco)}</td>
        <td>${escapeHTML(cliente.Observacoes)}</td>
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
        <title>Lista de Clientes</title>
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
        <h1>Lista de Clientes</h1>
        <p>Total de clientes: ${clientesFiltrados.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>Telefone</th><th>E-mail</th>
              <th>Endereço</th><th>Observações</th>
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
            <Users className="h-5 w-5" style={{ color: GREEN }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{ color: GREEN }}>
              Cadastros
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Cadastre e organize seus clientes.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchClientes}>
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
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="border-border bg-card/80">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchNome} onChange={e => setSearchNome(e.target.value)} placeholder="Pesquisar por nome..." className="bg-input pl-9" />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchEndereco} onChange={e => setSearchEndereco(e.target.value)} placeholder="Pesquisar por endereço..." className="bg-input pl-9" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTelefone} onChange={e => setSearchTelefone(e.target.value)} placeholder="Pesquisar por telefone..." className="bg-input pl-9" />
          </div>
          <div className="flex items-center justify-between md:col-span-3">
            <span className="text-sm text-muted-foreground">{clientesFiltrados.length} cliente(s) encontrado(s)</span>
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchNome('');
              setSearchEndereco('');
              setSearchTelefone('');
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: GREEN }}>{clientes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clientesFiltrados.length}</p>
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
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        description="Preencha os dados do cliente. Apenas o nome é obrigatório."
        icon={Users}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="form-cliente-comercial" disabled={saving} className="font-bold text-black" style={{ background: GREEN }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar Alterações' : 'Salvar Cliente'}
            </Button>
          </>
        }
      >
        <form id="form-cliente-comercial" onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={formData.nome} onChange={e => updateField('nome', e.target.value)} placeholder="Nome completo do cliente" className="h-11 rounded-xl bg-input" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Telefone (opcional)</Label>
            <Input value={formData.telefone} onChange={e => updateField('telefone', e.target.value)} placeholder="(00) 00000-0000" className="h-11 rounded-xl bg-input" />
          </div>
          <div className="space-y-2">
            <Label>E-mail (opcional)</Label>
            <Input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="cliente@email.com" className="h-11 rounded-xl bg-input" />
          </div>
          <div className="space-y-2">
            <Label>Endereço (opcional)</Label>
            <Input value={formData.endereco} onChange={e => updateField('endereco', e.target.value)} placeholder="Rua, número, bairro..." className="h-11 rounded-xl bg-input" />
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={formData.observacoes} onChange={e => updateField('observacoes', e.target.value)} placeholder="Informações adicionais..." className="rounded-xl bg-input" rows={3} />
          </div>
        </form>
      </ModalComercialPadrao>

      {/* TABELA */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg" style={{ color: GREEN }}>Clientes cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Telefone</th>
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Endereço</th>
                  <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      <span className="mt-2 block">Carregando clientes...</span>
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      {clientes.length ? 'Nenhum cliente corresponde aos filtros.' : 'Nenhum cliente cadastrado ainda.'}
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map(cliente => (
                    <tr key={cliente.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-comercial)/.04)]">
                      <td className="p-4 font-medium">{cliente.nome}</td>
                      <td className="p-4 text-muted-foreground">{cliente.telefone || '—'}</td>
                      <td className="max-w-xs truncate p-4 text-muted-foreground">{cliente.endereco || '—'}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(cliente)} className="text-[hsl(var(--neon-comercial))]" title="Editar cliente">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" title="Excluir cliente">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente excluir o cliente <strong>{cliente.nome}</strong>?
                                  Essa ação não poderá ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cliente.id)} className="bg-red-600 text-white hover:bg-red-700">
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
