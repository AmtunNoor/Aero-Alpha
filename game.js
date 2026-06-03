/****************************************
AERO ALPHA
VERSION: v21.1 RC-STABLE (RESET BUILD)
GOAL: NO-BREAK CORE LOOP
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

/* ================= PLAYER ================= */

let plane;
let targetX = 640;
let targetY = 520;
let vx = 0, vy = 0;

/* ================= GAME STATE ================= */

let letters = [];
let targetLetter;
let targetText;

/* ================= INPUT ================= */

let input = {};

/* ================= LETTER SET (FULL 28) ================= */

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

    this.load.image("plane","assets/images/plane_trainer.png");

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("menu","assets/images/background_menu.png");

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

    sceneRef.add.image(640,360,"menu")
        .setDisplaySize(1280,720);

    let btn = sceneRef.add.text(640,360,"START",{
        fontSize:"60px",
        color:"#FFD93D",
        backgroundColor:"#000"
    }).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", startGame);
}

/* ================= START GAME ================= */

function startGame() {

    sceneRef.children.removeAll();

    buildWorld();
    spawnPlane();
    spawnLetters();
    pickTarget();
}

/* ================= WORLD ================= */

function buildWorld() {

    sceneRef.add.image(640,360,"sky_day")
        .setDisplaySize(1280,720);

    sceneRef.add.image(640,520,"airport")
        .setDisplaySize(1280,250);

    sceneRef.add.image(640,650,"runway")
        .setDisplaySize(1280,150);
}

/* ================= PLANE ================= */

function spawnPlane() {

    plane = sceneRef.physics.add.image(640,520,"plane");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);
}

/* ================= LETTERS ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    let pool = [...LETTERS];

    for (let i = 0; i < 7; i++) {

        let letter = pool[Math.floor(Math.random()*pool.length)];

        let t = sceneRef.add.text(
            Phaser.Math.Between(200,1080),
            Phaser.Math.Between(100,600),
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

        letters.push(t);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET ================= */

function pickTarget() {

    if (letters.length === 0) return;

   /* targetLetter = letters[
        Phaser.Math.Between(0, letters.length-1)
    ].text; */

    const activeLetters =
    letters.filter(l => l && l.active !== false);

if (activeLetters.length === 0) return;

targetLetter =
    Phaser.Utils.Array.GetRandom(activeLetters).text;
  //  targetText.setText("TARGET: " + targetLetter);
if (!targetText) return;

targetText.setText("TARGET: " + targetLetter);
    if (!targetText) {
        targetText = sceneRef.add.text(20,20,"",{
            fontSize:"50px",
            color:"#fff"
        });
    }

    targetText.setText("TARGET: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= UPDATE ================= */

function update() {

    if (!plane) return;

    updatePlane();
    updateLetters();
}

/* ================= PLANE CONTROL ================= */

function setupInput() {

    sceneRef.input.keyboard.on("keydown", (e) => {

        if (e.code === "ArrowLeft") targetX -= 40;
        if (e.code === "ArrowRight") targetX += 40;
        if (e.code === "ArrowUp") targetY -= 40;
        if (e.code === "ArrowDown") targetY += 40;
    });
}

function updatePlane() {

    let dx = targetX - plane.x;
    let dy = targetY - plane.y;

    vx += dx * 0.05;
    vy += dy * 0.05;

    vx *= 0.85;
    vy *= 0.85;

    plane.x += vx;
    plane.y += vy;

    plane.angle = Phaser.Math.Clamp(vx * 0.2, -12, 12);
}

/* ================= LETTER MOVEMENT ================= */

function updateLetters() {

    letters.forEach(l => {

        l.y += 2.5;

        if (l.y > 720) {
            l.y = -50;
            l.x = Phaser.Math.Between(200,1080);
        }
    });
}

/* ================= COLLECT (FIXED CORE) ================= */

function collect(_, letter) {

    if (!letter || !letter.active) return;

    if (letter.text !== targetLetter) return;

    spawnBurst(letter.x, letter.y);

    letters = letters.filter(l => l !== letter);
    letter.destroy();

    spawnLetters();
    pickTarget();
}

/* ================= AUDIO SAFE ================= */

function playAudio(letter) {

    const key = AUDIO_MAP[letter];
    if (!key) return;

    let s = sceneRef.sound.get(key);
    if (s) s.stop();

    sceneRef.sound.play(key);
}

/* ================= FX ================= */

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
