
const DIFFICULTY_SETTINGS = {
    beginner: { width: 9, height: 9, mines: 10 },
    intermediate: { width: 16, height: 16, mines: 40 },
    expert: { width: 30, height: 16, mines: 99 }
};

class GameStats {
    constructor() {
        this.stats = this.loadStats();
    }

    loadStats() {
        const saved = localStorage.getItem('minesweeperStats');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            bestTimes: {
                beginner: Infinity,
                intermediate: Infinity,
                expert: Infinity
            }
        };
    }

    saveStats() {
        localStorage.setItem('minesweeperStats', JSON.stringify(this.stats));
        this.updateDisplay();
    }

    recordGame(won, time, difficulty) {
        this.stats.gamesPlayed++;
        if (won) {
            this.stats.gamesWon++;
            if (time < this.stats.bestTimes[difficulty]) {
                this.stats.bestTimes[difficulty] = time;
            }
        }
        this.saveStats();
    }

    updateDisplay() {
        document.getElementById('games-played').textContent = this.stats.gamesPlayed;
        const winRate = this.stats.gamesPlayed === 0 ? 0 : 
            Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
        document.getElementById('win-rate').textContent = `${winRate}%`;
        
        const currentDifficulty = document.getElementById('difficulty').value;
        const bestTime = this.stats.bestTimes[currentDifficulty];
        document.getElementById('best-time').textContent = 
            bestTime === Infinity ? '-' : `${bestTime}s`;
    }
}

class DialogManager {
    constructor(game) {
        this.game = game;
        this.initializeDialogs();
    }

    initializeDialogs() {
        // Custom game dialog
        document.getElementById('custom-cancel').addEventListener('click', () => {
            document.getElementById('custom-dialog').style.display = 'none';
            document.getElementById('difficulty').value = this.game.difficulty;
        });

        document.getElementById('custom-start').addEventListener('click', () => {
            const width = parseInt(document.getElementById('custom-width').value);
            const height = parseInt(document.getElementById('custom-height').value);
            const mines = parseInt(document.getElementById('custom-mines').value);

            if (this.validateCustomSettings(width, height, mines)) {
                document.getElementById('custom-dialog').style.display = 'none';
                this.game.setCustomDifficulty(width, height, mines);
                this.game.init();
            }
        });

        // Help dialog
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-dialog').style.display = 'flex';
        });

        document.getElementById('help-close').addEventListener('click', () => {
            document.getElementById('help-dialog').style.display = 'none';
        });

        // Close dialogs when clicking outside
        document.querySelectorAll('.dialog').forEach(dialog => {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    dialog.style.display = 'none';
                    if (dialog.id === 'custom-dialog') {
                        document.getElementById('difficulty').value = this.game.difficulty;
                    }
                }
            });
        });
    }

    validateCustomSettings(width, height, mines) {
        if (width < 5 || width > 50 || height < 5 || height > 50) {
            alert('Board size must be between 5x5 and 50x50');
            return false;
        }

        const maxMines = Math.floor((width * height) * 0.85);
        if (mines < 1 || mines > maxMines) {
            alert(`Number of mines must be between 1 and ${maxMines}`);
            return false;
        }

        return true;
    }

    showCustomDialog() {
        document.getElementById('custom-dialog').style.display = 'flex';
    }
};

class HighScores {
    constructor() {
        this.scores = this.loadScores();
    }

    loadScores() {
        const saved = localStorage.getItem('minesweeperScores');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            beginner: [],
            intermediate: [],
            expert: []
        };
    }

    saveScores() {
        localStorage.setItem('minesweeperScores', JSON.stringify(this.scores));
    }

    addScore(difficulty, time) {
        this.scores[difficulty].push(time);
        this.scores[difficulty].sort((a, b) => a - b);
        this.scores[difficulty] = this.scores[difficulty].slice(0, 5);
        this.saveScores();
        this.displayScores(difficulty);
    }

    displayScores(difficulty) {
        const scoresList = document.getElementById('scores-list');
        scoresList.innerHTML = '';
        
        if (this.scores[difficulty].length === 0) {
            scoresList.innerHTML = '<div class="score-entry">No scores yet</div>';
            return;
        }

        this.scores[difficulty].forEach((time, index) => {
            const entry = document.createElement('div');
            entry.className = 'score-entry';
            entry.textContent = `${index + 1}. ${time} seconds`;
            scoresList.appendChild(entry);
        });
    }
}

class SoundEffects {
    constructor() {
        this.enabled = true;
        this.sounds = {};
        this.initSounds();
    }

    initSounds() {
        const soundEffects = {
            reveal: [220, 0.1],
            flag: [440, 0.1],
            unflag: [330, 0.1],
            explosion: [100, 0.3],
            win: [440, 0.1, 660, 0.1, 880, 0.1, 660, 0.1, 880, 0.1, 1320, 0.2]
        };

        for (const [name, params] of Object.entries(soundEffects)) {
            this.sounds[name] = this.createTone(...params);
        }
    }

    createTone(frequency, duration, ...additional) {
        if (!this.enabled) return () => {};

        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            gainNode.gain.value = 0.1;
            
            const startTime = audioContext.currentTime;
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);

            if (additional.length >= 2) {
                setTimeout(() => {
                    this.createTone(...additional)();
                }, duration * 1000);
            }
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

class Minesweeper {
    constructor() {
        this.highScores = new HighScores();
        this.sounds = new SoundEffects();
        this.stats = new GameStats();
        this.dialogs = new DialogManager(this);
        this.selectedCell = { x: 0, y: 0 };
        this.darkMode = false;
        this.cheatMode = false;
        this.showHints = false;
        this.difficulty = 'beginner';
        this.initializeControls();
        this.setDifficulty('beginner');
    }

    initializeControls() {
        document.getElementById('new-game').addEventListener('click', () => this.init());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.dialogs.showCustomDialog();
            } else {
                this.setDifficulty(e.target.value);
                this.init();
            }
        });

        document.getElementById('dark-mode').addEventListener('click', () => {
            this.darkMode = !this.darkMode;
            document.body.classList.toggle('dark-mode');
            const darkModeBtn = document.getElementById('dark-mode');
            const darkModeIcon = darkModeBtn.querySelector('.iconify');
            darkModeIcon.setAttribute('data-icon', 
                this.darkMode ? 'material-symbols:light-mode-outline' : 'material-symbols:dark-mode-outline'
            );
            darkModeBtn.querySelector('span:not(.iconify)').textContent = 
                this.darkMode ? 'Light Mode' : 'Dark Mode';
        });

        document.getElementById('sound-toggle').addEventListener('click', () => {
            const enabled = this.sounds.toggle();
            const soundBtn = document.getElementById('sound-toggle');
            const soundIcon = soundBtn.querySelector('.iconify');
            soundIcon.setAttribute('data-icon', 
                enabled ? 'material-symbols:volume-up' : 'material-symbols:volume-off'
            );
            soundBtn.querySelector('span:not(.iconify)').textContent = 'Sound';
        });

        document.querySelectorAll('.score-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelector('.score-tab.active').classList.remove('active');
                e.target.classList.add('active');
                this.highScores.displayScores(e.target.dataset.difficulty);
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameOver && !['c', 'C', 'h', 'H'].includes(e.key)) return;

            switch (e.key) {
                case 'ArrowUp':
                    this.moveSelection(0, -1);
                    break;
                case 'ArrowDown':
                    this.moveSelection(0, 1);
                    break;
                case 'ArrowLeft':
                    this.moveSelection(-1, 0);
                    break;
                case 'ArrowRight':
                    this.moveSelection(1, 0);
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.reveal(this.selectedCell.x, this.selectedCell.y);
                    break;
                case 'f':
                case 'F':
                    this.toggleFlag(this.selectedCell.x, this.selectedCell.y);
                    break;
                case 'q':
                case 'Q':
                    this.quickReveal(this.selectedCell.x, this.selectedCell.y);
                    break;
                case 'c':
                case 'C':
                    this.toggleCheatMode();
                    break;
                case 'h':
                case 'H':
                    this.toggleHints();
                    break;
            }
        });

        // Middle click for quick reveal
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) { // Middle button
                e.preventDefault();
                const cell = e.target.closest('.cell');
                if (cell) {
                    const index = Array.from(cell.parentNode.children).indexOf(cell);
                    const x = index % this.width;
                    const y = Math.floor(index / this.width);
                    this.quickReveal(x, y);
                }
            }
        });
    }

    setDifficulty(difficulty) {
        const settings = DIFFICULTY_SETTINGS[difficulty];
        this.width = settings.width;
        this.height = settings.height;
        this.mines = settings.mines;
        this.difficulty = difficulty;

        const board = document.getElementById('board');
        board.style.gridTemplateColumns = `repeat(${this.width}, 32px)`;
        board.style.gridTemplateRows = `repeat(${this.height}, 32px)`;
        
        document.querySelector('.game-info').style.width = `${this.width * 32}px`;
        this.highScores.displayScores(difficulty);
        this.stats.updateDisplay();
    }

    setCustomDifficulty(width, height, mines) {
        this.width = width;
        this.height = height;
        this.mines = mines;
        this.difficulty = 'custom';

        const board = document.getElementById('board');
        board.style.gridTemplateColumns = `repeat(${width}, 32px)`;
        board.style.gridTemplateRows = `repeat(${height}, 32px)`;
        
        document.querySelector('.game-info').style.width = `${width * 32}px`;
    }

    quickReveal(x, y) {
        if (this.gameOver) return;
        const key = this.getCellKey(x, y);
        if (!this.revealed.has(key)) return;

        const cell = this.board[y][x];
        if (cell <= 0) return;

        let flagCount = 0;
        const adjacentCells = [];

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                    const adjKey = this.getCellKey(newX, newY);
                    if (this.flagged.has(adjKey)) {
                        flagCount++;
                    } else if (!this.revealed.has(adjKey)) {
                        adjacentCells.push([newX, newY]);
                    }
                }
            }
        }

        if (flagCount === cell) {
            adjacentCells.forEach(([adjX, adjY]) => this.reveal(adjX, adjY));
        }
    }

    toggleCheatMode() {
        this.cheatMode = !this.cheatMode;
        this.render();
    }

    toggleHints() {
        this.showHints = !this.showHints;
        this.render();
    }

    findSafeMoves() {
        const safeMoves = new Set();
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = this.getCellKey(x, y);
                if (!this.revealed.has(key)) continue;

                const cell = this.board[y][x];
                if (cell <= 0) continue;

                let flagCount = 0;
                let hiddenCount = 0;
                const hiddenCells = [];

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const newX = x + dx;
                        const newY = y + dy;
                        if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                            const adjKey = this.getCellKey(newX, newY);
                            if (this.flagged.has(adjKey)) {
                                flagCount++;
                            } else if (!this.revealed.has(adjKey)) {
                                hiddenCount++;
                                hiddenCells.push(adjKey);
                            }
                        }
                    }
                }

                if (flagCount === cell) {
                    hiddenCells.forEach(cellKey => safeMoves.add(cellKey));
                }
            }
        }

        return safeMoves;
    }

    init() {
        this.board = Array(this.height).fill().map(() => Array(this.width).fill(0));
        this.revealed = new Set();
        this.flagged = new Set();
        this.gameOver = false;
        this.firstClick = true;
        this.timer = 0;
        if (this.timerInterval) clearInterval(this.timerInterval);
        document.getElementById('timer').textContent = `Time: ${this.timer}`;
        document.getElementById('mine-count').textContent = `Mines: ${this.mines}`;
        
        // Remove win animation from all cells
        document.querySelectorAll('.cell.win').forEach(cell => {
            cell.classList.remove('win');
        });
        
        this.render();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            document.getElementById('timer').textContent = `Time: ${this.timer}`;
        }, 1000);
    }

    placeMines(firstX, firstY) {
        let minesPlaced = 0;
        while (minesPlaced < this.mines) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            if (this.board[y][x] !== -1 && !(Math.abs(x - firstX) <= 1 && Math.abs(y - firstY) <= 1)) {
                this.board[y][x] = -1;
                minesPlaced++;
            }
        }

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.board[y][x] !== -1) {
                    this.board[y][x] = this.countAdjacentMines(x, y);
                }
            }
        }
    }

    countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                    if (this.board[newY][newX] === -1) count++;
                }
            }
        }
        return count;
    }

    getCellKey(x, y) {
        return `${x},${y}`;
    }

    moveSelection(dx, dy) {
        const newX = this.selectedCell.x + dx;
        const newY = this.selectedCell.y + dy;
        
        if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
            this.selectedCell.x = newX;
            this.selectedCell.y = newY;
            this.updateSelection();
        }
    }

    updateSelection() {
        document.querySelectorAll('.cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        const cells = document.querySelectorAll('.cell');
        const index = this.selectedCell.y * this.width + this.selectedCell.x;
        cells[index].classList.add('selected');
    }

    reveal(x, y) {
        if (this.gameOver) return;
        if (this.flagged.has(this.getCellKey(x, y))) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(x, y);
            this.startTimer();
        }

        if (this.board[y][x] === -1) {
            this.gameOver = true;
            clearInterval(this.timerInterval);
            this.revealAll();
            this.sounds.play('explosion');
            alert('Game Over!');
            return;
        }

        const toReveal = [[x, y]];
        const newlyRevealed = new Set();

        while (toReveal.length > 0) {
            const [currentX, currentY] = toReveal.pop();
            const key = this.getCellKey(currentX, currentY);
            if (this.revealed.has(key)) continue;

            this.revealed.add(key);
            newlyRevealed.add(key);

            if (this.board[currentY][currentX] === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const newX = currentX + dx;
                        const newY = currentY + dy;
                        if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                            toReveal.push([newX, newY]);
                        }
                    }
                }
            }
        }

        if (newlyRevealed.size > 0) {
            this.sounds.play('reveal');
        }

        if (this.checkWin()) {
            this.gameOver = true;
            clearInterval(this.timerInterval);
            this.highScores.addScore(this.difficulty, this.timer);
            this.sounds.play('win');
            
            // Add celebration effect to all cells
            document.querySelectorAll('.cell').forEach(cell => {
                cell.classList.add('win');
            });
            
            // Show win message after a short delay to let the animation start
            setTimeout(() => {
                alert(`Congratulations! You won in ${this.timer} seconds!`);
            }, 500);
        }

        this.render();
    }

    toggleFlag(x, y) {
        if (this.gameOver) return;
        const key = this.getCellKey(x, y);
        if (this.revealed.has(key)) return;

        if (this.flagged.has(key)) {
            this.flagged.delete(key);
            this.sounds.play('unflag');
        } else {
            this.flagged.add(key);
            this.sounds.play('flag');
        }
        
        document.getElementById('mine-count').textContent = 
            `Mines: ${this.mines - this.flagged.size}`;
        this.render();
    }

    revealAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.revealed.add(this.getCellKey(x, y));
            }
        }
        this.render();
    }

    checkWin() {
        return this.revealed.size + this.mines === this.width * this.height;
    }

    render() {
        const board = document.getElementById('board');
        board.innerHTML = '';

        const safeMoves = this.showHints ? this.findSafeMoves() : new Set();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const key = this.getCellKey(x, y);

                if (this.revealed.has(key)) {
                    cell.classList.add('revealed');
                    if (this.board[y][x] === -1) {
                        cell.classList.add('mine');
                        const icon = document.createElement('span');
                        icon.className = 'iconify';
                        icon.setAttribute('data-icon', 'mdi:mine');
                        cell.appendChild(icon);
                    } else if (this.board[y][x] > 0) {
                        cell.textContent = this.board[y][x];
                        cell.setAttribute('data-number', this.board[y][x]);
                    }
                } else if (this.flagged.has(key)) {
                    cell.classList.add('flagged');
                    const icon = document.createElement('span');
                    icon.className = 'iconify';
                    icon.setAttribute('data-icon', 'mdi:flag');
                    icon.style.color = '#ff4444';
                    cell.appendChild(icon);
                } else {
                    if (this.cheatMode && this.board[y][x] === -1) {
                        cell.classList.add('cheat-mine');
                        const icon = document.createElement('span');
                        icon.className = 'iconify';
                        icon.setAttribute('data-icon', 'mdi:mine');
                        cell.appendChild(icon);
                    }
                    if (this.showHints && safeMoves.has(key)) {
                        cell.classList.add('hint');
                    }
                }

                if (x === this.selectedCell.x && y === this.selectedCell.y) {
                    cell.classList.add('selected');
                }

                cell.addEventListener('click', () => this.reveal(x, y));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.toggleFlag(x, y);
                });

                board.appendChild(cell);
            }
        }
    }
}

const game = new Minesweeper();