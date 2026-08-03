/**
 * Hive — Extended Emoji Pack (100+ emojis, categorized)
 * Depends on: hiveEmojis.js (HiveEmoji namespace)
 * Registers via HiveEmoji.register()
 */
(function () {
  'use strict';
  if (!window.HiveEmoji) return;
  var ns = 'http://www.w3.org/2000/svg';
  var uidCounter = 0;
  function nextUid() { return 'ext' + (++uidCounter); }

  function el(tag, attrs) {
    var e = document.createElementNS(ns, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function radGrad(id, stops) {
    var g = el('radialGradient', { id: id, cx: '40%', cy: '35%', r: '60%' });
    stops.forEach(function (s) { g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
    return g;
  }
  function linGrad(id, stops) {
    var g = el('linearGradient', { id: id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    stops.forEach(function (s) { g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
    return g;
  }
  function faceCircle(uid, skin, stroke) {
    var defs = el('defs');
    defs.appendChild(radGrad('fc'+uid, skin));
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#fc'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:stroke||'#D4A020', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  }
  function eye(g, cx, cy) {
    g.appendChild(el('ellipse', { cx:cx, cy:cy, rx:'2.2', ry:'2.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:String(+cx+0.8), cy:String(+cy-1), r:'0.7', fill:'#fff' }));
  }
  function smile(g) { g.appendChild(el('path', { d:'M11,22 Q18,28 25,22', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' })); }
  function bigSmile(g) { g.appendChild(el('path', { d:'M10,22 Q18,30 26,22', fill:'#3A2010' })); g.appendChild(el('path', { d:'M12,22 Q18,28 24,22', fill:'#FF6B6B', opacity:'0.4' })); }
  function blush(g) { g.appendChild(el('circle', { cx:'9', cy:'21', r:'2.5', fill:'#FF9E44', opacity:'0.3' })); g.appendChild(el('circle', { cx:'27', cy:'21', r:'2.5', fill:'#FF9E44', opacity:'0.3' })); }
  function frown(g) { g.appendChild(el('path', { d:'M12,26 Q18,22 24,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' })); }
  function squintEyes(g) { g.appendChild(el('path', { d:'M9,14 Q12,11 15,14', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' })); g.appendChild(el('path', { d:'M21,14 Q24,11 27,14', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' })); }

  function buildSvg(result) {
    var svg = el('svg', { viewBox:'0 0 36 36', width:'100%', height:'100%', xmlns:ns });
    svg.appendChild(result.defs);
    svg.appendChild(result.g);
    return svg;
  }

  /* ═══════════════════════════════════════════
     FACES (42 emojis)
     ═══════════════════════════════════════════ */
  var FACES = {};

  FACES.blush = function (uid) {
    var r = faceCircle(uid, [['0%','#FFD4A0'],['100%','#FFB870']]);
    blush(r.g); eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M13,23 Q18,26 23,23', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.smirk = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M13,24 Q18,24 22,21', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.kiss = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'2.5', ry:'2', fill:'#FF6B6B' }));
    r.g.appendChild(el('circle', { cx:'17.5', cy:'23.5', r:'0.5', fill:'#fff', opacity:'0.4' }));
    return r;
  };

  FACES.grin = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    blush(r.g); squintEyes(r.g); bigSmile(r.g);
    return r;
  };

  FACES.sad = function (uid) {
    var r = faceCircle(uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M9,11 Q12,9 15,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,11 Q24,9 27,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    frown(r.g); return r;
  };

  FACES.worried = function (uid) {
    var r = faceCircle(uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M9,10 Q12,8 15,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,11 Q24,8 27,10', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M12,26 Q18,23 24,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.confused = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M10,10 Q12,8 14,10', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M22,10 Q24,12 26,10', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M12,25 L20,24 L24,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.dizzy = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('path', { d:'M10,14 L14,18 L10,18 L14,14', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M22,14 L26,18 L22,18 L26,14', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    frown(r.g); return r;
  };

  FACES.nerd = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('rect', { x:'7', y:'12', width:'10', height:'7', rx:'3.5', fill:'none', stroke:'#3A2010', 'stroke-width':'1.2' }));
    r.g.appendChild(el('rect', { x:'19', y:'12', width:'10', height:'7', rx:'3.5', fill:'none', stroke:'#3A2010', 'stroke-width':'1.2' }));
    r.g.appendChild(el('line', { x1:'17', y1:'15.5', x2:'19', y2:'15.5', stroke:'#3A2010', 'stroke-width':'1' }));
    r.g.appendChild(el('circle', { cx:'12', cy:'15.5', r:'1.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'15.5', r:'1.5', fill:'#3A2010' }));
    smile(r.g); return r;
  };

  FACES.sick = function (uid) {
    var r = faceCircle(uid, [['0%','#C8E6C9'],['100%','#81C784']]);
    squintEyes(r.g);
    r.g.appendChild(el('path', { d:'M12,26 Q18,22 24,26', fill:'none', stroke:'#2E7D32', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.masked = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('rect', { x:'6', y:'11', width:'24', height:'10', rx:'3', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'13', cy:'16', r:'2.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'23', cy:'16', r:'2.5', fill:'#3A2010' }));
    smile(r.g); return r;
  };

  FACES.nerdy_glasses = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('rect', { x:'6', y:'11', width:'11', height:'8', rx:'2', fill:'none', stroke:'#6C63FF', 'stroke-width':'1.5' }));
    r.g.appendChild(el('rect', { x:'19', y:'11', width:'11', height:'8', rx:'2', fill:'none', stroke:'#6C63FF', 'stroke-width':'1.5' }));
    r.g.appendChild(el('line', { x1:'17', y1:'15', x2:'19', y2:'15', stroke:'#6C63FF', 'stroke-width':'1.2' }));
    eye(r.g,'11.5','15'); eye(r.g,'24.5','15');
    smile(r.g); return r;
  };

  FACES.relieved = function (uid) {
    var r = faceCircle(uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]);
    r.g.appendChild(el('path', { d:'M9,15 Q12,17 15,15', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,15 Q24,17 27,15', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M12,24 Q18,27 24,24', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.pensive = function (uid) {
    var r = faceCircle(uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]);
    eye(r.g,'12','16'); eye(r.g,'24','16');
    r.g.appendChild(el('path', { d:'M9,11 Q12,9 15,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,11 Q24,9 27,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M13,25 Q18,23 23,25', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.drooling = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M10,22 Q18,28 25,22', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M23,24 Q23,28 22,30', fill:'none', stroke:'#5BC0EB', 'stroke-width':'2', 'stroke-linecap':'round', opacity:'0.7' }));
    return r;
  };

  FACES.starstruck = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    blush(r.g);
    var s1 = 'M12,12 L13,14.5 L15.5,14.5 L13.5,16 L14.2,18.5 L12,17 L9.8,18.5 L10.5,16 L8.5,14.5 L11,14.5Z';
    var s2 = 'M24,12 L25,14.5 L27.5,14.5 L25.5,16 L26.2,18.5 L24,17 L21.8,18.5 L22.5,16 L20.5,14.5 L23,14.5Z';
    r.g.appendChild(el('path', { d:s1, fill:'#FFD93D', stroke:'#E8A020', 'stroke-width':'0.4' }));
    r.g.appendChild(el('path', { d:s2, fill:'#FFD93D', stroke:'#E8A020', 'stroke-width':'0.4' }));
    bigSmile(r.g); return r;
  };

  FACES.upside_down = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('circle', { cx:'12', cy:'21', r:'2', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'21', r:'2', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M13,14 Q18,10 23,14', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.money_mouth = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('circle', { cx:'12', cy:'15', r:'3', fill:'#4CAF50' }));
    r.g.appendChild(el('text', { x:'10.5', y:'17.5', 'font-size':'5', fill:'#fff', 'font-family':'Inter,sans-serif' })).textContent = '$';
    r.g.appendChild(el('circle', { cx:'24', cy:'15', r:'3', fill:'#4CAF50' }));
    r.g.appendChild(el('text', { x:'22.5', y:'17.5', 'font-size':'5', fill:'#fff', 'font-family':'Inter,sans-serif' })).textContent = '$';
    r.g.appendChild(el('path', { d:'M12,24 Q18,28 24,24', fill:'#4CAF50' }));
    return r;
  };

  FACES.thermometer = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M13,26 Q18,22 23,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    r.g.appendChild(el('rect', { x:'28', y:'8', width:'4', height:'18', rx:'2', fill:'#fff', stroke:'#E53935', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'30', cy:'23', r:'3', fill:'#E53935' }));
    r.g.appendChild(el('line', { x1:'30', y1:'14', x2:'30', y2:'22', stroke:'#E53935', 'stroke-width':'2' }));
    return r;
  };

  FACES.nauseated = function (uid) {
    var r = faceCircle(uid, [['0%','#C8E6C9'],['100%','#81C784']]);
    squintEyes(r.g);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'25', rx:'4', ry:'3', fill:'#2E7D32', opacity:'0.6' }));
    return r;
  };

  FACES.sneezing = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    squintEyes(r.g);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'3', ry:'4', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M20,20 Q22,18 24,20', fill:'none', stroke:'#5BC0EB', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.cowboy = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M4,12 Q18,4 32,12 L30,14 Q18,8 6,14Z', fill:'#8B6914' }));
    r.g.appendChild(el('path', { d:'M4,12 Q18,4 32,12', fill:'none', stroke:'#6B4E0A', 'stroke-width':'1' }));
    r.g.appendChild(el('rect', { x:'15', y:'9', width:'6', height:'4', rx:'1', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.5' }));
    bigSmile(r.g); return r;
  };

  FACES.clown = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('circle', { cx:'12', cy:'15', r:'2.5', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'15', r:'2.5', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'12', cy:'15', r:'1.2', fill:'#E53935' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'15', r:'1.2', fill:'#E53935' }));
    r.g.appendChild(el('circle', { cx:'18', cy:'22', r:'4', fill:'#E53935' }));
    r.g.appendChild(el('ellipse', { cx:'12', cy:'28', rx:'3', ry:'2', fill:'#fff' }));
    r.g.appendChild(el('ellipse', { cx:'24', cy:'28', rx:'3', ry:'2', fill:'#fff' }));
    return r;
  };

  FACES.lying = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M9,11 Q12,9 15,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,11 Q24,13 27,11', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M12,24 L24,24', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.shushing = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'2', ry:'2.5', fill:'#3A2010' }));
    r.g.appendChild(el('rect', { x:'24', y:'14', width:'3', height:'16', rx:'1.5', fill:'#FFB870', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return r;
  };

  FACES.hand_over_mouth = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'6', ry:'4', fill:'#FFB870', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return r;
  };

  FACES.exploding_head = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','18'); eye(r.g,'24','18');
    r.g.appendChild(el('ellipse', { cx:'18', cy:'26', rx:'3', ry:'4', fill:'#3A2010' }));
    for (var i = 0; i < 8; i++) {
      var a = (i * 45) * Math.PI / 180;
      r.g.appendChild(el('line', { x1:String(18+Math.cos(a)*14), y1:String(8+Math.sin(a)*14), x2:String(18+Math.cos(a)*18), y2:String(8+Math.sin(a)*18), stroke:i%2===0?'#FF6B6B':'#FFD93D', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    }
    return r;
  };

  FACES.pleading = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('ellipse', { cx:'12', cy:'15', rx:'3', ry:'3.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'13', cy:'14', r:'1.2', fill:'#fff' }));
    r.g.appendChild(el('circle', { cx:'11', cy:'13', r:'0.5', fill:'#fff' }));
    r.g.appendChild(el('ellipse', { cx:'24', cy:'15', rx:'3', ry:'3.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'25', cy:'14', r:'1.2', fill:'#fff' }));
    r.g.appendChild(el('circle', { cx:'23', cy:'13', r:'0.5', fill:'#fff' }));
    r.g.appendChild(el('path', { d:'M12,25 Q18,28 24,25', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.ghost = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('gho'+uid, [['0%','#F0F0FF'],['100%','#D0D0E8']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M6,16 L6,30 Q6,32 8,30 L10,32 Q12,30 14,32 Q16,30 18,32 Q20,30 22,32 Q24,30 26,32 Q28,30 30,32 L30,16 C30,8 24,2 18,2 C12,2 6,8 6,16Z', fill:'url(#gho'+uid+')' }));
    g.appendChild(el('circle', { cx:'13', cy:'14', r:'2.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'14', r:'2.5', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'3', ry:'2', fill:'#3A2010', opacity:'0.6' }));
    return { defs: defs, g: g };
  };

  FACES.devil = function (uid) {
    var r = faceCircle(uid, [['0%','#FF6B6B'],['100%','#CC3333']]);
    r.g.appendChild(el('path', { d:'M8,2 L12,10 L4,10Z', fill:'#CC3333' }));
    r.g.appendChild(el('path', { d:'M28,2 L32,10 L24,10Z', fill:'#CC3333' }));
    eye(r.g,'12','15'); eye(r.g,'24','15');
    bigSmile(r.g); return r;
  };

  FACES.angel = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15'); smile(r.g);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'0', rx:'8', ry:'3', fill:'#FFD93D', opacity:'0.7' }));
    r.g.appendChild(el('ellipse', { cx:'18', cy:'-1', rx:'6', ry:'2', fill:'#fff', opacity:'0.5' }));
    return r;
  };

  FACES.baby = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE0D0'],['100%','#FFD0B0']]);
    r.g.appendChild(el('circle', { cx:'12', cy:'16', r:'1.8', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'16', r:'1.8', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'12.5', cy:'15.3', r:'0.6', fill:'#fff' }));
    r.g.appendChild(el('circle', { cx:'24.5', cy:'15.3', r:'0.6', fill:'#fff' }));
    blush(r.g);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'2', ry:'1.5', fill:'#FF6B6B', opacity:'0.5' }));
    return r;
  };

  FACES.skull_crossbones = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('gskc'+uid, [['0%','#F0F0F5'],['100%','#C8C8D4']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M18,2 C10,2 4,8 4,15 C4,20 7,24 11,26 L11,30 L16,28 L18,30 L20,28 L25,30 L25,26 C29,24 32,20 32,15 C32,8 26,2 18,2Z', fill:'url(#gskc'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'14', rx:'3', ry:'3.5', fill:'#2A2A3A' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'14', rx:'3', ry:'3.5', fill:'#2A2A3A' }));
    g.appendChild(el('polygon', { points:'17,19 19,19 18,21', fill:'#2A2A3A' }));
    g.appendChild(el('rect', { x:'12', y:'24', width:'2', height:'3', rx:'0.5', fill:'#fff' }));
    g.appendChild(el('rect', { x:'15', y:'24', width:'2', height:'3', rx:'0.5', fill:'#fff' }));
    g.appendChild(el('rect', { x:'18', y:'24', width:'2', height:'3', rx:'0.5', fill:'#fff' }));
    g.appendChild(el('rect', { x:'21', y:'24', width:'2', height:'3', rx:'0.5', fill:'#fff' }));
    g.appendChild(el('line', { x1:'6', y1:'28', x2:'30', y2:'32', stroke:'#C8C8D4', 'stroke-width':'2.5', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'6', y1:'32', x2:'30', y2:'28', stroke:'#C8C8D4', 'stroke-width':'2.5', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  FACES.angry2 = function (uid) {
    var r = faceCircle(uid, [['0%','#FF8A80'],['100%','#E53935']]);
    r.g.appendChild(el('line', { x1:'8', y1:'10', x2:'15', y2:'13', stroke:'#3A2010', 'stroke-width':'2', 'stroke-linecap':'round' }));
    r.g.appendChild(el('line', { x1:'28', y1:'10', x2:'21', y2:'13', stroke:'#3A2010', 'stroke-width':'2', 'stroke-linecap':'round' }));
    eye(r.g,'12','16'); eye(r.g,'24','16');
    r.g.appendChild(el('path', { d:'M10,26 Q18,21 26,26', fill:'none', stroke:'#3A2010', 'stroke-width':'2', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.zipper_face = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','14'); eye(r.g,'24','14');
    r.g.appendChild(el('line', { x1:'18', y1:'4', x2:'18', y2:'32', stroke:'#888', 'stroke-width':'1.5' }));
    for (var i = 0; i < 6; i++) {
      r.g.appendChild(el('line', { x1:'16', y1:String(8+i*4), x2:'18', y2:String(10+i*4), stroke:'#888', 'stroke-width':'1' }));
      r.g.appendChild(el('line', { x1:'20', y1:String(8+i*4), x2:'18', y2:String(10+i*4), stroke:'#888', 'stroke-width':'1' }));
    }
    r.g.appendChild(el('circle', { cx:'18', cy:'4', r:'2', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.5' }));
    return r;
  };

  FACES.monocle = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('circle', { cx:'24', cy:'15', r:'5', fill:'none', stroke:'#8B6914', 'stroke-width':'1.2' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'15', r:'2', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'24.5', cy:'14', r:'0.7', fill:'#fff' }));
    eye(r.g,'12','15');
    r.g.appendChild(el('line', { x1:'29', y1:'15', x2:'32', y2:'30', stroke:'#8B6914', 'stroke-width':'0.8' }));
    r.g.appendChild(el('path', { d:'M13,24 Q18,24 22,22', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.crazy_face = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    blush(r.g);
    r.g.appendChild(el('circle', { cx:'12', cy:'14', r:'2.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'16', r:'2', fill:'#3A2010' }));
    bigSmile(r.g);
    r.g.appendChild(el('ellipse', { cx:'21', cy:'25', rx:'2', ry:'1.5', fill:'#FF6B6B' }));
    return r;
  };

  FACES.party_face = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    squintEyes(r.g); bigSmile(r.g);
    r.g.appendChild(el('polygon', { points:'28,4 26,10 30,10', fill:'#8B5CF6' }));
    r.g.appendChild(el('circle', { cx:'28', cy:'3', r:'1.5', fill:'#FFD93D' }));
    return r;
  };

  FACES.woozy = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('ellipse', { cx:'12', cy:'14', rx:'2.5', ry:'2', fill:'#3A2010' }));
    r.g.appendChild(el('ellipse', { cx:'24', cy:'16', rx:'2', ry:'2.5', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M11,23 Q15,28 20,24 Q25,20 25,24', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    blush(r.g); return r;
  };

  FACES.disguised = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('circle', { cx:'18', cy:'10', rx:'4', ry:'3', fill:'#8B6914', stroke:'#6B4E0A', 'stroke-width':'0.5' }));
    r.g.appendChild(el('line', { x1:'18', y1:'13', x2:'18', y2:'20', stroke:'#8B6914', 'stroke-width':'1.5' }));
    r.g.appendChild(el('circle', { cx:'13', cy:'16', r:'3', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'23', cy:'16', r:'3', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'13', cy:'16', r:'1.5', fill:'#3A2010' }));
    r.g.appendChild(el('circle', { cx:'23', cy:'16', r:'1.5', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M14,26 Q18,28 22,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.vomiting = function (uid) {
    var r = faceCircle(uid, [['0%','#C8E6C9'],['100%','#81C784']]);
    squintEyes(r.g);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'4', ry:'3', fill:'#2E7D32', opacity:'0.6' }));
    r.g.appendChild(el('path', { d:'M16,27 Q18,34 20,27', fill:'#81C784', stroke:'#2E7D32', 'stroke-width':'0.5' }));
    return r;
  };

  FACES.cold_face = function (uid) {
    var r = faceCircle(uid, [['0%','#B3E5FC'],['100%','#81D4FA']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M12,26 Q18,22 24,26', fill:'none', stroke:'#0277BD', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    r.g.appendChild(el('rect', { x:'7', y:'24', width:'4', height:'6', rx:'1', fill:'#B3E5FC', stroke:'#0277BD', 'stroke-width':'0.5' }));
    r.g.appendChild(el('rect', { x:'25', y:'24', width:'4', height:'6', rx:'1', fill:'#B3E5FC', stroke:'#0277BD', 'stroke-width':'0.5' }));
    return r;
  };

  FACES.hot_face = function (uid) {
    var r = faceCircle(uid, [['0%','#FF8A65'],['100%','#E64A19']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    smile(r.g);
    r.g.appendChild(el('path', { d:'M6,6 Q8,10 6,14', fill:'none', stroke:'#FF6B35', 'stroke-width':'1.5', 'stroke-linecap':'round', opacity:'0.6' }));
    r.g.appendChild(el('path', { d:'M30,6 Q32,10 30,14', fill:'none', stroke:'#FF6B35', 'stroke-width':'1.5', 'stroke-linecap':'round', opacity:'0.6' }));
    return r;
  };

  FACES.sleeping = function (uid) {
    var r = faceCircle(uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]);
    r.g.appendChild(el('path', { d:'M9,16 Q12,18 15,16', fill:'none', stroke:'#4A5568', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    r.g.appendChild(el('path', { d:'M21,16 Q24,18 27,16', fill:'none', stroke:'#4A5568', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    var t1 = el('text', { x:'26', y:'8', 'font-size':'6', 'font-weight':'700', fill:'#5BC0EB', opacity:'0.7', 'font-family':'Inter,sans-serif' });
    t1.textContent = 'Z'; r.g.appendChild(t1);
    var t2 = el('text', { x:'29', y:'4', 'font-size':'4.5', 'font-weight':'700', fill:'#5BC0EB', opacity:'0.5', 'font-family':'Inter,sans-serif' });
    t2.textContent = 'z'; r.g.appendChild(t2);
    r.g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'2.5', ry:'2', fill:'#4A5568', opacity:'0.5' }));
    return r;
  };

  FACES.eye_roll = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    r.g.appendChild(el('ellipse', { cx:'12', cy:'14', rx:'2.2', ry:'2.5', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'12', cy:'13', r:'1.5', fill:'#3A2010' }));
    r.g.appendChild(el('ellipse', { cx:'24', cy:'14', rx:'2.2', ry:'2.5', fill:'#fff', stroke:'#3A2010', 'stroke-width':'0.8' }));
    r.g.appendChild(el('circle', { cx:'24', cy:'13', r:'1.5', fill:'#3A2010' }));
    r.g.appendChild(el('path', { d:'M12,25 Q18,22 24,25', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.lying_face = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M13,24 Q18,24 22,22', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.saluting = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15'); smile(r.g);
    r.g.appendChild(el('rect', { x:'24', y:'2', width:'4', height:'10', rx:'2', fill:'#FFB870', stroke:'#D4A020', 'stroke-width':'0.5', transform:'rotate(-20 26 7)' }));
    return r;
  };

  FACES.white_hearts = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    var heart = 'M12,14 C12,12 10,12 10,14 C10,16 12,17 12,17 C12,17 14,16 14,14 C14,12 12,12 12,14Z';
    r.g.appendChild(el('path', { d:heart, fill:'#fff', transform:'translate(0,-1) scale(0.9)' }));
    r.g.appendChild(el('path', { d:heart, fill:'#fff', transform:'translate(10,-1) scale(0.9)' }));
    r.g.appendChild(el('path', { d:'M13,24 Q18,27 23,24', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    return r;
  };

  FACES.sweat = function (uid) {
    var r = faceCircle(uid, [['0%','#FFE066'],['100%','#FFB830']]);
    eye(r.g,'12','15'); eye(r.g,'24','15');
    r.g.appendChild(el('path', { d:'M12,25 Q18,22 24,25', fill:'none', stroke:'#3A2010', 'stroke-width':'1.3', 'stroke-linecap':'round' }));
    r.g.appendChild(el('ellipse', { cx:'28', cy:'10', rx:'1.5', ry:'2.5', fill:'#5BC0EB', opacity:'0.6' }));
    return r;
  };

  FACES.moyai = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('gmy'+uid, [['0%','#A0A0B0'],['100%','#808090']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'8', y:'4', width:'20', height:'28', rx:'6', fill:'url(#gmy'+uid+')' }));
    g.appendChild(el('rect', { x:'8', y:'4', width:'20', height:'28', rx:'6', fill:'none', stroke:'#606070', 'stroke-width':'0.8' }));
    g.appendChild(el('ellipse', { cx:'13', cy:'14', rx:'2.5', ry:'3', fill:'#404050' }));
    g.appendChild(el('ellipse', { cx:'23', cy:'14', rx:'2.5', ry:'3', fill:'#404050' }));
    g.appendChild(el('rect', { x:'15', y:'20', width:'6', height:'4', rx:'2', fill:'#606070' }));
    return { defs: defs, g: g };
  };

  FACES.jack_o_lantern = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('gjo'+uid, [['0%','#FF9800'],['100%','#E65100']]));
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gjo'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#BF360C', 'stroke-width':'0.8' }));
    g.appendChild(el('polygon', { points:'10,12 14,18 6,18', fill:'#FFD93D' }));
    g.appendChild(el('polygon', { points:'22,12 26,18 18,18', fill:'#FFD93D' }));
    g.appendChild(el('path', { d:'M10,24 L14,22 L18,26 L22,22 L26,24 L22,28 L14,28Z', fill:'#FFD93D' }));
    g.appendChild(el('line', { x1:'18', y1:'2', x2:'18', y2:'6', stroke:'#8B6914', 'stroke-width':'2', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  /* ═══════════════════════════════════════════
     HANDS (15 emojis)
     ═══════════════════════════════════════════ */
  var HANDS = {};

  HANDS.wave = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hwa'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M16,30 L16,18 Q16,16 18,16 L18,8 Q18,6 20,6 Q22,6 22,8 L22,16 L22,10 Q22,8 24,8 Q26,8 26,10 L26,16 L26,12 Q26,10 28,10 Q30,10 30,12 L30,24 Q30,30 26,32 L20,32 Q16,32 16,30Z', fill:'url(#hwa'+uid+')' }));
    g.appendChild(el('path', { d:'M16,30 L16,18 Q16,16 18,16 L18,8 Q18,6 20,6 Q22,6 22,8 L22,16 L22,10 Q22,8 24,8 Q26,8 26,10 L26,16 L26,12 Q26,10 28,10 Q30,10 30,12 L30,24 Q30,30 26,32 L20,32 Q16,32 16,30Z', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  HANDS.thumbs_up = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('htu'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'10', y:'18', width:'8', height:'14', rx:'2', fill:'url(#htu'+uid+')' }));
    g.appendChild(el('rect', { x:'18', y:'6', width:'8', height:'18', rx:'4', fill:'url(#htu'+uid+')' }));
    g.appendChild(el('rect', { x:'10', y:'18', width:'8', height:'14', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'18', y:'6', width:'8', height:'18', rx:'4', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  HANDS.thumbs_down = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('htd'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'10', y:'4', width:'8', height:'14', rx:'2', fill:'url(#htd'+uid+')' }));
    g.appendChild(el('rect', { x:'18', y:'12', width:'8', height:'18', rx:'4', fill:'url(#htd'+uid+')' }));
    g.appendChild(el('rect', { x:'10', y:'4', width:'8', height:'14', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'18', y:'12', width:'8', height:'18', rx:'4', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  HANDS.ok_hand = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hok'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'20', cy:'20', rx:'10', ry:'12', fill:'url(#hok'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'20', cy:'20', rx:'10', ry:'12', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'20', cy:'20', r:'4', fill:'none', stroke:'#D4A020', 'stroke-width':'1' }));
    return { defs: defs, g: g };
  };

  HANDS.peace = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hpe'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'12', y:'16', width:'6', height:'16', rx:'2', fill:'url(#hpe'+uid+')' }));
    g.appendChild(el('rect', { x:'12', y:'4', width:'3', height:'14', rx:'1.5', fill:'url(#hpe'+uid+')' }));
    g.appendChild(el('rect', { x:'18', y:'4', width:'3', height:'14', rx:'1.5', fill:'url(#hpe'+uid+')' }));
    g.appendChild(el('rect', { x:'24', y:'6', width:'3', height:'10', rx:'1.5', fill:'url(#hpe'+uid+')' }));
    g.appendChild(el('rect', { x:'12', y:'16', width:'6', height:'16', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'12', y:'4', width:'3', height:'14', rx:'1.5', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    g.appendChild(el('rect', { x:'18', y:'4', width:'3', height:'14', rx:'1.5', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    g.appendChild(el('rect', { x:'24', y:'6', width:'3', height:'10', rx:'1.5', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.clap = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hcl'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'14', cy:'18', rx:'7', ry:'10', fill:'url(#hcl'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'22', cy:'18', rx:'7', ry:'10', fill:'url(#hcl'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'14', cy:'18', rx:'7', ry:'10', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('ellipse', { cx:'22', cy:'18', rx:'7', ry:'10', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    for (var i = 0; i < 4; i++) {
      g.appendChild(el('line', { x1:String(8+i*2), y1:'8', x2:String(6+i*2), y2:'4', stroke:'#D4A020', 'stroke-width':'1', 'stroke-linecap':'round' }));
    }
    return { defs: defs, g: g };
  };

  HANDS.handshake = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hhk'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    defs.appendChild(radGrad('hhk2'+uid, [['0%','#E8C090'],['100%','#D4A070']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M4,18 L10,14 Q12,12 14,14 L18,18 L22,14 Q24,12 26,14 L32,18 L30,24 Q28,28 24,28 L14,28 Q10,28 8,24Z', fill:'url(#hhk'+uid+')' }));
    g.appendChild(el('path', { d:'M4,18 L10,14 Q12,12 14,14 L18,18 L22,14 Q24,12 26,14 L32,18 L30,24 Q28,28 24,28 L14,28 Q10,28 8,24Z', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M14,18 L22,18 L22,24 L14,24Z', fill:'url(#hhk2'+uid+')', opacity:'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.point_up = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hpu'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'12', y:'18', width:'12', height:'14', rx:'3', fill:'url(#hpu'+uid+')' }));
    g.appendChild(el('rect', { x:'16', y:'4', width:'4', height:'16', rx:'2', fill:'url(#hpu'+uid+')' }));
    g.appendChild(el('rect', { x:'12', y:'18', width:'12', height:'14', rx:'3', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'16', y:'4', width:'4', height:'16', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.point_down = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hpd'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'12', y:'4', width:'12', height:'14', rx:'3', fill:'url(#hpd'+uid+')' }));
    g.appendChild(el('rect', { x:'16', y:'16', width:'4', height:'16', rx:'2', fill:'url(#hpd'+uid+')' }));
    g.appendChild(el('rect', { x:'12', y:'4', width:'12', height:'14', rx:'3', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'16', y:'16', width:'4', height:'16', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.point_left = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hpl'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'18', y:'12', width:'14', height:'12', rx:'3', fill:'url(#hpl'+uid+')' }));
    g.appendChild(el('rect', { x:'4', y:'16', width:'16', height:'4', rx:'2', fill:'url(#hpl'+uid+')' }));
    g.appendChild(el('rect', { x:'18', y:'12', width:'14', height:'12', rx:'3', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'4', y:'16', width:'16', height:'4', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.point_right = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hpr'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'4', y:'12', width:'14', height:'12', rx:'3', fill:'url(#hpr'+uid+')' }));
    g.appendChild(el('rect', { x:'16', y:'16', width:'16', height:'4', rx:'2', fill:'url(#hpr'+uid+')' }));
    g.appendChild(el('rect', { x:'4', y:'12', width:'14', height:'12', rx:'3', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'16', y:'16', width:'16', height:'4', rx:'2', fill:'none', stroke:'#D4A020', 'stroke-width':'0.5' }));
    return { defs: defs, g: g };
  };

  HANDS.raised_hand = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hrh'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M12,32 L12,18 Q12,16 14,16 L14,8 Q14,6 16,6 Q18,6 18,8 L18,14 L18,8 Q18,6 20,6 Q22,6 22,8 L22,14 L22,8 Q22,6 24,6 Q26,6 26,8 L26,14 L26,10 Q26,8 28,8 Q30,8 30,10 L30,24 Q30,32 24,32 L18,32 Q12,32 12,30Z', fill:'url(#hrh'+uid+')' }));
    g.appendChild(el('path', { d:'M12,32 L12,18 Q12,16 14,16 L14,8 Q14,6 16,6 Q18,6 18,8 L18,14 L18,8 Q18,6 20,6 Q22,6 22,8 L22,14 L22,8 Q22,6 24,6 Q26,6 26,8 L26,14 L26,10 Q26,8 28,8 Q30,8 30,10 L30,24 Q30,32 24,32 L18,32 Q12,32 12,30Z', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  HANDS.fist = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hfi'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('rect', { x:'10', y:'12', width:'16', height:'18', rx:'4', fill:'url(#hfi'+uid+')' }));
    g.appendChild(el('rect', { x:'10', y:'12', width:'16', height:'18', rx:'4', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    for (var i = 0; i < 4; i++) {
      g.appendChild(el('line', { x1:String(12+i*4), y1:'14', x2:String(12+i*4), y2:'20', stroke:'#D4A020', 'stroke-width':'0.6' }));
    }
    return { defs: defs, g: g };
  };

  HANDS.muscle = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('hmu'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M8,28 L8,18 Q8,10 14,8 L18,8 Q22,8 24,12 L26,16 Q28,20 26,24 L24,28 Q22,32 18,32 L12,32 Q8,32 8,28Z', fill:'url(#hmu'+uid+')' }));
    g.appendChild(el('path', { d:'M8,28 L8,18 Q8,10 14,8 L18,8 Q22,8 24,12 L26,16 Q28,20 26,24 L24,28 Q22,32 18,32 L12,32 Q8,32 8,28Z', fill:'none', stroke:'#D4A020', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M14,12 Q18,16 14,24', fill:'none', stroke:'#D4A020', 'stroke-width':'1.2', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  /* ═══════════════════════════════════════════
     NATURE (18 emojis)
     ═══════════════════════════════════════════ */
  var NATURE = {};

  NATURE.dog = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('ndo'+uid, [['0%','#D4A070'],['100%','#A07840']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'12', ry:'11', fill:'url(#ndo'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'6', cy:'10', rx:'4', ry:'6', fill:'#A07840', transform:'rotate(-15 6 10)' }));
    g.appendChild(el('ellipse', { cx:'30', cy:'10', rx:'4', ry:'6', fill:'#A07840', transform:'rotate(15 30 10)' }));
    g.appendChild(el('circle', { cx:'13', cy:'18', r:'2', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'18', r:'2', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'3', ry:'2', fill:'#3A2010' }));
    g.appendChild(el('path', { d:'M15,26 Q18,29 21,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  NATURE.cat = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nca'+uid, [['0%','#A0A0B0'],['100%','#808090']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'12', ry:'11', fill:'url(#nca'+uid+')' }));
    g.appendChild(el('polygon', { points:'6,14 4,2 12,10', fill:'#808090' }));
    g.appendChild(el('polygon', { points:'30,14 32,2 24,10', fill:'#808090' }));
    g.appendChild(el('circle', { cx:'13', cy:'18', r:'2', fill:'#7CFFB2' }));
    g.appendChild(el('circle', { cx:'23', cy:'18', r:'2', fill:'#7CFFB2' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'1.5', ry:'1', fill:'#FF6B6B' }));
    g.appendChild(el('line', { x1:'8', y1:'22', x2:'2', y2:'20', stroke:'#808090', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'8', y1:'24', x2:'2', y2:'24', stroke:'#808090', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'28', y1:'22', x2:'34', y2:'20', stroke:'#808090', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'28', y1:'24', x2:'34', y2:'24', stroke:'#808090', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  NATURE.mouse = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nmo'+uid, [['0%','#D0D0D8'],['100%','#A0A0B0']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'10', ry:'9', fill:'url(#nmo'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'10', cy:'8', rx:'6', ry:'7', fill:'#D0D0D8', stroke:'#A0A0B0', 'stroke-width':'0.5' }));
    g.appendChild(el('ellipse', { cx:'10', cy:'8', rx:'4', ry:'5', fill:'#FFB8B8' }));
    g.appendChild(el('ellipse', { cx:'26', cy:'8', rx:'6', ry:'7', fill:'#D0D0D8', stroke:'#A0A0B0', 'stroke-width':'0.5' }));
    g.appendChild(el('ellipse', { cx:'26', cy:'8', rx:'4', ry:'5', fill:'#FFB8B8' }));
    g.appendChild(el('circle', { cx:'14', cy:'20', r:'1.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'22', cy:'20', r:'1.5', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'1.5', ry:'1', fill:'#FF6B6B' }));
    return { defs: defs, g: g };
  };

  NATURE.hamster = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nha'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'12', ry:'11', fill:'url(#nha'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'8', cy:'10', rx:'4', ry:'5', fill:'#FFB870' }));
    g.appendChild(el('ellipse', { cx:'8', cy:'10', rx:'2.5', ry:'3.5', fill:'#FFB8B8' }));
    g.appendChild(el('ellipse', { cx:'28', cy:'10', rx:'4', ry:'5', fill:'#FFB870' }));
    g.appendChild(el('ellipse', { cx:'28', cy:'10', rx:'2.5', ry:'3.5', fill:'#FFB8B8' }));
    g.appendChild(el('circle', { cx:'13', cy:'18', r:'1.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'18', r:'1.5', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'1.5', ry:'1', fill:'#FF6B6B' }));
    blush(g); return { defs: defs, g: g };
  };

  NATURE.rabbit = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nra'+uid, [['0%','#F0F0F5'],['100%','#D0D0E0']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'11', ry:'10', fill:'url(#nra'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'6', rx:'3.5', ry:'9', fill:'#F0F0F5', stroke:'#D0D0E0', 'stroke-width':'0.5' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'6', rx:'2', ry:'7', fill:'#FFB8B8' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'6', rx:'3.5', ry:'9', fill:'#F0F0F5', stroke:'#D0D0E0', 'stroke-width':'0.5' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'6', rx:'2', ry:'7', fill:'#FFB8B8' }));
    g.appendChild(el('circle', { cx:'14', cy:'20', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'22', cy:'20', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'1.5', ry:'1', fill:'#FF6B6B' }));
    return { defs: defs, g: g };
  };

  NATURE.fox = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nfo'+uid, [['0%','#FF8C42'],['100%','#E65100']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'12', ry:'10', fill:'url(#nfo'+uid+')' }));
    g.appendChild(el('polygon', { points:'6,16 2,2 12,12', fill:'#FF8C42' }));
    g.appendChild(el('polygon', { points:'30,16 34,2 24,12', fill:'#FF8C42' }));
    g.appendChild(el('path', { d:'M8,20 Q18,28 28,20 L26,24 Q18,30 10,24Z', fill:'#F0F0F5' }));
    g.appendChild(el('circle', { cx:'13', cy:'18', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'18', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'1.5', ry:'1', fill:'#3A2010' }));
    return { defs: defs, g: g };
  };

  NATURE.bear = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nbe'+uid, [['0%','#A07040'],['100%','#704020']]));
    var g = el('g');
    g.appendChild(el('circle', { cx:'8', cy:'8', r:'5', fill:'url(#nbe'+uid+')' }));
    g.appendChild(el('circle', { cx:'28', cy:'8', r:'5', fill:'url(#nbe'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'13', ry:'12', fill:'url(#nbe'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'5', ry:'4', fill:'#A07040' }));
    g.appendChild(el('circle', { cx:'13', cy:'18', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'18', r:'1.8', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'2', ry:'1.5', fill:'#3A2010' }));
    return { defs: defs, g: g };
  };

  NATURE.panda = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('npa'+uid, [['0%','#F0F0F5'],['100%','#E0E0E8']]));
    var g = el('g');
    g.appendChild(el('circle', { cx:'8', cy:'8', r:'5', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'28', cy:'8', r:'5', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'url(#npa'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'16', rx:'4', ry:'4.5', fill:'#1a1a2e' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'16', rx:'4', ry:'4.5', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'12', cy:'15.5', r:'1.8', fill:'#fff' }));
    g.appendChild(el('circle', { cx:'24', cy:'15.5', r:'1.8', fill:'#fff' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'2', ry:'1.5', fill:'#1a1a2e' }));
    return { defs: defs, g: g };
  };

  NATURE.unicorn = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nun'+uid, [['0%','#F0F0F5'],['100%','#E0E0E8']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'12', ry:'10', fill:'url(#nun'+uid+')' }));
    g.appendChild(el('polygon', { points:'18,0 16,10 20,10', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.5' }));
    g.appendChild(el('circle', { cx:'12', cy:'18', r:'2', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'24', cy:'18', r:'2', fill:'#3A2010' }));
    g.appendChild(el('path', { d:'M14,24 Q18,27 22,24', fill:'none', stroke:'#3A2010', 'stroke-width':'1', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M8,10 Q6,6 4,8', fill:'none', stroke:'#B8B8D0', 'stroke-width':'2', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M6,10 Q4,6 2,8', fill:'none', stroke:'#D0D0E8', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  NATURE.bee = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nbee'+uid, [['0%','#FFD93D'],['100%','#FFB830']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'10', ry:'8', fill:'url(#nbee'+uid+')' }));
    g.appendChild(el('rect', { x:'10', y:'16', width:'16', height:'2', fill:'#1a1a2e' }));
    g.appendChild(el('rect', { x:'10', y:'20', width:'16', height:'2', fill:'#1a1a2e' }));
    g.appendChild(el('rect', { x:'10', y:'24', width:'16', height:'2', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'12', cy:'18', r:'1.5', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'24', cy:'18', r:'1.5', fill:'#1a1a2e' }));
    g.appendChild(el('ellipse', { cx:'10', cy:'10', rx:'5', ry:'3', fill:'#fff', opacity:'0.6', transform:'rotate(-20 10 10)' }));
    g.appendChild(el('ellipse', { cx:'26', cy:'10', rx:'5', ry:'3', fill:'#fff', opacity:'0.6', transform:'rotate(20 26 10)' }));
    g.appendChild(el('polygon', { points:'28,20 32,18 32,22', fill:'#1a1a2e' }));
    return { defs: defs, g: g };
  };

  NATURE.butterfly = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nbu'+uid, [['0%','#FF6B8A'],['100%','#FF4D6A']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'12', cy:'14', rx:'8', ry:'10', fill:'url(#nbu'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'14', rx:'8', ry:'10', fill:'url(#nbu'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'26', rx:'5', ry:'6', fill:'#FF8AAA' }));
    g.appendChild(el('ellipse', { cx:'24', cy:'26', rx:'5', ry:'6', fill:'#FF8AAA' }));
    g.appendChild(el('rect', { x:'17', y:'4', width:'2', height:'28', rx:'1', fill:'#1a1a2e' }));
    g.appendChild(el('line', { x1:'18', y1:'4', x2:'14', y2:'0', stroke:'#1a1a2e', 'stroke-width':'1', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'18', y1:'4', x2:'22', y2:'0', stroke:'#1a1a2e', 'stroke-width':'1', 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:'14', cy:'14', r:'2', fill:'#fff', opacity:'0.5' }));
    g.appendChild(el('circle', { cx:'22', cy:'14', r:'2', fill:'#fff', opacity:'0.5' }));
    return { defs: defs, g: g };
  };

  NATURE.snake = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nsn'+uid, [['0%','#7CFFB2'],['100%','#2DD4BF']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M6,28 Q6,20 12,18 Q18,16 18,12 Q18,8 24,8 Q30,8 30,14 Q30,20 24,22 Q18,24 18,28 Q18,32 24,32', fill:'none', stroke:'url(#nsn'+uid+')', 'stroke-width':'4', 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:'6', cy:'28', r:'2', fill:'#1A9E7A' }));
    g.appendChild(el('circle', { cx:'5', cy:'27', r:'0.8', fill:'#fff' }));
    g.appendChild(el('path', { d:'M24,30 L22,32 L24,34 L26,32Z', fill:'#FF6B6B' }));
    return { defs: defs, g: g };
  };

  NATURE.turtle = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('ntu'+uid, [['0%','#81C784'],['100%','#4CAF50']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'12', ry:'10', fill:'url(#ntu'+uid+')' }));
    g.appendChild(el('path', { d:'M10,14 L14,10 L18,14 L22,10 L26,14 L22,18 L18,14 L14,18Z', fill:'#4CAF50', opacity:'0.5' }));
    g.appendChild(el('circle', { cx:'6', cy:'18', r:'3', fill:'#81C784' }));
    g.appendChild(el('circle', { cx:'5', cy:'17', r:'1', fill:'#3A2010' }));
    g.appendChild(el('ellipse', { cx:'10', cy:'28', rx:'2', ry:'3', fill:'#81C784' }));
    g.appendChild(el('ellipse', { cx:'26', cy:'28', rx:'2', ry:'3', fill:'#81C784' }));
    return { defs: defs, g: g };
  };

  NATURE.frog = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nfr'+uid, [['0%','#7CFFB2'],['100%','#4CAF50']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'13', ry:'10', fill:'url(#nfr'+uid+')' }));
    g.appendChild(el('circle', { cx:'10', cy:'12', r:'5', fill:'#7CFFB2', stroke:'#4CAF50', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'26', cy:'12', r:'5', fill:'#7CFFB2', stroke:'#4CAF50', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'10', cy:'12', r:'2.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'26', cy:'12', r:'2.5', fill:'#3A2010' }));
    g.appendChild(el('path', { d:'M10,26 Q18,30 26,26', fill:'none', stroke:'#3A2010', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return { defs: defs, g: g };
  };

  NATURE.whale = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nwh'+uid, [['0%','#5BC0EB'],['100%','#0277BD']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'20', rx:'15', ry:'10', fill:'url(#nwh'+uid+')' }));
    g.appendChild(el('circle', { cx:'10', cy:'18', r:'1.5', fill:'#fff' }));
    g.appendChild(el('circle', { cx:'10', cy:'18', r:'0.8', fill:'#0277BD' }));
    g.appendChild(el('path', { d:'M30,14 Q34,10 32,16 Q34,22 30,18', fill:'#5BC0EB' }));
    return { defs: defs, g: g };
  };

  NATURE.octopus = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('noc'+uid, [['0%','#FF6B8A'],['100%','#CC3366']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'14', rx:'12', ry:'10', fill:'url(#noc'+uid+')' }));
    g.appendChild(el('circle', { cx:'13', cy:'12', r:'2.5', fill:'#fff', stroke:'#CC3366', 'stroke-width':'0.5' }));
    g.appendChild(el('circle', { cx:'23', cy:'12', r:'2.5', fill:'#fff', stroke:'#CC3366', 'stroke-width':'0.5' }));
    g.appendChild(el('circle', { cx:'13', cy:'12', r:'1.5', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'23', cy:'12', r:'1.5', fill:'#3A2010' }));
    for (var i = 0; i < 6; i++) {
      var x = 8 + i * 4;
      g.appendChild(el('path', { d:'M'+x+',22 Q'+(x-2)+',28 '+x+',32 Q'+(x+2)+',28 '+x+',22', fill:'#FF8AAA', stroke:'#CC3366', 'stroke-width':'0.5' }));
    }
    return { defs: defs, g: g };
  };

  NATURE.sunflower = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nsf'+uid, [['0%','#FFD93D'],['100%','#FFB830']]));
    var g = el('g');
    for (var i = 0; i < 10; i++) {
      var a = (i * 36) * Math.PI / 180;
      var px = 18 + Math.cos(a) * 10;
      var py = 18 + Math.sin(a) * 10;
      g.appendChild(el('ellipse', { cx:String(px), cy:String(py), rx:'3', ry:'5', fill:'#FFD93D', transform:'rotate('+String(i*36)+' '+String(px)+' '+String(py)+')' }));
    }
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'6', fill:'#8B6914' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'4', fill:'#6B4E0A' }));
    g.appendChild(el('line', { x1:'18', y1:'24', x2:'18', y2:'34', stroke:'#4CAF50', 'stroke-width':'2' }));
    g.appendChild(el('ellipse', { cx:'22', cy:'30', rx:'3', ry:'2', fill:'#81C784', transform:'rotate(30 22 30)' }));
    return { defs: defs, g: g };
  };

  /* ═══════════════════════════════════════════
     OBJECTS (20 emojis)
     ═══════════════════════════════════════════ */
  var OBJECTS = {};

  OBJECTS.pizza = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('opi'+uid, [['0%','#FFD93D'],['100%','#FFB830']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M18,2 L2,32 L34,32Z', fill:'url(#opi'+uid+')' }));
    g.appendChild(el('path', { d:'M18,2 L2,32 L34,32Z', fill:'none', stroke:'#CC8800', 'stroke-width':'1' }));
    g.appendChild(el('circle', { cx:'14', cy:'20', r:'2.5', fill:'#E53935' }));
    g.appendChild(el('circle', { cx:'22', cy:'24', r:'2.5', fill:'#E53935' }));
    g.appendChild(el('circle', { cx:'18', cy:'14', r:'2', fill:'#E53935' }));
    g.appendChild(el('circle', { cx:'10', cy:'26', r:'1.5', fill:'#4CAF50' }));
    g.appendChild(el('circle', { cx:'26', cy:'28', r:'1.5', fill:'#4CAF50' }));
    return { defs: defs, g: g };
  };

  OBJECTS.hamburger = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M6,14 Q18,6 30,14', fill:'#D4A070' }));
    g.appendChild(el('path', { d:'M6,14 Q18,6 30,14', fill:'none', stroke:'#A07840', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'6', y:'14', width:'24', height:'3', rx:'1', fill:'#4CAF50' }));
    g.appendChild(el('rect', { x:'5', y:'17', width:'26', height:'4', rx:'1', fill:'#E53935' }));
    g.appendChild(el('rect', { x:'5', y:'21', width:'26', height:'3', rx:'1', fill:'#FFD93D' }));
    g.appendChild(el('path', { d:'M5,24 Q18,30 31,24', fill:'#D4A070' }));
    g.appendChild(el('path', { d:'M5,24 Q18,30 31,24', fill:'none', stroke:'#A07840', 'stroke-width':'0.8' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.hotdog = function (uid) {
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'18', rx:'14', ry:'6', fill:'#D4A070', stroke:'#A07840', 'stroke-width':'0.8' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'16', rx:'12', ry:'4', fill:'#E65100' }));
    g.appendChild(el('path', { d:'M6,16 Q10,14 14,16 Q18,14 22,16 Q26,14 30,16', fill:'none', stroke:'#FFD93D', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.cookie = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('oco'+uid, [['0%','#D4A070'],['100%','#A07840']]));
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'url(#oco'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#8B6914', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'12', cy:'14', r:'1.5', fill:'#6B4E0A' }));
    g.appendChild(el('circle', { cx:'22', cy:'12', r:'1.5', fill:'#6B4E0A' }));
    g.appendChild(el('circle', { cx:'16', cy:'22', r:'1.5', fill:'#6B4E0A' }));
    g.appendChild(el('circle', { cx:'24', cy:'20', r:'1.5', fill:'#6B4E0A' }));
    g.appendChild(el('circle', { cx:'10', cy:'22', r:'1.2', fill:'#6B4E0A' }));
    return { defs: defs, g: g };
  };

  OBJECTS.cake = function (uid) {
    var g = el('g');
    g.appendChild(el('rect', { x:'6', y:'16', width:'24', height:'14', rx:'3', fill:'#FF8AAA' }));
    g.appendChild(el('rect', { x:'6', y:'16', width:'24', height:'14', rx:'3', fill:'none', stroke:'#CC3366', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'6', y:'16', width:'24', height:'5', rx:'2', fill:'#FFB8C8' }));
    g.appendChild(el('rect', { x:'4', y:'14', width:'28', height:'4', rx:'2', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.5' }));
    g.appendChild(el('line', { x1:'12', y1:'10', x2:'12', y2:'14', stroke:'#FF6B6B', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'18', y1:'8', x2:'18', y2:'14', stroke:'#FF6B6B', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'24', y1:'10', x2:'24', y2:'14', stroke:'#FF6B6B', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:'12', cy:'8', r:'2', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'18', cy:'6', r:'2', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'24', cy:'8', r:'2', fill:'#FFD93D' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.donut = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('odo'+uid, [['0%','#FFD4A0'],['100%','#FFB870']]));
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'url(#odo'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'5', fill:'#1a1a2e' }));
    g.appendChild(el('path', { d:'M6,14 Q10,10 14,14 Q18,10 22,14 Q26,10 30,14 Q32,18 30,22 Q26,26 22,22 Q18,26 14,22 Q10,26 6,22 Q4,18 6,14Z', fill:'#FF8AAA', opacity:'0.6' }));
    g.appendChild(el('circle', { cx:'10', cy:'12', r:'1', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'26', cy:'14', r:'1', fill:'#7CFFB2' }));
    g.appendChild(el('circle', { cx:'14', cy:'26', r:'1', fill:'#5BC0EB' }));
    g.appendChild(el('circle', { cx:'22', cy:'26', r:'1', fill:'#FF6B8A' }));
    return { defs: defs, g: g };
  };

  OBJECTS.cupcake = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M10,18 L8,32 L28,32 L26,18Z', fill:'#D4A070', stroke:'#A07840', 'stroke-width':'0.8' }));
    for (var i = 0; i < 5; i++) {
      g.appendChild(el('line', { x1:String(9+i*4), y1:'18', x2:String(8+i*4), y2:'32', stroke:'#A07840', 'stroke-width':'0.5' }));
    }
    g.appendChild(el('path', { d:'M8,18 Q12,10 18,14 Q24,10 28,18', fill:'#FF8AAA' }));
    g.appendChild(el('circle', { cx:'18', cy:'10', r:'2.5', fill:'#E53935' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.icecream = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M10,18 L18,34 L26,18', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'18', cy:'12', r:'8', fill:'#FFB8C8' }));
    g.appendChild(el('circle', { cx:'18', cy:'12', r:'8', fill:'none', stroke:'#CC3366', 'stroke-width':'0.8' }));
    g.appendChild(el('circle', { cx:'14', cy:'10', r:'2', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'22', cy:'10', r:'2', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'18', cy:'16', r:'1.5', fill:'#FFD93D' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.chocolate = function (uid) {
    var g = el('g');
    g.appendChild(el('rect', { x:'4', y:'4', width:'28', height:'28', rx:'3', fill:'#6B4E0A' }));
    g.appendChild(el('rect', { x:'4', y:'4', width:'28', height:'28', rx:'3', fill:'none', stroke:'#4A3508', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'4', y1:'14', x2:'32', y2:'14', stroke:'#4A3508', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'4', y1:'22', x2:'32', y2:'22', stroke:'#4A3508', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'14', y1:'4', x2:'14', y2:'32', stroke:'#4A3508', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'22', y1:'4', x2:'22', y2:'32', stroke:'#4A3508', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'6', y:'6', width:'6', height:'6', rx:'1', fill:'#8B6914', opacity:'0.4' }));
    g.appendChild(el('rect', { x:'16', y:'6', width:'6', height:'6', rx:'1', fill:'#8B6914', opacity:'0.4' }));
    g.appendChild(el('rect', { x:'6', y:'16', width:'6', height:'6', rx:'1', fill:'#8B6914', opacity:'0.4' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.apple = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('napp'+uid, [['0%','#FF4D4D'],['100%','#CC0000']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M18,8 Q10,8 6,14 Q2,20 6,28 Q10,34 18,34 Q26,34 30,28 Q34,20 30,14 Q26,8 18,8Z', fill:'url(#napp'+uid+')' }));
    g.appendChild(el('path', { d:'M18,8 Q10,8 6,14 Q2,20 6,28 Q10,34 18,34 Q26,34 30,28 Q34,20 30,14 Q26,8 18,8Z', fill:'none', stroke:'#990000', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'18', y1:'8', x2:'20', y2:'2', stroke:'#6B4E0A', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('ellipse', { cx:'22', cy:'6', rx:'3', ry:'2', fill:'#4CAF50', transform:'rotate(30 22 6)' }));
    g.appendChild(el('ellipse', { cx:'12', cy:'16', rx:'3', ry:'4', fill:'#fff', opacity:'0.15', transform:'rotate(-20 12 16)' }));
    return { defs: defs, g: g };
  };

  OBJECTS.banana = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M28,6 Q32,8 30,16 Q28,24 20,30 Q16,32 14,30 Q12,28 16,22 Q20,16 26,10 Q28,8 28,6Z', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M14,30 Q12,28 16,22', fill:'none', stroke:'#CC8800', 'stroke-width':'0.8' }));
    g.appendChild(el('ellipse', { cx:'28', cy:'6', rx:'2', ry:'1', fill:'#8B6914' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.strawberry = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nst'+uid, [['0%','#FF4D6A'],['100%','#CC0033']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M18,8 Q10,10 8,20 Q6,28 18,34 Q30,28 28,20 Q26,10 18,8Z', fill:'url(#nst'+uid+')' }));
    g.appendChild(el('path', { d:'M18,8 Q10,10 8,20 Q6,28 18,34 Q30,28 28,20 Q26,10 18,8Z', fill:'none', stroke:'#990033', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M14,6 L12,2 L18,6 L24,2 L22,6', fill:'#4CAF50' }));
    g.appendChild(el('circle', { cx:'14', cy:'18', r:'0.8', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'22', cy:'18', r:'0.8', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'18', cy:'24', r:'0.8', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'14', cy:'28', r:'0.8', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'22', cy:'28', r:'0.8', fill:'#FFD93D' }));
    return { defs: defs, g: g };
  };

  OBJECTS.grape = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('ngr'+uid, [['0%','#9C27B0'],['100%','#6A1B9A']]));
    var g = el('g');
    g.appendChild(el('line', { x1:'18', y1:'2', x2:'18', y2:'8', stroke:'#4CAF50', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'4', rx:'4', ry:'2', fill:'#4CAF50', transform:'rotate(-20 18 4)' }));
    g.appendChild(el('circle', { cx:'14', cy:'14', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'22', cy:'14', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'20', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'12', cy:'22', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'24', cy:'22', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'18', cy:'28', r:'4', fill:'url(#ngr'+uid+')' }));
    g.appendChild(el('circle', { cx:'14', cy:'14', r:'1', fill:'#fff', opacity:'0.2' }));
    return { defs: defs, g: g };
  };

  OBJECTS.rocket = function (uid) {
    var defs = el('defs');
    defs.appendChild(linGrad('gro'+uid, [['0%','#F0F0F5'],['100%','#C8C8D4']]));
    var g = el('g');
    g.appendChild(el('path', { d:'M14,28 Q18,36 22,28 Q20,32 18,34 Q16,32 14,28Z', fill:'#FF6B35' }));
    g.appendChild(el('path', { d:'M15.5,28 Q18,33 20.5,28 Q19.5,31 18,32 Q16.5,31 15.5,28Z', fill:'#FFD93D' }));
    g.appendChild(el('path', { d:'M18,2 C18,2 26,8 26,18 L26,26 L10,26 L10,18 C10,8 18,2 18,2Z', fill:'url(#gro'+uid+')' }));
    g.appendChild(el('path', { d:'M18,2 C18,2 26,8 26,18 L26,26 L10,26 L10,18 C10,8 18,2 18,2Z', fill:'none', stroke:'#A0A0B0', 'stroke-width':'0.6' }));
    g.appendChild(el('circle', { cx:'18', cy:'14', r:'3.5', fill:'#0A0F2E', stroke:'#6C63FF', 'stroke-width':'0.6' }));
    g.appendChild(el('circle', { cx:'18', cy:'14', r:'2', fill:'#1a1a3e' }));
    g.appendChild(el('path', { d:'M10,20 L6,26 L10,26Z', fill:'#6C63FF', opacity:'0.8' }));
    g.appendChild(el('path', { d:'M26,20 L30,26 L26,26Z', fill:'#6C63FF', opacity:'0.8' }));
    return { defs: defs, g: g };
  };

  OBJECTS.crown = function (uid) {
    var defs = el('defs');
    defs.appendChild(linGrad('gcw'+uid, [['0%','#FFD93D'],['50%','#FFB830'],['100%','#E8A020']]));
    var g = el('g');
    g.appendChild(el('polygon', { points:'4,24 6,10 12,17 18,4 24,17 30,10 32,24', fill:'url(#gcw'+uid+')', stroke:'#CC8800', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'4', y:'24', width:'28', height:'5', rx:'2', fill:'url(#gcw'+uid+')', stroke:'#CC8800', 'stroke-width':'0.6' }));
    g.appendChild(el('circle', { cx:'11', cy:'26.5', r:'1.5', fill:'#FF4D6A' }));
    g.appendChild(el('circle', { cx:'18', cy:'26.5', r:'1.8', fill:'#6C63FF' }));
    g.appendChild(el('circle', { cx:'25', cy:'26.5', r:'1.5', fill:'#00E5FF' }));
    return { defs: defs, g: g };
  };

  OBJECTS.diamond = function (uid) {
    var defs = el('defs');
    defs.appendChild(linGrad('gdi'+uid, [['0%','#B3E5FC'],['50%','#81D4FA'],['100%','#0277BD']]));
    var g = el('g');
    g.appendChild(el('polygon', { points:'18,2 30,12 18,34 6,12', fill:'url(#gdi'+uid+')' }));
    g.appendChild(el('polygon', { points:'18,2 30,12 18,34 6,12', fill:'none', stroke:'#01579B', 'stroke-width':'0.8' }));
    g.appendChild(el('polygon', { points:'6,12 12,12 18,2 18,12', fill:'#E1F5FE', opacity:'0.4' }));
    g.appendChild(el('line', { x1:'6', y1:'12', x2:'30', y2:'12', stroke:'#01579B', 'stroke-width':'0.5' }));
    g.appendChild(el('line', { x1:'12', y1:'12', x2:'18', y2:'2', stroke:'#B3E5FC', 'stroke-width':'0.3', opacity:'0.6' }));
    g.appendChild(el('line', { x1:'24', y1:'12', x2:'18', y2:'2', stroke:'#B3E5FC', 'stroke-width':'0.3', opacity:'0.6' }));
    return { defs: defs, g: g };
  };

  OBJECTS.gamepad = function (uid) {
    var g = el('g');
    g.appendChild(el('rect', { x:'4', y:'12', width:'28', height:'12', rx:'6', fill:'#1a1a2e' }));
    g.appendChild(el('rect', { x:'4', y:'12', width:'28', height:'12', rx:'6', fill:'none', stroke:'#6C63FF', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'10', y1:'15', x2:'10', y2:'21', stroke:'#fff', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'7', y1:'18', x2:'13', y2:'18', stroke:'#fff', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:'24', cy:'15', r:'1.2', fill:'#FF4D6A' }));
    g.appendChild(el('circle', { cx:'27', cy:'18', r:'1.2', fill:'#5BC0EB' }));
    g.appendChild(el('circle', { cx:'24', cy:'21', r:'1.2', fill:'#FFD93D' }));
    g.appendChild(el('circle', { cx:'21', cy:'18', r:'1.2', fill:'#7CFFB2' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.headphones = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M6,20 Q6,8 18,8 Q30,8 30,20', fill:'none', stroke:'#1a1a2e', 'stroke-width':'3', 'stroke-linecap':'round' }));
    g.appendChild(el('rect', { x:'3', y:'18', width:'6', height:'10', rx:'3', fill:'#6C63FF' }));
    g.appendChild(el('rect', { x:'27', y:'18', width:'6', height:'10', rx:'3', fill:'#6C63FF' }));
    g.appendChild(el('rect', { x:'4', y:'20', width:'4', height:'6', rx:'2', fill:'#4F46E5' }));
    g.appendChild(el('rect', { x:'28', y:'20', width:'4', height:'6', rx:'2', fill:'#4F46E5' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.balloon = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('nba'+uid, [['0%','#FF6B8A'],['100%','#CC3366']]));
    var g = el('g');
    g.appendChild(el('ellipse', { cx:'18', cy:'14', rx:'8', ry:'10', fill:'url(#nba'+uid+')' }));
    g.appendChild(el('ellipse', { cx:'18', cy:'14', rx:'8', ry:'10', fill:'none', stroke:'#990033', 'stroke-width':'0.8' }));
    g.appendChild(el('polygon', { points:'16,24 18,26 20,24', fill:'#CC3366' }));
    g.appendChild(el('line', { x1:'18', y1:'26', x2:'18', y2:'34', stroke:'#999', 'stroke-width':'0.8' }));
    g.appendChild(el('ellipse', { cx:'15', cy:'12', rx:'2', ry:'3', fill:'#fff', opacity:'0.2', transform:'rotate(-15 15 12)' }));
    return { defs: defs, g: g };
  };

  OBJECTS.gift = function (uid) {
    var g = el('g');
    g.appendChild(el('rect', { x:'6', y:'14', width:'24', height:'18', rx:'2', fill:'#6C63FF', stroke:'#4F46E5', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'6', y:'10', width:'24', height:'6', rx:'2', fill:'#FF4D6A', stroke:'#CC3366', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'16', y:'10', width:'4', height:'22', fill:'#FFD93D' }));
    g.appendChild(el('path', { d:'M18,10 Q12,4 8,8 Q6,10 10,10', fill:'#FFD93D' }));
    g.appendChild(el('path', { d:'M18,10 Q24,4 28,8 Q30,10 26,10', fill:'#FFD93D' }));
    return { defs: el('defs'), g: g };
  };

  OBJECTS.film = function (uid) {
    var g = el('g');
    g.appendChild(el('rect', { x:'4', y:'4', width:'28', height:'28', rx:'2', fill:'#1a1a2e' }));
    g.appendChild(el('rect', { x:'4', y:'4', width:'28', height:'28', rx:'2', fill:'none', stroke:'#6C63FF', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'6', y:'4', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('rect', { x:'14', y:'4', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('rect', { x:'22', y:'4', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('rect', { x:'6', y:'28', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('rect', { x:'14', y:'28', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('rect', { x:'22', y:'28', width:'4', height:'4', rx:'0.5', fill:'#333' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'6', fill:'#6C63FF', opacity:'0.6' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'3', fill:'#0A0F2E' }));
    return { defs: el('defs'), g: g };
  };

  /* ═══════════════════════════════════════════
     SYMBOLS (15 emojis)
     ═══════════════════════════════════════════ */
  var SYMBOLS = {};

  SYMBOLS.check = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#4CAF50' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#2E7D32', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M10,18 L16,24 L26,12', fill:'none', stroke:'#fff', 'stroke-width':'3', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.x_mark = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#E53935' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#B71C1C', 'stroke-width':'0.8' }));
    g.appendChild(el('line', { x1:'12', y1:'12', x2:'24', y2:'24', stroke:'#fff', 'stroke-width':'3', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'24', y1:'12', x2:'12', y2:'24', stroke:'#fff', 'stroke-width':'3', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.question = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#6C63FF' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#4F46E5', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M12,12 Q12,8 18,8 Q24,8 24,12 Q24,16 18,18 L18,22', fill:'none', stroke:'#fff', 'stroke-width':'2.5', 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:'18', cy:'26', r:'1.5', fill:'#fff' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.exclamation = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#FFB830' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#CC8800', 'stroke-width':'0.8' }));
    g.appendChild(el('rect', { x:'16', y:'8', width:'4', height:'14', rx:'2', fill:'#fff' }));
    g.appendChild(el('circle', { cx:'18', cy:'26', r:'2', fill:'#fff' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.warning = function (uid) {
    var g = el('g');
    g.appendChild(el('polygon', { points:'18,2 34,30 2,30', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'1' }));
    g.appendChild(el('rect', { x:'16', y:'12', width:'4', height:'10', rx:'2', fill:'#3A2010' }));
    g.appendChild(el('circle', { cx:'18', cy:'26', r:'2', fill:'#3A2010' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.forbidden = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#E53935', 'stroke-width':'3' }));
    g.appendChild(el('line', { x1:'6', y1:'6', x2:'30', y2:'30', stroke:'#E53935', 'stroke-width':'3', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.recycle = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M18,4 L10,18 L14,18 L10,28', fill:'none', stroke:'#4CAF50', 'stroke-width':'2.5', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    g.appendChild(el('path', { d:'M10,28 L26,28 L22,18 L26,18', fill:'none', stroke:'#4CAF50', 'stroke-width':'2.5', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    g.appendChild(el('path', { d:'M26,18 L22,4 L14,18 L10,18', fill:'none', stroke:'#4CAF50', 'stroke-width':'2.5', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    g.appendChild(el('polygon', { points:'10,16 14,18 10,20', fill:'#4CAF50' }));
    g.appendChild(el('polygon', { points:'26,16 22,18 26,20', fill:'#4CAF50' }));
    g.appendChild(el('polygon', { points:'16,28 18,32 20,28', fill:'#4CAF50' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.peace_symbol = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#6C63FF', 'stroke-width':'2' }));
    g.appendChild(el('line', { x1:'18', y1:'4', x2:'18', y2:'32', stroke:'#6C63FF', 'stroke-width':'2' }));
    g.appendChild(el('path', { d:'M18,18 L10,28', fill:'none', stroke:'#6C63FF', 'stroke-width':'2', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M18,18 L26,28', fill:'none', stroke:'#6C63FF', 'stroke-width':'2', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.yin_yang = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#fff', stroke:'#1a1a2e', 'stroke-width':'1' }));
    g.appendChild(el('path', { d:'M18,4 A7,7 0 0,1 18,18 A7,7 0 0,0 18,32', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'18', cy:'11', r:'2.5', fill:'#1a1a2e' }));
    g.appendChild(el('circle', { cx:'18', cy:'25', r:'2.5', fill:'#fff' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.infinite = function (uid) {
    var g = el('g');
    g.appendChild(el('path', { d:'M10,18 Q10,10 18,10 Q26,10 26,18 Q26,26 18,26 Q10,26 10,18 Q10,10 18,10', fill:'none', stroke:'#6C63FF', 'stroke-width':'3', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M10,18 Q10,10 18,10 Q26,10 26,18 Q26,26 18,26 Q10,26 10,18 Q10,10 18,10', fill:'none', stroke:'#6C63FF', 'stroke-width':'3', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.arrow_up = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#6C63FF' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#4F46E5', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M18,8 L18,26', fill:'none', stroke:'#fff', 'stroke-width':'2.5', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M12,14 L18,8 L24,14', fill:'none', stroke:'#fff', 'stroke-width':'2.5', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.arrow_down = function (uid) {
    var g = el('g');
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'#6C63FF' }));
    g.appendChild(el('circle', { cx:'18', cy:'18', r:'14', fill:'none', stroke:'#4F46E5', 'stroke-width':'0.8' }));
    g.appendChild(el('path', { d:'M18,28 L18,10', fill:'none', stroke:'#fff', 'stroke-width':'2.5', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M12,22 L18,28 L24,22', fill:'none', stroke:'#fff', 'stroke-width':'2.5', 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.hundred = function (uid) {
    var g = el('g');
    g.appendChild(el('text', { x:'4', y:'24', 'font-size':'16', 'font-weight':'900', fill:'#FF4D6A', 'font-family':'Inter,sans-serif' })).textContent = '100';
    g.appendChild(el('line', { x1:'4', y1:'6', x2:'12', y2:'6', stroke:'#FF4D6A', 'stroke-width':'2', 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:'4', y1:'10', x2:'12', y2:'10', stroke:'#FF4D6A', 'stroke-width':'2', 'stroke-linecap':'round' }));
    g.appendChild(el('path', { d:'M28,8 Q32,4 30,10 Q32,16 28,12 Q32,8 30,14', fill:'none', stroke:'#FFD93D', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.sparkles = function (uid) {
    var g = el('g');
    var pts = [[18,4],[10,14],[4,22],[14,18],[18,32],[22,18],[32,22],[26,14]];
    for (var i = 0; i < pts.length; i++) {
      g.appendChild(el('circle', { cx:String(pts[i][0]), cy:String(pts[i][1]), r:i%2===0?'2.5':'1.5', fill:i%3===0?'#FFD93D':i%3===1?'#FF6B8A':'#5BC0EB' }));
    }
    return { defs: el('defs'), g: g };
  };

  SYMBOLS.star2 = function (uid) {
    var defs = el('defs');
    defs.appendChild(radGrad('gst'+uid, [['0%','#FFD93D'],['100%','#FFB830']]));
    var g = el('g');
    g.appendChild(el('polygon', { points:'18,2 21,12 32,12 23,18 26,28 18,22 10,28 13,18 4,12 15,12', fill:'url(#gst'+uid+')', stroke:'#CC8800', 'stroke-width':'0.8' }));
    return { defs: defs, g: g };
  };

  /* ═══════════════════════════════════════════
     REGISTER ALL
     ═══════════════════════════════════════════ */
  var ALL = {};
  Object.keys(FACES).forEach(function (k) { ALL[k] = { name: k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), id: ':hive_'+k+':', cat: 'faces' }; });
  Object.keys(HANDS).forEach(function (k) { ALL[k] = { name: k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), id: ':hive_'+k+':', cat: 'hands' }; });
  Object.keys(NATURE).forEach(function (k) { ALL[k] = { name: k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), id: ':hive_'+k+':', cat: 'nature' }; });
  Object.keys(OBJECTS).forEach(function (k) { ALL[k] = { name: k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), id: ':hive_'+k+':', cat: 'objects' }; });
  Object.keys(SYMBOLS).forEach(function (k) { ALL[k] = { name: k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), id: ':hive_'+k+':', cat: 'symbols' }; });

  window.HiveEmoji.register(ALL);

  /* Extend buildEmoji to support extended emojis */
  var origBuild = null;
  var EXT_BUILDERS = {};

  Object.keys(FACES).forEach(function (k) { EXT_BUILDERS[k] = FACES[k]; });
  Object.keys(HANDS).forEach(function (k) { EXT_BUILDERS[k] = HANDS[k]; });
  Object.keys(NATURE).forEach(function (k) { EXT_BUILDERS[k] = NATURE[k]; });
  Object.keys(OBJECTS).forEach(function (k) { EXT_BUILDERS[k] = OBJECTS[k]; });
  Object.keys(SYMBOLS).forEach(function (k) { EXT_BUILDERS[k] = SYMBOLS[k]; });

  window.HiveEmoji._extBuilders = EXT_BUILDERS;

  /* Monkey-patch create to support extended emojis */
  var origCreate = window.HiveEmoji.create;
  window.HiveEmoji.create = function (name, size) {
    var info = window.HiveEmoji.get(name);
    if (!info) return null;
    if (EXT_BUILDERS[name]) {
      size = size || 22;
      var wrapper = document.createElement('span');
      wrapper.className = 'hive-emoji';
      wrapper.setAttribute('data-emoji', name);
      wrapper.setAttribute('aria-label', info.name);
      wrapper.style.width = size + 'px';
      wrapper.style.height = size + 'px';
      wrapper.style.display = 'inline-flex';
      wrapper.style.verticalAlign = 'middle';
      var uid = nextUid();
      var result = EXT_BUILDERS[name](uid);
      var svg = buildSvg(result);
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      wrapper.appendChild(svg);
      return wrapper;
    }
    return origCreate(name, size);
  };
})();

