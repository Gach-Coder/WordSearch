import { _decorator, Component, instantiate, Label, Node, Prefab, Sprite, UITransform, Vec2, Vec3 } from 'cc';
import { BaseLetterTile } from './BaseLetterTile';
import { BaseTileCell } from './BaseTileCell';
import { Dictionary } from './Dictionary';
import { GridPos } from './BaseBoardManager';
const { ccclass, property } = _decorator;

// 全局通用常量（仅基类定义，子类直接复用）
export const MaxHold: number = 6;
export const tileSize: number = 100;
export const tileDist: number = 20;

@ccclass('BaseHandManager')
export class BaseHandManager extends Component {
    @property(Prefab) public TilePrefab: Prefab = null;
    @property(Prefab) public TileCellPrefab: Prefab = null;
    @property(Node) public LettersParentNode: Node = null;
    
    protected touchTileNode: Node = null;
    protected handTiles: Node[] = [];
    protected boundTiles: Node[] = [];
    protected tileCell: Node[] = [];
    protected countblocks: number = 0; // 修复TS类型错误：number不能赋值null

    protected start(): void {
        this.handTiles = [];
        this.boundTiles = [];
        this.initHand();
        this.touchTileNode = null;
    }

    // 初始化手牌（补满上限）
    protected initHand(): void {
        // 手牌位置初始化
        for (let i = 0; i < MaxHold; i++) {
            const tCellNode = instantiate(this.TileCellPrefab);
            this.node.addChild(tCellNode);
            const halfN = (MaxHold - 1) / 2;
            const pos = new Vec3((i - halfN) * (tileSize + tileDist), 0, 0);
            tCellNode.getComponent(BaseTileCell).init(i, pos);
            this.tileCell.push(tCellNode);
        }
        this.countblocks = 0;
    }

    protected FillTileCellsWithTiles(): void {
        for (let i = 0; i < this.tileCell.length; i++) {
            const tCell = this.tileCell[i].getComponent(BaseTileCell);
            if (tCell.isEmptyCell()) {
                this.countblocks++;
                const TileNode = instantiate(this.TilePrefab);
                let letter: string;
                
                if (Math.random() < 0.1 || this.countblocks % 3 === 0) {
                    letter = ' '; // 万能牌
                } else {
                    letter = Dictionary.instance.randomLetterByFreq();
                    while (this.isRepeatLetter(letter)) {
                        letter = Dictionary.instance.randomLetterByFreq();
                    }
                }

                const tile = TileNode.getComponent(BaseLetterTile);
                // 简化空值赋值语法
                this.LettersParentNode ||= this.node;
                this.LettersParentNode.addChild(TileNode);
                tile.init(letter, this.tileCell[i].position);
                this.handTiles.push(TileNode);

                this.RankCellBoundTile(i, TileNode);
            }
        }
    }

    protected FillTileCellsWithSpecialLetter(): void {
        for (let i = 0; i < this.tileCell.length; i++) {
            const tCell = this.tileCell[i].getComponent(BaseTileCell);
            if (tCell.isEmptyCell()) {
                const TileNode = instantiate(this.TilePrefab);
                const letter = ' '; // 万能牌

                const tile = TileNode.getComponent(BaseLetterTile);
                this.LettersParentNode ||= this.node;
                this.LettersParentNode.addChild(TileNode);
                tile.init(letter, this.tileCell[i].position);
                this.handTiles.push(TileNode);

                this.RankCellBoundTile(i, TileNode);
            }
        }
    }

    protected isRepeatLetter(letter: string): boolean {
        for (let i = 0; i < this.tileCell.length; i++) {
            const tCell = this.tileCell[i].getComponent(BaseTileCell);
            if (!tCell.isEmptyCell()) {
                if (tCell.boundTile.getComponent(BaseLetterTile).char === letter) {
                    return true;
                }
            }
        }
        return false;
    }

    protected RankCellBoundTile(rank: number, TileNode: Node): void {
        if (rank > this.tileCell.length) {
            console.error("wrong rank");
        }
        const tcell = this.tileCell[rank].getComponent(BaseTileCell);
        if (!TileNode) {
            tcell.BoundTile(null);
            return;
        }
        tcell.BoundTile(TileNode);
        TileNode.getComponent(BaseLetterTile).UpdateTileCell(this.tileCell[rank]);
    }

    public DeployCancel(): void {
        this.boundTiles.forEach(tile => {
            const ltile = tile.getComponent(BaseLetterTile);
            this.RollBackTile(ltile);
            this.handTiles.push(tile);
        });
        this.boundTiles = [];
    }

    public TryGetTouchingTileNode(Pos: Vec2): Node | null {
        const tcell = this.TryGetTouchingTileCell(Pos);
        if (tcell) {
            const tc = tcell.getComponent(BaseTileCell);
            const ans = tc.boundTile;
            return tc.isTileOnCell() ? ans : null;
        }
        return null;
    }

    protected TryGetTouchingTileCell(Pos: Vec2): Node | null {
        for (let i = 0; i < this.tileCell.length; i++) {
            const tcell = this.tileCell[i].getComponent(BaseTileCell);
            if (tcell.isTouching(Pos)) {
                return tcell.node;
            }
        }
        return null;
    }

    public onTouchTile(tile: Node): void {
        const pNode = tile.parent;
        tile.removeFromParent();
        pNode.addChild(tile);
        this.touchTileNode = tile;
    }

    protected TileHand2Bound(tileNode: Node): void {
        const index = this.handTiles.indexOf(tileNode);
        if (index < 0) {
            console.error(`handTiles messy`);
            return;
        }
        this.handTiles.splice(index, 1);
        this.boundTiles.push(tileNode);
        this.touchTileNode = null;
    }

    public TileBound2Hand(tileNode: Node): void {
        const index = this.boundTiles.indexOf(tileNode);
        if (index < 0) {
            console.error(`boundTiles messy length`);
            return;
        }
        this.boundTiles.splice(index, 1);
        this.handTiles.push(tileNode);
        this.touchTileNode = tileNode;
        this.touchTileNode.active = true;
    }

    public TileCollision(): void {
        if (!this.touchTileNode) return;
        
        const worldPos = this.touchTileNode.parent.getComponent(UITransform).convertToWorldSpaceAR(this.touchTileNode.position).toVec2();
        const tcell = this.TryGetTouchingTileCell(worldPos);

        if (tcell) {
            const tc = tcell.getComponent(BaseTileCell);
            const ltile = this.touchTileNode.getComponent(BaseLetterTile);
            
            if (!ltile.BoundTileCell) {
                console.error("ltile.BoundTileCell empty");
            } else {
            }

            const rank = ltile.BoundTileCell.getComponent(BaseTileCell).cellRank;
            if (rank === tc.cellRank) return;

            const d = rank > tc.cellRank ? 1 : -1;
            const moveList: number[] = [];
            let endRank = -1;

            for (let i = tc.cellRank; i < this.tileCell.length && i >= 0; i += d) {
                if (this.tileCell[i].getComponent(BaseTileCell).isTileOnCell()) {
                    moveList.push(i);
                } else {
                    endRank = i;
                    break;
                }
            }

            this.RankCellBoundTile(rank, this.tileCell[endRank].getComponent(BaseTileCell).boundTile);
            moveList.reverse();
            
            moveList.forEach(tileRank => {
                if (tileRank + d < 0 || tileRank < 0 || tileRank + d >= this.tileCell.length || tileRank >= this.tileCell.length) {
                    console.error("Index error");
                }
                const tileNode = this.tileCell[tileRank].getComponent(BaseTileCell).boundTile;
                const posEnd = this.tileCell[tileRank + d].position;
                tileNode.getComponent(BaseLetterTile).MoveEffect(posEnd);
                this.RankCellBoundTile(tileRank + d, tileNode);
            });
            
            this.RankCellBoundTile(tc.cellRank, this.touchTileNode);
        }
    }

    protected RollBackTile(tile: BaseLetterTile): void {
        tile.handlePlacement(null);
    }

    public TouchMoveTile(movePos: Vec2): void {
        if (this.touchTileNode) {
            this.touchTileNode.getComponent(BaseLetterTile).onTouchMove_(movePos);
        } else {
            console.error('null touch tile in handmanager\n');
        }
    }

    public NextRound(isProp:boolean): void {
        this.touchTileNode = null;
        this.boundTiles.forEach(tile => {
            tile.destroy();
        });
        this.boundTiles = [];
        if(isProp) this.FillTileCellsWithSpecialLetter();
        else this.FillTileCellsWithTiles();
    }

    public LettersChange(): void {
        if (this.boundTiles.length > 0) {
            this.DeployCancel();
        }
        this.tileCell.forEach(cell => {
            cell.getComponent(BaseTileCell).BoundTile(null);
        });
        this.handTiles.forEach(tile => tile.destroy());
        this.handTiles = [];
        this.FillTileCellsWithTiles();
    }

    public GetTouchTileNode(): Node | null {
        return this.touchTileNode;
    }

    public GetCellPosition(rank: number): Vec3 {
        if (rank >= this.tileCell.length || rank < 0) {
            console.error(`rank error:${rank}`);
        }
        return this.tileCell[rank].position;
    }

    public GetTouchingLetter(): string {
        return this.touchTileNode.getComponent(BaseLetterTile).char;
    }

    public GetCollisionGrid(): GridPos{return}

    public DeployTile(): void {}
}