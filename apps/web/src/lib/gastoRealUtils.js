import{startOfMonth,endOfMonth,format,parseISO,isSameMonth,isSameYear}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;

export const normalizeString=str=>{
 if(!str||typeof str!=='string')return'';
 return str
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s]/g,'')
  .replace(/\s+/g,' ')
  .trim();
};

export const calculateGastoReal=async(userId,date,type,description=null)=>{
 if(!userId||!date||!type)return 0;

 try{
  const dateObj=typeof date==='string'?parseISO(date):date;
  const start=format(startOfMonth(dateObj),'yyyy-MM-dd');
  const end=format(endOfMonth(dateObj),'yyyy-MM-dd');

  const query=type==='lanhouse'
   ?supabase
    .from('lm_lanc_despesas')
    .select('valor,lm_despesas!inner(despesa)')
    .eq('user_id',userId)
    .gte('data',start)
    .lte('data',end)
   :supabase
    .from('despesas')
    .select('valor,despesa,categoria')
    .eq('user_id',userId)
    .gte('data',start)
    .lte('data',end);

  const{data,error}=await query;
  if(error)throw error;
  if(!data?.length)return 0;

  const totalC=data.reduce((total,item)=>{
   const itemDesc=type==='lanhouse'
    ?item?.lm_despesas?.despesa
    :item?.despesa;

   if(!itemDesc)return total;

   const lowerDesc=normalizeString(itemDesc);
   const search=description?normalizeString(description):null;

   if(!description&&(lowerDesc.includes('dizimo')||lowerDesc.includes('oferta')))return total;

   if(description&&!lowerDesc.includes(search)&&!search.includes(lowerDesc))return total;

   return total+toCents(item?.valor);
  },0);

  return fromCents(totalC);
 }catch(error){
  console.error(`Error calculating gasto real for ${type}:`,error);
  return 0;
 }
};

export const findMatchingExpense=(actualExpenses,plannedItem)=>{
 if(!Array.isArray(actualExpenses)||!plannedItem)return null;

 if(plannedItem.matched_transaction_id){
  const manualMatch=actualExpenses.find(item=>item.id===plannedItem.matched_transaction_id);
  if(manualMatch)return manualMatch;
 }

 if(!plannedItem.data_vencimento||!plannedItem.descricao)return null;

 try{
  const targetDate=typeof plannedItem.data_vencimento==='string'
   ?parseISO(plannedItem.data_vencimento)
   :plannedItem.data_vencimento;

  const plannedDescNorm=normalizeString(plannedItem.descricao);
  const plannedTokens=plannedDescNorm.split(' ').filter(t=>t.length>2);

  const candidates=actualExpenses.filter(actual=>{
   if(!actual?.data)return false;

   const actualDate=typeof actual.data==='string'
    ?parseISO(actual.data)
    :actual.data;

   return isSameMonth(actualDate,targetDate)&&isSameYear(actualDate,targetDate);
  });

  let match=candidates.find(actual=>normalizeString(actual?.despesa)===plannedDescNorm);
  if(match)return match;

  match=candidates.find(actual=>{
   const actualDescNorm=normalizeString(actual?.despesa);
   return plannedTokens.every(token=>actualDescNorm.includes(token))&&plannedTokens.length>0;
  });
  if(match)return match;

  if(plannedItem.categoria){
   match=candidates.find(actual=>
    actual?.categoria&&normalizeString(actual.categoria)===plannedDescNorm
   );
   if(match)return match;
  }
 }catch(error){
  console.error('Error matching expense:',error);
 }

 return null;
};

export const findMatchingExpenseAmount=(actualExpenses,plannedItem)=>{
 const match=findMatchingExpense(actualExpenses,plannedItem);
 return match?fromCents(toCents(match.valor)):0;
};
