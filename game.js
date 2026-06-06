/* Created this for Mariam & Hamza. June 2026. AMTUN NOOR*/

const canvas = document.getElementById("gameCanvas") || document.createElement("canvas");
if (!canvas.parentNode && document.body) {
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);
}
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const GameState = { 
    MENU: "MENU", 
    TAKEOFF_AIRPORT: "TAKEOFF_AIRPORT", 
    TAKEOFF_RUNWAY: "TAKEOFF_RUNWAY", 
    SKY_FLIGHT: "SKY_FLIGHT", 
    LANDING_RUNWAY: "LANDING_RUNWAY", 
    LANDING_AIRPORT: "LANDING_AIRPORT", 
    VICTORY_SCREEN: "VICTORY_SCREEN" 
};

const GameMode = { JET_STREAM: "JET_STREAM", FREE_FLIGHT: "FREE_FLIGHT" };
const Profile = { HAMZA: "HAMZA", MARIAM: "MARIAM" };

const ARABIC_ALPHABET_DATA = [
    { char: "ا", file: "alif.mp3" }, { char: "ب", file: "ba.mp3" }, { char: "ت", file: "ta.mp3" }, 
    { char: "ث", file: "thaa.mp3" }, { char: "ج", file: "jeem.mp3" }, { char: "ح", file: "ha.mp3" }, 
    { char: "خ", file: "kha.mp3" }, { char: "د", file: "daal.mp3" }, { char: "ذ", file: "zaal.mp3" }, 
    { char: "ر", file: "raa.mp3" }, { char: "ز", file: "zaa.mp3" }, { char: "س", file: "seen.mp3" }, 
    { char: "ش", file: "sheen.mp3" }, { char: "ص", file: "saad.mp3" }, { char: "ض", file: "dad.mp3" }, 
    { char: "ط", file: "toa.mp3" }, { char: "ظ", file: "zoa.mp3" }, { char: "ع", file: "ain.mp3" }, 
    { char: "غ", file: "ghain.mp3" }, { char: "ف", file: "fa.mp3" }, { char: "ق", file: "qaaf.mp3" }, 
    { char: "ك", file: "kaf.mp3" }, { char: "ل", file: "laam.mp3" }, { char: "م", file: "meem.mp3" }, 
    { char: "ن", file: "noon.mp3" }, { char: "ه", file: "haa.mp3" }, { char: "و", file: "waw.mp3" }, 
    { char: "ي", file: "yaa.mp3" }
];

const audioCache = {};
let engineSound = null;
let windSound = null;
let audioUnlocked = false;

function initAmbienceSounds() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    
    engineSound = new Audio("assets/sound/engine.mp3");
    windSound = new Audio("assets/sound/wind.mp3");
    
    engineSound.loop = true;
    windSound.loop = true;
    engineSound.volume = 0.15;
    windSound.volume = 0.10;
    
    engineSound.play().catch(() => {});
    windSound.play().catch(() => {});
}

function playLetterAudio(letterChar) {
    const data = ARABIC_ALPHABET_DATA.find(item => item.char === letterChar);
    if (!data) return;
    const audioSrc = `assets/sound/letters/${data.file}`;
    if (!audioCache[audioSrc]) {
        audioCache[audioSrc] = new Audio(audioSrc);
    }
    audioCache[audioSrc].currentTime = 0; 
    audioCache[audioSrc].play().catch(() => {});
}

class AeroAlphaGame {
    constructor() {
        this.state = GameState.MENU;
        this.selectedMode = GameMode.JET_STREAM;
        this.currentProfile = Profile.HAMZA;
        
        this.score = 0;
        this.currentLevel = 1;
        this.alphabetIndex = 0; 
        this.speedMultiplier = 1.0;
        
        this.airportAlpha = 1.0;
        this.runwayAlpha = 0.0;
        this.skyAlpha = 0.0;
        this.phaseTimer = 0;

        this.clouds = [
            { x: 100, y: -200, baseSpeed: 3.5, type: 1, scale: 1.4, alpha: 0.8 },
            { x: canvas.width * 0.6, y: -500, baseSpeed: 4.0, type: 1, scale: 1.2, alpha: 0.75 },
            { x: canvas.width * 0.3, y: -350, baseSpeed: 1.2, type: 2, scale: 0.7, alpha: 0.4 },
            { x: canvas.width * 0.8, y: -700, baseSpeed: 0.9, type: 2, scale: 0.6, alpha: 0.35 }
        ];

        this.isBoosting = false;
        this.boostTimer = 0;
        this.particles = [];
        this.bursts = []; // Unified rainbow shockwave collector
        this.confetti = [];

        this.assets = {
            background_menu: new Image(), airport: new Image(), runway: new Image(),
            sky_day: new Image(), sky_sunset: new Image(), sky_night: new Image(),
            clouds_1: new Image(), clouds_2: new Image()
        };

        this.assets.background_menu.src = "assets/images/background_menu.png";
        this.assets.airport.src = "assets/images/airport.png";
        this.assets.runway.src = "assets/images/runway.png";
        this.assets.sky_day.src = "assets/images/sky_day.webp";
        this.assets.sky_sunset.src = "assets/images/sky_sunset.webp";
        this.assets.sky_night.src = "assets/images/sky_night.webp";
        this.assets.clouds_1.src = "assets/images/clouds_1.png";
        this.assets.clouds_2.src = "assets/images/clouds_2.png";

        // --- UNIFIED NORTH-EAST VECTOR SKIN MATRIX ---
        // 'artOrientation' defines how the source PNG image was drawn natively:
        // 'RIGHT' means nose points east, 'LEFT' means nose points west, 'UP' means nose points north.
        // The rendering pipe standardizes all of them cleanly to North-East (45° climb).
        this.skinCollection = [
            { id: 0, level: 1, file: "plane_trainer.png", img: new Image(), name: "Trainer", targetJetStreamAngle: 15, artOrientation: "RIGHT" },
            { id: 1, level: 3, file: "plane_falcon.png",  img: new Image(), name: "Falcon",  targetJetStreamAngle: 18, artOrientation: "LEFT"  }, 
            { id: 2, level: 5, file: "plane_glider.png",  img: new Image(), name: "Glider",  targetJetStreamAngle: 20, artOrientation: "RIGHT" },
            { id: 3, level: 7, file: "plane_gold.png",    img: new Image(), name: "Gold",    targetJetStreamAngle: 22, artOrientation: "LEFT"  }, 
            { id: 4, level: 9, file: "plane_legend.png",  img: new Image(), name: "Legend",  targetJetStreamAngle: 25, artOrientation: "LEFT"  }  
        ];
        
        this.skinCollection.forEach(skin => {
            skin.img.src = `assets/images/${skin.file}`;
        });

        this.selectedSkinIndex = 0; 

        this.player = {
            x: canvas.width / 2,
            y: canvas.height * 0.70,
            targetX: canvas.width / 2,
            targetY: canvas.height * 0.70,
            angle: 0
        };

        this.targetLetter = "";
        this.spawnedLetters = [];
        
        this.initControls();
    }

    getSelectedSkin() {
        return this.skinCollection[this.selectedSkinIndex];
    }

    requestNativeFullScreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        initAmbienceSounds();
    }

    initControls() {
        // --- UNIVERSAL KEYBOARD / SMART TV REMOTE ENGINE ---
        window.addEventListener("keydown", (e) => {
            // Support native Android TV/Tizen/WebOS remote key identifiers alongside standard keyboards
            const key = e.key;
            
            if (key === "Escape" || key === "Back" || key === "XF86Back" || e.keyCode === 461 || e.keyCode === 10009) {
                this.exitToMenu();
                return;
            }

            if (this.state === GameState.MENU) {
                if (key === "ArrowLeft" || e.keyCode === 37) this.currentProfile = Profile.HAMZA;
                if (key === "ArrowRight" || e.keyCode === 39) this.currentProfile = Profile.MARIAM;
                if (key === "ArrowUp" || e.keyCode === 38) this.selectedMode = GameMode.JET_STREAM;
                if (key === "ArrowDown" || e.keyCode === 40) this.selectedMode = GameMode.FREE_FLIGHT;
                if (key === "Enter" || key === " " || key === "Select" || e.keyCode === 13 || e.keyCode === 29443) {
                    this.requestNativeFullScreen();
                    this.startGame();
                }
                return;
            }

            // Gameplay navigation steps for TV remote clicks & Keyboard taps
            let step = this.currentProfile === Profile.HAMZA ? 100 : 60;
            if (key === "ArrowLeft" || e.keyCode === 37) this.player.targetX = Math.max(100, this.player.targetX - step);
            if (key === "ArrowRight" || e.keyCode === 39) this.player.targetX = Math.min(canvas.width - 100, this.player.targetX + step);
            if (key === "ArrowUp" || e.keyCode === 38) this.player.targetY = Math.max(canvas.height * 0.3, this.player.targetY - step);
            if (key === "ArrowDown" || e.keyCode === 40) this.player.targetY = Math.min(canvas.height * 0.85, this.player.targetY + step);
            
            // TV Play/Pause button or Spacebar triggers turbo kinetics boost
            if (key === " " || key === "MediaPlayPause" || key === "PlaySpeedChanged" || e.keyCode === 10252 || e.keyCode === 415) {
                this.isBoosting = true;
                this.boostTimer = 40;
            }
        });

        // Retention of existing mobile pointer tracking controls
        canvas.addEventListener("click", (e) => {
            this.requestNativeFullScreen();
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const midX = canvas.width / 2;

            if (this.state === GameState.MENU) {
                if (clickY > canvas.height * 0.28 && clickY < canvas.height * 0.38) {
                    if (clickX < midX) this.currentProfile = Profile.HAMZA;
                    else this.currentProfile = Profile.MARIAM;
                }
                if (clickY > canvas.height * 0.44 && clickY < canvas.height * 0.60) {
                    if (clickX < midX) this.selectedMode = GameMode.JET_STREAM;
                    else this.selectedMode = GameMode.FREE_FLIGHT;
                    this.startGame();
                }
                const hY = canvas.height * 0.68;
                if (clickY > hY + 15 && clickY < hY + 125) {
                    this.skinCollection.forEach((skin, idx) => {
                        let bx = midX - 270 + (idx * 110);
                        if (clickX > bx && clickX < bx + 95) {
                            if (this.currentLevel >= skin.level) {
                                this.selectedSkinIndex = idx;
                            }
                        }
                    });
                }
                if (clickX > canvas.width - 130 && clickY > canvas.height - 50) {
                    window.close();
                }
            } else if (this.state === GameState.VICTORY_SCREEN) {
                this.exitToMenu();
            } else {
                this.player.targetX = clickX;
                this.player.targetY = clickY;
            }
        });
    }

    exitToMenu() {
        this.state = GameState.MENU;
        this.score = 0;
        this.alphabetIndex = 0;
        this.confetti = [];
        this.bursts = [];
    }

    startGame() {
        this.state = GameState.TAKEOFF_AIRPORT;
        this.score = 0;
        this.alphabetIndex = 0;
        this.phaseTimer = 0;
        
        this.airportAlpha = 1.0;
        this.runwayAlpha = 0.0;
        this.skyAlpha = 0.0;

        this.speedMultiplier = this.currentProfile === Profile.HAMZA ? 0.45 : 0.95;

        this.player.x = canvas.width / 2;
        this.player.y = canvas.height * 0.75;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;

        this.generateNextCurriculumTarget();
    }

    generateNextCurriculumTarget() {
        if (this.alphabetIndex >= ARABIC_ALPHABET_DATA.length) {
            this.state = GameState.LANDING_RUNWAY;
            this.phaseTimer = 0;
            return;
        }

        this.targetLetter = ARABIC_ALPHABET_DATA[this.alphabetIndex].char;
        playLetterAudio(this.targetLetter);

        this.spawnedLetters = [];
        const totalLetters = this.currentProfile === Profile.HAMZA ? 3 : 5;
        
        for (let i = 0; i < totalLetters; i++) {
            let char = i === 0 ? this.targetLetter : ARABIC_ALPHABET_DATA[Math.floor(Math.random() * ARABIC_ALPHABET_DATA.length)].char;
            
            let randomX = Math.random() * (canvas.width - 200) + 100;
            let randomSpreadY = -Math.random() * 600 - 150;

            this.spawnedLetters.push({
                char,
                x: randomX,
                y: randomSpreadY,
                collected: false
            });
        }
        this.spawnedLetters.sort(() => Math.random() - 0.5);
    }

    update() {
        this.clouds.forEach(cloud => {
            let currentVelocity = cloud.baseSpeed * (this.isBoosting ? 2.5 : 1.0);
            cloud.y += currentVelocity;
            if (cloud.y > canvas.height) {
                cloud.y = -200;
                cloud.x = Math.random() * (canvas.width - 250);
            }
        });

        if (this.state === GameState.MENU) return;

        if (this.state === GameState.VICTORY_SCREEN) {
            if (this.confetti.length < 80) {
                this.confetti.push({
                    x: Math.random() * canvas.width,
                    y: -20,
                    size: Math.random() * 8 + 5,
                    color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                    speedY: Math.random() * 4 + 3,
                    speedX: Math.random() * 2 - 1
                });
            }
            this.confetti.forEach((c, idx) => {
                c.y += c.speedY; c.x += c.speedX;
                if (c.y > canvas.height) this.confetti.splice(idx, 1);
            });
            return;
        }

        this.phaseTimer++;

        if (this.state === GameState.TAKEOFF_AIRPORT) {
            if (this.phaseTimer > 100) {
                this.airportAlpha -= 0.015; this.runwayAlpha += 0.015;
                if (this.airportAlpha <= 0) {
                    this.airportAlpha = 0; this.runwayAlpha = 1.0;
                    this.state = GameState.TAKEOFF_RUNWAY; this.phaseTimer = 0;
                }
            }
        } else if (this.state === GameState.TAKEOFF_RUNWAY) {
            if (this.phaseTimer > 100) {
                this.runwayAlpha -= 0.015; this.skyAlpha += 0.015;
                if (this.runwayAlpha <= 0) {
                    this.runwayAlpha = 0; this.skyAlpha = 1.0;
                    this.state = GameState.SKY_FLIGHT; this.phaseTimer = 0;
                }
            }
        } else if (this.state === GameState.LANDING_RUNWAY) {
            this.skyAlpha -= 0.015; this.runwayAlpha += 0.015;
            if (this.skyAlpha <= 0) {
                this.skyAlpha = 0; this.runwayAlpha = 1.0;
                if (this.phaseTimer > 120) {
                    this.state = GameState.LANDING_AIRPORT; this.phaseTimer = 0;
                }
            }
        } else if (this.state === GameState.LANDING_AIRPORT) {
            this.runwayAlpha -= 0.015; this.airportAlpha += 0.015;
            if (this.runwayAlpha <= 0) {
                this.runwayAlpha = 0; this.airportAlpha = 1.0;
                if (this.phaseTimer > 120) {
                    this.state = GameState.VICTORY_SCREEN;
                }
            }
        }

        let baseVelocity = this.selectedMode === GameMode.JET_STREAM ? 7 : 5.5;
        let speed = baseVelocity * this.speedMultiplier;

        if (this.isBoosting) {
            speed *= 1.7;
            this.boostTimer--;
            if (this.boostTimer <= 0) this.isBoosting = false;
            
            if (this.boostTimer % 2 === 0) {
                this.particles.push({
                    x: this.player.x - 10 + Math.random() * 20,
                    y: this.player.y + 45,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 4 + 5,
                    radius: Math.random() * 6 + 8,
                    alpha: 0.9,
                    color: this.selectedMode === GameMode.JET_STREAM ? "rgba(255, 140, 0, 0.6)" : "rgba(0, 229, 255, 0.6)"
                });
            }
        }

        this.player.x += (this.player.targetX - this.player.x) * 0.12;
        this.player.y += (this.player.targetY - this.player.y) * 0.12;

        // --- CORE JET STREAM PITCH CALCULATOR ---
        let currentSkin = this.getSelectedSkin();
        let targetAngleDegrees = 0;

        if (this.selectedMode === GameMode.JET_STREAM) {
            targetAngleDegrees = -currentSkin.targetJetStreamAngle;
            let bankingDrift = (this.player.targetX - this.player.x) * 0.05;
            targetAngleDegrees += bankingDrift;
        } else {
            targetAngleDegrees = 0; 
        }
        this.player.angle = targetAngleDegrees * Math.PI / 180;

        if (this.state === GameState.SKY_FLIGHT) {
            this.spawnedLetters.forEach(letter => {
                letter.y += speed;
                let sizeScalar = canvas.width * 0.06;
                if (!letter.collected && Math.hypot(letter.x - this.player.x, letter.y - this.player.y) < sizeScalar) {
                    letter.collected = true;
                    if (letter.char === this.targetLetter) {
                        this.score += 10;
                        
                        // --- MULTI-PARTICLE RAINBOW SHOCKWAVE TRIGGER ---
                        // Spawns 16 high-velocity expanding color nodes forming a rainbow blast circle
                        for (let p = 0; p < 16; p++) {
                            let ringAngle = (p / 16) * Math.PI * 2;
                            this.bursts.push({
                                x: letter.x,
                                y: letter.y,
                                vx: Math.cos(ringAngle) * 5,
                                vy: Math.sin(ringAngle) * 5,
                                radius: Math.random() * 4 + 4,
                                hue: (p * 22.5), // Maps cleanly across full 360 HSL color spectrum
                                alpha: 1.0
                            });
                        }

                        this.alphabetIndex++;
                        this.currentLevel = Math.floor(this.score / 50) + 1;
                        if (this.currentProfile === Profile.MARIAM) {
                            this.speedMultiplier = 0.95 + (this.currentLevel * 0.05);
                        }
                        this.generateNextCurriculumTarget();
                    }
                }
            });

            if (this.spawnedLetters.every(l => l.y > canvas.height || l.collected)) {
                this.generateNextCurriculumTarget();
            }
        }

        this.particles.forEach((p, idx) => { 
            p.x += p.vx; p.y += p.vy; p.radius += 0.4; p.alpha -= 0.035; 
            if (p.alpha <= 0) this.particles.splice(idx, 1); 
        });

        // Update Rainbow Shockwave Particles
        this.bursts.forEach((b, idx) => {
            b.x += b.vx;
            b.y += b.vy;
            b.radius += 0.2;
            b.alpha -= 0.03;
            if (b.alpha <= 0) this.bursts.splice(idx, 1);
        });
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (this.state === GameState.MENU) { this.drawMenu(); return; }
        this.drawGameplayScreen();
    }

    drawMenu() {
        if (this.assets.background_menu.complete) {
            ctx.drawImage(this.assets.background_menu, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#0c192e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const midX = canvas.width / 2;
        ctx.fillStyle = "#FFD700"; ctx.font = "normal 52px BalooBhaijaan, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("AERO-ALPHA", midX, canvas.height * 0.18);

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(midX - 220, canvas.height * 0.28, 200, 70); ctx.fillRect(midX + 20, canvas.height * 0.28, 200, 70);

        ctx.strokeStyle = "#00FFCC"; ctx.lineWidth = 4;
        if (this.currentProfile === Profile.HAMZA) { ctx.strokeRect(midX - 220, canvas.height * 0.28, 200, 70); } 
        else { ctx.strokeRect(midX + 20, canvas.height * 0.28, 200, 70); }

        ctx.fillStyle = "#FFF"; ctx.font = "normal 24px BalooBhaijaan, sans-serif";
        ctx.fillText("HAMZA", midX - 120, canvas.height * 0.32); ctx.fillText("MARIAM", midX + 120, canvas.height * 0.32);

        ctx.fillStyle = this.selectedMode === GameMode.JET_STREAM ? "rgba(255, 193, 7, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(midX - 240, canvas.height * 0.44, 220, 95);
        ctx.strokeStyle = this.selectedMode === GameMode.JET_STREAM ? "#FFC107" : "rgba(255,255,255,0.2)";
        ctx.strokeRect(midX - 240, canvas.height * 0.44, 220, 95);

        ctx.fillStyle = "#FFF"; ctx.font = "normal 20px BalooBhaijaan, sans-serif";
        ctx.fillText("JET STREAM", midX - 130, canvas.height * 0.49);
        ctx.font = "normal 14px BalooBhaijaan, sans-serif"; ctx.fillText("(Angled Flight Sim)", midX - 130, canvas.height * 0.52);

        ctx.fillStyle = this.selectedMode === GameMode.FREE_FLIGHT ? "rgba(255, 193, 7, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(midX + 20, canvas.height * 0.44, 220, 95);
        ctx.strokeStyle = this.selectedMode === GameMode.FREE_FLIGHT ? "#FFC107" : "rgba(255,255,255,0.2)";
        ctx.strokeRect(midX + 20, canvas.height * 0.44, 220, 95);

        ctx.fillStyle = "#FFF"; ctx.font = "normal 20px BalooBhaijaan, sans-serif";
        ctx.fillText("FREE FLIGHT", midX + 130, canvas.height * 0.49);
        ctx.font = "normal 14px BalooBhaijaan, sans-serif"; ctx.fillText("(Horizontal Flight)", midX + 130, canvas.height * 0.52);

        const hY = canvas.height * 0.68;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fillRect(midX - 290, hY, 580, 140); ctx.strokeRect(midX - 290, hY, 580, 140);

        this.skinCollection.forEach((skin, idx) => {
            let bx = midX - 270 + (idx * 110);
            let isUnlocked = this.currentLevel >= skin.level;

            if (this.selectedSkinIndex === idx) {
                ctx.fillStyle = "rgba(255, 215, 0, 0.25)"; ctx.strokeStyle = "#FFD700";
            } else {
                ctx.fillStyle = isUnlocked ? "rgba(0, 255, 100, 0.08)" : "rgba(255, 0, 0, 0.08)";
                ctx.strokeStyle = isUnlocked ? "#00FF66" : "#FF3333";
            }
            ctx.fillRect(bx, hY + 15, 95, 110);
            ctx.lineWidth = this.selectedSkinIndex === idx ? 4 : 2;
            ctx.strokeRect(bx, hY + 15, 95, 110);
            ctx.lineWidth = 2;

            if (skin.img.complete) {
                ctx.save();
                if (!isUnlocked) ctx.globalAlpha = 0.25;
                
                // --- MENU THUMBNAIL NORTH-EAST VECTOR ALIGNMENT ---
                ctx.translate(bx + 47, hY + 52);
                if (skin.artOrientation === "LEFT") {
                    ctx.scale(-1, 1);
                    ctx.rotate(-25 * Math.PI / 180); // Forces left-drawn skins to sit gracefully at 25° up-right
                } else if (skin.artOrientation === "RIGHT") {
                    ctx.rotate(-25 * Math.PI / 180); // Forces right-drawn skins to sit gracefully at 25° up-right
                } else if (skin.artOrientation === "UP") {
                    ctx.rotate(20 * Math.PI / 180);  // Forces vertical-drawn skins to tilt rightward
                }
                ctx.drawImage(skin.img, -37, -27, 75, 55);
                ctx.restore();
            }

            ctx.fillStyle = "#FFF"; ctx.font = "normal 12px BalooBhaijaan, sans-serif";
            ctx.fillText(skin.name, bx + 47, hY + 100);
            
            if (this.selectedSkinIndex === idx) {
                ctx.fillStyle = "#FFD700"; ctx.font = "normal 10px BalooBhaijaan, sans-serif"; ctx.fillText("READY", bx + 47, hY + 114);
            } else if (!isUnlocked) {
                ctx.fillStyle = "#FF3333"; ctx.font = "normal 10px BalooBhaijaan, sans-serif"; ctx.fillText(`Lvl ${skin.level} Req`, bx + 47, hY + 114);
            }
        });

        ctx.fillStyle = "rgba(255, 50, 50, 0.2)"; ctx.fillRect(canvas.width - 130, canvas.height - 50, 110, 40);
        ctx.strokeStyle = "#FF3333"; ctx.strokeRect(canvas.width - 130, canvas.height - 50, 110, 40);
        ctx.fillStyle = "#FFF"; ctx.font = "normal 14px BalooBhaijaan, sans-serif"; ctx.fillText("EXIT GAME", canvas.width - 75, canvas.height - 25);

        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "normal 12px BalooBhaijaan, sans-serif"; ctx.fillText("V26.0 STABLE", 60, canvas.height - 25);
    }

    drawGameplayScreen() {
        let skyA = this.assets.sky_day; let skyB = this.assets.sky_sunset; let mixWeight = 0;
        if (this.alphabetIndex < 9) {
            skyA = this.assets.sky_day; skyB = this.assets.sky_sunset; mixWeight = this.alphabetIndex / 9;
        } else if (this.alphabetIndex < 18) {
            skyA = this.assets.sky_sunset; skyB = this.assets.sky_night; mixWeight = (this.alphabetIndex - 9) / 9;
        } else if (this.alphabetIndex < 27) {
            skyA = this.assets.sky_night; skyB = this.assets.sky_day; mixWeight = (this.alphabetIndex - 18) / 9;
        } else {
            skyA = this.assets.sky_day; skyB = this.assets.sky_day; mixWeight = 1.0;
        }

        ctx.save(); ctx.globalAlpha = this.skyAlpha;
        if (skyA.complete) ctx.drawImage(skyA, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = this.skyAlpha * mixWeight;
        if (skyB.complete) ctx.drawImage(skyB, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.save();
        this.clouds.forEach(c => {
            ctx.globalAlpha = this.skyAlpha * c.alpha;
            let img = c.type === 1 ? this.assets.clouds_1 : this.assets.clouds_2;
            let cw = 220 * c.scale; let ch = 130 * c.scale;
            if (img.complete) ctx.drawImage(img, c.x, c.y, cw, ch);
        });
        ctx.restore();

        if (this.airportAlpha > 0 && this.assets.airport.complete) {
            ctx.save(); ctx.globalAlpha = this.airportAlpha; ctx.drawImage(this.assets.airport, 0, 0, canvas.width, canvas.height); ctx.restore();
        }
        if (this.runwayAlpha > 0 && this.assets.runway.complete) {
            ctx.save(); ctx.globalAlpha = this.runwayAlpha; let rw = canvas.width * 0.40; ctx.drawImage(this.assets.runway, (canvas.width / 2) - (rw / 2), 0, rw, canvas.height); ctx.restore();
        }

        this.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });

        if (this.state === GameState.SKY_FLIGHT) {
            this.spawnedLetters.forEach(l => {
                if (l.collected) return;
                ctx.save(); ctx.fillStyle = "#FFD700"; ctx.strokeStyle = "#000000"; ctx.lineWidth = 8;
                let charFontSize = Math.floor(canvas.width * 0.06);
                ctx.font = `normal ${charFontSize}px BalooBhaijaan, sans-serif`; ctx.textAlign = "center";
                ctx.strokeText(l.char, l.x, l.y); ctx.fillText(l.char, l.x, l.y); ctx.restore();
            });
        }

        // --- ENHANCED: PROPORTIONATE AIRCRAFT RENDERING ENGINE ---
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        
        let activeSkin = this.getSelectedSkin();

        // 1. Process Horizon Face Transformations to ensure a standard North-East (45° up-right) direction vector
        if (activeSkin.artOrientation === "LEFT") {
            ctx.rotate(-this.player.angle); 
            ctx.scale(-1, 1); 
        } else if (activeSkin.artOrientation === "RIGHT") {
            ctx.rotate(this.player.angle);
        } else if (activeSkin.artOrientation === "UP") {
            ctx.rotate(this.player.angle + (90 * Math.PI / 180)); 
        }

        // 2. Proportionately scaled plane size footprint (+25% visual balance increase)
        let planeW = canvas.width * 0.20; 
        let planeH = planeW * 0.75;
        
        if (activeSkin.img.complete) {
            // image smoothing flags preserve sharp pixels during dynamic canvas redraw cycles
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(activeSkin.img, -planeW / 2, -planeH / 2, planeW, planeH);
        } else {
            ctx.fillStyle = "#FF0000"; ctx.fillRect(-50, -35, 100, 70);
        }
        ctx.restore();

        // --- RENDERING RAINBOW SHOCKWAVE PARTICLES ---
        this.bursts.forEach(b => {
            ctx.save();
            ctx.globalAlpha = b.alpha;
            ctx.fillStyle = `hsl(${b.hue}, 100%, 60%)`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        this.drawHUD();
    }

    drawHUD() {
        ctx.save(); ctx.fillStyle = "#00FFCC"; ctx.font = "normal 28px BalooBhaijaan, sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${this.score}`, 40, 60);
        ctx.fillStyle = "#FFF"; ctx.font = "normal 20px BalooBhaijaan, sans-serif"; ctx.fillText(`PILOT: ${this.currentProfile}`, 40, 95); ctx.restore();

        if (this.state === GameState.SKY_FLIGHT) {
            const rx = canvas.width - 200; const ry = 30; const rw = 150; const rh = 100;
            ctx.save(); ctx.fillStyle = "rgba(13, 25, 47, 0.85)"; ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = "#00E5FF"; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = "#00E5FF"; ctx.strokeRect(rx, ry, rw, rh);
            ctx.shadowBlur = 0; ctx.fillStyle = "#00E5FF"; ctx.font = "normal 14px BalooBhaijaan, sans-serif"; ctx.textAlign = "center";
            ctx.fillText("TARGET", rx + (rw / 2), ry + 25);
            ctx.fillStyle = "#FFD700"; ctx.font = "normal 48px BalooBhaijaan, sans-serif"; ctx.fillText(this.targetLetter, rx + (rw / 2), ry + 82); ctx.restore();
        }

        if (this.state === GameState.VICTORY_SCREEN) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.confetti.forEach(c => { ctx.fillStyle = c.color; ctx.fillRect(c.x, c.y, c.size, c.size); });
            ctx.fillStyle = "#FFD700"; ctx.font = "normal 64px BalooBhaijaan, sans-serif"; ctx.textAlign = "center";
            ctx.fillText("FLIGHT COMPLETE!", canvas.width / 2, canvas.height * 0.45);
            ctx.fillStyle = "#FFF"; ctx.font = "normal 24px BalooBhaijaan, sans-serif"; ctx.fillText("Amazing Flying! Tap Screen or Enter to Play Again", canvas.width / 2, canvas.height * 0.55);
        }
    }
}

const gameInstance = new AeroAlphaGame();
function engineHeartbeatLoop() {
    gameInstance.update(); gameInstance.draw();
    requestAnimationFrame(engineHeartbeatLoop);
}
requestAnimationFrame(engineHeartbeatLoop);
