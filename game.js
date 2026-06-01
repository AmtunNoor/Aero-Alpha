class LetterGameScene extends Phaser.Scene {
  constructor() {
    super("LetterGameScene");

    this.manager = null;
    this.targetLetter = null;

    this.combo = 0;
    this.speed = -220;
  }

  create() {
    // =========================
    // BACKGROUND / ENV (if used)
    // =========================
    this.add.image(450, 300, "sky");
    this.add.image(450, 550, "runway");

    // =========================
    // PLANE
    // =========================
    this.plane = this.physics.add.sprite(150, 300, "plane_trainer");
    this.plane.setCollideWorldBounds(true);

    // =========================
    // TARGET UI (BIG + CLEAR)
    // =========================
    this.targetText = this.add.text(30, 30, "", {
      fontSize: "72px",
      color: "#FFD700",
      stroke: "#000",
      strokeThickness: 12,
      fontStyle: "bold"
    });

    // =========================
    // COMBO UI
    // =========================
    this.comboText = this.add.text(30, 120, "0", {
      fontSize: "36px",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 6
    });

    // =========================
    // MANAGER
    // =========================
    this.manager = new ArabicLetterManager(this);

    this.events.on("TARGET_UPDATED", this.onTargetUpdated, this);
    this.events.on("CORRECT", this.onCorrect, this);
    this.events.on("WRONG", this.onWrong, this);

    this.manager.start();

    // =========================
    // INPUT CONTROL
    // =========================
    this.input.on("pointermove", (pointer) => {
      this.plane.y = pointer.y;
    });

    // optional engine sound loop
    this.sound.play("engine", { loop: true, volume: 0.4 });
  }

  update() {
    this.manager.update();
  }

  // =========================
  // TARGET UPDATE
  // =========================
  onTargetUpdated(letter) {
    this.targetLetter = letter;

    this.targetText.setText("الحرف: " + letter);

    this.targetText.setStyle({
      fontSize: "78px",
      color: "#FFD700",
      stroke: "#000",
      strokeThickness: 14
    });

    // 🔊 play Arabic letter sound
    this.playLetterSound(letter);
  }

  playLetterSound(letter) {
    const key = this.mapLetterToAudio(letter);

    if (this.sound.get(key)) {
      this.sound.play(key);
    }
  }

  mapLetterToAudio(letter) {
    // IMPORTANT: match your repo naming
    // example: alif.mp3, ba.mp3, daal.mp3...

    const map = {
        "ا":"alif",
  "ب":"ba",
  "ت":"ta",
  "ث":"thaa",
  "ج":"jeem",
  "ح":"ha",     // ح = ha
  "خ":"kha",
  "د":"daal",
  "ذ":"zaal",
  "ر":"raa",
  "ز":"zaa",
  "س":"seen",
  "ش":"sheen",
  "ص":"saad",
  "ض":"dad",
  "ط":"toa",
  "ظ":"zaa",
  "ع":"ain",
  "غ":"ghain",
  "ف":"fa",
  "ق":"qaaf",
  "ك":"kaf",
  "ل":"laam",
  "م":"meem",
  "ن":"noon",
  "ه":"haa",    // ه = haa
  "و":"waw",
  "ي":"yaa"
    
    };

    return map[letter];
  }

  // =========================
  // GAME EVENTS
  // =========================
  onCorrect() {
    this.combo++;

    this.comboText.setText("🔥 " + this.combo);

    this.speed -= 8;

    this.spawnFX(0x00ff00);
  }

  onWrong() {
    this.combo = 0;

    this.comboText.setText("0");

    this.spawnFX(0xff0000);
  }

  spawnFX(color) {
    for (let i = 0; i < 10; i++) {
      const fx = this.add.circle(
        this.plane.x,
        this.plane.y,
        6,
        color
      );

      this.physics.add.existing(fx);

      fx.body.setVelocity(
        Phaser.Math.Between(-120, 120),
        Phaser.Math.Between(-120, 120)
      );

      this.time.delayedCall(400, () => fx.destroy());
    }
  }
}

/* =========================
   ARABIC LETTER MANAGER
========================= */
class ArabicLetterManager {
  constructor(scene) {
    this.scene = scene;

    this.active = [];
    this.target = null;

    this.maxLetters = 5;
    this.spawnDelay = 1100;
  }

  start() {
    this.pickTarget();

    this.scene.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: () => this.spawn()
    });
  }

  pickTarget() {
    const letters = Object.keys(this.getLetterPool());

    this.target = letters[Math.floor(Math.random() * letters.length)];

    this.scene.events.emit("TARGET_UPDATED", this.target);
  }

  getLetterPool() {
    return {
      "ا": 1, "ب": 1, "ت": 1, "ث": 1, "ج": 1,
      "ح": 1, "خ": 1, "د": 1, "ذ": 1, "ر": 1,
      "ز": 1, "س": 1, "ش": 1, "ص": 1, "ض": 1,
      "ط": 1, "ظ": 1, "ع": 1, "غ": 1, "ف": 1,
      "ق": 1, "ك": 1, "ل": 1, "م": 1, "ن": 1,
      "ه": 1, "و": 1, "ي": 1
    };
  }

  spawn() {
    if (this.active.length >= this.maxLetters) return;

    const pool = Object.keys(this.getLetterPool());

    const value =
      Math.random() < 0.6
        ? this.target
        : pool[Math.floor(Math.random() * pool.length)];

    const letter = new ArabicLetter(this.scene, value, this);

    this.active.push(letter);
  }

  remove(letter) {
    this.active = this.active.filter(l => l !== letter);
  }

  update() {
    this.active.forEach(l => l.update());
  }

  onCorrectHit() {
    this.pickTarget();
  }
}

/* =========================
   ARABIC LETTER CLASS
========================= */
class ArabicLetter {
  constructor(scene, value, manager) {
    this.scene = scene;
    this.value = value;
    this.manager = manager;

    this.state = "active";

    this.sprite = scene.add.text(
      900,
      Phaser.Math.Between(120, 520),
      value,
      {
        fontSize: "54px",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 8
      }
    );

    scene.physics.add.existing(this.sprite);
    this.sprite.body.setVelocityX(-240);

    this.sprite.letterRef = this;

    scene.physics.add.overlap(
      scene.plane,
      this.sprite,
      () => this.hit()
    );
  }

  hit() {
    if (this.state !== "active") return;

    if (this.value === this.manager.target) {
      this.correct();
    } else {
      this.wrong();
    }
  }

  correct() {
    this.state = "hit";

    this.scene.events.emit("CORRECT");

    this.destroy();
    this.manager.remove(this);
    this.manager.onCorrectHit();
  }

  wrong() {
    this.state = "wrong";

    this.scene.events.emit("WRONG");

    this.destroy();
    this.manager.remove(this);
  }

  update() {
    if (this.state !== "active") return;

    this.sprite.x += this.scene.speed * 0.016;

    if (this.sprite.x < -60) {
      this.state = "missed";

      this.scene.events.emit("WRONG");

      this.destroy();
      this.manager.remove(this);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}

/* =========================
   GAME CONFIG
========================= */
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: LetterGameScene
};

new Phaser.Game(config);
