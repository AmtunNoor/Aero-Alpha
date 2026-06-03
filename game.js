/**
 * AERO-ALPHA 
 * Version: V21.2 STABLE (Pre-V21 Architecture)
 * Orientation: Vertical 
 */

// --- 1. ENGINE INITIALIZATION & CANVAS SETUP ---
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
    AIRPORT: "AIRPORT",
    SKY: "SKY",
    HANGAR: "HANGAR"
};

const GameMode = {
    RUNNER: "RUNNER",
    FREE_FLIGHT: "FREE_FLIGHT"
};

// Precise dictionary mapping Arabic letters directly to their real filenames in assets/sound/letters/
const ARABIC_ALPHABET_DATA = [
    { char: "ا", file: "alif.mp3" }, { char: "ب", file: "ba.mp3" }, { char: "ت", file: "ta.mp3" }, 
    { char: "ث", file: "thaa.mp3" }, { char: "ج", file: "jeem.mp3" }, { char: "ح", file: "haa.mp3" }, 
    { char: "خ", file: "kha.mp3" }, { char: "د", file: "daal.mp3" }, { char: "ذ", file: "zaal.mp3" }, 
    { char: "ر", file: "raa.mp3" }, { char: "ز", file: "zaa.mp3" }, { char: "س", file: "seen.mp3" }, 
    { char: "ش", file: "sheen.mp3" }, { char: "ص", file: "saad.mp3" }, { char: "ض", file: "dad.mp3" }, 
    { char: "ط", file: "toa.mp3" }, { char: "ظ", file: "zoa.mp3" }, { char: "ع", file: "ain.mp3" }, 
    { char: "غ", file: "ghain.mp3" }, { char: "ف", file: "fa.mp3" }, { char: "ق", file: "qaaf.mp3" }, 
    { char: "ك", file: "kaf.mp3" }, { char: "ل", file: "laam.mp3" }, { char: "م", file: "meem.mp3" }, 
    { char: "ن", file: "noon.mp3" }, { char: "ه", file: "ha.mp3" }, { char: "و", file: "waw.mp3" }, 
    { char: "ي", file: "yaa.mp3" }
];

// --- 2. SOUND CONTROLLER (ZERO CACHE ERRORS) ---
const audioCache = {};
let activeEngineSound = null;
let activeWindSound = null;

function playLetterAudio(letterChar) {
    const data = ARABIC_ALPHABET_DATA.find(item => item.char === letterChar);
    if (!data) return;
    
    const audioSrc = `assets/sound/letters/${data.file}`;
    if (!audioCache[audioSrc]) {
        audioCache[audioSrc] = new Audio(audioSrc);
    }
    audioCache[audioSrc].currentTime = 0; 
    audioCache[audioSrc].play().catch(err => console.log("Interaction required for audio play: ", err));
}

function loopBackgroundAmbience() {
    if (!activeEngineSound) {
        activeEngineSound = new Audio("assets/sound/engine.mp3");
        activeEngineSound.loop = true;
        activeEngineSound.volume = 0.25;
    }
    if (!activeWindSound) {
        activeWindSound = new Audio("assets/sound/wind.mp3");
        activeWindSound.loop = true;
        activeWindSound.volume = 0.20;
    }
    activeEngineSound.play().catch(() => {});
    activeWindSound.play().catch(() => {});
}

// --- 3. CORE GAME ENGINE ---
class AeroAlphaGame {
    constructor() {
        this.state = GameState.MENU;
        this.selectedMode = GameMode.RUNNER;
        
        this.score = 0;
        this.currentLevel = 1;
        this.speedMultiplier = 1.0;
        this.consecutiveMistakes = 0;
        this.cameraShakeTimer = 0;

        // Environment Progression Setup
        this.envTimer = 0;
        this.envCycleDuration = 1200; 
        this.currentAirportIndex = 1;
        this.starsCollected = 0;

        // Core Layout Arrays
        this.targetLetter = "";
        this.spawnedLetters = [];

        // Exact Repository Asset Definitions Only
        this.assets = {
            background_menu: new Image(),
            airport: new Image(),
            runway: new Image(),
            sky_day: new Image(),
            sky_sunset: new Image(),
            sky_night: new Image(),
            clouds_1: new Image(),
            clouds_2: new Image(),
            planeImg: new Image()
        };

        this.assets.background_menu.src = "assets/images/background_menu.png";
        this.assets.airport.src = "assets/images/airport.png";
        this.assets.runway.src = "assets/images/runway.png";
        this.assets.sky_day.src = "assets/images/sky_day.webp";
        this.assets.sky_sunset.src = "assets/images/sky_sunset.webp";
        this.assets.sky_night.src = "assets/images/sky_night.webp";
        this.assets.clouds_1.src = "assets/images/clouds_1.png";
        this.assets.clouds_2.src = "assets/images/clouds_2.png";
        
        // Dynamic Skin Array mapping exclusively to level states
        this.levelSkins = [
            "plane_trainer.png", // Level 1 Default
            "plane_falcon.png",  // Level 2
            "plane_glider.png",  // Level 3
            "plane_gold.png",    // Level 4
            "plane_legend.png"   // Level 5+
        ];

        this.updatePlaneSkin();

        // Background illusion speeds and anchors
        this.airportY = 0;
        this.runwayY = 0;
        this.cloud1Y = -150;
        this.cloud2Y = -450;

        // Player Plane Layout Metrics - Fixed Vertically Facing Forward Near the Bottom Base
        this.player = {
            x: canvas.width / 2,
            y: canvas.height * 0.75,
            width: 125,
            height: 95,
            targetX: canvas.width / 2,
            targetY: canvas.height * 0.75,
            bankAngle: 0,
            hoverOffset: 0,
            hoverDir: 1
        };

        this.initControls();
        this.generateNewTarget();
    }

    // Dynamic Level Skin Switching Module
    updatePlaneSkin() {
        // Enforces systematic skin shifts based on level progression thresholds
        let skinIndex = Math.min(this.currentLevel - 1, this.levelSkins.length - 1);
        let selectedSkinFile = this.levelSkins[skinIndex];
        this.assets.planeImg.src = `assets/images/${selectedSkinFile}`;
    }

    // --- 4. INPUT MAPPING (TV & MOBILE COEXISTENCE) ---
    initControls() {
        // Keyboard & Android TV D-Pad Handlers
        window.addEventListener("keydown", (e) => {
            if (this.state === GameState.MENU) {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    this.selectedMode = this.selectedMode === GameMode.RUNNER ? GameMode.FREE_FLIGHT : GameMode.RUNNER;
                }
                if (e.key === "Enter" || e.key === " ") {
                    this.startGame(this.selectedMode);
                }
                return;
            }

            const step = 65;
            switch (e.key) {
                case "ArrowLeft":
                    this.player.targetX = Math.max(60, this.player.targetX - step);
                    break;
                case "ArrowRight":
                    this.player.targetX = Math.min(canvas.width - 60, this.player.targetX + step);
                    break;
                case "ArrowUp":
                    this.player.targetY = Math.max(canvas.height * 0.35, this.player.targetY - step);
                    break;
                case "ArrowDown":
                    this.player.targetY = Math.min(canvas.height - 90, this.player.targetY + step);
                    break;
            }
        });

        // Mobile Controls: Absolute direct single touch drag manipulation
        canvas.addEventListener("touchmove", (e) => {
            if (this.state === GameState.MENU) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            this.player.targetX = touch.clientX - rect.left;
            this.player.targetY = Math.max(canvas.height * 0.35, touch.clientY - rect.top);
        }, { passive: false });

        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (this.state === GameState.MENU) {
                // Interactive Click Bounds for Transparent Menu Mode Tiles
                const tileW = 180;
                const tileH = 100;
                const runnerX = canvas.width / 2 - 200;
                const freeX = canvas.width / 2 + 20;
                const tileY = canvas.height * 0.55;

                if (clickY > tileY && clickY < tileY + tileH) {
                    if (clickX > runnerX && clickX < runnerX + tileW) {
                        this.startGame(GameMode.RUNNER);
                    } else if (clickX > freeX && clickX < freeX + tileW) {
                        this.startGame(GameMode.FREE_FLIGHT);
                    }
                }
            }
        });
    }

    startGame(mode) {
        this.selectedMode = mode;
        this.state = GameState.AIRPORT;
        
        this.airportY = 0;
        this.runwayY = 0;
        this.score = 0;
        this.currentLevel = 1;
        this.speedMultiplier = 1.0;
        this.consecutiveMistakes = 0;
        
        this.player.x = canvas.width / 2;
        this.player.y = canvas.height * 0.75;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        
        this.updatePlaneSkin();
        loopBackgroundAmbience();
        this.generateNewTarget();
    }

    // --- 5. DATA CURRICULUM SPAWNER ---
    generateNewTarget() {
        let activeSlice = ARABIC_ALPHABET_DATA;
        
        // In Runner Mode curriculum is progressively split by score thresholds
        if (this.selectedMode === GameMode.RUNNER) {
            if (this.currentAirportIndex === 1) activeSlice = ARABIC_ALPHABET_DATA.slice(0, 10);
            else if (this.currentAirportIndex === 2) activeSlice = ARABIC_ALPHABET_DATA.slice(0, 20);
        }

        const randIdx = Math.floor(Math.random() * activeSlice.length);
        this.targetLetter = activeSlice[randIdx].char;
        this.spawnedLetters = [];

        // Exact spawn parameters: 1 minimum, 2 maximum target instances
        const targetCount = Math.floor(Math.random() * 2) + 1;
        const totalCount = Math.floor(Math.random() * 3) + 5; // Restricted between 5-7 max objects on screen

        for (let i = 0; i < targetCount; i++) {
            this.spawnedLetters.push({ char: this.targetLetter, x: 0, y: 0, radius: 45, collected: false });
        }

        while (this.spawnedLetters.length < totalCount) {
            let filler = ARABIC_ALPHABET_DATA[Math.floor(Math.random() * ARABIC_ALPHABET_DATA.length)].char;
            if (filler !== this.targetLetter) {
                this.spawnedLetters.push({ char: filler, x: 0, y: 0, radius: 45, collected: false });
            }
        }

        this.spawnedLetters.sort(() => Math.random() - 0.5);
        
        const laneWidth = canvas.width / this.spawnedLetters.length;
        this.spawnedLetters.forEach((letter, index) => {
            letter.x = (laneWidth * index) + (laneWidth / 2);
            letter.y = -Math.random() * 500 - 120; // Stagger behind upper viewport limit
        });
    }

    // --- 6. TICK MECHANICS & SYSTEM PROCESSING ---
    update() {
        if (this.state === GameState.MENU) return;

        this.envTimer = (this.envTimer + 1) % (this.envCycleDuration * 3);
        if (this.cameraShakeTimer > 0) this.cameraShakeTimer--;

        // Easing interpolation: coordinates catch up smoothly
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        this.player.x += dx * 0.12;
        this.player.y += dy * 0.12;
        this.player.bankAngle = dx * 0.005; 

        // Gentle premium hovering cycle simulation
        this.player.hoverOffset += 0.05 * this.player.hoverDir;
        if (Math.abs(this.player.hoverOffset) > 6) this.player.hoverDir *= -1;

        // Progression Transitions: The letters and runway slide downward to simulate vertical velocity
        let scrollSpeed = 7 * this.speedMultiplier;
        if (this.selectedMode === GameMode.FREE_FLIGHT) scrollSpeed = 5; // Static relaxed speed for free flight

        if (this.state === GameState.AIRPORT) {
            this.airportY += scrollSpeed;
            this.runwayY += scrollSpeed;
            if (this.airportY > canvas.height) {
                this.state = GameState.SKY;
            }
        }

        this.cloud1Y += scrollSpeed * 0.35;
        this.cloud2Y += scrollSpeed * 0.55;
        if (this.cloud1Y > canvas.height) this.cloud1Y = -200;
        if (this.cloud2Y > canvas.height) this.cloud2Y = -400;

        let targetStillExists = false;

        this.spawnedLetters.forEach(letter => {
            letter.y += scrollSpeed;

            if (letter.char === this.targetLetter && !letter.collected) {
                targetStillExists = true;
            }

            if (!letter.collected) {
                const px = this.player.x;
                const py = this.player.y + this.player.hoverOffset;
                const distance = Math.hypot(letter.x - px, letter.y - py);

                if (distance < letter.radius + 35) {
                    letter.collected = true;
                    this.handleCollision(letter.char);
                }
            }
        });

        const allPassed = this.spawnedLetters.every(l => l.y > canvas.height || l.collected);
        if (!targetStillExists || allPassed) {
            this.generateNewTarget();
        }
    }

    handleCollision(character) {
        if (character === this.targetLetter) {
            playLetterAudio(character);
            this.score += 10;
            this.starsCollected += 1;
            this.consecutiveMistakes = 0;

            if (this.selectedMode === GameMode.RUNNER) {
                // Progression increments occur explicitly on accurate selection events
                this.currentLevel++;
                this.speedMultiplier = 1.0 + (this.currentLevel * 0.06);
                this.updatePlaneSkin(); // Skin shifts right away on level change thresholds

                if (this.score >= 100 && this.currentAirportIndex === 1) {
                    this.currentAirportIndex = 2;
                } else if (this.score >= 200 && this.currentAirportIndex === 2) {
                    this.currentAirportIndex = 3;
                }
            }

            this.generateNewTarget();
        } else {
            this.consecutiveMistakes++;
            if (this.consecutiveMistakes >= 5) {
                this.cameraShakeTimer = 15; // Soft vibration feedback after consecutive misses
            }
        }
    }

    // --- 7. RENDERING SYSTEM ---
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (this.cameraShakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        }

        if (this.state === GameState.MENU) {
            this.drawMenu();
        } else {
            this.drawGameplayScreen();
        }

        ctx.restore();
    }

    drawMenu() {
        if (this.assets.background_menu.complete && this.assets.background_menu.src) {
            ctx.drawImage(this.assets.background_menu, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#0a1118";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 54px Arial";
        ctx.textAlign = "center";
        ctx.fillText("AERO-ALPHA", canvas.width / 2, canvas.height * 0.32);

        // Core Layout Panel Constraints
        const tileW = 180;
        const tileH = 100;
        const runnerX = canvas.width / 2 - 200;
        const freeX = canvas.width / 2 + 20;
        const tileY = canvas.height * 0.55;

        // Render Runner Mode Transparent Tile Panel
        ctx.fillStyle = this.selectedMode === GameMode.RUNNER ? "rgba(46, 204, 113, 0.45)" : "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(runnerX, tileY, tileW, tileH);
        ctx.strokeStyle = this.selectedMode === GameMode.RUNNER ? "#2ecc71" : "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 3;
        ctx.strokeRect(runnerX, tileY, tileW, tileH);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Runner Mode", runnerX + tileW / 2, tileY + tileH / 2 + 7);

        // Render Free Flight Transparent Tile Panel
        ctx.fillStyle = this.selectedMode === GameMode.FREE_FLIGHT ? "rgba(46, 204, 113, 0.45)" : "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(freeX, tileY, tileW, tileH);
        ctx.strokeStyle = this.selectedMode === GameMode.FREE_FLIGHT ? "#2ecc71" : "rgba(255, 255, 255, 0.4)";
        ctx.strokeRect(freeX, tileY, tileW, tileH);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Free Flight", freeX + tileW / 2, tileY + tileH / 2 + 7);

        this.drawVersionInfo();
    }

    drawGameplayScreen() {
        const cyclePhase = this.envTimer / this.envCycleDuration;
        let activeSkyImage = this.assets.sky_day;

        if (cyclePhase >= 1 && cyclePhase < 2) activeSkyImage = this.assets.sky_sunset;
        else if (cyclePhase >= 2) activeSkyImage = this.assets.sky_night;

        if (activeSkyImage.complete && activeSkyImage.src) {
            ctx.drawImage(activeSkyImage, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#2980b9";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Airport Takeoff Phase Block
        if (this.state === GameState.AIRPORT) {
            if (this.assets.airport.complete && this.assets.airport.src) {
                ctx.drawImage(this.assets.airport, 0, this.airportY, canvas.width, canvas.height);
            }
            if (this.assets.runway.complete && this.assets.runway.src) {
                const widthOfRunway = canvas.width * 0.45;
                ctx.drawImage(this.assets.runway, canvas.width / 2 - widthOfRunway / 2, this.runwayY, widthOfRunway, canvas.height);
            }
        }

        // Integrated Cloud Layer Rendering
        if (this.assets.clouds_1.complete && this.assets.clouds_1.src) {
            ctx.drawImage(this.assets.clouds_1, 50, this.cloud1Y, 140, 85);
        }
        if (this.assets.clouds_2.complete && this.assets.clouds_2.src) {
            ctx.drawImage(this.assets.clouds_2, canvas.width - 210, this.cloud2Y, 170, 95);
        }

        this.drawLetters();
        this.drawPlayerPlane();
        this.drawHUD();
    }

    drawLetters() {
        this.spawnedLetters.forEach(letter => {
            if (letter.collected) return;

            ctx.save();
            ctx.translate(letter.x, letter.y);

            ctx.font = "bold 76px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 11;
            ctx.strokeText(letter.char, 0, 0);

            ctx.fillStyle = "#FFD700"; 
            ctx.fillText(letter.char, 0, 0);

            ctx.restore();
        });
    }

    drawPlayerPlane() {
        ctx.save();
        const renderY = this.player.y + this.player.hoverOffset;
        ctx.translate(this.player.x, renderY);
        ctx.rotate(this.player.bankAngle); 

        // Enforces full vertical orientation running upwards toward the horizon
        if (this.assets.planeImg.complete && this.assets.planeImg.src) {
            ctx.drawImage(
                this.assets.planeImg,
                -this.player.width / 2,
                -this.player.height / 2,
                this.player.width,
                this.player.height
            );
        } else {
            ctx.fillStyle = "#c0392b";
            ctx.beginPath();
            ctx.moveTo(0, -this.player.height / 2);
            ctx.lineTo(this.player.width / 2, this.player.height / 2);
            ctx.lineTo(-this.player.width / 2, this.player.height / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    drawHUD() {
        // Upper Target Interface Overlay Layout panel
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(canvas.width - 150, 25, 125, 95);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText("TARGET", canvas.width - 87, 48);

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 44px Arial";
        ctx.fillText(this.targetLetter, canvas.width - 87, 94);

        // Left Margin HUD Readouts
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${this.score}`, 25, 45);
        
        if (this.selectedMode === GameMode.RUNNER) {
            ctx.fillText(`LVL: ${this.currentLevel}`, 25, 75);
            ctx.font = "13px Arial";
            ctx.fillStyle = "#FFD700";
            ctx.fillText(`AIRPORT ${this.currentAirportIndex}`, 25, 105);
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.fillText("FREE FLIGHT", 25, 75);
        }

        this.drawVersionInfo();
    }

    drawVersionInfo() {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "12px Courier New";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("V21.2 STABLE", 20, canvas.height - 20);
        ctx.restore();
    }

    run() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// Auto-Launch Engine Instance
const gameInstance = new AeroAlphaGame();
gameInstance.run();
