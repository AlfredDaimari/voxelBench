// You must install node-canvas-webgl to use the headless examples.
try { require('node-canvas-webgl') } catch (e) { throw Error('node-canvas-webgl is not installed, you can install it with `npm install PrismarineJS/node-canvas-webgl`') }

const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').headless

const host = process.env.MC_HOST;
const bot = mineflayer.createBot({
  username: 'bot',
  host: host,
  port: 25565,
  version: "1.20.1",
  })

bot.once('spawn', async () => {
  
  mineflayerViewer(bot, { output: './bot.mp4', frames: 200, width: 512, height: 512 })
  bot.creative.startFlying()
  await sleep(60*1000)

})
