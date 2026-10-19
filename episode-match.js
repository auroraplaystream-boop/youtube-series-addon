const tokens=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const bad=/\b(trailer|teaser|review|react|reaction|resumo|recap|analise|explicado|shorts|corte|edit|preview|ao vivo|live)\b/i;
export function durationSeconds(iso=''){const m=/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);return m?Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0):0}
export function episodeMatches(title,season,episode){
 const text=tokens(title).join(' ');
 const pairs=[...text.matchAll(/\bs\s*(\d+)\s*e\s*(\d+)\b|\b(\d+)x(\d+)\b|\b(?:temporada|season|temp|t)\s*(\d+)\s*(?:episodio|episode|ep|e)\s*(\d+)\b/g)];
 const seasons=[...text.matchAll(/\b(?:temporada|season|temp|t)\s*(\d+)\b/g)].map(m=>Number(m[1]));
 const episodes=[...text.matchAll(/\b(?:episodio|episode|ep)\s*(\d+)\b/g)].map(m=>Number(m[1]));
 if(pairs.some(m=>Number(m[1]??m[3]??m[5])!==season||Number(m[2]??m[4]??m[6])!==episode)||seasons.some(s=>s!==season)||episodes.some(e=>e!==episode))return false;
 return pairs.length>0||seasons.includes(season)&&episodes.includes(episode);
}
export function rankEpisode(video,title,season,episode){
 const snippet=video.snippet||{},name=snippet.title||'',seconds=durationSeconds(video.contentDetails?.duration);
 if(!/^[\w-]{11}$/.test(video.id||'')||video.status?.privacyStatus!=='public'||video.status?.embeddable!==true||snippet.liveBroadcastContent!=='none'||video.liveStreamingDetails||seconds<600||bad.test(tokens(name).join(' '))||!episodeMatches(name,season,episode))return null;
 const wanted=tokens(title).filter(w=>!['the','a','o','as','os','de','do','da','and'].includes(w)),actual=tokens(name);
 if(!wanted.length||!wanted.every(w=>actual.includes(w)))return null;
 // Subtitle language is never evidence of a Portuguese audio track.
 const language=snippet.defaultAudioLanguage||'';
 const portugueseAudio=/^pt(?:-|$)/i.test(language)||!language&&(/\bdublado\b|\baudio\s+(?:em\s+)?portugues\b/i.test(tokens(name).join(' '))||/\bpt br\b/i.test(tokens(name).join(' '))&&!/legendad|subtitles?|legendas?/i.test(name));
 return {id:video.id,title:name,channel:snippet.channelTitle||'',seconds,score:portugueseAudio?20:10,portugueseAudio,embeddable:true,privacy:'public'};
}
