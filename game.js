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

let plane;
let letters = [];
let target;
let targetText;

const CURRICULUM = [
    { type: "letters", data: ["ا","ب","ت","ث","ج","ح","خ"] }
];

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#4D96FF","#FF9F1C"];

/* ================= PRELOAD ================= */

function preload() {
    this.load.image("sky","assets/images/sky_day.webp");
    this.load.image("airport","assets/images/airport.webp");
    this.load.image("runway","assets/images/runway.webp");

    this.load.image("plane_trainer","assets/images/plane_trainer.png");

    this.load.audio("engine","assets/sound/engine.mp3");
}

/* ================= CREATE ================= */

function create() {

    this.add.image(0,0,"sky").setOrigin(0).setDisplaySize(config.width,config.height);

    this.add.image(0,config.height-220,"airport")
        .setOrigin(0)
        .setDisplaySize(config.width,300);

    this.add.image(0,config.height-120,"runway")
        .setOrigin(0)
        .setDisplaySize(config.width,120);

    plane = this.physics.add.image(200, config.height/2, "plane_trainer");
    plane.setScale(0.3);
    plane.setCollideWorldBounds(true);

    this.input.on("pointermove", (p) => {
        plane.x = p.x;
        plane.y = p.y;
    });

    loadLetters(this);
}

/* ================= LETTERS ================= */

function loadLetters(scene) {

    let stage = CURRICULUM[0].data;

    stage.forEach((l, i) => {

        let txt = scene.add.text(
            120 + i * 120,
            120,
            l,
            {
                fontSize: "72px",
                fontFamily: "Arial",
                color: Phaser.Utils.Array.GetRandom(COLORS),
                stroke: "#ffffff",
                strokeThickness: 8
            }
        );

        scene.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    });

    scene.physics.add.overlap(plane, letters, collect, null, scene);
}

/* ================= UPDATE ================= */

function update() {
    // KEEP SIMPLE — no camera bugs
}

/* ================= COLLECT ================= */

function collect(planeObj, letter) {

    if (!letter.active) return;

    this.cameras.main.flash(80);

    letter.destroy();

    if (letters.every(l => !l.active)) {
        console.log("Stage complete");
    }
}
