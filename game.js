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
let GAME_MODE = "RUNNING";

/* ================= PLAYER (VERTICAL RUNNER STYLE) ================= */

let plane;
let velX = 0, velY = 0;

let targetX = 640;
let targetY = 520;

/* ================= LETTERS ================= */

let letters = [];
let targetLetter;
let targetText;

/* ================= SKY ASSETS ================= */

let sky_day;
let sky_sunset;
let sky_night;

let skyState = 0; 
// 0 = day, 1 = sunset, 2 = night
let skyTimer = 0;

/* ================= INPUT ================= */

let INPUT = {
    left:false,
    right:false,
    up:false,
    down:false
};

/* ================= PRELOAD ================= */

function preload() {

    this.load.image("sky_day", "assets/images/sky_day.webp");
    this.load.image("sky_sunset", "assets/images/sky_sunset.webp");
    this.load.image("sky_night", "assets/images/sky_night.webp");

    this.load.image("plane", "assets/images/plane_trainer.png");

    this.load.image("cloud1", "assets/images/clouds_1.png");
    this.load.image("cloud2", "assets/images/clouds_2.png");
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;

    buildSky();
    setupInput();

    spawnPlane();
    spawnLetters();
    pickTarget();
}

/* ================= SKY SYSTEM (ASSET BASED - SAFE) ================= */

function buildSky() {

    sky_day.set = sceneRef.add.image(0, 0, "sky_day")
        .setOrigin(0)
        .setDisplaySize(1280, 720)
        .setAlpha(1);

    sky_sunset = sceneRef.add.image(0, 0, "sky_sunset")
        .setOrigin(0)
        .setDisplaySize(1280, 720)
        .setAlpha(0);

    sky_night = sceneRef.add.image(0, 0, "sky_night")
        .setOrigin(0)
        .setDisplaySize(1280, 720)
        .setAlpha(0);

    sceneRef.cloud1 = sceneRef.add.tileSprite(0, 120, 1280, 200, "cloud1")
        .setOrigin(0)
        .setAlpha(0.35);

    sceneRef.cloud2 = sceneRef.add.tileSprite(0, 260, 1280, 200, "cloud2")
        .setOrigin(0)
        .setAlpha(0.25);
}

/* ================= INPUT (TV SAFE) ================= */

function setupInput() {

    this.input.keyboard.on("keydown", (e) => {

        if (e.code === "ArrowLeft") INPUT.left = true;
        if (e.code === "ArrowRight") INPUT.right = true;
        if (e.code === "ArrowUp") INPUT.up = true;
        if (e.code === "ArrowDown") INPUT.down = true;
    });

    this.input.keyboard.on("keyup", (e) => {

        if (e.code === "ArrowLeft") INPUT.left = false;
        if (e.code === "ArrowRight") INPUT.right = false;
        if (e.code === "ArrowUp") INPUT.up = false;
        if (e.code === "ArrowDown") INPUT.down = false;
    });
}

/* ================= PLANE ================= */

function spawnPlane() {

    plane = sceneRef.physics.add.image(640, 520, "plane");

    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    targetX = plane.x;
    targetY = plane.y;
}

/* ================= LETTERS ================= */

function spawnLetters() {

    letters.forEach(l => l.destroy());
    letters = [];

    for (let i = 0; i < 7; i++) {

        let txt = sceneRef.add.text(
            Phaser.Math.Between(150, 1130),
            Phaser.Math.Between(50, 600),
            String.fromCharCode(0x0627 + Math.floor(Math.random() * 10)),
            {
                fontSize: "64px",
                color: "#ffffff"
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET ================= */

function pickTarget() {

    if (letters.length === 0) return;

    targetLetter = letters[Math.floor(Math.random() * letters.length)].text;

    if (!targetText) {
        targetText = sceneRef.add.text(20, 20, "", {
            fontSize: "40px",
            color: "#fff"
        });
    }

    targetText.setText("TARGET: " + targetLetter);
}

/* ================= UPDATE ================= */

function update() {

    updateSky();

    if (GAME_MODE !== "RUNNING") return;

    updatePlane();
    updateLetters();
}

/* ================= SKY TRANSITION (SAFE + VISUAL) ================= */

function updateSky() {

    skyTimer += 0.0005;

    let cycle = Math.sin(skyTimer);

    // DAY → SUNSET → NIGHT blending
    if (cycle < 0.3) skyState = 0;
    else if (cycle < 0.6) skyState = 1;
    else skyState = 2;

    sky_day.set.alpha = (skyState === 0) ? 1 : 0;
    sky_sunset.alpha = (skyState === 1) ? 1 : 0;
    sky_night.alpha = (skyState === 2) ? 1 : 0;

    sceneRef.cloud1.tilePositionX += 0.3;
    sceneRef.cloud2.tilePositionX += 0.15;
}

/* ================= PLANE (VERTICAL RUNNER FEEL) ================= */

function updatePlane() {

    let speed = 6;

    if (INPUT.left) targetX -= speed;
    if (INPUT.right) targetX += speed;
    if (INPUT.up) targetY -= speed;
    if (INPUT.down) targetY += speed;

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

/* ================= LETTER MOVEMENT ================= */

function updateLetters() {

    letters.forEach(l => {

        l.y += 2.3;

        if (l.y > 720) {
            l.y = -50;
            l.x = Phaser.Math.Between(150, 1130);
        }
    });
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    spawnBurst(letter.x, letter.y);

    letter.destroy();

    letters = letters.filter(l => l !== letter);

    spawnLetters();
    pickTarget();
}

/* ================= FX ================= */

function spawnBurst(x, y) {

    for (let i = 0; i < 10; i++) {

        let p = sceneRef.add.circle(x, y, 6, 0xffffff);

        sceneRef.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-80, 80),
            y: y + Phaser.Math.Between(-80, 80),
            alpha: 0,
            duration: 400,
            onComplete: () => p.destroy()
        });
    }
}
