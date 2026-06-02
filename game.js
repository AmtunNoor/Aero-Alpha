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

let GAME_MODE = "RUNNER"; 
// RUNNER | FREEFLIGHT

let plane;
let planeTargetX = 0;
let planeTargetY = 0;

let velX = 0;
let velY = 0;

let letters = [];
let targetLetter;
let targetText;

let speed = 4;
let boostActive = false;
let boostTimer = 0;

let skyImage;
let sprAirport, sprRunway;

let cloud1, cloud2;

let LANES = [];

/* ================= 28 LETTERS ================= */

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
    this.load.image("sky_sunset","assets/images/sky_sunset.webp");
    this.load.image("sky_night","assets/images/sky_night.webp");

    this.load.image("airport","assets/images/airport.png");
    this.load.image("runway","assets/images/runway.png");

    this.load.image("cloud1","assets/images/clouds_1.png");
    this.load.image("cloud2","assets/images/clouds_2.png");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");
    this.load.image("background_menu","assets/images/background_menu.png");

  /*  Object.values(AUDIO_MAP).forEach(k => {
        this.load.audio(k, `assets/sound/letters/${k}.mp3`);
    }); */
}

/* ================= CREATE ================= */
function create() {

    sceneRef = this;

    generateLanes();

    showMenu();

}

/* ================= BUILD WORLD ================= */
function buildWorld() {

    skyImage = sceneRef.add.image(
        0,
        0,
        "sky_day"
    )
    .setOrigin(0)
    .setDisplaySize(
        config.width,
        config.height
    );

    cloud1 = sceneRef.add.tileSprite(
        0,
        120,
        config.width,
        200,
        "cloud1"
    ).setOrigin(0);

    cloud2 = sceneRef.add.tileSprite(
        0,
        220,
        config.width,
        200,
        "cloud2"
    ).setOrigin(0);

    cloud1.setAlpha(0.3);
    cloud2.setAlpha(0.2);

    sprAirport = sceneRef.add.image(
        0,
        config.height - 220,
        "airport"
    )
    .setOrigin(0)
    .setDisplaySize(
        config.width,
        300
    );

    sprRunway = sceneRef.add.image(
        0,
        config.height - 120,
        "runway"
    )
    .setOrigin(0)
    .setDisplaySize(
        config.width,
        120
    );

    plane = sceneRef.physics.add.image(
        config.width / 2,
        config.height * 0.75,
        "plane_trainer"
    );

    plane.setScale(0.3);

    plane.setCollideWorldBounds(true);

    planeTargetX = plane.x;
    planeTargetY = plane.y;

    sceneRef.tweens.add({
        targets: plane,
        y: plane.y - 6,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    sceneRef.input.on("pointermove", (p) => {

        planeTargetX = Phaser.Math.Clamp(
            p.x,
            config.width * 0.1,
            config.width * 0.9
        );

        planeTargetY =
            config.height * 0.7;

    });

}
/* ================= MODE SWITCH ================= */

function switchMode(mode) {

    GAME_MODE = mode;

    letters.forEach(l => l.destroy());
    letters = [];

    nextTarget();
    spawnLetters();
}

/* ================= GAME START ================= */
function startGame() {

    targetLetter =
        LETTERS[
            Phaser.Math.Between(
                0,
                LETTERS.length - 1
            )
        ];

    targetText = sceneRef.add.text(
        20,
        20,
        "",
        {
            fontSize:"64px",
            color:"#FFD93D",
            stroke:"#000",
            strokeThickness:10
        }
    );

    spawnLetters();

    nextTarget();
}
/* ================= TARGET SYSTEM ================= */
function nextTarget() {

    // Get currently active letters
    const activeLetters = letters
        .filter(l => l && l.active !== false)
        .map(l => l.text);

    // Safety rebuild
    if (activeLetters.length === 0) {

        spawnLetters();

        return;
    }

    let newTarget =
        activeLetters[
            Phaser.Math.Between(
                0,
                activeLetters.length - 1
            )
        ];

    targetLetter = newTarget;

    if (targetText) {
        targetText.setText("الحرف: " + targetLetter);
    }

    playAudio(targetLetter);
}
/* ================= LETTER SPAWN ================= */
function spawnLetters() {

    letters.forEach(l => {

        if (l) l.destroy();
    });

    letters = [];

    const pool =
        generateLetterPool(
            targetLetter || LETTERS[0]
        );

    for (let i = 0; i < pool.length; i++) {

        let txt = sceneRef.add.text(

            Phaser.Math.Between(
                config.width * 0.15,
                config.width * 0.85
            ),

            -i * 180,

            pool[i],

            {
                fontSize: "96px",
                color: "#FFD93D",
                stroke: "#000",
                strokeThickness: 12
            }
        );

        sceneRef.physics.add.existing(txt);

        txt.body.setAllowGravity(false);

        txt.baseX = txt.x;

        txt.wave =
            Phaser.Math.Between(0,1000);

        letters.push(txt);
    }

    sceneRef.physics.add.overlap(
        plane,
        letters,
        collect
    );
}
/* ================= UPDATE ================= */

function update() {

    updatePlane();

    if (GAME_MODE === "RUNNER") {
        updateRunner();
    } else {
        updateFreeFlight();
    }

    cloud1.tilePositionX += 0.3;
    cloud2.tilePositionX += 0.5;
}

/* ================= RUNNER MODE ================= */

function updateRunner() {

    let s = boostActive ? speed * 2 : speed;

    letters.forEach(l => {

        l.y += s;
        l.x = l.baseX + Math.sin((l.y + l.wave) * 0.01) * 50;

        if (l.y > config.height + 100) {

            l.y = -150;

            let pool = generateLetterPool(targetLetter);
            l.text = pool[Math.floor(Math.random() * pool.length)];

            l.baseX = Math.random() * config.width;
        }
    });
}

/* ================= FREE FLIGHT MODE ================= */
function updateFreeFlight() {

    letters.forEach(l => {

        l.x += Math.sin(
            (Date.now() + l.wave) * 0.001
        ) * 0.6;

        l.y += Math.cos(
            (Date.now() + l.wave) * 0.001
        ) * 0.4;
    });
}

/* ================= PREMIUM PLANE ================= */
function updatePlane() {

    let dx =
        planeTargetX - plane.x;

    let dy =
        planeTargetY - plane.y;

    velX += dx * 0.05;
    velY += dy * 0.05;

    velX *= 0.88;
    velY *= 0.88;

    plane.x += velX;
    plane.y += velY;

    plane.angle =
        Phaser.Math.Clamp(
            velX * 0.25,
            -12,
            12
        );
}
/* ================= SHOW MENU ================= */
function showMenu() {

    // Background
    const bg = sceneRef.add.image(
        config.width / 2,
        config.height / 2,
        "background_menu"
    );

    bg.setDisplaySize(
        config.width,
        config.height
    );

    // Dark overlay for readability
    const overlay = sceneRef.add.rectangle(
        config.width / 2,
        config.height / 2,
        config.width,
        config.height,
        0x000000,
        0.35
    );

    // Game title
    const title = sceneRef.add.text(
        config.width / 2,
        config.height * 0.18,
        "AERO ALPHA",
        {
            fontSize: "72px",
            fontStyle: "bold",
            color: "#FFD93D",
            stroke: "#000000",
            strokeThickness: 10
        }
    )
    .setOrigin(0.5);

    // Subtitle
    const subtitle = sceneRef.add.text(
        config.width / 2,
        config.height * 0.28,
        "Learn Arabic Letters Through Flight",
        {
            fontSize: "28px",
            color: "#FFFFFF",
            stroke: "#000000",
            strokeThickness: 5
        }
    )
    .setOrigin(0.5);

    // Runner button
    const runnerBtn = sceneRef.add.text(
        config.width / 2,
        config.height * 0.50,
        "✈ Sky Runner",
        {
            fontSize: "52px",
            color: "#FFD93D",
            backgroundColor: "#1E1E1E",
            padding: {
                left: 30,
                right: 30,
                top: 15,
                bottom: 15
            }
        }
    )
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    // Free Flight button
    const freeBtn = sceneRef.add.text(
        config.width / 2,
        config.height * 0.65,
        "🛩 Free Flight",
        {
            fontSize: "52px",
            color: "#FFD93D",
            backgroundColor: "#1E1E1E",
            padding: {
                left: 30,
                right: 30,
                top: 15,
                bottom: 15
            }
        }
    )
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    // Hover animation
    [runnerBtn, freeBtn].forEach(btn => {

        btn.on("pointerover", () => {

            sceneRef.tweens.add({
                targets: btn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 120
            });

        });

        btn.on("pointerout", () => {

            sceneRef.tweens.add({
                targets: btn,
                scaleX: 1,
                scaleY: 1,
                duration: 120
            });

        });

    });

    // Runner mode
    runnerBtn.on("pointerdown", () => {

        GAME_MODE = "RUNNER";

        bg.destroy();
        overlay.destroy();
        title.destroy();
        subtitle.destroy();
        runnerBtn.destroy();
        freeBtn.destroy();

        buildWorld();
        startGame();
    });

    // Free Flight mode
    freeBtn.on("pointerdown", () => {

        GAME_MODE = "FREEFLIGHT";

        bg.destroy();
        overlay.destroy();
        title.destroy();
        subtitle.destroy();
        runnerBtn.destroy();
        freeBtn.destroy();

        buildWorld();
        startGame();
    });
}
/* ================= TARGET SAFETY ================= */

function ensureTargetExists() {

    if (!letters.some(l => l.text === targetLetter)) {
        spawnLetters();
    }
}

/* ================= LETTER POOL ================= */
function generateLetterPool(target) {

    let pool = [];

    // Always include target twice
    pool.push(target);
    pool.push(target);

    while (pool.length < 7) {

        let randomLetter =
            LETTERS[
                Phaser.Math.Between(
                    0,
                    LETTERS.length - 1
                )
            ];

        pool.push(randomLetter);
    }

    Phaser.Utils.Array.Shuffle(pool);

    return pool;
}
/* ================= COLLECT ================= */
function collect(_, letter) {

    if (!letter) return;

    if (letter.text === targetLetter) {

        spawnParticles(
            letter.x,
            letter.y
        );

        letters =
            letters.filter(
                l => l !== letter
            );

        letter.destroy();

        // Refill pool
        if (letters.length < 6) {

            spawnLetters();
        }

        nextTarget();

    } else {

        sceneRef.cameras.main.shake(
            60,
            0.004
        );
    }
}
/* ================= AUDIO ================= */
function playAudio(letter) {

    const key =
        AUDIO_MAP[letter];

    if (!key) return;

    const existing =
        sceneRef.sound.get(key);

    if (existing) {

        existing.stop();
    }

    sceneRef.sound.play(
        key,
        {
            volume: 1
        }
    );
}
/* ================= LANE SYSTEM ================= */

function generateLanes() {

    LANES = [];
    let count = 5;

    for (let i = 1; i <= count; i++) {
        LANES.push((config.width / (count + 1)) * i);
    }
}

/* ================= PARTICLES ================= */

function spawnParticles(x,y) {

    for (let i = 0; i < 18; i++) {

        let p = sceneRef.add.circle(x, y, 12, 0xFFD93D);

        sceneRef.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-180,180),
            y: y + Phaser.Math.Between(-180,180),
            alpha: 0,
            duration: 700,
            onComplete: () => p.destroy()
        });
    }
}
