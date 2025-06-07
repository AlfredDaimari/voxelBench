const mineflayer = require("mineflayer");
const mineflayerViewer = require("prismarine-viewer").headless;
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalXZ } = require("mineflayer-pathfinder").goals;
const { workerData } = require("worker_threads");
const utils = require("./utils");

const hostname = process.env.HOSTNAME;

/**
 * Find next coordinate to walk to
 * @param {number} currentX x-coordinate
 * @param {number} currentZ z-coordinate
 * @returns {GoalXZ} next walking position
 */
function nextGoal(currentX, currentZ) {
  let x =
    currentX +
    utils.getRandomInt(workerData.box_width) -
    workerData.box_width / 2;
  let z =
    currentZ +
    utils.getRandomInt(workerData.box_width) -
    workerData.box_width / 2;
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
function recordBotInFirstPerson(bot, _) {
  bot.once("spawn", () => {
    mineflayerViewer(bot, {
      output: `../videos/${hostname}-${utils.getTimestamp()}.mp4`,
      frames: (workerData.time_left_ms / 1000) * 60,
      width: 512,
      height: 512,
    });
  });
}

function walk(bot, _) {
  const beginWalking = async () => {
    // first teleport to a location
    bot.chat(`/tp @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`);
    // set spawn point to the given location
    bot.chat(
      `/sp @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    bot.loadPlugin(pathfinder);

    let defaultMove = new Movements(bot);
    defaultMove.allowSprinting = false;
    defaultMove.canDig = true;
    bot.pathfinder.setMovements(defaultMove);

    var goal = nextGoal(workerData.spawn_z, workerData.spawn_z);

    while (true) {
      goal = nextGoal(goal.x, goal.z);
      try {
        await bot.pathfinder.goto(goal);
      } catch (e) {
        // if the bot cannot find a path, carry on and let it try to move somewhere else
        if (e.name != "NoPath" && e.name != "Timeout") {
          throw e;
        }
      }
    }
  };
  bot.once("spawn", beginWalking);
}

function run() {
  const plugins = {
    walk,
  };

  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  const worker_bot = utils.createBot(workerData.username, plugins);

  worker_bot.on("kicked", console.log);
  worker_bot.on("error", console.log);
}

run();
