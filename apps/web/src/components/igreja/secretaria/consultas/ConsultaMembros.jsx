import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion,AnimatePresence}from'framer-motion';
import{Users,User,Search,Filter,Printer,ChevronDown,ChevronUp,Download,FileText,Droplets,Flame,Calendar,Heart,Shield,X,CheckCircle2,UserMinus,Layers}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle,CardFooter}from'@/components/ui/card';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{Badge}from'@/components/ui/badge';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/20edc9a8be1c027e0ddf5f8071ef876e.png';
const GOLD='hsl(var(--neon-igreja))';
const fmt=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'-';
const ini=n=>{if(!n)return'M';const p=String(n).trim().split(/\s+/);return(p.length===1?p[0].slice(0,2):`${p[0][0]}${p.at(-1)[0]}`).toUpperCase()};
const funcs=(m,l)=>{const ids=m?.funcoes_multiplas?.funcoes_ids;if(Array.isArray(ids)&&ids.length){const n=ids.map(id=>l.find(f=>String(f.id)===String(id))?.nome_funcao).filter(Boolean);if(n.length)return n.join(', ')}return m?.funcoes_exercidas||m?.igreja_funcoes?.nome_funcao||'-'};
const dirIds=m=>{const x=m?.dirige_conjuntos_multiplos;if(Array.isArray(x?.conjuntos_ids)&&x.conjuntos_ids.length)return x.conjuntos_ids;if(Array.isArray(x)&&x.length)return x;if(m?.dirige_conjunto_id)return[m.dirige_conjunto_id];return[]};
const dirNames=(m,c)=>dirIds(m).map(id=>c.find(x=>String(x.id)===String(id))?.nome_conjunto).filter(Boolean);
const esc=v=>String(v??'-').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default function ConsultaMembros(){
 const{user}=useAuth(),{toast}=useToast();
 const[membros,setMembros]=useState([]),[funcoes,setFuncoes]=useState([]),[conjuntos,setConjuntos]=useState([]);
 const[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[status,setStatus]=useState('ATIVO'),[conjunto,setConjunto]=useState('todos'),[civil,setCivil]=useState('todos'),[filtros,setFiltros]=useState(true),[selected,setSelected]=useState(null);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('igreja_membros').select(`*,igreja_funcoes(nome_funcao),conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),igreja_classes(nome_classe),cargo:cargos_igreja(nome_cargo)`).order('nome_completo',{ascending:true}),
    supabase.from('igreja_funcoes').select('*').order('nome_funcao',{ascending:true}),
    supabase.from('igreja_conjuntos').select('*').order('nome_conjunto',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   setMembros(a.data||[]);setFuncoes(b.data||[]);setConjuntos(c.data||[]);
  }catch(e){toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})}finally{setLoading(false)}
 },[user,toast]);
 useEffect(()=>{load()},[load]);

 const filtered=useMemo(()=>{const t=search.trim().toLowerCase();return membros.filter(m=>{
  const ids=dirIds(m),names=dirNames(m,conjuntos);
  return(status==='todos'||(m.status||'ATIVO')===status)&&(conjunto==='todos'||String(m.conjunto_id)===String(conjunto)||ids.some(id=>String(id)===String(conjunto)))&&(civil==='todos'||m.estado_civil===civil)&&(!t||`${m.nome_completo||''} ${m.cargo?.nome_cargo||''} ${funcs(m,funcoes)} ${names.join(' ')}`.toLowerCase().includes(t))
 })},[membros,status,conjunto,civil,search,funcoes,conjuntos]);

 const ativos=filtered.filter(m=>(m.status||'ATIVO')==='ATIVO').length,inativos=filtered.length-ativos,comConjunto=filtered.filter(m=>m.conjunto_id).length,batizados=filtered.filter(m=>m.is_batizado_aguas).length;

 const excel=()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para exportar.',variant:'destructive'});
  const ws=XLSX.utils.json_to_sheet(filtered.map(m=>({Nome:m.nome_completo||'',Nascimento:fmt(m.data_nascimento),Admissão:fmt(m.data_entrada),Cargo:m.cargo?.nome_cargo||'-',Função:funcs(m,funcoes),Conjunto:m.conjunto?.nome_conjunto||'-','Conjuntos que Dirige':dirNames(m,conjuntos).join(', ')||'-','Estado Civil':m.estado_civil||'-','Batismo nas Águas':m.is_batizado_aguas?'SIM':'NÃO','Batismo Espírito Santo':m.is_batizado_espirito?'SIM':'NÃO',Status:m.status||'ATIVO'})));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Membros');XLSX.writeFile(wb,'Listagem_Geral_Membros.xlsx');
 };

 const pdf=()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para gerar o PDF.',variant:'destructive'});
  const d=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  d.setFillColor(15,23,42);d.rect(0,0,297,28,'F');d.setTextColor(255,255,255);d.setFontSize(13);d.setFont('helvetica','bold');d.text('IGREJA ASSEMBLEIA DE DEUS',148,10,{align:'center'});d.setFontSize(8);d.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',148,16,{align:'center'});d.setFillColor(234,179,8);d.roundedRect(105,20,86,6,2,2,'F');d.setTextColor(15,23,42);d.setFontSize(7);d.text('LISTAGEM GERAL DE MEMBROS',148,24.3,{align:'center'});
  autoTable(d,{head:[['NOME','NASC.','ADM.','CARGO','FUNÇÃO','CONJUNTO','DIRIGE','EST.CIVIL','ÁGUAS','E.S.','STATUS']],body:filtered.map(m=>[m.nome_completo||'-',fmt(m.data_nascimento),fmt(m.data_entrada),m.cargo?.nome_cargo||'-',funcs(m,funcoes),m.conjunto?.nome_conjunto||'-',dirNames(m,conjuntos).join(', ')||'-',m.estado_civil||'-',m.is_batizado_aguas?'SIM':'NÃO',m.is_batizado_espirito?'SIM':'NÃO',m.status||'ATIVO']),startY:35,theme:'grid',styles:{fontSize:5.5,cellPadding:1.5},headStyles:{fillColor:[37,99,235],fontSize:5.5},margin:{left:6,right:6}});
  d.save('Listagem_Geral_Membros.pdf');
 };

 const imprimir=()=>{
  if(!filtered.length)return toast({title:'Sem dados',description:'Não há membros para imprimir.',variant:'destructive'});
  const w=window.open('','_blank');if(!w)return toast({title:'Impressão bloqueada',description:'Permita pop-ups.',variant:'destructive'});
  w.document.write(`<html><head><title>Listagem de Membros</title><style>body{font-family:Arial;margin:20px}h1{text-align:center;color:#1e293b}h2{background:#eab308;padding:7px;text-align:center}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#2563eb;color:#fff}th,td{border:1px solid #ccc;padding:5px}</style></head><body><h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1><h2>LISTAGEM GERAL DE MEMBROS</h2><table><tr><th>NOME</th><th>NASC.</th><th>CARGO</th><th>FUNÇÃO</th><th>CONJUNTO</th><th>STATUS</th></tr>${filtered.map(m=>`<tr><td>${esc(m.nome_completo)}</td><td>${fmt(m.data_nascimento)}</td><td>${esc(m.cargo?.nome_cargo||'-')}</td><td>${esc(funcs(m,funcoes))}</td><td>${esc(m.conjunto?.nome_conjunto||'-')}</td><td>${esc(m.status||'ATIVO')}</td></tr>`).join('')}</table><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);w.document.close();
 };

 return <div className="dark-igreja text-foreground h-full flex flex-col"><div className="flex-1 space-y-5">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]"><Users className="h-6 w-6" style={{color:GOLD}}/></div><div><h2 className="text-2xl font-bold md:text-3xl" style={{color:GOLD}}>Consulta de Membros</h2><p className="text-sm text-muted-foreground">Listagem geral e consulta dos membros cadastrados.</p></div></div>
  <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>setFiltros(v=>!v)} className="border-[hsl(var(--neon-igreja)/.40)]"><Filter className="mr-2 h-4 w-4" style={{color:GOLD}}/>{filtros?'Ocultar Filtros':'Filtros'}{filtros?<ChevronUp/>:<ChevronDown/>}</Button><Button variant="outline" size="sm" onClick={excel} className="border-[hsl(var(--neon-igreja)/.40)]"><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={pdf} className="border-[hsl(var(--neon-igreja)/.40)]"><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={imprimir} style={{background:GOLD,color:'#111827'}}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div></div>

  <AnimatePresence>{filtros&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><Card><CardHeader className="border-b border-border pb-3"><CardTitle><Filter className="mr-2 inline h-4 w-4" style={{color:GOLD}}/>Filtros</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar membro..." className="pl-9"/></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos</SelectItem><SelectItem value="ATIVO">Ativos</SelectItem><SelectItem value="INATIVO">Inativos</SelectItem></SelectContent></Select><Select value={conjunto} onValueChange={setConjunto}><SelectTrigger><SelectValue placeholder="Conjunto"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos os Conjuntos</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select><Select value={civil} onValueChange={setCivil}><SelectTrigger><SelectValue placeholder="Estado Civil"/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="todos">Todos</SelectItem><SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem><SelectItem value="Casado(a)">Casado(a)</SelectItem><SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem><SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem></SelectContent></Select></CardContent></Card></motion.div>}</AnimatePresence>

  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Membros',filtered.length,Users,GOLD],['Ativos',ativos,CheckCircle2,'#22c55e'],['Inativos',inativos,UserMinus,'#ef4444'],['Com Conjunto',comConjunto,Layers,GOLD],['Bat. Águas',batizados,Droplets,'#22d3ee']].map(([t,v,I,c])=><Card key={t}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase text-muted-foreground">{t}</p><p className="mt-1 text-2xl font-bold" style={{color:c}}>{v}</p></div><I className="h-5 w-5" style={{color:c}}/></div></CardContent></Card>)}</div>

  <Card className="overflow-hidden"><CardHeader className="border-b border-border"><CardTitle>Listagem Geral de Membros <Badge variant="secondary" className="ml-2">{filtered.length}</Badge></CardTitle></CardHeader><CardContent className="p-4"><ScrollArea className="h-[calc(100vh-430px)] min-h-[420px]"><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{loading?Array(6).fill(0).map((_,i)=><Card key={i} className="h-44 animate-pulse"/>):filtered.map(m=>{const inactive=(m.status||'ATIVO')==='INATIVO',dirs=dirNames(m,conjuntos);return <Card key={m.id} onClick={()=>setSelected(m)} className={`cursor-pointer transition-all hover:-translate-y-0.5 ${inactive?'border-red-500/30':'hover:border-[hsl(var(--neon-igreja)/.50)]'}`}><CardHeader className="flex flex-row items-start gap-3 pb-3"><div className={`flex h-12 w-12 items-center justify-center rounded-full border font-bold ${inactive?'border-red-500/30 bg-red-500/10 text-red-400':'border-[hsl(var(--neon-igreja)/.30)] bg-[hsl(var(--neon-igreja)/.10)]'}`} style={!inactive?{color:GOLD}:undefined}>{ini(m.nome_completo)}</div><div className="min-w-0"><CardTitle className="truncate text-base">{m.nome_completo}</CardTitle><div className="mt-1 flex gap-1">{m.cargo?.nome_cargo&&<Badge variant="outline" style={{color:GOLD,borderColor:'hsl(var(--neon-igreja)/.30)'}}>{m.cargo.nome_cargo}</Badge>}<Badge variant="outline">{m.status||'ATIVO'}</Badge></div></div></CardHeader><CardContent className="space-y-3 pt-0"><div className="grid grid-cols-2 gap-3"><div><span className="text-[9px] text-muted-foreground"><Calendar className="mr-1 inline h-3 w-3" style={{color:GOLD}}/>Nascimento</span><p className="text-xs font-semibold">{fmt(m.data_nascimento)}</p></div><div><span className="text-[9px] text-muted-foreground"><Heart className="mr-1 inline h-3 w-3 text-pink-400"/>Estado Civil</span><p className="text-xs capitalize">{m.estado_civil?.toLowerCase()||'-'}</p></div></div><div><span className="text-[9px] text-muted-foreground"><Layers className="mr-1 inline h-3 w-3" style={{color:GOLD}}/>Conjunto</span><p className="text-xs font-semibold">{m.conjunto?.nome_conjunto||'Sem conjunto'}</p></div><div><span className="text-[9px] text-muted-foreground"><User className="mr-1 inline h-3 w-3" style={{color:GOLD}}/>Função</span><p className="text-xs text-muted-foreground">{funcs(m,funcoes)}</p></div>{dirs.length>0&&<div><span className="text-[9px] text-muted-foreground"><Shield className="mr-1 inline h-3 w-3" style={{color:GOLD}}/>Dirige</span><p className="text-xs font-semibold" style={{color:GOLD}}>{dirs.join(', ')}</p></div>}</CardContent><CardFooter className="border-t border-border p-3"><div className="flex w-full gap-2"><span className={`flex-1 rounded-md border py-1 text-center text-[10px] ${m.is_batizado_aguas?'border-cyan-500/30 text-cyan-400':'border-border text-muted-foreground'}`}><Droplets className="mr-1 inline h-3 w-3"/>Águas</span><span className={`flex-1 rounded-md border py-1 text-center text-[10px] ${m.is_batizado_espirito?'border-orange-500/30 text-orange-400':'border-border text-muted-foreground'}`}><Flame className="mr-1 inline h-3 w-3"/>Espírito</span></div></CardFooter></Card>})}</div></ScrollArea></CardContent></Card>
 </div>

 <Dialog open={!!selected} onOpenChange={v=>!v&&setSelected(null)}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle style={{color:GOLD}}><User className="mr-2 inline h-5 w-5"/>Ficha do Membro</DialogTitle></DialogHeader>{selected&&<div className="space-y-5 p-2"><div className="rounded-xl border p-5 text-center" style={{borderColor:'hsl(var(--neon-igreja)/.20)',background:'hsl(var(--neon-igreja)/.05)'}}><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 text-2xl font-bold" style={{borderColor:'hsl(var(--neon-igreja)/.30)',color:GOLD}}>{ini(selected.nome_completo)}</div><h2 className="text-2xl font-bold">{selected.nome_completo}</h2></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['Nome Completo',selected.nome_completo],['Nascimento',fmt(selected.data_nascimento)],['Estado Civil',selected.estado_civil||'-'],['Data de Entrada',fmt(selected.data_entrada)],['Cargo',selected.cargo?.nome_cargo||'-'],['Função/Funções',funcs(selected,funcoes)],['Conjunto',selected.conjunto?.nome_conjunto||'-'],['Classe da EBD',selected.igreja_classes?.nome_classe||'-'],['É Dirigente',selected.is_dirigente?'Sim':'Não'],['Conjuntos que Dirige',dirNames(selected,conjuntos).join(', ')||'-'],['Batizado nas Águas',selected.is_batizado_aguas?'Sim':'Não'],['Batizado no Espírito Santo',selected.is_batizado_espirito?'Sim':'Não'],['Status',selected.status||'ATIVO']].map(([a,b])=><div key={a} className="rounded-lg border border-border p-3"><span className="block text-[10px] uppercase text-muted-foreground">{a}</span><b className="mt-1 block">{b}</b></div>)}</div></div>}<DialogFooter><Button variant="outline" onClick={()=>setSelected(null)}><X className="mr-2 h-4 w-4"/>Fechar</Button></DialogFooter></DialogContent></Dialog>
 </div>
}
