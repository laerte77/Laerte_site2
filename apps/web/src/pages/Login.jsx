import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import {
  User,
  Lock,
  ArrowLeft,
  LogIn,
  Loader2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { clearAuthTokens } from '@/lib/tokenUtils';
import InstallPrompt from '@/components/InstallPrompt';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/modules');
    }
  }, [user, authLoading, navigate]);

  const validateForm = () => {
    setLocalError('');

    if (!email || !password) {
      setLocalError('Preencha todos os campos.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setLocalError('Formato de e-mail inválido.');
      return false;
    }

    if (password.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setLocalError('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.warn('Limpando sessão anterior...');
      }

      clearAuthTokens();

      const { error } = await signIn(email, password);

      if (error) {
        console.error('Login result error:', error);

        const errorMessage =
          error.message || 'Erro ao realizar login.';

        setLocalError(errorMessage);
        setPassword('');

        toast({
          title: 'Falha na Autenticação',
          description: errorMessage,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Autenticação concluída!',
          description: 'Bem-vindo de volta ao sistema!',
          className: 'bg-[hsl(var(--success))] text-white'
        });
      }
    } catch (err) {
      console.error('Unexpected login error:', err);

      setPassword('');
      clearAuthTokens();

      setLocalError(
        'Ocorreu um erro crítico no servidor. Tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);

    if (localError) {
      setLocalError('');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Sistema Empresarial</title>
        <meta
          name="description"
          content="Acesse o sistema"
        />
      </Helmet>

      <div
        className="
          min-h-screen
          bg-gradient-professional
          flex
          items-center
          justify-center
          p-4
          sm:p-6
          text-[hsl(var(--text-primary))]
          relative
          overflow-hidden
        "
      >
        {/* Animated Background Elements */}
        <div
          className="
            absolute
            inset-0
            overflow-hidden
            pointer-events-none
            motion-reduce:hidden
          "
          aria-hidden="true"
        >
          <div
            className="
              absolute
              top-1/3
              left-1/3
              w-72
              h-72
              sm:w-96
              sm:h-96
              bg-[hsl(var(--neon-cyan))]/5
              rounded-full
              blur-3xl
              animate-pulse
              motion-reduce:animate-none
            "
          />

          <div
            className="
              absolute
              bottom-1/3
              right-1/3
              w-72
              h-72
              sm:w-96
              sm:h-96
              bg-[hsl(var(--neon-cyan))]/5
              rounded-full
              blur-3xl
              animate-pulse
              motion-reduce:animate-none
            "
            style={{
              animationDelay: '1s'
            }}
          />
        </div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.96,
            y: 16
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          transition={{
            duration: 0.45,
            ease: 'easeOut'
          }}
          className="
            w-full
            max-w-md
            z-10
          "
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="
              absolute
              top-4
              left-4
              z-20
              rounded-full
              px-4
              text-[hsl(var(--text-secondary))]
              hover:text-white
              hover:bg-[hsl(var(--card-bg))]
              focus-ring
            "
            disabled={loading}
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft
              className="w-4 h-4 mr-2"
              aria-hidden="true"
            />

            Voltar
          </Button>

          <div
            className="
              bg-[hsl(var(--card-bg))]/80
              backdrop-blur-xl
              border
              neon-border-cyan
              rounded-2xl
              p-6
              sm:p-8
              md:p-10
              shadow-2xl
            "
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{
                  scale: 0,
                  rotate: -20
                }}
                animate={{
                  scale: 1,
                  rotate: 0
                }}
                transition={{
                  delay: 0.15,
                  duration: 0.5,
                  type: 'spring',
                  stiffness: 180,
                  damping: 16
                }}
                className="
                  inline-flex
                  items-center
                  justify-center
                  w-20
                  h-20
                  bg-[hsl(var(--neon-cyan))]/20
                  rounded-2xl
                  mb-6
                  shadow-[0_0_15px_hsl(var(--neon-cyan)/0.5)]
                "
                aria-hidden="true"
              >
                <Zap
                  className="
                    w-10
                    h-10
                    text-[hsl(var(--neon-cyan))]
                  "
                />
              </motion.div>

              <h1
                className="
                  text-3xl
                  md:text-4xl
                  font-bold
                  text-[hsl(var(--text-primary))]
                  font-['Poppins']
                  mb-2
                "
              >
                Bem-vindo de Volta
              </h1>

              <p
                className="
                  text-[hsl(var(--text-secondary))]
                  font-['Inter']
                  text-sm
                  md:text-base
                  leading-relaxed
                "
              >
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {localError && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  duration: 0.25
                }}
                role="alert"
                aria-live="assertive"
                className="
                  mb-6
                  bg-[hsl(var(--destructive))]/10
                  border
                  border-[hsl(var(--destructive))]/50
                  text-[hsl(var(--destructive))]
                  px-4
                  py-3
                  rounded-lg
                  flex
                  items-start
                  gap-3
                  text-sm
                "
              >
                <AlertCircle
                  className="w-5 h-5 shrink-0 mt-0.5"
                  aria-hidden="true"
                />

                <span className="font-['Inter'] leading-relaxed">
                  {localError}
                </span>
              </motion.div>
            )}

            <InstallPrompt />

            <form
              onSubmit={handleLogin}
              className="space-y-6"
              noValidate
            >
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="
                    text-sm
                    font-medium
                    text-[hsl(var(--text-primary))]
                    font-['Inter']
                  "
                >
                  Email
                </label>

                <div className="relative">
                  <User
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      w-5
                      h-5
                      text-[hsl(var(--text-secondary))]
                      pointer-events-none
                    "
                    aria-hidden="true"
                  />

                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className={`
                      pl-10
                      bg-[hsl(var(--input-bg))]
                      border-[hsl(var(--border-dark))]
                      focus:border-[hsl(var(--neon-cyan))]
                      text-[hsl(var(--text-primary))]
                      ${
                        localError
                          ? 'border-[hsl(var(--destructive))]'
                          : ''
                      }
                    `}
                    value={email}
                    onChange={handleInputChange(setEmail)}
                    disabled={loading}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="
                    text-sm
                    font-medium
                    text-[hsl(var(--text-primary))]
                    font-['Inter']
                  "
                >
                  Senha
                </label>

                <div className="relative">
                  <Lock
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      w-5
                      h-5
                      text-[hsl(var(--text-secondary))]
                      pointer-events-none
                    "
                    aria-hidden="true"
                  />

                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={`
                      pl-10
                      bg-[hsl(var(--input-bg))]
                      border-[hsl(var(--border-dark))]
                      focus:border-[hsl(var(--neon-cyan))]
                      text-[hsl(var(--text-primary))]
                      ${
                        localError
                          ? 'border-[hsl(var(--destructive))]'
                          : ''
                      }
                    `}
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: 'Aviso',
                      description:
                        '🚧 Recurso de recuperação de senha não implementado ainda. Contate o administrador.'
                    })
                  }
                  className="
                    text-sm
                    text-[hsl(var(--neon-cyan))]
                    hover:text-[hsl(var(--neon-cyan))]/80
                    hover:underline
                    underline-offset-4
                    transition-colors
                    font-['Inter']
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[hsl(var(--neon-cyan))]
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-[hsl(var(--card-bg))]
                    rounded
                  "
                >
                  Esqueceu a senha?
                </button>
              </div>

              <Button
                type="submit"
                className="
                  w-full
                  min-h-12
                  bg-[hsl(var(--neon-cyan))]
                  hover:bg-[hsl(var(--neon-cyan))]/90
                  text-[hsl(var(--background))]
                  text-base
                  py-6
                  font-['Poppins']
                  font-bold
                  shadow-[0_0_15px_hsl(var(--neon-cyan)/0.5)]
                "
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      aria-hidden="true"
                    />

                    <span>Conectando...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn
                      className="w-5 h-5"
                      aria-hidden="true"
                    />

                    <span>Acessar</span>
                  </span>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
