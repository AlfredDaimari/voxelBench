const mineflayer = require("mineflayer");
const Rand = require("rand-seed");

const host = process.env.MC_HOST;
const hostname = process.env.HOSTNAME;
const workload = process.env.WORKLOAD || "walk";
const timeout_s = parseInt(process.env.DURATION || 60);
const seed = process.env.SEED || "0";
const rand = new Rand.default(seed);

function getRandomInt(max, tRand) {
  return Math.floor(tRand.next() * max);
}

/**
 * Get random int in an interval
 * max = 50, interval = -25:25
 */
function getRandomIntInterval(max, tRand) {
  return Math.floor(tRand.next() * max) - max / 2;
}

function getRandomIntSeeded(max) {
  return Math.floor(rand.next() * max);
}

/**
 * Get random int in an interval
 * max = 50, interval = -25:25
 */
function getRandomIntIntervalSeeded(max) {
  return Math.floor(rand.next() * max) - max / 2;
}

/**
 * Time left in workload
 * @returns {Number} time in seconds
 */
function get_time_left() {
  return timeout_s * 1000 - (Date.now() - process.env.start);
}

function getRandomCardinalDirectionStr() {
  const CARDINAL_DIRECTIONS = ["north", "south", "east", "west"];
  const rint = getRandomIntSeeded(4);
  return CARDINAL_DIRECTIONS[rint];
}

/**
 * Gets random XZ in a cardinal direction
 * @param {int}  max - max directional offset possible
 * @param {string} direction - cardinal direction (north | south | east | west)
 * @param {Rand.default} seededRand - a seeded object of rand-seed
 */
function getRandomXZinDirection(max, direction, seededRand) {
  const CARDINAL_DIRECTIONS = {
    north: [0, 1],
    south: [0, -1],
    east: [1, 0],
    west: [-1, 0],
  };
  const x = 0;
  const z = 1;

  // get x random offset
  var x_offset = 0;
  const x_direction_offset = CARDINAL_DIRECTIONS[direction][x];
  if (x_direction_offset == 0) {
    x_offset = getRandomIntInterval(max, seededRand);
  } else {
    x_offset = x_direction_offset * getRandomInt(max, seededRand);
  }

  // get z random offset
  var z_offset = 0;
  const z_direction_offset = CARDINAL_DIRECTIONS[direction][z];
  if (z_direction_offset == 0) {
    z_offset = getRandomIntInterval(max, seededRand);
  } else {
    z_offset = z_direction_offset * getRandomInt(max, seededRand);
  }

  return [x_offset, z_offset];
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
    const theta = rand.next() * 2 * Math.PI;
    const r = Math.sqrt(rand.next()) * max_radius;
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
    checkTimeoutInterval: 3 * 60 * 1000,
  });

  return bot;
}

module.exports = {
  createBot,
  getTimestamp,
  getRandomInt,
  getRandomIntInterval,
  getTeleportationLocations,
  get_time_left,
  getRandomXZinDirection,
  getRandomCardinalDirectionStr,
  getRandomIntSeeded,
  getRandomIntIntervalSeeded,
};
