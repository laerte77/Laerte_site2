import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import Sidebar from '@/components/lanhouse/Sidebar';
import Header from '@/components/lanhouse/Header';
import DashboardHome from '@/components/lanhouse/DashboardHome';
import CadastroClientes from '@/components/lanhouse/cadastros/CadastroClientes';
import CadastroServicos from '@/components/lanhouse/cadastros/CadastroServicos';
import CadastroDespesas from '@/components/lanhouse/cadastros/CadastroDespesas';
import CadastroTiposFolhas from '@/components/lanhouse/cadastros/CadastroTiposFolhas';
import CadastroPedidos from '@/components/lanhouse/cadastros/CadastroPedidos';
import LancamentoServicos from '@/components/lanhouse/lancamentos/LancamentoServicos';
import LancamentoDespesas from '@/components/lanhouse/lancamentos/LancamentoDespesas';
import LancamentoFolhas from '@/components/lanhouse/lancamentos/LancamentoFolhas';
import LancamentoDespesaPrevista from '@/components/lanhouse/lancamentos/LancamentoDespesaPrevista';
import ContasMesLM from '@/components/lanhouse/relatorios/ContasMesLM';
import LancamentoClientesDebito from '@/components/lanhouse/lancamentos/LancamentoClientesDebito';
import LancamentoDizimosOfertas from '@/components/lanhouse/lancamentos/LancamentoDizimosOfertas';
import LancamentoMetas from '@/components/lanhouse/lancamentos/LancamentoMetas';
import LancamentoCustos from '@/components/lanhouse/lancamentos/LancamentoCustos';
import ConsultaPedidos from '@/components/lanhouse/consultas/ConsultaPedidos';
import RelatorioServicos from '@/components/lanhouse/relatorios/RelatorioServicos';
import RelatorioDespesas from '@/components/lanhouse/relatorios/RelatorioDespesas';
import RelatorioClientesDebito from '@/components/lanhouse/relatorios/RelatorioClientesDebito';
import RelatorioDespesasPrevistas from '@/components/lanhouse/relatorios/RelatorioDespesasPrevistas';
import ControleFolhas from '@/components/lanhouse/relatorios/ControleFolhas';
import RelatorioCustosPorTipo from '@/components/lanhouse/relatorios/RelatorioCustosPorTipo';
import RelatorioLucroMensal from '@/components/lanhouse/relatorios/RelatorioLucroMensal';
import EstoqueInicial from '@/components/lanhouse/estoques/EstoqueInicial';
import Estoques from '@/components/lanhouse/estoques/Estoques';
import ControleEstoque from '@/components/lanhouse/estoques/ControleEstoque';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { DeviceContext } from '@/App';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const LmImpressoesDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, loading, canAccessModule } = useAuth();
    const { isMobile } = useContext(DeviceContext);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

    useModuleAccessGuard('lm-impressoes');

    useEffect(() => {
        if (!loading) {
            if (!session) {
                navigate('/login');
            } else if (!canAccessModule('lm-impressoes') && !canAccessModule('lm_impressoes')) {
                toast({ title: 'Acesso Restrito', description: 'Permissão negada ao módulo LanHouse.', variant: 'destructive' });
                navigate('/modules');
            }
        }
    }, [session, loading, navigate, toast, canAccessModule]);

    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    if (loading || (!session && !loading)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-transparent text-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--neon-cyan))] mb-4" />
                <p className="uppercase tracking-widest font-medium text-muted-foreground">Carregando LM Impressões...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full font-sans text-foreground bg-gradient-professional" style={{ '--primary': 'var(--neon-cyan)', '--ring': 'var(--neon-cyan)' }}>
            <Helmet>
                <title>LM Impressões | Sistema de Gestão</title>
                <meta name="description" content="Dashboard de Gestão LM Impressões" />
            </Helmet>
            
            <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-300",
                !isMobile && (isSidebarOpen ? 'ml-64' : 'ml-20')
            )}>
                <Header toggleSidebar={() => setSidebarOpen(prev => !prev)} isSidebarOpen={isSidebarOpen} />
                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto bg-transparent [&_.neon-card]:neon-border-cyan [&_.neon-card]:neon-hover-cyan">
                    <div className="max-w-7xl mx-auto">
                        <Routes>
                            <Route path="/" element={<DashboardHome />} />
                            <Route path="/despesas-previstas-mes" element={<ContasMesLM />} />
                            
                            <Route path="cadastros/clientes" element={<CadastroClientes />} />
                            <Route path="cadastros/servicos" element={<CadastroServicos />} />
                            <Route path="cadastros/despesas" element={<CadastroDespesas />} />
                            <Route path="cadastros/tipos-folha" element={<CadastroTiposFolhas />} />
                            
                            <Route path="lancamentos/servicos" element={<LancamentoServicos />} />
                            <Route path="lancamentos/despesas" element={<LancamentoDespesas />} />
                            <Route path="lancamentos/folhas" element={<LancamentoFolhas />} />
                            <Route path="lancamentos/despesas-previstas" element={<LancamentoDespesaPrevista />} />
                            <Route path="lancamentos/clientes-debito" element={<LancamentoClientesDebito />} />
                            <Route path="lancamentos/dizimos-ofertas" element={<LancamentoDizimosOfertas />} />
                            <Route path="lancamentos/metas" element={<LancamentoMetas />} />
                            
                            <Route path="custos/lancamentos" element={<LancamentoCustos />} />
                            <Route path="custos/controle" element={<ControleFolhas />} />
                            <Route path="custos/relatorio-custos" element={<RelatorioCustosPorTipo />} />
                            <Route path="custos/relatorio-lucro" element={<RelatorioLucroMensal />} />
                            
                            <Route path="pedidos/cadastro" element={<CadastroPedidos />} />
                            <Route path="pedidos/consulta" element={<ConsultaPedidos />} />
                            
                            <Route path="relatorios/servicos" element={<RelatorioServicos />} />
                            <Route path="relatorios/despesas" element={<RelatorioDespesas />} />
                            <Route path="relatorios/despesas-previstas" element={<RelatorioDespesasPrevistas />} />
                            <Route path="relatorios/clientes-debito" element={<RelatorioClientesDebito />} />
                            
                            <Route path="estoques/inicial" element={<EstoqueInicial />} />
                            <Route path="estoques/controle" element={<ControleEstoque />} />
                            <Route path="estoques" element={<Estoques />} />
                            
                            <Route path="*" element={<Navigate to="/lm-impressoes/dashboard" replace />} />
                        </Routes>
                    </div>
                </main>
            </div>
            
             {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                />
            )}
            
            <Toaster />
        </div>
    );
};

export default LmImpressoesDashboard;