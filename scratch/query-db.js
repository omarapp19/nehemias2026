const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd ~/nehemias && docker compose exec -T db psql -U nehemias -d nehemias -c "select * from \\"Donation\\" limit 5;"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (d) => console.log('STDOUT: ' + d.toString()))
          .stderr.on('data', (d) => console.error('STDERR: ' + d.toString()));
  });
}).connect({ host: '74.208.112.43', username: 'nehemias', password: 'O$72g*I5Y6!aEV' });
