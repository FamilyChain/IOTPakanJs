require('dotenv').config();

const { Board, Servo } = require("johnny-five"),
  { EtherPortClient } = require('etherport-client'),
  cron = require('node-cron'),
  Web3 = require('web3'),
  keypress = require("keypress"),
  web3 = new Web3(process.env.RPC_URL),
  statenum = 0,
  statejob = true;

keypress(process.stdin);

const board = new Board({
  port: new EtherPortClient({
    host: '192.168.8.103',
    port: 3030
  }),
  repl: false
});

  board.on("ready", () => {
  
    let servo = new Servo.Continuous(14);
  
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);

    process.stdin.on("keypress", (ch, key) => {
      if (key.name === "space") {
        statejob = false;
      } else {
        return;
      }
    });

    var task = cron.schedule('2 * * * *', () => {
      if (statenum == 0) {
        servo.sweep();
      } else if (statenum == 1) {
        return;
      } else {
        statenum = 1;
        const stateeat = false;
        var loop = 0,
          goInt = setInterval(() => {
            if (loop > 10) {
              clearInterval(goInt);
              statenum = 2;
            } else {
              loop++;
              !stateeat ? servo.cw() : servo.ccw();
            }
          }, !stateeat ? 5000 : 3000);
      }
    });
    task.start();
    setInterval(() => {
      if (!statejob) {
        servo.stop();
        task.stop();
      }
    }, 500);
  });