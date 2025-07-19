const { workerData, parentPort } = require("worker_threads");
const utils = require("./utils");
const mineflayerViewer = require("prismarine-viewer").headless;
const { pathfinder } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;
const armorManager = require("mineflayer-armor-manager");
const { createWinstonLogger } = require("./logger");
const timers = require("timers/promises");

const logger = createWinstonLogger(workerData.username);
const plugins = {
  pveModel,
};

async function reconnect() {
  console.log(`bot disconnect: ${workerData.username} - connecting again`);
  await timers.setTimeout(2000);
  worker_bot = utils.createBot(workerData.username, plugins);
}
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

async function pveModel(bot, _) {
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);

  const equipArmorAndSword = () => {
    // first teleport to a location
    bot.chat(
      `/tp ${workerData.username} ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    // set spawn point to the given location
    bot.chat(
      `/minecraft:spawnpoint @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );

    bot.chat(`/give ${workerData.username} minecraft:diamond_helmet 1`);
    bot.chat(`/give ${workerData.username} minecraft:diamond_chestplate 1`);
    bot.chat(`/give ${workerData.username} minecraft:diamond_leggings 1`);
    bot.chat(`/give ${workerData.username} minecraft:diamond_boots 1`);
    bot.chat(`/give ${workerData.username} minecraft:shield 1`);
    bot.chat(`/give ${workerData.username} minecraft:diamond_sword 1`);

    bot.armorManager.equipAll();
    // equipping sword
    const sword = bot.inventory
      .items()
      .find((item) => item.name.includes("sword"));
    if (sword) bot.equip(sword, "hand");
  };

  const beginPVE = () => {
    setInterval(() => {
      let entity = null;
      const filter = (e) => {
        try {
          // console.log(`{"text":"${username}"}` == e.metadata[2]);
          // weird but only way to access the CustomName set for the bot
          return e.metadata[2] == `{"text":"${username}"}`;
        } catch {
          return false;
        }
      };

      entity = bot.nearestEntity(filter);

      if (entity != null) {
        bot.pvp.attack(entity);
      } else {
        bot.chat(
          `/summon ${workerData.mob} ~ ~ ~ {CustomName: '"${username}"', CustomVisible:1}`,
        );

        setTimeout(() => {
          entity = bot.nearestEntity(filter);
          bot.pvp.attack(entity);
        }, 1000);
      }
    }, 10000);
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

  bot.once("spawn", equipArmorAndSword);
  bot.on("respawn", equipArmorAndSword);
  bot.once("spawn", beginPVE);

  bot.on("kicked", (reason) =>
    parentPort.postMessage(`${workerData.username}:kicked:${reason}`),
  );
  bot.on("error", (err) =>
    parentPort.postMessage(`${workerData.username}:error:${err}`),
  );

  // bot.on("end", reconnect);
}

function run() {
  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  worker_bot = utils.createBot(workerData.username, plugins);
}

run();
