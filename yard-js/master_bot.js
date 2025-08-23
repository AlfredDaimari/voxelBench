const v = require("vec3");
const { Worker, parentPort } = require("worker_threads");
const mineflayer = require("mineflayer");
const utils = require("./utils");

const timeout_s = parseInt(process.env.DURATION || 60);
const num_bots = parseInt(process.env.BOTS_PER_NODE || 5);
const box_width = parseInt(process.env.BOX_WIDTH || 8);
const bot_join_delay = parseInt(process.env.BOTS_JOIN_DELAY || 5);
const bot_index = parseInt(process.env.BOT_INDEX || 1);
const box_x = parseInt(process.env.BOX_X || -16);
const box_z = parseInt(process.env.BOX_Z || -16);
const spawn_x = parseInt(process.env.SPAWN_X || 0);
const spawn_y = parseInt(process.env.SPAWN_Y || 64);
const spawn_z = parseInt(process.env.SPAWN_Z || 0);
const density = parseInt(process.env.DENSITY || 1);
const max_radius = parseInt(process.env.MAX_RADIUS || 200);
const spawned_bot_locations = {};
const workload = process.env.WORKLOAD || "walk";
const record = parseInt(process.env.RECORD || 0);
const mob =
  process.env.PVE_MOB == undefined ? "polar_bear" : process.env.PVE_MOB;

const teleportLocs = utils.getTeleportationLocations(
  spawn_x,
  spawn_z,
  num_bots,
  density,
  max_radius,
);
var totRecBots = record == 0 ? 0 : 1;
console.log(`Total recording bots setup: ${totRecBots}`);

// setup main start time across threads
const start = Date.now();
process.env.start = start;
const workers = new Set();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function start_worker(username) {
  const workerData = {
    username,
    time_left_ms: utils.get_time_left(),
    spawn_y,
    box_width,
    mob,
  };

  const spawnPointInd = utils.getRandomIntSeeded(teleportLocs.length);
  const teleportLoc = teleportLocs[spawnPointInd];
  const teleportLocKey = JSON.stringify(teleportLoc);

  // add the bot to the spawned location
  if (!(teleportLocKey in spawned_bot_locations)) {
    spawned_bot_locations[teleportLocKey] = [];
  }
  workerData.spawn_neighbours = JSON.parse(
    JSON.stringify(spawned_bot_locations[teleportLocKey]),
  );
  spawned_bot_locations[teleportLocKey].push(username); //info for the next bot
  workerData.spawn_x = teleportLoc.x;
  workerData.spawn_z = teleportLoc.z;

  // only permit one bot to record
  if (totRecBots > 0) {
    workerData.record = true;
    totRecBots = totRecBots - 1;
  } else workerData.record = false;

  if (workload === "walk") {
    var workloadFile = "./walkaround_worker_bot.js";
  } else if (workload === "pvp") {
    var workloadFile = "./pvp_worker_bot.js";
  } else if (workload === "pve") {
    var workloadFile = "./pve_worker_bot.js";
  } else {
    var workloadFile = "./build_worker_bot.js";
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(workloadFile, { workerData });
    // log to console, when mincraft bots receive error from client
    worker.on("message", (msg) => console.log(msg));

    worker.on("error", reject);
    worker.on("exit", (code) => {
      workers.delete(username);
      if (code !== 0) {
        reject(new Error(`stopped with exit code ${code}`));
      }
    });
  });
}

/**
 * Connect workers to minecraft server
 * @param {mineflayer.Bot} bot
 */
function genWorkers(bot, _) {
  // removing on spawn because anyways this function would be called after spawn

  const loadWorkers = async () => {
    bot.chat(`/tp jeff-${bot_index} ${spawn_x} ${spawn_y} ${spawn_z}`);
    bot.quit("constructs have been placed. jeff's job is done");
    //console.debug("debug: finished flying to center");
    let b = 0;
    // Create x new bots that connect and walk around after 30 seconds.
    await sleep(30 * 1000);
    console.debug("debug: creating workers now!");

    while (true) {
      let ts = Date.now() / 1000;
      console.log(`${ts} - bots: ${workers.size}`);
      if (workers.size < num_bots) {
        console.log(
          `target bots: ${num_bots}, current bots: ${workers.size} --> Adding new bot!`,
        );
        workers.add(start_worker(`N${bot_index}B${b++}`));
      } else {
        console.log(
          `target bots: ${num_bots}, current bots: ${workers.size} --> Enough bots connected`,
        );
      }
      await sleep(bot_join_delay * 1000);
    }
  };

  bot.once("spawn", loadWorkers);
}

async function run() {
  const username = `jeff-${bot_index}`;
  const plugins = {
    genWorkers,
  };
  const bot = utils.createBot(username, plugins);

  // Log errors and kick reasons:
  bot.on("kicked", console.log);
  bot.on("error", console.log);

  // for extra debugging
  process.on("exit", (code) => console.error(`Exiting with code ${code}`));
  process.on("uncaughtException", (err) => console.error("Uncaught:", err));

  let ts = Date.now() / 1000;
  console.log(`hi! Started at ${ts}. I will exit after ${timeout_s} seconds.`);
  setTimeout(() => {
    console.log("debug: exiting now!");
    process.exit(0);
  }, timeout_s * 1000);
}

run();
