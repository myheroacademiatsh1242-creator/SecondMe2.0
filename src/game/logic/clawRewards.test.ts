import test from 'node:test';
import assert from 'node:assert/strict';
import {Campaign} from './campaign.ts';
import {SHOP_ITEMS} from './shopItems.ts';

test('each toy grants the same main prize at every tier boundary',()=>{
  for(const kind of [0,1,2,3]){
    for(const [roll,type] of [[0,'skin'],[0.00499,'skin'],[0.005,'outfit'],[0.05499,'outfit'],[0.055,'item'],[0.999,'item']] as const){
      const campaign=new Campaign();
      const draws=[roll,0,0,.99];
      assert.equal(campaign.claimClawPrize(kind,()=>draws.shift()??.99)?.main.type,type);
    }
  }
});

test('each bonus accompanies a banked shop item',()=>{
  for(const [roll,type] of [[0,'coins'],[.05,'rune'],[.10,'tickets'],[.15,'crystals'],[.20,undefined]] as const){
    const campaign=new Campaign();
    const draws=[.6,0,0,roll,0];
    const prize=campaign.claimClawPrize(3,()=>draws.shift()??0);
    assert.deepEqual(prize?.main,{type:'item',id:'manaSmall'});
    assert.equal(campaign.shopStock('manaSmall'),1);
    assert.equal(prize?.bonus?.type,type);
  }
});

test('a full tier rolls from available stock, and a full inventory grants a crystal',()=>{
  const campaign=new Campaign();
  for(const item of SHOP_ITEMS){
    if(item.id==='time')campaign.timeItems=item.cap;
    else if(item.id==='ring')campaign.limitRings=item.cap;
    else if(item.id!=='revive')campaign.supplies[item.id]=item.cap;
  }
  assert.deepEqual(campaign.claimClawPrize(2,()=>.6)?.main,{type:'item',id:'revive'});
  campaign.supplies.revive=10;
  const before=campaign.chestKeys;
  assert.deepEqual(campaign.claimClawPrize(0,()=>.6)?.main,{type:'crystals',quantity:1});
  assert.equal(campaign.chestKeys,before+1);
});
