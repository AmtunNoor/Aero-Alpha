const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: "arcade",
        arcade: { debug: false }
    },
    scene: { preload, create, update }
};

new Phaser.Game(config);

/* ================= STATE ================= */

let sceneRef;

let GAME_MODE = "RUNNER"; 
// RUNNER | FREEFLIGHT

let plane;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0;
let velY = 0;

let letters = [];
let targetLetter;
let targetText;

let speed = 4;
let boostActive = false;
let boostTimer = 0;

let skyImage;
let sprAirport, sprRunway;

let cloud1, cloud2;

let LANES = [];

/* ================= 28 LETTERS ================= */

const LETTERS = [
"ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز",
"س","ش","ص","ض","ط","ظ","ع","غ","ف","ق",
"ك","ل","م","ن","ه","و","ي"
];

/* ================= AUDIO MAP ================= */

const AUDIO_MAP = {
"ا":"alif","ب":"ba","ت":"ta","ث":"thaa","ج":"jeem","ح":"ha","خ":"kha",
"د":"daal","ذ":"zaal","ر":"raa","ز":"zaa","س":"seen","ش":"sheen","ص":"saad",
"ض":"dad","ط":"toa","ظ":"zoa","ع":"ain","غ":"ghain","ف":"fa","ق":"qaaf",
"ك":"kaf","ل":"laam","م":"meem","ن":"noon","ه":"haa","و":"waw","ي":"yaa"
};

/* ================= PRELOAD ================= */

function preload() {

    this.load.image("sky_day","assets/images/sky_day.webp");
    this.load.image("sky_sunset","assets/images/sky_sunset.webp");
    this.load.image("sky_night","assets/images/sky_night.webp");

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("cloud1","assets/images/clouds_1.webp");
    this.load.image("cloud2","assets/images/clouds_2.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    });
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;

    generateLanes();

    skyImage = this.add.image(0,0,"sky_day")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    cloud1 = this.add.tileSprite(0,120,config.width,200,"cloud1").setOrigin(0);
    cloud2 = this.add.tileSprite(0,220,config.width,200,"cloud2").setOrigin(0);

    cloud1.setAlpha(0.3);
    cloud2.setAlpha(0.2);

    sprAirport = this.add.image(0, config.height-220, "airport")
        .setOrigin(0)
        .setDisplaySize(config.width, 300);

    sprRunway = this.add.image(0, config.height-120, "runway")
        .setOrigin(0)
        .setDisplaySize(config.width, 120);

    plane = this.physics.add.image(config.width/2, config.height*0.75, "plane_trainer");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;
    planeTargetY = plane.y;

    /* ✈️ floating feel */
    this.tweens.add({
        targets: plane,
        y: plane.y - 6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    this.input.on("pointermove", (p) => {

        planeTargetX = Phaser.Math.Clamp(p.x, config.width*0.1, config.width*0.9);
        planeTargetY = config.height * 0.7;
    });

    startGame();
}

/* ================= MODE SWITCH ================= */

function switchMode(mode) {

    GAME_MODE = mode;

    letters.forEach(l => l.destroy());
    letters = [];

    nextTarget();
    spawnLetters();
}

/* ================= GAME START ================= */

function startGame() {
    spawnLetters();
    nextTarget();
}

/* ================= TARGET SYSTEM ================= */

function nextTarget() {

    targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];

    if (!targetText) {
        targetText = sceneRef.add.text(config.width/2, 60, "", {
            fontSize: "72px",
            color: "#FFD93D",
            stroke: "#000",
            strokeThickness: 10
        }).setOrigin(0.5);
    }

    targetText.setText("الحرف: " + targetLetter);

    ensureTargetExists();
    playAudio(targetLetter);
}

/* ================= LETTER SPAWN ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    let pool = generateLetterPool(targetLetter);

    for (let i = 0; i < 8; i++) {

        let txt = sceneRef.add.text(
            Math.random() * config.width,
            -i * 140,
            pool[Math.floor(Math.random() * pool.length)],
            {
                fontSize: "86px",
                color: "#FFD93D",
                stroke: "#000",
                strokeThickness: 10
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        txt.state = "active";
        txt.baseX = txt.x;
        txt.wave = Math.random() * 1000;

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= UPDATE ================= */

function update() {

    updatePlane();

    if (GAME_MODE === "RUNNER") {
        updateRunner();
    } else {
        updateFreeFlight();
    }

    cloud1.tilePositionX += 0.3;
    cloud2.tilePositionX += 0.5;
}

/* ================= RUNNER MODE ================= */

function updateRunner() {

    let s = boostActive ? speed * 2 : speed;

    letters.forEach(l => {

        l.y += s;
        l.x = l.baseX + Math.sin((l.y + l.wave) * 0.01) * 50;

        if (l.y > config.height + 100) {

            l.y = -150;

            let pool = generateLetterPool(targetLetter);
            l.text = pool[Math.floor(Math.random() * pool.length)];

            l.baseX = Math.random() * config.width;
        }
    });
}

/* ================= FREE FLIGHT MODE ================= */

function updateFreeFlight() {

    let s = boostActive ? speed * 2 : speed;

    letters.forEach(l => {

        l.y += s;
        l.x = l.baseX + Math.sin((l.y + l.wave) * 0.01) * 70;

        if (l.y > config.height + 100) {
            l.y = -100;
            l.baseX = Math.random() * config.width;
        }
    });
}

/* ================= PREMIUM PLANE ================= */

function updatePlane() {

    let dx = planeTargetX - plane.x;
    let dy = planeTargetY - plane.y;

    velX += dx * 0.08;
    velY += dy * 0.06;

    velX *= 0.82;
    velY *= 0.82;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.3, -18, 18);
}

/* ================= TARGET SAFETY ================= */

function ensureTargetExists() {

    if (!letters.some(l => l.text === targetLetter)) {
        spawnLetters();
    }
}

/* ================= LETTER POOL ================= */

function generateLetterPool(target) {

    let pool = new Set();
    pool.add(target);

    while (pool.size < 8) {
        pool.add(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
    }

    return Array.from(pool);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (letter.state !== "active") return;

    if (letter.text === targetLetter) {

        letter.destroy();
        spawnParticles(letter.x, letter.y);

        nextTarget();

    } else {
        sceneRef.cameras.main.shake(40, 0.006);
    }
}

/* ================= AUDIO ================= */

function playAudio(letter) {

    let k = AUDIO_MAP[letter];

    if (k) {
        let s = sceneRef.sound.get(k);
        if (s) s.stop();
        sceneRef.sound.play(k, { volume: 1 });
    }
}

/* ================= LANE SYSTEM ================= */

function generateLanes() {

    LANES = [];
    let count = 5;

    for (let i = 1; i <= count; i++) {
        LANES.push((config.width / (count + 1)) * i);
    }
}

/* ================= PARTICLES ================= */

function spawnParticles(x,y) {

    for (let i = 0; i < 18; i++) {

        let p = sceneRef.add.circle(x, y, 12, 0xFFD93D);

        sceneRef.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-180,180),
            y: y + Phaser.Math.Between(-180,180),
            alpha: 0,
            duration: 700,
            onComplete: () => p.destroy()
        });
    }
}
