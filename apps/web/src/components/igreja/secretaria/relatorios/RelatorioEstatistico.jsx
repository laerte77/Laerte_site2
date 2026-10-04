import React,{useState,useEffect,useCallback,useMemo}from'react';
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
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],LIGHT=[239,246,255],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139],GREEN=[22,163,74],RED=[220,38,38];

const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const age=v=>{if(!v)return null;const b=new Date(`${v}T00:00:00`),t=new Date();let a=t.getFullYear()-b.getFullYear(),m=t.getMonth()-b.getMonth();if(m<0||(m===0&&t.getDate()<b.getDate()))a--;return a};
const date=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'-';
const img64=url=>new Promise(r=>{let d=0,f=v=>{if(d)return;d=1;r(v)},i=new Image(),tm=setTimeout(()=>f(null),8000);i.crossOrigin='anonymous';i.onload=()=>{try{const c=document.createElement('canvas');c.width=i.naturalWidth||i.width;c.height=i.naturalHeight||i.height;c.getContext('2d').drawImage(i,0,0);clearTimeout(tm);f({data:c.toDataURL('image/png'),width:c.width,height:c.height})}catch{clearTimeout(tm);f(null)}};i.onerror=()=>{clearTimeout(tm);f(null)};i.src=url});

const RelatorioEstatistico=()=>{
 const{toast}=useToast(),[members,setMembers]=useState([]),[marriages,setMarriages]=useState([]),[loading,setLoading]=useState(true),[filterStatus,setFilterStatus]=useState('ATIVO'),[showFilters,setShowFilters]=useState(true);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const d=new Date();d.setMonth(d.getMonth()-3);
   const[a,b]=await Promise.all([
    supabase.from('igreja_membros').select('id,nome_completo,data_nascimento,is_batizado_espirito,status,igreja_funcoes(nome_funcao),cargo:cargos_igreja(nome_cargo)').order('nome_completo',{ascending:true}),
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
  const s={total:filtered.length,ativos:0,inativos:0,membros:filtered.length,congregados:0,jovens:0,criancas:0,batizados:0,pastores:0,evangelistas:0,missionarios:0,presbiteros:0,diaconos:0,obreiros:0,secretarios:0,tesoureiros:0};
  const leaders=new Set();

  filtered.forEach(m=>{
   const c=norm(m.cargo?.nome_cargo),f=norm(m.igreja_funcoes?.nome_funcao),a=age(m.data_nascimento);

   if((m.status||'ATIVO')==='ATIVO')s.ativos++;else s.inativos++;
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
  const rows=[
   ...profile.map(x=>({Grupo:'Perfil da Igreja',Indicador:x[0],Quantidade:x[1]})),
   ...leaders.map(x=>({Grupo:'Liderança',Indicador:x[0],Quantidade:x[1]})),
   {Grupo:'Resumo',Indicador:'Membros filtrados',Quantidade:stats.total},
   {Grupo:'Resumo',Indicador:'Ativos',Quantidade:stats.ativos},
   {Grupo:'Resumo',Indicador:'Inativos',Quantidade:stats.inativos},
   {Grupo:'Eventos',Indicador:'Casamentos 3 meses',Quantidade:marriages.length}
  ];
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  ws['!cols']=[{wch:20},{wch:34},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,'Estatisticas');
  XLSX.writeFile(wb,`Relatorio_Estatistico_${filterStatus}.xlsx`);
 };

 const pdf=async()=>{
  try{
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),logo=await img64(LOGO),H=297;
   doc.setFillColor(...NAVY);doc.rect(0,0,210,35,'F');

   if(logo){
    const s=Math.min(27/logo.width,22/logo.height);
    doc.addImage(logo.data,'PNG',11,6+(22-logo.height*s)/2,logo.width*s,logo.height*s);
   }

   doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('IGREJA ASSEMBLEIA DE DEUS',105,12,{align:'center'});
   doc.setFontSize(9);doc.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,18,{align:'center'});
   doc.setFillColor(...YELLOW);doc.roundedRect(54,24,102,7,2,2,'F');
   doc.setTextColor(...NAVY);doc.setFontSize(8);doc.text('RELATÓRIO ESTATÍSTICO',105,28.7,{align:'center'});

   [['MEMBROS',stats.total,BLUE],['ATIVOS',stats.ativos,GREEN],['LIDERANÇAS',stats.liderancas,YELLOW],['CASAMENTOS 3M',marriages.length,[244,63,94]]].forEach((b,i)=>{
    const x=12+i*47;
    doc.setFillColor(248,250,252);doc.roundedRect(x,41,43,16,2,2,'F');
    doc.setFillColor(...b[2]);doc.roundedRect(x,41,2.5,16,1,1,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(5.5);doc.setTextColor(...MUTED);doc.text(b[0],x+6,47);
    doc.setFontSize(11);doc.setTextColor(...TEXT);doc.text(String(b[1]),x+6,53.5);
   });

   doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...MUTED);
   doc.text(`Status: ${filterStatus==='todos'?'Todos':filterStatus==='ATIVO'?'Ativos':'Inativos'}`,12,64);
   doc.text(`Gerado em: ${date(new Date().toISOString().slice(0,10))}`,198,64,{align:'right'});

   let y=69;
   const table=(title,head,body,color=BLUE)=>{
    if(y+25>270){doc.addPage();y=18}
    doc.setFillColor(...NAVY);doc.roundedRect(12,y,186,9,2,2,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text(title,17,y+6);
    y+=13;
    autoTable(doc,{head,body,startY:y,margin:{left:12,right:12},theme:'grid',styles:{fontSize:8,cellPadding:3,textColor:TEXT,lineColor:LINE,lineWidth:.2},headStyles:{fillColor:color,textColor:[255,255,255],fontStyle:'bold'},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{1:{halign:'center',fontStyle:'bold'}}});
    y=(doc.lastAutoTable?.finalY||y)+8;
   };

   table('PERFIL DA IGREJA',[['INDICADOR','QUANTIDADE']],profile.map(x=>[x[0],String(x[1])]));
   table('LIDERANÇA E SERVIÇOS',[['CARGO / SERVIÇO','QUANTIDADE']],leaders.map(x=>[x[0],String(x[1])]),[30,41,59]);
   table('EVENTOS RECENTES',[['DATA','EVENTO']],marriages.length?marriages.map(m=>[date(m.data),'Casamento registrado']):[['-','Nenhum casamento registrado nos últimos 3 meses.']],[244,63,94]);

   if(y+25>275){doc.addPage();y=18}
   doc.setFillColor(...LIGHT);doc.roundedRect(12,y,186,22,3,3,'F');
   doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...BLUE);doc.text('RESUMO',18,y+7);
   doc.setFont('helvetica','normal');doc.setTextColor(...TEXT);
   doc.text(`Membros: ${stats.total}`,18,y+15);doc.text(`Ativos: ${stats.ativos}`,64,y+15);doc.text(`Inativos: ${stats.inativos}`,105,y+15);doc.text(`Lideranças: ${stats.liderancas}`,150,y+15);

   const p=doc.getNumberOfPages();
   doc.setPage(p);doc.setDrawColor(...LINE);doc.line(12,H-11,198,H-11);
   doc.setFontSize(5.5);doc.setTextColor(...MUTED);doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',12,H-6);
   doc.setFont('helvetica','bold');doc.setTextColor(...BLUE);doc.text('SECRETARIA • RELATÓRIO ESTATÍSTICO',105,H-6,{align:'center'});
   doc.setFont('helvetica','normal');doc.setTextColor(...MUTED);doc.text(`Página ${p} de ${p}`,198,H-6,{align:'right'});
   doc.save('Relatorio_Estatistico.pdf');
   toast({title:'PDF Gerado',description:'Relatório estatístico criado em A4.'});
  }catch(e){toast({title:'Erro ao gerar PDF',description:e.message,variant:'destructive'})}
 };

 const print=()=>{
  const statusText=filterStatus==='todos'?'Todos os Status':filterStatus==='ATIVO'?'Ativos':'Inativos';
  const t=(title,rows,event=false)=>`<section><h3>${title}</h3><table><thead><tr><th>${event?'DATA':'INDICADOR'}</th><th>${event?'EVENTO':'QUANTIDADE'}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  const w=window.open('','_blank','width=900,height=1100');

  if(!w)return toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});

  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Relatório Estatístico</title><style>
@page{size:A4 portrait;margin:9mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1e293b;margin:0}
.header{background:#0f172a;color:#fff;padding:12px 14px 10px;border-radius:0 0 7px 7px;text-align:center;position:relative}
.logo{position:absolute;left:13px;top:8px;width:27mm;height:auto;max-height:23mm;object-fit:contain}
.inst{font-size:15px;font-weight:800}
.sub{font-size:9px;color:#cbd5e1;margin-top:3px}
.title{display:inline-block;background:#eab308;color:#0f172a;border-radius:4px;padding:5px 20px;margin-top:7px;font-size:9px;font-weight:800}
.meta{display:flex;justify-content:space-between;margin:7px 0;font-size:7px;color:#64748b}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0}
.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:7px}
.kpi span{display:block;font-size:5.5px;color:#64748b;font-weight:700}
.kpi strong{display:block;font-size:14px;margin-top:2px}
section{margin-top:9px;break-inside:avoid}
h3{background:#0f172a;color:#fff;border-radius:5px 5px 0 0;padding:7px 9px;margin:0;font-size:8px}
table{width:100%;border-collapse:collapse;font-size:7.5px}
th{background:#2563eb;color:#fff;padding:5px;border:1px solid #1d4ed8;text-align:left}
td{padding:5px;border:1px solid #cbd5e1}
tbody tr:nth-child(even) td{background:#f8fafc}
.center{text-align:center}
.summary{margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:9px;display:grid;grid-template-columns:repeat(4,1fr);font-size:7px}
.summary span{font-weight:700;color:#1e3a8a}
.footer{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:4px;display:grid;grid-template-columns:1fr auto 1fr;font-size:5.5px;color:#64748b}
.footer b{text-align:center;color:#1e3a8a}
.footer span:last-child{text-align:right}
</style></head><body>
<div class="header">
<img src="${LOGO}" class="logo">
<div class="inst">IGREJA ASSEMBLEIA DE DEUS</div>
<div class="sub">MINISTÉRIO PLANTAR • LEROLÂNDIA</div>
<div class="title">RELATÓRIO ESTATÍSTICO</div>
</div>
<div class="meta"><span>Status: ${statusText}</span><span>Visão estatística da Secretaria</span><span>${date(new Date().toISOString().slice(0,10))}</span></div>
<div class="kpis">
<div class="kpi"><span>MEMBROS</span><strong>${stats.total}</strong></div>
<div class="kpi"><span>ATIVOS</span><strong>${stats.ativos}</strong></div>
<div class="kpi"><span>LIDERANÇAS</span><strong>${stats.liderancas}</strong></div>
<div class="kpi"><span>CASAMENTOS 3M</span><strong>${marriages.length}</strong></div>
</div>
${t('PERFIL DA IGREJA',profile.map(x=>`<tr><td>${x[0]}</td><td class="center">${x[1]}</td></tr>`).join(''))}
${t('LIDERANÇA E SERVIÇOS',leaders.map(x=>`<tr><td>${x[0]}</td><td class="center">${x[1]}</td></tr>`).join(''))}
${t('EVENTOS RECENTES',marriages.length?marriages.map(m=>`<tr><td class="center">${date(m.data)}</td><td>Casamento registrado</td></tr>`).join(''):'<tr><td colspan="2">Nenhum casamento registrado nos últimos 3 meses.</td></tr>',true)}
<div class="summary"><span>Membros: ${stats.total}</span><span>Ativos: ${stats.ativos}</span><span>Inativos: ${stats.inativos}</span><span>Lideranças: ${stats.liderancas}</span></div>
<div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><b>SECRETARIA • RELATÓRIO ESTATÍSTICO</b><span>Data: ${date(new Date().toISOString().slice(0,10))}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\\/script>
</body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <div className="flex-1 space-y-5">

   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
      <Activity className="h-6 w-6 text-blue-400"/>
     </div>
     <div>
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 md:text-3xl">Relatório Estatístico</h2>
      <p className="text-sm text-muted-foreground">Visão geral do perfil da igreja, liderança e eventos recentes.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" size="sm" onClick={()=>setShowFilters(v=>!v)}>
      <Filter className="mr-2 h-4 w-4"/>
      {showFilters?'Ocultar Filtros':'Filtros'}
      {showFilters?<ChevronUp className="ml-1 h-4 w-4"/>:<ChevronDown className="ml-1 h-4 w-4"/>}
     </Button>
     <Button variant="outline" size="sm" onClick={excel}><Download className="mr-2 h-4 w-4"/>Excel</Button>
     <Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-2 h-4 w-4"/>PDF</Button>
     <Button size="sm" onClick={print} className="bg-indigo-600 hover:bg-indigo-700"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
    </div>
   </div>

   <AnimatePresence>
    {showFilters&&
     <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
      <Card>
       <CardContent className="p-4">
        <div className="max-w-sm">
         <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status dos membros</p>
         <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent className="dark-igreja">
           <SelectItem value="todos">Todos os Status</SelectItem>
           <SelectItem value="ATIVO">Ativos</SelectItem>
           <SelectItem value="INATIVO">Inativos</SelectItem>
          </SelectContent>
         </Select>
        </div>
       </CardContent>
      </Card>
     </motion.div>
    }
   </AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[
     ['Membros',stats.total,Users,'text-blue-400'],
     ['Ativos',stats.ativos,UserCheck,'text-green-500'],
     ['Lideranças',stats.liderancas,Crown,'text-yellow-400'],
     ['Casamentos 3m',marriages.length,Heart,'text-rose-400']
    ].map(([l,v,I,c])=>
     <Card key={l}>
      <CardContent className="p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
         <p className={`mt-1 text-2xl font-bold ${c}`}>{v}</p>
        </div>
        <I className={`h-5 w-5 ${c}`}/>
       </div>
      </CardContent>
     </Card>
    )}
   </div>

   {loading?
    <div className="flex items-center justify-center rounded-xl border border-border bg-card py-20">
     <div className="h-9 w-9 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"/>
    </div>
   :
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

     <Card>
      <CardHeader className="border-b border-border">
       <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-blue-400"/>Perfil da Igreja</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
       <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {profile.map(([l,v,I])=>
         <div key={l} className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold uppercase text-muted-foreground">{l}</span>
           <I className="h-4 w-4 text-blue-400"/>
          </div>
          <p className="mt-2 text-2xl font-bold">{v}</p>
         </div>
        )}
       </div>
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="border-b border-border">
       <CardTitle className="flex items-center gap-2 text-base"><Crown className="h-5 w-5 text-yellow-400"/>Liderança e Serviços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
       {leaders.map(([l,v,I])=>{
        const w=v?Math.max(7,v/max*100):0;
        return <div key={l}>
         <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
           <I className="h-4 w-4 text-yellow-400"/>
           <span className="text-sm">{l}</span>
          </div>
          <b>{v}</b>
         </div>
         <div className="h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-blue-500" style={{width:`${w}%`}}/>
         </div>
        </div>
       })}
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="border-b border-border">
       <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-5 w-5 text-red-400"/>Resumo Eclesiástico</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 p-4">
       {[
        ['Batizados E.S.',stats.batizados,'text-red-400'],
        ['Jovens',stats.jovens,''],
        ['Crianças',stats.criancas,''],
        ['Casamentos 3m',marriages.length,'text-rose-400']
       ].map(([l,v,c])=>
        <div key={l} className="rounded-xl border border-border bg-background/40 p-4">
         <p className="text-xs uppercase text-muted-foreground">{l}</p>
         <p className={`mt-2 text-3xl font-bold ${c}`}>{v}</p>
        </div>
       )}
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="border-b border-border">
       <CardTitle className="flex items-center gap-2 text-base"><Heart className="h-5 w-5 text-rose-400"/>Eventos Recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
       {marriages.length?
        <div className="space-y-2">
         {marriages.slice(0,6).map(m=>
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
           <span className="text-sm">Casamento registrado</span>
           <span className="rounded-full bg-muted px-3 py-1 text-xs">{date(m.data)}</span>
          </div>
         )}
        </div>
        :
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum casamento registrado nos últimos 3 meses.</p>
       }
      </CardContent>
     </Card>

    </div>
   }

   {!loading&&
    <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-center text-white shadow-lg">
     <p className="text-xs uppercase tracking-[.18em] text-blue-100">Visão Geral</p>
     <p className="mt-1 text-3xl font-bold">{stats.total} Membros</p>
     <p className="mt-1 text-xs text-blue-100">{stats.ativos} ativos • {stats.inativos} inativos • {stats.liderancas} pessoas em liderança</p>
    </div>
   }

  </div>
 </div>;
};

export default RelatorioEstatistico;
