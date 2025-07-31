(function () {
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
    let isInitialLevel = true;
    let echoTimerText = null;

    function createEcho() {
        const player = window.localPlayer;
        if (!player) return;

        echo = {
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            lastPosIndex: 0,
        };
        echoActive = true;
        despairing = false;
        stunTimer = 0;
        immunityTimer = 0;

        updateEchoTimerUI("The Echo has arrived");
        console.log("The Echo is back...");
    }

    function updateEcho(delta) {
        if (!echo || !window.localPlayer || despairing) return;

        const player = window.localPlayer;

        if (stunTimer > 0) {
            stunTimer -= delta;
            drawEcho(echo.x, echo.y, "rgba(120, 0, 0, 0.4)");
            return;
        }
        if (immunityTimer > 0) {
            immunityTimer -= delta;
        }

        let target = playerTrail[echo.lastPosIndex] || { x: player.x, y: player.y };

        if (Math.random() < 0.3) {
            target = {
                x: player.x + player.vx * 10,
                y: player.y + player.vy * 10,
            };
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

        if (dist < 10 && echo.lastPosIndex < playerTrail.length - 1) {
            echo.lastPosIndex++;
        }

        const pdx = player.x - echo.x;
        const pdy = player.y - echo.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 15) {
            player.die();
        }

        const now = Date.now();
        if (now - lastLaserShot > ECHO_LASER_COOLDOWN) {
            lastLaserShot = now;
            fireLaserAtPlayer(echo.x, echo.y, player.x, player.y);
        }

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
        if (Math.sqrt(dx * dx + dy * dy) < 300) {
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

    function checkForBulletHits() {
        if (!echo || stunTimer > 0 || immunityTimer > 0) return;

        const bullets = window.bullets || [];
        for (let bullet of bullets) {
            const dx = bullet.x - echo.x;
            const dy = bullet.y - echo.y;
            if (Math.sqrt(dx * dx + dy * dy) < 12) {
                console.log("Echo stunned!");
                stunTimer = 2000;
                immunityTimer = 10000;
                return;
            }
        }
    }

    function updateEchoTimerUI(text) {
        if (!echoTimerText) {
            echoTimerText = document.createElement("div");
            echoTimerText.style.position = "fixed";
            echoTimerText.style.top = "10px";
            echoTimerText.style.left = "50%";
            echoTimerText.style.transform = "translateX(-50%)";
            echoTimerText.style.fontSize = "24px";
            echoTimerText.style.fontFamily = "monospace";
            echoTimerText.style.color = "white";
            echoTimerText.style.textShadow = "0 0 8px black";
            echoTimerText.style.zIndex = 9999;
            document.body.appendChild(echoTimerText);
        }

        echoTimerText.textContent = text;
        echoTimerText.style.display = "block";
    }

    function hideEchoTimerUI() {
        if (echoTimerText) {
            echoTimerText.style.display = "none";
        }
    }

    const originalVictory = window.winLevel;
    window.winLevel = function (...args) {
        if (originalVictory) originalVictory.apply(this, args);

        if (echo) {
            despairAnimation();
        }

        setTimeout(() => {
            echo = null;
            playerTrail = [];
            timeSinceStart = 0;
            isInitialLevel = false;
            updateEchoTimerUI("Echo arrives in: 5.0s");
        }, 500);
    };

    const gameLoop = setInterval(() => {
        const player = window.localPlayer;
        if (!player || player.dead) return;

        if (typeof player.level === "undefined") return; // wait for level load

        if (isInitialLevel === null) {
            isInitialLevel = player.level === 0;
        }

        if (!isInitialLevel) {
            timeSinceStart += 50;
            const secondsLeft = Math.max(0, (ECHO_DELAY - timeSinceStart) / 1000);

            if (!echo) {
                updateEchoTimerUI(`Echo arrives in: ${secondsLeft.toFixed(1)}s`);
            }

            if (timeSinceStart > ECHO_DELAY && !echo) {
                createEcho();
            }
        } else {
            hideEchoTimerUI();
        }

        playerTrail.push({
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
        });
        if (playerTrail.length > 1000) playerTrail.shift();

        if (echoActive) {
            updateEcho(50);
            checkForBulletHits();
        }
    }, 50);
})();
