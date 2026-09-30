import React from'react';
import{motion}from'framer-motion';
import{User,Printer,Church,Gamepad2,Scissors,LogOut,Zap}from'lucide-react';
import{Link,useNavigate}from'react-router-dom';
import{Helmet}from'react-helmet';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';

const modules=[
 {title:'Finanças Pessoais',description:'Gestão completa das suas finanças, metas e investimentos.',icon:User,path:'/pessoal/dashboard',requiredModule:'pessoal',colorClass:'blue',hex:'hsl(var(--neon-blue))'},
 {title:'LM Impressões',description:'Controle de serviços, estoque e clientes da lan house.',icon:Printer,path:'/lm-impressoes/dashboard',requiredModule:'lm-impressoes',colorClass:'cyan',hex:'hsl(var(--neon-cyan))'},
 {title:'Igreja',description:'Tesouraria, secretaria e gestão integrada de membros.',icon:Church,path:'/igreja',requiredModule:'igreja',colorClass:'gold',hex:'hsl(var(--neon-gold))'},
 {title:'Entretenimento',description:'Gestão de partidas, jogadores e estatísticas esportivas.',icon:Gamepad2,path:'/entretenimento/dashboard',requiredModule:'entretenimento',colorClass:'orange',hex:'hsl(var(--neon-orange))'},
 {title:'Barbearia Brothers',description:'Agenda, controle de clientes, serviços e finanças.',icon:Scissors,path:'/barbearia/dashboard',requiredModule:'barbearia',colorClass:'gold',hex:'hsl(var(--neon-gold))'}
];

export default function ModuleSelectionScreen(){
 const{signOut,canAccessModule}=useAuth();
 const navigate=useNavigate();

 const handleLogout=async()=>{await signOut();navigate('/login')};

 const containerVariants={
  hidden:{opacity:0},
  visible:{opacity:1,transition:{staggerChildren:0.1}}
 };

 const itemVariants={
  hidden:{opacity:0,y:20},
  visible:{opacity:1,y:0,transition:{duration:0.5}}
 };

 return <>
  <Helmet><title>Seleção de Módulos - SistemaPro</title></Helmet>

  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.6,ease:'easeInOut'}} className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#0F172A] px-6 py-20 md:px-10">
   <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-[#00D9FF]/5 to-[#FFD700]/5"/>
   <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-full max-w-4xl -translate-x-1/2 rounded-full bg-white/5 blur-[150px]"/>

   <div className="absolute right-4 top-4 z-50 md:right-6 md:top-6">
    <Button variant="outline" onClick={handleLogout} className="border-[#00D9FF]/50 bg-[#0F172A]/50 text-[#00D9FF] backdrop-blur transition-[background-color,border-color,color,box-shadow,transform] duration-300 hover:bg-[#00D9FF]/10 hover:text-[#00D9FF] hover:shadow-[0_0_15px_rgba(0,217,255,0.8)] hover:-translate-y-px motion-reduce:transition-none motion-reduce:transform-none">
     <LogOut className="mr-2 h-4 w-4" aria-hidden="true"/>LOG-OFF
    </Button>
   </div>

   <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.6}} className="mb-20 pt-10 text-center">
    <motion.div animate={{filter:['drop-shadow(0 0 10px rgba(0,217,255,0.5))','drop-shadow(0 0 25px rgba(0,217,255,1))','drop-shadow(0 0 10px rgba(0,217,255,0.5))'],scale:[1,1.05,1]}} transition={{repeat:Infinity,duration:2,ease:'easeInOut'}} className="mb-6 inline-flex items-center justify-center text-[#00D9FF]">
     <Zap size={64} className="fill-[#00D9FF]/20" strokeWidth={1.5} aria-hidden="true"/>
    </motion.div>

    <h1 className="mb-6 text-4xl font-bold text-[hsl(var(--text-primary))] drop-shadow-lg md:text-6xl">Selecione um Módulo</h1>
    <p className="text-xl text-[hsl(var(--text-secondary))] drop-shadow-md md:text-2xl">Escolha o sistema que deseja gerenciar</p>
   </motion.div>

   <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-3">
    {modules.filter(mod=>canAccessModule(mod.requiredModule)).map(mod=>
     <motion.div key={mod.path} variants={itemVariants} whileHover={{scale:1.02,y:-4}} whileTap={{scale:0.99}} transition={{duration:0.25,ease:'easeOut'}} className="h-full">
      <Link to={mod.path} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]" aria-label={`Acessar módulo ${mod.title}`}>
       <div className="flex h-full flex-col items-start rounded-2xl border-2 bg-[hsl(var(--card-bg))]/60 p-8 text-left backdrop-blur-xl transition-[background-color,box-shadow,transform] duration-300 hover:bg-card/80 lg:p-10" style={{borderColor:mod.hex,boxShadow:`0 0 15px ${mod.hex}`}}>
        <motion.div className="mb-8 rounded-2xl bg-background/60 p-5 transition-[box-shadow,transform] duration-300 group-hover:shadow-[0_0_25px_currentColor]" style={{color:mod.hex}} whileHover={{rotate:[0,-3,3,0]}} transition={{duration:0.4,ease:'easeInOut'}}>
         <mod.icon className="h-[64px] w-[64px] sm:h-[80px] sm:w-[80px]" aria-hidden="true"/>
        </motion.div>

        <h2 className="mb-4 text-3xl font-bold text-[hsl(var(--text-primary))]">{mod.title}</h2>
        <p className="mb-10 flex-1 text-lg text-[hsl(var(--text-secondary))]">{mod.description}</p>

        <div className="flex items-center gap-3 text-xl font-semibold transition-[gap] duration-300 group-hover:gap-4" style={{color:mod.hex}}>
         Acessar
         <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </div>
       </div>
      </Link>
     </motion.div>
    )}
   </motion.div>
  </motion.div>
 </>;
}
