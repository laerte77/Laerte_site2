import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Loader2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const LancamentoDebitos = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [clientes, setClientes] = useState([]);
    const [tiposCorte, setTiposCorte] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [barbeiros, setBarbeiros] = useState([]);
    const [lancamentos, setLancamentos] = useState([]);

    const [formData, setFormData] = useState({ data: new Date().toISOString().split('T')[0], tipo_corte_id: '', cliente_id: '', tem_servico: false, servico_id: '', valor: '', barbeiro_id: '' });

    const fetchData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [resClientes, resCortes, resServicos, resBarbeiros, resLancamentos] = await Promise.all([
                supabase.from('barbearia_clientes').select('id, nome').eq('user_id', user.id).order('nome'),
                supabase.from('barbearia_tipos_corte').select('id, nome').eq('user_id', user.id).order('nome'),
                supabase.from('barbearia_servicos').select('id, nome').eq('user_id', user.id).order('nome'),
                supabase.from('barbearia_barbeiros').select('id, nome').eq('user_id', user.id).order('nome'),
                supabase.from('barbearia_lancamentos_debitos').select('*, barbearia_clientes(nome), barbearia_tipos_corte(nome), barbearia_barbeiros(nome)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
            ]);
            setClientes(resClientes.data || []); setTiposCorte(resCortes.data || []); setServicos(resServicos.data || []); setBarbeiros(resBarbeiros.data || []); setLancamentos(resLancamentos.data || []);
        } catch (error) { console.error(error); } finally { setLoadingData(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    const handleSave = async () => {
        if (!formData.data || !formData.tipo_corte_id || !formData.cliente_id || !formData.valor || !formData.barbeiro_id) { toast({ title: 'Atenção', description: 'Preencha todos os campos.', variant: 'destructive' }); return; }
        setSaving(true);
        const payload = { ...formData, valor: parseFloat(formData.valor)||0, servico_id: formData.tem_servico?formData.servico_id:null, user_id: user.id, status: 'devendo' };
        try {
            await supabase.from('barbearia_lancamentos_debitos').insert(payload);
            toast({ title: 'Sucesso', description: 'Débito lançado!' }); 
            setFormData({...formData, cliente_id: '', tipo_corte_id: '', valor: '', tem_servico: false, servico_id: ''});
            fetchData();
        } catch (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } 
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        await supabase.from('barbearia_lancamentos_debitos').delete().eq('id', id);
        fetchData(); toast({ title: 'Excluído' });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center bg-gray-900/50 p-6 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/5">
                <div>
                    <h2 className="text-3xl font-bold text-red-400 uppercase">Lançamento de Débitos</h2>
                    <p className="text-[#A9A9A9] mt-1">Registre cortes realizados não pagos (Fiado).</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-bold h-12 px-6 shadow-lg shadow-red-500/20">
                    <Plus className="w-5 h-5 mr-2" /> Novo Fiado
                </Button>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-900 border-red-500/50 text-white sm:max-w-[500px]">
                    <DialogHeader><DialogTitle className="text-2xl text-red-400 flex items-center gap-2"><CreditCard className="w-6 h-6"/> Lançar Débito</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-[#A9A9A9]">Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData({...formData, data:e.target.value})} className="bg-black border-red-500/30 text-white mt-1" /></div>
                            <div><Label className="text-[#A9A9A9]">Valor Total (R$) *</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData({...formData, valor:e.target.value})} className="bg-black border-red-500/30 text-white mt-1" /></div>
                        </div>
                        <div><Label className="text-[#A9A9A9]">Cliente *</Label><select value={formData.cliente_id} onChange={e=>setFormData({...formData, cliente_id:e.target.value})} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md mt-1"><option value="">Selecione...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                        <div><Label className="text-[#A9A9A9]">Barbeiro *</Label><select value={formData.barbeiro_id} onChange={e=>setFormData({...formData, barbeiro_id:e.target.value})} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md mt-1"><option value="">Selecione...</option>{barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></div>
                        <div><Label className="text-[#A9A9A9]">Tipo de Corte *</Label><select value={formData.tipo_corte_id} onChange={e=>setFormData({...formData, tipo_corte_id:e.target.value})} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md mt-1"><option value="">Selecione...</option>{tiposCorte.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                        <div className="flex items-center justify-between bg-black/50 p-3 rounded-lg border border-red-500/20"><Label className="text-white cursor-pointer font-medium" htmlFor="tem-servico-deb">Adicionar Serviço Extra?</Label><Switch id="tem-servico-deb" checked={formData.tem_servico} onCheckedChange={c => setFormData({...formData, tem_servico:c})} /></div>
                        {formData.tem_servico && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2"><Label className="text-[#A9A9A9]">Serviço Adicional *</Label><select value={formData.servico_id} onChange={e=>setFormData({...formData, servico_id:e.target.value})} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md mt-1"><option value="">Selecione...</option>{servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></motion.div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 mt-4"><Button variant="outline" onClick={()=>setIsDialogOpen(false)} className="border-red-500/50 text-[#A9A9A9] hover:text-white">Cancelar</Button><Button onClick={handleSave} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white font-bold flex-1">{saving?<Loader2 className="animate-spin w-4 h-4"/>:"Registrar"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="bg-gray-900/80 border border-red-500/30 rounded-xl overflow-hidden mt-6 shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-red-500/20 bg-black/50"><th className="p-4 text-red-400">Data</th><th className="p-4 text-red-400">Cliente</th><th className="p-4 text-red-400">Corte</th><th className="p-4 text-red-400">Barbeiro</th><th className="p-4 text-red-400">Valor</th><th className="p-4 text-red-400">Status</th><th className="p-4 text-right text-red-400">Ação</th></tr></thead>
                    <tbody>
                        {loadingData ? <tr><td colSpan="7" className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-400" /></td></tr> : lancamentos.length===0 ? <tr><td colSpan="7" className="p-4 text-center text-[#A9A9A9]">Nenhum lançamento.</td></tr> : lancamentos.map(item => (
                            <tr key={item.id} className="border-b border-red-500/10 hover:bg-white/5"><td className="p-4 text-[#A9A9A9]">{new Date(item.data).toLocaleDateString('pt-BR')}</td><td className="p-4 text-white font-medium">{item.barbearia_clientes?.nome}</td><td className="p-4 text-[#A9A9A9]">{item.barbearia_tipos_corte?.nome}</td><td className="p-4 text-[#A9A9A9]">{item.barbearia_barbeiros?.nome}</td><td className="p-4 text-red-400 font-bold">R$ {Number(item.valor).toFixed(2)}</td><td className="p-4 text-red-500 uppercase text-xs font-bold">{item.status}</td><td className="p-4 text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500 hover:text-red-400"/></Button></AlertDialogTrigger><AlertDialogContent className="bg-gray-900 border-[#D4AF37]/50"><AlertDialogHeader><AlertDialogTitle className="text-white">Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-transparent text-white border-white/20">Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDelete(item.id)} className="bg-red-600 text-white">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};
export default LancamentoDebitos;