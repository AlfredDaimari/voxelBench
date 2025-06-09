const { workerData } = require("worker_threads");
const utils = require("./utils");
const mineflayerViewer = require("prismarine-viewer").headless;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;
const armorManager = require("mineflayer-armor-manager");

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
      output: `../videos/${hostname}-${workload}-${username}-${utils.getTimestamp()}.mp4`,
      frames: (utils.get_time_left() / 1000) * 60,
      width: 512,
      height: 512,
    });
  });
}

function pvpModel(bot, _) {
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

    setTimeout(() => {
      bot.chat(`/give ${workerData.username} minecraft:diamond_helmet 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_chestplate 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_leggings 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_boots 1`);
      bot.chat(`/give ${workerData.username} minecraft:shield 1`);
      bot.chat(`/give ${workerData.username} minecraft:diamond_sword 1`);

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
    });
  };

  const beginPVP = () => {
    // ask bots in your chunk area to fight y
    setInterval(() => {
      for (i = 0; i < workerData.spawn_neighbours.length; i++) {
        if (workerData.username != workerData.spawn_neighbours[i])
          bot.chat(`/msg ${workerData.spawn_neighbours[i]} fight me`);
      }
    }, 6000);

    bot.on("chat", (username_opp, message) => {
      if (message.includes("fight me")) {
        bot.pvp.attackRange = 32;
        const player = bot.players[username_opp];

        if (!player) {
          bot.chat("I can't see you.");
          return;
        }

        // ask challenging bot to fight you back as well
        bot.pvp.attack(player.entity);
        bot_in_neighbour = false;
        for (i = 0; i < workerData.spawn_neighbours.length; i++) {
          if (workerData.spawn_neighbours.length == username_opp)
            workerData.spawn_neighbours.push(username_opp);
        }
      }

      if (message === "stop") {
        bot.pvp.stop();
      }
    });
  };

  bot.once("spawn", equipArmorAndSword);
  bot.once("spawn", beginPVP);
}

function run() {
  const plugins = {
    pvpModel,
  };

  if (workerData.record) {
    plugins.recordBotInFirstPerson = recordBotInFirstPerson;
  }

  const worker_bot = utils.createBot(workerData.username, plugins);

  worker_bot.on("kicked", console.log);
  worker_bot.on("error", console.log);
}

run();
