import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Printer,
  Church,
  Gamepad2,
  ArrowRight,
  LogOut,
  Loader2,
  AlertCircle,
  Scissors,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';

const ModuleCard = ({
  icon: Icon,
  title,
  description,
  path,
  onNavigate,
  index
}) => {
  const handleNavigate = () => {
    onNavigate(path);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigate();
    }
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        delay: index * 0.1,
        duration: 0.4,
        ease: 'easeOut'
      }}
      whileHover={{
        scale: 1.02,
        y: -4
      }}
      whileTap={{
        scale: 0.99
      }}
      className="
        relative
        min-h-[200px]
        cursor-pointer
        rounded-xl
        p-8
        card-base
        group

        transition-[background-color,border-color,box-shadow,opacity]
        duration-300
        ease-out

        focus-visible:outline-none

        motion-reduce:transition-none
      "
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Acessar módulo ${title}`}
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-4">
          <div
            className="
              rounded-2xl
              bg-[hsl(var(--cyan-primary))]/20
              p-4

              transition-[background-color,box-shadow]
              duration-200
              ease-out

              group-hover:bg-[hsl(var(--cyan-primary))]/30
              group-hover:shadow-cyan-lg

              motion-reduce:transition-none
            "
          >
            <Icon
              className="
                h-16
                w-16
                text-[hsl(var(--cyan-primary))]
              "
              aria-hidden="true"
            />
          </div>
        </div>

        <h3
          className="
            mb-3
            text-2xl
            font-bold
            text-white
            font-['Poppins']
          "
        >
          {title}
        </h3>

        <p
          className="
            mb-4
            flex-grow
            font-['Inter']
            leading-relaxed
            text-[hsl(var(--text-secondary))]
          "
        >
          {description}
        </p>

        <div
          className="
            flex
            items-center
            gap-2
            font-['Inter']
            font-semibold
            text-[hsl(var(--cyan-primary))]

            transition-[gap,color]
            duration-200
            ease-out

            group-hover:gap-3

            motion-reduce:transition-none
          "
        >
          <span>Acessar</span>

          <ArrowRight
            className="
              h-5
              w-5
              transition-transform
              duration-200
              ease-out
              group-hover:translate-x-1
              motion-reduce:transition-none
              motion-reduce:transform-none
            "
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          rounded-lg
          bg-gradient-to-br
          from-[hsl(var(--cyan-primary))]/0
          to-[hsl(var(--cyan-primary))]/5
          opacity-0

          transition-opacity
          duration-300

          group-hover:opacity-100

          motion-reduce:transition-none
        "
        aria-hidden="true"
      />
    </motion.div>
  );
};

const MODULE_CONFIG = {
  pessoal: {
    id: 'pessoal',
    name: 'Finanças Pessoais',
    icon: User,
    title: 'Finanças Pessoais',
    description:
      'Gerencie suas finanças pessoais, investimentos, metas e acompanhe sua leitura bíblica.',
    path: '/pessoal/dashboard'
  },

  'lm-impressoes': {
    id: 'lm-impressoes',
    name: 'Lan House',
    icon: Printer,
    title: 'LM Impressões',
    description:
      'Controle completo de serviços, despesas, clientes e estoque da sua gráfica.',
    path: '/lm-impressoes/dashboard'
  },

  igreja: {
    id: 'igreja',
    name: 'Igreja',
    icon: Church,
    title: 'Igreja',
    description:
      'Sistema integrado para gestão financeira (Tesouraria) e administrativa (Secretaria) da igreja.',
    path: '/igreja'
  },

  entretenimento: {
    id: 'entretenimento',
    name: 'Entretenimento',
    icon: Gamepad2,
    title: 'Entretenimento',
    description:
      'Registre partidas, acompanhe estatísticas e gerencie contribuições de eventos esportivos.',
    path: '/entretenimento/dashboard'
  },

  barbearia: {
    id: 'barbearia',
    name: 'Barbearia',
    icon: Scissors,
    title: 'Barbearia Brothers',
    description:
      'Gerenciamento completo de clientes, serviços, produtos e agenda da barbearia.',
    path: '/barbearia/dashboard'
  }
};

const ModuleSelection = () => {
  const navigate = useNavigate();

  const {
    isAdmin,
    canAccessModule,
    loading,
    signOut
  } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-gradient-to-br
          from-[hsl(var(--cyan-primary))]
          via-[hsl(var(--dark-bg))]
          to-[hsl(var(--dark-bg))]
          px-4
          text-white
        "
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex flex-col items-center">
          <Loader2
            className="
              mb-4
              h-10
              w-10
              sm:h-12
              sm:w-12
              animate-spin
              text-[hsl(var(--cyan-primary))]
              motion-reduce:animate-none
            "
            aria-hidden="true"
          />

          <p
            className="
              text-center
              text-base
              sm:text-lg
              font-['Inter']
              text-[hsl(var(--text-secondary))]
            "
          >
            Carregando permissões...
          </p>
        </div>
      </div>
    );
  }

  const displayModuleKeys =
    Object.keys(MODULE_CONFIG).filter((modKey) =>
      canAccessModule(modKey)
    );

  return (
    <>
      <Helmet>
        <title>Seleção de Módulos</title>

        <meta
          name="description"
          content="Escolha o módulo que deseja acessar."
        />
      </Helmet>

      <div
        className="
          relative
          flex
          min-h-screen
          flex-col
          items-center
          justify-center
          overflow-hidden
          bg-gradient-to-br
          from-[hsl(var(--cyan-primary))]
          via-[hsl(var(--dark-bg))]
          to-[hsl(var(--dark-bg))]
          p-4
          text-white
          sm:p-6
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            overflow-hidden
          "
          aria-hidden="true"
        >
          <div
            className="
              absolute
              left-1/4
              top-1/4
              h-72
              w-72
              rounded-full
              bg-[hsl(var(--cyan-primary))]/10
              blur-3xl
              animate-pulse-custom
              motion-reduce:animate-none
              sm:h-96
              sm:w-96
            "
          />

          <div
            className="
              absolute
              bottom-1/4
              right-1/4
              h-72
              w-72
              rounded-full
              bg-[hsl(var(--cyan-primary))]/10
              blur-3xl
              animate-pulse-custom
              motion-reduce:animate-none
              sm:h-96
              sm:w-96
            "
            style={{
              animationDelay: '1s'
            }}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          className="
            absolute
            right-4
            top-4
            z-10
            min-h-11
            rounded-full
            px-4
            text-[hsl(var(--destructive))]
            transition-[background-color,color,box-shadow,transform]
            duration-200
            ease-out
            hover:bg-[hsl(var(--destructive))]/10
            hover:text-[hsl(var(--destructive))]/80
            hover:-translate-y-px
            focus-visible:ring-[hsl(var(--destructive))]
            motion-reduce:transition-none
            motion-reduce:transform-none
          "
          aria-label="Sair do sistema"
        >
          <LogOut
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          />

          Sair
        </Button>

        <div
          className="
            z-10
            mb-10
            mt-14
            max-w-3xl
            px-4
            text-center
            sm:mb-12
            sm:mt-12
          "
        >
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
              duration: 0.5,
              type: 'spring',
              stiffness: 180,
              damping: 16
            }}
            className="
              mb-6
              inline-flex
              h-20
              w-20
              items-center
              justify-center
              rounded-2xl
              bg-[hsl(var(--cyan-primary))]/20
              animate-glow
              motion-reduce:animate-none
            "
            aria-hidden="true"
          >
            <Zap
              className="
                h-11
                w-11
                sm:h-12
                sm:w-12
                text-[hsl(var(--cyan-primary))]
              "
            />
          </motion.div>

          <motion.h1
            initial={{
              opacity: 0,
              y: -20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.15,
              duration: 0.5
            }}
            className="
              mb-3
              text-3xl
              font-extrabold
              text-gradient-cyan
              font-['Poppins']
              sm:text-4xl
              md:text-5xl
            "
          >
            Selecione um Módulo
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
              y: -10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.3,
              duration: 0.5
            }}
            className="
              mx-auto
              max-w-2xl
              text-base
              leading-relaxed
              text-[hsl(var(--text-secondary))]
              font-['Inter']
              sm:text-lg
            "
          >
            Escolha o sistema que deseja gerenciar
          </motion.p>

          {isAdmin && (
            <motion.span
              initial={{
                opacity: 0,
                scale: 0.9
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              transition={{
                delay: 0.45,
                duration: 0.35
              }}
              className="
                mt-4
                inline-block
                rounded-full
                border
                border-[hsl(var(--cyan-primary))]/50
                bg-[hsl(var(--cyan-primary))]/20
                px-4
                py-2
                text-xs
                font-bold
                uppercase
                tracking-widest
                text-[hsl(var(--cyan-primary))]
                font-['Inter']
              "
            >
              Modo Administrador
            </motion.span>
          )}
        </div>

        {displayModuleKeys.length === 0 ? (
          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="
              z-10
              flex
              w-full
              max-w-lg
              flex-col
              items-center
              rounded-2xl
              card-base
              p-6
              text-center
              sm:p-8
            "
            role="alert"
          >
            <AlertCircle
              className="
                mb-4
                h-14
                w-14
                sm:h-16
                sm:w-16
                text-[hsl(var(--destructive))]
              "
              aria-hidden="true"
            />

            <h2
              className="
                mb-3
                text-2xl
                font-bold
                text-white
                font-['Poppins']
              "
            >
              Acesso Restrito
            </h2>

            <p
              className="
                mb-6
                font-['Inter']
                leading-relaxed
                text-[hsl(var(--text-secondary))]
              "
            >
              Nenhum módulo foi liberado para o seu perfil.
              Por favor, contate o administrador do sistema
              para configurar seus acessos.
            </p>

            <Button
              type="button"
              onClick={signOut}
              className="
                min-h-11
                px-6
                btn-destructive
              "
            >
              Voltar ao Login
            </Button>
          </motion.div>
        ) : (
          <div
            className="
              z-10
              grid
              w-full
              max-w-7xl
              grid-cols-1
              gap-6
              px-2
              sm:px-4
              md:grid-cols-2
              md:gap-8
              lg:grid-cols-3
            "
          >
            {displayModuleKeys.map(
              (modKey, index) => {
                const modConfig =
                  MODULE_CONFIG[modKey];

                if (!modConfig) {
                  return null;
                }

                return (
                  <ModuleCard
                    key={modKey}
                    {...modConfig}
                    onNavigate={handleNavigation}
                    index={index}
                  />
                );
              }
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ModuleSelection;
