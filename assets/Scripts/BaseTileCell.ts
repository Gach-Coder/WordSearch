import { _decorator, Component, Node, UITransform, Vec2, Vec3 } from 'cc';
import { tileSize } from './BaseHandManager';
import { BaseLetterTile } from './BaseLetterTile';
const { ccclass } = _decorator;

@ccclass('BaseTileCell')
export class BaseTileCell extends Component {
    protected _rank: number | null = null;
    protected _boundTile: Node | null = null;
    protected _isTileOnCell: boolean | null = null;

    protected onLoad(): void {}

    public TryGetTouchingTileNode(Pos:Vec2):Node{
        if(this.isTouching(Pos)){
            this._isTileOnCell = false;
            return this._boundTile;
        }
    }

    public isTouching(Pos:Vec2):Boolean{
        const tileUI = this.node.getComponent(UITransform);
        const localPos = tileUI.convertToNodeSpaceAR(Pos.toVec3());
        const width = tileSize;
        const height =tileSize; 
        if (localPos.x >= -width/2 &&localPos.x <= width/2 &&
                localPos.y >= -height/2 &&localPos.y <= height/2){
            return true;
        }
        else return false;
    }

    public isTileOnCell():Boolean{
        return this._boundTile&&this._boundTile.getComponent(BaseLetterTile).isOnHandCell;
    }

    public isEmptyCell():Boolean{
        return !this.isTileOnCell();
    }

    public RollBackTile(){
        this._boundTile.getComponent(BaseLetterTile).RollBackPosition();
        this._isTileOnCell = true;
    }

    public BoundTile(Tile:Node){
        this._boundTile = Tile;
    }

    public init(rank:number,pos:Vec3){
        this._rank = rank;
        this.node.position = pos;
    }

    public get boundTile():Node{
        return this._boundTile;
    }

    public get cellRank(){
        return this._rank;
    }
}