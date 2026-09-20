import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow
    document.body.style.overflow='hidden';ref.current?.focus()
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();closeRef.current()}
      if(e.key==='Tab'){
        const controls=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')
        if(!controls?.length){e.preventDefault();return}
        const first=controls[0],last=controls[controls.length-1]
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first.focus()}
      }
    }
    document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}
  },[])
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={ref}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</motion.div></div>
}
