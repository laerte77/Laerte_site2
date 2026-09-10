import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/igreja/secretaria/Sidebar';
import Header from '@/components/igreja/Header';
import DashboardHome from '@/components/igreja/secretaria/DashboardHome';
import CadastroMembros from '@/components/igreja/secretaria/cadastros/CadastroMembros';
import CadastroFuncoes from '@/components/igreja/secretaria/cadastros/CadastroFuncoes';
import CadastroCargos from '@/components/igreja/secretaria/cadastros/CadastroCargos';
import CadastroConjuntos from '@/components/igreja/secretaria/cadastros/CadastroConjuntos';
import CadastroClasses from '@/components/igreja/secretaria/cadastros/CadastroClasses';
import LancamentoCasamentos from '@/components/igreja/secretaria/lancamentos/LancamentoCasamentos';
import ConsultaMembros from '@/components/igreja/secretaria/consultas/ConsultaMembros';
import ConsultaMembrosConjunto from '@/components/igreja/secretaria/consultas/ConsultaMembrosConjunto';
import ConsultaDirigentesConjunto from '@/components/igreja/secretaria/consultas/ConsultaDirigentesConjunto';
import ConsultaMembrosCargoRelatorio from '@/components/igreja/secretaria/consultas/ConsultaMembrosCargoRelatorio';
import ConsultaMembrosFuncaoRelatorio from '@/components/igreja/secretaria/consultas/ConsultaMembrosFuncaoRelatorio';
import RelatorioEstatistico from '@/components/igreja/secretaria/relatorios/RelatorioEstatistico';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useModuleAccessGuard } from '@/hooks/useModuleAccessGuard';
import { DeviceContext } from '@/App';
import { cn } from '@/lib/utils';
import { SecretariaSharedDataProvider } from '@/contexts/SecretariaSharedDataContext';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const IgrejaSecretariaDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { session, loading, canAccessModule } = useAuth();
    const { isMobile } = useContext(DeviceContext);
    const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

    useModuleAccessGuard('igreja:secretaria');

    const hasSecretariaAccess = canAccessModule('igreja:secretaria');

    useEffect(() => {
        if (!loading && !session) {
            navigate('/login');
        }
    }, [session, loading, navigate]);
    
    useEffect(() => {
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    const routes = useMemo(() => (
        <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="cadastros/membros" element={<CadastroMembros />} />
            <Route path="cadastros/funcoes" element={<CadastroFuncoes />} />
            <Route path="cadastros/cargos" element={<CadastroCargos />} />
            <Route path="cadastros/conjuntos" element={<CadastroConjuntos />} />
            <Route path="cadastros/classes" element={<CadastroClasses />} />
            <Route path="lancamentos/casamentos" element={<LancamentoCasamentos />} />
            <Route path="consultas/membros" element={<ConsultaMembros />} />
            <Route path="consultas/dirigentes-conjunto" element={<ConsultaDirigentesConjunto />} />
            <Route path="consultas/membros-conjunto" element={<ConsultaMembrosConjunto />} />
            <Route path="consultas/membros-cargo" element={<ConsultaMembrosCargoRelatorio />} />
            <Route path="consultas/membros-funcao" element={<ConsultaMembrosFuncaoRelatorio />} />
            <Route path="relatorios/estatistico" element={<RelatorioEstatistico />} />
            <Route path="*" element={<Navigate to="/igreja/secretaria" replace />} />
        </Routes>
    ), []);

    if (loading) {
        return <div className="flex flex-col items-center justify-center h-screen bg-transparent text-foreground"><Loader2 className="w-10 h-10 animate-spin text-[hsl(var(--neon-gold))] mb-4" /><p>Carregando Módulo...</p></div>;
    }

    if (!hasSecretariaAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-foreground p-4">
                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-xl max-w-md text-center shadow-lg">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
                    <p className="text-muted-foreground mb-6">Você não possui permissão para acessar a Secretaria da Igreja.</p>
                    <Button onClick={() => navigate('/igreja')} className="bg-[hsl(var(--neon-gold))] text-[hsl(var(--background))] hover:bg-[hsl(var(--neon-gold))]/90">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <SecretariaSharedDataProvider>
            <div className="bg-gradient-professional flex min-h-screen w-full overflow-hidden" style={{ '--primary': 'var(--neon-gold)', '--ring': 'var(--neon-gold)' }}>
                <Sidebar isOpen={isSidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} activeModule="secretaria" />
                
                <div className={cn(
                    "flex-1 flex flex-col h-screen transition-all duration-300",
                    !isMobile && (isSidebarOpen ? 'ml-64' : 'ml-20')
                )}>
                    <Header 
                        toggleSidebar={() => setSidebarOpen(prev => !prev)} 
                        submodule="Secretaria"
                    />
                    
                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-transparent relative w-full [&_.neon-card]:neon-border-gold [&_.neon-card]:neon-hover-gold">
                        {location.pathname === '/igreja/secretaria' ? <DashboardHome /> : routes}
                    </main>
                </div>

                {isMobile && isSidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 z-30"
                        aria-hidden="true"
                    />
                )}
            </div>
        </SecretariaSharedDataProvider>
    );
};

export default IgrejaSecretariaDashboard;