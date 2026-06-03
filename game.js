(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const MatterLib = window.Matter;
  const TABLE = {
    width: canvas.width,
    height: canvas.height,
    wall: 60,
    ballStart: { x: 744, y: 1054 },
    totalBalls: 3,
    flippers: {
      left: { x: 306, y: 1208, width: 184, height: 34, restAngle: -0.24, activeAngle: -0.82 },
      right: { x: 594, y: 1208, width: 184, height: 34, restAngle: 0.24, activeAngle: 0.82 }
    }
  };
  const ui = {
    score: document.getElementById("score-value"),
    ball: document.getElementById("ball-value"),
    ballsLeft: document.getElementById("balls-left-value"),
    multiplier: document.getElementById("multiplier-value"),
    highScore: document.getElementById("high-score-value"),
    restartButton: document.getElementById("restart-button"),
    leftControl: document.getElementById("left-control"),
    rightControl: document.getElementById("right-control"),
    spaceControl: document.getElementById("space-control")
  };
  const gameState = {
    score: 0,
    ballNumber: 1,
    ballsLeft: TABLE.totalBalls,
    multiplier: 1,
    highScore: 0,
    status: "ready",
    resetAt: 0,
    drainCount: 0,
    plungerPower: 0
  };
  const inputState = {
    left: false,
    right: false,
    space: false,
    chargingSince: 0
  };

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function fillRoundedRect(x, y, width, height, radius, fillStyle) {
    roundedRect(x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
  }

  function strokeRoundedRect(x, y, width, height, radius, strokeStyle, lineWidth) {
    roundedRect(x, y, width, height, radius);
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  function drawLabel(text, x, y, color, size) {
    context.fillStyle = color;
    context.font = `800 ${size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, x, y);
  }

  function drawBumper(x, y, radius, label, accent) {
    const glow = context.createRadialGradient(x, y, 8, x, y, radius + 24);
    glow.addColorStop(0, `${accent}cc`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, radius + 24, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#163343";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 10;
    context.strokeStyle = accent;
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "#d9edf5";
    context.beginPath();
    context.arc(x, y, radius - 13, 0, Math.PI * 2);
    context.stroke();

    drawLabel(label, x, y + 3, "#edf7fb", 24);
  }

  function drawTarget(x, y, width, height, label, accent) {
    fillRoundedRect(x, y, width, height, 12, "#102736");
    strokeRoundedRect(x, y, width, height, 12, accent, 5);
    drawLabel(label, x + width / 2, y + height / 2 + 1, "#edf7fb", 20);
  }

  function drawMatterBody(body) {
    const vertices = body.vertices;
    if (!vertices.length) {
      return;
    }

    context.beginPath();
    context.moveTo(vertices[0].x, vertices[0].y);

    for (let index = 1; index < vertices.length; index += 1) {
      context.lineTo(vertices[index].x, vertices[index].y);
    }

    context.closePath();
    context.fillStyle = body.isSensor ? "rgba(255, 79, 61, 0.18)" : "rgba(49, 168, 255, 0.16)";
    context.strokeStyle = body.isSensor ? "rgba(255, 117, 103, 0.9)" : "rgba(49, 168, 255, 0.72)";
    context.lineWidth = body.isSensor ? 4 : 3;
    context.fill();
    context.stroke();
  }

  function drawPhysicsOverlay(bodies) {
    context.save();
    bodies.forEach(drawMatterBody);
    context.restore();

    fillRoundedRect(100, 100, 208, 42, 6, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = "#7bdc6c";
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("MATTER STATIC BODIES", 116, 121);
  }

  function drawStatusBadge() {
    const labels = {
      ready: "HOLD SPACE",
      charging: `LAUNCH ${Math.round(gameState.plungerPower * 100)}%`,
      playing: "BALL IN PLAY",
      "between-balls": "NEXT BALL",
      "game-over": "GAME OVER"
    };
    const label = labels[gameState.status] || "BALL IN PLAY";
    const color = gameState.status === "game-over" ? "#ff7567" : "#7bdc6c";

    fillRoundedRect(590, 100, 210, 42, 6, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = color;
    context.font = "800 18px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 695, 121);
  }

  function drawBall(ball) {
    if (!ball || gameState.status === "between-balls") {
      return;
    }

    const { x, y } = ball.position;
    const radius = ball.circleRadius || 26;
    const shadow = context.createRadialGradient(x + 10, y + 14, 4, x + 10, y + 14, radius + 20);
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.34)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(x + 12, y + 18, radius + 18, 0, Math.PI * 2);
    context.fill();

    const metal = context.createRadialGradient(x - 11, y - 13, 5, x, y, radius);
    metal.addColorStop(0, "#ffffff");
    metal.addColorStop(0.22, "#d9e3e6");
    metal.addColorStop(0.58, "#7e939c");
    metal.addColorStop(1, "#2c414b");
    context.fillStyle = metal;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#edf7fb";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    context.beginPath();
    context.arc(x - radius * 0.34, y - radius * 0.38, radius * 0.22, 0, Math.PI * 2);
    context.fill();
  }

  function drawFlipper(body, isActive) {
    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    fillRoundedRect(-92, -17, 184, 34, 17, isActive ? "#f7fbff" : "#dbe5e7");
    strokeRoundedRect(-92, -17, 184, 34, 17, isActive ? "#31a8ff" : "#738891", 5);

    context.restore();

    context.fillStyle = isActive ? "#31a8ff" : "#ff9b3d";
    context.beginPath();
    context.arc(body.position.x - (body.label === "left-flipper" ? 74 : -74), body.position.y, 12, 0, Math.PI * 2);
    context.fill();
  }

  function drawPlungerCharge() {
    if (gameState.status !== "charging" && gameState.status !== "ready") {
      return;
    }

    const barHeight = 170;
    const filled = barHeight * gameState.plungerPower;
    fillRoundedRect(820, 1010, 26, barHeight, 10, "rgba(5, 11, 16, 0.78)");
    fillRoundedRect(820, 1010 + barHeight - filled, 26, filled, 10, "#ff9b3d");
    strokeRoundedRect(820, 1010, 26, barHeight, 10, "#7e939c", 3);
  }

  function updateHud() {
    ui.score.textContent = gameState.score.toLocaleString("sl-SI");
    ui.ball.textContent = String(gameState.ballNumber);
    ui.ballsLeft.textContent = String(gameState.ballsLeft);
    ui.multiplier.textContent = `${gameState.multiplier}x`;
    ui.highScore.textContent = gameState.highScore.toLocaleString("sl-SI");
  }

  function syncInspectableState(physics) {
    window.ImpolPinball = {
      phase: "3.3",
      matterLoaded: Boolean(MatterLib),
      staticBodyCount: physics ? physics.staticBodies.length : 0,
      ballSpawned: Boolean(physics && physics.ball),
      ballsLeft: gameState.ballsLeft,
      ballNumber: gameState.ballNumber,
      status: gameState.status,
      drainCount: gameState.drainCount,
      plungerPower: Number(gameState.plungerPower.toFixed(2)),
      input: { ...inputState }
    };
  }

  function drawPlayfieldFrame() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#183d4d");
    gradient.addColorStop(0.48, "#102733");
    gradient.addColorStop(1, "#081016");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    strokeRoundedRect(34, 34, canvas.width - 68, canvas.height - 68, 34, "#203946", 36);
    strokeRoundedRect(58, 58, canvas.width - 116, canvas.height - 116, 28, "#7e939c", 10);
    strokeRoundedRect(86, 88, canvas.width - 172, canvas.height - 176, 24, "#183541", 6);

    context.save();
    context.strokeStyle = "#304f5d";
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(116, 1160);
    context.lineTo(310, 1292);
    context.moveTo(784, 1160);
    context.lineTo(590, 1292);
    context.stroke();
    context.restore();

    context.save();
    context.strokeStyle = "#6d8794";
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(150, 230);
    context.quadraticCurveTo(196, 116, 450, 104);
    context.quadraticCurveTo(704, 116, 750, 230);
    context.stroke();
    context.restore();

    context.fillStyle = "rgba(49, 168, 255, 0.08)";
    context.beginPath();
    context.moveTo(130, 238);
    context.quadraticCurveTo(450, 30, 770, 238);
    context.lineTo(714, 386);
    context.quadraticCurveTo(450, 230, 186, 386);
    context.closePath();
    context.fill();

    drawLabel("IMPOL", canvas.width / 2, 178, "#edf7fb", 68);
    drawLabel("ALUMINIUM INDUSTRY", canvas.width / 2, 230, "#9ab3bf", 24);

    drawBumper(300, 392, 56, "MES", "#31a8ff");
    drawBumper(450, 344, 60, "ERP", "#ff9b3d");
    drawBumper(600, 392, 56, "CO2", "#7bdc6c");

    drawTarget(186, 566, 178, 52, "MERILNI", "#31a8ff");
    drawTarget(536, 566, 178, 52, "PROTOKOL", "#31a8ff");
    drawTarget(350, 668, 200, 56, "FURNACE", "#ff9b3d");
    drawTarget(333, 870, 234, 58, "COIL COLLECTOR", "#7bdc6c");

    context.fillStyle = "#1b3541";
    context.strokeStyle = "#7e939c";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(190, 775);
    context.lineTo(320, 728);
    context.lineTo(306, 794);
    context.lineTo(206, 836);
    context.closePath();
    context.fill();
    context.stroke();
    drawLabel("ALCAD", 254, 784, "#edf7fb", 23);

    context.beginPath();
    context.moveTo(710, 775);
    context.lineTo(580, 728);
    context.lineTo(594, 794);
    context.lineTo(694, 836);
    context.closePath();
    context.fill();
    context.stroke();
    drawLabel("E-ODPREMA", 646, 784, "#edf7fb", 21);

    context.strokeStyle = "#2f5260";
    context.lineWidth = 14;
    context.beginPath();
    context.moveTo(768, 150);
    context.lineTo(768, 1130);
    context.stroke();

    context.strokeStyle = "#31a8ff";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(742, 170);
    context.lineTo(742, 1120);
    context.stroke();

    fillRoundedRect(713, 1120, 104, 74, 14, "#0a1820");
    strokeRoundedRect(713, 1120, 104, 74, 14, "#ff9b3d", 4);
    drawLabel("LAUNCH", 765, 1158, "#ff9b3d", 18);

    context.fillStyle = "#071018";
    context.beginPath();
    context.moveTo(355, 1310);
    context.lineTo(545, 1310);
    context.lineTo(505, 1372);
    context.lineTo(395, 1372);
    context.closePath();
    context.fill();

    context.strokeStyle = "#ff4f3d";
    context.lineWidth = 5;
    context.stroke();
    drawLabel("DRAIN", 450, 1338, "#ff7567", 22);

    context.fillStyle = "#31a8ff";
    context.beginPath();
    context.arc(450, 1026, 18, 0, Math.PI * 2);
    context.fill();

    drawLabel("INNOVATION", 450, 1086, "#31a8ff", 28);
  }

  function createMatterWorld() {
    if (!MatterLib) {
      return null;
    }

    const { Bodies, Body, Composite, Engine, Events } = MatterLib;
    const engine = Engine.create();
    engine.gravity.y = 0.9;

    const wallOptions = {
      isStatic: true,
      restitution: 0.72,
      friction: 0.02,
      render: { visible: true }
    };

    const staticBodies = [
      Bodies.rectangle(TABLE.width / 2, 44, TABLE.width - 150, 42, {
        ...wallOptions,
        label: "top-wall"
      }),
      Bodies.rectangle(74, TABLE.height / 2, 42, TABLE.height - 210, {
        ...wallOptions,
        label: "left-wall"
      }),
      Bodies.rectangle(TABLE.width - 74, TABLE.height / 2, 42, TABLE.height - 210, {
        ...wallOptions,
        label: "right-wall"
      }),
      Bodies.rectangle(225, 1225, 260, 32, {
        ...wallOptions,
        label: "left-outlane-guide",
        angle: 0.58
      }),
      Bodies.rectangle(675, 1225, 260, 32, {
        ...wallOptions,
        label: "right-outlane-guide",
        angle: -0.58
      }),
      Bodies.rectangle(768, 670, 30, 980, {
        ...wallOptions,
        label: "launch-lane-divider"
      }),
      Bodies.rectangle(450, 1354, 270, 54, {
        isStatic: true,
        isSensor: true,
        label: "drain-sensor"
      })
    ];
    const flippers = {
      left: Bodies.rectangle(
        TABLE.flippers.left.x,
        TABLE.flippers.left.y,
        TABLE.flippers.left.width,
        TABLE.flippers.left.height,
        {
          isStatic: true,
          label: "left-flipper",
          angle: TABLE.flippers.left.restAngle,
          restitution: 0.86,
          friction: 0.02
        }
      ),
      right: Bodies.rectangle(
        TABLE.flippers.right.x,
        TABLE.flippers.right.y,
        TABLE.flippers.right.width,
        TABLE.flippers.right.height,
        {
          isStatic: true,
          label: "right-flipper",
          angle: TABLE.flippers.right.restAngle,
          restitution: 0.86,
          friction: 0.02
        }
      )
    };

    const ball = Bodies.circle(TABLE.ballStart.x, TABLE.ballStart.y, 26, {
      label: "pinball",
      restitution: 0.88,
      friction: 0.005,
      frictionAir: 0.012,
      density: 0.004
    });

    Composite.add(engine.world, [...staticBodies, flippers.left, flippers.right, ball]);

    [...staticBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes("drain-sensor") && labels.includes("pinball")) {
          drainBall(ball);
        }
      });
    });

    return {
      engine,
      staticBodies,
      flippers,
      ball
    };
  }

  const physics = createMatterWorld();

  function resetBall(ball, holdForLaunch) {
    if (!MatterLib || !ball) {
      return;
    }

    MatterLib.Body.setStatic(ball, Boolean(holdForLaunch));
    MatterLib.Body.setPosition(ball, TABLE.ballStart);
    MatterLib.Body.setVelocity(ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(ball, 0);
  }

  function holdBallInLaunchLane() {
    if (!physics || !["ready", "charging", "between-balls", "game-over"].includes(gameState.status)) {
      return;
    }

    MatterLib.Body.setStatic(physics.ball, true);
    MatterLib.Body.setPosition(physics.ball, TABLE.ballStart);
    MatterLib.Body.setVelocity(physics.ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(physics.ball, 0);
  }

  function launchBall() {
    if (!physics || gameState.status !== "charging") {
      return;
    }

    const power = Math.max(0.34, gameState.plungerPower);
    MatterLib.Body.setStatic(physics.ball, false);
    MatterLib.Body.setVelocity(physics.ball, {
      x: -3.2 - power * 3.8,
      y: -14 - power * 12
    });
    gameState.status = "playing";
    gameState.plungerPower = 0;
    inputState.chargingSince = 0;
    syncInspectableState(physics);
  }

  function drainBall(ball) {
    if (gameState.status !== "playing") {
      return;
    }

    gameState.drainCount += 1;
    gameState.ballsLeft = Math.max(0, gameState.ballsLeft - 1);
    gameState.highScore = Math.max(gameState.highScore, gameState.score);

    if (gameState.ballsLeft === 0) {
      gameState.status = "game-over";
      resetBall(ball, true);
    } else {
      gameState.status = "between-balls";
      gameState.ballNumber += 1;
      gameState.resetAt = performance.now() + 900;
      resetBall(ball, true);
    }

    updateHud();
    syncInspectableState(physics);
  }

  function restartGame() {
    gameState.score = 0;
    gameState.ballNumber = 1;
    gameState.ballsLeft = TABLE.totalBalls;
    gameState.multiplier = 1;
    gameState.status = "ready";
    gameState.resetAt = 0;
    gameState.drainCount = 0;
    gameState.plungerPower = 0;

    if (physics) {
      resetBall(physics.ball, true);
    }

    updateHud();
    syncInspectableState(physics);
  }

  function maybeFinishBetweenBalls() {
    if (gameState.status === "between-balls" && performance.now() >= gameState.resetAt) {
      resetBall(physics.ball, true);
      gameState.status = "ready";
      syncInspectableState(physics);
    }
  }

  function maybeCatchLostBall() {
    if (!physics || gameState.status !== "playing") {
      return;
    }

    if (physics.ball.position.y > TABLE.height + 80) {
      drainBall(physics.ball);
    }
  }

  function setControlActive(element, isActive) {
    element.classList.toggle("is-active", isActive);
  }

  function updateControlsUi() {
    setControlActive(ui.leftControl, inputState.left);
    setControlActive(ui.rightControl, inputState.right);
    setControlActive(ui.spaceControl, inputState.space);
  }

  function handleKeyDown(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      inputState.left = true;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      inputState.right = true;
      event.preventDefault();
    }

    if (event.code === "Space") {
      event.preventDefault();

      if (!inputState.space) {
        if (gameState.status === "game-over") {
          restartGame();
        } else if (gameState.status === "ready") {
          gameState.status = "charging";
          inputState.chargingSince = performance.now();
        }
      }

      inputState.space = true;
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function handleKeyUp(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      inputState.left = false;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      inputState.right = false;
      event.preventDefault();
    }

    if (event.code === "Space") {
      inputState.space = false;
      event.preventDefault();
      launchBall();
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function beginControl(control) {
    if (control === "left") {
      inputState.left = true;
    }

    if (control === "right") {
      inputState.right = true;
    }

    if (control === "space") {
      if (gameState.status === "game-over") {
        restartGame();
      } else if (gameState.status === "ready") {
        gameState.status = "charging";
        inputState.chargingSince = performance.now();
      }

      inputState.space = true;
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function endControl(control) {
    if (control === "left") {
      inputState.left = false;
    }

    if (control === "right") {
      inputState.right = false;
    }

    if (control === "space") {
      inputState.space = false;
      launchBall();
    }

    updateControlsUi();
    syncInspectableState(physics);
  }

  function wireHoldButton(element, control) {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      beginControl(control);
    });

    element.addEventListener("pointerup", (event) => {
      event.preventDefault();
      endControl(control);
    });

    element.addEventListener("pointercancel", () => {
      endControl(control);
    });

    element.addEventListener("lostpointercapture", () => {
      if (control === "left" && inputState.left) {
        endControl(control);
      }

      if (control === "right" && inputState.right) {
        endControl(control);
      }

      if (control === "space" && inputState.space) {
        endControl(control);
      }
    });
  }

  function updatePlungerPower() {
    if (gameState.status !== "charging") {
      return;
    }

    const elapsed = performance.now() - inputState.chargingSince;
    gameState.plungerPower = Math.min(1, elapsed / 1200);
  }

  function updateFlippers() {
    if (!physics) {
      return;
    }

    const leftConfig = TABLE.flippers.left;
    const rightConfig = TABLE.flippers.right;
    const leftTarget = inputState.left ? leftConfig.activeAngle : leftConfig.restAngle;
    const rightTarget = inputState.right ? rightConfig.activeAngle : rightConfig.restAngle;

    MatterLib.Body.setAngle(
      physics.flippers.left,
      physics.flippers.left.angle + (leftTarget - physics.flippers.left.angle) * 0.42
    );
    MatterLib.Body.setAngle(
      physics.flippers.right,
      physics.flippers.right.angle + (rightTarget - physics.flippers.right.angle) * 0.42
    );

    applyFlipperKick();
  }

  function applyFlipperKick() {
    if (gameState.status !== "playing" || !physics.ball) {
      return;
    }

    const ball = physics.ball;
    const nearLeft = Math.abs(ball.position.x - TABLE.flippers.left.x) < 142 && Math.abs(ball.position.y - TABLE.flippers.left.y) < 88;
    const nearRight = Math.abs(ball.position.x - TABLE.flippers.right.x) < 142 && Math.abs(ball.position.y - TABLE.flippers.right.y) < 88;

    if (inputState.left && nearLeft && ball.velocity.y > -16) {
      MatterLib.Body.setVelocity(ball, {
        x: Math.max(ball.velocity.x + 4.8, 5.8),
        y: -18
      });
    }

    if (inputState.right && nearRight && ball.velocity.y > -16) {
      MatterLib.Body.setVelocity(ball, {
        x: Math.min(ball.velocity.x - 4.8, -5.8),
        y: -18
      });
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  wireHoldButton(ui.leftControl, "left");
  wireHoldButton(ui.rightControl, "right");
  wireHoldButton(ui.spaceControl, "space");
  ui.restartButton.addEventListener("click", restartGame);
  if (physics) {
    resetBall(physics.ball, true);
  }
  updateHud();
  updateControlsUi();
  syncInspectableState(physics);

  function update() {
    if (physics) {
      updatePlungerPower();
      updateFlippers();
      holdBallInLaunchLane();
      MatterLib.Engine.update(physics.engine, 1000 / 60);
      maybeCatchLostBall();
      maybeFinishBetweenBalls();
    }

    drawPlayfieldFrame();

    if (physics) {
      drawPhysicsOverlay(physics.staticBodies);
      drawFlipper(physics.flippers.left, inputState.left);
      drawFlipper(physics.flippers.right, inputState.right);
      drawPlungerCharge();
      drawBall(physics.ball);
      drawStatusBadge();
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    window.requestAnimationFrame(update);
  }

  update();
})();
