import { _decorator, Component, Node, profiler, tween, Vec3 } from 'cc';
import { GuidePageManager } from './GuidePageManager';
import { GameType } from './GameDatabase';
import { sleep } from './Tools';
import { UIManager } from './UIManager';
import { EventManager, MyGameEvent } from './EventManager';
const { ccclass, property } = _decorator;

// 定义页面类型枚举（新增LOADING加载页）
export enum PageType {
    HOME = 'Home',
    FINDLINE = 'FindLineGame',
    WORDCHAIN = 'WordChainGame',
    CHESS = 'ChessGame',
    WORDPOP = 'WordPopGame',
    GUIDE_PAGE = 'GuidePage',
    LOADING = 'LoadingPage' // 新增加载页
}

export const PageTypeMapGameType: Partial<Record<PageType, GameType>> = {
    [PageType.CHESS]: GameType.CHESS,
    [PageType.FINDLINE]: GameType.FINDLINE,
    [PageType.WORDPOP]: GameType.WORDPOP
};

@ccclass('PageManager')
export class PageManager extends Component {
    // 单例实例（全局唯一）
    public static instance: PageManager = null!;

    // 引用所有页面节点 + 新增LoadingPage
    @property(Node)
    public HomePage: Node = null!;
    @property(Node)
    public FindLinePage: Node = null!;
    @property(Node)
    public WordChainPage: Node = null!;
    @property(Node)
    public ChessPage: Node = null!;
    @property(Node)
    public WordPopPage: Node = null!;
    @property(Node)
    private GuidePage: Node = null!;
    @property(Node) // 新增：加载页节点
    public LoadingPage: Node = null!;

    private cur_Page:PageType = null;

    // 加载过渡时长（秒，可自行调整）
    private readonly LOADING_DELAY = 0.5;

    onLoad() {
        PageManager.instance = this;

        profiler.hideStats();
    }

    /** 工具方法：隐藏所有页面（包含Loading页） */
    private hideAllPages() {
        this.HomePage.active = false;
        this.FindLinePage.active = false;
        this.WordChainPage.active = false;
        this.ChessPage.active = false;
        this.WordPopPage.active = false;
        this.GuidePage.active = false;
        this.LoadingPage.active = false; // 隐藏加载页
    }

    public async LoadPage(targetPage: PageType) {
        // 先隐藏所有页面
        this.hideAllPages();
        // 显示加载页
        this.LoadingPage.active = true;

        this.openTargetPage(targetPage);
        
        await sleep(250);

        this.LoadingPage.active = false;
    }

    public ShowPage(targetPage: PageType){
        this.hideAllPages();
        this.openTargetPage(targetPage);
    }

    public LoadGamePage(game:GameType){
        switch (game) {
            case GameType.CHESS:
                this.LoadPage(PageType.CHESS)
                break;
            case GameType.FINDLINE:
                this.LoadPage(PageType.FINDLINE)
                break;
            case GameType.WORDCHAIN:
                this.LoadPage(PageType.WORDCHAIN)
                break;
            case GameType.WORDPOP:
                this.LoadPage(PageType.WORDPOP)
                break;
        }
    }

    public ShowGuidePage(game:GameType){
        this.hideAllPages();
        this.openTargetPage(PageType.GUIDE_PAGE);
        UIManager.instance.ShowTopArea();
        GuidePageManager.instance.initial(game);
    }

    public BackHomePage(){
        UIManager.instance.TopAreaHideGoBackBtn();
        this.ShowPage(PageType.HOME);
    }

    public GoBack(){
        if(this.isGamePage()){
            //this.PauseGame();
            this.ShowGuidePage(GuidePageManager.instance.cur_Game);
        }
        else if(this.isGuidePage()){
            if(GuidePageManager.instance.isDifPage()){
                this.BackHomePage();
            }
            if(GuidePageManager.instance.isLevelPage()){
                GuidePageManager.instance.showDifficultyPage(null);//
            }
        }
    }

    //最终node.active实现
    private async openTargetPage(targetPage: PageType) {
        this.cur_Page = targetPage;
        switch (targetPage) {
            case PageType.HOME:
                this.HomePage.active = true;
                break;
            case PageType.FINDLINE:
                this.FindLinePage.active = true;
                EventManager.instance.emit(MyGameEvent.ENTER_GAME,GameType.FINDLINE)
                break;
            case PageType.WORDCHAIN:
                this.WordChainPage.active = true;
                EventManager.instance.emit(MyGameEvent.ENTER_GAME,GameType.WORDCHAIN)
                break;
            case PageType.CHESS:
                this.ChessPage.active = true;
                EventManager.instance.emit(MyGameEvent.ENTER_GAME,GameType.CHESS)
                break;
            case PageType.WORDPOP:
                this.WordPopPage.active = true;
                EventManager.instance.emit(MyGameEvent.ENTER_GAME,GameType.WORDPOP)
                //this.WordPopPage.getComponent(Mngr4).OnGamePage();
                break;
            case PageType.GUIDE_PAGE:
                this.GuidePage.active = true;
                break;
        }
    }

    public isGamePage():boolean{
        return [
            PageType.CHESS,
            PageType.FINDLINE,
            PageType.WORDCHAIN,
            PageType.WORDPOP
        ].indexOf(this.cur_Page) >= 0;
    }

    public isGuidePage():boolean{
        return this.cur_Page === PageType.GUIDE_PAGE;
    }

    public isGameFindLine():boolean{
        return this.cur_Page === PageType.FINDLINE;
    }

    public isGameWordPop():boolean{
        return this.cur_Page === PageType.WORDPOP;
    }

    public isGameChess():boolean{
        return this.cur_Page === PageType.CHESS;
    }

    public get cur_Game():GameType{
        if(this.isGamePage()){
            return PageTypeMapGameType[this.cur_Page]
        }
        else return null;
    }

    protected start() {
        // 初始显示首页，自动走Loading过渡
        this.LoadPage(PageType.HOME);
    }

    protected onDestroy(): void {
        
    }
}