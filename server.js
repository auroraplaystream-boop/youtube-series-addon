import express from 'express';
const app=express();
const PORT=Number(process.env.PORT||7000);
const KEY=process.env.YOUTUBE_API_KEY;
const TTL=10*60*1000;
const cache=new Map();
const manifest={id:'community.youtube.series.ptbr',version:'1.0.0',name:'YouTube Series PT-BR',description:'Busca episódios publicados no YouTube para Stremio e Luna.',resources:[{name:'stream',types:['series'],idPrefixes:['tt','ytseries:']}],types:['series'],catalogs:[],behaviorHints:{configurable:false}};
const bad=/\b(trailer|teaser|review|react|reaction|resumo|recap|análise|analise|explicado|shorts|corte|edit|preview)\b/i;
const clean=s=>String(s||'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
async function youtube(endpoint,params){if(!KEY)throw Error('Configure YOUTUBE_API_KEY');const url=new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);for(const [k,v] of Object.entries({...params,key:KEY}))url.searchParams.set(k,String(v));const r=await fetch(url);if(!r.ok)throw Error(`YouTube API ${r.status}: ${(await r.text()).slice(0,250)}`);return r.json();}
async function titleFor(imdb){if(imdb.startsWith('ytseries:'))return decodeURIComponent(imdb.slice(9));const r=await fetch(`https://v3-cinemeta.strem.io/meta/series/${encodeURIComponent(imdb)}.json`);if(!r.ok)throw Error('Cinemeta indisponível');const j=await r.json();return j.meta?.name||imdb;}
function parseId(raw){const parts=raw.split(':');if(parts[0]==='ytseries')return {base:`ytseries:${parts.slice(1,-2).join(':')}`,season:Number(parts.at(-2)),episode:Number(parts.at(-1))};return {base:parts[0],season:Number(parts[1]),episode:Number(parts[2])};}
function durationSeconds(iso=''){const m=iso.match(/P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/);return m?Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0):0;}
async function searchEpisodes(title,season,episode){const key=JSON.stringify([title,season,episode]);const cached=cache.get(key);if(cached&&Date.now()-cached.time<TTL)return cached.data;
const q=`${clean(title)} temporada ${season} episódio ${episode} completo português dublado`;
const result=await youtube('search',{part:'snippet',q,type:'video',maxResults:25,videoEmbeddable:'true',safeSearch:'moderate',relevanceLanguage:'pt'});
const ids=result.items.map(x=>x.id?.videoId).filter(Boolean);if(!ids.length)return [];
const details=await youtube('videos',{part:'contentDetails,status,snippet',id:ids.join(',')});
const normalized=details.items.map(x=>{const seconds=durationSeconds(x.contentDetails?.duration);const text=`${x.snippet?.title||''} ${x.snippet?.description||''}`;let score=0;if(new RegExp(clean(title).split(' ').filter(Boolean).join('.*'),'i').test(text))score+=4;if(/\b(completo|full episode|episódio completo)\b/i.test(text))score+=3;if(/\b(dublado|português|portugues|pt-br|legendado)\b/i.test(text))score+=2;if(seconds>=900)score+=3;if(seconds<600)score-=6;if(bad.test(x.snippet?.title||''))score-=12;const ep=String(episode).padStart(2,'0'),se=String(season).padStart(2,'0');if(new RegExp(`(?:s${se}e${ep}|${season}x${ep}|epis[oó]dio\\s*0?${episode}\\b|ep\\.?\\s*0?${episode}\\b)`,'i').test(text))score+=5;return {id:x.id,title:x.snippet?.title||'',channel:x.snippet?.channelTitle||'',seconds,score,embeddable:x.status?.embeddable!==false,privacy:x.status?.privacyStatus};}).filter(x=>x.privacy==='public'&&x.embeddable&&x.score>=7).sort((a,b)=>b.score-a.score).slice(0,12);
cache.set(key,{time:Date.now(),data:normalized});return normalized;}
async function find(raw){const {base,season,episode}=parseId(raw);if(!base||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)throw Error('ID de episódio inválido');return {title:await titleFor(base),season,episode};}
app.get('/manifest.json',(_,res)=>res.json(manifest));
app.get('/stream/series/:id.json',async(req,res)=>{try{const {title,season,episode}=await find(req.params.id);const videos=await searchEpisodes(title,season,episode);res.json({streams:videos.map(v=>({name:'YouTube PT-BR',title:`${v.title}\n${v.channel} • ${Math.round(v.seconds/60)} min`,url:`https://www.youtube.com/watch?v=${v.id}`,externalUrl:`https://www.youtube.com/watch?v=${v.id}`}))});}catch(e){console.error(e);res.json({streams:[]});}});
app.get('/api/luna/search',async(req,res)=>{try{const title=String(req.query.title||'').slice(0,150);const season=Number(req.query.season),episode=Number(req.query.episode);if(!title||!Number.isInteger(season)||!Number.isInteger(episode)||season<0||episode<1)return res.status(400).json({error:'Informe title, season e episode válidos'});const videos=await searchEpisodes(title,season,episode);res.json({title,season,episode,results:videos.map(v=>({...v,url:`https://www.youtube.com/watch?v=${v.id}`,embedUrl:`https://www.youtube.com/embed/${v.id}`}))});}catch(e){res.status(502).json({error:e.message});}});
app.get('/health',(_,res)=>res.json({ok:true,youtubeConfigured:!!KEY}));
app.listen(PORT,'0.0.0.0',()=>console.log(`YouTube Series addon on ${PORT}`));
