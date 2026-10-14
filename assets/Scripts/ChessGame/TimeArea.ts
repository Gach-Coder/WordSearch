import { _decorator, Button, Component, instantiate, Node, Prefab, ProgressBar, Sprite, SpriteFrame } from 'cc';
import { TimeClockManager, timerCountType } from '../TimeClockManager';
import { timePerGame } from '../BaseBoardManager';
import { GuidePageManager } from '../GuidePageManager';
import { EventManager, MyGameEvent } from '../EventManager';
const { ccclass, property } = _decorator;

@ccclass('TimerArea')
export class TimerArea extends Component {
    @property(Button)
    private PauseBtn: Button = null!;
    @property(ProgressBar)
    private TimerBar : ProgressBar = null!;
    @property(Prefab)
    private TimerClockPrefab : Prefab = null!;

    private isPaused: boolean = null;
    private isReady:boolean = null;
    private Timer : TimeClockManager = null;

    private get timePerGame():number{return timePerGame[GuidePageManager.instance.cur_Dif]}

    @property(SpriteFrame)
    private pausePNG:SpriteFrame = null;
    @property(SpriteFrame)
    private ResumePNG:SpriteFrame = null;

    protected onLoad(): void {
        this.PauseBtn.node.on(Button.EventType.CLICK,this.Press, this);
    }

    protected start(): void {
        this.TimerInit();
    }

    private TimerInit(){
        const TimerNode = instantiate(this.TimerClockPrefab);
        this.node.addChild(TimerNode);
        this.Timer = TimerNode.getComponent(TimeClockManager);
        if(!this.Timer){
            console.error("No timer found");
        }
        this.isReady = true;
    }

    update(deltaTime: number) {
        //progressBar
        if(this.isReady){
            if(!this.isPaused&&this.Timer.isWorking()){
                this.TimerBar.progress = this.Timer.getCurrentTime()/this.timePerGame;
            }
        }
    }

    private TimerPause(){//计时暂停
        this.isPaused = true;
        this.Timer.pauseTimer();
        EventManager.instance.emit(MyGameEvent.PAUSE_GAME)
    }
    
    private TimerContinue(){
        this.isPaused = false;
        this.Timer.resumeTimer();
        EventManager.instance.emit(MyGameEvent.RESUME_GAME)
    }
    
    public PauseButtonPress(){
        this.isPaused = true;
        this.UpdateUI();
        this.TimerPause();
    }
        
    public PauseButtonResume(){
        this.isPaused = false;
        this.UpdateUI();
        this.TimerContinue();
    }

    private Press(){
        if(this.isPaused){
            this.PauseButtonResume();
        }
        else{
            this.PauseButtonPress();
        }
    }
    
    public stopTimer(){
        this.Timer.stopTimer();
    }
    
    private UpdateUI(){
        this.PauseBtn.getComponent(Sprite).spriteFrame = this.isPaused?this.pausePNG:this.ResumePNG;
    }

    public ResetTimerAndBar(gameover){
        this.TimerBar.progress = 1; // 1 = 100%
        this.Timer.resetTimer(null,timerCountType.countDown,this.timePerGame);
        //this.Timer.startTimer(this.GameOver);
        this.Timer.startTimer(gameover);
        this.PauseButtonResume();
    }

    public SupplyTimer(add:number=15){
        this.Timer.addTimer(add);
    }

    public DeclineTimer(del:number = 5){
        this.Timer.addTimer(-del)
    }

    public KeepFullBarAndStop(){
        this.TimerBar.progress = 1;
        this.isPaused = true;
    }
    
    protected onDestroy(): void {
        this.PauseBtn.node?.off(Button.EventType.CLICK,this.Press, this);
    }  
}


