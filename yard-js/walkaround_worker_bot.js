const mineflayer = require("mineflayer");
const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalNear, GoalXZ } = require("mineflayer-pathfinder").goals;
const v = require("vec3");
const mineflayerViewer = require("prismarine-viewer").headless;

// sub.js
const { workerData, parentPort } = require("worker_threads");

const host = workerData.host;
const username = workerData.username;
const time_left_ms = workerData.time_left_ms;
const box_center = workerData.box_center;
const box_width = workerData.box_width;
const recordMine = workerData.record;

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

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Month is 0-based
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}`;
}

/**
 * Video Recording function
 * video will be saved in the videos directory in project root
 */
function record(_, ___) {
  worker_bot.once("spawn", () => {
    mineflayerViewer(worker_bot, {
      output: `../videos/${getTimestamp()}.mp4`,
      frames: 30 * 60,
      width: 512,
      height: 512,
    });
  });
}

function work(_, ___) {
  const work = async () => {
    // first teleport to a location
    worker_bot.loadPlugin(pathfinder);

    let defaultMove = new Movements(worker_bot);
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    worker_bot.pathfinder.setMovements(defaultMove);
    while (true) {
      let goal = nextGoal(worker_bot);
      try {
        await worker_bot.pathfinder.goto(goal);
      } catch (e) {
        // if the bot cannot find a path, carry on and let it try to move somewhere else
        if (e.name != "NoPath" && e.name != "Timeout") {
          throw e;
        }
      }
    }
  };

  worker_bot.once("spawn", work);
}

let worker_bot = mineflayer.createBot({
  host: host, // minecraft server ip
  username: username, // minecraft username
  port: 25565, // only set if you need a port that isn't 25565
  version: "1.20.1",
  plugins: recordMine !== 1
    ? {
        work,
      }
    : { work, record },
});

worker_bot.on("kicked", console.log);
worker_bot.on("error", console.log);
