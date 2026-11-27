
import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Plus,Trash2,ShoppingCart,RefreshCw,Loader2,XCircle,Pencil}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Textarea}from'@/components/ui/textarea';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalComercialPadrao from'../ModalComercialPadrao';

const GREEN='hsl(var(--neon-comercial))';
const FORM_ID='form-nova-venda';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const hoje=()=>{
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const formatDate=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'—';
const subtotalItem=i=>Number((Math.max(0,Number(i.quantidade)||0)*Math.max(0,Number(i.valor_unitario)||0)).toFixed(2));
const newItem=()=>({produto_id:'',quantidade:'1',valor_unitario:''});
const numero=v=>Number(String(v??'').replace(',','.'))||0;

export default function LancamentoVendasComercial(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[clientes,setClientes]=useState([]);
 const[produtos,setProdutos]=useState([]);
 const[vendas,setVendas]=useState([]);
 const[modalOpen,setModalOpen]=useState(false);
 const[editId,setEditId]=useState(null);
 const[editVenda,setEditVenda]=useState(null);
 const[dataVenda,setDataVenda]=useState(hoje());
 const[clienteId,setClienteId]=useState('');
 const[forma,setForma]=useState('PIX');
 const[observacoes,setObservacoes]=useState('');
 const[itens,setItens]=useState([newItem()]);
 const[statusPagamento,setStatusPagamento]=useState('pendente');
 const[valorPago,setValorPago]=useState('0.00');
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[deleting,setDeleting]=useState(false);

 const carregar=useCallback(async()=>{
  if(!user){setLoading(false);return}
  setLoading(true);
  const[c,p,v]=await Promise.all([
   supabase.from('comercial_clientes').select('id,nome,ativo').eq('user_id',user.id).order('nome'),
   supabase.from('comercial_produtos').select('id,nome,codigo,unidade,ativo').eq('user_id',user.id).order('nome'),
   supabase.from('comercial_vendas').select('id,data_venda,status,forma_pagamento,observacoes,valor_total,valor_recebido,cliente_id,comercial_venda_itens(id,descricao,quantidade,valor_unitario,subtotal,produto_id)').eq('user_id',user.id).order('data_venda',{ascending:false}).limit(100)
  ]);
  const error=c.error||p.error||v.error;
  if(error)toast({title:'Erro ao carregar vendas',description:error.message,variant:'destructive'});
  setClientes(c.data||[]);
  setProdutos(p.data||[]);
  setVendas(v.data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{carregar()},[carregar]);

 const limparFormulario=()=>{
  setEditId(null);
  setEditVenda(null);
  setDataVenda(hoje());
  setClienteId('');
  setForma('PIX');
  setObservacoes('');
  setItens([newItem()]);
  setStatusPagamento('pendente');
  setValorPago('0.00');
 };

 const abrirModal=()=>{
  limparFormulario();
  setModalOpen(true);
 };

 const editar=v=>{
  if(v.status==='cancelado')return;
  setEditId(v.id);
  setEditVenda(v);
  setDataVenda(v.data_venda||hoje());
  setClienteId(v.cliente_id||'');
  setForma(v.forma_pagamento||'PIX');
  setObservacoes(v.observacoes||'');
  setItens((v.comercial_venda_itens||[]).map(i=>({
   id:i.id,
   produto_id:i.produto_id||'',
   quantidade:String(i.quantidade),
   valor_unitario:String(i.valor_unitario)
  })));
  setStatusPagamento(v.status==='recebido'?'recebido':v.status==='parcial'?'parcial':'pendente');
  setValorPago(String(Number(v.valor_recebido||0).toFixed(2)));
  setModalOpen(true);
 };

 const alterarItem=(index,field,value)=>{
  setItens(old=>old.map((item,i)=>i===index?{...item,[field]:value}:item));
 };

 const total=useMemo(()=>Number(itens.reduce((sum,item)=>sum+subtotalItem(item),0).toFixed(2)),[itens]);
 const pagoCalculado=statusPagamento==='recebido'?total:statusPagamento==='pendente'?0:numero(valorPago);
 const restante=Math.max(0,Number((total-pagoCalculado).toFixed(2)));

 const salvar=async e=>{
  e.preventDefault();
  if(!user||saving)return;

  const validos=itens.filter(i=>i.produto_id&&Number(i.quantidade)>0&&String(i.valor_unitario).trim()!==''&&Number(i.valor_unitario)>=0);
  if(!dataVenda||validos.length!==itens.length||!validos.length){
   toast({title:'Confira os dados da venda',description:'Informe a data, selecione os produtos e preencha quantidades e preços válidos.',variant:'destructive'});
   return;
  }

  if(statusPagamento==='parcial'&&!(pagoCalculado>0&&pagoCalculado<total)){
   toast({title:'Valor pago inválido',description:'No pagamento parcial, o valor pago precisa ser maior que zero e menor que o total da venda.',variant:'destructive'});
   return;
  }

  if(statusPagamento==='recebido'&&total<=0){
   toast({title:'Total inválido',description:'Adicione produtos com valores válidos antes de marcar a venda como paga.',variant:'destructive'});
   return;
  }

  setSaving(true);
  let vendaId=editId;

  try{
   const cabecalho={
    cliente_id:clienteId||null,
    data_venda:dataVenda,
    forma_pagamento:forma,
    observacoes:observacoes.trim()||null
   };

   if(editId){
    if(editVenda?.status==='cancelado')throw new Error('Uma venda cancelada não pode ser editada.');

    const{error:headerError}=await supabase.from('comercial_vendas').update(cabecalho).eq('id',editId).eq('user_id',user.id);
    if(headerError)throw headerError;

    const idsAtuais=itens.filter(i=>i.id).map(i=>i.id);
    const idsOriginais=(editVenda.comercial_venda_itens||[]).map(i=>i.id);
    const removidos=idsOriginais.filter(id=>!idsAtuais.includes(id));

    if(removidos.length){
     const{error}=await supabase.from('comercial_venda_itens').delete().in('id',removidos).eq('venda_id',editId).eq('user_id',user.id);
     if(error)throw error;
    }

    for(const i of validos.filter(x=>x.id)){
     const produto=produtos.find(p=>p.id===i.produto_id);
     const quantidade=Number(i.quantidade);
     const valorUnitario=Number(i.valor_unitario);
     const{error}=await supabase.from('comercial_venda_itens').update({
      produto_id:i.produto_id,
      descricao:produto?.nome||'Produto',
      quantidade,
      valor_unitario:valorUnitario,
      subtotal:Number((quantidade*valorUnitario).toFixed(2))
     }).eq('id',i.id).eq('venda_id',editId).eq('user_id',user.id);
     if(error)throw error;
    }

    const novos=validos.filter(i=>!i.id).map(i=>{
     const produto=produtos.find(p=>p.id===i.produto_id);
     const quantidade=Number(i.quantidade);
     const valorUnitario=Number(i.valor_unitario);
     return{
      user_id:user.id,
      venda_id:editId,
      produto_id:i.produto_id,
      descricao:produto?.nome||'Produto',
      quantidade,
      valor_unitario:valorUnitario,
      subtotal:Number((quantidade*valorUnitario).toFixed(2))
     };
    });

    if(novos.length){
     const{error}=await supabase.from('comercial_venda_itens').insert(novos);
     if(error)throw error;
    }

    const{error:paymentError}=await supabase.from('comercial_vendas').update({
     valor_recebido:pagoCalculado,
     status:statusPagamento
    }).eq('id',editId).eq('user_id',user.id);
    if(paymentError)throw paymentError;

    toast({title:'Venda atualizada',description:'Os dados e o recebimento foram atualizados.'});
   }else{
    const{data:venda,error:vendaError}=await supabase.from('comercial_vendas').insert({
     user_id:user.id,
     ...cabecalho,
     valor_total:0,
     valor_recebido:0,
     status:'pendente'
    }).select('id').single();

    if(vendaError)throw vendaError;
    vendaId=venda.id;

    const itensBanco=validos.map(i=>{
     const produto=produtos.find(p=>p.id===i.produto_id);
     const quantidade=Number(i.quantidade);
     const valorUnitario=Number(i.valor_unitario);
     return{
      user_id:user.id,
      venda_id:vendaId,
      produto_id:i.produto_id,
      descricao:produto?.nome||'Produto',
      quantidade,
      valor_unitario:valorUnitario,
      subtotal:Number((quantidade*valorUnitario).toFixed(2))
     };
    });

    const{error:itemError}=await supabase.from('comercial_venda_itens').insert(itensBanco);
    if(itemError)throw itemError;

    const{error:paymentError}=await supabase.from('comercial_vendas').update({
     valor_recebido:pagoCalculado,
     status:statusPagamento
    }).eq('id',vendaId).eq('user_id',user.id);
    if(paymentError)throw paymentError;

    toast({title:'Venda registrada!',description:'A venda e o recebimento foram salvos.'});
    limparFormulario();
   }

   await carregar();
  }catch(error){
   toast({title:editId?'Erro ao atualizar venda':'Não foi possível registrar a venda',description:error.message,variant:'destructive'});
   await carregar();
  }finally{
   setSaving(false);
  }
 };

 const excluir=async venda=>{
  if(venda.status==='cancelado')return;
  if(!window.confirm('Deseja realmente excluir esta venda? Os itens serão removidos e o estoque será estornado automaticamente.'))return;
  setDeleting(true);
  const{error}=await supabase.from('comercial_vendas').delete().eq('id',venda.id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir venda',description:error.message,variant:'destructive'});
  else{
   toast({title:'Venda excluída',description:'Os itens foram removidos pelo banco.'});
   if(editId===venda.id){limparFormulario();setModalOpen(false)}
   await carregar();
  }
  setDeleting(false);
 };

 const cancelar=async venda=>{
  if(venda.status==='cancelado'||!window.confirm('Deseja cancelar esta venda? O estoque dos produtos será estornado automaticamente.'))return;
  const{error}=await supabase.from('comercial_vendas').update({status:'cancelado'}).eq('id',venda.id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao cancelar venda',description:error.message,variant:'destructive'});
  else{
   toast({title:'Venda cancelada',description:'O banco processou o estorno do estoque.'});
   await carregar();
  }
 };

 const produtoNome=id=>produtos.find(p=>p.id===id)?.nome||'Produto';
 const clienteNome=id=>clientes.find(c=>c.id===id)?.nome||'Consumidor não identificado';
 const statusInfo={
  pendente:{texto:'Devendo',cor:'text-amber-400'},
  parcial:{texto:'Pago parcialmente',cor:'text-blue-400'},
  recebido:{texto:'Pago',cor:'text-emerald-400'},
  cancelado:{texto:'Cancelado',cor:'text-red-400'}
 };

 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
   <div className="flex items-center gap-3">
    <div className="rounded-xl border p-3" style={{borderColor:'hsl(var(--neon-comercial)/.3)',color:GREEN}}><ShoppingCart/></div>
    <div>
     <p className="text-xs font-semibold uppercase tracking-widest" style={{color:GREEN}}>Lançamentos</p>
     <h1 className="text-2xl font-bold text-white">Vendas</h1>
     <p className="text-sm text-muted-foreground">Registre vendas e acompanhe os lançamentos.</p>
    </div>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" onClick={carregar} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button onClick={abrirModal} className="font-bold text-black" style={{background:GREEN}}><Plus className="mr-2 h-4 w-4"/>Nova venda</Button>
   </div>
  </div>

  <ModalComercialPadrao
   open={modalOpen}
   onClose={()=>!saving&&!deleting&&setModalOpen(false)}
   title={editId?'Editar venda':'Nova venda'}
   description="Informe os dados da venda, os produtos e a situação do pagamento."
   icon={ShoppingCart}
   footer={<>
    <Button type="button" variant="outline" onClick={()=>setModalOpen(false)} disabled={saving}>Fechar</Button>
    <Button type="submit" form={FORM_ID} disabled={saving||!produtos.some(p=>p.ativo)} className="font-bold text-black" style={{background:GREEN}}>
     {saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:editId?<Pencil className="mr-2 h-4 w-4"/>:<Plus className="mr-2 h-4 w-4"/>}{editId?'Salvar alterações':'Salvar venda'}
    </Button>
   </>}>
   <form id={FORM_ID} onSubmit={salvar} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
     <div className="space-y-2"><Label>Data da venda</Label><Input type="date" required value={dataVenda} onChange={e=>setDataVenda(e.target.value)}/></div>
     <div className="space-y-2">
      <Label>Cliente</Label>
      <select value={clienteId} onChange={e=>setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
       <option value="">Consumidor não identificado</option>
       {clientes.filter(c=>c.ativo||c.id===clienteId).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
     </div>
     <div className="space-y-2 sm:col-span-2">
      <Label>Forma de pagamento</Label>
      <select value={forma} onChange={e=>setForma(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
       {['PIX','DINHEIRO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','TRANSFERÊNCIA','A PRAZO','OUTRO'].map(x=><option key={x}>{x}</option>)}
      </select>
     </div>
    </div>

    <div className="space-y-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <Label>Produtos da venda</Label>
      <Button type="button" size="sm" variant="outline" onClick={()=>setItens(v=>[...v,newItem()])}><Plus className="mr-1 h-4 w-4"/>Adicionar produto</Button>
     </div>
     {itens.map((item,index)=>(
      <div key={item.id||`novo-${index}`} className="space-y-3 rounded-xl border border-border p-3">
       <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">Produto {index+1}</span>
        <Button type="button" variant="ghost" size="icon" disabled={itens.length===1} onClick={()=>setItens(v=>v.filter((_,i)=>i!==index))} className="text-red-400"><Trash2 className="h-4 w-4"/></Button>
       </div>
       <div className="space-y-2">
        <Label>Produto</Label>
        <select required value={item.produto_id} onChange={e=>alterarItem(index,'produto_id',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
         <option value="">Selecione um produto</option>
         {produtos.filter(p=>p.ativo||p.id===item.produto_id).map(p=><option key={p.id} value={p.id}>{p.nome}{p.codigo?` (${p.codigo})`:''}</option>)}
        </select>
       </div>
       <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Quantidade</Label><Input required type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e=>alterarItem(index,'quantidade',e.target.value)}/></div>
        <div className="space-y-2"><Label>Preço unitário (R$)</Label><Input required type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e=>alterarItem(index,'valor_unitario',e.target.value)}/></div>
        <div className="space-y-2"><Label>Subtotal (R$)</Label><Input readOnly tabIndex={-1} value={money(subtotalItem(item))} className="font-semibold"/></div>
       </div>
      </div>
     ))}
    </div>

    <div className="space-y-2"><Label>Observações</Label><Textarea rows={2} value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Informações adicionais..."/></div>

    <div className="space-y-4 rounded-xl border border-[hsl(var(--neon-comercial)/.3)] bg-[hsl(var(--neon-comercial)/.05)] p-4">
     <div><p className="text-sm text-gray-400">Total da venda</p><p className="text-2xl font-bold" style={{color:GREEN}}>{money(total)}</p></div>
     <div className="space-y-2">
      <Label>Status do pagamento</Label>
      <select value={statusPagamento} onChange={e=>{
       setStatusPagamento(e.target.value);
       if(e.target.value==='recebido')setValorPago(total.toFixed(2));
       if(e.target.value==='pendente')setValorPago('0.00');
      }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-white">
       <option value="recebido">Pago</option>
       <option value="pendente">Devendo</option>
       <option value="parcial">Pago parcialmente</option>
      </select>
     </div>
     {statusPagamento==='parcial'?(
      <div className="grid gap-3 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Valor pago (R$)</Label>
        <Input type="number" min="0.01" max={Math.max(0,total-0.01)} step="0.01" value={valorPago} onChange={e=>setValorPago(e.target.value)} placeholder="0,00"/>
       </div>
       <div className="space-y-2">
        <Label>Valor restante (R$)</Label>
        <Input readOnly value={money(restante)} className="font-semibold"/>
       </div>
      </div>
     ):(
      <div className="grid gap-3 sm:grid-cols-2">
       <div><p className="text-xs text-muted-foreground">Valor pago</p><p className="font-semibold text-emerald-400">{money(pagoCalculado)}</p></div>
       <div><p className="text-xs text-muted-foreground">Valor restante</p><p className="font-semibold text-amber-400">{money(restante)}</p></div>
      </div>
     )}
    </div>
   </form>
  </ModalComercialPadrao>

  <Card className="border-border bg-card">
   <CardHeader><CardTitle style={{color:GREEN}}>Vendas recentes</CardTitle></CardHeader>
   <CardContent className="overflow-x-auto p-0">
    <table className="w-full min-w-[1050px] text-sm">
     <thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
      <th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Itens</th><th className="p-3">Pagamento</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Pago</th><th className="p-3 text-right">Restante</th><th className="p-3">Situação</th><th className="p-3 text-right">Ações</th>
     </tr></thead>
     <tbody>
      {loading?<tr><td colSpan={9} className="p-8 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr>
      :vendas.length?vendas.map(v=>{
       const status=statusInfo[v.status]||{texto:v.status,cor:'text-gray-400'};
       const restanteVenda=Math.max(0,Number((Number(v.valor_total||0)-Number(v.valor_recebido||0)).toFixed(2)));
       return <tr key={v.id} className="border-b border-border">
        <td className="p-3">{formatDate(v.data_venda)}</td>
        <td className="p-3">{clienteNome(v.cliente_id)}</td>
        <td className="max-w-[240px] p-3">{(v.comercial_venda_itens||[]).map(i=>`${i.descricao||produtoNome(i.produto_id)} (${i.quantidade})`).join(', ')||'—'}</td>
        <td className="p-3">{v.forma_pagamento||'—'}</td>
        <td className="p-3 text-right font-semibold">{money(v.valor_total)}</td>
        <td className="p-3 text-right text-emerald-400">{money(v.valor_recebido)}</td>
        <td className="p-3 text-right text-amber-400">{money(restanteVenda)}</td>
        <td className={`p-3 ${status.cor}`}>{status.texto}</td>
        <td className="p-3 text-right whitespace-nowrap">
         {v.status!=='cancelado'&&<>
          <Button size="sm" variant="ghost" onClick={()=>editar(v)} disabled={saving||deleting} className="text-emerald-400"><Pencil className="mr-1 h-4 w-4"/>Editar</Button>
          <Button size="sm" variant="ghost" onClick={()=>excluir(v)} disabled={deleting||saving} className="text-red-400"><Trash2 className="mr-1 h-4 w-4"/>Excluir</Button>
          <Button size="sm" variant="ghost" onClick={()=>cancelar(v)} disabled={deleting||saving} className="text-orange-400"><XCircle className="mr-1 h-4 w-4"/>Cancelar</Button>
         </>}
        </td>
       </tr>;
      }):<tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma venda registrada.</td></tr>}
     </tbody>
    </table>
   </CardContent>
  </Card>
 </div>;
}
