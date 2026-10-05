import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Activity,BookOpen,ChevronDown,ChevronUp,Crown,Download,FileText,Filter,Flame,Heart,Printer,Shield,Users,UserCheck,ClipboardList,Wallet}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],LIGHT=[239,246,255],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139],GREEN=[22,163,74];
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const age=v=>{if(!v)return null;const b=new Date(`${v}T00:00:00`),t=new Date();let a=t.getFullYear()-b.getFullYear(),m=t.getMonth()-b.getMonth();if(m<0||(m===0&&t.getDate()<b.getDate()))a--;return a};
const date=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'-';
const img64=url=>new Promise(r=>{let d=0,f=v=>{if(d)return;d=1;r(v)},i=new Image(),tm=setTimeout(()=>f(null),8000);i.crossOrigin='anonymous';i.onload=()=>{try{const c=document.createElement('canvas');c.width=i.naturalWidth||i.width;c.height=i.naturalHeight||i.height;c.getContext('2d').drawImage(i,0,0);clearTimeout(tm);f({data:c.toDataURL('image/png'),width:c.width,height:c.height})}catch{clearTimeout(tm);f(null)}};i.onerror=()=>{clearTimeout(tm);f(null)};i.src=url});

export default function RelatorioEstatistico(){
 const{toast}=useToast();
 const[members,setMembers]=useState([]),[marriages,setMarriages]=useState([]),[loading,setLoading]=useState(true),[filterStatus,setFilterStatus]=useState('ATIVO'),[showFilters,setShowFilters]=useState(true);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const d=new Date();d.setMonth(d.getMonth()-3);
   const[a,b]=await Promise.all([
    supabase.from('igreja_membros').select('id,nome_completo,data_nascimento,is_batizado_espirito,status,tipo_vinculo,igreja_funcoes(nome_funcao),cargo:cargos_igreja(nome_cargo),classe:igreja_classes(nome_classe)').order('nome_completo',{ascending:true}),
    supabase.from('igreja_casamentos').select('id,data').gte('data',d.toISOString().split('T')[0]).order('data',{ascending:false})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setMembers(a.data||[]);setMarriages(b.data||[]);
  }catch(e){toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>members.filter(m=>filterStatus==='todos'||(m.status||'ATIVO')===filterStatus),[members,filterStatus]);

 const stats=useMemo(()=>{
  const s={total:filtered.length,ativos:0,inativos:0,membros:0,congregados:0,jovens:0,criancas:0,batizados:0,pastores:0,evangelistas:0,missionarios:0,presbiteros:0,diaconos:0,obreiros:0,secretarios:0,tesoureiros:0};
  const leaders=new Set();

  filtered.forEach(m=>{
   const c=norm(m.cargo?.nome_cargo),f=norm(m.igreja_funcoes?.nome_funcao),a=age(m.data_nascimento),v=String(m.tipo_vinculo||'MEMBRO').toUpperCase();

   if((m.status||'ATIVO')==='ATIVO')s.ativos++;else s.inativos++;
   if(v==='MEMBRO')s.membros++;
   if(v==='CONGREGADO')s.congregados++;
   if(a!==null&&a>=12&&a<30)s.jovens++;
   if(a!==null&&a<12)s.criancas++;
   if(m.is_batizado_espirito)s.batizados++;

   [['pastor',()=>c.includes('pastor'),'pastores'],['evangelista',()=>c.includes('evangelista'),'evangelistas'],['missionario',()=>c.includes('missionario'),'missionarios'],['presbitero',()=>c.includes('presbitero'),'presbiteros'],['diacono',()=>c.includes('diacono'),'diaconos'],['obreiro',()=>f.includes('obreiro'),'obreiros'],['secretario',()=>c.includes('secretario')||f.includes('secretario'),'secretarios'],['tesoureiro',()=>c.includes('tesoureiro')||f.includes('tesoureiro'),'tesoureiros']].forEach(([_,test,key])=>{if(test()){s[key]++;leaders.add(`${m.id}:${key}`)}});
  });

  s.liderancas=new Set([...leaders].map(x=>x.split(':')[0])).size;
  return s;
 },[filtered]);

 const profile=[['Membros',stats.membros,Users],['Congregados',stats.congregados,UserCheck],['Jovens',stats.jovens,Users],['Crianças',stats.criancas,Users],['Batizados E.S.',stats.batizados,Flame]];
 const leaders=[['Pastores',stats.pastores,Crown],['Evangelistas',stats.evangelistas,BookOpen],['Missionários',stats.missionarios,Shield],['Presbíteros',stats.presbiteros,Users],['Diáconos',stats.diaconos,Users],['Obreiros',stats.obreiros,Activity],['Secretários',stats.secretarios,ClipboardList],['Tesoureiros',stats.tesoureiros,Wallet]];
 const max=Math.max(...leaders.map(x=>x[1]),1);

 const excel=()=>{
  const rows=[...profile.map(x=>({Grupo:'Perfil da Igreja',Indicador:x[0],Quantidade:x[1]})),...leaders.map(x=>({Grupo:'Liderança',Indicador:x[0],Quantidade:x[1]})),{Grupo:'Resumo',Indicador:'Membros filtrados',Quantidade:stats.total},{Grupo:'Resumo',Indicador:'Ativos',Quantidade:stats.ativos},{Grupo:'Resumo',Indicador:'Inativos',Quantidade:stats.inativos},{Grupo:'Eventos',Indicador:'Casamentos 3 meses',Quantidade:marriages.length}];
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  ws['!cols']=[{wch:20},{wch:34},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,'Estatisticas');
  XLSX.writeFile(wb,`Relatorio_Estatistico_${filterStatus}.xlsx`);
 };

 const pdf=async()=>{
  try{
   const d=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),logo=await img64(LOGO);
   d.setFillColor(...NAVY);d.rect(0,0,210,35,'F');
   if(logo){const s=Math.min(27/logo.width,22/logo.height);d.addImage(logo.data,'PNG',11,6+(22-logo.height*s)/2,logo.width*s,logo.height*s)}
   d.setTextColor(255,255,255);d.setFont('helvetica','bold');d.setFontSize(12);d.text('IGREJA ASSEMBLEIA DE DEUS',105,12,{align:'center'});d.setFontSize(9);d.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,18,{align:'center'});
   d.setFillColor(...YELLOW);d.roundedRect(54,24,102,7,2,2,'F');d.setTextColor(...NAVY);d.setFontSize(8);d.text('RELATÓRIO ESTATÍSTICO',105,28.7,{align:'center'});
   [['MEMBROS',stats.membros,BLUE],['CONGREGADOS',stats.congregados,YELLOW],['LIDERANÇAS',stats.liderancas,YELLOW],['CASAMENTOS 3M',marriages.length,[244,63,94]]].forEach((b,i)=>{const x=12+i*47;d.setFillColor(248,250,252);d.roundedRect(x,41,43,16,2,2,'F');d.setFillColor(...b[2]);d.roundedRect(x,41,2.5,16,1,1,'F');d.setFont('helvetica','bold');d.setFontSize(5.5);d.setTextColor(...MUTED);d.text(b[0],x+6,47);d.setFontSize(11);d.setTextColor(...TEXT);d.text(String(b[1]),x+6,53.5)});
   let y=69;
   const table=(title,head,body,color=BLUE)=>{if(y+25>270){d.addPage();y=18}d.setFillColor(...NAVY);d.roundedRect(12,y,186,9,2,2,'F');d.setTextColor(255,255,255);d.setFont('helvetica','bold');d.setFontSize(8);d.text(title,17,y+6);y+=13;autoTable(d,{head,body,startY:y,margin:{left:12,right:12},theme:'grid',styles:{fontSize:8,cellPadding:3,textColor:TEXT,lineColor:LINE,lineWidth:.2},headStyles:{fillColor:color,textColor:[255,255,255]},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{1:{halign:'center',fontStyle:'bold'}}});y=(d.lastAutoTable?.finalY||y)+8};
   table('PERFIL DA IGREJA',[['INDICADOR','QUANTIDADE']],profile.map(x=>[x[0],String(x[1])]));
   table('LIDERANÇA E SERVIÇOS',[['CARGO / SERVIÇO','QUANTIDADE']],leaders.map(x=>[x[0],String(x[1])]),[30,41,59]);
   d.save('Relatorio_Estatistico.pdf');
   toast({title:'PDF Gerado',description:'Relatório estatístico criado em A4.'});
  }catch(e){toast({title:'Erro ao gerar PDF',description:e.message,variant:'destructive'})}
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <div className="flex-1 space-y-5">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]"><Activity className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/></div><div><h2 className="text-2xl font-bold text-[hsl(var(--neon-igreja))] md:text-3xl">Relatório Estatístico</h2><p className="text-sm text-muted-foreground">Visão geral do perfil da igreja, liderança e eventos recentes.</p></div></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}><Filter className="mr-2 h-4 w-4"/>{showFilters?'Ocultar Filtros':'Filtros'}{showFilters?<ChevronUp/>:<ChevronDown/>}</Button><Button variant="outline" size="sm" onClick={excel}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-2 h-4 w-4"/>PDF</Button></div>
   </div>

   <AnimatePresence>{showFilters&&<motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden"><Card><CardContent className="p-4"><p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Status dos membros</p><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="max-w-sm"><SelectValue/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Status</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select></CardContent></Card></motion.div>}</AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Membros',stats.membros,Users],['Ativos',stats.ativos,UserCheck],['Lideranças',stats.liderancas,Crown],['Casamentos 3m',marriages.length,Heart]].map(([l,v,I],i)=><Card key={l}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase text-muted-foreground">{l}</p><p className={`mt-1 text-2xl font-bold ${i===1?'text-green-500':i===3?'text-rose-400':'text-[hsl(var(--neon-igreja))]'}`}>{v}</p></div><I className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/></div></CardContent></Card>)}</div>

   {loading?<div className="flex justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[hsl(var(--neon-igreja))] border-t-transparent"/></div>:<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <Card><CardHeader className="border-b"><CardTitle><Users className="mr-2 inline h-5 w-5 text-[hsl(var(--neon-igreja))]"/>Perfil da Igreja</CardTitle></CardHeader><CardContent className="p-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{profile.map(([l,v,I])=><div key={l} className="rounded-xl border p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-muted-foreground">{l}</span><I className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/></div><p className="mt-2 text-2xl font-bold">{v}</p></div>)}</div></CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle><Crown className="mr-2 inline h-5 w-5 text-[hsl(var(--neon-igreja))]"/>Liderança e Serviços</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{leaders.map(([l,v,I])=><div key={l}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><I className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/><span className="text-sm">{l}</span></div><b>{v}</b></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-blue-500" style={{width:`${v?Math.max(7,v/max*100):0}%`}}/></div></div>)}</CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle><Flame className="mr-2 inline h-5 w-5 text-orange-400"/>Resumo Eclesiástico</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 p-4">{[['Batizados E.S.',stats.batizados],['Jovens',stats.jovens],['Crianças',stats.criancas],['Congregados',stats.congregados]].map(([l,v])=><div key={l} className="rounded-xl border p-4"><p className="text-xs uppercase text-muted-foreground">{l}</p><p className="mt-2 text-3xl font-bold text-[hsl(var(--neon-igreja))]">{v}</p></div>)}</CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle><Heart className="mr-2 inline h-5 w-5 text-rose-400"/>Eventos Recentes</CardTitle></CardHeader><CardContent className="p-4">{marriages.length?<div className="space-y-2">{marriages.slice(0,6).map(m=><div key={m.id} className="flex justify-between rounded-lg border p-3"><span>Casamento registrado</span><span className="text-xs text-muted-foreground">{date(m.data)}</span></div>)}</div>:<p className="py-8 text-center text-sm text-muted-foreground">Nenhum casamento registrado nos últimos 3 meses.</p>}</CardContent></Card>
   </div>}
  </div>
 </div>;
}
