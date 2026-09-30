import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,User,Search,Filter,Printer,ChevronDown,ChevronUp,Download,FileText,Droplets,Flame,Calendar,Heart,Shield,AlertTriangle,X}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle,CardFooter}from'@/components/ui/card';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Badge}from'@/components/ui/badge';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';

const getBase64Image=url=>new Promise(resolve=>{
 const img=new Image();
 img.crossOrigin='Anonymous';
 img.src=url;
 img.onload=()=>{
  const canvas=document.createElement('canvas');
  canvas.width=img.width;
  canvas.height=img.height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0);
  resolve(canvas.toDataURL('image/png'));
 };
 img.onerror=()=>resolve(null);
});

const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR'):'-';

const getFunctionNames=m=>{
 if(Array.isArray(m?.funcoes_multiplas?.funcoes_ids)&&m.funcoes_multiplas.funcoes_ids.length>0)return m.funcoes_multiplas.funcoes_ids.join(', ');
 return m?.funcoes_exercidas||'-';
};

const CardSkeleton=()=>(
 <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
  <div className="flex items-center space-x-4">
   <div className="h-12 w-12 rounded-full bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
   <div className="space-y-2">
    <div className="h-4 w-32 rounded bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
    <div className="h-3 w-24 rounded bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
   </div>
  </div>
  <div className="space-y-2 pt-2">
   <div className="h-3 w-full rounded bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
   <div className="h-3 w-full rounded bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
   <div className="h-3 w-3/4 rounded bg-muted motion-safe:animate-pulse motion-reduce:animate-none"/>
  </div>
 </div>
);

const ConsultaMembros=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const[membros,setMembros]=useState([]);
 const[funcoes,setFuncoes]=useState([]);
 const[conjuntos,setConjuntos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState('');
 const[filterStatus,setFilterStatus]=useState('ATIVO');
 const[filterFuncao,setFilterFuncao]=useState('todos');
 const[filterConjunto,setFilterConjunto]=useState('todos');
 const[filterEstadoCivil,setFilterEstadoCivil]=useState('todos');
 const[showFilters,setShowFilters]=useState(true);
 const[selectedMembro,setSelectedMembro]=useState(null);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[membrosRes,funcoesRes,conjuntosRes]=await Promise.all([
    supabase.from('igreja_membros').select(`
      *,
      igreja_funcoes(nome_funcao),
      conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
      dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
      igreja_classes(nome_classe),
      cargo:cargos_igreja(nome_cargo)
    `).order('nome_completo',{ascending:true}),
    supabase.from('igreja_funcoes').select('*').order('nome_funcao',{ascending:true}),
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true})
   ]);
   if(membrosRes.error)throw membrosRes.error;
   if(funcoesRes.error)throw funcoesRes.error;
   if(conjuntosRes.error)throw conjuntosRes.error;
   setMembros(membrosRes.data||[]);
   setFuncoes(funcoesRes.data||[]);
   setConjuntos(conjuntosRes.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',description:error.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filteredMembros=useMemo(()=>membros.filter(m=>{
  const searchMatch=(m.nome_completo||'').toLowerCase().includes(searchTerm.toLowerCase());
  const statusMatch=filterStatus==='todos'||(m.status||'ATIVO')===filterStatus;
  const funcaoMatch=filterFuncao==='todos'||String(m.cargo_id)===filterFuncao;
  const conjuntoMatch=filterConjunto==='todos'||String(m.conjunto_id)===filterConjunto||String(m.dirige_conjunto_id)===filterConjunto;
  const estadoCivilMatch=filterEstadoCivil==='todos'||m.estado_civil===filterEstadoCivil;
  return searchMatch&&statusMatch&&funcaoMatch&&conjuntoMatch&&estadoCivilMatch;
 }),[membros,searchTerm,filterStatus,filterFuncao,filterConjunto,filterEstadoCivil]);

 const handlePrint=()=>window.print();

 const handleGeneratePDF=async()=>{
  if(!filteredMembros.length){
   toast({title:'Sem dados',description:'Não há membros para exportar.',variant:'warning'});
   return;
  }
  const doc=new jsPDF();
  try{
   const logoData=await getBase64Image(LOGO_URL);
   if(logoData)doc.addImage(logoData,'PNG',15,15,20,20);
  }catch(error){console.warn('Could not add logo to PDF',error)}
  doc.setFontSize(14);
  doc.setTextColor(30,58,138);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,20,{align:'center'});
  doc.setFontSize(12);
  doc.setTextColor(50,50,50);
  doc.text('LEROLÂNDIA',105,28,{align:'center'});
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.setTextColor(30,58,138);
  doc.text('LISTAGEM DE MEMBROS',105,38,{align:'center'});
  autoTable(doc,{
   head:[['Nome','Nascimento','Admissão','Cargo','Est. Civil','Status']],
   body:filteredMembros.map(m=>[
    m.nome_completo,
    formatDate(m.data_nascimento),
    formatDate(m.data_entrada),
    m.cargo?.nome_cargo||'-',
    m.estado_civil?.toLowerCase()||'-',
    m.status||'ATIVO'
   ]),
   startY:45,
   styles:{fontSize:7,cellPadding:2,lineColor:[200,200,200],lineWidth:.1},
   headStyles:{fillColor:[59,130,246],textColor:255},
   theme:'grid'
  });
  const finalY=doc.lastAutoTable.finalY||45;
  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.setTextColor(0,0,0);
  doc.text(`Total de Membros Listados: ${filteredMembros.length}`,14,finalY+10);
  doc.save(`Membros_${new Date().toISOString().split('T')[0]}.pdf`);
  toast({title:'PDF Gerado',description:'O relatório foi baixado com sucesso.'});
 };

 const handleExportExcel=()=>{
  if(!filteredMembros.length){
   toast({title:'Nenhum dado',description:'A lista de membros está vazia.',variant:'destructive'});
   return;
  }
  const dataToExport=filteredMembros.map(m=>({
   Nome:m.nome_completo,
   'Data de Nascimento':formatDate(m.data_nascimento),
   'Data de Admissão':formatDate(m.data_entrada),
   Cargo:m.cargo?.nome_cargo||'-',
   'Estado Civil':m.estado_civil||'-',
   'Batismo nas Águas':m.is_batizado_aguas?'Sim':'Não',
   'Batismo Espírito Santo':m.is_batizado_espirito?'Sim':'Não',
   Status:m.status||'ATIVO'
  }));
  const worksheet=XLSX.utils.json_to_sheet(dataToExport);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,'Membros');
  XLSX.writeFile(workbook,'Listagem_Membros.xlsx');
  toast({title:'Sucesso',description:'Excel exportado com sucesso.'});
 };

 const getInitials=name=>{
  if(!name)return'M';
  const parts=name.trim().split(/\s+/);
  if(parts.length===1)return parts[0].substring(0,2).toUpperCase();
  return`${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
 };

 const handlePrintFicha=()=>{
  if(!selectedMembro)return;
  const m=selectedMembro;
  const popup=window.open('','_blank','width=900,height=1000');
  if(!popup){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir a ficha.',variant:'destructive'});
   return;
  }
  const funcao=getFunctionNames(m);
  popup.document.write(`
   <!doctype html>
   <html lang="pt-BR">
    <head>
     <meta charset="UTF-8">
     <title>Ficha - ${m.nome_completo}</title>
     <style>
      *{box-sizing:border-box}
      body{margin:0;padding:30px;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}
      .sheet{max-width:760px;margin:0 auto;border:1px solid #bbb;padding:30px}
      .header{text-align:center;border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:24px}
      .header img{width:72px;height:72px;object-fit:contain;margin-bottom:8px}
      .header h1{font-size:20px;margin:0;font-weight:800;text-transform:uppercase}
      .header h2{font-size:16px;margin:5px 0 0;font-weight:700}
      .title{margin-top:16px;font-size:20px;font-weight:800;letter-spacing:1px}
      .member{text-align:center;margin-bottom:24px}
      .member h3{font-size:22px;margin:0 0 6px}
      .status{display:inline-block;padding:4px 10px;border-radius:999px;background:${m.status==='INATIVO'?'#fee2e2':'#dcfce7'};color:${m.status==='INATIVO'?'#b91c1c':'#166534'};font-size:11px;font-weight:700}
      .section{margin-top:22px}
      .section h4{font-size:13px;margin:0 0 10px;padding-bottom:7px;border-bottom:1px solid #bbb;text-transform:uppercase;letter-spacing:.7px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
      .item{font-size:12px}
      .label{font-weight:700;color:#555;display:block;margin-bottom:3px;text-transform:uppercase;font-size:10px}
      .value{font-weight:600}
      .footer{margin-top:28px;padding-top:14px;border-top:1px solid #bbb;text-align:center;font-size:10px;color:#666}
      @media(max-width:700px){body{padding:10px}.sheet{padding:18px}.grid{grid-template-columns:1fr}}
      @media print{body{padding:0}.sheet{border:none;max-width:none;padding:0}}
     </style>
    </head>
    <body>
     <div class="sheet">
      <div class="header">
       <img src="${LOGO_URL}" alt="Logo">
       <h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1>
       <h2>LEROLÂNDIA</h2>
       <div class="title">FICHA DO MEMBRO</div>
      </div>
      <div class="member">
       <h3>${m.nome_completo||'-'}</h3>
       <span class="status">${m.status||'ATIVO'}</span>
      </div>
      <div class="section">
       <h4>Dados Pessoais</h4>
       <div class="grid">
        <div class="item"><span class="label">Nome Completo</span><span class="value">${m.nome_completo||'-'}</span></div>
        <div class="item"><span class="label">Data de Nascimento</span><span class="value">${formatDate(m.data_nascimento)}</span></div>
        <div class="item"><span class="label">Estado Civil</span><span class="value">${m.estado_civil||'-'}</span></div>
        <div class="item"><span class="label">Data de Entrada</span><span class="value">${formatDate(m.data_entrada)}</span></div>
       </div>
      </div>
      <div class="section">
       <h4>Dados Ministeriais</h4>
       <div class="grid">
        <div class="item"><span class="label">Cargo</span><span class="value">${m.cargo?.nome_cargo||'-'}</span></div>
        <div class="item"><span class="label">Função/Funções</span><span class="value">${funcao}</span></div>
        <div class="item"><span class="label">Quantidade de Funções</span><span class="value">${m.funcoes_multiplas?.quantidade||1}</span></div>
       </div>
      </div>
      <div class="section">
       <h4>Dados da Igreja</h4>
       <div class="grid">
        <div class="item"><span class="label">Conjunto</span><span class="value">${m.conjunto?.nome_conjunto||'-'}</span></div>
        <div class="item"><span class="label">Classe da EBD</span><span class="value">${m.igreja_classes?.nome_classe||'-'}</span></div>
        <div class="item"><span class="label">É Dirigente</span><span class="value">${m.is_dirigente?'Sim':'Não'}</span></div>
        <div class="item"><span class="label">Conjunto que Dirige</span><span class="value">${m.dirige_conjunto?.nome_conjunto||'-'}</span></div>
       </div>
      </div>
      <div class="section">
       <h4>Dados Eclesiásticos</h4>
       <div class="grid">
        <div class="item"><span class="label">Batizado nas Águas</span><span class="value">${m.is_batizado_aguas?'Sim':'Não'}</span></div>
        <div class="item"><span class="label">Batizado no Espírito Santo</span><span class="value">${m.is_batizado_espirito?'Sim':'Não'}</span></div>
        <div class="item"><span class="label">Status</span><span class="value">${m.status||'ATIVO'}</span></div>
       </div>
      </div>
      <div class="footer">Documento gerado pelo sistema da Secretaria.</div>
     </div>
     <script>window.onload=()=>{window.focus();window.print()}</script>
    </body>
   </html>
  `);
  popup.document.close();
 };

 const handleGenerateFichaPDF=async()=>{
  if(!selectedMembro)return;
  const m=selectedMembro;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const gold=[30,58,138];
  let y=18;
  try{
   const logoData=await getBase64Image(LOGO_URL);
   if(logoData)doc.addImage(logoData,'PNG',85,y,40,40);
  }catch(error){console.warn('Logo da ficha não adicionada',error)}
  y+=48;
  doc.setTextColor(...gold);
  doc.setFont('helvetica','bold');
  doc.setFontSize(15);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,y,{align:'center'});
  y+=8;
  doc.setTextColor(50,50,50);
  doc.setFontSize(12);
  doc.text('LEROLÂNDIA',105,y,{align:'center'});
  y+=10;
  doc.setTextColor(...gold);
  doc.setFontSize(16);
  doc.text('FICHA DO MEMBRO',105,y,{align:'center'});
  y+=12;
  doc.setTextColor(20,20,20);
  doc.setFontSize(15);
  doc.text(m.nome_completo||'-',105,y,{align:'center'});
  y+=8;
  doc.setFontSize(9);
  doc.text(`STATUS: ${m.status||'ATIVO'}`,105,y,{align:'center'});
  y+=12;

  autoTable(doc,{
   startY:y,
   theme:'grid',
   head:[['DADO PESSOAL','INFORMAÇÃO']],
   body:[
    ['Nome Completo',m.nome_completo||'-'],
    ['Data de Nascimento',formatDate(m.data_nascimento)],
    ['Estado Civil',m.estado_civil||'-'],
    ['Data de Entrada',formatDate(m.data_entrada)]
   ],
   headStyles:{fillColor:gold,textColor:255,fontStyle:'bold'},
   styles:{fontSize:10,cellPadding:4},
   columnStyles:{0:{cellWidth:55},1:{cellWidth:120}}
  });
  y=doc.lastAutoTable.finalY+8;

  autoTable(doc,{
   startY:y,
   theme:'grid',
   head:[['DADO MINISTERIAL','INFORMAÇÃO']],
   body:[
    ['Cargo',m.cargo?.nome_cargo||'-'],
    ['Função/Funções',getFunctionNames(m)],
    ['Quantidade de Funções',String(m.funcoes_multiplas?.quantidade||1)]
   ],
   headStyles:{fillColor:gold,textColor:255,fontStyle:'bold'},
   styles:{fontSize:10,cellPadding:4},
   columnStyles:{0:{cellWidth:55},1:{cellWidth:120}}
  });
  y=doc.lastAutoTable.finalY+8;

  autoTable(doc,{
   startY:y,
   theme:'grid',
   head:[['DADO DA IGREJA','INFORMAÇÃO']],
   body:[
    ['Conjunto',m.conjunto?.nome_conjunto||'-'],
    ['Classe da EBD',m.igreja_classes?.nome_classe||'-'],
    ['É Dirigente',m.is_dirigente?'Sim':'Não'],
    ['Conjunto que Dirige',m.dirige_conjunto?.nome_conjunto||'-']
   ],
   headStyles:{fillColor:gold,textColor:255,fontStyle:'bold'},
   styles:{fontSize:10,cellPadding:4},
   columnStyles:{0:{cellWidth:55},1:{cellWidth:120}}
  });
  y=doc.lastAutoTable.finalY+8;

  autoTable(doc,{
   startY:y,
   theme:'grid',
   head:[['DADO ECLESIÁSTICO','INFORMAÇÃO']],
   body:[
    ['Batizado nas Águas',m.is_batizado_aguas?'Sim':'Não'],
    ['Batizado no Espírito Santo',m.is_batizado_espirito?'Sim':'Não'],
    ['Status',m.status||'ATIVO']
   ],
   headStyles:{fillColor:gold,textColor:255,fontStyle:'bold'},
   styles:{fontSize:10,cellPadding:4},
   columnStyles:{0:{cellWidth:55},1:{cellWidth:120}}
  });

  doc.setFontSize(8);
  doc.setTextColor(100,100,100);
  doc.text('Documento gerado pelo sistema da Secretaria.',105,287,{align:'center'});
  doc.save(`Ficha_${(m.nome_completo||'Membro').replace(/\s+/g,'_')}.pdf`);
  toast({title:'Ficha em PDF',description:'A ficha do membro foi gerada com sucesso.'});
 };

 return <div className="dark-igreja text-foreground">
  <style>{`
   @media print{
    @page{margin:1cm;size:landscape}
    .no-print{display:none!important}
    .print-only{display:block!important}
    body{background-color:white!important;color:black!important}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background-color:#dbeafe!important;color:#1e3a8a!important;font-weight:bold;text-align:left;padding:4px;border:1px solid #93c5fd}
    td{padding:4px;border:1px solid #e2e8f0;vertical-align:middle}
    tr:nth-child(even){background-color:#f8fafc!important}
    .header-logo{width:80px;height:80px;object-fit:contain;display:block;margin:0 auto}
   }
   .print-only{display:none}
  `}</style>

  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="no-print space-y-5 md:space-y-6 motion-reduce:transition-none">
   <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div className="flex items-center gap-3">
     <img src={LOGO_URL} alt="Logo" className="h-14 w-14 object-contain md:h-16 md:w-16"/>
     <div>
      <h2 className="text-2xl font-bold text-primary md:text-3xl">Consulta de Membros</h2>
      <p className="text-sm text-muted-foreground md:text-base">Visualize e filtre os membros da igreja.</p>
     </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     <Select value={filterStatus} onValueChange={setFilterStatus}>
      <SelectTrigger className="w-36 border-border bg-card font-bold"><SelectValue placeholder="Status"/></SelectTrigger>
      <SelectContent className="dark-igreja">
       <SelectItem value="todos" className="font-bold">Todos</SelectItem>
       <SelectItem value="ATIVO" className="font-bold text-green-500">Ativos</SelectItem>
       <SelectItem value="INATIVO" className="font-bold text-red-500">Inativos</SelectItem>
      </SelectContent>
     </Select>
     <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-500/30 text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/10"><Download className="mr-2 h-4 w-4"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="border-rose-500/30 text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10"><FileText className="mr-2 h-4 w-4"/>PDF</Button>
     <Button variant="default" size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
    </div>
   </div>

   <Card className="border-border bg-card shadow-lg backdrop-blur-sm">
    <CardHeader className="border-b border-border pb-3">
     <CardTitle className="flex items-center justify-between text-base">
      <div className="flex items-center font-bold"><Filter className="mr-2 h-4 w-4 text-primary"/>Filtros Avançados</div>
      <Button variant="ghost" size="sm" onClick={()=>setShowFilters(!showFilters)} className="h-8 w-8 p-0" aria-label={showFilters?'Ocultar filtros':'Mostrar filtros'}>
       {showFilters?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
      </Button>
     </CardTitle>
    </CardHeader>

    <AnimatePresence>
     {showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.3}} className="motion-reduce:transition-none">
      <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">
       <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
        <Input placeholder="Buscar por nome..." value={searchTerm||''} onChange={e=>setSearchTerm(e.target.value)} className="border-input bg-background/50 pl-9"/>
       </div>

       <Select value={filterConjunto||'todos'} onValueChange={setFilterConjunto}>
        <SelectTrigger className="border-input bg-background/50"><SelectValue placeholder="Conjunto"/></SelectTrigger>
        <SelectContent className="dark-igreja max-h-[200px]">
         <SelectItem value="todos">Todos os Conjuntos</SelectItem>
         {conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
        </SelectContent>
       </Select>

       <Select value={filterEstadoCivil||'todos'} onValueChange={setFilterEstadoCivil}>
        <SelectTrigger className="border-input bg-background/50"><SelectValue placeholder="Estado Civil"/></SelectTrigger>
        <SelectContent className="dark-igreja">
         <SelectItem value="todos">Todos</SelectItem>
         <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
         <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
         <SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem>
         <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
        </SelectContent>
       </Select>
      </CardContent>
     </motion.div>}
    </AnimatePresence>
   </Card>

   <div className="flex items-center justify-between px-2">
    <p className="text-sm font-medium text-muted-foreground">
     Exibindo <span className="mx-1 text-lg font-bold text-primary">{filteredMembros.length}</span> registro(s)
     {filterStatus!=='todos'&&<span> (Status: <strong>{filterStatus}</strong>)</span>}
    </p>
   </div>

   <div className="overflow-hidden rounded-md border border-border bg-card">
    <ScrollArea className="h-[calc(100vh-340px)] min-h-[400px]">
     <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2 md:p-4 xl:grid-cols-3">
      {loading&&Array(6).fill(0).map((_,i)=><CardSkeleton key={i}/> )}

      {!loading&&!filteredMembros.length&&<div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
       <div className="mb-4 rounded-full bg-muted p-6 motion-safe:animate-pulse motion-reduce:animate-none"><Users className="h-12 w-12 text-muted-foreground"/></div>
       <h3 className="text-xl font-bold">Nenhum membro encontrado</h3>
       <p className="mt-2 max-w-sm text-muted-foreground">Tente ajustar seus filtros de busca.</p>
      </div>}

      {!loading&&filteredMembros.length>0&&filteredMembros.map(membro=>{
       const isInactive=membro.status==='INATIVO';
       return <motion.div key={membro.id} layout initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} transition={{duration:.2}} className="group cursor-pointer motion-reduce:transition-none" onClick={()=>setSelectedMembro(membro)}>
        <Card className={`relative overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow,transform] duration-300 hover:-translate-y-px motion-reduce:transition-none ${isInactive?'border-red-500/50 bg-red-950/10 hover:border-red-400':'border-border bg-card hover:border-primary hover:bg-primary/5'}`}>
         {isInactive&&<div className="absolute right-3 top-3 flex items-center gap-1 rounded border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-500"><AlertTriangle className="h-3 w-3" aria-hidden="true"/>INATIVO</div>}

         <CardHeader className="relative flex flex-row items-start gap-4 space-y-0 overflow-hidden pb-3">
          <div className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xl font-bold shadow-sm ${isInactive?'border-red-500/30 bg-red-900/30 text-red-400':'border-border bg-secondary text-secondary-foreground'}`}>
           {getInitials(membro.nome_completo)}
          </div>
          <div className="z-10 min-w-0 flex-1 pr-16">
           <CardTitle className={`truncate text-base font-bold transition-colors motion-reduce:transition-none ${isInactive?'text-red-400':'group-hover:text-primary'}`}>{membro.nome_completo}</CardTitle>
           <div className="mt-1.5 flex flex-col gap-1">
            {membro.cargo?.nome_cargo&&<span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${isInactive?'bg-red-900/20 text-red-300':'bg-primary/10 text-primary'}`}><Shield className="h-3 w-3" aria-hidden="true"/>{membro.cargo.nome_cargo}</span>}
            {membro.funcoes_multiplas?.quantidade&&<span className="text-[10px] font-medium text-muted-foreground">{membro.funcoes_multiplas.quantidade} Função(ões)</span>}
           </div>
          </div>
         </CardHeader>

         <CardContent className="space-y-3 pb-3 pt-1 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
           <div className="space-y-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isInactive?'text-red-400':'text-primary'}`}><Calendar className="h-3 w-3" aria-hidden="true"/>Nascimento</span>
            <p className="truncate border-l-2 border-border pl-4 font-semibold">{formatDate(membro.data_nascimento)}</p>
           </div>
           <div className="space-y-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isInactive?'text-red-400':'text-primary'}`}><Heart className="h-3 w-3" aria-hidden="true"/>Estado Civil</span>
            <p className="truncate border-l-2 border-border pl-4 font-semibold capitalize">{membro.estado_civil?membro.estado_civil.toLowerCase():'-'}</p>
           </div>
           <div className="col-span-2 space-y-1 pt-1">
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isInactive?'text-red-400':'text-primary'}`}><Users className="h-3 w-3" aria-hidden="true"/>Conjunto / Classe</span>
            <div className="mt-1 flex flex-wrap gap-2">
             {membro.conjunto?.nome_conjunto&&<Badge variant="secondary" className="border-border bg-secondary text-secondary-foreground">{membro.conjunto.nome_conjunto}</Badge>}
             {membro.igreja_classes?.nome_classe&&<Badge variant="secondary" className="border-border bg-secondary text-secondary-foreground">EBD: {membro.igreja_classes.nome_classe}</Badge>}
             {!membro.conjunto?.nome_conjunto&&!membro.igreja_classes?.nome_classe&&<span className="pl-2 text-xs italic text-muted-foreground">Nenhuma participação</span>}
            </div>
           </div>
          </div>
         </CardContent>

         <CardFooter className={`flex items-center justify-between gap-2 border-t pb-4 pt-3 ${isInactive?'border-red-500/20 bg-red-950/20':'border-border bg-muted/20'}`}>
          <div className="flex w-full gap-2">
           <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-bold ${membro.is_batizado_aguas?isInactive?'border-red-800 bg-red-900/30 text-red-300':'border-primary/50 bg-primary/20 text-primary':'border-border bg-muted text-muted-foreground grayscale opacity-70'}`}>
            <Droplets className="h-3.5 w-3.5"/><span>Águas</span>
           </div>
           <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-bold ${membro.is_batizado_espirito?isInactive?'border-red-800 bg-red-900/30 text-red-300':'border-primary/50 bg-primary/20 text-primary':'border-border bg-muted text-muted-foreground grayscale opacity-70'}`}>
            <Flame className="h-3.5 w-3.5"/><span>Espírito</span>
           </div>
          </div>
         </CardFooter>
        </Card>
       </motion.div>;
      })}
     </div>
    </ScrollArea>
   </div>
  </motion.div>

  <Dialog open={!!selectedMembro} onOpenChange={open=>{if(!open)setSelectedMembro(null)}}>
   <DialogContent className="max-w-4xl overflow-hidden border-border bg-card p-0 text-foreground">
    {selectedMembro&&<div className="max-h-[90vh] overflow-y-auto">
     <DialogHeader className="border-b border-border bg-card px-6 py-5">
      <DialogTitle className="flex items-center gap-3 text-xl text-primary md:text-2xl">
       <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <User className="h-5 w-5 text-primary"/>
       </div>
       Ficha do Membro
      </DialogTitle>
     </DialogHeader>

     <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
       <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-secondary text-2xl font-bold text-primary">{getInitials(selectedMembro.nome_completo)}</div>
       <h2 className="text-2xl font-bold md:text-3xl">{selectedMembro.nome_completo}</h2>
       <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge className={selectedMembro.status==='INATIVO'?'border-red-500/30 bg-red-500/10 text-red-500':'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'}>{selectedMembro.status||'ATIVO'}</Badge>
        {selectedMembro.cargo?.nome_cargo&&<Badge variant="outline" className="border-primary/30 text-primary"><Shield className="mr-1 h-3 w-3"/>{selectedMembro.cargo.nome_cargo}</Badge>}
       </div>
      </div>

      <div>
       <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados Pessoais</h3>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
         ['Nome Completo',selectedMembro.nome_completo],
         ['Data de Nascimento',formatDate(selectedMembro.data_nascimento)],
         ['Estado Civil',selectedMembro.estado_civil||'-'],
         ['Data de Entrada',formatDate(selectedMembro.data_entrada)]
        ].map(([label,value])=><div key={label} className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span><span className="mt-1 block font-semibold">{value}</span></div>)}
       </div>
      </div>

      <div>
       <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados Ministeriais</h3>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cargo</span><span className="mt-1 block font-semibold">{selectedMembro.cargo?.nome_cargo||'-'}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Função/Funções</span><span className="mt-1 block font-semibold">{getFunctionNames(selectedMembro)}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantidade de Funções</span><span className="mt-1 block font-semibold">{selectedMembro.funcoes_multiplas?.quantidade||1}</span></div>
       </div>
      </div>

      <div>
       <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados da Igreja</h3>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conjunto</span><span className="mt-1 block font-semibold">{selectedMembro.conjunto?.nome_conjunto||'-'}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Classe da EBD</span><span className="mt-1 block font-semibold">{selectedMembro.igreja_classes?.nome_classe||'-'}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">É Dirigente</span><span className="mt-1 block font-semibold">{selectedMembro.is_dirigente?'Sim':'Não'}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conjunto que Dirige</span><span className="mt-1 block font-semibold">{selectedMembro.dirige_conjunto?.nome_conjunto||'-'}</span></div>
       </div>
      </div>

      <div>
       <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados Eclesiásticos</h3>
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={`rounded-lg border p-3 ${selectedMembro.is_batizado_aguas?'border-blue-500/30 bg-blue-500/5':'border-border bg-background/40'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Droplets className="h-3.5 w-3.5"/>Batizado nas Águas</span><span className="mt-1 block font-semibold">{selectedMembro.is_batizado_aguas?'Sim':'Não'}</span></div>
        <div className={`rounded-lg border p-3 ${selectedMembro.is_batizado_espirito?'border-orange-500/30 bg-orange-500/5':'border-border bg-background/40'}`}><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Flame className="h-3.5 w-3.5"/>Batizado no Espírito Santo</span><span className="mt-1 block font-semibold">{selectedMembro.is_batizado_espirito?'Sim':'Não'}</span></div>
        <div className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span><span className="mt-1 block font-semibold">{selectedMembro.status||'ATIVO'}</span></div>
       </div>
      </div>
     </div>

     <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/10 px-5 py-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={()=>setSelectedMembro(null)}><X className="mr-2 h-4 w-4"/>Fechar</Button>
      <Button type="button" variant="outline" onClick={handlePrintFicha} className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"><Printer className="mr-2 h-4 w-4"/>Imprimir Ficha</Button>
      <Button type="button" onClick={handleGenerateFichaPDF} className="bg-primary text-primary-foreground hover:bg-primary/90"><FileText className="mr-2 h-4 w-4"/>Gerar PDF</Button>
     </DialogFooter>
    </div>}
   </DialogContent>
  </Dialog>

  <div className="print-only mx-auto max-w-[297mm] bg-white p-4 text-black">
   <div className="mb-6 flex flex-col items-center border-b-2 border-black pb-4">
    <img src={LOGO_URL} alt="Logo" className="header-logo mb-2"/>
    <h1 className="text-center text-xl font-extrabold uppercase tracking-wide">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1>
    <h2 className="text-center text-lg font-bold uppercase">LEROLÂNDIA</h2>
    <h3 className="mt-3 rounded-full border px-6 py-1 text-center text-lg font-bold uppercase">LISTAGEM DE MEMBROS</h3>
    {filterStatus!=='todos'&&<h4 className="mt-1 text-md text-center font-bold uppercase">STATUS: {filterStatus}</h4>}
   </div>

   <table className="w-full border-collapse text-xs">
    <thead><tr>
     <th className="border-b-2 p-2 text-left font-bold uppercase">NOME</th>
     <th className="border-b-2 p-2 text-center font-bold uppercase">NASCIMENTO</th>
     <th className="border-b-2 p-2 text-center font-bold uppercase">ADMISSÃO</th>
     <th className="border-b-2 p-2 text-left font-bold uppercase">CARGO</th>
     <th className="border-b-2 p-2 text-center font-bold uppercase">EST. CIVIL</th>
     <th className="border-b-2 p-2 text-center font-bold uppercase">STATUS</th>
    </tr></thead>
    <tbody>
     {filteredMembros.map((m,idx)=><tr key={m.id} className={idx%2===0?'bg-gray-100':''}>
      <td className="border-b p-2 font-semibold uppercase">{m.nome_completo}</td>
      <td className="border-b p-2 text-center">{formatDate(m.data_nascimento)}</td>
      <td className="border-b p-2 text-center">{formatDate(m.data_entrada)}</td>
      <td className="border-b p-2 font-medium uppercase">{m.cargo?.nome_cargo||'-'}</td>
      <td className="border-b p-2 text-center capitalize">{m.estado_civil?.toLowerCase()||'-'}</td>
      <td className="border-b p-2 text-center font-bold">{m.status||'ATIVO'}</td>
     </tr>)}
    </tbody>
   </table>

   <div className="mt-8 border-t-2 pt-4 text-center text-sm font-bold">Total de Membros Listados: {filteredMembros.length}</div>
  </div>
 </div>;
};

export default ConsultaMembros;
