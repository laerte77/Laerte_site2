import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Swords, Calendar, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';

const LancamentoPartidas = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useIsMounted();
    const [partidas, setPartidas] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [formData, setFormData] = useState({ data: '', mandante_id: '', gols_mandante: '', visitante_id: '', gols_visitante: '', vencedor_penaltis_id: '' });
    const [itemToDelete, setItemToDelete] = useState(null);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [partidasRes, playersRes] = await Promise.all([
                supabase.from('ent_partidas').select(`*, mandante:ent_players!mandante_id(nome_player), visitante:ent_players!visitante_id(nome_player), vencedor_penaltis:ent_players!vencedor_penaltis_id(nome_player)`).eq('user_id', user.id).order('data', { ascending: false }),
                supabase.from('ent_players').select('id, nome_player').eq('user_id', user.id).order('nome_player', { ascending: true })
            ]);
            withIsMountedCheck(() => { setPartidas(partidasRes.data || []); setPlayers(playersRes.data || []); }, isMounted);
        } catch (error) { withIsMountedCheck(() => toast({ title: 'Erro', variant: 'destructive' }), isMounted); } finally { withIsMountedCheck(() => setLoading(false), isMounted); }
    };

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('partidas_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'ent_partidas' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user]);

    const resetForm = () => { setFormData({ data: new Date().toISOString().split('T')[0], mandante_id: '', gols_mandante: '', visitante_id: '', gols_visitante: '', vencedor_penaltis_id: '' }); setCurrentItem(null); };

    const handleSave = async () => {
        if (!formData.data || !formData.mandante_id || !formData.visitante_id || formData.gols_mandante === '' || formData.gols_visitante === '') { toast({ title: 'Erro', description: 'Preencha os campos obrigatórios.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, gols_mandante: parseInt(formData.gols_mandante), gols_visitante: parseInt(formData.gols_visitante), vencedor_penaltis_id: formData.vencedor_penaltis_id || null, user_id: user.id };
        try {
            if (currentItem) { await supabase.from('ent_partidas').update(dataToSave).eq('id', currentItem.id); } else { await supabase.from('ent_partidas').insert(dataToSave); }
            withIsMountedCheck(() => { toast({ title: 'Sucesso', description: 'Salvo.' }); resetForm(); }, isMounted);
        } catch (error) { withIsMountedCheck(() => toast({ title: 'Erro', variant: 'destructive' }), isMounted); }
    };

    const openDialog = (item = null) => { if (item) { setCurrentItem(item); setFormData({ data: item.data || '', mandante_id: String(item.mandante_id || ''), gols_mandante: String(item.gols_mandante), visitante_id: String(item.visitante_id || ''), gols_visitante: String(item.gols_visitante), vencedor_penaltis_id: String(item.vencedor_penaltis_id || '') }); } else { resetForm(); } setIsDialogOpen(true); };

    const handleDelete = async () => { if (!itemToDelete) return; try { await supabase.from('ent_partidas').delete().eq('id', itemToDelete.id); withIsMountedCheck(() => { toast({ title: 'Removido' }); setItemToDelete(null); }, isMounted); } catch (error) { withIsMountedCheck(() => toast({ title: 'Erro', variant: 'destructive' }), isMounted); } };

    return (
        <React.Fragment>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"><div><h2 className="text-2xl md:text-3xl font-bold text-primary">Partidas Realizadas</h2></div><Button onClick={() => openDialog()} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nova Partida</Button></div>
                <div className="hidden md:block glass-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-center font-semibold text-muted-foreground">Mandante</th><th className="p-4 text-center font-semibold text-muted-foreground">Placar</th><th className="p-4 text-center font-semibold text-muted-foreground">Visitante</th><th className="p-4 text-center font-semibold text-muted-foreground">Obs.</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : partidas.length === 0 ? <tr><td colSpan="6" className="p-8 text-center">Nenhuma partida.</td></tr> : partidas.map((item) => (<tr key={item.id} className="border-b border-border hover:bg-secondary/20"><td className="p-4">{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4 text-center">{item.mandante?.nome_player}</td><td className="p-4 text-center font-bold text-lg"><span className="text-primary">{item.gols_mandante}</span> x <span className="text-primary">{item.gols_visitante}</span></td><td className="p-4 text-center">{item.visitante?.nome_player}</td><td className="p-4 text-center text-xs">{item.vencedor_penaltis && <span>(Pen: {item.vencedor_penaltis.nome_player})</span>}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Edit className="w-4 h-4 text-primary" /></Button><Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}><Trash className="w-4 h-4 text-destructive" /></Button></td></tr>))}</tbody></table></div></div>
            </motion.div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="dark-entretenimento bg-card border-border text-foreground w-[95%] max-w-lg"><DialogHeader><DialogTitle className="text-primary">{currentItem ? 'Editar' : 'Nova'} Partida</DialogTitle></DialogHeader><div className="py-4 space-y-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end"><div className="space-y-2"><Label>Mandante</Label><Select value={formData.mandante_id} onValueChange={v => setFormData({ ...formData, mandante_id: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome_player}</SelectItem>)}</SelectContent></Select><Input type="number" value={formData.gols_mandante} onChange={e => setFormData({ ...formData, gols_mandante: e.target.value })} className="bg-input text-center font-bold" /></div><div className="pb-4 font-bold">X</div><div className="space-y-2"><Label>Visitante</Label><Select value={formData.visitante_id} onValueChange={v => setFormData({ ...formData, visitante_id: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome_player}</SelectItem>)}</SelectContent></Select><Input type="number" value={formData.gols_visitante} onChange={e => setFormData({ ...formData, gols_visitante: e.target.value })} className="bg-input text-center font-bold" /></div></div>{formData.gols_mandante === formData.gols_visitante && formData.gols_mandante !== '' && (<div className="bg-primary/10 p-3"><Label className="text-primary mb-2 block">Vencedor nos Pênaltis</Label><Select value={formData.vencedor_penaltis_id} onValueChange={v => setFormData({ ...formData, vencedor_penaltis_id: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{players.filter(p => String(p.id) === formData.mandante_id || String(p.id) === formData.visitante_id).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome_player}</SelectItem>)}</SelectContent></Select></div>)}</div><DialogFooter><Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button><Button onClick={handleSave} className="bg-primary text-primary-foreground">Salvar</Button></DialogFooter></DialogContent>
            </Dialog>
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}><AlertDialogContent className="dark-entretenimento"><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </React.Fragment>
    );
};
export default LancamentoPartidas;