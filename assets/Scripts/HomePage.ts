import { _decorator, Component, Node, Button } from 'cc';
import { PageManager } from './PageManager';
import { GameType } from './GameDatabase';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

@ccclass('HomePage')
export class HomePage extends Component {
    // 引用页面内的按钮节点
    @property(Button)
    private btnFindLineGame: Button = null!;
    @property(Button)
    private btnChessGame: Button = null!;
    @property(Button)
    private btnWordPop: Button = null!;
    
    onLoad() {
        // 绑定按钮点击事件
        this.btnFindLineGame.node.on(Button.EventType.CLICK, this.onStartFindLineGame, this);
        this.btnChessGame.node.on(Button.EventType.CLICK, this.onStartChessGame, this);
        this.btnWordPop.node.on(Button.EventType.CLICK, this.onStartWordPopGame, this);
    }

    protected start(): void {
        UIManager.instance.TopAreaHideGoBackBtn();
    }

    private onStartFindLineGame() {
        PageManager.instance.ShowGuidePage(GameType.FINDLINE);
    }

    private onStartChessGame() {
        PageManager.instance.ShowGuidePage(GameType.CHESS);
    }

    private onStartWordPopGame(){
        PageManager.instance.ShowGuidePage(GameType.WORDPOP);
    }

    onDestroy() {
        this.btnFindLineGame.node?.targetOff(this);
        this.btnWordPop.node?.targetOff(this);
        this.btnChessGame.node?.targetOff(this);
    }
}
