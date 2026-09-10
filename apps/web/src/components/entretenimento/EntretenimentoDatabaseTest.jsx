import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Database } from 'lucide-react';
import { verifyEntretenimentoDatabase } from '@/lib/entretenimentoDatabaseVerification';
import { motion } from 'framer-motion';

const StatusIcon = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === 'error') return <XCircle className="w-5 h-5 text-red-500" />;
  if (status === 'pending') return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
  return <AlertCircle className="w-5 h-5 text-yellow-500" />;
};

const EntretenimentoDatabaseTest = () => {
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runTests = async () => {
    if (!user) {
      setError('Usuário não autenticado.');
      return;
    }
    
    setIsTesting(true);
    setError(null);
    setResults(null);
    
    try {
      const testResults = await verifyEntretenimentoDatabase(user.id);
      setResults(testResults);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao executar a verificação.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" />
                Verificação de Banco de Dados (Entretenimento)
              </CardTitle>
              <CardDescription>
                Testa conectividade, operações CRUD e políticas RLS nas tabelas do módulo.
              </CardDescription>
            </div>
            <Button onClick={runTests} disabled={isTesting}>
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isTesting ? 'Verificando...' : 'Executar Verificação'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-500">Erro na Execução</h4>
                <p className="text-sm text-red-500/80">{error}</p>
              </div>
            </div>
          )}

          {!results && !isTesting && !error && (
            <div className="text-center py-12 text-muted-foreground">
              Clique em "Executar Verificação" para iniciar os testes. Nenhuma alteração permanente será feita.
            </div>
          )}

          {isTesting && !results && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Testando tabelas e políticas RLS...</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <StatusIcon status={result.overall} />
                      {result.table}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      result.overall === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {result.overall === 'success' ? 'Operacional' : 'Falha'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Leitura (SELECT)</span>
                      <div className="flex items-start gap-2">
                        <StatusIcon status={result.read?.status} />
                        <span className="text-sm">{result.read?.message || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Inserção (INSERT)</span>
                      <div className="flex items-start gap-2">
                        <StatusIcon status={result.insert?.status} />
                        <span className="text-sm">{result.insert?.message || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Exclusão (DELETE)</span>
                      <div className="flex items-start gap-2">
                        <StatusIcon status={result.delete?.status} />
                        <span className="text-sm">{result.delete?.message || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EntretenimentoDatabaseTest;