/*
bobs blocks - Game by Harrison Steed. Feel free to modify this code to your liking but please do 
not pass it off as your own. For questions, you can contact me at copyright@steedster.net

Huge thanks to my Uncle Reid for writing the original game code and allowing me to take a look at it to help with this game. 
A bunch of ideas and programming concepts were taken from the original source, as well as all of the block assets, 
so I really wouldn't have been able to do this alone. Thanks, and enjoy! B)
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const rect = canvas.getBoundingClientRect();

const game = JSON.parse(atob(location.search.replace("?a=", "")));

//define grid props
const grid = {
  rows: 22,
  columns: 30,
};

//other props for the game
let cellsize = 24;
const linewidth = 2;

//for keeping track of the blocks on the grid
const blocks = [];

//if game is still running
let over = false;

//if the game file is a "folder", which level to use
let level = 0;

//tick at the tickspeed (for moving tractors, etc.)
const tickSpeed = 600;
const physicsCount = 3;
let tickInterval = setInterval(physics, tickSpeed / physicsCount);

//for keeping track of bob's coordinates
const bob = [];

//if bob is holding an item
let holding = {
  isHolding: false,
  block: null,
};

//set canvas dimensions
grid.width = grid.columns * cellsize;
grid.height = grid.rows * cellsize;

while(grid.width > window.innerWidth || grid.height > window.innerHeight){
  cellsize--;
  grid.width = grid.columns * cellsize;
  grid.height = grid.rows * cellsize
}

canvas.width = grid.width;
canvas.height = grid.height;

canvas.style.borderWidth = `${linewidth}px`;

ctx.strokeStyle = "black";
ctx.fillStyle = "white";

//set white background
ctx.fillRect(0, 0, canvas.width, canvas.height);

//load icons to be used for the game
function image(url) {
  const img = new Image();
  img.src = url;
  img.onload = () => {
    console.log("loaded " + url);
  };
  img.onerror = () => {
    console.log("couldn't load " + url);
  };
  return img;
}

const icons = {
  ONE: image("./icons/one.png"),
  TWO: image("./icons/two.png"),
  THREE: image("./icons/three.png"),
  FOUR: image("./icons/four.png"),
  FIVE: image("./icons/five.png"),
  SIX: image("./icons/six.png"),
  SEVEN: image("./icons/seven.png"),
  EIGHT: image("./icons/eight.png"),
  TREASURE: image("./icons/treasure.png"),
  ENEMY: image("./icons/enemy.png"),
  ENEMY_HOUSE: image("./icons/enemy_house.png"),
  FACTORY: image("./icons/factory.png"),
  TRACTOR: image("./icons/tractor.png"),
  CONFUSED_TRACTOR: image("./icons/confused_tractor.png"),
  TRANSFORMER: image("./icons/transformer.png"),
  CONFUSED_TRANSFORMER: image("./icons/confused_transformer.png"),
  SPLITTER: image("./icons/splitter.png"),
  SAND: image("./icons/sand.png"),
  SPONGE: image("./icons/sponge.png"),
  ENZYME: image("./icons/enzyme.png"),
  BOB: image("./icons/bob.png"),
  CONFUSED_SPLITTER: image("./icons/confused_splitter.png"),
};

const messages = {
  ENEMY_HOUSE: "Whoops! Bob was trapped in between two enemy houses!",
  ENEMY: "Ouch! Bob walked into an enemy!",
  TREASURE: "Good Job, Bob!",
  ENEMY_HOUSE_WALKED_INTO: "Yikes! Bob walked into an enemy house!",
  DEFAULT: "Press B for Block Reference",
};

//eight isn't considered a number here because it changes to a treasure block instantly
const numbers = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];

function gameOver(reason) {
  over = true;
  clearInterval(tickInterval);
  document.getElementById("message").innerText = reason;

  if (game.type == "folder" && reason == messages.TREASURE) {
  setTimeout(() => {
      over = false;
      level++;
      loadLevel(game.levels[level]);
      tickInterval = setInterval(physics, tickSpeed / physicsCount);
      document.getElementById("message").innerText = messages.DEFAULT;
    }, 2000);
  }
}

function applyChange(coords, change) {
  return [coords[0] + change[0], coords[1] + change[1]];
}

function coordsToIndex(coords) {
  return blocks.map((x) => x.coords.join(":")).indexOf(coords.join(":"));
}

function setBlock(type, coords) {
  const i = blocks.map((x) => x.coords.join(":")).indexOf(coords.join(":"));
  blocks[i].type = type;
  drawBlock(type, coords);
  if (bob.join("-") == coords.join("-")) {
    drawBob(...bob);
  }
}

function setProp(index, json) {
  blocks[index] = { ...blocks[index], ...json };
}

function deleteBlock(coords) {
  const i = blocks.map((x) => x.coords.join(":")).indexOf(coords.join(":"));
  blocks.splice(i, 1);
  const pos = coordsToPos(coords);
  ctx.fillStyle = "white";
  ctx.fillRect(...pos, cellsize, cellsize);
  if (bob.join("-") == coords.join("-")) {
    drawBob(...bob);
  }
}

function moveBlock(index, coords) {
  if (blockAt(coords)) return;
  const pos = coordsToPos(blocks[index].coords);
  blocks[index].coords = coords;
  ctx.fillStyle = "white";
  ctx.fillRect(...pos, cellsize, cellsize);
  drawBlock(blocks[index].type, coords);
  if (bob.join("-") == coords.join("-")) {
    drawBob(...bob);
  }
}

function checkBlocks(change, coords, exclude) {
  const exc = exclude.map((b) => b.join("-"));
  return change
    .map((x) => blockAt(applyChange(x, coords)))
    .filter((x) => !!x && !exc.includes(x.coords.join("-")));
}

function insertBlock(type, coords) {
  if (blockAt(coords)) {
    return;
  }
  blocks.push({ type, coords });
  drawBlock(type, coords);
}

function getBorderOf(coords) {
  const [x, y] = coords;
  return [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
}

let physic = 1;
function physics() {
  switch (physic) {
    case 1:
      physicsOne();
      physic = 2;
      break;
    case 2:
      physicsTwo();
      physic = 3;
      break;
    case 3:
      physicsThree();
      physic = 1;
    }
}

function physicsOne() {
  const results = { FOUR: "EIGHT", TWO: "FOUR", ONE: "TWO" };
  for (const type of Object.keys(results)) {
    const all = blocks.filter((x) => x.type == type);
    for (const e of all) {
      //check to make sure the block still exists
      const block = blockAt(e.coords);
      if (!block || block.type !== type) {
        continue;
      }

      const [x, y] = e.coords;
      const h = blockAt([x - 1, y]);
      const v = blockAt([x, y - 1]);
      if (h && h.type == type) {
        deleteBlock([x - 1, y]);
        setBlock(results[type], e.coords);
      } else if (v && v.type == type) {
        deleteBlock([x, y - 1]);
        setBlock(results[type], e.coords);
      }
    }
  }

  //processing blocks that don't automatically add
  const enzymes = blocks.filter((e) => e.type == "ENZYME");
  const addable = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    SIX: 6,
    SEVEN: 7,
  };
  const types = [null, ...numbers, "EIGHT"];
  for (const enzyme of enzymes) {
    const border = getBorderOf(enzyme.coords);
    const valid = border
      .map((r) => blockAt(r))
      .filter((e) => !!e && Object.keys(addable).includes(e.type));
    if (valid.length > 1) {
      let set = null;
      for (let j = 0; j < valid.length; j++) {
        if (set) break;
        for (let o = 0; o < valid.length; o++) {
          if (j == o) continue;
          const [ax, ay] = valid[o].coords;
          const [bx, by] = valid[j].coords;
          if (ax === bx || ay === by) {
            set = [valid[o], valid[j]];
            break;
          }
        }
      }

      if (set) {
        const newnumber = addable[set[0].type] + addable[set[1].type];
        if (newnumber <= 8) {
          setBlock(types[newnumber], enzyme.coords);
          set.forEach((x) => deleteBlock(x.coords));
        }
      }
    }

    //if surrounded by 8 sand, turn in to a one
    const ba = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];
    const hey = checkBlocks(ba, enzyme.coords, []).filter(
      (x) => x.type == "SAND"
    );
    if (hey.length == 8) {
      for (let i in ba) {
        deleteBlock(applyChange(ba[i], enzyme.coords));
      }

      setBlock("ONE", enzyme.coords);
    }
  }

  //remove enemies that are touching 3 or 5 blocks

  const nums = blocks.filter((x) => x.type == "THREE" || x.type == "FIVE");
  for (let u = 0; u < nums.length; u++) {
    const e = nums[u];
    const border = getBorderOf(e.coords)
      .map((x) => blockAt(x))
      .filter(
        (x) => !!x && x.type == (e.type == "FIVE" ? "ENEMY_HOUSE" : "ENEMY")
      );

    if (border.length > 0) {
      for (i in border) {
        deleteBlock(border[i].coords);
      }
      deleteBlock(e.coords);
    }
  }

  const transformers = blocks.filter(
    (x) => x.type == "TRANSFORMER" || x.type == "CONFUSED_TRANSFORMER"
  );
  const transformations = {
    ONE: "SPONGE",
    THREE: "ENZYME",
    FIVE: "SPLITTER",
    SIX: "TRACTOR",
    SEVEN: "FACTORY",
    SPONGE: "ONE",
    ENZYME: "THREE",
    SPLITTER: "FIVE",
    TRACTOR: "SIX",
    FACTORY: "SEVEN",
  };
  for (let u = 0; u < transformers.length; u++) {
    const e = transformers[u];
    const border = getBorderOf(e.coords)
      .map((x) => blockAt(x))
      .filter((x) => !!x && Object.keys(transformations).includes(x.type));
    if (border.length == 1) {
      deleteBlock(e.coords);
      setBlock(transformations[border[0].type], border[0].coords);
    } else if (border.length > 1) {
      setBlock("CONFUSED_TRANSFORMER", e.coords);
    }
  }

  const splitters = blocks.filter(
    (x) => x.type == "SPLITTER" || x.type == "CONFUSED_SPLITTER"
  );
  const splitable = ["TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
  for (let u = 0; u < splitters.length; u++) {
    const e = splitters[u];
    const border = getBorderOf(e.coords)
      .map((x) => blockAt(x))
      .filter((e) => !!e && splitable.includes(e.type));

    if (border.length == 1) {
      const [x, y] = e.coords;
      const block = border[0];
      switch (block.type) {
        case "TWO":
          if (
            checkBlocks(
              [
                [-1, 0],
                [1, 0],
              ],
              e.coords,
              [block.coords]
            ).length > 0
          )
            continue;
          deleteBlock(e.coords);
          deleteBlock(block.coords);
          insertBlock("ONE", [x - 1, y]);
          insertBlock("ONE", [x + 1, y]);
          break;
        case "THREE":
          if (
            checkBlocks(
              [
                [-1, 0],
                [1, 0],
                [0, -1],
              ],
              e.coords,
              [block.coords]
            ).length > 0
          )
            continue;
          deleteBlock(e.coords);
          deleteBlock(block.coords);
          insertBlock("ONE", [x - 1, y]);
          insertBlock("ONE", [x + 1, y]);
          insertBlock("ONE", [x, y - 1]);
          break;
        case "FOUR":
          if (
            checkBlocks(
              [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
              ],
              e.coords,
              [block.coords]
            ).length > 0
          )
            continue;
          deleteBlock(e.coords);
          deleteBlock(block.coords);
          insertBlock("ONE", [x - 1, y - 1]);
          insertBlock("ONE", [x - 1, y + 1]);
          insertBlock("ONE", [x + 1, y - 1]);
          insertBlock("ONE", [x + 1, y + 1]);
          break;
        case "FIVE":
          if (
            checkBlocks(
              [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [0, 0],
              ],
              e.coords,
              [block.coords, e.coords]
            ).length > 0
          )
            continue;
          deleteBlock(block.coords);
          insertBlock("ONE", [x - 1, y - 1]);
          insertBlock("ONE", [x - 1, y + 1]);
          insertBlock("ONE", [x + 1, y - 1]);
          insertBlock("ONE", [x + 1, y + 1]);
          setBlock("ONE", e.coords);
          break;
        case "SIX":
          if (
            checkBlocks(
              [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [0, 0],
              ],
              e.coords,
              [block.coords, e.coords]
            ).length > 0
          )
            continue;
          deleteBlock(block.coords);
          insertBlock("ONE", [x - 1, y - 1]);
          insertBlock("ONE", [x - 1, y + 1]);
          insertBlock("ONE", [x + 1, y - 1]);
          insertBlock("ONE", [x + 1, y + 1]);
          setBlock("TWO", e.coords);
          break;
        case "SEVEN":
          if (
            checkBlocks(
              [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
                [0, 0],
              ],
              e.coords,
              [block.coords, e.coords]
            ).length > 0
          )
            continue;
          deleteBlock(block.coords);
          insertBlock("TWO", [x - 1, y - 1]);
          insertBlock("ONE", [x - 1, y + 1]);
          insertBlock("ONE", [x + 1, y - 1]);
          insertBlock("TWO", [x + 1, y + 1]);
          insertBlock("ONE", [x, y]);
          setBlock("ONE", e.coords);
          break;
      }
    } else if (border.length > 1) {
      setBlock("CONFUSED_SPLITTER", e.coords);
    }
  }
}

function physicsTwo() {
  //store the level state at the beginning of the tick to each block moves in the same way no matter its order in the list

  const eights = blocks.filter((x) => x.type === "EIGHT");
  for (let i = 0; i < eights.length; i++) {
    setBlock("TREASURE", eights[i].coords);
  }

  //processing blocks that automatcally add

  //move tractors
  const moveable = [...numbers, "TREASURE", "ENEMY", "SPONGE", "SAND"];
  const change = { UP: [0, -1], DOWN: [0, 1], RIGHT: [1, 0], LEFT: [-1, 0] };
  const opposite = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
  const tractors = blocks.filter(
    (x) => x.type == "TRACTOR" || x.type == "CONFUSED_TRACTOR"
  );

  
  const tborders = tractors.map((x) =>
    getBorderOf(x.coords)
      .map((e) => blockAt(e))
      .filter((e) => !!e && moveable.includes(e.type))
  );
  for (let g = 0; g < tractors.length; g++) {
    const e = { ...tractors[g] };
    const border = [...tborders[g]];
    let dir = e.direction;

   if (!dir) {
      //see if a block can be pushed if theres only one of them
      if (border.length == 1 && moveable.includes(border[0].type)) {
        const cargo = border[0];
        //check to make sure the cargo isn't touching any directional tractors if so, quit
        const tractors = getBorderOf(cargo.coords)
          .map((a) => blockAt(a))
          .filter(
            (r) =>{
              return !!r &&
              r.type == "TRACTOR" &&
              r.direction &&
              applyChange(change[r.direction],r.coords).join("-") == cargo.coords.join("-") &&
              r.coords.join("-") !== e.coords.join("-")
            }
          );

        if (tractors.length > 0) {
          continue;
        }

        //moving on...
        if (e.type == "CONFUSED_TRACTOR") {
          setBlock("TRACTOR", e.coords);
        }
        const changes = Object.values(change).map((w) =>
          applyChange(e.coords, w).join("-")
        );
        const i = changes.indexOf(cargo.coords.join("-"));
        dir = Object.keys(change)[i];
        setProp(coordsToIndex(e.coords), { direction: dir });
      } else if (border.length > 1) {
        setBlock("CONFUSED_TRACTOR", e.coords);
      } else {
        if (e.type == "CONFUSED_TRACTOR") {
          setBlock("TRACTOR", e.coords);
        }
        continue;
      }
    }

    if (dir && border.length > 0) {
      const cargoat = applyChange(e.coords, change[dir]);
      const qt = blockAt(cargoat);

      if (!qt || !moveable.includes(qt.type)) {
        setProp(coordsToIndex(e.coords), { direction: null });
        continue;
      }

      const cargo = qt.coords;
      const newcargo = applyChange(cargo, change[dir]);

      //if bob is in any of the tractor parts or standing in front, stop the tractor
      const b = bob.join("-");
      if (
        b == newcargo.join("-") ||
        b == cargo.join("-") ||
        b == e.coords.join("-")
      ) {
        continue;
      }

      const bl = blockAt(newcargo);
      if (bl) {
        deleteBlock(cargo);
        moveBlock(coordsToIndex(e.coords), cargo);
        insertBlock(qt.type, e.coords);
        setProp(coordsToIndex(cargo), { direction: opposite[dir] });
      } else {
        moveBlock(coordsToIndex(cargo), newcargo);
        moveBlock(coordsToIndex(e.coords), cargo);
      }
    } else {
      setProp(coordsToIndex(e.coords), { direction: null });
    }
  }

  //sponges
  const absorbable = [
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "TREASURE",
  ];
  const sponges = blocks
    .filter((x) => x.type == "SPONGE")
    .filter(
      (s) =>
        getBorderOf(s.coords)
          .map((x) => blockAt(x))
          .filter((r) => !!r && absorbable.includes(r.type)).length > 0
    );
  const borders = sponges.map((x) =>
    getBorderOf(x.coords)
      .map((x) => blockAt(x))
      .filter((e) => !!e && absorbable.includes(e.type))
  );
  for (let u = 0; u < sponges.length; u++) {
    const e = { ...sponges[u] };
    const border = [...borders[u]];
    if (border.length > 0) {
      const h = border
        .filter((r) => r.coords[0] == e.coords[0])
        .sort((a, b) => a.coords[0] - b.coords[0]);
      const v = border
        .filter((a) => a.coords[1] == e.coords[1])
        .sort((a, b) => a.coords[1] - b.coords[1]);
      if (h.length > 0) {
        deleteBlock(e.coords);
        moveBlock(coordsToIndex(h[0].coords), e.coords);
      } else if (v.length > 0) {
        deleteBlock(e.coords);
        moveBlock(coordsToIndex(v[0].coords), e.coords);
      }
    }
  }

  //factories
  const factories = blocks.filter((x) => x.type == "FACTORY");
  for (let u = 0; u < factories.length; u++) {
    const e = { ...factories[u] };
    const border = getBorderOf(e.coords)
      .map((x) => blockAt(x))
      .filter((x) => !!x);

    const f = border.filter((x) => x.type == "FACTORY");
    const se = border.filter((x) => x.type == "SAND" || x.type == "ENZYME");

    //taken straight from the original playbook
    const r1 = applyChange(e.coords, [
      Math.floor(Math.random() * 3) - 1,
      Math.floor(Math.random() * 3) - 1,
    ]);
    const r2 = applyChange(e.coords, [
      Math.floor(Math.random() * 3) - 1,
      Math.floor(Math.random() * 3) - 1,
    ]);

    //only touching one other factory
    if (f.length == 1 && !blockAt(r1)) {
      if (Math.random() < 0.5) {
        insertBlock("ENZYME", r1);
      } else {
        insertBlock("SAND", r2);
      }
    }

    //only one factory, but touching some blocks
    if (f.length == 0 && se.length > 0) {
      const block = blockAt(r1);
      if (block) {
        switch (block.type) {
          case "ENZYME":
          case "SAND":
            insertBlock(block.type, r2);
            break;
        }
      }
    }
  }
}

//coords helper functions
function mouseToCoords(x, y) {
  return [
    Math.trunc(x / (canvas.width / grid.columns)),
    Math.trunc(y / (canvas.height / grid.rows)),
  ];
}

function coordsToPos(coords) {
  const [x, y] = coords;
  return [(grid.width / grid.columns) * x, (grid.height / grid.rows) * y];
}

function blockAt(coords) {
  const [x, y] = coords;
  if (x < 0 || x >= grid.columns || y < 0 || y >= grid.rows) {
    return { type: "OFF_BOARD", coords };
  }

  const item = blocks.find((e) => e.coords[0] == x && e.coords[1] == y);
  return item || null;
}

function drawBlock(type, coords) {
  const pos = coordsToPos(coords);
  ctx.drawImage(icons[type], ...pos, cellsize, cellsize);
}

function drawBob(x, y) {
  const p = coordsToPos([x, y]);

  if (holding.isHolding) {
    ctx.drawImage(icons[holding.block], ...p, cellsize, cellsize);
    ctx.strokeStyle = "#0099ff";
    ctx.lineWidth = linewidth;
    ctx.beginPath();
    ctx.rect(
      p[0] + linewidth / 2,
      p[1] + linewidth / 2,
      cellsize - linewidth,
      cellsize - linewidth
    );
    ctx.stroke();
    ctx.closePath();
  } else {
    ctx.drawImage(icons["BOB"], ...p, cellsize, cellsize);
  }
}

//bob move event - checks blocks and surroundings after bob moves
function physicsThree() {
  //check for blocks bob has walked into
  const current = blockAt(bob);
  if (current) {
    switch (current.type) {
      case "ENEMY":
        gameOver(messages.ENEMY);
        console.log("Oh No! bob walked into an enemy!");
        break;
      case "ENEMY_HOUSE":
        gameOver(messages.ENEMY_HOUSE_WALKED_INTO);
        console.log("Oh No! bob walked into an enemy house!");
        break;
      case "TREASURE":
        console.log("Good Job, Bob!");
        gameOver(messages.TREASURE);
        break;
    }
  }

  //check for and draw enemy houses
  const houses = blocks
    .filter((x) => x.type == "ENEMY_HOUSE")
    .map((r) => r.coords);

  const horizontal = houses.filter((x) => x[1] == bob[1]);
  const vertical = houses.filter((x) => x[0] == bob[0]);
  const sortHorizontal = (a, b) =>
    Math.abs(bob[0] - a[0]) - Math.abs(bob[0] - b[0]);
  const sortVertical = (a, b) =>
    Math.abs(bob[1] - a[1]) - Math.abs(bob[1] - b[1]);

  const houseLeft = horizontal
    .filter((x) => x[0] < bob[0])
    .sort(sortHorizontal)[0];
  const houseRight = horizontal
    .filter((x) => x[0] > bob[0])
    .sort(sortHorizontal)[0];
  const houseTop = vertical.filter((y) => y[1] < bob[1]).sort(sortVertical)[0];
  const houseBottom = vertical
    .filter((y) => y[1] > bob[1])
    .sort(sortVertical)[0];

  if (houseLeft && houseRight) {
    console.log("Horizontal Connection");
    for (let i = 1; i < houseRight[0] - houseLeft[0]; i++) {
      drawBlock("ENEMY", [houseLeft[0] + i, bob[1]]);
    }
    gameOver(messages.ENEMY_HOUSE);
  }

  if (houseTop && houseBottom) {
    console.log("Vertical Connection");
    for (let i = 1; i < houseBottom[1] - houseTop[1]; i++) {
      drawBlock("ENEMY", [bob[0], houseTop[1] + i]);
    }
    gameOver(messages.ENEMY_HOUSE);
  }
}

function moveBob(x, y) {
  const r = coordsToPos(bob);
  ctx.fillStyle = "white";
  ctx.fillRect(...r, cellsize, cellsize);

  drawBob(x, y);

  const block = blockAt(bob);
  if (block) {
    drawBlock(block.type, block.coords);
  }

  //set new bob position
  bob[0] = x;
  bob[1] = y;

  //run bob move event checks
  physicsThree();
}

function loadLevel(obj) {
  //clear out canvas
  ctx.clearRect(0, 0, grid.width, grid.height);

  //clear out blocks
  if (blocks.length > 0) {
    blocks.splice(0, blocks.length);
  }

  //loop through blocks in file and add them
  for (const block of obj.blocks) {
    const { type, coords } = block;
    insertBlock(type, coords);
  }

  document.querySelector("#title").innerText = obj.title;

  //move bob to starting position
  moveBob(...obj.start);
}

if (window.matchMedia("(pointer: coarse)").matches) {
  // touchscreen

  canvas.addEventListener("touchstart", startTouch, false);
  canvas.addEventListener("touchmove", moveTouch, false);

  // Swipe Up / Down / Left / Right
  var initialX = null;
  var initialY = null;

  function startTouch(e) {
    initialX = e.touches[0].clientX;
    initialY = e.touches[0].clientY;
  }

  function moveTouch(e) {
    if (initialX === null) {
      return;
    }

    if (initialY === null) {
      return;
    }

    var currentX = e.touches[0].clientX;
    var currentY = e.touches[0].clientY;

    var diffX = initialX - currentX;
    var diffY = initialY - currentY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // sliding horizontally
      if (diffX > 0) {
        // swiped left
        if (bob[0] == 0) return;
        moveBob(bob[0] - 1, bob[1]);
        console.log("swiped left");
      } else {
        // swiped right
        if (bob[0] == grid.columns - 1) return;
        moveBob(bob[0] + 1, bob[1]);
        console.log("swiped right");
      }
    } else {
      // sliding vertically
      if (diffY > 0) {
        // swiped up
        if (bob[1] == 0) return;
        moveBob(bob[0], bob[1] - 1);
        console.log("swiped up");
      } else {
        // swiped down
        if (bob[1] == grid.rows - 1) return;
        moveBob(bob[0], bob[1] + 1);
        console.log("swiped down");
      }
    }

    initialX = null;
    initialY = null;

    e.preventDefault();
  }

  canvas.addEventListener("click", () => {
    const block = blockAt(bob);
    if (block && !holding.isHolding) {
      holding.isHolding = true;
      holding.block = block.type;
      deleteBlock(block.coords);
      drawBob(...bob);
    } else if (!block && holding.isHolding) {
      insertBlock(holding.block, bob.concat());
      holding.isHolding = false;
      holding.block = null;
      physicsOne();
      drawBob(...bob);
    }
  });
} else {
  window.addEventListener("keydown", (event) => {
    if (over) return;

    switch (event.key) {
      //moving bob
      case "ArrowUp":
        if (bob[1] == 0) return;
        moveBob(bob[0], bob[1] - 1);
        break;
      case "ArrowDown":
        if (bob[1] == grid.rows - 1) return;
        moveBob(bob[0], bob[1] + 1);
        break;
      case "ArrowLeft":
        if (bob[0] == 0) return;
        moveBob(bob[0] - 1, bob[1]);
        break;
      case "ArrowRight":
        if (bob[0] == grid.columns - 1) return;
        moveBob(bob[0] + 1, bob[1]);
        break;
      case " ":
        //pickup and put down logic
        const block = blockAt(bob);
        if (block && !holding.isHolding) {
          holding.isHolding = true;
          holding.block = block.type;
          deleteBlock(block.coords);
          drawBob(...bob);
        } else if (!block && holding.isHolding) {
          insertBlock(holding.block, bob.concat());
          holding.isHolding = false;
          holding.block = null;
          physicsOne();
          drawBob(...bob);
        }
    }
  });
}

window.addEventListener("load", () => {
  //{"start":[21,12],"blocks":[{"type":"ENEMY_HOUSE","coords":[13,9]},{"type":"ENEMY_HOUSE","coords":[13,13]},{"type":"FOUR","coords":[14,11]},{"type":"ENEMY_HOUSE","coords":[17,13]},{"type":"ENEMY_HOUSE","coords":[17,9]},{"type":"FOUR","coords":[16,11]},{"type":"FOUR","coords":[15,10]},{"type":"FOUR","coords":[15,12]},{"type":"TRACTOR","coords":[28,10]},{"type":"TRACTOR","coords":[28,11]},{"type":"TRACTOR","coords":[28,12]},{"type":"TRACTOR","coords":[28,13]},{"type":"SPONGE","coords":[26,14]},{"type":"SPONGE","coords":[26,15]},{"type":"SPONGE","coords":[26,16]},{"type":"SPONGE","coords":[26,17]}],"title":"untitled"};
  //{"start":[21,13],"blocks":[{"type":"ENEMY_HOUSE","coords":[15,9]},{"type":"ENEMY_HOUSE","coords":[15,13]},{"type":"FOUR","coords":[15,11]},{"type":"SPONGE","coords":[19,11]},{"type":"ENEMY_HOUSE","coords":[14,9]},{"type":"ENEMY_HOUSE","coords":[14,13]},{"type":"SPONGE","coords":[21,10]},{"type":"FOUR","coords":[14,11]}],"title":"a"}
  //{
  //   start: [15, 15],
  //   blocks: [
  //     { type: "TRACTOR", coords: [17, 11] },
  //     { type: "SPONGE", coords: [17, 13] },
  //     { type: "ONE", coords: [19, 11] },
  //     { type: "ENEMY", coords: [19, 13] },
  //     { type: "ONE", coords: [4, 5] },
  //     { type: "ONE", coords: [5, 5] },
  //     { type: "ONE", coords: [6, 5] },
  //     { type: "TREASURE", coords: [15, 18] },
  //   ],
  //   title: "tractors",
  // };
  //{"start":[20,14],"blocks":[{"type":"FOUR","coords":[8,16]},{"type":"FOUR","coords":[8,14]},{"type":"ONE","coords":[8,18]},{"type":"TWO","coords":[8,20]},{"type":"TWO","coords":[10,20]},{"type":"ONE","coords":[10,18]},{"type":"FOUR","coords":[10,16]},{"type":"FOUR","coords":[10,14]},{"type":"ENZYME","coords":[15,10]},{"type":"ENZYME","coords":[15,9]},{"type":"SIX","coords":[13,16]},{"type":"SIX","coords":[13,17]},{"type":"ENZYME","coords":[15,16]},{"type":"ENZYME","coords":[15,17]},{"type":"TWO","coords":[17,16]},{"type":"TWO","coords":[17,17]},{"type":"THREE","coords":[17,9]},{"type":"THREE","coords":[17,10]},{"type":"THREE","coords":[13,9]},{"type":"THREE","coords":[13,10]}],"title":"adding"};
  //{"start":[16,10],"blocks":[{"type":"TREASURE","coords":[15,17]},{"type":"TREASURE","coords":[17,17]},{"type":"TREASURE","coords":[16,17]},{"type":"TREASURE","coords":[15,18]},{"type":"TREASURE","coords":[16,18]},{"type":"TREASURE","coords":[18,17]},{"type":"TREASURE","coords":[18,18]},{"type":"TREASURE","coords":[17,18]},{"type":"TREASURE","coords":[0,0]},{"type":"TREASURE","coords":[0,21]},{"type":"ENEMY_HOUSE","coords":[23,7]},{"type":"ENEMY_HOUSE","coords":[23,11]},{"type":"ENEMY","coords":[20,9]},{"type":"ENEMY","coords":[20,10]},{"type":"ONE","coords":[6,8]},{"type":"ONE","coords":[7,8]},{"type":"FOUR","coords":[6,10]},{"type":"FOUR","coords":[7,10]},{"type":"TWO","coords":[6,12]},{"type":"TWO","coords":[7,12]},{"type":"THREE","coords":[6,14]},{"type":"THREE","coords":[7,14]},{"type":"SEVEN","coords":[9,8]},{"type":"SEVEN","coords":[10,8]},{"type":"SIX","coords":[9,10]},{"type":"SIX","coords":[10,10]},{"type":"FIVE","coords":[9,12]},{"type":"FIVE","coords":[10,12]},{"type":"SPONGE","coords":[9,14]},{"type":"SPONGE","coords":[10,14]},{"type":"SAND","coords":[6,16]},{"type":"SAND","coords":[7,16]},{"type":"SPLITTER","coords":[9,16]},{"type":"SPLITTER","coords":[10,16]},{"type":"TRACTOR","coords":[6,18]},{"type":"TRACTOR","coords":[7,18]},{"type":"FACTORY","coords":[9,18]},{"type":"FACTORY","coords":[10,18]},{"type":"ENZYME","coords":[6,20]},{"type":"ENZYME","coords":[7,20]},{"type":"TRANSFORMER","coords":[9,20]},{"type":"TRANSFORMER","coords":[10,20]},{"type":"ENEMY","coords":[20,8]},{"type":"ENEMY","coords":[20,11]},{"type":"ENEMY","coords":[20,7]},{"type":"ENEMY_HOUSE","coords":[27,7]},{"type":"ENEMY_HOUSE","coords":[27,11]}],"title":"test "};

  if (game.type == "level") {
    loadLevel(game);
  } else {
    loadLevel(game.levels[0]);
  }
});
