/**
 * AERO-ALPHA — MASTER GAME DESIGN REFERENCE IMPLEMENTATION
 * Version: V21.2 STABLE (Pre-V21 Architecture)
 * Orientation: Vertical / Portrait Runner Mode First
 */

// --- 1. ENGINE ENGINE INITIALIZATION & CANVAS WRAPPER ---
const canvas = document.getElementById("gameCanvas") || document.createElement("canvas");
if (!canvas.parentNode && document.body) {
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);
}
const ctx = canvas.getContext("2d");

// Responsive Scaling Rules: Optimized for Vertical Android TV aspect ratios & mobile portrait layouts
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

const ARABIC_ALPHABET = [
    "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", 
    "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"
];

// --- 2. THE AUDIO SYSTEM (ZERO SILENT FAILURES) ---
const audioCache = {};
function playLetterAudio(letter) {
    const index = ARABIC_ALPHABET.indexOf(letter) + 1;
    const audioSrc = `assets/audio/letter_${index}.mp3`; // Strict structural pathing matching repo mapping
    
    if (!audioCache[audioSrc]) {
        audioCache[audioSrc] = new Audio(audioSrc);
    }
    audioCache[audioSrc].currentTime = 0; // Immediate reset to handle fast replays seamlessly
    audioCache[audioSrc].play().catch(err => console.log("Audio deferred until interaction: ", err));
}

// --- 3. MASTER GAME CONTROLLER CLASS ---
class AeroAlphaGame {
    constructor() {
        this.state = GameState.MENU;
        this.score = 0;
        this.currentLevel = 1;
        this.speedMultiplier = 1.0;
        this.consecutiveMistakes = 0;
        this.cameraShakeTimer = 0;

        // Module 4: Environment Cycle Parameters
        this.envTimer = 0;
        this.envCycleDuration = 1800; // Frames per time phase block

        // Module 5 & 6: Progressive Layer Architecture Tracking
        this.unlockedAirports = [1];
        this.currentAirportIndex = 1; // 1: Desert, 2: Oasis, 3: Ancient Capital
        this.starsCollected = 0;
        this.unlockedSkins = ["Trainer"];
        this.selectedSkin = "Trainer";

        // Skin Catalog mapping directly to your asset repository configurations
        this.skins = {
            "Trainer": { name: "Trainer", tint: null },
            "Falcon":  { name: "Falcon", tint: "#3498db" },
            "Glider":  { name: "Glider", tint: "#2ecc71" },
            "Gold":    { name: "Gold", tint: "#f1c40f" },
            "Legend":  { name: "Legend", tint: "#9b59b6" }
        };

        // UI Core Target Letters Structure
        this.targetLetter = "";
        this.spawnedLetters = [];

        // Exact Repository Asset File Identifiers
        this.assets = {
            menuBg: new Image(),
            uiPanel: new Image(),
            planeSprite: new Image()
        };
        this.assets.menuBg.src = "assets/images/background_menu.png";
        this.assets.uiPanel.src = "assets/images/ui_panel.webp";
        this.assets.planeSprite.src = "assets/images/plane.png";

        // Background Progression Tracking
        this.airportY = 0;
        this.runwaySpeed = 8;

        // Player Structural Metrics (Positioned at lower middle quadrant for vertical projection)
        this.player = {
            x: canvas.width / 2,
            y: canvas.height * 0.75,
            width: 110,
            height: 80,
            targetX: canvas.width / 2,
            targetY: canvas.height * 0.75,
            bankAngle: 0,
            hoverOffset: 0,
            hoverDir: 1
        };

        this.initControls();
        this.generateNewTarget();
    }

    // --- 4. TV-FIRST CONTROLS & MOBILE DRAG ENGINE ---
    initControls() {
        // Android TV D-Pad & Keyboard Handlers
        window.addEventListener("keydown", (e) => {
            if (this.state === GameState.MENU) {
                if (e.key === "Enter" || e.key === " ") this.startGame();
                if (e.key === "h" || e.key === "H") this.state = GameState.HANGAR;
                return;
            }
            if (this.state === GameState.HANGAR) {
                if (e.key === "Escape" || e.key === "Enter") this.state = GameState.MENU;
                return;
            }

            const step = 50;
            switch (e.key) {
                case "ArrowLeft":
                    this.player.targetX = Math.max(60, this.player.targetX - step);
                    break;
                case "ArrowRight":
                    this.player.targetX = Math.min(canvas.width - 60, this.player.targetX + step);
                    break;
                case "ArrowUp": // Flight path adjustments along vertical plane
                    this.player.targetY = Math.max(canvas.height * 0.4, this.player.targetY - step);
                    break;
                case "ArrowDown":
                    this.player.targetY = Math.min(canvas.height - 80, this.player.targetY + step);
                    break;
            }
        });

        // Mobile Controls: Touch drag with clean direct absolute position tracking
        canvas.addEventListener("touchmove", (e) => {
            if (this.state === GameState.MENU || this.state === GameState.HANGAR) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            this.player.targetX = touch.clientX - rect.left;
            this.player.targetY = Math.max(canvas.height * 0.4, touch.clientY - rect.top);
        }, { passive: false });

        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            if (this.state === GameState.MENU) {
                // UI Core Button Layout Intersections
                if (clickY > canvas.height * 0.65 && clickY < canvas.height * 0.72) {
                    this.state = GameState.HANGAR;
                } else {
                    this.startGame();
                }
            } else if (this.state === GameState.HANGAR) {
                // Hangar Item Node Intersections
                const totalSkins = Object.keys(this.skins);
                totalSkins.forEach((skinName, index) => {
                    const itemY = canvas.height * 0.3 + (index * 70);
                    if (clickY > itemY - 25 && clickY < itemY + 25) {
                        if (this.unlockedSkins.includes(skinName)) {
                            this.selectedSkin = skinName;
                        } else if (this.starsCollected >= index * 10) {
                            this.unlockedSkins.push(skinName);
                            this.selectedSkin = skinName;
                        }
                    }
                });
                // Back Button Check
                if (clickY > canvas.height * 0.85) {
                    this.state = GameState.MENU;
                }
            }
        });
    }

    startGame() {
        this.state = GameState.AIRPORT;
        this.airportY = 0;
        this.score = 0;
        this.currentLevel = 1;
        this.speedMultiplier = 1.0;
        this.consecutiveMistakes = 0;
        this.player.x = canvas.width / 2;
        this.player.y = canvas.height * 0.75;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.generateNewTarget();
    }

    // --- 5. CURRICULUM SPAWN CONTROLLER ---
    generateNewTarget() {
        // Map current airport setting to progressive curriculum alphabet splits
        let activeAlphabetSlice = ARABIC_ALPHABET;
        if (this.currentAirportIndex === 1) activeAlphabetSlice = ARABIC_ALPHABET.slice(0, 10);
        else if (this.currentAirportIndex === 2) activeAlphabetSlice = ARABIC_ALPHABET.slice(0, 20);

        const randIndex = Math.floor(Math.random() * activeAlphabetSlice.length);
        this.targetLetter = activeAlphabetSlice[randIndex];
        this.spawnedLetters = [];

        // Exact appearance rules (1 min, 2 max target letters)
        const targetCount = Math.floor(Math.random() * 2) + 1;
        const totalCount = Math.floor(Math.random() * 3) + 5; // Total range strictly balanced between 5-7

        for (let i = 0; i < targetCount; i++) {
            this.spawnedLetters.push(this.createLetterNode(this.targetLetter));
        }

        while (this.spawnedLetters.length < totalCount) {
            let filler = ARABIC_ALPHABET[Math.floor(Math.random() * ARABIC_ALPHABET.length)];
            if (filler !== this.targetLetter) {
                this.spawnedLetters.push(this.createLetterNode(filler));
            }
        }

        this.spawnedLetters.sort(() => Math.random() - 0.5);
        this.assignInitialPositions();
    }

    createLetterNode(char) {
        return { char: char, x: 0, y: 0, radius: 45, collected: false };
    }

    assignInitialPositions() {
        const laneWidth = canvas.width / this.spawnedLetters.length;
        this.spawnedLetters.forEach((letter, index) => {
            letter.x = (laneWidth * index) + (laneWidth / 2);
            letter.y = -Math.random() * 600 - 150; // Stagger behind upper viewport threshold
        });
    }

    // --- 6. TICK MECHANICS & COLLISION POLISH ---
    update() {
        if (this.state === GameState.MENU || this.state === GameState.HANGAR) return;

        // Module 4: Atmospheric Cycle Frame Loop Counter
        this.envTimer = (this.envTimer + 1) % (this.envCycleDuration * 3);

        if (this.cameraShakeTimer > 0) this.cameraShakeTimer--;

        // Premium Plane Flying Feel: Float, Smooth interpolation & Dynamic banking angles
        const dx = this.player.targetX - this.player.x;
        const dy = this.player.targetY - this.player.y;
        this.player.x += dx * 0.12;
        this.player.y += dy * 0.12;
        this.player.bankAngle = dx * 0.006;

        this.player.hoverOffset += 0.06 * this.player.hoverDir;
        if (Math.abs(this.player.hoverOffset) > 7) this.player.hoverDir *= -1;

        // Progression Transitions: The World moves backward downward, not the plane
        if (this.state === GameState.AIRPORT) {
            this.airportY += this.runwaySpeed * this.speedMultiplier;
            if (this.airportY > canvas.height) {
                this.state = GameState.SKY;
            }
        }

        let targetStillExists = false;
        const continuousScrollSpeed = (6.5 * this.speedMultiplier);

        this.spawnedLetters.forEach(letter => {
            letter.y += continuousScrollSpeed;

            if (letter.char === this.targetLetter && !letter.collected) {
                targetStillExists = true;
            }

            // High Precision Collision Check
            if (!letter.collected) {
                const px = this.player.x;
                const py = this.player.y + this.player.hoverOffset;
                const dist = Math.hypot(letter.x - px, letter.y - py);

                if (dist < letter.radius + 35) {
                    letter.collected = true;
                    this.handleCollision(letter.char);
                }
            }
        });

        // Guardrail Engine: Re-verify character population metrics inside gameplay space
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

            // Smooth incremental difficulty steps
            this.currentLevel++;
            this.speedMultiplier = 1.0 + (this.currentLevel * 0.06);

            // Module 6: Airport Unlock Check Engine
            if (this.score >= 100 && !this.unlockedAirports.includes(2)) {
                this.unlockedAirports.push(2);
                this.currentAirportIndex = 2;
            } else if (this.score >= 200 && !this.unlockedAirports.includes(3)) {
                this.unlockedAirports.push(3);
                this.currentAirportIndex = 3;
            }

            this.generateNewTarget();
        } else {
            // No Punishment / No Interruption Strategy
            this.consecutiveMistakes++;
            if (this.consecutiveMistakes >= 5) {
                this.cameraShakeTimer = 15; // Soft visual feedback pattern for successive errors
            }
        }
    }

    // --- 7. RENDER MANAGEMENT GRAPHICS SYSTEM ---
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (this.cameraShakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
        }

        switch (this.state) {
            case GameState.MENU:
                this.drawMenu();
                break;
            case GameState.HANGAR:
                this.drawHangar();
                break;
            default:
                this.drawDynamicEnvironment();
                this.drawLetters();
                this.drawPlayerPlane();
                this.drawHUD();
                break;
        }

        ctx.restore();
    }

    drawMenu() {
        if (this.assets.menuBg.complete && this.assets.menuBg.src) {
            ctx.drawImage(this.assets.menuBg, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#111a24";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 52px Arial";
        ctx.textAlign = "center";
        ctx.fillText("AERO-ALPHA", canvas.width / 2, canvas.height * 0.35);

        // Interactive Button Outlines
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(canvas.width / 2 - 120, canvas.height * 0.5, 240, 55);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Arial";
        ctx.fillText("START GAME", canvas.width / 2, canvas.height * 0.535);

        ctx.fillStyle = "#34495e";
        ctx.fillRect(canvas.width / 2 - 120, canvas.height * 0.62, 240, 55);
        ctx.fillStyle = "#FFD700";
        ctx.fillText("HANGAR (SKINS)", canvas.width / 2, canvas.height * 0.655);

        this.drawVersionInfo();
    }

    drawHangar() {
        ctx.fillStyle = "#1a252f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText("HANGAR - SELECT SKIN", canvas.width / 2, canvas.height * 0.15);
        ctx.font = "20px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`STARS AVAILABLE: ⭐ ${this.starsCollected}`, canvas.width / 2, canvas.height * 0.22);

        // Render dynamic selection list directly from mapped registry setup
        const totalSkins = Object.keys(this.skins);
        totalSkins.forEach((skinName, index) => {
            const itemY = canvas.height * 0.32 + (index * 75);
            const isUnlocked = this.unlockedSkins.includes(skinName);
            const isSelected = this.selectedSkin === skinName;

            ctx.fillStyle = isSelected ? "#27ae60" : "#2c3e50";
            ctx.fillRect(canvas.width / 2 - 150, itemY - 25, 300, 50);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "18px Arial";
            ctx.textAlign = "left";
            ctx.fillText(skinName, canvas.width / 2 - 120, itemY + 6);

            ctx.textAlign = "right";
            if (isSelected) {
                ctx.fillStyle = "#2ecc71";
                ctx.fillText("ACTIVE", canvas.width / 2 + 120, itemY + 6);
            } else if (isUnlocked) {
                ctx.fillStyle = "#bdc3c7";
                ctx.fillText("EQUIP", canvas.width / 2 + 120, itemY + 6);
            } else {
                ctx.fillStyle = "#e74c3c";
                ctx.fillText(`⭐ ${index * 10}`, canvas.width / 2 + 120, itemY + 6);
            }
        });

        // Universal Return Pathway Box
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(canvas.width / 2 - 80, canvas.height * 0.85, 160, 45);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText("BACK", canvas.width / 2, canvas.height * 0.88);
    }

    drawDynamicEnvironment() {
        let skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const cycleIndex = this.envTimer / this.envCycleDuration;

        // Module 4: Linear Color Multi-Staged Environments (Day -> Sunset -> Night)
        if (cycleIndex < 1) {
            skyGradient.addColorStop(0, "#3498db");
            skyGradient.addColorStop(1, "#85c1e9");
        } else if (cycleIndex < 2) {
            skyGradient.addColorStop(0, "#d35400");
            skyGradient.addColorStop(1, "#f39c12");
        } else {
            skyGradient.addColorStop(0, "#1a252f");
            skyGradient.addColorStop(1, "#2c3e50");
        }

        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Core Interactive Stage Takeoff Module Runway Engine Logic
        if (this.state === GameState.AIRPORT) {
            // Center tarmac tracking setup formatted for portrait/vertical aspect scales
            ctx.fillStyle = "#34495e";
            ctx.fillRect(canvas.width * 0.15, this.airportY, canvas.width * 0.7, canvas.height);

            ctx.fillStyle = "#FFFFFF";
            for (let i = 0; i < 12; i++) {
                let stripeY = this.airportY + (i * 140) % canvas.height;
                ctx.fillRect(canvas.width / 2 - 8, stripeY, 16, 70);
            }
        }
    }

    drawLetters() {
        this.spawnedLetters.forEach(letter => {
            if (letter.collected) return;

            ctx.save();
            ctx.translate(letter.x, letter.y);

            // Toddler-Friendly Typographic Layout Properties
            ctx.font = "bold 76px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Precise Outer Shadow Vectoring 
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 11;
            ctx.strokeText(letter.char, 0, 0);

            // Premium Solid Golden Fonts Overlay Fill Pass
            ctx.fillStyle = "#FFD700";
            ctx.fillText(letter.char, 0, 0);

            ctx.restore();
        });
    }

    drawPlayerPlane() {
        ctx.save();
        const renderingY = this.player.y + this.player.hoverOffset;
        ctx.translate(this.player.x, renderingY);
        ctx.rotate(this.player.bankAngle);

        if (this.assets.planeSprite.complete && this.assets.planeSprite.src) {
            ctx.drawImage(
                this.assets.planeSprite,
                -this.player.width / 2,
                -this.player.height / 2,
                this.player.width,
                this.player.height
            );

            // Module 5: Apply Premium Skin Tint Modifiers Programmatically Over Base Asset
            const currentSkinConfig = this.skins[this.selectedSkin];
            if (currentSkinConfig && currentSkinConfig.tint) {
                ctx.globalCompositeOperation = "source-atop";
                ctx.fillStyle = currentSkinConfig.tint;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(-this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1.0;
            }
        } else {
            // Structural fallback backup context layout polygon
            ctx.fillStyle = "#e74c3c";
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
        const HUD_PanelW = 160;
        const HUD_PanelH = 120;
        const HUD_PanelX = canvas.width - HUD_PanelW - 25;
        const HUD_PanelY = 25;

        if (this.assets.uiPanel.complete && this.assets.uiPanel.src) {
            ctx.drawImage(this.assets.uiPanel, HUD_PanelX, HUD_PanelY, HUD_PanelW, HUD_PanelH);
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(HUD_PanelX, HUD_PanelY, HUD_PanelW, HUD_PanelH);
        }

        // Current Active Alphabetical Match Instructions
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillText("TARGET", HUD_PanelX + (HUD_PanelW / 2), HUD_PanelY + 30);

        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 46px Arial";
        ctx.fillText(this.targetLetter, HUD_PanelX + (HUD_PanelW / 2), HUD_PanelY + 82);

        // Left Margin Metrics Overview
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${this.score}`, 25, 45);
        ctx.fillText(`⭐ X ${this.starsCollected}`, 25, 75);
        
        ctx.font = "14px Arial";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`AIRPORT ${this.currentAirportIndex}`, 25, 105);

        this.drawVersionInfo();
    }

    drawVersionInfo() {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "13px Courier New";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("V21.2 STABLE", 20, canvas.height - 20);
        ctx.restore();
    }

    run() {
        const gameLoop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }
}

// Auto-Launch Engine Instance
const gameInstance = new AeroAlphaGame();
gameInstance.run();
