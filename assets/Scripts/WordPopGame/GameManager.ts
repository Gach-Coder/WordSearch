import { _decorator, Component, Node, Label,Button,input,Input,TextAsset,EventTouch,UITransform,Prefab,resources,JsonAsset, AudioSource, Sprite, ProgressBar, instantiate, director, Scene, tween, Vec3, UIOpacity, Tween, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;
import { BoardManager } from './BoardManager';
import { HandManager } from './HandManager';
import { AudioManager } from '../AudioManager';
import { sleep } from '../Tools';
import { PlayerData } from '../PlayerData';
import { GuidePageManager } from '../GuidePageManager';
import { UIManager } from '../UIManager';
import { TimerArea } from './TimerArea';
import { BaseGameManager, GameMode } from '../BaseGameManager';
import { EventManager, MyGameEvent } from '../EventManager';
import { GameType } from '../GameDatabase';

@ccclass('GameManager')
export class GameManager extends BaseGameManager {
    public readonly gameType = GameType.WORDPOP;
    @property(TimerArea)
    public TimerArea:TimerArea = null!;

    public static instance: GameManager = null!; // 单例
    private _score: number = 0; // 当前得分
    public get score():number{return this._score}

    private isPaused = null;

    protected get boardM() : BoardManager{return BoardManager.instance};
    protected get handM() : HandManager{return HandManager.instance};

    onLoad() {
        GameManager.instance = this; // 初始化单例
        this.onEventListeners();
    }

    public async OnGamePage(game:GameType){//PageManager抛出ENTER_GAME事件//入口
        if(this.gameType!==game)return;
        if(!this.node.active)return;
        if(!this.isloaded){
            this.isloaded = true;
            await sleep(50);
        }

        if(this.dif!==null&&this.dif === GuidePageManager.instance.cur_Dif&&this.gameReady){//继续
            this.GameStartLabelEffect();
            this.PauseButtonResume();
        }
        else{//新难度//SuccessWindow//FailWindow重新游戏
            this.dif = GuidePageManager.instance.cur_Dif;
            await this.ResetGame();
        }
    }

    protected start(): void {
        this.mode = GameMode.STATIC;
        this.gameReady = false;
        this.GameStartLabel.node.active = false;
    }

    public async ResetGame(){
        if(!this.node.active)return;
        this.TimerArea.KeepFullBarAndStop()
        this.isDraggingTile = false;

        this._score = 0;
        this.updateScoreLabels();

        this.gameReady = false;
        this.GameStartLabelEffect();
        
        this.ResetAllEvents();
        UIManager.instance.HideAllWindows();
        
        HandManager.instance.LettersChange();
        BoardManager.instance.ResetGame();

        this.DisableAllEvents();
        await sleep(1200);//禁止用户在初始化动画时提前deploy
        this.EnableAllEvents();
        this.gameReady = true;
        this.ResetTimerAndBar();
    }

    protected LetterChangeButton(): void {
        this.LettersChange();
        //换牌按钮消耗代价
        this.LetterChangeButtonCost(5)
    }

    protected LetterChangeButtonCost(t:number = 5){
        this.TimerArea.DeclineTimer(t);
    }

    public PauseButtonPress(){
        if(this.node.active)
        this.TimerArea.PauseButtonPress();
    }

    public PauseButtonResume(){
        if(this.node.active)
        this.TimerArea.PauseButtonResume();
    }

    public GoNextLevel(){
        if(!this.node.active)return;
        this.ResetGame();
    }

    public ResetTimerAndBar(){
        this.TimerArea.ResetTimerAndBar(this.GameOver);
    }

    // 添加得分（放置数量 × 单词数）
    public AddScore(add:number) {
        this._score += add;
        this.updateScoreLabels();
    }

    // 更新得分显示
    private updateScoreLabels() {
        UIManager.instance.SetTopLabelString(`得 分 ：${this._score}`);
    }

    public async DeployConfirm(){
        if(BoardManager.instance.isAllResolved()){
            
            AudioManager.instance.SingleSuccess();
            
            const addScore = BoardManager.instance.ResolvedConfirm();//调用GameManager.instance.SupplyTimer( );

            this.AddScore(addScore);

            await sleep(200);

            if(BoardManager.instance.isEmptyBoard()){
                this.GameSuccess(this._score);
                PlayerData.instance.WordPopNewRecord(this._score);
                PlayerData.instance.WordPopLevelUp(this.dif);
                return;
            }
            
            if(this.mode == GameMode.DYNAMIC){
                if(BoardManager.instance.isReachingTop()){
                    this.GameOver();
                    return;
                }
                else{
                    BoardManager.instance.NewNextRound();
                }
            }

            HandManager.instance.NextRound(false);
        }
        else{
            AudioManager.instance.SingleFailure();
        }
    }

    private GameSuccess(_score:number){
        this.OffTouchListeners();
        //this.offButtons();
        this.TimerArea.stopTimer()
        this.gameReady = false;
        UIManager.instance.OpenNextLevelWindow({score:_score,rounds:this.roundCount,grids:this.crashGrids});
    }

    public get roundCount():number{
        return this.boardM.crashTurns;
    }
    
    public get crashGrids():number{
        return this.boardM.crashGrids;
    }

    //!!!GameOver方法在Timer外部调用,this.FailWindowPageNode会报错
    private GameOver(){
        const gm = GameManager.instance;
        gm.OffTouchListeners();
        gm.offBottomButtons();
        gm.TimerArea.stopTimer();
        gm.gameReady = false;
        UIManager.instance.OpenFailWindow({'rounds':gm.roundCount,'grids':gm.crashGrids});
    }

    private onEventListeners(){
        EventManager.instance.on(MyGameEvent.ENTER_GAME,this.OnGamePage,this);
        EventManager.instance.on(MyGameEvent.NEXT_GAME,this.GoNextLevel,this);
        EventManager.instance.on(MyGameEvent.RESET_GAME,this.ResetGame,this);
        EventManager.instance.on(MyGameEvent.GO_BACK,this.PauseButtonPress,this);
        EventManager.instance.on(MyGameEvent.TEMPWINDOW_ON,this.PauseButtonPress,this);
        EventManager.instance.on(MyGameEvent.TEMPWINDOW_OFF,this.PauseButtonResume,this);
        EventManager.instance.on(MyGameEvent.PAUSE_GAME,this.PauseGame,this)
        EventManager.instance.on(MyGameEvent.RESUME_GAME,this.ResumeGame,this)
    }

    private offEventListeners(){
        if(this.node.isValid&&!this.node.active)return;
        EventManager.instance.off(MyGameEvent.ENTER_GAME,this.OnGamePage,this);
        EventManager.instance.off(MyGameEvent.NEXT_GAME,this.GoNextLevel,this);
        EventManager.instance.off(MyGameEvent.RESET_GAME,this.ResetGame,this);
        EventManager.instance.off(MyGameEvent.GO_BACK,this.PauseButtonPress,this);
        EventManager.instance.off(MyGameEvent.TEMPWINDOW_ON,this.PauseButtonPress,this);
        EventManager.instance.off(MyGameEvent.TEMPWINDOW_OFF,this.PauseButtonResume,this);
        EventManager.instance.off(MyGameEvent.PAUSE_GAME,this.PauseGame,this)
        EventManager.instance.off(MyGameEvent.RESUME_GAME,this.ResumeGame,this)
    }

    protected onDestroy(): void {
        this.offEventListeners();
        super.onDestroy()
    }
}