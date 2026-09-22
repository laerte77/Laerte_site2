import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, UserX, Crown, GraduationCap, Droplets, Wind, UserRoundCog, Church, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import KPICard from '@/components/ui/KPICard';
import NeonCard from '@/components/ui/NeonCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const fmtNumber = (value) => new Intl.NumberFormat('pt-BR').format(Number(value || 0));
const chartColors = ['hsl(var(--neon-igreja))', 'hsl(var(--neon-igreja) / 0.8)', 'hsl(var(--neon-igreja) / 0.65)', 'hsl(var(--neon-igreja) / 0.5)', 'hsl(var(--neon-igreja) / 0.35)', 'hsl(var(--muted-foreground))'];

const StatPlaceholder = ({ message = 'Dados insuficientes' }) => <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{message}</div>;

export default function DashboardHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalMembros: 0, membrosAtivos: 0, membrosInativos: 0, dirigentes: 0, membrosEbd: 0, batizadosAguas: 0, batizadosEspiritoSanto: 0, semFuncao: 0, semConjunto: 0, semClasseEbd: 0 });
  const [charts, setCharts] = useState({ funcoes: [], conjuntos: [], classes: [] });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [membrosRes, funcoesRes, conjuntosRes, classesRes] = await Promise.all([
        supabase.from('igreja_membros').select('id,status,is_batizado_aguas,is_batizado_espirito,is_dirigente,funcao_id,conjunto_id,classe_id'),
        supabase.from('igreja_funcoes').select('id,nome_funcao'),
        supabase.from('igreja_conjuntos').select('id,nome_conjunto'),
        supabase.from('igreja_classes').select('id,nome_classe')
      ]);
      const firstError = [membrosRes.error, funcoesRes.error, conjuntosRes.error, classesRes.error].find(Boolean);
      if (firstError) throw new Error(firstError.message || 'Não foi possível carregar os dados da Secretaria.');

      const membros = membrosRes.data || [], funcoes = funcoesRes.data || [], conjuntos = conjuntosRes.data || [], classes = classesRes.data || [];
      const ativos = membros.filter(m => m.status === 'ATIVO');
      const porFuncao = funcoes.map(f => ({ name: f.nome_funcao, value: membros.filter(m => m.funcao_id === f.id).length })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
      const porConjunto = conjuntos.map(c => ({ name: c.nome_conjunto, value: membros.filter(m => m.conjunto_id === c.id).length })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
      const porClasse = classes.map(c => ({ name: c.nome_classe, value: membros.filter(m => m.classe_id === c.id).length })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

      setStats({
        totalMembros: membros.length,
        membrosAtivos: ativos.length,
        membrosInativos: membros.length - ativos.length,
        dirigentes: membros.filter(m => m.is_dirigente).length,
        membrosEbd: membros.filter(m => m.classe_id != null).length,
        batizadosAguas: membros.filter(m => m.is_batizado_aguas).length,
        batizadosEspiritoSanto: membros.filter(m => m.is_batizado_espirito).length,
        semFuncao: membros.filter(m => m.funcao_id == null).length,
        semConjunto: membros.filter(m => m.conjunto_id == null).length,
        semClasseEbd: membros.filter(m => m.classe_id == null).length
      });
      setCharts({ funcoes: porFuncao, conjuntos: porConjunto, classes: porClasse });
    } catch (err) {
      console.error('Erro ao carregar dashboard da Secretaria:', err);
      setError(err?.message || 'Não foi possível carregar o dashboard.');
      toast({ title: 'Erro ao carregar dados', description: err?.message || 'Não foi possível carregar o dashboard.', variant: 'destructive' });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_classes' }, fetchData)
      .subscribe();
    const interval = setInterval(fetchData, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [user, fetchData]);

  const pendencias = useMemo(() => [
    stats.semFuncao > 0 && { tipo: 'warning', icon: UserRoundCog, title: `${fmtNumber(stats.semFuncao)} membro(s) sem função`, description: 'Existem membros cadastrados sem função vinculada.' },
    stats.semConjunto > 0 && { tipo: 'warning', icon: Church, title: `${fmtNumber(stats.semConjunto)} membro(s) sem conjunto`, description: 'Existem membros ainda não vinculados a um conjunto.' },
    stats.semClasseEbd > 0 && { tipo: 'warning', icon: GraduationCap, title: `${fmtNumber(stats.semClasseEbd)} membro(s) sem classe de EBD`, description: 'Existem membros sem classe de Escola Bíblica Dominical.' }
  ].filter(Boolean), [stats]);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Atualizando painel da Secretaria...</div>;

  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto w-full"><NeonCard colorScheme="igreja" className="p-6 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" /><p className="font-semibold text-destructive">Não foi possível carregar o painel.</p><p className="text-sm text-muted-foreground mt-2">{error}</p></NeonCard></div>;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">Painel da Secretaria</h1>
          <div className="h-1 w-16 rounded-full bg-[hsl(var(--neon-igreja))] mt-3 mx-auto md:mx-0" />
          <p className="text-sm text-muted-foreground text-center md:text-left mt-1">Acompanhe os dados e a organização dos membros da igreja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={Users} label="Total de Membros" value={stats.totalMembros} iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={UserCheck} label="Membros Ativos" value={stats.membrosAtivos} iconColor="igreja" className="w-full" />
        <KPICard colorScheme="igreja" icon={UserX} label="Membros Inativos" value={stats.membrosInativos} iconColor="igreja" className="w-full" />
        <KPICard colorScheme="igreja" icon={Crown} label="Dirigentes" value={stats.dirigentes} iconColor="gold" className="w-full" />
        <KPICard colorScheme="igreja" icon={GraduationCap} label="Membros na EBD" value={stats.membrosEbd} iconColor="gold" className="w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        <KPICard colorScheme="igreja" icon={Droplets} label="Batizados em Águas" value={stats.batizadosAguas} iconColor="blue" className="w-full" />
        <KPICard colorScheme="igreja" icon={Wind} label="Batizados no Espírito Santo" value={stats.batizadosEspiritoSanto} iconColor="igreja" className="w-full" />
        <KPICard colorScheme="igreja" icon={UserRoundCog} label="Sem Função" value={stats.semFuncao} iconColor="orange" className="w-full" />
        <KPICard colorScheme="igreja" icon={Church} label="Sem Conjunto" value={stats.semConjunto} iconColor="orange" className="w-full" />
        <KPICard colorScheme="igreja" icon={GraduationCap} label="Sem Classe EBD" value={stats.semClasseEbd} iconColor="orange" className="w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <NeonCard colorScheme="igreja" className="h-[300px] md:h-[380px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Membros por Função</h3>
          <ResponsiveContainer width="100%" height="85%">{charts.funcoes.length ? <BarChart data={charts.funcoes} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} /><YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} /><Tooltip cursor={{ fill: 'hsl(var(--neon-igreja)/0.08)' }} formatter={(value) => [fmtNumber(value), 'Membros']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Bar dataKey="value" fill="hsl(var(--neon-igreja))" radius={[4,4,0,0]} /></BarChart> : <StatPlaceholder />}</ResponsiveContainer>
        </NeonCard>

        <NeonCard colorScheme="igreja" className="h-[300px] md:h-[380px] overflow-hidden">
          <h3 className="text-lg md:text-xl font-semibold mb-4">Membros por Conjunto</h3>
          <ResponsiveContainer width="100%" height="85%">{charts.conjuntos.length ? <PieChart><Pie data={charts.conjuntos} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">{charts.conjuntos.map((entry, index) => <Cell key={`conjunto-${index}`} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => [fmtNumber(value), 'Membros']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Legend wrapperStyle={{ fontSize: '11px' }} /></PieChart> : <StatPlaceholder />}</ResponsiveContainer>
        </NeonCard>
      </div>

      <NeonCard colorScheme="igreja" className="h-[300px] md:h-[360px] overflow-hidden">
        <h3 className="text-lg md:text-xl font-semibold mb-4">Membros por Classe de EBD</h3>
        <ResponsiveContainer width="100%" height="85%">{charts.classes.length ? <BarChart data={charts.classes} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" /><XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} /><YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} width={150} /><Tooltip cursor={{ fill: 'hsl(var(--neon-igreja)/0.08)' }} formatter={(value) => [fmtNumber(value), 'Membros']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--neon-igreja)/0.3)', borderRadius: '10px' }} /><Bar dataKey="value" fill="hsl(var(--neon-igreja))" radius={[0,4,4,0]} barSize={24} /></BarChart> : <StatPlaceholder />}</ResponsiveContainer>
      </NeonCard>

      <NeonCard colorScheme="igreja" className="p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4"><div><h3 className="text-lg font-semibold">Atenção da Secretaria</h3><p className="text-xs text-muted-foreground mt-1">Pendências encontradas no cadastro dos membros</p></div><span className="shrink-0 rounded-full bg-[hsl(var(--neon-igreja)/0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--neon-igreja))]">{pendencias.length} {pendencias.length === 1 ? 'pendência' : 'pendências'}</span></div>
        {pendencias.length > 0 ? <div className="space-y-3">{pendencias.map((item, index) => { const Icon = item.icon; return <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-xl border border-[hsl(var(--neon-igreja)/0.25)] bg-background/30 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--neon-igreja)/0.1)] text-[hsl(var(--neon-igreja))]"><Icon className="h-4 w-4" /></div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-1">{item.description}</p></div></div>; })}</div> : <div className="flex flex-col items-center justify-center py-7 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--neon-igreja)/0.1)] text-[hsl(var(--neon-igreja))]"><CheckCircle2 className="h-5 w-5" /></div><p className="font-medium mt-3">Cadastro em dia</p><p className="text-xs text-muted-foreground mt-1">Não foram encontradas pendências cadastrais.</p></div>}
      </NeonCard>
    </div>
  );
}
