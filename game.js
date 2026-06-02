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

let GAME_MODE = "MENU";

let plane;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0, velY = 0;

let letters = [];
let targetLetter;
let targetText;

let worldReady = false;

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

    sceneRef.add.image(0,0,"background_menu")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    let btn = sceneRef.add.text(config.width/2, config.height/2,
        "START SKY RUNNER",
        { fontSize:"50px", color:"#FFD93D", backgroundColor:"#000" }
    ).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", () => {
        startGame();
    });
}

/* ================= START GAME ================= */

function startGame() {

    GAME_MODE = "RUNNING";

    sceneRef.children.removeAll();

    buildWorld();
    spawnPlane();
    spawnLetters();
    pickTarget();
}

/* ================= WORLD ================= */

function buildWorld() {

    worldReady = true;

    sceneRef.add.image(0,0,"sky_day")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    sceneRef.add.tileSprite(0,100,config.width,150,"cloud1")
        .setOrigin(0)
        .setAlpha(0.2);

    sceneRef.add.tileSprite(0,250,config.width,150,"cloud2")
        .setOrigin(0)
        .setAlpha(0.15);

    targetText = sceneRef.add.text(20,20,"",{
        fontSize:"60px",
        color:"#FFD93D"
    });
}

/* ================= PLANE ================= */

function spawnPlane() {

    plane = sceneRef.physics.add.image(
        config.width/2,
        config.height*0.7,
        "plane_trainer"
    );

    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;
    planeTargetY = plane.y;

    sceneRef.input.on("pointermove", (p) => {
        planeTargetX = p.x;
        planeTargetY = config.height*0.6;
    });
}

/* ================= LETTER SYSTEM ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    for (let i=0;i<7;i++) {

        let txt = sceneRef.add.text(
            Phaser.Math.Between(100, config.width-100),
            Phaser.Math.Between(100, config.height-100),
            LETTERS[Math.floor(Math.random()*LETTERS.length)],
            {
                fontSize:"80px",
                color:"#FFD93D"
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET SAFE ================= */

function pickTarget() {

    if (letters.length === 0) return;

    targetLetter = letters[
        Phaser.Math.Between(0, letters.length-1)
    ].text;

    targetText.setText("الحرف: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= UPDATE ================= */

function update() {

    if (GAME_MODE !== "RUNNING") return;

    if (!plane) return;

    updatePlane();

    letters.forEach(l => {
        l.y += 2.5;

        if (l.y > config.height+50) {
            l.y = -50;
        }
    });
}

/* ================= PLANE ================= */

function updatePlane() {

    if (!plane) return;

    let dx = planeTargetX - plane.x;
    let dy = planeTargetY - plane.y;

    velX += dx * 0.04;
    velY += dy * 0.04;

    velX *= 0.86;
    velY *= 0.86;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -12, 12);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (!letter || !letter.text) return;

    if (letter.text === targetLetter) {

        spawnBurst(letter.x, letter.y);

        letter.destroy();

        letters = letters.filter(l => l !== letter);

        spawnLetters();
        pickTarget();
    }
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

/* ================= BURST ================= */

function spawnBurst(x,y) {

    for (let i=0;i<18;i++) {

        let p = sceneRef.add.circle(x,y,10,0xFFD93D);

        sceneRef.tweens.add({
            targets:p,
            x:x + Phaser.Math.Between(-120,120),
            y:y + Phaser.Math.Between(-120,120),
            alpha:0,
            duration:500,
            onComplete:()=>p.destroy()
        });
    }
}
