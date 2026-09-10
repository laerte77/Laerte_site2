import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';

const RelatorioConfrontos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMounted = useIsMounted();
  const [partidas, setPartidas] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', player: 'todos' });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const [partidasRes, playersRes] = await Promise.all([
          supabase.from('ent_partidas').select('*, mandante:mandante_id(nome_player), visitante:visitante_id(nome_player), vencedor:vencedor_penaltis_id(nome_player)').eq('user_id', user.id),
          supabase.from('ent_players').select('*').eq('user_id', user.id),
        ]);
        if (partidasRes.error) throw partidasRes.error;
        if (playersRes.error) throw playersRes.error;
        withIsMountedCheck(() => { setPartidas(partidasRes.data); setPlayers(playersRes.data); }, isMounted);
    } catch (error) {
        withIsMountedCheck(() => toast({ title: 'Erro ao buscar dados', description: handleSupabaseError(error), variant: 'destructive' }), isMounted);
    } finally {
        withIsMountedCheck(() => setLoading(false), isMounted);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const getPlayerName = (id) => players.find(p => String(p.id) === String(id))?.nome_player || 'N/A';

  const confrontosStats = useMemo(() => {
    const filteredPartidas = partidas.filter(p => {
        const dataPartida = new Date(p.data);
        const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
        const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
        if (dataInicio) dataInicio.setUTCHours(0,0,0,0);
        if (dataFim) dataFim.setUTCHours(23,59,59,999);

        if (dataInicio && dataPartida < dataInicio) return false;
        if (dataFim && dataPartida > dataFim) return false;
        if (filters.player !== 'todos' && String(p.mandante_id) !== filters.player && String(p.visitante_id) !== filters.player) return false;
        return true;
    });

    const stats = {};
    filteredPartidas.forEach(p => {
      const p1 = p.mandante_id;
      const p2 = p.visitante_id;
      const key = [p1, p2].sort().join('-');
      if (!stats[key]) {
        const player1_id = getPlayerName(p1) < getPlayerName(p2) ? p1 : p2;
        const player2_id = getPlayerName(p1) < getPlayerName(p2) ? p2 : p1;
        stats[key] = { player1: player1_id, player2: player2_id, vitorias1: 0, vitorias2: 0, golsFeitos1: 0, golsSofridos1: 0, golsFeitos2: 0, golsSofridos2: 0, partidas: 0 };
      }
      const stat = stats[key];
      stat.partidas++;
      const mandanteIsPlayer1 = String(p.mandante_id) === String(stat.player1);
      const golsMandante = p.gols_mandante;
      const golsVisitante = p.gols_visitante;
      if (mandanteIsPlayer1) { stat.golsFeitos1 += golsMandante; stat.golsSofridos1 += golsVisitante; stat.golsFeitos2 += golsVisitante; stat.golsSofridos2 += golsMandante; } else { stat.golsFeitos1 += golsVisitante; stat.golsSofridos1 += golsMandante; stat.golsFeitos2 += golsMandante; stat.golsSofridos2 += golsVisitante; }
      if (golsMandante > golsVisitante) { mandanteIsPlayer1 ? stat.vitorias1++ : stat.vitorias2++; } else if (golsVisitante > golsMandante) { mandanteIsPlayer1 ? stat.vitorias2++ : stat.vitorias1++; } else { if (String(p.vencedor_penaltis_id) === String(p.mandante_id)) { mandanteIsPlayer1 ? stat.vitorias1++ : stat.vitorias2++; } else if (String(p.vencedor_penaltis_id) === String(p.visitante_id)) { mandanteIsPlayer1 ? stat.vitorias2++ : stat.vitorias1++; } }
    });
    return Object.values(stats);
  }, [partidas, filters, players]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-start">
        <div><h2 className="text-3xl font-bold text-primary">Relatório de Confrontos</h2></div>
      </div>
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div><Label>Data Inicial</Label><Input type="date" value={filters.dataInicio} onChange={e => setFilters({...filters, dataInicio: e.target.value})} className="bg-input" /></div>
          <div><Label>Data Final</Label><Input type="date" value={filters.dataFim} onChange={e => setFilters({...filters, dataFim: e.target.value})} className="bg-input" /></div>
          <div><Label>Filtrar por Player</Label><Select value={filters.player} onValueChange={(v) => setFilters({ ...filters, player: v })}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent className="dark-entretenimento bg-card border-border"><SelectItem value="todos">Todos os Players</SelectItem>{players.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nome_player}</SelectItem>)}</SelectContent></Select></div>
        </div>
      </div>
      {loading ? <div className="text-center p-8">Carregando...</div> : confrontosStats.length === 0 ? <div className="text-center p-8"><FileSearch className="mx-auto w-12 h-12 text-muted-foreground" /><p className="text-muted-foreground mt-2">Nenhum confronto.</p></div> : (
        <div className="space-y-4">
          {confrontosStats.map((stat, index) => (
            <div key={index} className="glass-card p-6 border-l-4 border-l-primary">
              <h3 className="text-xl font-bold text-primary mb-4">{getPlayerName(stat.player1)} vs {getPlayerName(stat.player2)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div><p className="font-semibold text-lg text-foreground">{getPlayerName(stat.player1)}</p><p className="text-muted-foreground mt-1">Vitórias: <span className="text-green-500 font-bold">{stat.vitorias1}</span></p><p className="text-muted-foreground">Derrotas: <span className="text-red-500 font-bold">{stat.vitorias2}</span></p><p className="text-muted-foreground">Saldo de Gols: <span className="text-foreground font-bold">{stat.golsFeitos1 - stat.golsSofridos1}</span></p></div>
                <div><p className="font-semibold text-lg text-foreground">{getPlayerName(stat.player2)}</p><p className="text-muted-foreground mt-1">Vitórias: <span className="text-green-500 font-bold">{stat.vitorias2}</span></p><p className="text-muted-foreground">Derrotas: <span className="text-red-500 font-bold">{stat.vitorias1}</span></p><p className="text-muted-foreground">Saldo de Gols: <span className="text-foreground font-bold">{stat.golsFeitos2 - stat.golsSofridos2}</span></p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
export default RelatorioConfrontos;