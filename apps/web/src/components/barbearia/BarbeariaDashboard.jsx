import React,{useState,useEffect}from'react';
import{motion}from'framer-motion';
import{Scissors,Users,TrendingUp,TrendingDown,Wallet,Loader2,Calendar,Award,Star,PieChart}from'lucide-react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer}from'recharts';

const currentYear=new Date().getFullYear(),currentMonth=new Date().getMonth()+1;
const months=[{value:'all',label:'Todos os Meses'},...['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((label,i)=>({value:i+1,label}))];
const years=['all',...Array.from({length:5},(_,i)=>currentYear-2+i)];

const BarbeariaDashboard=()=>{
 const{user}=useAuth();
 const[globalMonth,setGlobalMonth]=useState(currentMonth),[globalYear,setGlobalYear]=useState(currentYear),[loading,setLoading]=useState(true);
 const[stats,setStats]=useState({saldo:0,entradas:0,saidas:0,clientesUnicos:0,barbeirosStats:[],topClientes:[],chartEntradas:[],chartSaidas:[],entradasPorTipo:[]});

 const fetchData=async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[{data:cortes},{data:servicos},{data:vendas},{data:assinaturas},{data:despesas},{data:clientesDb},{data:barbeirosDb}]=await Promise.all([
    supabase.from('barbearia_lancamentos_cortes').select('data,valor,cliente_id,barbeiro_id').eq('user_id',user.id),
    supabase.from('barbearia_lancamentos_servicos').select('data,valor,cliente_id,barbeiro_id').eq('user_id',user.id),
    supabase.from('barbearia_lancamentos_vendas').select('data,valor,cliente_id').eq('user_id',user.id),
    supabase.from('barbearia_lancamentos_assinaturas').select('data_assinatura,valor,cliente_id').eq('user_id',user.id),
    supabase.from('barbearia_lancamentos_despesas').select('data,valor').eq('user_id',user.id),
    supabase.from('barbearia_clientes').select('id,nome').eq('user_id',user.id),
    supabase.from('barbearia_barbeiros').select('id,nome').eq('user_id',user.id)
   ]);

   const mapCliente=id=>clientesDb?.find(c=>c.id===id)?.nome||'Desconhecido',mapBarbeiro=id=>barbeirosDb?.find(b=>b.id===id)?.nome||'Desconhecido';
   const matchesFilter=dateStr=>{
    if(!dateStr)return false;
    const[y,m]=dateStr.split('T')[0].split('-');
    return(globalYear==='all'||Number(y)===Number(globalYear))&&(globalMonth==='all'||Number(m)===Number(globalMonth));
   };

   const fc=(cortes||[]).filter(x=>matchesFilter(x.data)),fs=(servicos||[]).filter(x=>matchesFilter(x.data)),fv=(vendas||[]).filter(x=>matchesFilter(x.data)),fa=(assinaturas||[]).filter(x=>matchesFilter(x.data_assinatura)),fd=(despesas||[]).filter(x=>matchesFilter(x.data));
   const ec=fc.reduce((a,x)=>a+Number(x.valor||0),0),es=fs.reduce((a,x)=>a+Number(x.valor||0),0),ev=fv.reduce((a,x)=>a+Number(x.valor||0),0),ea=fa.reduce((a,x)=>a+Number(x.valor||0),0);
   const entradas=ec+es+ev+ea,saidas=fd.reduce((a,x)=>a+Number(x.valor||0),0),saldo=entradas-saidas;
   const clients=new Set();[...fc,...fs,...fv,...fa].forEach(x=>x.cliente_id&&clients.add(x.cliente_id));

   const tipos=[{tipo:'Cortes',quantidade:fc.length,valor:ec},{tipo:'Serviços',quantidade:fs.length,valor:es},{tipo:'Produtos',quantidade:fv.length,valor:ev},{tipo:'Planos',quantidade:fa.length,valor:ea}];
   const bmap={};
   [...fc.map(x=>({...x,t:'c'})),...fs.map(x=>({...x,t:'s'}))].forEach(x=>{
    if(!x.barbeiro_id)return;
    if(!bmap[x.barbeiro_id])bmap[x.barbeiro_id]={id:x.barbeiro_id,valor:0,cortes:0,servicos:0};
    bmap[x.barbeiro_id].valor+=Number(x.valor||0);x.t==='c'?bmap[x.barbeiro_id].cortes++:bmap[x.barbeiro_id].servicos++;
   });
   const barbeiros=Object.values(bmap).map(b=>({...b,nome:mapBarbeiro(b.id)})).sort((a,b)=>b.valor-a.valor);

   const cmap={};[...fc,...fs,...fv,...fa].forEach(x=>{if(x.cliente_id)cmap[x.cliente_id]=(cmap[x.cliente_id]||0)+Number(x.valor||0)});
   const topClientes=Object.entries(cmap).map(([id,total])=>({nome:mapCliente(id),total})).sort((a,b)=>b.total-a.total).slice(0,5);

   const year=globalYear==='all'?currentYear:Number(globalYear),chart=Array.from({length:12},(_,i)=>({name:['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][i],Entradas:0,Despesas:0}));
   const add=(arr,key,dateField='data')=>(arr||[]).forEach(x=>{const d=x[dateField];if(!d)return;const[y,m]=d.split('T')[0].split('-');if(Number(y)===year)chart[Number(m)-1][key]+=Number(x.valor||0)});
   add(cortes,'Entradas');add(servicos,'Entradas');add(vendas,'Entradas');add(assinaturas,'Entradas','data_assinatura');add(despesas,'Despesas');

   setStats({saldo,entradas,saidas,clientesUnicos:clients.size,barbeirosStats:barbeiros,topClientes,chartEntradas:chart.map(x=>({name:x.name,total:x.Entradas})),chartSaidas:chart.map(x=>({name:x.name,total:x.Despesas})),entradasPorTipo:tipos});
  }catch(error){console.error('Dashboard error:',error)}finally{setLoading(false)}
 };

 useEffect(()=>{fetchData()},[globalMonth,globalYear,user]);

 if(loading&&!stats.entradas)return <div className="flex h-[70vh] flex-col items-center justify-center gap-4" role="status"><Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] motion-reduce:animate-none"/><p className="text-xs font-medium uppercase tracking-widest text-[#A9A9A9]">Carregando Dashboard...</p></div>;

 return <motion.main initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.4}} className="space-y-8 pb-16 motion-reduce:transform-none">
  <div className="flex flex-col gap-4 border-b border-[#D4AF37]/20 pb-6 md:flex-row md:items-center md:justify-between">
   <div className="flex items-center gap-4"><div className="rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B5952F] p-2.5 shadow-lg shadow-[#D4AF37]/20"><Scissors className="h-6 w-6 text-black"/></div><div><h1 className="text-2xl font-extrabold text-white">Visão Geral</h1><p className="mt-0.5 text-[13px] font-medium text-[#A9A9A9]">Acompanhe o desempenho da sua barbearia</p></div></div>

   <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-gray-900/80 p-2.5 shadow-xl backdrop-blur-md">
    <div className="flex items-center gap-2 border-r border-[#D4AF37]/20 pr-2 text-[#D4AF37]"><Calendar className="h-4 w-4"/><span className="text-[11px] font-bold uppercase">Filtro</span></div>
    <select value={globalMonth} onChange={e=>setGlobalMonth(e.target.value==='all'?'all':Number(e.target.value))} className="rounded-lg border border-[#D4AF37]/30 bg-black p-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#D4AF37]">{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select>
    <select value={globalYear} onChange={e=>setGlobalYear(e.target.value==='all'?'all':Number(e.target.value))} className="rounded-lg border border-[#D4AF37]/30 bg-black p-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#D4AF37]">{years.map(y=><option key={y} value={y}>{y==='all'?'Todos os Anos':y}</option>)}</select>
   </div>
  </div>

  <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
   <div className="relative flex min-h-[200px] flex-col justify-center overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6 shadow-2xl sm:p-8 xl:col-span-5">
    <Wallet className="absolute right-4 top-4 h-32 w-32 text-[#D4AF37] opacity-5" aria-hidden="true"/>
    <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#A9A9A9]">Saldo em Caixa</h2>
    <div className={`text-3xl font-bold tracking-tighter md:text-4xl ${stats.saldo>=0?'text-green-400':'text-red-400'}`}>R$ {stats.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
    <div className="mt-4 flex flex-wrap gap-4 text-[13px] font-medium"><span className="flex items-center gap-1.5 text-green-400"><TrendingUp className="h-4 w-4"/>R$ {stats.entradas.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span><span className="text-[#A9A9A9]">|</span><span className="flex items-center gap-1.5 text-red-400"><TrendingDown className="h-4 w-4"/>R$ {stats.saidas.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div>
   </div>

   <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 xl:col-span-7">
    {[
     ['Clientes',stats.clientesUnicos,'blue','atendidos no período',Users],
     ['Total Entradas',`R$ ${stats.entradas.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,'green','',TrendingUp],
     ['Total Despesas',`R$ ${stats.saidas.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,'orange','',TrendingDown]
    ].map(([title,value,color,sub,Icon])=><div key={title} className="flex flex-col items-center justify-center rounded-3xl border border-[#D4AF37]/20 bg-gray-900/80 p-5 text-center shadow-xl transition-[background-color,transform] duration-200 hover:-translate-y-1 hover:bg-gray-800/60 motion-reduce:transition-none motion-reduce:transform-none">
     <div className={`mb-4 rounded-2xl border p-3 ${color==='blue'?'border-blue-500/20 bg-blue-500/10':color==='green'?'border-green-500/20 bg-green-500/10':'border-orange-500/20 bg-orange-500/10'}`}><Icon className={`h-6 w-6 ${color==='blue'?'text-blue-400':color==='green'?'text-green-400':'text-orange-500'}`}/></div>
     <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-[#A9A9A9]">{title}</h3>
     <p className={`break-all text-2xl font-bold md:text-3xl ${color==='blue'?'text-blue-400':color==='green'?'text-green-400':'text-orange-500'}`}>{value}</p>
     {sub&&<p className="mt-1.5 text-[12px] text-[#A9A9A9]">{sub}</p>}
    </div>)}
   </div>
  </div>

  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
   <div className="overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gray-900/80 p-5 shadow-xl sm:p-6"><h3 className="mb-6 flex items-center gap-2.5 text-base font-semibold uppercase tracking-widest text-[#D4AF37]"><Star className="h-5 w-5"/>Por Barbeiro</h3><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b border-[#D4AF37]/30 text-xs uppercase tracking-wider text-[#A9A9A9]"><th className="px-3 pb-3">Barbeiro</th><th className="px-3 pb-3 text-center">Cortes</th><th className="px-3 pb-3 text-center">Serviços</th><th className="px-3 pb-3 text-right">Valor Ganho</th></tr></thead><tbody>{!stats.barbeirosStats.length?<tr><td colSpan="4" className="py-6 text-center text-[#A9A9A9]">Nenhum dado encontrado.</td></tr>:stats.barbeirosStats.map((b,idx)=><tr key={idx} className="border-b border-[#D4AF37]/10 transition-colors duration-200 hover:bg-white/5 motion-reduce:transition-none"><td className="flex items-center gap-2.5 px-3 py-4 font-medium text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-xs font-bold text-[#D4AF37]">{b.nome.charAt(0)}</span>{b.nome}</td><td className="px-3 py-4 text-center font-bold text-white">{b.cortes}</td><td className="px-3 py-4 text-center font-bold text-white">{b.servicos}</td><td className="px-3 py-4 text-right font-bold text-[#D4AF37]">R$ {b.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>)}</tbody></table></div></div>

   <div className="overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gray-900/80 p-5 shadow-xl sm:p-6"><h3 className="mb-6 flex items-center gap-2.5 text-base font-semibold uppercase tracking-widest text-green-400"><PieChart className="h-5 w-5"/>Entradas por Tipo</h3><div className="overflow-x-auto"><table className="w-full min-w-[400px] text-left text-sm"><thead><tr className="border-b border-green-500/30 text-xs uppercase tracking-wider text-[#A9A9A9]"><th className="px-3 pb-3">Tipo</th><th className="px-3 pb-3 text-center">Quantidade</th><th className="px-3 pb-3 text-right">Valor Total</th></tr></thead><tbody>{stats.entradasPorTipo.map((item,idx)=><tr key={idx} className="border-b border-green-500/10 transition-colors duration-200 hover:bg-white/5 motion-reduce:transition-none"><td className="px-3 py-5 font-semibold text-white">{item.tipo}</td><td className="px-3 py-5 text-center font-bold text-[#A9A9A9]">{item.quantidade}</td><td className="px-3 py-5 text-right font-bold text-green-400">R$ {item.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>)}</tbody></table></div></div>
  </div>

  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
   <div className="rounded-3xl border border-[#D4AF37]/20 bg-gray-900/80 p-5 shadow-xl sm:p-6"><h3 className="mb-6 font-semibold uppercase tracking-widest text-green-400">Evolução Anual - Entradas ({globalYear==='all'?currentYear:globalYear})</h3><div className="h-[280px] w-full sm:h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.chartEntradas} margin={{top:10,right:10,left:-25,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false}/><XAxis dataKey="name" stroke="#A9A9A9" axisLine={false} tickLine={false} fontSize={11}/><YAxis stroke="#A9A9A9" axisLine={false} tickLine={false} tickFormatter={v=>`R$${v}`} fontSize={11}/><RechartsTooltip contentStyle={{backgroundColor:'#000',border:'1px solid #22c55e',borderRadius:'12px',fontSize:'12px'}} itemStyle={{color:'#22c55e',fontWeight:'bold'}} formatter={v=>`R$ ${Number(v).toFixed(2)}`}/><Bar dataKey="total" name="Entradas R$" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40}/></BarChart></ResponsiveContainer></div></div>

   <div className="overflow-x-auto rounded-3xl border border-[#D4AF37]/20 bg-gray-900/80 p-5 shadow-xl sm:p-6"><h3 className="mb-6 flex items-center gap-2 font-semibold uppercase tracking-widest text-[#D4AF37]"><Award className="h-5 w-5"/>Melhores Clientes do Período</h3><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b border-[#D4AF37]/20 text-xs uppercase text-[#A9A9A9]"><th className="pb-3">Posição</th><th className="pb-3">Cliente</th><th className="pb-3 text-right">Valor Gasto</th></tr></thead><tbody>{!stats.topClientes.length?<tr><td colSpan="3" className="py-6 text-center text-[#A9A9A9]">Sem dados.</td></tr>:stats.topClientes.map((c,i)=><tr key={i} className="border-b border-[#D4AF37]/10 transition-colors duration-200 hover:bg-white/5 motion-reduce:transition-none"><td className="py-4 font-bold text-[#D4AF37]">#{i+1}</td><td className="py-4 font-medium text-white">{c.nome}</td><td className="py-4 text-right font-bold text-green-400">R$ {c.total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>)}</tbody></table></div>
  </div>
 </motion.main>
};

export default BarbeariaDashboard;
