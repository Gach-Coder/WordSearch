import { _decorator, Component, Node, Label, Button, EventTouch, tween, Vec3, UIOpacity, Tween } from 'cc';
const { ccclass, property } = _decorator;
import { AudioManager } from './AudioManager';
import { sleep } from './Tools';
import { GuidePageManager } from './GuidePageManager';
import { UIManager } from './UIManager';
import { PlayerData } from './PlayerData';
import { BoardManager as BM2 } from './WordPopGame/BoardManager';
import { BoardManager as BM1 } from './ChessGame/BoardManager';
import { HandManager as HM1 } from './WordPopGame/HandManager';
import { HandManager as HM2 } from './ChessGame/HandManager';
import { GameType } from './GameDatabase';

export enum GameMode {
    STATIC,
    DYNAMIC
}

@ccclass('BaseGameManager')
export abstract class BaseGameManager extends Component {
    @property(Button)
    protected btnConfirm: Button = null!;
    @property(Button)
    protected btnCancel: Button = null!;
    @property(Button)
    protected btnChange: Button = null!;
    @property(Label)
    protected GameStartLabel: Label = null!;

    @property(Node)
    protected ListenerNode:Node = null!;
    
    protected isDraggingTile: boolean = false;
    public dif: number = null!;
    public level: number = null!;
    protected gameReady: boolean = false;
    protected mode: GameMode = GameMode.STATIC;
    
    protected isloaded: boolean = false;
    
    // 抽象属性
    protected abstract get boardM(): BM1|BM2;
    protected abstract get handM(): HM1|HM2;
    
    onLoad() {
    }
    
    protected start(): void {
        this.gameReady = false;
        if (this.GameStartLabel) {
            this.GameStartLabel.node.active = false;
        }
    }
    
    // 抽象方法
    public abstract OnGamePage(game:GameType): Promise<void>;
    public abstract ResetGame(): Promise<void>;
    protected abstract DeployConfirm();
    
    // 公共方法
    protected GameStartLabelEffect() {
        if (!this.GameStartLabel) return;
        
        const LabelNode = this.GameStartLabel.node;
        this.GameStartLabel.string = this.gameReady ? "Continue" : "Game Start";
        
        const opacity = LabelNode.getComponent(UIOpacity);
        const delayTime = 0.3;
        const dist = 100;
        
        Tween.stopAllByTarget(LabelNode);
        LabelNode.active = true;
        LabelNode.position = new Vec3(0, -dist, 0);
        opacity.opacity = 0;
        tween(LabelNode)
            .to(0.2, { position: new Vec3(0, 0, 0) })
            .parallel(tween(opacity).to(0.5, { opacity: 255 }, { easing: "bounceOut" }))
            .delay(delayTime)
            .to(0.2, { position: new Vec3(0, dist * 2, 0) })
            .parallel(tween(opacity).to(0.5, { opacity: 0 }, { easing: "fade" }))
            .call(() => LabelNode.active = false).start();
    }
    
    public PauseGame() {
        this.HideGameBoard();
        this.OffTouchListeners();
        this.offBottomButtons();
    }
    
    public ResumeGame() {
        this.HideGameBoardCancel();
        this.OnTouchListeners();
        this.onBottomButtons();
    }
    
    protected HideGameBoard() {
        if (this.boardM) this.boardM.HideBoardTiles();
    }
    
    protected HideGameBoardCancel() {
        if (this.boardM) this.boardM.HideBoardTilesCancel();
    }
    
    public GoNextLevel() {
        this.ResetGame();
    }
    
    // 触摸事件处理
    protected onTouchStart(event: EventTouch) {
        
        const touchPos = event.getUILocation();
        if (this.boardM.isTouchingBoard(touchPos)) {
            if (this.boardM.isTouchingPendingCell(touchPos)) {
                this.CloseKeyBoardWindow();
                const touchTileNode = this.boardM.GetBoundTileNode(touchPos);
                this.boardM.TouchBoard(touchPos);
                this.isDraggingTile = true;
                this.handM.TileBound2Hand(touchTileNode);
                return;
            } else {
                this.boardM.TouchBoard(touchPos);
            }
        } else {
            const TileNode = this.handM.TryGetTouchingTileNode(touchPos);
            if (TileNode) {
                this.handM.onTouchTile(TileNode);
                this.isDraggingTile = true;
            }
        }
    }
    
    protected onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        if (this.isDraggingTile) {
            this.handM.TouchMoveTile(touchPos);
            this.handM.TileCollision();
            this.boardM.TileCollision(this.handM.GetTouchTileNode());
        }
    }
    
    protected onTouchEnd() {
        if (this.isDraggingTile) {
            this.handM.DeployTile();
        }
        this.isDraggingTile = false;
    }
    
    protected onTouchCancel() {
        this.onTouchEnd();
    }
    
    protected DeployCancel() {
        this.boardM.DeployCancel();
        this.handM.DeployCancel();
    }

    protected LetterChangeButton(){
        this.LettersChange()
    }
    
    protected LettersChange() {
        this.DeployCancel();
        this.handM.LettersChange();
    }
    
    protected OnTouchListeners() {
        this.OffTouchListeners();
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    
    protected OffTouchListeners() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    
    public ResetAllEvents() {
        this.EnableAllEvents();
    }
    
    protected DisableAllEvents() {
        UIManager.instance.offTopButtons()
        this.offBottomButtons();
        this.OffTouchListeners();
    }
    
    protected EnableAllEvents() {
        this.DisableAllEvents();
        UIManager.instance.onTopButtons()
        this.onBottomButtons();
        this.OnTouchListeners();
    }
    
    protected onBottomButtons() {
        this.btnConfirm.node.on(Button.EventType.CLICK, this.DeployConfirm, this);
        this.btnCancel.node.on(Button.EventType.CLICK, this.DeployCancel, this);
        this.btnChange.node.on(Button.EventType.CLICK, this.LetterChangeButton, this);
    }
    
    protected offBottomButtons() {
        this.btnConfirm.node?.targetOff(this);
        this.btnCancel.node?.targetOff(this);
        this.btnChange.node?.targetOff(this);
    }
    
    protected CloseKeyBoardWindow() {
        UIManager.instance.CloseKeyBoard();
    }

    protected onDestroy(): void {
        
    }
}