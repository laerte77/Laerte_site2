import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, XCircle, Loader2, Play, AlertTriangle, FileJson, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { verifyBarbeariaTables, testBarbeariaCRUD } from '@/lib/barbeariaDatabaseVerification';
import { seedBarbeariaDemoData } from '@/lib/barbeariaSeedData';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const BarbeariaDatabaseTest = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tableStatus, setTableStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    try {
      const results = await verifyBarbeariaTables();
      setTableStatus(results.map(r => ({
          table: r.table,
          status: r.success ? 'success' : 'error',
          message: r.success ? 'Tabela Existe' : r.error,
          type: 'Existence'
      })));
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        toast({ title: "Sucesso", description: "Todas as tabelas foram encontradas.", className: "bg-green-600 text-white border-none" });
      } else {
        toast({ title: "Erro de Estrutura", description: "Algumas tabelas estão ausentes. Execute as migrações.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const runCRUDTests = async () => {
    if (!user) {
        toast({ title: "Atenção", description: "Você precisa estar logado para testar permissões (CRUD).", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
      const results = await testBarbeariaCRUD(user.id);
      setTableStatus(results.map(r => ({
          table: r.table,
          status: r.success ? 'success' : 'error',
          message: r.success ? 'CRUD + RLS OK' : r.error,
          type: 'CRUD'
      })));
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        toast({ title: "Sucesso", description: "Permissões de leitura e gravação confirmadas.", className: "bg-green-600 text-white border-none" });
      } else {
        toast({ title: "Falha de Permissão", description: "Falha ao gravar em algumas tabelas. Verifique o RLS.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!user) {
        toast({ title: "Atenção", description: "Faça login para inserir dados.", variant: "destructive" });
        return;
    }
    if (!confirm("Isso irá inserir dados de teste. Tem certeza?")) return;
    
    setSeeding(true);
    toast({ title: "Populando banco", description: "Inserindo dados de demonstração..." });
    
    try {
      const result = await seedBarbeariaDemoData();
      if (result.success) {
        toast({ title: "Sucesso!", description: "Dados inseridos com sucesso.", className: "bg-green-600 text-white border-none" });
      } else {
        toast({ title: "Erro ao popular", description: "As tabelas devem existir primeiro.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#D4AF37]/20 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-[#D4AF37] uppercase flex items-center gap-3">
            <ServerCrash className="w-8 h-8" />
            Diagnóstico Barbearia
          </h2>
          <p className="text-[#A9A9A9] mt-1">Verifique tabelas, migrações e políticas RLS.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button onClick={runVerification} disabled={loading} variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 flex-1 md:flex-none">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                1. Verificar Tabelas
            </Button>
            <Button onClick={runCRUDTests} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-none">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                2. Testar CRUD/RLS
            </Button>
            <Button onClick={handleSeedData} disabled={seeding || loading} className="bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold flex-1 md:flex-none">
                {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
                3. Inserir Demo Data
            </Button>
        </div>
      </div>

      {!user && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 w-6 h-6 mt-0.5 shrink-0" />
              <div>
                  <h4 className="font-bold text-red-500">Atenção: Usuário não autenticado</h4>
                  <p className="text-red-200 text-sm mt-1">Os testes exigem login ativo para validar políticas de segurança (user_id = auth.uid()).</p>
              </div>
          </div>
      )}

      <div className="grid gap-4">
        {tableStatus.map((item, idx) => (
          <Card key={`${item.table}-${idx}`} className={`bg-gray-900/80 border ${item.status === 'error' ? 'border-red-500/50' : 'border-green-500/50'}`}>
            <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full">
                <div className="p-2 bg-black/50 rounded-lg shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                      <h3 className="font-bold text-white text-lg tracking-wide">{item.table}</h3>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{item.type}</span>
                  </div>
                  <p className={`text-sm ${item.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default BarbeariaDatabaseTest;