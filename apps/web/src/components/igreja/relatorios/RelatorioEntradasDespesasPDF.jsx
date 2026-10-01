import React,{useEffect,useState,useMemo,useCallback}from'react';
import{useSearchParams}from'react-router-dom';
import{supabase}from'@/lib/customSupabaseClient';
import{Helmet}from'react-helmet';
import{Button}from'@/components/ui/button';
import{Printer,X,FileText,PenLine}from'lucide-react';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/612e5784f3faca006483ae69c11fa425.png';
const M=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dt=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'UTC'});

export default function RelatorioEntradasDespesasPDF(){
 const[sp]=useSearchParams(),[d,setD]=useState({o:[],z:[],e:[],x:[]}),[loading,setLoading]=useState(true),[err,setErr]=useState(''),[emit,setEmit]=useState('');
 const type=sp.get('filterType'),year=sp.get('year'),month=sp.get('month'),sd=sp.get('startDate'),ed=sp.get('endDate'),auto=sp.get('print')==='true';

 const range=useMemo(()=>{
  if(type==='mensal'&&year&&month){
   const y=+year,m=+month;
   return{a:new Date(Date.UTC(y,m,1)),b:new Date(Date.UTC(y,m+1,0,23,59,59)),p:`${M[m]||''}/${y}`};
  }
  if(sd&&ed)return{a:new Date(`${sd}T00:00:00Z`),b:new Date(`${ed}T23:59:59Z`),p:`${dt(sd)} a ${dt(ed)}`};
  return null;
 },[type,year,month,sd,ed]);

 const load=useCallback(async()=>{
  if(!range){setErr('Período inválido.');setLoading(false);return}
  setLoading(true);setErr('');
  try{
   const[e,x]=await Promise.all([
    supabase.from('igreja_entradas').select('*,igreja_dizimistas(nome)').gte('data',range.a.toISOString()).lte('data',range.b.toISOString()).order('data',{ascending:true}),
    supabase.from('igreja_despesas').select('*').gte('data',range.a.toISOString()).lte('data',range.b.toISOString()).order('data',{ascending:true})
   ]);
   if(e.error)throw e.error;if(x.error)throw x.error;
   const en=e.data||[],ex=x.data||[],tipo=v=>(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
   setD({
    o:en.filter(v=>tipo(v.tipo_entrada)==='OFERTA'),
    z:en.filter(v=>tipo(v.tipo_entrada)==='DIZIMO'),
    e:en.filter(v=>!['OFERTA','DIZIMO'].includes(tipo(v.tipo_entrada))),
    x:ex
   });
  }catch(e){console.error(e);setErr('Erro ao carregar os dados.')}
  finally{setLoading(false);setEmit(new Date().toLocaleString('pt-BR'))}
 },[range]);

 useEffect(()=>{load()},[load]);
 useEffect(()=>{if(!loading&&!err&&auto){const t=setTimeout(()=>window.print(),500);return()=>clearTimeout(t)}},[loading,err,auto]);

 const total=a=>a.reduce((s,v)=>s+Number(v.valor||0),0);
 const t=useMemo(()=>{const o=total(d.o),z=total(d.z),e=total(d.e),x=total(d.x),i=o+z+e;return{o,z,e,x,i,s:i-x}},[d]);

 const Section=({title,c,children})=><section className="sec"><div className={`st ${c}`}><FileText/>{title}</div>{children}</section>;
 const Table=({heads,rows,total:tot,cls})=><table><thead className={cls}><tr>{heads.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j} className={j===r.length-1?'r':''}>{v}</td>)}</tr>)}</tbody><tfoot className={cls}><tr><td colSpan={heads.length-1}>{tot[0]}</td><td className="r">{tot[1]}</td></tr></tfoot></table>;

 if(loading)return<div className="load">Gerando relatório...</div>;
 if(err)return<div className="load"><b>{err}</b><Button onClick={()=>window.close()}>Fechar</Button></div>;

 return<>
 <Helmet><title>Relatório Financeiro</title><style>{`
@page{size:A4 landscape;margin:5mm}*{box-sizing:border-box}html,body,#root{margin:0!important;padding:0!important;background:#fff!important}body{font-family:Arial,sans-serif;color:#17365d;-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{width:100%}.page{width:100%;min-height:198mm;padding:3mm 4mm;position:relative;border:1px solid #bdc9d8}.p1{page-break-after:always}.p2{padding-top:3mm}.bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f1f5f9}.actions{display:flex;gap:7px}.head{text-align:center}.brand{height:18mm;position:relative}.logo{position:absolute;left:2mm;top:-1mm;width:18mm;height:17mm;object-fit:contain}.brand h1{margin:0;color:#123b97;font-size:15px;font-weight:800;text-transform:uppercase}.city{font-size:8px;font-weight:800;color:#123b97}.title{margin:2mm 0;background:#123b97;color:#fff;border-radius:4px;padding:4px;font-size:9.5px;font-weight:800}.period{font-size:9px;font-weight:800}.sec{margin-top:3mm}.p2 .sec:first-child{margin-top:0}.st{height:7.5mm;display:flex;align-items:center;gap:7px;padding:0 9px;margin-bottom:1.5mm;border-radius:4px;font-size:11px;font-weight:800}.st svg{width:16px;height:16px}.offer{background:#dff5ea;color:#087343;border-left:4px solid #159b69}.tithe{background:#dcebfb;color:#1147af;border-left:4px solid #2667db}.other{background:#fff0da;color:#d96800;border-left:4px solid #ff9d00}.expense{background:#ffe1e1;color:#d51f1f;border-left:4px solid #ff3030}.summary{background:#ddebfb;color:#123ea8;border-left:4px solid #2667db}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px;color:#17365d}th,td{border:1px solid #c8d4e4;padding:3px 5px;text-align:left;color:#17365d!important}th{font-weight:800}td b{color:#17365d!important}.r{text-align:right}tbody tr:nth-child(even) td{background:#f8fafc}tfoot td{font-weight:800}.offer-head th,.offer-head td{background:#e8f8ef!important;color:#087343!important}.tithe-head th,.tithe-head td{background:#edf5ff!important;color:#1147af!important}.other-head th,.other-head td{background:#fff5e8!important;color:#d96800!important}.expense-head th,.expense-head td{background:#fff0f0!important;color:#d51f1f!important}.empty{padding:7px;text-align:center;border:1px dashed #c8d4e4;font-size:8px;color:#64748b}.box{border:1px solid #bfd0e8;border-radius:5px;overflow:hidden}.row{display:grid;grid-template-columns:1fr 25%;padding:4px 8px;min-height:11mm;border-bottom:1px solid #d6e1ef}.row:last-child{border:0}.label{font-size:8.5px;font-weight:800}.sub{display:block;font-size:6.5px;color:#64748b}.val{text-align:right;font-size:10px;font-weight:800}.green{background:#e7f7ee;color:#087343}.red{background:#fff0f0;color:#d51f1f}.blue{background:#e9f2ff;color:#1554c0}.gray{background:#eef2f7;color:#102f73}.sign{height:20mm;margin-top:4mm;border:1px solid #bfd0e8;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:end;padding-bottom:4mm}.line{width:55mm;border-top:1px solid #17365d;margin-bottom:1.5mm}.sign b{font-size:8px}.footer{position:absolute;bottom:3mm;left:4mm;right:4mm;border-top:1px solid #cbd5e1;padding-top:2mm;display:grid;grid-template-columns:1fr auto 1fr;font-size:6.5px;color:#64748b}.fc{text-align:center;font-weight:800;color:#123b97}.fr{text-align:right}.load{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}@media print{.np{display:none!important}.bar{display:none!important}.page{width:100%;min-height:198mm;border:1px solid #bdc9d8}}
 `}</style></Helmet>

 <div className="wrap">
  <div className="bar np"><span>Pré-visualização de Impressão</span><div className="actions"><Button onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button><Button variant="outline" onClick={()=>window.close()}><X className="mr-2 h-4 w-4"/>Fechar</Button></div></div>

  <div className="page p1">
   <header className="head"><div className="brand"><img src={LOGO} className="logo" alt="Logo"/><h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1><div className="city">LEROLÂNDIA</div></div><div className="title">RELATÓRIO FINANCEIRO DE ENTRADAS E DESPESAS</div><div className="period">Período: {range.p}</div></header>

   <Section title="Ofertas" c="offer">{d.o.length?<Table heads={['Data','Descrição / Ofertante','Valor']} rows={d.o.map(v=>[dt(v.data),<b>{v.ofertante||'IGREJA'}</b>,money(v.valor)])} total={['TOTAL OFERTAS',money(t.o)]} cls="offer-head"/>:<Empty>Nenhum registro de oferta encontrado para este período.</Empty>}</Section>

   <Section title="Dízimos" c="tithe">{d.z.length?<Table heads={['Data','Dizimista','Valor']} rows={d.z.map(v=>[dt(v.data),<b>{v.igreja_dizimistas?.nome||'NÃO IDENTIFICADO'}</b>,money(v.valor)])} total={['TOTAL DÍZIMOS',money(t.z)]} cls="tithe-head"/>:<Empty>Nenhum registro de dízimo encontrado para este período.</Empty>}</Section>
  </div>

  <div className="page p2">
   <Section title="Outras Entradas" c="other">{d.e.length?<Table heads={['Data','Descrição','Valor']} rows={d.e.map(v=>[dt(v.data),<b>{v.ofertante||v.igreja_dizimistas?.nome||v.tipo_entrada||'ENTRADA'}</b>,money(v.valor)])} total={['TOTAL OUTRAS ENTRADAS',money(t.e)]} cls="other-head"/>:<Empty>Nenhum outro registro de entrada encontrado para este período.</Empty>}</Section>

   <Section title="Despesas" c="expense">{d.x.length?<Table heads={['Data','Descrição da Despesa','Valor']} rows={d.x.map(v=>[dt(v.data),<b>{v.despesa||v.descricao||'-'}</b>,money(v.valor)])} total={['TOTAL DESPESAS',money(t.x)]} cls="expense-head"/>:<Empty>Nenhum registro de despesa encontrado para este período.</Empty>}</Section>

   <Section title="Resumo do Período" c="summary"><div className="box">
    <div className="row green"><div><b className="label">Total de Entradas</b><span className="sub">Ofertas + Dízimos + Outras</span></div><b className="val">{money(t.i)}</b></div>
    <div className="row red"><div><b className="label">Total de Saídas</b><span className="sub">Despesas</span></div><b className="val">{money(t.x)}</b></div>
    <div className="row blue"><b className="label">Saldo do Período</b><b className="val">{money(t.s)}</b></div>
    <div className="row gray"><b className="label">SALDO ATUAL EM CAIXA (GERAL)</b><b className="val">{money(t.s)}</b></div>
   </div></Section>

   <div className="sign"><PenLine size={16}/><div className="line"/><b>Tesoureiro (a)</b></div>
   <footer className="footer"><span>Relatório emitido pelo sistema da Tesouraria.</span><span className="fc">TESOURARIA</span><span className="fr">Data de emissão: {emit}</span></footer>
  </div>
 </div>
 </>
}
