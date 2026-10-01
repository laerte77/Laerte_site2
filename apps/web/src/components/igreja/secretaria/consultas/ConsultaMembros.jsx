import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,User,Search,Filter,Printer,ChevronDown,ChevronUp,Download,FileText,Droplets,Flame,Calendar,Heart,Shield,AlertTriangle,X,CheckCircle2,UserMinus,Layers}from'lucide-react';
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

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],LIGHT=[239,246,255],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139];

const formatDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR'):'-';

const initials=name=>{
 if(!name)return'M';
 const p=String(name).trim().split(/\s+/);
 return(p.length===1?p[0].slice(0,2):`${p[0][0]}${p[p.length-1][0]}`).toUpperCase();
};

const functions=(m,list)=>{
 const ids=m?.funcoes_multiplas?.funcoes_ids;
 if(Array.isArray(ids)&&ids.length){
  const names=ids.map(id=>list.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);
  if(names.length)return names.join(', ');
 }
 return m?.funcoes_exercidas||m?.igreja_funcoes?.nome_funcao||'-';
};

const escapeHtml=value=>String(value??'-').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const imageToBase64=url=>new Promise(resolve=>{
 let done=false;
 const finish=v=>{if(done)return;done=true;resolve(v)};
 const img=new Image();
 const timer=setTimeout(()=>finish(null),8000);
 img.crossOrigin='anonymous';
 img.onload=()=>{
  try{
   const canvas=document.createElement('canvas');
   canvas.width=img.naturalWidth||img.width;
   canvas.height=img.naturalHeight||img.height;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw new Error();
   ctx.drawImage(img,0,0);
   clearTimeout(timer);
   finish({data:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height});
  }catch{clearTimeout(timer);finish(null)}
 };
 img.onerror=()=>{clearTimeout(timer);finish(null)};
 img.src=url;
});

const ConsultationSkeleton=()=>(
 <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
  <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-muted"/><div className="space-y-2"><div className="h-4 w-40 rounded bg-muted"/><div className="h-3 w-24 rounded bg-muted"/></div></div>
  <div className="mt-5 space-y-3"><div className="h-3 w-full rounded bg-muted"/><div className="h-3 w-4/5 rounded bg-muted"/></div>
 </div>
);

const ConsultaMembros=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const[membros,setMembros]=useState([]);
 const[funcoesList,setFuncoesList]=useState([]);
 const[conjuntos,setConjuntos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[status,setStatus]=useState('ATIVO');
 const[conjunto,setConjunto]=useState('todos');
 const[estadoCivil,setEstadoCivil]=useState('todos');
 const[showFilters,setShowFilters]=useState(true);
 const[selected,setSelected]=useState(null);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
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
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(c.error)throw c.error;
   setMembros(a.data||[]);
   setFuncoesList(b.data||[]);
   setConjuntos(c.data||[]);
  }catch(error){
   toast({title:'Erro ao buscar dados',description:error.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return membros.filter(m=>{
   const okStatus=status==='todos'||(m.status||'ATIVO')===status;
   const okConjunto=conjunto==='todos'||String(m.conjunto_id)===String(conjunto)||String(m.dirige_conjunto_id)===String(conjunto);
   const okCivil=estadoCivil==='todos'||m.estado_civil===estadoCivil;
   const text=`${m.nome_completo||''} ${m.cargo?.nome_cargo||''} ${functions(m,funcoesList)}`.toLowerCase();
   return okStatus&&okConjunto&&okCivil&&(!term||text.includes(term));
  });
 },[membros,status,conjunto,estadoCivil,search,funcoesList]);

 const ativos=filtered.filter(m=>(m.status||'ATIVO')==='ATIVO').length;
 const inativos=filtered.filter(m=>(m.status||'ATIVO')==='INATIVO').length;
 const comConjunto=filtered.filter(m=>m.conjunto_id).length;
 const semConjunto=filtered.length-comConjunto;
 const batizados=filtered.filter(m=>m.is_batizado_aguas).length;

 const statusLabel=status==='todos'?'Todos os Status':status==='ATIVO'?'Ativos':'Inativos';
 const conjuntoLabel=conjunto==='todos'?'Todos os Conjuntos':conjuntos.find(c=>String(c.id)===String(conjunto))?.nome_conjunto||'-';

 const exportExcel=()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há membros para exportar.',variant:'destructive'});
   return;
  }
  const data=filtered.map(m=>({
   Nome:m.nome_completo||'',
   Nascimento:formatDate(m.data_nascimento),
   Admissão:formatDate(m.data_entrada),
   Cargo:m.cargo?.nome_cargo||'-',
   Função:functions(m,funcoesList),
   'Estado Civil':m.estado_civil||'-',
   'Batismo nas Águas':m.is_batizado_aguas?'SIM':'NÃO',
   'Batismo Espírito Santo':m.is_batizado_espirito?'SIM':'NÃO',
   Status:m.status||'ATIVO'
  }));
  const ws=XLSX.utils.json_to_sheet(data);
  ws['!cols']=[{wch:38},{wch:14},{wch:14},{wch:22},{wch:30},{wch:18},{wch:18},{wch:22},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Membros');
  XLSX.writeFile(wb,'Listagem_Geral_Membros.xlsx');
  toast({title:'Excel Gerado',description:'Listagem exportada com sucesso.'});
 };

 const buildPrintHtml=()=>{
  const rows=filtered.map(m=>`
   <tr>
    <td class="name">${escapeHtml(m.nome_completo)}</td>
    <td class="center">${formatDate(m.data_nascimento)}</td>
    <td class="center">${formatDate(m.data_entrada)}</td>
    <td>${escapeHtml(m.cargo?.nome_cargo||'-')}</td>
    <td>${escapeHtml(functions(m,funcoesList))}</td>
    <td class="center">${escapeHtml(m.estado_civil?.toLowerCase()||'-')}</td>
    <td class="center">${m.is_batizado_aguas?'SIM':'NÃO'}</td>
    <td class="center">${m.is_batizado_espirito?'SIM':'NÃO'}</td>
    <td class="center bold">${escapeHtml(m.status||'ATIVO')}</td>
   </tr>`).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Listagem Geral de Membros</title><style>
@page{size:A4 landscape;margin:9mm}
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:0}
.header{background:#0f172a;color:#fff;padding:10px 14px 9px;border-radius:0 0 7px 7px;position:relative;text-align:center}
.logo{position:absolute;left:12px;top:7px;width:27mm;height:auto;max-height:21mm;object-fit:contain}
.inst{font-size:16px;font-weight:800}
.city{font-size:8px;color:#cbd5e1;margin-top:2px}
.title{display:inline-block;background:#eab308;color:#0f172a;border-radius:4px;padding:5px 20px;margin-top:6px;font-size:9px;font-weight:800}
.meta{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:6px;font-size:6.5px;color:#64748b}
.meta div:nth-child(2){text-align:center}.meta div:last-child{text-align:right}
.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:8px 0}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:5px 7px;position:relative}
.card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#2563eb;border-radius:5px 0 0 5px}
.card:nth-child(2):before{background:#16a34a}.card:nth-child(3):before{background:#ef4444}.card:nth-child(4):before{background:#eab308}.card:nth-child(5):before{background:#0ea5e9}
.label{font-size:5.5px;color:#64748b;font-weight:700}.value{font-size:12px;font-weight:800;margin-top:1px}
table{width:100%;border-collapse:collapse;font-size:6.8px}
th{background:#2563eb;color:#fff;padding:4px;border:1px solid #1d4ed8;text-align:left}
td{padding:4px;border:1px solid #cbd5e1;vertical-align:middle}tbody tr:nth-child(even) td{background:#f8fafc}.name{font-weight:700}.center{text-align:center}.bold{font-weight:700}
.summary{margin-top:7px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:7px;display:grid;grid-template-columns:repeat(5,1fr);font-size:6.5px}.summary span{font-weight:700;color:#1e3a8a}
.footer{margin-top:8px;border-top:1px solid #cbd5e1;padding-top:3px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.3px;color:#64748b}.footer span:nth-child(2){font-weight:700;color:#1e3a8a;text-align:center}.footer span:last-child{text-align:right}
</style></head><body>
<div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div><div class="city">LEROLÂNDIA</div><div class="title">LISTAGEM GERAL DE MEMBROS</div></div>
<div class="meta"><div>Status: ${escapeHtml(statusLabel)}</div><div>${search.trim()?`Busca: ${escapeHtml(search.trim())}`:escapeHtml(conjuntoLabel)}</div><div>${filtered.length} registro(s) • ${new Date().toLocaleDateString('pt-BR')}</div></div>
<div class="cards"><div class="card"><div class="label">MEMBROS</div><div class="value">${filtered.length}</div></div><div class="card"><div class="label">ATIVOS</div><div class="value">${ativos}</div></div><div class="card"><div class="label">INATIVOS</div><div class="value">${inativos}</div></div><div class="card"><div class="label">COM CONJUNTO</div><div class="value">${comConjunto}</div></div><div class="card"><div class="label">BATIZADOS NAS ÁGUAS</div><div class="value">${batizados}</div></div></div>
<table><thead><tr><th>NOME</th><th>NASC.</th><th>ADM.</th><th>CARGO</th><th>FUNÇÃO</th><th>EST. CIVIL</th><th>BAT. ÁGUAS</th><th>BAT. E.S.</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>
<div class="summary"><span>Total: ${filtered.length}</span><span>Ativos: ${ativos}</span><span>Inativos: ${inativos}</span><span>Sem conjunto: ${semConjunto}</span><span>Batizados nas águas: ${batizados}</span></div>
<div class="footer"><span>Relatório emitido eletronicamente pelo sistema da Secretaria.</span><span>SECRETARIA • LISTAGEM GERAL DE MEMBROS</span><span>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR • LEROLÂNDIA</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\\/script></body></html>`;
 };

 const handlePrint=()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há membros para imprimir.',variant:'destructive'});
   return;
  }
  const w=window.open('','_blank','width=1200,height=900');
  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
   return;
  }
  w.document.open();
  w.document.write(buildPrintHtml());
  w.document.close();
 };

 const generatePDF=async()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há membros para gerar o PDF.',variant:'destructive'});
   return;
  }

  try{
   const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
   const pageW=297,pageH=210;
   const logo=await imageToBase64(LOGO);

   doc.setProperties({title:'Listagem Geral de Membros',subject:'Relatório da Secretaria',author:'Igreja Assembleia de Deus Ministério Plantar'});
   doc.setFillColor(...NAVY);
   doc.rect(0,0,pageW,30,'F');

   if(logo?.data&&logo.width&&logo.height){
    const maxW=27,maxH=21,scale=Math.min(maxW/logo.width,maxH/logo.height),w=logo.width*scale,h=logo.height*scale;
    doc.addImage(logo.data,'PNG',11,5+(maxH-h)/2,w,h);
   }

   doc.setTextColor(255,255,255);
   doc.setFont('helvetica','bold');
   doc.setFontSize(13);
   doc.text('IGREJA ASSEMBLEIA DE DEUS',148.5,11,{align:'center'});
   doc.setFontSize(8.5);
   doc.setTextColor(226,232,240);
   doc.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',148.5,17,{align:'center'});

   doc.setFillColor(...YELLOW);
   doc.roundedRect(103,21,91,6,2,2,'F');
   doc.setTextColor(...NAVY);
   doc.setFontSize(7.5);
   doc.text('LISTAGEM GERAL DE MEMBROS',148.5,25.2,{align:'center'});

   doc.setFont('helvetica','normal');
   doc.setFontSize(6.5);
   doc.setTextColor(...TEXT);
   doc.text(`Status: ${statusLabel}`,10,38);
   doc.text(search.trim()?`Busca: ${search.trim()}`:`Conjunto: ${conjuntoLabel}`,148.5,38,{align:'center'});
   doc.text(`${filtered.length} registro(s)`,287,38,{align:'right'});

   const boxW=51.5,gap=4,summaryY=43;
   [
    ['MEMBROS',filtered.length,BLUE],
    ['ATIVOS',ativos,[34,197,94]],
    ['INATIVOS',inativos,[239,68,68]],
    ['COM CONJUNTO',comConjunto,YELLOW],
    ['BAT. ÁGUAS',batizados,[14,165,233]]
   ].forEach((b,i)=>{
    const x=10+i*(boxW+gap);
    doc.setFillColor(248,250,252);
    doc.roundedRect(x,summaryY,boxW,13,2,2,'F');
    doc.setFillColor(...b[2]);
    doc.roundedRect(x,summaryY,2.3,13,1,1,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text(b[0],x+6,summaryY+5);
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT);
    doc.text(String(b[1]),x+6,summaryY+10.5);
   });

   const rows=filtered.map(m=>[
    m.nome_completo||'-',
    formatDate(m.data_nascimento),
    formatDate(m.data_entrada),
    m.cargo?.nome_cargo||'-',
    functions(m,funcoesList),
    m.estado_civil?.toLowerCase()||'-',
    m.is_batizado_aguas?'SIM':'NÃO',
    m.is_batizado_espirito?'SIM':'NÃO',
    m.status||'ATIVO'
   ]);

   autoTable(doc,{
    head:[['NOME','NASC.','ADM.','CARGO','FUNÇÃO','EST. CIVIL','BAT. ÁGUAS','BAT. E.S.','STATUS']],
    body:rows,
    startY:60,
    margin:{left:10,right:10,top:18,bottom:17},
    theme:'grid',
    styles:{font:'helvetica',fontSize:6.2,cellPadding:{top:2.2,right:2,bottom:2.2,left:2},textColor:TEXT,lineColor:LINE,lineWidth:.2,valign:'middle',overflow:'linebreak'},
    headStyles:{fillColor:BLUE,textColor:[255,255,255],fontStyle:'bold',fontSize:6.1,cellPadding:2.8},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{
     0:{cellWidth:53},
     1:{cellWidth:20,halign:'center'},
     2:{cellWidth:20,halign:'center'},
     3:{cellWidth:31},
     4:{cellWidth:52},
     5:{cellWidth:27},
     6:{cellWidth:22,halign:'center'},
     7:{cellWidth:19,halign:'center'},
     8:{cellWidth:23,halign:'center'}
    },
    didParseCell:data=>{
     if(data.section==='body'&&data.column.index===8){
      data.cell.styles.textColor=String(data.cell.raw)==='ATIVO'?[22,163,74]:[220,38,38];
      data.cell.styles.fontStyle='bold';
     }
    }
   });

   let y=(doc.lastAutoTable?.finalY||60)+7;

   if(y+20>pageH-18){
    doc.addPage();
    y=18;
   }

   doc.setFillColor(...LIGHT);
   doc.roundedRect(10,y,277,16,2.5,2.5,'F');
   doc.setFont('helvetica','bold');
   doc.setFontSize(6);
   doc.setTextColor(...BLUE);
   doc.text('RESUMO',16,y+5.5);
   doc.setFont('helvetica','normal');
   doc.setTextColor(...TEXT);
   doc.text(`Total: ${filtered.length}`,16,y+11);
   doc.text(`Ativos: ${ativos}`,72,y+11);
   doc.text(`Inativos: ${inativos}`,118,y+11);
   doc.text(`Sem conjunto: ${semConjunto}`,168,y+11);
   doc.text(`Batizados nas águas: ${batizados}`,220,y+11);

   const pages=doc.getNumberOfPages();
   doc.setPage(pages);
   doc.setDrawColor(...LINE);
   doc.line(10,pageH-10,287,pageH-10);
   doc.setFont('helvetica','normal');
   doc.setFontSize(5);
   doc.setTextColor(...MUTED);
   doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',10,pageH-5);
   doc.setFont('helvetica','bold');
   doc.setTextColor(...BLUE);
   doc.text('SECRETARIA • LISTAGEM GERAL DE MEMBROS',148.5,pageH-5,{align:'center'});
   doc.setFont('helvetica','normal');
   doc.setTextColor(...MUTED);
   doc.text(`Página ${pages} de ${pages} • ${new Date().toLocaleDateString('pt-BR')}`,287,pageH-5,{align:'right'});

   doc.save(`Listagem_Geral_Membros_${new Date().toISOString().split('T')[0]}.pdf`);
   toast({title:'PDF Gerado',description:'Listagem geral gerada em A4 horizontal.'});
  }catch(error){
   console.error(error);
   toast({title:'Erro ao gerar PDF',description:error?.message||'Não foi possível gerar o relatório.',variant:'destructive'});
  }
 };

 const fichaFields=m=>[
  ['Nome Completo',m.nome_completo||'-'],
  ['Data de Nascimento',formatDate(m.data_nascimento)],
  ['Estado Civil',m.estado_civil||'-'],
  ['Data de Entrada',formatDate(m.data_entrada)],
  ['Cargo',m.cargo?.nome_cargo||'-'],
  ['Função/Funções',functions(m,funcoesList)],
  ['Conjunto',m.conjunto?.nome_conjunto||'-'],
  ['Classe da EBD',m.igreja_classes?.nome_classe||'-'],
  ['É Dirigente',m.is_dirigente?'Sim':'Não'],
  ['Conjunto que Dirige',m.dirige_conjunto?.nome_conjunto||'-'],
  ['Batizado nas Águas',m.is_batizado_aguas?'Sim':'Não'],
  ['Batizado no Espírito Santo',m.is_batizado_espirito?'Sim':'Não'],
  ['Status',m.status||'ATIVO']
 ];

 const generateFichaPDF=async()=>{
  if(!selected)return;
  const m=selected;
  try{
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
   const logo=await imageToBase64(LOGO);
   const pageW=210,margin=10;

   if(logo?.data){
    const maxW=27,maxH=21,scale=Math.min(maxW/logo.width,maxH/logo.height),w=logo.width*scale,h=logo.height*scale;
    doc.addImage(logo.data,'PNG',10,7+(maxH-h)/2,w,h);
   }

   doc.setFont('helvetica','bold');
   doc.setTextColor(...BLUE);
   doc.setFontSize(12);
   doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,15,{align:'center'});
   doc.setFontSize(8);
   doc.setTextColor(...TEXT);
   doc.text('LEROLÂNDIA',105,21,{align:'center'});

   doc.setFillColor(...NAVY);
   doc.roundedRect(margin,26,190,9,2,2,'F');
   doc.setTextColor(255,255,255);
   doc.setFontSize(9);
   doc.text('FICHA DO MEMBRO',105,32,{align:'center'});

   doc.setFillColor(...LIGHT);
   doc.setDrawColor(147,197,253);
   doc.roundedRect(margin,41,190,12,2,2,'FD');
   doc.setFont('helvetica','bold');
   doc.setFontSize(11);
   doc.setTextColor(...TEXT);
   doc.text(m.nome_completo||'-',15,49);
   doc.setFillColor(255,255,255);
   doc.roundedRect(173,44,22,6,2,2,'F');
   doc.setFontSize(6);
   doc.setTextColor(...BLUE);
   doc.text(m.status||'ATIVO',184,48,{align:'center'});

   let y=59;
   const fields=fichaFields(m);
   const sections=[['DADOS PESSOAIS',fields.slice(0,4)],['DADOS MINISTERIAIS',fields.slice(4,6)],['DADOS DA IGREJA',fields.slice(6,10)],['REGISTROS ECLESIÁSTICOS',fields.slice(10,13)]];

   sections.forEach(([title,list])=>{
    doc.setFillColor(...LIGHT);
    doc.rect(margin,y,190,6,'F');
    doc.setFillColor(14,165,233);
    doc.rect(margin,y,2,6,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.text(title,16,y+4);
    y+=8;

    const cols=list.length===3?3:2;
    const gap=3;
    const w=(190-gap*(cols-1))/cols;

    for(let i=0;i<list.length;i+=cols){
     list.slice(i,i+cols).forEach((f,j)=>{
      doc.setFillColor(255,255,255);
      doc.setDrawColor(...LINE);
      doc.roundedRect(10+j*(w+gap),y,w,12,1.5,1.5,'FD');
      doc.setFont('helvetica','bold');
      doc.setFontSize(5.6);
      doc.setTextColor(...MUTED);
      doc.text(f[0].toUpperCase(),12+j*(w+gap),y+3.5);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(doc.splitTextToSize(String(f[1]||'-'),w-5).slice(0,2),12+j*(w+gap),y+7,{lineHeightFactor:1});
     });
     y+=15;
    }
    y+=2;
   });

   doc.setDrawColor(...LINE);
   doc.line(10,278,200,278);
   doc.setFontSize(5);
   doc.setTextColor(...MUTED);
   doc.text('Ficha emitida eletronicamente pelo sistema da Secretaria.',10,284);
   doc.setFont('helvetica','bold');
   doc.setTextColor(...BLUE);
   doc.text('SECRETARIA • REGISTRO DE MEMBRO',105,284,{align:'center'});
   doc.setFont('helvetica','normal');
   doc.setTextColor(...MUTED);
   doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`,200,284,{align:'right'});
   doc.save(`Ficha_Membro_${String(m.nome_completo||'Membro').replace(/\s+/g,'_')}.pdf`);
   toast({title:'Ficha Gerada',description:'Ficha criada em A4.'});
  }catch(error){
   toast({title:'Erro ao gerar ficha',description:error?.message||'Não foi possível gerar a ficha.',variant:'destructive'});
  }
 };

 const printFicha=()=>{
  if(!selected)return;
  const m=selected;
  const fields=fichaFields(m);
  const w=window.open('','_blank','width=900,height=1100');
  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir a ficha.',variant:'destructive'});
   return;
  }

  const block=(title,list)=>`<section><h3>${escapeHtml(title)}</h3><div class="grid">${list.map(f=>`<div class="field"><span>${escapeHtml(f[0])}</span><strong>${escapeHtml(f[1])}</strong></div>`).join('')}</div></section>`;

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha do Membro</title><style>
@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#1e293b}.head{text-align:center;border-bottom:2px solid #1e3a8a;padding-bottom:7px;position:relative}.logo{position:absolute;left:0;top:0;width:27mm;height:auto;max-height:22mm;object-fit:contain}.inst{font-size:15px;font-weight:800;color:#1e3a8a}.city{font-size:8px;font-weight:700;margin-top:2px}.title{background:#0f172a;color:#fff;padding:7px;border-radius:4px;margin-top:7px;font-size:10px;font-weight:800}.member{margin-top:8px;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #0ea5e9;border-radius:4px;display:flex;justify-content:space-between;font-size:12px;font-weight:800}.status{color:#16a34a}section{margin-top:9px}h3{margin:0 0 5px;background:#eff6ff;color:#1e3a8a;padding:5px 7px;border-left:3px solid #0ea5e9;font-size:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.field{border:1px solid #cbd5e1;border-radius:3px;padding:6px;background:#fff;min-height:30px}.field span{display:block;font-size:6px;color:#64748b;font-weight:700;text-transform:uppercase}.field strong{display:block;font-size:8px;margin-top:3px}.footer{margin-top:12px;border-top:1px solid #cbd5e1;padding-top:4px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b}.footer b{text-align:center;color:#1e3a8a}.footer span:last-child{text-align:right}
</style></head><body>
<div class="head"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div><div class="city">LEROLÂNDIA</div><div class="title">FICHA DO MEMBRO</div></div>
<div class="member"><span>${escapeHtml(m.nome_completo||'-')}</span><span class="status">${escapeHtml(m.status||'ATIVO')}</span></div>
${block('DADOS PESSOAIS',fields.slice(0,4))}
${block('DADOS MINISTERIAIS',fields.slice(4,6))}
${block('DADOS DA IGREJA',fields.slice(6,10))}
${block('REGISTROS ECLESIÁSTICOS',fields.slice(10,13))}
<div class="footer"><span>Ficha emitida pelo sistema da Secretaria.</span><b>SECRETARIA • REGISTRO DE MEMBRO</b><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\\/script></body></html>`);
  w.document.close();
 };

 const cardList=filtered;

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <div className="flex-1 space-y-5">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><Users className="h-6 w-6 text-blue-400"/></div>
     <div><h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 md:text-3xl">Consulta de Membros</h2><p className="text-sm text-muted-foreground">Listagem geral e consulta dos membros cadastrados.</p></div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)} className="border-yellow-500/40"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp className="ml-1 h-4 w-4"/>:<ChevronDown className="ml-1 h-4 w-4" />}</Button>
     <Button variant="outline" size="sm" onClick={exportExcel} className="border-yellow-500/40"><Download className="mr-2 h-4 w-4"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={generatePDF} className="border-yellow-500/40"><FileText className="mr-2 h-4 w-4"/>PDF</Button>
     <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
    </div>
   </div>

   <AnimatePresence>
    {showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
     <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-3"><CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4 text-yellow-400"/>Filtros</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-3">
       <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nome, cargo ou função..." className="border-border bg-background pl-9"/></div>
       <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-background"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Status</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select>
       <Select value={conjunto} onValueChange={setConjunto}><SelectTrigger className="bg-background"><SelectValue placeholder="Conjunto"/></SelectTrigger><SelectContent className="dark-igreja max-h-[280px]"><SelectItem value="todos">Todos os Conjuntos</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select>
       <Select value={estadoCivil} onValueChange={setEstadoCivil}><SelectTrigger className="bg-background"><SelectValue placeholder="Estado Civil"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Estados Civis</SelectItem><SelectItem value="SOLTEIRO(A)">Solteiro(a)</SelectItem><SelectItem value="CASADO(A)">Casado(a)</SelectItem><SelectItem value="VIUVO(A)">Viúvo(a)</SelectItem><SelectItem value="DIVORCIADO(A)">Divorciado(a)</SelectItem></SelectContent></Select>
      </CardContent>
     </Card>
    </motion.div>}
   </AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Membros</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div><Users className="h-5 w-5 text-blue-400"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-green-500">{ativos}</p></div><CheckCircle2 className="h-5 w-5 text-green-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Inativos</p><p className="mt-1 text-2xl font-bold text-red-500">{inativos}</p></div><UserMinus className="h-5 w-5 text-red-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Com Conjunto</p><p className="mt-1 text-2xl font-bold">{comConjunto}</p></div><Layers className="h-5 w-5 text-yellow-400"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Bat. Águas</p><p className="mt-1 text-2xl font-bold text-cyan-400">{batizados}</p></div><Droplets className="h-5 w-5 text-cyan-400"/></div></CardContent></Card>
   </div>

   <Card className="overflow-hidden border-border bg-card">
    <CardHeader className="border-b border-border pb-3">
     <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <CardTitle className="text-base md:text-lg">Listagem Geral de Membros</CardTitle>
      <Badge variant="secondary">{filtered.length} registro(s)</Badge>
     </div>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[calc(100vh-430px)] min-h-[430px]">
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
       {loading&&Array(6).fill(0).map((_,i)=><ConsultationSkeleton key={i}/>)}

       {!loading&&!cardList.length&&<div className="col-span-full flex flex-col items-center justify-center py-16 text-center"><Users className="mb-3 h-12 w-12 text-muted-foreground/40"/><h3 className="text-lg font-bold">Nenhum membro encontrado</h3><p className="text-sm text-muted-foreground">Ajuste os filtros para visualizar outros registros.</p></div>}

       {!loading&&cardList.map(m=>{
        const inactive=(m.status||'ATIVO')==='INATIVO';
        return <motion.div key={m.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
         <Card onClick={()=>setSelected(m)} className={`cursor-pointer overflow-hidden border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg ${inactive?'border-red-500/30 hover:border-red-500/60':'border-border hover:border-yellow-400/50'}`}>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
           <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${inactive?'border-red-500/30 bg-red-500/10 text-red-400':'border-yellow-400/30 bg-yellow-400/10 text-yellow-400'}`}>{initials(m.nome_completo)}</div>
           <div className="min-w-0 flex-1">
            <CardTitle className={`truncate text-base ${inactive?'text-red-400':'text-foreground'}`}>{m.nome_completo}</CardTitle>
            <div className="mt-1 flex flex-wrap gap-1">{m.cargo?.nome_cargo&&<Badge variant="outline" className="border-yellow-400/30 text-[10px] text-yellow-400"><Shield className="mr-1 h-3 w-3"/>{m.cargo.nome_cargo}</Badge>}<Badge variant="outline" className={`text-[10px] ${inactive?'border-red-500/30 text-red-400':'border-emerald-500/20 text-emerald-400'}`}>{m.status||'ATIVO'}</Badge></div>
           </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
           <div className="grid grid-cols-2 gap-3">
            <div><span className="flex items-center gap-1 text-[9px] font-bold uppercase text-muted-foreground"><Calendar className="h-3 w-3 text-yellow-400"/>Nascimento</span><p className="mt-1 text-xs font-semibold">{formatDate(m.data_nascimento)}</p></div>
            <div><span className="flex items-center gap-1 text-[9px] font-bold uppercase text-muted-foreground"><Heart className="h-3 w-3 text-pink-400"/>Estado Civil</span><p className="mt-1 truncate text-xs font-semibold capitalize">{m.estado_civil?.toLowerCase()||'-'}</p></div>
           </div>
           <div><span className="flex items-center gap-1 text-[9px] font-bold uppercase text-muted-foreground"><Layers className="h-3 w-3 text-yellow-400"/>Conjunto</span><p className="mt-1 truncate text-xs font-semibold">{m.conjunto?.nome_conjunto||'Sem conjunto'}</p></div>
           <div><span className="flex items-center gap-1 text-[9px] font-bold uppercase text-muted-foreground"><User className="h-3 w-3 text-blue-400"/>Função</span><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{functions(m,funcoesList)}</p></div>
          </CardContent>

          <CardFooter className="border-t border-border bg-muted/10 p-3">
           <div className="flex w-full gap-2">
            <div className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[10px] font-bold ${m.is_batizado_aguas?'border-cyan-500/30 bg-cyan-500/10 text-cyan-400':'border-border text-muted-foreground'}`}><Droplets className="h-3 w-3"/>Águas</div>
            <div className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[10px] font-bold ${m.is_batizado_espirito?'border-orange-500/30 bg-orange-500/10 text-orange-400':'border-border text-muted-foreground'}`}><Flame className="h-3 w-3"/>Espírito</div>
           </div>
          </CardFooter>
         </Card>
        </motion.div>;
       })}
      </div>
     </ScrollArea>
    </CardContent>
   </Card>
  </div>

  <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}>
   <DialogContent className="max-w-4xl overflow-hidden border-border bg-card p-0 text-foreground">
    {selected&&<div className="max-h-[90vh] overflow-y-auto">
     <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="flex items-center gap-3 text-xl text-yellow-400"><div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10"><User className="h-5 w-5"/></div>Ficha do Membro</DialogTitle></DialogHeader>

     <div className="space-y-6 p-5 md:p-7">
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5 text-center">
       <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-yellow-400/30 bg-secondary text-2xl font-bold text-yellow-400">{initials(selected.nome_completo)}</div>
       <h2 className="text-2xl font-bold">{selected.nome_completo}</h2>
       <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Badge variant="outline" className={selected.status==='INATIVO'?'border-red-500/30 text-red-400':'border-green-500/30 text-green-400'}>{selected.status||'ATIVO'}</Badge>
        {selected.cargo?.nome_cargo&&<Badge variant="outline" className="border-yellow-400/30 text-yellow-400"><Shield className="mr-1 h-3 w-3"/>{selected.cargo.nome_cargo}</Badge>}
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       {[
        ['Nome Completo',selected.nome_completo],
        ['Nascimento',formatDate(selected.data_nascimento)],
        ['Estado Civil',selected.estado_civil||'-'],
        ['Data de Entrada',formatDate(selected.data_entrada)],
        ['Cargo',selected.cargo?.nome_cargo||'-'],
        ['Função/Funções',functions(selected,funcoesList)],
        ['Conjunto',selected.conjunto?.nome_conjunto||'-'],
        ['Classe da EBD',selected.igreja_classes?.nome_classe||'-'],
        ['É Dirigente',selected.is_dirigente?'Sim':'Não'],
        ['Conjunto que Dirige',selected.dirige_conjunto?.nome_conjunto||'-'],
        ['Batizado nas Águas',selected.is_batizado_aguas?'Sim':'Não'],
        ['Batizado no Espírito Santo',selected.is_batizado_espirito?'Sim':'Não']
       ].map(([label,value])=><div key={label} className="rounded-lg border border-border bg-background/40 p-3"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span><span className="mt-1 block font-semibold">{value}</span></div>)}
      </div>
     </div>

     <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/10 px-5 py-4 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={()=>setSelected(null)}><X className="mr-2 h-4 w-4"/>Fechar</Button>
      <Button variant="outline" onClick={printFicha} className="border-blue-500/30 text-blue-400"><Printer className="mr-2 h-4 w-4"/>Imprimir Ficha</Button>
      <Button onClick={generateFichaPDF} className="bg-indigo-600 hover:bg-indigo-700"><FileText className="mr-2 h-4 w-4"/>Gerar PDF</Button>
     </DialogFooter>
    </div>}
   </DialogContent>
  </Dialog>
 </div>;
};

export default ConsultaMembros;
