import React, {useCallback, useEffect, useRef, useState} from 'react';

const fps : number = 24;

interface LoadingProps {
    LoadProgress : string
}

const LoadingScreen: React.FC<LoadingProps> = ({LoadProgress}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [loadFrameIndex, setLoadFrameIndex] = useState(0);
    const [loadImages, setLoadImages] = useState<HTMLImageElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLoadAnimation = useCallback( async () => {
        const to4Digits = (x: number) => {
            const number = "000" + x;
            return number.substring(number.length - 4);
        };

        let loadImages : string[] = [];
        for (let i = 0; i < fps; i++) {
            loadImages.push(`img/load/FRAMES_${to4Digits(i)}.png`);
        }
        try {
            // Load images
            const loadPromises = loadImages.map((src) => loadImage(src));

            setLoadImages(await Promise.all(loadPromises));
        } catch (error) {
            console.error('Error loading resources:', error);
            // Handle error if any resource fails to load
        }
    },[])

    useEffect(() => {
        let animationFrameId: number;
        let then : number = performance.now();
        const interval : number = 1000 / fps; // 24 FPS

        const renderLoop = (delta: number) : void => {
            const now : number = delta;
            const elapsed : number = now - then;

            if (elapsed > interval) {
                then = now - (elapsed % interval);

                const canvas = canvasRef.current;
                const context = canvas?.getContext("2d");

                if (context) {
                    // Clear the canvas
                    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

                    // Start drawing, drawing order matters
                    context.drawImage(
                        loadImages[loadFrameIndex],
                        0,
                        0,
                        canvas?.width as number,
                        canvas?.height as number,
                    )

                    // Update the current image index, resets when it's at the end
                    setLoadFrameIndex((prevIndex) => (prevIndex + 1) % fps);
                }
            }
            // Request the next animation frame
            animationFrameId = requestAnimationFrame(renderLoop);
        };

        animationFrameId = requestAnimationFrame(renderLoop);
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    },[loadFrameIndex, loadImages]);

    const loadImage = async (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (error) => reject(error);
            image.src = src;
        });
    };

    if (isLoading) {
        loadLoadAnimation().then(() => {
            setIsLoading(false)
        });
    }

    return (
        <div className="loading-screen">
            <h1>Loading...</h1>
            {
                isLoading ? <></> : <>
                    <canvas
                        ref={canvasRef}
                        width="500px"
                        height="500px"
                    />
                    <h2>{LoadProgress}</h2>
                </>
            }

        </div>
    );
};

LoadingScreen.defaultProps = {
    LoadProgress : "0%",
}

export default LoadingScreen;
