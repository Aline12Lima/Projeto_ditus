"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
export function ProductImage({ src, alt, fallback="🍽️", className="dish-photo" }:{src?:string|null;alt:string;fallback?:string;className?:string}) {
 const [broken,setBroken]=useState(false);
 return <div className={className}>{src&&!broken?<img src={src} alt={alt} loading="lazy" onError={()=>setBroken(true)}/>:<span role="img" aria-label={`Imagem indisponível: ${alt}`}>{fallback}</span>}</div>;
}
