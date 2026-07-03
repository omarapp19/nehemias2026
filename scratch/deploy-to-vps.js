const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('cd ~/nehemias && git reset --hard && git pull && docker compose up -d --build && docker compose cp apps/web/public/Libro1.csv api:/data/uploads/Libro1.csv && docker compose cp apps/web/public/egresos.csv api:/data/uploads/egresos.csv', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '74.208.112.43',
  port: 22,
  username: 'nehemias',
  password: 'O$72g*I5Y6!aEV'
});
