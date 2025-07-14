const { workerData, parentPort } = require("worker_threads");
const utils = require("./utils");
const mineflayerViewer = require("prismarine-viewer").headless;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const timers = require("timers/promises");
const { createWinstonLogger } = require("./logger");
const EventEmitter = require("events");

/**
 *
 * Building emitter for build_done event
 *
 */
class BuildingEmitter extends EventEmitter {}

const buildEmitter = new BuildingEmitter();

var worker_bot;
const logger = createWinstonLogger(workerData.username);
const plugins = {
  pBuildModel,
};
/**
 * Video Recording function
 * video will be saved in the videos directory in project root
 * Error in the library (this needs to be present on all root files of worker thread)
 */
const hostname = process.env.HOSTNAME;
const workload = process.env.WORKLOAD || "walk";
const username = workerData.username;
function recordBotInFirstPerson(bot, _) {
  bot.once("spawn", () => {
    mineflayerViewer(bot, {
      output: `videos/${hostname}-${workload}-${username}-${utils.getTimestamp()}.mp4`,
      frames: (utils.get_time_left() / 1000) * 60,
      width: 512,
      height: 512,
    });
  });
}

/**
 * Find next coordinate to walk to and perform building
 * @param {number} currentX x-coordinate
 * @param {number} currentZ z-coordinate
 * @returns {GoalXZ} next walking position
 */
function nextGoal(currentX, currentZ) {
  let x = currentX + utils.getRandomIntInterval(25);
  let z = currentZ + utils.getRandomIntInterval(25);
  /*
  let ts = Date.now() / 1000;
  console.log(
    `${ts} - bot ${bot.username}, ${bot.entity.position}, ${v(
      x,
      bot.entity.position.y,
      z,
    )}`,
  );
  */
  return new goals.GoalXZ(x, z);
}

// Helper function to place a block at relative coords (x,y,z) from startPos
async function placeBlockAt(bot, startPos, relX, relY, relZ, blockName) {
  const targetPos = startPos.offset(relX, relY, relZ);

  // Find adjacent block to place against (must be adjacent)
  // We look for a block below targetPos or next to it on any side
  // For simplicity, just pick the block below:
  const referenceBlock = bot.blockAt(targetPos.offset(0, -1, 0));
  if (!referenceBlock) {
    console.log(
      `No reference block below position ${targetPos}, cannot place.`,
    );
    return;
  }

  // Find block in inventory
  const item = bot.inventory.items().find((i) => i.name === blockName);
  if (!item) {
    console.log(`No ${blockName} in inventory to place.`);
    return;
  }

  try {
    await bot.equip(item, "hand");
    // Place block against referenceBlock on the top face (0,1,0)
    await bot.placeBlock(referenceBlock, { x: 0, y: 1, z: 0 });
    //console.log(`Placed ${blockName} at ${targetPos}`);
    // Small delay to avoid spamming too fast
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (err) {
    console.log(`Error placing ${blockName} at ${targetPos}: ${err.message}`);
  }
}

async function botBuildFloor(bot, startPos) {
  // Build floor: 3x3 oak planks at y=0
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      if (x == 0 && z == 0) continue;
      await placeBlockAt(bot, startPos, x, 0, z, "oak_planks");
    }
  }
}

async function botBuildWall(bot, startPos) {
  // Build walls: 3 high hollow box around floor at y=1 to y=3
  for (let y = 1; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        // Skip inside blocks (hollow)
        if (x === -3 || x === 3 || z === -3 || z === 3) {
          // conditional for door
          if ((x === 3 && z === -1) || (x === 3 && z === 0)) continue;
          await placeBlockAt(bot, startPos, x, y, z, "oak_planks");
        }
      }
    }
  }
}

async function botBuildRoof(bot, startPos) {
  // Build roof: flat 3x3 oak planks at y=4
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      await placeBlockAt(bot, startPos, x, 4, z, "oak_planks");
    }
  }
}

async function pBuildModel(bot, _) {
  bot.loadPlugin(pathfinder);

  let defaultMove = new Movements(bot);
  defaultMove.allowSprinting = false;
  defaultMove.canDig = true;
  defaultMove.allowParkour = true;
  defaultMove.allowFreeMotion = true;
  bot.pathfinder.setMovements(defaultMove);

  const botTeleport = () => {
    // first teleport to a location
    bot.chat(
      `/tp ${username} ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    // set spawn point to the given location
    bot.chat(
      `/minecraft:spawnpoint @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
  };

  const beginPBuild = async () => {
    // give bot building materials
    bot.chat(`/give ${workerData.username} minecraft:oak_planks 400`);

    var goal = nextGoal(workerData.spawn_x, workerData.spawn_z);
    bot.pathfinder.setGoal(goal);

    bot.on("goal_reached", async () => {
      const startPos = bot.entity.position.offset(0, 0, 0);
      // fill with air and dirt
      bot.chat("/fill ~-5 ~ ~-5 ~5 ~5 ~5 air");
      bot.chat("/fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 dirt");
      await botBuildFloor(bot, startPos);
      await botBuildWall(bot, startPos);
      await botBuildRoof(bot, startPos);
      buildEmitter.emit("build_done");
      console.log(`${username} building complete`);
    });
  };

  // log bot position every 2 seconds
  setInterval(() => {
    try {
      logger.info(
        `${username}, ${bot.entity.position.x}, ${bot.entity.position.z}`,
      );
    } catch {
      console.log("Error: could not log bot.entity.position.x/z");
    }
  }, 2000);

  // start building a house
  bot.once("spawn", async () => {
    botTeleport();
    await timers.setTimeout(1500);
    await beginPBuild();
  });

  bot.on("kicked", (reason) =>
    parentPort.postMessage(`${workerData.username}:kicked:${reason}`),
  );
  bot.on("error", () =>
    parentPort.postMessage(`${workerData.username}:error:${err}`),
  );

  //bot.on("end", reconnect);

  buildEmitter.on("build_done", beginPBuild);
}

async function reconnect() {
  console.log(`bot disconnect: ${workerData.username} - connecting again`);
  await timers.setTimeout(2000);
  worker_bot = utils.createBot(workerData.username, plugins);
}

function run() {
  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  worker_bot = utils.createBot(workerData.username, plugins);
}

run();
