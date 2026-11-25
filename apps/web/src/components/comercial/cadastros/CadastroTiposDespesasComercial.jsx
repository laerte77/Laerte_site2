import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, RefreshCw, Tags, Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import ModalComercialPadrao from '@/components/comercial/ModalComercialPadrao';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GREEN = 'hsl(var(--neon-comercial))';

export default function CadastroTiposDespesasComercial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState('');

  const carregar = useCallback(async () => {
    if (!user) return setLoading(false);
    setLoading(true);
    const { data, error } = await supabase.from('comercial_tipos_despesas')
      .select('*').eq('user_id', user.id).order('nome');
    if (error) toast({ title: 'Erro ao carregar tipos', description: error.message, variant: 'destructive' });
    else setTipos(data || []);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const novo = () => {
    setEditingId(null);
    setNome('');
    setOpen(true);
  };

  const editar = item => {
    setEditingId(item.id);
    setNome(item.nome);
    setOpen(true);
  };

  const salvar = async e => {
    e.preventDefault();
    if (!user || !nome.trim()) return;
    setSaving(true);
    const payload = { nome: nome.trim(), user_id: user.id, updated_at: new Date().toISOString() };
    const result = editingId
      ? await supabase.from('comercial_tipos_despesas').update({ nome: payload.nome, updated_at: payload.updated_at }).eq('id', editingId).eq('user_id', user.id)
      : await supabase.from('comercial_tipos_despesas').insert(payload);

    if (result.error) {
      toast({ title: 'Não foi possível salvar', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tipo salvo', description: 'Cadastro atualizado com sucesso.' });
      setOpen(false);
      setNome('');
      setEditingId(null);
      await carregar();
    }
    setSaving(false);
  };

  const alternarAtivo = async item => {
    const { error } = await supabase.from('comercial_tipos_despesas')
      .update({ ativo: !item.ativo, updated_at: new Date().toISOString() })
      .eq('id', item.id).eq('user_id', user.id);
    if (error) toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    else {
      toast({ title: item.ativo ? 'Tipo desativado' : 'Tipo ativado' });
      carregar();
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--neon-comercial)/.3)', color: GREEN }}><Tags /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Cadastros</p>
          <h1 className="text-2xl font-bold text-white">Tipos de Despesas</h1>
          <p className="text-sm text-muted-foreground">Organize as categorias utilizadas nos lançamentos.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
        <Button onClick={novo} className="font-bold text-black" style={{ background: GREEN }}><Plus className="mr-2 h-4 w-4" />Novo Tipo</Button>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tipos cadastrados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{ color: GREEN }}>{tipos.length}</p></CardContent></Card>
      <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{tipos.filter(t => t.ativo).length}</p></CardContent></Card>
      <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{tipos.filter(t => !t.ativo).length}</p></CardContent></Card>
    </div>

    <Card className="border-border bg-card">
      <CardHeader><CardTitle style={{ color: GREEN }}>Tipos cadastrados</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[550px] text-sm">
          <thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground"><th className="p-4">Nome</th><th className="p-4">Situação</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> :
              tipos.length ? tipos.map(item => <tr key={item.id} className="border-b border-border">
                <td className="p-4 font-medium text-white">{item.nome}</td>
                <td className={`p-4 ${item.ativo ? 'text-emerald-400' : 'text-gray-500'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="p-4"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => editar(item)}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title={item.ativo ? 'Desativar' : 'Ativar'} onClick={() => alternarAtivo(item)}><Power className={`h-4 w-4 ${item.ativo ? 'text-emerald-400' : 'text-gray-500'}`} /></Button>
                </div></td>
              </tr>) : <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhum tipo cadastrado.</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>

    <ModalComercialPadrao open={open} onClose={() => setOpen(false)} title={editingId ? 'Editar Tipo de Despesa' : 'Novo Tipo de Despesa'} description="Informe o nome que será utilizado nos lançamentos." icon={Tags}
      footer={<><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" form="form-tipo-despesa" disabled={saving} className="font-bold text-black" style={{ background: GREEN }}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button></>}>
      <form id="form-tipo-despesa" onSubmit={salvar} className="space-y-4">
        <div className="space-y-2"><Label>Nome do tipo *</Label><Input required autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Aluguel, Energia, Água..." /></div>
      </form>
    </ModalComercialPadrao>
  </div>;
}
