import React from'react';
import{motion}from'framer-motion';
import{User,Printer,Church,Gamepad2,Scissors,LogOut,Zap,ShieldCheck}from'lucide-react';
import{Link,useNavigate}from'react-router-dom';
import{Helmet}from'react-helmet';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';

const modules=[
 {title:'Finanças Pessoais',description:'Gestão completa das suas finanças, metas e investimentos.',icon:User,path:'/pessoal/dashboard',requiredModule:'pessoal',hex:'hsl(var(--neon-blue))'},
 {title:'LM Impressões',description:'Controle de serviços, estoque e clientes da lan house.',icon:Printer,path:'/lm-impressoes/dashboard',requiredModule:'lm-impressoes',hex:'hsl(var(--neon-cyan))'},
 {title:'Igreja',description:'Tesouraria, secretaria e gestão integrada de membros.',icon:Church,path:'/igreja',requiredModule:'igreja',hex:'hsl(var(--neon-gold))'},
 {title:'Entretenimento',description:'Gestão de partidas, jogadores e estatísticas esportivas.',icon:Gamepad2,path:'/entretenimento/dashboard',requiredModule:'entretenimento',hex:'hsl(var(--neon-orange))'},
 {title:'Barbearia Brothers',description:'Agenda, controle de clientes, serviços e finanças.',icon:Scissors,path:'/barbearia/dashboard',requiredModule:'barbearia',hex:'hsl(var(--neon-gold))'}
];

const CardModulo=({mod})=>{
 const Icon=mod.icon;
 return <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} whileHover={{y:-5}} transition={{duration:.3}} className="h-full">
  <Link to={mod.path} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label={`Acessar módulo ${mod.title}`}>
   <div className="flex h-full min-h-[275px] flex-col rounded-2xl border bg-[hsl(var(--card-bg))]/80 p-6 backdrop-blur-2xl transition-all duration-300 hover:bg-white/[.04]" style={{borderColor:`color-mix(in srgb,${mod.hex} 55%,transparent)`,boxShadow:`0 18px 55px rgba(0,0,0,.25)`}}>
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border bg-black/20 transition-all duration-300 group-hover:scale-105" style={{color:mod.hex,borderColor:`color-mix(in srgb,${mod.hex} 30%,transparent)`,backgroundColor:`color-mix(in srgb,${mod.hex} 8%,transparent)`}}>
     <Icon className="h-8 w-8"/>
    </div>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.25em]" style={{color:mod.hex}}>MÓDULO</p>
    <h2 className="text-2xl font-bold tracking-tight text-white">{mod.title}</h2>
    <p className="mt-2 flex-1 text-sm leading-6 text-white/55">{mod.description}</p>
    <div className="mt-6 flex items-center gap-2 text-sm font-bold transition-all duration-300 group-hover:gap-3" style={{color:mod.hex}}>Acessar <span>→</span></div>
   </div>
  </Link>
 </motion.div>;
};

export default function ModuleSelectionScreen(){
 const{signOut,canAccessModule}=useAuth(),navigate=useNavigate();
 const handleLogout=async()=>{await signOut();navigate('/login')};
 const allowed=modules.filter(m=>canAccessModule(m.requiredModule));

 return <><Helmet><title>Seleção de Módulos - Sistema Empresarial</title></Helmet>
  <div className="relative min-h-screen overflow-hidden bg-[#070B12] px-5 py-8 text-white sm:px-8">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--neon-cyan)/.07),transparent_30%),radial-gradient(circle_at_80%_75%,hsl(var(--neon-gold)/.06),transparent_30%)]"/>
   <div className="pointer-events-none absolute inset-0 opacity-[.025] bg-[linear-gradient(hsl(var(--neon-cyan))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--neon-cyan))_1px,transparent_1px)] bg-[size:45px_45px]"/>

   <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col">
    <div className="flex items-center justify-end">
     <Button variant="outline" onClick={handleLogout} className="border-[hsl(var(--neon-cyan)/.35)] bg-white/[.02] text-[hsl(var(--neon-cyan))] backdrop-blur hover:bg-[hsl(var(--neon-cyan)/.08)] hover:text-[hsl(var(--neon-cyan))]">
      <LogOut className="mr-2 h-4 w-4"/>Sair
     </Button>
    </div>

    <motion.div initial={{opacity:0,y:-15}} animate={{opacity:1,y:0}} transition={{duration:.5}} className="flex flex-1 flex-col items-center justify-center py-10">
     <motion.div animate={{filter:['drop-shadow(0 0 8px rgba(0,217,255,.35))','drop-shadow(0 0 20px rgba(0,217,255,.75))','drop-shadow(0 0 8px rgba(0,217,255,.35))'],scale:[1,1.03,1]}} transition={{repeat:Infinity,duration:2.5,ease:'easeInOut'}} className="mb-6">
      <Zap className="h-16 w-16 fill-[hsl(var(--neon-cyan)/.12)] text-[hsl(var(--neon-cyan))]" strokeWidth={1.4}/>
     </motion.div>

     <p className="text-xs font-semibold uppercase tracking-[.35em] text-[hsl(var(--neon-cyan))]">SISTEMA EMPRESARIAL</p>
     <h1 className="mt-2 text-center text-4xl font-black tracking-tight text-white sm:text-5xl">Selecione um Módulo</h1>
     <p className="mt-3 text-center text-base text-white/55 sm:text-lg">Escolha o sistema que deseja gerenciar</p>
     <div className="mt-6 h-px w-20 bg-[hsl(var(--neon-cyan))] shadow-[0_0_12px_hsl(var(--neon-cyan)/.6)]"/>

     {allowed.length===0?
      <div className="mt-10 rounded-2xl border border-red-500/25 bg-red-500/10 p-8 text-center backdrop-blur-xl">
       <h2 className="text-xl font-bold">Acesso Restrito</h2>
       <p className="mt-2 text-sm text-white/60">Você não possui permissão para acessar nenhum módulo.</p>
      </div>
      :
      <motion.div initial="hidden" animate="visible" className="mt-10 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
       {allowed.map((mod,i)=><motion.div key={mod.path} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*.08}}><CardModulo mod={mod}/></motion.div>)}
      </motion.div>
     }

     <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-white/35">
      <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(var(--neon-cyan))]"/>Acesso seguro</span>
      <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-[hsl(var(--neon-cyan))]"/>Sistema integrado</span>
     </div>
    </motion.div>

    <p className="pb-2 text-center text-xs text-white/25">Sistema Empresarial • Gestão Integrada</p>
   </div>
  </div>
 </>;
}
