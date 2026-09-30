import React,{useEffect,useState,useMemo,useCallback}from'react';
import{useSearchParams}from'react-router-dom';
import{supabase}from'@/lib/customSupabaseClient';
import{Helmet}from'react-helmet';
import{Button}from'@/components/ui/button';
import{Printer,X,FileText,PenLine}from'lucide-react';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/612e5784f3faca006483ae69c11fa425.png',meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dateBR=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'UTC'});

export default function RelatorioEntradasDespesasPDF(){
 const[sp]=useSearchParams(),[data,setData]=useState({ofertas:[],dizimos:[],outras:[],despesas:[]}),[all,setAll]=useState({entradas:0,despesas:0}),[loading,setLoading]=useState(true),[error,setError]=useState(null),[date,setDate]=useState('');
 const type=sp.get('filterType'),year=sp.get('year'),month=sp.get('month'),startDate=sp.get('startDate'),endDate=sp.get('endDate'),print=sp.get('print')==='true';
 const period=useMemo(()=>type==='mensal'&&year&&month?`${meses[Number(month)]||''}/${year}`:startDate&&endDate?`${dateBR(startDate)} a ${dateBR(endDate)}`:'Período selecionado',[type,year,month,startDate,endDate]);

 const load=useCallback(async()=>{
  setLoading(true);setError(null);let start,end;
  if(type==='mensal'&&year&&month){start=new Date(Date.UTC(+year,+month,1));end=new Date(Date.UTC(+year,+month+1,0,23,59,59))}
  else if(type==='periodo'&&startDate&&endDate){start=new Date(`${startDate}T00:00:00Z`);end=new Date(`${endDate}T23:59:59Z`)}
  else{setError('Parâmetros inválidos para geração do relatório.');setLoading(false);return}
  try{
   const[a,b,c,d]=await Promise.all([
    supabase.from('igreja_entradas').select('*, igreja_dizimistas(nome)').gte('data',start.toISOString()).lte('data',end.toISOString()).order('data',{ascending:true}),
    supabase.from('igreja_despesas').select('*').gte('data',start.toISOString()).lte('data',end.toISOString()).order('data',{ascending:true}),
    supabase.from('igreja_entradas').select('valor'),
    supabase.from('igreja_despesas').select('valor')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;if(d.error)throw d.error;
   const e=a.data||[];
   setData({
    ofertas:e.filter(x=>(x.tipo_entrada||'').toUpperCase()==='OFERTA'),
    dizimos:e.filter(x=>['DÍZIMO','DIZIMO'].includes((x.tipo_entrada||'').toUpperCase())),
    outras:e.filter(x=>!['OFERTA','DÍZIMO','DIZIMO'].includes((x.tipo_entrada||'').toUpperCase())),
    despesas:b.data||[]
   });
   setAll({entradas:(c.data||[]).reduce((s,x)=>s+Number(x.valor||0),0),despesas:(d.data||[]).reduce((s,x)=>s+Number(x.valor||0),0)});
  }catch(e){console.error(e);setError('Não foi possível carregar os dados do relatório. Tente novamente.')}
  finally{setLoading(false);setDate(new Date().toLocaleString('pt-BR'))}
 },[type,year,month,startDate,endDate]);

 useEffect(()=>{load()},[load]);
 useEffect(()=>{if(!loading&&!error&&print){const t=setTimeout(()=>window.print(),700);return()=>clearTimeout(t)}},[loading,error,print]);

 const totals=useMemo(()=>{
  const sum=a=>a.reduce((s,x)=>s+Number(x.valor||0),0),ofertas=sum(data.ofertas),dizimos=sum(data.dizimos),outras=sum(data.outras),despesas=sum(data.despesas),entradas=ofertas+dizimos+outras;
  return{ofertas,dizimos,outras,despesas,entradas,saldo:entradas-despesas,caixa:all.entradas-all.despesas};
 },[data,all]);

 const Section=({title,cls,children})=><section className="section"><div className={`section-title ${cls}`}><FileText className="section-icon"/><h3>{title}</h3></div>{children}</section>;
 const Empty=({children})=><div className="empty">{children}</div>;
 const Table=({head,rows,total,totalClass})=><table className="report-table"><thead className={totalClass}><tr>{head.map((h,i)=><th key={i} className={i===head.length-1?'right':''}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} className={j===r.length-1?'right':''}>{c}</td>)}</tr>)}</tbody>{total&&<tfoot><tr className={totalClass}><td colSpan={head.length-1}>{total[0]}</td><td className="right">{total[1]}</td></tr></tfoot>}</table>;

 if(loading)return<div className="loading"><div className="spinner"/><p>Gerando relatório...</p></div>;
 if(error)return<div className="error"><b>⚠️ Erro</b><p>{error}</p><Button onClick={()=>window.close()} variant="outline">Fechar</Button></div>;

 return<>
  <Helmet><title>Relatório de Entradas e Despesas</title><style>{`
@page{size:A4 landscape;margin:5mm}*{box-sizing:border-box}html,body,#root{margin:0!important;padding:0!important;background:#fff!important;color:#17365d!important}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,Helvetica,sans-serif}.wrap{width:100%;background:#fff}.hidden-print{display:flex}.page{width:100%;min-height:198mm;margin:0 auto;position:relative;background:#fff;border:1px solid #b9c7da;padding:3mm 4mm}.p1{page-break-after:always}.p2{padding-top:3mm}.bar{background:#f1f5f9;border-bottom:1px solid #d7dee8;padding:10px 14px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}.bar-title{font-size:14px;color:#64748b}.actions{display:flex;gap:8px}.head{text-align:center}.brand{position:relative;min-height:18mm}.logo{position:absolute;left:2mm;top:-1mm;width:18mm;height:17mm;object-fit:contain}.brand h1{margin:0;color:#0b2f8f;font-size:15px;font-weight:800;line-height:1.05;text-transform:uppercase}.city{margin-top:1px;color:#0b2f8f;font-size:8px;font-weight:800;text-transform:uppercase}.main-title{margin:1.8mm 0;background:#123b97;color:#fff;border-radius:4px;padding:4px 8px;font-size:9.5px;font-weight:800;text-transform:uppercase}.period{font-size:9px;font-weight:800;color:#17365d}.section{margin-top:3.2mm}.p2 .section:first-child{margin-top:0}.section-title{height:7.5mm;display:flex;align-items:center;gap:7px;border-radius:4px;padding:0 9px;margin-bottom:1.8mm}.section-title h3{margin:0;font-size:11px;font-weight:800}.section-icon{width:17px;height:17px;stroke-width:2.4}.offer{background:#dff5ea;color:#087343;border-left:4px solid #159b69}.tithe{background:#dcebfb;color:#1147af;border-left:4px solid #2667db}.other{background:#fff0da;color:#ed7500;border-left:4px solid #ff9d00}.expense{background:#ffe1e1;color:#e72222;border-left:4px solid #ff3030}.summary-title{background:#ddebfb;color:#123ea8;border-left:4px solid #2667db}.report-table{width:100%;border-collapse:collapse;font-size:8.2px;table-layout:fixed;color:#17365d!important}.report-table th{padding:3px 5px;border:1px solid #c8d4e4;text-align:left;font-weight:800;line-height:1;color:#17365d!important}.report-table td{padding:2.5px 5px;border:1px solid #c8d4e4;line-height:1.05;vertical-align:middle;color:#17365d!important;background:#fff}.report-table td b,.report-table td *{color:#17365d!important}.report-table tbody tr:nth-child(even) td{background:#f8fafc!important}.report-table .right{text-align:right}.offer-head th{background:#e8f8ef!important;color:#087343!important;border-color:#a9dcc3}.tithe-head th{background:#edf5ff!important;color:#1147af!important;border-color:#b5cef3}.other-head th{background:#fff5e8!important;color:#d96800!important;border-color:#f3ce9d}.expense-head th{background:#fff0f0!important;color:#d51f1f!important;border-color:#f3bcbc}tfoot td{font-weight:800!important;padding:4px 5px!important}tfoot.offer-head td{background:#e5f7ed!important;color:#087343!important}tfoot.tithe-head td{background:#eaf3ff!important;color:#1147af!important}tfoot.other-head td{background:#fff3e2!important;color:#d96800!important}tfoot.expense-head td{background:#ffeaea!important;color:#d51f1f!important}.empty{padding:8px 10px;border:1px dashed #c8d4e4;border-radius:4px;color:#64748b;font-size:8px;font-style:italic;text-align:center}.summary{border:1px solid #bfd0e8;border-radius:5px;overflow:hidden}.row{display:grid;grid-template-columns:1fr 27%;align-items:center;min-height:11.5mm;padding:4px 8px;border-bottom:1px solid #d6e1ef}.row:last-child{border-bottom:0}.label{font-size:8.6px;font-weight:800}.sub{display:block;font-size:6.5px;color:#64748b;margin-top:1px}.value{text-align:right;font-size:10.5px;font-weight:800}.entry{background:#e7f7ee;color:#087343}.exit{background:#fff0f0;color:#e51f1f}.balance{background:#e9f2ff;color:#1554c0}.cash{background:#eef2f7;color:#102f73}.sum-icon{width:17px;height:17px;float:left;margin:1px 7px 0 0}.sign{margin-top:4mm;border:1px solid #bfd0e8;border-radius:5px;height:20mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:4mm}.line{width:55mm;border-top:1px solid #17365d;margin-bottom:1.5mm}.sign-label{font-size:8px;font-weight:800;color:#17365d}.footer{position:absolute;left:4mm;right:4mm;bottom:3mm;border-top:1px solid #bfcddd;padding-top:2mm;display:grid;grid-template-columns:1fr auto 1fr;gap:8px;color:#64748b;font-size:6.5px}.footer-center{text-align:center;font-weight:800;color:#123b97}.footer-right{text-align:right}.loading,.error{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#fff;font-family:Arial}.spinner{width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#123b97;border-radius:50%;animation:spin .8s linear infinite}.loading p{margin-top:14px}.error b{font-size:20px;color:#dc2626}.error p{color:#475569}@keyframes spin{to{transform:rotate(360deg)}}@media print{.hidden-print{display:none!important}.bar{display:none!important}.page{margin:0;width:100%;min-height:198mm}.p1{page-break-after:always}}
  `}</style></Helmet>

  <div className="wrap">
   <div className="hidden-print bar"><div className="bar-title">Pré-visualização de Impressão</div><div className="actions"><Button onClick={()=>window.print()} className="bg-blue-600 text-white"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button><Button onClick={()=>window.close()} variant="outline"><X className="mr-2 h-4 w-4"/>Fechar</Button></div></div>

   <div className="page p1">
    <header className="head"><div className="brand"><img src={LOGO_URL} className="logo" alt="Logo"/><h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1><div className="city">LEROLÂNDIA</div></div><div className="main-title">RELATÓRIO FINANCEIRO DE ENTRADAS E DESPESAS</div><div className="period">Período: {period}</div></header>
    <Section title="Ofertas" cls="offer">{data.ofertas.length?<Table head={['Data','Descrição / Ofertante','Valor']} rows={data.ofertas.map(x=>[dateBR(x.data),<b>{x.ofertante||'IGREJA'}</b>,money(x.valor)])} total={['TOTAL OFERTAS',money(totals.ofertas)]} totalClass="offer-head"/>:<Empty>Nenhum registro de oferta encontrado para este período.</Empty>}</Section>
    <Section title="Dízimos" cls="tithe">{data.dizimos.length?<Table head={['Data','Dizimista','Valor']} rows={data.dizimos.map(x=>[dateBR(x.data),<b>{x.igreja_dizimistas?.nome||'NÃO IDENTIFICADO'}</b>,money(x.valor)])} total={['TOTAL DÍZIMOS',money(totals.dizimos)]} totalClass="tithe-head"/>:<Empty>Nenhum registro de dízimo encontrado para este período.</Empty>}</Section>
   </div>

   <div className="page p2">
    <Section title="Outras Entradas" cls="other">{data.outras.length?<Table head={['Data','Descrição','Valor']} rows={data.outras.map(x=>[dateBR(x.data),<b>{x.ofertante||x.igreja_dizimistas?.nome||x.tipo_entrada||'ENTRADA'}</b>,money(x.valor)])} total={['TOTAL OUTRAS ENTRADAS',money(totals.outras)]} totalClass="other-head"/>:<Empty>Nenhum outro registro de entrada encontrado para este período.</Empty>}</Section>
    <Section title="Despesas" cls="expense">{data.despesas.length?<Table head={['Data','Descrição da Despesa','Valor']} rows={data.despesas.map(x=>[dateBR(x.data),<b>{x.despesa||'-'}</b>,money(x.valor)])} total={['TOTAL DESPESAS',money(totals.despesas)]} totalClass="expense-head"/>:<Empty>Nenhum registro de despesa encontrado para este período.</Empty>}</Section>
    <Section title="Resumo do Período" cls="summary-title"><div className="summary">
     <div className="row entry"><div><FileText className="sum-icon"/><span className="label">Total de Entradas</span><span className="sub">Ofertas + Dízimos + Outras</span></div><div className="value">{money(totals.entradas)}</div></div>
     <div className="row exit"><div><FileText className="sum-icon"/><span className="label">Total de Saídas</span><span className="sub">Despesas</span></div><div className="value">{money(totals.despesas)}</div></div>
     <div className="row balance"><div><FileText className="sum-icon"/><span className="label">Saldo do Período</span></div><div className="value">{money(totals.saldo)}</div></div>
     <div className="row cash"><div><FileText className="sum-icon"/><span className="label">SALDO ATUAL EM CAIXA (GERAL)</span></div><div className="value">{money(totals.caixa)}</div></div>
    </div></Section>
    <div className="sign"><PenLine className="sum-icon" style={{float:'none',margin:'0 0 2.5mm',color:'#17365d'}}/><div className="line"/><div className="sign-label">Tesoureiro (a)</div></div>
    <footer className="footer"><div>Relatório emitido pelo sistema da Tesouraria.</div><div className="footer-center">TESOURARIA</div><div className="footer-right">Data de emissão: {date}</div></footer>
   </div>
  </div>
 </>
}
