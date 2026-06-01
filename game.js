//v19 safe
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

let plane;
let laneIndex = 1;

const LANES = [];

let state = "IDLE";

/* Letters */
let letters = [];
let targetLetter;
let targetText;

/* Core gameplay */
let speed = 4;
let boostActive = false;
let boostTimer = 0;

/* Score & progression */
let score = 0;

/* Sky system */
let skyImage;
let skyIndex = 0;
const SKY_MODES = ["sky_day", "sky_sunset", "sky_night"];

/* Cloud system */
let cloud1, cloud2;

/* Hangar */
let hangarOpen = false;

/* ================= CURRICULUM ================= */

const LETTERS = ["ا","ب","ت","ث","ج","ح","خ"];

/* ================= AUDIO MAP ================= */

const AUDIO_MAP = {
    "ا":"alif",
    "ب":"ba",
    "ت":"ta",
    "ث":"thaa",
    "ج":"jeem",
    "ح":"ha",
    "خ":"kha"
};

/* ================= PRELOAD ================= */

function preload() {

    // SKY MODES
    SKY_MODES.forEach(sky => {
        this.load.image(sky, `assets/images/${sky}.webp`);
    });

    // ENV
    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    // CLOUDS
    this.load.image("cloud1","assets/images/clouds_1.webp");
    this.load.image("cloud2","assets/images/clouds_2.png");

    // PLANE SKINS
    this.load.image("plane_trainer","assets/images/plane_trainer.png");
    this.load.image("plane_falcon","assets/images/plane_falcon.png");
    this.load.image("plane_glider","assets/images/plane_glider.png");
    this.load.image("plane_gold","assets/images/plane_gold.png");
    this.load.image("plane_legend","assets/images/plane_legend.png");

    // UI
    this.load.image("ui_panel","assets/images/ui_panel.webp");

    // AUDIO
    this.load.audio("engine","assets/sound/engine.mp3");
    this.load.audio("wind","assets/sound/wind.mp3");

    Object.values(AUDIO_MAP).forEach(key => {
        this.load.audio(key, `assets/sound/letters/${key}.mp3`);
    });
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;

    LANES.push(config.width * 0.25);
    LANES.push(config.width * 0.50);
    LANES.push(config.width * 0.75);

    /* SKY */
    skyImage = this.add.image(0,0,"sky_day")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    /* CLOUDS */
    cloud1 = this.add.tileSprite(0,100,config.width,200,"cloud1").setOrigin(0);
    cloud2 = this.add.tileSprite(0,180,config.width,200,"cloud2").setOrigin(0);

    /* AIRPORT */
    this.add.image(0, config.height-220, "airport")
        .setOrigin(0)
        .setDisplaySize(config.width, 300);

    this.add.image(0, config.height-120, "runway")
        .setOrigin(0)
        .setDisplaySize(config.width, 120);

    /* PLANE */
    plane = this.physics.add.image(LANES[1], config.height * 0.75, "plane_trainer");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    /* INPUT */
    this.input.keyboard.on("keydown-LEFT", () => moveLane(-1));
    this.input.keyboard.on("keydown-RIGHT", () => moveLane(1));
    this.input.keyboard.on("keydown-SPACE", () => activateBoost());

    startGame(this);
}

/* ================= GAME FLOW ================= */

function startGame(scene) {

    state = "FLIGHT";

    spawnLetters(scene);

    nextTarget();

    startAudio();

    startSkyCycle();
}

/* ================= LETTER SYSTEM ================= */

function spawnLetters(scene) {

    letters.forEach(l => l.destroy());
    letters = [];

    for (let i = 0; i < LETTERS.length; i++) {

        let lane = Math.floor(Math.random() * 3);

        let txt = scene.add.text(
            LANES[lane],
            -i * 120,
            LETTERS[i],
            {
                fontSize: "80px",
                color: "#FFD93D",
                stroke: "#000",
                strokeThickness: 8
            }
        );

        scene.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        txt.state = "active";

        letters.push(txt);
    }

    scene.physics.add.overlap(plane, letters, collect, null, scene);
}

/* ================= TARGET SYSTEM ================= */

function nextTarget() {

    let newLetter;

    do {
        newLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    } while (newLetter === targetLetter);

    targetLetter = newLetter;

    if (!targetText) {
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

function collect(planeObj, letter) {

    if (letter.state !== "active") return;

    letter.state = "used";

    if (letter.text === targetLetter) {

        score++;

        spawnParticles(letter.x, letter.y);
        letter.destroy();

        nextTarget();

    } else {

        sceneRef.cameras.main.shake(80,0.01);

        letter.y = -200;
        letter.state = "active";
    }
}

/* ================= UPDATE ================= */

function update() {

    if (state !== "FLIGHT") return;

    let currentSpeed = boostActive ? speed * 2 : speed;

    letters.forEach(l => {

        l.y += currentSpeed;

        if (l.y > config.height + 100) {
            l.y = -100;
            l.state = "active";
            l.x = LANES[Math.floor(Math.random()*3)];
        }
    });

    cloud1.tilePositionX += 0.2;
    cloud2.tilePositionX += 0.5;
}

/* ================= MOVEMENT ================= */

function moveLane(dir) {

    laneIndex += dir;

    if (laneIndex < 0) laneIndex = 0;
    if (laneIndex > 2) laneIndex = 2;

    plane.x = LANES[laneIndex];
}

/* ================= BOOST ================= */

function activateBoost() {

    if (boostActive) return;

    boostActive = true;
    boostTimer = 120;

    sceneRef.cameras.main.flash(80);
}

/* ================= AUDIO ================= */

function startAudio() {

    sceneRef.sound.play("engine", { loop:true, volume:0.4 });
    sceneRef.sound.play("wind", { loop:true, volume:0.3 });
}

function playAudio(letter) {

    const key = AUDIO_MAP[letter];

    if (key) sceneRef.sound.play(key);
}

/* ================= SKY SYSTEM ================= */

function startSkyCycle() {

    setInterval(() => {

        skyIndex = (skyIndex + 1) % SKY_MODES.length;

        skyImage.setTexture(SKY_MODES[skyIndex]);

    }, 25000);
}

/* ================= PARTICLES ================= */

function spawnParticles(x,y) {

    for (let i=0;i<8;i++) {

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
