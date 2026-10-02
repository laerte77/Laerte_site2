import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Clock,Download,FileText,History,Printer,RefreshCw,UserRound,ArrowRight,PlusCircle,Trash2,Edit3}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle}from'@/components/ui/dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const NAVY=[15,23,42],BLUE=[37,99,235],YELLOW=[234,179,8],GREEN=[22,163,74],RED=[220,38,38],TEXT=[30,41,59],MUTED=[100,116,139],LINE=[203,213,225],LIGHT=[239,246,255];

const formatDateTime=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'-';
const safeText=v=>{
 if(v===null||v===undefined||v==='')return'Não informado';
 if(typeof v==='object')return JSON.stringify(v);
 return String(v);
};
const img64=url=>new Promise(resolve=>{
 let done=false;
 const finish=v=>{if(done)return;done=true;resolve(v)};
 const i=new Image();
 const tm=setTimeout(()=>finish(null),8000);
 i.crossOrigin='anonymous';
 i.onload=()=>{
  try{
   const c=document.createElement('canvas');
   c.width=i.naturalWidth||i.width;c.height=i.naturalHeight||i.height;
   c.getContext('2d').drawImage(i,0,0);
   clearTimeout(tm);
   finish({data:c.toDataURL('image/png'),width:c.width,height:c.height});
  }catch{clearTimeout(tm);finish(null)}
 };
 i.onerror=()=>{clearTimeout(tm);finish(null)};
 i.src=url;
});

const ConsultaHistoricoMembro=({membro,open,onOpenChange})=>{
 const{toast}=useToast();
 const[historico,setHistorico]=useState([]);
 const[loading,setLoading]=useState(false);

 const carregar=useCallback(async()=>{
  if(!membro?.id)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('igreja_membros_historico').select('*').eq('membro_id',membro.id).order('alterado_em',{ascending:false});
   if(error)throw error;
   setHistorico(data||[]);
  }catch(e){
   toast({title:'Erro ao carregar histórico',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[membro?.id,toast]);

 useEffect(()=>{if(open)carregar()},[open,carregar]);

 const totalAlteracoes=useMemo(()=>historico.filter(x=>x.acao==='ALTERAÇÃO').length,[historico]);
 const ultimoRegistro=historico[0]?.alterado_em||null;

 const tipo=acao=>{
  if(acao==='CADASTRO')return{label:'Cadastro',className:'bg-green-500/15 text-green-400 border-green-500/30',icon:PlusCircle};
  if(acao==='EXCLUSÃO')return{label:'Exclusão',className:'bg-red-500/15 text-red-400 border-red-500/30',icon:Trash2};
  return{label:'Alteração',className:'bg-blue-500/15 text-blue-400 border-blue-500/30',icon:Edit3};
 };

 const excel=()=>{
  const rows=historico.map(h=>({
   'Data/Hora':formatDateTime(h.alterado_em),
   'Ação':h.acao||'ALTERAÇÃO',
   'Campo':h.campo_label||h.campo||'-',
   'Valor anterior':h.valor_anterior_texto||safeText(h.valor_anterior),
   'Novo valor':h.valor_novo_texto||safeText(h.valor_novo),
   'Usuário':h.alterado_por||'Não informado'
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:22},{wch:14},{wch:28},{wch:34},{wch:34},{wch:40}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Histórico');
  XLSX.writeFile(wb,`Historico_${(membro?.nome_completo||'Membro').replace(/\s+/g,'_')}.xlsx`);
 };

 const pdf=async()=>{
  try{
   const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   const logo=await img64(LOGO);
   doc.setFillColor(...NAVY);doc.rect(0,0,210,36,'F');
   if(logo){
    const s=Math.min(27/logo.width,22/logo.height);
    doc.addImage(logo.data,'PNG',11,6+(22-logo.height*s)/2,logo.width*s,logo.height*s);
   }
   doc.setTextColor(255,255,255);
   doc.setFont('helvetica','bold');doc.setFontSize(12);
   doc.text('IGREJA ASSEMBLEIA DE DEUS',105,12,{align:'center'});
   doc.setFontSize(9);doc.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,18,{align:'center'});
   doc.setFillColor(...YELLOW);doc.roundedRect(61,24,88,7,2,2,'F');
   doc.setTextColor(...NAVY);doc.setFontSize(8);doc.text('HISTÓRICO DO MEMBRO',105,28.7,{align:'center'});

   doc.setTextColor(...TEXT);doc.setFont('helvetica','bold');doc.setFontSize(11);
   doc.text(membro?.nome_completo||'Membro',12,47);
   doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...MUTED);
   doc.text(`Registros: ${historico.length} • Alterações: ${totalAlteracoes}`,12,53);
   if(ultimoRegistro)doc.text(`Último registro: ${formatDateTime(ultimoRegistro)}`,198,53,{align:'right'});

   const body=historico.map(h=>[
    formatDateTime(h.alterado_em),
    h.acao||'ALTERAÇÃO',
    h.campo_label||h.campo||'-',
    h.valor_anterior_texto||safeText(h.valor_anterior),
    h.valor_novo_texto||safeText(h.valor_novo),
    h.alterado_por?String(h.alterado_por).slice(0,12)+'…':'-'
   ]);

   autoTable(doc,{
    head:[['DATA / HORA','AÇÃO','CAMPO','VALOR ANTERIOR','NOVO VALOR','USUÁRIO']],
    body,
    startY:59,
    margin:{left:12,right:12,bottom:18},
    theme:'grid',
    styles:{fontSize:6.5,cellPadding:2.4,textColor:TEXT,lineColor:LINE,lineWidth:.2,overflow:'linebreak',valign:'middle'},
    headStyles:{fillColor:BLUE,textColor:[255,255,255],fontStyle:'bold',fontSize:6.5},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{
     0:{cellWidth:25},
     1:{cellWidth:20},
     2:{cellWidth:31},
     3:{cellWidth:42},
     4:{cellWidth:42},
     5:{cellWidth:22}
    }
   });

   const p=doc.getNumberOfPages();
   for(let i=1;i<=p;i++){
    doc.setPage(i);
    doc.setDrawColor(...LINE);doc.line(12,286,198,286);
    doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(...MUTED);
    doc.text('Histórico emitido eletronicamente pelo sistema da Secretaria.',12,291);
    doc.setFont('helvetica','bold');doc.setTextColor(...BLUE);
    doc.text('SECRETARIA • HISTÓRICO DO MEMBRO',105,291,{align:'center'});
    doc.setFont('helvetica','normal');doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${p}`,198,291,{align:'right'});
   }

   doc.save(`Historico_${(membro?.nome_completo||'Membro').replace(/\s+/g,'_')}.pdf`);
   toast({title:'PDF gerado',description:'Histórico do membro exportado em A4.'});
  }catch(e){
   toast({title:'Erro ao gerar PDF',description:e.message,variant:'destructive'});
  }
 };

 const imprimir=()=>{
  const w=window.open('','_blank','width=1000,height=1100');
  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
   return;
  }

  const rows=historico.map(h=>`
   <tr>
    <td>${formatDateTime(h.alterado_em)}</td>
    <td>${h.acao||'ALTERAÇÃO'}</td>
    <td>${h.campo_label||h.campo||'-'}</td>
    <td>${h.valor_anterior_texto||safeText(h.valor_anterior)}</td>
    <td>${h.valor_novo_texto||safeText(h.valor_novo)}</td>
    <td>${h.alterado_por?String(h.alterado_por).slice(0,18)+'…':'-'}</td>
   </tr>`).join('');

  w.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Histórico do Membro</title>
  <style>
  @page{size:A4 portrait;margin:9mm}
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1e293b;margin:0}
  .header{background:#0f172a;color:#fff;padding:13px 14px 11px;text-align:center;position:relative;border-radius:0 0 7px 7px}
  .logo{position:absolute;left:13px;top:8px;width:27mm;height:auto;max-height:23mm;object-fit:contain}
  .inst{font-size:15px;font-weight:800}
  .sub{font-size:9px;color:#cbd5e1;margin-top:3px}
  .title{display:inline-block;background:#eab308;color:#0f172a;border-radius:4px;padding:5px 18px;margin-top:7px;font-size:9px;font-weight:800}
  .member{margin-top:12px;padding:10px;border:1px solid #e2e8f0;border-radius:7px;background:#f8fafc}
  .member h2{margin:0;font-size:16px}
  .meta{margin-top:4px;font-size:7px;color:#64748b}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:7px;table-layout:fixed}
  th{background:#2563eb;color:#fff;padding:5px;border:1px solid #1d4ed8;text-align:left}
  td{padding:5px;border:1px solid #cbd5e1;vertical-align:top;word-break:break-word}
  tbody tr:nth-child(even) td{background:#f8fafc}
  .footer{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:5px;font-size:5.5px;color:#64748b;display:flex;justify-content:space-between}
  </style></head><body>
  <div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS</div><div class="sub">MINISTÉRIO PLANTAR • LEROLÂNDIA</div><div class="title">HISTÓRICO DO MEMBRO</div></div>
  <div class="member"><h2>${membro?.nome_completo||'Membro'}</h2><div class="meta">Registros: ${historico.length} • Alterações: ${totalAlteracoes}${ultimoRegistro?` • Último registro: ${formatDateTime(ultimoRegistro)}`:''}</div></div>
  <table><thead><tr><th>DATA / HORA</th><th>AÇÃO</th><th>CAMPO</th><th>VALOR ANTERIOR</th><th>NOVO VALOR</th><th>USUÁRIO</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Nenhum histórico registrado.</td></tr>'}</tbody></table>
  <div class="footer"><span>Histórico emitido pelo sistema da Secretaria.</span><b>SECRETARIA • HISTÓRICO DO MEMBRO</b><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
  <script>window.onload=()=>setTimeout(()=>window.print(),150)<\\/script></body></html>`);
  w.document.close();
 };

 return(
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden bg-card border-border text-foreground p-0">
    <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
     <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
       <DialogTitle className="flex items-center gap-2 text-xl">
        <History className="h-5 w-5 text-blue-400"/>
        Histórico do Membro
       </DialogTitle>
       <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <UserRound className="h-4 w-4"/>
        <span className="font-medium text-foreground">{membro?.nome_completo||'Membro'}</span>
       </div>
      </div>
      <div className="flex flex-wrap gap-2">
       <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
       </Button>
       <Button variant="outline" size="sm" onClick={excel} disabled={!historico.length}>
        <Download className="mr-2 h-4 w-4"/>Excel
       </Button>
       <Button variant="outline" size="sm" onClick={pdf} disabled={!historico.length}>
        <FileText className="mr-2 h-4 w-4"/>PDF
       </Button>
       <Button size="sm" onClick={imprimir} disabled={!historico.length} className="bg-indigo-600 hover:bg-indigo-700">
        <Printer className="mr-2 h-4 w-4"/>Imprimir
       </Button>
      </div>
     </div>
    </DialogHeader>

    <div className="flex-1 overflow-y-auto p-6 space-y-5">
     <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Registros</p><p className="mt-1 text-2xl font-bold text-blue-400">{historico.length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Alterações</p><p className="mt-1 text-2xl font-bold text-indigo-400">{totalAlteracoes}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cadastro</p><p className="mt-1 text-2xl font-bold text-green-400">{historico.filter(x=>x.acao==='CADASTRO').length}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Exclusões</p><p className="mt-1 text-2xl font-bold text-red-400">{historico.filter(x=>x.acao==='EXCLUSÃO').length}</p></CardContent></Card>
     </div>

     {loading?(
      <div className="flex items-center justify-center rounded-xl border border-border bg-background/40 py-20">
       <div className="h-9 w-9 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"/>
      </div>
     ):historico.length===0?(
      <Card><CardContent className="py-20 text-center"><History className="mx-auto h-12 w-12 text-muted-foreground"/><p className="mt-4 font-medium">Nenhum histórico registrado</p><p className="mt-1 text-sm text-muted-foreground">As próximas alterações feitas neste membro aparecerão aqui automaticamente.</p></CardContent></Card>
     ):(
      <div className="relative">
       <div className="absolute left-[20px] top-3 bottom-3 w-px bg-border"/>
       <div className="space-y-4">
        {historico.map((h,i)=>{
         const t=tipo(h.acao),Icon=t.icon;
         return(
          <div key={h.id||i} className="relative pl-12">
           <div className="absolute left-0 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm">
            <Icon className={`h-4 w-4 ${h.acao==='CADASTRO'?'text-green-400':h.acao==='EXCLUSÃO'?'text-red-400':'text-blue-400'}`}/>
           </div>
           <Card className="overflow-hidden">
            <CardContent className="p-4">
             <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
               <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={t.className}>{t.label}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5"/>{formatDateTime(h.alterado_em)}</span>
               </div>
               <p className="text-sm font-semibold">{h.campo_label||h.campo||'Alteração no cadastro'}</p>
              </div>
              {h.alterado_por&&<span className="text-[10px] text-muted-foreground">Usuário: {String(h.alterado_por).slice(0,12)}…</span>}
             </div>

             {h.acao==='ALTERAÇÃO'?(
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
               <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-400">Valor anterior</p>
                <p className="break-words text-sm">{h.valor_anterior_texto||safeText(h.valor_anterior)}</p>
               </div>
               <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block"/>
               <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-green-400">Novo valor</p>
                <p className="break-words text-sm font-medium">{h.valor_novo_texto||safeText(h.valor_novo)}</p>
               </div>
              </div>
             ):(
              <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
               <p className="text-sm">{h.valor_novo_texto||h.valor_anterior_texto||'Registro realizado no cadastro.'}</p>
              </div>
             )}
            </CardContent>
           </Card>
          </div>
         );
        })}
       </div>
      </div>
     )}
    </div>
   </DialogContent>
  </Dialog>
 );
};

export default ConsultaHistoricoMembro;
