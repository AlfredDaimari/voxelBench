const { workerData, parentPort } = require("worker_threads");
const utils = require("./utils");
const mineflayerViewer = require("prismarine-viewer").headless;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;
const armorManager = require("mineflayer-armor-manager");

var worker_bot;
const plugins = {
  pvpModel,
};

/**
 * Video Recording function
 * video will be saved in the videos directory in project root
 */
const hostname = process.env.HOSTNAME;
const workload = process.env.WORKLOAD || "walk";
const username = workerData.username;

/*
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
*/

function pvpModel(bot, _) {
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);

  workerData.spawn_neighbours = new Set(workerData.spawn_neighbours);

  const equipArmorAndSword = () => {
    // first teleport to a location
    bot.chat(
      `/tp ${workerData.username} ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );
    // set spawn point to the given location
    bot.chat(
      `/minecraft:spawnpoint @s ${workerData.spawn_x} ${workerData.spawn_y} ${workerData.spawn_z}`,
    );

    setTimeout(() => {
      bot.chat(`/give ${workerData.username} minecraft:diamond_helmet 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_chestplate 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_leggings 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_boots 1`);
      bot.chat(`/give ${workerData.username} minecraft:shield 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_sword 1`);

      // equipping armor
      bot.armorManger.equipAll();
      // equipping sword
      const sword = bot.inventory
        .items()
        .find((item) => item.name.includes("sword"));
      if (sword) bot.equip(sword, "hand");
    });
  };

  const beginPVP = () => {
    // ask bots in your chunk area to fight u
    setInterval(() => {
      const targets = [...workerData.spawn_neighbours].filter(
        (neighbour) => neighbour != workerData.username,
      );
      const target = targets[Math.floor(Math.random() * targets.length)];
      bot.chat(`/msg ${target} fight me`);
    }, 6000);

    bot.on("chat", (username_op, message) => {
      if (message.includes("fight me") && username_op != "me") {
        workerData.spawn_neighbours.add(username_op);
        bot.pvp.attackRange = 128;
        const player = bot.players[username_op];

        if (!player) {
          bot.chat("I can't see you.");
          return;
        }

        // ask challenging bot to fight you back as well
        bot.pvp.attack(player.entity);
        workerData.spawn_neighbours.add(username_op);
      }
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

  bot.once("spawn", equipArmorAndSword);
  bot.once("spawn", beginPVP);
  bot.on("respawn", equipArmorAndSword);
}

function reconnect() {
  console.log(`bot disconnect: ${workerData.username} - connecting again`);
  worker_bot = utils.createBot(workerData.username, plugins);
  worker_bot.on("playerLeft", reconnect);
}

function run() {
  /*
   *
  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }
  */

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
