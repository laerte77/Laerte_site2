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

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';

const getBase64Image=url=>new Promise(resolve=>{
 const img=new Image();img.crossOrigin='Anonymous';img.src=url;
 img.onload=()=>{
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  c.getContext('2d').drawImage(img,0,0);resolve(c.toDataURL('image/png'));
 };
 img.onerror=()=>resolve(null);
});

const ConsultaMembrosConjunto=()=>{
 const{toast}=useToast();
 const[allMembros,setAllMembros]=useState([]);
 const[conjuntosBase,setConjuntosBase]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filterStatus,setFilterStatus]=useState('ATIVO');
 const[filterConjunto,setFilterConjunto]=useState('todos');
 const[searchTerm,setSearchTerm]=useState('');
 const[showFilters,setShowFilters]=useState(true);

 const fetchData=useCallback(async()=>{
  setLoading(true);
  try{
   const[conjuntosRes,membrosRes]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select(`
      id,
      nome_completo,
      conjunto_id,
      participa_conjunto,
      status,
      cargo:cargos_igreja(nome_cargo)
    `).order('nome_completo',{ascending:true})
   ]);

   if(conjuntosRes.error)throw conjuntosRes.error;
   if(membrosRes.error)throw membrosRes.error;

   setConjuntosBase(conjuntosRes.data||[]);
   setAllMembros(membrosRes.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',description:error.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filteredData=useMemo(()=>{
  const term=searchTerm.toLowerCase().trim();

  const membrosFiltrados=allMembros.filter(m=>{
   const statusMatch=filterStatus==='todos'||(m.status||'ATIVO')===filterStatus;
   const conjuntoMatch=filterConjunto==='todos'||String(m.conjunto_id)===filterConjunto;
   const searchMatch=!term||(m.nome_completo||'').toLowerCase().includes(term);
   return statusMatch&&conjuntoMatch&&searchMatch;
  });

  let total=0;

  const grouped=conjuntosBase.map(conjunto=>{
   const mems=membrosFiltrados.filter(
    m=>m.participa_conjunto===true&&String(m.conjunto_id)===String(conjunto.id)
   );

   total+=mems.length;

   return{
    ...conjunto,
    membros:mems,
    isSemConjunto:false
   };
  });

  const semConjunto=membrosFiltrados.filter(
   m=>m.participa_conjunto===false||!m.conjunto_id
  );

  if(semConjunto.length>0&&filterConjunto==='todos'){
   grouped.push({
    id:'sem-conjunto',
    nome_conjunto:'SEM CONJUNTO',
    membros:semConjunto,
    isSemConjunto:true
   });
   total+=semConjunto.length;
  }

  return{
   conjuntos:grouped,
   totalMembros:total,
   totalConjuntos:conjuntosBase.length,
   totalComConjunto:grouped.filter(c=>!c.isSemConjunto&&c.membros.length>0).length
  };
 },[allMembros,conjuntosBase,filterStatus,filterConjunto,searchTerm]);

 const handleExportExcel=()=>{
  const exportData=filteredData.conjuntos.flatMap(c=>
   c.membros.map(m=>({
    Conjunto:c.nome_conjunto,
    Membro:m.nome_completo,
    Cargo:m.cargo?.nome_cargo||'-',
    Status:m.status||'ATIVO'
   }))
  );

  if(!exportData.length){
   toast({title:'Nenhum dado',description:'Não há membros para exportar.',variant:'destructive'});
   return;
  }

  exportToExcel(exportData,'Membros_por_Conjunto','Membros');
 };

 const handleGeneratePDF=async()=>{
  const hasData=filteredData.conjuntos.some(c=>c.membros.length>0);

  if(!hasData){
   toast({title:'Nenhum dado',description:'Não há membros para gerar PDF.',variant:'destructive'});
   return;
  }

  const doc=new jsPDF('p','mm','a4');

  try{
   const logo=await getBase64Image(LOGO_URL);
   if(logo)doc.addImage(logo,'PNG',15,10,22,22);
  }catch{}

  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.setTextColor(30,58,138);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,16,{align:'center'});

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text('LEROLÂNDIA',105,23,{align:'center'});

  doc.setFontSize(15);
  doc.setTextColor(30,58,138);
  doc.text('RELATÓRIO DE MEMBROS POR CONJUNTO',105,34,{align:'center'});

  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(71,85,105);

  const statusText=filterStatus==='todos'?'Todos os Status':filterStatus==='ATIVO'?'Ativos':'Inativos';
  doc.text(`Status: ${statusText}`,105,42,{align:'center'});

  let metaY=48;

  if(searchTerm.trim()){
   doc.text(`Busca: ${searchTerm.trim()}`,105,metaY,{align:'center'});
   metaY+=6;
  }

  if(filterConjunto!=='todos'){
   const nome=conjuntosBase.find(c=>String(c.id)===filterConjunto)?.nome_conjunto||'';
   if(nome){
    doc.text(`Conjunto: ${nome}`,105,metaY,{align:'center'});
    metaY+=6;
   }
  }

  let y=metaY+7;

  const gruposComMembros=filteredData.conjuntos.filter(c=>c.membros.length>0);

  gruposComMembros.forEach(conjunto=>{
   if(y>245){
    doc.addPage();
    y=18;
   }

   doc.setFillColor(conjunto.isSemConjunto?254:239,conjunto.isSemConjunto?243:246,conjunto.isSemConjunto?199:255);
   doc.roundedRect(10,y,190,8,2,2,'F');

   doc.setFont('helvetica','bold');
   doc.setFontSize(10);
   doc.setTextColor(conjunto.isSemConjunto?[180,83,9]:[30,58,138]);
   doc.text(conjunto.nome_conjunto,14,y+5.5);
   doc.text(`${conjunto.membros.length} membro${conjunto.membros.length===1?'':'s'}`,196,y+5.5,{align:'right'});

   y+=10;

   const rows=conjunto.membros.map(m=>[
    m.nome_completo||'-',
    m.cargo?.nome_cargo||'-',
    m.status||'ATIVO'
   ]);

   autoTable(doc,{
    head:[['MEMBRO','CARGO','STATUS']],
    body:rows,
    startY:y,
    theme:'grid',
    styles:{
     font:'helvetica',
     fontSize:8.5,
     cellPadding:2.8,
     textColor:[30,41,59],
     lineColor:[203,213,225],
     lineWidth:.2
    },
    headStyles:{
     fillColor:[37,99,235],
     textColor:[255,255,255],
     fontStyle:'bold'
    },
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{
     0:{cellWidth:100},
     1:{cellWidth:60},
     2:{cellWidth:30,halign:'center'}
    },
    margin:{left:10,right:10,top:15,bottom:18}
   });

   y=doc.lastAutoTable.finalY+8;
  });

  if(filteredData.conjuntos.some(c=>c.membros.length===0)){
   const vazios=filteredData.conjuntos.filter(c=>c.membros.length===0);

   if(vazios.length){
    if(y>260){doc.addPage();y=18}

    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(100,116,139);
    doc.text('CONJUNTOS SEM MEMBROS NO FILTRO:',10,y);
    y+=6;

    vazios.forEach(c=>{
     if(y>280){doc.addPage();y=18}
     doc.setFont('helvetica','normal');
     doc.text(`• ${c.nome_conjunto}`,14,y);
     y+=5;
    });
   }
  }

  if(y>260){doc.addPage();y=18}

  doc.setFillColor(239,246,255);
  doc.roundedRect(10,y,190,24,3,3,'F');

  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(30,58,138);
  doc.text('RESUMO',15,y+7);

  doc.setFont('helvetica','normal');
  doc.setTextColor(30,41,59);
  doc.text(`Conjuntos cadastrados: ${filteredData.totalConjuntos}`,15,y+15);
  doc.text(`Conjuntos com membros: ${filteredData.totalComConjunto}`,80,y+15);
  doc.text(`Total de membros: ${filteredData.totalMembros}`,155,y+15);

  doc.setFontSize(8);
  doc.setTextColor(100,116,139);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,10,289);
  doc.text(`Página ${doc.getNumberOfPages()}`,200,289,{align:'right'});

  doc.save('Membros_por_Conjunto.pdf');
 };

 const handlePrint=()=>window.print();

 return <div className="dark-igreja text-foreground">
  <Helmet><title>Membros por Conjunto | Secretaria</title></Helmet>

  <style>{`
   .print-report{display:none}
   @media print{
    @page{size:A4 portrait;margin:10mm}
    body{background:#fff!important;color:#111827!important}
    #root{background:#fff!important}
    .screen-report{display:none!important}
    .print-report{display:block!important}
    .print-report *{color:#111827!important}
    .print-report .report-header{border-bottom:2px solid #1e3a8a;padding-bottom:12px;margin-bottom:18px;text-align:center}
    .print-report .report-logo{width:72px;height:72px;object-fit:contain;margin:0 auto 7px}
    .print-report .report-meta{font-size:10px;color:#475569!important;margin-top:5px}
    .print-report .group-title{margin-top:14px;margin-bottom:5px;padding:6px 8px;background:#eff6ff!important;border-bottom:2px solid #93c5fd;display:flex;justify-content:space-between;font-size:11px;font-weight:800}
    .print-report .group-title.sem-conjunto{background:#fffbeb!important;border-bottom-color:#f59e0b}
    .print-report table{width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:10px}
    .print-report th{background:#2563eb!important;color:#fff!important;padding:6px;border:1px solid #1d4ed8;text-align:left}
    .print-report td{padding:6px;border:1px solid #cbd5e1}
    .print-report tbody tr:nth-child(even) td{background:#f8fafc!important}
    .print-report .empty-group{padding:9px;border:1px dashed #cbd5e1;font-size:9px;color:#64748b!important}
    .print-report .summary{margin-top:18px;padding:10px;border:1px solid #bfdbfe;background:#eff6ff!important;display:flex;justify-content:space-between;gap:12px;font-size:9.5px;font-weight:700}
   }
  `}</style>

  <div className="screen-report">
   <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5 md:space-y-6">

    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
     <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 md:h-16 md:w-16">
       <Music className="h-7 w-7 text-primary md:h-8 md:w-8"/>
      </div>
      <div>
       <h2 className="text-2xl font-bold text-primary md:text-3xl">Membros por Conjunto</h2>
       <p className="text-sm text-muted-foreground md:text-base">Visualize a distribuição dos membros entre os conjuntos da igreja.</p>
      </div>
     </div>

     <div className="flex flex-wrap items-center gap-2">
      <Select value={filterStatus} onValueChange={setFilterStatus}>
       <SelectTrigger className="w-36 border-border bg-card font-bold"><SelectValue placeholder="Status"/></SelectTrigger>
       <SelectContent className="dark-igreja">
        <SelectItem value="todos">Todos</SelectItem>
        <SelectItem value="ATIVO">Ativos</SelectItem>
        <SelectItem value="INATIVO">Inativos</SelectItem>
       </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}>
       <Filter className="mr-2 h-4 w-4"/>{showFilters?'Ocultar Filtros':'Filtros'}
       {showFilters?<ChevronUp className="ml-2 h-4 w-4"/>:<ChevronDown className="ml-2 h-4 w-4"/>}
      </Button>

      <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
       <Download className="mr-2 h-4 w-4"/>Excel
      </Button>

      <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
       <FileText className="mr-2 h-4 w-4"/>PDF
      </Button>

      <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
       <Printer className="mr-2 h-4 w-4"/>Imprimir
      </Button>
     </div>
    </div>

    <AnimatePresence>
     {showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}>
      <Card className="border-border bg-card shadow-lg">
       <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-primary"/>Filtros Avançados</CardTitle>
       </CardHeader>
       <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="relative">
         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
         <Input placeholder="Buscar membro..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="border-input bg-background/50 pl-9"/>
        </div>

        <Select value={filterConjunto} onValueChange={setFilterConjunto}>
         <SelectTrigger className="border-input bg-background/50"><SelectValue placeholder="Conjunto"/></SelectTrigger>
         <SelectContent className="dark-igreja max-h-[240px]">
          <SelectItem value="todos">Todos os Conjuntos</SelectItem>
          {conjuntosBase.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
         </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border border-border bg-muted/20 px-4 py-2">
         <Users className="mr-3 h-5 w-5 text-primary"/>
         <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Membros Listados</p>
          <p className="text-xl font-bold leading-none">{filteredData.totalMembros}</p>
         </div>
        </div>
       </CardContent>
      </Card>
     </motion.div>}
    </AnimatePresence>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
     <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Layers className="h-5 w-5 text-primary"/></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conjuntos</p><p className="text-xl font-bold">{filteredData.totalConjuntos}</p></div>
     </div>

     <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Music className="h-5 w-5 text-primary"/></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conjuntos com Membros</p><p className="text-xl font-bold">{filteredData.totalComConjunto}</p></div>
     </div>

     <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary"/></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registros</p><p className="text-xl font-bold">{filteredData.totalMembros}</p></div>
     </div>
    </div>

    {loading?
     <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent motion-safe:animate-spin"/>
      <p className="mt-4 text-sm text-muted-foreground">Carregando conjuntos...</p>
     </div>
    :filteredData.conjuntos.length===0?
     <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-6"><Music className="h-12 w-12 text-muted-foreground"/></div>
      <h3 className="text-xl font-bold">Nenhum conjunto encontrado</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">Ajuste os filtros para visualizar os membros por conjunto.</p>
     </div>
    :
     <div className="print-content grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {filteredData.conjuntos.map(conjunto=>{
       const vazio=conjunto.membros.length===0;

       return <Card key={conjunto.id} className={`group overflow-hidden bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-md ${conjunto.isSemConjunto?'border-amber-500/30':'border-border hover:border-primary'}`}>
        <CardHeader className={`border-b pb-3 ${conjunto.isSemConjunto?'border-amber-500/20 bg-amber-500/5':'border-border bg-muted/20'}`}>
         <CardTitle className="flex items-center justify-between gap-3">
          <div className={`flex min-w-0 items-center gap-2 ${conjunto.isSemConjunto?'text-amber-600':'text-foreground'}`}>
           <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${conjunto.isSemConjunto?'bg-amber-500/10':'bg-primary/10'}`}>
            {conjunto.isSemConjunto?<UserMinus className="h-4 w-4 text-amber-600"/>:<Music className="h-4 w-4 text-primary"/>}
           </div>
           <span className="truncate text-base font-bold">{conjunto.nome_conjunto}</span>
          </div>
          <Badge variant="outline" className={`shrink-0 ${conjunto.isSemConjunto?'border-amber-500/30 text-amber-600':'border-primary/30 text-primary'}`}>{conjunto.membros.length}</Badge>
         </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
         {vazio?
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
           <Music className="h-8 w-8 text-muted-foreground/40"/>
           <p className="mt-3 text-sm text-muted-foreground">Nenhum membro vinculado a este conjunto{filterStatus!=='todos'&&' para o filtro selecionado'}.</p>
          </div>
         :
          <ScrollArea className="h-[300px] w-full">
           <div className="divide-y divide-border">
            {conjunto.membros.map((membro,index)=>{
             const inactive=(membro.status||'ATIVO')==='INATIVO';

             return <div key={membro.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${inactive?'border-red-500/30 bg-red-500/10 text-red-500':'border-primary/20 bg-primary/10 text-primary'}`}>{index+1}</div>

              <div className="min-w-0 flex-1">
               <p className={`truncate text-sm font-bold ${inactive?'text-red-500':'text-foreground'}`}>{membro.nome_completo}</p>
               <div className="mt-1 flex flex-wrap items-center gap-2">
                {membro.cargo?.nome_cargo&&<span className="truncate text-[10px] font-medium text-muted-foreground">{membro.cargo.nome_cargo}</span>}
                {inactive&&<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-500">INATIVO</span>}
               </div>
              </div>

              <Users className="h-4 w-4 shrink-0 text-muted-foreground"/>
             </div>;
            })}
           </div>
          </ScrollArea>
         }
        </CardContent>
       </Card>;
      })}
     </div>
    }
   </motion.div>
  </div>

  <div className="print-report">
   <div className="report-header">
    <img src={LOGO_URL} alt="Logo" className="report-logo"/>
    <div style={{fontSize:'18px',fontWeight:800,color:'#1e3a8a'}}>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div>
    <div style={{fontSize:'12px',fontWeight:700,color:'#475569',marginTop:'3px'}}>LEROLÂNDIA</div>
    <div style={{fontSize:'18px',fontWeight:800,color:'#1e3a8a',marginTop:'10px'}}>RELATÓRIO DE MEMBROS POR CONJUNTO</div>
    <div className="report-meta">
     Status: {filterStatus==='todos'?'Todos os Status':filterStatus==='ATIVO'?'Ativos':'Inativos'}
     {searchTerm.trim()?` • Busca: ${searchTerm.trim()}`:''}
    </div>
   </div>

   {filteredData.conjuntos.map(conjunto=>
    <div key={conjunto.id}>
     <div className={`group-title ${conjunto.isSemConjunto?'sem-conjunto':''}`}>
      <span>{conjunto.nome_conjunto}</span>
      <span>{conjunto.membros.length} {conjunto.membros.length===1?'membro':'membros'}</span>
     </div>

     {conjunto.membros.length?
      <table>
       <thead><tr><th style={{width:'55%'}}>MEMBRO</th><th style={{width:'30%'}}>CARGO</th><th style={{width:'15%',textAlign:'center'}}>STATUS</th></tr></thead>
       <tbody>
        {conjunto.membros.map(m=>
         <tr key={m.id}>
          <td>{m.nome_completo}</td>
          <td>{m.cargo?.nome_cargo||'-'}</td>
          <td style={{textAlign:'center',fontWeight:700}}>{m.status||'ATIVO'}</td>
         </tr>
        )}
       </tbody>
      </table>
     :
      <div className="empty-group">Nenhum membro vinculado a este conjunto no filtro selecionado.</div>
     }
    </div>
   )}

   <div className="summary">
    <span>Conjuntos cadastrados: {filteredData.totalConjuntos}</span>
    <span>Com membros: {filteredData.totalComConjunto}</span>
    <span>Total de membros: {filteredData.totalMembros}</span>
   </div>

   <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',fontSize:'8px',color:'#64748b'}}>
    <span>Gerado em {new Date().toLocaleString('pt-BR')}</span>
    <span>Secretaria • Registro de Membros</span>
   </div>
  </div>
 </div>;
};

export default ConsultaMembrosConjunto;
