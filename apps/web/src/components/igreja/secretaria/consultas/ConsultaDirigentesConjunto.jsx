import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,Crown,Search,Filter,Download,FileText,Printer,ChevronDown,ChevronUp,User,Shield,AlertTriangle,X}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardHeader,CardTitle,CardContent,CardFooter}from'@/components/ui/card';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{exportToExcel}from'@/lib/ExportUtils';
import{Helmet}from'react-helmet';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const BLUE=[30,58,138],LINE=[203,213,225],TEXT=[30,41,59],MUTED=[100,116,139];

const initials=name=>{
 if(!name)return'D';
 const p=name.trim().split(/\s+/);
 return p.length===1?p[0].slice(0,2).toUpperCase():`${p[0][0]}${p.at(-1)[0]}`.toUpperCase();
};

const functions=(m,list)=>{
 const ids=m?.funcoes_multiplas?.funcoes_ids;
 if(Array.isArray(ids)&&ids.length){
  const names=ids.map(id=>list.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);
  if(names.length)return names.join(', ');
 }
 return m?.funcoes_exercidas||m?.igreja_funcoes?.nome_funcao||'-';
};

const img64=url=>new Promise(resolve=>{
 const i=new Image();i.crossOrigin='Anonymous';i.src=url;
 i.onload=()=>{
  const c=document.createElement('canvas');c.width=i.width;c.height=i.height;
  c.getContext('2d').drawImage(i,0,0);
  resolve({data:c.toDataURL('image/png'),width:i.width,height:i.height});
 };
 i.onerror=()=>resolve(null);
});

const Skeleton=()=>(
 <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 motion-safe:animate-pulse">
  <div className="h-5 w-40 rounded bg-muted"/><div className="h-16 rounded-lg bg-muted"/><div className="h-16 rounded-lg bg-muted"/>
 </div>
);

const ConsultaDirigentesConjunto=()=>{
 const{toast}=useToast();
 const[conjuntos,setConjuntos]=useState([]),[all,setAll]=useState([]),[funcoesList,setFuncoesList]=useState([]);
 const[loading,setLoading]=useState(true),[status,setStatus]=useState('ATIVO'),[conjunto,setConjunto]=useState('todos'),[search,setSearch]=useState('');
 const[showFilters,setShowFilters]=useState(true),[selected,setSelected]=useState(null);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_membros').select(`
     *,
     conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
     dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
     cargo:cargos_igreja(nome_cargo),
     igreja_classes(nome_classe),
     igreja_funcoes(nome_funcao)
    `).eq('is_dirigente',true).order('nome_completo',{ascending:true}),
    supabase.from('igreja_funcoes').select('*').order('nome_funcao',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   setConjuntos(a.data||[]);setAll(b.data||[]);setFuncoesList(c.data||[]);
  }catch(e){
   toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{
  const term=search.trim().toLowerCase();
  return all.filter(d=>{
   const okStatus=status==='todos'||(d.status||'ATIVO')===status;
   const okConj=conjunto==='todos'||String(d.dirige_conjunto_id)===conjunto;
   const name=(d.nome_completo||'').toLowerCase();
   const conj=(d.dirige_conjunto?.nome_conjunto||'').toLowerCase();
   const okSearch=!term||name.includes(term)||conj.includes(term);
   return okStatus&&okConj&&okSearch;
  });
 },[all,status,conjunto,search]);

 const grouped=useMemo(()=>conjuntos.map(c=>({
  ...c,
  dirigentes:filtered.filter(d=>String(d.dirige_conjunto_id)===String(c.id))
 })).filter(c=>c.dirigentes.length),[conjuntos,filtered]);

 const active=filtered.filter(d=>(d.status||'ATIVO')==='ATIVO').length;
 const inactive=filtered.filter(d=>(d.status||'ATIVO')==='INATIVO').length;

 const exportExcel=()=>{
  const rows=grouped.flatMap(c=>c.dirigentes.map(d=>({
   Conjunto:c.nome_conjunto,
   Dirigente:d.nome_completo,
   'Função/Cargo':d.cargo?.nome_cargo||functions(d,funcoesList),
   Status:d.status||'ATIVO'
  })));
  if(!rows.length){
   toast({title:'Sem dados',description:'Não há dirigentes para exportar.',variant:'destructive'});
   return;
  }
  exportToExcel(rows,'Dirigentes_por_Conjunto','Dirigentes');
 };

 const pdf=async()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há dirigentes para gerar PDF.',variant:'destructive'});
   return;
  }

  const doc=new jsPDF('p','mm','a4');
  const logo=await img64(LOGO);

  if(logo){
   const w=18,h=w*(logo.height/logo.width);
   doc.addImage(logo.data,'PNG',10,8,w,h);
  }

  doc.setFont('helvetica','bold');
  doc.setTextColor(...BLUE);
  doc.setFontSize(12);
  doc.text('IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR',105,14,{align:'center'});

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('LEROLÂNDIA',105,20,{align:'center'});

  doc.setFillColor(...BLUE);
  doc.roundedRect(10,27,190,9,2,2,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(8);
  doc.text('RELATÓRIO DE DIRIGENTES POR CONJUNTO',105,33,{align:'center'});

  doc.setTextColor(...TEXT);
  doc.setFont('helvetica','normal');
  doc.setFontSize(6.5);
  doc.text(`Status: ${status==='todos'?'Todos':status}`,10,42);
  doc.text(`Total: ${filtered.length}`,200,42,{align:'right'});

  let y=48;

  if(search.trim()){
   doc.text(`Busca: ${search.trim()}`,105,42,{align:'center'});
  }

  grouped.forEach(c=>{
   if(y>250){
    doc.addPage();
    y=18;
   }

   doc.setFillColor(239,246,255);
   doc.roundedRect(10,y,190,8,2,2,'F');
   doc.setFont('helvetica','bold');
   doc.setFontSize(8.5);
   doc.setTextColor(...BLUE);
   doc.text(c.nome_conjunto,14,y+5.5);
   doc.text(`${c.dirigentes.length} ${c.dirigentes.length===1?'dirigente':'dirigentes'}`,196,y+5.5,{align:'right'});
   y+=10;

   autoTable(doc,{
    head:[['DIRIGENTE','FUNÇÃO/CARGO','STATUS']],
    body:c.dirigentes.map(d=>[
     d.nome_completo||'-',
     d.cargo?.nome_cargo||functions(d,funcoesList),
     d.status||'ATIVO'
    ]),
    startY:y,
    theme:'grid',
    styles:{font:'helvetica',fontSize:7.5,cellPadding:2.5,textColor:TEXT,lineColor:LINE,lineWidth:.2},
    headStyles:{fillColor:[37,99,235],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{0:{cellWidth:75},1:{cellWidth:85},2:{cellWidth:30,halign:'center'}},
    margin:{left:10,right:10,top:15,bottom:18}
   });

   y=doc.lastAutoTable.finalY+7;
  });

  if(y>260){doc.addPage();y=18}

  doc.setFillColor(239,246,255);
  doc.roundedRect(10,y,190,20,3,3,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE);
  doc.text('RESUMO',15,y+6);
  doc.setFont('helvetica','normal');
  doc.setTextColor(...TEXT);
  doc.text(`Conjuntos com dirigentes: ${grouped.length}`,15,y+13);
  doc.text(`Ativos: ${active}`,85,y+13);
  doc.text(`Inativos: ${inactive}`,135,y+13);
  doc.text(`Total: ${filtered.length}`,196,y+13,{align:'right'});

  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('Relatório emitido eletronicamente pelo sistema da Secretaria.',10,288);
  doc.text('SECRETARIA • DIRIGENTES POR CONJUNTO',105,288,{align:'center'});
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`,200,288,{align:'right'});

  doc.save('Dirigentes_por_Conjunto.pdf');
  toast({title:'PDF Gerado',description:'Relatório de dirigentes criado com sucesso.'});
 };

 const imprimir=()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há dirigentes para imprimir.',variant:'destructive'});
   return;
  }

  const rows=grouped.map(c=>`
   <div class="group">
    <div class="gt"><span>${c.nome_conjunto}</span><span>${c.dirigentes.length} ${c.dirigentes.length===1?'dirigente':'dirigentes'}</span></div>
    <table><thead><tr><th>DIRIGENTE</th><th>FUNÇÃO/CARGO</th><th>STATUS</th></tr></thead><tbody>
     ${c.dirigentes.map(d=>`<tr><td>${d.nome_completo||'-'}</td><td>${d.cargo?.nome_cargo||functions(d,funcoesList)}</td><td class="center">${d.status||'ATIVO'}</td></tr>`).join('')}
    </tbody></table>
   </div>`).join('');

  const w=window.open('','_blank','width=900,height=1100');

  if(!w){
   toast({title:'Impressão bloqueada',description:'Permita pop-ups para imprimir.',variant:'destructive'});
   return;
  }

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dirigentes por Conjunto</title><style>
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
<div class="header"><img src="${LOGO}" class="logo"><div class="inst">IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</div><div class="city">LEROLÂNDIA</div><div class="title">RELATÓRIO DE DIRIGENTES POR CONJUNTO</div><div class="meta">Status: ${status==='todos'?'Todos':status}${search.trim()?` • Busca: ${search.trim()}`:''} • ${filtered.length} registro(s)</div></div>
${rows}
<div class="summary"><span>Conjuntos: ${grouped.length}</span><span>Ativos: ${active}</span><span>Inativos: ${inactive}</span><span>Total: ${filtered.length}</span></div>
<div class="footer"><span>Relatório emitido pelo sistema da Secretaria.</span><span>SECRETARIA • DIRIGENTES POR CONJUNTO</span><span>Data: ${new Date().toLocaleDateString('pt-BR')}</span></div>
<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script>
</body></html>`);
  w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col">
  <Helmet><title>Dirigentes por Conjunto | Secretaria</title></Helmet>

  <div className="flex-1 space-y-5">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
      <Crown className="h-6 w-6 text-blue-500"/>
     </div>
     <div>
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 md:text-3xl">Dirigentes por Conjunto</h2>
      <p className="text-sm text-muted-foreground">Consulte os dirigentes responsáveis por cada conjunto.</p>
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
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar dirigente ou conjunto..." className="pl-9"/>
       </div>

       <Select value={status} onValueChange={setStatus}>
        <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
        <SelectContent className="dark-igreja">
         <SelectItem value="todos">Todos os Status</SelectItem>
         <SelectItem value="ATIVO">Ativos</SelectItem>
         <SelectItem value="INATIVO">Inativos</SelectItem>
        </SelectContent>
       </Select>

       <Select value={conjunto} onValueChange={setConjunto}>
        <SelectTrigger><SelectValue placeholder="Conjunto"/></SelectTrigger>
        <SelectContent className="dark-igreja max-h-[280px]">
         <SelectItem value="todos">Todos os Conjuntos</SelectItem>
         {conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}
        </SelectContent>
       </Select>
      </CardContent>
     </Card>
    </motion.div>}
   </AnimatePresence>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Dirigentes</p><p className="mt-1 text-2xl font-bold">{filtered.length}</p></CardContent></Card>
    <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Conjuntos</p><p className="mt-1 text-2xl font-bold">{grouped.length}</p></CardContent></Card>
    <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold text-green-500">{active}</p></CardContent></Card>
    <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Inativos</p><p className="mt-1 text-2xl font-bold text-red-500">{inactive}</p></CardContent></Card>
   </div>

   {loading?
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{Array(6).fill(0).map((_,i)=><Skeleton key={i}/>)}</div>
   :
    !grouped.length?
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
     <Crown className="mb-4 h-12 w-12 text-muted-foreground/50"/>
     <h3 className="text-lg font-bold">Nenhum dirigente encontrado</h3>
     <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para visualizar os dirigentes.</p>
    </div>
   :
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
     {grouped.map(c=><motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
      <Card className="overflow-hidden border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-primary">
       <CardHeader className="border-b border-border bg-muted/20 pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
         <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary"/></div>
          <span className="truncate text-base font-bold">{c.nome_conjunto}</span>
         </div>
         <Badge variant="outline" className="border-primary/30 text-primary">{c.dirigentes.length}</Badge>
        </CardTitle>
       </CardHeader>

       <CardContent className="space-y-3 p-3">
        {c.dirigentes.map(d=>{
         const inactive=(d.status||'ATIVO')==='INATIVO';
         return <motion.div key={d.id} whileHover={{scale:1.005}} onClick={()=>setSelected({...d,_conjunto:c})} className={`cursor-pointer rounded-xl border p-3 transition-colors ${inactive?'border-red-500/30 bg-red-500/5':'border-border bg-background/40 hover:border-primary/40 hover:bg-primary/5'}`}>
          <div className="flex items-start gap-3">
           <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${inactive?'border-red-500/30 bg-red-500/10 text-red-500':'border-primary/20 bg-primary/10 text-primary'}`}>{initials(d.nome_completo)}</div>
           <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
             <div className="min-w-0">
              <p className={`truncate text-sm font-bold ${inactive?'text-red-500':'text-foreground'}`}>{d.nome_completo}</p>
              <div className="mt-1 flex flex-wrap gap-1">
               {d.cargo?.nome_cargo&&<Badge variant="outline" className="border-primary/30 text-[10px] text-primary"><Shield className="mr-1 h-3 w-3"/>{d.cargo.nome_cargo}</Badge>}
               {inactive&&<Badge variant="outline" className="border-red-500/30 text-[10px] text-red-500"><AlertTriangle className="mr-1 h-3 w-3"/>INATIVO</Badge>}
              </div>
             </div>
             <Crown className="h-4 w-4 shrink-0 text-primary"/>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{functions(d,funcoesList)}</p>
           </div>
          </div>
         </motion.div>;
        })}
       </CardContent>

       <CardFooter className="border-t border-border bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground">
        Clique no dirigente para visualizar a ficha.
       </CardFooter>
      </Card>
     </motion.div>)}
    </div>
   }
  </div>

  <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}}>
   <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">
    {selected&&
     <div className="max-h-[90vh] overflow-y-auto">
      <DialogHeader className="border-b border-border px-6 py-5">
       <DialogTitle className="flex items-center gap-3 text-xl text-primary">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10"><User className="h-5 w-5"/></div>
        Ficha do Dirigente
       </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 p-5 md:p-6">
       <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-secondary text-2xl font-bold text-primary">{initials(selected.nome_completo)}</div>
        <h2 className="text-2xl font-bold">{selected.nome_completo}</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
         <Badge variant="outline" className={selected.status==='INATIVO'?'border-red-500/30 text-red-500':'border-emerald-500/30 text-emerald-500'}>{selected.status||'ATIVO'}</Badge>
         {selected.cargo?.nome_cargo&&<Badge variant="outline" className="border-primary/30 text-primary"><Shield className="mr-1 h-3 w-3"/>{selected.cargo.nome_cargo}</Badge>}
        </div>
       </div>

       <div>
        <h3 className="mb-3 border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-primary">Dados do Dirigente</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
         {[
          ['Nome Completo',selected.nome_completo],
          ['Conjunto que Dirige',selected._conjunto?.nome_conjunto||selected.dirige_conjunto?.nome_conjunto||'-'],
          ['Cargo',selected.cargo?.nome_cargo||'-'],
          ['Função/Funções',functions(selected,funcoesList)],
          ['Classe da EBD',selected.igreja_classes?.nome_classe||'-'],
          ['É Dirigente','Sim'],
          ['Status',selected.status||'ATIVO']
         ].map(([label,value])=>
          <div key={label} className="rounded-lg border border-border bg-background/40 p-3">
           <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
           <span className="mt-1 block font-semibold">{value}</span>
          </div>
         )}
        </div>
       </div>
      </div>

      <DialogFooter className="border-t border-border bg-muted/10 px-5 py-4">
       <Button variant="outline" onClick={()=>setSelected(null)}><X className="mr-2 h-4 w-4"/>Fechar</Button>
      </DialogFooter>
     </div>
    }
   </DialogContent>
  </Dialog>
 </div>
};

export default ConsultaDirigentesConjunto;
