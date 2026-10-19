const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const startYear=value=>Number(/\b(?:19|20)\d{2}\b/.exec(String(value||''))?.[0])||0;
export function sameTitleYears(meta,rows){return [...new Set([meta,...rows].filter(row=>row.type==='series'&&normalized(row.name)===normalized(meta.name)).map(row=>startYear(row.releaseInfo)).filter(Boolean))].sort((a,b)=>a-b)}
export function sourceReleaseEvidence(video,context={}){
 const title=video.snippet?.title||'',description=video.snippet?.description||'';
 const titleYears=[...title.matchAll(/(?:^|[\s([_-])((?:19|20)\d{2})(?=$|[\s)\]_-])/g)].map(m=>Number(m[1]));
 if(new Set(titleYears).size===1)return {year:titleYears[0],basis:'title'};
 const descriptionYears=[];
 for(const line of description.split('\n')){
  if(/copyright|direitos|©|todos os direitos|reboot|remake|nova vers[aã]o|vers[aã]o original|basead[oa]|inspirad[oa]|original de/i.test(line))continue;
  const matches=[...line.matchAll(/(?:temporada|seriado|s[eé]rie|series|lan[çc]amento|estreou|ano)[^\n.!?]{0,45}?\b((?:19|20)\d{2})\b/gi)];
  descriptionYears.push(...matches.map(m=>Number(m[1])));
 }
 if(new Set(descriptionYears).size===1)return {year:descriptionYears[0],basis:'description'};
 const published=startYear(video.snippet?.publishedAt),years=context.versionYears||[];
 // Upload date cannot itself become a release year. It can exclude later remakes
 // only when independent series metadata leaves exactly one possible version.
 const possible=years.filter(year=>year<=published);
 if(years.length>1&&possible.length===1&&possible[0]===context.releaseYear)return {year:possible[0],basis:'upload-before-remake'};
 return null;
}
