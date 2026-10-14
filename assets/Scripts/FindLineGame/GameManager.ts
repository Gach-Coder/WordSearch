import { _decorator, Component,resources, Label, Button,JsonAsset,AudioClip,Vec3, AudioSource,tween,Node,Prefab,instantiate, Vec2, UITransform, SpriteFrame, Sprite} from 'cc';
import { BoardManager,GridRC } from './BoardManager';
import {TwoDimDict,LETTER_FREQUENCY,Dictionary} from '../Dictionary';
import { PageManager,PageType } from '../PageManager';
import {sleep} from '../Tools';
import { AudioManager } from '../AudioManager';
import { PlayerData } from '../PlayerData';
import { TimeClockManager,timerCountType } from '../TimeClockManager';
import { dif_words } from './GameData';
import { GameType, MaxLevel } from '../GameDatabase';
import { GuidePageManager } from '../GuidePageManager';
import { UIManager } from '../UIManager';
import { FoundWordsArea } from './FoundWordsArea';
import { EventManager, MyGameEvent } from '../EventManager';
const { ccclass, property } = _decorator;


export type MatchItem = {gridA:GridRC,gridB:GridRC,targetWord:string};
export interface LevelData{
    "difficulty" : number,
    "level" : number,
    "keyword" : string,
    "cn_name" : string,
    "targetWords": string[]
}

enum LoadingState{
    UnLoad,
    Loading,
    Loaded,
    Fail
}

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Label)
    public keywordText: Label = null!; // 关卡关键词显示
    @property(Label)
    public keywordTextCN: Label = null!; // 关卡关键词显示
    @property(Button)
    private btnHint: Button = null!;
    @property(Button)
    private btnChange: Button = null!;

    @property(Label)
    private TimerLabel: Label = null!;//计时标签
    @property(Prefab)
    private TimerClockPrefab : Prefab = null!;

    @property(SpriteFrame)
    private iconVideo: SpriteFrame = null!;
    @property(SpriteFrame)
    private iconBlank: SpriteFrame = null!;

    // 核心数据
    public readonly gameType = GameType.FINDLINE;
    private _currentLevel: number = 1;
    private _currentTargetWords : string[] = null;
    private _allLevels: LevelData[] = []; // 所有关卡数据
    private _currentLevelData: LevelData = null!;

    private _foundTargetWords: string[] = []; // 已找到的目标单词
    private _foundBonusWords: string[] = []; // 已找到的单词
    private _foundItems: MatchItem[] = []; // 已找到的连线

    public static instance: GameManager = null!; // 单例
    private _JsonLoad : LoadingState = LoadingState.UnLoad;
    private Timer: TimeClockManager = null;

    private freeHint: number = 0;//免费的按钮数目
    private freeChange: number = 0;

    private Need2FindWords: number = 0;
    public get dif():number{return this._dif}
    private _dif:number = null;

    public get curTargetWords(): string[]{return this._currentTargetWords}

    // 标记为async，支持await语法
    protected onLoad(): void{
        GameManager.instance = this;
        this.EnableBtns();//游戏内容交互按钮
        this.onEventListeners();//监听其它模块抛出的事件
        EventManager.instance.on(MyGameEvent.ENTER_GAME,this.OnGamePage,this);
    }

    // 返回Promise<void>，封装异步加载逻辑
    private LoadGameConfigData(JsonPath: string): Promise<void> {
        if(this._JsonLoad==LoadingState.Loading||this._JsonLoad ==LoadingState.Loaded)return;
        // 返回Promise，将resources.load的回调逻辑封装
        return new Promise((resolve, reject) => {
            resources.load<JsonAsset>(JsonPath, (err, jsonAsset) => {
                this._JsonLoad = LoadingState.Loading;
                // 错误处理
                if (err) {
                    console.error('加载关卡配置失败：', err.message || err);
                    this._JsonLoad = LoadingState.Fail;
                    return;
                }
                // 空值校验
                if (!jsonAsset || !jsonAsset.json) {
                    this._JsonLoad = LoadingState.Fail;
                    console.error('关卡配置 JsonAsset 为空或无有效数据');
                    return;
                }
                // 类型断言为 LevelData[]（与 JSON 结构匹配）
                const levelData = jsonAsset.json as LevelData[];
                // 数据合法性校验
                if (!Array.isArray(levelData) || levelData.length === 0) {
                    this._JsonLoad = LoadingState.Fail;
                    console.error('关卡配置格式错误，非数组或为空');
                    return;
                }
                // 存储
                this._allLevels = [...levelData];
                this._JsonLoad = LoadingState.Loaded;
                // 加载成功：触发resolve，告知await可以继续执行
                resolve();
            });
        });
    }

    public async LoadCurrentlevel(dif:number,lv:number){
        this._dif = dif;
        this._currentLevel = lv;
        try {
            // 等待配置数据加载完成（核心：await阻塞直到Promise完成）
            await this.LoadGameConfigData("WordCategories");
            // 配置加载完成后，再执行关卡加载
            this.loadLevel(this._currentLevel);
        } catch (err) {
            // 捕获配置加载失败的错误，避免程序卡死
            console.error('游戏配置加载失败，无法加载关卡：', err);
        }
    }

    protected start(): void {
        resources.preload("../../Audio/SFX/FailureAudio");
        resources.preload("../../Audio/SFX/SingleSuccessAudio");
        if(!this.Timer){
            const TimerNode = instantiate(this.TimerClockPrefab);
        this.node.addChild(TimerNode)
        this.Timer = TimerNode.getComponent(TimeClockManager);
        }
        if(!this.Timer){
            console.error("No timer found");
        }
        this.OnGamePage(this.gameType);
    }

    //入口
    public OnGamePage(game:GameType){
        if(this.gameType!==game)return;
        if(!this.node.active)return;
        this.onEventListeners();
        this._dif = GuidePageManager.instance.cur_Dif;
        this.LoadCurrentlevel(GuidePageManager.instance.cur_Dif,GuidePageManager.instance.cur_Level);
    }

    //完成一个单词连线
    private GiveHint(){
        if(this.freeHint > 0){
            this.freeHint --;
        }
        else{
            //看广告
        }

        this.FreshButtonIcon();

        for(let i = 0 ; i < this._currentTargetWords.length ; i++){
            if(this.isFoundedWord(this._currentTargetWords[i]))continue;
            //Hintword
            const hintWord = this._currentTargetWords[i];
            BoardManager.instance.MakeHint(hintWord);
            AudioManager.instance.SingleSuccess();
            break;
        }
    }

    //保留已选中的单词，改变棋盘格局
    private ChangeBoard(){
        if(this.freeChange > 0){
            this.freeChange --;
        }
        else{
            //看广告
        }

        this.FreshButtonIcon();

        BoardManager.instance.initBoard(this._dif);
        const foundWords_save = [...this._foundTargetWords];
        this._foundBonusWords = [];
        this._foundTargetWords = [];
        this._foundItems = [];//连线清除
        //this.FoundWordsLabelClear();
        foundWords_save.forEach(word=>BoardManager.instance.MakeHint(word));
    }

    private FreshButtonIcon(){
        const iconHint = this.btnHint.node.getChildByName('icon');
        const iconChange = this.btnChange.node.getChildByName('icon');

        if(iconChange){
            const sp = iconChange.getComponent(Sprite);
            const labelcount = iconChange.getComponentInChildren(Label);
            if(sp){
                if(this.freeChange <= 0){
                    sp.spriteFrame = this.iconVideo;
                    if(labelcount){
                        labelcount.string = '';
                    }
                }
                else{
                    sp.spriteFrame = this.iconBlank;
                    if(labelcount){
                        labelcount.string = this.freeChange.toString();
                    }
                }
            } 
        }

        if(iconHint){
            const sp = iconHint.getComponent(Sprite);
            const labelcount = iconHint.getComponentInChildren(Label);
            if(sp){
                if(this.freeHint <= 0){
                    sp.spriteFrame = this.iconVideo;
                    if(labelcount){
                        labelcount.string = '';
                    }
                }
                else{
                    sp.spriteFrame = this.iconBlank;
                    if(labelcount){
                        labelcount.string = this.freeHint.toString();
                    }
                }
            } 
        }
    }
    
    // 加载指定关卡
    public loadLevel(levelNum: number): void {
        this.GameDataClear();
        // 查找关卡数据
        const levelData = this._allLevels.find(level => level.level == levelNum&&level.difficulty==(this.dif>0?1:0));
        if (!levelData) {
            console.error(`关卡 ${levelNum} 不存在`);
            return;
        }
        this._currentLevelData = levelData;

        // 更新UI
        this.Need2FindWords = dif_words[this._dif];
        this.keywordText.string = `Key Word : ${this._currentLevelData.keyword}`;
        this.keywordTextCN.string = `关键词：${this._currentLevelData.cn_name}`;

        //顶部标签
        UIManager.instance.SetTopLabelString(`Level ${levelNum} : 0 / ${this.Need2FindWords}`)
        this.updateFoundWordsUI();

        // 生成网格
        if(this.Need2FindWords > this._currentLevelData.targetWords.length){
            console.error("Not enough word in Json file or demand more words");
        }
        this._currentTargetWords = [...this._currentLevelData.targetWords].sort(() => Math.random() - 0.5).slice(0, this.Need2FindWords);
        //this._currentTargetWords = this._currentTargetWords.slice(3).concat(['testabcdef','qwertyuiop','asdfghjklz'])
        BoardManager.instance.SetTargetWords(this._currentTargetWords);
        BoardManager.instance.initBoard(this._dif);
        if(this)this.ResetTimer();

        FoundWordsArea.instance.InitWordsBtnsArea();

        this.freeChange = 2;
        this.freeHint = 2;
        this.FreshButtonIcon();
    }

    private GameDataClear(){
        // 初始化关卡数据
        this._foundTargetWords = [];
        this._foundBonusWords = []
        this._foundItems = [];
        FoundWordsArea.instance.FoundWordsLabelClear();
    }

    private ResetTimer(){
        this.Timer.resetTimer(this.TimerLabel,timerCountType.countUp);
        this.Timer.startTimer();
    }

    private updateFoundWordsUI(){

    }

    public isNewItem(item:MatchItem):boolean{
        if(!item)return false;
        return !(this._foundItems.some(f_item => f_item.gridA.col === item.gridA.col&&f_item.gridA.row === item.gridA.row
            &&f_item.gridB.col === item.gridB.col&&f_item.gridB.row === item.gridB.row));
    }

    public isTargetWord(word:string){
        if(!word)return false;
        return this._currentTargetWords.some(targetword => targetword.toUpperCase() === word.toUpperCase());
    }

    public isFoundedWord(word:string){
        if(!word)return false;
        return this._foundTargetWords.some(f_word=>f_word.toUpperCase()==word.toUpperCase())||
            this._foundBonusWords.some(f_word=>f_word.toUpperCase()==word.toUpperCase());
    }

    public ItemConfirm(item:MatchItem){
        if(!this.isNewItem(item))return;
        //const Word = item.targetWord.charAt(0).toUpperCase().concat(item.targetWord.slice(1).toLowerCase());
        FoundWordsArea.instance.ShowFoundWordLabel(item.targetWord);
        this._foundTargetWords.push(item.targetWord);
        this._foundItems.push(item);
        UIManager.instance.SetTopLabelString(`Level ${this._currentLevel} : ${this._foundTargetWords.length} / ${this.Need2FindWords}`)
        this.checkVictory();
    }

    public AddBonusItem(item:MatchItem){
        if(!this.isNewItem(item))return;
        this._foundBonusWords.push(item.targetWord);
        this._foundItems.push(item);
    }

    // 检查是否通关
    private checkVictory(): void {
        if (this._foundTargetWords.length === this.Need2FindWords) {
            this.NextLevelWindow();
            this.PlayerLevelUp();
        }
    }

    private PlayerLevelUp(){
        //PlayerData
        if(PlayerData.instance&&PlayerData.instance.FLG_lv[this._dif]==this._currentLevel){
            PlayerData.instance.FLG_LevelUp(this._dif);
        }
    }

    private DisableBtns(){
        this.btnHint.node.off(Button.EventType.CLICK, this.GiveHint, this);
        this.btnChange.node.off(Button.EventType.CLICK, this.ChangeBoard, this);
    }

    private EnableBtns(){
        this.DisableBtns();
        this.btnHint.node.on(Button.EventType.CLICK, this.GiveHint, this);
        this.btnChange.node.on(Button.EventType.CLICK, this.ChangeBoard, this);
    }

    public get currentTime():number{
        return this.Timer.getCurrentTime();
    }

    //游戏完成
    private async NextLevelWindow(){
        this.Timer.stopTimer();
        const result = this.currentTime;
        this.UpdateRecord(result);
        await sleep(1000);//延迟打开胜利窗口
        UIManager.instance.OpenNextLevelWindow({result:result,dif:this.dif,level:this.gameLevel});
    }

    public isNewRecord(result:number){
        const record = PlayerData.instance.Get_FLG_TimeCostHistory(this._dif,GameManager.instance.gameLevel);
        return !record||record>result;
    }

    private UpdateRecord(result:number){
        PlayerData.instance.FLG_NewRecord(this._dif,this._currentLevel,result);
    }

    public GoNextLevel(){
        if(!this.node.active)return;
        this.enterNextLevel();
    }

    // 进入下一关
    public enterNextLevel(): void {
        this._currentLevel ++ ;
        if(this._currentLevel > MaxLevel[GameType.FINDLINE][this.dif]){
            this._currentLevel--;
        }
        this.loadLevel(this._currentLevel);
    }
    

    //重新开始
    public ResetGame(){
        if(!this.node.active)return;
        this.loadLevel(this._currentLevel);
    }

    // 重置当前关卡（可选，可绑定到UI按钮）
    public resetCurrentLevel(): void {
        this.loadLevel(this._currentLevel);
    }

    public get gameLevel():number{
        return this._currentLevel;
    }

    private onEventListeners(){
        EventManager.instance.on(MyGameEvent.NEXT_GAME,this.GoNextLevel,this);
        EventManager.instance.on(MyGameEvent.RESET_GAME,this.ResetGame,this);
        EventManager.instance.on(MyGameEvent.GO_BACK,this.offEventListeners,this);
    }

    private offEventListeners(){
        if(this.node.isValid&&!this.node.active)return;
        EventManager.instance.off(MyGameEvent.NEXT_GAME,this.GoNextLevel,this);
        EventManager.instance.off(MyGameEvent.RESET_GAME,this.ResetGame,this);
        EventManager.instance.off(MyGameEvent.GO_BACK,this.offEventListeners,this);
    }

    protected onDestroy(): void {
        EventManager.instance.off(MyGameEvent.ENTER_GAME,this.OnGamePage,this);
        this.offEventListeners();
    }
}