import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import Sidebar from '@/components/pessoal/sidebar';
import Header from '@/components/pessoal/Header';
import PessoalDashboardHome from '@/components/pessoal/PessoalDashboardHome';
import AlertasInteligentes from '@/components/pessoal/AlertasInteligentes';
import PlanejamentoFinanceiro from '@/components/pessoal/orcamento/PlanejamentoFinanceiro';
import TiposReceita from '@/components/pessoal/cadastros/TiposReceita';
import TiposDespesa from '@/components/pessoal/cadastros/TiposDespesa';
import Livros from '@/components/pessoal/cadastros/Livros';
import CartoesCredito from '@/components/pessoal/cadastros/CartoesCredito';
import CartaoUsuarios from '@/components/pessoal/cadastros/CartaoUsuarios';
import Receitas from '@/components/pessoal/lancamentos/Receitas';
import Despesas from '@/components/pessoal/lancamentos/Despesas';
import DespesaPrevista from '@/components/pessoal/lancamentos/DespesaPrevista';
import ContasMes from '@/components/pessoal/relatorios/ContasMes';
import LancamentoDevedores from '@/components/pessoal/lancamentos/LancamentoDevedores';
import LancamentoDizimosOfertas from '@/components/pessoal/lancamentos/LancamentoDizimosOfertas';
import Metas from '@/components/pessoal/lancamentos/Metas';
import Leitura from '@/components/pessoal/lancamentos/Leitura';
import Aportes from '@/components/pessoal/investimentos/Aportes';
import Rendimentos from '@/components/pessoal/investimentos/Rendimentos';
import RelatorioReceitas from '@/components/pessoal/relatorios/RelatorioReceitas';
import RelatorioDespesas from '@/components/pessoal/relatorios/RelatorioDespesas';
import RelatorioDespesasPrevistas from '@/components/pessoal/relatorios/RelatorioDespesasPrevistas';
import RelatorioCartoes from '@/components/pessoal/relatorios/RelatorioCartoes';
import RelatorioCartaoPessoas from '@/components/pessoal/relatorios/RelatorioCartaoPessoas';
import Faturas from '@/components/pessoal/lancamentos/Faturas';
import CartaoLancamentos from '@/components/pessoal/lancamentos/CartaoLancamentos';
import RelatorioDevedores from '@/components/pessoal/relatorios/RelatorioDevedores';
import RelatorioLeitura from '@/components/pessoal/relatorios/RelatorioLeitura';
import ConsultaDividasPrevisadasMesAMes from '@/components/pessoal/relatorios/ConsultaDividasPrevisadasMesAMes';
import GerenciarUsuarios from '@/components/pessoal/admin/GerenciarUsuarios';
import CriarNovoUsuario from '@/components/pessoal/admin/CriarNovoUsuario';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { DeviceContext } from '@/App';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const PessoalDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, loading, isAdmin, canAccessModule } = useAuth();
    const { isMobile } = useContext(DeviceContext);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

    useModuleAccessGuard('pessoal');

    useEffect(() => {
        if (!loading) {
            if (!session) {
                toast({ title: 'Acesso Negado', description: 'Por favor, faça login.', variant: 'destructive' });
                navigate('/login');
            } else if (!canAccessModule('pessoal')) {
                toast({ title: 'Acesso Restrito', description: 'Você não tem permissão para o módulo Pessoal.', variant: 'destructive' });
                navigate('/modules');
            }
        }
    }, [session, loading, navigate, toast, canAccessModule]);

    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);
    
    if (loading || (!session && !loading)) {
        return <div className="flex flex-col items-center justify-center h-screen bg-transparent text-foreground"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--neon-blue))] mb-4" /><p>Carregando Módulo...</p></div>;
    }
    
    const AdminRoute = ({ children }) => isAdmin ? children : <Navigate to="/pessoal/dashboard" />;

    return (
        <div className="flex min-h-screen w-full bg-gradient-professional" style={{ '--primary': 'var(--neon-blue)', '--ring': 'var(--neon-blue)' }}>
            <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-300",
                !isMobile && (isSidebarOpen ? 'ml-64' : 'ml-20')
            )}>
                <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} isSidebarOpen={isSidebarOpen} />
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-transparent relative [&_.neon-card]:neon-border-blue [&_.neon-card]:neon-hover-blue">
                    <Routes>
                        <Route path="/" element={<PessoalDashboardHome />} />
                        <Route path="/alertas" element={<AlertasInteligentes />} />
                        <Route path="/planejamento" element={<PlanejamentoFinanceiro />} />
                        <Route path="/contas-mes" element={<ContasMes />} />
                        <Route path="cadastros/tipos-receita" element={<TiposReceita />} />
                        <Route path="cadastros/tipos-despesa" element={<TiposDespesa />} />
                        <Route path="cadastros/livros" element={<Livros />} />
                        <Route path="cadastros/cartoes-credito" element={<CartoesCredito />} />
                        <Route path="cadastros/cartao-usuarios" element={<CartaoUsuarios />} />
                        <Route path="lancamentos/receitas" element={<Receitas />} />
                        <Route path="lancamentos/despesas" element={<Despesas />} />
                        <Route path="lancamentos/despesa-prevista" element={<DespesaPrevista />} />
                        <Route path="lancamentos/faturas" element={<Faturas />} />
                        <Route path="lancamentos/cartao-lancamentos" element={<CartaoLancamentos />} />
                        <Route path="lancamentos/dividas-previstas-mes-a-mes" element={<ConsultaDividasPrevisadasMesAMes />} />
                        <Route path="lancamentos/devedores" element={<LancamentoDevedores />} />
                        <Route path="lancamentos/dizimos-e-ofertas" element={<LancamentoDizimosOfertas />} />
                        <Route path="lancamentos/metas" element={<Metas />} />
                        <Route path="lancamentos/leitura" element={<Leitura />} />
                        <Route path="investimentos/aportes" element={<Aportes />} />
                        <Route path="investimentos/rendimentos" element={<Rendimentos />} />
                        <Route path="relatorios/receitas" element={<RelatorioReceitas />} />
                        <Route path="relatorios/despesas" element={<RelatorioDespesas />} />
                        <Route path="relatorios/despesas-previstas" element={<RelatorioDespesasPrevistas />} />
                        <Route path="relatorios/cartoes" element={<RelatorioCartoes />} />
                        <Route path="relatorios/cartoes-pessoas" element={<RelatorioCartaoPessoas />} />
                        <Route path="relatorios/devedores" element={<RelatorioDevedores />} />
                        <Route path="relatorios/leitura" element={<RelatorioLeitura />} />
                        
                        {/* Admin Routes */}
                        <Route path="admin/gerenciar-usuarios" element={<AdminRoute><GerenciarUsuarios /></AdminRoute>} />
                        <Route path="admin/criar-usuario" element={<AdminRoute><CriarNovoUsuario /></AdminRoute>} />
                        
                        <Route path="*" element={<Navigate to="/pessoal/dashboard" replace />} />
                    </Routes>
                </main>
            </div>
             {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    aria-hidden="true"
                />
            )}
            <Toaster />
        </div>
    );
};

export default PessoalDashboard;
