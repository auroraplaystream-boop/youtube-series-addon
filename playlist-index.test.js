import test from 'node:test';import assert from 'node:assert/strict';import {seriesPlaylists,loadPlaylistVideos} from './playlist-index.js';
test('the user playlist belongs only to the original Goosebumps',()=>{assert.equal(seriesPlaylists.tt0111987[0],'PLeCQEaE8Lu8VsKTpQFWzK4eyFwuRtaG8I');assert.equal(seriesPlaylists.tt17720272,undefined)});
test('playlist pagination retrieves every video once and preserves actual video details',async()=>{
 const calls=[];const videos=await loadPlaylistVideos(async(endpoint,args)=>{calls.push([endpoint,args]);if(endpoint==='playlistItems')return args.pageToken?{items:[{contentDetails:{videoId:'4ms9WXDSAWE'}},{contentDetails:{videoId:'DGTVjGmt-zs'}}]}:{items:[{contentDetails:{videoId:'4ms9WXDSAWE'}},{contentDetails:{videoId:'invalid'}}],nextPageToken:'second'};return {items:args.id.split(',').map(id=>({id,status:{privacyStatus:'public'}}))}},'playlist');
 assert.deepEqual(videos.map(v=>v.id),['4ms9WXDSAWE','DGTVjGmt-zs']);assert.equal(calls[1][1].pageToken,'second');assert.equal(calls.length,3);
});
test('failed or looping playlist responses never become a false complete index',async()=>{await assert.rejects(loadPlaylistVideos(async()=>({items:[],nextPageToken:'same'}),'playlist'),/repetida/);await assert.rejects(loadPlaylistVideos(async()=>{throw Error('offline')},'playlist'),/offline/)});
