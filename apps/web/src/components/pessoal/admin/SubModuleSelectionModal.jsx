import React,{useState,useEffect}from'react';
import{
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter
}from'@/components/ui/dialog';
import{Button}from'@/components/ui/button';
import{Checkbox}from'@/components/ui/checkbox';
import{Switch}from'@/components/ui/switch';
import{Label}from'@/components/ui/label';
import{Layers,Radio}from'lucide-react';

const SubModuleSelectionModal=({
 isOpen,
 onClose,
 moduleName,
 availableSubModules,
 initialSelected=[],
 initialRealtime=false,
 onConfirm
})=>{
 const[selected,setSelected]=useState([]);
 const[realtime,setRealtime]=useState(false);

 useEffect(()=>{
  if(isOpen){
   setSelected(
    Array.isArray(initialSelected)
     ?initialSelected
     :[]
   );
   setRealtime(!!initialRealtime);
  }
 },[isOpen,initialSelected,initialRealtime]);

 const handleToggle=subMod=>{
  setSelected(prev=>
   prev.includes(subMod)
    ?prev.filter(item=>item!==subMod)
    :[...prev,subMod]
  );
 };

 const handleConfirm=()=>{
  if(!selected.length)return;
  onConfirm(selected,realtime);
 };

 return(
  <Dialog
   open={isOpen}
   onOpenChange={open=>{
    if(!open)onClose();
   }}
  >
   <DialogContent className="dark-pessoal max-w-md border-border bg-card">

    <DialogHeader className="border-b border-border/50 pb-4">
     <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
       <Layers className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
      </div>

      <div>
       <DialogTitle className="text-lg">
        Submódulos: {moduleName}
       </DialogTitle>

       <DialogDescription className="mt-1">
        Selecione quais áreas o usuário poderá acessar.
       </DialogDescription>
      </div>
     </div>
    </DialogHeader>

    <div className="space-y-3 py-4">

     {availableSubModules.map(subMod=>{
      const active=selected.includes(subMod);

      return(
       <div
        key={subMod}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
         active
          ?'border-[hsl(var(--neon-pessoal)/.30)] bg-[hsl(var(--neon-pessoal)/.05)]'
          :'border-border bg-muted/20 hover:bg-muted/40'
        }`}
        onClick={()=>handleToggle(subMod)}
       >
        <Checkbox
         id={`submod-${subMod}`}
         checked={active}
         onCheckedChange={()=>handleToggle(subMod)}
        />

        <Label
         htmlFor={`submod-${subMod}`}
         className="flex-1 cursor-pointer font-medium"
        >
         {subMod}
        </Label>
       </div>
      );
     })}

     <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-3">
       <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
        <Radio className="h-4 w-4 text-blue-400"/>
       </div>

       <div>
        <Label className="font-medium">
         Compartilhar em tempo real
        </Label>

        <p className="text-xs text-muted-foreground">
         Sincronizar dados automaticamente.
        </p>
       </div>
      </div>

      <Switch
       checked={realtime}
       onCheckedChange={setRealtime}
      />
     </div>
    </div>

    <DialogFooter className="border-t border-border/50 pt-4">
     <Button
      variant="outline"
      onClick={onClose}
     >
      Cancelar
     </Button>

     <Button
      onClick={handleConfirm}
      disabled={!selected.length}
      className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
     >
      Confirmar
     </Button>
    </DialogFooter>

   </DialogContent>
  </Dialog>
 );
};

export default SubModuleSelectionModal;
