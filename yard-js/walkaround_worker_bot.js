const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalXZ } = require("mineflayer-pathfinder").goals;
const mineflayerViewer = require("prismarine-viewer").headless;
const { workerData, parentPort } = require("worker_threads");
const utils = require("./utils");
const { default: logger } = require("./logger");

var worker_bot;
const plugins = {
  walk,
};

/**
 * Find next coordinate to walk to
 * @param {number} currentX x-coordinate
 * @param {number} currentZ z-coordinate
 * @returns {GoalXZ} next walking position
 */
function nextGoal(currentX, currentZ) {
  let x = currentX + utils.getRandomIntInterval(50) - workerData.box_width / 2;
  let z = currentZ + utils.getRandomIntInterval(50) - workerData.box_width / 2;
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
  return new GoalXZ(x, z);
}

/**
 * Video Recording function
 * video will be saved in the videos directory in project root
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

function walk(bot, _) {
  const beginWalking = async () => {
    // first teleport to a location
    bot.chat(
      `/tp ${username} ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    // set spawn point to the given location
    bot.chat(
      `/minecraft:spawnpoint @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    bot.loadPlugin(pathfinder);

    let defaultMove = new Movements(bot);
    defaultMove.allowSprinting = false;
    defaultMove.canDig = true;
    defaultMove.allowParkour = true;
    defaultMove.allowFreeMotion = true;
    bot.pathfinder.setMovements(defaultMove);

    var goal = nextGoal(workerData.spawn_x, workerData.spawn_z);
    bot.pathfinder.setGoal(goal);

    bot.on("goal_reached", () => {
      goal = nextGoal(goal.x, goal.z);
      bot.pathfinder.setGoal(goal);
    });
  };
  // log bot position every 2 seconds
  setInterval(() => {
    try {
      parentPort.postMessage(
        `${username}:${bot.entity.position.x}-${bot.entity.position.z}`,
      );
    } catch {
      console.log("Error: could not post bot.entity.position.x/z to master");
    }
  }, 2000);

  bot.once("spawn", beginWalking);
}

function reconnect() {
  console.log(`bot disconnect: ${workerData.username} - connecting again`);
  worker_bot = utils.createBot(workerData.username, plugins);
  worker_bot.on("playerLeft", reconnect);
}

function run() {
  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  worker_bot = utils.createBot(workerData.username, plugins);

  worker_bot.on("kicked", () =>
    parentPort.postMessage(`${workerData.username}:kicked:${reason}`),
  );
  worker_bot.on("error", () =>
    parentPort.postMessage(`${workerData.username}:error:${err}`),
  );

  // reconnect on disconnect
  worker_bot.on("playerLeft", reconnect);
}

run();
