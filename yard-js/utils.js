const mineflayer = require("mineflayer");
const host = process.env.MC_HOST;
const hostname = process.env.HOSTNAME;
const workload = process.env.WORKLOAD || "walk";
const timeout_s = parseInt(process.env.DURATION || 60);

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * Time left in workload
 * @returns {Number} time in seconds
 */
function get_time_left() {
  return timeout_s * 1000 - (Date.now() - process.env.start);
}

/**
 * Get teleportation locations for worker bots
 * @param {number} density - total number of bots per teleportation spot
 */
function getTeleportationLocations(
  spawn_x,
  spawn_z,
  num_bots,
  density,
  max_radius,
) {
  coords = [];

  const totalTeleportLocs = Math.ceil(num_bots / density);
  for (i = 0; i < totalTeleportLocs; i++) {
    const theta = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * max_radius;
    const x = Math.round(r * Math.cos(theta));
    const z = Math.round(r * Math.sin(theta));
    coords.push({ x: x + spawn_x, z: z + spawn_z });
  }
  return coords;
}

/**
 * Video Recording function
 * video will be saved in the videos directory in project root
 */
function recordBotInFirstPerson(bot, _) {
  bot.once("spawn", () => {
    mineflayerViewer(bot, {
      output: `../videos/${hostname}-${workload}-${getTimestamp()}.mp4`,
      frames: (get_time_left() / 1000) * 60,
      width: 512,
      height: 512,
    });
  });
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
 * Creates a bot in mineflayer
 * @param {string} username minecraft username
 * @param {object} plugins mineflayer plugins to run on bot 'spawn'
 * @returns {mineflayer.Bot} mineflayerBot
 */
function createBot(username, plugins) {
  const bot = mineflayer.createBot({
    host,
    username,
    port: 25565,
    hideErrors: false,
    version: "1.20.1",
    plugins,
  });

  return bot;
}

module.exports = {
  createBot,
  getTimestamp,
  getRandomInt,
  getTeleportationLocations,
  get_time_left,
};
