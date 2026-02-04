document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    const gridEl = document.getElementById('sudoku-grid');
    const timerEl = document.getElementById('timer');
    const winModal = document.getElementById('win-modal');
    const finalTimeEl = document.getElementById('final-time');

    // Buttons
    const btnNewGame = document.getElementById('btn-new-game');
    const btnCheck = document.getElementById('btn-check');
    const btnSolve = document.getElementById('btn-solve');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnErase = document.getElementById('btn-erase');
    const numpads = document.querySelectorAll('.num-btn:not(.action)');

    let solutionBoard = [];
    let gameBoard = [];
    let initialBoard = [];

    let selectedCellIndex = -1;
    let timerInterval;
    let secondsElapsed = 0;

    // --- Initialization ---
    initGame();

    // --- event Listeners ---
    btnNewGame.addEventListener('click', initGame);
    btnCheck.addEventListener('click', checkSolution);
    btnSolve.addEventListener('click', solveGame);
    btnPlayAgain.addEventListener('click', () => {
        closeModal();
        initGame();
    });
    btnErase.addEventListener('click', () => {
        if (selectedCellIndex !== -1) updateCell(selectedCellIndex, 0);
    });

    numpads.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (selectedCellIndex !== -1) {
                const val = parseInt(e.target.dataset.value);
                updateCell(selectedCellIndex, val);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (selectedCellIndex === -1) return;

        // Number input
        if (e.key >= '1' && e.key <= '9') {
            updateCell(selectedCellIndex, parseInt(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            updateCell(selectedCellIndex, 0);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            moveSelection(e.key);
        }
    });

    // --- Core Functions ---

    function initGame() {
        stopTimer();
        secondsElapsed = 0;
        timerEl.innerText = "00:00";
        selectedCellIndex = -1;

        // 1. Generate full valid board
        solutionBoard = generateFullBoard();

        // 2. Create actionable game board by removing numbers (Difficulty: Removing 40 cells)
        initialBoard = removeCells([...solutionBoard], 40);
        gameBoard = [...initialBoard];

        // 3. Render
        renderGrid();
        startTimer();
    }

    function renderGrid() {
        gridEl.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            // Add grid layout classes
            const row = Math.floor(i / 9);
            const col = i % 9;

            if ((col + 1) % 3 === 0 && col < 8) cell.classList.add('r-border-right');
            if ((row + 1) % 3 === 0 && row < 8) cell.classList.add('t-border-bottom');

            // Content
            const val = gameBoard[i];
            if (val !== 0) {
                cell.textContent = val;
                // If it was in the initial board, it's immutable (Given)
                if (initialBoard[i] !== 0) {
                    cell.classList.add('given');
                }
            }

            // Click Handler
            cell.addEventListener('click', () => selectCell(i));

            gridEl.appendChild(cell);
        }
    }

    function selectCell(index) {
        // Deselect prev
        const prev = document.querySelector('.cell.selected');
        if (prev) prev.classList.remove('selected');

        // Highlight logic (optional: highlight same numbers)
        // clearHighlights();

        selectedCellIndex = index;
        const cells = document.querySelectorAll('.cell');
        cells[index].classList.add('selected');
    }

    function updateCell(index, value) {
        // Cannot edit initial cells
        if (initialBoard[index] !== 0) return;

        gameBoard[index] = value;
        const cells = document.querySelectorAll('.cell');
        cells[index].textContent = value === 0 ? '' : value;
        cells[index].classList.remove('error'); // clear error state on edit
    }

    function moveSelection(key) {
        let row = Math.floor(selectedCellIndex / 9);
        let col = selectedCellIndex % 9;

        if (key === 'ArrowUp') row = Math.max(0, row - 1);
        if (key === 'ArrowDown') row = Math.min(8, row + 1);
        if (key === 'ArrowLeft') col = Math.max(0, col - 1);
        if (key === 'ArrowRight') col = Math.min(8, col + 1);

        const newIndex = row * 9 + col;
        selectCell(newIndex);
    }

    function checkSolution() {
        let isCorrect = true;
        const cells = document.querySelectorAll('.cell');

        for (let i = 0; i < 81; i++) {
            // Check against solution board
            if (gameBoard[i] !== 0 && gameBoard[i] !== solutionBoard[i]) {
                cells[i].classList.add('error');
                isCorrect = false;
            } else if (gameBoard[i] === 0) {
                isCorrect = false; // Incomplete
            } else {
                cells[i].classList.remove('error');
            }
        }

        if (isCorrect) {
            gameWon();
        }
    }

    function solveGame() {
        if (!confirm("Are you sure? This will surrender the current game.")) return;

        gameBoard = [...solutionBoard];
        const cells = document.querySelectorAll('.cell');

        for (let i = 0; i < 81; i++) {
            cells[i].textContent = solutionBoard[i];
            cells[i].classList.remove('error');
        }
        stopTimer();
    }

    function gameWon() {
        stopTimer();
        finalTimeEl.textContent = formatTime(secondsElapsed);
        winModal.classList.remove('hidden');
    }

    function closeModal() {
        winModal.classList.add('hidden');
    }

    // --- Timer Logic ---
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerEl.innerText = formatTime(secondsElapsed);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // --- Generator Logic (Backtracking) ---

    function generateFullBoard() {
        const board = new Array(81).fill(0);
        fillBoard(board);
        return board;
    }

    function fillBoard(board) {
        const emptyIndex = board.indexOf(0);
        if (emptyIndex === -1) return true; // Filled

        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (let num of nums) {
            if (isValid(board, emptyIndex, num)) {
                board[emptyIndex] = num;
                if (fillBoard(board)) return true;
                board[emptyIndex] = 0; // Backtrack
            }
        }
        return false;
    }

    function removeCells(board, count) {
        const newBoard = [...board];
        while (count > 0) {
            const idx = Math.floor(Math.random() * 81);
            if (newBoard[idx] !== 0) {
                newBoard[idx] = 0;
                count--;
            }
        }
        return newBoard;
    }

    function isValid(board, index, num) {
        const row = Math.floor(index / 9);
        const col = index % 9;

        // Row check
        for (let i = 0; i < 9; i++) {
            if (board[row * 9 + i] === num) return false;
        }

        // Col check
        for (let i = 0; i < 9; i++) {
            if (board[i * 9 + col] === num) return false;
        }

        // Box check
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[(startRow + i) * 9 + (startCol + j)] === num) return false;
            }
        }

        return true;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
