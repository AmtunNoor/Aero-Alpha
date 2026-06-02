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

/* ================= GLOBAL STATE ================= */

let sceneRef;

let GAME_MODE = null; // MENU | RUNNER | FREEFLIGHT

let worldBuilt = false;

let plane = null;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0;
let velY = 0;

let letters = [];
let targetLetter = null;
let targetText = null;

let skyImage;

let cloud1, cloud2;

let sprAirport, sprRunway;

/* ================= LETTERS ================= */

const LETTERS = [
"ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز",
"س","ش","ص","ض","ط","ظ","ع","غ","ف","ق",
"ك","ل","م","ن","ه","و","ي"
];

const AUDIO_MAP = {
"ا":"alif","ب":"ba","ت":"ta","ث":"thaa","ج":"jeem","ح":"haa","خ":"kha",
"د":"daal","ذ":"zaal","ر":"raa","ز":"zaa","س":"seen","ش":"sheen","ص":"saad",
"ض":"dad","ط":"toa","ظ":"zoa","ع":"ain","غ":"ghain","ف":"fa","ق":"qaaf",
"ك":"kaf","ل":"laam","م":"meem","ن":"noon","ه":"ha","و":"waw","ي":"yaa"
};

/* ================= PRELOAD ================= */

function preload() {

    this.load.image("background_menu","assets/images/background_menu.png");

    this.load.image("sky_day","assets/images/sky_day.webp");
    this.load.image("sky_sunset","assets/images/sky_sunset.webp");
    this.load.image("sky_night","assets/images/sky_night.webp");

    this.load.image("cloud1","assets/images/clouds_1.png");
    this.load.image("cloud2","assets/images/clouds_2.png");

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    this.load.audio("engine","assets/sound/engine.mp3");
    this.load.audio("wind","assets/sound/wind.mp3");
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;
    showMenu();
}

/* ================= MENU ================= */

function showMenu() {

    GAME_MODE = "MENU";

    const bg = sceneRef.add.image(
        config.width/2,
        config.height/2,
        "background_menu"
    ).setDisplaySize(config.width, config.height);

    const overlay = sceneRef.add.rectangle(
        config.width/2,
        config.height/2,
        config.width,
        config.height,
        0x000000,
        0.25
    );

    const title = sceneRef.add.text(
        config.width/2,
        config.height*0.2,
        "AERO ALPHA",
        {
            fontSize:"64px",
            color:"#FFD93D",
            stroke:"#000",
            strokeThickness:8
        }
    ).setOrigin(0.5);

    const runnerBtn = sceneRef.add.text(
        config.width/2,
        config.height*0.45,
        "✈ SKY RUNNER",
        {
            fontSize:"48px",
            backgroundColor:"#000",
            color:"#FFD93D",
            padding:{left:20,right:20,top:10,bottom:10}
        }
    ).setOrigin(0.5).setInteractive();

    const freeBtn = sceneRef.add.text(
        config.width/2,
        config.height*0.6,
        "🛩 FREE FLIGHT",
        {
            fontSize:"48px",
            backgroundColor:"#000",
            color:"#FFD93D",
            padding:{left:20,right:20,top:10,bottom:10}
        }
    ).setOrigin(0.5).setInteractive();

    runnerBtn.on("pointerdown", () => startGame("RUNNER", bg, overlay, title, runnerBtn, freeBtn));
    freeBtn.on("pointerdown", () => startGame("FREEFLIGHT", bg, overlay, title, runnerBtn, freeBtn));
}

/* ================= START GAME ================= */

function startGame(mode, ...ui) {

    GAME_MODE = mode;

    ui.forEach(o => o.destroy());

    if (!worldBuilt) buildWorld();

    resetGame();

    spawnLetters();
    pickTarget();
}

/* ================= WORLD ================= */

function buildWorld() {

    worldBuilt = true;

    skyImage = sceneRef.add.image(
        0,0,"sky_day"
    ).setOrigin(0).setDisplaySize(config.width, config.height);

    cloud1 = sceneRef.add.tileSprite(0, 80, config.width, 80, "cloud1").setOrigin(0).setAlpha(0.15);
    cloud2 = sceneRef.add.tileSprite(0, 160, config.width, 80, "cloud2").setOrigin(0).setAlpha(0.1);

    plane = sceneRef.physics.add.image(
        config.width/2,
        config.height*0.7,
        "plane_trainer"
    );

    plane.setScale(0.28);
    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;
    planeTargetY = plane.y;

    targetText = sceneRef.add.text(
        20,20,"",
        {
            fontSize:"54px",
            color:"#FFD93D",
            stroke:"#000",
            strokeThickness:8
        }
    );

    sceneRef.input.on("pointermove", (p) => {
        planeTargetX = p.x;
        planeTargetY = config.height * 0.7;
    });
}

/* ================= RESET ================= */

function resetGame() {

    letters.forEach(l => l.destroy());
    letters = [];

    velX = 0;
    velY = 0;
}

/* ================= UPDATE ================= */

function update() {

    if (GAME_MODE === "MENU") return;

    if (!plane) return;

    updatePlane();

    if (GAME_MODE === "RUNNER") updateRunner();
    else updateFreeFlight();

    if (cloud1) cloud1.tilePositionX += 0.3;
    if (cloud2) cloud2.tilePositionX += 0.5;
}

/* ================= PLANE ================= */

function updatePlane() {

    if (!plane) return;

    let dx = planeTargetX - plane.x;
    let dy = planeTargetY - plane.y;

    velX += dx * 0.05;
    velY += dy * 0.05;

    velX *= 0.85;
    velY *= 0.85;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -15, 15);
}

/* ================= RUNNER ================= */

function updateRunner() {

    letters.forEach(l => {

        l.y += 3;

        if (l.y > config.height + 100) {
            l.y = -100;
            l.x = Math.random() * config.width;
        }
    });
}

/* ================= FREE FLIGHT ================= */

function updateFreeFlight() {

    letters.forEach(l => {

        l.x += Math.sin(Date.now()*0.001 + l.wave)*0.5;
        l.y += 1.5;
    });
}

/* ================= LETTERS ================= */

function spawnLetters() {

    letters = [];

    for (let i=0;i<7;i++) {

        let letter = LETTERS[Math.floor(Math.random()*LETTERS.length)];

        let t = sceneRef.add.text(
            Math.random()*config.width,
            Math.random()*config.height,
            letter,
            {
                fontSize:"80px",
                color:"#FFD93D",
                stroke:"#000",
                strokeThickness:8
            }
        );

        sceneRef.physics.add.existing(t);
        t.body.setAllowGravity(false);

        t.wave = Math.random()*1000;

        letters.push(t);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET ================= */

function pickTarget() {

    targetLetter =
        letters[Math.floor(Math.random()*letters.length)].text;

    targetText.setText("الحرف: " + targetLetter);

    playAudioSafe(targetLetter);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (!letter || !letter.active) return;

    if (letter.text === targetLetter) {

        letter.destroy();
        letters = letters.filter(l => l !== letter);

        spawnLetters();
        pickTarget();

    } else {

        sceneRef.cameras.main.shake(80,0.01);
    }
}

/* ================= SAFE AUDIO ================= */

function playAudioSafe(letter) {

    const key = AUDIO_MAP[letter];

    if (!key) return;

    if (!sceneRef.cache.audio.exists(key)) return;

    sceneRef.sound.play(key, { volume: 1 });
}
