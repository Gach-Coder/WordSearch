import { _decorator, Button, Component, Label, Node, Sprite } from 'cc';
import { GameType } from './GameDatabase';
import { GameDifficulty, GameDifficultyCN, GuidePageManager, NonTouchableColor, TouchableColor } from './GuidePageManager';
import { PlayerData } from './PlayerData';
const { ccclass, property } = _decorator;

@ccclass('DifficultyPage')
export class DifficultyPage extends Component {
    //buttons
    @property(Button)
    private easyBtn: Button = null!;
    @property(Button)
    private normalBtn: Button = null!;
    @property(Button)
    private hardBtn: Button = null!;

    protected start(): void {
        this.UpdateButtonsUI();
    }

    public UpdateButtonsUI(){
        this.OffButtons();
        this.easyBtn.node.on(Button.EventType.CLICK, () => this.onDifficultyClick(GameDifficulty.EASY), this);
        if(PlayerData.instance.Dif_unlock[GuidePageManager.instance.cur_Game]){
            this.normalBtn.node.on(Button.EventType.CLICK, () => this.onDifficultyClick(GameDifficulty.NORMAL), this);
            this.hardBtn.node.on(Button.EventType.CLICK, () => this.onDifficultyClick(GameDifficulty.HARD), this);
            this.normalBtn.node.getComponent(Sprite).color = TouchableColor;
            this.hardBtn.node.getComponent(Sprite).color = TouchableColor;
        }
        else{
            this.normalBtn.node.getComponent(Sprite).color = NonTouchableColor;
            this.hardBtn.node.getComponent(Sprite).color = NonTouchableColor;
        }
    }

    private onDifficultyClick(dif: GameDifficulty) {
        // 保存选中的难度

        GuidePageManager.instance.ChooseDifficulty(dif);

        const game = GuidePageManager.instance.cur_Game;
            
        // 切换到关卡页
        if(game === GameType.FINDLINE){
            GuidePageManager.instance.showLevelPage(dif);
        }
        else{
            GuidePageManager.instance.LoadGame(PlayerData.instance.GetGameLevels(game)[dif]);
        }
    }

    private OffButtons(){
        this.easyBtn.node?.targetOff(this);
        this.normalBtn.node?.targetOff(this);
        this.hardBtn.node?.targetOff(this);
    }

    protected onDestroy(): void {
        this.OffButtons();
    }
}


