const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default:"arcade", arcade:{ debug:false } },
    scene: { preload, create, update }
};

new Phaser.Game(config);

/* ================= WORLD STATE ================= */

const WORLD = {
    time: 0,
    speed: 0.02,
    phase: "day"
};

/* ================= CURRICULUM ================= */

const CURRICULUM = [
{ type:"letters", data:["ا","ب","ت","ث","ج","ح","خ"] },
{ type:"words", data:["باب","بيت","قلم"] },
{ type:"sentences", data:["هذا باب","أنا أكتب"] }
];

let stageIndex = 0;

/* ================= GAME OBJECTS ================= */

let plane;
let letters = [];
let target;
let targetText;

let clouds = [];

let engineSound, windSound;

/* ================= AUDIO MAP ================= */

const AUDIO_MAP = {
 "ا":"alif","ب":"ba","ت":"ta","ث":"thaa","ج":"jeem",
 "ح":"ha","خ":"kha","د":"daal","ذ":"zaal","ر":"raa",
 "ز":"zaa","س":"seen","ش":"sheen","ص":"saad","ض":"dad",
 "ط":"toa","ظ":"zaa","ع":"ain","غ":"ghain","ف":"fa",
 "ق":"qaaf","ك":"kaf","ل":"laam","م":"meem","ن":"noon",
 "ه":"haa","و":"waw","ي":"yaa"
};

/* ================= PRELOAD ================= */

function preload(){
    this.load.image("sky","assets/images/sky_day.webp");
    this.load.image("airport","assets/images/airport.webp");
    this.load.image("runway","assets/images/runway.webp");
    this.load.image("plane","assets/images/plane_trainer.webp");

    this.load.audio("engine","assets/sound/engine.mp3");
    this.load.audio("wind","assets/sound/wind.mp3");
}

/* ================= CREATE ================= */

function create(){

    engineSound = this.sound.add("engine",{ loop:true, volume:0.4 });
    windSound = this.sound.add("wind",{ loop:true, volume:0.2 });

    engineSound.play();
    windSound.play();

    this.add.image(0,0,"sky").setOrigin(0).setDisplaySize(config.width,config.height);

    this.add.image(0,config.height-220,"airport")
        .setOrigin(0)
        .setDisplaySize(config.width,300);

    this.add.image(0,config.height-120,"runway")
        .setOrigin(0)
        .setDisplaySize(config.width,120);

    plane = this.physics.add.image(200,config.height-200,"plane");
    plane.setDisplaySize(90,50);
    plane.setDepth(10);

    this.input.on("pointermove", (pointer) => {
    plane.x = pointer.x;
    plane.y = pointer.y;
});
   // this.cameras.main.startFollow(plane,true,0.05,0.05);

    createClouds(this);

    loadStage(this);
}

/* ================= CLOUDS ================= */

function createClouds(scene){

    for(let i=0;i<8;i++){

        let c = scene.add.circle(
            Math.random()*config.width,
            Math.random()*200,
            40,
            0xffffff,
            0.15
        );

        c.speed = 0.2 + Math.random()*0.5;
        c.setDepth(2);

        clouds.push(c);
    }
}

/* ================= SKY SYSTEM ================= */

function updateSky(scene){

    WORLD.time += WORLD.speed;
    if(WORLD.time > 100) WORLD.time = 0;

    let color = 0x87CEEB;

    if(WORLD.time > 60) color = 0x1B2A49;
    else if(WORLD.time > 30) color = 0xFF9966;

    scene.cameras.main.setBackgroundColor(color);
}

/* ================= WIND ================= */

function applyWind(){

    let wind = Math.sin(Date.now()*0.001)*0.5;

    plane.x += wind;

    clouds.forEach(c=>{
        c.x += wind * c.speed;

        if(c.x > config.width+60){
            c.x = -60;
            c.y = Math.random()*200;
        }
    });
}

/* ================= CAMERA ================= */

function updateCamera(scene){
   // let cam = scene.cameras.main;
    // cam.scrollX += (plane.x - cam.scrollX - 200) * 0.05;
}

/* ================= STAGE ================= */

function loadStage(scene){

    letters.forEach(l=>l.destroy());
    letters = [];

    let stage = CURRICULUM[stageIndex];

    target = Phaser.Utils.Array.GetRandom(stage.data);

    targetText = scene.add.text(20,20,"TARGET: "+target,{
        fontSize:"32px",
        fill:"#fff"
    });

    spawn(stage, scene);
}

/* ================= SPAWN ================= */

function spawn(stage, scene){

    stage.data.forEach((item,i)=>{

        let txt = scene.add.text(
            150+i*120,
            200,
            item,
           // { fontSize:"50px", fill:"#fff" }
            {
    fontSize:"72px",
    fontFamily:"Arial",
    color:"#FFD93D",
    stroke:"#FFFFFF",
    strokeThickness:8
}
            const COLORS = [
 "#FF6B6B",
 "#4ECDC4",
 "#FFD93D",
 "#6BCB77",
 "#4D96FF",
 "#FF9F1C"
];
        color: Phaser.Utils.Array.GetRandom(COLORS)
        
        );

        scene.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    });

    scene.physics.add.overlap(plane, letters, collect, null, scene);
}

/* ================= UPDATE ================= */

function update(){

  //  plane.x += 2;
if (plane.x < config.width - 150) {
    plane.x += 0.5;
}
    updateSky(this);
    applyWind();
    updateCamera(this);
}

/* ================= COLLECT ================= */

function collect(planeObj, letter){

    if(!letter || !letter.active) return;

    let v = letter.text;

    if(v === target){

        letter.destroy();

        this.cameras.main.flash(100);
        this.cameras.main.shake(80,0.01);

        speak(v);

        if(letters.every(l=>!l.active)){
            nextStage(this);
        }

    } else {
        this.cameras.main.shake(100,0.01);
    }
}

/* ================= VOICE ================= */

function speak(letter){

    if(!window.speechSynthesis) return;

    let msg = new SpeechSynthesisUtterance(letter);
    msg.lang = "ar-SA";
    msg.rate = 0.85;
    speechSynthesis.speak(msg);
}

/* ================= NEXT STAGE ================= */

function nextStage(scene){

    stageIndex++;

    if(stageIndex >= CURRICULUM.length)
        stageIndex = 0;

    scene.time.delayedCall(800, ()=>{
        loadStage(scene);
    });
}
