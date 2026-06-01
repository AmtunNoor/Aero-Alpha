//let airport;
//let plane;
let sprAirport;
let sprRunway;
//let skyImage;

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

/* ================= GAME STATE (SELF-CONTAINED) ================= */

const GAME_STATE = {
    version: "v19.4",
    score: 0,
    airportIndex: 0,
    unlockedAirports: ["basic"],
    unlockedPlanes: ["plane_trainer"]
};

/* ================= AIRPORT SYSTEM ================= */

const AIRPORTS = {
    basic: {
        sky: "sky_day",
        letters: ["ا","ب","ت","ث","ج","ح","خ"]
    },
    desert: {
        sky: "sky_sunset",
        letters: ["ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز"]
    },
    night: {
        sky: "sky_night",
        letters: [
            "ا","ب","ت","ث","ج","ح","خ","د","ذ","ر",
            "ز","س","ش","ص","ض","ط","ظ","ع","غ","ف",
            "ق","ك","ل","م","ن","ه","و","ي"
        ]
    }
};

/* ================= AUDIO MAP ================= */

const AUDIO_MAP = {
    "ا":"alif",
    "ب":"ba",
    "ت":"ta",
    "ث":"thaa",
    "ج":"jeem",
    "ح":"ha",
    "خ":"kha",
    "د":"daal",
    "ذ":"zaal",
    "ر":"raa",
    "ز":"zaa",
    "س":"seen",
    "ش":"sheen",
    "ص":"saad",
    "ض":"dad",
    "ط":"toa",
    "ظ":"zoa",
    "ع":"ain",
    "غ":"ghain",
    "ف":"fa",
    "ق":"qaaf",
    "ك":"kaf",
    "ل":"laam",
    "م":"meem",
    "ن":"noon",
    "ه":"haa",
    "و":"waw",
    "ي":"yaa"
};

/* ================= GLOBALS ================= */

let sceneRef;

let plane;
let planeTargetX;

let letters = [];
let targetLetter;
let targetText;

let speed = 4;
let boostActive = false;
let boostTimer = 0;

let LANES = [];

let skyImage;
let runway, airport;
let cloud1, cloud2;

/* ================= PRELOAD ================= */

function preload() {

    Object.values(AIRPORTS).forEach(a => {
        this.load.image(a.sky, `assets/images/${a.sky}.webp`);
    });

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("cloud1","assets/images/clouds_1.webp");
    this.load.image("cloud2","assets/images/clouds_2.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");
    this.load.image("plane_falcon","assets/images/plane_falcon.png");
    this.load.image("plane_glider","assets/images/plane_glider.png");
    this.load.image("plane_gold","assets/images/plane_gold.png");
    this.load.image("plane_legend","assets/images/plane_legend.png");

    this.load.audio("engine","assets/sound/engine.mp3");
    this.load.audio("wind","assets/sound/wind.mp3");

    Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    });
}

/* ================= CREATE ================= */

function create() {
console.log("airport sprite:", sprAirport);
console.log("runway sprite:", sprRunway);
console.log("sky:", skyImage);
    sceneRef = this;

    generateLanes();

    const airportData = getAirport();

    skyImage = this.add.image(0,0,airportData.sky)
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    cloud1 = this.add.tileSprite(0,120,config.width,200,"cloud1").setOrigin(0);
    cloud2 = this.add.tileSprite(0,200,config.width,200,"cloud2").setOrigin(0);

    cloud1.setAlpha(0.35);
    cloud2.setAlpha(0.25);

//    airport = this.add.image(0, config.height-220, "airport")
        .setOrigin(0)
        .setDisplaySize(config.width, 300);

  //  runway = this.add.image(0, config.height-120, "runway")
        .setOrigin(0)
        .setDisplaySize(config.width, 120);
sprAirport = this.add.image(0, config.height - 220, "airport")
    .setOrigin(0)
    .setDisplaySize(config.width, 300);

sprRunway = this.add.image(0, config.height - 120, "runway")
    .setOrigin(0)
    .setDisplaySize(config.width, 120);
    plane = this.physics.add.image(config.width/2, config.height*0.75, "plane_trainer");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;

    this.input.on("pointermove", (p) => {
        planeTargetX = Phaser.Math.Clamp(p.x, config.width*0.1, config.width*0.9);
    });

    this.input.keyboard.on("keydown-SPACE", activateBoost);

    startGame();
}

/* ================= GAME START ================= */

function startGame() {

    spawnLetters();

    nextTarget();

    startAudio();
}

/* ================= AIRPORT ================= */

function getAirport() {
    return AIRPORTS[
        GAME_STATE.unlockedAirports[
            GAME_STATE.unlockedAirports.length - 1
        ]
    ];
}

/* ================= LETTERS ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    const list = getAirport().letters;

    for (let i = 0; i < list.length; i++) {

        let lane = Math.floor(Math.random() * LANES.length);

        let txt = sceneRef.add.text(
            LANES[lane] + Phaser.Math.Between(-40,40),
            -i * Phaser.Math.Between(80,160),
            list[i],
            {
                fontSize:"80px",
                color:"#FFD93D",
                stroke:"#000",
                strokeThickness:8
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        txt.state = "active";

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET ================= */

function nextTarget() {

    const list = getAirport().letters;

    let newLetter;

    do {
        newLetter = list[Math.floor(Math.random()*list.length)];
    } while(newLetter === targetLetter);

    targetLetter = newLetter;

    if(!targetText) {

        targetText = sceneRef.add.text(
            config.width/2,
            60,
            "",
            {
                fontSize:"72px",
                color:"#FFD93D",
                stroke:"#000",
                strokeThickness:10
            }
        ).setOrigin(0.5,0);
    }

    targetText.setText("الحرف: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if(letter.state !== "active") return;

    letter.state = "used";

    if(letter.text === targetLetter) {

        GAME_STATE.score++;

        spawnParticles(letter.x, letter.y);

        letter.destroy();

        checkProgression();

        nextTarget();

    } else {

        sceneRef.cameras.main.shake(60,0.008);

        letter.y = -200;
        letter.state = "active";
    }
}

/* ================= PROGRESSION ================= */

function checkProgression() {

    if(GAME_STATE.score === 10) unlockAirport("desert");
    if(GAME_STATE.score === 25) unlockAirport("night");
}

function unlockAirport(name) {

    if(!GAME_STATE.unlockedAirports.includes(name)) {

        GAME_STATE.unlockedAirports.push(name);

        sceneRef.cameras.main.flash(150);

        showUnlock(name);

        updateEnvironment();
    }
}

function showUnlock(name) {

    let t = sceneRef.add.text(
        config.width/2,
        config.height/2,
        "NEW AIRPORT:\n" + name.toUpperCase(),
        {
            fontSize:"48px",
            color:"#FFD93D",
            align:"center"
        }
    ).setOrigin(0.5);

    sceneRef.tweens.add({
        targets:t,
        alpha:0,
        duration:2000,
        onComplete:()=>t.destroy()
    });
}

/* ================= UPDATE ================= */

function update() {

    updatePlane();

    let speedFactor = boostActive ? speed*2 : speed;

    letters.forEach(l => {

        l.y += speedFactor;

        if(l.y > config.height + 100) {

            l.y = -100;
            l.x = LANES[Math.floor(Math.random()*LANES.length)];
            l.state = "active";
        }
    });

    cloud1.tilePositionX += 0.2;
    cloud2.tilePositionX += 0.4;

    updateEnvironment();
}
/*========Safe Sprite=========*/
function safeSprite(sprite, fn) {
    if (sprite && sprite.active) {
        fn(sprite);
    }
}
/* ================= PLANE ================= */

function updatePlane() {
    plane.x += (planeTargetX - plane.x) * 0.15;
}

/* ================= ENVIRONMENT ================= */
function updateEnvironment() {
if (!sprAirport) {
    console.warn("sprAirport not initialized");
    return;
}
    const airportData = getAirport(); // ONLY data

    skyImage.setTexture(airportData.sky);

    let alpha = 1;
    let tint = 0xffffff;

    if (airportData.sky === "sky_sunset") {
        alpha = 0.6;
        tint = 0xffcc88;
    }

    if (airportData.sky === "sky_night") {
        alpha = 0.3;
        tint = 0x8899ff;
    }

    // SAFE: sprite references only
    sprAirport.setAlpha(alpha);
    sprRunway.setAlpha(alpha);

    cloud1.setTint(tint);
    cloud2.setTint(tint);
}

/* ================= LANE SYSTEM ================= */

function generateLanes() {

    LANES = [];

    let count = 5;

    let spacing = config.width / (count + 1);

    for(let i=1;i<=count;i++) {
        LANES.push(i * spacing);
    }
}

/* ================= AUDIO ================= */

function startAudio() {

    sceneRef.sound.play("engine",{loop:true,volume:0.4});
    sceneRef.sound.play("wind",{loop:true,volume:0.3});
}

function playAudio(letter) {

    const key = AUDIO_MAP[letter];

    if(key) sceneRef.sound.play(key);
}

/* ================= BOOST ================= */

function activateBoost() {

    boostActive = true;
    sceneRef.cameras.main.flash(80);

    setTimeout(()=>boostActive=false,1200);
}

/* ================= PARTICLES ================= */

function spawnParticles(x,y) {

    for(let i=0;i<8;i++) {

        let p = sceneRef.add.circle(x,y,6,0xFFD93D);

        sceneRef.tweens.add({
            targets:p,
            x:x + Phaser.Math.Between(-80,80),
            y:y + Phaser.Math.Between(-80,80),
            alpha:0,
            duration:600,
            onComplete:()=>p.destroy()
        });
    }
}
