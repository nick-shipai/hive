/**
 * Hive — Rank Badge System
 * Reusable animated SVG badge component for all 15 ranks.
 * Global namespace: HiveRankBadge
 */
var HiveRankBadge = (function () {
  'use strict';

  var RANK_INFO = {
    rookie:      { label: 'Rookie',      color: '#7a8599', glow: 'rgba(122,133,153,0.35)' },
    explorer:    { label: 'Explorer',    color: '#3B82F6', glow: 'rgba(59,130,246,0.4)' },
    member:      { label: 'Member',      color: '#38BDF8', glow: 'rgba(56,189,248,0.4)' },
    contributor: { label: 'Contributor', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)' },
    insider:     { label: 'Insider',     color: '#06B6D4', glow: 'rgba(6,182,212,0.45)' },
    pioneer:     { label: 'Pioneer',     color: '#7C3AED', glow: 'rgba(124,58,237,0.45)' },
    elite:       { label: 'Elite',       color: '#A855F7', glow: 'rgba(168,85,247,0.45)' },
    legend:      { label: 'Legend',      color: '#F59E0B', glow: 'rgba(245,158,11,0.45)' },
    titan:       { label: 'Titan',       color: '#EC4899', glow: 'rgba(236,72,153,0.45)' },
    nova:        { label: 'Nova',        color: '#F59E0B', glow: 'rgba(245,158,11,0.5)' },
    moderator:   { label: 'Moderator',   color: '#3B82F6', glow: 'rgba(59,130,246,0.45)' },
    administrator:{ label: 'Administrator', color: '#8B5CF6', glow: 'rgba(139,92,246,0.45)' },
    owner:       { label: 'Owner',       color: '#F59E0B', glow: 'rgba(245,158,11,0.5)' },
    verified:    { label: 'Verified',    color: '#6C63FF', glow: 'rgba(108,99,255,0.45)' },
    bot:         { label: 'Bot',         color: '#00E5FF', glow: 'rgba(0,229,255,0.45)' },
  };

  function createBadge(rank, size) {
    if (!rank || !RANK_INFO[rank]) return null;
    size = size || 16;
    var info = RANK_INFO[rank];
    var ns = 'http://www.w3.org/2000/svg';
    var wrapper = document.createElement('span');
    wrapper.className = 'rank-badge rank-' + rank;
    wrapper.setAttribute('data-rank', rank);
    wrapper.setAttribute('data-rank-tip', info.label);
    wrapper.style.width = size + 'px';
    wrapper.style.height = size + 'px';

    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.classList.add('rank-badge-svg');

    var defs = document.createElementNS(ns, 'defs');

    // Unique gradient id per rank
    var gradId = 'rg-' + rank;
    var grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '100%');
    var stop1 = document.createElementNS(ns, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', info.color);
    var stop2 = document.createElementNS(ns, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', lighten(info.color, 40));
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    // Glow filter
    var filterId = 'gf-' + rank;
    var filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', filterId);
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    var blur = document.createElementNS(ns, 'feGaussianBlur');
    blur.setAttribute('in', 'SourceGraphic');
    blur.setAttribute('stdDeviation', '1.5');
    blur.setAttribute('result', 'blur');
    var merge = document.createElementNS(ns, 'feMerge');
    var mn1 = document.createElementNS(ns, 'feMergeNode');
    mn1.setAttribute('in', 'blur');
    var mn2 = document.createElementNS(ns, 'feMergeNode');
    mn2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);

    svg.appendChild(defs);

    // Build rank-specific SVG content
    var content = buildBadgeContent(rank, ns, gradId, filterId, info);
    if (Array.isArray(content)) {
      content.forEach(function (el) { svg.appendChild(el); });
    } else {
      svg.appendChild(content);
    }

    wrapper.appendChild(svg);
    return wrapper;
  }

  function lighten(hex, percent) {
    var num = parseInt(hex.replace('#', ''), 16);
    var r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    var g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    var b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function el(tag, attrs, ns) {
    var e = document.createElementNS(ns || 'http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function buildBadgeContent(rank, ns, gradId, filterId, info) {
    switch (rank) {

      /* ── ROOKIE: Simple hexagon, minimal glow ────────── */
      case 'rookie': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        g.appendChild(el('polygon', {
          points: '12,2 21.5,7 21.5,17 12,22 2.5,17 2.5,7',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85',
          'stroke': info.color,
          'stroke-width': '0.5'
        }, ns));
        var t = el('text', {
          x: '12', y: '13.5',
          'text-anchor': 'middle',
          'font-size': '7',
          'font-weight': '700',
          fill: '#fff',
          'font-family': 'Inter,sans-serif'
        }, ns);
        t.textContent = 'R';
        g.appendChild(t);
        return g;
      }

      /* ── EXPLORER: Compass badge ─────────────────────── */
      case 'explorer': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '10', fill: 'url(#' + gradId + ')', opacity: '0.2' }, ns));
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: info.color, 'stroke-width': '1', opacity: '0.6' }, ns));
        // Compass points
        g.appendChild(el('polygon', { points: '12,3 13.5,10 12,8 10.5,10', fill: info.color, opacity: '0.9' }, ns));
        g.appendChild(el('polygon', { points: '12,21 13.5,14 12,16 10.5,14', fill: '#fff', opacity: '0.4' }, ns));
        g.appendChild(el('polygon', { points: '3,12 10,10.5 8,12 10,13.5', fill: info.color, opacity: '0.7' }, ns));
        g.appendChild(el('polygon', { points: '21,12 14,10.5 16,12 14,13.5', fill: '#fff', opacity: '0.4' }, ns));
        var anim = el('animateTransform', {
          attributeName: 'transform', type: 'rotate',
          from: '0 12 12', to: '360 12 12',
          dur: '20s', repeatCount: 'indefinite'
        }, ns);
        g.appendChild(anim);
        return g;
      }

      /* ── MEMBER: Crystal badge ──────────────────────── */
      case 'member': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        g.appendChild(el('polygon', {
          points: '12,1 15,8 22,8 16.5,13 18.5,21 12,16.5 5.5,21 7.5,13 2,8 9,8',
          fill: 'url(#' + gradId + ')',
          opacity: '0.8',
          stroke: info.color,
          'stroke-width': '0.5'
        }, ns));
        var anim = el('animate', {
          attributeName: 'opacity', values: '0.8;1;0.8',
          dur: '3s', repeatCount: 'indefinite'
        }, ns);
        g.appendChild(anim);
        return g;
      }

      /* ── CONTRIBUTOR: Layered shield ─────────────────── */
      case 'contributor': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Back layer
        g.appendChild(el('path', {
          d: 'M12,2 L20,7 L20,14 C20,18.5 16.5,22 12,23 C7.5,22 4,18.5 4,14 L4,7 Z',
          fill: info.color, opacity: '0.25'
        }, ns));
        // Mid layer
        g.appendChild(el('path', {
          d: 'M12,4 L18,8 L18,14 C18,17.5 15.5,20.5 12,21.5 C8.5,20.5 6,17.5 6,14 L6,8 Z',
          fill: info.color, opacity: '0.5'
        }, ns));
        // Front layer
        g.appendChild(el('path', {
          d: 'M12,6 L16,9 L16,14 C16,16.5 14.5,18.5 12,19.5 C9.5,18.5 8,16.5 8,14 L8,9 Z',
          fill: 'url(#' + gradId + ')', opacity: '0.9'
        }, ns));
        var t = el('text', {
          x: '12', y: '14.5',
          'text-anchor': 'middle',
          'font-size': '6',
          'font-weight': '700',
          fill: '#fff',
          'font-family': 'Inter,sans-serif'
        }, ns);
        t.textContent = '+';
        g.appendChild(t);
        return g;
      }

      /* ── INSIDER: Glass diamond with shimmer ─────────── */
      case 'insider': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        g.appendChild(el('polygon', {
          points: '12,1 22,12 12,23 2,12',
          fill: 'url(#' + gradId + ')',
          opacity: '0.7',
          stroke: info.color,
          'stroke-width': '0.8'
        }, ns));
        // Inner facet
        g.appendChild(el('polygon', {
          points: '12,5 18,12 12,19 6,12',
          fill: '#fff',
          opacity: '0.12'
        }, ns));
        // Shimmer sweep
        var shimmer = el('rect', {
          x: '-4', y: '0', width: '4', height: '24',
          fill: 'url(#shimmerGrad-' + rank + ')',
          opacity: '0.4',
          transform: 'skewX(-20)'
        }, ns);
        var shimGrad = document.createElementNS(ns, 'linearGradient');
        shimGrad.setAttribute('id', 'shimmerGrad-' + rank);
        var sh1 = el('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '0' }, ns);
        var sh2 = el('stop', { offset: '50%', 'stop-color': '#fff', 'stop-opacity': '0.6' }, ns);
        var sh3 = el('stop', { offset: '100%', 'stop-color': '#fff', 'stop-opacity': '0' }, ns);
        shimGrad.appendChild(sh1);
        shimGrad.appendChild(sh2);
        shimGrad.appendChild(sh3);
        defs.appendChild(shimGrad);
        var animShim = el('animateTransform', {
          attributeName: 'transform', type: 'translate',
          from: '-6 0', to: '28 0',
          dur: '2.5s', repeatCount: 'indefinite'
        }, ns);
        shimmer.appendChild(animShim);
        g.appendChild(shimmer);
        return g;
      }

      /* ── PIONEER: Futuristic shield ──────────────────── */
      case 'pioneer': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Shield shape
        g.appendChild(el('path', {
          d: 'M12,1 L21,6 L21,13 C21,18 17,22 12,24 C7,22 3,18 3,13 L3,6 Z',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85'
        }, ns));
        // Inner chevron
        g.appendChild(el('path', {
          d: 'M12,5 L17,8.5 L17,13 C17,16 14.5,18.5 12,19.5 C9.5,18.5 7,16 7,13 L7,8.5 Z',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': '0.7',
          opacity: '0.5'
        }, ns));
        // Star accent
        g.appendChild(el('polygon', {
          points: '12,7 13,10 16,10 13.5,12 14.5,15 12,13 9.5,15 10.5,12 8,10 11,10',
          fill: '#fff',
          opacity: '0.7'
        }, ns));
        var anim = el('animate', {
          attributeName: 'opacity', values: '0.85;1;0.85',
          dur: '2.5s', repeatCount: 'indefinite'
        }, ns);
        g.appendChild(anim);
        return g;
      }

      /* ── ELITE: Crystalline emblem with pulse ────────── */
      case 'elite': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Outer ring
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '10.5', fill: 'none', stroke: info.color, 'stroke-width': '1', opacity: '0.4' }, ns));
        // Crystal body
        g.appendChild(el('polygon', {
          points: '12,2 16,7 16,17 12,22 8,17 8,7',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85'
        }, ns));
        // Inner facets
        g.appendChild(el('line', { x1: '12', y1: '2', x2: '12', y2: '22', stroke: '#fff', 'stroke-width': '0.4', opacity: '0.3' }, ns));
        g.appendChild(el('line', { x1: '8', y1: '7', x2: '16', y2: '17', stroke: '#fff', 'stroke-width': '0.3', opacity: '0.2' }, ns));
        g.appendChild(el('line', { x1: '16', y1: '7', x2: '8', y2: '17', stroke: '#fff', 'stroke-width': '0.3', opacity: '0.2' }, ns));
        // Energy pulse ring
        var pulse = el('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: info.color, 'stroke-width': '1.5', opacity: '0' }, ns);
        var animPulse = el('animate', {
          attributeName: 'r', values: '6;12', dur: '2s', repeatCount: 'indefinite'
        }, ns);
        var animOp = el('animate', {
          attributeName: 'opacity', values: '0.6;0', dur: '2s', repeatCount: 'indefinite'
        }, ns);
        pulse.appendChild(animPulse);
        pulse.appendChild(animOp);
        g.appendChild(pulse);
        return g;
      }

      /* ── LEGEND: Large radiant badge with light sweep ── */
      case 'legend': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Radiant background
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '11', fill: 'url(#' + gradId + ')', opacity: '0.2' }, ns));
        // Main emblem
        g.appendChild(el('polygon', {
          points: '12,1 15.5,8 23,8.5 17,13.5 19,21 12,17 5,21 7,13.5 1,8.5 8.5,8',
          fill: 'url(#' + gradId + ')',
          opacity: '0.9',
          stroke: info.color,
          'stroke-width': '0.5'
        }, ns));
        // Inner star
        g.appendChild(el('polygon', {
          points: '12,5 13.2,9.5 18,9.5 14,12.5 15.5,17 12,14 8.5,17 10,12.5 6,9.5 10.8,9.5',
          fill: '#fff',
          opacity: '0.25'
        }, ns));
        // Light sweep
        var sweep = el('rect', { x: '-2', y: '0', width: '3', height: '24', fill: '#fff', opacity: '0', transform: 'skewX(-25)' }, ns);
        var animSweep = el('animateTransform', {
          attributeName: 'transform', type: 'translate',
          from: '-6 0', to: '30 0',
          dur: '3s', repeatCount: 'indefinite'
        }, ns);
        var animSweepOp = el('animate', {
          attributeName: 'opacity', values: '0;0.35;0', dur: '3s', repeatCount: 'indefinite'
        }, ns);
        sweep.appendChild(animSweep);
        sweep.appendChild(animSweepOp);
        g.appendChild(sweep);
        return g;
      }

      /* ── TITAN: Multi-layer emblem with float ────────── */
      case 'titan': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Floating animation on the whole group
        var animFloat = el('animateTransform', {
          attributeName: 'transform', type: 'translate',
          values: '0,0; 0,-1; 0,0', dur: '3s', repeatCount: 'indefinite'
        }, ns);
        g.appendChild(animFloat);
        // Outer glow ring
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '11', fill: 'none', stroke: info.color, 'stroke-width': '0.8', opacity: '0.3' }, ns));
        // Mid ring
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '9', fill: 'none', stroke: info.color, 'stroke-width': '0.6', opacity: '0.5' }, ns));
        // Main body
        g.appendChild(el('polygon', {
          points: '12,2 16,6 20,6 20,12 20,16 16,20 12,22 8,20 4,16 4,12 4,6 8,6',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85'
        }, ns));
        // Inner crystal
        g.appendChild(el('polygon', {
          points: '12,5 15,8.5 15,15.5 12,19 9,15.5 9,8.5',
          fill: '#fff',
          opacity: '0.15'
        }, ns));
        // T letter
        var t = el('text', {
          x: '12', y: '14',
          'text-anchor': 'middle',
          'font-size': '8',
          'font-weight': '800',
          fill: '#fff',
          'font-family': 'Inter,sans-serif',
          opacity: '0.9'
        }, ns);
        t.textContent = 'T';
        g.appendChild(t);
        // Glow pulse
        var glow = el('circle', { cx: '12', cy: '12', r: '10', fill: info.color, opacity: '0' }, ns);
        var animGlow = el('animate', {
          attributeName: 'opacity', values: '0;0.15;0', dur: '2s', repeatCount: 'indefinite'
        }, ns);
        glow.appendChild(animGlow);
        g.appendChild(glow);
        return g;
      }

      /* ── NOVA: The best badge — star core + energy rings + particles ── */
      case 'nova': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);

        // Slow rotation on outer ring
        var outerG = el('g', {}, ns);
        var animOuter = el('animateTransform', {
          attributeName: 'transform', type: 'rotate',
          from: '0 12 12', to: '360 12 12',
          dur: '12s', repeatCount: 'indefinite'
        }, ns);
        outerG.appendChild(animOuter);
        // Outer energy ring
        outerG.appendChild(el('circle', { cx: '12', cy: '12', r: '11', fill: 'none', stroke: info.color, 'stroke-width': '0.8', opacity: '0.5', 'stroke-dasharray': '3 2' }, ns));
        g.appendChild(outerG);

        // Counter-rotating inner ring
        var innerG = el('g', {}, ns);
        var animInner = el('animateTransform', {
          attributeName: 'transform', type: 'rotate',
          from: '360 12 12', to: '0 12 12',
          dur: '8s', repeatCount: 'indefinite'
        }, ns);
        innerG.appendChild(animInner);
        innerG.appendChild(el('circle', { cx: '12', cy: '12', r: '8.5', fill: 'none', stroke: lighten(info.color, 30), 'stroke-width': '0.6', opacity: '0.4', 'stroke-dasharray': '1.5 3' }, ns));
        g.appendChild(innerG);

        // Background glow
        g.appendChild(el('circle', { cx: '12', cy: '12', r: '7', fill: info.color, opacity: '0.15' }, ns));

        // Star body
        g.appendChild(el('polygon', {
          points: '12,2 14.5,8.5 21.5,9 16,13.5 17.5,20.5 12,16.5 6.5,20.5 8,13.5 2.5,9 9.5,8.5',
          fill: 'url(#' + gradId + ')',
          opacity: '0.9'
        }, ns));

        // Inner star
        g.appendChild(el('polygon', {
          points: '12,5.5 13.5,10 18,10 14.5,13 15.5,17.5 12,14.5 8.5,17.5 9.5,13 6,10 10.5,10',
          fill: '#fff',
          opacity: '0.2'
        }, ns));

        // Core glow pulse
        var core = el('circle', { cx: '12', cy: '12', r: '4', fill: '#fff', opacity: '0' }, ns);
        var animCore = el('animate', {
          attributeName: 'opacity', values: '0;0.35;0', dur: '1.8s', repeatCount: 'indefinite'
        }, ns);
        var animCoreR = el('animate', {
          attributeName: 'r', values: '3;5;3', dur: '1.8s', repeatCount: 'indefinite'
        }, ns);
        core.appendChild(animCore);
        core.appendChild(animCoreR);
        g.appendChild(core);

        // Particle dots
        var particleAngles = [0, 60, 120, 180, 240, 300];
        particleAngles.forEach(function (angle, i) {
          var rad = (angle * Math.PI) / 180;
          var cx = 12 + Math.cos(rad) * 10.5;
          var cy = 12 + Math.sin(rad) * 10.5;
          var dot = el('circle', {
            cx: String(cx), cy: String(cy), r: '0.8',
            fill: info.color, opacity: '0'
          }, ns);
          var animDot = el('animate', {
            attributeName: 'opacity', values: '0;0.7;0',
            dur: '2s',
            begin: (i * 0.33) + 's',
            repeatCount: 'indefinite'
          }, ns);
          dot.appendChild(animDot);
          g.appendChild(dot);
        });

        return g;
      }

      /* ── MODERATOR: Blue shield ──────────────────────── */
      case 'moderator': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        g.appendChild(el('path', {
          d: 'M12,2 L20,7 L20,13 C20,18 16.5,22 12,24 C7.5,22 4,18 4,13 L4,7 Z',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85'
        }, ns));
        // Checkmark
        g.appendChild(el('polyline', {
          points: '8,12.5 11,15.5 16,9.5',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        }, ns));
        return g;
      }

      /* ── ADMINISTRATOR: Purple futuristic shield ─────── */
      case 'administrator': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Angular shield
        g.appendChild(el('path', {
          d: 'M12,1 L21,5.5 L21,12 C21,17.5 17,21.5 12,24 C7,21.5 3,17.5 3,12 L3,5.5 Z',
          fill: 'url(#' + gradId + ')',
          opacity: '0.85'
        }, ns));
        // Inner angular detail
        g.appendChild(el('path', {
          d: 'M12,4 L18,7.5 L18,12 C18,16 15,19 12,21 C9,19 6,16 6,12 L6,7.5 Z',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': '0.6',
          opacity: '0.4'
        }, ns));
        // A letter
        var t = el('text', {
          x: '12', y: '15',
          'text-anchor': 'middle',
          'font-size': '9',
          'font-weight': '800',
          fill: '#fff',
          'font-family': 'Inter,sans-serif',
          opacity: '0.9'
        }, ns);
        t.textContent = 'A';
        g.appendChild(t);
        return g;
      }

      /* ── OWNER: Gold crown ───────────────────────────── */
      case 'owner': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Crown body
        g.appendChild(el('polygon', {
          points: '3,16 4.5,7 8.5,12 12,4 15.5,12 19.5,7 21,16',
          fill: 'url(#' + gradId + ')',
          opacity: '0.9',
          stroke: info.color,
          'stroke-width': '0.4'
        }, ns));
        // Crown base
        g.appendChild(el('rect', { x: '3', y: '16', width: '18', height: '4', rx: '1', fill: info.color, opacity: '0.85' }, ns));
        // Jewels
        g.appendChild(el('circle', { cx: '8', cy: '18', r: '1.2', fill: '#fff', opacity: '0.6' }, ns));
        g.appendChild(el('circle', { cx: '12', cy: '18', r: '1.2', fill: '#fff', opacity: '0.8' }, ns));
        g.appendChild(el('circle', { cx: '16', cy: '18', r: '1.2', fill: '#fff', opacity: '0.6' }, ns));
        // Crown tip gems
        g.appendChild(el('circle', { cx: '4.5', cy: '7', r: '1', fill: '#fff', opacity: '0.5' }, ns));
        g.appendChild(el('circle', { cx: '12', cy: '4', r: '1.3', fill: '#fff', opacity: '0.7' }, ns));
        g.appendChild(el('circle', { cx: '19.5', cy: '7', r: '1', fill: '#fff', opacity: '0.5' }, ns));
        return g;
      }

      /* ── VERIFIED: Glowing checkmark ─────────────────── */
      case 'verified': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Hexagonal background
        g.appendChild(el('polygon', {
          points: '12,1 21.5,6.5 21.5,17.5 12,23 2.5,17.5 2.5,6.5',
          fill: 'url(#' + gradId + ')',
          opacity: '0.9'
        }, ns));
        // Checkmark
        g.appendChild(el('polyline', {
          points: '7.5,12.5 10.5,15.5 16.5,9',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': '2.2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        }, ns));
        // Glow pulse
        var glow = el('polygon', {
          points: '12,1 21.5,6.5 21.5,17.5 12,23 2.5,17.5 2.5,6.5',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': '1',
          opacity: '0'
        }, ns);
        var animGlow = el('animate', {
          attributeName: 'opacity', values: '0;0.4;0', dur: '2s', repeatCount: 'indefinite'
        }, ns);
        glow.appendChild(animGlow);
        g.appendChild(glow);
        return g;
      }

      /* ── BOT: Robot chip icon ────────────────────────── */
      case 'bot': {
        var g = el('g', { filter: 'url(#' + filterId + ')' }, ns);
        // Chip body
        g.appendChild(el('rect', { x: '5', y: '5', width: '14', height: '14', rx: '3', fill: 'url(#' + gradId + ')', opacity: '0.85' }, ns));
        // Inner circuit
        g.appendChild(el('rect', { x: '8', y: '8', width: '8', height: '8', rx: '1.5', fill: 'none', stroke: '#fff', 'stroke-width': '0.6', opacity: '0.5' }, ns));
        // Pins
        g.appendChild(el('line', { x1: '8', y1: '3', x2: '8', y2: '5', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '12', y1: '3', x2: '12', y2: '5', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '16', y1: '3', x2: '16', y2: '5', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '8', y1: '19', x2: '8', y2: '21', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '12', y1: '19', x2: '12', y2: '21', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '16', y1: '19', x2: '16', y2: '21', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '3', y1: '8', x2: '5', y2: '8', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '3', y1: '12', x2: '5', y2: '12', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '3', y1: '16', x2: '5', y2: '16', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '19', y1: '8', x2: '21', y2: '8', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '19', y1: '12', x2: '21', y2: '12', stroke: info.color, 'stroke-width': '1.2' }, ns));
        g.appendChild(el('line', { x1: '19', y1: '16', x2: '21', y2: '16', stroke: info.color, 'stroke-width': '1.2' }, ns));
        // Eyes
        g.appendChild(el('circle', { cx: '10', cy: '12', r: '1.3', fill: '#fff', opacity: '0.8' }, ns));
        g.appendChild(el('circle', { cx: '14', cy: '12', r: '1.3', fill: '#fff', opacity: '0.8' }, ns));
        // Blink animation
        var blink = el('rect', { x: '8.5', y: '10.5', width: '7', height: '3', rx: '1', fill: 'url(#' + gradId + ')', opacity: '0' }, ns);
        var animBlink = el('animate', {
          attributeName: 'opacity', values: '0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;1;0',
          dur: '4s', repeatCount: 'indefinite'
        }, ns);
        blink.appendChild(animBlink);
        g.appendChild(blink);
        return g;
      }

      default:
        return null;
    }
  }

  return {
    create: createBadge,
    getInfo: function (rank) { return RANK_INFO[rank] || null; },
    ranks: RANK_INFO,
  };
})();
