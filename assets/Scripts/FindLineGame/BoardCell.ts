import { _decorator, Component, Node, Label, Vec2 ,UITransform,tween,Vec3} from 'cc';
const { ccclass, property, disallowMultiple } = _decorator;
import { GridRC } from './BoardManager';

@ccclass('BoardCell')
@disallowMultiple
export class BoardCell extends Component {
    // 格子行列索引
    public row: number = 0;
    public col: number = 0;
    public gridRC: GridRC = null;
    // 格子字母（大写存储）
    public letter : string = '';
    private size : number = 60;

    @property(Label)
    private letterLabel: Label = null!; // 字母显示标签

    public setLetter(letter: string): void {
        this.letter = letter.toUpperCase();
        this.letterLabel.string = this.letter;
    }

    public init(row: number, col: number, localpos_x:number, localpos_y:number, size: number, letter: string) {
        this.row = row;
        this.col = col;
        this.gridRC = {row:row,col:col};
        this.size = size;
        this.node.name = `Cell_${this.row}_${this.col}`;
        if(letter)this.setLetter(letter);
        this.node.setPosition(localpos_x,localpos_y);//local
        //this.node.getComponent(UITransform)?.setContentSize(size,size);
        this.letterLabel['fontSize'] = size;
        this.letterLabel['lineHeight'] = size;
    }

    public getWorldPos(): Vec2 {
        return this.node.getWorldPosition().toVec2();
    }

    public onNode(pos:Vec2):boolean{//同父节点local坐标
        const NodePos = this.getWorldPos();
        return (pos.x-NodePos.x<this.size)&&(pos.y-NodePos.y<this.size);
    }

    public tweenEffect(){
        tween(this.node)
            .to(0.3, { scale: new Vec3(1.25, 1.25, 1) }) // 放大
            .to(0.3, { scale: new Vec3(1, 1, 1) })    // 还原
            .start();
    }
}