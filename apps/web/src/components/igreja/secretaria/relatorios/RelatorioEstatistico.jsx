import React,{useState,useEffect,useCallback,useMemo}from'react';
import{BookOpen,Crown,Download,FileText,Filter,Flame,Heart,Printer,Shield,Users,Activity,ChevronDown,ChevronUp,Loader2}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO_URL='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const getBase64Image=url=>new Promise(resolve=>{const img=new Image();img.crossOrigin='Anonymous';img.src=url;img.onload=()=>{const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);resolve(c.toDataURL('image/png'))};img.onerror=()=>resolve(null)});
const calculateAge=dob=>{if(!dob)return 999;const diff=Date.now()-new Date(dob+'T00:00:00').getTime(),age=new Date(diff);return Math.abs(age.getUTCFullYear()-1970)};

const RelatorioEstatistico=()=>{
 const{toast}=useToast();
 const[stats,setStats]=useState({pastores:0,evangelistas:0,missionarios:0,presbiteros:0,diaconos:0,obreiros:0,secretarios:0,tesoureiros:0,membros:0,congregados:0,jovens:0,criancas:0,batizados:0,casamentos:0});
 const[loading,setLoading]=useState(true),[filterStatus,setFilterStatus]=useState('ATIVO'),[showFilters,setShowFilters]=useState(false);

 const fetchData=useCallback(async()=>{
  setLoading(true);
  try{
   const{data:membros,error:memError}=await supabase.from('igreja_membros').select('id,data_nascimento,is_batizado_espirito,status,igreja_funcoes(nome_funcao),cargo:cargos_igreja(nome_cargo),classe:igreja_classes(nome_classe)').order('nome_completo',{ascending:true});
   if(memError)throw memError;
   const membrosFiltrados=(membros||[]).filter(m=>filterStatus==='todos'||(m.status||'ATIVO')===filterStatus);
   const threeMonthsAgo=new Date();threeMonthsAgo.setMonth(threeMonthsAgo.getMonth()-3);
   const{data:casamentos,error:casError}=await supabase.from('igreja_casamentos').select('id,data').gte('data',threeMonthsAgo.toISOString().split('T')[0]);
   if(casError)throw casError;
   const s={pastores:0,evangelistas:0,missionarios:0,presbiteros:0,diaconos:0,obreiros:0,secretarios:0,tesoureiros:0,membros:0,congregados:0,jovens:0,criancas:0,batizados:0,casamentos:(casamentos||[]).length};
   membrosFiltrados.forEach(m=>{
    const func=(m.igreja_funcoes?.nome_funcao||'').toLowerCase(),cargo=(m.cargo?.nome_cargo||'').toLowerCase(),classe=(m.classe?.nome_classe||'').toLowerCase(),age=calculateAge(m.data_nascimento);
    if(cargo.includes('pastor'))s.pastores++;
    if(cargo.includes('evangelista'))s.evangelistas++;
    if(cargo.includes('missionário')||cargo.includes('missionaria')||cargo.includes('missionária'))s.missionarios++;
    if(cargo.includes('presbítero')||cargo.includes('presbitero'))s.presbiteros++;
    if(cargo.includes('diácono')||cargo.includes('diacono'))s.diaconos++;
    if(func.includes('obreiro'))s.obreiros++;
    if(cargo.includes('secretário')||cargo.includes('secretario')||func.includes('secretário')||func.includes('secretario'))s.secretarios++;
    if(cargo.includes('tesoureiro')||func.includes('tesoureiro'))s.tesoureiros++;
    if(classe.includes('membro')||func.includes('membro'))s.membros++;
    if(classe.includes('congregado'))s.congregados++;
    if(classe.includes('congregado')&&age<30)s.jovens++;
    if(classe.includes('criança')||classe.includes('crianca')||age<12)s.criancas++;
    if(m.is_batizado_espirito)s.batizados++;
   });
   setStats(s);
  }catch(error){toast({title:'Erro',description:error.message,variant:'destructive'})}finally{setLoading(false)}
 },[toast,filterStatus]);

 useEffect(()=>{fetchData()},[fetchData]);

 const statsArray=useMemo(()=>[
  {label:'Pastores',value:stats.pastores,icon:Crown,color:'text-amber-500'},
  {label:'Evangelistas',value:stats.evangelistas,icon:BookOpen,color:'text-blue-500'},
  {label:'Missionários',value:stats.missionarios,icon:Shield,color:'text-indigo-500'},
  {label:'Presbíteros',value:stats.presbiteros,icon:Users,color:'text-green-500'},
  {label:'Diáconos',value:stats.diaconos,icon:Users,color:'text-emerald-500'},
  {label:'Obreiros',value:stats.obreiros,icon:Activity,color:'text-orange-500'},
  {label:'Secretários',value:stats.secretarios,icon:Users,color:'text-pink-500'},
  {label:'Tesoureiros',value:stats.tesoureiros,icon:Users,color:'text-violet-500'},
  {label:'Membros',value:stats.membros,icon:Users,color:'text-blue-600'},
  {label:'Congregados',value:stats.congregados,icon:Users,color:'text-slate-500'},
  {label:'Jovens Congregados',value:stats.jovens,icon:Users,color:'text-pink-500'},
  {label:'Crianças',value:stats.criancas,icon:Users,color:'text-teal-500'},
  {label:'Batizados E.S.',value:stats.batizados,icon:Flame,color:'text-red-500'},
  {label:'Casamentos (3m)',value:stats.casamentos,icon:Heart,color:'text-rose-500'}
 ],[stats]);

 const handleExportExcel=()=>{
  const ws=XLSX.utils.json_to_sheet(statsArray.map(s=>({Categoria:s.label,Quantidade:s.value})));
  ws['!cols']=[{wch:28},{wch:14}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Estatisticas');
  XLSX.writeFile(wb,`Relatorio_Estatistico_${filterStatus==='todos'?'Todos':filterStatus==='ATIVO'?'Ativos':'Inativos'}.xlsx`);
 };

 const handleGeneratePDF=async()=>{
  const doc=new jsPDF('p','mm','a4');
  try{const logo=await getBase64Image(LOGO_URL);if(logo)doc.addImage(logo,'PNG',15,10,20,20)}catch{}
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(30,58,138);doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,16,{align:'center'});
  doc.setFontSize(11);doc.setTextColor(71,85,105);doc.text('LEROLÂNDIA',105,23,{align:'center'});
  doc.setFontSize(15);doc.setTextColor(30,58,138);doc.text('RELATÓRIO ESTATÍSTICO',105,34,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(71,85,105);doc.text(`Status: ${filterStatus==='todos'?'Todos os Status':filterStatus==='ATIVO'?'Ativos':'Inativos'}`,105,41,{align:'center'});
  autoTable(doc,{head:[['Categoria','Quantidade']],body:statsArray.map(s=>[s.label,String(s.value)]),startY:48,margin:{left:18,right:18},styles:{fontSize:10,cellPadding:3,textColor:[30,41,59]},headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold'},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{1:{halign:'center',fontStyle:'bold'}}});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`,18,287);doc.text(`Status: ${filterStatus==='todos'?'Todos':filterStatus}`,192,287,{align:'right'});
  doc.save('Relatorio_Estatistico.pdf');
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <div className="space-y-5 flex-1 flex flex-col">
   <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
    <div className="flex items-center gap-3">
     <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20"><Activity className="w-6 h-6 text-blue-500"/></div>
     <div><h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Relatório Estatístico</h2><p className="text-sm text-muted-foreground">Visão geral do corpo de membros e liderança.</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}><Filter className="w-4 h-4 mr-2"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp className="w-4 h-4 ml-2"/>:<ChevronDown className="w-4 h-4 ml-2"/>}</Button>
     <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="w-4 h-4 mr-2"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={handleGeneratePDF}><FileText className="w-4 h-4 mr-2"/>PDF</Button>
     <Button size="sm" onClick={()=>window.print()} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="w-4 h-4 mr-2"/>Imprimir</Button>
    </div>
   </div>

   {showFilters&&<Card><CardContent className="p-4"><div className="max-w-sm"><p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Status dos membros</p><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Status</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select></div></CardContent></Card>}

   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Membros</p><p className="text-2xl font-bold mt-1">{stats.membros}</p></div><Users className="w-5 h-5 text-blue-500"/></div></CardContent></Card>
    <Card><CardContent className="p-4"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Lideranças</p><p className="text-2xl font-bold mt-1">{stats.pastores+stats.evangelistas+stats.missionarios+stats.presbiteros+stats.diaconos+stats.obreiros+stats.secretarios+stats.tesoureiros}</p></div><Crown className="w-5 h-5 text-amber-500"/></CardContent></Card>
    <Card><CardContent className="p-4"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Batizados E.S.</p><p className="text-2xl font-bold mt-1 text-red-500">{stats.batizados}</p></div><Flame className="w-5 h-5 text-red-500"/></CardContent></Card>
    <Card><CardContent className="p-4"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">Casamentos 3m</p><p className="text-2xl font-bold mt-1 text-rose-500">{stats.casamentos}</p></div><Heart className="w-5 h-5 text-rose-500"/></CardContent></Card>
   </div>

   <Card className="flex-1 min-h-0 overflow-hidden">
    <CardHeader className="pb-3 border-b border-border"><div className="flex flex-col md:flex-row md:items-center justify-between gap-2"><CardTitle className="text-base md:text-lg">Indicadores Estatísticos</CardTitle><div className="text-xs text-muted-foreground">{filterStatus==='todos'?'Todos os membros':filterStatus==='ATIVO'?'Membros ativos':'Membros inativos'}</div></div></CardHeader>
    <CardContent className="p-4 md:p-6">
     {loading?<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>:
      <div className="space-y-5">
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statsArray.map((stat,i)=>{const Icon=stat.icon;return <Card key={i} className="border border-border bg-card hover:bg-muted/30 transition-colors"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle><Icon className={`w-5 h-5 ${stat.color}`}/></CardHeader><CardContent><div className="text-3xl font-bold">{stat.value}</div></CardContent></Card>})}
       </div>

       <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 text-center shadow-lg"><p className="text-blue-100 text-xs uppercase tracking-[.18em] font-medium">Resumo Geral</p><p className="text-3xl font-bold mt-1">Indicadores da Igreja</p><p className="text-xs text-blue-100 mt-1">Dados conforme os registros cadastrados no sistema</p></div>
      </div>
     }
    </CardContent>
   </Card>
  </div>
 </div>
};

export default RelatorioEstatistico;
