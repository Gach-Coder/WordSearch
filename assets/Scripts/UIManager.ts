import { _decorator, Button, Component, Label, Node, Sprite } from 'cc';
import { SettingWindowBasic } from './SettingWindowBasic';
import { PageManager } from './PageManager';
import { KeyBoard, SingleCharFun } from './KeyBoard';
import { NextLevelWindow } from './NextLevelWindow';
import { FailWindow } from './FailWindow';
import { EventManager, MyGameEvent } from './EventManager';
const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    @property(Button)
    private GoBackBtn:Button = null!;
    @property(Button)
    private SettingBtn:Button = null!;
    @property(Label)
    private TopLabel:Label = null!;

    @property(FailWindow)
    private BasicFailWindow: FailWindow = null!;
    @property(NextLevelWindow)
    private BasicSuccessWindow :  NextLevelWindow = null;
    @property(SettingWindowBasic)
    private BasicSettingWindow : SettingWindowBasic = null!; // 设置
    @property(KeyBoard)
    private KeyBoard:KeyBoard = null!;
    @property(Node)
    private standardTileNode:Node = null!;

    public static instance: UIManager = null;

    protected onLoad(): void {
        UIManager.instance = this;
        this.onTopButtons();
    }

    protected start(): void {
        this.HideAllWindows();
    }

    public onTopButtons(){
        this.offTopButtons();
        this.GoBackBtn.node.on(Button.EventType.CLICK,this.GoBack,this);
        this.SettingBtn.node.on(Button.EventType.CLICK,this.OpenSettingWindow,this);
    }

    public offTopButtons(){
        this.GoBackBtn.node?.targetOff(this);
        this.SettingBtn.node?.targetOff(this);
    }

    private GoBack(){
        this.HideAllWindows();
        EventManager.instance.emit(MyGameEvent.GO_BACK)
        PageManager.instance.GoBack();
    }

    public OpenKeyBoard(fun:SingleCharFun){
        this.KeyBoard.OpenWindow(fun);
    }

    public CloseKeyBoard(){
        this.KeyBoard.CloseWindow();
    }

    public OpenSettingWindow(){
        EventManager.instance.emit(MyGameEvent.TEMPWINDOW_ON)
        if(this.BasicSettingWindow){
            this.BasicSettingWindow.OpenWindow();
        }
    }

    public CloseSettingWindow(){
        if(this.BasicSettingWindow){
            this.BasicSettingWindow.node.active = false;
        }
        EventManager.instance.emit(MyGameEvent.TEMPWINDOW_OFF)
    }

    public OpenNextLevelWindow(params: Record<string, any>){
        //EventManager.instance.emit(MyGameEvent.TEMPWINDOW_ON)
        if(this.BasicSuccessWindow){
            this.BasicSuccessWindow.OpenWindow(params);
        }
    }

    public OpenFailWindow(params: Record<string, any>){
        //EventManager.instance.emit(MyGameEvent.TEMPWINDOW_ON)
        if(this.BasicFailWindow){
            this.BasicFailWindow.OpenWindow(params);
        }
    }

    public ShowTopArea(){
        if(this.GoBackBtn){
            this.GoBackBtn.node.parent.active = true;
            this.GoBackBtn.node.active = true;
        }
        if(this.SettingBtn){
            this.SettingBtn.node.active = true;
        }
        if(this.TopLabel){
            this.TopLabel.node.active = true;
        }
    }

    public HideTopAreaItems(){
        if(this.GoBackBtn){
            this.GoBackBtn.node.parent.active = true;
            this.GoBackBtn.node.active = false;
        }
        if(this.SettingBtn){
            this.SettingBtn.node.active = false;
        }
        if(this.TopLabel){
            this.TopLabel.node.active = false;
        }
    }

    public TopAreaHideGoBackBtn(){
        this.HideTopAreaItems();
        if(this.SettingBtn){
            this.SettingBtn.node.active = true;
        }
    }

    public SetTopLabelString(str:string){
        this.TopLabel.string = str;
    }

    public HideAllWindows(){
        if(this.BasicFailWindow){
            this.BasicFailWindow.node.active = false;
        }
        if(this.BasicSettingWindow){
            this.BasicSettingWindow.node.active = false;
        }
        if(this.BasicSuccessWindow){
            this.BasicSuccessWindow.node.active = false;
        }
        if(this.KeyBoard){
            this.KeyBoard.node.active = false;
        }
    }

    protected onDestroy(): void {
        this.offTopButtons();
    }

    public get STD_TileNode():Node{return this.standardTileNode}
    public get STD_TileSprite():Sprite{return this.standardTileNode.getComponent(Sprite)}
    public get STD_TileLabel():Label{return this.standardTileNode.getComponentInChildren(Label)}
}


