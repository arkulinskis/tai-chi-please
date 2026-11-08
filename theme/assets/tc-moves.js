/* _moves: shared content. Every move (warm-ups, qigong, lymph self-massage, the 24-step form, cool-down) with its
     teaching text and keyframes for TC.Figure, the learning path, the 24-form order, the session composer and
     the morning thoughts. Keys: [seconds, partial pose, breath 'in'|'out'|'', step index] (see _figure.html).
   (moved unchanged from the JavaScript version's web/pages/_moves.html) */
(function () {
  'use strict';
  var TC = window.TC;
  function F(x, z, lift, yaw, toe) { return [x, z, lift || 0, yaw || 0, toe || 0]; }
  var READY = { px: 0, pz: 0, sink: 8, hy: 0, wy: 0, lean: 0, side: 0, hdy: 0, hdp: 0, sh: 0,
    lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), lh: [16, -44, 18], rh: [-16, -44, 18] };
  var STAND = { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [21, -52, 6], rh: [-21, -52, 6] };
  var HIPS = { lh: [15, -45, 2], rh: [-15, -45, 2] };
  function x(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  TC.CATS = {
    warm: { name: 'Warm-ups', short: 'Warm-up', icon: 'sunrise', blurb: 'Wake the joints, loosen the spine, arrive in the body.' },
    qigong: { name: 'Morning qigong', short: 'Qigong', icon: 'wind', blurb: 'Five pieces of the Eight Brocades (Ba Duan Jin), the classic 800-year-old morning set.' },
    lymph: { name: 'Lymph self-massage', short: 'Lymph', icon: 'drop', blurb: 'Feather-light strokes that help lymph flow back toward the heart. Neck first, then armpits, belly, groin.' },
    form: { name: 'The 24-step form', short: 'Form', icon: 'bamboo', blurb: 'Yang-style simplified tai chi, the most practised form in the world, learned one move at a time.' },
    cool: { name: 'Cool-down', short: 'Cool-down', icon: 'lotus', blurb: 'Gather the energy, settle the breath, carry the calm into the day.' }
  };

  var M = [
    /* ------------------------------------------------------------- warm-ups */
    { id: 'wuji', cat: 'warm', name: 'Wuji standing', zh: '无极桩', py: 'Wújí zhuāng', secs: 60,
      about: "Wuji means 'without limits': the empty stillness before movement. Every tai chi practice begins here, standing quietly and letting the body settle.",
      steps: ["Stand with the feet hip-width apart, knees soft, arms hanging loosely.", "Breathe in through the nose; let the crown of the head float up.", "Breathe out; let the shoulders, chest and belly soften and sink."],
      tip: "Imagine a thread lifting the top of your head while your tailbone grows heavy.",
      start: STAND, keys: [[4, {}, 'out', 2], [4, { sink: 1, sh: 1.2, lh: [22, -50, 7], rh: [-22, -50, 7] }, 'in', 1]] },
    { id: 'neck', cat: 'warm', name: 'Neck release', zh: '颈部放松', py: 'Jǐngbù fàngsōng', secs: 40,
      about: "Slow turns and nods release the neck after a night on the pillow. Move only as far as feels easy.",
      steps: ["Hands on the hips, stand tall.", "Slowly turn the head to look over the left shoulder.", "Return to the centre.", "Turn to look over the right shoulder.", "Let the chin sink toward the chest, then lift it again."],
      tip: "Lead with the eyes, and let the head follow.",
      start: x(STAND, HIPS), keys: [[2.5, { hdy: 0, hdp: 0 }, 'in', 4], [3, { hdy: 60 }, 'in', 1], [2.5, { hdy: 0 }, 'out', 2], [3, { hdy: -60 }, 'in', 3], [2.5, { hdy: 0 }, 'out', 2], [2.5, { hdp: 30 }, 'out', 4]] },
    { id: 'shoulders', cat: 'warm', name: 'Shoulder circles', zh: '肩部绕环', py: 'Jiānbù ràohuán', secs: 30,
      about: "Rolling the shoulders wakes the upper back and the muscles around the collarbones, where the lymph drains.",
      steps: ["Let the arms hang.", "Lift the shoulders forward and up toward the ears.", "Roll them back and let them drop heavily. Six slow circles, then reverse."],
      tip: "Make the circles big and slow; the arms stay heavy.",
      start: STAND, keys: [[1.3, { sh: 0, lh: [21, -52, 6], rh: [-21, -52, 6] }, 'out', 2], [1.1, { sh: 3, lh: [21, -49, 9], rh: [-21, -49, 9] }, 'in', 1], [1.1, { sh: 6, lh: [21, -46, 5], rh: [-21, -46, 5] }, 'in', 1], [1.1, { sh: 2, lh: [21, -50, 2], rh: [-21, -50, 2] }, 'out', 2]] },
    { id: 'waist', cat: 'warm', name: 'Turning the waist', zh: '转腰甩手', py: 'Zhuǎn yāo shuǎi shǒu', secs: 45,
      about: "The arms swing like the beads of a rattle drum while the waist turns. In tai chi the waist is the axle: everything moves from there.",
      steps: ["Feet a little wider than the hips, knees soft, arms loose like empty sleeves.", "Turn from the waist; let the arms swing and gently wrap around the body.", "Swing back through the centre without effort."],
      tip: "Let the hands land softly on the body: a gentle pat on the belly and lower back.",
      start: { lf: F(17, 0, 0, 6), rf: F(-17, 0, 0, -6), sink: 6, lh: [21, -50, 8], rh: [-21, -50, 8] },
      keys: [[1.3, { hy: 0, wy: 0, hdy: 0, lh: [21, -50, 8], rh: [-21, -50, 8] }, 'out', 2], [1.5, { hy: 28, wy: 32, hdy: 20, rh: [12, -40, 16], lh: [-6, -44, -14] }, 'in', 1],
        [1.3, { hy: 0, wy: 0, hdy: 0, lh: [21, -50, 8], rh: [-21, -50, 8] }, 'out', 2], [1.5, { hy: -28, wy: -32, hdy: -20, lh: [-12, -40, 16], rh: [6, -44, -14] }, 'in', 1]] },
    { id: 'hips', cat: 'warm', name: 'Hip and knee circles', zh: '转胯', py: 'Zhuǎn kuà', secs: 30,
      about: "Small circles of the hips and knees warm the legs for the low, rooted stances of the form.",
      steps: ["Feet together, hands on the hips, knees bent.", "Circle the hips and knees slowly, drawing a small circle on the floor.", "Six circles each way."],
      tip: "Keep the heels down and the circle small.",
      start: x(HIPS, { lf: F(8, 0), rf: F(-8, 0), sink: 10 }),
      keys: [[1.2, { px: 4, pz: 0, side: -3, lean: 0 }, '', 1], [1.2, { px: 0, pz: 4, side: 0, lean: -3 }, '', 1], [1.2, { px: -4, pz: 0, side: 3, lean: 0 }, '', 2], [1.2, { px: 0, pz: -4, side: 0, lean: 4 }, '', 2]] },
    { id: 'tapping', cat: 'warm', name: 'Waking tap', zh: '拍打', py: 'Pāi dǎ', secs: 50, both: true,
      about: "Tapping the body with loose, cupped hands (pai da) wakes the skin and circulation. A favourite of morning practitioners in parks across China.",
      steps: ["Hold the left arm out, relaxed. With a loose, cupped right hand, tap from the shoulder", "down the top of the arm to the hand,", "then up the inside of the arm back to the armpit. Switch sides. Finish by patting down the outside of the legs and up the inside."],
      tip: "Loose wrists, light taps: like rain on a bamboo leaf.",
      start: { lf: F(14, 0, 0, 4), rf: F(-14, 0, 0, -4), sink: 4, lh: [30, -22, 30], rh: [20, 3, 6] },
      keys: [[.9, { lh: [30, -22, 30], rh: [20, 3, 6] }, '', 0], [.25, { rh: [22, 9, 9] }, '', 0], [.25, { rh: [23, -3, 14] }, '', 1], [.25, { rh: [25, 3, 17] }, '', 1], [.25, { rh: [26, -9, 21] }, '', 1],
        [.25, { rh: [28, -3, 24] }, '', 1], [.25, { rh: [29, -14, 27] }, '', 1], [.3, { rh: [27, -20, 24] }, '', 2], [.3, { rh: [25, -18, 19] }, '', 2], [.3, { rh: [22, -14, 12] }, '', 2], [.3, { rh: [19, -9, 5] }, '', 2]] },
    { id: 'holdtree', cat: 'cool', name: 'Hugging the tree', zh: '站桩', py: 'Zhàn zhuāng', secs: 60,
      about: "Standing post: the quiet practice that builds root and calm. Masters stand for an hour; one minute is a good start.",
      steps: ["Feet shoulder-width, knees bent over the toes, tailbone dropped.", "Arms round in front of the chest as if hugging a big tree. Breathe in: the arms expand a little.", "Breathe out: sink, and let the weight drain into the feet."],
      tip: "Shoulders down, elbows heavy, a little space under each armpit, like holding an egg.",
      start: { lf: F(16, 0, 0, 4), rf: F(-16, 0, 0, -4), sink: 10, lh: [11, -15, 25], rh: [-11, -15, 25] },
      keys: [[5, { sink: 10, lh: [11, -15, 25], rh: [-11, -15, 25], sh: 0 }, 'out', 2], [4, { sink: 8.5, lh: [13, -14, 27], rh: [-13, -14, 27], sh: .5 }, 'in', 1]] },

    /* ------------------------------------------------------------- qigong */
    { id: 'heavens', cat: 'qigong', name: 'Holding up the heavens', zh: '两手托天理三焦', py: 'Liǎng shǒu tuō tiān lǐ sān jiāo', secs: 60,
      about: "The first of the Eight Brocades: a long, slow stretch up the whole front of the body, said to regulate the 'triple burner', the body's three cavities.",
      steps: ["Interlace the fingers in front of the belly, palms up.", "Breathe in and lift the hands up the centre line; turn the palms out at the chest and press up to the sky. Look at the hands.", "Stretch tall for a moment.", "Breathe out, open the arms wide and float them down to the sides."],
      tip: "Lengthen, don't strain: the shoulders stay away from the ears.",
      start: { lf: F(14, 0, 0, 3), rf: F(-14, 0, 0, -3), sink: 4, lh: [4, -48, 14], rh: [-4, -48, 14] },
      keys: [[1.8, { lh: [4, -48, 14], rh: [-4, -48, 14], sink: 4, hdp: 0, sh: 0 }, 'out', 3], [2.2, { lh: [4, -16, 22], rh: [-4, -16, 22], sink: 2 }, 'in', 1],
        [2.5, { lh: [4, 57, 4], rh: [-4, 57, 4], sink: -2, hdp: -25, sh: 3 }, 'in', 1], [1.5, { lh: [4, 59, 2], rh: [-4, 59, 2], sink: -3, hdp: -10 }, '', 2],
        [2.5, { lh: [66, 4, 8], rh: [-66, 4, 8], sink: 2, hdp: 0, sh: 0 }, 'out', 3], [2, { lh: [22, -50, 8], rh: [-22, -50, 8], sink: 5 }, 'out', 3]] },
    { id: 'archer', cat: 'qigong', name: 'Drawing the bow', zh: '左右开弓似射雕', py: 'Zuǒ yòu kāi gōng sì shè diāo', secs: 60,
      about: "Draw an imaginary bow to shoot a hawk. Opens the chest and lungs, strengthens the legs in a wide horse stance.",
      steps: ["Step wide into a horse stance; cross the wrists in front of the chest.", "Breathe in: push the left hand out to the side, index finger up, as the right hand draws the bowstring back. Look past the left fingers.", "Breathe out: bring the hands back to the centre. Then draw the bow to the right."],
      tip: "Sit only as low as your knees enjoy; the knees point the same way as the toes.",
      start: { lf: F(27, 0, 0, 10), rf: F(-27, 0, 0, -10), sink: 16, lh: [5, -12, 22], rh: [-3, -10, 20] },
      keys: [[2.4, { lh: [5, -12, 22], rh: [-3, -10, 20], hdy: 0, sink: 16 }, 'out', 2], [3, { lh: [70, 4, 6], rh: [-26, -6, 10], hdy: 70, sink: 18 }, 'in', 1],
        [2.4, { lh: [5, -12, 22], rh: [-3, -10, 20], hdy: 0, sink: 16 }, 'out', 2], [3, { rh: [-70, 4, 6], lh: [26, -6, 10], hdy: -70, sink: 18 }, 'in', 1]] },
    { id: 'separate', cat: 'qigong', name: 'Separating heaven and earth', zh: '调理脾胃须单举', py: 'Tiáo lǐ pí wèi xū dān jǔ', secs: 50,
      about: "One hand presses up, one presses down: a diagonal stretch through the side of the body, traditionally for the spleen and stomach.",
      steps: ["Hands in front of the belly, palms up, like holding a bowl.", "Breathe in: one hand presses up to the sky, palm up; the other presses down by the hip, palm down.", "Breathe out: bring them back to the bowl, and switch."],
      tip: "Feel the stretch from the lifted palm all the way down to the opposite heel.",
      start: { lf: F(14, 0, 0, 3), rf: F(-14, 0, 0, -3), sink: 5, lh: [8, -40, 18], rh: [-8, -40, 18] },
      keys: [[2.2, { lh: [8, -40, 18], rh: [-8, -40, 18], sink: 5, sh: 0 }, 'out', 2], [2.8, { lh: [10, 57, 6], rh: [-20, -54, 6], sink: 1, sh: 2 }, 'in', 1],
        [2.2, { lh: [8, -40, 18], rh: [-8, -40, 18], sink: 5, sh: 0 }, 'out', 2], [2.8, { rh: [-10, 57, 6], lh: [20, -54, 6], sink: 1, sh: 2 }, 'in', 1]] },
    { id: 'owl', cat: 'qigong', name: 'Wise owl looks back', zh: '五劳七伤往后瞧', py: 'Wǔ láo qī shāng wǎng hòu qiáo', secs: 45,
      about: "A slow twist of the neck and upper spine while the palms press down. Releases the neck and the eyes after screens.",
      steps: ["Stand tall, palms pressing down beside the hips, fingers forward.", "Breathe in: turn the head slowly to look behind over the left shoulder; the chest opens.", "Breathe out and come back to the centre. Then look over the right shoulder."],
      tip: "The shoulders stay level and quiet; only the head and upper back turn.",
      start: { lf: F(10, 0, 0, 3), rf: F(-10, 0, 0, -3), sink: 3, lh: [24, -48, 10], rh: [-24, -48, 10] },
      keys: [[2.5, { hdy: 0, wy: 0 }, 'out', 2], [3, { hdy: 75, wy: 14 }, 'in', 1], [2.5, { hdy: 0, wy: 0 }, 'out', 2], [3, { hdy: -75, wy: -14 }, 'in', 1]] },
    { id: 'bounce', cat: 'qigong', name: 'Bouncing on the toes', zh: '背后七颠百病消', py: 'Bèi hòu qī diān bǎi bìng xiāo', secs: 25,
      about: "The last of the Eight Brocades: 'seven bounces and the hundred illnesses vanish'. A gentle jolt that shakes the whole body awake, and a lovely pump for the lymph in the legs.",
      steps: ["Feet together, arms relaxed.", "Breathe in and rise onto the balls of the feet, lifting the crown.", "Breathe out and drop the heels lightly to the ground. Seven times."],
      tip: "Soft knees as you land. Skip the drop if your heels or back complain; just rise and lower.",
      start: { lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sink: 1, lh: [19, -54, 4], rh: [-19, -54, 4] },
      keys: [[.9, { sink: 1, lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sh: 0 }, '', 2], [1.4, { sink: -6, lf: F(9, 0, 6, 3), rf: F(-9, 0, 6, -3), sh: 1 }, 'in', 1], [.35, { sink: 1.5, lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sh: 0 }, 'out', 2]] },

    /* ------------------------------------------------------------- lymph self-massage */
    { id: 'lbreath', cat: 'lymph', name: 'Belly breathing', secs: 40,
      about: "Deep breathing is the main pump of the lymph system: as the diaphragm moves, it draws lymph up the large duct in the chest. Always start and finish here.",
      steps: ["Hands resting on the belly below the navel.", "Breathe in slowly through the nose and let the belly swell into the hands.", "Breathe out for longer than you breathed in; feel the belly fall back."],
      tip: "Five slow breaths. If your mind wanders, count the out-breaths.",
      start: STAND, keys: [[5, { lh: [6, -42, 14], rh: [-6, -42, 14], sink: 3, sh: 0 }, 'out', 2], [4, { lh: [6, -41, 18], rh: [-6, -41, 18], sink: 2, sh: 1 }, 'in', 1]] },
    { id: 'collarbone', cat: 'lymph', name: 'Above the collarbones', secs: 35,
      about: "The hollows above the collarbones are where lymph finally returns to the blood. Clearing them first makes room for everything that follows.",
      steps: ["Rest the fingers flat in the soft hollows just above the collarbones.", "Very lightly stretch the skin", "down and in toward the centre, then release. Ten slow, gentle pumps."],
      tip: "The pressure of a coin resting on the skin. Lymph vessels lie just under the surface; pressing hard flattens them.",
      start: STAND, keys: [[.9, { lh: [10, 2, 5], rh: [-10, 2, 5] }, '', 1], [1.1, { lh: [7, -2, 6], rh: [-7, -2, 6] }, '', 2]] },
    { id: 'neck-sides', cat: 'lymph', name: 'Sides of the neck', secs: 35,
      about: "The neck holds hundreds of lymph nodes. Slow, light strokes toward the collarbones help the head and face drain.",
      steps: ["Place the flat hands on the sides of the neck, just below the ears.", "With the lightest touch, stretch the skin", "down toward the collarbones, then release. Ten slow strokes."],
      tip: "Slow is the secret: about one second down, one second to release.",
      start: STAND, keys: [[.9, { lh: [9, 16, 1], rh: [-9, 16, 1] }, '', 1], [1.6, { lh: [10, 2, 4], rh: [-10, 2, 4] }, '', 2]] },
    { id: 'ears', cat: 'lymph', name: 'Around the ears', secs: 30,
      about: "Small circles around the ears move lymph from the face and scalp toward the neck.",
      steps: ["Make a V with the index and middle fingers and slip it around each ear.", "Make small, slow circles, back and down, the skin moving over the bone.", "Ten circles, then one long stroke down the side of the neck."],
      tip: "Lovely for a puffy morning face.",
      start: STAND, keys: [[.6, { lh: [13, 21, 1], rh: [-13, 21, 1] }, '', 1], [.6, { lh: [13, 18, -2], rh: [-13, 18, -2] }, '', 1], [.6, { lh: [12, 14, 1], rh: [-12, 14, 1] }, '', 2], [.6, { lh: [12, 17, 3], rh: [-12, 17, 3] }, '', 1]] },
    { id: 'face', cat: 'lymph', name: 'Face sweeps', secs: 30,
      about: "Feather-light sweeps from the centre of the face outward and down, toward the nodes in front of the ears and under the jaw.",
      steps: ["Fingertips in the middle of the forehead.", "Sweep out to the temples, then down in front of the ears along the jaw,", "and down the neck to the collarbones. Five times."],
      tip: "No oil needed; the skin should move, not the fingers slide.",
      start: STAND, keys: [[1, { lh: [3, 26, 9], rh: [-3, 26, 9] }, '', 0], [1, { lh: [12, 24, 5], rh: [-12, 24, 5] }, '', 1], [1, { lh: [10, 13, 6], rh: [-10, 13, 6] }, '', 1], [1.2, { lh: [10, 4, 4], rh: [-10, 4, 4] }, '', 2]] },
    { id: 'armpits', cat: 'lymph', name: 'Armpit pumps', secs: 50, both: true,
      about: "The armpits hold the nodes that drain the arms, the chest and the upper back. Soft pumping encourages them to empty.",
      steps: ["Lift the left arm a little. Cup the right hand into the left armpit.", "Gently pump upward and in, deep into the hollow, with a soft hand. Ten times.", "Switch sides."],
      tip: "Relax the arm being treated; let it hang heavy.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [30, -36, 10], rh: [13, -10, 5] },
      keys: [[1.2, { lh: [30, -36, 10], rh: [13, -10, 5] }, '', 0], [.7, { rh: [12, -5, 2] }, '', 1], [.7, { rh: [13, -10, 5] }, '', 1], [.7, { rh: [12, -5, 2] }, '', 1], [.7, { rh: [13, -10, 5] }, '', 1], [.7, { rh: [12, -5, 2] }, '', 2]] },
    { id: 'arm-sweeps', cat: 'lymph', name: 'Arm sweeps', secs: 55, both: true,
      about: "Long strokes from the wrist to the armpit, always toward the nodes you have just cleared.",
      steps: ["Hold the left arm out in front, relaxed. Rest the right palm on the left wrist.", "Stroke slowly up the arm, over the elbow, to the armpit, the skin barely moving.", "Lift off, go back to the wrist and repeat on the inside of the arm. Then switch arms."],
      tip: "Always work toward the body, never away from it.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [26, -32, 42], rh: [24, -24, 38] },
      keys: [[1.2, { lh: [26, -32, 42], rh: [24, -24, 38] }, '', 0], [.9, { rh: [22, -13, 23] }, '', 1], [.9, { rh: [18, -2, 8] }, '', 1], [.6, { rh: [22, -4, 26] }, '', 2], [.6, { rh: [24, -20, 38] }, '', 2], [.9, { rh: [22, -12, 23] }, '', 1], [.9, { rh: [18, -2, 8] }, '', 1]] },
    { id: 'belly', cat: 'lymph', name: 'Belly circles', secs: 45,
      about: "Broad, slow circles over the belly follow the direction of the bowel and stir the deep lymph vessels of the abdomen.",
      steps: ["Hands flat on the belly, one over the other.", "Slow circles: up the right side, across under the ribs, down the left side,", "and across above the pubic bone. Ten circles, gentle and broad."],
      tip: "Breathe into the hands as they circle. Skip this one if you are pregnant or have just eaten.",
      start: STAND, keys: [[1.1, { lh: [-6, -48, 15], rh: [-9, -49, 16] }, '', 1], [1.1, { lh: [-6, -34, 14], rh: [-9, -35, 15] }, '', 1], [1.1, { lh: [9, -34, 14], rh: [6, -35, 15] }, '', 1], [1.1, { lh: [9, -48, 15], rh: [6, -49, 16] }, '', 2]] },
    { id: 'groin', cat: 'lymph', name: 'Hip creases', secs: 35,
      about: "The nodes in the creases where the legs meet the body drain the legs. Clear them before working on the thighs.",
      steps: ["Rest the flat hands in the creases where the legs meet the body.", "Gently stretch the skin up toward the waist,", "and release. Ten slow pumps."],
      tip: "Stand tall or lie on your back: both work.",
      start: STAND, keys: [[1, { lh: [11, -52, 12], rh: [-11, -52, 12], lean: 5 }, '', 1], [1.2, { lh: [14, -46, 10], rh: [-14, -46, 10], lean: 3 }, '', 2]] },
    { id: 'thighs', cat: 'lymph', name: 'Thigh sweeps', secs: 45,
      about: "Upward strokes on the thighs carry lymph toward the hip creases. Finish with soft pumps behind the knees.",
      steps: ["Bend the knees and place the hands above the knees.", "Sweep up the front and sides of the thighs to the hip creases.", "Lift off and repeat. Then pump softly behind each knee with the fingertips, ten times."],
      tip: "On days when the legs feel heavy, do this lying down with the legs up the wall.",
      start: STAND, keys: [[1.3, { lean: 28, sink: 12, lh: [12, -56, 17], rh: [-12, -56, 17] }, '', 0], [1.4, { lean: 12, sink: 6, lh: [13, -50, 12], rh: [-13, -50, 12] }, '', 1], [.9, { lean: 4, sink: 4, lh: [12, -46, 12], rh: [-12, -46, 12] }, '', 2]] },

    /* ------------------------------------------------------------- the 24-step form */
    { id: 'commence', cat: 'form', name: 'Commencing form', zh: '起势', py: 'Qǐ shì', secs: 60, form: [1],
      about: "The opening: the arms float up as if lifted by water, then sink. Simple to learn, a lifetime to master.",
      steps: ["Stand with the feet together, then shift onto the right foot and step the left foot out to shoulder width.", "Breathe in: let the arms float up in front to shoulder height, wrists leading, palms down.", "Breathe out: sink the hips, bend the knees and press the palms down to the belly.", "Rest, rooted, ready.", "Return to the start."],
      tip: "The arms don't lift themselves; they float up because the breath fills you.",
      start: { lf: F(5, 0, 0, 2), rf: F(-5, 0, 0, -2), sink: 0, lh: [20, -53, 5], rh: [-20, -53, 5] },
      keys: [[3, { lf: F(5, 0, 0, 2), sink: 0, px: 0, lh: [20, -53, 5], rh: [-20, -53, 5] }, 'out', 4], [1.5, { sink: 3, px: -4 }, '', 0], [1.5, { lf: F(15, 0, 0, 3) }, '', 0], [1.2, { px: 0 }, '', 0],
        [3.5, { lh: [15, -2, 44], rh: [-15, -2, 44], sink: 2 }, 'in', 1], [3.5, { lh: [15, -42, 24], rh: [-15, -42, 24], sink: 10 }, 'out', 2], [1.5, {}, '', 3]] },
    { id: 'horse-mane', cat: 'form', name: "Part the wild horse's mane", zh: '野马分鬃', py: 'Yě mǎ fēn zōng', secs: 75, both: true, form: [2],
      about: "The hands part like the mane of a galloping horse. Teaches the bow stance and the spiral of the waist.",
      steps: ["Shift onto the right leg and turn a little right; hold an imaginary ball, right hand on top.", "Step the left foot forward, heel first.", "Breathe out: shift into a bow stance and part the hands, the left hand rising to eye height, the right hand settling by the right hip.", "Sit back, toes lifting, ready to continue.", "Return, and repeat on the other side."],
      tip: "Step like a cat: place the heel without weight, then pour the weight in.",
      start: READY, keys: [[2.5, READY, 'out', 4], [2.5, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-6, -42, 20], lf: F(-2, 4, 3) }, 'in', 0], [2, { lf: F(14, 34, 0, 0, 1), hy: -5 }, '', 1],
        [3, { px: 7, pz: 20, sink: 10, hy: 15, lh: [10, 10, 40], rh: [-24, -48, 10], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, hy: 5, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'crane', cat: 'form', name: 'White crane spreads its wings', zh: '白鹤亮翅', py: 'Bái hè liàng chì', secs: 50, form: [3],
      about: "A crane opening its wings in the morning mist: light on the front foot, one hand high, one hand low.",
      steps: ["Turn slightly left and hold a ball in front of the left chest, left hand on top.", "Sit back onto the right leg; the left foot slides in front, only the ball of the foot touching.", "Separate the hands: the right hand rises beside the right temple, palm in; the left hand presses down beside the left hip.", "Return to the start."],
      tip: "All the weight on the back leg; the front foot could lift at any moment.",
      start: READY, keys: [[2.5, READY, 'out', 3], [2.2, { hy: 20, px: 4, lh: [10, -12, 22], rh: [6, -42, 20] }, 'in', 0], [1.8, { px: -10, pz: -3, sink: 12, hy: -10, rf: F(-15, 0, 0, -20), lf: F(9, 17, 3, 0) }, '', 1],
        [3, { hy: 0, rh: [-20, 24, 18], lh: [24, -48, 12] }, 'in', 2], [1.5, {}, 'out', 2]] },
    { id: 'brush-knee', cat: 'form', name: 'Brush knee and push', zh: '搂膝拗步', py: 'Lǒu xī ǎo bù', secs: 75, both: true, form: [4],
      about: "One hand sweeps past the knee, the other pushes from the ear. The opposite hand and foot work together: a key coordination of tai chi.",
      steps: ["Turn right; the right hand circles down and back up beside the right ear, the left hand comes across to the right chest.", "Step the left foot forward, heel first.", "Breathe out: the left hand brushes past the left knee as the right palm pushes forward from the ear, into a bow stance.", "Sit back, toes lifting.", "Return, and repeat on the other side."],
      tip: "The push comes from the back foot, through the waist, out of the palm.",
      start: READY, keys: [[2.5, READY, 'out', 4], [2.5, { px: -9, hy: -30, wy: -8, rh: [-24, 12, 4], lh: [-8, -14, 18], lf: F(-3, 4, 3) }, 'in', 0], [1.8, { lf: F(14, 34, 0, 0, 1), hy: -12 }, '', 1],
        [3, { px: 7, pz: 20, sink: 10, hy: 0, wy: 0, lh: [26, -46, 14], rh: [-4, -4, 46], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'lute', cat: 'form', name: 'Play the lute', zh: '手挥琵琶', py: 'Shǒu huī pí pá', secs: 45, form: [5],
      about: "The hands hold an imaginary pipa, the Chinese lute, in front of the body. An 'empty stance' that trains balance.",
      steps: ["Reach the right hand forward.", "Sit back on the right leg; the left heel touches down in front, toes up. Raise the left hand to nose height, the right hand by the left elbow, as if holding a lute.", "Return to the start."],
      tip: "Close the elbows a little, as if hugging the lute to you.",
      start: READY, keys: [[2.5, READY, 'in', 2], [2, { rh: [-4, -6, 44], lh: [20, -40, 14] }, 'in', 0], [2.8, { px: -10, pz: -3, sink: 12, rf: F(-15, 0, 0, -20), lf: F(10, 22, 0, 0, 1), lh: [4, 6, 38], rh: [0, -18, 24] }, 'out', 1], [1.5, {}, '', 1]] },
    { id: 'monkey', cat: 'form', name: 'Repulse the monkey', zh: '倒卷肱', py: 'Dào juǎn gōng', secs: 70, both: true, form: [6],
      about: "Stepping backward while pushing forward: you retreat without losing your centre. The steps go straight back, like walking on two rails.",
      steps: ["Left foot in front, light on the ball of the foot; left hand forward, palm up.", "Turn right as the right hand circles down and back, then up beside the ear.", "Step the left foot back, landing on the toes.", "Breathe out: sink onto the left leg, push the right palm forward past the ear while the left hand draws back to the waist.", "In the form you keep stepping back, alternating sides. Here we return to the start."],
      tip: "Look at the back hand as it circles, then let the eyes follow the push.",
      start: READY, keys: [[2, READY, '', 4], [2.2, { px: -8, pz: -1, sink: 10, lf: F(10, 20, 3, 0, 0), lh: [8, -6, 40], rh: [-16, -44, 16] }, 'out', 0], [1.8, { hy: -28, rh: [-30, -10, -14] }, 'in', 1],
        [1.6, { hy: -15, rh: [-16, 10, 6] }, 'in', 1], [1.6, { lf: F(14, -24, 0, 10, 0) }, '', 2], [2.6, { px: 8, pz: -18, sink: 11, hy: 0, rh: [-6, -4, 44], lh: [20, -36, 4], rf: F(-12, 0, 3, 0, 0) }, 'out', 3],
        [1.8, { px: -6, pz: -4, sink: 9, rf: F(-15, 0, 0, -3, 0) }, '', 4]] },
    { id: 'bird-tail', cat: 'form', name: "Grasp the bird's tail", zh: '揽雀尾', py: 'Lǎn què wěi', secs: 110, both: true, form: [7, 8],
      about: "The heart of Yang-style tai chi: four energies in one flowing move. Ward off (peng), roll back (lu), press (ji) and push (an).",
      steps: ["Hold the ball on the right, then step the left foot forward, heel first.", "Ward off: shift forward, the left forearm rounds up in front of the chest like a shield; the right hand sinks by the hip.", "Roll back: reach both hands forward, then sit back and turn right, drawing the hands down and back in an arc.", "Press: turn back, the right palm joins the left wrist, and press forward as the weight shifts.", "Push: separate the hands, sit back drawing them to the belly, then push forward and up with the whole body.", "Sit back and return; then the right side."],
      tip: "Each part is a breath. Ward off and push go out; roll back and gathering come in.",
      start: READY, keys: [[2.5, READY, 'out', 5], [2.2, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-5, -42, 20], lf: F(-2, 4, 3) }, 'in', 0], [1.6, { lf: F(14, 34, 0, 0, 1), hy: -8 }, '', 0],
        [2.6, { px: 6, pz: 18, sink: 10, hy: 0, lh: [0, -12, 32], rh: [-22, -46, 12], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 1], [1.8, { hy: 12, lh: [6, -4, 42], rh: [2, -16, 34] }, 'in', 2],
        [2.6, { px: -6, pz: 4, sink: 12, hy: -35, lh: [-4, -30, 26], rh: [-26, -30, 4] }, 'in', 2], [1.8, { hy: 0, lh: [2, -14, 28], rh: [-2, -16, 24] }, '', 3],
        [2, { px: 6, pz: 18, sink: 10, lh: [2, -12, 42], rh: [-2, -13, 40] }, 'out', 3], [2.4, { px: -6, pz: 4, sink: 12, lh: [14, -34, 22], rh: [-14, -34, 22], lf: F(14, 34, 0, 0, 1) }, 'in', 4],
        [2.6, { px: 6, pz: 18, sink: 10, lh: [14, -6, 44], rh: [-14, -6, 44], lf: F(14, 34) }, 'out', 4], [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 5]] },
    { id: 'single-whip', cat: 'form', name: 'Single whip', zh: '单鞭', py: 'Dān biān', secs: 60, form: [9, 11],
      about: "The body is the handle of a whip, the hook its tip. One of the most recognisable postures of tai chi, it comes twice in the form.",
      steps: ["Turn right; the right hand forms a hook (fingertips pinched, pointing down) out to the right; the left hand comes under it.", "Draw the left foot in, then turn left and step out to the left-forward corner, heel first.", "Breathe out: bow stance; the left palm turns out and pushes forward while the hook stays behind.", "Return to the start."],
      tip: "Keep the left elbow over the left knee, the nose over the left palm.",
      start: READY, keys: [[2.5, READY, 'out', 3], [2.5, { px: -9, hy: -40, rh: [-34, -6, 30], lh: [-6, -28, 22] }, 'in', 0], [1.2, { lf: F(2, 4, 3) }, '', 1], [1.8, { hy: 20, lf: F(30, 28, 0, 40, 1) }, '', 1],
        [3, { px: 13, pz: 13, sink: 11, hy: 45, lh: [6, -4, 44], rh: [-64, -2, 10], rf: F(-15, 0, 0, -10), lf: F(30, 28, 0, 40, 0) }, 'out', 2], [2, { px: 0, pz: 3, sink: 11, lf: F(30, 28, 0, 40, 1) }, 'in', 3]] },
    { id: 'clouds', cat: 'form', name: 'Wave hands like clouds', zh: '云手', py: 'Yún shǒu', secs: 70, form: [10],
      about: "The hands drift past the face like clouds past a mountain while you step sideways. Many teachers' favourite: pure waist, pure flow.",
      steps: ["Turn left from the waist: the left hand floats up in front of the face, palm in, the right hand sweeps low across the belly.", "Turn right: the hands change places, like clouds drifting past.", "With the weight on the left, bring the right foot in beside it.", "Step the left foot out to the side, toes first.", "Drift back the other way."],
      tip: "The hands never move by themselves: the waist turns, the hands are carried.",
      start: x(READY, { sink: 10, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }),
      keys: [[2.4, { px: 0, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22], lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), sink: 10 }, 'in', 1], [2.4, { px: 9, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 0],
        [1.6, { rf: F(5, 0, 0, -3) }, 'out', 2], [2.4, { px: 6, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 1], [1.6, { lf: F(31, 0, 0, 3) }, 'out', 3],
        [2.4, { px: 24, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 0], [1.6, { rf: F(21, 0, 0, -3) }, 'out', 2], [2.4, { px: 22, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 1],
        [2.4, { px: 29, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 4], [1.6, { rf: F(5, 0, 0, -3) }, 'out', 4], [2.4, { px: 7, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 4],
        [1.6, { lf: F(15, 0, 0, 3) }, 'out', 4], [2.4, { px: 13, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 4], [1.6, { rf: F(-15, 0, 0, -3) }, 'out', 4]] },
    { id: 'high-pat', cat: 'form', name: 'High pat on horse', zh: '高探马', py: 'Gāo tàn mǎ', secs: 45, form: [12],
      about: "Patting a tall horse: a higher stance, the front hand reaching forward at face height.",
      steps: ["Turn both palms up and open the arms a little.", "Draw the left foot in onto its toes; the right hand passes by the ear and pats forward at face height, palm down, while the left hand withdraws, palm up, to the waist.", "Return to the start."],
      tip: "Stand a little taller here, but keep the back knee soft.",
      start: READY, keys: [[2.5, READY, 'out', 2], [2, { lh: [38, -8, 18], rh: [-38, -8, 18], px: -3 }, 'in', 0], [2.8, { px: -9, pz: -2, sink: 6, lf: F(10, 18, 3, 0, 0), rh: [-2, 8, 42], lh: [16, -34, 12], rf: F(-15, 0, 0, -25) }, 'out', 1], [1.5, {}, '', 1]] },
    { id: 'heel-kick', cat: 'form', name: 'Kick with the heel', zh: '蹬脚', py: 'Dēng jiǎo', secs: 60, both: true, form: [13, 15],
      about: "A slow kick with the heel while the arms open like wings. Balance comes from the root of the standing leg, not from holding your breath.",
      steps: ["Shift onto the left leg; the wrists cross in front of the chest, right hand outside.", "Lift the right knee.", "Breathe out: open the arms like wings and kick slowly forward with the heel, toes pulled back.", "Draw the knee back in.", "Lower the foot and settle. Then the left heel."],
      tip: "Kick only as high as stays comfortable. Waist height is perfect; knee height is fine.",
      start: READY, keys: [[2.6, READY, 'out', 4], [2.4, { px: 9, lh: [3, -12, 26], rh: [-1, -10, 28], rf: F(-5, 4, 3) }, 'in', 0], [1.8, { sink: 6, rf: F(-10, 22, 40, 0) }, 'in', 1],
        [1.6, { sink: 6, rf: F(-10, 82, 64, 0), rh: [-12, 2, 48], lh: [56, 4, -4], lean: -4 }, 'out', 2], [1.6, { rf: F(-10, 22, 40, 0), lh: [3, -12, 26], rh: [-1, -10, 28], lean: 0 }, 'in', 3]] },
    { id: 'ears-fists', cat: 'form', name: 'Strike the ears with both fists', zh: '双峰贯耳', py: 'Shuāng fēng guàn ěr', secs: 50, form: [14],
      about: "The two fists circle up like two mountain peaks meeting. Strong in shape, soft in effort.",
      steps: ["Lift the right knee; both palms turn up and lower either side of the knee.", "Step the right foot forward, heel first, the hands sinking beside the hips and closing into loose fists.", "Breathe out: shift forward and circle the fists up and in to ear height.", "Return to the start."],
      tip: "Loose fists, elbows down, shoulders relaxed: the strike is in the shape, not the force.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: 9, sink: 6, rf: F(-10, 20, 36, 0), lh: [8, -30, 30], rh: [-8, -30, 30] }, 'in', 0], [1.8, { rf: F(-14, 34, 0, 0, 1), lh: [20, -44, 10], rh: [-20, -44, 10], sink: 10 }, '', 1],
        [2.6, { px: -5, pz: 18, sink: 10, lh: [10, 14, 40], rh: [-10, 14, 40], rf: F(-14, 34), lf: F(15, 0, 0, 45) }, 'out', 2], [2, { px: 2, pz: 6, rf: F(-14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'snake-rooster', cat: 'form', name: 'Snake creeps down, golden rooster', zh: '下势独立', py: 'Xià shì dú lì', secs: 90, both: true, form: [16, 17],
      about: "Sink low like a snake gliding through grass, then rise and stand on one leg like a rooster at dawn. The deepest and the tallest moments of the form.",
      steps: ["Turn right; the right hand forms a hook out to the right, the left hand comes to the right shoulder. Step the left foot out wide.", "Snake creeps down: sink onto the right leg (only as low as is comfortable!), the left hand sliding down along the inside of the left leg.", "Rise forward onto the left leg, the left hand leading up; the hook drops behind.", "Golden rooster: lift the right knee, the right hand rising above it, fingers up; the left hand presses down by the hip. Stand on one leg.", "Step down and return. Then the other side."],
      tip: "Beginners: a shallow crouch is still the snake. Hold a chair back for the rooster if you like.",
      start: READY, keys: [[2.6, READY, 'out', 4], [2.4, { px: -10, hy: -30, rh: [-46, -4, 22], lh: [-8, -6, 14] }, 'in', 0], [1.6, { lf: F(40, 6, 0, 10) }, '', 0],
        [3, { px: -16, sink: 32, lean: 14, hy: 25, lh: [16, -56, 30], rf: F(-15, 0, 0, -40) }, 'out', 1], [2.6, { px: 34, pz: 6, sink: 10, lean: 0, hy: 30, lh: [8, 0, 40], rh: [-44, -16, -12], lf: F(40, 6, 0, 30) }, 'in', 2],
        [2.6, { px: 39, pz: 6, sink: 3, hy: 10, rf: F(32, 22, 42, 10), rh: [-4, 12, 26], lh: [22, -46, 8] }, 'in', 3], [2, {}, 'out', 3], [1.8, { rf: F(26, -6, 0, -10), sink: 6 }, '', 4]] },
    { id: 'shuttles', cat: 'form', name: 'Fair lady works the shuttles', zh: '玉女穿梭', py: 'Yù nǚ chuān suō', secs: 70, both: true, form: [18],
      about: "A weaver throwing the shuttle through the loom, to one corner and then the other. One arm shields above, the other pushes.",
      steps: ["Hold a ball on the right, right hand on top.", "Step the left foot out to the left-forward corner, heel first.", "Breathe out: bow stance; the left forearm rises and turns above the forehead, palm out, as the right palm pushes forward.", "Return, and work the shuttle on the other side."],
      tip: "The upper arm protects the head; keep its shoulder down.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-5, -42, 20], lf: F(0, 6, 3) }, 'in', 0], [1.6, { lf: F(22, 34, 0, 30, 1), hy: 5 }, '', 1],
        [2.6, { px: 12, pz: 19, sink: 10, hy: 30, lh: [6, 26, 24], rh: [-4, -6, 44], rf: F(-15, 0, 0, -15), lf: F(22, 34, 0, 30) }, 'out', 2], [2, { px: 0, pz: 6, sink: 11, lf: F(22, 34, 0, 30, 1) }, 'in', 3]] },
    { id: 'needle', cat: 'form', name: 'Needle at the sea bottom', zh: '海底针', py: 'Hǎi dǐ zhēn', secs: 45, form: [19],
      about: "The fingertips dive like a needle to the sea floor. A forward fold with a long, straight back.",
      steps: ["Sit back on the right leg, left foot light in front. The right hand rises beside the ear.", "Breathe out: bend forward from the hips and send the right fingertips down and forward.", "Keep the back long, the head in line with the spine.", "Rise and return."],
      tip: "Fold from the hips, not the waist; the back stays like a bamboo pole.",
      start: READY, keys: [[2.6, READY, 'in', 3], [2.4, { px: -9, pz: -3, sink: 10, lf: F(10, 18, 3), rh: [-16, 10, 10], lh: [8, -20, 24], rf: F(-15, 0, 0, -20) }, 'in', 0],
        [2.6, { sink: 16, lean: 32, rh: [-2, -58, 32], lh: [20, -46, 10] }, 'out', 1], [1.6, {}, '', 2]] },
    { id: 'fan-back', cat: 'form', name: 'Fan through the back', zh: '闪通臂', py: 'Shǎn tōng bì', secs: 50, form: [20],
      about: "The arms open like a folding fan, the power spreading through the back.",
      steps: ["Raise both hands in front of the chest, the left palm near the right wrist; draw the left foot up.", "Step forward with the left foot, heel first.", "Breathe out: bow stance; the right hand opens up above the right temple, palm out, as the left palm pushes forward.", "Return to the start."],
      tip: "Feel the shoulder blades spread apart as the hands open.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: -8, sink: 9, lf: F(8, 10, 4), rh: [-2, 0, 36], lh: [4, -4, 30] }, 'in', 0], [1.6, { lf: F(14, 34, 0, 0, 1) }, '', 1],
        [2.6, { px: 6, pz: 18, sink: 10, hy: -15, rh: [-18, 26, 14], lh: [8, -2, 44], lf: F(14, 34), rf: F(-15, 0, 0, -50) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, hy: 0, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'parry-punch', cat: 'form', name: 'Deflect, parry and punch', zh: '转身搬拦捶', py: 'Zhuǎn shēn bān lán chuí', secs: 70, form: [21],
      about: "Three actions in one: the fist deflects, the palm parries, the fist punches. Even the punch is soft, a loose fist driven by the legs.",
      steps: ["Shift onto the left leg; the right fist circles down to the left ribs, the left palm rises.", "Step the right foot forward, toes turned out, and turn the fist over in a back-fist (deflect).", "Shift onto the right leg; the left hand parries forward as the right fist draws back to the waist. Step the left foot forward.", "Breathe out: bow stance and punch with the right fist at chest height, fist vertical, the left hand guarding at the forearm.", "Return to the start."],
      tip: "The fist stays loose until the very end of the punch.",
      start: READY, keys: [[2.8, READY, 'out', 4], [2, { px: 9, hy: -20, rh: [4, -34, 16], lh: [22, 8, 20] }, 'in', 0], [2, { rf: F(-12, 30, 0, -40, 1), rh: [-6, -8, 40], lh: [22, -44, 10], hy: -10 }, 'out', 1],
        [2, { px: -10, pz: 24, sink: 10, hy: -30, rh: [-22, -36, 2], lh: [8, -4, 40], rf: F(-12, 30, 0, -40) }, 'in', 2], [1.6, { lf: F(12, 60, 0, 0, 1) }, '', 2],
        [2.2, { px: 6, pz: 46, sink: 10, hy: 0, rh: [-4, -12, 48], lh: [2, -12, 28], lf: F(12, 60) }, 'out', 3], [1.6, { px: 2, pz: 34, sink: 11, lf: F(12, 60, 0, 0, 1) }, 'in', 4]] },
    { id: 'close-up', cat: 'form', name: 'Apparent close-up', zh: '如封似闭', py: 'Rú fēng sì bì', secs: 55, form: [22],
      about: "As if sealing a door: withdraw, then push. Yielding and returning in one breath.",
      steps: ["From a bow stance with the right fist forward, slip the left hand under the right forearm.", "Open the hands, palms up then in, and sit back, drawing them toward the chest.", "Breathe out: shift forward and push with both palms.", "Return to the start."],
      tip: "Sit back without leaning back: the spine stays upright.",
      start: READY, keys: [[2.6, READY, 'out', 3], [1.8, { lf: F(14, 34, 0, 0, 1), px: -6 }, '', 0], [2.2, { px: 6, pz: 18, sink: 10, lf: F(14, 34), rf: F(-15, 0, 0, -45), rh: [-4, -12, 46], lh: [4, -16, 28] }, 'out', 0],
        [2.6, { px: -6, pz: 4, sink: 12, lh: [13, -18, 24], rh: [-13, -18, 24], lf: F(14, 34, 0, 0, 1) }, 'in', 1], [2.6, { px: 6, pz: 18, sink: 10, lh: [14, -6, 44], rh: [-14, -6, 44], lf: F(14, 34) }, 'out', 2],
        [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'cross-hands', cat: 'form', name: 'Cross hands', zh: '十字手', py: 'Shí zì shǒu', secs: 50, form: [23],
      about: "The arms open in a great circle and close crossed at the chest, gathering everything back to the centre.",
      steps: ["Turn right; open both arms up and out in a big circle.", "Breathe out: sink, and circle the hands down to cross in front of the belly.", "Breathe in: rise a little, lifting the crossed wrists to the chest, right hand outside. Arms round, like holding a ring.", "Return to the start."],
      tip: "Round arms: the crossed wrists sit about a forearm's length from the chest.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.6, { px: -8, hy: -35, rh: [-46, 12, 18], lh: [42, 12, 16] }, 'in', 0], [2.6, { px: 0, hy: 0, sink: 14, lh: [4, -44, 24], rh: [-4, -44, 24] }, 'out', 1],
        [2.6, { sink: 7, lh: [2, -12, 24], rh: [-1, -10, 26] }, 'in', 2], [2, {}, 'out', 2]] },
    { id: 'closing', cat: 'form', name: 'Closing form', zh: '收势', py: 'Shōu shì', secs: 50, form: [24],
      about: "The hands sink, the feet come together, and you stand where you began, a little different.",
      steps: ["Turn the palms down and separate the hands to shoulder width.", "Breathe out slowly as the hands float down to the sides.", "Bring the left foot back beside the right.", "Stand quietly. Notice how you feel.", "Return to the start of the movement."],
      tip: "Stay still for three breaths after the last movement. That stillness is part of the form.",
      start: x(READY, { lh: [2, -12, 24], rh: [-1, -10, 26], sink: 7 }),
      keys: [[2.6, { lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), px: 0, sink: 7, lh: [2, -12, 24], rh: [-1, -10, 26] }, 'in', 4], [2.2, { lh: [15, -12, 32], rh: [-15, -12, 32] }, 'in', 0],
        [4, { lh: [20, -50, 8], rh: [-20, -50, 8], sink: 2 }, 'out', 1], [1.4, { px: -5 }, '', 2], [1.6, { lf: F(5, 0, 0, 2), px: 0, sink: 0 }, '', 2], [3, { lh: [20, -53, 5], rh: [-20, -53, 5] }, '', 3]] },

    /* ------------------------------------------------------------- cool-down */
    { id: 'warm-hands', cat: 'cool', name: 'Warm palms, rested eyes', zh: '熨目', py: 'Yùn mù', secs: 25,
      about: "Rub the palms until they glow, then rest them over the eyes. A classic qigong close that brings you gently back.",
      steps: ["Rub the palms together briskly until they're warm.", "Cup them over the closed eyes and rest in the warm dark.", "Slowly open the hands and the eyes to the morning."],
      tip: "Smile a little as you open your eyes. It counts.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 4, lh: [2, -14, 20], rh: [-2, -14, 20] },
      keys: [[1.5, { lh: [2, -14, 20], rh: [-2, -14, 20] }, '', 0], [.3, { lh: [2, -10, 22], rh: [-2, -17, 20] }, '', 0], [.3, { lh: [2, -17, 20], rh: [-2, -10, 22] }, '', 0], [.3, { lh: [2, -10, 22], rh: [-2, -17, 20] }, '', 0],
        [.3, { lh: [2, -17, 20], rh: [-2, -10, 22] }, '', 0], [1.2, { lh: [3, 20, 13], rh: [-3, 20, 13] }, 'in', 1], [3, { lh: [3, 20, 13], rh: [-3, 20, 13] }, 'out', 1], [1.5, { lh: [12, 6, 24], rh: [-12, 6, 24] }, 'in', 2]] }
  ];

  TC.MOVES = M;
  TC.MOVE = {};
  M.forEach(function (m) { TC.MOVE[m.id] = m; });
  var cache = {};
  /* The animation keys of a move (both sides when the move is done left and right). */
  TC.moveKeys = function (id) {
    if (cache[id]) return cache[id];
    var m = TC.MOVE[id]; if (!m) return null;
    var k = TC.build(m.keys, m.start);
    if (m.both) k = k.concat(TC.mirrorKeys(k).map(function (q) { q.mir = true; return q; }));
    return (cache[id] = k);
  };
  TC.moveLength = function (id) { return TC.loopLength(TC.moveKeys(id)); };
  TC.startPose = function (id) { var m = TC.MOVE[id]; return TC.merge(TC.BASE, m && m.start || READY); };

  /* ---------------------------------------------------------------- the 24-step form, in order */
  TC.FORM24 = [
    [1, 'Commencing form', '起势', 'commence', 0], [2, "Part the wild horse's mane, left and right", '左右野马分鬃', 'horse-mane', 0],
    [3, 'White crane spreads its wings', '白鹤亮翅', 'crane', 0], [4, 'Brush knee and push, left and right', '左右搂膝拗步', 'brush-knee', 0],
    [5, 'Play the lute', '手挥琵琶', 'lute', 0], [6, 'Repulse the monkey, left and right', '左右倒卷肱', 'monkey', 0],
    [7, "Grasp the bird's tail, left", '左揽雀尾', 'bird-tail', 1], [8, "Grasp the bird's tail, right", '右揽雀尾', 'bird-tail', 2],
    [9, 'Single whip', '单鞭', 'single-whip', 0], [10, 'Wave hands like clouds', '云手', 'clouds', 0], [11, 'Single whip', '单鞭', 'single-whip', 0],
    [12, 'High pat on horse', '高探马', 'high-pat', 0], [13, 'Kick with the right heel', '右蹬脚', 'heel-kick', 1],
    [14, 'Strike the ears with both fists', '双峰贯耳', 'ears-fists', 0], [15, 'Turn and kick with the left heel', '转身左蹬脚', 'heel-kick', 2],
    [16, 'Snake creeps down, golden rooster on the left', '左下势独立', 'snake-rooster', 1], [17, 'Snake creeps down, golden rooster on the right', '右下势独立', 'snake-rooster', 2],
    [18, 'Fair lady works the shuttles, left and right', '左右穿梭', 'shuttles', 0], [19, 'Needle at the sea bottom', '海底针', 'needle', 0],
    [20, 'Fan through the back', '闪通臂', 'fan-back', 0], [21, 'Turn, deflect, parry and punch', '转身搬拦捶', 'parry-punch', 0],
    [22, 'Apparent close-up', '如封似闭', 'close-up', 0], [23, 'Cross hands', '十字手', 'cross-hands', 0], [24, 'Closing form', '收势', 'closing', 0]
  ];

  /* ---------------------------------------------------------------- the path: six stages of the grove */
  TC.STAGES = [
    { key: 'seed', name: 'Seed', zh: '种', line: 'Begin. Learn to stand, to open, to part.', moves: ['commence', 'horse-mane', 'crane'] },
    { key: 'shoot', name: 'Shoot', zh: '笋', line: 'The first steps forward and back.', moves: ['brush-knee', 'lute', 'monkey'] },
    { key: 'stalk', name: 'Stalk', zh: '竿', line: 'The heart of the style: four energies, the whip, the clouds.', moves: ['bird-tail', 'single-whip', 'clouds'] },
    { key: 'node', name: 'Node', zh: '节', line: 'Balance: the high pat and the slow kicks.', moves: ['high-pat', 'heel-kick', 'ears-fists'] },
    { key: 'leaf', name: 'Leaf', zh: '叶', line: 'Low and high, near and far.', moves: ['snake-rooster', 'shuttles', 'needle', 'fan-back'] },
    { key: 'grove', name: 'Grove', zh: '林', line: 'Completing the circle.', moves: ['parry-punch', 'close-up', 'cross-hands', 'closing'] }
  ];
  TC.PATH = [].concat.apply([], TC.STAGES.map(function (s) { return s.moves; }));
  TC.LEARNED_AT = 3;   // sessions with a move before it counts as learned
  TC.status = function (id, progress) {
    var n = (progress || {})[id] || 0;
    return n >= TC.LEARNED_AT ? 'learned' : n > 0 ? 'learning' : 'new';
  };
  TC.nextMove = function (progress) {
    for (var i = 0; i < TC.PATH.length; i++) if (TC.status(TC.PATH[i], progress) !== 'learned') return TC.PATH[i];
    return null;
  };
  TC.learned = function (progress) { return TC.PATH.filter(function (id) { return TC.status(id, progress) === 'learned'; }); };
  TC.stageOf = function (progress) {
    var nx = TC.nextMove(progress);
    if (!nx) return TC.STAGES[TC.STAGES.length - 1];
    return TC.STAGES.filter(function (s) { return s.moves.indexOf(nx) >= 0; })[0];
  };

  /* ---------------------------------------------------------------- sessions */
  TC.KINDS = {
    morning: { title: 'Morning flow', icon: 'sunrise', line: 'Warm-up, lymph massage, your next tai chi move, stillness.', lengths: [7, 15, 25], dflt: 15 },
    lymph: { title: 'Lymph flow', icon: 'drop', line: 'The full self-massage sequence, neck to legs, with deep breathing.', minutes: 9 },
    qigong: { title: 'Morning qigong', icon: 'wind', line: 'Five of the Eight Brocades, framed by standing practice.', minutes: 8 },
    form: { title: 'Form practice', icon: 'bamboo', line: 'Only tai chi: the moves you know, plus the one you are learning.', minutes: 10 },
    full24: { title: 'The whole 24-step form', icon: 'leaf', line: 'All twenty-four movements in order, start to finish.', minutes: 10 },
    move: { title: 'One move', icon: 'eye' },
    custom: { title: 'Your own session', icon: 'sliders' }
  };
  function stepsFor(list) {
    return list.filter(function (s) { return TC.MOVE[s[0]]; }).map(function (s) {
      var id = s[0], L = TC.moveLength(id), secs = s[1], off = s[2] || 0;
      var reps = Math.max(1, Math.round(secs / L));
      if (s[3]) return { id: id, secs: Math.round(s[3]), offset: off, label: s[4] || '' };
      return { id: id, secs: Math.round(reps * L), offset: off, label: s[4] || '' };
    });
  }
  /* compose(kind, arg, progress) -> {kind, title, steps:[{id, secs, offset, label}], secs} */
  TC.compose = function (kind, arg, progress) {
    progress = progress || {};
    var K = TC.KINDS[kind] ? kind : 'morning', list = [], title = TC.KINDS[K].title;
    if (K === 'morning') {
      var m = [7, 15, 25].indexOf(+arg) >= 0 ? +arg : 15;
      title = 'Morning flow · ' + m + ' min';
      var head = [['wuji', 40]];
      var warm = m >= 15 ? [['neck', 35], ['shoulders', 30], ['waist', 45], ['hips', 30], ['tapping', 50]] : [['neck', 30], ['waist', 35]];
      var qi = m >= 25 ? [['heavens', 50], ['archer', 55], ['separate', 45], ['owl', 40], ['bounce', 25]] : m >= 15 ? [['heavens', 45], ['separate', 40]] : [];
      var lymph = m >= 15 ? [['lbreath', 35], ['collarbone', 30], ['neck-sides', 30], ['ears', 25], ['armpits', 45], ['arm-sweeps', 50], ['belly', 40], ['groin', 30], ['thighs', 35]]
        : [['lbreath', 30], ['collarbone', 25], ['neck-sides', 25], ['armpits', 35], ['belly', 30], ['groin', 25]];
      var close = m >= 15 ? [['holdtree', 50], ['warm-hands', 25]] : [['warm-hands', 20]];
      var used = stepsFor(head.concat(warm, qi, lymph, close)).reduce(function (s, x) { return s + x.secs; }, 0);
      var budget = Math.max(60, m * 60 - used), form = [];
      var nx = TC.nextMove(progress) || 'commence';
      var known = TC.learned(progress).filter(function (id) { return id !== nx; });
      var newSecs = Math.min(budget * .55, Math.max(60, TC.moveLength(nx) * 2));
      budget -= newSecs;
      known.slice(-6).forEach(function (id) { if (budget >= 40) { form.push([id, 40]); budget -= Math.max(40, TC.moveLength(id)); } });
      form.push([nx, newSecs, 0, null, 'new']);
      list = head.concat(warm, qi, lymph, form, close);
    } else if (K === 'lymph') {
      list = [['lbreath', 45], ['collarbone', 40], ['neck-sides', 40], ['ears', 30], ['face', 30], ['armpits', 60], ['arm-sweeps', 60], ['belly', 50], ['groin', 40], ['thighs', 50], ['lbreath', 40]];
    } else if (K === 'qigong') {
      list = [['wuji', 40], ['heavens', 70], ['archer', 70], ['separate', 60], ['owl', 50], ['bounce', 30], ['holdtree', 60], ['warm-hands', 25]];
    } else if (K === 'form') {
      var nx2 = TC.nextMove(progress) || 'closing', kn = TC.learned(progress);
      var ids = kn.length ? kn : TC.PATH.slice(0, 2);
      list = [['wuji', 30], ['commence', 30]];
      ids.forEach(function (id) { if (id !== 'commence' && id !== 'closing') list.push([id, 50]); });
      if (ids.indexOf(nx2) < 0) list.push([nx2, 90, 0, null, 'new']);
      list.push(['closing', 30]);
    } else if (K === 'full24') {
      list = [['wuji', 30]].concat(TC.FORM24.map(function (f) {
        var L = TC.moveLength(f[3]);
        if (f[4] === 0) return [f[3], L, 0, L, f[0] + '. ' + f[1]];
        return [f[3], L / 2, f[4] === 2 ? L / 2 : 0, L / 2, f[0] + '. ' + f[1]];
      }));
    } else if (K === 'move') {
      var mv = TC.MOVE[arg] ? arg : 'commence';
      title = TC.MOVE[mv].name;
      list = [['wuji', 25], [mv, 180]];
    } else if (K === 'custom') {
      var picks = String(arg || '').split(',').filter(function (id) { return TC.MOVE[id]; }).slice(0, 30);
      if (!picks.length) picks = ['wuji', 'commence', 'closing'];
      list = picks.map(function (id) { return [id, Math.max(45, TC.MOVE[id].secs)]; });
    }
    var steps = stepsFor(list);
    return { kind: K, arg: arg || '', title: title, steps: steps, secs: steps.reduce(function (s, x) { return s + x.secs; }, 0) };
  };

  /* ---------------------------------------------------------------- feelings + morning thoughts */
  TC.FEELS = [[1, 'Heavy'], [2, 'Tired'], [3, 'Okay'], [4, 'Good'], [5, 'Bright']];
  TC.feelName = function (n) { var f = TC.FEELS.filter(function (x) { return x[0] === n; })[0]; return f ? f[1] : ''; };
  TC.THOUGHTS = [
    ["A journey of a thousand miles begins beneath your feet.", "Lao Tzu, Tao Te Ching 64"],
    ["Nothing in the world is softer than water, yet nothing is better at overcoming the hard.", "after Lao Tzu, Tao Te Ching 78"],
    ["Stand like a mountain, move like a river.", "a tai chi saying"],
    ["The bamboo bends in the storm and is still standing in the morning.", "a bamboo proverb"],
    ["Be still, and the muddy water clears by itself.", "after Lao Tzu, Tao Te Ching 15"],
    ["The supple bends; the stiff breaks.", "after Lao Tzu, Tao Te Ching 76"],
    ["Seek stillness in movement.", "动中求静, from the tai chi classics"],
    ["Sink the shoulders, drop the elbows.", "沉肩坠肘, from the tai chi classics"],
    ["When one part moves, every part moves.", "from the tai chi classics"],
    ["Use the mind, not force.", "用意不用力, Yang Chengfu"],
    ["The tallest bamboo spends years growing its roots before it shows a single shoot.", "a gardener's saying"],
    ["A tree as wide as a hug grows from a tiny sprout.", "after Lao Tzu, Tao Te Ching 64"],
    ["Knowing others is wisdom; knowing yourself is light.", "after Lao Tzu, Tao Te Ching 33"],
    ["Water does not compete, and so nothing can compete with it.", "after Lao Tzu, Tao Te Ching 8"],
    ["The best time to plant bamboo was ten years ago. The next best time is this morning.", "a proverb, slightly bent"],
    ["Step like a cat walking on thin ice.", "a tai chi teaching"],
    ["Root in the feet, turn from the waist, express through the fingers.", "after the tai chi classics"],
    ["Empty space is what makes the bowl useful.", "after Lao Tzu, Tao Te Ching 11"],
    ["Slow is smooth, and smooth becomes effortless.", "a practice saying"],
    ["Breathe in the morning; breathe out the night.", "a morning saying"],
    ["Each morning we are born again. What we do today matters most.", "attributed to the Buddha"]
  ];
  TC.thought = function (d) {
    d = d || new Date();
    var n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return TC.THOUGHTS[n % TC.THOUGHTS.length];
  };

  /* ---------------------------------------------------------------- local (guest) storage */
  TC.local = {
    sessions: function () { return UI.store.get('guest.sessions', []) || []; },
    add: function (s) { var a = TC.local.sessions(); a.push(s); UI.store.set('guest.sessions', a.slice(-300)); },
    clear: function () { UI.store.set('guest.sessions', []); },
    progress: function () {
      var p = {};
      TC.local.sessions().forEach(function (s) { (s.moves || []).forEach(function (id) { p[id] = (p[id] || 0) + 1; }); });
      return p;
    },
    prefs: function () { return UI.store.get('prefs', {}) || {}; },
    setPrefs: function (p) { UI.store.set('prefs', p); }
  };
  /* Streaks from a list of 'YYYY-MM-DD' days. */
  TC.streaks = function (days, today) {
    var set = {}; days.forEach(function (d) { set[d] = 1; });
    function prev(d) { var t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() - 1); return TC.today(t); }
    today = today || TC.today();
    var cur = 0, d = set[today] ? today : prev(today);
    while (set[d]) { cur++; d = prev(d); }
    var best = 0, sorted = Object.keys(set).sort(), run = 0, last = null;
    sorted.forEach(function (x) { run = last && prev(x) === last ? run + 1 : 1; best = Math.max(best, run); last = x; });
    return { current: cur, best: best, days: sorted.length };
  };
})();
