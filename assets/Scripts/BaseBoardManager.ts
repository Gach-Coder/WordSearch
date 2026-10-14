import { _decorator, Component, Label, Prefab, Sprite, Node, Color, Vec3, Vec2, UITransform, instantiate, tween, UIOpacity, Tween, easing } from "cc";
import { BaseBoardCell } from "./BaseBoardCell";
import { BaseLetterTile } from "./BaseLetterTile";
import { GuidePageManager } from "./GuidePageManager";
import { Dictionary } from "./Dictionary";
const { ccclass, property } = _decorator;

export const HighFrequentComp = [
    's x', 'h t', 'a e', 'b d', 'f x',
    'sh t', ' ick', 'f ll', ' i e', ' ast',
    ' ool', ' ill', ' are', ' one', ' ave',
    ' ive', ' ord', ' ard', ' ile', ' ine',
    ' eep', ' oy', ' ate', ' ent', ' end',
    ' ight'
];

export const boardWidth: number = 700;
export const boardGridNCol: number[] = [5, 7, 9];
export const boardGridNRow: number[] = [6, 9, 11];
export const CellSpaceRatio: number = 10;
export const timePerGame: number[] = [120, 200, 300];
export const TouchingTileTransparency = 50;

export type GridPos = { row: number, col: number } | null;

export class GridPosSet {
    protected readonly map = new Map<string, GridPos>();
    protected key(pos: GridPos): string {
        return `${pos.row},${pos.col}`;
    }
    add(pos: GridPos): void {
        this.map.set(this.key(pos), pos);
    }
    delete(pos: GridPos): boolean {
        return this.map.delete(this.key(pos));
    }
    has(pos: GridPos): boolean {
        return this.map.has(this.key(pos));
    }
    get size(): number {
        return this.map.size;
    }
}

@ccclass('BaseBoardManager')
export class BaseBoardManager extends Component {
    @property(Prefab)
    protected BlankCellPrefab: Prefab = null!; // 空格子预制体 
    @property(Sprite)
    public BlankCellSprite: Sprite = null; //负责空tile的Sprite展现 
    @property(Prefab)
    protected MatchWordLabelPrefab: Prefab = null;
          
    protected cellNode: (Node)[][] = []; // 棋盘数据 //实例化的boardCell预制体
    protected pendingGrids: GridPos[] = [];//当前回合吸附在棋盘上的grids
    protected relatedGrids: GridPos[] = [];//绿色网格
    protected boundTiles: Node[] = [];
    protected collision_gPos: GridPos = null;//方便消除上一个collision Hover
    protected relatedWords: string[] = [];//effect
        
    protected turnCount: number = 0;
    protected gridCrashCount: number = 0;
    protected addScore: number = 0;
        
    public boardGridNRow: number = null;
    public boardGridNCol: number = null;
    public CellSpaceUnitSize: number = null;
    public CellSpaceSize: number = null;
    public CellSize: number = null;

    // 派生类需要实现
    protected supplyTimer(time: number): void { }
    protected getGameManager(): any { return null; }

    public async ResetGame(any = null) {
        this.initBoard();
        this.initBoardCells();
    
        
        this.pendingGrids = [];
        this.relatedGrids = [];
        this.boundTiles = [];
        this.turnCount = 0;
        this.gridCrashCount = 0;
    }

    protected initBoard() {//Board级别关键数据
        //size定义
        this.boardGridNCol = boardGridNCol[this.getCurrentDifficulty()]
        this.boardGridNRow = boardGridNRow[this.getCurrentDifficulty()]
        this.CellSpaceUnitSize = Math.floor(boardWidth / this.boardGridNCol); //格子加边框组合
        this.CellSpaceSize = Math.floor(this.CellSpaceUnitSize / CellSpaceRatio); //边框厚度
        this.CellSize = this.CellSpaceUnitSize - this.CellSpaceSize; // 格子尺寸

        this.CleanBoard();//detroy cell对象 // 
        this.cellNode = [];
        this.pendingGrids = [];
        this.relatedGrids = [];
        this.boundTiles = [];
        this.collision_gPos = null
        this.relatedWords = [];
    }

    // 创建棋盘格子节点
    protected initBoardCells() {//cell级别关键数据 //
        // 初始化数组大小
        const halfRowN = (this.boardGridNRow - 1) / 2;
        const halfColN = (this.boardGridNCol - 1) / 2;
        for (let row = 0; row < this.boardGridNRow; row++) {
            this.cellNode.push([]);
        }
        for (let row = 0; row < this.boardGridNRow; row++) {
            for (let col = 0; col < this.boardGridNCol; col++) {
                const cell_initNode = instantiate(this.BlankCellPrefab);
                const x = (col - halfColN) * this.CellSpaceUnitSize
                //const y = (row - halfRowN) * this.CellSpaceUnitSize
                const y = ((this.boardGridNRow - 1 - row) - halfRowN) * this.CellSpaceUnitSize
                cell_initNode.getComponent(BaseBoardCell).init(row, col, x, y, this.CellSize);
                this.node.addChild(cell_initNode);
                this.cellNode[row].push(cell_initNode);
            }
        }
    }

    public isTouchingBoard(touchPos: Vec2): Boolean {
        return this.getGridPos(touchPos.toVec3()) != null;
    }

    public isTouchingPendingCell(touchPos: Vec2): Boolean {
        const touch_gPos = this.getGridPos(touchPos.toVec3());
        if (touch_gPos) {
            return this.cellNode[touch_gPos.row][touch_gPos.col].getComponent(BaseBoardCell).isTouchable();
        }
        return false;
    }

    public GetBoundTileNode(Pos: Vec2): Node {
        const gPos = this.getGridPos(Pos.toVec3());
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).getBoundTile();
    }

    public TouchBoard(touchPos: Vec2) {
        const touch_gPos = this.getGridPos(touchPos.toVec3());
        if (touch_gPos) {
            this.collision_gPos = touch_gPos;
            this.TouchCell(touch_gPos);
        }
    }

    protected TouchCell(touch_gPos: GridPos) {
        const pending_ind = this.pendingGrids.findIndex(gp =>
            gp.col === touch_gPos.col && gp.row === touch_gPos.row
        );
        if (pending_ind >= 0) {//绑定在 gPos上的Tile
            //删除取消bound
            const Bcell = this.cellNode[touch_gPos.row][touch_gPos.col].getComponent(BaseBoardCell);

            const tile4del = Bcell.getBoundTile();
            const tile_ind = this.boundTiles.findIndex(tile =>
                tile4del.getComponent(BaseLetterTile).isSameTileNode(tile)
            );

            if (tile_ind < 0) {
                return;
            }

            this.pendingGrids.splice(pending_ind, 1);
            this.boundTiles.splice(tile_ind, 1);

            if (Bcell.isResolved()) Bcell.Resolved2Hover();
            else if (Bcell.isPending()) Bcell.Pending2Hover();
            // 
            this.UpdatePendingState();
        }
    }

    //TouchCell和DeployCell触发
    public UpdatePendingState() {//重新遍历pending grids
        this.DenyAllRelatedCells();
        this.pendingGrids.forEach(gPos => {
            //AddRelatedGrid
            this.VisitGrid(gPos);
        });
    }

    //Update this.relatedWords this.relatedGrids
    protected VisitGrid(gPos: GridPos) {
        this.VisitGridCol(gPos);
        this.VisitGridRow(gPos);
    }

    protected VisitGridCol(gPos:GridPos){}
    protected VisitGridRow(gPos:GridPos){}

    protected AddRelatedWord(word: string) {
        if (this.relatedWords.some(str => str.toUpperCase() === word.toUpperCase())) return;
        this.relatedWords.push(word);
    }

    protected SetGrid2Related(gPos: GridPos) {
        //pending,Resolved -> Resolved, Occupied ->Related
        const bc = this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell);
        if (this.isPendingCell(gPos)) {
            bc.Pending2Resolved();
        }
        else if (this.isOccupiedCell(gPos)) {
            bc.Occupied2Related();
        }

        this.AddRelatedGrid(gPos);
    }


    // 世界坐标转棋盘格子行列 // 不在棋盘返回null
    public getGridPos(worldPos: Vec3): GridPos {
        const localPos = this.node.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        const halfRowN = (this.boardGridNRow - 1) / 2;
        const halfColN = (this.boardGridNCol - 1) / 2;

        const row = this.boardGridNRow - 1 - Math.round((localPos.y / this.CellSpaceUnitSize) + halfRowN);
        const col = Math.round((localPos.x / this.CellSpaceUnitSize) + halfColN);

        return (row >= 0 && row < this.boardGridNRow && col >= 0 && col < this.boardGridNCol)
            ? { row, col } : null;
    }

    //Tile与棋盘交互
    public TileCollision(tile: Node) {
        const gridPos = this.getGridPos(tile.getWorldPosition());
        if (gridPos) {//在棋盘内不同格子间移动
            if (this.collision_gPos && (this.collision_gPos?.col !== gridPos.col || this.collision_gPos?.row !== gridPos.row)) {
                if (this.isHoverCell(this.collision_gPos)) {
                    this.SetCellHover2Blank(this.collision_gPos);
                }
            }
            tile.getComponent(BaseLetterTile).TileOnBoard();
            this.cellNode[gridPos.row][gridPos.col].getComponent(BaseBoardCell).collision(tile);
        }
        else {
            if (this.collision_gPos) {//从棋盘内移到棋盘外
                if (this.isHoverCell(this.collision_gPos)) {
                    this.SetCellHover2Blank(this.collision_gPos);
                }
            }
            tile.getComponent(BaseLetterTile).TileNotOnBoard();
        }
        this.collision_gPos = gridPos;//
    }

    protected HasValidWord(word: string): boolean {
        if (this.isValidWord(word)) {
            return true;
        }
        const drow = word.split('').reverse().join('');
        if (this.isValidWord(drow)) {
            return true;
        }
        return false;
    }

    public isPlaceable(gPos: GridPos) {
        if (!gPos) return false;
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isPlaceable();
    }

    public AddPendingGrid(gPos: GridPos) {
        this.pendingGrids.push(gPos);
    }

    public AddRelatedGrid(gPos: GridPos) {
        if (!this.relatedGrids.some(gpos => gpos.row == gPos.row && gpos.col == gPos.col)) {
            this.relatedGrids.push(gPos);
        }
    }

    protected DenyAllRelatedCells() {
        this.relatedGrids.forEach(gPos => {
            if (this.isResolvedCell(gPos)) this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).Resolved2Pending();
            else if (this.isOccupiedCell(gPos)) this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).Related2Occupied();
        });
        this.relatedGrids = [];
        this.relatedWords = [];
    }

    protected GetCellState(i: number, j: number): any {
        return this.cellNode[i][j].getComponent(BaseBoardCell).getState();
    }

    protected isHoverCell(gPos: GridPos): boolean {
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isHover();
    }

    protected isPendingCell(gPos: GridPos): boolean {
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isPending();
    }

    protected isResolvedCell(gPos: GridPos): boolean {
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isResolved();
    }

    protected isOccupiedCell(gPos: GridPos): boolean {
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isOccupied();
    }

    protected isTouchableCell(gPos: GridPos): boolean {
        return this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).isTouchable();
    }

    protected SetCellHover2Blank(gPos: GridPos) {
        this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).Hover2Blank();
    }

    protected isBounded(i: number, j: number) {
        return this.cellNode[i][j].getComponent(BaseBoardCell).isBounded();
    }

    protected getCurrentDifficulty(): number {
            return GuidePageManager.instance.cur_Dif;
        }
    
        protected getRandomLetterByFreq(): string {
            return Dictionary.instance.randomLetterByFreq();
        }
    
        protected getRandomLetterEquelFreq(): string {
            return Dictionary.instance.randomLetterEquelFreq();
        }
    
        protected getRandomVowel(): string {
            return Dictionary.instance.RandomVowel();
        }
    
        protected isValidWord(word: string): boolean {
            return Dictionary.instance.isValidWord(word);
        }

    protected isConnected(): boolean {
        if (this.relatedGrids.length <= 1) return true;

        const remaining = new GridPosSet();
        this.relatedGrids.forEach(pos => remaining.add(pos));

        const queue: GridPos[] = [this.relatedGrids[0]];
        remaining.delete(this.relatedGrids[0]);

        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const curr of queue) {
            for (const [dr, dc] of dirs) {
                const neighbor: GridPos = { row: curr.row + dr, col: curr.col + dc };
                if (remaining.delete(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        return remaining.size === 0;
    }

    protected RelatedGridsRemove() {
        this.relatedGrids.forEach(grid => {
            const bc = this.cellNode[grid.row][grid.col].getComponent(BaseBoardCell);
            if (bc.isResolved()) {
                //解决转确定
                bc.Resolved2Blank();
            }
            else if (bc.isOccupied()) {
                bc.Occupied2Blank();
            }
            else {
                //出现的其他状态的cell
                console.error(`[000]cell state update messy.R${grid.row}C${grid.col} cell is ${this.GetCellState(grid.row, grid.col)}`);
            }
        });
    }

    public async NewNextRound(line:string = null) {
        if (this.isReachingTop()) {
            return;
        }
        if (line&&line.length!==this.boardGridNCol){
            return
        }
        await this.moveBoundNodeUpWithEffect();
        this.AddRandomBottomBlocks(line);
    }

    protected AddRandomBottomBlocks(line:string = null) {
        if(line){
            for(let col = 0 ; col < this.boardGridNCol ; col++){
                if(line[col] !== ' ')
                    this.FillCell({row:this.boardGridNRow-1,col:col},line[col])
            }
            return;
        }
        const randBlocks = Math.floor(Math.random() * 2) + this.getCurrentDifficulty() + 2;
        const randomNums: number[] = Array.from({ length: this.boardGridNCol }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, randBlocks);
        randomNums.forEach(randcol => {
            this.FillCell({row:this.boardGridNRow-1,col:randcol},this.getRandomLetterByFreq())
        });
    }

    private FillCell(gPos:GridPos,char:string){
        this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).SetOccupied(char);
    }

    public isReachingTop(): boolean {
        for (let i = 0; i < this.boardGridNCol; i++) {
            if (this.cellNode[0][i].getComponent(BaseBoardCell).isBounded()) {
                return true;
            }
        }
        return false;
    }

    // 整体向上移动+平滑动画核心方法（父节点不移动优化版）
    public async moveBoundNodeUpWithEffect() {
        // 动画基础配置
        const moveDuration: number = 0.1; // 动画时长，可自定义（如0.2/0.5秒）
        const moveOffsetY: number = this.CellSpaceUnitSize; // 向上移动的Y轴偏移量（父节点不动，直接用网格间距）
        const tweenList: Promise<void>[] = []; // 存储所有动画Promise，用于批量等待

        // 遍历非最上排网格，为每个有效BoundNode添加向上位移动画
        // 忽略RowN-1（最上排），仅处理0 ~ RowN-2行
        for (let i = this.boardGridNRow - 1; i > 0; i--) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                // 获取当前网格的BoardCell组件
                const curBoardCell = this.cellNode[i][j].getComponent(BaseBoardCell);
                if (!curBoardCell) continue;

                // 获取BoundNode子节点，判断有效性
                const boundNode = curBoardCell.BoundTileSprite.node;
                if (!boundNode || !boundNode.active) continue;

                // 父节点不移动，直接使用本地坐标位移动画（更简洁高效）
                const tweenPromise = new Promise<void>((resolve) => {
                    Tween.stopAllByTarget(boundNode); // 停止节点原有动画，避免冲突
                    tween(boundNode)
                        .to(
                            moveDuration, // 第一个参数：动画时长
                            { // 第二个参数：动画目标属性（本地坐标移动）
                                position: new Vec3(
                                    boundNode.position.x,
                                    boundNode.position.y + moveOffsetY,
                                    boundNode.position.z
                                )
                            },
                            { // 第三个参数：缓动配置（解决easing报错）
                                easing: 'linear' // 可替换为smooth/linear/quadInOut等
                            }
                        )
                        .call(() => { // 关键修正：用call()替代onComplete()，传入回调函数
                            resolve(); // 动画完成后，resolve Promise
                        })
                        .start(); // 启动动画
                });

                tweenList.push(tweenPromise);
            }
        }

        // 等待所有BoundNode移动动画全部完成
        await Promise.all(tweenList);

        // 状态更新遍历顺序：仍保持i从1到RowN-1（从下往上），避免源数据覆盖
        // 源网格：i-1（下方，i更小），目标网格：i（上方，i更大），确保复制时源数据完整
        for (let i = 0; i < this.boardGridNRow-1 ; i++) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                // 目标网格（上方，i更大）：i,j
                const targetCell = this.cellNode[i][j].getComponent(BaseBoardCell);
                // 源网格（下方，i更小）：i-1,j（提供Sprite和CellState数据）
                const sourceCell = this.cellNode[i + 1][j].getComponent(BaseBoardCell);

                if (!targetCell || !sourceCell) continue;

                const sourceBoundNode = sourceCell.BoundTileSprite.node;

                // 执行你提供的copy方法：复制下方网格的Sprite和CellState到上方网格
                targetCell.copy(sourceCell);
            }
        }

        for (let i = 0; i <= this.boardGridNRow-1; i++) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                // 目标网格（上方，i更大）：i,j
                const Cell = this.cellNode[i][j].getComponent(BaseBoardCell);

                if (!Cell) continue;

                const sourceBoundNode = Cell.BoundTileSprite.node;
                if (sourceBoundNode) {
                    sourceBoundNode.setPosition(Vec3.ZERO); // 重置本地坐标，避免父节点切换后偏移
                }
            }
        }
        for (let col = 0; col < this.boardGridNCol; col++) {
            this.cellNode[this.boardGridNRow -1][col].getComponent(BaseBoardCell).copy(null);
        }
    }

    protected AddRandomBottomBlocks2() {
        let [word1, word2] = HighFrequentComp.sort(() => Math.random() - 0.5).slice(0, 2);
        if (Math.random() > 0.5) word1 = ' '.concat(this.getRandomVowel()).concat(this.getRandomLetterEquelFreq());
        if (Math.random() > 0.5) word2 = ' '.concat(this.getRandomVowel()).concat(this.getRandomLetterEquelFreq());
        if (Math.random() > 0.5) word1 = word1.split('').reverse().join('');
        if (Math.random() > 0.5) word2 = word2.split('').reverse().join('');

        word1 = word1.toUpperCase();
        word2 = word2.toUpperCase();

        if (word1.length + word2.length > this.boardGridNCol) {
            console.error("Words to fill are too long");
        }

        const N = this.boardGridNCol;
        const M1 = word1.length, M2 = word2.length;
        // 合法性校验：单词长度和超过网格长度/单词为空，返回全空格
        if (M1 <= 0 || M2 <= 0 || M1 + M2 > N) return;
        // 初始化全空格数组（方便修改，最后转字符串）
        const gridArr = Array(N).fill(' ');
        // 随机生成word1的合法起始索引（0 <= start1 <= N - M1）
        let start1;
        if (word1[word1.length - 1] === word2[0]) {//可重叠一格
            start1 = Math.floor(Math.random() * (N - M1 - M2 + 2));
        }
        else {
            start1 = Math.floor(Math.random() * (N - M1 - M2 + 1));
        }
        // 计算word2的合法索引区间（避免与word1重叠），随机选start2
        let rightValidRange;
        if (word1[word1.length - 1] === word2[0]) {
            rightValidRange = Array.from({ length: N - M2 - (start1 + M1 - 1) + 1 }, (_, i) => start1 + M1 - 1 + i); // 右区间：[start1+M1, N-M2]
        }
        else {
            rightValidRange = Array.from({ length: N - M2 - (start1 + M1) + 1 }, (_, i) => start1 + M1 + i); // 右区间：[start1+M1, N-M2]
        }
        const allValidStart2 = [...rightValidRange];
        const start2 = allValidStart2[Math.floor(Math.random() * allValidStart2.length)];
        // 填充两个单词到网格数组
        Array.from(word1).forEach((char, i) => gridArr[start1 + i] = char);
        Array.from(word2).forEach((char, i) => gridArr[start2 + i] = char);
        // 数组转字符串返回
        gridArr.forEach((char, ind) => {
            if (char != ' ') {
                this.cellNode[0][ind].getComponent(BaseBoardCell).SetOccupied(char);
            }
        });
    }

    public DeployCancel() {
        this.pendingGrids.forEach(gPos => {
            this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).DeployCancel();
        });
        this.relatedGrids.forEach(gPos => {
            this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).Related2Occupied();
        });
        this.pendingGrids = [];
        this.relatedGrids = [];
        this.relatedWords = [];
        this.boundTiles = [];
        this.collision_gPos = null;
    }

    public isTouchingCellNode(touchPos: Vec2): Boolean {
        const gridPos = this.getGridPos(touchPos.toVec3());
        return gridPos !== null;
    }

    public PendingScore(): number {
        return 0;
    }

    public CleanBoard() {
        if (this.cellNode && this.cellNode.length) {
            for (let row = 0; row < this.cellNode.length; row++) {
                if (this.cellNode[row])
                    for (let col = 0; col < this.cellNode[row].length; col++) {
                        this.cellNode[row][col].destroyAllChildren();
                        this.cellNode[row][col].destroy();
                    }
            }
        }
    }

    public isEmptyBoard(): boolean {
        for (let i = 0; i < this.boardGridNRow; i++) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                if (this.cellNode[i][j].getComponent(BaseBoardCell).isBounded()) {
                    return false;
                }
            }
        }
        return true;
    }

    public HideBoardTiles() {
        for (let i = 0; i < this.boardGridNRow; i++) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                this.cellNode[i][j].getComponent(BaseBoardCell).HideBoundTile();
            }
        }
    }

    public HideBoardTilesCancel() {
        for (let i = 0; i < this.boardGridNRow; i++) {
            for (let j = 0; j < this.boardGridNCol; j++) {
                this.cellNode[i][j].getComponent(BaseBoardCell).HideBoundTileCancel();
            }
        }
    }

    public get crashTurns() { return this.turnCount; }
    public get crashGrids() { return this.gridCrashCount; }

    public DeployCell(gPos: GridPos, Tile: Node) {
        this.cellNode[gPos.row][gPos.col].getComponent(BaseBoardCell).Hover2Pending(Tile, Tile.getComponent(BaseLetterTile).char);
        this.boundTiles.push(Tile);
        this.AddPendingGrid(gPos);

        //当前单个放置的特效处理
        this.relatedWords = [];
        this.relatedGrids = [];
        this.VisitGrid(gPos);//related words
        this.relatedWords.forEach(word => {
        });
        this.RelatedWordsEffects(gPos);
        this.relatedWords = [];

        //当前回合所有放置的重新判定
        this.UpdatePendingState();
    }

    private RelatedWordsEffects(gPos: GridPos) {
        const MatchWordLabelNode = instantiate(this.MatchWordLabelPrefab);
        this.node.addChild(MatchWordLabelNode);
        const label = MatchWordLabelNode.getComponent(Label);
        label.string = this.relatedWords.join('\n');
        label.isBold = false;
        label.enableOutline = true;
        label.outlineWidth = 1;

        MatchWordLabelNode.position = this.cellNode[gPos.row][gPos.col].position;
        const x = this.cellNode[gPos.row][gPos.col].position.x;
        const y = this.cellNode[gPos.row][gPos.col].position.y;

        const opacity = MatchWordLabelNode.getComponent(UIOpacity);
        opacity.opacity = 255;
        tween(MatchWordLabelNode)
            .to(1.2, { position: new Vec3(x, y + 80, 0) })
            .parallel(tween(opacity).to(0.5, { opacity: 0 }))
            .call(() => MatchWordLabelNode.destroy()).start();
    }

    public GetKeyBoardLetter(gPos: GridPos) {//万能牌
        this.relatedWords = [];
        this.VisitGrid(gPos);//related words
        this.RelatedWordsEffects(gPos);
        this.relatedWords.forEach(word => {
        });
        this.relatedWords = [];
    }

    public isAllResolved(): boolean {//所有放置方块变绿并连接
        if (this.pendingGrids.length <= 0) return false;
        for (let i = 0; i < this.pendingGrids.length; i++) {
            if (!this.isResolvedCell(this.pendingGrids[i])) {
                return false;
            }
        }
        return this.isConnected();
    } 
    public ResolvedConfirm(){}
}