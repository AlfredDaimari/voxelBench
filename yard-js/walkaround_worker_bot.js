const mineflayer = require("mineflayer");
const mineflayerViewer = require("prismarine-viewer").headless;
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalXZ } = require("mineflayer-pathfinder").goals;
const { workerData } = require("worker_threads");
const utils = require("./utils");

const box_center = workerData.box_center;
const box_width = workerData.box_width;
const record = Boolean(process.env.RECORD | false);

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function nextGoal(bot) {
  let x = box_center.x + getRandomInt(box_width) - box_width / 2;
  let z = box_center.z + getRandomInt(box_width) - box_width / 2;
  let ts = Date.now() / 1000;
  /*
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
      output: `../videos/${utils.getTimestamp()}.mp4`,
      frames: (workerData.time_left_ms / 1000) * 60,
      width: 512,
      height: 512,
    });
  });
}

function walk(bot, _) {
  const beginWalking = async () => {
    // first teleport to a location
    bot.loadPlugin(pathfinder);

    let defaultMove = new Movements(bot);
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    bot.pathfinder.setMovements(defaultMove);

    while (true) {
      let goal = nextGoal(bot);
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
  const username = workerData.username;
  const plugins = {
    walk,
  };

  if (record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  const worker_bot = utils.createBot(username, plugins);

  worker_bot.on("kicked", console.log);
  worker_bot.on("error", console.log);
}

run();
