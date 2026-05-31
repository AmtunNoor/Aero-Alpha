const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default:"arcade", arcade:{ debug:false } },
    scene: { preload, create, update }
};

new Phaser.Game(config);

/* ================= AUDIO MAP ================= */

const AUDIO_MAP = {
 "ا":"alif","ب":"ba","ت":"ta","ث":"thaa","ج":"jeem",
 "ح":"ha","خ":"kha","د":"daal","ذ":"zaal","ر":"raa",
 "ز":"zaa","س":"seen","ش":"sheen","ص":"saad","ض":"dad",
 "ط":"toa","ظ":"zaa","ع":"ain","غ":"ghain","ف":"fa",
 "ق":"qaaf","ك":"kaf","ل":"laam","م":"meem","ن":"noon",
 "ه":"haa","و":"waw","ي":"yaa"
};

/* ================= CURRICULUM SYSTEM ================= */

const CURRICULUM = [
{
    type:"letters",
    data:["ا","ب","ت","ث","ج","ح","خ"]
},
{
    type:"words",
    data:["باب","بيت","قلم"]
},
{
    type:"sentences",
    data:["هذا باب","أنا أكتب"]
}
];

let stageIndex = 0;

/* ================= WORLD STATE ================= */

let plane, letters = [];
let targetText;
let target;
let collected = [];

let engineSound, windSound;

/* ================= AI ================= */

const AI = {
    correct:0, wrong:0,
    accuracy(){ return this.correct/(this.correct+this.wrong||1); }
};

/* ================= PRELOAD ================= */

function preload(){
    this.load.image("sky","assets/images/sky.webp");
    this.load.image("airport","assets/images/airport.webp");
    this.load.image("runway","assets/images/runway.webp");
    this.load.image("plane","assets/images/plane.webp");

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

    this.add.image(0,config.height-220,"airport").setOrigin(0).setDisplaySize(config.width,300);

    this.add.image(0,config.height-120,"runway").setOrigin(0).setDisplaySize(config.width,120);

    plane = this.physics.add.image(200,config.height-200,"plane");
    plane.setDisplaySize(90,50);

    this.cameras.main.startFollow(plane,true,0.05,0.05);

    loadStage(this);
}

/* ================= STAGE LOADER ================= */

function loadStage(scene){

    letters.forEach(l=>l.destroy());
    letters = [];

    let stage = CURRICULUM[stageIndex];

    target = Phaser.Utils.Array.GetRandom(stage.data);

    targetText = scene.add.text(20,20,
        "TARGET: "+target,
        { fontSize:"32px", fill:"#fff" }
    );

    spawn(stage, scene);
}

/* ================= SPAWN ================= */

function spawn(stage, scene){

    stage.data.forEach((item,i)=>{

        let txt = scene.add.text(
            150+i*120,
            200,
            item,
            { fontSize:"50px", fill:"#fff" }
        );

        scene.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.push(txt);
    });

    scene.physics.add.overlap(plane, letters, collect, null, scene);
}

/* ================= UPDATE ================= */

function update(){

    plane.x += 2;
}

/* ================= COLLECT ================= */

function collect(planeObj, letter){

    let v = letter.text;

    if(v === target){

        AI.correct++;

        letter.destroy();

        collected.push(v);

        playReward(this, "correct");

        if(allDone()){
            nextStage(this);
        }

    } else {
        AI.wrong++;
        this.cameras.main.shake(100,0.01);
    }
}

/* ================= STAGE LOGIC ================= */

function allDone(){
    return letters.every(l=>!l.active);
}

function nextStage(scene){

    stageIndex++;

    if(stageIndex >= CURRICULUM.length){
        stageIndex = 0;
    }

    playCut(scene, ()=>{
        loadStage(scene);
    });
}

/* ================= CUTSCENE ================= */

function playCut(scene, cb){

    let t = scene.add.text(config.width/2,config.height/2,
        "✈ Moving to next lesson",
        { fontSize:"40px", fill:"#fff" }
    ).setOrigin(0.5);

    scene.time.delayedCall(1200,()=>{
        t.destroy();
        cb();
    });
}

/* ================= REWARD ================= */

function playReward(scene,type){

    let icon = type==="correct" ? "⭐" : "❌";

    let r = scene.add.text(
        config.width/2,
        config.height/2,
        icon,
        { fontSize:"60px", fill:"#fff" }
    ).setOrigin(0.5);

    scene.tweens.add({
        targets:r,
        y:r.y-100,
        alpha:0,
        duration:800
    });
}
