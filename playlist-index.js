// Curated playlists are scoped to an exact work, never a same-name remake.
export const seriesPlaylists={tt0111987:['PLeCQEaE8Lu8VsKTpQFWzK4eyFwuRtaG8I']};
export function playlistVideoIds(items){return [...new Set(items.map(item=>item.contentDetails?.videoId).filter(id=>/^[\w-]{11}$/.test(id||'')))];}
export async function loadPlaylistVideos(request,playlistId){
 let pageToken='',ids=[];const seen=new Set();
 do{
  const page=await request('playlistItems',{part:'contentDetails',playlistId,maxResults:50,...(pageToken?{pageToken}:{})});
  ids.push(...playlistVideoIds(page.items||[]));pageToken=page.nextPageToken||'';
  if(pageToken&&seen.has(pageToken))throw Error('Paginação repetida na playlist.');seen.add(pageToken);
 }while(pageToken&&seen.size<20);
 if(pageToken)throw Error('Playlist excedeu o limite de páginas.');
 ids=[...new Set(ids)];const videos=[];
 for(let offset=0;offset<ids.length;offset+=50){const result=await request('videos',{part:'contentDetails,status,snippet,liveStreamingDetails',id:ids.slice(offset,offset+50).join(',')});videos.push(...(result.items||[]));}
 return videos;
}
