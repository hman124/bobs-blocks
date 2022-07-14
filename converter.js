const blockList = ["SAND","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","TREASURE","SPONGE","ENZYME","SPLITTER","FACTORY","TRACTOR","CONFUSED_TRACTOR","TRANSFORMER","CONFUSED_TRANSFORMER","ENEMY","ENEMY_HOUSE"];
function symbolToNumber(sym) {
  return " !\"#$%&'()*+,-./0123456789:;<=".indexOf(sym);
}

function numberToSymbol(num){
  return " !\"#$%&'()*+,-./0123456789:;<=".split("")[num];
}

function download(data, filename) {
  const a = document.createElement("a"),
  blob = new Blob([data]),
  url = URL.createObjectURL(blob);
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function fromClassicFile(file) {
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onload = () => {
    const rows = reader.result.split("\n"),
      folder = [];

    alert(`Found ${rows.length} level${rows.length>1?"s":""}`);
    for (let i = 0; i < rows.length; i++) {
      if(rows[i].length <= 4) continue;
      const row = rows[i].slice(4, rows[i].length);
      const blocks = row.slice(2,row.length).match(/.{1,3}/g);
      folder.push({
        type: "level",
        title: `Custom Level ${i+1}`,
        blocks: blocks.map(e=>({coords: [symbolToNumber(e[0]), symbolToNumber(e[1])], type: blockList[symbolToNumber(e[2])]})),
        start: [symbolToNumber(row[0]), symbolToNumber(row[1])],
      });
    }
    download(btoa(JSON.stringify({
      title: "converted",
      type: "folder",
      levels: folder,
    })), "converted.blocks");
  };
}

function zeroPad(num){
  if(num<10){
    return `00${num}`;
  } else if(num<100){
    return `0${num}`;
  } else {
    return num;
  }
}

function fromNewFile(f) {
  let reader = new FileReader();
  reader.readAsText(f);
  reader.onload = () => {
    const file = JSON.parse(atob(reader.result));
    const levels = file.type == "folder"?file.levels:[file];
    const result = [];
    for(let i = 0; i < levels.length; i++){
      const level = levels[i];
      result.push("C"+zeroPad(i+1)+level.start.map(e=>numberToSymbol(e)).join("")+level.blocks.map(x=>x.coords.map(r=>numberToSymbol(r)).join("")+numberToSymbol(blockList.indexOf(x.type))).join(""))
    }
    download(result.join("\n"), "BOBCUSTM.txt");
  };
} 

//(space)!"#$%&'()*+,-./0123456789:;<=
document.getElementById("toNew").addEventListener("change", event => {
  fromClassicFile(event.target.files[0]);
});

document.getElementById("toClassic").addEventListener("change", event => {
  fromNewFile(event.target.files[0]);
});