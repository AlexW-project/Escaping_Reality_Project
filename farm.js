 class Barn{
     constructor(x,y,z){
         this.x = x;
         this.y = y;
         this.z = z;
         this.obj = document.createElement('a-entity');
         
         let barn = document.createElement('a-box');
         this.obj.append(barn)

         scene.append(this.obj);
     }

}