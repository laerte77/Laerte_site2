import React,{useEffect,useState}from'react';
import{motion}from'framer-motion';
import{Banknote,Loader2,AlertCircle}from'lucide-react';
import{getAccessibleDataQuery}from'@/lib/dataAccessUtils';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import NeonBorder from'@/components/ui/NeonBorder';
import AnimatedCounter from'@/components/ui/AnimatedCounter';

const SaldoEmCaixaGeral=({selectedMonth,selectedYear})=>{
 const{user,isAdmin}=useAuth();
 const[loading,setLoading]=useState(true),[error,setError]=useState(null),[saldo,setSaldo]=useState(0);

 useEffect(()=>{
  const fetchAllData=async()=>{
   if(!user)return;
   setLoading(true);setError(null);
   try{
    const[servicosRes,despesasRes,dizimosRes]=await Promise.all([
     getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_servicos','valor'),
     getAccessibleDataQuery(user.id,isAdmin,'lm_lanc_despesas','valor'),
     getAccessibleDataQuery(user.id,isAdmin,'lm_dizimos_ofertas','valor')
    ]);
    if(servicosRes.error)throw new Error(`Serviços: ${servicosRes.error.message}`);
    if(despesasRes.error)throw new Error(`Despesas: ${despesasRes.error.message}`);
    if(dizimosRes.error)throw new Error(`Dízimos/Ofertas: ${dizimosRes.error.message}`);
    const soma=a=>(a||[]).reduce((acc,curr)=>acc+parseFloat(curr.valor||0),0);
    setSaldo(soma(servicosRes.data)-soma(despesasRes.data)-soma(dizimosRes.data));
   }catch(err){
    console.error('Error fetching accumulated balance:',err);
    setError(err.message);
   }finally{setLoading(false);}
  };
  fetchAllData();
 },[user,isAdmin]);

 const isPositive=saldo>=0;
 const colorClass=isPositive?'from-blue-500 to-cyan-400':'from-red-500 to-red-400';
 const valueColorClass=isPositive?'text-blue-500':'text-red-500';

 if(loading&&saldo===0)return <NeonBorder neonColor="lanhouse" className="h-full"><div className="flex h-full min-h-[140px] items-center justify-center rounded-xl p-6" role="status" aria-live="polite"><Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--neon-lanhouse))] motion-reduce:animate-none"/></div></NeonBorder>;

 if(error)return <NeonBorder neonColor="lanhouse" className="h-full"><div className="flex h-full min-h-[140px] items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-6" role="alert"><AlertCircle className="h-8 w-8 shrink-0 text-red-500"/><div className="flex flex-col"><p className="mb-1 text-sm font-semibold uppercase tracking-wider text-red-500">Erro ao carregar saldo</p><p className="text-xs text-red-500/80">{error}</p></div></div></NeonBorder>;

 return <NeonBorder neonColor="lanhouse" className="h-full">
  <motion.div whileHover={{y:-4}} className="relative flex h-full min-h-[140px] flex-col justify-center overflow-hidden p-5 md:p-6">
   <div className={`pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br ${colorClass} opacity-10 blur-2xl`}/>
   <div className="flex items-center gap-3 md:gap-4">
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass} shadow-lg md:h-16 md:w-16`}><Banknote className="h-7 w-7 text-emerald-300 drop-shadow-sm md:h-8 md:w-8"/></div>
    <div className="min-w-0 flex flex-col">
     <p className="mb-0.5 text-[13px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground md:text-[16px]">Saldo em Caixa Geral</p>
     <p className={`text-[28px] font-bold leading-none tracking-tight md:text-[40px] ${valueColorClass}`}><AnimatedCounter value={saldo} format={v=>`R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`}/></p>
     <p className="mt-1 text-[11px] font-medium text-muted-foreground md:text-[14px]">Acumulado (Todos os períodos)</p>
    </div>
   </div>
  </motion.div>
 </NeonBorder>
};

export default SaldoEmCaixaGeral;
