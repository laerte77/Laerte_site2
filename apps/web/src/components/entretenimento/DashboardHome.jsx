import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Users, Trophy, Target, TrendingUp, CalendarDays, Wallet, Receipt, UserCheck, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { handleSupabaseError, useIsMounted, withIsMountedCheck } from '@/lib/errorHandlingUtils';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const StatCard = ({ title, value, icon: Icon, valueClass }) => (
  <Card className="glass-card relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10"><Icon className="w-16 h-16 text-primary" /></div>
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
    <CardContent><div className={`text-3xl font-bold ${valueClass || 'text-foreground'}`}>{value}</div></CardContent>
  </Card>
);

const DashboardHome = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('efootbal'); // 'efootbal' or 'pelada'
  
  // eFootbal Stats
  const [efStats, setEfStats] = useState({ totalPartidas: 0, totalGols: 0, mediaGols: '0.0', totalPlayers: 0, recentMatches: [] });
  // Pelada Stats
  const [plStats, setPlStats] = useState({ totalContribuicoes: 0, totalDespesas: 0, saldoCaixa: 0, totalParticipantesAtivos: 0, topContribuidores: [] });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const fetchEFootbalData = async () => {
    try {
      const [partidasRes, playersRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'ent_partidas', '*, mandante:ent_players!mandante_id(nome_player), visitante:ent_players!visitante_id(nome_player)').order('data', { ascending: false }),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_players', 'id').select('id', { count: 'exact' })
      ]);
      const partidas = partidasRes.data || [];
      const totalGols = partidas.reduce((acc, curr) => acc + (curr.gols_mandante || 0) + (curr.gols_visitante || 0), 0);
      
      withIsMountedCheck(() => {
        setEfStats({
          totalPartidas: partidas.length, totalGols, 
          mediaGols: partidas.length > 0 ? (totalGols / partidas.length).toFixed(1) : '0.0', 
          totalPlayers: playersRes.count || 0, recentMatches: partidas.slice(0, 5)
        });
      }, isMounted);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPeladaData = async () => {
    try {
      const [contribRes, despRes] = await Promise.all([
        getAccessibleDataQuery(user.id, isAdmin, 'ent_contribuicoes', '*, contribuinte:ent_participantes(nome)'),
        getAccessibleDataQuery(user.id, isAdmin, 'ent_despesas_lancamentos', 'valor')
      ]);
      
      const contribuicoes = contribRes.data || [];
      const despesas = despRes.data || [];
      
      const totalContribuicoes = contribuicoes.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
      const totalDespesas = despesas.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
      const saldoCaixa = totalContribuicoes - totalDespesas;
      
      const participantesAtivos = new Set(contribuicoes.map(c => c.contribuinte_id)).size;
      
      const contribMap = {};
      contribuicoes.forEach(c => {
        const nome = c.contribuinte?.nome || 'Desconhecido';
        contribMap[nome] = (contribMap[nome] || 0) + parseFloat(c.valor || 0);
      });
      const topContribuidores = Object.entries(contribMap)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nome, valor]) => ({ nome, valor }));

      withIsMountedCheck(() => {
        setPlStats({
          totalContribuicoes, totalDespesas, saldoCaixa, totalParticipantesAtivos: participantesAtivos, topContribuidores
        });
      }, isMounted);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    if (category === 'efootbal') await fetchEFootbalData();
    else await fetchPeladaData();
    withIsMountedCheck(() => setLoading(false), isMounted);
  };

  useEffect(() => { fetchData(); }, [user, category]);

  if (loading) return <div className="flex h-96 items-center justify-center">Carregando estatísticas...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Visão Geral</h1>
        <ToggleGroup type="single" value={category} onValueChange={(v) => { if(v) setCategory(v); }} className="bg-card border border-border/50 rounded-lg p-1">
          <ToggleGroupItem value="efootbal" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Gamepad2 className="w-4 h-4 mr-2" /> eFootbal</ToggleGroupItem>
          <ToggleGroupItem value="pelada" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Trophy className="w-4 h-4 mr-2" /> Pelada</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {category === 'efootbal' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total de Partidas" value={efStats.totalPartidas} icon={Gamepad2} />
            <StatCard title="Gols Marcados" value={efStats.totalGols} icon={Target} />
            <StatCard title="Média de Gols" value={efStats.mediaGols} icon={TrendingUp} />
            <StatCard title="Players Ativos" value={efStats.totalPlayers} icon={Users} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card h-full">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Últimas Partidas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {efStats.recentMatches.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nenhuma partida registrada.</div> : efStats.recentMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                      <div className="flex-1"><span className="text-sm font-medium">{match.mandante?.nome_player}</span></div>
                      <div className="px-4 font-bold text-primary">{match.gols_mandante} x {match.gols_visitante}</div>
                      <div className="flex-1 text-right"><span className="text-sm font-medium">{match.visitante?.nome_player}</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Saldo em Caixa" value={formatCurrency(plStats.saldoCaixa)} icon={Wallet} valueClass={plStats.saldoCaixa >= 0 ? 'text-green-500' : 'text-red-500'} />
            <StatCard title="Total Contribuições" value={formatCurrency(plStats.totalContribuicoes)} icon={DollarSign} valueClass="text-green-500" />
            <StatCard title="Total Despesas" value={formatCurrency(plStats.totalDespesas)} icon={Receipt} valueClass="text-red-500" />
            <StatCard title="Participantes (Contrib.)" value={plStats.totalParticipantesAtivos} icon={UserCheck} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card h-full">
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Top 5 Contribuidores</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plStats.topContribuidores.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nenhuma contribuição registrada.</div> : plStats.topContribuidores.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground w-4">{i+1}.</span>
                        <span className="text-sm font-medium">{c.nome}</span>
                      </div>
                      <div className="font-bold text-green-500">{formatCurrency(c.valor)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  );
};
export default DashboardHome;