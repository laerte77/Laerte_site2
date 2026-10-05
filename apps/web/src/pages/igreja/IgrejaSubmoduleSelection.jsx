import React from'react';
import{useNavigate}from'react-router-dom';
import{motion}from'framer-motion';
import{Helmet}from'react-helmet';
import{DollarSign,BookUser,ArrowLeft,AlertCircle,LogOut,ShieldCheck,Zap,BarChart3}from'lucide-react';
import{Button}from'@/components/ui/button';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const GOLD='#FFD700',CYAN='hsl(var(--neon-cyan))';

const CardModulo=({icon:Icon,title,description,path})=>{
 const navigate=useNavigate();
 return <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} whileHover={{y:-5}} transition={{duration:.3}} onClick={()=>navigate(path)} className="group cursor-pointer rounded-2xl border border-white/10 bg-[hsl(var(--card-bg))]/80 p-7 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] transition-all duration-300 hover:border-[#FFD700]/50 hover:bg-white/[.05] hover:shadow-[0_20px_70px_rgba(0,0,0,.45)]">
  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/10 shadow-[0_0_25px_rgba(255,215,0,.08)] transition-all duration-300 group-hover:border-[#FFD700]/50 group-hover:bg-[#FFD700]/15 group-hover:shadow-[0_0_30px_rgba(255,215,0,.15)]">
   <Icon className="h-8 w-8" style={{color:GOLD}}/>
  </div>
  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.25em]" style={{color:GOLD}}>IGREJA</p>
  <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
  <p className="mt-2 min-h-[48px] text-sm leading-6 text-white/60">{description}</p>
  <div className="mt-7 flex items-center gap-2 text-sm font-bold transition-all group-hover:gap-3" style={{color:GOLD}}>Acessar <span>→</span></div>
 </motion.div>
};

export default function IgrejaSubmoduleSelection(){
 const navigate=useNavigate();
 const{canAccessModule,signOut}=useAuth();

 const logout=async()=>{await signOut();navigate('/login')};

 const mods=[
  {id:'igreja:tesouraria',icon:DollarSign,title:'Tesouraria',description:'Gestão financeira, controle de entradas, saídas e dízimos.',path:'/igreja/tesouraria'},
  {id:'igreja:secretaria',icon:BookUser,title:'Secretaria',description:'Administração de membros, funções, conjuntos e relatórios.',path:'/igreja/secretaria'}
 ];

 const allowed=mods.filter(x=>canAccessModule(x.id));

 return <><Helmet><title>IgREJA | Seleção</title><meta name="description" content="Selecione a área do módulo Igreja."/></Helmet>
  <div className="relative min-h-screen overflow-hidden bg-[#070B12] px-5 py-8 text-white sm:px-8">
   <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--neon-cyan)/.07),transparent_30%),radial-gradient(circle_at_80%_75%,rgba(255,215,0,.06),transparent_32%)]"/>
   <div className="pointer-events-none absolute inset-0 opacity-[.025] bg-[linear-gradient(hsl(var(--neon-cyan))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--neon-cyan))_1px,transparent_1px)] bg-[size:45px_45px]"/>

   <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
    <div className="flex items-center justify-between">
     <Button variant="ghost" onClick={()=>navigate('/modules')} className="text-white/60 hover:bg-white/5 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar para início</Button>
     <div className="hidden items-center gap-2 text-xs text-white/40 sm:flex"><span className="h-2 w-2 rounded-full shadow-[0_0_10px_rgba(255,215,0,.8)]" style={{background:GOLD}}/>Sistema Empresarial</div>
     <Button variant="outline" onClick={logout} className="border-[#FFD700]/40 bg-white/[.02] text-[#FFD700] backdrop-blur hover:bg-[#FFD700]/10 hover:text-[#FFD700]"><LogOut className="mr-2 h-4 w-4"/>Sair</Button>
    </div>

    <motion.div initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} transition={{duration:.5}} className="flex flex-1 flex-col items-center justify-center py-12">
     <motion.div animate={{filter:['drop-shadow(0 0 8px rgba(255,215,0,.35))','drop-shadow(0 0 20px rgba(255,215,0,.75))','drop-shadow(0 0 8px rgba(255,215,0,.35))'],scale:[1,1.03,1]}} transition={{repeat:Infinity,duration:2.5,ease:'easeInOut'}} className="mb-6">
      <img src="https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/3b5702f81875d539ff0ae6db77553b0a.png" alt="Ministério Plantar" className="h-20 w-20 object-contain sm:h-24 sm:w-24"/>
     </motion.div>

     <p className="text-xs font-semibold uppercase tracking-[.35em]" style={{color:GOLD}}>MÓDULO</p>
     <h1 className="mt-2 text-center text-4xl font-black tracking-tight text-white sm:text-5xl">Igreja</h1>
     <p className="mt-3 text-center text-base text-white/55 sm:text-lg">Selecione a área que deseja gerenciar</p>
     <div className="mt-6 h-px w-20 shadow-[0_0_12px_rgba(255,215,0,.6)]" style={{background:GOLD}}/>

     {allowed.length===0?
      <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} className="mt-10 w-full max-w-lg rounded-2xl border border-red-500/25 bg-red-500/10 p-8 text-center backdrop-blur-xl">
       <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400"/>
       <h2 className="text-xl font-bold">Acesso Restrito</h2>
       <p className="mt-2 text-sm leading-6 text-red-100/70">Você não possui permissão para acessar Tesouraria ou Secretaria.</p>
       <Button onClick={()=>navigate('/modules')} variant="outline" className="mt-6 border-red-500/40 text-red-300 hover:bg-red-500/10">Voltar</Button>
      </motion.div>
     :
      <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
       {allowed.map((mod,i)=><motion.div key={mod.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*.1}}><CardModulo {...mod}/></motion.div>)}
      </div>
     }

     <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
      <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{color:CYAN}}/>Acesso seguro</span>
      <span className="flex items-center gap-2"><Zap className="h-4 w-4" style={{color:CYAN}}/>Sistema integrado</span>
      <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{color:GOLD}}/>Gestão centralizada</span>
     </div>
    </motion.div>

    <p className="pb-2 text-center text-xs text-white/25">Sistema Empresarial • Módulo Igreja</p>
   </div>
  </div>
 </>;
}
