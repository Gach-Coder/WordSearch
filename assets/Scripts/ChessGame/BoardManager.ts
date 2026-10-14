import { _decorator, Component, Node, Vec3,Vec2, UITransform,instantiate,Prefab, Sprite,Label,tween, UIOpacity,Tween, easing, SpriteFrame, Size} from 'cc';
const { ccclass, property } = _decorator;
import { sleep } from '../Tools';
import { BaseBoardManager, GridPos } from '../BaseBoardManager';
import { BoardCell } from './BoardCell';
import { LetterTile } from './LetterTile';
import { Dictionary } from '../Dictionary';

// 格子类型
export enum GridType {
    EMPTY = 0 ,    // 空
    START = 1,    // 起点
    END = 2,      // 终点
    PROP = 3,     // 万能道具
    WALL = 4       // 墙壁
}

enum DIRECTION{
    ROW,
    COL
}

export interface PropAndFlagData{
    'prop':boolean,
    'flag':number
}

@ccclass('BoardManager')
export class BoardManager extends BaseBoardManager {
    @property(SpriteFrame)
    private start_point_icon:SpriteFrame = null;
    @property(SpriteFrame)
    private end_point_icon:SpriteFrame = null;
    @property(SpriteFrame)
    private card_point_icon:SpriteFrame = null;

    private delta_flags:number = null;
    private isProp:boolean = null;

    private pendingWord:string = null;
    private pending_i:number = null;
    private pending_j:number = null;
    private pending_dir:DIRECTION = null;

    private grids:number[][] = null;
    private startP:GridPos = null;
    private endP:GridPos[] = [];
    private wallP:GridPos[] = [];
    private propP:GridPos[] = [];

    public get sum_flags():number{
        return this.endP.length;
    }

    public static instance: BoardManager = null;
    onLoad(): void {
        BoardManager.instance = this;
    }

    public async ResetGame(grids:number[][]){
        if(!grids){
            console.error('no grids get')
        }
        super.ResetGame()
        await sleep(100);

        this.delta_flags = 0;
        this.isProp = false;
        this.endP = [];
        this.wallP = [];
        this.propP = [];

        //wait to ResetGame
        this.grids = grids;
        this.VisitWholeBoard();
        await sleep(50);
        this.PutIcons();
        this.turnCount = 0;
        this.gridCrashCount = 0;
        this.pendingWord = '';
    }

    //提取格式化数据
    private VisitWholeBoard(){
        // 安全判空：如果没有关卡数据，直接返回
        const grids = this.grids;
        if (!grids) {
            console.error("❌ 无法读取关卡数据！");
            return;
        }
        if (!grids) {//
            console.error("❌ 数据格式错误！");
            return;
        }

        for (let row = 0; row < grids.length; row++) {
            const currentRow = grids[row];
            for (let col = 0; col < currentRow.length; col++) {
                const cellType:GridType = currentRow[col]; //number转type
                switch (cellType) {
                    case GridType.START:
                        this.startP = {row:row,col:col}
                        break;
                    case GridType.END:
                        this.endP.push({row:row,col:col})
                        break;
                    case GridType.PROP:
                        this.propP.push({row:row,col:col})
                        break;
                    case GridType.WALL:
                        this.wallP.push({row:row,col:col})
                        break;
                }
            }
        }
    }


    private PutIcons(){
        this.PutGridIcon(this.startP,GridType.START);
        this.endP.forEach(p=>{
            this.PutGridIcon(p,GridType.END);
        })
        //禁入
        this.wallP.forEach(p=>{
            this.SetForbidGrid(p);
        })
        this.propP.forEach(p=>{
            this.PutGridIcon(p,GridType.PROP);
        })
    }

    private PutGridIcon(gPos:GridPos,gType:GridType){
        const myiconNode = new Node('icon');
        this.cellNode[gPos.row]?.[gPos.col].addChild(myiconNode);

        myiconNode.addComponent(Sprite);
        const sp = myiconNode.getComponent(Sprite);
        const iconSize = this.CellSize*0.55;
        if(gType === GridType.START){//起点
            sp.spriteFrame = this.start_point_icon;
            myiconNode.getComponent(UITransform)?.setContentSize(new Size(iconSize*0.8,iconSize));
        }else if(gType === GridType.END){//终点
            sp.spriteFrame = this.end_point_icon;
            myiconNode.getComponent(UITransform)?.setContentSize(new Size(iconSize,iconSize));
        }else if(gType === GridType.PROP){//道具
            sp.spriteFrame = this.card_point_icon;
            myiconNode.getComponent(UITransform)?.setContentSize(new Size(iconSize*0.9,iconSize*0.9));
        }

        myiconNode.setSiblingIndex(0);//可以被玩家手卡覆盖
    }

    private SetForbidGrid(gPos:GridPos){
        const cellNode1dim = this.cellNode[gPos.row];
        this.cellNode[gPos.row]?.[gPos.col].getComponent(BoardCell).SetOccupied(' ');
        if(cellNode1dim)cellNode1dim[gPos.col].active = false;
        //GameManager.SetForbidGrid(gPos);
    }

    protected DenyAllRelatedCells(): void {
        this.delta_flags = 0;
        this.isProp = false;
        super.DenyAllRelatedCells();
        this.pendingWord = '';
    }

    public UpdatePendingState(){//重新遍历pending grids//
        this.DenyAllRelatedCells();

        //同行列组成一个单词包含至少一个已存在的单词网格
        if(this.pendingGrids.length===1){
            //只放置一个，任意方向
            this.VisitGrid(this.pendingGrids[0]);
        }
        else if(this.pendingGrids.length > 1){
            //唯一方向
            if(this.pendingGrids[0].col === this.pendingGrids[1].col){
                this.VisitGridCol(this.pendingGrids[1]);
            }else if(this.pendingGrids[0].row === this.pendingGrids[1].row){
                this.VisitGridRow(this.pendingGrids[1]);
            }
        }

        //变绿判定//直接return
        if(this.turnCount === 0){
            if(this.startP&&!this.pendingGrids.some(p => p.row === this.startP.row && p.col===this.startP.col)){
                this.pendingGrids.forEach(g=>{
                })
                return;
            }
        }
        else{
            if(this.pendingWord.length === this.pendingGrids.length){
                return;
            }
        }

        //判定结果为待解决状态resolved
        //this.UpdateDeltaFlags();

        if(this.pendingWord.length>1){
            if(this.pending_dir === DIRECTION.ROW){
                const pRow = this.pendingGrids[0].row
                for(let k = this.pending_i ; k <= this.pending_j ; k ++){
                    this.SetGrid2Related({row:pRow,col:k});
                }
            }
            else if(this.pending_dir === DIRECTION.COL){
                const pCol = this.pendingGrids[0].col
                for(let k = this.pending_j ; k <= this.pending_i ; k ++){
                    this.SetGrid2Related({row:k,col:pCol});
                }
            }
            else{
                //
                console.error('000 set related grid error');
            }
        }
    }

    GetKeyBoardLetter(gPos:GridPos){//万能牌
        //const Tile = this.cellNode[gPos.row][gPos.col].
        //this.cellNode[gPos.row][gPos.col].getComponent(BoardCell).Hover2Pending(Tile,Tile.getComponent(LetterTile).char);
        //this.boundTiles.push(Tile);
        //this.AddPendingGrid(gPos);
        //当前回合所有放置的重新判定
        this.UpdatePendingState();
    }

    protected VisitGridRow(gPos:GridPos){
        let left = gPos.col;
        let right = gPos.col;

        // 向左右水平遍历连续字母 
        while (left > 0 && this.isBounded(gPos.row,left-1)) {left--;}
        while (right < this.boardGridNCol - 1 && this.isBounded(gPos.row,right+1)) {right++;}


        let relatedMin = gPos.col;
        let relatedMax = gPos.col;

        for (const p of this.pendingGrids) {
            if (gPos.row !== p.row) { 
                return; 
            }
            relatedMin = Math.min(relatedMin, p.col);
            relatedMax = Math.max(relatedMax, p.col);
        }

        //存在pending grid不在连续字母块//不连续
        if(relatedMax > right||relatedMin < left){
            return;
        }

        for(let i = left; i <= relatedMin ; i++){
            let Str = '';// 拼接连续字母
            for(let j = i ; j<relatedMax ; j++)Str += this.cellNode[gPos.row][j].getComponent(BoardCell)?.char;
            for(let j = relatedMax ; j <= right ; j ++){
                Str += this.cellNode[gPos.row][j].getComponent(BoardCell)?.char;
                const StrReverse = Str.split('').reverse().join('');
                if(Dictionary.instance.isValidWord(Str)){
                    if(Str.length>this.pendingWord.length){
                        this.pendingWord = Str;
                        this.pending_i=i;this.pending_j=j;
                        this.pending_dir = DIRECTION.ROW
                    }
                }
                else if(Dictionary.instance.isValidWord(StrReverse)){
                    if(StrReverse.length>this.pendingWord.length){
                        this.pendingWord = StrReverse;
                        this.pending_i=i;this.pending_j=j;
                        this.pending_dir = DIRECTION.ROW
                    }
                }
            }
        }

        if(this.pendingWord&&this.pendingWord.length<=1){
            //未匹配
            return ;
        }
    }

    protected VisitGridCol(gPos:GridPos){
        let bottom = gPos.row;//连接的最大限度
        let top = gPos.row;

        // 向上遍历连续字母
        while (bottom > 0 && this.isBounded(bottom-1,gPos.col)) {bottom--;}
        while (top < this.boardGridNRow - 1 && this.isBounded(top+1,gPos.col)) {top++;}


        let relatedMin = gPos.row;//合法单词最大限度
        let relatedMax = gPos.row;

        for (const p of this.pendingGrids) {
            if (gPos.col !== p.col) { 
                return; 
            }
            relatedMin = Math.min(relatedMin, p.row);
            relatedMax = Math.max(relatedMax, p.row);
        }

        //存在pending grid不在连续字母块//不连续
        if(relatedMax > top||relatedMin < bottom){
            return;
        }

        for(let i = top; i >= relatedMax ; i--){//row方向和top相反//不影响结论
            let Str = '';// 拼接连续字母
            for(let j = i ; j>relatedMin ; j--)Str += this.cellNode[j][gPos.col].getComponent(BoardCell)?.char;
            for(let j = relatedMin ; j >= bottom ; j --){
                Str += this.cellNode[j][gPos.col].getComponent(BoardCell)?.char;
                const StrReverse = Str.split('').reverse().join('');
                if(Dictionary.instance.isValidWord(Str)){
                    if(Str.length>this.pendingWord.length){
                        this.pendingWord = Str;
                        this.pending_i=i;this.pending_j=j;
                        this.pending_dir = DIRECTION.COL
                    }
                }
                else if(Dictionary.instance.isValidWord(StrReverse)){
                    if(StrReverse.length>this.pendingWord.length){
                        this.pendingWord = StrReverse;
                        this.pending_i=i;this.pending_j=j;
                        this.pending_dir = DIRECTION.COL
                    }
                }
            }
        }

        if(this.pendingWord&&this.pendingWord.length<=1){
            //未匹配
            return ;
        }
    }

    public DeployCell(gPos: GridPos, Tile: Node) {
        this.cellNode[gPos.row][gPos.col].getComponent(BoardCell).Hover2Pending(Tile, Tile.getComponent(LetterTile).char);
        this.boundTiles.push(Tile);
        this.AddPendingGrid(gPos);
    
        //当前单个放置的特效处理
        /*this.relatedWords = [];
        this.relatedGrids = [];
        this.VisitGrid(gPos);//related words
        this.relatedWords.forEach(word => {
        });
        this.relatedWords = [];*/
    
        //当前回合所有放置的重新判定
        this.UpdatePendingState();
    }

    public ResolvedConfirm():PropAndFlagData{//resolve and go Next round
        if(!this.isAllResolved()){
            return;
        }

        //this.relatedGrids = [];
        //this.pendingGrids.forEach(grid=>{
        //    this.VisitGrid(grid);
        //});

        this.UpdateDeltaFlags()
        this.gridCrashCount += this.relatedGrids.length;
        this.turnCount += 1;
        
        //当前回合的所有related网格和resolved变为occupied
        this.RelatedGrids2Ocuppied();

        const flag = this.delta_flags
        const prop = this.isProp

        this.delta_flags = 0;
        this.isProp = false;

        this.pendingGrids = [];
        this.relatedGrids = [];
        this.boundTiles = [];
        this.collision_gPos = null;
        return {'flag':flag,'prop':prop};
    }

    private RelatedGrids2Ocuppied(){
        this.relatedGrids.forEach(grid => {
            const bc = this.cellNode[grid.row][grid.col].getComponent(BoardCell);
            if(bc.isResolved()){
                //解决转确定
                bc.Resolved2Occupied();
            }
            else if(bc.isOccupied()){
                //bc.Occupied2Blank();
                bc.Related2Occupied();
            }
            else{
                //出现的其他状态的cell
                console.error(`[000]cell state update messy.R${grid.row}C${grid.col} cell is ${this.GetCellState(grid.row,grid.col)}`);
            }
        });
    }

    private UpdateDeltaFlags(){
        this.pendingGrids.forEach(g=>{
            if(this.endP.some(p=>
                p.col === g.col && p.row === g.row
            )){
                this.delta_flags ++;
            }

            if(this.propP.some(p=>
                p.col === g.col && p.row === g.row
            )){
                this.isProp = true;
            }
        })
    }
}