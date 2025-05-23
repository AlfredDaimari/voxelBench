const mineflayer = require("mineflayer");
const v = require("vec3");
const { Worker } = require("worker_threads");

const host = process.env.MC_HOST;
const timeout_s = parseInt(process.env.DURATION) || 60;
const num_bots = parseInt(process.env.BOTS_PER_NODE) || 5;
const box_width = parseInt(process.env.BOX_WIDTH) || 32;
const bot_join_delay = process.env.BOTS_JOIN_DELAY || 5;
const bot_index = process.env.BOT_INDEX || 1;
const box_x = process.env.BOX_X || -16;
const box_z = process.env.BOX_Z || -16;

const start = Date.now();

const workers = new Set();

const center = v(box_x, 90, box_z);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function start_worker(username) {
  let workerData = {
    host: host,
    username: username,
    time_left_ms: timeout_s * 1000 - (Date.now() - start),
    box_center: center,
    box_width: box_width,
  };
  return new Promise((resolve, reject) => {
    const worker = new Worker("./walkaround_worker_bot.js", { workerData });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      workers.delete(username);
      if (code !== 0) {
        reject(new Error(`stopped with exit code ${code}`));
      }
    });
  });
}

function gen_workers(bot, options) {
  // removing on spawn because anyways this function would be called after spawn
  bot.once("spawn", () => {
    //console.debug("debug: listened to event spawn");
    bot.creative.startFlying();
    //console.debug("debug: jeff has started flying");
    bot.creative
      .flyTo(center) // in view range of the constructs we will spawn in
      .then(async () => {
        bot.quit("constructs have been placed. jeff's job is done");
        //console.debug("debug: finished flying to center");
        let b = 0;
        // Create x new bots that connect and walk around after 30 seconds.
        await sleep(30 * 1000);
        while (true) {
          console.debug("debug: creating workers now!");
          let ts = Date.now() / 1000;
          console.log(`${ts} - bots: ${workers.size}`);
          if (workers.size < num_bots) {
            console.log(
              `target bots: ${num_bots}, current bots: ${workers.size} --> Adding new bot!`,
            );
            workers.add(start_worker(`N${bot_index}B${b++}`));
          } else {
            console.log(
              `target bots: ${num_bots}, current bots: ${workers.size} --> Enough bots connected`,
            );
          }
          await sleep(bot_join_delay * 1000);
        }
      })
      .catch((err) => console.log(err));
  });
}

async function run() {
  // listen for 'spawn' in case client connects quickly

  let bot = mineflayer.createBot({
    host: host, // minecraft server ip
    username: `jeff-${bot_index}`, // minecraft username
    port: 25565, // only set if you need a port that isn't 25565
    hideErrors: false,
    version: "1.20.1",
    plugins: {
      gen_workers: gen_workers,
    },
  });
  // bot.on("message", (jsonMsg, position, sender, verified) => console.log(jsonMsg))
  // bot._client.on("packet", (jsonMsg, meta, sender, verified) => {
  //     if (meta.name != "map_chunk") {
  //         console.log(meta)
  //         console.log(jsonMsg)
  //     }
  // });

  // Log errors and kick reasons:
  bot.on("kicked", console.log);
  bot.on("error", console.log);

  // for extra debugging
  process.on("exit", (code) => console.error(`Exiting with code ${code}`));
  process.on("uncaughtException", (err) => console.error("Uncaught:", err));

  let ts = Date.now() / 1000;
  console.log(`hi! Started at ${ts}. I will exit after ${timeout_s} seconds.`);
  setTimeout(() => {
    console.log("debug: exiting now!");
    process.exit(0);
  }, timeout_s * 1000);
}

run();
