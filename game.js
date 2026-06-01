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

let LANES = [];

let skyImage;
let sprAirport, sprRunway;

let cloud1, cloud2;

/* ================= FULL 28 ARABIC LETTERS ================= */

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

    this.load.audio("engine","assets/sound/engine.mp3");
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

    /* ✈️ premium float animation */
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
        planeTargetY = Phaser.Math.Clamp(p.y, config.height*0.2, config.height*0.85);
    });

    startGame();
}

/* ================= GAME START ================= */

function startGame() {
    spawnLetters();
    nextTarget();
}

/* ================= TARGET ================= */

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

    playAudio(targetLetter);

    ensureTargetExists();
}

/* ================= LETTERS ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    for (let i = 0; i < LETTERS.length; i++) {

        let txt = sceneRef.add.text(
            Math.random() * config.width,
            -i * 140,
            LETTERS[i],
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

/* ================= UPDATE (PREMIUM PLANE SYSTEM) ================= */

function update() {

    updatePlane();

    let s = boostActive ? speed*2 : speed;

    letters.forEach(l => {

        l.y += s;

        /* smooth airflow motion */
        l.x = l.baseX + Math.sin((l.y + l.wave) * 0.01) * 70;

        if (l.y > config.height + 100) {
            l.y = -100;
            l.baseX = Math.random() * config.width;
        }
    });

    cloud1.tilePositionX += 0.3;
    cloud2.tilePositionX += 0.5;

    updateEnvironment();
}

/* ================= PREMIUM PLANE FEEL (NO JITTER) ================= */

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

/* ================= ENVIRONMENT ================= */

function updateEnvironment() {

    let t = getTimeMode();

    skyImage.setTexture(t);

    let alpha = 1;

    if (t === "sky_sunset") alpha = 0.6;
    if (t === "sky_night") alpha = 0.35;

    sprAirport.setAlpha(alpha);
    sprRunway.setAlpha(alpha);
}

/* ================= SIMPLE TIME MODE ================= */

function getTimeMode() {

    let x = (Math.sin(Date.now() * 0.0001) + 1) * 0.5;

    if (x < 0.33) return "sky_day";
    if (x < 0.66) return "sky_sunset";
    return "sky_night";
}

/* ================= FIX TARGET SAFETY ================= */

function ensureTargetExists() {

    if (!letters.some(l => l.text === targetLetter)) {
        spawnLetters();
    }
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (letter.state !== "active") return;

    if (letter.text === targetLetter) {

        letter.destroy();

        spawnParticles(letter.x, letter.y);

        nextTarget();

    } else {
        sceneRef.cameras.main.shake(50, 0.006);
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

/* ================= LANE SYSTEM (SAFE EXPANSION) ================= */

function generateLanes() {
    LANES = [];
    let count = 5;
    for (let i = 1; i <= count; i++) {
        LANES.push((config.width / (count + 1)) * i);
    }
}

/* ================= PARTICLES (BIG TODDLER FX) ================= */

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
