/** Falha de rede, HTTP ou decodificação do Opus tenta o MP3 já existente. */
export async function carregarAudioArquivo<T>(nome: string, o: {
 opus: boolean; url: (arquivo:string)=>string; decodificar:(bytes:ArrayBuffer)=>Promise<T>
 buscar?: typeof fetch; prazo?: number
}): Promise<T | null> {
 const buscar=o.buscar??fetch
 for(const ext of (o.opus?['ogg','mp3']:['mp3'])){
  const controle=new AbortController()
  const prazo=setTimeout(()=>controle.abort(),o.prazo??8000)
  try {
   const r=await buscar(o.url(`${nome}.${ext}`),{signal:controle.signal})
   if(!r.ok)throw new Error(String(r.status))
   const bytes=await r.arrayBuffer()
   return await o.decodificar(bytes)
  } catch { /* o próximo formato cobre navegador antigo, arquivo ausente e falha de decode */ }
  finally {clearTimeout(prazo)}
 }
 return null
}
