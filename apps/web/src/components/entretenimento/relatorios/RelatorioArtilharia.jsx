import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';

const RelatorioArtilharia = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMounted = useIsMounted();

    const [artilharia, setArtilharia] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('ent_artilharia').select('*, jogador:ent_jogadores(nome_jogador), player:ent_players(nome_player)').eq('user_id', user.id);
            if (error) throw error;

            const grouped = {};
            (data || []).forEach(item => {
                const name = item.jogador?.nome_jogador || item.player?.nome_player || 'Desconhecido';
                if (!grouped[name]) grouped[name] = { name, gols: 0, entries: 0 };
                grouped[name].gols += item.gols;
                grouped[name].entries += 1;
            });
            const sorted = Object.values(grouped).sort((a, b) => b.gols - a.gols);
            withIsMountedCheck(() => setArtilharia(sorted), isMounted);
        } catch (error) {
            withIsMountedCheck(() => toast({ title: 'Erro ao buscar dados', variant: 'destructive', description: handleSupabaseError(error) }), isMounted);
        } finally {
            withIsMountedCheck(() => setLoading(false), isMounted);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="flex flex-col justify-between items-start">
                <h2 className="text-2xl md:text-3xl font-bold text-primary">Ranking de Artilharia</h2>
            </div>
            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-secondary/50"><th className="p-4 w-16 text-center text-muted-foreground">#</th><th className="p-4 text-left text-muted-foreground">Jogador</th><th className="p-4 text-center text-muted-foreground">Partidas/Registros</th><th className="p-4 text-right text-muted-foreground">Total de Gols</th></tr></thead>
                    <tbody>
                         {loading ? <tr><td colSpan="4" className="p-8 text-center">Carregando...</td></tr> : artilharia.length === 0 ? <tr><td colSpan="4" className="p-8 text-center"><Trophy className="mx-auto w-10 h-10 mb-2 opacity-50" />Nenhum dado encontrado.</td></tr> : artilharia.map((item, index) => (
                            <tr key={index} className="border-b border-border hover:bg-secondary/20 transition-colors"><td className="p-4 text-center">{index === 0 && <Medal className="w-5 h-5 text-primary inline" />}{index === 1 && <Medal className="w-5 h-5 text-gray-400 inline" />}{index === 2 && <Medal className="w-5 h-5 text-amber-700 inline" />}{index > 2 && <span className="text-muted-foreground">{index + 1}</span>}</td><td className="p-4 font-semibold">{item.name}</td><td className="p-4 text-center text-muted-foreground">{item.entries}</td><td className="p-4 text-right"><span className="bg-primary/20 text-primary font-bold px-3 py-1 rounded-full">{item.gols}</span></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};
export default RelatorioArtilharia;