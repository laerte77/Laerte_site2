import React,{createContext,useContext,useEffect,useState,useCallback,useMemo,useRef}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{useProfileEnsure}from'@/hooks/useProfileEnsure';
import{validateStoredTokens,clearAuthTokens}from'@/lib/tokenUtils';
import{usePermissionsRealtime}from'@/hooks/usePermissionsRealtime';

const AuthContext=createContext(undefined),INACTIVITY_LIMIT=10*60*1000;

export const AuthProvider=({children})=>{
 const{toast}=useToast(),{ensureProfile}=useProfileEnsure();
 const[user,setUser]=useState(null),[session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
 const profileRef=useRef(null),lastActivityRef=useRef(Date.now()),timerRef=useRef(null),loggingOutRef=useRef(false);

 useEffect(()=>{profileRef.current=profile},[profile]);

 const fetchProfile=useCallback(async(currentUser,isUpdate=false)=>{
  try{
   const validProfile=await ensureProfile(currentUser);
   if(isUpdate&&profileRef.current){
    const oldModules=JSON.stringify(profileRef.current.allowed_modules),newModules=JSON.stringify(validProfile?.allowed_modules);
    if(oldModules!==newModules)window.dispatchEvent(new CustomEvent('permissionsUpdated',{detail:{allowed_modules:validProfile?.allowed_modules}}));
   }
   setProfile(validProfile||null);
   if(validProfile?.data_sharing_preferences)localStorage.setItem('data_sharing_preferences',JSON.stringify(validProfile.data_sharing_preferences));
   else localStorage.removeItem('data_sharing_preferences');
  }catch(err){
   console.error('Unexpected error fetching profile in context:',err);
   setProfile(null);
   localStorage.removeItem('data_sharing_preferences');
  }
 },[ensureProfile]);

 const handleSession=useCallback(async currentSession=>{
  setSession(currentSession);
  setUser(currentSession?.user??null);
  if(currentSession?.user){
   lastActivityRef.current=Date.now();
   loggingOutRef.current=false;
   await fetchProfile(currentSession.user,false);
  }else{
   setProfile(null);
   localStorage.removeItem('data_sharing_preferences');
   lastActivityRef.current=Date.now();
   if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
  }
  setLoading(false);
 },[fetchProfile]);

 const refreshProfile=useCallback(async()=>{if(user)await fetchProfile(user,true)},[user,fetchProfile]);
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
  const getSession=async()=>{
   try{
    if(localStorage.length>0&&!validateStoredTokens()){
     clearAuthTokens();
     await supabase.auth.signOut();
    }
    const{data,error}=await supabase.auth.getSession();
    if(error){
     console.error('Session retrieval error:',error);
     if(error.message.includes('Refresh Token Not Found')||error.message.includes('Invalid Refresh Token')){
      clearAuthTokens();
      await supabase.auth.signOut();
     }
    }
    await handleSession(data?.session);
   }catch(err){
    console.error('Error getting initial session:',err);
    clearAuthTokens();
    setLoading(false);
   }
  };

  getSession();

  const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,currentSession)=>{
   if(event==='TOKEN_REFRESHED')console.log('[Auth] Token successfully refreshed automatically');
   else if(event==='SIGNED_OUT')clearAuthTokens();
   await handleSession(currentSession);
  });

  return()=>subscription?.unsubscribe();
 },[handleSession]);

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
