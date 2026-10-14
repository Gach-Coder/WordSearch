import { _decorator } from 'cc';
import { BoardManager } from './BoardManager';
import { LetterTile } from './LetterTile';
import { BaseHandManager } from '../BaseHandManager';
import { GridPos } from '../BaseBoardManager';
const { ccclass } = _decorator;

@ccclass('HandManager')
export class HandManager extends BaseHandManager {
    public static instance : HandManager = null;
    onLoad(): void {
        HandManager.instance = this;
    }

    public GetCollisionGrid() : GridPos{
        return BoardManager.instance.getGridPos(this.touchTileNode.getComponent(LetterTile).getTileWorldPosition());
        
    }

    public DeployTile() {
        const gPos = this.GetCollisionGrid();
        const tileCmpnt = this.touchTileNode.getComponent(LetterTile);
    
        if(gPos){//棋盘内
            if(BoardManager.instance.isPlaceable(gPos)){
                tileCmpnt.handlePlacement(gPos);
                BoardManager.instance.DeployCell(gPos,this.GetTouchTileNode());//暂时挂在棋盘上
                this.TileHand2Bound(this.touchTileNode);
            }
            else{//不可放置
                this.RollBackTile(tileCmpnt);
            }
        }
        else {
            this.RollBackTile(tileCmpnt);
        }
        this.touchTileNode = null;
    }
}


