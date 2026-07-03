const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd ~/nehemias && head -n 5 apps/web/public/Libro1.csv', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (d) => console.log(d.toString()));
  });
}).connect({ host: '74.208.112.43', username: 'nehemias', password: 'O$72g*I5Y6!aEV' });
