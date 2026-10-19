import {sourceReleaseEvidence} from './series-identity.js';
const tokens=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/(\d+)[ªº]/g,'$1').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const bad=/\b(trailer|teaser|review|react|reaction|resumo|recap|analise|explicado|shorts|corte|edit|preview|ao vivo|live)\b/i;
export function durationSeconds(iso=''){const m=/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);return m?Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0):0}
export function episodeMatches(title,season,episode){
 const ranges=combinedEpisodes(title);
 if(ranges.some(range=>range.season!==season||range.first!==episode))return false;
 const text=tokens(title).join(' ');
 const pairs=[...text.matchAll(/\b(?:s|t)\s*(\d+)\s*e\s*(\d+)\b|\b(\d+)x(\d+)\b|\b(?:temporada|season|temp|t)\s*(\d+)\s*(?:episodio|episode|ep|e)\s*(\d+)\b/g)];
 const seasons=[...text.matchAll(/\b(?:temporada|season|temp|t)\s*(\d+)\b|\b(\d+)\s*(?:temporada|season)\b/g)].map(m=>Number(m[1]??m[2]));
 const episodes=[...text.matchAll(/\b(?:episodio|episode|ep)\s*(\d+)\b/g)].map(m=>Number(m[1]));
 if(pairs.some(m=>Number(m[1]??m[3]??m[5])!==season||Number(m[2]??m[4]??m[6])!==episode)||seasons.some(s=>s!==season)||episodes.some(e=>e!==episode))return false;
 return pairs.length>0||seasons.includes(season)&&episodes.includes(episode);
}
export function combinedEpisodes(title){return [...String(title||'').matchAll(/\b(?:s|t)(\d{1,2})[ ._-]*e(\d{1,3})((?:\s*(?:\/|-)\s*e?\d{1,3})+)(?!\d)/gi)].map(m=>({season:Number(m[1]),first:Number(m[2]),last:Number(m[3].match(/\d+/g).at(-1))})).filter(range=>range.last>range.first&&range.last-range.first<10)}
export function rankEpisode(video,title,season,episode,context={}){
 const snippet=video.snippet||{},name=snippet.title||'',seconds=durationSeconds(video.contentDetails?.duration);
 if(!/^[\w-]{11}$/.test(video.id||'')||video.status?.privacyStatus!=='public'||video.status?.embeddable!==true||snippet.liveBroadcastContent!=='none'||video.liveStreamingDetails||seconds<600||bad.test(tokens(name).join(' '))||!episodeMatches(name,season,episode))return null;
 const wanted=tokens(title).filter(w=>!['the','a','o','as','os','de','do','da','and'].includes(w)),actual=tokens(name);
 if(!wanted.length||!wanted.every(w=>actual.includes(w)))return null;
 const declared=sourceReleaseEvidence(video,context);
 // Original-run episode descriptions date later seasons 1996–1998. Those
 // are episode years, not the release year of another same-name series.
 const curated=context.curatedReleaseYear===1995&&context.releaseYear===1995&&snippet.channelTitle==='Séries da TV';
 const evidence=curated&&(!declared||declared.year>=1995&&declared.year<=1998)
  ?{year:1995,basis:'curated-playlist'}:declared;
 if(context.versionYears?.length>1&&(!evidence||evidence.year!==context.releaseYear))return null;
 // Subtitle language is never evidence of a Portuguese audio track.
 const language=snippet.defaultAudioLanguage||'';
 const portugueseAudio=/^pt(?:-|$)/i.test(language)||!language&&(/\bdublado\b|\baudio\s+(?:em\s+)?portugues\b/i.test(tokens(name).join(' '))||/\bpt br\b/i.test(tokens(name).join(' '))&&!/legendad|subtitles?|legendas?/i.test(name));
 const combined=combinedEpisodes(name)[0];
 if(/\b(?:parte|part|pt)\s*\.?\s*\d+/i.test(name)&&(seconds<1080||combined&&seconds<(combined.last-combined.first+1)*1080))return null;
 return {id:video.id,title:name,channel:snippet.channelTitle||'',seconds,score:(portugueseAudio?20:10)+(combined?0:2),portugueseAudio,embeddable:true,privacy:'public',...(evidence&&(!context.releaseYear||evidence.year===context.releaseYear)?{releaseYear:evidence.year,releaseEvidence:evidence.basis}:{}),...(combined?{combinedEpisodes:combined}:{})};
}
