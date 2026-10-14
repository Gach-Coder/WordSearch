import { _decorator, Component, EventTouch, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InfoArea4ChessGame')
export class InfoArea4ChessGame extends Component {
    @property(Label)
    private roundsLabel: Label = null;

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    }
    
    protected start(): void {
    }

    //this.node.on(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    private DisableEvent(event:EventTouch){
        event.propagationStopped = true;
    }

    public OpenWindow(params: Record<string, any>){
        this.roundsLabel.string = `${params.rounds}`;
    }

    protected onDestroy(): void {
        this.node?.off(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    }
}



