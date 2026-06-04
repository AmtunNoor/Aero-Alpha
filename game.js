/* Created this Aero Alpha Game for Mariam & Hamza ; June 2026 */

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

const GameState = { MENU: "MENU", AIRPORT: "AIRPORT", SKY: "SKY" };
const GameMode = { RUNNER: "RUNNER", FREE_FLIGHT: "FREE_FLIGHT" };
const Profile = { TODDLER: "HAMZA", JUNIOR: "MARIAM" }; // Toddler vs 5yr Old

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
function playLetterAudio(letterChar) {
    const data = ARABIC_ALPHABET_DATA.find(item => item.char === letterChar);
    if (!data) return;
    const audioSrc = `assets/sound/letters/${data.file}`;
    if (!audioCache[audioSrc]) audioCache[audioSrc] = new Audio(audioSrc);
    audioCache[audioSrc].currentTime = 0; 
    audioCache[audioSrc].play().catch(() => {});
}

class AeroAlphaGame {
    constructor() {
        this.state = GameState.MENU;
        this.selectedMode = GameMode.RUNNER;
        this.currentProfile = Profile.TODDLER; // Safety Default
        this.menuViewIndex = 0; 
        this.score = 0;
        this.currentLevel = 1;
        this.highestLevelReached = 1;
        this.speedMultiplier = 1.0;
        
        this.envTimer = 0;
        this.airportPhaseTimer = 0;
        this.airportMaxDuration = 180;

        this.isBoosting = false;
        this.boostTimer = 0;
        this.particles = [];
        this.bursts = [];

        this.assets = {
            background_menu: new Image(), airport: new Image(), runway: new Image(),
            sky_day: new Image(), sky_sunset: new Image(), sky_night: new Image(),
            planeImg: new Image()
        };

        this.assets.background_menu.src = "assets/images/background_menu.png";
        this.assets.airport.src = "assets/images/airport.png";
        this.assets.runway.src = "assets/images/runway.png";
        this.assets.sky_day.src = "assets/images/sky_day.webp";
        this.assets.sky_sunset.src = "assets/images/sky_sunset.webp";
        this.assets.sky_night.src = "assets/images/sky_night.webp";
        
        this.levelSkinMapping = [
            { level: 1, file: "plane_trainer.png" },
            { level: 3, file: "plane_falcon.png" },
            { level: 5, file: "plane_glider.png" },
            { level: 7, file: "plane_gold.png" },
            { level: 9, file: "plane_legend.png" }
        ];

        this.player = { x: canvas.width / 2, y: canvas.height * 0.75, width: 120, height: 90, targetX: canvas.width / 2, targetY: canvas.height * 0.75 };
        
        this.updatePlaneSkin();
        this.initControls();
        this.generateNewTarget();
    }

    updatePlaneSkin() {
        let equipped = "plane_trainer.png";
        for (let skin of this.levelSkinMapping) {
            if (this.currentLevel >= skin.level) equipped = skin.file;
        }
        this.assets.planeImg.src = `assets/images/${equipped}`;
    }

    requestNativeFullScreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }

    initControls() {
        // Shared Keyboard Handler (TV Navigation compatibility)
        window.addEventListener("keydown", (e) => {
            if (this.state === GameState.MENU) {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    this.selectedMode = this.selectedMode === GameMode.RUNNER ? GameMode.FREE_FLIGHT : GameMode.RUNNER;
                }
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    this.currentProfile = this.currentProfile === Profile.TODDLER ? Profile.JUNIOR : Profile.TODDLER;
                }
                if (e.key === "Enter" || e.key === " ") {
                    this.requestNativeFullScreen();
                    this.startGame(this.selectedMode);
                }
                return;
            }
            
            // In-Game step movements
            let step = this.currentProfile === Profile.TODDLER ? 120 : 70; // Toddlers move in bigger increments to avoid straining finger tracking
            if (e.key === "ArrowLeft") this.player.targetX = Math.max(60, this.player.targetX - step);
            if (e.key === "ArrowRight") this.player.targetX = Math.min(canvas.width - 60, this.player.targetX + step);
            if (e.key === " ") {
                this.isBoosting = true;
                this.boostTimer = 45;
            }
        });

        // Mobile / Tablet Fluid Touch Targeting
        canvas.addEventListener("touchmove", (e) => {
            if (this.state === GameState.MENU) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            this.player.targetX = touch.clientX - rect.left;
        }, { passive: false });

        // Menu Selections & Single Taps
        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const midX = canvas.width / 2;

            if (this.state === GameState.MENU) {
                // Check Profile selection clicks
                if (clickY > canvas.height * 0.35 && clickY < canvas.height * 0.43) {
                    if (clickX > midX - 180 && clickX < midX - 10) this.currentProfile = Profile.TODDLER;
                    if (clickX > midX + 10 && clickX < midX + 180) this.currentProfile = Profile.JUNIOR;
                }
                
                // Check Mode Selection Boxes and Launch
                if (clickY > canvas.height * 0.50 && clickY < canvas.height * 0.62) {
                    if (clickX > midX - 210 && clickX < midX - 20) {
                        this.selectedMode = GameMode.RUNNER;
                        this.requestNativeFullScreen();
                        this.startGame(GameMode.RUNNER);
                    } else if (clickX > midX + 20 && clickX < midX + 210) {
                        this.selectedMode = GameMode.FREE_FLIGHT;
                        this.requestNativeFullScreen();
                        this.startGame(GameMode.FREE_FLIGHT);
                    }
                }
            } else {
                this.player.targetX = clickX;
            }
        });
    }

    startGame(mode) {
        this.selectedMode = mode;
        this.state = GameState.AIRPORT;
        this.score = 0;
        this.currentLevel = 1;
        this.airportPhaseTimer = 0;
        
        // Dynamic Profile-specific baseline mechanics
        if (this.currentProfile === Profile.TODDLER) {
            this.speedMultiplier = 0.5; // Very slow drop rate so they can see and register letters
        } else {
            this.speedMultiplier = 1.0; // Standard 5 year old baseline challenge
        }

        this.generateNewTarget();
    }

    generateNewTarget() {
        const randIdx = Math.floor(Math.random() * ARABIC_ALPHABET_DATA.length);
        this.targetLetter = ARABIC_ALPHABET_DATA[randIdx].char;
        this.spawnedLetters = [];
        
        // Fewer columns (3) for Toddlers to reduce clutter, 5 columns for 5-Year Olds
        const totalColumns = this.currentProfile === Profile.TODDLER ? 3 : 5;
        
        for (let i = 0; i < totalColumns; i++) {
            let char = i === 0 ? this.targetLetter : ARABIC_ALPHABET_DATA[Math.floor(Math.random() * ARABIC_ALPHABET_DATA.length)].char;
            this.spawnedLetters.push({ 
                char, 
                x: (canvas.width / totalColumns) * i + (canvas.width / (totalColumns * 2)), 
                y: -Math.random() * 400 - 100, 
                collected: false 
            });
        }
        // Shuffle columns array so target letter isn't always sitting on left column
        this.spawnedLetters.sort(() => Math.random() - 0.5);
    }

    update() {
        if (this.state === GameState.MENU) return;
        this.envTimer++;
        
        // Distinct baseline calculations for profiles
        let baseSpeed = this.selectedMode === GameMode.RUNNER ? 7 : 5;
        let speed = baseSpeed * this.speedMultiplier;
        
        if (this.isBoosting) {
            speed *= 1.6;
            this.boostTimer--;
            if (this.boostTimer <= 0) this.isBoosting = false;
            this.particles.push({ x: this.player.x, y: this.player.y + 40, alpha: 1, color: this.selectedMode === GameMode.RUNNER ? "#FFD700" : "#00FFFF" });
        }

        if (this.state === GameState.AIRPORT) {
            this.airportPhaseTimer++;
            if (this.airportPhaseTimer > this.airportMaxDuration + 60) this.state = GameState.SKY;
        }

        // Toddlers get super-assisted "magnetic fluid snapping" to letters, 5-Year Olds get standard control tracking weight
        let trackingInterpolation = this.currentProfile === Profile.TODDLER ? 0.25 : 0.12;
        this.player.x += (this.player.targetX - this.player.x) * trackingInterpolation;
        
        // Strict boundary padding
        this.player.x = Math.max(60, Math.min(canvas.width - 60, this.player.x));

        this.spawnedLetters.forEach(l => {
            l.y += speed;
            
            // Hit check collision radial distance evaluation
            if (!l.collected && Math.hypot(l.x - this.player.x, l.y - this.player.y) < 75) {
                l.collected = true;
                if (l.char === this.targetLetter) {
                    playLetterAudio(l.char);
                    this.score += 10;
                    this.bursts.push({ x: l.x, y: l.y, radius: 10, alpha: 1 });
                    
                    this.currentLevel = Math.floor(this.score / 50) + 1;
                    if (this.currentLevel > this.highestLevelReached) this.highestLevelReached = this.currentLevel;
                    
                    // Progressive speed updates (Only applied if they are on the 5-Year Old Junior tier)
                    if (this.currentProfile === Profile.JUNIOR) {
                        this.speedMultiplier = 1.0 + (this.currentLevel * 0.08);
                    }
                    
                    this.updatePlaneSkin();
                    this.generateNewTarget();
                }
            }
        });

        // Recycling loops if missed
        if (this.spawnedLetters.every(l => l.y > canvas.height || l.collected)) {
            this.spawnedLetters.forEach(l => { 
                l.y = -Math.random() * 400 - 100; 
                l.collected = false; 
            });
        }

        this.particles.forEach((p, i) => { p.y += 4; p.alpha -= 0.02; if (p.alpha <= 0) this.particles.splice(i, 1); });
        this.bursts.forEach((b, i) => { b.radius += 5; b.alpha -= 0.04; if (b.alpha <= 0) this.bursts.splice(i, 1); });
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (this.state === GameState.MENU) this.drawMenu();
        else this.drawGame();
    }

    drawMenu() {
        ctx.drawImage(this.assets.background_menu, 0, 0, canvas.width, canvas.height);
        const midX = canvas.width / 2;
        
        // --- 1. AGE INTERFACE CONFIG SELECTORS ---
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(midX - 190, canvas.height * 0.34, 180, 50);
        ctx.fillRect(midX + 10, canvas.height * 0.34, 180, 50);
        
        // Highlighting Selected Profile Border Frame
        ctx.strokeStyle = "#00FF66";
        ctx.lineWidth = 4;
        if (this.currentProfile === Profile.TODDLER) {
            ctx.strokeRect(midX - 190, canvas.height * 0.34, 180, 50);
        } else {
            ctx.strokeRect(midX + 10, canvas.height * 0.34, 180, 50);
        }

        ctx.fillStyle = "#FFF";
        ctx.font = "bold 18px Arial";
        ctx.fillText("HAMZA", midX - 130, canvas.height * 0.37);
        ctx.fillText("MARIAM", midX + 65, canvas.height * 0.37);

        // --- 2. GAME SELECTION TILES ---
        ctx.fillStyle = this.selectedMode === GameMode.RUNNER ? "rgba(0, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(midX - 210, canvas.height * 0.48, 190, 90);
        
        ctx.fillStyle = this.selectedMode === GameMode.FREE_FLIGHT ? "rgba(0, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(midX + 20, canvas.height * 0.48, 190, 90);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 22px Arial";
        ctx.fillText("JET STREAM", midX - 185, canvas.height * 0.52);
        ctx.font = "14px Arial";
        ctx.fillText("(Vertical Plane)", midX - 145, canvas.height * 0.55);

        ctx.fillStyle = "#FFF";
        ctx.font = "bold 22px Arial";
        ctx.fillText("FREE FLIGHT", midX + 45, canvas.height * 0.52);
        ctx.font = "14px Arial";
        ctx.fillText("(Horizontal Plane)", midX + 55, canvas.height * 0.55);

        // --- 3. UNLOCKED VEHICLES ROW ---
        this.levelSkinMapping.forEach((s, i) => {
            ctx.fillStyle = this.highestLevelReached >= s.level ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.25)";
            ctx.fillRect(midX - 200 + (i * 85), canvas.height * 0.72, 75, 75);
        });
    }

    drawGame() {
        ctx.drawImage(this.assets.sky_day, 0, 0, canvas.width, canvas.height);

        if (this.state === GameState.AIRPORT) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - (this.airportPhaseTimer - this.airportMaxDuration) / 60);
            ctx.drawImage(this.assets.airport, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.assets.runway, canvas.width / 2 - 200, 0, 400, canvas.height);
            ctx.restore();
        }

        // --- THEME ENGINE ORIENTATION SHIFTER ---
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        
        if (this.selectedMode === GameMode.RUNNER) {
            // Runner mode structure: Fixed Vertical facing up towards sky
            ctx.rotate(-Math.PI / 2); 
        } else {
            // Free flight mode structure: Facing Horizon Horizontal orientation
            ctx.rotate(0); 
        }
        
        ctx.drawImage(this.assets.planeImg, -45, -60, 90, 120);
        ctx.restore();

        // Target Floating Alphabets Rendering
        this.spawnedLetters.forEach(l => {
            if (l.collected) return;
            ctx.fillStyle = l.char === this.targetLetter ? "#FFD700" : "#FFFFFF";
            ctx.font = this.currentProfile === Profile.TODDLER ? "bold 75px Arial" : "bold 55px Arial"; // Larger letters for Toddlers
            ctx.fillText(l.char, l.x, l.y);
        });

        // Heads Up Dashboard Info
        ctx.fillStyle = "#00FFFF";
        ctx.font = "bold 32px Arial";
        ctx.fillText(`SCORE: ${this.score}`, 30, 60);
        ctx.fillText(`PROFILE: ${this.currentProfile}`, 30, 100);
        
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 45px Arial";
        ctx.fillText(`HIT: ${this.targetLetter}`, canvas.width - 240, 60);
        
        this.particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill(); });
        this.bursts.forEach(b => { ctx.globalAlpha = b.alpha; ctx.strokeStyle = "#00FFCC"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2); ctx.stroke(); });
    }
}

const game = new AeroAlphaGame();
function main() { game.update(); game.draw(); requestAnimationFrame(main); }
main();
