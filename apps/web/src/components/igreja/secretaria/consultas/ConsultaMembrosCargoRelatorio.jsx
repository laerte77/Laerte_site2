import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Briefcase,Printer,Download,FileText,Search,Filter,Users,UserMinus,ChevronDown,ChevronUp}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';

const age=v=>{
 if(!v)return'-';
 const b=new Date(`${v}T00:00:00`),t=new Date();
 let a=t.getFullYear()-b.getFullYear();
 const m=t.getMonth()-b.getMonth();
 if(m<0||(m===0&&t.getDate()<b.getDate()))a--;
 return a;
};

const img64=url=>new Promise(resolve=>{
 const i=new Image();i.crossOrigin='Anonymous';i.src=url;
 i.onload=()=>{
  const c=document.createElement('canvas');c.width=i.width;c.height=i.height;
  c.getContext('2d').drawImage(i,0,0);
  resolve(c.toDataURL('image/png'));
 };
 i.onerror=()=>resolve(null);
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
    supabase.from('igreja_membros').select('*,cargo:cargos_igreja(nome_cargo)').order('nome_completo',{ascending:true}),
    supabase.from('cargos_igreja').select('*').order('nome_cargo',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setAll(a.data||[]);
   setCargos(b.data||[]);
  }catch(e){
   toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return all.filter(m=>{
   const st=m.status||'ATIVO',cg=m.cargo?.nome_cargo||'Sem Cargo';
   return(
    (status==='todos'||st===status)&&
    (cargo==='todos'||cg===cargo)&&
    (!term||`${m.nome_completo||''} ${cg}`.toLowerCase().includes(term))
   );
  });
 },[all,cargo,status,search]);

 const grouped=useMemo(()=>{
  const g={};
  filtered.forEach(m=>{
   const c=m.cargo?.nome_cargo||'Sem Cargo';
   if(!g[c])g[c]=[];
   g[c].push(m);
  });
  return Object.keys(g).sort((a,b)=>{
   if(a==='Sem Cargo')return 1;
   if(b==='Sem Cargo')return-1;
   return a.localeCompare(b,'pt-BR');
  }).reduce((a,k)=>(a[k]=g[k],a),{});
 },[filtered]);

 const active=filtered.filter(m=>(m.status||'ATIVO')==='ATIVO').length;
 const inactive=filtered.filter(m=>(m.status||'ATIVO')==='INATIVO').length;

 const exportExcel=()=>{
  if(!filtered.length){
   toast({title:'Nenhum dado',description:'Não há membros para exportar.',variant:'destructive'});
   return;
  }

  const rows=[];
  Object.entries(grouped).forEach(([c,members])=>members.forEach(m=>rows.push({
   Cargo:c,
   Nome:m.nome_completo||'-',
   Nascimento:m.data_nascimento?new Date(`${m.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR'):'-',
   Idade:age(m.data_nascimento),
   Status:m.status||'ATIVO'
  })));

  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:28},{wch:38},{wch:14},{wch:10},{wch:14}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Membros por Cargo');
  XLSX.writeFile(wb,'Membros_Por_Cargo.xlsx');
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
  doc.setFontSize(8);
  doc.setTextColor(255,255,255);
  doc.text('RELATÓRIO DE MEMBROS POR CARGO',105,33,{align:'center'});

  doc.setFont('helvetica','normal');
  doc.setFontSize(6.5);
  doc.setTextColor(30,41,59);
  doc.text(`Status: ${status==='todos'?'Todos':status}`,10,42);
  doc.text(`Total: ${filtered.length}`,200,42,{align:'right'});
  if(search.trim())doc.text(`Busca: ${search.trim()}`,105,42,{align:'center'});

  let y=49;

  Object.entries(grouped).forEach(([cargoName,members])=>{
   if(y>250){
    doc.addPage();
    y=18;
   }

   doc.setFillColor(239,246,255);
   doc.roundedRect(10,y,190,8,2,2,'F');
   doc.setFont('helvetica','bold');
   doc.setFontSize(8.5);
   doc.setTextColor(30,58,138);
   doc.text(cargoName,14,y+5.5);
   doc.text(`${members.length} ${members.length===1?'membro':'membros'}`,196,y+5.5,{align:'right'});
   y+=10;

   autoTable(doc,{
    head:[['MEMBRO','NASCIMENTO','IDADE','STATUS']],
    body:members.map(m=>[
     m.nome_completo||'-',
     m.data_nascimento?new Date(`${m.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR'):'-',
     age(m.data_nascimento),
     m.status||'ATIVO'
    ]),
    startY:y,
    theme:'grid',
    styles:{font:'helvetica',fontSize:7.5,cellPadding:2.5,textColor:[30,41,59],lineColor:[203,213,225],lineWidth:.2},
    headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{
     0:{cellWidth:92},
     1:{cellWidth:38,halign:'center'},
     2:{cellWidth:25,halign:'center'},
     3:{cellWidth:35,halign:'center'}
    },
    margin:{left:10,right:10,top:15,bottom:18}
   });

   y=doc.lastAutoTable.finalY+7;
  });

  if(y>260){doc.addPage();y=18}

  doc.setFillColor(239,246,255);
  doc.roundedRect(10,y,190,20,3,3,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30,58,138);
  doc.text('RESUMO',15,y+6);
  doc.setFont('helvetica','normal');
  doc.setTextColor(30,41,59);
  doc.text(`Cargos com membros: ${Object.keys(grouped).length}`,15,y+13);
  doc.text(`Ativos: ${active}`,90,y+13);
  doc.text(`Inativos: ${inactive}`,135,y+13);
  doc.text(`Total: ${filtered.length}`,196,y+13,{align:'right'});

  doc.setFontSize(5.5);
  doc.setTextColor(100,116,139);
  doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',10,288);
  doc.text('SECRETARIA • MEMBROS POR CARGO',105,288,{align:'center'});
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`,200,288,{align:'right'});

  doc.save('Membros_Por_Cargo.pdf');
  toast({title:'PDF Gerado',description:'Relatório de membros por cargo criado com sucesso.'});
 };

 const imprimir=()=>{
  if(!filtered.length){
   toast({title:'Nenhum dado',description:'Não há membros para imprimir.',variant:'destructive'});
   return;
  }

  const groups=Object.entries(grouped).map(([c,members])=>`
   <div class="group">
    <div class="gt"><span>${c}</span><span>${members.length} ${members.length===1?'membro':'membros'}</span></div>
    <table><thead><tr><th>MEMBRO</th><th>NASCIMENTO</th><th>IDADE</th><th>STATUS</th></tr></thead><tbody>
     ${members.map(m=>`<tr><td>${m.nome_completo||'-'}</td><td class="center">${m.data_nascimento?new Date(`${m.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR'):'-'}</td><td class="center">${age(m.data_nascimento)}</td><td class="center">${m.status||'ATIVO'}</td></tr>`).join('')}
    </tbody></table>
   </div>`).join('');

  const w=window.open('','_blank','width=900,height=1100');

  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
   return;
  }

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Membros por Cargo</title><style>
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
table{width:100%;border-collapse:collapse;font-size:7.5px;margin-top:3px}
th{background:#2563eb;color:#fff;padding:4px;border:1px solid #1d4ed8;text-align:left}
td{padding:4px;border:1px solid #cbd5e1}
tbody tr:nth-child(even) td{background:#f8fafc}
.center{text-align:center;font-weight:700}
.summary{margin-top:10px;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#1e3a8a}
.footer{position:fixed;bottom:4mm;left:10mm;right:10mm;border-top:1px solid #cbd5e1;padding-top:3px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b}
.footer span:nth-child(2){text-align:center;font-weight:700;color:#1e3a8a}
.footer span:last-child{text-align:right}
</style></head><body>
<div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div><div class="city">LEROLÂNDIA</div><div class="title">RELATÓRIO DE MEMBROS POR CARGO</div><div class="meta">Status: ${status==='todos'?'Todos':status}${search.trim()?` • Busca: ${search.trim()}`:''} • ${filtered.length} registro(s)</div></div>
${groups}
<div class="summary"><span>Cargos: ${Object.keys(grouped).length}</span><span>Ativos: ${active}</span><span>Inativos: ${inactive}</span><span>Total: ${filtered.length}</span></div>
<div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><span>SECRETARIA • MEMBROS POR CARGO</span><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script>
</body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <div className="flex-1 space-y-5">

   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
      <Briefcase className="h-6 w-6 text-blue-500"/>
     </div>
     <div>
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 md:text-3xl">Membros por Cargo</h2>
      <p className="text-sm text-muted-foreground">Distribuição dos membros por cargo eclesiástico.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}>
      <Filter className="mr-2 h-4 w-4"/>{showFilters?'Ocultar Filtros':'Filtros'}
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
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar membro ou cargo..." className="pl-9"/>
       </div>

       <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
        <SelectContent className="dark-igreja">
         <SelectItem value="todos">Todos os Status</SelectItem>
         <SelectItem value="ATIVO">Ativos</SelectItem>
         <SelectItem value="INATIVO">Inativos</SelectItem>
        </SelectContent>
       </Select>

       <Select value={cargo} onValueChange={setCargo}>
        <SelectTrigger><SelectValue placeholder="Cargo"/></SelectTrigger>
        <SelectContent className="dark-igreja max-h-[280px]">
         <SelectItem value="todos">Todos os Cargos</SelectItem>
         {cargos.map(c=><SelectItem key={c.id} value={c.nome_cargo}>{c.nome_cargo}</SelectItem>)}
        </SelectContent>
       </Select>
      </CardContent>
     </Card>
    </motion.div>}
   </AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Membros</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></div><Users className="h-5 w-5 text-blue-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Cargos</p><p className="mt-1 text-2xl font-bold">{Object.keys(grouped).length}</p></div><Briefcase className="h-5 w-5 text-indigo-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-green-500">{active}</p></div><Users className="h-5 w-5 text-green-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Inativos</p><p className="mt-1 text-2xl font-bold text-red-500">{inactive}</p></div><UserMinus className="h-5 w-5 text-red-500"/></div></CardContent></Card>
   </div>

   {loading?
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
     <div className="h-9 w-9 rounded-full border-4 border-primary border-t-transparent motion-safe:animate-spin"/>
     <p className="mt-4 text-sm text-muted-foreground">Carregando cargos...</p>
    </div>
   :
    !Object.keys(grouped).length?
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
     <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50"/>
     <h3 className="text-lg font-bold">Nenhum membro encontrado</h3>
     <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para visualizar os registros.</p>
    </div>
   :
    <div className="space-y-5 max-w-6xl mx-auto w-full pb-6">
     {Object.entries(grouped).map(([cargoName,members])=>
      <motion.div key={cargoName} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
       <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
         <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cargoName==='Sem Cargo'?'bg-amber-500/10':'bg-primary/10'}`}>
          <Briefcase className={`h-4 w-4 ${cargoName==='Sem Cargo'?'text-amber-500':'text-primary'}`}/>
         </div>
         <h3 className="truncate font-bold">{cargoName}</h3>
        </div>
        <Badge variant={cargoName==='Sem Cargo'?'outline':'secondary'}>{members.length} {members.length===1?'membro':'membros'}</Badge>
       </div>

       <div className="divide-y divide-border">
        {members.map((m,i)=>{
         const inactive=(m.status||'ATIVO')==='INATIVO';
         return <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
          <div className="flex min-w-0 items-center gap-3">
           <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${inactive?'bg-red-500/10 text-red-500':'bg-blue-600/10 text-blue-500'}`}>{i+1}</div>
           <div className="min-w-0">
            <p className={`truncate font-medium ${inactive?'text-red-500':'text-foreground'}`}>{m.nome_completo}</p>
            <p className="text-xs text-muted-foreground">{m.data_nascimento?`${age(m.data_nascimento)} anos`:'Idade não informada'}</p>
           </div>
          </div>
          <Badge variant={inactive?'destructive':'secondary'} className="shrink-0">{m.status||'ATIVO'}</Badge>
         </div>;
        })}
       </div>
      </motion.div>
     )}

     <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-center text-white shadow-lg">
      <p className="text-xs font-medium uppercase tracking-[.18em] text-blue-100">Total Geral</p>
      <p className="mt-1 text-3xl font-bold">{filtered.length} Membros Listados</p>
     </div>
    </div>
   }
  </div>
 </div>
};

export default ConsultaMembrosCargoRelatorio;
