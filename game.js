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

const ARABIC = ["ا","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","ه","و","ي"];

let plane, letters, cursors;
let targetLetter, targetText;
let collected = [];
let speed = 0, flying = false;
let audio = {};

function preload() {}

function create() {

    this.add.rectangle(0,0,config.width*2,config.height*2,0x87CEEB).setOrigin(0);

    plane = this.physics.add.image(200, config.height-150);
    plane.setDisplaySize(80,40);
    plane.setCollideWorldBounds(true);

    letters = this.physics.add.group();

    spawnLetters.call(this);

    targetLetter = Phaser.Utils.Array.GetRandom(ARABIC);

    targetText = this.add.text(20,20,"TARGET: "+targetLetter,{
        fontSize:"30px",
        fill:"#fff",
        stroke:"#000",
        strokeThickness:4
    });

    cursors = this.input.keyboard.createCursorKeys();

    loadAudio();

    this.physics.add.overlap(plane, letters, collect, null, this);
}

function update() {

    if(!flying){
        speed += 0.05;
        plane.x += speed;
        if(speed > 3) flying = true;
    } else {
        if(cursors.left.isDown) plane.x -= 5;
        if(cursors.right.isDown) plane.x += 5;
        if(cursors.up.isDown) plane.y -= 4;
        if(cursors.down.isDown) plane.y += 4;
    }
}

function spawnLetters() {

    for(let i=0;i<14;i++){

        let l = Phaser.Utils.Array.GetRandom(ARABIC);

        let txt = this.add.text(
            Phaser.Math.Between(200, config.width-100),
            Phaser.Math.Between(100, config.height-200),
            l,
            { fontSize:"48px", color:"#fff" }
        );

        this.physics.add.existing(txt);
        txt.body.setAllowGravity(false);

        letters.add(txt);
    }
}

function collect(plane, letter) {

    let v = letter.text;

    if(v === targetLetter){

        if(audio[v]){
            audio[v].currentTime = 0;
            audio[v].play();
        }

        letter.destroy();

        collected.push(v);

        let remaining = ARABIC.filter(x=>!collected.includes(x));

        targetLetter = Phaser.Utils.Array.GetRandom(remaining);

        targetText.setText("TARGET: "+targetLetter);

    } else {
        this.cameras.main.shake(120,0.01);
    }
}

function loadAudio() {

    ARABIC.forEach(l=>{
        audio[l] = new Audio(`assets/sounds/letters/${l}.mp3`);
    });
}