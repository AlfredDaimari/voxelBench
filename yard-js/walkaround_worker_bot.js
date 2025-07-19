const pathfinder = require("mineflayer-pathfinder").pathfinder;
const Movements = require("mineflayer-pathfinder").Movements;
const { GoalXZ } = require("mineflayer-pathfinder").goals;
const mineflayerViewer = require("prismarine-viewer").headless;
const { workerData, parentPort } = require("worker_threads");
const utils = require("./utils");
const { createWinstonLogger } = require("./logger");
const { setTimeout } = require("timers/promises");

async function reconnect() {
  console.log(`bot disconnect: ${workerData.username} - connecting again`);
  await setTimeout(2000);
  worker_bot = utils.createBot(workerData.username, plugins);
}

const logger = createWinstonLogger(workerData.username);
const plugins = {
  walk,
};

/**
 * Get walking position with intermediate steps
 * @param {number} currentX x-coordinate
 * @param {number} currentZ z-coordinate
 * @returns {GoalNearXZ} list intermediate walking positions
 */
function nextGoal(currentX, currentZ) {
  let x = currentX + utils.getRandomIntInterval(50);
  let z = currentZ + utils.getRandomIntInterval(50);
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
  const intermediate_path = [];
  const dx = x - currentX;
  const dz = z - currentZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const steps = distance / workerData.box_width;
  for (let i = 1; i <= steps; i++) {
    intermediate_path.push(
      new GoalXZ(x + i * workerData.box_width, z + i * workerData.box_width, 4),
    );
  }

  return intermediate_path;
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

/* force move listener
function forcedMoveComplete(bot) {
  return new Promise((resolve, reject) => {
    bot.on("forcedMove", () => {
      bot.off("forcedMove", _ => console.log("tp performed"));
      resolve();
    });
  });
}
*/

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
    // only load pathfinder plugin after tp has been done (causes issues)
    // await forcedMoveComplete(bot);
    bot.loadPlugin(pathfinder);

    // wait for teleportion
    let defaultMove = new Movements(bot);
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    defaultMove.allowParkour = true;
    defaultMove.allowFreeMotion = true;
    bot.pathfinder.setMovements(defaultMove);

    var path = nextGoal(workerData.spawn_x, workerData.spawn_z);
    var goal = path.shift();
    await setTimeout(2000);
    bot.pathfinder.setGoal(goal);

    /** alt way to get granular details (but consumes too much memory)
    const walkTillGoal = new Promise((resolve, reject) => {
      bot.on("goal_reached", () => {
        if (path.length == 0){
          path = nextGoal(goal.x, goal.z)
        }
        goal = path.shift()
        bot.pathfinder.setGoal(goal);
        resolve()
      })

      // reject walk till goal after 10 seconds
      setTimeout(() => reject(), 10000)
    })

    // reach the desitnation through intermediate small box sized steps(10 secs)
    while (true){
      try {
        await walkTillGoal
      } catch {
        // set goal once again
        bot.pathfinder.setGoal(goal)
      }
    }
    */

    bot.on("goal_reached", async () => {
      if (path.length == 0) {
        path = nextGoal(goal.x, goal.z);
      }
      goal = path.shift();
      await setTimeout(1000);
      bot.pathfinder.setGoal(goal);
    });

    // check every 10.5 seconds if bot has moved, if not start moving again
    var prev = [0.0, 0.0];
    var count = 0;
    setInterval(async () => {
      try {
        var cur = [bot.entity.position.x, bot.entity.position.z];
        if (prev[0] == cur[0] && prev[1] == cur[1]) {
          console.log("Error: Bot has not updated position in last 10 secs");
          // assume bot is stuck
          if (count > 5) {
            // set new goal
            count = 0;
            console.log("Error: Bot maybe stuck, setting new goal");
            // teleport out of stuck location
            bot.chat(
              `/tp ${username} ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
            );
            path = nextGoal(workerData.spawn_x, workerData.spawn_z);
            goal = path.shift();
            await setTimeout(2000);
            bot.pathfinder.setGoal(goal);
          } else {
            // assume bot is not stuck
            count += 1;
            await setTimeout(1000);
            bot.pathfinder.setGoal(goal);
          }
        }
        prev = [cur[0], cur[1]];
      } catch (e) {
        console.log(`${e}: could not compare bot.entity previous position`);
      }
    }, 10500);
  };

  // log bot position every 2 seconds
  setInterval(() => {
    try {
      logger.info(
        `${username}, ${bot.entity.position.x}, ${bot.entity.position.z}`,
      );
    } catch {
      console.log("Error: could not post bot.entity.position.x/z");
    }
  }, 2000);

  bot.once("spawn", beginWalking);

  bot.on("kicked", (reason) =>
    parentPort.postMessage(`${workerData.username}:kicked:${reason}`),
  );
  bot.on("error", (err) =>
    parentPort.postMessage(`${workerData.username}:error:${err}`),
  );

  // reconnect on disconnect
  // bot.on("end", reconnect);
}

function run() {
  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  worker_bot = utils.createBot(workerData.username, plugins);
}

run();
