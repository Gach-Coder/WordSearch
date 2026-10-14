import { _decorator, Button, Color, Component, Label, Node, Size, Sprite, UITransform } from 'cc';
import { GuidePageManager, NonTouchableColor, TouchableColor } from './GuidePageManager';
import { PlayerData } from './PlayerData';
const { ccclass, property } = _decorator;

@ccclass('GuideLevelButton')
//按钮不记录游戏/难度等关键信息，可多游戏多难度重复利用
export class GuideLevelButton extends Component {
    @property (Label)
    private levelLabel:Label = null;
    private level:number = null;

    private ClickLevel(){
        if(!this.level)console.error("null level number");
        GuidePageManager.instance.LoadGame(this.level);
    }

    //用户升级可能导致按钮的解锁
    public UpdateUI(){
        this.DisableButton();
        if(this.isTouchable()){//合法
            this.getComponent(Sprite).color = TouchableColor;
            this.ResetTouchEvent();
        }
        else{//非法进入，需完成前置关卡
            this.getComponent(Sprite).color = NonTouchableColor;
        }
    }

    public init(lv:number){
        this.level = lv;
        this.levelLabel.string = `第${lv}关`;
        this.levelLabel.fontSize = 25
        this.UpdateUI();//随level动态更新交互状态和UI
        //this.node.getComponent(UITransform).setContentSize(new Size(180,200))
    }

    private ResetTouchEvent(){//可能多次调用
        this.DisableButton();
        this.node?.on(Button.EventType.CLICK, this.ClickLevel, this);
    }

    private DisableButton(){
        this.node?.targetOff(this);
    }

    public isTouchable():Boolean{
        return this.level <= PlayerData.instance.GetGameLevels(GuidePageManager.instance.cur_Game)[GuidePageManager.instance.cur_Dif];
    }

    protected onDestroy(): void {
        this.DisableButton();
    }
}


