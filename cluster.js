require('dotenv').config()
const cluster = require('cluster');
const os = require('os');
const net = require('net');
const config = require('./config/main');

if(cluster.isMaster) {
  const numProcesses = os.cpus().length;
  const port = config.port;
  const workers = [];
  
  var spawn = function(i) {
    const env = {CPU_NUM: i}; 
		workers[i] = cluster.fork(env);
    console.log('spwaning worker', i);

		// Optional: Restart worker on exit
		workers[i].on('exit', function(code, signal) {
			console.log('respawning worker', i);
			spawn(i);
		});
  };

  for(var i = 0 ; i< numProcesses; i++) {
    spawn(i);
  }
  
  var worker_index = function(ip, len) {
		var s = '';
		for (var i = 0, _len = ip.length; i < _len; i++) {
			if (!isNaN(ip[i])) {
				s += ip[i];
			}
		}

		return Number(s) % len;
	};

  var server = net.createServer({ pauseOnConnect: true }, function(connection) {
      var worker = workers[worker_index(connection.remoteAddress, numProcesses)];
      worker.send('sticky-session:connection', connection);
  }).listen(port);

} else {
  const httpServer = require('./app-server.js');
  require('./chat-server.js').init(httpServer);

  process.on('message', function(message, connection) {
		if (message !== 'sticky-session:connection') {
			return;
		}
		httpServer.emit('connection', connection);

		connection.resume();
	});
}
