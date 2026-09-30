import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Briefcase,Printer,Download,FileText,Loader2,Search,Filter,Users,UserMinus,ChevronDown,ChevronUp}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';

const getBase64Image=url=>new Promise(resolve=>{
 const img=new Image();img.crossOrigin='Anonymous';img.src=url;
 img.onload=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);resolve(c.toDataURL('image/png'))};
 img.onerror=()=>resolve(null);
});

const calculateAge=dateString=>{
 if(!dateString)return'-';
 const today=new Date(),birth=new Date(dateString+'T00:00:00');
 let age=today.getFullYear()-birth.getFullYear();
 const m=today.getMonth()-birth.getMonth();
 if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;
 return age;
};

const ConsultaMembrosCargoRelatorio=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[allMembers,setAllMembers]=useState([]),[cargos,setCargos]=useState([]),[loading,setLoading]=useState(true);
 const[filterCargo,setFilterCargo]=useState('todos'),[filterStatus,setFilterStatus]=useState('ATIVO');
 const[searchTerm,setSearchTerm]=useState(''),[showFilters,setShowFilters]=useState(false);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[membersRes,cargosRes]=await Promise.all([
    supabase.from('igreja_membros').select('*,cargo:cargos_igreja(nome_cargo)').order('nome_completo',{ascending:true}),
    supabase.from('cargos_igreja').select('*').order('nome_cargo',{ascending:true})
   ]);
   if(membersRes.error)throw membersRes.error;
   if(cargosRes.error)throw cargosRes.error;
   setAllMembers(membersRes.data||[]);setCargos(cargosRes.data||[]);
  }catch(error){
   toast({title:'Erro',description:error.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const filteredMembers=useMemo(()=>{
  const term=searchTerm.trim().toLowerCase();
  return allMembers.filter(m=>{
   const status= m.status||'ATIVO';
   const cargo=m.cargo?.nome_cargo||'Sem Cargo';
   const matchStatus=filterStatus==='todos'||status===filterStatus;
   const matchCargo=filterCargo==='todos'||cargo===filterCargo;
   const matchSearch=!term||`${m.nome_completo||''} ${cargo}`.toLowerCase().includes(term);
   return matchStatus&&matchCargo&&matchSearch;
  });
 },[allMembers,filterCargo,filterStatus,searchTerm]);

 const groupedMembers=useMemo(()=>{
  const grouped={};
  filteredMembers.forEach(member=>{
   const cargo=member.cargo?.nome_cargo||'Sem Cargo';
   if(!grouped[cargo])grouped[cargo]=[];
   grouped[cargo].push(member);
  });
  return Object.keys(grouped).sort((a,b)=>{
   if(a==='Sem Cargo')return 1;
   if(b==='Sem Cargo')return-1;
   return a.localeCompare(b,'pt-BR');
  }).reduce((acc,key)=>{acc[key]=grouped[key];return acc},{});
 },[filteredMembers]);

 const totalMembers=filteredMembers.length;
 const cargosComMembros=Object.keys(groupedMembers).length;
 const activeCount=allMembers.filter(m=>(m.status||'ATIVO')==='ATIVO').length;
 const inactiveCount=allMembers.filter(m=>(m.status||'ATIVO')==='INATIVO').length;

 const handleGeneratePDF=async()=>{
  const doc=new jsPDF('p','mm','a4');
  try{
   const logo=await getBase64Image(LOGO_URL);
   if(logo)doc.addImage(logo,'PNG',15,12,20,20);
  }catch{}
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(30,58,138);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,17,{align:'center'});
  doc.setFontSize(11);doc.setTextColor(71,85,105);doc.text('LEROLÂNDIA',105,24,{align:'center'});
  doc.setFontSize(14);doc.setTextColor(30,58,138);doc.text('RELATÓRIO DE MEMBROS POR CARGO',105,34,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(71,85,105);
  doc.text(`Status: ${filterStatus==='todos'?'Todos os Status':filterStatus==='ATIVO'?'Ativos':'Inativos'}`,105,41,{align:'center'});
  if(searchTerm.trim())doc.text(`Busca: ${searchTerm.trim()}`,105,46,{align:'center'});

  let y=54;
  Object.entries(groupedMembers).forEach(([cargoName,members])=>{
   if(y>255){doc.addPage();y=18}
   doc.setFillColor(219,234,254);doc.roundedRect(14,y,182,8,2,2,'F');
   doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(30,58,138);
   doc.text(cargoName,17,y+5.5);doc.text(`${members.length} membros`,193,y+5.5,{align:'right'});
   y+=10;
   const rows=members.map(m=>[
    m.nome_completo,
    m.data_nascimento?new Date(m.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR'):'-',
    calculateAge(m.data_nascimento),
    m.status||'ATIVO'
   ]);
   autoTable(doc,{
    head:[['Nome','Nascimento','Idade','Status']],body:rows,startY:y,
    styles:{fontSize:8.5,cellPadding:2.5,textColor:[30,41,59]},
    headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[248,250,252]},
    margin:{left:14,right:14}
   });
   y=doc.lastAutoTable.finalY+9;
  });

  if(!Object.keys(groupedMembers).length){
   doc.setFontSize(11);doc.setTextColor(100,116,139);doc.text('Nenhum membro encontrado.',105,y+10,{align:'center'});
  }

  doc.setFontSize(8);doc.setTextColor(100,116,139);
  doc.text(`Total de membros: ${totalMembers}`,14,287);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`,196,287,{align:'right'});
  doc.save('Relatorio_Membros_Por_Cargo.pdf');
 };

 const handleExportExcel=()=>{
  const data=[];
  Object.entries(groupedMembers).forEach(([cargo,members])=>members.forEach(m=>data.push({
   Cargo:cargo,Nome:m.nome_completo||'',Nascimento:m.data_nascimento?new Date(m.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR'):'-',Idade:calculateAge(m.data_nascimento),Status:m.status||'ATIVO'
  })));
  const ws=XLSX.utils.json_to_sheet(data.length?data:[{Cargo:'',Nome:'Nenhum registro',Nascimento:'',Idade:'',Status:''}]);
  ws['!cols']=[{wch:28},{wch:38},{wch:14},{wch:10},{wch:14}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Membros por Cargo');
  XLSX.writeFile(wb,'Membros_Por_Cargo.xlsx');
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <style>{`
   @media print{
    @page{margin:1cm}
    .no-print{display:none!important}
    .print-only{display:block!important}
    body{background:#fff!important;color:#000!important}
    .header-logo{width:70px;height:70px;object-fit:contain;display:block;margin:0 auto}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
    th{background:#dbeafe!important;color:#1e3a8a!important;border-bottom:2px solid #93c5fd;padding:5px}
    td{border-bottom:1px solid #e2e8f0;padding:5px}
   }
   .print-only{display:none}
  `}</style>

  <div className="no-print space-y-5 flex-1 flex flex-col">
   <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
      <Briefcase className="w-6 h-6 text-blue-500"/>
     </div>
     <div>
      <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Membros por Cargo</h2>
      <p className="text-sm text-muted-foreground">Relatório agrupado de membros por cargo eclesiástico.</p>
     </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}>
      <Filter className="w-4 h-4 mr-2"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp className="w-4 h-4 ml-2"/>:<ChevronDown className="w-4 h-4 ml-2"/>}
     </Button>
     <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="w-4 h-4 mr-2"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={handleGeneratePDF}><FileText className="w-4 h-4 mr-2"/>PDF</Button>
     <Button size="sm" onClick={()=>window.print()} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="w-4 h-4 mr-2"/>Imprimir</Button>
    </div>
   </div>

   <AnimatePresence>
    {showFilters&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
     <Card>
      <CardContent className="p-4">
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
         <Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar membro ou cargo..." className="pl-9"/>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
         <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
         <SelectContent className="dark-igreja">
          <SelectItem value="todos">Todos os Status</SelectItem>
          <SelectItem value="ATIVO">Ativos</SelectItem>
          <SelectItem value="INATIVO">Inativos</SelectItem>
         </SelectContent>
        </Select>
        <Select value={filterCargo} onValueChange={setFilterCargo}>
         <SelectTrigger><SelectValue placeholder="Cargo"/></SelectTrigger>
         <SelectContent className="dark-igreja max-h-[280px]">
          <SelectItem value="todos">Todos os Cargos</SelectItem>
          {cargos.map(c=><SelectItem key={c.id} value={c.nome_cargo}>{c.nome_cargo}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
      </CardContent>
     </Card>
    </motion.div>}
   </AnimatePresence>

   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Membros listados</p><p className="text-2xl font-bold mt-1">{totalMembers}</p></div><Users className="w-5 h-5 text-blue-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Cargos listados</p><p className="text-2xl font-bold mt-1">{cargosComMembros}</p></div><Briefcase className="w-5 h-5 text-indigo-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Ativos</p><p className="text-2xl font-bold mt-1 text-green-500">{activeCount}</p></div><Users className="w-5 h-5 text-green-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Inativos</p><p className="text-2xl font-bold mt-1 text-red-500">{inactiveCount}</p></div><UserMinus className="w-5 h-5 text-red-500"/></div></CardContent></Card>
   </div>

   <Card className="flex-1 min-h-0 overflow-hidden">
    <CardHeader className="pb-3 border-b border-border">
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
      <CardTitle className="text-base md:text-lg">Distribuição por Cargo</CardTitle>
      {(searchTerm||filterCargo!=='todos'||filterStatus!=='ATIVO')&&<Badge variant="secondary">{totalMembers} resultado(s)</Badge>}
     </div>
    </CardHeader>
    <CardContent className="p-0 h-full">
     <ScrollArea className="h-[calc(100vh-390px)] min-h-[360px] p-4 md:p-6">
      {loading?<div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-500"/></div>:!Object.keys(groupedMembers).length?
       <div className="flex flex-col items-center justify-center py-16 text-center"><Users className="w-12 h-12 text-muted-foreground/40 mb-3"/><h3 className="font-semibold text-lg">Nenhum membro encontrado</h3><p className="text-sm text-muted-foreground mt-1">Ajuste os filtros para visualizar outros registros.</p></div>:
       <div className="space-y-5 max-w-6xl mx-auto pb-6">
        {Object.entries(groupedMembers).map(([cargoName,members])=><motion.div key={cargoName} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
         <div className="px-4 py-3 bg-secondary/40 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0"><Briefcase className={`w-5 h-5 shrink-0 ${cargoName==='Sem Cargo'?'text-amber-500':'text-blue-500'}`}/><h3 className="font-bold truncate">{cargoName}</h3></div>
          <Badge variant={cargoName==='Sem Cargo'?'outline':'secondary'}>{members.length} {members.length===1?'membro':'membros'}</Badge>
         </div>
         <div className="divide-y divide-border">
          {members.map((member,idx)=><div key={member.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40">
           <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">{idx+1}</div>
            <div className="min-w-0"><p className="font-medium truncate">{member.nome_completo}</p><p className="text-xs text-muted-foreground">{member.data_nascimento?`${calculateAge(member.data_nascimento)} anos`:'Idade não informada'}</p></div>
           </div>
           <Badge variant={member.status==='INATIVO'?'destructive':'secondary'} className="shrink-0">{member.status||'ATIVO'}</Badge>
          </div>)}
         </div>
        </motion.div>)}
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 text-center shadow-lg">
         <p className="text-blue-100 text-xs uppercase tracking-[.18em] font-medium">Total Geral</p><p className="text-3xl font-bold mt-1">{totalMembers} Membros Listados</p>
        </div>
       </div>}
     </ScrollArea>
    </CardContent>
   </Card>
  </div>

  <div className="print-only p-6 bg-white text-black">
   <div className="flex flex-col items-center mb-7 border-b-2 border-indigo-800 pb-4">
    <img src={LOGO_URL} alt="Logo" className="header-logo mb-2"/>
    <h1 className="text-xl font-extrabold text-indigo-900 uppercase text-center">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1>
    <p className="text-sm font-bold text-slate-600 uppercase mt-1">LEROLÂNDIA</p>
    <h3 className="text-lg font-bold text-indigo-800 uppercase text-center mt-3">RELATÓRIO DE MEMBROS POR CARGO</h3>
    <p className="text-xs font-bold text-indigo-700 uppercase mt-1">STATUS: {filterStatus==='todos'?'TODOS':filterStatus}</p>
   </div>
   {Object.entries(groupedMembers).map(([cargoName,members])=><div key={cargoName} className="mb-6 break-inside-avoid">
    <div className="flex justify-between items-center border-b-2 border-indigo-300 bg-indigo-50 px-2 py-2">
     <h4 className="font-bold text-indigo-900">{cargoName}</h4><span className="text-xs font-bold">Qtd.: {members.length}</span>
    </div>
    <table>
     <thead><tr><th>NOME</th><th>NASCIMENTO</th><th>IDADE</th><th>STATUS</th></tr></thead>
     <tbody>{members.map((m,idx)=><tr key={m.id} className={idx%2===0?'bg-slate-50':''}><td>{m.nome_completo}</td><td className="text-center">{m.data_nascimento?new Date(m.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR'):'-'}</td><td className="text-center">{calculateAge(m.data_nascimento)}</td><td className="text-center font-bold">{m.status||'ATIVO'}</td></tr>)}</tbody>
    </table>
   </div>)}
   <div className="border-t pt-3 mt-8 text-xs text-slate-500 flex justify-between"><span>Total: {totalMembers} membros</span><span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span></div>
  </div>
 </div>
};

export default ConsultaMembrosCargoRelatorio;
