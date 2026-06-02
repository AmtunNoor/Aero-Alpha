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

/* ================= STATE ================== */

let sceneRef;

let GAME_MODE = null;

let plane = null;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0;
let velY = 0;

/* GAME CORE */
let letters = [];
let targetLetter = null;
let targetText = null;

let wrongStreak = 0;

/* SPEED SYSTEM (GRADUAL) */
let baseSpeed = 1.2;
let speedMultiplier = 1;

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
    this.load.image("cloud1","assets/images/clouds_1.png");
    this.load.image("cloud2","assets/images/clouds_2.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    });
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

    const btn = sceneRef.add.text(
        config.width/2,
        config.height/2,
        "START GAME",
        {
            fontSize:"60px",
            color:"#FFD93D",
            backgroundColor:"#000"
        }
    ).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", () => {
        bg.destroy();
        btn.destroy();
        startGame();
    });
}

/* ================= START ================= */

function startGame() {

    GAME_MODE = "RUNNER";

    buildWorld();
    resetGame();

    spawnLetters();
    pickTarget();
}

/* ================= WORLD ================= */

function buildWorld() {

    sceneRef.add.image(0,0,"sky_day")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    sceneRef.physics.world.timeScale = 1;

    plane = sceneRef.physics.add.image(
        config.width/2,
        config.height*0.7,
        "plane_trainer"
    );

    plane.setScale(0.28);
    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;
    planeTargetY = plane.y;

    targetText = sceneRef.add.text(20,20,"",{
        fontSize:"54px",
        color:"#FFD93D",
        stroke:"#000",
        strokeThickness:8
    });

    sceneRef.input.on("pointermove", (p) => {
        planeTargetX = p.x;
        planeTargetY = config.height*0.7;
    });
}

/* ================= RESET ================= */

function resetGame() {
    letters.forEach(l => l.destroy());
    letters = [];
    wrongStreak = 0;
}

/* ================= UPDATE ================= */

function update() {

    if (GAME_MODE !== "RUNNER") return;

    updatePlane();
    updateLetters();

    applyDifficulty();

    if (cloud1) cloud1.tilePositionX += 0.2;
    if (cloud2) cloud2.tilePositionX += 0.3;
}

/* ================= PLANE (SMOOTH) ================= */

function updatePlane() {

    let dx = planeTargetX - plane.x;
    let dy = planeTargetY - plane.y;

    velX += dx * 0.04;
    velY += dy * 0.04;

    velX *= 0.86;
    velY *= 0.86;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -10, 10);
}

/* ================= LETTER SYSTEM ================= */

function spawnLetters() {

    // KEEP CONTROLLED COUNT ONLY
    while (letters.length < 7) {

        let letter =
            LETTERS[Math.floor(Math.random()*LETTERS.length)];

        let t = sceneRef.add.text(
            Math.random()*config.width,
            -Math.random()*300,
            letter,
            {
                fontSize:"72px",
                color:"#FFD93D",
                stroke:"#000",
                strokeThickness:8
            }
        );

        sceneRef.physics.add.existing(t);
        t.body.setAllowGravity(false);

        t.speed = baseSpeed;

        letters.push(t);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= LETTER UPDATE ================= */

function updateLetters() {

    letters.forEach(l => {

        l.y += baseSpeed * speedMultiplier;

        if (l.y > config.height + 80) {
            l.y = -100;
            l.x = Math.random()*config.width;
        }
    });
}

/* ================= TARGET ================= */

function pickTarget() {

    if (letters.length === 0) return;

    targetLetter =
        letters[Math.floor(Math.random()*letters.length)].text;

    targetText.setText("الحرف: " + targetLetter);

    playAudioSafe(targetLetter);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (!letter || !letter.active) return;

    if (letter.text === targetLetter) {

        spawnBurst(letter.x, letter.y);

        letter.destroy();
        letters = letters.filter(l => l !== letter);

        wrongStreak = 0;

        spawnLetters();
        pickTarget();

    } else {

        wrongStreak++;

        // ONLY VISUAL SHAKE AFTER 6 WRONGS
        if (wrongStreak >= 6) {
            sceneRef.cameras.main.shake(80,0.01);
            wrongStreak = 0;
        }
    }
}

/* ================= DIFFICULTY CURVE ================= */

function applyDifficulty() {

    speedMultiplier = 1 + (letters.length * 0.05);
}

/* ================= BURST ================= */

function spawnBurst(x,y) {

    for (let i=0;i<14;i++) {

        let p = sceneRef.add.circle(x,y,10,0xFFD93D);

        sceneRef.tweens.add({
            targets:p,
            x:x+Phaser.Math.Between(-120,120),
            y:y+Phaser.Math.Between(-120,120),
            alpha:0,
            duration:600,
            onComplete:()=>p.destroy()
        });
    }
}

/* ================= SAFE AUDIO ================= */

function playAudioSafe(letter) {

    const key = AUDIO_MAP[letter];
    if (!key) return;

    if (!sceneRef.cache.audio.exists(key)) return;

    sceneRef.sound.play(key,{ volume:1 });
}
