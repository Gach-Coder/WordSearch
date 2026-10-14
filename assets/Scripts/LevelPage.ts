import { _decorator, Component, instantiate, Node, Prefab, UITransform, Vec2, Vec3 } from 'cc';
import { GameType, MaxLevel } from './GameDatabase';
import { GuideLevelButton } from './GuideLevelButton';
import { GuidePageManager } from './GuidePageManager';
const { ccclass, property } = _decorator;

@ccclass('LevelPage')
export class LevelPage extends Component {
    @property(Prefab)
    private LevelButton:Prefab = null!;
    @property(Node)
    private LevelButtonContent:Node = null!;
    
    private buttonsNode : Node[] = null;
    private isReady: boolean = null;

    public UpdateButtons(){
        if(!this.isReady){
            this.initLevelButtons();
        }
        this.isReady = true;
        if(!this.buttonsNode||this.buttonsNode.length===0){
            console.error('Buttons error');
        }
        this.buttonsNode.forEach(btn=>{
            btn.getComponent(GuideLevelButton).UpdateUI();
        });
    }

    public initLevelButtons(){
        this.DestroyAllLevelButtons();
        const maxL = MaxLevel[GuidePageManager.instance.cur_Game][GuidePageManager.instance.cur_Dif];
        for(let i = 1 ; i <= maxL ; i ++){
            const lvBtn = instantiate(this.LevelButton);
            this.LevelButtonContent.addChild(lvBtn);
            this.LevelButtonContent.getComponent(UITransform).setAnchorPoint(new Vec2(0.5,0.92))
            lvBtn.getComponent(GuideLevelButton).init(i);
            lvBtn.getComponent(UITransform).setContentSize(110,65);
            //一排三个按钮
            const y = - Math.floor((i-1)/3)*150+700;
            const LevelGuideButtonBias = 200
            lvBtn.setPosition(new Vec3( LevelGuideButtonBias*((i-1)%3)-LevelGuideButtonBias , y ,0));
            this.buttonsNode.push(lvBtn);
        }
        const container_ui = this.LevelButtonContent.getComponent(UITransform);
        const content_height = Math.abs(Math.floor((maxL-1)/3)*150+200);
        container_ui.setContentSize(container_ui.width,Math.max(container_ui.height,content_height));
        container_ui.node.setPosition(new Vec3(0,-1246,0));
    }

    private DestroyAllLevelButtons(){
        if(this.buttonsNode){
            this.buttonsNode.forEach(btn=>{
                btn?.destroy();
            })
        }
        this.buttonsNode = [];
    }

    protected onDestroy(): void {
        this.DestroyAllLevelButtons();
    }
}


