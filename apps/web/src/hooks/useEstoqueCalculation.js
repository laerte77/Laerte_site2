import{useState,useEffect,useCallback,useRef}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const dateKey=v=>String(v||'').slice(0,10);
const isReposicaoFolha=v=>/reposi.{0,8}de folha/i.test(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));

export function useEstoqueCalculation(){
 const{user}=useAuth();
 const[stockData,setStockData]=useState({});
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);
 const[lastUpdate,setLastUpdate]=useState(null);
 const[lastMovement,setLastMovement]=useState(null);
 const mounted=useRef(true);

 const fetchAllData=useCallback(async()=>{
  if(!user){setStockData({});setLoading(false);return}
  setLoading(true);setError(null);
  try{
   const[a,b,c,d,e,f]=await Promise.all([
    supabase.from('lm_estoques_inicial').select('produto,quantidade_inicial,insumo_id,data_inventario,unidade').eq('user_id',user.id),
    supabase.from('lm_lanc_despesas').select('data,tipo_lancamento,tipo_folha,quantidade,insumo_id,lm_despesas(despesa)').eq('user_id',user.id).eq('tipo_lancamento','Estoque').not('quantidade','is',null),
    supabase.from('lm_lanc_servicos').select('data,folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null),
    supabase.from('lm_insumos').select('id,nome,unidade,estoque_minimo,ativo').eq('user_id',user.id),
    supabase.from('lm_tipos_folha').select('tipo_folha,insumo_id').eq('user_id',user.id),
    supabase.from('lm_folhas').select('data,tipo_folha,tipo_movimento,quantidade,insumo_id').eq('user_id',user.id)
   ]);
   for(const r of[a,b,c,d,e,f])if(r.error)throw r.error;

   const bases=a.data||[],despesas=b.data||[],servicos=c.data||[],insumos=d.data||[],tipos=e.data||[],movimentos=f.data||[];
   const insumoPorId=new Map(insumos.map(i=>[String(i.id),i]));
   const idPorNome=new Map(insumos.map(i=>[norm(i.nome),String(i.id)]));
   const folhaPorInsumo=new Map(),idPorFolha=new Map();

   tipos.forEach(t=>{
    if(t.insumo_id){
     const id=String(t.insumo_id);
     if(!folhaPorInsumo.has(id))folhaPorInsumo.set(id,t.tipo_folha);
     idPorFolha.set(norm(t.tipo_folha),id);
    }else if(idPorNome.has(norm(t.tipo_folha))){
     idPorFolha.set(norm(t.tipo_folha),idPorNome.get(norm(t.tipo_folha)));
    }
   });

   const resolveId=(id,name)=>{
    if(id&&insumoPorId.has(String(id)))return String(id);
    return idPorFolha.get(norm(name))||idPorNome.get(norm(name))||null;
   };
   const keyFor=(id,name)=>{
    const iid=resolveId(id,name);
    return iid?`I:${iid}`:`N:${norm(name)}`;
   };
   const rows={},basePorChave=new Map();

   const ensure=(id,name,unit)=>{
    const iid=resolveId(id,name),ins=iid?insumoPorId.get(iid):null;
    const key=iid?`I:${iid}`:`N:${norm(name)}`;
    if(!norm(name)&&!ins)return null;
    if(!rows[key]){
     const display=ins?.nome||name||'Insumo';
     rows[key]={
      insumo_id:iid,tipo_folha:folhaPorInsumo.get(iid)||display,
      nomeInsumo:ins?.nome||display,unidade:ins?.unidade||unit||'unidade',
      estoque_minimo:ins?.estoque_minimo??null,
      baseline:0,reposicoes:0,entradas:0,saidas:0,perdas:0,folhasGastas:0,estoqueAtual:0,variacao:0
     };
    }
    return rows[key];
   };

   // Todos os insumos aparecem, mesmo quando ainda possuem saldo zero.
   insumos.forEach(i=>ensure(i.id,i.nome,i.unidade));

   // Para cada insumo, utiliza a referência de inventário mais recente.
   bases.forEach(x=>{
    const row=ensure(x.insumo_id,x.produto,x.unidade);
    if(!row)return;
    const key=keyFor(x.insumo_id,x.produto),date=dateKey(x.data_inventario);
    const prev=basePorChave.get(key);
    if(!prev||date>=dateKey(prev.date)){
     basePorChave.set(key,{quantity:Number(x.quantidade_inicial)||0,date});
    }
   });
   basePorChave.forEach((v,key)=>{
    if(rows[key])rows[key].baseline=v.quantity;
   });

   const afterBase=(key,date)=>{
    const base=basePorChave.get(key)?.date;
    return !base||!date||dateKey(date)>=base;
   };
   let latest=null;
   const track=d=>{if(d&&(!latest||dateKey(d)>dateKey(latest)))latest=d};

   movimentos.forEach(x=>{
    const row=ensure(x.insumo_id,x.tipo_folha);
    if(!row)return;
    const key=keyFor(x.insumo_id,x.tipo_folha);
    if(!afterBase(key,x.data))return;
    const n=Number(x.quantidade)||0,type=norm(x.tipo_movimento);
    if(n<=0)return;
    if(type==='ENTRADA')row.entradas+=n;
    else if(type==='SAIDA')row.saidas+=n;
    else if(type==='PERDA')row.perdas+=n;
    track(x.data);
   });

   despesas.forEach(x=>{
    if(Number(x.quantidade)<=0)return;
    const desc=x.lm_despesas?.despesa;
    const name=x.insumo_id?insumoPorId.get(String(x.insumo_id))?.nome:
     (isReposicaoFolha(desc)?x.tipo_folha:(x.tipo_folha||desc));
    const row=ensure(x.insumo_id,name);
    if(!row)return;
    const key=keyFor(x.insumo_id,name);
    if(!afterBase(key,x.data))return;
    row.reposicoes+=Number(x.quantidade)||0;
    track(x.data);
   });

   servicos.forEach(x=>{
    if(!Array.isArray(x.folhas_gastas))return;
    x.folhas_gastas.forEach(f=>{
     if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
     const id=resolveId(null,f.tipo_folha);
     const row=ensure(id,f.tipo_folha);
     if(!row)return;
     const key=keyFor(id,f.tipo_folha);
     if(!afterBase(key,x.data))return;
     row.folhasGastas+=Number(f.quantidade)||0;
     track(x.data);
    });
   });

   Object.values(rows).forEach(x=>{
    x.estoqueAtual=x.baseline+x.reposicoes+x.entradas-x.saidas-x.perdas-x.folhasGastas;
    x.variacao=x.estoqueAtual-x.baseline;
   });

   const output={};
   Object.values(rows).forEach(x=>{
    // Mantém a chave usada pelo consumo de folhas dos serviços.
    output[String(x.tipo_folha||x.nomeInsumo).toUpperCase().trim()]=x;
   });

   if(!mounted.current)return;
   setStockData(output);
   setLastUpdate(new Date());
   setLastMovement(latest);
  }catch(e){
   console.error('Erro ao calcular estoque:',e);
   if(mounted.current)setError(e.message||'Não foi possível calcular o estoque.');
  }finally{if(mounted.current)setLoading(false)}
 },[user]);

 useEffect(()=>{
  mounted.current=true;
  fetchAllData();
  if(!user)return()=>{mounted.current=false};
  const channel=supabase.channel(`stock-updates-${user.id}`);
  ['lm_estoques_inicial','lm_lanc_despesas','lm_lanc_servicos','lm_tipos_folha','lm_insumos','lm_folhas'].forEach(table=>{
   channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`user_id=eq.${user.id}`},fetchAllData);
  });
  channel.subscribe();
  return()=>{mounted.current=false;supabase.removeChannel(channel)};
 },[user,fetchAllData]);

 return{stockData,loading,isLoading:loading,error,refresh:fetchAllData,lastUpdate,lastMovement};
}
