import { _decorator, Button, Component, EventTouch, Label, Node } from 'cc';
import { PageManager, PageType } from './PageManager';
import { EventManager, MyGameEvent } from './EventManager';
//import { GameManager as Gmnr1 } from './WordPopGame/GameManager';
//import { GameManager as Gmnr2 } from './ChessGame/GameManager';
const { ccclass, property } = _decorator;

@ccclass('FailWindow')
export class FailWindow extends Component {
    @property(Button)
    private HomeBtn: Button = null!;
    @property(Button)
    private ShareBtn: Button = null!;
    @property(Button)
    private RestartBtn: Button = null!;

    @property(Label)
    private roundsLabel: Label = null;
    @property(Label)
    private gridsLabel: Label = null;

    protected onLoad(): void {
        this.onButtons();
        this.node.on(Node.EventType.TOUCH_START,this.DisableEvent,this);//拦截下方的按钮点击交互
    }

    private DisableEvent(event:EventTouch){
        event.propagationStopped = true;
    }

    public OpenWindow(params: Record<string, any>){
        this.node.active = true;
        //ChessGame//WordPop共用
        this.gridsLabel.string = `${params.grids}`
        this.roundsLabel.string = `${params.rounds}`
    }

    private onButtons(){
        this.HomeBtn.node.on(Button.EventType.CLICK, this.BackHomePage, this);
        this.ShareBtn.node.on(Button.EventType.CLICK, this.Share, this);
        this.RestartBtn.node.on(Button.EventType.CLICK, this.Restart, this);
    }

    private offButtons(){
        this.HomeBtn.node?.off(Button.EventType.CLICK, this.BackHomePage, this);
        this.ShareBtn.node?.off(Button.EventType.CLICK, this.Share, this);
        this.RestartBtn.node?.off(Button.EventType.CLICK, this.Restart, this);
    }

    private BackHomePage(){
        this.node.active = false;
        PageManager.instance.BackHomePage();
    }

    private Share(){

    }

    private Restart(){
        this.node.active = false;
        EventManager.instance.emit(MyGameEvent.RESET_GAME);
    }

    protected onDestroy(): void {
        this.offButtons();
        this.node?.targetOff(this)//拦截下方的按钮点击交互
    }
}


