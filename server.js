import {rankEpisode} from './episode-match.js';
import {sameTitleYears,startYear} from './series-identity.js';
import express from 'express';
const app=express();
const PORT=Number(process.env.PORT||7000);
const KEY=process.env.YOUTUBE_API_KEY;
const TTL=10*60*1000;
const allowedOrigin=new Set(['https://auroraplaystream-boop.github.io','https://lunaplaystream.pages.dev']);
app.use((req,res,next)=>{if(allowedOrigin.has(req.headers.origin)){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin')}next()});
const cache=new Map(),pending=new Map(),metadataCache=new Map();
const manifest={id:'community.youtube.series.ptbr',version:'1.2.0',name:'YouTube Series PT-BR',description:'Busca episódios publicados no YouTube para Stremio e Luna.',resources:[{name:'stream',types:['series'],idPrefixes:['tt','ytseries:']}],types:['series'],catalogs:[],behaviorHints:{configurable:false}};
const clean=s=>String(s||'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
async function youtube(endpoint,params){if(!KEY)throw Error('Configure YOUTUBE_API_KEY');const url=new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);for(const [k,v] of Object.entries({...params,key:KEY}))url.searchParams.set(k,String(v));const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('YouTube API indisponível ('+r.status+').');return r.json();}
async function titleFor(imdb){
 if(imdb.startsWith('ytseries:'))return {title:decodeURIComponent(imdb.slice(9))};
 if(!/^tt\d+$/.test(imdb))throw Error('Identificador de série inválido.');
 const cached=metadataCache.get(imdb);if(cached&&Date.now()-cached.time<3600000)return cached.data;
 const r=await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdb}.json`,{signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Cinemeta indisponível');const j=await r.json(),meta=j.meta;
 if(meta?.id!==imdb||!meta.name)throw Error('A série não foi identificada.');
 let rows=[];try{const response=await fetch('https://v3-cinemeta.strem.io/catalog/series/top/search='+encodeURIComponent(meta.name)+'.json',{signal:AbortSignal.timeout(4000)});if(response.ok)rows=(await response.json()).metas||[]}catch{}
 const data={title:meta.name,releaseYear:startYear(meta.releaseInfo),versionYears:sameTitleYears(meta,rows)};
 if(metadataCache.size>=128)metadataCache.delete(metadataCache.keys().next().value);metadataCache.set(imdb,{time:Date.now(),data});return data;
}
function parseId(raw){const parts=raw.split(':');if(parts[0]==='ytseries')return {base:`ytseries:${parts.slice(1,-2).join(':')}`,season:Number(parts.at(-2)),episode:Number(parts.at(-1))};return {base:parts[0],season:Number(parts[1]),episode:Number(parts[2])};}
async function searchEpisodes(title,season,episode,context={}){
 const key=JSON.stringify([title,season,episode,context.releaseYear,context.versionYears]);const cached=cache.get(key);if(cached&&Date.now()-cached.time<TTL)return cached.data;if(pending.has(key))return pending.get(key);
 const task=(async()=>{
  const queries=[`${clean(title)} temporada ${season} episódio ${episode} completo português dublado`,`${clean(title)} S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')} dublado`];
  let normalized=[];
  for(const q of queries){
   const result=await youtube('search',{part:'snippet',q,type:'video',maxResults:25,videoEmbeddable:'true',safeSearch:'moderate',relevanceLanguage:'pt'});
   const ids=(result.items||[]).map(x=>x.id?.videoId).filter(Boolean);if(!ids.length)continue;
   const details=await youtube('videos',{part:'contentDetails,status,snippet,liveStreamingDetails',id:ids.join(',')});
   const found=(details.items||[]).map(x=>rankEpisode(x,title,season,episode,context)).filter(Boolean);
   normalized=[...new Map([...normalized,...found].map(v=>[v.id,v])).values()].sort((a,b)=>b.score-a.score).slice(0,12);
   if(normalized.some(v=>v.portugueseAudio))break;
  }
  if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),data:normalized});return normalized;
 })();pending.set(key,task);try{return await task}finally{pending.delete(key)}
}
async function find(raw){const {base,season,episode}=parseId(raw);if(!base||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)throw Error('ID de episódio inválido');return {...await titleFor(base),season,episode};}
app.get('/manifest.json',(_,res)=>res.json(manifest));
app.get('/stream/series/:id.json',async(req,res)=>{try{const context=await find(req.params.id),{title,season,episode}=context;const videos=await searchEpisodes(title,season,episode,context);res.json({streams:videos.map(v=>({name:v.portugueseAudio?'YouTube · PT-BR':'YouTube',title:`${v.title}${v.releaseYear?' ['+v.releaseYear+']':''}\n${v.channel} • ${Math.round(v.seconds/60)} min${v.combinedEpisodes?' • Episódios '+v.combinedEpisodes.first+'–'+v.combinedEpisodes.last+' no mesmo vídeo':''}`,ytId:v.id,...(v.combinedEpisodes?{youtubeEpisodeRange:v.combinedEpisodes}:{})}))});}catch(e){console.error(e.message);res.status(502).json({streams:[],error:'Não foi possível consultar o YouTube agora. Tente novamente em instantes.'});}});
app.get('/api/luna/search',async(req,res)=>{try{const title=String(req.query.title||'').slice(0,150);const season=Number(req.query.season),episode=Number(req.query.episode);if(!title||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)return res.status(400).json({error:'Informe title, season e episode válidos'});const videos=await searchEpisodes(title,season,episode);res.json({title,season,episode,results:videos.map(v=>({...v,url:`https://www.youtube.com/watch?v=${v.id}`,embedUrl:`https://www.youtube.com/embed/${v.id}`}))});}catch(e){res.status(502).json({error:e.message});}});
app.get('/health',(_,res)=>res.json({ok:true,youtubeConfigured:!!KEY}));
app.listen(PORT,'0.0.0.0',()=>console.log(`YouTube Series addon on ${PORT}`));
