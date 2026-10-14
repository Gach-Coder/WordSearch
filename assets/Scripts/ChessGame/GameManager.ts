import { _decorator, Component, Node, Label,Button,input,Input,TextAsset,EventTouch,UITransform,Prefab,resources,JsonAsset, AudioSource, Sprite, ProgressBar, instantiate, director, Scene, tween, Vec3, UIOpacity, Tween, assetManager } from 'cc';
const { ccclass, property } = _decorator;
import { BoardManager, PropAndFlagData } from './BoardManager';
import { HandManager } from './HandManager';
import { sleep } from '../Tools';
import { timePerGame } from './GameCfgData';
import { PlayerData } from '../PlayerData';
import { GuidePageManager } from '../GuidePageManager';
import {  UIManager } from '../UIManager';
import { TimerArea } from './TimeArea';
import { BaseGameManager, GameMode } from '../BaseGameManager';
import { AudioManager } from '../AudioManager';
import { EventManager, MyGameEvent } from '../EventManager';

// 严格匹配JSON结构
export interface LevelItem {
    level: number;
    grids: number[][];
}

interface DifficultyConfig {
    difficulty: number;
    grid_size: number[];
    levels: LevelItem[];
}

@ccclass('GameManager')
export class GameManager extends BaseGameManager {
    public static instance: GameManager = null; // 单例

    @property(TimerArea)
    private TimerArea:TimerArea = null!;
    
    private cur_flags : number = null;
    private cur_prop : boolean = null;

    public grids :number[][]= null;
    private allDifficultyConfigs: DifficultyConfig[] = [];

    protected get boardM() : BoardManager{return BoardManager.instance};
    protected get handM() : HandManager{return HandManager.instance};

    @property(Button)
    protected btnConfirm: Button = null!;
    @property(Button)
    protected btnCancel: Button = null!;
    @property(Button)
    protected btnChange: Button = null!;
        
    protected isDraggingTile:boolean = false;
    public dif: number = null;
    public level : number = null;
    protected get timePerGame():number{return timePerGame[GuidePageManager.instance.cur_Dif]}
    public get sum_flags():number{
        return BoardManager.instance.sum_flags;
    }
    public get roundCount():number{
        return this.boardM.crashTurns;
    }
    
    public get crashGrids():number{
        return this.boardM.crashGrids;
    }

    onLoad() {
        GameManager.instance = this; // 初始化单例
        this.onEventListeners();
    }

    public async OnGamePage(){//PageManager直接调用//入口
        if(!this.node.active)return;
        if(!this.isloaded){
            this.isloaded = true;
            await sleep(50);
        }

        if(this.dif !== null && this.dif === GuidePageManager.instance.cur_Dif && this.gameReady){//继续
            this.GameStartLabelEffect();
            this.TimerArea.PauseButtonResume();
            this.UpdateLabelOnTop();
        }
        else{//新难度//SuccessWindow//FailWindow重新游戏
            this.dif = GuidePageManager.instance.cur_Dif;
            await this.ResetGame();
        }
    }

    public async ResetGame(){
        if(!this.node.active)return;
        this.isDraggingTile = false;
        this.cur_flags = 0;
        this.cur_prop = false;

        this.gameReady = false;
        this.GameStartLabelEffect();
        this.gameReady = true;

        this.ResetAllEvents();
        this.CloseKeyBoardWindow();
        
        await this.loadLevelConfig();
        this.grids = this.getLevelgrids(PlayerData.instance.ChessGameLevel[this.dif]);


        HandManager.instance.LettersChange();
        await BoardManager.instance.ResetGame(this.grids);

        this.TimerArea.ResetTimerAndBar(this.GameOver);

        this.UpdateLabelOnTop();
    }

    protected start(): void {
        this.CloseKeyBoardWindow();
        this.gameReady = false;
        this.GameStartLabel.node.active = false;
    }

    // 加载配置文件
    private loadLevelConfig(): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.load<JsonAsset>('ChessLevelConfig', (err, asset) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.allDifficultyConfigs = asset.json as DifficultyConfig[];
                resolve();
            });
        });
    }

    // 核心：获取关卡数据（无多余接口，直接返回原生对象）
    private getLevelgrids(level: number):number[][] {
        // 查找难度
        const diffConfig = this.allDifficultyConfigs.find(item => item.difficulty === this.dif);
        if (!diffConfig) {
            return null;
        }
        // 查找关卡
        const levelData = diffConfig.levels.find(item => item.level === level);
        if (!levelData) {
            return null;
        }

        // 直接返回转换后的数据，不定义额外接口
        return levelData.grids
    }

    private UpdateLabelOnTop(){
        UIManager.instance.SetTopLabelString(`目标：${this.cur_flags} / ${this.sum_flags}`);
    }

    public GoNextLevel(){
        if(!this.node.active)return;
        this.level ++;
        PlayerData.instance.ChessGameLevelUp(this.dif);
        this.ResetGame();
    }

    //protected DeployConfirm(){}

    protected async DeployConfirm(){
        if(BoardManager.instance.isAllResolved()){
            
            AudioManager.instance.SingleSuccess();

            this.UpdatePropsAndFlags(BoardManager.instance.ResolvedConfirm());

            await sleep(200);//补充手牌间隙

            if(this.isGainAllFlags()){
                this.GameSuccess();
                return;
            }         

            HandManager.instance.NextRound(this.cur_prop);
            this.cur_prop = false;
        }
        else{
            AudioManager.instance.SingleFailure();
        }
    }


    private isGainAllFlags():boolean{
        return this.cur_flags >= this.sum_flags;
    }

    private UpdatePropsAndFlags(delta:PropAndFlagData){
        this.cur_flags += delta.flag;
        this.cur_prop = delta.prop;
        this.UpdateLabelOnTop()
    }

    private GameSuccess(){
        this.OffTouchListeners();
        this.offBottomButtons();
        this.TimerArea.stopTimer();
        this.gameReady = false;
        UIManager.instance.OpenNextLevelWindow({rounds:BoardManager.instance.crashTurns});
    }

    protected LetterChangeButton(): void {
        this.LettersChange();
        //换牌按钮消耗代价
        this.LetterChangeButtonCost(10)
    }

    protected LetterChangeButtonCost(t:number){
        this.TimerArea.DeclineTimer(t);
    }
    
    //!!!GameOver方法在Timer外部调用,不能用this
    private GameOver(){
        const gm = GameManager.instance;
        gm.OffTouchListeners();
        gm.offBottomButtons();
        gm.TimerArea.stopTimer();

        gm.gameReady = false;
        UIManager.instance.OpenFailWindow({'rounds':gm.roundCount,'grids':gm.crashGrids});
    }

    public PauseButtonPress(){
        if(this.node.active)
            this.TimerArea.PauseButtonPress();
    }

    public PauseButtonResume(){
        if(this.node.active)
            this.TimerArea.PauseButtonResume();
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
        this.node?.targetOff(this)
        this.offEventListeners();
        super.onDestroy();
    }
}