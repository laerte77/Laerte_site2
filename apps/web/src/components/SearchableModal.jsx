import React,{useState,useEffect,useMemo,useRef}from'react';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Search}from'lucide-react';

export default function SearchableModal({
 isOpen,
 onClose,
 onSelect,
 tableName,
 searchField,
 displayFields=[],
 title,
 selectQuery='*'
}){
 const{user}=useAuth(),{toast}=useToast();
 const[items,setItems]=useState([]),[loading,setLoading]=useState(false),[searchTerm,setSearchTerm]=useState(''),[selectedItem,setSelectedItem]=useState(null);
 const mounted=useRef(true);

 useEffect(()=>()=>{mounted.current=false},[]);

 useEffect(()=>{
  mounted.current=true;
  if(!isOpen||!user)return;

  const fetchItems=async()=>{
   setLoading(true);
   try{
    const{data,error}=await supabase.from(tableName).select(selectQuery).eq('user_id',user.id);
    if(error)throw error;
    if(mounted.current)setItems(data||[]);
   }catch(e){
    if(mounted.current)toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'});
   }finally{
    if(mounted.current)setLoading(false);
   }
  };

  fetchItems();
 },[isOpen,user,tableName,selectQuery,toast]);

 useEffect(()=>{
  if(!isOpen){
   setSearchTerm('');
   setSelectedItem(null);
  }
 },[isOpen]);

 const getValue=(obj,path)=>{
  if(!path)return'';
  return String(path.split('.').reduce((o,k)=>o?.[k],obj)??'');
 };

 const filteredItems=useMemo(()=>{
  const term=String(searchTerm||'').trim().toLowerCase();
  if(!term)return items;

  return items.filter(item=>
   getValue(item,searchField).toLowerCase().includes(term)
  );
 },[items,searchTerm,searchField]);

 const select=()=>{
  if(!selectedItem)return;
  onSelect?.(selectedItem);
  onClose?.();
 };

 return(
  <Dialog open={!!isOpen} onOpenChange={v=>{if(!v)onClose?.()}}>
   <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col z-[100]">
    <DialogHeader>
     <DialogTitle>{title}</DialogTitle>
    </DialogHeader>

    <div className="relative p-4">
     <Search className="absolute left-7 top-7 h-4 w-4 text-muted-foreground"/>
     <Input
      value={searchTerm}
      onChange={e=>setSearchTerm(e.target.value)}
      placeholder="Pesquisar..."
      className="pl-10"
     />
    </div>

    <ScrollArea className="flex-grow rounded-md border">
     <div className="space-y-2 p-4">
      {loading?(
       <p className="py-8 text-center text-muted-foreground">Carregando...</p>
      ):filteredItems.length===0?(
       <p className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</p>
      ):(
       filteredItems.map(item=>(
        <button
         type="button"
         key={item.id}
         onClick={()=>setSelectedItem(item)}
         className={`w-full rounded-md border p-3 text-left transition-colors ${
          selectedItem?.id===item.id
           ?'border-primary bg-primary/20'
           :'border-transparent bg-card hover:border-border hover:bg-muted'
         }`}
        >
         {displayFields.map((field,i)=>{
          const value=field?.key?field.key.split('.').reduce((o,k)=>o?.[k],item):'';
          const formatted=typeof field?.format==='function'
           ?field.format(value)
           :value;

          return(
           <p
            key={`${field.key}-${i}`}
            className={`text-sm ${i===0?'font-semibold text-foreground':'text-muted-foreground'}`}
           >
            <span className="mr-1 opacity-70">{field.label}:</span>
            {String(formatted??'')}
           </p>
          );
         })}
        </button>
       ))
      )}
     </div>
    </ScrollArea>

    <DialogFooter>
     <Button variant="outline" onClick={()=>onClose?.()}>Cancelar</Button>
     <Button onClick={select} disabled={!selectedItem}>Confirmar</Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}
