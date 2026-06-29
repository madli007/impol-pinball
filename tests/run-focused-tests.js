"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const tests = [];

function test(name, body) {
  tests.push({ name, body });
}

function createLocalStorage(initialValues = {}, options = {}) {
  const store = new Map(Object.entries(initialValues).map(([key, value]) => [key, String(value)]));

  return {
    getItem(key) {
      if (options.throwOnGet) {
        throw new Error("localStorage get blocked");
      }
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (options.throwOnSet) {
        throw new Error("localStorage set blocked");
      }
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    }
  };
}

function createMockImageClass() {
  return class MockImage {
    constructor() {
      this.listeners = new Map();
      this.src = "";
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }

    dispatch(type) {
      (this.listeners.get(type) || []).forEach((listener) => listener());
    }
  };
}

function createBrowserLikeContext({ localStorage = createLocalStorage() } = {}) {
  const window = {
    ImpolPinballConfig: {},
    ImpolPinballRuntime: {},
    localStorage
  };
  const Image = createMockImageClass();
  window.Image = Image;

  return {
    context: vm.createContext({
      window,
      Image,
      console,
      Math,
      Number,
      Object,
      Set,
      String
    }),
    window
  };
}

function runScript(context, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function loadConfigScripts(context) {
  [
    "js/config/scoring.js",
    "js/config/table.js",
    "js/config/assets.js",
    "js/config/missions.js",
    "js/config/companies.js",
    "js/config/modes.js"
  ].forEach((scriptPath) => runScript(context, scriptPath));
}

function loadStorageContext(localStorage = createLocalStorage()) {
  const browser = createBrowserLikeContext({ localStorage });
  runScript(browser.context, "js/config/scoring.js");
  runScript(browser.context, "js/runtime/storage.js");
  return browser;
}

test("config scripts preserve scoring-derived table values", () => {
  const { context, window } = createBrowserLikeContext();
  loadConfigScripts(context);

  const config = window.ImpolPinballConfig;

  assert.equal(
    config.SCORING_RULES.highScoreKey,
    `${config.HIGH_SCORE_BASE_KEY}.${config.SCORING_RULES.version}`
  );
  assert.equal(config.TABLE_CONFIG.bumpers.find((bumper) => bumper.id === "mes").points, config.SCORING_RULES.values.bumpers.mes);
  assert.equal(config.TABLE_CONFIG.targets.find((target) => target.id === "furnace").points, config.SCORING_RULES.values.targets.furnace);
  assert.equal(config.COMBO_BONUS_BY_COUNT[5], config.SCORING_RULES.values.comboByCount[5]);
  assert.equal(config.JACKPOT.normalValue, config.SCORING_RULES.values.jackpotNormal);
});

test("mission and company maps stay aligned with shared events", () => {
  const { context, window } = createBrowserLikeContext();
  loadConfigScripts(context);

  const config = window.ImpolPinballConfig;
  const missionIds = config.MISSION_CONFIG.map((mission) => mission.id);

  assert.deepEqual(config.MISSION_STAGES.flat(), missionIds);
  assert.equal(config.MISSION_CONFIG.find((mission) => mission.id === "erp").event, config.UPPER_ORBIT.event);
  assert.equal(config.MISSION_TARGET_LABELS[config.UPPER_ORBIT.event], "ALU FLOW ORBIT");
  assert.equal(config.COMPANY_BY_EVENT[config.UPPER_ORBIT.event], "impol");
  assert.equal(config.COMPANY_BY_MISSION.coil, "impol-pc");
  assert.deepEqual(
    Object.values(config.COMPANY_STATUS).map((status) => status.rank),
    [0, 1, 2, 3]
  );
});

test("asset config only references files present in the repository", () => {
  const { context, window } = createBrowserLikeContext();
  loadConfigScripts(context);

  const missingAssets = Object.entries(window.ImpolPinballConfig.ASSET_CONFIG)
    .filter(([_id, asset]) => !fs.existsSync(path.join(repoRoot, asset.src)))
    .map(([id, asset]) => `${id}: ${asset.src}`);

  assert.deepEqual(missingAssets, []);
});

test("storage keeps legacy and current high scores separated", () => {
  const localStorage = createLocalStorage();
  const { window } = loadStorageContext(localStorage);
  const { HIGH_SCORE_BASE_KEY, SCORING_RULES } = window.ImpolPinballConfig;
  const { storage } = window.ImpolPinballRuntime;

  localStorage.setItem(HIGH_SCORE_BASE_KEY, "54321");
  localStorage.setItem(SCORING_RULES.highScoreKey, "12345");

  assert.equal(storage.loadHighScore(), 12345);
  assert.equal(storage.loadLegacyHighScore(), 54321);

  const stored = localStorage.snapshot();
  assert.equal(stored[SCORING_RULES.legacyHighScoreKey], "54321");
  assert.equal(stored[SCORING_RULES.highScoreKey], "12345");
});

test("storage falls back when localStorage is unavailable", () => {
  const localStorage = createLocalStorage({}, { throwOnGet: true, throwOnSet: true });
  const { window } = loadStorageContext(localStorage);
  const { storage } = window.ImpolPinballRuntime;

  assert.equal(storage.loadHighScore(), 0);
  assert.equal(storage.loadLegacyHighScore(), 0);
  assert.equal(storage.loadAudioMutedPreference(), false);
  assert.doesNotThrow(() => storage.saveHighScore(1000));
  assert.doesNotThrow(() => storage.saveAudioMutedPreference(true));
});

test("audio muted preference round-trips through storage", () => {
  const localStorage = createLocalStorage();
  const { window } = loadStorageContext(localStorage);
  const { storage } = window.ImpolPinballRuntime;

  storage.saveAudioMutedPreference(true);
  assert.equal(storage.loadAudioMutedPreference(), true);
  assert.equal(localStorage.snapshot()[window.ImpolPinballConfig.AUDIO_MUTED_KEY], "true");

  storage.saveAudioMutedPreference(false);
  assert.equal(storage.loadAudioMutedPreference(), false);
  assert.equal(localStorage.snapshot()[window.ImpolPinballConfig.AUDIO_MUTED_KEY], "false");
});

test("asset readiness starts false and flips after image load", () => {
  const { context, window } = createBrowserLikeContext();
  runScript(context, "js/runtime/assets.js");

  const { assets: assetRuntime } = window.ImpolPinballRuntime;
  const loadedAssets = assetRuntime.loadAssets({
    coil: { src: "assets/images/coil-collector.png", width: 184, height: 120 }
  });
  const isReady = assetRuntime.createAssetReadiness(loadedAssets);

  assert.equal(loadedAssets.coil.src, "assets/images/coil-collector.png");
  assert.equal(loadedAssets.coil.loaded, false);
  assert.equal(assetRuntime.isAssetReady(loadedAssets, "coil"), false);
  assert.equal(isReady("coil"), false);

  loadedAssets.coil.image.dispatch("load");

  assert.equal(loadedAssets.coil.loaded, true);
  assert.equal(assetRuntime.isAssetReady(loadedAssets, "coil"), true);
  assert.equal(isReady("missing"), false);
});

let failures = 0;

for (const { name, body } of tests) {
  try {
    body();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
  }
}

if (failures > 0) {
  console.error(`${failures}/${tests.length} focused tests failed`);
  process.exitCode = 1;
} else {
  console.log(`${tests.length}/${tests.length} focused tests passed`);
}
