 class Barn {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        // Get the A-Frame scene
        const scene = document.querySelector('a-scene');

        // Parent entity
        this.obj = document.createElement('a-entity');
        this.obj.setAttribute('position', `${x} ${y} ${z}`);

        // Barn body
        const barn = document.createElement('a-box');
        barn.setAttribute('width', 4);
        barn.setAttribute('height', 3);
        barn.setAttribute('depth', 4);
        barn.setAttribute('color', '#8B0000'); // barn red

        this.obj.appendChild(barn);
        scene.appendChild(this.obj);
    }
}
