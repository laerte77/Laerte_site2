import React from'react';
import{useNavigate}from'react-router-dom';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{motion}from'framer-motion';

export default function ModuleCard({title,description,icon:Icon,link,neonClass,iconColorClass}){
 const navigate=useNavigate();
 const handleNavigate=()=>navigate(link);

 const handleKeyDown=event=>{
  if(event.key==='Enter'||event.key===' '){
   event.preventDefault();
   handleNavigate();
  }
 };

 return <motion.div whileHover={{scale:1.02}} whileTap={{scale:.99}} transition={{duration:.25,ease:'easeOut'}} className="h-full">
  <Card
   onClick={handleNavigate}
   onKeyDown={handleKeyDown}
   role="button"
   tabIndex={0}
   aria-label={`Acessar módulo ${title}`}
   className={`group relative h-full cursor-pointer overflow-hidden border-2 bg-card/60 p-2 shadow-[0_0_15px_var(--neon-shadow-color)] backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-300 hover:bg-card/80 hover:shadow-[0_0_26px_var(--neon-shadow-color)] ${neonClass}`}
  >
   <CardHeader className="pb-4">
    <motion.div
     className={`mb-6 inline-flex items-center justify-center rounded-xl bg-background/50 p-4 shadow-[0_0_15px_var(--neon-shadow-color)] group-hover:shadow-[0_0_22px_var(--neon-shadow-color)] ${iconColorClass}`}
     whileHover={{rotate:[0,-3,3,0]}}
     transition={{duration:.4,ease:'easeInOut'}}
    >
     <Icon className="h-[64px] w-[64px] transition-transform duration-300 sm:h-[80px] sm:w-[80px]"/>
    </motion.div>

    <CardTitle className="text-2xl font-bold tracking-wide text-white">{title}</CardTitle>
   </CardHeader>

   <CardContent className="flex flex-col gap-6">
    <p className="flex-1 text-lg leading-relaxed text-[hsl(var(--text-secondary))]">{description}</p>

    <div className={`flex items-center gap-2 font-semibold transition-[gap,color,text-decoration-color] duration-200 ${iconColorClass} group-hover:gap-3 group-hover:underline group-hover:underline-offset-4 group-hover:decoration-2 motion-reduce:transition-none`}>
     Acessar
     <span className="text-xl leading-none transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none">&rarr;</span>
    </div>
   </CardContent>
  </Card>
 </motion.div>;
}
