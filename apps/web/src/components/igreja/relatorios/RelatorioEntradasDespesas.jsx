import React,{useEffect,useState,useMemo,useCallback}from'react';
import{useSearchParams}from'react-router-dom';
import{supabase}from'@/lib/customSupabaseClient';
import{Helmet}from'react-helmet';
import{Button}from'@/components/ui/button';
import{Printer,X,HandCoins,Coins,WalletCards,Receipt,BarChart3,PenLine}from'lucide-react';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/612e5784f3faca006483ae69c11fa425.png';

export default function RelatorioEntradasDespesas(){
 const[sp]=useSearchParams(),[data,setData]=useState({ofertas:[],dizimos:[],outras:[],despesas:[]}),[all,setAll]=useState({entradas:0,despesas:0}),[loading,setLoading]=useState(true),[error,setError]=useState(null),[date,setDate]=useState('');
 const type=sp.get('filterType'),year=sp.get('year'),month=sp.get('month'),startDate=sp.get('startDate'),endDate=sp.get('endDate'),print=sp.get('print')==='true';
 const money=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dateBR=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'UTC'});
 const period=useMemo(()=>{
  if(type==='mensal'&&year&&month)return`${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][+month]||''}/${year}`;
  if(startDate&&endDate)return`${dateBR(startDate)} a ${dateBR(endDate)}`;
  return'Período selecionado';
 },[type,year,month,startDate,endDate]);

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
   if(a.error)throw a.error;if(b.error)throw b.error;
   const e=a.data||[];
   setData({
    ofertas:e.filter(x=>(x.tipo_entrada||'').toUpperCase()==='OFERTA'),
    dizimos:e.filter(x=>['DÍZIMO','DIZIMO'].includes((x.tipo_entrada||'').toUpperCase())),
    outras:e.filter(x=>!['OFERTA','DÍZIMO','DIZIMO'].includes((x.tipo_entrada||'').toUpperCase())),
    despesas:b.data||[]
   });
   setAll({
    entradas:(c.data||[]).reduce((s,x)=>s+(x.valor||0),0),
    despesas:(d.data||[]).reduce((s,x)=>s+(x.valor||0),0)
   });
  }catch(e){console.error(e);setError('Não foi possível carregar os dados do relatório. Tente novamente.')}
  finally{setLoading(false);setDate(new Date().toLocaleString('pt-BR'))}
 },[type,year,month,startDate,endDate]);

 useEffect(()=>{load()},[load]);
 useEffect(()=>{if(!loading&&!error&&print){const t=setTimeout(()=>window.print(),700);return()=>clearTimeout(t)}},[loading,error,print]);

 const totals=useMemo(()=>{
  const sum=a=>a.reduce((s,x)=>s+(x.valor||0),0),o=sum(data.ofertas),d=sum(data.dizimos),ou=sum(data.outras),de=sum(data.despesas),ent=o+d+ou;
  return{ofertas:o,dizimos:d,outras:ou,despesas:de,entradas:ent,saldo:ent-de,caixa:all.entradas-all.despesas};
 },[data,all]);

 const Section=({icon:I,title,cls,children})=><section className="section"><div className={`section-title ${cls}`}><I className="section-icon"/><h3>{title}</h3></div>{children}</section>;
 const Empty=({children})=><div className="empty">{children}</div>;
 const Table=({head,rows,total,totalCls})=><table><thead className={totalCls}><tr>{head.map((h,i)=><th key={i} className={i===head.length-1?'right':''}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} className={j===r.length-1?'right':''}>{c}</td>)}</tr>)}</tbody>{total&&<tfoot><tr className={totalCls}><td colSpan={head.length-1}>{total[0]}</td><td className="right">{total[1]}</td></tr></tfoot>}</table>;

 if(loading)return <div className="loading"><div className="spinner"/><p>Gerando relatório...</p></div>;
 if(error)return <div className="error"><b>⚠️ Erro</b><p>{error}</p><Button onClick={()=>window.close()} variant="outline">Fechar</Button></div>;

 return <>
  <Helmet><title>Relatório de Entradas e Despesas</title><style>{`
   @page{size:A4 portrait;margin:8mm 9mm 9mm}*{box-sizing:border-box}html,body,#root{margin:0!important;padding:0!important;background:#fff!important;color:#1e293b!important}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,Helvetica,sans-serif}.wrap{width:100%;background:#fff}.hidden-print{display:flex}.page{width:190mm;min-height:280mm;margin:0 auto;position:relative;background:#fff}.p1{page-break-after:always}.bar{background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:12px 16px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}.bar div{font-size:14px;color:#64748b}.actions{display:flex;gap:8px}.head{text-align:center;padding-top:1mm}.brand{position:relative;min-height:25mm}.logo{position:absolute;left:0;top:-2mm;width:29mm;height:25mm;object-fit:contain}.brand h1{margin:0;color:#1e3a8a;font-size:17px;font-weight:800;line-height:1.15;text-transform:uppercase}.city{margin-top:2px;font-size:9px;font-weight:700}.main-title{margin-top:4mm;background:#1e3a8a;color:#fff;border-radius:4px;padding:6px 10px;font-size:10px;font-weight:800;text-transform:uppercase}.period{margin-top:2.5mm;font-size:9px;font-weight:700;color:#1e3a8a}.section{margin-top:4mm}.p2 .section:first-child{margin-top:0}.section-title{height:9mm;display:flex;align-items:center;gap:7px;border-radius:4px;padding:0 10px;margin-bottom:2mm}.section-title h3{margin:0;font-size:11px;font-weight:800}.section-icon{width:17px;height:17px;stroke-width:2.2}.offer{background:#dcfce7;color:#047857;border-left:4px solid #10b981}.tithe{background:#dbeafe;color:#1d4ed8;border-left:4px solid #2563eb}.other{background:#fef3c7;color:#c2410c;border-left:4px solid #f59e0b}.expense{background:#fee2e2;color:#dc2626;border-left:4px solid #ef4444}.summary-title{background:#dbeafe;color:#1d4ed8;border-left:4px solid #2563eb}table{width:100%;border-collapse:collapse;font-size:8.1px;table-layout:fixed}th{font-weight:800;text-align:left;padding:4px 5px;border:1px solid #cbd5e1;line-height:1.05}td{padding:3.5px 5px;border:1px solid #cbd5e1;line-height:1.05;vertical-align:middle}.right{text-align:right}thead.offer-head th,.offer-total td{background:#ecfdf5;color:#047857;border-color:#a7f3d0}thead.tithe-head th,.tithe-total td{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}thead.other-head th,.other-total td{background:#fff7ed;color:#c2410c;border-color:#fed7aa}thead.expense-head th,.expense-total td{background:#fef2f2;color:#dc2626;border-color:#fecaca}tbody tr:nth-child(even){background:#f8fafc}.bold{font-weight:800}.empty{padding:8px 10px;border:1px dashed #cbd5e1;border-radius:4px;color:#64748b;font-size:7.5px;font-style:italic;text-align:center}.summary{border:1px solid #bfdbfe;border-radius:6px;overflow:hidden}.row{display:grid;grid-template-columns:1fr 34%;align-items:center;min-height:13mm;padding:5px 9px;border-bottom:1px solid #dbeafe}.row:last-child{border:0}.label{font-size:8.5px;font-weight:700}.sub{display:block;font-size:6.5px;color:#64748b;margin-top:1px}.value{text-align:right;font-size:11px;font-weight:800}.entry{background:#ecfdf5;color:#047857}.exit{background:#fef2f2;color:#dc2626}.balance{background:#eff6ff;color:#1d4ed8}.cash{background:#f1f5f9;color:#1e3a8a}.sum-icon{width:18px;height:18px;float:left;margin:1px 7px 0 0}.sign{margin-top:5mm;border:1px solid #bfdbfe;border-radius:5px;height:27mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:5mm}.line{width:62mm;border-top:1px solid #0f172a;margin-bottom:2mm}.sign-label{font-size:8px;font-weight:700;color:#1e3a8a}.footer{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #cbd5e1;padding-top:3mm;display:grid;grid-template-columns:1fr auto 1fr;gap:8px;color:#64748b;font-size:6.3px}.footer-center{text-align:center;font-weight:800;color:#1e3a8a}.footer-right{text-align:right}.screen-note{text-align:center;color:#94a3b8;font-size:7px;margin-top:4mm}.loading,.error{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#fff;font-family:Arial}.spinner{width:42px;height:42px;border:4px solid #e5e7eb;border-top-color:#1e3a8a;border-radius:50%;animation:spin .8s linear infinite}.loading p{margin-top:15px}.error b{font-size:20px;color:#dc2626}.error p{color:#475569}@keyframes spin{to{transform:rotate(360deg)}}@media print{.hidden-print{display:none!important}.page{margin:0;width:190mm;min-height:280mm}.p1{page-break-after:always}.screen-note{display:none}}
  `}</style></Helmet>

  <div className="wrap">
   <div className="hidden-print bar"><div>Pré-visualização de Impressão</div><div className="actions"><Button onClick={()=>window.print()} className="bg-blue-600 text-white"><Printer className="w-4 h-4 mr-2"/>Imprimir</Button><Button onClick={()=>window.close()} variant="outline"><X className="w-4 h-4 mr-2"/>Fechar</Button></div></div>

   <div className="page p1">
    <header className="head">
     <div className="brand"><img src={LOGO_URL} className="logo" alt="Logo"/><h1>Igreja Assembleia de Deus Ministério Plantar</h1><div className="city">Lerolândia</div></div>
     <div className="main-title">Relatório Financeiro de Entradas e Despesas</div>
     <div className="period">Período: {period}</div>
    </header>

    <Section icon={HandCoins} title="Ofertas" cls="offer">
     {data.ofertas.length?<Table head={['Data','Descrição / Ofertante','Valor']} total={['TOTAL OFERTAS',money(totals.ofertas)]} totalCls="offer-head" rows={data.ofertas.map(x=>[dateBR(x.data),<b>{x.ofertante||'OFERTA GERAL'}</b>,money(x.valor)])}/>:<Empty>Nenhum registro de oferta encontrado para este período.</Empty>}
    </Section>

    <Section icon={Coins} title="Dízimos" cls="tithe">
     {data.dizimos.length?<Table head={['Data','Dizimista','Valor']} total={['TOTAL DÍZIMOS',money(totals.dizimos)]} totalCls="tithe-head" rows={data.dizimos.map(x=>[dateBR(x.data),<b>{x.igreja_dizimistas?.nome||'NÃO IDENTIFICADO'}</b>,money(x.valor)])}/>:<Empty>Nenhum registro de dízimo encontrado para este período.</Empty>}
    </Section>

    <div className="hidden-print screen-note">Página 1 de 2</div>
   </div>

   <div className="page p2">
    <Section icon={WalletCards} title="Outras Entradas" cls="other">
     {data.outras.length?<Table head={['Data','Tipo','Descrição / Origem','Valor']} total={['TOTAL OUTRAS ENTRADAS',money(totals.outras)]} totalCls="other-head" rows={data.outras.map(x=>[dateBR(x.data),<b>{x.tipo_entrada||'-'}</b>,x.igreja_dizimistas?.nome||x.ofertante||'—',money(x.valor)])}/>:<Empty>Nenhum outro registro de entrada encontrado para este período.</Empty>}
    </Section>

    <Section icon={Receipt} title="Despesas" cls="expense">
     {data.despesas.length?<Table head={['Data','Descrição da Despesa','Valor']} total={['TOTAL DESPESAS',money(totals.despesas)]} totalCls="expense-head" rows={data.despesas.map(x=>[dateBR(x.data),<b>{x.despesa||'-'}</b>,money(x.valor)])}/>:<Empty>Nenhum registro de despesa encontrado para este período.</Empty>}
    </Section>

    <Section icon={BarChart3} title="Resumo do Período" cls="summary-title">
     <div className="summary">
      <div className="row entry"><div><BarChart3 className="sum-icon"/><span className="label">Total de Entradas</span><span className="sub">Ofertas + Dízimos + Outras</span></div><div className="value">{money(totals.entradas)}</div></div>
      <div className="row exit"><div><Receipt className="sum-icon"/><span className="label">Total de Saídas</span><span className="sub">Despesas</span></div><div className="value">{money(totals.despesas)}</div></div>
      <div className="row balance"><div><BarChart3 className="sum-icon"/><span className="label">Saldo do Período</span></div><div className="value">{money(totals.saldo)}</div></div>
      <div className="row cash"><div><WalletCards className="sum-icon"/><span className="label">Saldo Atual em Caixa (Geral)</span></div><div className="value">{money(totals.caixa)}</div></div>
     </div>
    </Section>

    <div className="sign"><PenLine className="sum-icon" style={{float:'none',margin:'0 0 3mm',color:'#1e3a8a'}}/><div className="line"/><div className="sign-label">Tesoureiro (a)</div></div>

    <footer className="footer"><div>Relatório emitido pelo sistema da Tesouraria.</div><div className="footer-center">TESOURARIA</div><div className="footer-right">Data de emissão: {date}</div></footer>

    <div className="hidden-print screen-note">Página 2 de 2</div>
   </div>
  </div>
 </>
}
