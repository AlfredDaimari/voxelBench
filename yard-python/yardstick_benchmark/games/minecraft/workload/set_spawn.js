var RCON = require('./rcon/RCON');
var rcon = new RCON();

const host = process.env.MC_HOST;
const spawn_x = process.env.SPAWN_X;
const spawn_y = process.env.SPAWN_Y;
const spawn_z = process.env.SPAWN_Z;

rcon.connect(host, 1337, 'extraordinary')
    .then(() => {
        console.log('Connected and authenticated.');
        return rcon.send(`setworldspawn ${spawn_x} ${spawn_y} ${spawn_z}`);
    })
    .then(response => {
        console.log(`Response: ${response}`);
        rcon.end();
    })
    .catch(error => {
        console.error(`An error occured: ${error}`);
        rcon.end();
    });
