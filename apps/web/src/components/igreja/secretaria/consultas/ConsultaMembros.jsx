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
const COLORS={blue:[30,58,138],cyan:[14,165,233],light:[239,246,255],line:[203,213,225],text:[30,41,59],muted:[100,116,139]};

const getBase64Image=url=>new Promise(resolve=>{
 const img=new Image();
 img.crossOrigin='Anonymous';
 img.src=url;
 img.onload=()=>{
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth||img.width;
  canvas.height=img.naturalHeight||img.height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0);
  resolve({data:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height});
 };
 img.onerror=()=>resolve(null);
});

const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR'):'-';

const getFunctionNames=(m,funcoes)=>{
 const ids=m?.funcoes_multiplas?.funcoes_ids;
 if(Array.isArray(ids)&&ids.length){
  const nomes=ids.map(id=>funcoes.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);
  if(nomes.length)return nomes.join(', ');
 }
 return m?.funcoes_exercidas||'-';
};

const escapeHtml=value=>String(value??'-').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const getInitials=name=>{
 if(!name)return'M';
 const parts=name.trim().split(/\s+/);
 if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
 return`${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
};

const CardSkeleton=()=>(
 <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
  <div className="flex items-center gap-4">
   <div className="h-12 w-12 rounded-full bg-muted motion-safe:animate-pulse"/>
   <div className="space-y-2">
    <div className="h-4 w-32 rounded bg-muted motion-safe:animate-pulse"/>
    <div className="h-3 w-24 rounded bg-muted motion-safe:animate-pulse"/>
   </div>
  </div>
  <div className="space-y-2 pt-2">
   <div className="h-3 w-full rounded bg-muted motion-safe:animate-pulse"/>
   <div className="h-3 w-full rounded bg-muted motion-safe:animate-pulse"/>
   <div className="h-3 w-3/4 rounded bg-muted motion-safe:animate-pulse"/>
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
  }finally{
   setLoading(false);
  }
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
   const logo=await getBase64Image(LOGO_URL);
   if(logo){
    const maxW=20,maxH=20,ratio=logo.width/logo.height;
    const w=Math.min(maxW,maxH*ratio),h=w/ratio;
    doc.addImage(logo.data,'PNG',15,15,w,h);
   }
  }catch(error){console.warn('Logo não adicionada',error)}

  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.blue);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,20,{align:'center'});
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text('LEROLÂNDIA',105,28,{align:'center'});
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.blue);
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
   headStyles:{fillColor:COLORS.blue,textColor:255},
   theme:'grid'
  });

  const finalY=doc.lastAutoTable.finalY||45;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica','normal');
  doc.text(`Total de Membros Listados: ${filteredMembros.length}`,14,finalY+10);
  doc.save(`Membros_${new Date().toISOString().split('T')[0]}.pdf`);
  toast({title:'PDF Gerado',description:'O relatório foi baixado com sucesso.'});
 };

 const handleExportExcel=()=>{
  if(!filteredMembros.length){
   toast({title:'Nenhum dado',description:'A lista de membros está vazia.',variant:'destructive'});
   return;
  }

  const data=filteredMembros.map(m=>({
   Nome:m.nome_completo,
   'Data de Nascimento':formatDate(m.data_nascimento),
   'Data de Admissão':formatDate(m.data_entrada),
   Cargo:m.cargo?.nome_cargo||'-',
   'Estado Civil':m.estado_civil||'-',
   'Batismo nas Águas':m.is_batizado_aguas?'Sim':'Não',
   'Batismo Espírito Santo':m.is_batizado_espirito?'Sim':'Não',
   Status:m.status||'ATIVO'
  }));

  const worksheet=XLSX.utils.json_to_sheet(data);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,'Membros');
  XLSX.writeFile(workbook,'Listagem_Membros.xlsx');
  toast({title:'Sucesso',description:'Excel exportado com sucesso.'});
 };

 const fichaDados=m=>[
  ['Nome Completo',m.nome_completo||'-'],
  ['Data de Nascimento',formatDate(m.data_nascimento)],
  ['Estado Civil',m.estado_civil||'-'],
  ['Data de Entrada',formatDate(m.data_entrada)],
  ['Cargo',m.cargo?.nome_cargo||'-'],
  ['Função/Funções',getFunctionNames(m,funcoes)],
  ['Quantidade de Funções',m.funcoes_multiplas?.quantidade||1],
  ['Conjunto',m.conjunto?.nome_conjunto||'-'],
  ['Classe da EBD',m.igreja_classes?.nome_classe||'-'],
  ['É Dirigente',m.is_dirigente?'Sim':'Não'],
  ['Conjunto que Dirige',m.dirige_conjunto?.nome_conjunto||'-'],
  ['Batizado nas Águas',m.is_batizado_aguas?'Sim':'Não'],
  ['Batizado no Espírito Santo',m.is_batizado_espirito?'Sim':'Não'],
  ['Status',m.status||'ATIVO']
 ];

 const buildFichaSections=m=>[
  {title:'Dados Pessoais',fields:fichaDados(m).slice(0,4)},
  {title:'Dados Ministeriais',fields:fichaDados(m).slice(4,7)},
  {title:'Dados da Igreja',fields:fichaDados(m).slice(7,11)},
  {title:'Registros Eclesiásticos',fields:fichaDados(m).slice(11,14)}
 ];

 const handlePrintFicha=()=>{
  if(!selectedMembro)return;

  const m=selectedMembro;
  const popup=window.open('','_blank','width=900,height=1000');

  if(!popup){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir a ficha.',variant:'destructive'});
   return;
  }

  const sections=buildFichaSections(m);

  const makeFields=fields=>fields.map(([label,value])=>`
   <div class="field">
    <span class="label">${escapeHtml(label)}</span>
    <span class="value">${escapeHtml(value)}</span>
   </div>`).join('');

  popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha - ${escapeHtml(m.nome_completo)}</title>
<style>
@page{size:A4 portrait;margin:8mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b}
.sheet{position:relative;width:194mm;min-height:281mm;margin:auto;overflow:hidden}
.watermark{position:absolute;z-index:0;left:50%;top:55%;transform:translate(-50%,-50%);width:135mm;height:auto;max-height:135mm;object-fit:contain;opacity:.045}
.content{position:relative;z-index:1}
.header{display:grid;grid-template-columns:38mm 1fr 38mm;align-items:center;border-bottom:2px solid #1e3a8a;padding:2mm 0 4mm}
.logo{max-width:30mm;max-height:24mm;width:auto;height:auto;object-fit:contain;justify-self:start}
.header-center{text-align:center}
.header-center h1{margin:0;color:#1e3a8a;font-size:13px;font-weight:800;text-transform:uppercase;line-height:1.2}
.header-center h2{margin:2px 0 0;color:#334155;font-size:9px;font-weight:700}
.header-right{justify-self:end;text-align:right}
.header-right .small{display:block;color:#64748b;font-size:6.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.header-right strong{display:block;margin-top:2px;color:#1e3a8a;font-size:9px}
.title{margin-top:4mm;background:#1e3a8a;color:#fff;border-radius:3px;padding:5px 8px;text-align:center;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
.subtitle{text-align:center;margin:2mm 0 3mm;color:#64748b;font-size:6.8px;font-weight:600}
.member{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;border:1px solid #bfdbfe;background:#eff6ff;border-left:4px solid #0ea5e9;border-radius:4px;padding:6px 8px;margin-bottom:3mm}
.member-name{font-size:13px;font-weight:800;text-transform:uppercase;color:#0f172a}
.status{border:1px solid #1e3a8a;border-radius:99px;padding:4px 8px;color:#1e3a8a;font-size:7px;font-weight:800;text-transform:uppercase;background:#fff}
.section{margin-top:3mm}
.section-title{display:flex;align-items:center;gap:5px;margin-bottom:1.5mm;padding:4px 6px;border-bottom:1px solid #93c5fd;color:#1e3a8a;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;background:linear-gradient(90deg,#eff6ff,rgba(239,246,255,0))}
.section-title:before{content:"";display:block;width:3px;height:11px;border-radius:2px;background:#0ea5e9}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm}
.grid.three{grid-template-columns:1fr 1fr 1fr}
.field{min-height:12mm;border:1px solid #cbd5e1;border-radius:3px;padding:3mm;background:rgba(255,255,255,.82)}
.label{display:block;color:#64748b;font-size:6.3px;font-weight:800;text-transform:uppercase;letter-spacing:.35px;margin-bottom:1.5mm}
.value{display:block;color:#0f172a;font-size:8.5px;font-weight:700;line-height:1.2;word-break:break-word}
.footer{margin-top:5mm;padding-top:2.5mm;border-top:1px solid #cbd5e1;display:grid;grid-template-columns:1fr 1fr;gap:10mm;color:#64748b;font-size:6.5px}
.footer-box{min-height:12mm}
.footer-line{margin-top:7mm;border-top:1px solid #64748b;padding-top:1.5mm;text-align:center;color:#64748b}
@media print{.sheet{width:100%;min-height:auto}.watermark{opacity:.045}}
</style>
</head>
<body>
<div class="sheet">
<img class="watermark" src="${LOGO_URL}" alt="">
<div class="content">

<div class="header">
<img class="logo" src="${LOGO_URL}" alt="Logo">
<div class="header-center">
<h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1>
<h2>LEROLÂNDIA</h2>
</div>
<div class="header-right">
<span class="small">SECRETARIA</span>
<strong>REGISTRO DE MEMBRO</strong>
</div>
</div>

<div class="title">Ficha de Atualização de Cadastro e Registro de Membro</div>
<div class="subtitle">Documento individual gerado pelo sistema da Secretaria</div>

<div class="member">
<div class="member-name">${escapeHtml(m.nome_completo||'-')}</div>
<div class="status">${escapeHtml(m.status||'ATIVO')}</div>
</div>

${sections.map(section=>`
<div class="section">
<div class="section-title">${escapeHtml(section.title)}</div>
<div class="grid${section.title==='Registros Eclesiásticos'?' three':''}">
${makeFields(section.fields)}
</div>
</div>`).join('')}

<div class="footer">
<div class="footer-box">Ficha emitida eletronicamente pelo sistema da Secretaria.</div>
<div class="footer-box" style="text-align:right">Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
</div>

<div class="footer-line">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR • LEROLÂNDIA</div>

</div>
</div>

<script>window.onload=()=>{window.focus();window.print()}</script>
</body>
</html>`);

  popup.document.close();
 };

 const handleGenerateFichaPDF=async()=>{
  if(!selectedMembro)return;

  const m=selectedMembro;
  const sections=buildFichaSections(m);
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  const margin=10;
  const pageW=210;
  const contentW=pageW-margin*2;
  let y=9;

  try{
   const logo=await getBase64Image(LOGO_URL);
   if(logo){
    const maxW=26,maxH=21,ratio=logo.width/logo.height;
    const w=Math.min(maxW,maxH*ratio),h=w/ratio;
    doc.addImage(logo.data,'PNG',margin,y,w,h);
   }
  }catch(error){console.warn('Logo não adicionada',error)}

  doc.setFont('helvetica','bold');
  doc.setTextColor(...COLORS.blue);
  doc.setFontSize(12);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,15,{align:'center'});
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.text);
  doc.text('LEROLÂNDIA',105,20,{align:'center'});
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(6.5);
  doc.text('SECRETARIA',190,13,{align:'right'});
  doc.setTextColor(...COLORS.blue);
  doc.setFontSize(7.5);
  doc.text('REGISTRO DE MEMBRO',190,18,{align:'right'});

  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(margin,24,contentW,9,2,2,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text('FICHA DE ATUALIZAÇÃO DE CADASTRO E REGISTRO DE MEMBRO',105,30,{align:'center'});

  doc.setFont('helvetica','normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Documento individual gerado pelo sistema da Secretaria',105,36,{align:'center'});

  doc.setFillColor(...COLORS.light);
  doc.setDrawColor(147,197,253);
  doc.roundedRect(margin,39,contentW,11,2,2,'FD');

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.text(m.nome_completo||'-',margin+5,46);

  doc.setDrawColor(...COLORS.blue);
  doc.setFillColor(255,255,255);
  doc.roundedRect(164,42,24,5,2,2,'FD');
  doc.setTextColor(...COLORS.blue);
  doc.setFontSize(6.5);
  doc.text(m.status||'ATIVO',176,45.4,{align:'center'});

  y=55;

  const drawField=(x,w,label,value,height=11)=>{
   doc.setFillColor(255,255,255);
   doc.setDrawColor(...COLORS.line);
   doc.roundedRect(x,y,w,height,1.5,1.5,'FD');
   doc.setFont('helvetica','bold');
   doc.setFontSize(5.7);
   doc.setTextColor(...COLORS.muted);
   doc.text(label.toUpperCase(),x+2.5,y+3.5);

   doc.setFontSize(7.5);
   doc.setTextColor(...COLORS.text);
   const lines=doc.splitTextToSize(String(value||'-'),w-5);
   doc.text(lines.slice(0,2),x+2.5,y+7.2,{lineHeightFactor:1.05});
  };

  const drawSection=(title,fields,columns=2)=>{
   doc.setFillColor(...COLORS.light);
   doc.setDrawColor(147,197,253);
   doc.rect(margin,y,contentW,6,'F');
   doc.setFillColor(...COLORS.cyan);
   doc.rect(margin,y,2,6,'F');
   doc.setTextColor(...COLORS.blue);
   doc.setFont('helvetica','bold');
   doc.setFontSize(7);
   doc.text(title.toUpperCase(),margin+5,y+4);

   y+=8;

   const gap=3;
   const w=(contentW-gap*(columns-1))/columns;

   for(let i=0;i<fields.length;i+=columns){
    const row=fields.slice(i,i+columns);
    row.forEach((field,j)=>drawField(margin+j*(w+gap),w,field[0],field[1]));
    y+=14;
   }

   y+=1.5;
  };

  sections.slice(0,3).forEach(section=>drawSection(section.title,section.fields,2));
  drawSection(sections[3].title,sections[3].fields,3);

  const wm=await getBase64Image(LOGO_URL).catch(()=>null);
  if(wm){
   const maxW=110,maxH=90,ratio=wm.width/wm.height;
   const w=Math.min(maxW,maxH*ratio),h=w/ratio;
   const x=(pageW-w)/2,z=155-(h/2);
   doc.setGState(new doc.GState({opacity:.045}));
   doc.addImage(wm.data,'PNG',x,z,w,h);
   doc.setGState(new doc.GState({opacity:1}));
  }

  doc.setDrawColor(...COLORS.line);
  doc.line(margin,281,pageW-margin,281);
  doc.setFont('helvetica','normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLORS.muted);
  doc.text('Ficha emitida eletronicamente pelo sistema da Secretaria.',margin,286);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`,pageW-margin,286,{align:'right'});
  doc.setFont('helvetica','bold');
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR • LEROLÂNDIA',105,291,{align:'center'});

  doc.save(`Ficha_Membro_${(m.nome_completo||'Membro').replace(/\s+/g,'_')}.pdf`);
  toast({title:'Ficha em PDF',description:'A ficha foi criada em formato A4 em uma única folha.'});
 };

 return <div className="dark-igreja text-foreground">

  <style>{`
   @media print{
    @page{margin:1cm;size:landscape}
    .no-print{display:none!important}
    .print-only{display:block!important}
    body{background:#fff!important;color:#000!important}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#dbeafe!important;color:#1e3a8a!important;font-weight:bold;text-align:left;padding:4px;border:1px solid #93c5fd}
    td{padding:4px;border:1px solid #e2e8f0;vertical-align:middle}
    tr:nth-child(even){background:#f8fafc!important}
    .header-logo{width:80px;height:80px;object-fit:contain;display:block;margin:0 auto}
   }
   .print-only{display:none}
  `}</style>

  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="no-print space-y-5 md:space-y-6">

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
      <SelectTrigger className="w-36 border-border bg-card font-bold">
       <SelectValue placeholder="Status"/>
      </SelectTrigger>
      <SelectContent className="dark-igreja">
       <SelectItem value="todos">Todos</SelectItem>
       <SelectItem value="ATIVO">Ativos</SelectItem>
       <SelectItem value="INATIVO">Inativos</SelectItem>
      </SelectContent>
     </Select>

     <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
      <Download className="mr-2 h-4 w-4"/>Excel
     </Button>

     <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
      <FileText className="mr-2 h-4 w-4"/>PDF
     </Button>

     <Button variant="default" size="sm" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4"/>Imprimir
     </Button>

    </div>
   </div>

   <Card className="border-border bg-card shadow-lg">

    <CardHeader className="border-b border-border pb-3">
     <CardTitle className="flex items-center justify-between text-base">

      <div className="flex items-center font-bold">
       <Filter className="mr-2 h-4 w-4 text-primary"/>
       Filtros Avançados
      </div>

      <Button variant="ghost" size="sm" onClick={()=>setShowFilters(!showFilters)} className="h-8 w-8 p-0">
       {showFilters?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
      </Button>

     </CardTitle>
    </CardHeader>

    <AnimatePresence>
     {showFilters&&
      <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}>

       <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">

        <div className="relative">
         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
         <Input placeholder="Buscar por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9"/>
        </div>

        <Select value={filterConjunto} onValueChange={setFilterConjunto}>
         <SelectTrigger><SelectValue placeholder="Conjunto"/></SelectTrigger>
         <SelectContent className="dark-igreja max-h-[200px]">
          <SelectItem value="todos">Todos os Conjuntos</SelectItem>
          {conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
         </SelectContent>
        </Select>

        <Select value={filterEstadoCivil} onValueChange={setFilterEstadoCivil}>
         <SelectTrigger><SelectValue placeholder="Estado Civil"/></SelectTrigger>
         <SelectContent className="dark-igreja">
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem>
          <SelectItem value="CASADO(A)">Casado(a)</SelectItem>
          <SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem>
          <SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem>
         </SelectContent>
        </Select>

       </CardContent>

      </motion.div>
     }
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

      {!loading&&!filteredMembros.length&&
       <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-6"><Users className="h-12 w-12 text-muted-foreground"/></div>
        <h3 className="text-xl font-bold">Nenhum membro encontrado</h3>
        <p className="mt-2 max-w-sm text-muted-foreground">Tente ajustar seus filtros de busca.</p>
       </div>
      }

      {!loading&&filteredMembros.map(membro=>{
       const inactive=membro.status==='INATIVO';

       return <motion.div key={membro.id} initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} className="group cursor-pointer" onClick={()=>setSelectedMembro(membro)}>

        <Card className={`relative overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-px ${inactive?'border-red-500/50 bg-red-950/10':'border-border bg-card hover:border-primary hover:bg-primary/5'}`}>

         {inactive&&
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-500">
           <AlertTriangle className="h-3 w-3"/>INATIVO
          </div>
         }

         <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">

          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xl font-bold ${inactive?'border-red-500/30 bg-red-900/30 text-red-400':'border-border bg-secondary text-secondary-foreground'}`}>
           {getInitials(membro.nome_completo)}
          </div>

          <div className="min-w-0 flex-1 pr-10">

           <CardTitle className={`truncate text-base font-bold ${inactive?'text-red-400':'group-hover:text-primary'}`}>
            {membro.nome_completo}
           </CardTitle>

           <div className="mt-1.5 flex flex-col gap-1">

            {membro.cargo?.nome_cargo&&
             <span className="flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              <Shield className="h-3 w-3"/>
              {membro.cargo.nome_cargo}
             </span>
            }

            {membro.funcoes_multiplas?.quantidade&&
             <span className="text-[10px] text-muted-foreground">
              {membro.funcoes_multiplas.quantidade} Função(ões)
             </span>
            }

           </div>
          </div>

         </CardHeader>

         <CardContent className="space-y-3 pb-3 pt-1 text-sm">

          <div className="grid grid-cols-2 gap-4">

           <div>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
             <Calendar className="h-3 w-3"/>Nascimento
            </span>
            <p className="mt-1 truncate border-l-2 border-border pl-3 font-semibold">{formatDate(membro.data_nascimento)}</p>
           </div>

           <div>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
             <Heart className="h-3 w-3"/>Estado Civil
            </span>
            <p className="mt-1 truncate border-l-2 border-border pl-3 font-semibold capitalize">{membro.estado_civil?.toLowerCase()||'-'}</p>
           </div>

           <div className="col-span-2">

            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
             <Users className="h-3 w-3"/>Conjunto / Classe
            </span>

            <div className="mt-1 flex flex-wrap gap-2">
             {membro.conjunto?.nome_conjunto&&<Badge variant="secondary">{membro.conjunto.nome_conjunto}</Badge>}
             {membro.igreja_classes?.nome_classe&&<Badge variant="secondary">EBD: {membro.igreja_classes.nome_classe}</Badge>}
             {!membro.conjunto?.nome_conjunto&&!membro.igreja_classes?.nome_classe&&<span className="text-xs italic text-muted-foreground">Nenhuma participação</span>}
            </div>

           </div>

          </div>
         </CardContent>

         <CardFooter className="border-t border-border bg-muted/20 pb-4 pt-3">

          <div className="flex w-full gap-2">

           <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-bold ${membro.is_batizado_aguas?'border-primary/50 bg-primary/10 text-primary':'border-border bg-muted text-muted-foreground opacity-60'}`}>
            <Droplets className="h-3.5 w-3.5"/>Águas
           </div>

           <div className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-bold ${membro.is_batizado_espirito?'border-primary/50 bg-primary/10 text-primary':'border-border bg-muted text-muted-foreground opacity-60'}`}>
            <Flame className="h-3.5 w-3.5"/>Espírito
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

    {selectedMembro&&
     <div className="max-h-[90vh] overflow-y-auto">

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

        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-secondary text-2xl font-bold text-primary">
         {getInitials(selectedMembro.nome_completo)}
        </div>

        <h2 className="text-2xl font-bold">{selectedMembro.nome_completo}</h2>

        <div className="mt-3 flex flex-wrap justify-center gap-2">

         <Badge className={selectedMembro.status==='INATIVO'?'border-red-500/30 bg-red-500/10 text-red-500':'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'}>
          {selectedMembro.status||'ATIVO'}
         </Badge>

         {selectedMembro.cargo?.nome_cargo&&
          <Badge variant="outline" className="border-primary/30 text-primary">
           <Shield className="mr-1 h-3 w-3"/>
           {selectedMembro.cargo.nome_cargo}
          </Badge>
         }

        </div>

       </div>

       {buildFichaSections(selectedMembro).map(section=>
        <div key={section.title}>

         <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">
          {section.title}
         </h3>

         <div className={`grid gap-4 ${section.title==='Registros Eclesiásticos'?'grid-cols-1 sm:grid-cols-3':'grid-cols-1 sm:grid-cols-2'}`}>

          {section.fields.map(([label,value])=>
           <div key={label} className="rounded-lg border border-border bg-background/40 p-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="mt-1 block font-semibold">{value}</span>
           </div>
          )}

         </div>

        </div>
       )}

      </div>

      <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/10 px-5 py-4 sm:flex-row sm:justify-end">

       <Button type="button" variant="outline" onClick={()=>setSelectedMembro(null)}>
        <X className="mr-2 h-4 w-4"/>Fechar
       </Button>

       <Button type="button" variant="outline" onClick={handlePrintFicha} className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
        <Printer className="mr-2 h-4 w-4"/>Imprimir Ficha
       </Button>

       <Button type="button" onClick={handleGenerateFichaPDF}>
        <FileText className="mr-2 h-4 w-4"/>Gerar PDF
       </Button>

      </DialogFooter>

     </div>
    }

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
    <thead>
     <tr>
      <th className="border-b-2 p-2 text-left font-bold uppercase">NOME</th>
      <th className="border-b-2 p-2 text-center font-bold uppercase">NASCIMENTO</th>
      <th className="border-b-2 p-2 text-center font-bold uppercase">ADMISSÃO</th>
      <th className="border-b-2 p-2 text-left font-bold uppercase">CARGO</th>
      <th className="border-b-2 p-2 text-center font-bold uppercase">EST. CIVIL</th>
      <th className="border-b-2 p-2 text-center font-bold uppercase">STATUS</th>
     </tr>
    </thead>
    <tbody>
     {filteredMembros.map((m,idx)=>
      <tr key={m.id} className={idx%2===0?'bg-gray-100':''}>
       <td className="border-b p-2 font-semibold uppercase">{m.nome_completo}</td>
       <td className="border-b p-2 text-center">{formatDate(m.data_nascimento)}</td>
       <td className="border-b p-2 text-center">{formatDate(m.data_entrada)}</td>
       <td className="border-b p-2 font-medium uppercase">{m.cargo?.nome_cargo||'-'}</td>
       <td className="border-b p-2 text-center capitalize">{m.estado_civil?.toLowerCase()||'-'}</td>
       <td className="border-b p-2 text-center font-bold">{m.status||'ATIVO'}</td>
      </tr>
     )}
    </tbody>
   </table>

   <div className="mt-8 border-t-2 pt-4 text-center text-sm font-bold">
    Total de Membros Listados: {filteredMembros.length}
   </div>

  </div>

 </div>;
};

export default ConsultaMembros;
