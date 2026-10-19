import test from 'node:test';import assert from 'node:assert/strict';import {rankEpisode,episodeMatches,combinedEpisodes} from './episode-match.js';
test('three joined episodes retain the full range for automatic next episode',()=>{assert.deepEqual(combinedEpisodes('Goosebumps T03E19/20/21 - Chilogia'),[{season:3,first:19,last:21}])});
const sample={id:'Hx6h8_d1Qts',snippet:{title:'MasterChef Profissionais Temporada 1 Episódio 2 completo dublado',liveBroadcastContent:'none'},status:{privacyStatus:'public',embeddable:true},contentDetails:{duration:'PT40M'}};
test('an exact episode remains playable without an external redirect',()=>{assert.equal(rankEpisode(sample,'MasterChef Profissionais',1,2)?.portugueseAudio,true)});
test('wrong seasons and episodes cannot score their way into results',()=>{for(const name of ['MasterChef Profissionais S02E02 completo','MasterChef Profissionais S01E03 completo','MasterChef Profissionais episódio 2 completo'])assert.equal(rankEpisode({...sample,snippet:{...sample.snippet,title:name}},'MasterChef Profissionais',1,2),null)});
test('live, upcoming, private, blocked embeds and short videos never enter playback results',()=>{for(const video of [{...sample,liveStreamingDetails:{}},{...sample,snippet:{...sample.snippet,liveBroadcastContent:'live'}},{...sample,status:{privacyStatus:'private',embeddable:true}},{...sample,status:{privacyStatus:'public',embeddable:false}},{...sample,contentDetails:{duration:'PT1M'}}])assert.equal(rankEpisode(video,'MasterChef Profissionais',1,2),null)});
test('a matching episode in a description cannot rescue a wrong video title',()=>{assert.equal(rankEpisode({...sample,snippet:{...sample.snippet,title:'Outra série S01E02',description:sample.snippet.title}},'MasterChef Profissionais',1,2),null);assert.equal(episodeMatches('Show S01E02',1,2),true)});
test('official titles with episode before abbreviated season remain recognized',()=>{assert.equal(episodeMatches('MASTERCHEF PROFISSIONAIS (04/10/2016) | PARTE 1 | EP 1 | TEMP 01',1,1),true);assert.equal(episodeMatches('MASTERCHEF PROFISSIONAIS | EP 1 | TEMP 02',1,1),false)});
test('Portuguese subtitles do not advertise Portuguese audio',()=>{assert.equal(rankEpisode({...sample,snippet:{...sample.snippet,title:'MasterChef Profissionais S01E02 legendado PT-BR'}},'MasterChef Profissionais',1,2).portugueseAudio,false)});

const oldGoosebumps={title:'Goosebumps',releaseYear:1995,versionYears:[1995,2023]};
test('incomplete pieces and an unverified remake cannot be offered as full episodes',()=>{
 const video={...sample,snippet:{...sample.snippet,title:'Goosebumps S02E01-02 - Parte 3 Dublado',description:'Série 1995'},contentDetails:{duration:'PT15M'}};
 assert.equal(rankEpisode(video,'Goosebumps',2,1,oldGoosebumps),null);
 assert.equal(rankEpisode({...video,snippet:{...video.snippet,title:'Goosebumps S02E01 dublado',description:''},contentDetails:{duration:'PT22M'}},'Goosebumps',2,1,oldGoosebumps),null);
});
test('Goosebumps keeps independently declared original-year proof for the Luna remake guard',()=>{
 const video={...sample,id:'4ms9WXDSAWE',snippet:{...sample.snippet,title:'Goosebumps: Histórias de Arrepiar T01E01/02 - A Máscara Maldita (Dublado)',description:'Episódio 1 e 2 da 1ª temporada (1995) do seriado Goosebumps.',publishedAt:'2022-12-28T00:00:00Z'}};
 const result=rankEpisode(video,'Goosebumps',1,1,oldGoosebumps);assert.equal(result.releaseYear,1995);assert.equal(result.portugueseAudio,true);assert.deepEqual(result.combinedEpisodes,{season:1,first:1,last:2});
 assert.equal(rankEpisode(video,'Goosebumps',1,2,oldGoosebumps),null,'a double episode must not claim to begin at its second half');
 assert.equal(rankEpisode({...video,snippet:{...video.snippet,title:'Goosebumps 2023 T01E01 dublado'}},'Goosebumps',1,1,oldGoosebumps),null);
});
test('compact T1.E1, ordinal seasons and reversed episode labels are supported without guessing missing seasons',()=>{
 for(const title of ['GOOSEBUMPS A MÁSCARA MALDITA PT. 1 (DUBLADO) - T1.E1','Goosebumps episódio 1 da 1ª temporada dublado','Goosebumps T01E01 dublado'])assert.equal(episodeMatches(title,1,1),true);
 for(const title of ['Goosebumps T02E01','Goosebumps T01E02','Goosebumps episódio 1','Goosebumps T01E01/02 T02E01'])assert.equal(episodeMatches(title,1,1),false);
});
