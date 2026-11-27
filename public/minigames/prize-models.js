/* Small solid meshes rasterized onto the same pixel grid as the claw cabinet. */
const prizeMeshes = (() => {
  const meshes = Array.from({length:7},()=>[]);
  let faces = meshes[0];
  function quad(a,b,c,d,color) { faces.push({points:[a,b,c,d],color}); }
  function box(x,y,z,w,h,d,color) {
    const X=x+w,Y=y+h,Z=z+d;
    const a=[x,y,z],b=[X,y,z],c=[X,Y,z],e=[x,Y,z];
    const f=[x,y,Z],j=[X,y,Z],k=[X,Y,Z],m=[x,Y,Z];
    quad(a,e,c,b,color); quad(f,j,k,m,color); quad(e,m,k,c,color);
    quad(a,b,j,f,color); quad(a,f,m,e,color); quad(b,c,k,j,color);
  }
  function rings(rows,colorAt) {
    for(let r=1;r<rows.length;r++) for(let i=0;i<rows[r].length;i++){
      const next=(i+1)%rows[r].length;
      quad(rows[r-1][i],rows[r-1][next],rows[r][next],rows[r][i],colorAt(r,i));
    }
  }
  // A surface of revolution, including end caps when the radius reaches zero.
  function revolve(x,y,z,profile,color) {
    const rows=profile.map(([height,radius])=>Array.from({length:10},(_,i)=>{
      const a=i*Math.PI/5;return [x+radius*Math.cos(a),y+height,z+radius*Math.sin(a)];
    }));
    rings(rows,()=>color);
  }
  function ball(x,y,z,r,color) {
    revolve(x,y,z,Array.from({length:7},(_,i)=>{
      const a=-Math.PI/2+i*Math.PI/6;return [r*Math.sin(a),r*Math.cos(a)];
    }),color);
  }
  const gold=[255,204,83],pine=[61,166,116],cream=[248,245,226],navy=[47,72,99],red=[215,59,76];
  box(-5,-5,-4.5,10,9,9,pine);
  box(-5.4,3,-4.9,10.8,2.2,9.8,[86,186,132]);
  box(-1.2,-5.1,-5,2.4,10.5,10,gold);
  box(-5.5,-.0,-1.2,11,5.5,2.4,gold);
  ball(-1.8,6.1,0,1.7,gold);ball(1.8,6.1,0,1.7,gold);

  // A tall cranberry parcel with a cream bow.
  faces=meshes[3];
  box(-3.8,-6,-3.7,7.6,12,7.4,red);
  box(-4.1,4.6,-4,8.2,1.7,8,[246,102,100]);
  box(-.9,-6.1,-4.1,1.8,12.6,8.2,cream);
  ball(-1.5,7,0,1.5,cream);ball(1.5,7,0,1.5,cream);

  // Flat midnight-blue parcel with a gold ribbon crossed over the lid.
  faces=meshes[4];
  box(-6.5,-3,-4.7,13,6,9.4,[54,92,160]);
  box(-6.8,1.6,-5,13.6,1.7,10,[94,154,213]);
  box(-1,-3.1,-5.1,2,6.6,10.2,gold);
  box(-6.9,3.25,-.85,13.8,.45,1.7,gold);
  ball(0,4.6,0,1.6,red);

  // Plum round hatbox with a contrasting lid and a ribbon around the middle.
  faces=meshes[5];
  revolve(0,0,0,[[-4.7,0],[-4.7,5],[3.5,5],[3.5,0]],[152,75,150]);
  revolve(0,0,0,[[2.5,0],[2.5,5.6],[4.6,5.6],[4.6,0]],[230,166,204]);
  revolve(0,0,0,[[-1.4,5.15],[.4,5.15]],gold);
  ball(-1.3,5.2,0,1.4,gold);ball(1.3,5.2,0,1.4,gold);

  for(const santa of [false,true]){
    faces=meshes[santa?6:1];
    ball(0,-3,0,4.8,cream);ball(0,3.2,0,3.7,cream);
    const scarf=santa?red:navy;
    revolve(0,0,0,[[.2,0],[.2,3.7],[1.5,3.7],[1.5,0]],scarf);
    box(1,-2.4,-3.8,1.6,3.6,1.2,scarf);
    if(santa){
      revolve(0,0,0,[[5.4,0],[5.4,3.9],[6.6,3.9],[6.6,0]],cream);
      revolve(0,0,0,[[6.4,3.6],[8.4,2.8],[10.4,1.3],[10.8,0]],red);
      ball(1.5,9.8,0,1.6,red);ball(3.1,8.9,0,1.6,cream);
    }else{
      revolve(0,0,0,[[5.6,0],[5.6,4.1],[6.5,4.1],[6.5,2.7],[9,2.7],[9,0]],navy);
    }
    for(const x of [-1.35,1.35])ball(x,3.9,-3,.7,[54,44,48]);
    ball(0,2.8,-3.6,1,[245,145,46]);
  }

  faces=meshes[2];
  // Circular tube following a straight shaft and half-circle hook.
  const path=[];
  for(let y=-7;y<=3;y++)path.push([-2.8,y,0,1]);
  for(let i=1;i<=12;i++){
    const a=Math.PI*i/12;
    path.push([-2.8*Math.cos(a),3+2.8*Math.sin(a),Math.sin(a),Math.cos(a)]);
  }
  path.push([2.8,2,0,-1]);
  const rows=path.map(([x,y,dx,dy])=>Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;return [x+1.8*dy*Math.cos(a),y-1.8*dx*Math.cos(a),1.8*Math.sin(a)];
  }));
  rings(rows,(r,i)=>(Math.floor((r+i*.35)/3)%2 ? red : cream));
  for(const end of [0,rows.length-1]){
    const [x,y]=path[end];for(let i=0;i<8;i++)quad([x,y,0],rows[end][i],rows[end][(i+1)%8],[x,y,0],end?red:cream);
  }
  return meshes;
})();

const prizeViews=new Map();
function prizeView(kind,angle,cameraTurn){
  const steps=40,roll=(Math.round(angle*steps/(2*Math.PI))%steps+steps)%steps;
  const view=Math.round(cameraTurn*6),key=(kind*7+view)*steps+roll;
  if(prizeViews.has(key))return prizeViews.get(key);
  const a=roll*2*Math.PI/steps,cs=Math.cos(a),sn=Math.sin(a);
  // Roll about an oblique axis so moving prizes expose different faces.
  const yaw=.36+.58*Math.sin(a),cy=Math.cos(yaw),sy=Math.sin(yaw);
  const turn=view/6,side=.57*(1-turn),pitch=.105*(1-turn),depth=.34+.12*turn;
  const size=30,mid=size/2;
  const tile=document.createElement('canvas');tile.width=tile.height=size;
  const ctx=tile.getContext('2d'),image=ctx.createImageData(size,size);
  const depths=new Float32Array(size*size).fill(Infinity);
  for(const face of prizeMeshes[kind]){
    const world=face.points.map(([x,y,z])=>{
      const rx=x*cs-y*sn,ry=x*sn+y*cs;return [cy*rx+sy*z,ry,-sy*rx+cy*z];
    });
    const screen=world.map(([x,y,z])=>[mid+x+side*z,mid+pitch*x-y-depth*z,z]);
    for(const [i,j] of [[1,2],[2,3]]){
      const [p,q,r]=[screen[0],screen[i],screen[j]];
      const area=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
      if(Math.abs(area)<.001)continue;
      const u=world[i].map((n,k)=>n-world[0][k]),v=world[j].map((n,k)=>n-world[0][k]);
      let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
      // Orient each visible surface normal toward the camera, independent of mesh winding.
      if(nz-side*nx-(pitch*side+depth)*ny>0){nx=-nx;ny=-ny;nz=-nz;}
      const diffuse=(-.38*nx+.76*ny-.53*nz)/(Math.hypot(nx,ny,nz)||1);
      const light=.66+.38*Math.round(Math.max(0,diffuse)*4)/4;
      for(let y=Math.max(0,Math.floor(Math.min(p[1],q[1],r[1])));y<Math.min(size,Math.ceil(Math.max(p[1],q[1],r[1])));y++){
        for(let x=Math.max(0,Math.floor(Math.min(p[0],q[0],r[0])));x<Math.min(size,Math.ceil(Math.max(p[0],q[0],r[0])));x++){
          const dx=x+.5-p[0],dy=y+.5-p[1];
          const b=(dx*(r[1]-p[1])-dy*(r[0]-p[0]))/area,c=((q[0]-p[0])*dy-(q[1]-p[1])*dx)/area;
          if(b<0||c<0||b+c>1)continue;
          const z=p[2]+b*(q[2]-p[2])+c*(r[2]-p[2]),index=y*size+x;
          if(z>=depths[index])continue;
          depths[index]=z;
          for(let k=0;k<3;k++)image.data[index*4+k]=face.color[k]*light;
          image.data[index*4+3]=255;
        }
      }
    }
  }
  for(let i=size+1;i<depths.length-size-1;i++){
    if(depths[i]===Infinity && [i-1,i+1,i-size,i+size].some(n=>depths[n]!==Infinity))
      image.data.set([43,39,52,255],i*4);
  }
  ctx.putImageData(image,0,0);prizeViews.set(key,tile);return tile;
}

// Visual variants share the original three prize and payout categories.
const modelsByPrize=[[0,3,4,5],[1,6],[2]];
