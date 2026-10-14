import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;
import { GameManager } from './GameManager';
import { Dictionary, EASY_LETTERS, HARD_LETTERS, LETTER_SCORE } from '../Dictionary';
import { GuidePageManager } from '../GuidePageManager';
import { BaseBoardCell, CellState } from '../BaseBoardCell';
import { BaseBoardManager, GridPos } from '../BaseBoardManager';
import { BaseLetterTile } from '../BaseLetterTile';

@ccclass('BoardManager')
export class BoardManager extends BaseBoardManager {
    public static instance: BoardManager = null;

    private grids:string[][] = null;
    
    onLoad(): void {
        BoardManager.instance = this;
    }

    public async ResetGame() {
        super.ResetGame();//初始化空网格
        await this.FillCells()//填入需要消除的字母块
        for(let i = 0 ; i < this.boardGridNRow ; i ++){
            //await this.NewNextRound();
        }
    }

    private async FillCells():Promise<void>{
        const easy_letter_count = Math.ceil(this.boardGridNRow*this.boardGridNCol/2.5)
        const hard_letter_count = 2//
        const letter_scores = 2000;
        //按照难度(频率)分数和字母数量生成字母列表
        const FillLetters = this.GenerateLetters(easy_letter_count,hard_letter_count,letter_scores)
        if(FillLetters.length > 0){
            this.grids = this.GenerateGridsWithLetters(FillLetters)
            await this.MoveUpLetterGrids(this.grids);
        }
        else{
        }
    }

    private GenerateGridsWithLetters(letters: string): string[][] {
        const rows = this.boardGridNRow;
        const cols = this.boardGridNCol;
        const totalCells = rows * cols;
        const lettersArr = letters.split('');          // 待放置的字母数组
        const letterCount = lettersArr.length;

        if (letterCount > totalCells) {
            throw new Error('字母数量超过网格容量');
        }

        // 辅助函数：判断元音（不区分大小写）
        const isVowel = (ch: string): boolean => {
            const c = ch.toUpperCase();
            return c === 'A' || c === 'E' || c === 'I' || c === 'O' || c === 'U';
        };

        // 检查在 (row, col) 放置 letter 是否合法
        const isValidPlacement = (
            grid: string[][],
            row: number,
            col: number,
            letter: string
        ): boolean => {
            const rows = grid.length;
            const cols = grid[0].length;

            // 1. 检查相邻相同字符（上下左右）
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (grid[nr][nc] === letter) return false;
                }
            }

            // 2. 获取水平方向连续字母段（包含新字母）
            let left = col - 1;
            let right = col + 1;
            while (left >= 0 && grid[row][left] !== ' ') left--;
            while (right < cols && grid[row][right] !== ' ') right++;
            const horizontalSeq: string[] = [];
            for (let c = left + 1; c < col; c++) horizontalSeq.push(grid[row][c]);
            horizontalSeq.push(letter);
            for (let c = col + 1; c < right; c++) horizontalSeq.push(grid[row][c]);

            // 检查水平段长度是否 >= 5
            if (horizontalSeq.length >= 4) return false;
            // 检查水平段内是否有连续3个元音或连续3个辅音
            for (let i = 0; i <= horizontalSeq.length - 3; i++) {
                const a = horizontalSeq[i];
                const b = horizontalSeq[i+1];
                const c = horizontalSeq[i+2];
                const allVowel = isVowel(a) && isVowel(b) && isVowel(c);
                const allConsonant = !isVowel(a) && !isVowel(b) && !isVowel(c);
                if (allVowel || allConsonant) return false;
            }

            // 3. 获取垂直方向连续字母段（包含新字母）
            let top = row - 1;
            let bottom = row + 1;
            while (top >= 0 && grid[top][col] !== ' ') top--;
            while (bottom < rows && grid[bottom][col] !== ' ') bottom++;
            const verticalSeq: string[] = [];
            for (let r = top + 1; r < row; r++) verticalSeq.push(grid[r][col]);
            verticalSeq.push(letter);
            for (let r = row + 1; r < bottom; r++) verticalSeq.push(grid[r][col]);

            if (verticalSeq.length >= 5) return false;
            for (let i = 0; i <= verticalSeq.length - 3; i++) {
                const a = verticalSeq[i];
                const b = verticalSeq[i+1];
                const c = verticalSeq[i+2];
                const allVowel = isVowel(a) && isVowel(b) && isVowel(c);
                const allConsonant = !isVowel(a) && !isVowel(b) && !isVowel(c);
                if (allVowel || allConsonant) return false;
            }

            return true;
        };

        // 随机打乱数组
        const shuffle = <T>(arr: T[]): T[] => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // 回溯放置字母（带随机顺序）
        const tryPlaceLetters = (): string[][] | null => {
            // 初始化全空格网格
            const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(' '));
            // 所有空位坐标
            let emptyCells: { row: number; col: number }[] = [];
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    emptyCells.push({ row: i, col: j });
                }
            }
            // 随机打乱字母顺序
            const lettersShuffled = shuffle(lettersArr);

            const dfs = (idx: number, available: { row: number; col: number }[]): boolean => {
                if (idx === letterCount) return true;
                const ch = lettersShuffled[idx];
                // 随机打乱可用空位顺序
                const shuffledAvailable = shuffle(available);
                for (const cell of shuffledAvailable) {
                    const { row, col } = cell;
                    if (isValidPlacement(grid, row, col, ch)) {
                        // 放置字母
                        grid[row][col] = ch;
                        // 生成新的可用空位列表（移除当前格子）
                        const newAvailable = available.filter(c => !(c.row === row && c.col === col));
                        if (dfs(idx + 1, newAvailable)) return true;
                        // 回溯
                        grid[row][col] = ' ';
                    }
                }
                return false;
            };

            if (dfs(0, emptyCells)) return grid;
            return null;
        };

        // 尝试多次直到成功（理论上总是成功，但重试机制保证鲁棒性）
        const maxAttempts = 100;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = tryPlaceLetters();
            if (result) return result;
        }
        // 极端情况：返回空网格（不应发生）
        return Array(rows).fill(null).map(() => Array(cols).fill(' '));
    }

    private async MoveUpLetterGrids(grids:string[][]) : Promise<void>{
        for (let i = 0; i < this.boardGridNRow; i++) {
            const linestr = grids[i].map(cell => cell || ' ').join('');
            await this.NewNextRound(linestr);
        }
    }

    /**
     * 生成随机字母组合
     * @param easy_letter_count 需要生成的 easy 组字母数量
     * @param hard_letter_count 需要生成的 hard 组字母数量
     * @param target_score 目标总分（允许误差 ±5）
     * @returns 随机生成的字母组合字符串
     */
    private GenerateLetters(easy_letter_count: number, hard_letter_count: number, target_score: number): string {
        const easyList = EASY_LETTERS.split('');
        const hardList = HARD_LETTERS.split('');

        // 辅助函数：计算字符串的总分
        const calculateScore = (letters: string[]): number =>
            letters.reduce((sum, ch) => sum + LETTER_SCORE[ch], 0);

        // 随机从数组中抽取一个元素（允许重复）
        const randomPick = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

        // 生成初始随机组合
        let easyLetters: string[] = [];
        let hardLetters: string[] = [];
        for (let i = 0; i < easy_letter_count; i++) easyLetters.push(randomPick(easyList));
        for (let i = 0; i < hard_letter_count; i++) hardLetters.push(randomPick(hardList));

        let currentScore = calculateScore([...easyLetters, ...hardLetters]);
        const tolerance = 5;

        // 迭代调整，最多尝试 2000 次
        for (let attempt = 0; attempt < 2000 && Math.abs(currentScore - target_score) > tolerance; attempt++) {
            // 随机决定调整 easy 组还是 hard 组
            const adjustEasy = Math.random() < 0.5 && easy_letter_count > 0;
            const adjustHard = !adjustEasy && hard_letter_count > 0;

            if (adjustEasy) {
                // 随机选取 easy 组中的一个位置
                const idx = Math.floor(Math.random() * easy_letter_count);
                const oldChar = easyLetters[idx];
                const oldScore = LETTER_SCORE[oldChar];
                // 随机尝试一个新字母
                const newChar = randomPick(easyList);
                const newScore = LETTER_SCORE[newChar];
                const delta = newScore - oldScore;
                // 如果新分数使总分更接近目标，则替换
                if (Math.abs(currentScore + delta - target_score) < Math.abs(currentScore - target_score)) {
                    easyLetters[idx] = newChar;
                    currentScore += delta;
                }
            } else if (adjustHard) {
                const idx = Math.floor(Math.random() * hard_letter_count);
                const oldChar = hardLetters[idx];
                const oldScore = LETTER_SCORE[oldChar];
                const newChar = randomPick(hardList);
                const newScore = LETTER_SCORE[newChar];
                const delta = newScore - oldScore;
                if (Math.abs(currentScore + delta - target_score) < Math.abs(currentScore - target_score)) {
                    hardLetters[idx] = newChar;
                    currentScore += delta;
                }
            }
        }
        if(Math.abs(currentScore - target_score) > tolerance){
            //还是没有找到组合
            return '';
        }
        else return [...easyLetters, ...hardLetters].join('');
    }
    
    // 重写抽象方法，提供GameManager相关实现
    protected supplyTimer(time: number): void {
        GameManager.instance.TimerArea.SupplyTimer(time);
    }

    protected getGameManager(): any {
        return GameManager.instance;
    }

    // 重写分数计算方法
    public ResolvedConfirm() {
        if (!this.isAllResolved()) {
            return;
        }

        this.relatedWords = [];
        this.relatedGrids = [];
        this.pendingGrids.forEach(grid => {
            this.VisitGrid(grid);
        });

        const maxWordLength = Math.max.apply(null, this.relatedWords.map(word => word.length));
        this.addScore = 0;
        this.relatedGrids.forEach(g => {
            this.addScore += LETTER_SCORE[this.cellNode[g.row][g.col].getComponent(BaseBoardCell).char];
        })
        this.addScore = this.addScore * (Math.max(maxWordLength - 2, 1));

        // 使用基类的抽象方法
        this.supplyTimer((this.relatedWords.length + this.relatedWords.join('').length) * 1.2);

        this.gridCrashCount += this.relatedGrids.length;
        this.turnCount += 1;

        this.RelatedGridsRemove();

        //this.CheckTrigger();

        this.pendingGrids = [];
        this.relatedGrids = [];
        this.boundTiles = [];
        this.collision_gPos = null;
        this.relatedWords = [];
        return this.addScore;
    }

    protected VisitGridRow(gPos: GridPos) {
        let left = gPos.col;
        let right = gPos.col;

        // 向左右水平遍历连续字母
        while (left > 0 && this.isBounded(gPos.row, left - 1)) { left--; }
        while (right < this.boardGridNCol - 1 && this.isBounded(gPos.row, right + 1)) { right++; }

        let relatedMin = gPos.col;
        let relatedMax = gPos.col;
        let word1: string, word2: string;
        for (let i = left; i <= gPos.col; i++) {
            let Str = '';// 拼接连续字母
            for (let j = i; j < gPos.col; j++) Str += this.cellNode[gPos.row][j].getComponent(BaseBoardCell)?.char;
            for (let j = gPos.col; j <= right; j++) {
                Str += this.cellNode[gPos.row][j].getComponent(BaseBoardCell)?.char;
                const StrReverse = Str.split('').reverse().join('');
                if (this.isValidWord(Str)) {
                    if (relatedMin > i) {
                        relatedMin = i;
                        word1 = Str;
                    }
                    if (relatedMax < j) {
                        relatedMax = j;
                        word2 = Str;
                    }
                }
                else if (this.isValidWord(StrReverse)) {
                    if (relatedMin > i) {
                        relatedMin = i;
                        word1 = StrReverse;
                    }
                    if (relatedMax < j) {
                        relatedMax = j;
                        word2 = StrReverse;
                    }
                }
            }
        }

        if (relatedMin >= relatedMax) return;//找不到词

        if (word1 && word2) {
            if (word1.length == relatedMax - relatedMin + 1 || word2.length == relatedMax - relatedMin + 1) {
                //一个单词覆盖
                const word = word1.length > word2.length ? word1 : word2;
                this.AddRelatedWord(word);
            }
            else {
                this.AddRelatedWord(word1);
                this.AddRelatedWord(word2);
            }
        }
        else if (word1) {
            this.AddRelatedWord(word1);
        }
        else if (word2) {
            this.AddRelatedWord(word2);
        }

        for (let k = relatedMin; k <= relatedMax; k++) {
            this.SetGrid2Related({ row: gPos.row, col: k });
        }
    }

    protected VisitGridCol(gPos: GridPos) {
        let bottom = gPos.row;
        let top = gPos.row;

        // 向上遍历连续字母
        while (bottom > 0 && this.isBounded(bottom - 1, gPos.col)) { bottom--; }
        while (top < this.boardGridNRow - 1 && this.isBounded(top + 1, gPos.col)) { top++; }

        let relatedMin = gPos.row;
        let relatedMax = gPos.row;
        let word1: string, word2: string;
        for (let i = top; i >= gPos.row; i--) {//row方向和top相反//不影响结论
            let Str = '';// 拼接连续字母
            for (let j = i; j > gPos.row; j--) Str += this.cellNode[j][gPos.col].getComponent(BaseBoardCell)?.char;
            for (let j = gPos.row; j >= bottom; j--) {
                Str += this.cellNode[j][gPos.col].getComponent(BaseBoardCell)?.char;
                const StrReverse = Str.split('').reverse().join('');
                if (this.isValidWord(Str)) {
                    if (relatedMin > j) {
                        relatedMin = j;
                        word1 = Str;
                    }
                    if (relatedMax < i) {
                        relatedMax = i;
                        word2 = Str;
                    }
                }
                else if (this.isValidWord(StrReverse)) {
                    if (relatedMin > j) {
                        relatedMin = j;
                        word1 = StrReverse;
                    }
                    if (relatedMax < i) {
                        relatedMax = i;
                        word2 = StrReverse;
                    }
                }
            }
        }
        if (relatedMin >= relatedMax) return;

        if (word1 && word2) {
            if (word1.length == relatedMax - relatedMin + 1 || word2.length == relatedMax - relatedMin + 1) {
                //一个单词覆盖
                const word = word1?.length > word2?.length ? word1 : word2;
                this.AddRelatedWord(word);
            }
            else {
                this.AddRelatedWord(word1);
                this.AddRelatedWord(word2);
            }
        }
        else if (word1) {
            this.AddRelatedWord(word1);
        }
        else if (word2) {
            this.AddRelatedWord(word2);
        }

        for (let k = relatedMin; k <= relatedMax; k++) {
            this.SetGrid2Related({ row: k, col: gPos.col });
        }
    }
}