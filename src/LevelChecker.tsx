import React, {useMemo} from 'react';

type Cell = boolean;
type Grid = Cell[][];

interface Props {
    grid: Grid;
}


export function createCompletableGrid(rows: number, cols: number): Grid {
    const grid: Grid = Array(rows)
        .fill(false)
        .map(() => Array(cols).fill(false));

    // Randomly select cells to turn on
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (Math.random() < 0.5) {
                toggleCell(grid, row, col);
            }
        }
    }

    return grid;
}

export const check = (grid : Grid) => {
    const visited = new Set<string>();
    const queue: [Grid, number][] = [[grid, 0]];

    while (queue.length) {
        const [currGrid, moves] = queue.shift()!;

        if (!currGrid.some(row => row.includes(true))) {
            return true;
        }

        if (moves >= 2 * currGrid.length * currGrid[0].length) {
            // The current state has already been visited more than the maximum
            // number of moves, so it's safe to assume that there's no solution
            // and return false
            return false;
        }

        for (let row = 0; row < currGrid.length; row++) {
            for (let col = 0; col < currGrid[row].length; col++) {
                const newGrid = currGrid.map(row => [...row]);
                toggleCell(newGrid, row, col);
                const strGrid = JSON.stringify(newGrid);

                if (!visited.has(strGrid)) {
                    visited.add(strGrid);
                    queue.push([newGrid, moves + 1]);
                }

                toggleCell(newGrid, row, col);
            }
        }
    }

    return false;
}

const LevelChecker: React.FC<Props> = ({ grid }) => {
    const completable = useMemo(() => {
        console.log("check");
        return check(grid);
    },[grid])

    return completable ? <div>The level is completable.</div> : <div>The level is not completable.</div>;
};

function toggleCell(grid: Grid, row: number, col: number) {
    grid[row][col] = !grid[row][col];

    if (row > 0) {
        grid[row - 1][col] = !grid[row - 1][col];
    }

    if (row < grid.length - 1) {
        grid[row + 1][col] = !grid[row + 1][col];
    }

    if (col > 0) {
        grid[row][col - 1] = !grid[row][col - 1];
    }

    if (col < grid[0].length - 1) {
        grid[row][col + 1] = !grid[row][col + 1];
    }
}

export default LevelChecker;
