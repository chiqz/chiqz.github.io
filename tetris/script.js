/* Tetris game - dark mode, classic colors, controls as specified */
'use strict';

const canvasWidth = 300; // 10 * 30
const canvasHeight = 600; // 20 * 30
const cellSize = 30;

// DOM elements
const boardElement = document.getElementById('board');
const infoElement = document.getElementById('info');
const scoreEl = document.getElementById('score');
const topScoreEl = document.getElementById('topScore');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const nextEl = document.getElementById('next');

// Game state
let board = createEmptyBoard();
let currentPiece = null;
let nextPiece = null;
let dropCounter = 0;
let dropInterval = 1000; // ms
let lastTime = 0;
let gameOver = false;
let paused = false;
let score = 0;
let linesCleared = 0;
let level = 1;
let topScore = parseInt(localStorage.getItem('tetrisTopScore')) || 0;

// Tetromino definitions (4x4 matrices)
const TETROMINOS = {
    I: [
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
    ],
    J: [
        [1,0,0],
        [1,1,1],
        [0,0,0]
    ],
    L: [
        [0,0,1],
        [1,1,1],
        [0,0,0]
    ],
    O: [
        [1,1],
        [1,1]
    ],
    S: [
        [0,1,1],
        [1,1,0],
        [0,0,0]
    ],
    T: [
        [0,1,0],
        [1,1,1],
        [0,0,0]
    ],
    Z: [
        [1,1,0],
        [0,1,1],
        [0,0,0]
    ]
};

const COLORS = {
    0: 'transparent',
    1: 'var(--color-1)',
    2: 'var(--color-2)',
    3: 'var(--color-3)',
    4: 'var(--color-4)',
    5: 'var(--color-5)',
    6: 'var(--color-6)',
    7: 'var(--color-7)'
};

// Board dimensions
const boardWidth = 10;
const boardHeight = 20;

// Create empty board (20 rows x 10 columns)
function createEmptyBoard() {
    let board = new Array(boardHeight);
    for (let r = 0; r < boardHeight; r++) {
        board[r] = new Array(boardWidth).fill(0);
    }
    return board;
}

// Create a new piece
function createPiece(type) {
    const matrix = TETROMINOS[type];
    return {
        type,
        matrix,
        x: Math.floor(boardWidth / 2) - Math.floor(matrix[0].length / 2),
        y: 0,
        color: type
    };
}

// Check collision with board edges or filled cells
function collide(board, piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.matrix.length; ++y) {
        for (let x = 0; x < piece.matrix[0].length; ++x) {
            if (piece.matrix[y][x] !== 0) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                if (newX < 0 || newX >= boardWidth || newY >= boardHeight) {
                    return true;
                }
                if (newY >= 0 && board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Merge piece into board (lock)
function mergePiece(board, piece) {
    for (let y = 0; y < piece.matrix.length; ++y) {
        for (let x = 0; x < piece.matrix[0].length; ++x) {
            if (piece.matrix[y][x] !== 0) {
                board[piece.y + y][piece.x + x] = piece.color;
            }
        }
    }
}

// Rotate matrix (clockwise if dir > 0, counter-clockwise if dir < 0)
function rotate(matrix, dir) {
    // Transpose
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    // Reverse rows for clockwise rotation
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        // For counter-clockwise, reverse columns
        matrix.reverse();
    }
    return matrix;
}

// Draw the board and current piece onto DOM cells
function drawBoard() {
    // Clear all cells
    for (let r = 0; r < boardHeight; ++r) {
        for (let c = 0; c < boardWidth; ++c) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (cell) cell.style.backgroundColor = 'transparent';
        }
    }

    // Draw board cells
    for (let y = 0; y < boardHeight; ++y) {
        for (let x = 0; x < boardWidth; ++x) {
            const cell = document.getElementById(`cell-${y}-${x}`);
            const color = board[y][x];
            if (color !== 0 && cell) {
                cell.style.backgroundColor = COLORS[color];
            }
        }
    }

    // Draw current piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.matrix.length; ++y) {
            for (let x = 0; x < currentPiece.matrix[0].length; ++x) {
                if (currentPiece.matrix[y][x] !== 0) {
                    const boardX = currentPiece.x + x;
                    const boardY = currentPiece.y + y;
                    if (boardY >= 0 && boardY < boardHeight && boardX >= 0 && boardX < boardWidth) {
                        const cell = document.getElementById(`cell-${boardY}-${boardX}`);
                        if (cell) {
                            cell.style.backgroundColor = COLORS[currentPiece.color];
                        }
                    }
                }
            }
        }
    }
}

// Update the next piece display
function drawNext() {
    const container = document.getElementById('next');
    container.innerHTML = ''; // clear previous
    if (!nextPiece) return;
    const size = 4; // we will draw a 4x4 preview
    for (let y = 0; y < size; ++y) {
        for (let x = 0; x < size; ++x) {
            const div = document.createElement('div');
            div.style.width = '30px';
            div.style.height = '30px';
            div.style.border = '1px solid #555';
            div.style.display = 'inline-block';
            if (nextPiece.matrix[y] && nextPiece.matrix[y][x] !== 0) {
                div.style.backgroundColor = COLORS[nextPiece.color];
            }
            container.appendChild(div);
        }
    }
}

// Update score, level, lines, top score
function updateUI() {
    scoreEl.textContent = score;
    topScoreEl.textContent = topScore;
    levelEl.textContent = level;
    linesEl.textContent = linesCleared;
}

// Update level based on lines cleared
function updateLevel() {
    const newLevel = Math.floor(linesCleared / 10) + 1;
    if (newLevel !== level) {
        level = newLevel;
        dropInterval = 1000 / (level + 1); // faster drop as level increases
    }
}

// Update top score if needed
function updateTopScore() {
    if (score > topScore) {
        topScore = score;
        localStorage.setItem('tetrisTopScore', topScore);
        topScoreEl.textContent = topScore;
    }
}

// Clear completed lines and update score/lines/level
function clearLines() {
    let rowsCleared = 0;
    for (let y = boardHeight - 1; y >= 0; --y) {
        if (board[y].every(cell => cell !== 0)) {
            // Remove row
            board.splice(y, 1);
            // Insert empty row at top
            board.unshift(new Array(boardWidth).fill(0));
            ++rowsCleared;
            ++y; // continue checking same row index after shift
        }
    }
    if (rowsCleared > 0) {
        linesCleared += rowsCleared;
        updateLevel();
        const points = [0, 100, 300, 500, 800][rowsCleared];
        score += points * level;
        updateUI();
        updateTopScore();
    }
}

// Get random tetromino type
function getRandomType() {
    const types = 'I J L O S T Z'.split(' ');
    return types[Math.floor(Math.random() * types.length)];
}

// Soft drop: move piece down one row (used for automatic fall)
function softDrop() {
    if (collide(board, currentPiece, 0, 1)) {
        lockPiece();
    } else {
        currentPiece.y++;
    }
}

// Hard drop: move piece down until collision (user press Up arrow)
function hardDrop() {
    while (!collide(board, currentPiece, 0, 1)) {
        currentPiece.y++;
    }
    lockPiece();
}

// Lock piece into board, spawn next, check game over
function lockPiece() {
    mergePiece(board, currentPiece);
    clearLines();
    if (isGameOver()) {
        gameOver = true;
        alert('Game Over! Your score: ' + score);
    } else {
        currentPiece = nextPiece;
        nextPiece = createPiece(getRandomType());
        drawNext();
        if (collide(board, currentPiece)) {
            // Immediate collision means game over
            gameOver = true;
            alert('Game Over! Your score: ' + score);
        }
    }
}

// Check if game is over (piece collides at top)
function isGameOver() {
    // After locking, if the piece's top row is above board top? Actually we check if new piece collides at spawn.
    return collide(board, currentPiece, 0, -1);
}

// Start a new game
function initGame() {
    board = createEmptyBoard();
    score = 0;
    linesCleared = 0;
    level = 1;
    topScore = parseInt(localStorage.getItem('tetrisTopScore')) || 0;
    dropCounter = 0;
    dropInterval = 1000;
    gameOver = false;
    paused = false;

    // Spawn initial pieces
    currentPiece = createPiece(getRandomType());
    nextPiece = createPiece(getRandomType());
    drawNext();

    // Reset UI
    updateUI();

    // Start loop
    requestAnimationFrame(gameLoop);
}

// Toggle pause state
function togglePause() {
    paused = !paused;
}

// Main game loop
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (!paused && !gameOver) {
        dropCounter += delta;
        if (dropCounter > dropInterval) {
            softDrop();
            dropCounter = 0;
        }
    }

    drawBoard();
    requestAnimationFrame(gameLoop);
}

// Handle keyboard input
window.addEventListener('keydown', e => {
    if (gameOver) return;

    switch (e.key) {
        case 'ArrowLeft':
            if (!collide(board, currentPiece, -1, 0)) {
                currentPiece.x--;
            }
            break;
        case 'ArrowRight':
            if (!collide(board, currentPiece, 1, 0)) {
                currentPiece.x++;
            }
            break;
        case 'ArrowUp':
            hardDrop();
            break;
        case ' ': // pause
            togglePause();
            break;
        case 'z':
        case 'Z':
            rotatePiece(1);
            break;
        case 'x':
        case 'X':
            rotatePiece(-1);
            break;
        default:
            return; // ignore other keys
    }
});

// Rotate piece (direction: 1 = clockwise, -1 = counter-clockwise)
function rotatePiece(dir) {
    const originalMatrix = currentPiece.matrix.map(row => row.slice());
    // Try rotation
    const rotated = rotate(currentPiece.matrix.map(row => row.slice()), dir);
    // Check collision after rotation (maybe need wall kicks)
    if (!collide(board, { ...currentPiece, matrix: rotated }, 0, 0)) {
        currentPiece.matrix = rotated;
    }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create board cells (200 cells)
    for (let r = 0; r < boardHeight; ++r) {
        for (let c = 0; c < boardWidth; ++c) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            boardElement.appendChild(cell);
        }
    }
    // Start game
    initGame();

    // Pause on window blur (optional)
    window.addEventListener('blur', togglePause);
});