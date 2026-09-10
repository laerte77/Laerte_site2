import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { User, Lock, Mail, ArrowLeft, UserPlus, Shield, Church, Printer, Gamepad2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { verifyUserSystemStatus } from '@/lib/userVerificationUtils';

const modules = [
  { id: 'pessoal', name: 'Pessoal', icon: User },
  { id: 'lm-impressoes', name: 'LM Impressões', icon: Printer },
  { id: 'igreja', name: 'Igreja', icon: Church },
  { id: 'entretenimento', name: 'Entretenimento', icon: Gamepad2 },
];

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: adminUser, session: adminSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleModuleChange = (moduleId) => {
    setFormError('');
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!email || !password || !masterPassword) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setFormError('A senha do novo usuário deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const status = await verifyUserSystemStatus(email);
      if (status.existsInSystemTable) {
        setFormError('Este e-mail já está cadastrado no sistema.');
        setLoading(false);
        return;
      }

      const { error: masterError } = await supabase.auth.signInWithPassword({
        email: adminUser.email,
        password: masterPassword,
      });

      if (masterError) {
        setFormError('Senha do administrador inválida.');
        setLoading(false);
        return;
      }

      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            allowed_modules: selectedModules,
          },
        },
      });

      await supabase.auth.setSession(adminSession);

      if (signUpError) {
        let msg = signUpError.message;
        if (msg.includes("already registered")) msg = "E-mail já está em uso.";
        throw new Error(msg);
      }

      if (newUser?.user) {
        const now = new Date().toISOString();
        const initialModules = selectedModules.length > 0 ? selectedModules : [];
        
        const { error: dbError } = await supabase.from('usuarios_sistema').insert([{
           id: newUser.user.id,
           email: newUser.user.email,
           modulos_acesso: initialModules,
           criado_em: now,
           atualizado_em: now
        }]);

        if (dbError && dbError.code !== '23505') { 
           console.warn("[Register] Erro ao inserir na tabela usuarios_sistema:", dbError);
           throw new Error("Erro ao criar perfil de sistema para o usuário.");
        }
        
        await supabase.from('profiles').update({ allowed_modules: initialModules }).eq('id', newUser.user.id);
      }

      setFormSuccess('Novo usuário cadastrado com sucesso! O sistema foi sincronizado.');
      toast({ title: 'Sucesso!', description: 'Usuário cadastrado com sucesso.', className: 'bg-[hsl(var(--neon-cyan))] text-[hsl(var(--background))] border-none' });
      
      setTimeout(() => {
        navigate('/pessoal/dashboard/admin/gerenciar-usuarios');
      }, 2000);

    } catch (err) {
      console.error("[Register] Erro durante o cadastro:", err);
      setFormError(err.message || 'Falha ao realizar o cadastro. Tente novamente.');
      toast({ title: 'Erro no Cadastro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - Sistema Empresarial</title>
        <meta name="description" content="Cadastre um novo usuário no sistema" />
      </Helmet>
      <div className="min-h-screen bg-gradient-professional flex items-center justify-center p-4 text-[hsl(var(--text-primary))]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-10 pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg z-10"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--card-bg))]"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="bg-[hsl(var(--card-bg))]/80 backdrop-blur-xl border neon-border-cyan rounded-2xl shadow-2xl shadow-black/40 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[hsl(var(--neon-cyan))]/10 rounded-full mb-4 border-2 border-[hsl(var(--neon-cyan))]/30 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.3)]">
                <UserPlus className="w-10 h-10 text-[hsl(var(--neon-cyan))]" />
              </div>
              <h1 className="text-3xl font-bold text-[hsl(var(--text-primary))]">
                Cadastrar Novo Usuário
              </h1>
              <p className="text-[hsl(var(--text-secondary))] mt-2">
                Crie uma nova conta e defina os módulos permitidos
              </p>
            </div>

            {formError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/50 text-[hsl(var(--destructive))] px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </motion.div>
            )}

            {formSuccess && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-[hsl(var(--neon-cyan))]/10 border border-[hsl(var(--neon-cyan))]/50 text-[hsl(var(--neon-cyan))] px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              <fieldset className="border border-[hsl(var(--border-dark))] p-4 rounded-lg bg-[hsl(var(--background))]/30">
                <legend className="px-2 text-sm font-medium text-[hsl(var(--text-secondary))]">Dados do Novo Usuário</legend>
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-tertiary))]" />
                    <Input 
                      type="email" 
                      placeholder="Email do Novo Usuário" 
                      value={email} 
                      onChange={(e) => { setEmail(e.target.value); setFormError(''); }} 
                      className={`pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--neon-cyan))]`} 
                      disabled={loading || formSuccess}
                      required 
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-tertiary))]" />
                    <Input 
                      type="password" 
                      placeholder="Senha do Novo Usuário (mínimo 6 char)" 
                      value={password} 
                      onChange={(e) => { setPassword(e.target.value); setFormError(''); }} 
                      className={`pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--neon-cyan))]`} 
                      disabled={loading || formSuccess}
                      required 
                    />
                  </div>
                </div>
              </fieldset>

              <div>
                <Label className="text-base font-semibold text-[hsl(var(--text-secondary))] mb-3 block">
                  Módulos Iniciais (Opcional)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {modules.map(module => {
                    const Icon = module.icon;
                    return (
                      <div key={module.id} className="flex items-center space-x-3 bg-[hsl(var(--input-bg))] p-3 rounded-lg border border-[hsl(var(--border-dark))] hover:border-[hsl(var(--neon-cyan))]/50 transition-colors">
                        <Checkbox 
                          id={module.id} 
                          onCheckedChange={() => handleModuleChange(module.id)} 
                          className="border-[hsl(var(--text-tertiary))] data-[state=checked]:bg-[hsl(var(--neon-cyan))] data-[state=checked]:text-[hsl(var(--background))]" 
                          disabled={loading || formSuccess}
                        />
                        <label htmlFor={module.id} className="text-sm font-medium leading-none flex items-center cursor-pointer text-[hsl(var(--text-primary))]">
                          <Icon className="w-4 h-4 mr-2 text-[hsl(var(--text-tertiary))]" />
                          {module.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[hsl(var(--text-tertiary))] mt-2">
                  Se nenhum módulo for selecionado, a conta iniciará vazia e os módulos poderão ser adicionados posteriormente pelo painel administrativo.
                </p>
              </div>

              <fieldset className="border border-[hsl(var(--destructive))]/30 p-4 rounded-lg bg-[hsl(var(--destructive))]/5">
                <legend className="px-2 text-sm font-medium text-[hsl(var(--destructive))] flex items-center"><Shield className="w-4 h-4 mr-2"/>Autorização do Administrador</legend>
                <div className="space-y-4 pt-2">
                   <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-tertiary))]" />
                    <Input type="email" placeholder="Email do Administrador" value={adminUser?.email || ''} className="pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] focus:border-[hsl(var(--destructive))] text-[hsl(var(--text-primary))] opacity-70" disabled />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--text-tertiary))]" />
                    <Input 
                      type="password" 
                      placeholder="Sua Senha de Administrador" 
                      value={masterPassword} 
                      onChange={(e) => { setMasterPassword(e.target.value); setFormError(''); }} 
                      className={`pl-10 bg-[hsl(var(--input-bg))] border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] focus:border-[hsl(var(--destructive))]`} 
                      disabled={loading || formSuccess}
                      required 
                    />
                  </div>
                </div>
              </fieldset>

              <Button type="submit" className="w-full bg-[hsl(var(--neon-cyan))] hover:bg-[hsl(var(--neon-cyan))]/90 text-[hsl(var(--background))] font-bold text-base py-6 shadow-[0_0_15px_hsl(var(--neon-cyan)/0.4)] transition-all" disabled={loading || formSuccess}>
                {loading ? 'Processando Cadastro...' : 'Cadastrar Usuário'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;