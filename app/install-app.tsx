'use client';
import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

// Keep published website update notices without offering app installation.
export default function SiteUpdate(){
 const [update,setUpdate]=useState(false),[help,setHelp]=useState(false);
 useEffect(()=>{
  let alive=true,firstVersion='';
  const suppressInstall=(event:Event)=>event.preventDefault();
  window.addEventListener('beforeinstallprompt',suppressInstall);
  async function version(){
   if(document.hidden||!navigator.onLine)return;
   try{
    const response=await fetch('/app-version.json',{cache:'no-store'});
    if(!response.ok)return;
    const result:{version:string}=await response.json();
    if(!alive)return;
    if(!firstVersion)firstVersion=result.version;
    else if(firstVersion!==result.version)setUpdate(true);
   }catch{}
  }
  version();const timer=setInterval(version,60000);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('beforeinstallprompt',suppressInstall)};
 },[]);
 return <>{update&&<button className="secondary update-button" onClick={()=>{if(document.querySelector('[data-slot="dialog-content"]')){setHelp(true);return}window.location.reload()}}><RefreshCw size={15}/>Update available</button>}<Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>Website update available</DialogTitle><DialogDescription>Save or close any open form, then click Update available to reload the latest website.</DialogDescription></DialogHeader></DialogContent></Dialog></>;
}
