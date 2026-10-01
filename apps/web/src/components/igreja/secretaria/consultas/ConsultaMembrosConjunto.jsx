import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,Music,Download,FileText,Printer,UserMinus,Layers,Search,Filter,ChevronDown,ChevronUp}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardHeader,CardTitle,CardContent}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Badge}from'@/components/ui/badge';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{exportToExcel}from'@/lib/ExportUtils';
import{Helmet}from'react-helmet';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';

const img64=url=>new Promise(resolve=>{
 const i=new Image();i.crossOrigin='Anonymous';i.src=url;
 i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;c.getContext('2d').drawImage(i,0,0);resolve(c.toDataURL('image/png'))};
 i.onerror=()=>resolve(null);
});

const ConsultaMembrosConjunto=()=>{
 const{toast}=useToast();
 const[all,setAll]=useState([]),[conjuntos,setConjuntos]=useState([]),[loading,setLoading]=useState(true);
 const[status,setStatus]=useState('ATIVO'),[conjunto,setConjunto]=useState('todos'),[search,setSearch]=useState(''),[showFilters,setShowFilters]=useState(true);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select('id,nome_completo,conjunto_id,participa_conjunto,status,cargo:cargos_igreja(nome_cargo)').order('nome_completo',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setConjuntos(a.data||[]);
   setAll(b.data||[]);
  }catch(e){
   toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return all.filter(m=>{
   const okStatus=status==='todos'||(m.status||'ATIVO')===status;
   const okConj=conjunto==='todos'||String(m.conjunto_id)===conjunto;
   const okSearch=!term||(m.nome_completo||'').toLowerCase().includes(term);
   return okStatus&&okConj&&okSearch;
  });
 },[all,status,conjunto,search]);

 const grouped=useMemo(()=>{
  const list=conjuntos.map(c=>({
   ...c,
   membros:filtered.filter(m=>m.participa_conjunto===true&&String(m.conjunto_id)===String(c.id)),
   sem:false
  }));
  const sem=filtered.filter(m=>m.participa_conjunto===false||!m.conjunto_id);
  if(sem.length&&conjunto==='todos')list.push({id:'sem-conjunto',nome_conjunto:'SEM CONJUNTO',membros:sem,sem:true});
  return list;
 },[conjuntos,filtered,conjunto]);

 const gruposCom=grouped.filter(c=>c.membros.length&&!c.sem).length;
 const totalSem=grouped.find(c=>c.sem)?.membros.length||0;
 const ativos=filtered.filter(m=>(m.status||'ATIVO')==='ATIVO').length;
 const inativos=filtered.filter(m=>(m.status||'ATIVO')==='INATIVO').length;

 const exportExcel=()=>{
  const rows=grouped.flatMap(c=>c.membros.map(m=>({
   Conjunto:c.nome_conjunto,
   Membro:m.nome_completo,
   Cargo:m.cargo?.nome_cargo||'-',
   Status:m.status||'ATIVO'
  })));
  if(!rows.length){
   toast({title:'Nenhum dado',description:'Não há membros para exportar.',variant:'destructive'});
   return;
  }
  exportToExcel(rows,'Membros_por_Conjunto','Membros');
 };

 const pdf=async()=>{
  if(!filtered.length){
   toast({title:'Nenhum dado',description:'Não há membros para gerar PDF.',variant:'destructive'});
   return;
  }

  const doc=new jsPDF('p','mm','a4');
  const logo=await img64(LOGO);
  if(logo)doc.addImage(logo,'PNG',10,8,20,20);

  doc.setFont('helvetica','bold');
  doc.setTextColor(30,58,138);
  doc.setFontSize(12);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,14,{align:'center'});
  doc.setFontSize(8);
  doc.setTextColor(71,85,105);
  doc.text('LEROLÂNDIA',105,20,{align:'center'});

  doc.setFillColor(30,58,138);
  doc.roundedRect(10,27,190,9,2,2,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.setTextColor(255,255,255);
  doc.text('RELATÓRIO DE MEMBROS POR CONJUNTO',105,33,{align:'center'});

  doc.setFont('helvetica','normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71,85,105);
  doc.text(`Status: ${status==='todos'?'Todos':status==='ATIVO'?'Ativos':'Inativos'}`,10,42);
  doc.text(`Total: ${filtered.length}`,200,42,{align:'right'});
  if(search.trim())doc.text(`Busca: ${search.trim()}`,105,42,{align:'center'});

  let y=49;

  grouped.forEach(c=>{
   if(y>255){
    doc.addPage();
    y=18;
   }

   doc.setFillColor(...(c.sem?[255,247,237]:[239,246,255]));
   doc.roundedRect(10,y,190,8,2,2,'F');

   doc.setFont('helvetica','bold');
   doc.setFontSize(8.5);
   doc.setTextColor(...(c.sem?[180,83,9]:[30,58,138]));
   doc.text(c.nome_conjunto,14,y+5.5);
   doc.text(`${c.membros.length} membro${c.membros.length===1?'':'s'}`,196,y+5.5,{align:'right'});

   y+=10;

   if(c.membros.length){
    autoTable(doc,{
     head:[['MEMBRO','CARGO','STATUS']],
     body:c.membros.map(m=>[
      m.nome_completo||'-',
      m.cargo?.nome_cargo||'-',
      m.status||'ATIVO'
     ]),
     startY:y,
     theme:'grid',
     styles:{font:'helvetica',fontSize:7.5,cellPadding:2.5,textColor:[30,41,59],lineColor:[203,213,225],lineWidth:.2},
     headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold'},
     alternateRowStyles:{fillColor:[248,250,252]},
     columnStyles:{0:{cellWidth:100},1:{cellWidth:60},2:{cellWidth:30,halign:'center'}},
     margin:{left:10,right:10,top:15,bottom:18}
    });
    y=doc.lastAutoTable.finalY+7;
   }else{
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.setTextColor(100,116,139);
    doc.text('Nenhum membro vinculado a este conjunto no filtro selecionado.',14,y+5);
    y+=12;
   }
  });

  if(y>258){doc.addPage();y=18}

  doc.setFillColor(239,246,255);
  doc.roundedRect(10,y,190,20,3,3,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30,58,138);
  doc.text('RESUMO',15,y+6);
  doc.setFont('helvetica','normal');
  doc.setTextColor(30,41,59);
  doc.text(`Conjuntos cadastrados: ${conjuntos.length}`,15,y+13);
  doc.text(`Com membros: ${gruposCom}`,90,y+13);
  doc.text(`Sem conjunto: ${totalSem}`,140,y+13);
  doc.text(`Total: ${filtered.length}`,196,y+13,{align:'right'});

  doc.setFontSize(5.5);
  doc.setTextColor(100,116,139);
  doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',10,288);
  doc.text('SECRETARIA • MEMBROS POR CONJUNTO',105,288,{align:'center'});
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`,200,288,{align:'right'});

  doc.save('Membros_por_Conjunto.pdf');
  toast({title:'PDF Gerado',description:'Relatório de membros por conjunto criado com sucesso.'});
 };

 const imprimir=()=>{
  if(!filtered.length){
   toast({title:'Nenhum dado',description:'Não há membros para imprimir.',variant:'destructive'});
   return;
  }

  const rows=grouped.map(c=>`
   <div class="group ${c.sem?'sem':''}">
    <div class="gt"><span>${c.nome_conjunto}</span><span>${c.membros.length} ${c.membros.length===1?'membro':'membros'}</span></div>
    ${
     c.membros.length?
     `<table><thead><tr><th>MEMBRO</th><th>CARGO</th><th>STATUS</th></tr></thead><tbody>
      ${c.membros.map(m=>`<tr><td>${m.nome_completo||'-'}</td><td>${m.cargo?.nome_cargo||'-'}</td><td class="center">${m.status||'ATIVO'}</td></tr>`).join('')}
     </tbody></table>`:
     `<div class="empty">Nenhum membro vinculado a este conjunto no filtro selecionado.</div>`
    }
   </div>
  `).join('');

  const w=window.open('','_blank','width=900,height=1100');
  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
   return;
  }

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Membros por Conjunto</title><style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1e293b;margin:0}
.header{text-align:center;border-bottom:2px solid #1e3a8a;padding-bottom:8px;margin-bottom:10px;position:relative}
.logo{position:absolute;left:0;top:0;width:25mm;height:22mm;object-fit:contain}
.inst{font-size:16px;font-weight:800;color:#1e3a8a}
.city{font-size:9px;font-weight:700;margin-top:2px}
.title{margin-top:7px;background:#1e3a8a;color:#fff;border-radius:3px;padding:6px;font-size:10px;font-weight:800}
.meta{margin-top:5px;font-size:7px;color:#64748b}
.group{break-inside:avoid;page-break-inside:avoid;margin-top:8px}
.gt{display:flex;justify-content:space-between;background:#eff6ff;border-bottom:2px solid #93c5fd;padding:5px 7px;font-size:8px;font-weight:800;color:#1e3a8a}
.sem .gt{background:#fffbeb;border-color:#f59e0b;color:#b45309}
table{width:100%;border-collapse:collapse;font-size:7.5px;margin-top:3px}
th{background:#2563eb;color:#fff;padding:4px;border:1px solid #1d4ed8;text-align:left}
td{padding:4px;border:1px solid #cbd5e1}
tbody tr:nth-child(even) td{background:#f8fafc}
.center{text-align:center;font-weight:700}
.empty{padding:7px;border:1px dashed #cbd5e1;font-size:7px;color:#64748b}
.summary{margin-top:10px;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#1e3a8a}
.footer{position:fixed;bottom:4mm;left:10mm;right:10mm;border-top:1px solid #cbd5e1;padding-top:3px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b}
.footer span:nth-child(2){text-align:center;font-weight:700;color:#1e3a8a}
.footer span:last-child{text-align:right}
</style></head><body>
<div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div><div class="city">LEROLÂNDIA</div><div class="title">RELATÓRIO DE MEMBROS POR CONJUNTO</div><div class="meta">Status: ${status==='todos'?'Todos':status==='ATIVO'?'Ativos':'Inativos'}${search.trim()?` • Busca: ${search.trim()}`:''} • ${filtered.length} registro(s)</div></div>
${rows}
<div class="summary"><span>Conjuntos: ${conjuntos.length}</span><span>Com membros: ${gruposCom}</span><span>Sem conjunto: ${totalSem}</span><span>Total: ${filtered.length}</span></div>
<div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><span>SECRETARIA • MEMBROS POR CONJUNTO</span><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script>
</body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <Helmet><title>Membros por Conjunto | Secretaria</title></Helmet>

  <div className="flex-1 space-y-5">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
      <Music className="h-6 w-6 text-blue-500"/>
     </div>
     <div>
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 md:text-3xl">Membros por Conjunto</h2>
      <p className="text-sm text-muted-foreground">Distribuição dos membros entre os conjuntos da igreja.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}>
      <Filter className="mr-2 h-4 w-4"/> {showFilters?'Ocultar Filtros':'Filtros'}
      {showFilters?<ChevronUp className="ml-1 h-4 w-4"/>:<ChevronDown className="ml-1 h-4 w-4"/>}
     </Button>
     <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-2 h-4 w-4"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-2 h-4 w-4"/>PDF</Button>
     <Button size="sm" onClick={imprimir} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
    </div>
   </div>

   <AnimatePresence>
    {showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
     <Card>
      <CardHeader className="border-b border-border pb-3">
       <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-primary"/>Filtros</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-3">
       <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar membro..." className="pl-9"/>
       </div>

       <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
        <SelectContent className="dark-igreja">
         <SelectItem value="todos">Todos os Status</SelectItem>
         <SelectItem value="ATIVO">Ativos</SelectItem>
         <SelectItem value="INATIVO">Inativos</SelectItem>
        </SelectContent>
       </Select>

       <Select value={conjunto} onValueChange={setConjunto}>
        <SelectTrigger><SelectValue placeholder="Conjunto"/></SelectTrigger>
        <SelectContent className="dark-igreja max-h-[280px]">
         <SelectItem value="todos">Todos os Conjuntos</SelectItem>
         {conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
        </SelectContent>
       </Select>
      </CardContent>
     </Card>
    </motion.div>}
   </AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Membros</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div><Users className="h-5 w-5 text-blue-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Conjuntos</p><p className="mt-1 text-2xl font-bold">{conjuntos.length}</p></div><Layers className="h-5 w-5 text-indigo-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-green-500">{ativos}</p></div><Users className="h-5 w-5 text-green-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Inativos</p><p className="mt-1 text-2xl font-bold text-red-500">{inativos}</p></div><UserMinus className="h-5 w-5 text-red-500"/></div></CardContent></Card>
   </div>

   {loading?
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
     <div className="h-9 w-9 rounded-full border-4 border-primary border-t-transparent motion-safe:animate-spin"/>
     <p className="mt-4 text-sm text-muted-foreground">Carregando conjuntos...</p>
    </div>
   :
    !grouped.length?
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
     <Music className="mb-4 h-12 w-12 text-muted-foreground/50"/>
     <h3 className="text-lg font-bold">Nenhum conjunto encontrado</h3>
     <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para visualizar os membros.</p>
    </div>
   :
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
     {grouped.map(c=><motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
      <Card className={`overflow-hidden bg-card ${c.sem?'border-amber-500/30':'border-border hover:border-primary'} transition-[border-color,box-shadow]`}>
       <CardHeader className={`border-b pb-3 ${c.sem?'border-amber-500/20 bg-amber-500/5':'border-border bg-muted/20'}`}>
        <CardTitle className="flex items-center justify-between gap-3">
         <div className={`flex min-w-0 items-center gap-2 ${c.sem?'text-amber-600':'text-foreground'}`}>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.sem?'bg-amber-500/10':'bg-primary/10'}`}>
           {c.sem?<UserMinus className="h-4 w-4 text-amber-600"/>:<Music className="h-4 w-4 text-primary"/>}
          </div>
          <span className="truncate text-base font-bold">{c.nome_conjunto}</span>
         </div>
         <Badge variant="outline" className={`shrink-0 ${c.sem?'border-amber-500/30 text-amber-600':'border-primary/30 text-primary'}`}>{c.membros.length}</Badge>
        </CardTitle>
       </CardHeader>

       <CardContent className="p-0">
        {!c.membros.length?
         <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <Music className="h-8 w-8 text-muted-foreground/40"/>
          <p className="mt-3 text-sm text-muted-foreground">Nenhum membro vinculado para o filtro selecionado.</p>
         </div>
        :
         <ScrollArea className="h-[300px]">
          <div className="divide-y divide-border">
           {c.membros.map((m,i)=>{
            const inactive=(m.status||'ATIVO')==='INATIVO';
            return <div key={m.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5">
             <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${inactive?'border-red-500/30 bg-red-500/10 text-red-500':'border-primary/20 bg-primary/10 text-primary'}`}>{i+1}</div>
             <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${inactive?'text-red-500':'text-foreground'}`}>{m.nome_completo}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{m.cargo?.nome_cargo||'Sem cargo'}</p>
             </div>
             {inactive?<Badge variant="destructive">INATIVO</Badge>:<Users className="h-4 w-4 text-muted-foreground"/>}
            </div>;
           })}
          </div>
         </ScrollArea>
        }
       </CardContent>
      </Card>
     </motion.div>)}
    </div>
   }
  </div>
 </div>
};

export default ConsultaMembrosConjunto;
