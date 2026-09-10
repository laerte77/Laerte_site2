import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, UserX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SearchableModal from '@/components/SearchableModal';
import { Badge } from '@/components/ui/badge';

const LancamentoClientesDebito = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useRef(true);
    const [debitos, setDebitos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [currentDebito, setCurrentDebito] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    const initialFormState = { data: new Date().toISOString().split('T')[0], cliente: '', servico: '', valor: '', status: 'DEVENDO' };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [debitosRes, clientesRes, servicosRes] = await Promise.all([
                supabase.from('lm_clientes_debito').select('*').eq('user_id', user.id).order('data', { ascending: false }),
                supabase.from('lm_clientes').select('nome').eq('user_id', user.id).order('nome', { ascending: true }),
                supabase.from('lm_servicos').select('servico').eq('user_id', user.id).order('servico', { ascending: true }),
            ]);
            if (isMounted.current) { setDebitos(debitosRes.data || []); setClientes(clientesRes.data || []); setServicos(servicosRes.data || []); }
        } catch (error) { if (isMounted.current) toast({ title: 'Erro', variant: 'destructive', description: error.message }); } finally { if (isMounted.current) setLoading(false); }
    }, [user, toast]);

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('lm_clientes_debito_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'lm_clientes_debito' }, () => { if(isMounted.current) fetchData() }).subscribe(); return () => supabase.removeChannel(channel); }, [user, fetchData]);

    const resetForm = () => { setFormData(initialFormState); setCurrentDebito(null); };

    const handleSave = async () => {
        if (!formData.data || !formData.cliente || !formData.valor || !formData.servico) { toast({ title: 'Erro', description: 'Preencha todos.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, valor: Number(formData.valor) };
        try {
            if (currentDebito) await supabase.from('lm_clientes_debito').update(dataToSave).eq('id', currentDebito.id);
            else await supabase.from('lm_clientes_debito').insert(dataToSave);
            toast({ title: 'Sucesso', description: `Débito ${currentDebito ? 'atualizado' : 'registrado'}.` });
            resetForm();
            setIsDialogOpen(false);
        } catch (error) { toast({ title: 'Erro', variant: 'destructive', description: error.message }); }
    };

    const openDialog = (debito = null) => {
        if(debito) { setCurrentDebito(debito); setFormData({ data: debito.data || new Date().toISOString().split('T')[0], cliente: debito.cliente || '', servico: debito.servico || '', valor: debito.valor || '', status: debito.status || 'DEVENDO', }); } else { resetForm(); }
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try { await supabase.from('lm_clientes_debito').delete().eq('id', itemToDelete.id); toast({ title: 'Removido' }); setItemToDelete(null); } catch (error) { toast({ title: 'Erro', variant: 'destructive' }); }
    };

    const getStatusBadge = (status) => {
        switch (status) { case 'PAGO': return <Badge className="bg-green-500">Pago</Badge>; case 'DEVENDO': return <Badge variant="destructive">Devendo</Badge>; case 'PARCIAL': return <Badge className="bg-yellow-500">Parcial</Badge>; default: return <Badge variant="outline">{status}</Badge>; }
    };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between"><div><h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">Clientes com Débito</h2></div><div className="flex gap-2"><Button onClick={() => setIsSearchModalOpen(true)} variant="outline" className="text-cyan-400 border-cyan-400"><Search className="w-4 h-4 mr-2" />Selecionar</Button><Button onClick={() => openDialog()} className="bg-cyan-500 text-white"><Plus className="w-4 h-4 mr-2" /> Novo Débito</Button></div></div>
                <div className="bg-card/80 border border-border rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Cliente</th><th className="p-4 text-left font-semibold text-muted-foreground">Serviço</th><th className="p-4 text-left font-semibold text-muted-foreground">Status</th><th className="p-4 text-right font-semibold text-muted-foreground">Valor</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead>
                            <tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : debitos.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Nenhum débito.</td></tr> : debitos.map((debito) => (<tr key={debito.id} className="border-b border-border hover:bg-blue-500/10"><td className="p-4">{new Date(debito.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4">{debito.cliente}</td><td className="p-4">{debito.servico}</td><td className="p-4">{getStatusBadge(debito.status)}</td><td className="p-4 text-cyan-400 font-semibold text-right">R$ {parseFloat(debito.valor).toFixed(2)}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(debito)}><Edit className="w-4 h-4 text-cyan-400" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(debito)}><Trash className="w-4 h-4 text-red-500" /></Button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
            <SearchableModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelect={i => openDialog(i)} tableName="lm_clientes_debito" searchField="cliente" displayFields={[{ key: 'data', label: 'Data', format: (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }, { key: 'cliente', label: 'Cliente' }, { key: 'valor', label: 'Valor', format: (v) => `R$ ${parseFloat(v).toFixed(2)}` }]} title="Buscar Débito" />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-lg bg-card border-border text-foreground">
                    <DialogHeader><DialogTitle className="text-cyan-400">{currentDebito ? 'Editar' : 'Registrar'} Débito</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Valor</Label><Input type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} className="bg-input" /></div></div>
                        <div><Label>Cliente</Label><Select value={formData.cliente} onValueChange={(v) => setFormData({ ...formData, cliente: v })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><ScrollArea className="h-48">{clientes.map(c => <SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
                        <div><Label>Serviço</Label><Select value={formData.servico} onValueChange={(v) => setFormData({ ...formData, servico: v })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><ScrollArea className="h-48">{servicos.map(s => <SelectItem key={s.servico} value={s.servico}>{s.servico}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
                        <div><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem></SelectContent></Select></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button><Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white">Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="bg-card border-border"><AlertDialogHeader><AlertDialogTitle className="text-cyan-400">Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};

export default LancamentoClientesDebito;