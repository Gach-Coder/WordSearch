import { _decorator, Button, Component, instantiate, Label, math, Node, Prefab, Size, UITransform, Vec2, Vec3 } from 'cc';
import { GameManager } from './GameManager';
import { Dictionary } from '../Dictionary';
import { sleep } from '../Tools';
const { ccclass, property } = _decorator;

@ccclass('FoundWordsArea')
export class FoundWordsArea extends Component {
    @property(Prefab)
    private FoundStrLabel : Prefab = null!;
    @property(Node)
    private WordsBtnSubPage: Node = null!;
    @property(Node)
    private InterpreSubPage: Node = null;
    @property(Node)
    private MeaningLabel_content:Node = null;
    @property(Button)
    private InterpreExitBtn: Button = null;

    @property(Label)
    private WordLabel:Label = null!;
    @property(Label)
    private InterpreLabel:Label = null!;

    private _foundWordsNodes:Node[] = null;

    public static instance: FoundWordsArea = null;

    protected onLoad(): void {
        FoundWordsArea.instance = this;
        this.InterpreExitBtn.node.on(Button.EventType.CLICK,this.ShowWordBtnsPage,this);
    }

    private ShowWordBtnsPage(){
        this.WordsBtnSubPage.active = true;
        this.InterpreSubPage.active = false;
        if(this.MeaningLabel_content){
            const bg_uiTransform = this.MeaningLabel_content.getComponent(UITransform);
            const label_ui = this.InterpreLabel.node.getComponent(UITransform);
            bg_uiTransform?.setContentSize(630, label_ui.height);
        }
    }

    private ShowInterprePage(w:string){
        this.WordsBtnSubPage.active = false;
        this.InterpreSubPage.active = true;
        this.UpdateInterPrePageByWord(w);
    }

    private async UpdateInterPrePageByWord(w:string){
        if(this.WordLabel&&this.InterpreLabel&&this.MeaningLabel_content&&w)
        {
            this.WordLabel.string = Dictionary.instance.getValidCase(w);
            const Meaning_txt = Dictionary.instance.GetMeaningsString(w);
            this.InterpreLabel.string = Meaning_txt;
            await sleep(100);
            this.UpdateContentWid();
        }
        else{
            console.warn('property not ready')
            this.ShowWordBtnsPage();
        }
    }

    private UpdateContentWid(){
        const bg_uiTransform = this.MeaningLabel_content.getComponent(UITransform);
        
        // 获取 Label 的实际渲染尺寸（宽/高）
        const label_ui = this.InterpreLabel.node.getComponent(UITransform);
        const labelWidth = label_ui.width;
        const labelHeight = label_ui.height;
        
        // 计算背景最终尺寸
        const bgWidth = labelWidth * 1.2; 
        //const bgHeight = labelHeight * 1.2;
        // 设置背景尺寸（适配不同锚点）
        bg_uiTransform.setContentSize(bgWidth, labelHeight);
    }

    public InitWordsBtnsArea(){
        GameManager.instance.curTargetWords.forEach( (w ,i) =>{
            const WordLabel = instantiate(this.FoundStrLabel);
            this.WordsBtnSubPage.addChild(WordLabel);
            const foundLabel = WordLabel.getComponent(Label);
            foundLabel.string = "■".repeat(w.length);
            foundLabel.fontSize = 20;
            const ParentUITransform = this.WordsBtnSubPage.getComponent(UITransform);
            ParentUITransform.setAnchorPoint(new Vec2(0.5,0.8));
            WordLabel.position = new Vec3(Math.floor(i/3)*200 - 200,-(i%3)*60,0);
            this._foundWordsNodes.push(WordLabel);
        })
    }

    public ShowFoundWordLabel(word:string){
        const lowerTarget = word.toLowerCase();
        const ind = GameManager.instance.curTargetWords.findIndex(item => item.toLowerCase() === lowerTarget);
        if(ind<0)return;
        const wordNode = this._foundWordsNodes[ind];
        wordNode.targetOff(this);
        wordNode.on(Button.EventType.CLICK, () => this.ShowInterprePage(word), this)
        const label = wordNode.getComponent(Label)
        label.string = Dictionary.instance.GetFirstCharUpperCase(word);
        label.fontSize = 35;
        this.ShowWordBtnsPage();
    }

    public FoundWordsLabelClear(){
        this._foundWordsNodes?.forEach(node => {
            node.destroy();
        });
        this._foundWordsNodes = [];
        this.ShowWordBtnsPage();
    }

    start() {
        this.ShowWordBtnsPage();
    }

    update(deltaTime: number) {
        
    }

    protected onDestroy(): void {
        this.InterpreExitBtn.node?.targetOff(this);
    }
}


