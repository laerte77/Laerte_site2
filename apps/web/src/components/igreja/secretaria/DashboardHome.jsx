import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Droplets, Wind, UserCheck, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const StatCard = ({ icon: Icon, title, value }) => (
    <div className="bg-card/80 backdrop-blur-md border border-primary/30 rounded-xl p-5 shadow-lg shadow-primary/5 hover:shadow-primary/20 transition-all">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-accent shadow-md">
            <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="mt-4">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1">{value}</p>
        </div>
    </div>
);

const DashboardHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembros: 0,
    membrosAtivos: 0,
    batizadosAguas: 0,
    batizadosEspiritoSanto: 0,
    dirigentes: 0
  });
  
  const [membrosPorFuncao, setMembrosPorFuncao] = useState([]);
  const [membrosPorConjunto, setMembrosPorConjunto] = useState([]);
  const [membrosPorClasse, setMembrosPorClasse] = useState([]);

  const CHART_COLORS = ['hsl(var(--primary))', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7', 'hsl(var(--muted))'];

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [membrosRes, funcoesRes, conjuntosRes, classesRes] = await Promise.all([
        supabase.from('igreja_membros').select('*'),
        supabase.from('igreja_funcoes').select('id, nome_funcao'),
        supabase.from('igreja_conjuntos').select('id, nome_conjunto'),
        supabase.from('igreja_classes').select('id, nome_classe'),
      ]);

      const membros = membrosRes.data || [];
      const funcoes = funcoesRes.data || [];
      const conjuntos = conjuntosRes.data || [];
      const classes = classesRes.data || [];

      const ativos = membros.filter(m => m.status === 'ATIVO');

      setStats({
        totalMembros: membros.length,
        membrosAtivos: ativos.length,
        batizadosAguas: membros.filter(m => m.is_batizado_aguas).length,
        batizadosEspiritoSanto: membros.filter(m => m.is_batizado_espirito).length,
        dirigentes: membros.filter(m => m.is_dirigente).length
      });

      const funcaoCount = funcoes.map(f => ({
        name: f.nome_funcao,
        value: membros.filter(m => m.funcao_id === f.id).length
      })).filter(f => f.value > 0).sort((a,b) => b.value - a.value);

      const conjuntoCount = conjuntos.map(c => ({
        name: c.nome_conjunto,
        value: membros.filter(m => m.conjunto_id === c.id).length
      })).filter(c => c.value > 0).sort((a,b) => b.value - a.value);

      const classeCount = classes.map(cl => ({
        name: cl.nome_classe,
        value: membros.filter(m => m.classe_id === cl.id).length
      })).filter(cl => cl.value > 0).sort((a,b) => b.value - a.value);

      setMembrosPorFuncao(funcaoCount);
      setMembrosPorConjunto(conjuntoCount);
      setMembrosPorClasse(classeCount);

    } catch (error) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    if (!user) return;

    const channel = supabase.channel('secretaria_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_membros' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_funcoes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_conjuntos' }, fetchData)
      .subscribe();
      
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchData]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
      <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary uppercase tracking-widest">Painel da Secretaria</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard icon={Users} title="Total Cadastrados" value={stats.totalMembros} />
        <StatCard icon={UserCheck} title="Membros Ativos" value={stats.membrosAtivos} />
        <StatCard icon={Droplets} title="Batizados Águas" value={stats.batizadosAguas} />
        <StatCard icon={Wind} title="Batizados Esp. Santo" value={stats.batizadosEspiritoSanto} />
        <StatCard icon={Crown} title="Dirigentes" value={stats.dirigentes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-foreground mb-6">Membros por Função</h2>
            <div className="h-[300px] w-full">
            {membrosPorFuncao.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={membrosPorFuncao} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Dados insuficientes</div>
            )}
            </div>
        </div>

        <div className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-foreground mb-6">Membros por Conjunto</h2>
            <div className="h-[300px] w-full">
            {membrosPorConjunto.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={membrosPorConjunto}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {membrosPorConjunto.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    </Pie>
                    <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))' }} />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Dados insuficientes</div>
            )}
            </div>
        </div>

        <div className="lg:col-span-3 bg-card/80 backdrop-blur-md border border-border rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-foreground mb-6">Membros por Classe de EBD</h2>
            <div className="h-[250px] w-full">
            {membrosPorClasse.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={membrosPorClasse} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} width={150} />
                    <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Dados insuficientes</div>
            )}
            </div>
        </div>

      </div>
    </motion.div>
  );
};

export default DashboardHome;