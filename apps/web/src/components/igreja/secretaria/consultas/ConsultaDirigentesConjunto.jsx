import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,Crown,Search,Filter,Download,FileText,Printer,ChevronDown,ChevronUp,User,Shield,AlertTriangle,X,CheckCircle2}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardHeader,CardTitle,CardContent,CardFooter}from'@/components/ui/card';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{exportToExcel}from'@/lib/ExportUtils';
import{Helmet}from'react-helmet';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],LIGHT=[239,246,255],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139];

const initials=name=>{
 if(!name)return'D';
 const p=String(name).trim().split(/\s+/);
 return(p.length===1?p[0].slice(0,2):`${p[0][0]}${p[p.length-1][0]}`).toUpperCase();
};

const getFunctions=(m,list)=>{
 const multi=m?.funcoes_multiplas;
 let ids=[];
 if(Array.isArray(multi))ids=multi;
 else if(Array.isArray(multi?.funcoes_ids))ids=multi.funcoes_ids;
 if(ids.length){
  const names=ids.map(id=>list.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);
  if(names.length)return names.join(', ');
 }
 if(m?.funcoes_exercidas)return String(m.funcoes_exercidas);
 if(Array.isArray(m?.igreja_funcoes)){
  const names=m.igreja_funcoes.map(f=>f.nome_funcao).filter(Boolean);
  if(names.length)return names.join(', ');
 }
 if(m?.igreja_funcoes?.nome_funcao)return m.igreja_funcoes.nome_funcao;
 return'-';
};

const getDirectedIds=m=>{
 const multi=m?.dirige_conjuntos_multiplos;
 if(Array.isArray(multi?.conjuntos_ids)&&multi.conjuntos_ids.length)return multi.conjuntos_ids;
 if(Array.isArray(multi)&&multi.length)return multi;
 if(m?.dirige_conjunto_id)return[m.dirige_conjunto_id];
 return[];
};

const imageToBase64=url=>new Promise(resolve=>{
 let finished=false;
 const done=value=>{if(finished)return;finished=true;resolve(value)};
 const img=new Image();
 const timer=setTimeout(()=>done(null),8000);
 img.crossOrigin='anonymous';
 img.onload=()=>{
  try{
   const canvas=document.createElement('canvas');
   canvas.width=img.naturalWidth||img.width;
   canvas.height=img.naturalHeight||img.height;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw new Error('Canvas indisponível.');
   ctx.drawImage(img,0,0);
   clearTimeout(timer);
   done({data:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height});
  }catch{clearTimeout(timer);done(null)}
 };
 img.onerror=()=>{clearTimeout(timer);done(null)};
 img.src=url;
});

const ConsultaDirigentesConjunto=()=>{
 const{toast}=useToast();
 const[conjuntos,setConjuntos]=useState([]),[all,setAll]=useState([]),[funcoesList,setFuncoesList]=useState([]);
 const[loading,setLoading]=useState(true),[status,setStatus]=useState('ATIVO'),[conjunto,setConjunto]=useState('todos'),[search,setSearch]=useState('');
 const[showFilters,setShowFilters]=useState(true),[selected,setSelected]=useState(null);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select(`
     *,
     conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
     dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
     cargo:cargos_igreja(nome_cargo),
     igreja_classes(nome_classe),
     igreja_funcoes(nome_funcao)
    `).eq('is_dirigente',true).order('nome_completo',{ascending:true}),
    supabase.from('igreja_funcoes').select('*').order('nome_funcao',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   setConjuntos(a.data||[]);setAll(b.data||[]);setFuncoesList(c.data||[]);
  }catch(e){toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{load()},[load]);

 const people=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return all.filter(d=>{
   const ids=getDirectedIds(d);
   const names=ids.map(id=>conjuntos.find(c=>String(c.id)===String(id))?.nome_conjunto).filter(Boolean);
   const okStatus=status==='todos'||(d.status||'ATIVO')===status;
   const okConj=conjunto==='todos'||ids.some(id=>String(id)===String(conjunto));
   const text=`${d.nome_completo||''} ${d.cargo?.nome_cargo||''} ${getFunctions(d,funcoesList)} ${names.join(' ')}`.toLowerCase();
   return okStatus&&okConj&&(!term||text.includes(term));
  });
 },[all,conjuntos,funcoesList,status,conjunto,search]);

 const grouped=useMemo(()=>conjuntos.map(c=>({
  ...c,
  dirigentes:people.filter(d=>getDirectedIds(d).some(id=>String(id)===String(c.id)))
 })).filter(c=>c.dirigentes.length),[conjuntos,people]);

 const active=people.filter(d=>(d.status||'ATIVO')==='ATIVO').length;
 const inactive=people.filter(d=>(d.status||'ATIVO')==='INATIVO').length;
 const assignments=grouped.reduce((n,c)=>n+c.dirigentes.length,0);

 const directedNames=m=>{
  const ids=getDirectedIds(m);
  return ids.map(id=>conjuntos.find(c=>String(c.id)===String(id))?.nome_conjunto).filter(Boolean);
 };

 const exportExcel=()=>{
  const rows=grouped.flatMap(c=>c.dirigentes.map(d=>({
   Conjunto:c.nome_conjunto||'',
   Dirigente:d.nome_completo||'',
   'Função/Cargo':d.cargo?.nome_cargo||getFunctions(d,funcoesList),
   Status:d.status||'ATIVO'
  })));
  if(!rows.length){toast({title:'Sem dados',description:'Não há dirigentes para exportar.',variant:'destructive'});return}
  exportToExcel(rows,'Dirigentes_por_Conjunto','Dirigentes');
 };

 const generatePDF=async()=>{
  if(!people.length){toast({title:'Sem dados',description:'Não há dirigentes para gerar o PDF.',variant:'destructive'});return}
  try{
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   doc.setProperties({title:'Dirigentes por Conjunto',subject:'Relatório da Secretaria',author:'Igreja Assembleia de Deus Ministério Plantar'});
   const logo=await imageToBase64(LOGO),today=new Date().toLocaleDateString('pt-BR');
   const statusLabel=status==='todos'?'Todos os Status':status==='ATIVO'?'Ativos':'Inativos';

   doc.setFillColor(...NAVY);doc.rect(0,0,210,34,'F');
   if(logo?.data&&logo.width&&logo.height){
    const scale=Math.min(27/logo.width,21/logo.height);
    try{doc.addImage(logo.data,'PNG',11,6+(21-logo.height*scale)/2,logo.width*scale,logo.height*scale)}catch{}
   }
   doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(12);
   doc.text('IGREJA ASSEMBLEIA DE DEUS',105,12,{align:'center'});
   doc.setFontSize(9);doc.setTextColor(226,232,240);doc.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,18,{align:'center'});
   doc.setFillColor(...YELLOW);doc.roundedRect(55,23,100,7,2,2,'F');
   doc.setTextColor(...NAVY);doc.setFontSize(8);doc.text('DIRIGENTES POR CONJUNTO',105,28,{align:'center'});

   doc.setTextColor(...TEXT);doc.setFontSize(7);doc.setFont('helvetica','normal');
   doc.text(`Status: ${statusLabel}`,14,42);doc.text(`Emitido em: ${today}`,105,42,{align:'center'});doc.text(`Dirigentes: ${people.length}`,196,42,{align:'right'});
   if(search.trim())doc.text(`Busca: ${search.trim()}`,105,47,{align:'center'});

   const summaryY=search.trim()?53:48,boxW=43.5,gap=3;
   [['CONJUNTOS',grouped.length,YELLOW],['DIRIGENTES',people.length,BLUE],['VÍNCULOS',assignments,[124,58,237]],['ATIVOS',active,[34,197,94]]].forEach((b,i)=>{
    const x=14+i*(boxW+gap);
    doc.setFillColor(248,250,252);doc.roundedRect(x,summaryY,boxW,16,2,2,'F');
    doc.setFillColor(...b[2]);doc.roundedRect(x,summaryY,2.5,16,1,1,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(...MUTED);doc.text(b[0],x+6,summaryY+6);
    doc.setFontSize(12);doc.setTextColor(...TEXT);doc.text(String(b[1]),x+6,summaryY+12.5);
   });

   let y=summaryY+23;
   for(const c of grouped){
    if(y+45>270){doc.addPage();y=18}
    doc.setFillColor(...NAVY);doc.roundedRect(14,y,182,11,2,2,'F');
    doc.setFillColor(...YELLOW);doc.circle(21,y+5.5,2.5,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(255,255,255);doc.text(c.nome_conjunto||'Sem nome',28,y+6.5);
    doc.setFillColor(30,41,59);doc.roundedRect(163,y+2,29,7,2,2,'F');
    doc.setFontSize(6.5);doc.setTextColor(255,255,255);doc.text(`${c.dirigentes.length} ${c.dirigentes.length===1?'DIRIGENTE':'DIRIGENTES'}`,177.5,y+6.5,{align:'center'});
    y+=14;

    autoTable(doc,{
     head:[['DIRIGENTE','FUNÇÃO / CARGO','STATUS']],
     body:c.dirigentes.map(d=>[d.nome_completo||'-',d.cargo?.nome_cargo||getFunctions(d,funcoesList),d.status||'ATIVO']),
     startY:y,margin:{left:14,right:14,top:18,bottom:20},theme:'grid',
     styles:{font:'helvetica',fontSize:8.2,cellPadding:{top:3.2,right:3,bottom:3.2,left:3},textColor:TEXT,lineColor:LINE,lineWidth:.2,valign:'middle'},
     headStyles:{fillColor:BLUE,textColor:[255,255,255],fontStyle:'bold',fontSize:7,cellPadding:3.5},
     alternateRowStyles:{fillColor:[248,250,252]},
     columnStyles:{0:{cellWidth:73},1:{cellWidth:78},2:{cellWidth:31,halign:'center'}},
     didParseCell:data=>{
      if(data.section==='body'&&data.column.index===2){
       const value=String(data.cell.raw||'');
       data.cell.styles.textColor=value==='ATIVO'?[22,163,74]:[220,38,38];
       data.cell.styles.fontStyle='bold';
      }
     }
    });
    y=doc.lastAutoTable?.finalY?doc.lastAutoTable.finalY+9:y+20;
   }

   if(y+28>275){doc.addPage();y=18}
   doc.setFillColor(...LIGHT);doc.roundedRect(14,y,182,22,3,3,'F');
   doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...BLUE);doc.text('RESUMO DO RELATÓRIO',20,y+7);
   doc.setFont('helvetica','normal');doc.setTextColor(...TEXT);
   doc.text(`Conjuntos: ${grouped.length}`,20,y+15);doc.text(`Dirigentes: ${people.length}`,72,y+15);doc.text(`Vínculos: ${assignments}`,122,y+15);doc.setTextColor(22,163,74);doc.text(`Ativos: ${active}`,165,y+15);

   const pages=doc.getNumberOfPages();
   doc.setPage(pages);doc.setDrawColor(226,232,240);doc.line(14,286,196,286);
   doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(...MUTED);
   doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',14,291);
   doc.text('SECRETARIA • DIRIGENTES POR CONJUNTO',105,291,{align:'center'});
   doc.text(`Página ${pages} de ${pages}`,196,291,{align:'right'});
   doc.save('Dirigentes_por_Conjunto.pdf');
   toast({title:'PDF Gerado',description:'Relatório de dirigentes criado com sucesso.'});
  }catch(error){toast({title:'Erro ao gerar PDF',description:error?.message||'Não foi possível gerar o relatório.',variant:'destructive'})}
 };

 const print=()=>{
  if(!people.length){toast({title:'Sem dados',description:'Não há dirigentes para imprimir.',variant:'destructive'});return}
  const statusLabel=status==='todos'?'Todos os Status':status==='ATIVO'?'Ativos':'Inativos';
  const rows=grouped.map(c=>`
   <section class="group">
    <div class="group-head"><div><span class="dot"></span>${c.nome_conjunto||'Sem nome'}</div><strong>${c.dirigentes.length} ${c.dirigentes.length===1?'DIRIGENTE':'DIRIGENTES'}</strong></div>
    <table><thead><tr><th>DIRIGENTE</th><th>FUNÇÃO / CARGO</th><th>STATUS</th></tr></thead><tbody>
    ${c.dirigentes.map(d=>`<tr><td>${d.nome_completo||'-'}</td><td>${d.cargo?.nome_cargo||getFunctions(d,funcoesList)}</td><td class="${d.status==='INATIVO'?'inactive':'active'}">${d.status||'ATIVO'}</td></tr>`).join('')}
    </tbody></table>
   </section>`).join('');

  const w=window.open('','_blank','width=900,height=1100');
  if(!w){toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});return}
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dirigentes por Conjunto</title><style>
@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;margin:0}
.header{background:#0f172a;color:#fff;padding:12px 14px 10px;border-radius:0 0 7px 7px;text-align:center;position:relative}.logo{position:absolute;left:13px;top:8px;width:27mm;height:auto;max-height:23mm;object-fit:contain}.inst{font-size:15px;font-weight:800}.sub{font-size:9px;color:#cbd5e1;margin-top:3px}.title{display:inline-block;background:#eab308;color:#0f172a;border-radius:4px;padding:5px 18px;margin-top:7px;font-size:9px;font-weight:800}.meta{display:flex;justify-content:space-between;margin:7px 0 0;font-size:7px;color:#64748b}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px 8px;position:relative}.card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#2563eb;border-radius:5px 0 0 5px}.card:nth-child(1):before{background:#eab308}.card:nth-child(3):before{background:#7c3aed}.card:nth-child(4):before{background:#16a34a}.card-label{font-size:6px;color:#64748b;font-weight:700}.card-value{font-size:13px;font-weight:800;margin-top:2px}.group{break-inside:avoid;page-break-inside:avoid;margin:9px 0}.group-head{display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;border-radius:5px 5px 0 0;padding:7px 9px;font-size:8px;font-weight:800}.group-head .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#eab308;margin-right:6px;vertical-align:middle}.group-head strong{background:#1e293b;border-radius:12px;padding:3px 8px;font-size:6px}table{width:100%;border-collapse:collapse;font-size:7.5px}th{background:#2563eb;color:#fff;padding:5px;text-align:left;border:1px solid #1d4ed8}td{padding:5px;border:1px solid #cbd5e1}tbody tr:nth-child(even) td{background:#f8fafc}td:last-child{text-align:center;font-weight:700}.active{color:#16a34a}.inactive{color:#ef4444}.summary{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:9px;display:grid;grid-template-columns:repeat(4,1fr);font-size:7px}.summary span{font-weight:700;color:#1e3a8a}.footer{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:4px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b;page-break-inside:avoid;break-inside:avoid}.footer span:nth-child(2){font-weight:700;color:#1e3a8a;text-align:center}.footer span:last-child{text-align:right}
</style></head><body>
<div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS</div><div class="sub">MINISTÉRIO PLANTAR • LEROLÂNDIA</div><div class="title">DIRIGENTES POR CONJUNTO</div></div>
<div class="meta"><span>Status: ${statusLabel}${search.trim()?` • Busca: ${search.trim()}`:''}</span><span>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</span><span>Dirigentes: ${people.length}</span></div>
<div class="cards"><div class="card"><div class="card-label">CONJUNTOS</div><div class="card-value">${grouped.length}</div></div><div class="card"><div class="card-label">DIRIGENTES</div><div class="card-value">${people.length}</div></div><div class="card"><div class="card-label">VÍNCULOS</div><div class="card-value">${assignments}</div></div><div class="card"><div class="card-label">ATIVOS</div><div class="card-value">${active}</div></div></div>
${rows}
<div class="summary"><span>Conjuntos: ${grouped.length}</span><span>Dirigentes: ${people.length}</span><span>Vínculos: ${assignments}</span><span>Ativos: ${active}</span></div>
<div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><span>SECRETARIA • DIRIGENTES POR CONJUNTO</span><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script>
</body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <Helmet><title>Dirigentes por Conjunto | Secretaria</title></Helmet>
  <div className="flex-1 space-y-5">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Crown className="h-6 w-6 text-blue-400"/></div><div><h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 md:text-3xl">Dirigentes por Conjunto</h2><p className="text-sm text-muted-foreground">Consulte os dirigentes responsáveis por cada conjunto.</p></div></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)} className="border-yellow-500/50"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp className="ml-1 h-4 w-4"/>:<ChevronDown className="ml-1 h-4 w-4" />}</Button><Button variant="outline" size="sm" onClick={exportExcel} className="border-yellow-500/50"><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={generatePDF} className="border-yellow-500/50"><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={print} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div>
   </div>

   <AnimatePresence>{showFilters&&<motion.div initial={{height:0,opacity:1}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><Card className="border-border bg-card"><CardHeader className="border-b border-border pb-3"><CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>Filtros</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar dirigente ou conjunto..." className="border-border bg-background pl-9"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-background"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Status</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select><Select value={conjunto} onValueChange={setConjunto}><SelectTrigger className="bg-background"><SelectValue placeholder="Conjunto"/></SelectTrigger><SelectContent className="dark-igreja max-h-[280px]"><SelectItem value="todos">Todos os Conjuntos</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select></CardContent></Card></motion.div>}</AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Dirigentes</p><p className="mt-1 text-2xl font-bold">{people.length}</p></div><Crown className="h-5 w-5 text-yellow-400"/></div></CardContent></Card>
    <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Conjuntos</p><p className="mt-1 text-2xl font-bold">{grouped.length}</p></div><Users className="h-5 w-5 text-blue-400"/></div></CardContent></Card>
    <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Vínculos</p><p className="mt-1 text-2xl font-bold text-violet-400">{assignments}</p></div><Users className="h-5 w-5 text-violet-400"/></div></CardContent></Card>
    <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-green-500">{active}</p></div><CheckCircle2 className="h-5 w-5 text-green-500"/></div></CardContent></Card>
   </div>

   {loading?<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{Array(6).fill(0).map((_,i)=><Card key={i} className="h-64 animate-pulse border-border bg-card"/>)}</div>:
   !grouped.length?<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center"><Crown className="mb-4 h-12 w-12 text-muted-foreground/50"/><h3 className="text-lg font-bold">Nenhum dirigente encontrado</h3><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para visualizar os dirigentes.</p></div>:
   <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
    {grouped.map(c=><motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
     <Card className="overflow-hidden border-border bg-card shadow-sm transition-all hover:border-yellow-400/70 hover:shadow-yellow-400/5">
      <CardHeader className="border-b border-border bg-muted/10 pb-3"><CardTitle className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10"><Users className="h-4 w-4 text-yellow-400"/></div><span className="truncate text-base font-bold">{c.nome_conjunto}</span></div><Badge variant="outline" className="border-yellow-400/40 text-yellow-400">{c.dirigentes.length}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3 p-3">
       {c.dirigentes.map(d=>{
        const isInactive=(d.status||'ATIVO')==='INATIVO';
        return <motion.div key={d.id} whileHover={{y:-1}} onClick={()=>setSelected({...d,_conjuntos:directedNames(d)})} className={`cursor-pointer rounded-xl border p-3 transition-colors ${isInactive?'border-red-500/30 bg-red-500/5':'border-border bg-background/40 hover:border-yellow-400/40 hover:bg-yellow-400/5'}`}>
         <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${isInactive?'border-red-500/30 bg-red-500/10 text-red-500':'border-yellow-400/30 bg-yellow-400/10 text-yellow-400'}`}>{initials(d.nome_completo)}</div>
          <div className="min-w-0 flex-1">
           <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className={`truncate text-sm font-bold ${isInactive?'text-red-400':'text-foreground'}`}>{d.nome_completo}</p><div className="mt-1 flex flex-wrap gap-1">{d.cargo?.nome_cargo&&<Badge variant="outline" className="border-yellow-400/30 text-[10px] text-yellow-400"><Shield className="mr-1 h-3 w-3"/>{d.cargo.nome_cargo}</Badge>}<Badge variant="outline" className={`text-[10px] ${isInactive?'border-red-500/30 text-red-500':'border-yellow-400/20 text-yellow-400'}`}>{isInactive?'INATIVO':'ATIVO'}</Badge></div></div><Crown className="h-4 w-4 shrink-0 text-yellow-400"/></div>
           <p className="mt-2 text-xs text-muted-foreground">Dirige {getDirectedIds(d).length} {getDirectedIds(d).length===1?'conjunto':'conjuntos'}</p>
          </div>
         </div>
        </motion.div>
       })}
      </CardContent>
      <CardFooter className="border-t border-border bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">Clique no dirigente para visualizar a ficha.</CardFooter>
     </Card>
    </motion.div>)}
   </div>}

  </div>

  <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}>
   <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">
    {selected&&<div className="max-h-[90vh] overflow-y-auto">
     <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="flex items-center gap-3 text-xl text-primary"><div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10"><User className="h-5 w-5 text-yellow-400"/></div>Ficha do Dirigente</DialogTitle></DialogHeader>
     <div className="space-y-5 p-5 md:p-6">
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5 text-center"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-yellow-400/30 bg-secondary text-2xl font-bold text-yellow-400">{initials(selected.nome_completo)}</div><h2 className="text-2xl font-bold">{selected.nome_completo}</h2><div className="mt-3 flex flex-wrap justify-center gap-2"><Badge variant="outline" className={selected.status==='INATIVO'?'border-red-500/30 text-red-500':'border-emerald-500/30 text-emerald-500'}>{selected.status||'ATIVO'}</Badge>{selected.cargo?.nome_cargo&&<Badge variant="outline" className="border-yellow-400/30 text-yellow-400"><Shield className="mr-1 h-3 w-3"/>{selected.cargo.nome_cargo}</Badge>}</div></div>
      <div><h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados do Dirigente</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
       {[['Nome Completo',selected.nome_completo],['Conjuntos que Dirige',selected._conjuntos?.length?selected._conjuntos.join(', '):'-'],['Cargo',selected.cargo?.nome_cargo||'-'],['Função/Funções',getFunctions(selected,funcoesList)],['Classe da EBD',selected.igreja_classes?.nome_classe||'-'],['É Dirigente','Sim'],['Quantidade de Conjuntos',String(getDirectedIds(selected).length)],['Status',selected.status||'ATIVO']].map(([label,value])=><div key={label} className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span><span className="mt-1 block font-semibold">{value}</span></div>)}
      </div></div>
     </div>
     <DialogFooter className="border-t border-border bg-muted/10 px-5 py-4"><Button variant="outline" onClick={()=>setSelected(null)}><X className="mr-2 h-4 w-4"/>Fechar</Button></DialogFooter>
    </div>}
   </DialogContent>
  </Dialog>
 </div>
};

export default ConsultaDirigentesConjunto;
