import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import Sidebar from '@/components/entretenimento/Sidebar';
import Header from '@/components/entretenimento/Header';
import DashboardHome from '@/components/entretenimento/DashboardHome';
import CadastroPlayers from '@/components/entretenimento/cadastros/CadastroPlayers';
import CadastroJogadores from '@/components/entretenimento/cadastros/CadastroJogadores';
import CadastroParticipantes from '@/components/entretenimento/cadastros/CadastroParticipantes';
import CadastroDespesas from '@/components/entretenimento/cadastros/CadastroDespesas';
import CadastroOrganizadores from '@/components/entretenimento/cadastros/CadastroOrganizadores';
import LancamentoPartidas from '@/components/entretenimento/lancamentos/LancamentoPartidas';
import LancamentoArtilharia from '@/components/entretenimento/lancamentos/LancamentoArtilharia';
import LancamentoContribuicoes from '@/components/entretenimento/lancamentos/LancamentoContribuicoes';
import LancamentoDespesas from '@/components/entretenimento/lancamentos/LancamentoDespesas';
import CadastroColetes from '@/components/entretenimento/cadastros/CadastroColetes';
import ConsultaColetes from '@/components/entretenimento/consultas/ConsultaColetes';
import RelatorioConfrontos from '@/components/entretenimento/relatorios/RelatorioConfrontos';
import RelatorioArtilharia from '@/components/entretenimento/relatorios/RelatorioArtilharia';
import ConsultaContribuicoes from '@/components/entretenimento/relatorios/ConsultaContribuicoes';
import ConsultaDespesas from '@/components/entretenimento/relatorios/ConsultaDespesas';
import EntretenimentoDatabaseTest from '@/components/entretenimento/EntretenimentoDatabaseTest';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { DeviceContext } from '@/App';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const EntretenimentoDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, loading } = useAuth();
    const { isMobile } = useContext(DeviceContext);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

    useModuleAccessGuard('entretenimento');

    useEffect(() => {
        if (!loading && !session) {
            toast({ title: 'Acesso Negado', description: 'Você precisa fazer login para acessar o dashboard.', variant: 'destructive' });
            navigate('/login');
        }
    }, [session, loading, navigate, toast]);

    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-transparent text-foreground"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--neon-orange))] mb-4" /></div>;
    }

    return (
         <div className="flex min-h-screen w-full bg-gradient-professional" style={{ '--primary': 'var(--neon-orange)', '--ring': 'var(--neon-orange)' }}>
            <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-300",
                !isMobile && (isSidebarOpen ? 'ml-64' : 'ml-20')
            )}>
                <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} isSidebarOpen={isSidebarOpen} />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-transparent [&_.neon-card]:neon-border-orange [&_.neon-card]:neon-hover-orange">
                     <Routes>
                        <Route path="/" element={<DashboardHome />} />
                        <Route path="cadastros/players" element={<CadastroPlayers />} />
                        <Route path="cadastros/jogadores" element={<CadastroJogadores />} />
                        <Route path="cadastros/participantes" element={<CadastroParticipantes />} />
                        <Route path="cadastros/despesas" element={<CadastroDespesas />} />
                        <Route path="cadastros/organizadores" element={<CadastroOrganizadores />} />
                        
                        <Route path="lancamentos/partidas" element={<LancamentoPartidas />} />
                        <Route path="lancamentos/artilharia" element={<LancamentoArtilharia />} />
                        <Route path="lancamentos/contribuicoes" element={<LancamentoContribuicoes />} />
                        <Route path="lancamentos/despesas" element={<LancamentoDespesas />} />

                        <Route path="coletes/cadastro" element={<CadastroColetes />} />
                        <Route path="coletes/consulta" element={<ConsultaColetes />} />
                        
                        <Route path="relatorios/confrontos" element={<RelatorioConfrontos />} />
                        <Route path="relatorios/artilharia" element={<RelatorioArtilharia />} />
                        <Route path="consultas/contribuicoes" element={<ConsultaContribuicoes />} />
                        <Route path="consultas/despesas" element={<ConsultaDespesas />} />
                        <Route path="admin/db-test" element={<EntretenimentoDatabaseTest />} />
                        <Route path="*" element={<Navigate to="/entretenimento/dashboard" replace />} />
                    </Routes>
                </main>
            </div>
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
                    aria-hidden="true"
                />
            )}
            <Toaster />
        </div>
    );
};

export default EntretenimentoDashboard;