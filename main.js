function $(e){return document.getElementById(e)};
function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    };
  }

var canvas = $('screen');
var ctx = canvas.getContext('2d');


canvas.style.width = "100%";
canvas.style.height = "100%";

let mousePosition = {x:0,y:0}
let objects = [
    {
        x:0,
        y:500,
        width:600,
        height:100
    }
]
let player = {
            x:100,
            y: 100,
            velX: 0,
            velY: 0,
            color: "green",
            width: 30,
            height: 50 
        }

function drawPlayer(player){

}

function update(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
}



document.onload = () =>{
    document.onpointermove = (e)=>{
        console.log("yo")
        console.log(e.clientX)
    }
    document.setInterval(update,10);
}



