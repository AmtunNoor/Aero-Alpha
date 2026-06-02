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

/* ================= CORE STATE ================= */

let sceneRef;
let GAME_MODE = "MENU";

/* ================= PLAYER ================= */

let plane;
let velX = 0, velY = 0;

let targetX = 0;
let targetY = 0;

/* ================= GAME OBJECTS ================= */

let letters = [];
let targetLetter;
let targetText;

/* ================= SKY SYSTEM ================= */

let sky;
let cloudLayer1;
let cloudLayer2;

let skyTime = 0; // 0 → day, 1 → night

/* ================= INPUT SYSTEM (TV READY) ================= */

let INPUT = {
    left:false,
    right:false,
    up:false,
    down:false,
    confirm:false
};

/* ================= AUDIO ================= */

let AUDIO_QUEUE = [];
let AUDIO_BUSY = false;

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
    this.load.image("plane", "assets/images/plane_trainer.png");
    this.load.image("cloud1", "assets/images/clouds_1.png");
    this.load.image("cloud2", "assets/images/clouds_2.png");
}

/* ================= CREATE ================= */

function create() {
    sceneRef = this;

    buildSky();
    spawnPlane();
    spawnLetters();
    pickTarget();

    setupInput();
}

/* ================= SKY PREMIUM SYSTEM ================= */

function buildSky() {
    sky = sceneRef.add.rectangle(
        config.width/2,
        config.height/2,
        config.width,
        config.height,
        0x87CEEB
    );

    cloudLayer1 = sceneRef.add.tileSprite(
        0, 120,
        config.width,
        200,
        "cloud1"
    ).setOrigin(0).setAlpha(0.35);

    cloudLayer2 = sceneRef.add.tileSprite(
        0, 260,
        config.width,
        200,
        "cloud2"
    ).setOrigin(0).setAlpha(0.25);
}

/* ================= INPUT SYSTEM ================= */

function setupInput() {

    sceneRef.input.keyboard.on("keydown", (e) => {

        switch(e.code) {
            case "ArrowLeft":
            case "KeyA": INPUT.left = true; break;

            case "ArrowRight":
            case "KeyD": INPUT.right = true; break;

            case "ArrowUp":
            case "KeyW": INPUT.up = true; break;

            case "ArrowDown":
            case "KeyS": INPUT.down = true; break;

            case "Enter":
                INPUT.confirm = true;
                if (GAME_MODE === "MENU") startGame();
                break;
        }
    });

    sceneRef.input.keyboard.on("keyup", (e) => {

        switch(e.code) {
            case "ArrowLeft":
            case "KeyA": INPUT.left = false; break;

            case "ArrowRight":
            case "KeyD": INPUT.right = false; break;

            case "ArrowUp":
            case "KeyW": INPUT.up = false; break;

            case "ArrowDown":
            case "KeyS": INPUT.down = false; break;

            case "Enter":
                INPUT.confirm = false;
                break;
        }
    });
}

/* ================= START GAME ================= */

function startGame() {
    GAME_MODE = "RUNNING";
}

/* ================= PLANE ================= */

function spawnPlane() {

    plane = sceneRef.physics.add.image(
        config.width/2,
        config.height*0.7,
        "plane"
    );

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
            Phaser.Math.Between(100, config.width-100),
            Phaser.Math.Between(100, config.height-150),
            LETTERS[Math.floor(Math.random() * LETTERS.length)],
            {
                fontSize:"70px",
                color:"#fff"
            }
        );

        sceneRef.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(plane, letters, collect);
}

/* ================= TARGET SYSTEM ================= */

function pickTarget() {

    if (letters.length === 0) return;

    targetLetter =
        letters[Math.floor(Math.random() * letters.length)].text;

    if (!targetText) {
        targetText = sceneRef.add.text(20, 20, "", {
            fontSize:"50px",
            color:"#fff"
        });
    }

    targetText.setText("TARGET: " + targetLetter);

    playAudio(targetLetter);
}

/* ================= UPDATE LOOP ================= */

function update() {

    updateSky();

    if (GAME_MODE !== "RUNNING") return;

    updateInput();
    updatePlane();

    updateLetters();

}

/* ================= SKY ANIMATION ================= */

function updateSky() {

    skyTime += 0.0003;

    let cycle = (Math.sin(skyTime) + 1) / 2;

    // day → night blend
    let color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x87CEEB),
        Phaser.Display.Color.ValueToColor(0x0B0F2A),
        1,
        cycle
    );

    sky.fillColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

    cloudLayer1.tilePositionX += 0.4;
    cloudLayer2.tilePositionX += 0.2;
}

/* ================= INPUT → MOVEMENT ================= */

function updateInput() {

    let speed = 6;

    if (INPUT.left) targetX -= speed;
    if (INPUT.right) targetX += speed;
    if (INPUT.up) targetY -= speed;
    if (INPUT.down) targetY += speed;
}

/* ================= PLANE PHYSICS ================= */

function updatePlane() {

    let dx = targetX - plane.x;
    let dy = targetY - plane.y;

    velX += dx * 0.05;
    velY += dy * 0.05;

    velX *= 0.85;
    velY *= 0.85;

    plane.x += velX;
    plane.y += velY;

    plane.angle = Phaser.Math.Clamp(velX * 0.2, -15, 15);
}

/* ================= LETTER MOVEMENT ================= */

function updateLetters() {

    letters.forEach(l => {
        l.y += 2.2;

        if (l.y > config.height + 50) {
            l.y = -50;
            l.x = Phaser.Math.Between(100, config.width-100);
        }
    });
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

/* ================= AUDIO ================= */

function playAudio(letter) {

    let keyMap = {
        "ا":"alif","ب":"ba","ت":"ta","ث":"thaa","ج":"jeem","ح":"haa",
        "خ":"kha","د":"daal","ذ":"zaal","ر":"raa","ز":"zaa","س":"seen",
        "ش":"sheen","ص":"saad","ض":"dad","ط":"toa","ظ":"zoa","ع":"ain",
        "غ":"ghain","ف":"fa","ق":"qaaf","ك":"kaf","ل":"laam","م":"meem",
        "ن":"noon","ه":"ha","و":"waw","ي":"yaa"
    };

    const key = keyMap[letter];
    if (!key) return;

    AUDIO_QUEUE.push(key);
    processAudio();
}

function processAudio() {

    if (AUDIO_BUSY || AUDIO_QUEUE.length === 0) return;

    AUDIO_BUSY = true;

    const key = AUDIO_QUEUE.shift();

    const sound = sceneRef.sound.add(key);

    sound.once("complete", () => {
        AUDIO_BUSY = false;
        processAudio();
    });

    sound.play();
}

/* ================= FX ================= */

function spawnBurst(x, y) {

    for (let i = 0; i < 16; i++) {

        const p = sceneRef.add.circle(x, y, 8, 0xffffff);

        sceneRef.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-100, 100),
            y: y + Phaser.Math.Between(-100, 100),
            alpha: 0,
            duration: 450,
            onComplete: () => p.destroy()
        });
    }
}
