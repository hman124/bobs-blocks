const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const rect = canvas.getBoundingClientRect();

//define grid props
const grid = {
  rows: 22,
  columns: 30,
};

const cellsize = 28;
const linewidth = 2;

//for keeping track of the blocks on the grid
const blocks = [];

//for selecting blocks and placing them
let current = null;
let done = false;
let level = {}

//set canvas dimensions
grid.width = grid.columns * cellsize;
grid.height = grid.rows * cellsize;

canvas.width = grid.width + linewidth;
canvas.height = grid.height + linewidth;

canvas.style.borderWidth = `${linewidth}px`;

ctx.strokeStyle = "black";
ctx.fillStyle = "white";
ctx.lineWidth = linewidth;

//set white background
ctx.fillRect(0, 0, canvas.width, canvas.height);

function setCurrentItem(item){
    const s = document.querySelector(".icon.selected");
    if(s){
        s.classList.remove("selected");
    }

    const n = document.querySelector(".icon[data-type='"+item+"']");
    if(n){
        n.classList.add("selected");
        current = item;
    } else {
        console.log("problem setting current item");
    }
        
}

//from https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas#17130415
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width, // relationship bitmap vs. element for x
    scaleY = canvas.height / rect.height; // relationship bitmap vs. element for y

  return {
    x: (evt.clientX - rect.left) * scaleX, // scale mouse coordinates after they have
    y: (evt.clientY - rect.top) * scaleY, // been adjusted to be relative to element
  };
}

//draw horizontal and vertical grid lines
for (let e = 0; e <= grid.rows; e++) {
  const a = e * (grid.height / grid.rows) + linewidth / 2;
  ctx.moveTo(0, a);
  ctx.lineTo(canvas.width, a);
  ctx.stroke();
}

for (let i = 0; i <= grid.columns; i++) {
  const a = i * (grid.width / grid.columns) + linewidth / 2;
  ctx.moveTo(a, 0);
  ctx.lineTo(a, canvas.height);
  ctx.stroke();
}

//load icons to be used for the game
function image(url) {
  const img = new Image();
  img.src = url;
  img.onload = () => {console.log("loaded "+url)};
  return img;
}

const icons = {
  ONE: image("./icons/ONE.png"),
  TWO: image("./icons/TWO.png"),
  THREE: image("./icons/THREE.png"),
  FOUR: image("./icons/FOUR.png"),
  FIVE: image("./icons/FIVE.png"),
  SIX: image("./icons/SIX.png"),
  SEVEN: image("./icons/SEVEN.png"),
  EIGHT: image("./icons/EIGHT.png"),
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
  ENZYME: image("./icons/enzyme.png")
};

//coords helper functions
function mouseToCoords(x, y) {
  return [
    Math.trunc(x / (canvas.width / grid.columns)),
    Math.trunc(y / (canvas.height / grid.rows)),
  ];
}

function coordsToPos(x, y) {
  return [
    (grid.width / grid.columns) * x + 2,
    (grid.height / grid.rows) * y + 2,
  ];
}

function blockAt(x,y) {
  const item = blocks.find(e=>e.coords[0]==x&&e.coords[1]==y);
  console.log(item);
  return !!item;
}


canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
  return false;
});


function deleteItem(x,y){
  const i = blocks.map(x=>x.coords.join(":")).indexOf(`${x}:${y}`);
  blocks.splice(i, 1);
}

function download(content, name){
  const a = document.createElement("a");
  const blob = new Blob([content], {type: 'text/plain'});
  a.setAttribute("href", URL.createObjectURL(blob));
  a.setAttribute("download", name);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

//respond to click events on canvas
canvas.addEventListener("mousedown", (event) => {
  const { x, y } = getMousePos(canvas, event);
  const coords = mouseToCoords(x, y);
  const pos = coordsToPos(...coords);
  const block = blockAt(...coords);

  if(done){
    done=false;
    level.start = coords;
    level.type = "level";
    level.blocks = blocks.concat();
    level.title = prompt("Great! Now set a title for this level") || 'untitled';
    console.log(JSON.stringify(level));
    location.href = ("./play.html?a="+btoa(JSON.stringify(level)))
    // download(btoa(JSON.stringify(level)), "level.bob");
    return;
  }

  if(event.button == 0 && typeof current == "string"){
    if(block){deleteItem(...coords);}
    blocks.push({ type: current, coords});
    ctx.drawImage(icons[current], ...pos, cellsize - 2, cellsize - 2);
  } else if(event.button == 2 && block){
    deleteItem(...coords);
    ctx.fillStyle = "white";
    ctx.fillRect(...pos, cellsize - 2, cellsize - 2);
  }
});

//add buttons to bottom icon tray
window.addEventListener("load", () => {
    const list = document.querySelectorAll(".icon");
    for(const e of list){
      const t = e.getAttribute("data-type");
      e.addEventListener("click", event => setCurrentItem(t));
    }
});

document.getElementById("done").addEventListener("click", () => {
  done = true;
  alert("great, now choose where you want bob to start!");
});