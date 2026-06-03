(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const MatterLib = window.Matter;
  const TABLE = {
    width: canvas.width,
    height: canvas.height,
    wall: 60,
    ballStart: { x: 748, y: 1066 },
    totalBalls: 3,
    flippers: {
      left: { pivotX: 244, pivotY: 1218, length: 166, height: 32, restAngle: 0.22, activeAngle: -0.58 },
      right: { pivotX: 656, pivotY: 1218, length: 166, height: 32, restAngle: Math.PI - 0.22, activeAngle: Math.PI + 0.58 }
    }
  };
  const DEBUG_PHYSICS = false;
  const HIGH_SCORE_KEY = "impol-pinball.high-score";
  const ASSET_CONFIG = {
    furnace: { src: "assets/images/furnace-target.png", width: 154, height: 132, yOffset: -8 },
    coil: { src: "assets/images/coil-collector.png", width: 184, height: 120, yOffset: -8 },
    mes: { src: "assets/images/mes-bumper.png", width: 124, height: 118, yOffset: -4 },
    erp: { src: "assets/images/erp-core-bumper.png", width: 126, height: 126, yOffset: -6 },
    co2: { src: "assets/images/green-aluminium-bumper.png", width: 124, height: 110, yOffset: -4 },
    "measurement-left": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "measurement-right": { src: "assets/images/measurement-target.png", width: 116, height: 116, yOffset: -12 },
    "e-odprema": { src: "assets/images/e-odprema-truck.png", width: 138, height: 116, yOffset: -10 },
    alcad: { src: "assets/images/alcad-marker.png", width: 132, height: 116, yOffset: -10 }
  };
  const TABLE_CONFIG = {
    bumpers: [
      { id: "mes", label: "MES", x: 300, y: 392, radius: 56, accent: "#31a8ff", event: "hit:MES", points: 1000 },
      { id: "erp", label: "ERP", x: 450, y: 344, radius: 60, accent: "#ff9b3d", event: "hit:ERP", points: 1500 },
      { id: "co2", label: "CO2", x: 600, y: 392, radius: 56, accent: "#7bdc6c", event: "hit:GREEN", points: 1000 }
    ],
    targets: [
      { id: "measurement-left", label: "MERILNI", x: 275, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: 500 },
      { id: "measurement-right", label: "PROTOKOL", x: 625, y: 592, width: 178, height: 52, accent: "#31a8ff", event: "hit:MEASUREMENT", points: 500 },
      { id: "furnace", label: "FURNACE", x: 450, y: 696, width: 200, height: 56, accent: "#ff9b3d", event: "hit:FURNACE", points: 750 },
      { id: "coil", label: "COIL COLLECTOR", x: 450, y: 899, width: 234, height: 58, accent: "#7bdc6c", event: "hit:COIL", points: 750 },
      { id: "alcad", label: "ALCAD", x: 254, y: 784, width: 128, height: 48, accent: "#9ab3bf", event: "hit:ALCAD", points: 500 },
      { id: "e-odprema", label: "E-ODPREMA", x: 646, y: 784, width: 156, height: 48, accent: "#9ab3bf", event: "hit:EODPREMA", points: 500 }
    ]
  };
  const MISSION_CONFIG = [
    {
      id: "measurement",
      label: "MERILNI PROTOKOL",
      event: "hit:MEASUREMENT",
      required: 3,
      bonus: 5000,
      reward: "Quality bonus"
    },
    {
      id: "mes",
      label: "MES ONLINE",
      event: "hit:MES",
      required: 5,
      bonus: 8000,
      reward: "Real-time bonus"
    },
    {
      id: "erp",
      label: "ERP GO-LIVE",
      event: "hit:ERP",
      required: 3,
      bonus: 10000,
      multiplierReward: 2,
      reward: "2x multiplier"
    }
  ];
  const ui = {
    score: document.getElementById("score-value"),
    ball: document.getElementById("ball-value"),
    ballsLeft: document.getElementById("balls-left-value"),
    multiplier: document.getElementById("multiplier-value"),
    highScore: document.getElementById("high-score-value"),
    restartButton: document.getElementById("restart-button"),
    leftControl: document.getElementById("left-control"),
    rightControl: document.getElementById("right-control"),
    spaceControl: document.getElementById("space-control"),
    missions: {
      measurement: {
        row: document.getElementById("mission-measurement"),
        progress: document.getElementById("mission-measurement-progress")
      },
      mes: {
        row: document.getElementById("mission-mes"),
        progress: document.getElementById("mission-mes-progress")
      },
      erp: {
        row: document.getElementById("mission-erp"),
        progress: document.getElementById("mission-erp-progress")
      }
    }
  };
  const gameState = {
    score: 0,
    ballNumber: 1,
    ballsLeft: TABLE.totalBalls,
    multiplier: 1,
    highScore: loadHighScore(),
    status: "ready",
    resetAt: 0,
    drainCount: 0,
    plungerPower: 0,
    lastEvent: "",
    feedback: "",
    feedbackUntil: 0,
    hitCounts: {},
    activeMissionId: "measurement",
    missions: createMissionState()
  };
  const inputState = {
    left: false,
    right: false,
    leftPulse: false,
    rightPulse: false,
    space: false,
    chargingSince: 0
  };
  const assets = loadAssets(ASSET_CONFIG);

  function createMissionState() {
    return MISSION_CONFIG.reduce((missions, mission) => {
      missions[mission.id] = {
        progress: 0,
        completed: false,
        lastProgressAt: 0
      };
      return missions;
    }, {});
  }

  function loadAssets(config) {
    return Object.entries(config).reduce((loadedAssets, [id, asset]) => {
      const image = new Image();
      image.src = asset.src;
      loadedAssets[id] = {
        ...asset,
        image,
        loaded: false
      };
      image.addEventListener("load", () => {
        loadedAssets[id].loaded = true;
      });
      return loadedAssets;
    }, {});
  }

  function loadHighScore() {
    try {
      const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
      const parsed = Number.parseInt(stored || "0", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(gameState.highScore));
    } catch (_error) {
      // Keep the game playable if browser storage is unavailable.
    }
  }

  function setHighScore(candidate) {
    if (candidate <= gameState.highScore) {
      return;
    }

    gameState.highScore = candidate;
    saveHighScore();
  }

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

  function drawBumper(x, y, radius, label, accent, isLit) {
    const glow = context.createRadialGradient(x, y, 8, x, y, radius + 24);
    glow.addColorStop(0, isLit ? `${accent}ff` : `${accent}cc`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, radius + 24, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#163343";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = isLit ? 14 : 10;
    context.strokeStyle = accent;
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "#d9edf5";
    context.beginPath();
    context.arc(x, y, radius - 13, 0, Math.PI * 2);
    context.stroke();

    drawLabel(label, x, y + 3, "#edf7fb", 24);
  }

  function drawTarget(x, y, width, height, label, accent, isLit) {
    fillRoundedRect(x, y, width, height, 12, isLit ? "rgba(23, 61, 79, 0.96)" : "#102736");
    strokeRoundedRect(x, y, width, height, 12, isLit ? "#edf7fb" : accent, isLit ? 5 : 4);
    drawLabel(label, x + width / 2, y + height / 2 + 1, "#edf7fb", label.length > 10 ? 18 : 20);
  }

  function drawAsset(id, x, y, fallbackWidth, fallbackHeight) {
    const asset = assets[id];

    if (!asset || !asset.loaded) {
      return false;
    }

    const width = asset.width || fallbackWidth;
    const height = asset.height || fallbackHeight;
    const drawX = x - width / 2;
    const drawY = y - height / 2 + (asset.yOffset || 0);

    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.38)";
    context.shadowBlur = 18;
    context.shadowOffsetY = 10;
    context.drawImage(asset.image, drawX, drawY, width, height);
    context.restore();

    return true;
  }

  function drawConfiguredBumpers() {
    TABLE_CONFIG.bumpers.forEach((bumper) => {
      const isLit = wasRecentlyHit(bumper.id);
      const drewAsset = drawAsset(bumper.id, bumper.x, bumper.y, bumper.radius * 2.2, bumper.radius * 2.2);

      if (!drewAsset) {
        drawBumper(bumper.x, bumper.y, bumper.radius, bumper.label, bumper.accent, isLit);
      }

      if (isLit) {
        context.strokeStyle = "#edf7fb";
        context.lineWidth = 5;
        context.beginPath();
        context.arc(bumper.x, bumper.y, bumper.radius + 8, 0, Math.PI * 2);
        context.stroke();
      }
    });
  }

  function drawConfiguredTargets() {
    TABLE_CONFIG.targets.forEach((target) => {
      const isLit = wasRecentlyHit(target.id);
      const drewAsset = drawAsset(target.id, target.x, target.y, target.width, target.height);

      if (!drewAsset) {
        drawTarget(
          target.x - target.width / 2,
          target.y - target.height / 2,
          target.width,
          target.height,
          target.label,
          target.accent,
          isLit
        );
      }

      if (isLit) {
        strokeRoundedRect(
          target.x - target.width / 2 - 4,
          target.y - target.height / 2 - 4,
          target.width + 8,
          target.height + 8,
          14,
          "#edf7fb",
          4
        );
      }
    });
  }

  function wasRecentlyHit(id) {
    return gameState.hitCounts[id] && performance.now() - gameState.hitCounts[id] < 220;
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
    if (!DEBUG_PHYSICS) {
      return;
    }

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

  function drawScoreFeedback() {
    if (!gameState.feedback || performance.now() > gameState.feedbackUntil) {
      return;
    }

    fillRoundedRect(314, 1000, 272, 48, 8, "rgba(5, 11, 16, 0.72)");
    context.fillStyle = "#ff9b3d";
    context.font = "800 22px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(gameState.feedback, 450, 1024);
  }

  function drawMissionLights() {
    MISSION_CONFIG.forEach((mission, index) => {
      const state = gameState.missions[mission.id];
      const x = 316 + index * 134;
      const y = 964;
      const isActive = gameState.activeMissionId === mission.id;

      context.fillStyle = state.completed ? "#7bdc6c" : isActive ? "#ff9b3d" : "#304f5d";
      context.beginPath();
      context.arc(x, y, isActive ? 15 : 11, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(237, 247, 251, 0.62)";
      context.lineWidth = 3;
      context.stroke();
    });
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
    const config = body.label === "left-flipper" ? TABLE.flippers.left : TABLE.flippers.right;
    const pivotX = config.pivotX;
    const pivotY = config.pivotY;

    context.save();
    context.translate(body.position.x, body.position.y);
    context.rotate(body.angle);

    fillRoundedRect(-config.length / 2, -config.height / 2, config.length, config.height, 16, isActive ? "#f7fbff" : "#dbe5e7");
    strokeRoundedRect(-config.length / 2, -config.height / 2, config.length, config.height, 16, isActive ? "#31a8ff" : "#738891", 5);

    context.restore();

    context.fillStyle = isActive ? "#31a8ff" : "#ff9b3d";
    context.beginPath();
    context.arc(pivotX, pivotY, 12, 0, Math.PI * 2);
    context.fill();
  }

  function drawPlungerCharge() {
    if (gameState.status !== "charging" && gameState.status !== "ready") {
      return;
    }

    const barHeight = 154;
    const filled = barHeight * gameState.plungerPower;
    fillRoundedRect(820, 1020, 26, barHeight, 10, "rgba(5, 11, 16, 0.78)");
    fillRoundedRect(820, 1020 + barHeight - filled, 26, filled, 10, "#ff9b3d");
    strokeRoundedRect(820, 1020, 26, barHeight, 10, "#7e939c", 3);
  }

  function updateHud() {
    ui.score.textContent = gameState.score.toLocaleString("sl-SI");
    ui.ball.textContent = String(gameState.ballNumber);
    ui.ballsLeft.textContent = String(gameState.ballsLeft);
    ui.multiplier.textContent = `${gameState.multiplier}x`;
    ui.highScore.textContent = gameState.highScore.toLocaleString("sl-SI");
    updateMissionUi();
  }

  function updateMissionUi() {
    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];
      const missionUi = ui.missions[mission.id];
      missionUi.progress.textContent = state.completed ? "DONE" : `${state.progress}/${mission.required}`;
      missionUi.row.classList.toggle("is-complete", state.completed);
      missionUi.row.classList.toggle("is-active", gameState.activeMissionId === mission.id && !state.completed);
    });
  }

  function syncInspectableState(physics) {
    window.ImpolPinball = {
      phase: "6.4",
      matterLoaded: Boolean(MatterLib),
      staticBodyCount: physics ? physics.staticBodies.length : 0,
      tableObjectCount: physics ? physics.bumperBodies.length + physics.targetBodies.length : 0,
      assetLoadedCount: Object.values(assets).filter((asset) => asset.loaded).length,
      ballSpawned: Boolean(physics && physics.ball),
      ballsLeft: gameState.ballsLeft,
      ballNumber: gameState.ballNumber,
      status: gameState.status,
      drainCount: gameState.drainCount,
      plungerPower: Number(gameState.plungerPower.toFixed(2)),
      score: gameState.score,
      lastEvent: gameState.lastEvent,
      activeMissionId: gameState.activeMissionId,
      missions: gameState.missions,
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
    context.strokeStyle = "rgba(49, 168, 255, 0.28)";
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(128, 1168);
    context.lineTo(306, 1282);
    context.moveTo(772, 1168);
    context.lineTo(594, 1282);
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

    drawConfiguredBumpers();

    context.fillStyle = "#1b3541";
    context.strokeStyle = "rgba(126, 147, 156, 0.72)";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(190, 775);
    context.lineTo(320, 728);
    context.lineTo(306, 794);
    context.lineTo(206, 836);
    context.closePath();
    context.fill();
    context.stroke();

    context.beginPath();
    context.moveTo(710, 775);
    context.lineTo(580, 728);
    context.lineTo(594, 794);
    context.lineTo(694, 836);
    context.closePath();
    context.fill();
    context.stroke();

    drawConfiguredTargets();

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

    drawLabel("INNOVATION", 450, 1084, "#31a8ff", 28);
  }

  function createMatterWorld() {
    if (!MatterLib) {
      return null;
    }

    const { Bodies, Body, Composite, Engine, Events } = MatterLib;
    const engine = Engine.create();
    engine.gravity.y = 0.48;

    const wallOptions = {
      isStatic: true,
      restitution: 0.48,
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
        0,
        0,
        TABLE.flippers.left.length,
        TABLE.flippers.left.height,
        {
          isStatic: true,
          label: "left-flipper",
          angle: TABLE.flippers.left.restAngle,
          restitution: 0.16,
          friction: 0.08
        }
      ),
      right: Bodies.rectangle(
        0,
        0,
        TABLE.flippers.right.length,
        TABLE.flippers.right.height,
        {
          isStatic: true,
          label: "right-flipper",
          angle: TABLE.flippers.right.restAngle,
          restitution: 0.16,
          friction: 0.08
        }
      )
    };
    const bumperBodies = TABLE_CONFIG.bumpers.map((bumper) => {
      const body = Bodies.circle(bumper.x, bumper.y, bumper.radius, {
        isStatic: true,
        label: `bumper:${bumper.id}`,
        restitution: 1.04,
        friction: 0.01
      });
      body.gameObject = { ...bumper, type: "bumper" };
      return body;
    });
    const targetBodies = TABLE_CONFIG.targets.map((target) => {
      const body = Bodies.rectangle(target.x, target.y, target.width, target.height, {
        isStatic: true,
        isSensor: true,
        label: `target:${target.id}`
      });
      body.gameObject = { ...target, type: "target" };
      return body;
    });

    const ball = Bodies.circle(TABLE.ballStart.x, TABLE.ballStart.y, 26, {
      label: "pinball",
      restitution: 0.82,
      friction: 0.005,
      frictionAir: 0.002,
      density: 0.0011
    });

    Composite.add(engine.world, [...staticBodies, ...bumperBodies, ...targetBodies, flippers.left, flippers.right, ball]);

    [...staticBodies, ...bumperBodies, ...targetBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    positionFlipper(flippers.left, TABLE.flippers.left, TABLE.flippers.left.restAngle);
    positionFlipper(flippers.right, TABLE.flippers.right, TABLE.flippers.right.restAngle);

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes("drain-sensor") && labels.includes("pinball")) {
          drainBall(ball);
        }

        const hitObject = getHitObject(pair);
        if (hitObject) {
          handleTableHit(hitObject, ball);
        }
      });
    });

    return {
      engine,
      staticBodies,
      bumperBodies,
      targetBodies,
      flippers,
      ball
    };
  }

  const physics = createMatterWorld();

  function positionFlipper(body, config, angle) {
    const centerX = config.pivotX + Math.cos(angle) * config.length * 0.5;
    const centerY = config.pivotY + Math.sin(angle) * config.length * 0.5;

    MatterLib.Body.setPosition(body, { x: centerX, y: centerY });
    MatterLib.Body.setAngle(body, angle);
  }

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
      x: -0.25 - power * 0.65,
      y: -14 - power * 8.5
    });
    gameState.status = "playing";
    gameState.plungerPower = 0;
    inputState.chargingSince = 0;
    syncInspectableState(physics);
  }

  function getHitObject(pair) {
    if (pair.bodyA.label === "pinball" && pair.bodyB.gameObject) {
      return pair.bodyB.gameObject;
    }

    if (pair.bodyB.label === "pinball" && pair.bodyA.gameObject) {
      return pair.bodyA.gameObject;
    }

    return null;
  }

  function handleTableHit(object, ball) {
    if (gameState.status !== "playing") {
      return;
    }

    const points = object.points * gameState.multiplier;
    gameState.score += points;
    setHighScore(gameState.score);
    gameState.lastEvent = object.event;
    gameState.feedback = `+${points.toLocaleString("sl-SI")} ${object.label}`;
    gameState.feedbackUntil = performance.now() + 700;
    gameState.hitCounts[object.id] = performance.now();

    if (object.type === "bumper") {
      kickBallFromObject(ball, object);
    }

    advanceMissions(object.event);
    updateHud();
    syncInspectableState(physics);
  }

  function advanceMissions(eventName) {
    MISSION_CONFIG.forEach((mission) => {
      const state = gameState.missions[mission.id];

      if (state.completed || mission.event !== eventName) {
        return;
      }

      state.progress = Math.min(mission.required, state.progress + 1);
      state.lastProgressAt = performance.now();
      gameState.activeMissionId = mission.id;

      if (state.progress >= mission.required) {
        completeMission(mission, state);
      } else {
        gameState.feedback = `${mission.label} ${state.progress}/${mission.required}`;
        gameState.feedbackUntil = performance.now() + 850;
      }
    });

    const nextMission = MISSION_CONFIG.find((mission) => !gameState.missions[mission.id].completed);
    if (nextMission) {
      gameState.activeMissionId = nextMission.id;
    }
  }

  function completeMission(mission, state) {
    state.completed = true;
    gameState.score += mission.bonus;
    setHighScore(gameState.score);

    if (mission.multiplierReward) {
      gameState.multiplier = Math.max(gameState.multiplier, mission.multiplierReward);
    }

    gameState.feedback = `${mission.label} COMPLETE +${mission.bonus.toLocaleString("sl-SI")}`;
    gameState.feedbackUntil = performance.now() + 1300;
  }

  function kickBallFromObject(ball, object) {
    const dx = ball.position.x - object.x;
    const dy = ball.position.y - object.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const kick = 5.8;

    MatterLib.Body.setVelocity(ball, {
      x: ball.velocity.x + (dx / length) * kick,
      y: ball.velocity.y + (dy / length) * kick
    });
  }

  function drainBall(ball) {
    if (gameState.status !== "playing") {
      return;
    }

    gameState.drainCount += 1;
    gameState.ballsLeft = Math.max(0, gameState.ballsLeft - 1);
    setHighScore(gameState.score);

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
    gameState.lastEvent = "";
    gameState.feedback = "";
    gameState.feedbackUntil = 0;
    gameState.hitCounts = {};
    gameState.activeMissionId = "measurement";
    gameState.missions = createMissionState();

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
      if (!inputState.left) {
        inputState.leftPulse = true;
      }
      inputState.left = true;
      event.preventDefault();
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      if (!inputState.right) {
        inputState.rightPulse = true;
      }
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
      if (!inputState.left) {
        inputState.leftPulse = true;
      }
      inputState.left = true;
    }

    if (control === "right") {
      if (!inputState.right) {
        inputState.rightPulse = true;
      }
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
    const leftAngle = physics.flippers.left.angle + (leftTarget - physics.flippers.left.angle) * 0.52;
    const rightAngle = physics.flippers.right.angle + (rightTarget - physics.flippers.right.angle) * 0.52;

    positionFlipper(physics.flippers.left, leftConfig, leftAngle);
    positionFlipper(physics.flippers.right, rightConfig, rightAngle);

    applyFlipperKick();
  }

  function applyFlipperKick() {
    if (gameState.status !== "playing" || !physics.ball) {
      inputState.leftPulse = false;
      inputState.rightPulse = false;
      return;
    }

    const ball = physics.ball;
    const nearLeft = Math.abs(ball.position.x - TABLE.flippers.left.pivotX) < 170 && Math.abs(ball.position.y - TABLE.flippers.left.pivotY) < 110;
    const nearRight = Math.abs(ball.position.x - TABLE.flippers.right.pivotX) < 170 && Math.abs(ball.position.y - TABLE.flippers.right.pivotY) < 110;

    if (inputState.leftPulse && nearLeft && ball.velocity.y > -12) {
      const distanceFromPivot = Math.max(0, Math.min(TABLE.flippers.left.length, ball.position.x - TABLE.flippers.left.pivotX));
      const tipFactor = distanceFromPivot / TABLE.flippers.left.length;
      const lift = 9 + tipFactor * 9;
      const push = 2.4 + tipFactor * 4.2;

      MatterLib.Body.setVelocity(ball, {
        x: Math.max(ball.velocity.x + push, push),
        y: -lift
      });
    }

    if (inputState.rightPulse && nearRight && ball.velocity.y > -12) {
      const distanceFromPivot = Math.max(0, Math.min(TABLE.flippers.right.length, TABLE.flippers.right.pivotX - ball.position.x));
      const tipFactor = distanceFromPivot / TABLE.flippers.right.length;
      const lift = 9 + tipFactor * 9;
      const push = 2.4 + tipFactor * 4.2;

      MatterLib.Body.setVelocity(ball, {
        x: Math.min(ball.velocity.x - push, -push),
        y: -lift
      });
    }

    inputState.leftPulse = false;
    inputState.rightPulse = false;
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
      drawPhysicsOverlay([...physics.staticBodies, ...physics.bumperBodies, ...physics.targetBodies]);
      drawFlipper(physics.flippers.left, inputState.left);
      drawFlipper(physics.flippers.right, inputState.right);
      drawPlungerCharge();
      drawBall(physics.ball);
      drawStatusBadge();
      drawScoreFeedback();
      drawMissionLights();
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    window.requestAnimationFrame(update);
  }

  update();
})();
