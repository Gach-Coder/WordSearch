import { _decorator, Component, Node,Button, AudioSource, Input,Event, EventTouch, EventMouse, Label} from 'cc';
import { MusicOnOff } from './MusicOnOff';
import { AudioOnOff } from './AudioOnOff';
import { PageManager, PageType } from './PageManager';
import { GuidePageManager } from './GuidePageManager';
import { GameType } from './GameDatabase';
import { PlayerData } from './PlayerData';
import { UIManager } from './UIManager';
import { EventManager, MyGameEvent } from './EventManager';
const { ccclass, property } = _decorator;

@ccclass('SettingWindowBasic')
export class SettingWindowBasic extends Component {
    @property(Button)
    private ExitBtn: Button = null!;

    @property(Button)
    private BGMSwitchBtn: Button = null!;
    @property(Button)
    private AudioSwitchBtn: Button = null!;

    @property(Label)
    public ScriptLabel: Label = null!;
    @property(Button)
    private HomePageBtn: Button = null!;
    @property(Button)
    private RestartBtn: Button = null!;
    @property(Button)
    private ResumeBtn: Button = null!;

    public static instance : SettingWindowBasic = null;

    protected onLoad(): void {
        SettingWindowBasic.instance = this;
        this.node.on(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互 
        this.onButtons();
    }

    protected start(): void {
        this.UpdateWindow();
    }

    //this.node.on(Node.EventType.TOUCH_START,this.DisableEvent, this);//屏蔽一切背景交互
    private DisableEvent(event:EventTouch){
        event.propagationStopped = true;
    }

    public OpenWindow(){
        this.node.active = true;
        this.UpdateWindow();
    }

    private UpdateWindow(){//复用刷新
        //底部按钮
        this.HomePageBtn.node.parent.active = PageManager.instance.isGamePage()
        //BGM和Audio设置选项图标
        this.BGMSwitchBtn.getComponent(MusicOnOff).UpdateState();
        this.AudioSwitchBtn.getComponent(AudioOnOff).UpdateState();
        //Label
        this.UpdateLabel();
    }

    private UpdateLabel(){
        const isShowLabel = PageManager.instance.isGamePage();
        this.ScriptLabel.node.active = isShowLabel;
        if(isShowLabel){
            if(GuidePageManager.instance.cur_Game === GameType.WORDPOP){
                if(PlayerData.instance.WordPopScore > 0){
                //    this.ScriptLabel.string = `Score Record  :  ${PlayerData.instance.WordPopScore}`;
                }
                else{
                //    this.ScriptLabel.string = "No Record";
                }
            }
        }
    }
    
    protected RestartGame(){
        this.Exit();
        EventManager.instance.emit(MyGameEvent.RESET_GAME)
    }

    protected GoHomePage(){
        this.Exit();
        EventManager.instance.emit(MyGameEvent.GO_BACK)
        PageManager.instance.BackHomePage();
    }

    protected Exit(){
        UIManager.instance.CloseSettingWindow();
        EventManager.instance.emit(MyGameEvent.TEMPWINDOW_OFF)
    }

    private onButtons(){
        this.ExitBtn.node.on(Button.EventType.CLICK, this.Exit, this);
        this.HomePageBtn.node.on(Button.EventType.CLICK, this.GoHomePage, this);
        this.RestartBtn.node.on(Button.EventType.CLICK, this.RestartGame, this);
        this.ResumeBtn.node.on(Button.EventType.CLICK, this.Exit, this);
    }

    private offButtons(){
        this.ExitBtn.node?.off(Button.EventType.CLICK, this.Exit, this);
        this.HomePageBtn.node?.off(Button.EventType.CLICK, this.GoHomePage, this);
        this.RestartBtn.node?.off(Button.EventType.CLICK, this.RestartGame, this);
        this.ResumeBtn.node?.off(Button.EventType.CLICK, this.Exit, this);
    }

    protected onDestroy(): void {
        this.offButtons();
        this.node?.targetOff(this);//屏蔽一切背景交互
    }
}


