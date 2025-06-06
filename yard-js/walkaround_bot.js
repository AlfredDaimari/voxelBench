const v = require("vec3");
const { Worker } = require("worker_threads");
const mineflayer = require("mineflayer");
const utils = require("./utils");

const timeout_s = parseInt(process.env.DURATION) || 60;
const num_bots = parseInt(process.env.BOTS_PER_NODE) || 5;
const box_width = parseInt(process.env.BOX_WIDTH) || 32;
const bot_join_delay = process.env.BOTS_JOIN_DELAY || 5;
const bot_index = process.env.BOT_INDEX || 1;
const { box_x, box_y, box_z } = JSON.parse(process.env.COORDS);

// setup main start time across threads
const start = Date.now();
process.env.start = start;
const workers = new Set();
const center = v(box_x + 20, box_y - 10, box_z - 25);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function start_worker(username) {
  let workerData = {
    username,
    time_left_ms: timeout_s * 1000 - (Date.now() - start),
    box_center: center,
    box_width,
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

/**
 * Connect workers to minecraft server
 * @param {mineflayer.Bot} bot
 */
function genWorkers(bot, _) {
  // removing on spawn because anyways this function would be called after spawn

  const loadWorkers = async () => {
    bot.chat(`/tp ${(box_x, box_y - 15, box_z)}`);
    bot.quit("constructs have been placed. jeff's job is done");
    //console.debug("debug: finished flying to center");
    let b = 0;
    // Create x new bots that connect and walk around after 30 seconds.
    await sleep(30 * 1000);
    console.debug("debug: creating workers now!");

    while (true) {
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
  };

  bot.once("spawn", loadWorkers);
}

async function run() {
  const username = `jeff-${bot_index}`;
  const plugins = {
    genWorkers,
  };
  const bot = utils.createBot(username, plugins);

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
