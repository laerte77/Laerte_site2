import React,{useEffect,useState,useMemo,useCallback}from'react';
import{useSearchParams}from'react-router-dom';
import{supabase}from'@/lib/customSupabaseClient';
import{Helmet}from'react-helmet';
import{Button}from'@/components/ui/button';
import{Printer,X,HandCoins,Coins,WalletCards,Receipt,BarChart3,PenLine}from'lucide-react';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/612e5784f3faca006483ae69c11fa425.png';

const RelatorioEntradasDespesasPDF=()=>{
 const[searchParams]=useSearchParams();
 const[data,setData]=useState({ofertas:[],dizimos:[],outras:[],despesas:[]});
 const[allTimeTotals,setAllTimeTotals]=useState({entradas:0,despesas:0});
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);
 const[currentDateTime,setCurrentDateTime]=useState('');

 const filterType=searchParams.get('filterType');
 const year=searchParams.get('year');
 const month=searchParams.get('month');
 const startDate=searchParams.get('startDate');
 const endDate=searchParams.get('endDate');
 const shouldPrint=searchParams.get('print')==='true';

 const formatCurrency=value=>(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const formatDate=value=>new Date(value).toLocaleDateString('pt-BR',{timeZone:'UTC'});

 const periodLabel=useMemo(()=>{
  if(filterType==='mensal'&&year&&month){
   const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
   return`${meses[Number(month)]||''}/${year}`;
  }
  if(startDate&&endDate)return`${formatDate(startDate)} a ${formatDate(endDate)}`;
  return'Período selecionado';
 },[filterType,year,month,startDate,endDate]);

 const fetchData=useCallback(async()=>{
  setLoading(true);
  setError(null);
  let start,end;

  if(filterType==='mensal'&&year&&month){
   start=new Date(Date.UTC(parseInt(year),parseInt(month),1));
   end=new Date(Date.UTC(parseInt(year),parseInt(month)+1,0,23,59,59));
  }else if(filterType==='periodo'&&startDate&&endDate){
   start=new Date(`${startDate}T00:00:00Z`);
   end=new Date(`${endDate}T23:59:59Z`);
  }else{
   setLoading(false);
   setError('Parâmetros inválidos para geração do relatório.');
   return;
  }

  try{
   const[entradasRes,despesasRes,allEntradasRes,allDespesasRes]=await Promise.all([
    supabase.from('igreja_entradas').select('*, igreja_dizimistas(nome)').gte('data',start.toISOString()).lte('data',end.toISOString()).order('data',{ascending:true}),
    supabase.from('igreja_despesas').select('*').gte('data',start.toISOString()).lte('data',end.toISOString()).order('data',{ascending:true}),
    supabase.from('igreja_entradas').select('valor'),
    supabase.from('igreja_despesas').select('valor')
   ]);

   if(entradasRes.error)throw entradasRes.error;
   if(despesasRes.error)throw despesasRes.error;

   const entradas=entradasRes.data||[];

   setData({
    ofertas:entradas.filter(e=>(e.tipo_entrada||'').toUpperCase()==='OFERTA'),
    dizimos:entradas.filter(e=>{
     const t=(e.tipo_entrada||'').toUpperCase();
     return t==='DÍZIMO'||t==='DIZIMO';
    }),
    outras:entradas.filter(e=>{
     const t=(e.tipo_entrada||'').toUpperCase();
     return t!=='OFERTA'&&t!=='DÍZIMO'&&t!=='DIZIMO';
    }),
    despesas:despesasRes.data||[]
   });

   setAllTimeTotals({
    entradas:(allEntradasRes.data||[]).reduce((a,c)=>a+(c.valor||0),0),
    despesas:(allDespesasRes.data||[]).reduce((a,c)=>a+(c.valor||0),0)
   });
  }catch(err){
   console.error('Erro ao buscar dados para o relatório:',err);
   setError('Não foi possível carregar os dados do relatório. Tente novamente.');
  }finally{
   setLoading(false);
   setCurrentDateTime(new Date().toLocaleString('pt-BR'));
  }
 },[filterType,year,month,startDate,endDate]);

 useEffect(()=>{fetchData()},[fetchData]);

 useEffect(()=>{
  if(!loading&&!error&&shouldPrint){
   const timer=setTimeout(()=>window.print(),700);
   return()=>clearTimeout(timer);
  }
 },[loading,error,shouldPrint]);

 const totals=useMemo(()=>{
  const totalOfertas=data.ofertas.reduce((a,i)=>a+(i.valor||0),0);
  const totalDizimos=data.dizimos.reduce((a,i)=>a+(i.valor||0),0);
  const totalOutras=data.outras.reduce((a,i)=>a+(i.valor||0),0);
  const totalDespesas=data.despesas.reduce((a,i)=>a+(i.valor||0),0);
  const totalEntradasPeriodo=totalOfertas+totalDizimos+totalOutras;
  const saldoPeriodo=totalEntradasPeriodo-totalDespesas;
  const saldoGeral=allTimeTotals.entradas-allTimeTotals.despesas;

  return{totalOfertas,totalDizimos,totalOutras,totalDespesas,totalEntradasPeriodo,saldoPeriodo,saldoGeral};
 },[data,allTimeTotals]);

 const SectionTitle=({icon:Icon,title,color})=>(
  <div className={`section-title ${color}`}>
   <Icon className="section-icon"/>
   <h3>{title}</h3>
  </div>
 );

 const EmptyMessage=({children})=><div className="empty-message">{children}</div>;

 if(loading)return(
  <div className="loading-screen">
   <div className="spinner"/>
   <p>Gerando relatório...</p>
  </div>
 );

 if(error)return(
  <div className="error-screen">
   <div className="error-title">⚠️ Erro</div>
   <p>{error}</p>
   <Button onClick={()=>window.close()} variant="outline">Fechar</Button>
  </div>
 );

 return(
  <>
   <Helmet>
    <title>Relatório de Entradas e Despesas</title>
    <style>{`
     @page{size:A4 portrait;margin:8mm 9mm 9mm}
     *{box-sizing:border-box}
     html,body,#root{margin:0!important;padding:0!important;background:#fff!important;color:#1e293b!important}
     body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,Helvetica,sans-serif}
     
     .report-container{width:100%;background:#fff}
     .print-hidden{display:flex}
     .page{width:190mm;min-height:280mm;margin:0 auto;position:relative;background:#fff}
     .page-one{page-break-after:always}
     
     .control-bar{background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:12px 16px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
     .control-title{font-size:14px;color:#64748b}
     .control-actions{display:flex;gap:8px}
     
     .report-header{text-align:center;padding-top:1mm}
     .header-brand{position:relative;min-height:25mm}
     .header-logo{position:absolute;left:0;top:-2mm;width:29mm;height:25mm;object-fit:contain}
     .header-title{margin:0;color:#1e3a8a;font-size:17px;font-weight:800;line-height:1.15;text-transform:uppercase}
     .header-city{margin-top:2px;color:#1e293b;font-size:9px;font-weight:700}
     .main-title{margin-top:4mm;background:#1e3a8a;color:#fff;border-radius:4px;padding:6px 10px;font-size:10px;font-weight:800;text-transform:uppercase}
     .period{margin-top:2.5mm;font-size:9px;font-weight:700;color:#1e3a8a}
     
     .section{margin-top:4mm}
     .section-title{height:9mm;display:flex;align-items:center;gap:7px;border-radius:4px;padding:0 10px;margin-bottom:2mm}
     .section-title h3{margin:0;font-size:11px;font-weight:800}
     .section-icon{width:17px;height:17px;stroke-width:2.2;flex:0 0 auto}
     .offer-title{background:#dcfce7;color:#047857;border-left:4px solid #10b981}
     .tithe-title{background:#dbeafe;color:#1d4ed8;border-left:4px solid #2563eb}
     .other-title{background:#fef3c7;color:#c2410c;border-left:4px solid #f59e0b}
     .expense-title{background:#fee2e2;color:#dc2626;border-left:4px solid #ef4444}
     .summary-title{background:#dbeafe;color:#1d4ed8;border-left:4px solid #2563eb}
     
     table{width:100%;border-collapse:collapse;font-size:8.1px;table-layout:fixed}
     th{font-weight:800;text-align:left;padding:4px 5px;border:1px solid #cbd5e1;line-height:1.05}
     td{padding:3.5px 5px;border:1px solid #cbd5e1;line-height:1.05;vertical-align:middle}
     thead.offer-head th{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
     thead.tithe-head th{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
     thead.other-head th{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
     thead.expense-head th{background:#fef2f2;color:#991b1b;border-color:#fecaca}
     tbody tr:nth-child(even){background:#f8fafc}
     .table-date{width:18%}
     .table-description{width:auto}
     .table-type{width:20%}
     .table-value{width:20%;text-align:right}
     .table-status{width:13%;text-align:center}
     .bold{font-weight:800}
     
     tfoot td{font-weight:800;padding:5px}
     .offer-total td{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
     .tithe-total td{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
     .other-total td{background:#fff7ed;color:#c2410c;border-color:#fed7aa}
     .expense-total td{background:#fef2f2;color:#dc2626;border-color:#fecaca}
     
     .empty-message{padding:8px 10px;border:1px dashed #cbd5e1;border-radius:4px;color:#64748b;font-size:7.5px;font-style:italic;text-align:center}
     
     .second-page{padding-top:1mm}
     .second-page .section:first-child{margin-top:0}
     
     .summary-box{border:1px solid #bfdbfe;border-radius:6px;overflow:hidden}
     .summary-row{display:grid;grid-template-columns:1fr 34%;align-items:center;min-height:13mm;padding:5px 9px;border-bottom:1px solid #dbeafe}
     .summary-row:last-child{border-bottom:0}
     .summary-label{font-size:8.5px;font-weight:700;color:#334155}
     .summary-sub{display:block;font-size:6.5px;font-weight:500;color:#64748b;margin-top:1px}
     .summary-value{text-align:right;font-size:11px;font-weight:800}
     .entry-row{background:#ecfdf5;color:#047857}
     .exit-row{background:#fef2f2;color:#dc2626}
     .balance-row{background:#eff6ff;color:#1d4ed8}
     .cash-row{background:#f1f5f9;color:#1e3a8a}
     .summary-icon{width:18px;height:18px;vertical-align:middle;margin-right:7px;float:left;margin-top:1px}
     
     .signature-area{margin-top:5mm;border:1px solid #bfdbfe;border-radius:5px;height:27mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:5mm}
     .signature-line{width:62mm;border-top:1px solid #0f172a;margin-bottom:2mm}
     .signature-label{font-size:8px;font-weight:700;color:#1e3a8a}
     
     .report-footer{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #cbd5e1;padding-top:3mm;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px;color:#64748b;font-size:6.3px}
     .footer-center{text-align:center;font-weight:800;color:#1e3a8a}
     .footer-right{text-align:right}
     
     .screen-only-note{text-align:center;color:#94a3b8;font-size:7px;margin-top:4mm}
     
     .loading-screen,.error-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif}
     .loading-screen p{font-size:15px;margin-top:15px}
     .spinner{width:42px;height:42px;border:4px solid #e5e7eb;border-top-color:#1e3a8a;border-radius:50%;animation:spin .8s linear infinite}
     .error-title{font-size:20px;color:#dc2626;font-weight:700;margin-bottom:8px}
     .error-screen p{color:#475569;margin:0 0 16px}
     @keyframes spin{to{transform:rotate(360deg)}}
     
     @media print{
      .print-hidden{display:none!important}
      .page{margin:0;width:190mm;min-height:280mm}
      .page-one{page-break-after:always}
      .screen-only-note{display:none}
      .report-container{width:100%}
     }
    `}</style>
   </Helmet>

   <div className="report-container">

    <div className="print-hidden control-bar">
     <div className="control-title">Pré-visualização de Impressão</div>
     <div className="control-actions">
      <Button onClick={()=>window.print()} className="bg-blue-600 hover:bg-blue-700 text-white"><Printer className="w-4 h-4 mr-2"/>Imprimir</Button>
      <Button onClick={()=>window.close()} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-200"><X className="w-4 h-4 mr-2"/>Fechar</Button>
     </div>
    </div>

    {/* PÁGINA 1 */}
    <div className="page page-one">

     <header className="report-header">
      <div className="header-brand">
       <img src={LOGO_URL} alt="Logo Ministério Plantar" className="header-logo"/>
       <h1 className="header-title">Igreja Assembleia de Deus Ministério Plantar</h1>
       <div className="header-city">Lerolândia</div>
      </div>

      <div className="main-title">Relatório Financeiro de Entradas e Despesas</div>
      <div className="period">Período: {periodLabel}</div>
     </header>

     {/* OFERTAS */}
     <section className="section">
      <SectionTitle icon={HandCoins} title="Ofertas" color="offer-title"/>

      {data.ofertas.length?
       <table>
        <colgroup><col className="table-date"/><col/><col className="table-value"/></colgroup>
        <thead className="offer-head">
         <tr><th>Data</th><th>Descrição / Ofertante</th><th className="table-value">Valor</th></tr>
        </thead>
        <tbody>
         {data.ofertas.map(item=><tr key={item.id}>
          <td>{formatDate(item.data)}</td>
          <td className="bold">{item.ofertante||'OFERTA GERAL'}</td>
          <td className="table-value">{formatCurrency(item.valor)}</td>
         </tr>)}
        </tbody>
        <tfoot>
         <tr className="offer-total">
          <td colSpan="2" style={{textAlign:'right'}}>TOTAL OFERTAS</td>
          <td className="table-value">{formatCurrency(totals.totalOfertas)}</td>
         </tr>
        </tfoot>
       </table>
      :<EmptyMessage>Nenhum registro de oferta encontrado para este período.</EmptyMessage>}
     </section>

     {/* DÍZIMOS */}
     <section className="section">
      <SectionTitle icon={Coins} title="Dízimos" color="tithe-title"/>

      {data.dizimos.length?
       <table>
        <colgroup><col className="table-date"/><col/><col className="table-value"/></colgroup>
        <thead className="tithe-head">
         <tr><th>Data</th><th>Dizimista</th><th className="table-value">Valor</th></tr>
        </thead>
        <tbody>
         {data.dizimos.map(item=><tr key={item.id}>
          <td>{formatDate(item.data)}</td>
          <td className="bold">{item.igreja_dizimistas?.nome||'NÃO IDENTIFICADO'}</td>
          <td className="table-value">{formatCurrency(item.valor)}</td>
         </tr>)}
        </tbody>
        <tfoot>
         <tr className="tithe-total">
          <td colSpan="2" style={{textAlign:'right'}}>TOTAL DÍZIMOS</td>
          <td className="table-value">{formatCurrency(totals.totalDizimos)}</td>
         </tr>
        </tfoot>
       </table>
      :<EmptyMessage>Nenhum registro de dízimo encontrado para este período.</EmptyMessage>}
     </section>

     <div className="screen-only-note print-hidden">Página 1 de 2</div>
    </div>

    {/* PÁGINA 2 */}
    <div className="page second-page">

     {/* OUTRAS ENTRADAS */}
     <section className="section">
      <SectionTitle icon={WalletCards} title="Outras Entradas" color="other-title"/>

      {data.outras.length?
       <table>
        <colgroup><col className="table-date"/><col className="table-type"/><col/><col className="table-value"/></colgroup>
        <thead className="other-head">
         <tr><th>Data</th><th>Tipo</th><th>Descrição / Origem</th><th className="table-value">Valor</th></tr>
        </thead>
        <tbody>
         {data.outras.map(item=><tr key={item.id}>
          <td>{formatDate(item.data)}</td>
          <td className="bold">{item.tipo_entrada||'-'}</td>
          <td>{item.igreja_dizimistas?.nome||item.ofertante||'—'}</td>
          <td className="table-value">{formatCurrency(item.valor)}</td>
         </tr>)}
        </tbody>
        <tfoot>
         <tr className="other-total">
          <td colSpan="3" style={{textAlign:'right'}}>TOTAL OUTRAS ENTRADAS</td>
          <td className="table-value">{formatCurrency(totals.totalOutras)}</td>
         </tr>
        </tfoot>
       </table>
      :<EmptyMessage>Nenhum outro registro de entrada encontrado para este período.</EmptyMessage>}
     </section>

     {/* DESPESAS */}
     <section className="section">
      <SectionTitle icon={Receipt} title="Despesas" color="expense-title"/>

      {data.despesas.length?
       <table>
        <colgroup><col className="table-date"/><col/><col className="table-value"/></colgroup>
        <thead className="expense-head">
         <tr><th>Data</th><th>Descrição da Despesa</th><th className="table-value">Valor</th></tr>
        </thead>
        <tbody>
         {data.despesas.map(item=><tr key={item.id}>
          <td>{formatDate(item.data)}</td>
          <td className="bold">{item.despesa||'-'}</td>
          <td className="table-value">{formatCurrency(item.valor)}</td>
         </tr>)}
        </tbody>
        <tfoot>
         <tr className="expense-total">
          <td colSpan="2" style={{textAlign:'right'}}>TOTAL DESPESAS</td>
          <td className="table-value">{formatCurrency(totals.totalDespesas)}</td>
         </tr>
        </tfoot>
       </table>
      :<EmptyMessage>Nenhum registro de despesa encontrado para este período.</EmptyMessage>}
     </section>

     {/* RESUMO */}
     <section className="section">
      <SectionTitle icon={BarChart3} title="Resumo do Período" color="summary-title"/>

      <div className="summary-box">
       <div className="summary-row entry-row">
        <div>
         <BarChart3 className="summary-icon"/>
         <span className="summary-label">Total de Entradas</span>
         <span className="summary-sub">Ofertas + Dízimos + Outras</span>
        </div>
        <div className="summary-value">{formatCurrency(totals.totalEntradasPeriodo)}</div>
       </div>

       <div className="summary-row exit-row">
        <div>
         <Receipt className="summary-icon"/>
         <span className="summary-label">Total de Saídas</span>
         <span className="summary-sub">Despesas</span>
        </div>
        <div className="summary-value">{formatCurrency(totals.totalDespesas)}</div>
       </div>

       <div className="summary-row balance-row">
        <div>
         <BarChart3 className="summary-icon"/>
         <span className="summary-label">Saldo do Período</span>
        </div>
        <div className="summary-value">{formatCurrency(totals.saldoPeriodo)}</div>
       </div>

       <div className="summary-row cash-row">
        <div>
         <WalletCards className="summary-icon"/>
         <span className="summary-label">Saldo Atual em Caixa (Geral)</span>
        </div>
        <div className="summary-value">{formatCurrency(totals.saldoGeral)}</div>
       </div>
      </div>
     </section>

     {/* ASSINATURA */}
     <div className="signature-area">
      <PenLine className="summary-icon" style={{float:'none',margin:'0 0 3mm',color:'#1e3a8a'}}/>
      <div className="signature-line"></div>
      <div className="signature-label">Tesoureiro (a)</div>
     </div>

     {/* RODAPÉ ÚNICO DO RELATÓRIO */}
     <footer className="report-footer">
      <div>Relatório emitido pelo sistema da Tesouraria.</div>
      <div className="footer-center">TESOURARIA</div>
      <div className="footer-right">Data de emissão: {currentDateTime}</div>
     </footer>

     <div className="screen-only-note print-hidden">Página 2 de 2</div>
    </div>

   </div>
  </>
 );
};

export default RelatorioEntradasDespesasPDF;
