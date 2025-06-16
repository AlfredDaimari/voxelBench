const { workerData } = require("worker_threads");
const utils = require("./utils");
const mineflayerViewer = require("prismarine-viewer").headless;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;
const armorManager = require("mineflayer-armor-manager");
const { setTimeout } = require("timers/promises");

var worker_bot;
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

function pveModel(bot, _) {
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);

  const equipArmorAndSword = async () => {
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

    await setTimeout(1000);

    // manually equipping armor
    bot.chat(
      `/replaceitem entity ${workerData.username} slot.armor.head minecraft:diamond_helmet 1 0`,
    );
    bot.chat(
      `/replaceitem entity ${workerData.username} slot.armor.chest minecraft:diamond_chestplate 1 0`,
    );
    bot.chat(
      `/replaceitem entity ${workerData.username} slot.armor.legs minecraft:diamond_leggings 1 0`,
    );
    bot.chat(
      `/replaceitem entity ${workerData.username} slot.armor.feet minecraft:diamond_boots 1 0`,
    );
  };

  const beginPVE = async () => {
    // ask bots in your chunk area to fight y
    setInterval(() => {
      for (i = 0; i < workerData.spawn_neighbours.length; i++) {
        if (workerData.username != workerData.spawn_neighbours[i])
          bot.chat(`/msg ${workerData.spawn_neighbours[i]} fight me`);
      }
    }, 6000);

    await equipArmorAndSword();

    setInterval(async () => {
      let entity = null;

      const filter = (e) =>
        (e.type === "hostile" || e.type === "mob") &&
        e.position.distanceTo(bot.entity.position) < 10 &&
        e.displayName !== "Armor Stand"; // Mojang classifies armor stands as mobs for some reason?
      entity = bot.nearestEntity(filter);

      if (entity != null) {
        bot.pvp.attack(entity);
      } else {
        bot.chat("/summon polar_bear");
      }
    }, 1000);
  };

  // log bot position every 0.5 seconds
  setInterval(() => {
    try {
      parentPort.postMessage(
        `${username}:${bot.entity.position.x}-${bot.entity.position.y}`,
      );
    } catch {
      console.log("Error: could not post bot.entity.position.x/y to master");
    }
  }, 500);

  bot.once("spawn", beginPVE);
}

function reconnect(){
    console.log(`bot disconnect: ${workerData.username} - connecting again`); 
    worker_bot = utils.createBot(workerData.username, plugins)
    worker_bot.on("playerLeft", reconnect)
}

function run() {
  const plugins = {
    pveModel,
  };

  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  worker_bot = utils.createBot(workerData.username, plugins);

  worker_bot.on("kicked", console.log);
  worker_bot.on("error", console.log);

  worker_bot.on('playerLeft', reconnect)
}

run();
