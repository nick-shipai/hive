/**
 * Hive — Custom Emoji System
 * 20 original handcrafted SVG emojis + 50 animated face emojis.
 * Global namespace: HiveEmoji
 */
var HiveEmoji = (function () {
  'use strict';

  var EMOJIS = {
    happy:      { name: 'Happy',      id: ':hive_happy:',      cat: 'faces' },
    laughing:   { name: 'Laughing',   id: ':hive_laughing:',   cat: 'faces' },
    love:       { name: 'Love',       id: ':hive_love:',       cat: 'faces' },
    fire:       { name: 'Fire',       id: ':hive_fire:',       cat: 'symbols' },
    cool:       { name: 'Cool',       id: ':hive_cool:',       cat: 'faces' },
    shocked:    { name: 'Shocked',    id: ':hive_shocked:',    cat: 'faces' },
    crying:     { name: 'Crying',     id: ':hive_crying:',     cat: 'faces' },
    thinking:   { name: 'Thinking',   id: ':hive_thinking:',   cat: 'faces' },
    wink:       { name: 'Wink',       id: ':hive_wink:',       cat: 'faces' },
    party:      { name: 'Party',      id: ':hive_party:',      cat: 'faces' },
    sleepy:     { name: 'Sleepy',     id: ':hive_sleepy:',     cat: 'faces' },
    angry:      { name: 'Angry',      id: ':hive_angry:',      cat: 'faces' },
    skull:      { name: 'Skull',      id: ':hive_skull:',      cat: 'faces' },
    robot:      { name: 'Robot',      id: ':hive_robot:',      cat: 'faces' },
    alien:      { name: 'Alien',      id: ':hive_alien:',      cat: 'faces' },
    heart:      { name: 'Heart',      id: ':hive_heart:',      cat: 'symbols' },
    star_eyes:  { name: 'Star Eyes',  id: ':hive_star_eyes:',  cat: 'faces' },
    rocket:     { name: 'Rocket',     id: ':hive_rocket:',     cat: 'objects' },
    crown:      { name: 'Crown',      id: ':hive_crown:',      cat: 'objects' },
    hive:       { name: 'Hive',       id: ':hive_hive:',       cat: 'symbols' },

    /* ══════════════ 50 NEW ANIMATED FACES ══════════════ */
    blush_wink:      { name: 'Blush Wink',      id: ':hive_blush_wink:',      cat: 'faces' },
    star_struck:     { name: 'Star Struck',     id: ':hive_star_struck:',     cat: 'faces' },
    dizzy:           { name: 'Dizzy',           id: ':hive_dizzy:',           cat: 'faces' },
    melting:         { name: 'Melting',         id: ':hive_melting:',        cat: 'faces' },
    upside_down:     { name: 'Upside Down',     id: ':hive_upside_down:',     cat: 'faces' },
    zany:            { name: 'Zany',            id: ':hive_zany:',            cat: 'faces' },
    relieved:        { name: 'Relieved',        id: ':hive_relieved:',        cat: 'faces' },
    smirk:           { name: 'Smirk',           id: ':hive_smirk:',           cat: 'faces' },
    drooling:        { name: 'Drooling',        id: ':hive_drooling:',        cat: 'faces' },
    nauseous:        { name: 'Nauseous',        id: ':hive_nauseous:',        cat: 'faces' },
    exploding_head:  { name: 'Exploding Head',  id: ':hive_exploding_head:',  cat: 'faces' },
    clown:           { name: 'Clown',           id: ':hive_clown:',           cat: 'faces' },
    ghost_face:      { name: 'Ghost',           id: ':hive_ghost_face:',      cat: 'faces' },
    vampire:         { name: 'Vampire',         id: ':hive_vampire:',         cat: 'faces' },
    zombie:          { name: 'Zombie',          id: ':hive_zombie:',          cat: 'faces' },
    robot_glitch:    { name: 'Robot Glitch',    id: ':hive_robot_glitch:',    cat: 'faces' },
    nerd:            { name: 'Nerd',            id: ':hive_nerd:',            cat: 'faces' },
    money_face:      { name: 'Money Face',      id: ':hive_money_face:',      cat: 'faces' },
    sick:            { name: 'Sick',            id: ':hive_sick:',            cat: 'faces' },
    mind_blown:      { name: 'Mind Blown',      id: ':hive_mind_blown:',      cat: 'faces' },
    side_eye:        { name: 'Side Eye',        id: ':hive_side_eye:',        cat: 'faces' },
    suspicious:      { name: 'Suspicious',      id: ':hive_suspicious:',      cat: 'faces' },
    confused:        { name: 'Confused',        id: ':hive_confused:',        cat: 'faces' },
    worried:         { name: 'Worried',         id: ':hive_worried:',         cat: 'faces' },
    pleading:        { name: 'Pleading',        id: ':hive_pleading:',        cat: 'faces' },
    yawning:         { name: 'Yawning',         id: ':hive_yawning:',         cat: 'faces' },
    hot_face:        { name: 'Hot Face',        id: ':hive_hot_face:',        cat: 'faces' },
    cold_face:       { name: 'Cold Face',       id: ':hive_cold_face:',       cat: 'faces' },
    woozy:           { name: 'Woozy',           id: ':hive_woozy:',           cat: 'faces' },
    grimace:         { name: 'Grimace',         id: ':hive_grimace:',         cat: 'faces' },
    smug:            { name: 'Smug',            id: ':hive_smug:',            cat: 'faces' },
    sneaky:          { name: 'Sneaky',          id: ':hive_sneaky:',          cat: 'faces' },
    proud:           { name: 'Proud',           id: ':hive_proud:',           cat: 'faces' },
    embarrassed:     { name: 'Embarrassed',     id: ':hive_embarrassed:',     cat: 'faces' },
    terrified:       { name: 'Terrified',       id: ':hive_terrified:',       cat: 'faces' },
    hypnotized:      { name: 'Hypnotized',      id: ':hive_hypnotized:',      cat: 'faces' },
    lovestruck:      { name: 'Lovestruck',      id: ':hive_lovestruck:',      cat: 'faces' },
    starry:          { name: 'Starry',          id: ':hive_starry:',          cat: 'faces' },
    rainbow_face:    { name: 'Rainbow Face',    id: ':hive_rainbow_face:',    cat: 'faces' },
    glitter:         { name: 'Glitter',         id: ':hive_glitter:',         cat: 'faces' },
    sparkly_eyes:    { name: 'Sparkly Eyes',    id: ':hive_sparkly_eyes:',    cat: 'faces' },
    laughing_hard:   { name: 'Laughing Hard',   id: ':hive_laughing_hard:',   cat: 'faces' },
    crying_laughing: { name: 'Crying Laughing', id: ':hive_crying_laughing:', cat: 'faces' },
    devil:           { name: 'Devil',           id: ':hive_devil:',           cat: 'faces' },
    angel:           { name: 'Angel',           id: ':hive_angel:',           cat: 'faces' },
    superhero:       { name: 'Superhero',       id: ':hive_superhero:',       cat: 'faces' },
    ninja:           { name: 'Ninja',           id: ':hive_ninja:',           cat: 'faces' },
    pirate:          { name: 'Pirate',          id: ':hive_pirate:',          cat: 'faces' },
    wizard:          { name: 'Wizard',          id: ':hive_wizard:',          cat: 'faces' },
    alien_wink:      { name: 'Alien Wink',      id: ':hive_alien_wink:',      cat: 'faces' },

    /* ══════════════ 50 NEW ANIMATED HANDS ══════════════ */
    wave:                 { name: 'Wave',                 id: ':hive_wave:',                 cat: 'hands' },
    thumbs_up:            { name: 'Thumbs Up',             id: ':hive_thumbs_up:',            cat: 'hands' },
    thumbs_down:          { name: 'Thumbs Down',           id: ':hive_thumbs_down:',          cat: 'hands' },
    ok_sign:              { name: 'OK Sign',               id: ':hive_ok_sign:',              cat: 'hands' },
    peace_sign:           { name: 'Peace Sign',            id: ':hive_peace_sign:',           cat: 'hands' },
    fist_bump:            { name: 'Fist Bump',             id: ':hive_fist_bump:',            cat: 'hands' },
    raised_fist:          { name: 'Raised Fist',           id: ':hive_raised_fist:',          cat: 'hands' },
    open_palm:            { name: 'Open Palm',             id: ':hive_open_palm:',            cat: 'hands' },
    point_up:             { name: 'Point Up',              id: ':hive_point_up:',             cat: 'hands' },
    point_down:           { name: 'Point Down',            id: ':hive_point_down:',           cat: 'hands' },
    point_left:           { name: 'Point Left',            id: ':hive_point_left:',           cat: 'hands' },
    point_right:          { name: 'Point Right',           id: ':hive_point_right:',          cat: 'hands' },
    crossed_fingers:      { name: 'Crossed Fingers',       id: ':hive_crossed_fingers:',      cat: 'hands' },
    love_you_gesture:     { name: 'Love You',              id: ':hive_love_you_gesture:',     cat: 'hands' },
    call_me_hand:         { name: 'Call Me',               id: ':hive_call_me_hand:',         cat: 'hands' },
    pinch_fingers:        { name: 'Pinch',                 id: ':hive_pinch_fingers:',        cat: 'hands' },
    finger_snap:          { name: 'Finger Snap',           id: ':hive_finger_snap:',          cat: 'hands' },
    clap_hands:           { name: 'Clap',                  id: ':hive_clap_hands:',           cat: 'hands' },
    praying_hands:        { name: 'Praying Hands',         id: ':hive_praying_hands:',        cat: 'hands' },
    high_five:            { name: 'High Five',             id: ':hive_high_five:',            cat: 'hands' },
    rock_on:              { name: 'Rock On',               id: ':hive_rock_on:',              cat: 'hands' },
    vulcan_salute:        { name: 'Vulcan Salute',         id: ':hive_vulcan_salute:',        cat: 'hands' },
    salute:               { name: 'Salute',                id: ':hive_salute:',               cat: 'hands' },
    victory_hand:         { name: 'Victory',               id: ':hive_victory_hand:',         cat: 'hands' },
    shaka_sign:           { name: 'Shaka',                 id: ':hive_shaka_sign:',           cat: 'hands' },
    fist_pump:            { name: 'Fist Pump',             id: ':hive_fist_pump:',            cat: 'hands' },
    jazz_hands:           { name: 'Jazz Hands',            id: ':hive_jazz_hands:',           cat: 'hands' },
    finger_gun:           { name: 'Finger Gun',            id: ':hive_finger_gun:',           cat: 'hands' },
    air_quotes:           { name: 'Air Quotes',            id: ':hive_air_quotes:',           cat: 'hands' },
    handshake:            { name: 'Handshake',             id: ':hive_handshake:',            cat: 'hands' },
    money_gesture:        { name: 'Money Gesture',         id: ':hive_money_gesture:',        cat: 'hands' },
    writing_hand:         { name: 'Writing Hand',          id: ':hive_writing_hand:',         cat: 'hands' },
    flex_bicep:           { name: 'Flex',                  id: ':hive_flex_bicep:',           cat: 'hands' },
    stop_hand:            { name: 'Stop',                  id: ':hive_stop_hand:',            cat: 'hands' },
    thumbs_sideways:      { name: 'So-So',                 id: ':hive_thumbs_sideways:',      cat: 'hands' },
    pinky_promise:        { name: 'Pinky Promise',         id: ':hive_pinky_promise:',        cat: 'hands' },
    counting_one:         { name: 'Counting One',          id: ':hive_counting_one:',         cat: 'hands' },
    counting_two:         { name: 'Counting Two',          id: ':hive_counting_two:',         cat: 'hands' },
    counting_three:       { name: 'Counting Three',        id: ':hive_counting_three:',       cat: 'hands' },
    counting_four:        { name: 'Counting Four',         id: ':hive_counting_four:',        cat: 'hands' },
    counting_five:        { name: 'Counting Five',         id: ':hive_counting_five:',        cat: 'hands' },
    karate_chop:          { name: 'Karate Chop',           id: ':hive_karate_chop:',          cat: 'hands' },
    grab_gesture:         { name: 'Grab',                  id: ':hive_grab_gesture:',         cat: 'hands' },
    applause:             { name: 'Applause',              id: ':hive_applause:',             cat: 'hands' },
    namaste:              { name: 'Namaste',               id: ':hive_namaste:',              cat: 'hands' },
    mic_drop:             { name: 'Mic Drop',              id: ':hive_mic_drop:',             cat: 'hands' },
    finger_tap:           { name: 'Finger Tap',            id: ':hive_finger_tap:',           cat: 'hands' },
    raise_hand_question:  { name: 'Raise Hand',            id: ':hive_raise_hand_question:',  cat: 'hands' },
    fist_shake:           { name: 'Fist Shake',            id: ':hive_fist_shake:',           cat: 'hands' },
    snap_idea:            { name: 'Snap Idea',             id: ':hive_snap_idea:',            cat: 'hands' },
  };

  var ns = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    var e = document.createElementNS(ns, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function grad(id, stops) {
    var g = el('linearGradient', { id: id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    stops.forEach(function (s) {
      g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] }));
    });
    return g;
  }

  function radGrad(id, stops) {
    var g = el('radialGradient', { id: id, cx: '40%', cy: '35%', r: '60%' });
    stops.forEach(function (s) {
      g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] }));
    });
    return g;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ANIMATED FACES — config-driven system for the 50 new emojis.
   *  Each shares the same building blocks (base head, eyes, mouth,
   *  extras) but mixes them differently and layers a real SMIL
   *  animation (<animate>/<animateTransform>) onto part of the face.
   * ═══════════════════════════════════════════════════════════════ */

  var ANIMATED_FACES = {
    blush_wink:      { bg:['#FFD6E0','#FF8FA8'], stroke:'#E0607D', eye:'wink',        mouth:'smile',     bodyAnim:'float',  cheeks:true,  extra:'none' },
    star_struck:      { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'star_spin',   mouth:'grin',      bodyAnim:'pulse',  cheeks:false, extra:'sparkle' },
    dizzy:            { bg:['#D9C9FF','#B79CFF'], stroke:'#8E6FE0', eye:'spiral',      mouth:'wavy',      bodyAnim:'wobble', cheeks:false, extra:'none' },
    melting:          { bg:['#8FE3D8','#4FBBAA'], stroke:'#2E9686', eye:'half_moon',   mouth:'flat',      bodyAnim:'none',   cheeks:false, extra:'drip' },
    upside_down:      { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'blink',       mouth:'smile',     bodyAnim:'flip',   cheeks:false, extra:'none' },
    zany:             { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'wild',        mouth:'tongue',    bodyAnim:'shake',  cheeks:false, extra:'none' },
    relieved:         { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'half_moon',   mouth:'small_o',   bodyAnim:'float',  cheeks:true,  extra:'sweat' },
    smirk:            { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'blink',       mouth:'smirk',     bodyAnim:'none',   cheeks:false, extra:'none' },
    drooling:         { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'sleepy',      mouth:'drool',     bodyAnim:'none',   cheeks:false, extra:'none' },
    nauseous:         { bg:['#B9E38D','#8CCB57'], stroke:'#5FA02E', eye:'wavy_eye',    mouth:'vomit',     bodyAnim:'shake',  cheeks:false, extra:'none' },
    exploding_head:   { bg:['#FFB37A','#FF8A3D'], stroke:'#E06A17', eye:'wide_shock',  mouth:'open',      bodyAnim:'pulse',  cheeks:false, extra:'burst' },
    clown:            { bg:['#FFFFFF','#F0F0F5'], stroke:'#D0D0DA', eye:'blink',       mouth:'grin',      bodyAnim:'none',   cheeks:true,  extra:'clown_nose' },
    ghost_face:       { bg:['#F3F0FF','#D9CFFF'], stroke:'#B7A6E8', eye:'round_black', mouth:'small_o',   bodyAnim:'float',  cheeks:false, extra:'ghost_tail' },
    vampire:          { bg:['#E8DCE8','#C9B3C9'], stroke:'#9C7C9C', eye:'red_glow',    mouth:'fangs',     bodyAnim:'none',   cheeks:false, extra:'cape' },
    zombie:           { bg:['#9FCB8F','#6FA85B'], stroke:'#4C7A3B', eye:'x_dead',      mouth:'zigzag',    bodyAnim:'shake',  cheeks:false, extra:'bandage' },
    robot_glitch:     { bg:['#8C84FF','#6C63FF'], stroke:'#5B52CC', eye:'glow_flicker',mouth:'grill',     bodyAnim:'none',   cheeks:false, extra:'antenna_spark' },
    nerd:             { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'blink',       mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'glasses' },
    money_face:       { bg:['#8FE38F','#57C25D'], stroke:'#3A9A3F', eye:'dollar',      mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'money_rain' },
    sick:             { bg:['#B9E38D','#8CCB57'], stroke:'#5FA02E', eye:'half_moon',   mouth:'flat',      bodyAnim:'wobble', cheeks:false, extra:'bandage' },
    mind_blown:       { bg:['#FFB37A','#FF8A3D'], stroke:'#E06A17', eye:'wide_shock',  mouth:'open',      bodyAnim:'none',   cheeks:false, extra:'rays' },
    side_eye:         { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'side_shift',  mouth:'flat',      bodyAnim:'none',   cheeks:false, extra:'none' },
    suspicious:       { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'squint',      mouth:'smirk',     bodyAnim:'none',   cheeks:false, extra:'none' },
    confused:         { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'asym',        mouth:'wavy',      bodyAnim:'none',   cheeks:false, extra:'question' },
    worried:          { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'wide_shock',  mouth:'wavy',      bodyAnim:'none',   cheeks:false, extra:'sweat' },
    pleading:         { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'glossy',      mouth:'small_o',   bodyAnim:'none',   cheeks:true,  extra:'none' },
    yawning:          { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'closed_tight',mouth:'yawn',      bodyAnim:'none',   cheeks:false, extra:'none' },
    hot_face:         { bg:['#FF9E7A','#FF6B35'], stroke:'#E0501A', eye:'flat_line',   mouth:'tongue',    bodyAnim:'none',   cheeks:true,  extra:'heat' },
    cold_face:        { bg:['#B9DCFF','#7FB8F0'], stroke:'#4E8FCC', eye:'blink',       mouth:'chatter',   bodyAnim:'shake',  cheeks:false, extra:'ice' },
    woozy:            { bg:['#D9C9FF','#B79CFF'], stroke:'#8E6FE0', eye:'asym_spiral', mouth:'wavy',      bodyAnim:'wobble', cheeks:false, extra:'none' },
    grimace:          { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'closed_tight',mouth:'clench',    bodyAnim:'shake',  cheeks:false, extra:'none' },
    smug:             { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'half_moon',   mouth:'smirk',     bodyAnim:'none',   cheeks:false, extra:'none' },
    sneaky:           { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'side_shift',  mouth:'smirk',     bodyAnim:'tilt',   cheeks:false, extra:'none' },
    proud:            { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'blink',       mouth:'grin',      bodyAnim:'pulse',  cheeks:false, extra:'sparkle' },
    embarrassed:      { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'blink_small', mouth:'small_o',   bodyAnim:'none',   cheeks:true,  extra:'none' },
    terrified:        { bg:['#CFE3FF','#9FC3EE'], stroke:'#6F9BCF', eye:'wide_shock',  mouth:'open',      bodyAnim:'shake',  cheeks:false, extra:'sweat' },
    hypnotized:       { bg:['#D9C9FF','#B79CFF'], stroke:'#8E6FE0', eye:'hypno',       mouth:'flat',      bodyAnim:'none',   cheeks:false, extra:'none' },
    lovestruck:       { bg:['#FFD6E0','#FF8FA8'], stroke:'#E0607D', eye:'heart_pulse', mouth:'smile',     bodyAnim:'none',   cheeks:true,  extra:'hearts_float' },
    starry:           { bg:['#2A2A5C','#1A1A3E'], stroke:'#4A4A8C', eye:'star_spin',   mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'sparkle' },
    rainbow_face:     { bg:['#FFFFFF','#F0F0F5'], stroke:'#D0D0DA', eye:'blink',       mouth:'grin',      bodyAnim:'none',   cheeks:false, extra:'rainbow' },
    glitter:          { bg:['#FFD6E0','#FF8FA8'], stroke:'#E0607D', eye:'sparkle',     mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'sparkle' },
    sparkly_eyes:     { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'sparkle_big', mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'sparkle' },
    laughing_hard:    { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'closed_tight',mouth:'open',      bodyAnim:'shake',  cheeks:false, extra:'tears' },
    crying_laughing:  { bg:['#FFE066','#FFB830'], stroke:'#E8A020', eye:'closed_tight',mouth:'grin',      bodyAnim:'none',   cheeks:false, extra:'tears' },
    devil:            { bg:['#FF6B6B','#CC3333'], stroke:'#8C1F1F', eye:'blink',       mouth:'smirk',     bodyAnim:'none',   cheeks:false, extra:'horns' },
    angel:            { bg:['#EAF4FF','#CFE8FF'], stroke:'#9CC4EA', eye:'blink',       mouth:'small_o',   bodyAnim:'float',  cheeks:true,  extra:'halo' },
    superhero:        { bg:['#7A9BFF','#4F6FEE'], stroke:'#3350C4', eye:'blink',       mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'mask_hero' },
    ninja:            { bg:['#3A3A48','#25252F'], stroke:'#15151C', eye:'sharp',       mouth:'none',      bodyAnim:'none',   cheeks:false, extra:'ninja_wrap' },
    pirate:           { bg:['#E8C089','#D4A15C'], stroke:'#A47B3B', eye:'patch',       mouth:'grin',      bodyAnim:'none',   cheeks:false, extra:'bandana' },
    wizard:           { bg:['#B79CFF','#8E6FE0'], stroke:'#6A4FBF', eye:'blink',       mouth:'smile',     bodyAnim:'none',   cheeks:false, extra:'wizard_hat' },
    alien_wink:       { bg:['#7CFFB2','#2DD4BF'], stroke:'#1A9E7A', eye:'alien_wink',  mouth:'small_o',   bodyAnim:'float',  cheeks:false, extra:'none' },
  };

  /* ── small animation helpers ─────────────────────────────── */
  function animate(target, attrs) { target.appendChild(el('animate', attrs)); return target; }
  function animateT(target, attrs) { target.appendChild(el('animateTransform', attrs)); return target; }

  /* ── eyes ─────────────────────────────────────────────────── */
  function drawEyes(g, type, uid) {
    var L = 12, R = 24, cy = 15;
    switch (type) {
      case 'blink': case 'blink_small': {
        var rx = type === 'blink_small' ? 1.6 : 2.2, ry = type === 'blink_small' ? 1.8 : 2.5;
        [L, R].forEach(function (cx) {
          var e = el('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: '#5C3A1E' });
          animate(e, { attributeName: 'ry', values: ry + ';' + ry + ';0.2;' + ry + ';' + ry, keyTimes: '0;0.85;0.9;0.95;1', dur: '4s', repeatCount: 'indefinite' });
          g.appendChild(e);
          g.appendChild(el('circle', { cx: cx + 0.6, cy: cy - 1, r: 0.7, fill: '#fff' }));
        });
        break;
      }
      case 'wink': {
        var e1 = el('ellipse', { cx: L, cy: cy, rx: 2.2, ry: 2.5, fill: '#5C3A1E' });
        animate(e1, { attributeName: 'ry', values: '2.5;2.5;0.2;2.5;2.5', keyTimes: '0;0.85;0.9;0.95;1', dur: '3s', repeatCount: 'indefinite' });
        g.appendChild(e1);
        g.appendChild(el('circle', { cx: L + 0.6, cy: cy - 1, r: 0.7, fill: '#fff' }));
        g.appendChild(el('path', { d: 'M21,' + cy + ' Q24,' + (cy - 3) + ' 27,' + cy, fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
        break;
      }
      case 'star_spin': [L, R].forEach(function (cx) {
        var star = el('path', { d: 'M-3,-3 L-2,-0.5 L0.5,-0.5 L-1.5,1 L-0.8,3.5 L-3,2 L-5.2,3.5 L-4.5,1 L-6.5,-0.5 L-4,-0.5Z', fill: '#FFD93D', stroke: '#E8A020', 'stroke-width': '0.4', transform: 'translate(' + (cx + 3) + ',' + cy + ')' });
        animateT(star, { attributeName: 'transform', type: 'rotate', from: '0 ' + (cx + 3) + ' ' + cy, to: '360 ' + (cx + 3) + ' ' + cy, dur: '4s', repeatCount: 'indefinite', additive: 'sum' });
        g.appendChild(star);
      }); break;
      case 'spiral': case 'asym_spiral': [L, R].forEach(function (cx, i) {
        var sp = el('path', { d: 'M0,0 m-3,0 a3,3 0 1,1 6,0 a2,2 0 1,1 -4,0 a1,1 0 1,1 2,0', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1', transform: 'translate(' + cx + ',' + cy + ')' });
        animateT(sp, { attributeName: 'transform', type: 'rotate', from: (i ? '0' : '360') + ' ' + cx + ' ' + cy, to: (i ? '360' : '0') + ' ' + cx + ' ' + cy, dur: type === 'asym_spiral' ? (i ? '1.5s' : '2.2s') : '2s', repeatCount: 'indefinite', additive: 'sum' });
        g.appendChild(sp);
      }); break;
      case 'half_moon': [L, R].forEach(function (cx) {
        g.appendChild(el('path', { d: 'M' + (cx - 3) + ',' + cy + ' Q' + cx + ',' + (cy + 3) + ' ' + (cx + 3) + ',' + cy, fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.6', 'stroke-linecap': 'round' }));
      }); break;
      case 'wild': {
        var e1 = el('circle', { cx: L, cy: cy - 1, r: 3, fill: '#fff', stroke: '#5C3A1E', 'stroke-width': '0.6' });
        var p1 = el('circle', { cx: L, cy: cy - 1, r: 1.4, fill: '#5C3A1E' });
        animate(p1, { attributeName: 'cx', values: (L - 1) + ';' + (L + 1) + ';' + (L - 1), dur: '1.8s', repeatCount: 'indefinite' });
        g.appendChild(e1); g.appendChild(p1);
        g.appendChild(el('ellipse', { cx: R, cy: cy, rx: 1.8, ry: 2.3, fill: '#5C3A1E' }));
        break;
      }
      case 'wavy_eye': [L, R].forEach(function (cx) {
        var e = el('path', { d: 'M' + (cx - 2.5) + ',' + cy + ' Q' + (cx - 1) + ',' + (cy - 2) + ' ' + cx + ',' + cy + ' Q' + (cx + 1) + ',' + (cy + 2) + ' ' + (cx + 2.5) + ',' + cy, fill: 'none', stroke: '#5C1A1A', 'stroke-width': '1.4', 'stroke-linecap': 'round' });
        g.appendChild(e);
      }); break;
      case 'wide_shock': [L, R].forEach(function (cx) {
        var e = el('circle', { cx: cx, cy: cy, r: 3.6, fill: '#fff', stroke: '#5C3A1E', 'stroke-width': '0.8' });
        animate(e, { attributeName: 'r', values: '3.6;4.1;3.6', dur: '0.9s', repeatCount: 'indefinite' });
        g.appendChild(e);
        g.appendChild(el('circle', { cx: cx, cy: cy, r: 2, fill: '#5C3A1E' }));
        g.appendChild(el('circle', { cx: cx + 0.7, cy: cy - 0.8, r: 0.7, fill: '#fff' }));
      }); break;
      case 'round_black': [L, R].forEach(function (cx) {
        g.appendChild(el('ellipse', { cx: cx, cy: cy + 1, rx: 3, ry: 3.6, fill: '#2A2A3A' }));
      }); break;
      case 'red_glow': [L, R].forEach(function (cx) {
        var e = el('ellipse', { cx: cx, cy: cy, rx: 2, ry: 2.4, fill: '#D42020' });
        animate(e, { attributeName: 'opacity', values: '1;0.5;1', dur: '2s', repeatCount: 'indefinite' });
        g.appendChild(e);
      }); break;
      case 'x_dead': [L, R].forEach(function (cx) {
        g.appendChild(el('line', { x1: cx - 2, y1: cy - 2, x2: cx + 2, y2: cy + 2, stroke: '#2C4A20', 'stroke-width': '1.4', 'stroke-linecap': 'round' }));
        g.appendChild(el('line', { x1: cx - 2, y1: cy + 2, x2: cx + 2, y2: cy - 2, stroke: '#2C4A20', 'stroke-width': '1.4', 'stroke-linecap': 'round' }));
      }); break;
      case 'glow_flicker': [L, R].forEach(function (cx) {
        g.appendChild(el('rect', { x: cx - 3.5, y: cy - 2.5, width: 7, height: 5, rx: 2, fill: '#0A0F2E' }));
        var dot = el('circle', { cx: cx, cy: cy, r: 1.5, fill: '#00E5FF' });
        animate(dot, { attributeName: 'opacity', values: '1;1;0.1;1;1', keyTimes: '0;0.4;0.5;0.6;1', dur: '1.6s', repeatCount: 'indefinite' });
        g.appendChild(dot);
      }); break;
      case 'dollar': [L, R].forEach(function (cx) {
        var t = el('text', { x: cx, y: cy + 3, 'font-size': '7', 'font-weight': '700', fill: '#2E7D32', 'text-anchor': 'middle', 'font-family': 'Inter,sans-serif' });
        t.textContent = '$';
        animate(t, { attributeName: 'y', values: (cy + 3) + ';' + (cy + 2) + ';' + (cy + 3), dur: '1.2s', repeatCount: 'indefinite' });
        g.appendChild(t);
      }); break;
      case 'side_shift': case 'squint': case 'asym': {
        var grp = el('g');
        [L, R].forEach(function (cx) {
          var ry = type === 'squint' ? 1.3 : 2.3;
          grp.appendChild(el('ellipse', { cx: cx, cy: cy, rx: 2.2, ry: ry, fill: '#5C3A1E' }));
        });
        animateT(grp, { attributeName: 'transform', type: 'translate', values: '0 0;2 0;0 0;-2 0;0 0', dur: '3s', repeatCount: 'indefinite' });
        g.appendChild(grp);
        break;
      }
      case 'flat_line': [L, R].forEach(function (cx) {
        g.appendChild(el('line', { x1: cx - 2.5, y1: cy, x2: cx + 2.5, y2: cy, stroke: '#8C2A0A', 'stroke-width': '1.6', 'stroke-linecap': 'round' }));
      }); break;
      case 'closed_tight': [L, R].forEach(function (cx) {
        g.appendChild(el('path', { d: 'M' + (cx - 2.5) + ',' + (cy + 1) + ' Q' + cx + ',' + (cy - 2.5) + ' ' + (cx + 2.5) + ',' + (cy + 1) + 'Q' + cx + ',' + (cy - 0.5) + ' ' + (cx - 2.5) + ',' + (cy + 1) + 'Z', fill: '#5C3A1E' }));
      }); break;
      case 'glossy': [L, R].forEach(function (cx) {
        g.appendChild(el('ellipse', { cx: cx, cy: cy, rx: 2.6, ry: 3, fill: '#5C3A1E' }));
        g.appendChild(el('ellipse', { cx: cx, cy: cy, rx: 2.6, ry: 3, fill: 'none', stroke: '#fff', 'stroke-width': '0.4', opacity: '0.5' }));
        var sh = el('circle', { cx: cx + 0.8, cy: cy - 1, r: 1, fill: '#fff', opacity: '0.9' });
        animate(sh, { attributeName: 'opacity', values: '0.9;0.4;0.9', dur: '1.6s', repeatCount: 'indefinite' });
        g.appendChild(sh);
      }); break;
      case 'sleepy': [L, R].forEach(function (cx) {
        g.appendChild(el('path', { d: 'M' + (cx - 2.5) + ',' + cy + ' Q' + cx + ',' + (cy + 2) + ' ' + (cx + 2.5) + ',' + cy, fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.4', 'stroke-linecap': 'round' }));
      }); break;
      case 'hypno': [L, R].forEach(function (cx) {
        [3, 2, 1].forEach(function (r) {
          g.appendChild(el('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: r % 2 ? '#FF4D9E' : '#00E5FF', 'stroke-width': '0.6' }));
        });
        var sp = el('g');
        sp.appendChild(el('line', { x1: cx, y1: cy - 3, x2: cx, y2: cy + 3, stroke: '#fff', 'stroke-width': '0.4', opacity: '0.6' }));
        animateT(sp, { attributeName: 'transform', type: 'rotate', from: '0 ' + cx + ' ' + cy, to: '360 ' + cx + ' ' + cy, dur: '1.5s', repeatCount: 'indefinite' });
        g.appendChild(sp);
      }); break;
      case 'heart_pulse': [L, R].forEach(function (cx) {
        var hp = 'M0,-1.5 C0,-3 -2,-3 -2,-1.5 C-2,0 0,1.5 0,1.5 C0,1.5 2,0 2,-1.5 C2,-3 0,-3 0,-1.5Z';
        var h = el('path', { d: hp, fill: '#FF4D6A', transform: 'translate(' + cx + ',' + cy + ') scale(1.3)' });
        animate(h, { attributeName: 'transform', values: 'translate(' + cx + ',' + cy + ') scale(1.1);translate(' + cx + ',' + cy + ') scale(1.4);translate(' + cx + ',' + cy + ') scale(1.1)', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(h);
      }); break;
      case 'sparkle': case 'sparkle_big': [L, R].forEach(function (cx, i) {
        var r = type === 'sparkle_big' ? 2.6 : 2;
        g.appendChild(el('circle', { cx: cx, cy: cy, r: r, fill: '#3A2A1A' }));
        var star = el('path', { d: 'M0,-2 L0.6,-0.5 L2,0 L0.6,0.5 L0,2 L-0.6,0.5 L-2,0 L-0.6,-0.5Z', fill: '#fff', transform: 'translate(' + (cx + 1) + ',' + (cy - 1) + ')' });
        animate(star, { attributeName: 'opacity', values: '1;0.2;1', dur: (1 + i * 0.3) + 's', repeatCount: 'indefinite' });
        g.appendChild(star);
      }); break;
      case 'sharp': [L, R].forEach(function (cx) {
        g.appendChild(el('path', { d: 'M' + (cx - 2.5) + ',' + (cy - 0.5) + ' L' + (cx + 2.5) + ',' + (cy - 1.2) + ' L' + (cx + 2.5) + ',' + (cy + 0.6) + ' L' + (cx - 2.5) + ',' + (cy + 1.3) + 'Z', fill: '#E8E8F0' }));
      }); break;
      case 'patch': {
        g.appendChild(el('ellipse', { cx: L, cy: cy, rx: 2.2, ry: 2.5, fill: '#3A2A1A' }));
        g.appendChild(el('circle', { cx: L + 0.6, cy: cy - 1, r: 0.7, fill: '#fff' }));
        g.appendChild(el('ellipse', { cx: R, cy: cy, rx: 3.4, ry: 3.8, fill: '#1A1A1A' }));
        g.appendChild(el('line', { x1: R - 5, y1: cy - 5, x2: 4, y2: cy - 8, stroke: '#1A1A1A', 'stroke-width': '1.2' }));
        break;
      }
      case 'alien_wink': {
        g.appendChild(el('ellipse', { cx: L, cy: cy, rx: 4, ry: 5.5, fill: '#0A0F2E' }));
        var glow = el('ellipse', { cx: L, cy: cy, rx: 2.4, ry: 3.4, fill: '#7CFFB2', opacity: '0.5' });
        animate(glow, { attributeName: 'opacity', values: '0.5;0.2;0.5', dur: '1.4s', repeatCount: 'indefinite' });
        g.appendChild(glow);
        g.appendChild(el('path', { d: 'M20,14 Q25,10 30,14', fill: 'none', stroke: '#0A0F2E', 'stroke-width': '2', 'stroke-linecap': 'round' }));
        break;
      }
      default: [L, R].forEach(function (cx) {
        g.appendChild(el('ellipse', { cx: cx, cy: cy, rx: 2.2, ry: 2.5, fill: '#5C3A1E' }));
      });
    }
  }

  /* ── mouths ───────────────────────────────────────────────── */
  function drawMouth(g, type, uid) {
    switch (type) {
      case 'smile': g.appendChild(el('path', { d: 'M11,22 Q18,28 25,22', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.5', 'stroke-linecap': 'round' })); break;
      case 'grin': {
        g.appendChild(el('path', { d: 'M10,22 Q18,29 26,22', fill: '#5C3A1E' }));
        g.appendChild(el('rect', { x: '13', y: '23', width: '10', height: '2.4', rx: '1', fill: '#fff' }));
        break;
      }
      case 'open': {
        var m = el('ellipse', { cx: 18, cy: 24, rx: 4.5, ry: 3.5, fill: '#5C3A1E' });
        animate(m, { attributeName: 'ry', values: '3.5;5;3.5', dur: '0.8s', repeatCount: 'indefinite' });
        g.appendChild(m);
        g.appendChild(el('ellipse', { cx: 18, cy: 23, rx: 3, ry: 1.8, fill: '#FF6B6B' }));
        break;
      }
      case 'flat': g.appendChild(el('line', { x1: '13', y1: '24', x2: '23', y2: '24', stroke: '#5C3A1E', 'stroke-width': '1.5', 'stroke-linecap': 'round' })); break;
      case 'zigzag': g.appendChild(el('path', { d: 'M11,23 L14,25 L17,22 L20,25 L23,22 L26,24', fill: 'none', stroke: '#2C4A20', 'stroke-width': '1.4', 'stroke-linecap': 'round' })); break;
      case 'small_o': {
        var o = el('ellipse', { cx: 18, cy: 24, rx: 2, ry: 2.3, fill: '#5C3A1E' });
        animate(o, { attributeName: 'ry', values: '2.3;2.8;2.3', dur: '1.4s', repeatCount: 'indefinite' });
        g.appendChild(o);
        break;
      }
      case 'wavy': g.appendChild(el('path', { d: 'M11,23 Q14,26 18,23 Q22,20 25,23', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.5', 'stroke-linecap': 'round' })); break;
      case 'kiss': {
        var k = el('ellipse', { cx: 18, cy: 24, rx: 2, ry: 1.6, fill: '#FF6B8A' });
        animate(k, { attributeName: 'rx', values: '2;1.2;2', dur: '1.2s', repeatCount: 'indefinite' });
        g.appendChild(k);
        break;
      }
      case 'drool': {
        g.appendChild(el('ellipse', { cx: 17, cy: 24, rx: 3, ry: 2.4, fill: '#5C3A1E' }));
        var d = el('ellipse', { cx: 25, cy: 26, rx: 1.2, ry: 1.8, fill: '#8FD9FF', opacity: '0.8' });
        animate(d, { attributeName: 'cy', values: '24;30;24', dur: '2s', repeatCount: 'indefinite' });
        animate(d, { attributeName: 'opacity', values: '0.8;0;0.8', dur: '2s', repeatCount: 'indefinite' });
        g.appendChild(d);
        break;
      }
      case 'vomit': {
        g.appendChild(el('ellipse', { cx: 18, cy: 23, rx: 3.5, ry: 2.5, fill: '#5C3A1E' }));
        var v = el('path', { d: 'M14,25 Q18,32 22,25Z', fill: '#8CCB57' });
        animate(v, { attributeName: 'd', values: 'M14,25 Q18,32 22,25Z;M14,25 Q18,35 22,25Z;M14,25 Q18,32 22,25Z', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(v);
        break;
      }
      case 'fangs': {
        g.appendChild(el('path', { d: 'M12,22 Q18,26 24,22', fill: 'none', stroke: '#3A2A2A', 'stroke-width': '1.4', 'stroke-linecap': 'round' }));
        g.appendChild(el('polygon', { points: '14,22 15.5,22 14.7,26', fill: '#fff' }));
        g.appendChild(el('polygon', { points: '20.5,22 22,22 21.3,26', fill: '#fff' }));
        break;
      }
      case 'grill': {
        g.appendChild(el('rect', { x: '11', y: '22', width: '14', height: '4', rx: '2', fill: '#0A0F2E' }));
        for (var i = 0; i < 4; i++) {
          var bar = el('line', { x1: String(13 + i * 3), y1: '22.5', x2: String(13 + i * 3), y2: '25.5', stroke: '#6C63FF', 'stroke-width': '0.6' });
          animate(bar, { attributeName: 'opacity', values: '0.3;1;0.3', dur: (0.6 + i * 0.2) + 's', repeatCount: 'indefinite' });
          g.appendChild(bar);
        }
        break;
      }
      case 'smirk': g.appendChild(el('path', { d: 'M13,23 Q18,26 22,21', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.5', 'stroke-linecap': 'round' })); break;
      case 'yawn': {
        var y1 = el('ellipse', { cx: 18, cy: 24, rx: 5, ry: 3, fill: '#5C3A1E' });
        animate(y1, { attributeName: 'ry', values: '3;6;3', dur: '2.4s', repeatCount: 'indefinite' });
        g.appendChild(y1);
        break;
      }
      case 'tongue': {
        g.appendChild(el('path', { d: 'M10,22 Q18,29 26,22', fill: '#5C3A1E' }));
        var tg = el('ellipse', { cx: 18, cy: 26, rx: 2.6, ry: 3, fill: '#FF6B6B' });
        animate(tg, { attributeName: 'cy', values: '26;28;26', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(tg);
        break;
      }
      case 'chatter': {
        var c1 = el('path', { d: 'M12,23 L24,23', fill: 'none', stroke: '#4E8FCC', 'stroke-width': '2', 'stroke-linecap': 'round' });
        animate(c1, { attributeName: 'd', values: 'M12,22 L24,24;M12,24 L24,22;M12,22 L24,24', dur: '0.3s', repeatCount: 'indefinite' });
        g.appendChild(c1);
        break;
      }
      case 'clench': g.appendChild(el('path', { d: 'M11,24 Q18,22 25,24', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '2.2', 'stroke-linecap': 'round' })); break;
      case 'none': break;
      default: g.appendChild(el('path', { d: 'M11,22 Q18,28 25,22', fill: 'none', stroke: '#5C3A1E', 'stroke-width': '1.5', 'stroke-linecap': 'round' }));
    }
  }

  /* ── extras / decorations ────────────────────────────────── */
  function drawExtra(g, type, uid) {
    switch (type) {
      case 'sparkle': {
        [[5, 6], [30, 8], [4, 26], [31, 24]].forEach(function (p, i) {
          var s = el('path', { d: 'M0,-2.2 L0.7,-0.5 L2.2,0 L0.7,0.5 L0,2.2 L-0.7,0.5 L-2.2,0 L-0.7,-0.5Z', fill: '#FFD93D', transform: 'translate(' + p[0] + ',' + p[1] + ')' });
          animate(s, { attributeName: 'opacity', values: '0.2;1;0.2', dur: (1 + i * 0.3) + 's', repeatCount: 'indefinite' });
          g.appendChild(s);
        });
        break;
      }
      case 'drip': {
        var d = el('path', { d: 'M26,20 Q29,26 26,32 Q23,26 26,20Z', fill: '#4FBBAA' });
        animate(d, { attributeName: 'd', values: 'M26,20 Q29,26 26,32 Q23,26 26,20Z;M26,20 Q30,28 26,36 Q22,28 26,20Z;M26,20 Q29,26 26,32 Q23,26 26,20Z', dur: '2.2s', repeatCount: 'indefinite' });
        g.appendChild(d);
        break;
      }
      case 'sweat': {
        var s = el('path', { d: 'M27,10 Q29,14 27,17 Q25,14 27,10Z', fill: '#8FD9FF', opacity: '0.85' });
        animate(s, { attributeName: 'cy', values: '0;3;0', dur: '1.6s', repeatCount: 'indefinite' });
        g.appendChild(s);
        break;
      }
      case 'burst': {
        for (var i = 0; i < 8; i++) {
          var ang = i * 45;
          var ray = el('line', { x1: '18', y1: '0', x2: '18', y2: '6', stroke: '#FFD93D', 'stroke-width': '2', 'stroke-linecap': 'round', transform: 'rotate(' + ang + ' 18 18)' });
          animate(ray, { attributeName: 'y2', values: '6;2;6', dur: '0.6s', repeatCount: 'indefinite' });
          g.appendChild(ray);
        }
        break;
      }
      case 'clown_nose': {
        var n = el('circle', { cx: 18, cy: 19, r: 2.4, fill: '#FF3B3B' });
        animate(n, { attributeName: 'r', values: '2.4;2.7;2.4', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(n);
        break;
      }
      case 'ghost_tail': g.appendChild(el('path', { d: 'M5,20 L5,30 Q7,27 9,30 Q11,27 13,30 Q15,27 17,30 Q19,27 21,30 Q23,27 25,30 Q27,27 29,30 L29,20', fill: 'url(#face-' + uid + ')', opacity: '0.001' })); break;
      case 'cape': g.appendChild(el('path', { d: 'M8,26 Q4,34 8,36 L28,36 Q32,34 28,26Z', fill: '#4A1A1A' })); break;
      case 'bandage': g.appendChild(el('rect', { x: '20', y: '18', width: '9', height: '3.4', rx: '1', fill: '#F0DCC0', stroke: '#C9A876', 'stroke-width': '0.4', transform: 'rotate(-20 24 19)' })); break;
      case 'antenna_spark': {
        g.appendChild(el('line', { x1: '18', y1: '2', x2: '18', y2: '7', stroke: '#8B8BA7', 'stroke-width': '1.5' }));
        var sp = el('circle', { cx: '18', cy: '2', r: '1.5', fill: '#00E5FF' });
        animate(sp, { attributeName: 'r', values: '1.5;2.4;1.5', dur: '0.7s', repeatCount: 'indefinite' });
        g.appendChild(sp);
        break;
      }
      case 'glasses': {
        g.appendChild(el('circle', { cx: '12', cy: '15', r: '4.5', fill: 'none', stroke: '#3A2A1A', 'stroke-width': '1.4' }));
        g.appendChild(el('circle', { cx: '24', cy: '15', r: '4.5', fill: 'none', stroke: '#3A2A1A', 'stroke-width': '1.4' }));
        g.appendChild(el('line', { x1: '16.5', y1: '15', x2: '19.5', y2: '15', stroke: '#3A2A1A', 'stroke-width': '1.2' }));
        break;
      }
      case 'money_rain': {
        [[7, 6], [29, 10], [5, 24]].forEach(function (p, i) {
          var t = el('text', { x: p[0], y: p[1], 'font-size': '5', 'font-weight': '700', fill: '#2E7D32', 'font-family': 'Inter,sans-serif' });
          t.textContent = '$';
          animate(t, { attributeName: 'y', values: (p[1] - 3) + ';' + (p[1] + 3) + ';' + (p[1] - 3), dur: (1.4 + i * 0.3) + 's', repeatCount: 'indefinite' });
          g.appendChild(t);
        });
        break;
      }
      case 'rays': {
        for (var j = 0; j < 6; j++) {
          var a2 = j * 60;
          var r2 = el('line', { x1: '18', y1: '18', x2: '18', y2: '1', stroke: '#FFD93D', 'stroke-width': '1.4', opacity: '0.7', transform: 'rotate(' + a2 + ' 18 18)' });
          animateT(r2, { attributeName: 'transform', type: 'rotate', from: a2 + ' 18 18', to: (a2 + 360) + ' 18 18', dur: '5s', repeatCount: 'indefinite' });
          g.appendChild(r2);
        }
        break;
      }
      case 'question': {
        var q = el('text', { x: '27', y: '10', 'font-size': '9', 'font-weight': '700', fill: '#5C3A1E', 'font-family': 'Inter,sans-serif' });
        q.textContent = '?';
        animate(q, { attributeName: 'y', values: '10;7;10', dur: '1.6s', repeatCount: 'indefinite' });
        g.appendChild(q);
        break;
      }
      case 'heat': {
        var h = el('path', { d: 'M6,8 Q9,12 6,16 Q3,12 6,8Z', fill: '#FF6B35', opacity: '0.7' });
        animate(h, { attributeName: 'opacity', values: '0.7;0.2;0.7', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(h);
        break;
      }
      case 'ice': {
        [[6, 8], [30, 10]].forEach(function (p) {
          g.appendChild(el('path', { d: 'M' + p[0] + ',' + (p[1] - 3) + ' L' + p[0] + ',' + (p[1] + 3) + ' M' + (p[0] - 3) + ',' + p[1] + ' L' + (p[0] + 3) + ',' + p[1], stroke: '#B9E3FF', 'stroke-width': '1' }));
        });
        break;
      }
      case 'tears': {
        [10, 26].forEach(function (cx, i) {
          var t = el('ellipse', { cx: cx, cy: 20, rx: 1.4, ry: 2.2, fill: '#5BC0EB', opacity: '0.8' });
          animate(t, { attributeName: 'cy', values: '18;30;18', dur: (1.2 + i * 0.2) + 's', repeatCount: 'indefinite' });
          animate(t, { attributeName: 'opacity', values: '0.9;0;0.9', dur: (1.2 + i * 0.2) + 's', repeatCount: 'indefinite' });
          g.appendChild(t);
        });
        break;
      }
      case 'horns': {
        g.appendChild(el('path', { d: 'M9,6 Q6,1 4,3 Q7,7 10,10Z', fill: '#8C1F1F' }));
        g.appendChild(el('path', { d: 'M27,6 Q30,1 32,3 Q29,7 26,10Z', fill: '#8C1F1F' }));
        break;
      }
      case 'halo': {
        var ha = el('ellipse', { cx: '18', cy: '2', rx: '7', ry: '2', fill: 'none', stroke: '#FFD93D', 'stroke-width': '1.6' });
        animate(ha, { attributeName: 'ry', values: '2;1.4;2', dur: '2s', repeatCount: 'indefinite' });
        g.appendChild(ha);
        break;
      }
      case 'mask_hero': g.appendChild(el('path', { d: 'M6,12 Q18,6 30,12 L30,17 Q18,22 6,17Z', fill: '#1A1A2E', opacity: '0.85' })); break;
      case 'ninja_wrap': {
        g.appendChild(el('rect', { x: '4', y: '11', width: '28', height: '9', fill: '#15151C' }));
        g.appendChild(el('rect', { x: '4', y: '11', width: '28', height: '2', fill: '#8C1F1F' }));
        break;
      }
      case 'bandana': {
        g.appendChild(el('path', { d: 'M4,10 Q18,4 32,10 L32,15 Q18,10 4,15Z', fill: '#8C1F1F' }));
        g.appendChild(el('circle', { cx: '9', cy: '10', r: '1.2', fill: '#FFD93D' }));
        break;
      }
      case 'wizard_hat': {
        g.appendChild(el('path', { d: 'M18,0 L26,20 L10,20Z', fill: '#6A4FBF' }));
        g.appendChild(el('ellipse', { cx: '18', cy: '20', rx: '11', ry: '2.4', fill: '#6A4FBF' }));
        var star = el('path', { d: 'M0,-1.8 L0.5,-0.4 L1.8,0 L0.5,0.4 L0,1.8 L-0.5,0.4 L-1.8,0 L-0.5,-0.4Z', fill: '#FFD93D', transform: 'translate(18,10)' });
        animate(star, { attributeName: 'opacity', values: '1;0.3;1', dur: '1.3s', repeatCount: 'indefinite' });
        g.appendChild(star);
        break;
      }
      case 'rainbow': {
        g.appendChild(el('path', { d: 'M4,14 A14,14 0 0,1 32,14', fill: 'none', stroke: '#FF4D6A', 'stroke-width': '2.4' }));
        g.appendChild(el('path', { d: 'M7,15 A11,11 0 0,1 29,15', fill: 'none', stroke: '#FFD93D', 'stroke-width': '2.4' }));
        g.appendChild(el('path', { d: 'M10,16 A8,8 0 0,1 26,16', fill: 'none', stroke: '#4FA6FF', 'stroke-width': '2.4' }));
        break;
      }
      case 'hearts_float': {
        [[6, 22], [30, 20]].forEach(function (p, i) {
          var hp = 'M0,-1.5 C0,-3 -2,-3 -2,-1.5 C-2,0 0,1.5 0,1.5 C0,1.5 2,0 2,-1.5 C2,-3 0,-3 0,-1.5Z';
          var h = el('path', { d: hp, fill: '#FF4D6A', transform: 'translate(' + p[0] + ',' + p[1] + ')' });
          animate(h, { attributeName: 'transform', values: 'translate(' + p[0] + ',' + p[1] + ');translate(' + p[0] + ',' + (p[1] - 6) + ');translate(' + p[0] + ',' + p[1] + ')', dur: (1.4 + i * 0.3) + 's', repeatCount: 'indefinite' });
          animate(h, { attributeName: 'opacity', values: '1;0.2;1', dur: (1.4 + i * 0.3) + 's', repeatCount: 'indefinite' });
          g.appendChild(h);
        });
        break;
      }
      case 'mic': {
        g.appendChild(el('rect', { x: '15', y: '30', width: '6', height: '10', rx: '3', fill: '#2A2A3A' }));
        var micDrop = el('ellipse', { cx: '18', cy: '30', rx: '4.5', ry: '5.5', fill: '#3A3A48', stroke: '#1A1A22', 'stroke-width': '0.6' });
        animate(micDrop, { attributeName: 'cy', values: '28;34;28', dur: '1.6s', repeatCount: 'indefinite' });
        g.appendChild(micDrop);
        break;
      }
      case 'lightbulb': {
        var bulb = el('g');
        bulb.appendChild(el('circle', { cx: '9', cy: '6', r: '4', fill: '#FFD93D', stroke: '#E8A020', 'stroke-width': '0.5' }));
        bulb.appendChild(el('rect', { x: '7.4', y: '9.5', width: '3.2', height: '2', fill: '#8B8BA7' }));
        animate(bulb, { attributeName: 'opacity', values: '0.3;1;0.3', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(bulb);
        break;
      }
      case 'none': default: break;
    }
  }

  /* ── whole-face body animations ──────────────────────────── */
  function applyBodyAnim(g, type, uid) {
    switch (type) {
      case 'bounce': animate(g.querySelector ? g : g, {}); // no-op fallback (kept for SVG DOM without querySelector)
        animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;0 -2;0 0', dur: '0.9s', repeatCount: 'indefinite' }); break;
      case 'float': animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;0 -1.5;0 0', dur: '2.4s', repeatCount: 'indefinite' }); break;
      case 'wobble': animateT(g, { attributeName: 'transform', type: 'rotate', values: '-5 18 18;5 18 18;-5 18 18', dur: '1.4s', repeatCount: 'indefinite' }); break;
      case 'shake': animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;1.2 0;-1.2 0;0 0', dur: '0.35s', repeatCount: 'indefinite' }); break;
      case 'pulse': animateT(g, { attributeName: 'transform', type: 'scale', values: '1;1.05;1', dur: '1.2s', repeatCount: 'indefinite' }); break;
      case 'spin_slow': animateT(g, { attributeName: 'transform', type: 'rotate', values: '0 18 18;360 18 18', dur: '8s', repeatCount: 'indefinite' }); break;
      case 'flip': animateT(g, { attributeName: 'transform', type: 'rotate', values: '0 18 18;0 18 18;180 18 18;180 18 18;0 18 18', keyTimes: '0;0.4;0.5;0.9;1', dur: '4s', repeatCount: 'indefinite' }); break;
      case 'tilt': animateT(g, { attributeName: 'transform', type: 'rotate', values: '0 18 18;10 18 18;0 18 18', dur: '2s', repeatCount: 'indefinite' }); break;
      case 'wave': animateT(g, { attributeName: 'transform', type: 'rotate', values: '-15 18 30;15 18 30;-15 18 30', dur: '0.8s', repeatCount: 'indefinite' }); break;
      case 'tap': animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;0 3;0 0', dur: '0.5s', repeatCount: 'indefinite' }); break;
      case 'bump': animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;4 0;0 0', dur: '0.6s', repeatCount: 'indefinite' }); break;
      case 'pump': animateT(g, { attributeName: 'transform', type: 'translate', values: '0 0;0 -4;0 0', dur: '0.5s', repeatCount: 'indefinite' }); break;
      case 'none': default: break;
    }
  }

  function buildAnimatedFace(name, uid) {
    var cfg = ANIMATED_FACES[name];
    var svg = el('svg', { viewBox: '0 0 36 36', width: '100%', height: '100%', xmlns: ns });
    var defs = el('defs');
    var outer = el('g');
    var g = el('g');

    var gradId = 'face-' + uid;
    defs.appendChild(radGrad(gradId, [['0%', cfg.bg[0]], ['100%', cfg.bg[1]]]));

    if (cfg.extra !== 'ninja_wrap' && cfg.extra !== 'ghost_tail') {
      g.appendChild(el('circle', { cx: '18', cy: '18', r: '16', fill: 'url(#' + gradId + ')' }));
      g.appendChild(el('circle', { cx: '18', cy: '18', r: '16', fill: 'none', stroke: cfg.stroke, 'stroke-width': '0.8' }));
    } else if (cfg.extra === 'ghost_tail') {
      g.appendChild(el('path', { d: 'M4,18 Q4,2 18,2 Q32,2 32,18 L32,30 Q30,27 28,30 Q26,27 24,30 Q22,27 20,30 Q18,27 16,30 Q14,27 12,30 Q10,27 8,30 Q6,27 4,30Z', fill: 'url(#' + gradId + ')', stroke: cfg.stroke, 'stroke-width': '0.8' }));
    } else {
      g.appendChild(el('circle', { cx: '18', cy: '18', r: '16', fill: 'url(#' + gradId + ')' }));
      g.appendChild(el('circle', { cx: '18', cy: '18', r: '16', fill: 'none', stroke: cfg.stroke, 'stroke-width': '0.8' }));
    }

    if (cfg.cheeks) {
      g.appendChild(el('circle', { cx: '9', cy: '21', r: '3', fill: '#FF9E44', opacity: '0.35' }));
      g.appendChild(el('circle', { cx: '27', cy: '21', r: '3', fill: '#FF9E44', opacity: '0.35' }));
    }

    drawEyes(g, cfg.eye, uid);
    drawMouth(g, cfg.mouth, uid);
    drawExtra(g, cfg.extra, uid);

    outer.appendChild(g);
    applyBodyAnim(outer, cfg.bodyAnim, uid);

    svg.appendChild(defs);
    svg.appendChild(outer);
    return svg;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ANIMATED HANDS — config-driven system for the 50 new hand
   *  gesture emojis. Same idea as ANIMATED_FACES: shared shape
   *  helpers (palm, fingers, thumb) mixed per-gesture, with a real
   *  SMIL animation layered on top.
   * ═══════════════════════════════════════════════════════════════ */

  var HAND_SKIN = ['#FFD9B0', '#F2B180'];
  var HAND_STROKE = '#D89860';
  var HAND_FX = { pen: '#4F46E5', ink: '#2A2A3A', spark: '#FFD93D' };

  var HAND_GESTURES = {
    wave:                { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'wave',  extra: 'none' },
    thumbs_up:           { kind: 'fist',                       thumb: 'up',     anim: 'bounce', extra: 'none' },
    thumbs_down:         { kind: 'fist',                       thumb: 'down',   anim: 'shake',  extra: 'none' },
    ok_sign:             { special: 'ok',                                       anim: 'pulse',  extra: 'none' },
    peace_sign:          { fingers: ['down','down','up','up'], thumb: 'across', anim: 'none',   extra: 'sparkle' },
    fist_bump:           { kind: 'fist',                       thumb: 'side',   anim: 'bump',   extra: 'burst' },
    raised_fist:         { kind: 'fist',                       thumb: 'across', anim: 'float',  extra: 'none' },
    open_palm:           { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'none',   extra: 'none' },
    point_up:            { fingers: ['down','down','down','up'], thumb: 'across', rotate: 0,   anim: 'tap', extra: 'none' },
    point_down:          { fingers: ['down','down','down','up'], thumb: 'across', rotate: 180, anim: 'tap', extra: 'none' },
    point_left:          { fingers: ['down','down','down','up'], thumb: 'across', rotate: 270, anim: 'tap', extra: 'none' },
    point_right:         { fingers: ['down','down','down','up'], thumb: 'across', rotate: 90,  anim: 'tap', extra: 'none' },
    crossed_fingers:     { special: 'crossed',                                  anim: 'pulse', extra: 'sparkle' },
    love_you_gesture:    { special: 'ily',                                      anim: 'pulse', extra: 'hearts_float' },
    call_me_hand:        { special: 'callme',                                   anim: 'wobble', extra: 'none' },
    pinch_fingers:       { special: 'pinch',                                    anim: 'pulse',  extra: 'none' },
    finger_snap:         { special: 'snap',                                     anim: 'shake',  extra: 'none' },
    clap_hands:          { twoHand: true, twoAnim: 'clap',   fingers: ['up','up','up','up'] },
    praying_hands:       { twoHand: true, twoAnim: 'press',  fingers: ['up','up','up','up'] },
    high_five:           { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'pulse',  extra: 'burst' },
    rock_on:             { special: 'horns',                                    anim: 'wobble', extra: 'none' },
    vulcan_salute:       { special: 'vulcan',                                   anim: 'none',   extra: 'sparkle' },
    salute:              { fingers: ['up','up','up','up'],     thumb: 'side',   rotate: -25, anim: 'none', extra: 'none' },
    victory_hand:        { fingers: ['down','down','up','up'], thumb: 'across', anim: 'tilt',   extra: 'none' },
    shaka_sign:          { special: 'callme', rotate: 20,                       anim: 'wobble', extra: 'none' },
    fist_pump:           { kind: 'fist',                       thumb: 'across', anim: 'pump',   extra: 'none' },
    jazz_hands:          { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'shake',  extra: 'sparkle' },
    finger_gun:          { special: 'gun', rotate: -10,                        anim: 'tap',    extra: 'none' },
    air_quotes:          { twoHand: true, twoAnim: 'press',  fingers: ['half','half','down','down'] },
    handshake:           { twoHand: true, twoAnim: 'shake',  fingers: ['down','down','down','down'], thumb: 'across' },
    money_gesture:       { special: 'money',                                    anim: 'pulse',  extra: 'none' },
    writing_hand:        { special: 'pen',                                      anim: 'tap',    extra: 'none' },
    flex_bicep:          { special: 'bicep',                                    anim: 'pulse',  extra: 'none' },
    stop_hand:           { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'none',   extra: 'none' },
    thumbs_sideways:     { kind: 'fist',                       thumb: 'side',   anim: 'wobble', extra: 'none' },
    pinky_promise:       { twoHand: true, twoAnim: 'press',  fingers: ['up','down','down','down'] },
    counting_one:        { fingers: ['down','down','down','up'], thumb: 'hidden', anim: 'none', extra: 'none' },
    counting_two:        { fingers: ['down','down','up','up'],   thumb: 'hidden', anim: 'none', extra: 'none' },
    counting_three:      { fingers: ['down','up','up','up'],     thumb: 'hidden', anim: 'none', extra: 'none' },
    counting_four:       { fingers: ['up','up','up','up'],       thumb: 'hidden', anim: 'none', extra: 'none' },
    counting_five:       { fingers: ['up','up','up','up'],       thumb: 'up',     anim: 'none', extra: 'none' },
    karate_chop:         { special: 'chop', rotate: 90,                         anim: 'bump',   extra: 'none' },
    grab_gesture:        { special: 'grab',                                     anim: 'pulse',  extra: 'none' },
    applause:            { twoHand: true, twoAnim: 'applause', fingers: ['up','up','up','up'] },
    namaste:             { twoHand: true, twoAnim: 'press',  fingers: ['up','up','up','up'] },
    mic_drop:            { kind: 'fist',                       thumb: 'across', anim: 'float',  extra: 'mic' },
    finger_tap:          { fingers: ['down','down','down','up'], thumb: 'across', anim: 'tap',  extra: 'none' },
    raise_hand_question: { fingers: ['up','up','up','up'],     thumb: 'side',   anim: 'float',  extra: 'question' },
    fist_shake:          { kind: 'fist',                       thumb: 'across', anim: 'shake',  extra: 'none' },
    snap_idea:           { special: 'snap',                                     anim: 'shake',  extra: 'lightbulb' },
  };

  /* ── hand shape primitives ───────────────────────────────── */
  function handFingers(g, fingers, uid) {
    var xs = [10.5, 14.5, 18.5, 22.5]; // pinky, ring, middle, index
    fingers.forEach(function (state, i) {
      var x = xs[i];
      var topY = state === 'up' ? 3 : state === 'half' ? 9 : 14;
      g.appendChild(el('rect', { x: x - 1.6, y: topY, width: 3.2, height: 16 - topY, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4' }));
    });
  }

  function handThumb(g, state, uid) {
    switch (state) {
      case 'up': g.appendChild(el('rect', { x: 5, y: 8, width: 3.2, height: 12, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(-25 6.6 20)' })); break;
      case 'side': g.appendChild(el('rect', { x: 1, y: 17, width: 10, height: 3.2, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4' })); break;
      case 'down': g.appendChild(el('rect', { x: 5, y: 18, width: 3.2, height: 12, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(25 6.6 18)' })); break;
      case 'across': g.appendChild(el('rect', { x: 9, y: 19, width: 8, height: 3, rx: 1.5, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(15 13 20)' })); break;
      case 'hidden': default: break;
    }
  }

  function handPalmOpen(g, uid) {
    g.appendChild(el('rect', { x: 8, y: 14, width: 20, height: 16, rx: 8, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
    g.appendChild(el('rect', { x: 14, y: 27, width: 8, height: 7, rx: 2, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
  }

  function handPalmFist(g, uid) {
    g.appendChild(el('ellipse', { cx: 17, cy: 19, rx: 11, ry: 10, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
    g.appendChild(el('rect', { x: 13, y: 27, width: 8, height: 7, rx: 2, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
    [10, 15, 20, 25].forEach(function (x) {
      g.appendChild(el('line', { x1: x, y1: 12, x2: x, y2: 16, stroke: HAND_STROKE, 'stroke-width': '0.6', opacity: '0.5' }));
    });
  }

  function drawSpecialHand(g, cfg, uid) {
    switch (cfg.special) {
      case 'ok':
        handPalmOpen(g, uid);
        handFingers(g, ['up', 'up', 'up', 'down'], uid);
        g.appendChild(el('circle', { cx: 9, cy: 14, r: 3.6, fill: 'none', stroke: 'url(#hand-' + uid + ')', 'stroke-width': '3' }));
        g.appendChild(el('circle', { cx: 9, cy: 14, r: 3.6, fill: 'none', stroke: HAND_STROKE, 'stroke-width': '0.5' }));
        break;
      case 'ily':
        handPalmOpen(g, uid);
        handFingers(g, ['up', 'down', 'down', 'up'], uid);
        handThumb(g, 'up', uid);
        break;
      case 'callme':
        handPalmFist(g, uid);
        handThumb(g, 'up', uid);
        g.appendChild(el('rect', { x: 24, y: 8, width: 3.2, height: 12, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(20 25.6 20)' }));
        break;
      case 'pinch':
        handPalmOpen(g, uid);
        handFingers(g, ['up', 'up', 'half', 'half'], uid);
        g.appendChild(el('circle', { cx: 14, cy: 8, r: 1.8, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4' }));
        break;
      case 'snap': {
        handPalmOpen(g, uid);
        handFingers(g, ['up', 'up', 'down', 'up'], uid);
        handThumb(g, 'up', uid);
        var spark = el('path', { d: 'M8,6 L9,3 L10,6 M6,8 L3,7 M6,8 L4,10', stroke: HAND_FX.spark, 'stroke-width': '1', fill: 'none', 'stroke-linecap': 'round' });
        animate(spark, { attributeName: 'opacity', values: '0;1;0', dur: '0.8s', repeatCount: 'indefinite' });
        g.appendChild(spark);
        break;
      }
      case 'horns':
        handPalmOpen(g, uid);
        handFingers(g, ['up', 'down', 'down', 'up'], uid);
        handThumb(g, 'across', uid);
        break;
      case 'vulcan':
        handPalmOpen(g, uid);
        [[9, -6], [13, -2], [19, 2], [23, 6]].forEach(function (p) {
          g.appendChild(el('rect', { x: p[0], y: 3, width: 3.2, height: 13, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(' + p[1] + ' ' + (p[0] + 1.6) + ' 16)' }));
        });
        handThumb(g, 'side', uid);
        break;
      case 'gun':
        handPalmFist(g, uid);
        g.appendChild(el('rect', { x: 21, y: 2, width: 3.2, height: 14, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4' }));
        handThumb(g, 'up', uid);
        break;
      case 'money': {
        handPalmOpen(g, uid);
        handFingers(g, ['half', 'half', 'half', 'half'], uid);
        handThumb(g, 'across', uid);
        var dollar = el('text', { x: 18, y: 12, 'font-size': '6', 'font-weight': '700', fill: '#2E7D32', 'text-anchor': 'middle', 'font-family': 'Inter,sans-serif' });
        dollar.textContent = '$';
        animate(dollar, { attributeName: 'opacity', values: '0.3;1;0.3', dur: '1s', repeatCount: 'indefinite' });
        g.appendChild(dollar);
        break;
      }
      case 'pen':
        handPalmFist(g, uid);
        handThumb(g, 'across', uid);
        g.appendChild(el('rect', { x: 20, y: 2, width: 2.4, height: 16, rx: 1, fill: HAND_FX.pen, transform: 'rotate(15 21 10)' }));
        g.appendChild(el('polygon', { points: '19,2 22,2 20.5,-1', fill: HAND_FX.ink, transform: 'rotate(15 21 10)' }));
        break;
      case 'bicep':
        g.appendChild(el('path', { d: 'M8,30 L8,20 Q8,6 20,6 Q30,6 28,16 Q26,22 18,20 Q10,18 8,30Z', fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
        g.appendChild(el('ellipse', { cx: 10, cy: 29, rx: 6, ry: 5, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
        break;
      case 'chop':
        g.appendChild(el('rect', { x: 6, y: 14, width: 24, height: 8, rx: 3, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.6' }));
        [10, 14, 18, 22, 26].forEach(function (x) {
          g.appendChild(el('line', { x1: x, y1: 14, x2: x, y2: 22, stroke: HAND_STROKE, 'stroke-width': '0.5', opacity: '0.5' }));
        });
        break;
      case 'grab':
        handPalmOpen(g, uid);
        handFingers(g, ['half', 'half', 'half', 'half'], uid);
        handThumb(g, 'across', uid);
        break;
      case 'crossed':
        handPalmOpen(g, uid);
        handFingers(g, ['down', 'down', 'down', 'down'], uid);
        g.appendChild(el('rect', { x: 16.9, y: 3, width: 3.2, height: 14, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(15 18.5 16)' }));
        g.appendChild(el('rect', { x: 16.9, y: 3, width: 3.2, height: 14, rx: 1.6, fill: 'url(#hand-' + uid + ')', stroke: HAND_STROKE, 'stroke-width': '0.4', transform: 'rotate(-15 18.5 16)' }));
        handThumb(g, 'across', uid);
        break;
      default: handPalmOpen(g, uid);
    }
  }

  function buildTwoHand(cfg, uid) {
    var svg = el('svg', { viewBox: '0 0 36 36', width: '100%', height: '100%', xmlns: ns });
    var defs = el('defs');
    defs.appendChild(radGrad('hand-' + uid, [['0%', HAND_SKIN[0]], ['100%', HAND_SKIN[1]]]));
    var outer = el('g');

    var thumbState = cfg.thumb || 'side';
    var h1 = el('g', { transform: 'translate(-6,0)' });
    handPalmOpen(h1, uid); handFingers(h1, cfg.fingers, uid); handThumb(h1, thumbState, uid);
    var h2 = el('g', { transform: 'translate(48,0) scale(-1,1)' });
    handPalmOpen(h2, uid); handFingers(h2, cfg.fingers, uid); handThumb(h2, thumbState, uid);

    if (cfg.twoAnim === 'clap' || cfg.twoAnim === 'applause') {
      var dur = cfg.twoAnim === 'applause' ? '0.4s' : '0.6s';
      animateT(h1, { attributeName: 'transform', type: 'translate', values: '-6 0;-2 0;-6 0', dur: dur, repeatCount: 'indefinite', additive: 'sum' });
      animateT(h2, { attributeName: 'transform', type: 'translate', values: '48 0;44 0;48 0', dur: dur, repeatCount: 'indefinite', additive: 'sum' });
    } else if (cfg.twoAnim === 'press') {
      var glow = el('ellipse', { cx: 18, cy: 18, rx: 14, ry: 14, fill: '#FFD93D', opacity: '0.12' });
      animate(glow, { attributeName: 'opacity', values: '0.04;0.22;0.04', dur: '2s', repeatCount: 'indefinite' });
      outer.appendChild(glow);
    } else if (cfg.twoAnim === 'shake') {
      animateT(outer, { attributeName: 'transform', type: 'translate', values: '0 0;0 2;0 0', dur: '0.4s', repeatCount: 'indefinite' });
    }

    outer.appendChild(h1);
    outer.appendChild(h2);
    svg.appendChild(defs);
    svg.appendChild(outer);
    return svg;
  }

  function buildHandGesture(name, uid) {
    var cfg = HAND_GESTURES[name];
    if (cfg.twoHand) return buildTwoHand(cfg, uid);

    var svg = el('svg', { viewBox: '0 0 36 36', width: '100%', height: '100%', xmlns: ns });
    var defs = el('defs');
    defs.appendChild(radGrad('hand-' + uid, [['0%', HAND_SKIN[0]], ['100%', HAND_SKIN[1]]]));

    var rotateWrap = el('g', cfg.rotate ? { transform: 'rotate(' + cfg.rotate + ' 18 18)' } : {});
    var outer = el('g');
    var g = el('g');

    if (cfg.special) {
      drawSpecialHand(g, cfg, uid);
    } else if (cfg.kind === 'fist') {
      handPalmFist(g, uid);
      handThumb(g, cfg.thumb, uid);
    } else {
      handPalmOpen(g, uid);
      handFingers(g, cfg.fingers, uid);
      handThumb(g, cfg.thumb, uid);
    }

    drawExtra(g, cfg.extra, uid);

    outer.appendChild(g);
    applyBodyAnim(outer, cfg.anim, uid);
    rotateWrap.appendChild(outer);

    svg.appendChild(defs);
    svg.appendChild(rotateWrap);
    return svg;
  }

  function buildEmoji(name, uid) {
    if (ANIMATED_FACES[name]) return buildAnimatedFace(name, uid);
    if (HAND_GESTURES[name]) return buildHandGesture(name, uid);

    var svg = el('svg', { viewBox: '0 0 36 36', width: '100%', height: '100%', xmlns: ns });
    var defs = el('defs');
    var g = el('g');

    switch (name) {

      /* ── HAPPY ──────────────────────────────── */
      case 'happy':
        defs.appendChild(radGrad('gh-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gh-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Cheeks
        g.appendChild(el('circle', { cx:'9', cy:'21', r:'3', fill:'#FF9E44', opacity:'0.35' }));
        g.appendChild(el('circle', { cx:'27', cy:'21', r:'3', fill:'#FF9E44', opacity:'0.35' }));
        // Eyes
        g.appendChild(el('ellipse', { cx:'12', cy:'15', rx:'2.2', ry:'2.5', fill:'#5C3A1E' }));
        g.appendChild(el('ellipse', { cx:'24', cy:'15', rx:'2.2', ry:'2.5', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'12.8', cy:'14', r:'0.8', fill:'#fff' }));
        g.appendChild(el('circle', { cx:'24.8', cy:'14', r:'0.8', fill:'#fff' }));
        // Smile
        g.appendChild(el('path', { d:'M11,22 Q18,28 25,22', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        break;

      /* ── LAUGHING ───────────────────────────── */
      case 'laughing':
        defs.appendChild(radGrad('gl-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gl-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Squinting eyes
        g.appendChild(el('path', { d:'M9,14 Q12,11 15,14', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.8', 'stroke-linecap':'round' }));
        g.appendChild(el('path', { d:'M21,14 Q24,11 27,14', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.8', 'stroke-linecap':'round' }));
        // Open mouth
        g.appendChild(el('ellipse', { cx:'18', cy:'23', rx:'5', ry:'4', fill:'#5C3A1E' }));
        g.appendChild(el('ellipse', { cx:'18', cy:'22', rx:'4', ry:'2.5', fill:'#FF6B6B' }));
        // Teeth
        g.appendChild(el('rect', { x:'14', y:'20', width:'8', height:'2', rx:'1', fill:'#fff' }));
        // Tears
        g.appendChild(el('ellipse', { cx:'8', cy:'17', rx:'1.2', ry:'2', fill:'#5BC0EB', opacity:'0.6' }));
        g.appendChild(el('ellipse', { cx:'28', cy:'17', rx:'1.2', ry:'2', fill:'#5BC0EB', opacity:'0.6' }));
        break;

      /* ── LOVE ───────────────────────────────── */
      case 'love':
        defs.appendChild(radGrad('gv-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gv-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Heart eyes
        var he = 'M9,14 C9,11 6,11 6,14 C6,17 9,19 9,19 C9,19 12,17 12,14 C12,11 9,11 9,14Z';
        g.appendChild(el('path', { d:he, fill:'#FF4D6A', transform:'translate(1,0) scale(0.9)' }));
        g.appendChild(el('path', { d:he, fill:'#FF4D6A', transform:'translate(13,0) scale(0.9)' }));
        // Smile
        g.appendChild(el('path', { d:'M11,23 Q18,28 25,23', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        break;

      /* ── FIRE ───────────────────────────────── */
      case 'fire':
        defs.appendChild(radGrad('gf-'+uid, [['0%','#FF6B35'],['40%','#FF4500'],['100%','#CC2200']]));
        defs.appendChild(radGrad('gfi-'+uid, [['0%','#FFD93D'],['100%','#FF8C00']]));
        // Outer flame
        g.appendChild(el('path', { d:'M18,2 C18,2 28,12 28,20 C28,26 23,32 18,34 C13,32 8,26 8,20 C8,12 18,2 18,2Z', fill:'url(#gf-'+uid+')' }));
        // Inner flame
        g.appendChild(el('path', { d:'M18,10 C18,10 24,16 24,21 C24,25 21,29 18,30 C15,29 12,25 12,21 C12,16 18,10 18,10Z', fill:'url(#gfi-'+uid+')' }));
        // Core
        g.appendChild(el('path', { d:'M18,18 C18,18 21,21 21,24 C21,26 20,28 18,28 C16,28 15,26 15,24 C15,21 18,18 18,18Z', fill:'#FFF3B0', opacity:'0.8' }));
        break;

      /* ── COOL ───────────────────────────────── */
      case 'cool':
        defs.appendChild(radGrad('gc-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gc-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Sunglasses
        g.appendChild(el('rect', { x:'5', y:'12', width:'11', height:'7', rx:'2', fill:'#1a1a2e' }));
        g.appendChild(el('rect', { x:'20', y:'12', width:'11', height:'7', rx:'2', fill:'#1a1a2e' }));
        g.appendChild(el('line', { x1:'16', y1:'15.5', x2:'20', y2:'15.5', stroke:'#1a1a2e', 'stroke-width':'1.2' }));
        // Lens glare
        g.appendChild(el('line', { x1:'7', y1:'14', x2:'10', y2:'14.5', stroke:'rgba(255,255,255,0.3)', 'stroke-width':'0.8', 'stroke-linecap':'round' }));
        g.appendChild(el('line', { x1:'22', y1:'14', x2:'25', y2:'14.5', stroke:'rgba(255,255,255,0.3)', 'stroke-width':'0.8', 'stroke-linecap':'round' }));
        // Smile
        g.appendChild(el('path', { d:'M11,24 Q18,28 25,24', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        break;

      /* ── SHOCKED ────────────────────────────── */
      case 'shocked':
        defs.appendChild(radGrad('gs-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gs-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Wide eyes
        g.appendChild(el('circle', { cx:'12', cy:'14', r:'3.5', fill:'#fff', stroke:'#5C3A1E', 'stroke-width':'0.8' }));
        g.appendChild(el('circle', { cx:'24', cy:'14', r:'3.5', fill:'#fff', stroke:'#5C3A1E', 'stroke-width':'0.8' }));
        g.appendChild(el('circle', { cx:'12', cy:'14', r:'2', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'24', cy:'14', r:'2', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'12.7', cy:'13.3', r:'0.7', fill:'#fff' }));
        g.appendChild(el('circle', { cx:'24.7', cy:'13.3', r:'0.7', fill:'#fff' }));
        // Mouth
        g.appendChild(el('ellipse', { cx:'18', cy:'25', rx:'3.5', ry:'4', fill:'#5C3A1E' }));
        g.appendChild(el('ellipse', { cx:'18', cy:'24.5', rx:'2.5', ry:'2.5', fill:'#FF6B6B', opacity:'0.4' }));
        break;

      /* ── CRYING ─────────────────────────────── */
      case 'crying':
        defs.appendChild(radGrad('gcr-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gcr-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Sad eyes
        g.appendChild(el('ellipse', { cx:'12', cy:'15', rx:'2', ry:'2.2', fill:'#5C3A1E' }));
        g.appendChild(el('ellipse', { cx:'24', cy:'15', rx:'2', ry:'2.2', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'12.6', cy:'14.2', r:'0.7', fill:'#fff' }));
        g.appendChild(el('circle', { cx:'24.6', cy:'14.2', r:'0.7', fill:'#fff' }));
        // Eyebrows
        g.appendChild(el('path', { d:'M9,11 Q12,9 15,11', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1', 'stroke-linecap':'round' }));
        g.appendChild(el('path', { d:'M21,11 Q24,9 27,11', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1', 'stroke-linecap':'round' }));
        // Tears
        g.appendChild(el('path', { d:'M10,18 Q9,24 10,28', fill:'none', stroke:'#5BC0EB', 'stroke-width':'2', 'stroke-linecap':'round', opacity:'0.7' }));
        g.appendChild(el('path', { d:'M26,18 Q27,24 26,28', fill:'none', stroke:'#5BC0EB', 'stroke-width':'2', 'stroke-linecap':'round', opacity:'0.7' }));
        // Frown
        g.appendChild(el('path', { d:'M12,26 Q18,22 24,26', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        break;

      /* ── THINKING ───────────────────────────── */
      case 'thinking':
        defs.appendChild(radGrad('gt-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gt-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Eyes looking up
        g.appendChild(el('ellipse', { cx:'12', cy:'14', rx:'2.2', ry:'2.5', fill:'#5C3A1E' }));
        g.appendChild(el('ellipse', { cx:'24', cy:'14', rx:'2.2', ry:'2.5', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'11.5', cy:'13', r:'0.8', fill:'#fff' }));
        g.appendChild(el('circle', { cx:'23.5', cy:'13', r:'0.8', fill:'#fff' }));
        // Raised eyebrow
        g.appendChild(el('path', { d:'M9,10 Q12,7 15,10', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.2', 'stroke-linecap':'round' }));
        // Hand on chin
        g.appendChild(el('circle', { cx:'22', cy:'25', r:'3', fill:'#E8A020', opacity:'0.6' }));
        // Smirk
        g.appendChild(el('path', { d:'M13,24 Q17,24 20,22', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        break;

      /* ── WINK ───────────────────────────────── */
      case 'wink':
        defs.appendChild(radGrad('gw-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gw-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Open eye
        g.appendChild(el('ellipse', { cx:'12', cy:'15', rx:'2.2', ry:'2.5', fill:'#5C3A1E' }));
        g.appendChild(el('circle', { cx:'12.8', cy:'14', r:'0.8', fill:'#fff' }));
        // Wink eye
        g.appendChild(el('path', { d:'M21,15 Q24,12 27,15', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.8', 'stroke-linecap':'round' }));
        // Smile
        g.appendChild(el('path', { d:'M11,22 Q18,28 25,22', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        // Tongue
        g.appendChild(el('ellipse', { cx:'20', cy:'25', rx:'2', ry:'1.5', fill:'#FF6B6B' }));
        break;

      /* ── PARTY ──────────────────────────────── */
      case 'party':
        defs.appendChild(radGrad('gp-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gp-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Party hat
        g.appendChild(el('polygon', { points:'18,0 12,12 24,12', fill:'#8B5CF6' }));
        g.appendChild(el('polygon', { points:'18,0 15,6 21,6', fill:'#A78BFA', opacity:'0.6' }));
        g.appendChild(el('circle', { cx:'18', cy:'0.5', r:'1.5', fill:'#FFD93D' }));
        // Confetti
        g.appendChild(el('rect', { x:'5', y:'4', width:'2', height:'2', rx:'0.5', fill:'#FF4D9E', transform:'rotate(20 6 5)' }));
        g.appendChild(el('rect', { x:'28', y:'6', width:'2', height:'2', rx:'0.5', fill:'#00E5FF', transform:'rotate(-15 29 7)' }));
        g.appendChild(el('rect', { x:'3', y:'24', width:'2', height:'2', rx:'0.5', fill:'#7CFFB2', transform:'rotate(35 4 25)' }));
        g.appendChild(el('rect', { x:'30', y:'22', width:'2', height:'2', rx:'0.5', fill:'#FFD93D', transform:'rotate(-25 31 23)' }));
        // Happy eyes
        g.appendChild(el('path', { d:'M9,16 Q12,13 15,16', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        g.appendChild(el('path', { d:'M21,16 Q24,13 27,16', fill:'none', stroke:'#5C3A1E', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        // Big smile
        g.appendChild(el('path', { d:'M10,22 Q18,30 26,22', fill:'#5C3A1E' }));
        g.appendChild(el('path', { d:'M12,22 Q18,27 24,22', fill:'#FF6B6B', opacity:'0.5' }));
        break;

      /* ── SLEEPY ─────────────────────────────── */
      case 'sleepy':
        defs.appendChild(radGrad('gsleep-'+uid, [['0%','#B8C6DB'],['100%','#8FA4BF']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gsleep-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#7A8FA6', 'stroke-width':'0.8' }));
        // Closed eyes
        g.appendChild(el('path', { d:'M9,16 Q12,18 15,16', fill:'none', stroke:'#4A5568', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        g.appendChild(el('path', { d:'M21,16 Q24,18 27,16', fill:'none', stroke:'#4A5568', 'stroke-width':'1.5', 'stroke-linecap':'round' }));
        // Zzz
        var t1 = el('text', { x:'26', y:'8', 'font-size':'6', 'font-weight':'700', fill:'#5BC0EB', opacity:'0.7', 'font-family':'Inter,sans-serif' });
        t1.textContent = 'Z';
        g.appendChild(t1);
        var t2 = el('text', { x:'29', y:'4', 'font-size':'4.5', 'font-weight':'700', fill:'#5BC0EB', opacity:'0.5', 'font-family':'Inter,sans-serif' });
        t2.textContent = 'z';
        g.appendChild(t2);
        // Open mouth
        g.appendChild(el('ellipse', { cx:'18', cy:'25', rx:'3', ry:'2.5', fill:'#4A5568', opacity:'0.6' }));
        break;

      /* ── ANGRY ──────────────────────────────── */
      case 'angry':
        defs.appendChild(radGrad('ga-'+uid, [['0%','#FF6B6B'],['100%','#CC3333']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#ga-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#AA2222', 'stroke-width':'0.8' }));
        // Angry eyebrows
        g.appendChild(el('line', { x1:'8', y1:'10', x2:'15', y2:'13', stroke:'#5C1A1A', 'stroke-width':'2', 'stroke-linecap':'round' }));
        g.appendChild(el('line', { x1:'28', y1:'10', x2:'21', y2:'13', stroke:'#5C1A1A', 'stroke-width':'2', 'stroke-linecap':'round' }));
        // Eyes
        g.appendChild(el('ellipse', { cx:'12', cy:'16', rx:'2', ry:'2.2', fill:'#5C1A1A' }));
        g.appendChild(el('ellipse', { cx:'24', cy:'16', rx:'2', ry:'2.2', fill:'#5C1A1A' }));
        // Frown
        g.appendChild(el('path', { d:'M10,26 Q18,21 26,26', fill:'none', stroke:'#5C1A1A', 'stroke-width':'2', 'stroke-linecap':'round' }));
        // Steam
        g.appendChild(el('circle', { cx:'6', cy:'6', r:'1.5', fill:'#FF6B6B', opacity:'0.4' }));
        g.appendChild(el('circle', { cx:'30', cy:'6', r:'1.5', fill:'#FF6B6B', opacity:'0.4' }));
        break;

      /* ── SKULL ──────────────────────────────── */
      case 'skull':
        defs.appendChild(radGrad('gsk-'+uid, [['0%','#F0F0F5'],['100%','#C8C8D4']]));
        g.appendChild(el('path', { d:'M18,2 C10,2 4,8 4,16 C4,22 7,26 11,28 L11,32 L16,30 L18,32 L20,30 L25,32 L25,28 C29,26 32,22 32,16 C32,8 26,2 18,2Z', fill:'url(#gsk-'+uid+')' }));
        g.appendChild(el('path', { d:'M18,2 C10,2 4,8 4,16 C4,22 7,26 11,28 L11,32 L16,30 L18,32 L20,30 L25,32 L25,28 C29,26 32,22 32,16 C32,8 26,2 18,2Z', fill:'none', stroke:'#A0A0B0', 'stroke-width':'0.8' }));
        // Eye sockets
        g.appendChild(el('ellipse', { cx:'12', cy:'15', rx:'3.5', ry:'4', fill:'#2A2A3A' }));
        g.appendChild(el('ellipse', { cx:'24', cy:'15', rx:'3.5', ry:'4', fill:'#2A2A3A' }));
        // Eye glints
        g.appendChild(el('circle', { cx:'11', cy:'14', r:'1', fill:'#6C63FF', opacity:'0.6' }));
        g.appendChild(el('circle', { cx:'23', cy:'14', r:'1', fill:'#6C63FF', opacity:'0.6' }));
        // Nose
        g.appendChild(el('polygon', { points:'17,20 19,20 18,22', fill:'#2A2A3A' }));
        // Teeth
        g.appendChild(el('rect', { x:'12', y:'25', width:'2.5', height:'3', rx:'0.5', fill:'#fff', stroke:'#A0A0B0', 'stroke-width':'0.4' }));
        g.appendChild(el('rect', { x:'15', y:'25', width:'2.5', height:'3', rx:'0.5', fill:'#fff', stroke:'#A0A0B0', 'stroke-width':'0.4' }));
        g.appendChild(el('rect', { x:'18', y:'25', width:'2.5', height:'3', rx:'0.5', fill:'#fff', stroke:'#A0A0B0', 'stroke-width':'0.4' }));
        g.appendChild(el('rect', { x:'21', y:'25', width:'2.5', height:'3', rx:'0.5', fill:'#fff', stroke:'#A0A0B0', 'stroke-width':'0.4' }));
        break;

      /* ── ROBOT ──────────────────────────────── */
      case 'robot':
        defs.appendChild(grad('gr-'+uid, [['0%','#6C63FF'],['100%','#4F46E5']]));
        // Antenna
        g.appendChild(el('line', { x1:'18', y1:'2', x2:'18', y2:'7', stroke:'#8B8BA7', 'stroke-width':'1.5' }));
        g.appendChild(el('circle', { cx:'18', cy:'2', r:'1.5', fill:'#00E5FF' }));
        // Head
        g.appendChild(el('rect', { x:'5', y:'7', width:'26', height:'22', rx:'5', fill:'url(#gr-'+uid+')' }));
        g.appendChild(el('rect', { x:'5', y:'7', width:'26', height:'22', rx:'5', fill:'none', stroke:'#5B52CC', 'stroke-width':'0.8' }));
        // Eyes (screens)
        g.appendChild(el('rect', { x:'9', y:'13', width:'7', height:'5', rx:'2', fill:'#0A0F2E' }));
        g.appendChild(el('rect', { x:'20', y:'13', width:'7', height:'5', rx:'2', fill:'#0A0F2E' }));
        // Eye glow
        g.appendChild(el('circle', { cx:'12.5', cy:'15.5', r:'1.5', fill:'#00E5FF' }));
        g.appendChild(el('circle', { cx:'23.5', cy:'15.5', r:'1.5', fill:'#00E5FF' }));
        // Mouth grill
        g.appendChild(el('rect', { x:'11', y:'22', width:'14', height:'4', rx:'2', fill:'#0A0F2E' }));
        for (var i = 0; i < 4; i++) {
          g.appendChild(el('line', { x1:String(13+i*3), y1:'22.5', x2:String(13+i*3), y2:'25.5', stroke:'#6C63FF', 'stroke-width':'0.6', opacity:'0.5' }));
        }
        break;

      /* ── ALIEN ──────────────────────────────── */
      case 'alien':
        defs.appendChild(radGrad('gal-'+uid, [['0%','#7CFFB2'],['100%','#2DD4BF']]));
        // Head
        g.appendChild(el('ellipse', { cx:'18', cy:'16', rx:'13', ry:'14', fill:'url(#gal-'+uid+')' }));
        g.appendChild(el('ellipse', { cx:'18', cy:'16', rx:'13', ry:'14', fill:'none', stroke:'#1A9E7A', 'stroke-width':'0.8' }));
        // Big eyes
        g.appendChild(el('ellipse', { cx:'11', cy:'14', rx:'4', ry:'5.5', fill:'#0A0F2E' }));
        g.appendChild(el('ellipse', { cx:'25', cy:'14', rx:'4', ry:'5.5', fill:'#0A0F2E' }));
        // Eye glow
        g.appendChild(el('ellipse', { cx:'11', cy:'14', rx:'2.5', ry:'3.5', fill:'#7CFFB2', opacity:'0.4' }));
        g.appendChild(el('ellipse', { cx:'25', cy:'14', rx:'2.5', ry:'3.5', fill:'#7CFFB2', opacity:'0.4' }));
        g.appendChild(el('circle', { cx:'10', cy:'12.5', r:'1.2', fill:'#fff', opacity:'0.7' }));
        g.appendChild(el('circle', { cx:'24', cy:'12.5', r:'1.2', fill:'#fff', opacity:'0.7' }));
        // Small mouth
        g.appendChild(el('ellipse', { cx:'18', cy:'24', rx:'2.5', ry:'1.5', fill:'#1A9E7A', opacity:'0.6' }));
        break;

      /* ── HEART ──────────────────────────────── */
      case 'heart':
        defs.appendChild(radGrad('ghr-'+uid, [['0%','#FF6B8A'],['50%','#FF4D6A'],['100%','#CC2244']]));
        g.appendChild(el('path', {
          d:'M18,32 C18,32 2,22 2,12 C2,6 7,2 12,2 C15,2 17,4 18,6 C19,4 21,2 24,2 C29,2 34,6 34,12 C34,22 18,32 18,32Z',
          fill:'url(#ghr-'+uid+')'
        }));
        // Shine
        g.appendChild(el('ellipse', { cx:'11', cy:'10', rx:'3', ry:'4', fill:'#fff', opacity:'0.25', transform:'rotate(-20 11 10)' }));
        break;

      /* ── STAR EYES ──────────────────────────── */
      case 'star_eyes':
        defs.appendChild(radGrad('gse-'+uid, [['0%','#FFE066'],['100%','#FFB830']]));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'url(#gse-'+uid+')' }));
        g.appendChild(el('circle', { cx:'18', cy:'18', r:'16', fill:'none', stroke:'#E8A020', 'stroke-width':'0.8' }));
        // Star eyes
        var star = 'M12,12 L13,14.5 L15.5,14.5 L13.5,16 L14.2,18.5 L12,17 L9.8,18.5 L10.5,16 L8.5,14.5 L11,14.5Z';
        g.appendChild(el('path', { d:star, fill:'#FFD93D', stroke:'#E8A020', 'stroke-width':'0.4' }));
        var star2 = 'M24,12 L25,14.5 L27.5,14.5 L25.5,16 L26.2,18.5 L24,17 L21.8,18.5 L22.5,16 L20.5,14.5 L23,14.5Z';
        g.appendChild(el('path', { d:star2, fill:'#FFD93D', stroke:'#E8A020', 'stroke-width':'0.4' }));
        // Big smile
        g.appendChild(el('path', { d:'M10,23 Q18,30 26,23', fill:'#5C3A1E' }));
        g.appendChild(el('path', { d:'M12,23 Q18,28 24,23', fill:'#FF6B6B', opacity:'0.4' }));
        break;

      /* ── ROCKET ─────────────────────────────── */
      case 'rocket':
        defs.appendChild(grad('groc-'+uid, [['0%','#F0F0F5'],['100%','#C8C8D4']]));
        // Flame
        g.appendChild(el('path', { d:'M14,28 Q18,36 22,28 Q20,32 18,34 Q16,32 14,28Z', fill:'#FF6B35' }));
        g.appendChild(el('path', { d:'M15.5,28 Q18,33 20.5,28 Q19.5,31 18,32 Q16.5,31 15.5,28Z', fill:'#FFD93D' }));
        // Body
        g.appendChild(el('path', { d:'M18,2 C18,2 26,8 26,18 L26,26 L10,26 L10,18 C10,8 18,2 18,2Z', fill:'url(#groc-'+uid+')' }));
        g.appendChild(el('path', { d:'M18,2 C18,2 26,8 26,18 L26,26 L10,26 L10,18 C10,8 18,2 18,2Z', fill:'none', stroke:'#A0A0B0', 'stroke-width':'0.6' }));
        // Window
        g.appendChild(el('circle', { cx:'18', cy:'14', r:'3.5', fill:'#0A0F2E', stroke:'#6C63FF', 'stroke-width':'0.6' }));
        g.appendChild(el('circle', { cx:'18', cy:'14', r:'2', fill:'#1a1a3e' }));
        g.appendChild(el('circle', { cx:'17', cy:'13', r:'0.8', fill:'#fff', opacity:'0.4' }));
        // Fins
        g.appendChild(el('path', { d:'M10,20 L6,26 L10,26Z', fill:'#6C63FF', opacity:'0.8' }));
        g.appendChild(el('path', { d:'M26,20 L30,26 L26,26Z', fill:'#6C63FF', opacity:'0.8' }));
        // Stripe
        g.appendChild(el('rect', { x:'10', y:'22', width:'16', height:'2', fill:'#FF4D6A', opacity:'0.6' }));
        break;

      /* ── CROWN ──────────────────────────────── */
      case 'crown':
        defs.appendChild(grad('gcrw-'+uid, [['0%','#FFD93D'],['50%','#FFB830'],['100%','#E8A020']]));
        g.appendChild(el('polygon', {
          points:'4,24 6,10 12,17 18,4 24,17 30,10 32,24',
          fill:'url(#gcrw-'+uid+')',
          stroke:'#CC8800',
          'stroke-width':'0.8'
        }));
        // Base
        g.appendChild(el('rect', { x:'4', y:'24', width:'28', height:'5', rx:'2', fill:'url(#gcrw-'+uid+')', stroke:'#CC8800', 'stroke-width':'0.6' }));
        // Jewels
        g.appendChild(el('circle', { cx:'11', cy:'26.5', r:'1.5', fill:'#FF4D6A' }));
        g.appendChild(el('circle', { cx:'18', cy:'26.5', r:'1.8', fill:'#6C63FF' }));
        g.appendChild(el('circle', { cx:'25', cy:'26.5', r:'1.5', fill:'#00E5FF' }));
        // Tip gems
        g.appendChild(el('circle', { cx:'6', cy:'10', r:'1.5', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.4' }));
        g.appendChild(el('circle', { cx:'18', cy:'4', r:'2', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.4' }));
        g.appendChild(el('circle', { cx:'30', cy:'10', r:'1.5', fill:'#FFD93D', stroke:'#CC8800', 'stroke-width':'0.4' }));
        // Shine
        g.appendChild(el('path', { d:'M10,14 L12,17 L14,14', fill:'#fff', opacity:'0.3' }));
        break;

      /* ── HIVE LOGO ──────────────────────────── */
      case 'hive':
        defs.appendChild(radGrad('ghiv-'+uid, [['0%','#6C63FF'],['100%','#4F46E5']]));
        defs.appendChild(radGrad('ghiv2-'+uid, [['0%','#00E5FF'],['100%','#0891B2']]));
        // Hexagon body
        g.appendChild(el('polygon', {
          points:'18,2 31,9.5 31,24.5 18,32 5,24.5 5,9.5',
          fill:'url(#ghiv-'+uid+')',
          stroke:'#5B52CC',
          'stroke-width':'1'
        }));
        // Inner hexagon
        g.appendChild(el('polygon', {
          points:'18,6 27,11.5 27,22.5 18,28 9,22.5 9,11.5',
          fill:'none',
          stroke:'url(#ghiv2-'+uid+')',
          'stroke-width':'1.2',
          opacity:'0.7'
        }));
        // H letter
        g.appendChild(el('line', { x1:'13', y1:'12', x2:'13', y2:'23', stroke:'#fff', 'stroke-width':'2.2', 'stroke-linecap':'round' }));
        g.appendChild(el('line', { x1:'23', y1:'12', x2:'23', y2:'23', stroke:'#fff', 'stroke-width':'2.2', 'stroke-linecap':'round' }));
        g.appendChild(el('line', { x1:'13', y1:'17.5', x2:'23', y2:'17.5', stroke:'#fff', 'stroke-width':'2', 'stroke-linecap':'round' }));
        // Glow dots
        g.appendChild(el('circle', { cx:'18', cy:'2', r:'1.5', fill:'#00E5FF', opacity:'0.8' }));
        g.appendChild(el('circle', { cx:'31', cy:'9.5', r:'1.2', fill:'#00E5FF', opacity:'0.6' }));
        g.appendChild(el('circle', { cx:'31', cy:'24.5', r:'1.2', fill:'#00E5FF', opacity:'0.6' }));
        g.appendChild(el('circle', { cx:'18', cy:'32', r:'1.5', fill:'#00E5FF', opacity:'0.8' }));
        g.appendChild(el('circle', { cx:'5', cy:'24.5', r:'1.2', fill:'#00E5FF', opacity:'0.6' }));
        g.appendChild(el('circle', { cx:'5', cy:'9.5', r:'1.2', fill:'#00E5FF', opacity:'0.6' }));
        break;
    }

    svg.appendChild(defs);
    svg.appendChild(g);
    return svg;
  }

  /* Public API */
  function create(name, size) {
    if (!EMOJIS[name]) return null;
    size = size || 22;
    var wrapper = document.createElement('span');
    wrapper.className = 'hive-emoji';
    wrapper.setAttribute('data-emoji', name);
    wrapper.setAttribute('aria-label', EMOJIS[name].name);
    wrapper.style.width = size + 'px';
    wrapper.style.height = size + 'px';
    wrapper.style.display = 'inline-flex';
    wrapper.style.verticalAlign = 'middle';
    var uid = 'e' + Math.random().toString(36).substr(2, 6);
    var svg = buildEmoji(name, uid);
    if (svg) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      wrapper.appendChild(svg);
    }
    return wrapper;
  }

  function renderText(text) {
    if (!text) return text;
    return text.replace(/:hive_[a-z_]+:/g, function (match) {
      var key = match.replace(/:hive_/, '').replace(/:/, '');
      if (!EMOJIS[key]) return match;
      var info = EMOJIS[key];
      return '<span class="hive-emoji-inline" data-emoji="' + key + '" aria-label="' + info.name + '" title="' + info.name + '"><svg viewBox="0 0 36 36" width="1.2em" height="1.2em" style="vertical-align:-0.2em;display:inline" xmlns="http://www.w3.org/2000/svg">' + (buildEmoji(key, 'i'+key).innerHTML) + '</svg></span>';
    });
  }

  function getAll() { return EMOJIS; }
  function get(name) { return EMOJIS[name] || null; }
  function search(query) {
    var q = query.toLowerCase().trim();
    if (!q) return Object.keys(EMOJIS);
    return Object.keys(EMOJIS).filter(function (k) {
      return k.indexOf(q) !== -1 || EMOJIS[k].name.toLowerCase().indexOf(q) !== -1;
    });
  }

  var CATEGORIES = {
    faces:   { name: 'Faces',   icon: '😀' },
    hands:   { name: 'Hands',   icon: '👋' },
    nature:  { name: 'Nature',  icon: '🌿' },
    objects: { name: 'Objects', icon: '🍔' },
    symbols: { name: 'Symbols', icon: '✨' },
  };

  function getCategories() { return CATEGORIES; }

  function getByCategory(cat) {
    return Object.keys(EMOJIS).filter(function (k) { return EMOJIS[k].cat === cat; });
  }

  function register(emojis) {
    Object.keys(emojis).forEach(function (k) {
      EMOJIS[k] = emojis[k];
    });
  }

  return { create: create, renderText: renderText, getAll: getAll, get: get, search: search, getCategories: getCategories, getByCategory: getByCategory, register: register };
})();