
// debug logging to stderr... if you want to see it
const DEBUG = !!process.env.DEBUG;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// statically use delta values for each direction, makes code a bit cleaner
const directions = {
  'N': { dx: 0, dy: 1 },
  'E': { dx: 1, dy: 0 },
  'S': { dx: 0, dy: -1 },
  'W': { dx: -1, dy: 0 }
};
const directionsKeys = Object.keys(directions);

class Robot {
  constructor(options) {
    Object.assign(this, options);
  }

  move(instruction, scents) {
    if(instruction === 'L' || instruction === 'R') {
      // just rotate through the keys based on -ve/+ve sign
      let sgn = (instruction === 'L') ? -1 : 1;
      let index = directionsKeys.indexOf(this.direction);
      index = (directionsKeys.length + index + sgn) % directionsKeys.length;
      this.direction = directionsKeys[index];
    } else if(instruction === 'F') {
      const { dx, dy } = directions[this.direction];
      const x = this.x + dx;
      const y = this.y + dy;

      // look for scents
      for(const scent of scents) {
        if(scent.x === x && scent.y === y) {
          return;
        }
      }

      this.x += dx;
      this.y += dy;
    }
  }

  isLost(size) {
    return this.x > size.x ||
      this.x < 0 ||
      this.y > size.y ||
      this.y < 0;
  }

  toString() {
    // isLost is not printed here as we may have been lost during execution
    // and this won't be reflected in the current state
    return `${this.x} ${this.y} ${this.direction}`;
  }
}

// simple state machine to parse input
const states = {
  // init state takes 2 space-separated values giving size of canvas
  init: (context, line, lineNum) => {
    const coords = line.trim().split(/\s+/g);
    if(coords.length !== 2) {
      throw new Error(`Invalid input in state ${context.state} at line ${lineNum}: "${line}"`);
    }

    context.size = {
      x: parseInt(coords[0], 10),
      y: parseInt(coords[1], 10)
    };

    if(DEBUG) {
      process.stderr.write(`size: ${context.size.x} ${context.size.y}\n`);
    }

    context.scents = [];
    context.state = 'start';
  },

  // start state takes three values giving coordinates and direction of robot
  start: (context, line) => {
    const coords = line.trim().split(/\s+/g);
    if(coords.length !== 3) {
      throw new Error(`Invalid input in state ${context.state} at line ${lineNum}: "${line}"`)
    }

    context.robot = new Robot({
      x: parseInt(coords[0], 10),
      y: parseInt(coords[1], 10),
      direction: coords[2]
    });

    if(DEBUG) {
      process.stderr.write(`robot: ${context.robot}\n`);
    }

    context.state = 'move';
  },

  // Takes a string of instructions (LRF) indicating where to send the robot,
  // if a robot falls off the grid then it will leave a scent at the location it
  // falls off and other robots will be prevented from falling off at the same
  // location. Outputs the final position and direction (even if the robot was
  // lost, it keeps moving)
  move: (context, line) => {
    const instructions = line.trim().split('');

    let lost = false;
    for(const instruction of instructions) {
      context.robot.move(instruction, context.scents);
      if(!lost && context.robot.isLost(context.size)) {
        lost = true;
        const scent = Object.assign({}, context.robot);
        context.scents.push(scent);
      }
    }

    process.stdout.write(`${context.robot}${lost ? ' LOST' : ''}\n`);
    context.state = 'start';
  }
};

// keep track of line numbers for error logs
let lineNum = 1;

// initialize the state machine context
const context = { state: 'init' };

// use the readline interface to iterate through each non-empty line of input
rl.on('line', (line) => {
  if(line.trim()) {
    states[context.state](context, line, lineNum++);
  }
});
