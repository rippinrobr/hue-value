// Paint data for W&N Artisan and Cobra Artist water-mixable oils.
//
// Each tube is described by the pigments on the manufacturer's chart, with rough proportions.
// Each pigment has an approximate masstone reflectance (linear RGB, full-strength film) and a
// tinting strength relative to Titanium White. The app mixes these with a Kubelka–Munk model.
// The numbers are estimates for planning; brands vary, so test mixes on a card.
(function(){
const P={
  // whites
  PW6:{rgb:[.90,.90,.885],s:1},  PW4:{rgb:[.88,.88,.87],s:.5},  PW7:{rgb:[.86,.86,.85],s:.35},
  // yellows and oranges
  PY3:{rgb:[.78,.80,.04],s:.6},  PY35:{rgb:[.80,.62,.03],s:.8},  PY65:{rgb:[.80,.55,.02],s:.7},
  PY154:{rgb:[.80,.64,.03],s:.8},PY184:{rgb:[.82,.80,.05],s:.6},PY150:{rgb:[.55,.40,.02],s:.6},
  PY110:{rgb:[.45,.22,.012],s:.7},PY128:{rgb:[.62,.52,.02],s:.6},PY129:{rgb:[.15,.18,.02],s:.7},
  PY42:{rgb:[.40,.24,.04],s:.5}, PY43:{rgb:[.36,.22,.05],s:.5}, PBr24:{rgb:[.62,.45,.12],s:.45},
  PO20:{rgb:[.62,.20,.015],s:.9},PO43:{rgb:[.47,.11,.018],s:1},  PO73:{rgb:[.55,.10,.02],s:1},
  PO64:{rgb:[.55,.14,.02],s:.9}, PO71:{rgb:[.45,.08,.02],s:1},   PO36:{rgb:[.42,.12,.02],s:.9},
  // reds, pinks, violets
  PR108:{rgb:[.45,.045,.03],s:.9},PR170:{rgb:[.42,.04,.035],s:1},PR188:{rgb:[.48,.07,.03],s:1},
  PR254:{rgb:[.44,.04,.033],s:1.1},PR255:{rgb:[.50,.07,.03],s:1},PR209:{rgb:[.30,.02,.05],s:1},
  PR207:{rgb:[.22,.02,.04],s:.9},PR176:{rgb:[.30,.02,.05],s:.9},PR264:{rgb:[.15,.012,.02],s:1.2},
  PR179:{rgb:[.08,.01,.012],s:1.2},PR202:{rgb:[.30,.03,.12],s:1},PR122:{rgb:[.35,.03,.20],s:1},
  PV19:{rgb:[.25,.02,.10],s:1},  PV23:{rgb:[.03,.015,.06],s:1.6},PV15:{rgb:[.10,.06,.25],s:.5},
  PV55:{rgb:[.12,.03,.15],s:1},  PR290:{rgb:[.12,.03,.02],s:.8},
  // earths
  PR101:{rgb:[.16,.05,.022],s:.6},PR101L:{rgb:[.24,.07,.03],s:.6},PR101T:{rgb:[.12,.035,.015],s:.7},
  PBr7R:{rgb:[.058,.046,.026],s:.75},PBr7B:{rgb:[.07,.036,.02],s:.85},PBr7S:{rgb:[.25,.13,.03],s:.5},
  PBr25:{rgb:[.10,.04,.015],s:.8},
  // blues
  PB29:{rgb:[.04,.03,.15],s:.6}, PB15:{rgb:[.012,.022,.065],s:1.7},PB27:{rgb:[.012,.02,.04],s:1.6},
  PB28:{rgb:[.03,.08,.35],s:.4}, PB35:{rgb:[.06,.25,.40],s:.4}, PB36:{rgb:[.04,.25,.35],s:.5},
  PB60:{rgb:[.02,.02,.08],s:1.2},
  // greens
  PG7:{rgb:[.012,.06,.045],s:1.5},PG36:{rgb:[.02,.10,.05],s:1.4},PG17:{rgb:[.10,.18,.07],s:.5},
  // blacks
  PBk9:{rgb:[.032,.031,.033],s:1},PBk6:{rgb:[.026,.026,.027],s:1.5},PBk11:{rgb:[.03,.03,.03],s:1.2},
  PBk31:{rgb:[.025,.035,.028],s:1.2}
};
const ks=r=>(1-r)*(1-r)/(2*r), rk=k=>1+k-Math.sqrt(k*k+2*k);
function blend(recipe){
  let W=0,S=0;const K=[0,0,0];
  for(const [code,w] of recipe){const p=P[code];if(!p)throw new Error('pigment '+code);
    const e=w*p.s;W+=e;S+=w*p.s;for(let i=0;i<3;i++)K[i]+=e*ks(p.rgb[i]);}
  const tw=recipe.reduce((a,[,w])=>a+w,0);
  return {rgb:K.map(k=>rk(k/W)),s:S/tw};
}
// [name, family, pigments shown on the chart, recipe [[pigment, parts]...], extra]
// family: yellow, orange, red, pink, violet, blue, green, earth, gray
const ARTISAN=[
 ['Lemon Yellow','yellow','PY3',[['PY3',1]]],
 ['Cadmium Yellow Pale Hue','yellow','PY3, PY65',[['PY3',1],['PY65',1]]],
 ['Cadmium Yellow Light','yellow','PY35',[['PY35',1]]],
 ['Cadmium Yellow Hue','yellow','PY65',[['PY65',1]]],
 ['Cadmium Yellow Deep Hue','yellow','PO43, PY65',[['PY65',3],['PO43',1]]],
 ['Naples Yellow Hue','yellow','PR101, PW6, PY42',[['PW6',4],['PY42',2],['PR101L',.3]]],
 ['Yellow Ochre','earth','PY42',[['PY42',1]]],
 ['Cadmium Orange Hue','orange','PO43',null,{id:'orange',fav:1,rgb:[0.470,0.110,0.018],s:1.0,near:'red',comp:'blue',note:'A transparent orange that reaches a middle value.'}],
 ['Cadmium Red Light','red','PR108',[['PR108',1]]],
 ['Cadmium Red Hue','red','PR170, PR188',null,{id:'red',fav:1,rgb:[0.450,0.050,0.035],s:1.0,near:'blue',comp:'green',note:'Bright, warm red.'}],
 ['Cadmium Red Dark','red','PR108',[['PR108',2],['PR264',.4]]],
 ['Cadmium Red Deep Hue','red','PO36, PR170',[['PR170',2],['PO36',1],['PR179',.4]]],
 ['Permanent Alizarin Crimson','red','PR179, PV19',[['PR179',2],['PV19',1]]],
 ['Permanent Rose','pink','PV19',[['PV19',1]]],
 ['Magenta','pink','PR122',[['PR122',1]]],
 ['Dioxazine Purple','violet','PV23',[['PV23',1]]],
 ['French Ultramarine','blue','PB29',null,{id:'blue',fav:1,rgb:[0.040,0.030,0.150],s:0.6,near:'pblue',comp:'orange',note:'Warm, violet-leaning blue.'}],
 ['Cobalt Blue','blue','PB28',[['PB28',1]]],
 ['Cobalt Blue Hue','blue','PB29, PB60',[['PB29',2],['PB60',.6],['PW6',.6]]],
 ['Phthalo Blue (Red Shade)','blue','PB15',null,{id:'pblue',fav:1,rgb:[0.012,0.022,0.065],s:1.8,near:'blue',comp:'orange',note:'Cool, intense blue and very strong. Its tints are the brightest, cleanest blues in the set. Add it to white a speck at a time.'}],
 ['Prussian Blue','blue','PB27',[['PB27',1]]],
 ['Cerulean Blue','blue','PB35',[['PB35',1]]],
 ['Cerulean Blue Hue','blue','PB36, PW4',[['PB36',2],['PW4',1]]],
 ['Phthalo Green (Blue Shade)','green','PG7',null,{id:'green',fav:1,rgb:[0.012,0.060,0.045],s:1.6,near:'pblue',comp:'red',note:'Extremely strong. Tiny amounts tint a lot of white, so add it a speck at a time.'}],
 ['Phthalo Green (Yellow Shade)','green','PG36',[['PG36',1]]],
 ['Viridian Hue','green','PG7, PY42, PY43',[['PG7',2],['PY42',.5],['PY43',.3]]],
 ['Permanent Sap Green','green','PB15, PY110',[['PY110',3],['PB15',.6]]],
 ['Olive Green','green','PBk6, PY110',[['PY110',3],['PBk6',.5]]],
 ['Raw Sienna','earth','PBr7, PY42',[['PBr7S',2],['PY42',1]]],
 ['Burnt Sienna','earth','PR101',[['PR101',1]]],
 ['Indian Red','earth','PR101',[['PR101T',1],['PBk11',.08]]],
 ['Raw Umber','earth','PBr7',[['PBr7R',1]]],
 ['Burnt Umber','earth','PBr7',[['PBr7B',1]]],
 ["Payne's Gray",'gray','PB29, PBk6',[['PB29',1],['PBk6',.5]]],
 ['Ivory Black','gray','PBk9',[['PBk9',1]]],
 ['Lamp Black','gray','PBk6',[['PBk6',1]]]
];
const COBRA=[
 ['Permanent Lemon Yellow 254','yellow','PY184',[['PY184',1]]],
 ['Cadmium Yellow Lemon 207','yellow','PY35',[['PY35',1],['PY3',.4]]],
 ['Primary Yellow 275','yellow','PY184, PY154',[['PY184',1],['PY154',1]]],
 ['Permanent Yellow Light 283','yellow','PY154',[['PY154',1],['PY3',.3]]],
 ['Permanent Yellow Medium 284','yellow','PY154',[['PY154',1]]],
 ['Cadmium Yellow Medium 271','yellow','PY35',[['PY35',1]]],
 ['Transparent Yellow Medium 272','yellow','PY128',[['PY128',1]]],
 ['Aureoline 242','yellow','PY150',[['PY150',1]]],
 ['Indian Yellow 244','yellow','PY110',[['PY110',1],['PY150',.5]]],
 ['Permanent Yellow Deep 285','yellow','PY154, PO43',[['PY154',3],['PO43',1]]],
 ['Cadmium Yellow Deep 210','yellow','PY35, PO20',[['PY35',2],['PO20',1]]],
 ['Naples Yellow Light 222','yellow','PW7, PY154, PBr24',[['PW7',4],['PY154',.6],['PBr24',.5]]],
 ['Naples Yellow Deep 223','yellow','PW7, PY154, PBr24',[['PW7',3],['PY154',.8],['PBr24',1]]],
 ['Naples Yellow Red 224','yellow','PW7, PO43, PBr24',[['PW7',3],['PO43',.4],['PBr24',1]]],
 ['Chartreuse 233','green','PY184, PG7',[['PY184',3],['PG7',.15]]],
 ['Transparent Yellow Green 281','green','PY129',[['PY129',1]]],
 ['Cadmium Orange 211','orange','PO20',null,{id:'orange',fav:1,rgb:[0.620,0.200,0.015],s:0.9,near:'red',comp:'blue',note:'A light, opaque orange.'}],
 ['Permanent Orange 266','orange','PY154, PO43',[['PO43',2],['PY154',1]]],
 ['Royal Orange 298','orange','PO64',[['PO64',1]]],
 ['Pyrrole Orange 278','orange','PO71, PR264',[['PO71',3],['PR264',.2]]],
 ['Vermilion 311','red','PO43',[['PO43',1],['PR254',.3]]],
 ['Permanent Red Light 370','red','PR255, PO73',[['PR255',1],['PO73',1]]],
 ['Pyrrole Red Light 340','red','PR254, PO43',[['PR254',2],['PO43',1]]],
 ['Cadmium Red Light 303','red','PR108',[['PR108',1],['PO20',.3]]],
 ['Pyrrole Red 315','red','PR254',null,{id:'red',fav:1,rgb:[0.440,0.040,0.033],s:1.1,near:'blue',comp:'green',note:'Clean, punchy red with strong tinting.'}],
 ['Cadmium Red Medium 314','red','PR108',[['PR108',1]]],
 ['Cadmium Red Deep 306','red','PR108',[['PR108',2],['PR264',.4]]],
 ['Pyrrole Red Deep 345','red','PR254, PR264',[['PR254',2],['PR264',1]]],
 ['Transparent Red Medium 317','red','PR207',[['PR207',1]]],
 ['Carmine 318','red','PR176',[['PR176',1]]],
 ['Madder Lake 389','red','PR264',[['PR264',1]]],
 ['Burnt Carmine 323','red','PR264, PB29',[['PR264',2],['PB29',.6]]],
 ['Quinacridone Red 364','pink','PR209',[['PR209',1]]],
 ['Rose 357','pink','PW6, PR209',[['PW6',2],['PR209',1]]],
 ['Persian Rose 330','pink','PW7, PR202',[['PW7',2],['PR202',1]]],
 ["Potter's Pink 356",'pink','PR101, PV19, PW6, PBk11',[['PW6',2],['PR101L',.6],['PV19',.3],['PBk11',.03]]],
 ['Primary Magenta 369','pink','PV19',[['PV19',1],['PR122',.4]]],
 ['Permanent Red Violet Light 577','pink','PR202, PW7',[['PR202',1],['PW7',1]]],
 ['Permanent Red Violet 567','violet','PV23, PR122',[['PR122',2],['PV23',.5]]],
 ['Permanent Violet Medium 537','violet','PV19',[['PV19',1],['PV23',.2]]],
 ['Quinacridone Purple Bluish 593','violet','PV55',[['PV55',1]]],
 ['Violet 536','violet','PW7, PR122, PV23',[['PW7',1],['PR122',1],['PV23',.6]]],
 ['Permanent Blue Violet 568','violet','PV23, PR122',[['PV23',2],['PR122',.4]]],
 ['Ultramarine Violet 507','violet','PV15, PB29',[['PV15',2],['PB29',1]]],
 ['Blue Violet 548','violet','PW7, PB29, PV23',[['PW7',1],['PB29',2],['PV23',.5]]],
 ['Ultramarine 504','blue','PB29',null,{id:'blue',fav:1,rgb:[0.042,0.032,0.150],s:0.55,near:'pblue',comp:'orange',note:'Warm, violet-leaning blue.'}],
 ['Cobalt Blue (Ultramarine) 512','blue','PB29, PB15',[['PB29',3],['PB15',.3],['PW6',.4]]],
 ['Cobalt Blue 511','blue','PB28',[['PB28',1]]],
 ["King's Blue 517",'blue','PW7, PB29',[['PW7',2],['PB29',1]]],
 ['Greyish Blue 562','blue','PW7, PB29, PBk9',[['PW7',2],['PB29',1],['PBk9',.15]]],
 ['Phthalo Blue 570','blue','PB15',null,{id:'pblue',fav:1,rgb:[0.012,0.022,0.065],s:1.7,near:'blue',comp:'orange',note:'Cool, intense blue and very strong. Its tints are the brightest, cleanest blues in the set. Add it to white a speck at a time.'}],
 ['Primary Cyan 572','blue','PB15, PW7',[['PB15',1],['PW7',1.5]]],
 ['Prussian Blue 508','blue','PB27',[['PB27',1]]],
 ['Indigo 533','blue','PB29, PB15, PBk11',[['PB29',1],['PB15',.5],['PBk11',.5]]],
 ['Cerulean Blue 534','blue','PB35',[['PB35',1]]],
 ['Cerulean Blue (Phthalo) 535','blue','PB15, PW7',[['PW7',2],['PB15',.5]]],
 ['Caribbean Blue 542','blue','PB15, PG7, PW6',[['PW6',2],['PB15',.5],['PG7',.3]]],
 ['Turquoise Blue 522','blue','PW7, PB15, PG7',[['PW7',2],['PB15',.6],['PG7',.6]]],
 ['Phthalo Turquoise Blue 565','blue','PB15, PG7',[['PB15',1],['PG7',1]]],
 ['Phthalo Green 675','green','PG7',null,{id:'green',fav:1,rgb:[0.012,0.060,0.045],s:1.5,near:'pblue',comp:'red',note:'Extremely strong. Tiny amounts tint a lot of white, so add it a speck at a time.'}],
 ['Viridian 616','green','PG7, PBk11',[['PG7',2],['PBk11',.2]]],
 ['Emerald Green 615','green','PW7, PG7, PY154',[['PW7',2],['PG7',.6],['PY154',.6]]],
 ['Pastel Green Blue 611','green','PY154, PG7, PW6',[['PW6',3],['PG7',.4],['PY154',.3]]],
 ['Permanent Green Light 618','green','PG7, PY154',null,{id:'lgreen',fav:1,rgb:[0.110,0.300,0.050],s:0.9,near:'green',comp:'red',note:'Brighter, yellower green.'}],
 ['Yellowish Green 617','green','PG7, PY154',[['PY154',3],['PG7',.4]]],
 ['Permanent Green Deep 619','green','PG7, PY154',[['PG7',1.5],['PY154',1]]],
 ['Sap Green 623','green','PG7, PY110',[['PY110',2],['PG7',.6]]],
 ['Olive Green 620','green','PG7, PY110, PR264',[['PY110',2],['PG7',.4],['PR264',.25]]],
 ['Olive Green Yellow 639','green','PG7, PY110, PR264',[['PY110',3],['PG7',.3],['PR264',.15]]],
 ['Chromium Oxide Green 668','green','PG17',[['PG17',1]]],
 ['Ultramarine Green 683','green','PB29, PY129',[['PY129',2],['PB29',1]]],
 ['Gold Ochre 231','earth','PY42',[['PY42',1],['PR101L',.15]]],
 ['Yellow Ochre 227','earth','PY42',[['PY42',1]]],
 ['Yellow Ochre Light 228','earth','PBr24',[['PBr24',1]]],
 ['Transparent Oxide Yellow 265','earth','PY42',[['PY42',1],['PBr7S',.3]]],
 ['Raw Sienna 234','earth','PY42, PBk11',[['PY42',2],['PBk11',.06]]],
 ['Light Oxide Red 339','earth','PR101',[['PR101L',1]]],
 ['Burnt Sienna 411','earth','PR101',[['PR101',1]]],
 ['Transparent Oxide Red 378','earth','PR101',[['PR101T',1]]],
 ['Transparent Red Ochre 419','earth','PBr25',[['PBr25',1],['PR101',.5]]],
 ['Red Earth 436','earth','PR290',[['PR290',1],['PR101',.5]]],
 ['Permanent Madder Brown 324','earth','PR264, PR101, PV19',[['PR101',1],['PR264',1],['PV19',.3]]],
 ['Raw Umber 408','earth','PY42, PBk11',[['PY42',1],['PBk11',.35]]],
 ['Burnt Umber 409','earth','PR101, PBk11',[['PR101',1],['PBk11',.35]]],
 ['Vandyke Brown 403','earth','PR101, PBk11',[['PR101T',1],['PBk11',.6]]],
 ['Asphaltum 414','earth','PY110, PR264, PG7',[['PY110',1],['PR264',.6],['PG7',.4]]],
 ['Perylene Green Black 721','gray','PBk31',[['PBk31',1]]],
 ["Payne's Grey 708",'gray','PBk9, PB15, PV19',[['PBk9',1],['PB15',.3],['PV19',.1]]],
 ['Cold Grey 717','gray','PBk11, PB29, PW6',[['PW6',2],['PBk11',.3],['PB29',.2]]],
 ['Warm Grey 718','gray','PR101, PBk11, PW6',[['PW6',2],['PBk11',.3],['PR101',.2]]],
 ['Ivory Black 701','gray','PBk9',[['PBk9',1]]],
 ['Lamp Black 702','gray','PBk9, PB29',[['PBk9',1],['PB29',.2]]]
];
const slug=s=>s.toLowerCase().replace(/\(|\)|'/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'');
function build(list){
  return list.map(([name,family,code,recipe,extra])=>{
    const t=Object.assign({name,family,code,id:slug(name)},recipe?blend(recipe):{},extra||{});
    // short button label: the name without the tube number and shade notes
    t.label=t.label||name.replace(/\s+\d+$/,'').replace(/\s*\(.*\)$/,'');
    if(extra&&extra.id==='blue')t.label='Ultramarine';
    if(extra&&extra.id==='pblue')t.label='Phthalo Blue';
    if(extra&&extra.id==='green')t.label='Phthalo Green';
    if(extra&&extra.id==='lgreen')t.label='Light Green';
    if(extra&&extra.id==='orange')t.label='Orange';
    if(extra&&extra.id==='red')t.label='Red';
    return t;
  });
}
window.PAINT_DATA={artisan:build(ARTISAN),cobra:build(COBRA)};
})();

// ---------- automatic darkening partners ----------
// For each tube pick a same-family partner (darker, close in hue) and a complement (opposite hue).
// The six favorites keep their hand-picked partners.
(function(){
const ks=r=>(1-r)*(1-r)/(2*r), rk=k=>1+k-Math.sqrt(k*k+2*k);
const W=[.90,.90,.885];
const tint=(t,c)=>[0,1,2].map(i=>{const a=c*t.s,b=1-c;return rk((a*ks(t.rgb[i])+b*ks(W[i]))/(a+b))});
const f=v=>v>0.008856?Math.cbrt(v):7.787*v+16/116;
function lab(lin){
  const X=(0.4124*lin[0]+0.3576*lin[1]+0.1805*lin[2])/0.9505,Y=0.2126*lin[0]+0.7152*lin[1]+0.0722*lin[2],Z=(0.0193*lin[0]+0.1192*lin[1]+0.9505*lin[2])/1.089;
  return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];
}
function describe(t){
  const pure=lab(t.rgb),ti=lab(tint(t,0.3));
  t.pureL=pure[0];t.hue=(Math.atan2(ti[2],ti[1])*180/Math.PI+360)%360;t.chroma=Math.hypot(ti[1],ti[2]);
}
const hd=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
function assign(list){
  list.forEach(describe);
  for(const t of list){
    if(t.fav)continue;
    const others=list.filter(c=>c!==t);
    const neutral=t.chroma<9;
    // same family
    let best=null,bs=1e9;
    for(const c of others){
      if(c.pureL>t.pureL-4)continue;
      const d=hd(t.hue,c.hue);
      const earthy=(c.family==='earth'&&(t.family==='earth'||t.family==='yellow'||t.family==='orange'));
      if(neutral){ if(c.chroma>=12)continue; }
      else if(d>55&&!earthy)continue;
      const sc=(neutral?0:d/30)+c.pureL/25+(c.chroma<9&&!neutral?2:0)+(earthy&&d>55?1:0);
      if(sc<bs){bs=sc;best=c}
    }
    t.near=best?best.id:null;
    // complement
    best=null;bs=1e9;
    if(!neutral)for(const c of others){
      if(c.chroma<15||c.pureL>75)continue;
      const off=Math.abs(hd(t.hue,c.hue)-180);if(off>55)continue;
      const sc=off/25+c.pureL/20;
      if(sc<bs){bs=sc;best=c}
    }
    t.comp=best?best.id:null;
  }
}
assign(window.PAINT_DATA.artisan);assign(window.PAINT_DATA.cobra);
})();
