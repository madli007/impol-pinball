(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const MatterLib = window.Matter;
  const TABLE = {
    width: canvas.width,
    height: canvas.height,
    wall: 60
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

    context.save();
    context.translate(306, 1208);
    context.rotate(-0.24);
    fillRoundedRect(-92, -17, 184, 34, 17, "#dbe5e7");
    strokeRoundedRect(-92, -17, 184, 34, 17, "#738891", 5);
    context.restore();

    context.save();
    context.translate(594, 1208);
    context.rotate(0.24);
    fillRoundedRect(-92, -17, 184, 34, 17, "#dbe5e7");
    strokeRoundedRect(-92, -17, 184, 34, 17, "#738891", 5);
    context.restore();

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

    const { Bodies, Body, Composite, Engine } = MatterLib;
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
      Bodies.rectangle(450, 1354, 150, 40, {
        isStatic: true,
        isSensor: true,
        label: "drain-sensor"
      })
    ];

    Composite.add(engine.world, staticBodies);

    staticBodies.forEach((body) => {
      Body.setStatic(body, true);
    });

    return {
      engine,
      staticBodies
    };
  }

  const physics = createMatterWorld();

  function update() {
    if (physics) {
      MatterLib.Engine.update(physics.engine, 1000 / 60);
    }

    drawPlayfieldFrame();

    if (physics) {
      drawPhysicsOverlay(physics.staticBodies);
    } else {
      fillRoundedRect(104, 100, 210, 44, 6, "rgba(120, 36, 28, 0.76)");
      drawLabel("MATTER.JS NOT LOADED", 209, 123, "#ff7567", 16);
    }

    window.requestAnimationFrame(update);
  }

  update();

  window.ImpolPinball = {
    phase: "2.1",
    matterLoaded: Boolean(MatterLib),
    staticBodyCount: physics ? physics.staticBodies.length : 0
  };
})();
