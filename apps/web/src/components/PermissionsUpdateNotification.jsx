import React,{useEffect}from'react';
import{useToast}from'@/components/ui/use-toast';
import{ShieldAlert}from'lucide-react';

const PermissionsUpdateNotification=()=>{
 const{toast}=useToast();

 useEffect(()=>{
  const handlePermissionsUpdated=()=>{
   toast({
    title:'Permissões Atualizadas',
    description:'Suas permissões de acesso foram atualizadas pelo administrador.',
    duration:4000,
    className:'border-blue-500/50 bg-blue-500/10 text-blue-500',
    action:<div className="flex shrink-0 items-center justify-center rounded-full bg-blue-500/20 p-2" aria-hidden="true">
     <ShieldAlert className="h-4 w-4 text-blue-500" aria-hidden="true"/>
    </div>
   });
  };

  window.addEventListener('permissionsUpdated',handlePermissionsUpdated);

  return()=>{
   window.removeEventListener('permissionsUpdated',handlePermissionsUpdated);
  };
 },[toast]);

 return null;
};

export default PermissionsUpdateNotification;
