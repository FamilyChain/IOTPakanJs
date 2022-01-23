require('dotenv').config();

const { Board, Servo } = require("johnny-five"),
  { EtherPortClient } = require('etherport-client'),
  Web3 = require('web3'),
  keypress = require("keypress"),
  Moment = require('moment'),
  web3 = new Web3(process.env.RPC_URL),
  ABI_Auto_Feed = require('./ABI_Auto_Feed.json'),
  account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY),
  contractInstance = new web3.eth.Contract(ABI_Auto_Feed.abi, process.env.CONTRACT_ADDRESS);

var staterun = true,
  stateGoInt = false,
  statechecktask = false,
  statejob = true,
  stateeat = false,
  loop = 0;

keypress(process.stdin);

const board = new Board({
  port: new EtherPortClient({
    host: '192.168.8.100',
    port: 3030
  }),
  repl: false
});

  board.on("ready", () => {
    web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
    web3.eth.defaultAccount = account.address;
  
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

    var task = setInterval(async () => {
      try {
        if (statechecktask) {
          return;
        } else {
          statechecktask = true;
          const statusapp = await contractInstance.methods.paused().call();
          if (statusapp) {
            statejob = false;
          } else {
            const id = await contractInstance.methods.currentIds().call(),
              showHistory = await contractInstance.methods.showHistory((Number(id) - 1), (Number(id) - 2)).call(),
              getTime = Moment(new Date()).diff(new Date(Number(showHistory[1]) * 1000), 'hours');
            if (getTime > process.env.SET_HOURS) {
              const gas = await contractInstance.methods.input().estimateGas({ from: web3.eth.defaultAccount });
              await contractInstance.methods.input().send({ from: web3.eth.defaultAccount, gas });
              if (stateGoInt) {
                return;
              } else {
                stateGoInt = true;
                var goInt = setInterval(() => {
                  if (!staterun || loop > 10) {
                    clearInterval(goInt);
                    stateGoInt = false;
                    statechecktask = false;
                  } else {
                    loop++;
                    !stateeat ? servo.cw() : servo.ccw();
                    !stateeat ? stateeat = true : stateeat = false;
                  }
                }, !stateeat ? 5000 : 3000);
              }
            } else {
              statechecktask = false;
            }
          }
        }
      } catch(err) {
        statejob = false;
        console.log('Blockchain error atau balance MATIC kurang untuk membayar gas fee');
      }
    }, 120000);
    var task1 = setInterval(() => {
      if (!statejob) {
        staterun = false;
        servo.ccw();
        servo.stop();
        clearInterval(task);
        clearInterval(task1);
        clearInterval(task2);
      }
    }, 500);

    var task2 = setInterval(async () => {
      const statusapp = await contractInstance.methods.paused().call();
      if (statusapp) {
        staterun = false;
        servo.ccw();
        servo.stop();
        clearInterval(task);
        clearInterval(task1);
        clearInterval(task2);
      }
    }, 60000);
  });