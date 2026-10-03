import React,{useState,useEffect}from'react';
import{useNavigate}from'react-router-dom';
import{motion}from'framer-motion';
import{Helmet}from'react-helmet';
import{
 User,
 Lock,
 ArrowLeft,
 LogIn,
 Loader2,
 AlertCircle,
 BarChart3,
 Users,
 Church,
 Printer,
 ShieldCheck,
 Cloud,
 Zap
}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{useToast}from'@/components/ui/use-toast';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{clearAuthTokens}from'@/lib/tokenUtils';
import InstallPrompt from'@/components/InstallPrompt';

const Login=()=>{
 const navigate=useNavigate();
 const{toast}=useToast();
 const{signIn,user,loading:authLoading}=useAuth();

 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[loading,setLoading]=useState(false);
 const[localError,setLocalError]=useState('');

 useEffect(()=>{
  if(!authLoading&&user)navigate('/modules');
 },[user,authLoading,navigate]);

 const validateForm=()=>{
  setLocalError('');

  if(!email||!password){
   setLocalError('Preencha todos os campos.');
   return false;
  }

  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if(!emailRegex.test(email)){
   setLocalError('Formato de e-mail inválido.');
   return false;
  }

  if(password.length<6){
   setLocalError('A senha deve ter pelo menos 6 caracteres.');
   return false;
  }

  return true;
 };

 const handleLogin=async e=>{
  e.preventDefault();

  if(!validateForm())return;

  setLoading(true);
  setLocalError('');

  try{
   const{error:signOutError}=await supabase.auth.signOut();

   if(signOutError){
    console.warn('Limpando sessão anterior...');
   }

   clearAuthTokens();

   const{error}=await signIn(email,password);

   if(error){
    console.error('Login result error:',error);

    const errorMessage=error.message||'Erro ao realizar login.';

    setLocalError(errorMessage);
    setPassword('');

    toast({
     title:'Falha na Autenticação',
     description:errorMessage,
     variant:'destructive'
    });
   }else{
    toast({
     title:'Autenticação concluída!',
     description:'Bem-vindo de volta ao sistema!',
     className:'bg-[hsl(var(--success))] text-white'
    });
   }
  }catch(err){
   console.error('Unexpected login error:',err);

   setPassword('');
   clearAuthTokens();

   setLocalError(
    'Ocorreu um erro crítico no servidor. Tente novamente mais tarde.'
   );
  }finally{
   setLoading(false);
  }
 };

 const handleInputChange=setter=>e=>{
  setter(e.target.value);

  if(localError)setLocalError('');
 };

 const modules=[
  {
   icon:BarChart3,
   title:'Financeiro',
   description:'Entradas, saídas e relatórios',
   color:'green'
  },
  {
   icon:Users,
   title:'Pessoal',
   description:'Controle pessoal e planejamento',
   color:'blue'
  },
  {
   icon:Church,
   title:'Igreja',
   description:'Gestão eclesiástica completa',
   color:'gold'
  },
  {
   icon:Printer,
   title:'LM Impressões',
   description:'Pedidos, clientes e produção',
   color:'purple'
  }
 ];

 const colors={
  green:'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  blue:'text-blue-400 bg-blue-400/10 border-blue-400/20',
  gold:'text-amber-400 bg-amber-400/10 border-amber-400/20',
  purple:'text-violet-400 bg-violet-400/10 border-violet-400/20'
 };

 return(
  <>
   <Helmet>
    <title>Sistema Empresarial | Acesso</title>
    <meta
     name="description"
     content="Acesse o Sistema Empresarial"
    />
   </Helmet>

   <div className="
    min-h-screen
    bg-[#070B12]
    text-[hsl(var(--text-primary))]
    relative
    overflow-hidden
   ">

    <div
     className="
      absolute inset-0 pointer-events-none
      bg-[radial-gradient(circle_at_20%_30%,hsl(var(--neon-cyan)/.08),transparent_35%),radial-gradient(circle_at_80%_70%,hsl(var(--neon-cyan)/.05),transparent_35%)]
     "
     aria-hidden="true"
    />

    <div
     className="
      absolute inset-0 pointer-events-none opacity-[.035]
      bg-[linear-gradient(hsl(var(--neon-cyan))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--neon-cyan))_1px,transparent_1px)]
      bg-[size:45px_45px]
     "
     aria-hidden="true"
    />

    <Button
     variant="ghost"
     onClick={()=>navigate('/')}
     disabled={loading}
     className="
      absolute top-5 left-5 z-30
      text-[hsl(var(--text-secondary))]
      hover:text-white
      hover:bg-white/5
     "
     aria-label="Voltar para a página inicial"
    >
     <ArrowLeft className="mr-2 h-4 w-4"/>
     Voltar para início
    </Button>

    <div className="
     absolute top-5 right-6 z-30
     hidden sm:flex items-center gap-3
     text-sm text-[hsl(var(--text-secondary))]
    ">
     <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-cyan))] shadow-[0_0_10px_hsl(var(--neon-cyan))]"/>
     Sistema Empresarial
    </div>

    <div className="
     relative z-10
     min-h-screen
     w-full
     max-w-[1500px]
     mx-auto
     px-5 py-20
     lg:px-12
     flex items-center
    ">

     <div className="
      w-full
      grid
      lg:grid-cols-[1fr_500px]
      xl:grid-cols-[1fr_540px]
      gap-12
      lg:gap-20
      items-center
     ">

      <motion.div
       initial={{opacity:0,x:-25}}
       animate={{opacity:1,x:0}}
       transition={{duration:.5}}
       className="hidden lg:block"
      >

       <div className="max-w-2xl">

        <div className="flex items-center gap-5 mb-8">
         <div className="
          flex h-20 w-20
          items-center justify-center
          rounded-2xl
          border border-[hsl(var(--neon-cyan))]/30
          bg-[hsl(var(--neon-cyan))]/10
          shadow-[0_0_30px_hsl(var(--neon-cyan)/.15)]
         ">
          <BarChart3 className="
           h-11 w-11
           text-[hsl(var(--neon-cyan))]
          "/>
         </div>

         <div>
          <p className="
           text-sm uppercase
           tracking-[.3em]
           text-[hsl(var(--neon-cyan))]
           font-semibold
          ">
           SISTEMA
          </p>

          <h1 className="
           text-4xl xl:text-5xl
           font-black
           tracking-tight
          ">
           EMPRESARIAL
          </h1>
         </div>
        </div>

        <h2 className="
         text-3xl xl:text-4xl
         font-bold
         leading-tight
         mb-4
        ">
         Gestão integrada
         <span className="text-[hsl(var(--neon-cyan))]">
          {' '}em um só lugar.
         </span>
        </h2>

        <p className="
         max-w-xl
         text-base xl:text-lg
         leading-relaxed
         text-[hsl(var(--text-secondary))]
        ">
         Organize, controle e acompanhe as principais áreas
         da sua gestão através de uma única plataforma.
        </p>

        <div className="
         h-px w-24
         bg-[hsl(var(--neon-cyan))]
         shadow-[0_0_12px_hsl(var(--neon-cyan))]
         my-8
        "/>

        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">

         {modules.map((item,i)=>{
          const Icon=item.icon;

          return(
           <motion.div
            key={item.title}
            initial={{opacity:0,y:12}}
            animate={{opacity:1,y:0}}
            transition={{delay:.15+i*.07,duration:.35}}
            className="
             group
             rounded-xl
             border border-white/10
             bg-white/[.025]
             p-4
             backdrop-blur-sm
             transition-all
             hover:border-[hsl(var(--neon-cyan))]/25
             hover:bg-white/[.045]
            "
           >
            <div className="flex items-center gap-3">

             <div className={`
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl border
              ${colors[item.color]}
             `}>
              <Icon className="h-5 w-5"/>
             </div>

             <div>
              <p className="font-semibold">
               {item.title}
              </p>

              <p className="
               text-xs
               text-[hsl(var(--text-secondary))]
               mt-0.5
              ">
               {item.description}
              </p>
             </div>

            </div>
           </motion.div>
          );
         })}

        </div>

        <div className="
         flex flex-wrap
         gap-8
         mt-9
         pt-6
         border-t border-white/10
        ">

         <div className="flex items-center gap-2">
          <ShieldCheck className="
           h-5 w-5
           text-[hsl(var(--neon-cyan))]
          "/>
          <span className="text-sm text-[hsl(var(--text-secondary))]">
           Seus dados protegidos
          </span>
         </div>

         <div className="flex items-center gap-2">
          <Cloud className="
           h-5 w-5
           text-[hsl(var(--neon-cyan))]
          "/>
          <span className="text-sm text-[hsl(var(--text-secondary))]">
           Acesso em qualquer lugar
          </span>
         </div>

         <div className="flex items-center gap-2">
          <Zap className="
           h-5 w-5
           text-[hsl(var(--neon-cyan))]
          "/>
          <span className="text-sm text-[hsl(var(--text-secondary))]">
           Sistema rápido e confiável
          </span>
         </div>

        </div>

        <p className="
         mt-10
         text-xs
         text-[hsl(var(--text-secondary))]
         opacity-60
        ">
         Sistema Empresarial • Acesso seguro
        </p>

       </div>
      </motion.div>

      <motion.div
       initial={{opacity:0,y:20,scale:.98}}
       animate={{opacity:1,y:0,scale:1}}
       transition={{duration:.45,ease:'easeOut'}}
       className="w-full"
      >

       <div className="
        rounded-2xl
        border border-white/10
        bg-[hsl(var(--card-bg))]/90
        backdrop-blur-2xl
        p-6 sm:p-8 md:p-10
        shadow-[0_25px_80px_rgba(0,0,0,.45)]
       ">

        <div className="text-center mb-8">

         <motion.div
          initial={{scale:.7,opacity:0}}
          animate={{scale:1,opacity:1}}
          transition={{delay:.1,duration:.4}}
          className="
           mx-auto
           flex h-20 w-20
           items-center justify-center
           rounded-2xl
           border border-[hsl(var(--neon-cyan))]/30
           bg-[hsl(var(--neon-cyan))]/10
           shadow-[0_0_30px_hsl(var(--neon-cyan)/.18)]
           mb-5
          "
         >
          <BarChart3 className="
           h-10 w-10
           text-[hsl(var(--neon-cyan))]
          "/>
         </motion.div>

         <h2 className="
          text-2xl sm:text-3xl
          font-bold
          font-['Poppins']
         ">
          Sistema Empresarial
         </h2>

         <p className="
          mt-2
          text-sm
          text-[hsl(var(--text-secondary))]
         ">
          Acesse sua conta para continuar
         </p>

        </div>

        {localError&&(
         <motion.div
          initial={{opacity:0,y:-8}}
          animate={{opacity:1,y:0}}
          role="alert"
          aria-live="assertive"
          className="
           mb-6
           rounded-lg
           border border-[hsl(var(--destructive))]/50
           bg-[hsl(var(--destructive))]/10
           px-4 py-3
           flex items-start gap-3
           text-sm
           text-[hsl(var(--destructive))]
          "
         >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
          <span className="leading-relaxed">
           {localError}
          </span>
         </motion.div>
        )}

        <InstallPrompt/>

        <form
         onSubmit={handleLogin}
         className="space-y-5"
         noValidate
        >

         <div className="space-y-2">

          <label
           htmlFor="email"
           className="
            text-sm font-medium
            text-[hsl(var(--text-primary))]
           "
          >
           E-mail
          </label>

          <div className="relative">

           <User className="
            absolute left-3 top-1/2
            -translate-y-1/2
            h-5 w-5
            text-[hsl(var(--text-secondary))]
            pointer-events-none
           "/>

           <Input
            id="email"
            type="email"
            placeholder="Digite seu e-mail"
            className="
             h-12 pl-11
             bg-[hsl(var(--input-bg))]
             border-[hsl(var(--border-dark))]
             focus:border-[hsl(var(--neon-cyan))]
             focus:ring-[hsl(var(--neon-cyan))]/20
             text-[hsl(var(--text-primary))]
            "
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
            text-sm font-medium
            text-[hsl(var(--text-primary))]
           "
          >
           Senha
          </label>

          <div className="relative">

           <Lock className="
            absolute left-3 top-1/2
            -translate-y-1/2
            h-5 w-5
            text-[hsl(var(--text-secondary))]
            pointer-events-none
           "/>

           <Input
            id="password"
            type="password"
            placeholder="Digite sua senha"
            className="
             h-12 pl-11
             bg-[hsl(var(--input-bg))]
             border-[hsl(var(--border-dark))]
             focus:border-[hsl(var(--neon-cyan))]
             focus:ring-[hsl(var(--neon-cyan))]/20
             text-[hsl(var(--text-primary))]
            "
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
           onClick={()=>
            toast({
             title:'Aviso',
             description:'🚧 Recurso de recuperação de senha não implementado ainda. Contate o administrador.'
            })
           }
           className="
            text-sm
            text-[hsl(var(--neon-cyan))]
            hover:underline
            underline-offset-4
            transition-colors
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
           font-bold
           shadow-[0_0_20px_hsl(var(--neon-cyan)/.3)]
           transition-all
           hover:shadow-[0_0_28px_hsl(var(--neon-cyan)/.45)]
          "
          disabled={loading}
          aria-busy={loading}
         >
          {loading?(
           <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin"/>
            Conectando...
           </span>
          ):(
           <span className="flex items-center gap-2">
            <LogIn className="h-5 w-5"/>
            Acessar
           </span>
          )}
         </Button>

        </form>

        <div className="
         mt-8
         flex items-center gap-3
         text-xs
         text-[hsl(var(--text-secondary))]
        ">
         <div className="h-px flex-1 bg-white/10"/>
         <span>Acesso seguro</span>
         <div className="h-px flex-1 bg-white/10"/>
        </div>

        <div className="
         mt-5
         flex items-center justify-center gap-2
         text-xs
         text-[hsl(var(--text-secondary))]
        ">
         <ShieldCheck className="
          h-4 w-4
          text-[hsl(var(--neon-cyan))]
         "/>
         Ambiente protegido
        </div>

       </div>

       <p className="
        mt-5
        text-center
        text-xs
        text-[hsl(var(--text-secondary))]
        opacity-50
       ">
        Sistema Empresarial
       </p>

      </motion.div>

     </div>
    </div>
   </div>
  </>
 );
};

export default Login;
