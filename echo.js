(function() {
    let echo = null;
    let playerTrail = [];
    let timeSinceStart = 0;
    let echoActive = false;
    const ECHO_DELAY = 5000;
    const ECHO_SPEED = 2.2;
    const ECHO_LASER_COOLDOWN = 3000;
    let lastLaserShot = 0;
    let despairing = false;
    let stunTimer = 0;
    let immunityTimer = 0;

    function createEcho() {
        const player = window.localPlayer;
        if (!player) return;

        echo = {
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            lastPosIndex: 0,
            color: "rgba(255, 0, 0, 0.6)",
            canShoot: true
        };
        echoActive = true;
        despairing = false;
        stunTimer = 0;
        immunityTimer = 0;
        console.log("The Echo is back...");
    }

    function updateEcho(delta) {
        if (!echo || !window.localPlayer || despairing) return;

        const player = window.localPlayer;

        // Handle stun and immunity timers
        if (stunTimer > 0) {
            stunTimer -= delta;
            drawEcho(echo.x, echo.y, "rgba(120, 0, 0, 0.4)");
            return;
        }
        if (immunityTimer > 0) {
            immunityTimer -= delta;
        }

        // Smart pathfinding:
        let target = playerTrail[echo.lastPosIndex] || { x: player.x, y: player.y };

        const predictionChance = Math.random();
        if (predictionChance < 0.3) {
            // Predict player direction
            const predictX = player.x + player.vx * 10;
            const predictY = player.y + player.vy * 10;
            target = { x: predictX, y: predictY };
        }

        const dx = target.x - echo.x;
        const dy = target.y - echo.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            echo.vx = (dx / dist) * ECHO_SPEED;
            echo.vy = (dy / dist) * ECHO_SPEED;
        }

        echo.x += echo.vx;
        echo.y += echo.vy;

        // Trail progression
        if (dist < 10 && echo.lastPosIndex < playerTrail.length - 1) {
            echo.lastPosIndex++;
        }

        // Touch kill
        const pdx = player.x - echo.x;
        const pdy = player.y - echo.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 15) {
            player.die();
        }

        // Laser
        const now = Date.now();
        if (now - lastLaserShot > ECHO_LASER_COOLDOWN) {
            lastLaserShot = now;
            fireLaserAtPlayer(echo.x, echo.y, player.x, player.y);
        }

        // Draw echo with color based on immunity
        const color = immunityTimer > 0 ? "rgba(150, 0, 0, 0.6)" : "rgba(255, 0, 0, 0.4)";
        drawEcho(echo.x, echo.y, color);
    }

    function drawEcho(x, y, color) {
        const ctx = window.canvas.getContext("2d");
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + (Math.random() * 2 - 1), y + (Math.random() * 2 - 1), 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function fireLaserAtPlayer(fromX, fromY, toX, toY) {
        const ctx = window.canvas.getContext("2d");
        ctx.save();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.restore();

        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
            window.localPlayer.die();
        }
    }

    function despairAnimation() {
        console.log("The Echo despairs...");
        despairing = true;
        echoActive = false;
        let flashes = 10;
        let flashInterval = setInterval(() => {
            drawEcho(echo.x + (Math.random() * 8 - 4), echo.y + (Math.random() * 8 - 4), "rgba(255,0,0,0.3)");
            flashes--;
            if (flashes <= 0) {
                clearInterval(flashInterval);
            }
        }, 100);
    }

    // Detect hits from bullets (scan bullets array and check collision)
    function checkForBulletHits() {
        if (!echo || stunTimer > 0 || immunityTimer > 0) return;

        const bullets = window.bullets || [];
        for (let bullet of bullets) {
            const dx = bullet.x - echo.x;
            const dy = bullet.y - echo.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 12) {
                // Bullet hit
                console.log("Echo stunned!");
                stunTimer = 2000;
                immunityTimer = 10000;
                return;
            }
        }
    }

    // Hook into level win
    const originalVictory = window.winLevel;
    window.winLevel = function(...args) {
        if (originalVictory) originalVictory.apply(this, args);
        if (echo) {
            despairAnimation();
        }
        setTimeout(() => {
            echo = null;
            playerTrail = [];
            timeSinceStart = 0;
        }, 500);
    };

    // Main loop
    const gameLoop = setInterval(() => {
        const player = window.localPlayer;
        if (!player || player.dead) return;

        timeSinceStart += 50;

        // Track trail
        playerTrail.push({ x: player.x, y: player.y, vx: player.vx, vy: player.vy });
        if (playerTrail.length > 1000) playerTrail.shift();

        if (timeSinceStart > ECHO_DELAY && !echo) {
            createEcho();
        }

        if (echoActive) {
            updateEcho(50);
            checkForBulletHits();
        }
    }, 50);
})();
