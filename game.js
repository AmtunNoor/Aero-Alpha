const config = {
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    },

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
let targetX = 0, targetY = 0;

/* ================= LETTERS ================= */

let letters = [];
let targetLetter;
let targetText;

/* ================= SKY FIX (NO STRIPES) ================= */

let bg;
let cloud1;
let cloud2;

/* ================= INPUT ================= */

let INPUT = { left:false, right:false, up:false, down:false };

/* ================= AUDIO SAFE ================= */

let AUDIO_QUEUE = [];
let AUDIO_BUSY = false;

/* ================= PRELOAD ================= */

function preload() {

    this.load.image("sky", "assets/images/sky_day.webp");
    this.load.image("cloud1", "assets/images/clouds_1.png");
    this.load.image("cloud2", "assets/images/clouds_2.png");
    this.load.image("plane", "assets/images/plane_trainer.png");
}

/* ================= CREATE ================= */

function create() {

    sceneRef = this;

    buildBackground();
    setupInput();
    spawnPlane();
    spawnLetters();
    pickTarget();
}

/* ================= FIXED BACKGROUND (NO GREY STRIPES) ================= */

function buildBackground() {

    // FULL SCREEN SAFE BACKDROP (critical fix)
    bg = sceneRef.add.rectangle(0, 0, 1280, 720, 0x87CEEB)
        .setOrigin(0);

    cloud1 = sceneRef.add.tileSprite(0, 120, 1280, 200, "cloud1")
        .setOrigin(0)
        .setAlpha(0.35);

    cloud2 = sceneRef.add.tileSprite(0, 260, 1280, 200, "cloud2")
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

        if (e.code === "Enter" && GAME_MODE === "MENU") {
            GAME_MODE = "RUNNING";
        }
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

    plane = sceneRef.physics.add.image(640, 500, "plane");

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

        let t = sceneRef.add.text(
            Phaser.Math.Between(100, 1180),
            Phaser.Math.Between(100, 600),
            String.fromCharCode(0x0627 + Math.floor(Math.random() * 10)),
            { fontSize:"64px", color:"#ffffff" }
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

    targetLetter = letters[Math.floor(Math.random() * letters.length)].text;

    if (!targetText) {
        targetText = sceneRef.add.text(20, 20, "", {
            fontSize:"40px",
            color:"#fff"
        });
    }

    targetText.setText("TARGET: " + targetLetter);
}

/* ================= UPDATE LOOP ================= */

function update() {

    if (GAME_MODE !== "RUNNING") return;

    updatePlane();
    updateLetters();

    // SAFE cloud movement (no glitch risk)
    cloud1.tilePositionX += 0.3;
    cloud2.tilePositionX += 0.15;
}

/* ================= PLANE CONTROL ================= */

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

/* ================= LETTER UPDATE ================= */

function updateLetters() {

    letters.forEach(l => {

        l.y += 2.2;

        if (l.y > 720) {
            l.y = -50;
            l.x = Phaser.Math.Between(100, 1180);
        }
    });
}

/* ================= COLLECT ================= */

function collect(_, letter) {

    if (!letter) return;

    spawnBurst(letter.x, letter.y);

    letter.destroy();

    letters = letters.filter(l => l !== letter);

    spawnLetters();
    pickTarget();
}

/* ================= BURST ================= */

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
