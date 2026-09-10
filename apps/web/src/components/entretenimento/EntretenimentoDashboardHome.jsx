import React, { useState, useEffect } from 'react';
import { Gamepad2, Target, Users, Wallet, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAccessibleDataQuery } from '@/lib/dataAccessUtils';
import KPICard from '@/components/ui/KPICard';
import NeonBorder from '@/components/ui/NeonBorder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';

export default function EntretenimentoDashboardHome() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    players: 0, partidas: 0, gols: 0, contribuicoes: 0, rankings: []
  });

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const [playersRes, partidasRes, contribRes] = await Promise.all([
          getAccessibleDataQuery(user.id, isAdmin, 'ent_players', 'id, nome_player'),
          getAccessibleDataQuery(user.id, isAdmin, 'ent_partidas', 'mandante_id, gols_mandante, visitante_id, gols_visitante'),
          getAccessibleDataQuery(user.id, isAdmin, 'ent_contribuicoes', 'valor')
        ]);

        const players = playersRes.data || [];
        const partidas = partidasRes.data || [];
        const contribuicoesTotal = (contribRes.data || []).reduce((a,b) => a + Number(b.valor), 0);

        let totalGols = 0;
        const stats = {};
        players.forEach(p => stats[p.id] = { nome: p.nome_player, jogos: 0, gols: 0 });

        partidas.forEach(p => {
          totalGols += (p.gols_mandante || 0) + (p.gols_visitante || 0);
          if (stats[p.mandante_id]) {
            stats[p.mandante_id].jogos += 1;
            stats[p.mandante_id].gols += (p.gols_mandante || 0);
          }
          if (stats[p.visitante_id]) {
            stats[p.visitante_id].jogos += 1;
            stats[p.visitante_id].gols += (p.gols_visitante || 0);
          }
        });

        const rankings = Object.values(stats).sort((a,b) => b.gols - a.gols).slice(0, 10);

        setData({
          players: players.length,
          partidas: partidas.length,
          gols: totalGols,
          contribuicoes: contribuicoesTotal,
          rankings
        });
      } catch (err) {} finally { setLoading(false); }
    };
    fetch();
  }, [user, isAdmin]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Entretenimento...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto pb-10">
      
      <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--neon-entretenimento))]/10 flex items-center justify-center glow-entretenimento">
              <Gamepad2 className="w-6 h-6 text-[hsl(var(--neon-entretenimento))]" />
          </div>
          <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--neon-entretenimento))] to-orange-300 tracking-tight">
                  Estatísticas do Entretenimento
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">Visão Geral e Rankings</p>
          </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="h-full"><KPICard colorScheme="entretenimento" icon={Users} label="Total de Players" value={data.players} /></motion.div>
        <motion.div variants={itemVariants} className="h-full"><KPICard colorScheme="entretenimento" icon={Gamepad2} label="Total de Partidas" value={data.partidas} /></motion.div>
        <motion.div variants={itemVariants} className="h-full"><KPICard colorScheme="entretenimento" icon={Target} label="Total de Gols" value={data.gols} /></motion.div>
        <motion.div variants={itemVariants} className="h-full"><KPICard colorScheme="entretenimento" icon={Wallet} label="Contribuições" value={data.contribuicoes} isCurrency={true} /></motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="pt-4">
          <motion.div variants={itemVariants}>
              <NeonBorder neonColor="entretenimento" className="overflow-hidden">
                <div className="p-6 border-b border-border/40">
                    <h3 className="text-xl font-semibold text-[hsl(var(--neon-entretenimento))] flex items-center gap-2">
                        <Trophy className="w-5 h-5" /> Ranking de Players
                    </h3>
                </div>
                <div className="w-full overflow-x-auto p-4">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[hsl(var(--neon-entretenimento))] font-bold">Posição</TableHead>
                        <TableHead className="text-[hsl(var(--neon-entretenimento))] font-bold">Nome do Jogador</TableHead>
                        <TableHead className="text-center text-[hsl(var(--neon-entretenimento))] font-bold">Partidas Jogadas</TableHead>
                        <TableHead className="text-right text-[hsl(var(--neon-entretenimento))] font-bold">Gols Marcados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rankings.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-muted-foreground">#{i + 1}</TableCell>
                          <TableCell className="font-semibold text-foreground">{p.nome}</TableCell>
                          <TableCell className="text-center font-medium">{p.jogos}</TableCell>
                          <TableCell className="text-right font-bold text-[hsl(var(--neon-entretenimento))] text-lg">{p.gols}</TableCell>
                        </TableRow>
                      ))}
                      {data.rankings.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum jogador registrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </NeonBorder>
          </motion.div>
      </motion.div>
    </motion.div>
  );
}