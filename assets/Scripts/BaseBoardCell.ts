import { _decorator, Color, Component,Node, Label, UITransform, Vec2, SpriteFrame, Sprite } from "cc";
import { UIManager } from "./UIManager";
import { BaseLetterTile } from "./BaseLetterTile";

const { ccclass, property } = _decorator;

export const BlankCellColor = Color.WHITE;
export const HoverCellColor = new Color(224,224,224);
export const RelatedCellColor = new Color("7EFF7E");
export const OccupiedLetterlColor = new Color('3D2713');
export const PendingLetterColor = new Color('FFB26B');

// 内联整合CellState枚举
export enum CellState {
    BLANK = 'blank',         // 空白状态：无Tile，可交互
    HOVER = 'hover',         // 悬停状态：Tile在Cell上空，待放置
    PENDING = 'pending',     // 待定状态：Tile暂时放置，未组成有效单词
    RESOLVED = 'resolved',   // 解决状态：Tile已组成有效单词，待用户确认
    OCCUPIED = 'occupied'    // 占用状态：过去回合放置，不可改动
    //RELATED = 'related' //组成相关单词
}
//B→H→P→R→O                 //顺序的状态转化
//H→R                       //跳步的状态转化//忽略//BoundTileNode在H→P
//H→B,P→B,R→B,P→H,R→H,R→P   //逆序的状态转化

@ccclass('BaseBoardCell')
export class BaseBoardCell extends Component {
    protected _row: number = -1;          // 私有化行坐标
    protected _col: number = -1;          // 私有化列坐标
    protected _size: number = 0;
    protected _currentState : CellState = null; // 当前状态
    protected _boundTileNode : Node | null = null; // 暂时存放绑定的字母块节点
    protected _char: string = ' '; 
    protected crushCount:number = 0;//需要消除的次数

    @property (Label)
    protected charLabel : Label = null!;

    // 添加虚方法声明
    public GetKeyBoardLetter(char:string):void{};
    
    // 实现基类要求的抽象方法
    protected BoundTile(TileNode: Node, char: string): void {
        this._boundTileNode = TileNode;
        if (!char) char = ' ';
        this._char = char;
        if (TileNode) {
            const HoverTile = TileNode.getComponent(BaseLetterTile);
            if (HoverTile) {
                this.SetSameLabelProperty(HoverTile.GetLabel());
                this.SetLabelByKey('string', char);
            } else {
                console.error("TileLabel not bound");
            }

            if (char === ' ') {
                UIManager.instance.OpenKeyBoard((char: string) => {
                    this.GetKeyBoardLetter(char);
                });
            }
        } else {
            this.charLabel.string = ' ';
        }
    }

    protected GetTileSpriteFrame(): SpriteFrame{return UIManager.instance.STD_TileSprite.spriteFrame;};

    public getRow(): number {return this._row;}
    public getCol(): number {return this._col;}
    public getState(): CellState {return this._currentState;}

    //初始化格子坐标（BoardManager创建时调用）
    public init(row: number, col: number, pos_x:number, pos_y:number, size: number) {
        this._row = row;
        this._col = col;
        this._size = size;
        this.node.name = `Cell_${this._row}_${this._col}`;
        this.node.setPosition(pos_x,pos_y);//local
        this.node.getComponent(UITransform)?.setContentSize(size,size);
    
        this.setBlank();//bgimg失效
    
        this.SetLabelByKey('fontSize',this._size*0.9);
        this.SetLabelByKey('lineHeight',this._size*0.9);
        this.SetLabelByKey('shadowOffset',new Vec2(1,1));
        this.SetLabelByKey('shadowBlur',2);
        //this.SetLabelByKey('Color',LetterColorOrange);
    }

    //检查格子空白状态
    public isBlank(): boolean {
        return this._currentState === CellState.BLANK;
    }

    public isHover(): boolean{
        return this._currentState === CellState.HOVER;
    }

    public isPending():boolean{
        return this._currentState === CellState.PENDING;
    }

    public isResolved(): boolean {
        return this._currentState === CellState.RESOLVED;
    }

    public isOccupied(): boolean {
        return this._currentState === CellState.OCCUPIED;
    }

    public isBounded(): boolean{
        return [CellState.OCCUPIED,CellState.PENDING,CellState.RESOLVED].indexOf(this._currentState) >= 0;
    }

    public isTouchable():boolean{
        return [CellState.PENDING,CellState.RESOLVED].indexOf(this._currentState) >= 0;
    }

    public unstable():boolean{
        //unstable状态存在时，玩家无法确认
        return [CellState.HOVER,CellState.PENDING].indexOf(this._currentState) >= 0;
    }

    public isPlaceable():boolean{
        return [CellState.BLANK,CellState.HOVER].indexOf(this._currentState) >= 0;
    }

    public getBoundTile():Node{
        return this._boundTileNode;
    }

    //4个状态之间的7种转换//省略顺序的跳级//程序自动实现
    public Blank2Hover(){
        this._currentState = CellState.HOVER;
        this.node.getComponent(Sprite).color = HoverCellColor;
    }
    
    public Hover2Blank(){
        this._currentState = CellState.BLANK;
        this.node.getComponent(Sprite).color = BlankCellColor;
    }

    public setBlank(){
        this._currentState = CellState.BLANK;
        this._boundTileNode = null;
        this._char = ' ';
        this.charLabel.string = ' ';
        this.node.getComponent(Sprite).color = BlankCellColor;
        this.SetBoundSprite(null,BlankCellColor);
    }
    
    public setHover(){
        this._currentState = CellState.HOVER;
        this._boundTileNode = null;
        this._char = ' ';
        this.charLabel.string = ' ';
        this.node.getComponent(Sprite).color = HoverCellColor;
        this.SetBoundSprite(null,BlankCellColor);
    }

    public SetLabelByKey(key:string,value:any){
        if((key as keyof Label) in this.charLabel)this.charLabel[key] = value;
        else console.log(`Set Invalid Label key : ${key}`);
    }
        
    protected SetBoundSprite(cellSpriteFrame:SpriteFrame,color:Color){
        if(!this.BoundTileSprite){
            console.error("Cell without Sprite Component");
        }
        //if(cellSpriteFrame){
            this.BoundTileSprite.spriteFrame = cellSpriteFrame;
            this.BoundTileSprite.node.getComponent(UITransform)?.setContentSize(this._size,this._size);
        //}
        if(color)this.BoundTileSprite.color = color;
    }
        
    protected SetBoundSpriteColor(color:Color){
        if(!this.BoundTileSprite){
            console.error("Cell without Sprite Component");
        }
        if(color)this.BoundTileSprite.color = color;
    }
        
    protected SetSameLabelProperty(labelStandard:Label){
        ['isBold','color','enableShadow'].forEach(key => {
            this.SetLabelByKey(key,labelStandard[key]);
        });
    }
        
    public SetLabelString(s:string){
        if(this.charLabel)
            this.charLabel.string = s
        else{
                    
        }
    }
        
    protected getLabel(){
        return this.charLabel;
    }
        
    public get char():string{
        return this._char;
    }

    public get BoundTileSprite():Sprite{
        const btsNode = this.node.getChildByName("BoundTileSprite");
        if(btsNode){
            return btsNode.getComponent(Sprite);
        }
        else return null;
    }
    
    public HideBoundTile(){
        this.BoundTileSprite.node.active = false;
    }

    public HideBoundTileCancel(){
        this.BoundTileSprite.node.active = true;
    }

    public Pending2Resolved(){
        this._currentState = CellState.RESOLVED;
        this.SetBoundSpriteColor(RelatedCellColor);
    }

    public Resolved2Pending(){
        this._currentState = CellState.PENDING;
        this.SetBoundSpriteColor(BlankCellColor);
    }

    public Occupied2Related(){
        this.SetBoundSpriteColor(RelatedCellColor);
    }

    public Resolved2Occupied(){
        this._currentState = CellState.OCCUPIED;
        this.charLabel.color = OccupiedLetterlColor;
        this.SetBoundSpriteColor(BlankCellColor);
    }

    public Related2Occupied(){
        this.SetBoundSpriteColor(BlankCellColor);
    }

    public Occupied2Blank(){
        this.setBlank();
    }

    //BoardManager计算出与悬空的tile碰撞
    public collision(tile:Node){
        if(this.isBlank()){
            this.Blank2Hover();
        }
    }
    
    public copy(bc:BaseBoardCell){
        if(bc){
            this._currentState = bc.getState();
            this._char = bc.char;
            this._boundTileNode = bc.getBoundTile();
            this.SetBoundSprite(bc.BoundTileSprite.spriteFrame,bc.BoundTileSprite.color);
            this.SetSameLabelProperty(bc.getLabel());
            this.charLabel.string = this._char;
        }
        else{//第一排copy空格子实现整体上移
            this.setBlank();
        }
    }
    
    // 新增公共方法
    public Hover2Pending(Tile: Node, char: string): void {
        this._currentState = CellState.PENDING;
        this.BoundTile(Tile, char);
        this.SetBoundSprite(this.GetTileSpriteFrame(), BlankCellColor);
        this.node.getComponent(Sprite).color = BlankCellColor;
    }

    public Pending2Hover(): void {
        this.setHover();
        this.BoundTile(null, ' ');
    }

    public Resolved2Hover(): void {
        this.setHover();
        this.BoundTile(null, ' ');
    }

    public Resolved2Blank(): void {
        this.Resolved2Hover();
        this.Hover2Blank();
    }

    public SetOccupied(char: string): void {
        this._currentState = CellState.OCCUPIED;
        this._boundTileNode = null;
        this._char = char;
        this.charLabel.string = char;
        if (char && char != ' ') {
            this.SetBoundSprite(this.GetTileSpriteFrame(), BlankCellColor);
        }
        //this.charLabel[key] = value;
        this.SetLabelByKey('isBold',true);
        this.SetLabelByKey('color', OccupiedLetterlColor);
        this.SetLabelByKey('enableShadow',true)
        this.SetLabelByKey('shadowOffset',new Vec2(1,1))
        this.SetLabelByKey('shadowBlur',2)
    }

    public DeployCancel(): void {
        if (this._currentState === CellState.PENDING) {
            this.Pending2Hover();
            this.Hover2Blank();
        } else if (this._currentState === CellState.RESOLVED) {
            this.Resolved2Hover();
            this.Hover2Blank();
        } else {
            console.error("Unexpected cell state");
        }
    }
}