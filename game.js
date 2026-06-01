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
let laneIndex = 1;

const LANES = [];

let state = "IDLE";

let letters = [];
let targetLetter;
let targetText;

let speed = 4;
let boostActive = false;
let boostTimer = 0;

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

    this.load.image("sky","assets/images/sky_day.webp");
    this.load.image("airport","assets/images/airport.webp");
    this.load.image("runway","assets/images/runway.webp");

    this.load.image("plane","assets/images/plane_trainer.png");

    this.load.audio("engine","assets/sound/engine.mp3");
    this.load.audio("wind","assets/sound/wind.mp3");
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;

    LANES.push(config.width * 0.25);
    LANES.push(config.width * 0.50);
    LANES.push(config.width * 0.75);

    /* SKY */
    this.add.image(0,0,"sky")
        .setOrigin(0)
        .setDisplaySize(config.width, config.height);

    /* AIRPORT */
    this.add.image(0, config.height-220, "airport")
        .setOrigin(0)
        .setDisplaySize(config.width, 300);

    this.add.image(0, config.height-120, "runway")
        .setOrigin(0)
        .setDisplaySize(config.width, 120);

    /* PLANE */
    plane = this.physics.add.image(LANES[1], config.height * 0.75, "plane");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    /* INPUT */
    this.input.keyboard.on("keydown-LEFT", () => moveLane(-1));
    this.input.keyboard.on("keydown-RIGHT", () => moveLane(1));

    this.input.keyboard.on("keydown-SPACE", () => activateBoost());

    this.input.on("pointermove", (p) => {
        if (p.x < config.width/2) moveLane(-1);
        else moveLane(1);
    });

    /* START GAME FLOW */
    startTakeoff(this);
}

/* ================= TAKEOFF ================= */

function startTakeoff(scene) {

    state = "TAKEOFF";

    scene.tweens.add({
        targets: plane,
        y: config.height * 0.6,
        angle: -10,
        duration: 2000,
        onComplete: () => {
            startFlight(scene);
        }
    });
}

/* ================= FLIGHT ================= */

function startFlight(scene) {

    state = "FLIGHT";

    spawnLetters(scene);

    targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];

    targetText = scene.add.text(20,20,"TARGET: "+targetLetter,{
        fontSize:"40px",
        color:"#fff",
        fontFamily:"Arial"
    });
}

/* ================= LETTERS ================= */

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
                fontFamily: "Arial",
                color: "#FFD93D",
                stroke: "#fff",
                strokeThickness: 8
            }
        );

        scene.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        txt.lane = lane;

        letters.push(txt);
    }

    scene.physics.add.overlap(plane, letters, collect, null, scene);
}

/* ================= UPDATE ================= */

function update() {

    if (state !== "FLIGHT") return;

    let currentSpeed = boostActive ? speed * 2 : speed;

    letters.forEach(l => {

        l.y += currentSpeed;

        if (l.y > config.height + 100) {
            l.y = -100;
            l.lane = Math.floor(Math.random() * 3);
            l.x = LANES[l.lane];
        }
    });

    if (boostActive) {
        boostTimer--;
        if (boostTimer <= 0) boostActive = false;
    }
}

/* ================= MOVE LANES ================= */

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

/* ================= COLLECT ================= */

function collect(planeObj, letter) {

    if (!letter.active) return;

    if (letter.text === targetLetter) {

        letter.destroy();

        sceneRef.cameras.main.flash(80);

        spawnParticles(letter.x, letter.y);

    } else {

        sceneRef.cameras.main.shake(100, 0.01);
    }
}

/* ================= PARTICLE FX (NO IMAGE FILES) ================= */

function spawnParticles(x, y) {

    for (let i = 0; i < 8; i++) {

        let p = sceneRef.add.circle(x, y, 6, 0xFFD93D);

        sceneRef.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-80, 80),
            y: y + Phaser.Math.Between(-80, 80),
            alpha: 0,
            duration: 600,
            onComplete: () => p.destroy()
        });
    }
}
