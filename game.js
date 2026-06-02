/* ==========================================
AERO ALPHA
VERSION: v21.0
BUILD: TV-FIRST STABLE CORE
FEATURES:
- Sky Runner + Free Flight
- 28 Arabic letters
- TV / Keyboard / Touch controls
- Menu system
- Stable target system (NO LOCK LOOP)
- No coin mechanics (letters only)
========================================== */

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

let GAME_MODE = "MENU"; // MENU | RUNNER | FREEFLIGHT

let plane;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0, velY = 0;

let letters = [];
let targetLetter;
let targetText;

let skyImage;
let sprAirport, sprRunway;

let cloud1, cloud2;

let speed = 2.5;

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

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("clouds_1","assets/images/clouds_1.png");
    this.load.image("clouds_2","assets/images/clouds_2.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    });

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

    sceneRef.add.image(0,0,"background_menu")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    let title = sceneRef.add.text(config.width/2, 120,
        "AERO ALPHA",
        { fontSize:"64px", color:"#FFD93D" }
    ).setOrigin(0.5);

    let runnerBtn = sceneRef.add.text(config.width/2, 300,
        "✈ SKY RUNNER",
        { fontSize:"48px", color:"#fff", backgroundColor:"#000" }
    ).setOrigin(0.5).setInteractive();

    let freeBtn = sceneRef.add.text(config.width/2, 420,
        "🛩 FREE FLIGHT",
        { fontSize:"48px", color:"#fff", backgroundColor:"#000" }
    ).setOrigin(0.5).setInteractive();

    runnerBtn.on("pointerdown", () => startGame("RUNNER"));
    freeBtn.on("pointerdown", () => startGame("FREEFLIGHT"));
}

/* ================= START GAME ================= */

function startGame(mode) {

    GAME_MODE = mode;

    sceneRef.children.removeAll();

    initWorld();

    spawnPlane();

    spawnLetters();

    setTarget();
}

/* ================= WORLD ================= */

function initWorld() {

    skyImage = sceneRef.add.image(0,0,"sky_day")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    cloud1 = sceneRef.add.tileSprite(0,120,config.width,200,"clouds_1").setOrigin(0);
    cloud2 = sceneRef.add.tileSprite(0,260,config.width,200,"clouds_2").setOrigin(0);

    cloud1.setAlpha(0.3);
    cloud2.setAlpha(0.2);

    sprAirport = sceneRef.add.image(0, config.height-220, "airport")
        .setOrigin(0)
        .setDisplaySize(config.width, 300);

    sprRunway = sceneRef.add.image(0, config.height-120, "runway")
        .setOrigin(0)
        .setDisplaySize(config.width, 120);

    planeTargetX = config.width/2;
    planeTargetY = config.height*0.6;
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

    sceneRef.input.on("pointermove", (p) => {
        planeTargetX = p.x;
        planeTargetY = config.height*0.6;
    });
}

/* ================= LETTER SYSTEM ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    let pool = generatePool();

    for (let i = 0; i < 7; i++) {

        let txt = sceneRef.add.text(
            Phaser.Math.Between(100, config.width-100),
            Phaser.Math.Between(-300, -50),
            pool[i],
            {
                fontSize:"96px",
                color:"#FFD93D"
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= POOL ================= */

function generatePool() {

    let pool = [];

    pool.push(getValidTarget());
    pool.push(getValidTarget());

    while(pool.length < 7) {
        pool.push(LETTERS[Math.floor(Math.random()*LETTERS.length)]);
    }

    return Phaser.Utils.Array.Shuffle(pool);
}

/* ================= TARGET SAFETY ================= */

function setTarget() {

    let valid = letters.map(l => l.text);

    if(valid.length === 0) return;

    targetLetter = valid[Math.floor(Math.random()*valid.length)];

    if(!targetText) {
        targetText = sceneRef.add.text(20,20,"",{fontSize:"64px",color:"#fff"});
    }

    targetText.setText("الحرف: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= UPDATE ================= */

function update() {

    if(GAME_MODE === "MENU") return;

    updatePlane();

    cloud1.tilePositionX += 0.3;
    cloud2.tilePositionX += 0.5;

    letters.forEach(l => {

        l.y += speed;

        if(l.y > config.height + 100) {
            l.y = -100;
        }
    });
}

/* ================= PLANE MOVEMENT ================= */

function updatePlane() {

    let dx = planeTargetX - plane.x;
    let dy = planeTargetY - plane.y;

    velX += dx * 0.05;
    velY += dy * 0.05;

    velX *= 0.85;
    velY *= 0.85;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -10, 10);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if(!letter || !letter.text) return;

    if(letter.text === targetLetter) {

        spawnBurst(letter.x, letter.y);

        letter.destroy();

        letters = letters.filter(l => l !== letter);

        if(letters.length < 5) spawnLetters();

        setTarget();

    }
}

/* ================= BURST ================= */

function spawnBurst(x,y) {

    for(let i=0;i<20;i++) {

        let p = sceneRef.add.circle(x,y,10,0xFFD93D);

        sceneRef.tweens.add({
            targets:p,
            x:x + Phaser.Math.Between(-150,150),
            y:y + Phaser.Math.Between(-150,150),
            alpha:0,
            duration:600,
            onComplete:()=>p.destroy()
        });
    }
}

/* ================= AUDIO ================= */

function playAudio(letter) {

    let key = AUDIO_MAP[letter];
    if(!key) return;

    let existing = sceneRef.sound.get(key);
    if(existing) existing.stop();

    sceneRef.sound.play(key,{volume:1});
}

/* ================= SAFETY ================= */

function getValidTarget() {
    return LETTERS[Math.floor(Math.random()*LETTERS.length)];
}
