(function () {
  const runtime = window.ImpolPinballRuntime || (window.ImpolPinballRuntime = {});

  function createBallBody(dependencies) {
    const { MatterLib, id, position } = dependencies;
    const ball = MatterLib.Bodies.circle(position.x, position.y, 26, {
      label: "pinball",
      restitution: 0.74,
      friction: 0.005,
      frictionAir: 0.00125,
      density: 0.0011
    });
    ball.gameBallId = id;
    return ball;
  }

  function positionFlipper(dependencies) {
    const { MatterLib, body, config, angle } = dependencies;
    const centerX = config.pivotX + Math.cos(angle) * config.length * 0.5;
    const centerY = config.pivotY + Math.sin(angle) * config.length * 0.5;

    MatterLib.Body.setPosition(body, { x: centerX, y: centerY });
    MatterLib.Body.setAngle(body, angle);
  }

  function createMatterWorld(dependencies) {
    const {
      MatterLib,
      TABLE,
      TABLE_CONFIG,
      getBallStartPosition,
      onCollisionPair
    } = dependencies;

    if (!MatterLib) {
      return null;
    }

    const { Bodies, Body, Composite, Engine, Events } = MatterLib;
    const engine = Engine.create();
    engine.gravity.y = 0.88;

    const wallOptions = {
      isStatic: true,
      restitution: 0.38,
      friction: 0.035,
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
      Bodies.rectangle(TABLE.shooterLane.outerX + 34, TABLE.height / 2, 42, TABLE.height - 210, {
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
      Bodies.rectangle(TABLE.shooterLane.innerX, 760, 18, 920, {
        ...wallOptions,
        label: "launch-lane-divider"
      }),
      Bodies.rectangle(TABLE.shooterLane.outerX - 36, TABLE.shooterLane.bottomY + 26, 112, 24, {
        ...wallOptions,
        label: "launch-lane-plunger-stop"
      }),
      Bodies.rectangle(TABLE.shooterLane.innerX + 78, 212, 168, 18, {
        ...wallOptions,
        restitution: 0.18,
        label: "launch-lane-top-exit",
        angle: -0.72
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
          restitution: 0.08,
          friction: 0.14
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
          restitution: 0.08,
          friction: 0.14
        }
      )
    };
    const bumperBodies = TABLE_CONFIG.bumpers.map((bumper) => {
      const body = Bodies.circle(bumper.x, bumper.y, bumper.radius, {
        isStatic: true,
        label: `bumper:${bumper.id}`,
        restitution: 0.96,
        friction: 0.018
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
    const slingshotBodies = TABLE_CONFIG.slingshots.map((slingshot) => {
      const body = Bodies.rectangle(slingshot.x, slingshot.y, slingshot.width, slingshot.height, {
        isStatic: true,
        isSensor: true,
        label: `slingshot:${slingshot.id}`,
        angle: slingshot.angle
      });
      body.gameObject = { ...slingshot, type: "slingshot" };
      return body;
    });
    const rolloverBodies = TABLE_CONFIG.rollovers.map((rollover) => {
      const body = Bodies.circle(rollover.x, rollover.y, rollover.radius, {
        isStatic: true,
        isSensor: true,
        label: `rollover:${rollover.id}`
      });
      body.gameObject = { ...rollover, type: "rollover" };
      return body;
    });
    const laneBodies = TABLE_CONFIG.lanes.map((lane) => {
      const body = Bodies.rectangle(lane.x, lane.y, lane.width, lane.height, {
        isStatic: true,
        isSensor: true,
        label: `lane:${lane.id}`,
        angle: lane.angle
      });
      body.gameObject = { ...lane, type: "lane" };
      return body;
    });
    const orbitRailBodies = TABLE_CONFIG.upperOrbit.rails.map((rail, index) =>
      Bodies.rectangle(rail.x, rail.y, rail.width, rail.height, {
        isStatic: true,
        isSensor: true,
        label: `upper-orbit-rail:${index + 1}`,
        angle: rail.angle
      })
    );
    const orbitSensorBodies = [
      Bodies.rectangle(
        TABLE_CONFIG.upperOrbit.entrySensor.x,
        TABLE_CONFIG.upperOrbit.entrySensor.y,
        TABLE_CONFIG.upperOrbit.entrySensor.width,
        TABLE_CONFIG.upperOrbit.entrySensor.height,
        {
          isStatic: true,
          isSensor: true,
          label: "upper-orbit-entry",
          angle: TABLE_CONFIG.upperOrbit.entrySensor.angle
        }
      ),
      Bodies.rectangle(
        TABLE_CONFIG.upperOrbit.returnSensor.x,
        TABLE_CONFIG.upperOrbit.returnSensor.y,
        TABLE_CONFIG.upperOrbit.returnSensor.width,
        TABLE_CONFIG.upperOrbit.returnSensor.height,
        {
          isStatic: true,
          isSensor: true,
          label: "upper-orbit-return",
          angle: TABLE_CONFIG.upperOrbit.returnSensor.angle
        }
      )
    ];
    const lockHouseSensorBodies = [
      Bodies.rectangle(
        TABLE_CONFIG.lockHouse.mouth.x,
        TABLE_CONFIG.lockHouse.mouth.y,
        TABLE_CONFIG.lockHouse.mouth.width,
        TABLE_CONFIG.lockHouse.mouth.height,
        {
          isStatic: true,
          isSensor: true,
          label: "lock-house-entrance",
          angle: TABLE_CONFIG.lockHouse.mouth.angle
        }
      )
    ];

    const ball = createBallBody({
      MatterLib,
      id: "ball-1",
      position: getBallStartPosition()
    });

    Composite.add(engine.world, [
      ...staticBodies,
      ...bumperBodies,
      ...targetBodies,
      ...slingshotBodies,
      ...rolloverBodies,
      ...laneBodies,
      ...orbitRailBodies,
      ...orbitSensorBodies,
      ...lockHouseSensorBodies,
      flippers.left,
      flippers.right,
      ball
    ]);

    [...staticBodies, ...bumperBodies, ...targetBodies, ...slingshotBodies, ...rolloverBodies, ...laneBodies, ...orbitRailBodies, ...orbitSensorBodies, ...lockHouseSensorBodies, flippers.left, flippers.right].forEach((body) => {
      Body.setStatic(body, true);
    });

    positionFlipper({
      MatterLib,
      body: flippers.left,
      config: TABLE.flippers.left,
      angle: TABLE.flippers.left.restAngle
    });
    positionFlipper({
      MatterLib,
      body: flippers.right,
      config: TABLE.flippers.right,
      angle: TABLE.flippers.right.restAngle
    });

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        onCollisionPair(pair);
      });
    });

    return {
      engine,
      staticBodies,
      bumperBodies,
      targetBodies,
      slingshotBodies,
      rolloverBodies,
      laneBodies,
      orbitRailBodies,
      orbitSensorBodies,
      lockHouseSensorBodies,
      flippers,
      ball,
      activeBalls: [ball],
      nextBallId: 2
    };
  }

  runtime.physics = {
    createBallBody,
    createMatterWorld,
    positionFlipper
  };
})();
