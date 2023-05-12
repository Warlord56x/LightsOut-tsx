import React, {useCallback, useEffect, useRef, useState} from "react";
import LoadingScreen from "./LoadingScreen";
import LevelChecker, {createCompletableGrid} from "./LevelChecker";

type Cell = boolean;
type Grid = Cell[][];

const numRows : number = 5;
const numCols : number = 5;
const cellSize : number = 100;

const fps : number = 24;

let selectPos = {x : -1, y : -1};

let loadProgress = "0%";

const LightsOutGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [frameIndex, setFrameIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [grid, setGrid] = useState<Grid>(createGrid());

    const [cellImages, setCellImages] = useState<HTMLImageElement[]>([]);
    const [gridImage, setGridImage] = useState<HTMLImageElement>();
    const [selectImage, setSelectImage] = useState<HTMLImageElement>();
    const [outImage, setOutImage] = useState<HTMLImageElement>();

    const [clickMusic, setClickMusic] = useState<HTMLAudioElement>();

    const [levelData, setLevelData] = useState<any>(null);
    const [level, setLevel] = useState(0);
    const [levelCache, setLevelCache] = useState<Grid>(grid);
    //const [, setBgMusic] = useState<HTMLAudioElement>();

    const loadResources = async () => {
        const to4Digits = (x: number) => {
            const number = "000" + x;
            return number.substring(number.length - 4);
        };

        let cellImages : string[] = [];
        for (let i = 0; i < fps; i++) {
            cellImages.push(`img/cell/FRAMES_${to4Digits(i)}.png`);
        }

        const totalResources : number = cellImages.length + 5; // Total number of resources
        let loadedResources : number = 0;

        try {
            // Load images
            const cellPromises = cellImages.map(async (src) => {
                loadedResources++;
                loadProgress = `${((loadedResources / totalResources) * 100).toFixed(2)}%`;
                return loadImage(src);
            });

            const otherImages = {
                "grid" : await loadImage('img/Board.png'),
                "select" : await loadImage('img/Select.png'),
                "out" : await loadImage('img/X.png'),
            };
            setCellImages(await Promise.all(cellPromises));


            setGridImage(otherImages.grid);
            setSelectImage(otherImages.select);
            setOutImage(otherImages.out);
            loadedResources += 3;
            loadProgress = `${((loadedResources / totalResources) * 100).toFixed(2)}%`;

            // Load music
            const musicPromises = {
                "click" : await loadMusic('sounds/click.wav'),
                //"bgMusic" : await loadMusic('sounds/background_music.flac', true, true),
            };
            loadedResources++;
            loadProgress = `${((loadedResources / totalResources) * 100).toFixed(2)}%`;

            setClickMusic(musicPromises.click);
            //setBgMusic(musicPromises.bgMusic);

        } catch (error) {
            console.error('Error loading resources:', error);
            // Handle error if any resource fails to load
        }

        // Images loaded, start loading the level data.
        const fetchData = async () => {
            try {
                const response : Response = await fetch('levels.json');
                const jsonData = await response.json();
                setLevelData(jsonData);
            } catch (error) {
                console.error('Error loading JSON:', error);
            }
        };

        await fetchData();
        loadedResources++;
        loadProgress = `${((loadedResources / totalResources) * 100).toFixed(2)}%`;
    }

    const drawBg = useCallback((context: CanvasRenderingContext2D) => {
            const canvas = canvasRef.current;
            if (!gridImage) {
                return;
            }
            context.drawImage(gridImage, 0, 0, canvas?.width as number, canvas?.height as number);
        },
        [canvasRef, gridImage]
    );

    const drawGrid = useCallback(
        (context: CanvasRenderingContext2D, grid: boolean[][]) => {
            if (!outImage) {
                return;
            }
            for (let x = 0; x < grid.length; x++) {
                for (let y = 0; y < grid[0].length; y++) {
                    if (grid[x][y]) {
                        context.drawImage(
                            cellImages[frameIndex],
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize
                        );
                    } else {
                        context.drawImage(
                            outImage,
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }
        },
        [outImage, cellImages, frameIndex]
    );

    const highlightCell = useCallback(
        (context: CanvasRenderingContext2D, pos : {x : number, y : number}) => {
        if (!selectImage) {
            return;
        }
        context.drawImage(
            selectImage,
            pos.x * cellSize,
            pos.y * cellSize,
            cellSize,
            cellSize
        )
    },[selectImage])

    useEffect(() => {
        let animationFrameId: number;
        let then : number = performance.now();
        const interval : number = 1000 / fps; // 24 FPS

        const renderLoop = (delta: number) : void => {
            const now : number = delta;
            const elapsed : number = now - then;

            if (elapsed > interval) {
                then = now - (elapsed % interval);

                const context = canvasRef.current?.getContext("2d");

                if (context) {
                    // Clear the canvas
                    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

                    // Start drawing, drawing order matters
                    drawBg(context);
                    drawGrid(context, grid);
                    highlightCell(context, selectPos);

                    // Update the current image index, resets when it's at the end
                    setFrameIndex((prevIndex) => (prevIndex + 1) % fps);
                }
            }
            // Request the next animation frame
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        animationFrameId = requestAnimationFrame(renderLoop);
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [drawBg, drawGrid, grid, highlightCell]);

    useEffect(() => {
        // This code runs on the initial render

        loadResources().then(()=>{
            setIsLoading(false);
        })
        // Clean-up function (optional)
        return () => {
            // Clean-up code
        };
    }, []); // Empty dependency array, so the effect runs only once

    useEffect(() => {
        // This code runs on the initial render
        if (levelData && levelData.levels[level]) {
            setGrid(levelData.levels[level].board);
        } else {
            setGrid(createGrid());
        }
        setLevelCache(grid);
        // Clean-up function (optional)
        return () => {
            // Clean-up code
        };
    }, [level, levelData]); // Empty dependency array, so the effect runs only once

    const loadImage = async (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (error) => reject(error);
            image.src = src;
        });
    };

    const loadMusic = async (src: string, autoplay : boolean = false, loop : boolean = false): Promise<HTMLAudioElement> => {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = (error) => reject(error);
            audio.autoplay = autoplay;
            audio.loop = loop;
            audio.src = src;
        });
    };

    function createGrid() : Grid {
        let rows: boolean[][] = [];
        for (let i = 0; i < numRows; i++) {
            rows.push(Array.from({ length: numCols }, () => Math.random() < 0.5));
        }
        rows = createCompletableGrid(numRows, numCols);
        return rows;
    }

    function toggleCell(row: number, col: number) : void {
        const newGrid = [...grid];
        newGrid[row][col] = !newGrid[row][col];
        if (row > 0) newGrid[row - 1][col] = !newGrid[row - 1][col];
        if (row < numRows - 1) newGrid[row + 1][col] = !newGrid[row + 1][col];
        if (col > 0) newGrid[row][col - 1] = !newGrid[row][col - 1];
        if (col < numCols - 1) newGrid[row][col + 1] = !newGrid[row][col + 1];
        setGrid(newGrid);
        clickMusic?.play().then();

        if (levelDone(newGrid)) {
            nextLevel();
        }
    }

    function nextLevel() {
        setLevel(level + 1);
    }

    function levelDone(grid: boolean[][]): boolean {
        return !grid.some((row) => row.some((cell) => cell));
    }

    const getGridCell = (rect : DOMRect, clientX: number, clientY: number) : {x : number, y : number} => {
        const x = Math.floor((clientX - rect.left) / cellSize);
        const y = Math.floor((clientY - rect.top) / cellSize);

        return {x, y};
    }

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const cell = getGridCell(rect, event.clientX, event.clientY);

        toggleCell(cell.x, cell.y);
    }

    const handleCanvasMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        selectPos = getGridCell(rect, event.clientX, event.clientY);
    };

    const handleCanvasLeave = () => {
        selectPos = {x : -1, y: -1};
    };
    return (
        <div>
            {isLoading ? <LoadingScreen LoadProgress={loadProgress}/> : <div>
                <h1>Light's Out</h1>
                <h2>Level: {level+1}</h2>
                <canvas
                    ref={canvasRef}
                    width={numCols * cellSize}
                    height={numRows * cellSize}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMove}
                    onMouseLeave={handleCanvasLeave}
                />
                <LevelChecker grid={levelCache}/>
            </div>}
        </div>
    );
};

export default LightsOutGame;
