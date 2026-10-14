import { _decorator, Component, Node, Prefab, instantiate,Label, Vec2,Vec3, EventTouch,UITransform,Input,Color,Graphics, Sprite } from 'cc';
import { BoardCell } from './BoardCell';
import { GameManager, MatchItem} from './GameManager';
import { Dictionary } from '../Dictionary';
import { AudioManager } from '../AudioManager';
import { dif_col, dif_row, LetterSizeRatio, WrapRatio } from './GameData';

const { ccclass, property, executionOrder } = _decorator;

// 定义所有可能的放置方向（行/列/8个斜线方向）
type Direction = { dr: number; dc: number };
export type GridRC = { row:number; col:number };
const colors = [Color.BLUE,Color.CYAN,Color.GREEN,Color.RED,Color.YELLOW,Color.MAGENTA,Color.GRAY];

const directions: Direction[] = [
    { dr: 0, dc: 1 },   // 水平向右
    { dr: 0, dc: -1 },  // 水平向左
    { dr: 1, dc: 0 },   // 垂直向下
    { dr: -1, dc: 0 },  // 垂直向上
    { dr: 1, dc: 1 },   // 斜线右下（行+1，列+1）
    { dr: 1, dc: -1 },  // 斜线左下（行+1，列-1）
    { dr: -1, dc: 1 }, // 斜线右上（行-1，列+1）
    { dr: -1, dc: -1 }, // 斜线左上（行-1，列-1）
];


@ccclass('BoardManager')
@executionOrder(-1) // 优先初始化
export class BoardManager extends Component {
    // 网格尺寸（固定11x11）
    //public static readonly GRIDN = 10;
    
    @property(Prefab)
    private cellPrefab: Prefab = null!; // 格子预制体

    @property(Node)
    private graphicsNode4confirmed : Node = null!; // 连线UI挂载节点
    @property(Node)
    private graphicsNode4Pending : Node = null!; // 连线UI挂载节点

    @property(Label)
    private PendingLabel : Label = null!; // 连线UI挂载节点

    private cells: BoardCell[][] = []; // 格子二维数组
    private startCell: BoardCell | null = null; // 触摸起始格子
    private currentCell: BoardCell | null = null; // 触摸当前格子
    public static instance: BoardManager = null!; // 单例
    private targetWords: string[] = null; // 目标单词
    // Graphics组件引用（复用，避免重复创建）
    private _graphics: Graphics = null!;
    private color_now: Color=Color.BLUE; 
    private colors_using: Color[] = null;
    private CellSpacing: number = null;

    private BoardGridNCol: number = null;
    private BoardGridNRow: number = null;

    onLoad() {
        BoardManager.instance = this;
        this.onTouchEvents();
        //this.PendingLabel.node.on(Label.EventType.STRING_CHANGED, this.fitBgToLabel, this);
        this.CellSpacing = 66;
    }

    protected start(): void {
        this._graphics = this.graphicsNode4Pending?.getComponent(Graphics);
        if(!this._graphics){
            console.error("No Graphics Component");
        }
    }


    public initBoard(dif:number){
        this.BoardGridNCol = dif_col[dif];
        this.BoardGridNRow = dif_row[dif];
        this.CellSpacing = Math.min(660.0/this.BoardGridNCol,110);
        this.CellSpacing = 660.0/this.BoardGridNCol;
        this.colors_using = [...colors];
        this.initGrid(dif);
        //this.resetTouchEvents();
        this.graphicsNode4Pending.getComponent(Graphics)?.clear();
        this.graphicsNode4confirmed.getComponent(Graphics)?.clear();
        this.UpdatePendingLabel(null,null);
    }

    private initGrid(dif:number): void {
        // 清空旧网格
        this.clearGrid();
        //核心算法，初始化board
        const cellLetter = this.GetBoardCells(this.targetWords);

        // 生成新网格
        this.cells = new Array(this.BoardGridNRow);
        for (let row = 0; row < this.BoardGridNRow; row++) {
            this.cells[row] = new Array(this.BoardGridNCol);
            for (let col = 0; col < this.BoardGridNCol; col++) {
                const cellNode = instantiate(this.cellPrefab);
                this.node.addChild(cellNode);

                // 计算格子位置
                const localposX = (-(this.BoardGridNCol-1)/2 + col) * this.CellSpacing;
                const localposY =  (-(this.BoardGridNRow-1)/2 + row) * this.CellSpacing;

                cellNode.getComponent(BoardCell).init(row,col,localposX,localposY,this.CellSpacing*LetterSizeRatio,cellLetter[row][col]);

                // 初始化格子数据
                this.cells[row][col] = cellNode.getComponent(BoardCell)!;
            }
        }
    }

    private resetTouchEvents(): void {
        this.offTouchEvents();
        this.onTouchEvents();
    }

    private GetBoardCells(wordlist: string[]): string[][] {
        // 初始化空网格，所有位置初始化为空字符串
        const board: string[][] = Array.from({ length: this.BoardGridNRow }, () => Array(this.BoardGridNCol).fill(' '));
        const board_clear = () => {
            board.forEach(row => row.fill(' '));
        }

        //将word的第m个字母放置在grid方向为dir mthLetter:0~lengh-1
        const canPlaceWord = (word: string, mthLetter: number, fixedRC: GridRC, dir: Direction): boolean => {
            // 遍历单词每个字符，检查位置合法性和字母匹配性
            for (let i = 0; i < word.length; i++) {
                const currentR = fixedRC.row + (i-mthLetter) * dir.dr;
                const currentC = fixedRC.col + (i-mthLetter) * dir.dc;
                // 检查是否超出11x11网格边界
                if (currentR < 0 || currentR >= this.BoardGridNRow || currentC < 0 || currentC >= this.BoardGridNCol) {
                    return false;
                }
                // 检查已有字母是否冲突（非空时必须与当前字符匹配）
                const existingChar = board[currentR][currentC];
                if (existingChar !== ''&&existingChar !== ' ' && existingChar !== word[i]) {
                    return false;
                }
            }
            return true;
        };

        const placeWord = (word: string, mthLetter: number, fixedRC: GridRC, dir: Direction): void => {
            for (let i = 0; i < word.length; i++) {
                const currentR = fixedRC.row + (i-mthLetter) * dir.dr;
                const currentC = fixedRC.col + (i-mthLetter) * dir.dc;
                board[currentR][currentC] = word[i];
            }
        };

        // 逐个处理每个单词
        let isAllplaced = false;

        //循环尝试全体的放置
        for(let trycount = 0; trycount < 500 ; trycount++){
            board_clear();

            //放置每一个词
            for (let wid = 0; wid < wordlist.length ; wid++) {
                const word = wordlist[wid];
                isAllplaced = false;//make isAllplaced = true; in the end work
                // 跳过空单词（容错处理）
                const trimmedWord = word.trim();
                if (trimmedWord.length === 0 || trimmedWord.length > Math.max(this.BoardGridNRow,this.BoardGridNCol)) {
                    console.error(`Word empty or too long to fill ${this.BoardGridNRow}x${this.BoardGridNCol}  grids`);
                }
                let isWordPlaced = false;

                //优先共用放置
                //遍历单词的每一个字母查找是否公共//用isWordPlaced灵活跳出双重for循环
                // 使用示例
                const randomCoords = this.generateRandomCoordinates(this.BoardGridNRow, this.BoardGridNCol);
                const chars = word.split('');
                for (const [ind, c] of chars.entries()) {
                    for(const [i,j] of randomCoords){
                        if(isWordPlaced)break;
                        if(c===board[i][j]){
                                //随机一个方向，不符合则放弃共用，保留共用的随机性
                                for(let dd = 0 ; dd < 3&&!isWordPlaced ; dd ++){//找4次
                                    const mydir = directions[Math.floor(Math.random() * directions.length)];
                                    if(canPlaceWord(trimmedWord,ind,{row:i,col:j},mydir)){
                                        placeWord(trimmedWord,ind,{row:i,col:j},mydir);
                                        isWordPlaced = true;
                                        break;
                                    }
                                }
                            }
                    }
                }
                // 单独放置
                if (!isWordPlaced) {
                    //改为单独放置搜索// 理论上能搜索全
                    for (let attempt = 0; attempt < 1000 && !isWordPlaced; attempt++) {

                        // 随机选择放置方向
                        const randomDir = directions[Math.floor(Math.random() * directions.length)];

                        let randomR,randomC;
                        switch (randomDir.dr) {
                            case 0:
                                randomR = Math.floor(Math.random() * this.BoardGridNRow);
                                break;
                            case 1:
                                randomR = Math.floor(Math.random() * (this.BoardGridNRow-word.length+1));
                                break;
                            case -1:
                                randomR = this.BoardGridNRow - 1 - Math.floor(Math.random() * (this.BoardGridNRow-word.length+1));
                                break;
                        }

                        switch (randomDir.dc) {
                            case 0:
                                randomC = Math.floor(Math.random() * this.BoardGridNCol);
                                break;
                            case 1:
                                randomC = Math.floor(Math.random() * (this.BoardGridNCol-word.length+1));
                                break;
                            case -1:
                                randomC = this.BoardGridNCol - 1 - Math.floor(Math.random() * (this.BoardGridNCol-word.length+1));
                                break;
                        }

                        // 检查是否可放置，若可以则执行放置
                        if (canPlaceWord(trimmedWord,0,{row:randomR,col:randomC} , randomDir)) {
                            placeWord(trimmedWord,0,{row:randomR,col:randomC} , randomDir);
                            isWordPlaced = true;
                        }
                    }
                    //break;
                }

                //not All placed, just make sure isAllplaced = true; at the end of the for loop, isAllplaced = false at the begin
                if(isWordPlaced)isAllplaced = true;
                else{
                    //某个词实在放不下
                    isAllplaced = false;
                    break;
                }
            }
            if(isAllplaced)break;
        }

        if(!isAllplaced){//
            throw new Error(`All words cant be placed at the same time.`);
        }

        const fillRestGridWithRandonLetters = () => {
            board.forEach(row => row.forEach((_, idx) => row[idx] = row[idx]&&row[idx]!=' '?row[idx]:Dictionary.instance.randomLetterEquelFreq()));
            //board.forEach(row => row.forEach((cell, idx) => row[idx] = cell || Dictionary.instance.randomLetterEquelFreq()));
        }
        fillRestGridWithRandonLetters();

        return board;
    }

    private generateRandomCoordinates(rows: number, cols: number): Array<[number, number]> {
        // 1. 创建所有坐标
        const coordinates: Array<[number, number]> = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                coordinates.push([i, j]);
            }
        }
        
        // 2. Fisher-Yates 洗牌算法（原地随机排序）
        for (let i = coordinates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
        }
        
        return coordinates;
    }

    private onTouchStart(event: EventTouch): void {
        const touchPos = event.getUILocation();
        this.startCell = this.getCellAtPos(touchPos);
        this.currentCell = this.startCell;
        if(this.currentCell){
            this.color_now = this.colors_using[Math.floor(Math.random() * this.colors_using.length)];
            this.circle(this._graphics,this.currentCell.node.position,this.CellSpacing*WrapRatio,this.color_now);
            //this.UpdatePendingLabel(this.startCell,this.currentCell);
        }
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.startCell) return;
        const touchPos = event.getUILocation();
        this.currentCell = this.getCellAtPos(touchPos);
        if(this.currentCell){
            //强制在米字方向
            this.currentCell = this.fixToStraightLineCell(this.startCell,this.currentCell);
        }
        //if(this.currentCell&&this.isStraightLine(this.startCell,this.currentCell))
        this.UpdateTryWordUI(this.startCell,this.currentCell);
        this.UpdatePendingLabel(this.startCell,this.currentCell);
    }

    private fixToStraightLineCell(strtCell:BoardCell,crntCell:BoardCell):BoardCell{
        //返回纠正后的末尾网格，使其与起点网格保持同行或同列或斜方向
        if(!strtCell)return;

        const delta_row = crntCell.getComponent(BoardCell).row - strtCell.getComponent(BoardCell).row;
        const delta_col = crntCell.getComponent(BoardCell).col - strtCell.getComponent(BoardCell).col;

        //已经满足要求
        if(delta_col*delta_row===0||delta_col*delta_col===delta_row**delta_row)return crntCell;

        let ans_row,ans_col,ans_dist2;
        if(delta_row*delta_row>delta_col*delta_col){
            ans_row = delta_row + strtCell.row;
            ans_col = strtCell.col;
            ans_dist2 = delta_col*delta_col;
        }
        else{
            ans_row = strtCell.row;
            ans_col = delta_col + strtCell.col;
            ans_dist2 = delta_row*delta_row;
        }

        const dr=delta_row>0?1:-1;
        const dc=delta_col>0?1:-1;
        for(let i = 1 ; ; i ++){
            const newR = strtCell.row+dr*i;
            const newC = strtCell.col+dc*i;
            //出界就停止搜索
            if(newR<0||newR>=this.BoardGridNRow||newC<0||newC>=this.BoardGridNCol)break;
            const dx = newR-crntCell.row;
            const dy = newC-crntCell.col;
            const dist2 = dx*dx+dy*dy;
            if(dist2<ans_dist2){
                ans_dist2 = dist2;
                ans_col = newC;
                ans_row = newR;
            }
        }
        return this.cells[ans_row][ans_col].getComponent(BoardCell);
    }

    private onTouchEnd(event: EventTouch): void {
        this.UpdatePendingLabel(null,null);
        if (!this.startCell || !this.currentCell || this.startCell === this.currentCell) {
            this.resetTouchState();
            return;
        }
        // 判断是否为直线（同行/同列/同斜线）
        if (this.isStraightLine(this.startCell, this.currentCell)) {
            // 提取路径字母组成单词
            const word = this.extractPathWord(this.startCell, this.currentCell);
            
            // 验证单词（玩家负责字母的正反顺序        
            const item = {gridA:this.startCell.gridRC, gridB:this.currentCell.gridRC, targetWord:word};
            if(GameManager.instance.isNewItem(item)){
                if(GameManager.instance.isTargetWord(item.targetWord)&&!GameManager.instance.isFoundedWord(item.targetWord)){
                    //核心 找到新的target词
                    //GameManager.instance.PlaySingleSuccessClip();
                    AudioManager.instance.SingleSuccess();
                    this.ItemConfirm(item);
                }
                else if(Dictionary.instance.isValidWord(item.targetWord)){
                    //bonus
                    this._graphics.clear();
                    AudioManager.instance.SingleSuccess();
                    this.GetBonusItem(item);
                }
                else{
                    //wrong 
                    AudioManager.instance.SingleFailure();
                    this._graphics.clear();
                }
            }   
            else{
                this._graphics.clear();
            }      
        }

        this.resetTouchState();
    }

    private ItemConfirm(item:MatchItem){
        if(this.color_now){
            const ind = this.colors_using.findIndex(item => item === this.color_now);
            if(ind>=0)this.colors_using.splice(ind, 1);
            else{
                console.error("color array messy");
            }
        }else{
            this.color_now = this.colors_using[Math.floor(Math.random() * this.colors_using.length)];
            console.error("color array messy");
        }
        if(this.colors_using.length<=0){
            this.colors_using = [...colors];
        }
        const graphics_confirm = this.graphicsNode4confirmed.getComponent(Graphics);
        const pointA = this.cells[item.gridA.row][item.gridA.col].node.position;
        const pointB = this.cells[item.gridB.row][item.gridB.col].node.position;
        this.connect(graphics_confirm,pointA,pointB,this.CellSpacing*WrapRatio,this.color_now,false);
        GameManager.instance.ItemConfirm(item);
        this.color_now = this.colors_using[Math.floor(Math.random() * this.colors_using.length)];
        this.tweenEffect(item);
    }

    private GetBonusItem(item:MatchItem){
        GameManager.instance.AddBonusItem(item);
        this.tweenEffect(item);
    }

    private tweenEffect(item:MatchItem){
        let drow = item.gridB.row - item.gridA.row;
        let dcol = item.gridB.col - item.gridA.col;
        if(drow!=0)drow=drow>0?1:-1;
        if(dcol!=0)dcol=dcol>0?1:-1;
        for(let i = 0 ; i < item.targetWord.length ; i ++){
            this.cells[item.gridA.row+i*drow][item.gridA.col+i*dcol].tweenEffect();
        }
    }

    private resetTouchState(): void {
        this.startCell = null;
        this.currentCell = null;
        this._graphics.clear();
    }

    private getCellAtPos(screenPos: Vec2): BoardCell | null {
        
        const uiTransform = this.node.getComponent(UITransform)!;
        const localPos = uiTransform.convertToNodeSpaceAR(screenPos.toVec3());
        const halfRowN = (this.BoardGridNRow - 1) / 2;
        const halfColN = (this.BoardGridNCol - 1) / 2;
        const row = Math.round(halfRowN+(localPos.y / this.CellSpacing) );
        const col = Math.round((localPos.x / this.CellSpacing) + halfColN);

        return (row >= 0 && row < this.BoardGridNRow && col >= 0 && col < this.BoardGridNCol) 
            ? this.cells[row][col] : null;
    }

    //判断两个格子是否在同一直线
    private isStraightLine(a: BoardCell, b: BoardCell): boolean {
        const dr = b.row - a.row;
        const dc = b.col - a.col;
        // 同行/同列 或 斜线（行差绝对值=列差绝对值）
        return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
    }

    //提取路径上的字母组成单词
    private extractPathWord(start: BoardCell, end: BoardCell): string {
        if(!start||!end)return '';
        let word = '';
        const dr = end.row - start.row;
        const dc = end.col - start.col;

        // 计算步长（-1/0/1）
        const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
        const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

        // 遍历路径所有格子
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        for (let i = 0; i <= steps; i++) {
            const row = start.row + stepR * i;
            const col = start.col + stepC * i;
            word += this.cells[row][col].letter;
        }
        return word;
    }

    private UpdateTryWordUI(A:BoardCell,B:BoardCell){
        if(!A||!B||!this.isStraightLine(A,B))return ;
        const pointA = A.node.position;
        const pointB = B.node.position;//getComponent(UITransform).convertToWorldSpaceAR(new Vec3(0,0,0));
        this.connect(this._graphics,pointA,pointB,this.CellSpacing*WrapRatio,this.color_now,true);
        return;
    }

    private UpdatePendingLabel(A:BoardCell,B:BoardCell){
        if(!A||!B||!this.isStraightLine(A,B)){
            this.PendingLabel.string = '';
        }
        // 获取背景节点的 UITransform和sprite
        const bg_sprite = this.PendingLabel.node.parent.getComponent(Sprite);
        const bg_uiTransform = this.PendingLabel.node.parent.getComponent(UITransform);
        if (!bg_uiTransform||!bg_sprite) return;
        const word = this.extractPathWord(A,B);

        // 关键：强制更新 Label 的渲染数据（确保尺寸是最新的）
        this.PendingLabel.updateRenderData(true);
        
        this.PendingLabel.string = word;//更新标签
        this.PendingLabel.color = this.color_now;

        // 获取 Label 的实际渲染尺寸（宽/高）
        const label_ui = this.PendingLabel.node.getComponent(UITransform);
        const labelWidth = label_ui.width;
        const labelHeight = label_ui.height;

        // 计算背景最终尺寸
        const bgWidth = labelWidth * 1.2; 
        const bgHeight = labelHeight * 1.2;
        // 设置背景尺寸（适配不同锚点）
        bg_uiTransform.setContentSize(bgWidth, bgHeight);
    }

    private connect(graphics:Graphics ,A: Vec3, B: Vec3, width: number, color: Color, clearBeforeDraw: boolean = false): void {
        // 容错：Graphics未初始化/参数非法时直接返回
        if (!graphics || !A || !B || width <= 0) {
            console.warn("连线参数非法/Graphics未初始化");
            return;
        }

        // 可选：清空之前的连线（如需仅显示当前A-B连线）
        if (clearBeforeDraw) {
            graphics.clear();
        }

        // 设置连线样式
        graphics.lineWidth = width;    // 线宽
        graphics.strokeColor = color; // 线颜色
        graphics.fillColor = color; // 圆角颜色与线条一致

        this.circle(graphics,A,width,color);
        this.circle(graphics,B,width,color);

        // 绘制A到B的直线
        graphics.moveTo(A.x, A.y);    // 移动到起点A
        graphics.lineTo(B.x, B.y);    // 绘制到终点B
        graphics.stroke();            // 执行绘制（必须调用，否则不显示）
    }

    private circle(graphics:Graphics,A:Vec3, width: number, color: Color){
        graphics.fillColor = color; // 圆角颜色与线条一致
        const capRadius = width / 2;      // 圆角半径 = 线宽/2（完美覆盖端点）
        // 绘制起点A的圆角（圆形）
        graphics.circle(A.x, A.y, capRadius);
        graphics.fill(); // 填充圆形
    }

    /** 清空所有连线（辅助函数） */
    clearAllLines(graphics:Graphics): void {
        graphics?.clear();
    }

    public MakeHint(word:string){
        for(let i=0 ; i < this.BoardGridNRow ; i++){
            for(let j=0 ; j < this.BoardGridNCol ; j++){
                for(let k = 0 ; k < directions.length; k++){
                    if(this.MatchWord(word,{row:i,col:j},directions[k])){
                        //found hint word
                        const A_rc:GridRC = {row:i,col:j};
                        const B_rc:GridRC = {row:i+directions[k].dr*(word.length-1),col:j+directions[k].dc*(word.length-1)};
                        this.ItemConfirm({gridA:A_rc,gridB:B_rc,targetWord:word});
                        return;
                    }
                }
            }
        }
    }

    private MatchWord(word:string,rc:GridRC,dir:Direction):boolean{
        for(let i = 0 ; i < word.length ; i ++){
            const myr = rc.row+dir.dr*i;
            const myc = rc.col+dir.dc*i;
            if(myr<0||myr>=this.BoardGridNRow||
                myc<0||myc>=this.BoardGridNCol||
                this.cells[myr][myc].letter.toUpperCase()!=word[i].toUpperCase()){
                return false;
            }
            else{
            }
        }
        return true;
    }

    public SetTargetWords(words:string[]){
        this.targetWords = [...words];
    }

    private clearGrid(): void {
        for (const row of this.cells) {
            for (const cell of row) {
                cell?.node?.destroy();
            }
        }
        this.cells = [];
    }

    private onTouchEvents():void{
        this.node.on(Input.EventType.TOUCH_START,this.onTouchStart,this);//全局检测//更高的视角
        this.node.on(Input.EventType.TOUCH_MOVE,this.onTouchMove,this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.resetTouchState, this);
        
    }

    private offTouchEvents():void{
        this.node.off(Input.EventType.TOUCH_START,this.onTouchStart,this);//全局检测//更高的视角
        this.node.off(Input.EventType.TOUCH_MOVE,this.onTouchMove,this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.resetTouchState, this);
    }

    public EnableNode(){
        this.onTouchEvents();
    }

    public DisableNode(){
        this.offTouchEvents();
    }

    protected onDestroy(): void {
        this.offTouchEvents();
        this.clearGrid();
    }

}