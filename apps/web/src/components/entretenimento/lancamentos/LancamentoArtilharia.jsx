import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Goal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';

const LancamentoArtilharia = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useIsMounted();
    const [artilharia, setArtilharia] = useState([]);
    const [jogadores, setJogadores] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentGol, setCurrentGol] = useState(null);
    const initialFormState = { data: new Date().toISOString().split('T')[0], jogador_id: '', player_id: '', confronto: '', gols: 1 };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [artilhariaRes, jogadoresRes, playersRes] = await Promise.all([
                supabase.from('ent_artilharia').select('*, ent_jogadores(nome_jogador), ent_players(nome_player)').eq('user_id', user.id).order('data', { ascending: false }),
                supabase.from('ent_jogadores').select('*').eq('user_id', user.id).order('nome_jogador'),
                supabase.from('ent_players').select('*').eq('user_id', user.id).order('nome_player')
            ]);
            withIsMountedCheck(() => { setArtilharia(artilhariaRes.data || []); setJogadores(jogadoresRes.data || []); setPlayers(playersRes.data || []); }, isMounted);
        } catch (error) { withIsMountedCheck(() => toast({ title: "Erro", variant: 'destructive' }), isMounted); } finally { withIsMountedCheck(() => setLoading(false), isMounted); }
    };

    useEffect(() => { fetchData(); if (!user) return; const channel = supabase.channel('ent_artilharia_realtime_v2').on('postgres_changes', { event: '*', schema: 'public', table: 'ent_artilharia' }, fetchData).subscribe(); return () => supabase.removeChannel(channel); }, [user]);

    const resetForm = () => { setFormData(initialFormState); setCurrentGol(null); };

    const handleSave = async () => {
        if (!formData.data || !formData.jogador_id || !formData.player_id || !formData.confronto || formData.gols < 1) { toast({ title: 'Erro', description: 'Preencha os campos.', variant: 'destructive' }); return; }
        const dataToSave = { ...formData, user_id: user.id, gols: Number(formData.gols) };
        try {
            if (currentGol) await supabase.from('ent_artilharia').update(dataToSave).eq('id', currentGol.id);
            else await supabase.from('ent_artilharia').insert(dataToSave);
            withIsMountedCheck(() => { toast({ title: 'Sucesso', description: 'Salvo.' }); resetForm(); }, isMounted);
        } catch (error) { withIsMountedCheck(() => toast({ title: 'Erro', variant: 'destructive' }), isMounted); }
    };

    const openDialog = (gol = null) => { if (gol) { setCurrentGol(gol); setFormData({ data: gol.data || '', jogador_id: gol.jogador_id || '', player_id: gol.player_id || '', confronto: gol.confronto || '', gols: gol.gols || 1 }); } else { resetForm(); } setIsDialogOpen(true); };
    const closeDialog = () => { setIsDialogOpen(false); resetForm(); };
    const handleDelete = async (id) => { try { await supabase.from('ent_artilharia').delete().eq('id', id); withIsMountedCheck(() => toast({ title: 'Sucesso', description: 'Removido.' }), isMounted); } catch (error) { withIsMountedCheck(() => toast({ title: 'Erro', variant: 'destructive' }), isMounted); } };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"><div><h2 className="text-3xl font-bold text-primary">Lançamento de Artilharia</h2></div><Button onClick={() => openDialog()} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Novo Registro</Button></div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="dark-entretenimento sm:max-w-lg bg-card border-border"><DialogHeader><DialogTitle className="text-primary">{currentGol ? 'Editar' : 'Registrar'} Gols</DialogTitle></DialogHeader><div className="py-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} className="bg-input" /></div><div><Label>Nº de Gols</Label><Input type="number" min="1" value={formData.gols} onChange={e => setFormData({ ...formData, gols: e.target.value })} className="bg-input" /></div></div><div><Label>Jogador</Label><Select value={String(formData.jogador_id || '')} onValueChange={v => setFormData({ ...formData, jogador_id: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card"><ScrollArea className="h-48">{jogadores.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.nome_jogador}</SelectItem>)}</ScrollArea></SelectContent></Select></div><div><Label>Player (Time)</Label><Select value={String(formData.player_id || '')} onValueChange={v => setFormData({ ...formData, player_id: v })}><SelectTrigger className="bg-input"><SelectValue /></SelectTrigger><SelectContent className="bg-card">{players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome_player}</SelectItem>)}</SelectContent></Select></div><div><Label>Confronto</Label><Input value={formData.confronto} onChange={e => setFormData({ ...formData, confronto: e.target.value })} className="bg-input"/></div></div><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={handleSave} className="bg-primary text-primary-foreground">Salvar</Button></DialogFooter></DialogContent>
            </Dialog>
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 text-left font-semibold text-muted-foreground">Data</th><th className="p-4 text-left font-semibold text-muted-foreground">Jogador</th><th className="p-4 text-left font-semibold text-muted-foreground">Time</th><th className="p-4 text-left font-semibold text-muted-foreground">Confronto</th><th className="p-4 text-center font-semibold text-muted-foreground">Gols</th><th className="p-4 text-right font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr> : artilharia.length === 0 ? <tr><td colSpan="6" className="p-8 text-center">Nenhum registro.</td></tr> : artilharia.map(gol => (<tr key={gol.id} className="border-b border-border hover:bg-secondary/20"><td className="p-4">{new Date(gol.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td className="p-4 font-semibold">{gol.ent_jogadores?.nome_jogador || 'N/A'}</td><td className="p-4">{gol.ent_players?.nome_player || 'N/A'}</td><td className="p-4">{gol.confronto}</td><td className="p-4 font-bold text-center text-primary">{gol.gols}</td><td className="p-4 flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => openDialog(gol)}><Edit className="w-4 h-4 text-primary" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent className="dark-entretenimento"><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(gol.id)} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>))}</tbody></table></div></div>
        </motion.div>
    );
};
export default LancamentoArtilharia;