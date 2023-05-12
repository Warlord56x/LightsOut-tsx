import React, {useEffect, useRef} from 'react';
import Phaser from 'phaser';

const IMAGE_NAME = "FRAMES";
const SEPARATOR = "_";
const IMAGE_WIDTH = 500;
const IMAGE_HEIGHT = 500;
const FRAMES = 24;
const FPS = 12;

const gridHeight = 5;
const gridWidth = 5;


const to4Digits = (x : string) => {
    const number = "000" + x;
    return number.substring(number.length - 4);
};

class PrePreloader extends Phaser.Scene {
    preload() {
        this.load.setPath("img");
        for (let i = 0; i < FRAMES; i++) {
            this.load.image("load/"+IMAGE_NAME + SEPARATOR + to4Digits(i+""));
        }


        this.load.on("progress", this.progress);
        this.load.on("complete", this.complete, {
            scene: this.scene,
        });
    }

    progress(percentage : number) {
        console.log((percentage * 100).toFixed(2) + "%");
    }

    complete() {
        console.log("COMPLETE");
        this.scene.start("preloader");
    }
}


class Preloader extends Phaser.Scene {
    preload() {
        this.load.setPath("img");

        let frames : Phaser.Types.Animations.AnimationFrame[] = [];

        for (let i = 0; i < FRAMES; i++) {
            frames.push({
                key: "load/"+IMAGE_NAME + SEPARATOR + to4Digits(i + ""),
            });
        }

        this.anims.create({
            key: "LOAD",
            frames: frames,
            repeat: -1,
            frameRate: FPS,
        });

        const load = this.add
            .sprite(0, 0, "")
            .play("LOAD")
            .setOrigin(0);

        load.displayWidth = IMAGE_WIDTH;
        load.displayHeight = IMAGE_HEIGHT;

        for (let i = 0; i < FRAMES; i++) {
            this.load.image("cell/"+IMAGE_NAME + SEPARATOR + to4Digits(i+""));
        }

        this.load.image("X","X.png");
        this.load.image("Select","Select.png");

        this.load.on("progress", this.progress, {});
        this.load.on("complete", this.complete, {scene: this.scene});
    }

    progress(percentage: number) {
        console.log((percentage * 100).toFixed(2) + "%");
    }


    complete() {
        console.log("COMPLETE");
        this.scene.start("main");
    }
}

class Main extends Phaser.Scene {

    private cells : Phaser.GameObjects.Sprite[][] = [];

    create() {
        let frames : Phaser.Types.Animations.AnimationFrame[] = [];

        for (let i = 0; i < FRAMES; i++) {
            frames.push({
                key: "cell/"+IMAGE_NAME + SEPARATOR + to4Digits(i + ""),
            });
        }

        this.anims.create({
            key: "Light",
            frames: frames,
            repeat: -1,
            frameRate: FPS,
        });


        for (let i = 0; i < gridWidth; i++) {
            (this.cells)[i] = [];
            for (let j = 0; j < gridHeight; j++) {
                const cell = this.add
                    .sprite(0, 0, "")
                    .play("Light")
                    .setOrigin(0).setInteractive();

                cell.setData("lit", true);
                cell.x = i * 100;
                cell.y = j * 100;
                cell.displayWidth = 100;
                cell.displayHeight = 100;
                cell.on('pointerdown', ()=>{
                    this.toggle(cell);
                });
                (this.cells)[i][j] = cell;
            }
        }
    }
    toggle(cell : Phaser.GameObjects.Sprite) {
        const row = cell.x / 100;
        const col = cell.y / 100;

        this.toggleHelper(this.cells[row][col]);
        if (row > 0) this.toggleHelper(this.cells[row - 1][col]);
        if (row < gridWidth - 1) this.toggleHelper(this.cells[row + 1][col]);
        if (col > 0) this.toggleHelper(this.cells[row][col - 1]);
        if (col < gridHeight - 1) this.toggleHelper(this.cells[row][col + 1]);
    }

    private toggleHelper(cell : Phaser.GameObjects.Sprite) {
        if (cell.getData("lit")) {
            console.log(cell.x / 100, cell.y / 100);
            cell.stop();
            cell.setTexture("X");
            cell.setData("lit", false);
            return;
        }
        cell.play("Light");
        cell.setData("lit", true);
    }
}

const LightsOutGamePhaser: React.FC = () => {
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (gameContainerRef.current) {
            const config = {
                type: Phaser.AUTO,
                title: "PhaserLightsOut",
                width: IMAGE_WIDTH,
                height: IMAGE_HEIGHT,
            };

            const game = new Phaser.Game(config);
            gameRef.current = game;
            game.scene.add("prePreloader", PrePreloader);
            game.scene.add("preloader", Preloader);
            game.scene.add("main", Main);
            game.scene.start("prePreloader");
        }
        return () => {
            // Cleanup code here
            gameRef.current?.destroy(true);
        };
    }, []);
    return <div ref={gameContainerRef}></div>;
};

export default LightsOutGamePhaser;
