import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Briefcase,Printer,Download,FileText,Search,Filter,Users,ChevronDown,ChevronUp,CheckCircle2,AlertTriangle}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Card,CardContent,CardHeader,CardTitle,CardFooter}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],LIGHT=[239,246,255],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139];

const age=v=>{
 if(!v)return'-';
 const b=new Date(`${v}T00:00:00`),t=new Date();
 let a=t.getFullYear()-b.getFullYear(),m=t.getMonth()-b.getMonth();
 if(m<0||(m===0&&t.getDate()<b.getDate()))a--;
 return a;
};
const date=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'-';

const imageToBase64=url=>new Promise(resolve=>{
 let done=false;
 const finish=v=>{if(done)return;done=true;resolve(v)};
 const img=new Image(),timer=setTimeout(()=>finish(null),8000);
 img.crossOrigin='anonymous';
 img.onload=()=>{
  try{
   const c=document.createElement('canvas');
   c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;
   const ctx=c.getContext('2d');if(!ctx)throw new Error();
   ctx.drawImage(img,0,0);clearTimeout(timer);
   finish({data:c.toDataURL('image/png'),width:c.width,height:c.height});
  }catch{clearTimeout(timer);finish(null)}
 };
 img.onerror=()=>{clearTimeout(timer);finish(null)};
 img.src=url;
});

const ConsultaMembrosCargoRelatorio=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[all,setAll]=useState([]),[cargos,setCargos]=useState([]),[loading,setLoading]=useState(true);
 const[cargo,setCargo]=useState('todos'),[status,setStatus]=useState('ATIVO'),[search,setSearch]=useState(''),[showFilters,setShowFilters]=useState(true);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('igreja_membros').select('id,nome_completo,data_nascimento,status,cargo:cargos_igreja(nome_cargo)').order('nome_completo',{ascending:true}),
    supabase.from('cargos_igreja').select('*').order('nome_cargo',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setAll(a.data||[]);setCargos(b.data||[]);
  }catch(e){toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return all.filter(m=>{
   const st=m.status||'ATIVO',cg=m.cargo?.nome_cargo||'Sem Cargo';
   return(status==='todos'||st===status)&&(cargo==='todos'||cg===cargo)&&(!term||`${m.nome_completo||''} ${cg}`.toLowerCase().includes(term));
  });
 },[all,cargo,status,search]);

 const grouped=useMemo(()=>{
  const g={};
  filtered.forEach(m=>{
   const key=m.cargo?.nome_cargo||'Sem Cargo';
   if(!g[key])g[key]=[];
   g[key].push(m);
  });
  return Object.keys(g).sort((a,b)=>{
   if(a==='Sem Cargo')return 1;
   if(b==='Sem Cargo')return-1;
   return a.localeCompare(b,'pt-BR');
  }).reduce((o,k)=>(o[k]=g[k],o),{});
 },[filtered]);

 const active=filtered.filter(m=>(m.status||'ATIVO')==='ATIVO').length;
 const inactive=filtered.filter(m=>(m.status||'ATIVO')==='INATIVO').length;
 const cargoCount=Object.keys(grouped).length;
 const semCargo=grouped['Sem Cargo']?.length||0;

 const exportExcel=()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para exportar.',variant:'destructive'});
  const rows=Object.entries(grouped).flatMap(([c,ms])=>ms.map(m=>({Cargo:c,Nome:m.nome_completo||'',Nascimento:date(m.data_nascimento),Idade:age(m.data_nascimento),Status:m.status||'ATIVO'})));
  const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:28},{wch:40},{wch:14},{wch:10},{wch:14}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Membros por Cargo');
  XLSX.writeFile(wb,'Membros_Por_Cargo.xlsx');
  toast({title:'Excel Gerado',description:'Relatório exportado com sucesso.'});
 };

 const generatePDF=async()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para gerar o PDF.',variant:'destructive'});
  try{
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),logo=await imageToBase64(LOGO);
   doc.setProperties({title:'Membros por Cargo',subject:'Relatório da Secretaria',author:'Igreja Assembleia de Deus Ministério Plantar'});
   doc.setFillColor(...NAVY);doc.rect(0,0,210,34,'F');
   if(logo?.data){const s=Math.min(27/logo.width,21/logo.height);doc.addImage(logo.data,'PNG',11,6+(21-logo.height*s)/2,logo.width*s,logo.height*s)}
   doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('IGREJA ASSEMBLEIA DE DEUS',105,12,{align:'center'});
   doc.setFontSize(9);doc.setTextColor(226,232,240);doc.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,18,{align:'center'});
   doc.setFillColor(...YELLOW);doc.roundedRect(55,23,100,7,2,2,'F');doc.setTextColor(...NAVY);doc.setFontSize(8);doc.text('MEMBROS POR CARGO',105,28,{align:'center'});
   doc.setTextColor(...TEXT);doc.setFontSize(7);doc.setFont('helvetica','normal');
   doc.text(`Status: ${status==='todos'?'Todos os Status':status==='ATIVO'?'Ativos':'Inativos'}`,14,42);
   doc.text(search.trim()?`Busca: ${search.trim()}`:'Todos os cargos',105,42,{align:'center'});
   doc.text(`Total: ${filtered.length}`,196,42,{align:'right'});
   const bw=43.5,g=3;
   [['CARGOS',cargoCount,YELLOW],['MEMBROS',filtered.length,BLUE],['ATIVOS',active,[34,197,94]],['INATIVOS',inactive,[239,68,68]]].forEach((b,i)=>{
    const x=14+i*(bw+g);doc.setFillColor(248,250,252);doc.roundedRect(x,48,bw,16,2,2,'F');
    doc.setFillColor(...b[2]);doc.roundedRect(x,48,2.5,16,1,1,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(...MUTED);doc.text(b[0],x+6,54);
    doc.setFontSize(12);doc.setTextColor(...TEXT);doc.text(String(b[1]),x+6,60.5);
   });
   let y=71;
   for(const[c,ms]of Object.entries(grouped)){
    if(y+45>272){doc.addPage();y=18}
    doc.setFillColor(...NAVY);doc.roundedRect(14,y,182,11,2,2,'F');
    doc.setFillColor(...YELLOW);doc.circle(21,y+5.5,2.5,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(255,255,255);doc.text(c,28,y+6.5);
    doc.setFillColor(30,41,59);doc.roundedRect(165,y+2,27,7,2,2,'F');doc.setFontSize(6.5);doc.text(`${ms.length} ${ms.length===1?'MEMBRO':'MEMBROS'}`,178.5,y+6.5,{align:'center'});
    y+=14;
    autoTable(doc,{head:[['MEMBRO','NASCIMENTO','IDADE','STATUS']],body:ms.map(m=>[m.nome_completo||'-',date(m.data_nascimento),age(m.data_nascimento),m.status||'ATIVO']),startY:y,margin:{left:14,right:14,top:18,bottom:20},theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:3,textColor:TEXT,lineColor:LINE,lineWidth:.2,valign:'middle'},headStyles:{fillColor:BLUE,textColor:[255,255,255],fontStyle:'bold',fontSize:7.2,cellPadding:3.5},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{0:{cellWidth:84},1:{cellWidth:39,halign:'center'},2:{cellWidth:24,halign:'center'},3:{cellWidth:35,halign:'center'}},didParseCell:d=>{if(d.section==='body'&&d.column.index===3){d.cell.styles.textColor=String(d.cell.raw)==='ATIVO'?[22,163,74]:[220,38,38];d.cell.styles.fontStyle='bold'}}});
    y=doc.lastAutoTable?.finalY?doc.lastAutoTable.finalY+9:y+20;
   }
   if(y+28>275){doc.addPage();y=18}
   doc.setFillColor(...LIGHT);doc.roundedRect(14,y,182,22,3,3,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...BLUE);doc.text('RESUMO DO RELATÓRIO',20,y+7);
   doc.setFont('helvetica','normal');doc.setTextColor(...TEXT);doc.text(`Cargos com membros: ${cargoCount}`,20,y+15);doc.text(`Sem cargo: ${semCargo}`,84,y+15);
   doc.setTextColor(22,163,74);doc.text(`Ativos: ${active}`,126,y+15);doc.setTextColor(220,38,38);doc.text(`Inativos: ${inactive}`,164,y+15);
   const pages=doc.getNumberOfPages();doc.setPage(pages);doc.setDrawColor(...LINE);doc.line(14,286,196,286);
   doc.setFontSize(5.5);doc.setTextColor(...MUTED);doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',14,291);
   doc.setFont('helvetica','bold');doc.setTextColor(...BLUE);doc.text('SECRETARIA • MEMBROS POR CARGO',105,291,{align:'center'});
   doc.setFont('helvetica','normal');doc.setTextColor(...MUTED);doc.text(`Página ${pages} de ${pages} • ${new Date().toLocaleDateString('pt-BR')}`,196,291,{align:'right'});
   doc.save('Membros_Por_Cargo.pdf');toast({title:'PDF Gerado',description:'Relatório criado com sucesso.'});
  }catch(e){console.error(e);toast({title:'Erro ao gerar PDF',description:e?.message||'Não foi possível gerar o relatório.',variant:'destructive'})}
 };

 const imprimir=()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para imprimir.',variant:'destructive'});
  const groups=Object.entries(grouped).map(([c,ms])=>`<section class="group"><div class="group-head"><span><i></i>${c}</span><strong>${ms.length} ${ms.length===1?'MEMBRO':'MEMBROS'}</strong></div><table><thead><tr><th>MEMBRO</th><th>NASCIMENTO</th><th>IDADE</th><th>STATUS</th></tr></thead><tbody>${ms.map(m=>`<tr><td>${m.nome_completo||'-'}</td><td class="center">${date(m.data_nascimento)}</td><td class="center">${age(m.data_nascimento)}</td><td class="${m.status==='INATIVO'?'inactive':'active'}">${m.status||'ATIVO'}</td></tr>`).join('')}</tbody></table></section>`).join('');
  const w=window.open('','_blank','width=900,height=1100');
  if(!w)return toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Membros por Cargo</title><style>
@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;margin:0}
.header{background:#0f172a;color:#fff;padding:12px 14px 10px;border-radius:0 0 7px 7px;text-align:center;position:relative}.logo{position:absolute;left:13px;top:8px;width:27mm;height:auto;max-height:23mm;object-fit:contain}.inst{font-size:15px;font-weight:800}.sub{font-size:9px;color:#cbd5e1;margin-top:3px}.title{display:inline-block;background:#eab308;color:#0f172a;border-radius:4px;padding:5px 18px;margin-top:7px;font-size:9px;font-weight:800}.meta{display:flex;justify-content:space-between;margin:7px 0;font-size:7px;color:#64748b}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px 8px}.label{font-size:6px;color:#64748b;font-weight:700}.value{font-size:13px;font-weight:800;margin-top:2px}.group{break-inside:avoid;page-break-inside:avoid;margin:9px 0}.group-head{display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;border-radius:5px 5px 0 0;padding:7px 9px;font-size:8px;font-weight:800}.group-head i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#eab308;margin-right:6px}.group-head strong{background:#1e293b;border-radius:12px;padding:3px 8px;font-size:6px}table{width:100%;border-collapse:collapse;font-size:7.5px}th{background:#2563eb;color:#fff;padding:5px;text-align:left;border:1px solid #1d4ed8}td{padding:5px;border:1px solid #cbd5e1}tbody tr:nth-child(even) td{background:#f8fafc}.center{text-align:center;font-weight:700}.active{color:#16a34a}.inactive{color:#ef4444}.summary{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:9px;display:grid;grid-template-columns:repeat(4,1fr);font-size:7px}.summary span{font-weight:700;color:#1e3a8a}.footer{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:4px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b}.footer span:nth-child(2){font-weight:700;color:#1e3a8a;text-align:center}.footer span:last-child{text-align:right}
</style></head><body><div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS</div><div class="sub">MINISTÉRIO PLANTAR • LEROLÂNDIA</div><div class="title">MEMBROS POR CARGO</div></div><div class="meta"><span>Status: ${status==='todos'?'Todos os Status':status==='ATIVO'?'Ativos':'Inativos'}${search.trim()?` • Busca: ${search.trim()}`:''}</span><span>${cargo==='todos'?'Todos os cargos':cargo}</span><span>${filtered.length} registro(s) • ${new Date().toLocaleDateString('pt-BR')}</span></div><div class="cards"><div class="card"><div class="label">CARGOS</div><div class="value">${cargoCount}</div></div><div class="card"><div class="label">MEMBROS</div><div class="value">${filtered.length}</div></div><div class="card"><div class="label">ATIVOS</div><div class="value">${active}</div></div><div class="card"><div class="label">INATIVOS</div><div class="value">${inactive}</div></div></div>${groups}<div class="summary"><span>Cargos: ${cargoCount}</span><span>Sem cargo: ${semCargo}</span><span>Ativos: ${active}</span><span>Total: ${filtered.length}</span></div><div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><span>SECRETARIA • MEMBROS POR CARGO</span><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),150)<\\/script></body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col"><div className="flex-1 space-y-5">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Briefcase className="h-6 w-6 text-blue-400"/></div><div><h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 md:text-3xl">Membros por Cargo</h2><p className="text-sm text-muted-foreground">Consulte a distribuição dos membros por cargo eclesiástico.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)} className="border-yellow-500/40"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp className="ml-1 h-4 w-4"/>:<ChevronDown className="ml-1 h-4 w-4" />}</Button><Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={generatePDF}><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={imprimir} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div>
  </div>
  <AnimatePresence>{showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><Card><CardHeader className="border-b border-border pb-3"><CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>Filtros</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar membro ou cargo..." className="pl-9"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Status</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select><Select value={cargo} onValueChange={setCargo}><SelectTrigger><SelectValue placeholder="Cargo"/></SelectTrigger><SelectContent className="dark-igreja max-h-[280px]"><SelectItem value="todos">Todos os Cargos</SelectItem>{cargos.map(c=><SelectItem key={c.id} value={c.nome_cargo}>{c.nome_cargo}</SelectItem>)}</SelectContent></Select></CardContent></Card></motion.div>}</AnimatePresence>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[[`Membros`,filtered.length,Users,'text-blue-500'],[`Cargos`,cargoCount,Briefcase,'text-indigo-500'],[`Ativos`,active,CheckCircle2,'text-green-500'],[`Inativos`,inactive,AlertTriangle,'text-red-500']].map(([l,v,I,c])=><Card key={l}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p><p className={`mt-1 text-2xl font-bold ${c}`}>{v}</p></div><I className={`h-5 w-5 ${c}`}/></div></CardContent></Card>)}
  </div>
  {loading?<div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16"><div className="h-9 w-9 rounded-full border-4 border-primary border-t-transparent motion-safe:animate-spin"/><p className="mt-4 text-sm text-muted-foreground">Carregando cargos...</p></div>:!cargoCount?<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center"><Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50"/><h3 className="text-lg font-bold">Nenhum membro encontrado</h3><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para visualizar os registros.</p></div>:<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 pb-6">{Object.entries(grouped).map(([c,ms])=>{const sem=c==='Sem Cargo';return <motion.div key={c} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}><Card className={`h-full overflow-hidden bg-card shadow-sm transition-all hover:border-yellow-400/60 ${sem?'border-amber-500/30':'border-border'}`}><CardHeader className={`border-b border-border pb-3 ${sem?'bg-amber-500/5':'bg-muted/20'}`}><CardTitle className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sem?'bg-amber-500/10':'bg-blue-600/10'}`}><Briefcase className={`h-4 w-4 ${sem?'text-amber-500':'text-blue-500'}`}/></div><div className="min-w-0"><h3 className={`truncate text-base font-bold ${sem?'text-amber-500':'text-foreground'}`}>{c}</h3><p className="text-[10px] text-muted-foreground">{ms.length} {ms.length===1?'membro cadastrado':'membros cadastrados'}</p></div></div><Badge variant={sem?'outline':'secondary'} className={`shrink-0 ${sem?'border-amber-500/30 text-amber-500':''}`}>{ms.length}</Badge></CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[360px]"><div className="divide-y divide-border">{ms.map((m,i)=>{const inactive=(m.status||'ATIVO')==='INATIVO';return <div key={m.id} className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${inactive?'bg-red-500/5':''}`}><div className="flex min-w-0 items-center gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${inactive?'bg-red-500/10 text-red-500':'bg-blue-600/10 text-blue-500'}`}>{i+1}</div><div className="min-w-0"><p className={`truncate text-sm font-semibold ${inactive?'text-red-400':'text-foreground'}`}>{m.nome_completo}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{m.data_nascimento?`${age(m.data_nascimento)} anos`:'Idade não informada'}</p></div></div><Badge variant={inactive?'destructive':'secondary'} className="shrink-0 text-[9px]">{m.status||'ATIVO'}</Badge></div>})}</div></ScrollArea></CardContent><CardFooter className="border-t border-border bg-muted/10 px-4 py-2"><div className="flex w-full items-center justify-between text-[10px] text-muted-foreground"><span>Lista por cargo</span><span>{ms.length} registro(s)</span></div></CardFooter></Card></motion.div>})}</div>}
 </div></div>;
};

export default ConsultaMembrosCargoRelatorio;
