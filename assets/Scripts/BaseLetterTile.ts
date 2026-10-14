import { _decorator, Component, Label, Node, Size, Sprite, tween, Tween, UITransform, Vec2, Vec3 } from 'cc';
import { GridPos, TouchingTileTransparency } from './BaseBoardManager';
import { tileSize } from './BaseHandManager';
const { ccclass, property } = _decorator;

// 公共枚举
export enum TileState {
    HAND = "hand",
    FOLLOWING = "following",
    HOVERING = "hovering",
    PLACED = "placed"
}

@ccclass('BaseLetterTile')
export class BaseLetterTile extends Component {
    protected tileState: TileState = null;
    protected _char: string = null;
    protected attachPos: GridPos = null;
    protected currentMoveTween: Tween<Node> | null = null;
    protected _initTileCell: Node = null;

    @property(Label)
    protected letterLabel: Label = null;

    onLoad() {
    }

    protected start(): void {
        this.attachPos = null;
        this.getComponent(UITransform).setContentSize(tileSize, tileSize);
    }

    public init(char: string, pos: Vec3) {
        this.node.getComponent(UITransform).setContentSize(new Size(100,100));
        this.node.position = pos;
        this.tileState = TileState.HAND;
        this._char = char;
        if (this.letterLabel) this.letterLabel.string = char;
        this.currentMoveTween = null;
        this.TileNotOnBoard();
    }

    public GetLabelByKey(key: string): any {
        if ((key as keyof Label) in this.letterLabel) return this.letterLabel[key];
        else return null;
    }

    public GetLabel(): Label {
        return this.letterLabel;
    }

    protected setTileState(state: TileState) {
        this.tileState = state;
    }

    public onTouchMove_(movePos: Vec2) {
        this.attachPos = null;
        this.setTileState(TileState.FOLLOWING);
        this.node.setPosition(this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(movePos.toVec3()));
    }

    public handlePlacement(gPos: GridPos) {
        if (gPos) {
            this.Attach2Cell(gPos);
        } else {
            this.RollBackPosition();
        }
    }

    protected Attach2Cell(gPos: GridPos) {
        this.node.active = false;
        this.attachPos = gPos;
        this.setTileState(TileState.PLACED);
    }

    public RollBackPosition() {
        this.node.position = this._initTileCell.position;
        this.TileNotOnBoard();
        this.setTileState(TileState.HAND);
    }

    public UpdateTileCell(CellNode: Node) {
        this._initTileCell = CellNode;
    }

    public TileOnBoard() {
        const _sprite = this.node.getComponent(Sprite);
        if (!_sprite) { console.error('Tile no sprite\n'); return; }
        const newColor = _sprite.color.clone();
        newColor.a = TouchingTileTransparency;
        _sprite.color = newColor;
    }

    public TileNotOnBoard() {
        this.node.active = true;
        const _sprite = this.node.getComponent(Sprite);
        if (!_sprite) { console.error('Tile no sprite\n'); return; }
        const newColor = _sprite.color.clone();
        newColor.a = 255; // 修复原代码256的bug
        _sprite.color = newColor;
    }

    public getTileWorldPosition(): Vec3 {
        return this.node.getWorldPosition();
    }

    public ResetTile2Hand2(pos?: Vec3) {
        this.TileNotOnBoard();
        this.node.active = true;
        this.setTileState(TileState.HAND);
    }

    public isSameTileNode(Tile: Node): boolean {
        if (Tile.getComponent(BaseLetterTile)) {
            const targetTile = Tile.getComponent(BaseLetterTile);
            if (this.attachPos.col === targetTile.attachPos.col) {
                if (this.attachPos.row === targetTile.attachPos.row) {
                    if (this._char != targetTile.char) {
                        console.error('003:bound state messy.\n');
                    }
                    return true;
                }
            }
        }
        return false;
    }

    public get char() {
        return this._char;
    }

    public get BoundTileCell() {
        return this._initTileCell;
    }

    public get isOnHandCell() {
        return this.tileState === TileState.HAND;
    }

    public get state() {
        return this.tileState;
    }

    public get HasValidBoundedCell() {
        return this._initTileCell && this._initTileCell.getComponent("TileCell");
    }

    public MoveEffect(posEnd: Vec3, duration: number = 0.15) {
        if (this.currentMoveTween) {
            this.currentMoveTween.stop();
            this.currentMoveTween = null;
        }

        this.currentMoveTween = tween(this.node)
            .to(duration, { position: posEnd }, { easing: "smooth" })
            .call(() => {
                this.currentMoveTween = null;
            })
            .start();
    }

    public stopCurrentMoveTween() {
        if (this.currentMoveTween) {
            this.currentMoveTween.stop();
            this.currentMoveTween = null;
        }
    }
}