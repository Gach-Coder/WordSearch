import { _decorator, Component, Node,Button,Input,UITransform,EventTouch,Label, Vec2 } from 'cc';
import { KeyBoard } from './KeyBoard';
const { ccclass, property } = _decorator;

@ccclass('KeyBoardTile')
export class KeyBoardTile extends Component {
    private char:string = null;
    private id:number = null;

    onLoad(){
        this.node.on(Input.EventType.TOUCH_START,this.ClickLetter,this);
    }

    public init(char:string,pos:Vec2,size:number){
        this.char = char;
        const labelNode = this.node.getChildByName("LetterLabel");
        const label = labelNode.getComponent(Label);
        label['fontSize'] = size*0.88;
        label['lineHeight'] = size*0.9;
        label.string = char;
        this.node.getComponent(UITransform).setContentSize(size,size+10);
        this.node.setPosition(pos.toVec3());
    }

    private ClickLetter(event: EventTouch){
        const uiTransform = this.node.getComponent(UITransform);
        if(!uiTransform)console.error("No UITransform");
        const localPos = uiTransform.convertToNodeSpaceAR(event.getUILocation().toVec3())
        if(Math.abs(localPos.x)<uiTransform.contentSize.x/2&&Math.abs(localPos.y)<uiTransform.contentSize.y/2){
            KeyBoard.instance.HitKeyBoardLetter(this.char);
        }
    }

    protected onDestroy(): void {
        this.node?.off(Input.EventType.TOUCH_START,this.ClickLetter,this);
    }
}


