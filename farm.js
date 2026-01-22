class Barn {
    constructor(x, y, z) {
        const scene = document.querySelector('a-scene');

        // Root entity at ground level
        this.obj = document.createElement('a-entity');
        this.obj.setAttribute('position', `${x} ${y} ${z}`);

        /* === BARN BODY === */
        const body = document.createElement('a-box');
        body.setAttribute('width', 4);
        body.setAttribute('height', 3);
        body.setAttribute('depth', 4);
        body.setAttribute('color', '#8B0000');
        body.setAttribute('position', '0 1.5 0'); // half height = grounded

        /* === ROOF === */
        const roof = document.createElement('a-cone');
        roof.setAttribute('radius-bottom', 3.2);
        roof.setAttribute('height', 2);
        roof.setAttribute('color', '#5A2D0C');
        roof.setAttribute('position', '0 3.5 0');
        roof.setAttribute('rotation', '0 0 90');

        this.obj.appendChild(body);
        this.obj.appendChild(roof);

        scene.appendChild(this.obj);

        // Add pigs around barn
        this.spawnPigs();
    }

    spawnPigs() {
        const pigPositions = [
            '2 0 -2',
            '-2 0 -1',
            '1 0 2',
            '-1.5 0 2.2',
            '3 0 0'
        ];

        pigPositions.forEach(pos => {
            const pig = new Pig(pos);
            this.obj.appendChild(pig.obj);
        });
    }
}
