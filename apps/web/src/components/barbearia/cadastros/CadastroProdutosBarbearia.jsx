import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroProdutosBarbearia = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ nome: '', descricao: '', preco: '', estoque: '0' });

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: res } = await supabase.from('barbearia_produtos').select('*').eq('user_id', user.id).order('nome');
            setData(res || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [user]);

    const handleSave = async () => {
        if (!formData.nome) { toast({ title: 'Atenção', description: 'Nome obrigatório', variant: 'destructive' }); return; }
        setSaving(true);
        const payload = { nome: formData.nome, descricao: formData.descricao, preco: parseFloat(formData.preco)||0, estoque: parseInt(formData.estoque)||0, user_id: user.id };
        try {
            if (currentItem) await supabase.from('barbearia_produtos').update(payload).eq('id', currentItem.id);
            else await supabase.from('barbearia_produtos').insert(payload);
            toast({ title: 'Sucesso', description: 'Produto salvo.' }); 
            fetchData(); 
            setFormData({nome:'', descricao:'', preco:'', estoque:'0'}); 
            setCurrentItem(null);
        } catch (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } 
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        await supabase.from('barbearia_produtos').delete().eq('id', id);
        fetchData();
        toast({ title: 'Removido' });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-[#D4AF37] uppercase">Produtos</h2>
                <Button onClick={() => { setCurrentItem(null); setFormData({nome:'', descricao:'', preco:'', estoque:'0'}); setIsDialogOpen(true); }} className="bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold"><Plus className="w-4 h-4 mr-2" /> Novo Produto</Button>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-900 border-[#D4AF37]/50 text-white">
                    <DialogHeader><DialogTitle className="text-[#D4AF37]">{currentItem ? 'Editar' : 'Novo'} Produto</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label className="text-[#A9A9A9]">Nome do Produto *</Label><Input value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} className="bg-black border-[#D4AF37]/30 text-white" /></div>
                        <div><Label className="text-[#A9A9A9]">Descrição</Label><Input value={formData.descricao} onChange={e=>setFormData({...formData, descricao:e.target.value})} className="bg-black border-[#D4AF37]/30 text-white" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label className="text-[#A9A9A9]">Preço (R$)</Label><Input type="number" step="0.01" value={formData.preco} onChange={e=>setFormData({...formData, preco:e.target.value})} className="bg-black border-[#D4AF37]/30 text-white" /></div>
                            <div><Label className="text-[#A9A9A9]">Estoque Inicial</Label><Input type="number" value={formData.estoque} onChange={e=>setFormData({...formData, estoque:e.target.value})} className="bg-black border-[#D4AF37]/30 text-white" /></div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={()=>setIsDialogOpen(false)} disabled={saving} className="border-[#D4AF37]/50 text-[#A9A9A9] hover:text-white">Cancelar</Button><Button onClick={handleSave} disabled={saving} className="bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold">{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="bg-gray-900/80 border border-[#D4AF37]/30 rounded-xl overflow-hidden mt-6">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-[#D4AF37]/20 bg-black/50"><th className="p-4 text-[#D4AF37]">Nome</th><th className="p-4 text-[#D4AF37]">Preço</th><th className="p-4 text-[#D4AF37]">Estoque</th><th className="p-4 text-right text-[#D4AF37]">Ações</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan="4" className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37]" /></td></tr> : data.map(item => (
                            <tr key={item.id} className="border-b border-[#D4AF37]/10 hover:bg-white/5"><td className="p-4 text-white">{item.nome}</td><td className="p-4 text-[#D4AF37]">R$ {parseFloat(item.preco||0).toFixed(2)}</td><td className="p-4 text-[#A9A9A9]">{item.estoque} un</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={()=>{setCurrentItem(item); setFormData({nome:item.nome, descricao:item.descricao||'', preco:item.preco||'', estoque:item.estoque||'0'}); setIsDialogOpen(true);}}><Edit className="w-4 h-4 text-[#D4AF37]"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500 hover:text-red-400"/></Button></AlertDialogTrigger><AlertDialogContent className="bg-gray-900 border-[#D4AF37]/50"><AlertDialogHeader><AlertDialogTitle className="text-white">Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-transparent text-white border-white/20">Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDelete(item.id)} className="bg-red-600 text-white">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};
export default CadastroProdutosBarbearia;