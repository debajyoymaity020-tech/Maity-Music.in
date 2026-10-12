// ---- Bhojpuri button ----
    const palaynow = document.getElementById('btn');
    palaynow.addEventListener('click', function (event) {
        event.preventDefault();
        window.location.href = "log-bhojpuri.html";
    });

    // ---- Player elements ----
    const audio   = document.getElementById('main-audio');
    const pImg    = document.getElementById('player-img');
    const pTitle  = document.getElementById('player-title');
    const pArtist = document.getElementById('player-artist');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    const songs = document.querySelectorAll('.ps [class^="ps-all"]');
    let currentIndex = -1;   // -1 = list er kono gan ekhono bajchhe na

    // ---- Ekta gan load kore bajao ----
    function playSong(index) {
        const song = songs[index];
        const src = song.dataset.audio;
        if (!src) return;

        currentIndex = index;
        audio.src = src;
        audio.play().catch(function () {});

        pImg.src = song.querySelector('.image-in').src;
        pTitle.innerHTML = song.querySelector('.des1').innerHTML;
        pArtist.textContent = song.querySelector('.des2').textContent;
    }

    // ---- Protita gan er ▶ button ----
    songs.forEach(function (song, index) {
        const btn = song.querySelector('.play');

        btn.addEventListener('click', function () {
            if (!song.dataset.audio) return;

            if (index === currentIndex) {
                audio.paused ? audio.play() : audio.pause();
            } else {
                playSong(index);
            }
        });
    });

    // ---- Next / Previous (direction: 1 = next, -1 = previous) ----
    function changeSong(direction) {
        const total = songs.length;
        let i = currentIndex;

        for (let step = 0; step < total; step++) {
            i = (i + direction + total) % total;
            if (songs[i].dataset.audio) {
                playSong(i);
                return;
            }
        }
    }

    nextBtn.addEventListener('click', function () { changeSong(1); });
    prevBtn.addEventListener('click', function () { changeSong(-1); });

    // ---- AUTO NEXT: gan shesh hole porer gan ----
    audio.addEventListener('ended', function () { changeSong(1); });

    // ---- ▶ / ⏸ icon ----
    audio.addEventListener('play', updateButtons);
    audio.addEventListener('pause', updateButtons);

    function updateButtons() {
        songs.forEach(function (song, index) {
            const btn = song.querySelector('.play');
            btn.textContent = (index === currentIndex && !audio.paused) ? '⏸' : '▶';
        });
        // Maity Music - 5 dot visualizer
// Tomar player-er .bit er vitore thaka .dot1 ... .dot5: gan na bajle gol dot, gan bajle upore rekhar (line) moto lomba hobe
(() => {
  const audio = document.getElementById("main-audio");
  const dots = Array.from(document.querySelectorAll(".bit .dot"));
  if (!audio || !dots.length) return;

  const N = dots.length;
  const bit = dots[0].parentElement;

  const pos = new Array(N).fill(0);
  const vel = new Array(N).fill(0);
  const smooth = new Array(N).fill(0);

  // file:// theke khulle browser Web Audio-te gan mute kore dey,
  // tai oi obosthay asol analyser na chaliye "fake beat" chalano hoy (gan thik-i bajbe)
  const canAnalyse = location.protocol !== "file:" && (window.AudioContext || window.webkitAudioContext);

  let ctx, analyser, data;

  function setupAnalyser() {
    if (ctx || !canAnalyse) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    data = new Uint8Array(analyser.frequencyBinCount);
    const src = ctx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(ctx.destination);
  }

  audio.addEventListener("play", () => {
    setupAnalyser();
    if (ctx && ctx.state === "suspended") ctx.resume();
  });

  // Dot 1 = bass (dhum dhum), shesh dot = high (hi-hat, vocal). 40Hz -> 9kHz
  const edges = [];
  for (let i = 0; i <= N; i++) edges.push(40 * Math.pow(9000 / 40, i / N));

  function bandLevel(i) {
    const nyq = ctx.sampleRate / 2;
    const a = Math.max(1, Math.floor((edges[i] / nyq) * data.length));
    const b = Math.max(a + 1, Math.ceil((edges[i + 1] / nyq) * data.length));
    let sum = 0;
    for (let k = a; k < b; k++) sum += data[k];
    return sum / (b - a) / 255;
  }

  // fake beat (sudhu file:// mode-er jonno)
  function fakeLevel(i, t) {
    const phase = t * 2.0;                         // ~120 BPM
    const f = phase - Math.floor(phase);
    const kick = Math.exp(-5 * f);
    const hat = Math.exp(-7 * (((phase * 2 + 0.5) % 1)));
    const wob = 0.5 + 0.5 * Math.sin(t * (3 + i * 1.7) + i * 2);
    if (i === 0) return kick;
    if (i === 1) return kick * 0.8 + 0.15 * wob;
    if (i === N - 1) return hat * 0.8 + 0.1 * wob;
    return 0.25 + 0.5 * wob * (0.5 + 0.5 * kick);
  }

  let last = performance.now(), t = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const playing = !audio.paused && !audio.ended;
    const live = playing && ctx && analyser;
    if (live) analyser.getByteFrequencyData(data);

    const base = dots[0].offsetWidth;                    // dot-er size = rekhar min height
    const rise = Math.max(10, bit.clientHeight - base);

    for (let i = 0; i < N; i++) {
      let lv = 0;

      if (live) {
        lv = bandLevel(i);
        lv = Math.max(0, (lv - 0.28) / 0.72);   // halka noise bad
        lv = Math.pow(lv, 1.35);                 // jor-er beat aro boro
        if (i < 2) lv = Math.min(1, lv * 1.25);  // bass boost => DJ gane besi uthbe
      } else if (playing) {
        lv = fakeLevel(i, t);
      }

      // attack fast, release slow
      smooth[i] += (lv - smooth[i]) * (lv > smooth[i] ? 0.6 : 0.12);

      // gan na cholle halka dolon
      const idle = playing ? 0 : (Math.sin(t * 1.4 + i * 0.7) * 0.5 + 0.5) * 0.06;
      const target = (smooth[i] + idle) * rise;

      // spring => dorir moto bounce
      const force = (target - pos[i]) * 140 - vel[i] * 13;
      vel[i] += force * dt;
      pos[i] += vel[i] * dt;
      if (pos[i] < 0) { pos[i] = 0; vel[i] = 0; }

      dots[i].style.height = (base + pos[i]) + "px";       // niche theke upore lomba hoy
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
        
    }
