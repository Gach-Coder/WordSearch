import { _decorator, Component, instantiate, Node, Prefab, Vec2,Label, UITransform,Input, EventTouch, Button} from 'cc';
import { KeyBoardTile } from './KeyBoardTile';
const { ccclass, property } = _decorator;

const keyboard_letter = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];

export type SingleCharFun = (singleChar:string) => void;

@ccclass('KeyBoard')
export class KeyBoard extends Component {
    public static instance = null;

    @property (Prefab)
    private KeyBoardTilePrefab : Prefab = null!;
    @property (Button)
    private ExitBtn:Button = null!;

    @property private TileSize:number = 66;
    @property private distx:number = 8
    @property private disty:number = 20

    private kbtileNode:Node[] = [];

    private HitChar: SingleCharFun = null;  

    protected onLoad(): void {
        KeyBoard.instance = this;
        this.node.on(Node.EventType.TOUCH_START,this.DisableEvent,this);//拦截下方的按钮点击交互
    }

    private DisableEvent(event:EventTouch){
        event.propagationStopped = true;
    }

    start(){
        this.ExitBtn.node.on(Button.EventType.CLICK,this.CloseWindow,this);
        this.init();
    }

    public OpenWindow(fun:SingleCharFun){
        this.HitChar = fun;
        this.node.active = true;
    }

    public HitKeyBoardLetter(hit_char:string){
        if(this.HitChar)this.HitChar(hit_char);
        this.CloseWindow();
    }

    public CloseWindow(){
        this.HitChar = null;
        this.node.active = false;
    }

    private init(){
        if(this.kbtileNode.length>0){
            this.kbtileNode.forEach(node=>{
                node.destroyAllChildren();
                node.destroy();
            });
            this.kbtileNode = [];
        }
        
        const y = [this.disty+this.TileSize, 0 , -this.TileSize - this.disty]

        keyboard_letter.forEach((letters,yid)=>{
            const posy = y[yid];
            keyboard_letter[yid].split('').forEach((char,cid) => {
                const posx = (this.distx+this.TileSize)*(cid-(keyboard_letter[yid].length-1)/2);
                const tile = instantiate(this.KeyBoardTilePrefab);
                this.node.addChild(tile);
                tile.getComponent(KeyBoardTile).init(char,new Vec2(posx,posy),this.TileSize);
                this.kbtileNode.push(tile);
            });
        })
    }

    protected onDestroy(): void {
        this.node?.targetOff(this);
        this.ExitBtn.node?.targetOff(this);
    }
}


