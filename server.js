import {rankEpisode} from './episode-match.js';
import express from 'express';
const app=express();
const PORT=Number(process.env.PORT||7000);
const KEY=process.env.YOUTUBE_API_KEY;
const TTL=10*60*1000;
const allowedOrigin=new Set(['https://auroraplaystream-boop.github.io','https://lunaplaystream.pages.dev']);
app.use((req,res,next)=>{if(allowedOrigin.has(req.headers.origin)){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin')}next()});
const cache=new Map();
const manifest={id:'community.youtube.series.ptbr',version:'1.1.0',name:'YouTube Series PT-BR',description:'Busca episódios publicados no YouTube para Stremio e Luna.',resources:[{name:'stream',types:['series'],idPrefixes:['tt','ytseries:']}],types:['series'],catalogs:[],behaviorHints:{configurable:false}};
const bad=/\b(trailer|teaser|review|react|reaction|resumo|recap|análise|analise|explicado|shorts|corte|edit|preview)\b/i;
const clean=s=>String(s||'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
async function youtube(endpoint,params){if(!KEY)throw Error('Configure YOUTUBE_API_KEY');const url=new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);for(const [k,v] of Object.entries({...params,key:KEY}))url.searchParams.set(k,String(v));const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('YouTube API indisponível ('+r.status+').');return r.json();}
async function titleFor(imdb){if(imdb.startsWith('ytseries:'))return decodeURIComponent(imdb.slice(9));const r=await fetch(`https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(imdb)}.json`);if(!r.ok)throw Error('Cinemeta indisponível');const j=await r.json();return j.meta?.name||imdb;}
function parseId(raw){const parts=raw.split(':');if(parts[0]==='ytseries')return {base:`ytseries:${parts.slice(1,-2).join(':')}`,season:Number(parts.at(-2)),episode:Number(parts.at(-1))};return {base:parts[0],season:Number(parts[1]),episode:Number(parts[2])};}
function durationSeconds(iso=''){const m=iso.match(/P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/);return m?Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0):0;}
async function searchEpisodes(title,season,episode){const key=JSON.stringify([title,season,episode]);const cached=cache.get(key);if(cached&&Date.now()-cached.time<TTL)return cached.data;
const q=`${clean(title)} temporada ${season} episódio ${episode} completo português dublado`;
const result=await youtube('search',{part:'snippet',q,type:'video',maxResults:25,videoEmbeddable:'true',safeSearch:'moderate',relevanceLanguage:'pt'});
const ids=result.items.map(x=>x.id?.videoId).filter(Boolean);if(!ids.length)return [];
const details=await youtube('videos',{part:'contentDetails,status,snippet,liveStreamingDetails',id:ids.join(',')});
const normalized=(details.items||[]).map(x=>rankEpisode(x,title,season,episode)).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12);
if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),data:normalized});return normalized;}
async function find(raw){const {base,season,episode}=parseId(raw);if(!base||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)throw Error('ID de episódio inválido');return {title:await titleFor(base),season,episode};}
app.get('/manifest.json',(_,res)=>res.json(manifest));
app.get('/stream/series/:id.json',async(req,res)=>{try{const {title,season,episode}=await find(req.params.id);const videos=await searchEpisodes(title,season,episode);res.json({streams:videos.map(v=>({name:v.portugueseAudio?'YouTube · PT-BR':'YouTube',title:`${v.title}\n${v.channel} • ${Math.round(v.seconds/60)} min`,ytId:v.id}))});}catch(e){console.error(e);res.json({streams:[]});}});
app.get('/api/luna/search',async(req,res)=>{try{const title=String(req.query.title||'').slice(0,150);const season=Number(req.query.season),episode=Number(req.query.episode);if(!title||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)return res.status(400).json({error:'Informe title, season e episode válidos'});const videos=await searchEpisodes(title,season,episode);res.json({title,season,episode,results:videos.map(v=>({...v,url:`https://www.youtube.com/watch?v=${v.id}`,embedUrl:`https://www.youtube.com/embed/${v.id}`}))});}catch(e){res.status(502).json({error:e.message});}});
app.get('/health',(_,res)=>res.json({ok:true,youtubeConfigured:!!KEY}));
app.listen(PORT,'0.0.0.0',()=>console.log(`YouTube Series addon on ${PORT}`));
