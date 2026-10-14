import { _decorator, Component, EventTouch, Label, Node } from 'cc';
import { PlayerData } from '../PlayerData';
const { ccclass, property } = _decorator;

@ccclass('InfoArea4WordPop')
export class InfoArea4WordPop extends Component {
    @property(Label)
    private roundsLabel: Label = null;
    @property(Label)
    private gridsLabel: Label = null;
    @property(Label)
    private scoreLabel: Label = null;

    @property(Node)
    private NEWIcon : Node = null;

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
        const score = params.score
        this.roundsLabel.string = `${params.rounds}`;
        this.gridsLabel.string = `${params.grids}`;
        this.scoreLabel.string = `${score}`;
        if(score>=PlayerData.instance.WordPopScore){
            this.NEWIcon.active = true;
        }
        else{
            this.NEWIcon.active = false;
        }
        this.node.active = true;
    }

    protected onDestroy(): void {
        this.node?.off(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    }
}



