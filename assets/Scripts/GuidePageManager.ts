import { _decorator, Component, Node, Button, Enum, Label, Prefab, instantiate, UITransform, Vec2, Vec3, Color } from 'cc';
import { PageManager, PageType } from './PageManager'; 
import { GameType, MaxLevel } from './GameDatabase';
import { GuideLevelButton } from './GuideLevelButton';
import { DifficultyPage } from './DifficultyPage';
import { LevelPage } from './LevelPage';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

// 难度枚举
export enum GameDifficulty {
    EASY = 0,   // 休闲 // easy
    NORMAL = 1, // 挑战 // normal
    HARD = 2    // 困难 // hard
}
export const GameDifficultyCN = ['休闲','挑战','困难']

export enum guideSubPage{
    DIFFICULTY_PAGE,
    LEVEL_PAGE
}

export const TouchableColor = new Color('FFFFFF');
export const NonTouchableColor = new Color('ADADAD');

const Default_Game: GameType = GameType.FINDLINE;
const Default_Dif: GameDifficulty = GameDifficulty.NORMAL;
const Default_Level: number = 1;

@ccclass('GuidePageManager')
export class GuidePageManager extends Component {
    // 单例（方便LevelPage调用返回方法）
    public static instance: GuidePageManager = null!;

    // ===================== 编辑器绑定节点 =====================
    //子页面 
    @property(Node)
    private DifPage: Node = null!;
    @property(Node)
    private LevelPage: Node = null!;

    private _curGame: GameType = null;
    private _curPage: guideSubPage = null;
    private _curDif: GameDifficulty = null;
    private _curLevel:number = null;

    private LevelPageManager:LevelPage = null;
    private DifPageManager:DifficultyPage = null;

    onLoad() {
        GuidePageManager.instance = this;
        this.LevelPageManager = this.LevelPage.getComponent(LevelPage);
        this.DifPageManager = this.DifPage.getComponent(DifficultyPage);
        if(!this.LevelPageManager||!this.DifPageManager){
            console.error('level page and difficulty Page ts Component not found')
        }
    }

    //入口
    public initial(game:GameType){
        UIManager.instance.SetTopLabelString(game);
        this._curGame = game;
        this.showDifficultyPage(game);
    }

    //页面切换核心方法
    public showDifficultyPage(game:GameType) {
        if(game === null && this._curGame === null){
            game = GameType.FINDLINE;
            this._curGame = game;
        }
        else if(game === null){
            game = this._curGame;
        }
        else {
            this._curGame = game;
        }

        this._curPage = guideSubPage.DIFFICULTY_PAGE;
        UIManager.instance.SetTopLabelString(this._curGame);
        this.DifPage.active = true;
        this.LevelPage.active = false;
        this.DifPageManager.UpdateButtonsUI();
    }

    public showLevelPage(dif:GameDifficulty) {
        if(!dif)dif=GameDifficulty.EASY;
        this._curDif = dif;
        this._curPage = guideSubPage.LEVEL_PAGE
        UIManager.instance.SetTopLabelString(`${this._curGame} : ${GameDifficultyCN[this._curDif]}`);
        this.DifPage.active = false;
        this.LevelPage.active = true;
        this.LevelPageManager.UpdateButtons();
    }

    private GoBack(){
        if(this._curPage === guideSubPage.DIFFICULTY_PAGE){
            PageManager.instance.BackHomePage();
        }
        else{
            this.showDifficultyPage(this._curGame);
        }
    }

    public LoadGame(level:number){
        //this._curGame//this._curDif//level
        this._curLevel = level;
        switch (this._curGame) {
            case GameType.CHESS:
                break;
            case GameType.FINDLINE:
                break;
            case GameType.WORDCHAIN:
                break;
            case GameType.WORDPOP:
                break;
        }

        PageManager.instance.LoadGamePage(this._curGame);
    }

    public initLevelButtons(){
        this.LevelPageManager.UpdateButtons();
    }

    public get cur_Game():GameType{
        return this._curGame!==null?this._curGame:Default_Game;
    }

    public get cur_Dif():GameDifficulty{
        return this._curDif!==null?this._curDif:Default_Dif;
    }

    public get cur_Level():number{
        return this._curLevel!==null?this._curLevel:Default_Level;
    }

    public isDifPage():boolean{
        return this._curPage === guideSubPage.DIFFICULTY_PAGE
    }

    public isLevelPage():boolean{
        return this._curPage === guideSubPage.LEVEL_PAGE
    }

    public ChooseDifficulty(dif:GameDifficulty){
        this._curDif = dif;
    }

    public ChooseLevel(level:number){
        this._curLevel = level;
    }

    protected onDestroy(): void {
    }
}
