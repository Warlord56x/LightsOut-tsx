import React, {useEffect, useRef} from 'react';
import Phaser from 'phaser';

const IMAGE_NAME = "FRAMES";
const SEPARATOR = "_";
const FRAMES = 24;
const FPS = 24;

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1000;

const gridHeight = 5;
const gridWidth = 5;

const cellSize = 108;                           // Should only be set once X.png 's size /10
const gridSize = gridHeight * cellSize;     // gridHeight * cellSize



// Configs, and helper functions
const to4Digits = (x : string|number) => (x+'').padStart(4, '0');

const textConfig = {
    fontFamily:'Jetbrains mono',
    fontSize: 32
}

class Main extends Phaser.Scene {

    // Types necessary for typescript
    // (cells must have a value otherwise it would need to be declared somewhere else)
    private readonly cells : Phaser.GameObjects.Sprite[][] = [];

    private cells_container : Phaser.GameObjects.Container | undefined;

    private center : Phaser.GameObjects.Zone | undefined;
    private _load : Phaser.GameObjects.Sprite | undefined;
    private text : Phaser.GameObjects.Text | undefined;

    private start = performance.now() / 1000;
    private timer : Phaser.GameObjects.Text | undefined;

    private currentLevel : number = 0;
    private levels : any[] = [];
    private level : boolean[][] = [];

    private levelDisplay : Phaser.GameObjects.Text | undefined;

    constructor ()
    {
        const files : [{type:string, key:string, url:string}] = [{type:'', key:'', url:''}];
        for (let i = 0; i < FRAMES; i++) {
            files[i] = ({type:'image', key:'LOADING'+i, url:"img/load/"+IMAGE_NAME+SEPARATOR+to4Digits(i)+'.png'});
        }
        super(
            {
            pack: {
                files: files,
            }
        });

        // Should be initialized to avoid invalid access
        this.cells = Array(gridWidth)
            .fill(null)
            .map(() => Array(gridWidth).fill(null));
    }

    // Ide may complain that it is not used, but it is, by phaser
    init ()
    {
        const frames : [{key:string}] = [{key:''}];
        for (let i = 0; i < FRAMES; i++) {
            frames[i] = ({key:'LOADING'+i});
        }
        const config = {
            key: 'LOAD',
            frames: frames,
            frameRate: FPS,
            repeat: -1
        };

        // Init the center, used for aligning
        // Can't be set at declaration or in the constructor, since the add is not defined then.
        this.center = this.add.zone(
            IMAGE_WIDTH/2,
            IMAGE_HEIGHT/2,
            IMAGE_WIDTH, IMAGE_HEIGHT
        );

        // Load animation initialization
        this.anims.create(config);
        this._load = this.add
            .sprite(0, 0, "")
            .play("LOAD");

        // Display load progress text
        this.text = this.add.text(0, 0, "0.00%", textConfig);

        // Align Load objects
        Phaser.Display.Align.In.Center(this._load, this.center);
        Phaser.Display.Align.In.BottomCenter(this.text, this.center);
    }

    preload() {

        // Load cell animation
        this.load.setPath("img");
        for (let i = 0; i < FRAMES; i++) {
            this.load.image("cell/"+IMAGE_NAME + SEPARATOR + to4Digits(i+""));
        }

        // Load static images
        this.load.image("Bg", "Board.png");
        this.load.image("Menu", "Menu.png");
        this.load.image("Title", "Title.png");
        this.load.image("X","X.png");
        this.load.image("Select","Select.png");

        // Load audios
        this.load.setPath("sounds");
        this.load.audio("click", "click.wav");
        this.load.audio("BgMusic", "background_music.flac");

        // Load levels, all of them, from one file, accessible from cache, see phaser docs.
        // (this.cache.json.get())
        this.load.setPath("");
        this.load.json("levels", "levels.json");

        // Connect the game events, to corresponding functions
        this.load.on("progress", this.progress, {text: this.text});
        this.load.on("complete", this.complete, {scene: this.scene});
    }

    // Game loop, it is done every frame or so
    update(time: number, delta: number) {
        if (time / 1000 > 99) {
            this.timer?.setText(`Time: 99.9s`);
            return;
        }
        this.timer?.setText(`Time: ${(time / 1000).toFixed(1)}s`);
    }

    // Load is in progress, display it to user
    private progress(percentage: number) {
        const p = (percentage * 100).toFixed(2) + "%"
        this.text?.setText(p);
    }

    // Load is complete
    private complete() {
        console.log("Load: COMPLETE");
        this.text?.setText("Load complete.");
    }

    // Create scene
    create() {
        // Unload load elements since they are not relevant anymore
        if (this._load) {
            this._load.destroy();
        }
        if (this.text) {
            this.text.destroy();
        }

        // Initialize starting level
        this.levels = this.cache.json.get("levels").levels;
        this.level = this.levels[this.currentLevel].board;

        // Make the loaded animation
        const frames : Phaser.Types.Animations.AnimationFrame[] = [];
        for (let i = 0; i < FRAMES; i++) {
            frames.push({
                key: "cell/"+IMAGE_NAME + SEPARATOR + to4Digits(i + ""),
            });
        }

        // Make animation from frames
        this.anims.create({
            key: "Light",
            frames: frames,
            repeat: -1,
            frameRate: FPS,
        });

        // render title
        const title = this.add.image(0, 0, "Title")
            .setScale(0.5);
        if (this.center) Phaser.Display.Align.In.TopCenter(title, this.center);

        // Render background
        const bg = this.add.image(0,0,"Bg")
            .setScale(0.5);
        if (this.center) Phaser.Display.Align.In.Center(bg, this.center);

        // Render menu
        const menu = this.add.image(0,0,"Menu")
            .setScale(0.5);
        Phaser.Display.Align.To.LeftCenter(menu, bg);

        // Render timer and level
        this.levelDisplay = this.add.text(0, 0, "Level: 1", textConfig);
        this.timer = this.add.text(0, 0,`Time: ${(this.start).toFixed(2)}`, textConfig);
        if (this.center) Phaser.Display.Align.In.TopCenter(this.levelDisplay, this.center);

        // Render the game elements
        this.displayGrid(this.level);

        // Config the music
        this.sound.add('BgMusic').play({
            loop : true,
        });
        this.sound.pauseOnBlur = true;

        return this;
    }

    // Renders all the cells
    private displayGrid(grid : boolean[][]) {
        const _cells : Phaser.GameObjects.Sprite[] = Array.from(Array(gridWidth * gridHeight), (_, index) => {

            // Calculate 1d to 2d, could set the index at declaration, but we will need it here anyway
            const x = Math.floor(index / gridWidth);
            const y = (index % gridWidth);

            // Create the cell
            const cell = this.add
                .sprite(0, 0, "")
                .play("Light")
                .setOrigin(0)
                .setInteractive()
                .setScale(0.1)

            // Set custom data, lit should be reversed to get advantage of the helper function
            cell.setData("x", x);
            cell.setData("y", y);
            cell.setData("lit", !grid[x][y]);

            // Reverse the toggle
            this.toggleHelper(cell);

            // Store cell in array
            (this.cells)[x][y] = cell;

            // Add click event
            (this.cells)[x][y].on('pointerdown', ()=>{
                this.sound.add('click').play();
                this.toggle((this.cells)[x][y]);
            });

            return cell;
        });

        // Use Phaser to grid align
        Phaser.Actions.GridAlign(_cells, {
            width: gridWidth,
            height: gridHeight,
            cellWidth: cellSize,
            cellHeight: cellSize,
            x: -gridSize/2,
            y: -gridSize/2
        });

        this.cells_container = this.add.container(0,0, _cells);
        if (this.center) Phaser.Display.Align.In.Center(this.cells_container, this.center);
    }

    // Toggle function, main game logic basically
    toggle(cell : Phaser.GameObjects.Sprite) {
        const row = cell.getData("x");
        const col = cell.getData("y");

        this.toggleHelper(this.cells[row][col]);
        if (row > 0) this.toggleHelper(this.cells[row - 1][col]);
        if (row < gridWidth - 1) this.toggleHelper(this.cells[row + 1][col]);
        if (col > 0) this.toggleHelper(this.cells[row][col - 1]);
        if (col < gridHeight - 1) this.toggleHelper(this.cells[row][col + 1]);

        if (this.levelDone()) this.nextLevel();
    }

    // Toggle help function, toggles a single cell
    private toggleHelper(cell : Phaser.GameObjects.Sprite) {
        if (cell.getData("lit")) {
            cell.stop();
            cell.setTexture("X");
            cell.setData("lit", false);
            return;
        }
        cell.play("Light");
        cell.setData("lit", true);
    }

    private setUpLevel(grid : boolean[][]) {
        this.cells.forEach((cells, x)=> {
            cells.forEach((cell, y) => {
                cell.setData("lit", !grid[x][y]);
                this.toggleHelper(cell);
            })
        })
    };

    private levelDone() {
        return !this.cells.some((row) => row.some((cell) => cell.getData("lit")));
    }

    private nextLevel() {
        // Set the level variables
        this.currentLevel = (this.currentLevel + 1) % this.levels.length;
        this.level = this.levels[this.currentLevel].board;

        // Set up the level
        this.setUpLevel(this.level);
        this.levelDisplay?.setText("Level: " + (this.currentLevel + 1));
    }
}

// Phaser Light's out React module
const LightsOutGamePhaser: React.FC = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (gameContainerRef.current) {
            const config = {
                type: Phaser.AUTO,
                title: "PhaserLightsOut",
                scale: {
                    mode: Phaser.Scale.ScaleModes.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: IMAGE_WIDTH,
                    height: IMAGE_HEIGHT,
                },
                scene: [Main]
            };

            gameRef.current = new Phaser.Game(config);
        }
        return () => {
            // Cleanup code here
            gameRef.current?.destroy(true);
        };
    }, []);
    return<>
        <div style={{paddingTop:'3rem'}} ref={gameContainerRef}></div>
    </>;
};

// Make react component
export default LightsOutGamePhaser;
