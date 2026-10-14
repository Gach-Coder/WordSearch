import { _decorator, Component, Node,Button,Label, EventTouch} from 'cc';
import { PageManager } from './PageManager';
import { GameType } from './GameDatabase';
import { InfoArea4FindLine } from './FindLineGame/InfoArea4FindLine';
import { InfoArea4WordPop } from './WordPopGame/InfoArea4WordPop';
import { EventManager, MyGameEvent } from './EventManager';
import { InfoArea4ChessGame } from './ChessGame/InfoArea4ChessGame';
const { ccclass, property } = _decorator;

@ccclass('NextLevelWindow')
export class NextLevelWindow extends Component {
    @property(InfoArea4FindLine)
    private InfoArea4FindLine:InfoArea4FindLine = null!;
    @property(InfoArea4WordPop)
    private InfoArea4WordPop:InfoArea4WordPop = null!;
    @property(InfoArea4ChessGame)
    private InfoArea4ChessGame:InfoArea4ChessGame = null!;

    @property(Button)
    private NextLevelBtn : Button = null;
    @property(Button)
    private HomeBtn : Button = null;
    @property(Button)
    private MenuBtn : Button = null;
    @property(Button)
    private ReStartBtn : Button = null;
    @property(Button)
    private ShareBtn : Button = null;

    protected onLoad(): void {
        this.onButtons();
        //最底层拦截用户触屏，屏蔽背景按钮和游戏交互
        this.node.on(Node.EventType.TOUCH_START,this.DisableEvent, this);
    }

    private DisableEvent(event:EventTouch){
        event.propagationStopped = true;
    }

    public OpenWindow(params: Record<string, any>){
        this.node.active = true;
        this.ShowInfoArea();
        const game = PageManager.instance.cur_Game;
        if(game){
            if(game === GameType.FINDLINE){
                this.InfoArea4FindLine.OpenWindowWithResult(params)
            }
            if(game === GameType.CHESS){
                this.InfoArea4ChessGame.OpenWindow(params)
            }
            if(game === GameType.WORDPOP){
                this.InfoArea4WordPop.OpenWindow(params)
            }
        }
    }


    private GoNextLevel(){
        this.node.active = false;
        EventManager.instance.emit(MyGameEvent.NEXT_GAME)
    }

    private GoHome(){
        this.node.active = false;
        PageManager.instance.BackHomePage();
    }

    private GoGuide(){
        this.node.active = false;
        PageManager.instance.GoBack();
    }

    private Restart(){
        this.node.active = false;
        EventManager.instance.emit(MyGameEvent.RESET_GAME)
    }

    private ShowInfoArea(){
        this.HideInfoAreaAll()
        const game = PageManager.instance.cur_Game;
        if(game){
            if(game === GameType.FINDLINE){
                this.InfoArea4FindLine.node.active = true;
            }
            if(game === GameType.CHESS){
                this.InfoArea4ChessGame.node.active = true;
            }
            if(game === GameType.WORDPOP){
                this.InfoArea4WordPop.node.active = true;
            }
        }
    }

    private HideInfoAreaAll(){
        if(this.InfoArea4ChessGame)this.InfoArea4ChessGame.node.active = false;
        if(this.InfoArea4FindLine)this.InfoArea4FindLine.node.active = false;
        if(this.InfoArea4WordPop)this.InfoArea4WordPop.node.active = false;
    }

    private onButtons(){
        this.NextLevelBtn.node.on(Button.EventType.CLICK, this.GoNextLevel, this);
        this.ReStartBtn.node.on(Button.EventType.CLICK, this.Restart, this);
        this.HomeBtn.node.on(Button.EventType.CLICK, this.GoHome, this);
        this.MenuBtn.node.on(Button.EventType.CLICK, this.GoGuide, this);
        this.ShareBtn.node.on(Button.EventType.CLICK, this.Share, this);
    }

    private offButtons(){
        this.NextLevelBtn.node?.off(Button.EventType.CLICK, this.GoNextLevel, this);
        this.ReStartBtn.node?.off(Button.EventType.CLICK, this.Restart, this);
        this.HomeBtn.node?.off(Button.EventType.CLICK, this.GoHome, this);
        this.MenuBtn.node?.off(Button.EventType.CLICK, this.GoGuide, this);
        this.ShareBtn.node?.off(Button.EventType.CLICK, this.Share, this);
    }

    private Share(){

    }

    protected onDestroy(): void {
        this.offButtons();
        this.node?.off(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    }
}


