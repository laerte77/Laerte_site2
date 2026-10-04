import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Clock,Download,FileText,History,Printer,RefreshCw,User,ArrowRight,PlusCircle,Trash2,Edit3}from'lucide-react';
import{Card,CardContent}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle}from'@/components/ui/dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const GOLD='hsl(var(--neon-igreja))';
const dt=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'-';
const safe=v=>v==null||v===''?'Não informado':typeof v==='object'?JSON.stringify(v):String(v);

export default function ConsultaHistoricoMembro({membro,open,onOpenChange}){
 const{toast}=useToast(),[historico,setHistorico]=useState([]),[loading,setLoading]=useState(false);
 const carregar=useCallback(async()=>{
  if(!membro?.id)return;
  setLoading(true);
  try{const{data,error}=await supabase.from('igreja_membros_historico').select('*').eq('membro_id',membro.id).order('alterado_em',{ascending:false});if(error)throw error;setHistorico(data||[])}catch(e){toast({title:'Erro ao carregar histórico',description:e.message,variant:'destructive'})}finally{setLoading(false)}
 },[membro?.id,toast]);
 useEffect(()=>{if(open)carregar()},[open,carregar]);

 const alteracoes=useMemo(()=>historico.filter(x=>x.acao==='ALTERAÇÃO').length,[historico]);

 const excel=()=>{const ws=XLSX.utils.json_to_sheet(historico.map(h=>({'Data/Hora':dt(h.alterado_em),'Ação':h.acao||'ALTERAÇÃO','Campo':h.campo_label||h.campo||'-','Valor anterior':h.valor_anterior_texto||safe(h.valor_anterior),'Novo valor':h.valor_novo_texto||safe(h.valor_novo),'Usuário':h.alterado_por||'-'})));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Histórico');XLSX.writeFile(wb,`Historico_${(membro?.nome_completo||'Membro').replace(/\s+/g,'_')}.xlsx`)};

 const pdf=()=>{try{const d=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});d.setFillColor(15,23,42);d.rect(0,0,210,28,'F');d.setTextColor(255,255,255);d.setFont('helvetica','bold');d.setFontSize(12);d.text('IGREJA ASSEMBLEIA DE DEUS',105,10,{align:'center'});d.setFontSize(8);d.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',105,16,{align:'center'});d.setFillColor(234,179,8);d.roundedRect(60,20,90,6,2,2,'F');d.setTextColor(15,23,42);d.setFontSize(7);d.text('HISTÓRICO DO MEMBRO',105,24.2,{align:'center'});d.setTextColor(30,41,59);d.setFontSize(10);d.text(membro?.nome_completo||'Membro',10,37);autoTable(d,{head:[['DATA/HORA','AÇÃO','CAMPO','ANTERIOR','NOVO VALOR','USUÁRIO']],body:historico.map(h=>[dt(h.alterado_em),h.acao||'ALTERAÇÃO',h.campo_label||h.campo||'-',h.valor_anterior_texto||safe(h.valor_anterior),h.valor_novo_texto||safe(h.valor_novo),h.alterado_por||'-']),startY:42,theme:'grid',styles:{fontSize:6,cellPadding:2},headStyles:{fillColor:[37,99,235]}});d.save(`Historico_${(membro?.nome_completo||'Membro').replace(/\s+/g,'_')}.pdf`);toast({title:'PDF gerado',description:'Histórico exportado.'})}catch(e){toast({title:'Erro ao gerar PDF',description:e.message,variant:'destructive'})}};

 const imprimir=()=>{const w=window.open('','_blank');if(!w)return toast({title:'Impressão bloqueada',description:'Permita pop-ups.',variant:'destructive'});w.document.write(`<html><head><title>Histórico do Membro</title><style>body{font-family:Arial;margin:20px}h1{text-align:center}h2{background:#eab308;padding:7px;text-align:center}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#2563eb;color:#fff}th,td{border:1px solid #ccc;padding:5px}</style></head><body><h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1><h2>HISTÓRICO DO MEMBRO</h2><h3>${membro?.nome_completo||'Membro'}</h3><table><tr><th>DATA/HORA</th><th>AÇÃO</th><th>CAMPO</th><th>ANTERIOR</th><th>NOVO</th><th>USUÁRIO</th></tr>${historico.map(h=>`<tr><td>${dt(h.alterado_em)}</td><td>${h.acao||'ALTERAÇÃO'}</td><td>${h.campo_label||h.campo||'-'}</td><td>${safe(h.valor_anterior)}</td><td>${safe(h.valor_novo)}</td><td>${h.alterado_por||'-'}</td></tr>`).join('')}</table><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);w.document.close()};

 const tipo=a=>a==='CADASTRO'?['Cadastro',PlusCircle,'green']:a==='EXCLUSÃO'?['Exclusão',Trash2,'red']:['Alteração',Edit3,'blue'];

 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden"><DialogHeader className="border-b border-border pb-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><DialogTitle className="text-xl" style={{color:GOLD}}><History className="mr-2 inline h-5 w-5"/>Histórico do Membro</DialogTitle><div className="mt-2 text-sm text-muted-foreground"><User className="mr-1 inline h-4 w-4"/>{membro?.nome_completo||'Membro'}</div></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button><Button variant="outline" size="sm" onClick={excel} disabled={!historico.length}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={pdf} disabled={!historico.length}><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={imprimir} disabled={!historico.length} style={{background:GOLD,color:'#111827'}}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div></div></DialogHeader>
 <div className="overflow-y-auto p-5 space-y-5"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Registros',historico.length,GOLD],['Alterações',alteracoes,GOLD],['Cadastro',historico.filter(x=>x.acao==='CADASTRO').length,'#22c55e'],['Exclusões',historico.filter(x=>x.acao==='EXCLUSÃO').length,'#ef4444']].map(([a,b,c])=><Card key={a}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{a}</p><p className="mt-1 text-2xl font-bold" style={{color:c}}>{b}</p></CardContent></Card>)}</div>
 {loading?<div className="py-20 text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{color:GOLD}}/></div>:!historico.length?<Card><CardContent className="py-20 text-center"><History className="mx-auto h-12 w-12 text-muted-foreground"/><p className="mt-3">Nenhum histórico registrado</p></CardContent></Card>:<div className="space-y-4">{historico.map((h,i)=>{const[t,I,c]=tipo(h.acao);return <Card key={h.id||i}><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><I className={`h-4 w-4 text-${c}-400`}/><Badge variant="outline">{t}</Badge><span className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3"/>{dt(h.alterado_em)}</span></div><span className="text-[10px] text-muted-foreground">{h.alterado_por||''}</span></div><p className="mt-3 font-semibold">{h.campo_label||h.campo||'Alteração no cadastro'}</p>{h.acao==='ALTERAÇÃO'?<div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr]"><div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><small className="text-red-400">VALOR ANTERIOR</small><p>{h.valor_anterior_texto||safe(h.valor_anterior)}</p></div><ArrowRight className="hidden self-center md:block"/><div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"><small className="text-green-400">NOVO VALOR</small><p>{h.valor_novo_texto||safe(h.valor_novo)}</p></div></div>:<div className="mt-3 rounded-lg border p-3">{h.valor_novo_texto||h.valor_anterior_texto||'Registro realizado.'}</div>}</CardContent></Card>})}</div>}</div>
 </DialogContent></Dialog>
}
