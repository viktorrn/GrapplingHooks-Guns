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
var screenCenterPos = {x:0,y:0};
var screenCornerPos = {x:0,y:0};

canvas.style.width = "1200px" //"100%";
canvas.style.height = "800px" //"100%";
canvas.width = 1200;
canvas.height = 800;

let mousePosition = {x:0,y:0}
let tiles = []
let objects = [
    {
        x:0,
        y:700,
        width:1200,
        height:100
    },
    {
        x:0,
        y:0,
        width:1200,
        height:20
    },
    {
        x:0,
        y:0,
        width:12,
        height:700
    },
    {
        x:588,
        y:150,
        width:40,
        height:350
    },
    {
        x:350,
        y:500,
        width:50,
        height:50
    },
    {
        x:950,
        y:100,
        width:50,
        height:500
    },
    {
        x:1188,
        y:0,
        width:12,
        height:700
    }
]

let player = {
    x:100,
    y: 400,
    
    pullVelX:0,
    pullVelY:0,
    velX: 0,
    accX: 0.75,
    maxSpeed: 10,

    velY: 0,
    fallAcc: 0.75,
    maxFallSpeed: 25,
    jumpPower: 12,
    

    grounded: false,
    keyCoolDowns :[],

    updatesSinceWallSlide:0,
    lastWallSlideSide:0,
    lastWallJumpSide:0,

    color: "green",
    width: 30,
    height: 50,
}

let grapplingHook = {
    width:30,
    height:10,
    drawLine:false,
    hook:{
        active: false,
        x:0,
        y:0,
        width:10,
        height:10,
        velX:0,
        velY:0,
        
        hookFlySpeed:24,
        pullAccForce:1.1,
        pullVx:0,
        pullVy:0,
        pullAng:0,

        connected:false,
        updatesFlying:0,
        updatesPulling:0,
        
    }

}

let keyStates ={
    'w':0,
    'a':0,
    's':0,
    'd':0,
    ' ':0,
    'mkl':0,
    'l':0
}

function preLoadPaths(){
    for(let el of objects){
        let path = new Path2D();
        path.rect(el.x ,el.y ,el.width,el.height);
        console.log(path)
        tiles.push(path);
    }
}

//math

function rectCollisionCheck(objects,px,py,pw,ph){
    for(let o of objects){
        if ( px < o.x + o.width
            && px + pw > o.x
            && py < o.y + o.height
            && py + ph > o.y ) return true;
    }
    return false;
}

function distance(x,y,x2,y2){
    return Math.sqrt( (x - x2)*(x - x2) + (y - y2)*(y - y2) )
}

function vecLength(x,y){
    return Math.sqrt(x**2+y**2);
}

function dotProduct(x,y,x2,y2){
    return x*x2 + y*y2;
}

function projection(vx,vy,x,y){
    return {x:(dotProduct(vx,vy,x,y)/vecLength(vx,vy)**2)*vx , y: (dotProduct(vx,vy,x,y)/vecLength(vx,vy)**2)*vy}
}

// logic

function calcGrapplingHook(hook){
    if(!hook.active) return hook;
    
    if(hook.updatesFlying > 20){
        hook.active = false;
        hook.connected = false;
        return hook;
    }else if(!hook.connected){
        hook.updatesFlying++;
    }

    if(!hook.connected){
        
        if(rectCollisionCheck(objects, hook.x + hook.velX,hook.y, hook.width, hook.height)){
            let dir =  Math.sign(hook.velX)
            hook.velX = 0;
            hook.velY = 0;
            while(!rectCollisionCheck(objects, hook.x + dir, hook.y, hook.width, hook.height)){   
                hook.x += dir;
            }
            hook.connected = true;
            hook.updatesPulling = 0;
            hook.updatesFlying = 0;
        }
        if(rectCollisionCheck(objects, hook.x ,hook.y + hook.velY, hook.width, hook.height)){
            let dir =  Math.sign(hook.velY)
            hook.velY = 0;
            hook.velX = 0;
            while(!rectCollisionCheck(objects, hook.x , hook.y + dir, hook.width, hook.height)){   
                hook.y += dir;
            }
            hook.connected = true;
            hook.updatesPulling = 0;
            hook.updatesFlying = 0;
        }
        hook.x += hook.velX;
        hook.y += hook.velY;
    }else{
        hook.updatesPulling++;
        let dist = distance(player.x+player.width/2,player.y+player.height/2,hook.x+hook.width/2 ,  hook.y+hook.height/2)
        
       // console.log(dist)

        if(dist < 70){
            hook = resetHook(hook);
             
        }else{
            
            hook.pullVx = (hook.x+hook.width/2 - player.x+player.width/2);
            hook.pullVy = (hook.y+hook.height/2  - player.y+player.height/2); 
            hook.pullAng = Math.atan2(hook.pullVy , hook.pullVx); 
            let dsvx = Math.cos(hook.pullAng)*1;
            let dsvy = Math.sin(hook.pullAng)*1;

            player.pullVelX = dsvx;
            player.pullVelY = dsvy;
         

            if(vecLength(player.pullVelX,player.pullVelY) < 6 ){
         
    
                player.velX += dsvx//player.pullVelX;
                player.velY += dsvy//player.pullVelY;

                
            }
            
        }
        
    }
    return hook;
}

function resetHook(hook){
    hook.connected = false;
    hook.active = false;
    hook.velX = 0;
    hook.velY = 0;
    player.pullVelX = 0;
    player.pullVelY = 0; 
    return hook;
}

function calcPlayer(p){
    let dshp = ( keyStates['d'] - keyStates['a'])*p.maxSpeed;
    let airMult = 1;
    if(p.updatesSinceWallSlide < 11) p.updatesSinceWallSlide++;
    p.grounded = rectCollisionCheck(objects, p.x,p.y+1, p.width, p.height) ? true : false;
    if(grapplingHook.hook.connected){
        
        if(keyStates[' '] == 1){
            keyStates[' '] = -1;
            //grapplingHook.hook =  resetHook(grapplingHook.hook)
        }
        if(keyStates['mkl'] == 1){
            keyStates['mkl'] = -1;
            grapplingHook.hook =  resetHook(grapplingHook.hook)
        }
    }
    
    if(p.grounded){
        p.lastWallSlideSide = 0; p.lastWallJumpSide = 0;
        if(keyStates[' '] == 1){
            keyStates[' '] = -1
            p.velY = -p.jumpPower;
        }
    }else{
        airMult = 0.5;
        
        if(p.velY < p.maxFallSpeed && !grapplingHook.hook.connected) p.velY += p.fallAcc;
        if(rectCollisionCheck(objects, p.x + Math.sign(dshp)*5,p.y, p.width, p.height) &&  Math.sign(dshp) != p.lastWallJumpSide){
            p.updatesSinceWallSlide = 0;
            p.lastWallSlideSide = Math.sign(dshp);
            if( p.velY > 3){ p.velY -= p.fallAcc*2;}
            
        }
        if(keyStates[' '] == 1 && p.updatesSinceWallSlide < 10){
            keyStates[' '] = -1;
            p.lastWallJumpSide = p.lastWallSlideSide;
            p.velX -= p.lastWallSlideSide*p.accX*5;
            p.velY = -p.jumpPower;
        }
        
    }

    if(p.velX > dshp) p.velX -= p.accX*airMult;
    else if(p.velX < dshp) p.velX += p.accX*airMult;
    if(dshp == 0 && Math.abs(p.velX) < 0.5 ) p.velX = 0;

    if(keyStates['mkl'] == 1 && !grapplingHook.hook.active){
        keyStates['mkl'] = -1;
        let vx = ( mousePosition.x - p.x-p.width/2) ;
        let vy = (mousePosition.y - p.y-p.height/2) ;  
        let a = Math.atan2(vy,vx);
        
        grapplingHook.hook.active = true;
        grapplingHook.hook.updatesFlying = 0;
        grapplingHook.hook.x = p.x+p.width/2;
        grapplingHook.hook.y = p.y+p.height/2;
        grapplingHook.hook.velX = Math.cos(a)*grapplingHook.hook.hookFlySpeed;
        grapplingHook.hook.velY = Math.sin(a)*grapplingHook.hook.hookFlySpeed;
   
        
    }

    // collisions
    if(rectCollisionCheck(objects, p.x + p.velX,p.y, p.width, p.height)){
        let dir =  Math.sign(p.velX)
        
        while(!rectCollisionCheck(objects, p.x + dir, p.y, p.width, p.height)){   
            p.x += dir;
        }
        p.velX = 0;
    }

    
    if(rectCollisionCheck(objects, p.x ,p.y + p.velY, p.width, p.height)){
        let dir =  Math.sign(p.velY)
        
        while(!rectCollisionCheck(objects, p.x , p.y + dir, p.width, p.height)){   
            p.y += dir;
        }
        p.velY = 0;
    }

    if(rectCollisionCheck(objects, p.x + p.velX ,p.y + p.velY, p.width, p.height)){
        let dirY =  Math.sign(p.velY)
        let dirX =  Math.sign(p.velX)
        p.velY = 0;
        
        while(!rectCollisionCheck(objects, p.x+ dirX , p.y + dirY, p.width, p.height)){   
            p.y += dirY;
            p.x += dirX;
        }
        if(rectCollisionCheck(objects, p.x+ dirX , p.y, p.width, p.height))
            p.velX = 0;
            else
            p.velY = 0;
        
    }

    p.y += p.velY;
    p.x += p.velX;
    return p;
}

// draw

function drawPlayer(player){
    ctx.beginPath();
    ctx.translate(player.x + player.width/2, player.y + player.height/2 );
    ctx.rotate(player.velX/(10*player.maxSpeed));
    
    ctx.rect(-player.width/2,-player.height/2,player.width * 1 ,player.height * (1+ Math.abs(player.velY/50 )) );
    ctx.fillStyle = player.color;
    ctx.fill();

    ctx.beginPath();
    let a = Math.atan2(mousePosition.y - player.y-player.height/2,mousePosition.x - player.x-player.width/2)
    ctx.rotate(a)
    ctx.rect(-5,-grapplingHook.height/2,grapplingHook.width,grapplingHook.height);
    ctx.fillStyle = "black";
    ctx.fill();

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if(grapplingHook.hook.active){
        ctx.beginPath();
        ctx.rect(grapplingHook.hook.x,grapplingHook.hook.y,grapplingHook.hook.width,grapplingHook.hook.height);
        ctx.fill();

        if(grapplingHook.drawLine){
            ctx.beginPath();
            ctx.moveTo(player.x + player.width/2,player.y + player.height/2);
            ctx.lineTo(grapplingHook.hook.x+grapplingHook.hook.width/2,grapplingHook.hook.y+grapplingHook.hook.height/2);
            ctx.lineWidth = 3;
            ctx.stroke();
        }
       
    }
    
}

function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPlayer(player);
    for(let p of tiles){
        ctx.fillStyle = "black"
        ctx.fill(p);
    }
}

function update(){
    grapplingHook.hook = calcGrapplingHook(grapplingHook.hook);
    player = calcPlayer(player);
    if(keyStates['l'] == 0){
        keyStates['l'] = -1;
        console.log(player,grapplingHook.hook);
    }
    draw();
}




// onload

window.onload = () =>{
    screenCornerPos = canvas.getBoundingClientRect();
    preLoadPaths();
    //screenCenterPos = {x:screenCornerPos.x + canvas.width/2,y:screenCornerPos.y + canvas.height/2}
    document.onpointermove = (e)=>{
        
        mousePosition = {x: e.clientX - screenCornerPos.left, y: e.clientY - screenCornerPos.top}
        //console.log( mousePosition)
    }
    document.onkeydown = (e)=>{
        if( keyStates[e.key] != -1)
        keyStates[e.key] = 1;
    }
    document.onkeyup = (e)=>{
        keyStates[e.key] = 0;
    }
    document.onpointerdown = (e)=>{
        if(keyStates['mkl'] != -1)
            keyStates['mkl'] = 1;
    }
    document.onpointerup = (e)=>{
        keyStates['mkl'] = 0;
    }
    setInterval(update,20);
}



