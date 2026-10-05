import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Clock,Download,FileText,History,Printer,RefreshCw,User,ArrowRight,PlusCircle,Trash2,Edit3,Search,Filter}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{Input}from'@/components/ui/input';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Dialog,DialogContent,DialogHeader,DialogTitle}from'@/components/ui/dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const GOLD='hsl(var(--neon-igreja))';
const dt=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'}):'-';
const safe=v=>v==null||v===''?'Não informado':typeof v==='object'?JSON.stringify(v):String(v);
const tipo=a=>a==='CADASTRO'?['Cadastro',PlusCircle,'green']:a==='EXCLUSÃO'?['Exclusão',Trash2,'red']:['Alteração',Edit3,'blue'];

export default function ConsultaHistoricoMembro({membro,open,onOpenChange}){
 const pagina=!membro;
 const{toast}=useToast();
 const[historico,setHistorico]=useState([]),[loading,setLoading]=useState(false),[busca,setBusca]=useState(''),[acao,setAcao]=useState('TODOS');

 const carregar=useCallback(async()=>{
  setLoading(true);
  try{
   let q=supabase.from('igreja_membros_historico').select('*').order('alterado_em',{ascending:false});
   if(membro?.id)q=q.eq('membro_id',membro.id);
   const{data,error}=await q;
   if(error)throw error;
   setHistorico(data||[]);
  }catch(e){
   toast({title:'Erro ao carregar histórico',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[membro?.id,toast]);

 useEffect(()=>{if(pagina||open)carregar()},[pagina,open,carregar]);

 const filtrado=useMemo(()=>{
  const t=busca.trim().toLowerCase();
  return historico.filter(h=>{
   const okAcao=acao==='TODOS'||h.acao===acao;
   const txt=`${h.membro_nome||''} ${h.campo_label||''} ${h.campo||''} ${h.acao||''} ${h.valor_anterior_texto||''} ${h.valor_novo_texto||''}`.toLowerCase();
   return okAcao&&(!t||txt.includes(t));
  });
 },[historico,busca,acao]);

 const excel=()=>{
  if(!filtrado.length)return;
  const ws=XLSX.utils.json_to_sheet(filtrado.map(h=>({'Data/Hora':dt(h.alterado_em),'Membro':h.membro_nome||'-','Ação':h.acao||'-','Campo':h.campo_label||h.campo||'-','Valor anterior':h.valor_anterior_texto||safe(h.valor_anterior),'Novo valor':h.valor_novo_texto||safe(h.valor_novo),'Usuário':h.alterado_por||'-'})));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Histórico');XLSX.writeFile(wb,`Historico_Membros_${new Date().toISOString().slice(0,10)}.xlsx`);
 };

 const pdf=()=>{
  if(!filtrado.length)return;
  const d=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  d.setFillColor(15,23,42);d.rect(0,0,297,28,'F');d.setTextColor(255,255,255);d.setFont('helvetica','bold');d.setFontSize(12);d.text('IGREJA ASSEMBLEIA DE DEUS',148,10,{align:'center'});d.setFontSize(8);d.text('MINISTÉRIO PLANTAR • LEROLÂNDIA',148,16,{align:'center'});d.setFillColor(234,179,8);d.roundedRect(95,20,107,6,2,2,'F');d.setTextColor(15,23,42);d.setFontSize(7);d.text('HISTÓRICO DE MOVIMENTAÇÕES DOS MEMBROS',148,24.2,{align:'center'});
  autoTable(d,{head:[['DATA/HORA','MEMBRO','AÇÃO','CAMPO','ANTERIOR','NOVO VALOR']],body:filtrado.map(h=>[dt(h.alterado_em),h.membro_nome||'-',h.acao||'-',h.campo_label||h.campo||'-',h.valor_anterior_texto||safe(h.valor_anterior),h.valor_novo_texto||safe(h.valor_novo)]),startY:34,theme:'grid',styles:{fontSize:6,cellPadding:2},headStyles:{fillColor:[37,99,235]}});
  d.save(`Historico_Membros_${new Date().toISOString().slice(0,10)}.pdf`);
 };

 const imprimir=()=>{
  if(!filtrado.length)return;
  const w=window.open('','_blank');
  if(!w)return toast({title:'Impressão bloqueada',description:'Permita pop-ups.',variant:'destructive'});
  w.document.write(`<html><head><title>Histórico dos Membros</title><style>body{font-family:Arial;margin:20px}h1{text-align:center}h2{background:#eab308;padding:7px;text-align:center}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#2563eb;color:#fff}th,td{border:1px solid #ccc;padding:5px}</style></head><body><h1>IGREJA ASSEMBLEIA DE DEUS MINISTÉRIO PLANTAR</h1><h2>HISTÓRICO DE MOVIMENTAÇÕES DOS MEMBROS</h2><table><tr><th>DATA/HORA</th><th>MEMBRO</th><th>AÇÃO</th><th>CAMPO</th><th>ANTERIOR</th><th>NOVO</th></tr>${filtrado.map(h=>`<tr><td>${dt(h.alterado_em)}</td><td>${h.membro_nome||'-'}</td><td>${h.acao||'-'}</td><td>${h.campo_label||h.campo||'-'}</td><td>${h.valor_anterior_texto||safe(h.valor_anterior)}</td><td>${h.valor_novo_texto||safe(h.valor_novo)}</td></tr>`).join('')}</table><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
  w.document.close();
 };

 const conteudo=<>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
   {[['Registros',historico.length,GOLD],['Alterações',historico.filter(x=>x.acao==='ALTERAÇÃO').length,GOLD],['Cadastros',historico.filter(x=>x.acao==='CADASTRO').length,'#22c55e'],['Exclusões',historico.filter(x=>x.acao==='EXCLUSÃO').length,'#ef4444']].map(([a,b,c])=><Card key={a}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{a}</p><p className="mt-1 text-2xl font-bold" style={{color:c}}>{b}</p></CardContent></Card>)}
  </div>

  {loading?<div className="py-20 text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin" style={{color:GOLD}}/><p className="mt-3 text-sm text-muted-foreground">Carregando movimentações...</p></div>:!filtrado.length?<Card><CardContent className="py-20 text-center"><History className="mx-auto h-12 w-12 text-muted-foreground"/><p className="mt-3 font-semibold">Nenhuma movimentação encontrada</p><p className="mt-1 text-sm text-muted-foreground">{historico.length?'Ajuste os filtros.':'Ainda não existem registros de histórico.'}</p></CardContent></Card>:<div className="space-y-3">{filtrado.map((h,i)=>{const[t,I,c]=tipo(h.acao);return <Card key={h.id||i}><CardContent className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap items-center gap-2"><I className={`h-4 w-4 text-${c}-400`}/><Badge variant="outline">{t}</Badge><b>{h.membro_nome||membro?.nome_completo||'-'}</b><span className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3"/>{dt(h.alterado_em)}</span></div><span className="text-[10px] text-muted-foreground">{h.alterado_por||''}</span></div><p className="mt-3 font-semibold">{h.campo_label||h.campo||'Alteração'}</p>{h.acao==='ALTERAÇÃO'?<div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr]"><div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"><small className="text-red-400">VALOR ANTERIOR</small><p className="mt-1 break-words">{h.valor_anterior_texto||safe(h.valor_anterior)}</p></div><ArrowRight className="hidden self-center md:block"/><div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"><small className="text-green-400">NOVO VALOR</small><p className="mt-1 break-words">{h.valor_novo_texto||safe(h.valor_novo)}</p></div></div>:<div className="mt-3 rounded-lg border p-3">{h.valor_novo_texto||h.valor_anterior_texto||'Registro realizado.'}</div>}</CardContent></Card>})}</div>}
 </>;

 if(!pagina)return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden"><DialogHeader className="border-b border-border pb-4"><DialogTitle className="text-xl" style={{color:GOLD}}><History className="mr-2 inline h-5 w-5"/>Histórico do Membro • {membro?.nome_completo}</DialogTitle></DialogHeader><div className="overflow-y-auto p-5 space-y-5"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button variant="outline" size="sm" onClick={excel} disabled={!filtrado.length}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={pdf} disabled={!filtrado.length}><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={imprimir} disabled={!filtrado.length} style={{background:GOLD,color:'#111827'}}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div>{conteudo}</div></DialogContent></Dialog>;

 return <div className="dark-igreja space-y-5">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{borderColor:'hsl(var(--neon-igreja)/.25)',background:'hsl(var(--neon-igreja)/.10)'}}><History className="h-6 w-6" style={{color:GOLD}}/></div><div><h2 className="text-2xl font-bold md:text-3xl" style={{color:GOLD}}>Histórico de Membros</h2><p className="text-sm text-muted-foreground">Movimentações realizadas nos cadastros dos membros.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={carregar}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button variant="outline" size="sm" onClick={excel} disabled={!filtrado.length}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" size="sm" onClick={pdf} disabled={!filtrado.length}><FileText className="mr-2 h-4 w-4"/>PDF</Button><Button size="sm" onClick={imprimir} disabled={!filtrado.length} style={{background:GOLD,color:'#111827'}}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></div>
  </div>

  <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar membro, campo ou movimentação..." className="pl-9"/></div><Select value={acao} onValueChange={setAcao}><SelectTrigger><Filter className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent className="dark-igreja"><SelectItem value="TODOS">Todas as movimentações</SelectItem><SelectItem value="CADASTRO">Cadastros</SelectItem><SelectItem value="ALTERAÇÃO">Alterações</SelectItem><SelectItem value="EXCLUSÃO">Exclusões</SelectItem></SelectContent></Select></CardContent></Card>

  {conteudo}
 </div>;
}
