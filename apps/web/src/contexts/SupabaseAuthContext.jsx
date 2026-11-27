import React,{createContext,useContext,useEffect,useState,useCallback,useMemo,useRef}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{useProfileEnsure}from'@/hooks/useProfileEnsure';
import{clearAuthTokens}from'@/lib/tokenUtils';
import{usePermissionsRealtime}from'@/hooks/usePermissionsRealtime';

const AuthContext=createContext(undefined),INACTIVITY_LIMIT=10*60*1000,PROFILE_TIMEOUT=15000,SESSION_TIMEOUT=15000;

const withTimeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

export const AuthProvider=({children})=>{
 const{toast}=useToast(),{ensureProfile}=useProfileEnsure();
 const[user,setUser]=useState(null),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
 const profileRef=useRef(null),profileRequestRef=useRef(0),authEventVersionRef=useRef(0),userIdRef=useRef(null),profileLoadedForUserRef=useRef(null),profileLoadingUserIdRef=useRef(null),lastActivityRef=useRef(Date.now()),timerRef=useRef(null),loggingOutRef=useRef(false),initializedRef=useRef(false);

 useEffect(()=>{profileRef.current=profile},[profile]);

 const fetchProfile=useCallback(async(currentUser,isUpdate=false,requestId)=>{
  try{
   const validProfile=await withTimeout(ensureProfile(currentUser),PROFILE_TIMEOUT,'Tempo limite ao carregar o perfil.');
   if(requestId!==profileRequestRef.current)return;
   if(isUpdate&&profileRef.current){
    const oldModules=JSON.stringify(profileRef.current.allowed_modules),newModules=JSON.stringify(validProfile?.allowed_modules);
    if(oldModules!==newModules)window.dispatchEvent(new CustomEvent('permissionsUpdated',{detail:{allowed_modules:validProfile?.allowed_modules}}));
   }
   setProfile(validProfile||null);
   if(validProfile?.data_sharing_preferences)localStorage.setItem('data_sharing_preferences',JSON.stringify(validProfile.data_sharing_preferences));
   else localStorage.removeItem('data_sharing_preferences');
  }catch(err){
   if(requestId!==profileRequestRef.current)return;
   console.error('Erro ao carregar perfil:',err);
   setProfile(null);
   try{localStorage.removeItem('data_sharing_preferences')}catch(e){}
  }
 },[ensureProfile]);

 const processSession=useCallback((currentSession,isInitial=false)=>{
  const currentUser=currentSession?.user??null;
  const currentId=currentUser?.id??null;
  const sameUser=currentId&&currentId===userIdRef.current;

  if(sameUser){
   setSession(currentSession);
   setUser(currentUser);
   if(profileLoadedForUserRef.current===currentId||profileLoadingUserIdRef.current===currentId)return;
   const requestId=++profileRequestRef.current;
   profileLoadingUserIdRef.current=currentId;
   Promise.resolve().then(()=>fetchProfile(currentUser,false,requestId)).finally(()=>{
    if(requestId===profileRequestRef.current){
     profileLoadingUserIdRef.current=null;
     profileLoadedForUserRef.current=currentId;
     if(!initializedRef.current){initializedRef.current=true;setLoading(false)}
    }
   });
   return;
  }

  const requestId=++profileRequestRef.current;
  setSession(currentSession??null);
  setUser(currentUser);
  userIdRef.current=currentId;

  if(currentUser){
   lastActivityRef.current=Date.now();
   loggingOutRef.current=false;
   profileLoadedForUserRef.current=null;
   profileLoadingUserIdRef.current=currentId;
   if(isInitial||!initializedRef.current)setLoading(true);
   Promise.resolve().then(()=>fetchProfile(currentUser,false,requestId)).finally(()=>{
    if(requestId===profileRequestRef.current){
     profileLoadingUserIdRef.current=null;
     profileLoadedForUserRef.current=currentId;
     if(!initializedRef.current){initializedRef.current=true;setLoading(false)}
    }
   });
  }else{
   profileLoadingUserIdRef.current=null;
   profileLoadedForUserRef.current=null;
   setProfile(null);
   try{localStorage.removeItem('data_sharing_preferences')}catch(e){}
   lastActivityRef.current=Date.now();
   if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
   initializedRef.current=true;
   setLoading(false);
  }
 },[fetchProfile]);

 const refreshProfile=useCallback(async()=>{
  if(!user)return;
  const requestId=++profileRequestRef.current;
  await fetchProfile(user,true,requestId);
 },[user,fetchProfile]);

 usePermissionsRealtime(user?.id,refreshProfile);

 const signOut=useCallback(async(showToast=false)=>{
  if(loggingOutRef.current)return;
  loggingOutRef.current=true;
  try{
   clearAuthTokens();
   const{error}=await supabase.auth.signOut();
   if(error){
    loggingOutRef.current=false;
    if(showToast)toast({variant:'destructive',title:'Erro ao Sair',description:error.message});
    return{error};
   }
   if(showToast)toast({title:'Sessão encerrada',description:'Sua sessão foi encerrada após 10 minutos de inatividade.',variant:'destructive'});
   return{error:null};
  }catch(err){
   loggingOutRef.current=false;
   if(showToast)toast({variant:'destructive',title:'Erro ao Sair',description:err.message});
   return{error:err};
  }
 },[toast]);

 const updateActivity=useCallback(()=>{
  if(!user||loggingOutRef.current)return;
  lastActivityRef.current=Date.now();
  if(timerRef.current)clearTimeout(timerRef.current);
  timerRef.current=setTimeout(async()=>{
   const inactive=Date.now()-lastActivityRef.current;
   if(inactive>=INACTIVITY_LIMIT)await signOut(true);
   else timerRef.current=setTimeout(()=>signOut(true),INACTIVITY_LIMIT-inactive);
  },INACTIVITY_LIMIT);
 },[user,signOut]);

 useEffect(()=>{
  if(!user){
   if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
   return;
  }
  const events=['mousemove','mousedown','keydown','touchstart','touchmove','scroll','pointerdown'],activity=()=>updateActivity();
  events.forEach(e=>window.addEventListener(e,activity,{passive:true}));
  const visibility=()=>{
   if(document.visibilityState==='visible'){
    const inactive=Date.now()-lastActivityRef.current;
    if(inactive>=INACTIVITY_LIMIT)signOut(true);
    else updateActivity();
   }
  };
  document.addEventListener('visibilitychange',visibility);
  updateActivity();
  return()=>{
   events.forEach(e=>window.removeEventListener(e,activity));
   document.removeEventListener('visibilitychange',visibility);
   if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
  };
 },[user,updateActivity,signOut]);

 useEffect(()=>{
  let active=true;
  const{data:{subscription}}=supabase.auth.onAuthStateChange((event,currentSession)=>{
   if(!active)return;
   authEventVersionRef.current++;

   if(event==='TOKEN_REFRESHED'){
    const currentId=currentSession?.user?.id??null;
    if(currentId&&!userIdRef.current){
     processSession(currentSession);
     return;
    }
    setSession(currentSession??null);
    setUser(currentSession?.user??null);
    return;
   }

   if(event==='SIGNED_OUT'){
    clearAuthTokens();
    processSession(null);
    return;
   }

   processSession(currentSession);
  });

  const initialVersion=authEventVersionRef.current;
  const getInitialSession=async()=>{
   try{
    const{data,error}=await withTimeout(supabase.auth.getSession(),SESSION_TIMEOUT,'Tempo limite ao recuperar a sessão.');
    if(!active||authEventVersionRef.current!==initialVersion)return;
    if(error){
     console.error('Erro ao recuperar sessão:',error);
     processSession(null,true);
     return;
    }
    processSession(data?.session??null,true);
   }catch(err){
    if(!active||authEventVersionRef.current!==initialVersion)return;
    console.error('Falha na inicialização da autenticação:',err);
    setSession(null);
    setUser(null);
    setProfile(null);
    userIdRef.current=null;
    profileLoadedForUserRef.current=null;
    profileLoadingUserIdRef.current=null;
    initializedRef.current=true;
    setLoading(false);
   }
  };

  getInitialSession();
  return()=>{
   active=false;
   subscription?.unsubscribe();
   profileRequestRef.current++;
  };
 },[processSession]);

 const isAdmin=useMemo(()=>profile?.is_admin===true,[profile]);
 const dataSharingPreferences=useMemo(()=>profile?.data_sharing_preferences||{},[profile]);

 const getAllowedModules=useCallback(()=>{
  if(isAdmin)return['pessoal','igreja','igreja:tesouraria','igreja:secretaria','lm-impressoes','lm_impressoes','barbearia','entretenimento'];
  if(!profile||!profile.allowed_modules)return[];
  let modules=profile.allowed_modules;
  if(typeof modules==='string'){try{modules=JSON.parse(modules)}catch(e){modules=[]}}
  return Array.isArray(modules)?modules:[];
 },[isAdmin,profile]);

 const userModules=getAllowedModules();

 const canAccessModule=useCallback(moduleName=>{
  if(isAdmin)return true;
  const modules=getAllowedModules(),normalizedModule=moduleName.toLowerCase().replace('-','_');
  if(normalizedModule==='igreja')return modules.some(m=>typeof m==='string'&&(m.toLowerCase()==='igreja'||m.toLowerCase().startsWith('igreja:')));
  if(modules.some(m=>typeof m==='string'&&m.toLowerCase().replace('-','_')===normalizedModule))return true;
  if(normalizedModule.startsWith('igreja:')){
   const sub=normalizedModule.split(':')[1];
   for(const m of modules){
    if(typeof m==='object'&&m!==null&&!Array.isArray(m)){
     for(const[key,subMods]of Object.entries(m)){
      if(key.toLowerCase()==='igreja'&&Array.isArray(subMods)&&subMods.map(s=>s.toLowerCase()).includes(sub))return true;
     }
    }
   }
  }
  return false;
 },[isAdmin,getAllowedModules]);

 const signUp=useCallback(async(email,password,options)=>{
  try{
   const{error}=await supabase.auth.signUp({email,password,options});
   if(error)toast({variant:'destructive',title:'Erro no Cadastro',description:error.message});
   return{error};
  }catch(err){return{error:err}}
 },[toast]);

 const signIn=useCallback(async(email,password)=>{
  try{
   const{error,data}=await supabase.auth.signInWithPassword({email,password});
   if(error)toast({variant:'destructive',title:'Erro no Login',description:'Credenciais inválidas ou erro de rede.'});
   else lastActivityRef.current=Date.now();
   return{error,data};
  }catch(err){return{error:err}}
 },[toast]);

 const value=useMemo(()=>({
  user,session,profile,loading,isAdmin,userModules,dataSharingPreferences,
  getAllowedModules,canAccessModule,signUp,signIn,signOut,refreshProfile
 }),[user,session,profile,loading,isAdmin,userModules,dataSharingPreferences,getAllowedModules,canAccessModule,signUp,signIn,signOut,refreshProfile]);

 return<AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth=()=>{
 const context=useContext(AuthContext);
 if(context===undefined)throw new Error('useAuth must be used within an AuthProvider');
 return context;
};

