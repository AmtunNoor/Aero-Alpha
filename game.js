/****************************************
AERO ALPHA
VERSION: v21.1 FINAL
BUILD: TV-FIRST STABLE
DATE: 2026-06-03
****************************************/

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: "arcade",
        arcade: { debug: false }
    },
    scene: { preload, create, update }
};

new Phaser.Game(config);

/* ================= CORE ================= */

let sceneRef;
let GAME_MODE = "MENU";

/* ================= PLAYER ================= */

let plane;
let velX = 0, velY = 0;
let targetX = 640;
let targetY = 520;

/* ================= LETTERS ================= */

let letters = [];
let targetLetter;
let targetText;

/* ================= INPUT ================= */

let INPUT = {};

/* ================= CONSTANTS ================= */

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

    this.load.image("sky_day","assets/images/sky_day.webp");
    this.load.image("sky_sunset","assets/images/sky_sunset.webp");
    this.load.image("sky_night","assets/images/sky_night.webp");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("background_menu","assets/images/background_menu.png");

    Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    });
}

/* ================= CREATE ================= */

function create() {
    sceneRef = this;
    showMenu();
    setupInput();
}

/* ================= MENU ================= */

function showMenu() {

    sceneRef.add.image(640,360,"background_menu")
        .setDisplaySize(1280,720);

    sceneRef.add.text(640, 180, "AERO ALPHA", {
        fontSize: "60px",
        color: "#ffffff"
    }).setOrigin(0.5);

    const btn = sceneRef.add.text(640, 360, "START RUNNER", {
        fontSize: "44px",
        color: "#FFD93D",
        backgroundColor: "#000"
    }).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", startGame);
}

/* ================= START ================= */

function startGame() {

    GAME_MODE = "RUNNER";

    sceneRef.children.removeAll();

    buildWorld();
    spawnPlane();
    spawnLetters();
    pickTarget();
}

/* ================= WORLD ================= */

function buildWorld() {

    sceneRef.add.image(640,360,"sky_day").setDisplaySize(1280,720);

    sceneRef.add.image(640,520,"airport")
        .setDisplaySize(1280,250)
        .setAlpha(1);

    sceneRef.add.image(640,650,"runway")
        .setDisplaySize(1280,150)
        .setAlpha(1);
}

/* ================= PLANE ================= */

function spawnPlane() {

    plane = sceneRef.physics.add.image(640,520,"plane_trainer");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    targetX = plane.x;
    targetY = plane.y;
}

/* ================= LETTER SYSTEM ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    const pool = buildLetterPool();

    for (let i = 0; i < pool.length; i++) {

        let txt = sceneRef.add.text(
            Phaser.Math.Between(200,1080),
            Phaser.Math.Between(100,600),
            pool[i],
            {
                fontSize:"70px",
                color:"#FFD93D",
                stroke:"#000",
                strokeThickness:8
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= POOL ================= */

function buildLetterPool() {

    let pool = [];

    pool.push(...LETTERS);

    while(pool.length > 7) {
        pool.splice(Math.floor(Math.random()*pool.length),1);
    }

    return pool;
}

/* ================= TARGET ================= */

function pickTarget() {

    if (letters.length === 0) return;

    targetLetter = letters[
        Phaser.Math.Between(0, letters.length-1)
    ].text;

    if (!targetText) {
        targetText = sceneRef.add.text(20,20,"",{
            fontSize:"40px",
            color:"#fff"
        });
    }

    targetText.setText("TARGET: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= COLLECT FIXED ================= */

function collect(_, letter) {

    if (!letter.active) return;

    if (letter.text !== targetLetter) {
        return; // ignore wrong hits
    }

    spawnBurst(letter.x, letter.y);

    letters = letters.filter(l => l !== letter);
    letter.destroy();

    if (letters.length < 5) {
        spawnLetters();
    }

    pickTarget();
}

/* ================= AUDIO SAFE ================= */

function playAudio(letter) {

    const key = AUDIO_MAP[letter];
    if (!key) return;

    if (sceneRef.sound.get(key)) {
        sceneRef.sound.get(key).stop();
    }

    sceneRef.sound.play(key);
}

/* ================= INPUT ================= */

function setupInput() {

    sceneRef.input.keyboard.on("keydown", (e) => {

        if (e.code === "ArrowLeft") targetX -= 30;
        if (e.code === "ArrowRight") targetX += 30;
        if (e.code === "ArrowUp") targetY -= 30;
        if (e.code === "ArrowDown") targetY += 30;
    });
}

/* ================= UPDATE ================= */

function update() {

    if (!plane) return;

    let dx = targetX - plane.x;
    let dy = targetY - plane.y;

    velX += dx * 0.05;
    velY += dy * 0.05;

    velX *= 0.85;
    velY *= 0.85;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -12, 12);
}

/* ================= BURST ================= */

function spawnBurst(x,y) {

    for (let i=0;i<18;i++) {

        let p = sceneRef.add.circle(x,y,6,0xffffff);

        sceneRef.tweens.add({
            targets:p,
            x:x+Phaser.Math.Between(-120,120),
            y:y+Phaser.Math.Between(-120,120),
            alpha:0,
            duration:500,
            onComplete:()=>p.destroy()
        });
    }
}
